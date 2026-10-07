import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { compositionOwners } from '../../../scripts/check-ui-composition.mjs';

const apply = process.argv.includes('--apply');
const files = [], changes = [], unsupported = [];
const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) walk(file); else if (file.endsWith('.tsx') && !file.includes(`${path.sep}shared${path.sep}`)) files.push(file); } };
walk('apps/web/src');
const hash = source => createHash('sha256').update(source).digest('hex');
const propertyName = node => node.getText().replace(/^['"]|['"]$/g, '');

for (const file of files) {
    const before = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const edits = [], names = new Set(); let count = 0;
    function visit(node) {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
            const tag = node.tagName.getText(sf);
            const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
            const sx = attributes.find(item => item.name.getText(sf) === 'sx');
            const expression = sx?.initializer && ts.isJsxExpression(sx.initializer) ? sx.initializer.expression : undefined;
            if (expression && ['Stack', 'Box'].includes(tag)) {
                const roleNames = [], extras = new Map();
                function flatten(item) {
                    if (ts.isParenthesizedExpression(item)) return flatten(item.expression);
                    if (ts.isArrayLiteralExpression(item)) return item.elements.forEach(flatten);
                    if (ts.isObjectLiteralExpression(item)) return item.properties.forEach(property => {
                        if (ts.isSpreadAssignment(property)) flatten(property.expression);
                        else if (ts.isPropertyAssignment(property)) extras.set(propertyName(property.name), property.initializer.getText(sf));
                        else throw new Error('Unsupported style property');
                    });
                    const text = item.getText(sf);
                    if (/^layoutSx\.[A-Za-z]+\.[A-Za-z]+$/.test(text)) return roleNames.push(text.slice('layoutSx.'.length));
                    throw new Error(`Unsupported style expression ${text}`);
                }
                const expressionText = expression.getText(sf);
                const relevant = Object.keys(compositionOwners).some(role => expressionText.includes(`layoutSx.${role}`));
                if (relevant) try {
                    flatten(expression);
                    const primary = roleNames.find(role => compositionOwners[role] && (tag === 'Stack' ? role !== 'grid.gutter' : role === 'grid.gutter'));
                    if (primary) {
                        const component = compositionOwners[primary], props = [], consumed = new Set([primary]);
                        const take = (role, prop) => { if (roleNames.includes(role)) { consumed.add(role); props.push(prop); } };
                        if (component === 'FormFields') {
                            take('surface.sectionBefore', 'beforeGap="surface"'); take('page.sectionAfter', 'afterGap="section"');
                            if (roleNames.includes('surface.inset')) { consumed.add('surface.inset'); props.push(extras.has('border') ? 'bodyMode="outlined"' : 'bodyMode="inset"'); }
                            if (extras.has('border')) { if (extras.get('border') !== '1' || !['\'divider\'', '"divider"'].includes(extras.get('borderColor')) || extras.get('borderRadius') !== 'visualSx.radius.dialog') throw new Error('Nonstandard form outline'); ['border', 'borderColor', 'borderRadius'].forEach(key => extras.delete(key)); }
                        }
                        if (component === 'FieldGroup') take('toolbar.inset', 'bodyMode="toolbar"');
                        if (component === 'SurfaceContent') {
                            take('surface.sectionBefore', 'beforeGap="surface"'); take('notice.afterGap', 'afterGap="notice"');
                            if (roleNames.includes('surface.inset')) { consumed.add('surface.inset'); props.push(extras.has('borderBottom') ? 'bodyMode="insetDivider"' : 'bodyMode="inset"'); }
                            if (roleNames.includes('surface.compactInset')) { consumed.add('surface.compactInset'); props.push('bodyMode="compactOutlined"'); if (extras.get('border') !== '1' || extras.get('borderRadius') !== 'visualSx.radius.large') throw new Error('Nonstandard compact surface'); ['border', 'borderColor', 'borderRadius'].forEach(key => extras.delete(key)); }
                            if (extras.has('borderBottom')) { if (extras.get('borderBottom') !== '1') throw new Error('Nonstandard divider'); ['borderBottom', 'borderColor'].forEach(key => extras.delete(key)); }
                        }
                        if (component === 'ActionGroup') {
                            take('actions.beforeGap', 'beforeGap="form"'); take('surface.sectionBefore', 'beforeGap="surface"'); take('detail.relatedContentGap', 'beforeGap="detail"');
                            take('notice.afterGap', 'afterGap="notice"'); take('page.sectionAfter', 'afterGap="section"');
                            if (!attributes.some(item => item.name.getText(sf) === 'direction')) props.push('direction="column"');
                            if (roleNames.includes('surface.headerInset')) { consumed.add('surface.headerInset'); props.push('bodyMode="header"'); if (extras.get('borderBottom') !== '1') throw new Error('Nonstandard header divider'); ['borderBottom', 'borderColor'].forEach(key => extras.delete(key)); }
                        }
                        if (component === 'PageSections') take('page.sectionBefore', 'beforeGap="section"');
                        if (component === 'SectionGrid') { if (!['\'grid\'', '"grid"'].includes(extras.get('display'))) throw new Error('Not a grid'); extras.delete('display'); props.push(`columns={${extras.get('gridTemplateColumns')}}`); extras.delete('gridTemplateColumns'); }
                        if (extras.has('& > *')) { if (!/minWidth\s*:\s*0/.test(extras.get('& > *'))) throw new Error('Nonstandard child geometry'); props.push('shrinkChildren'); extras.delete('& > *'); }
                        for (const key of ['alignItems', 'justifyContent', 'flexWrap']) if (extras.has(key)) { props.push(`${key}={${extras.get(key)}}`); extras.delete(key); }
                        const allowedGeometry = new Set(['width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'flex', 'gridColumn']);
                        if ([...extras.keys()].some(key => !allowedGeometry.has(key))) throw new Error(`Unsupported geometry ${[...extras.keys()]}`);
                        if (extras.size) props.push(`geometry={{${[...extras].map(([key, value]) => `${key}: ${value}`).join(', ')}}}`);
                        if (roleNames.some(role => !consumed.has(role))) throw new Error(`Unsupported roles ${roleNames.filter(role => !consumed.has(role))}`);
                        edits.push({ start: node.tagName.getStart(sf), end: node.tagName.end, text: component }, { start: sx.getStart(sf), end: sx.end, text: props.join(' ') });
                        if (ts.isJsxOpeningElement(node)) { const closing = node.parent.closingElement; edits.push({ start: closing.tagName.getStart(sf), end: closing.tagName.end, text: component }); }
                        names.add(component); count++;
                    }
                } catch (error) { unsupported.push({ file, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, tag, error: error.message, sx: expressionText }); }
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(sf);
    if (!edits.length) continue;
    let after = before;
    for (const edit of edits.sort((a, b) => b.start - a.start)) after = after.slice(0, edit.start) + edit.text + after.slice(edit.end);
    const parsed = ts.createSourceFile(file, after, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const references = new Set();
    const gather = node => { if (ts.isImportDeclaration(node)) return; if (ts.isIdentifier(node)) references.add(node.text); ts.forEachChild(node, gather); }; gather(parsed);
    const importEdits = [];
    for (const statement of parsed.statements.filter(ts.isImportDeclaration)) {
        const bindings = statement.importClause?.namedBindings;
        if (!bindings || !ts.isNamedImports(bindings)) continue;
        const keep = bindings.elements.filter(item => references.has(item.name.text));
        if (keep.length !== bindings.elements.length) importEdits.push({ start: keep.length ? bindings.getStart(parsed) : statement.getStart(parsed), end: keep.length ? bindings.end : statement.end, text: keep.length ? `{ ${keep.map(item => item.getText(parsed)).join(', ')} }` : '' });
    }
    for (const edit of importEdits.sort((a, b) => b.start - a.start)) after = after.slice(0, edit.start) + edit.text + after.slice(edit.end);
    let importPath = path.relative(path.dirname(file), 'apps/web/src/shared/ui/composition').split(path.sep).join('/');
    if (!importPath.startsWith('.')) importPath = './' + importPath;
    after = `import { ${[...names].sort().join(', ')} } from '${importPath}';\n` + after;
    changes.push({ file, count, components: [...names].sort(), beforeSha256: hash(before), afterSha256: hash(after), before, after });
}
console.log(JSON.stringify({ apply, files: changes.length, migrated: changes.reduce((sum, item) => sum + item.count, 0), unsupported }, null, 2));
if (unsupported.length) process.exitCode = 1;
else if (apply) {
    for (const change of changes) { if (fs.readFileSync(change.file, 'utf8') !== change.before) throw new Error(`Source changed: ${change.file}`); fs.writeFileSync(change.file, change.after); }
    fs.writeFileSync('evidence/frontend-ui-improvements/shared-composition-20261006/migration-manifest.json', JSON.stringify(changes.map(({ before, after, ...record }) => record), null, 2) + '\n');
}
