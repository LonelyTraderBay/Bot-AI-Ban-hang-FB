import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const out = path.resolve(root, 'evidence/frontend-component-risk-audit-20261008');
const rel = file => path.relative(root, file).replaceAll('\\', '/');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const files = walk(path.join(root, 'apps/web/src'));
const config = ts.readConfigFile(path.join(root, 'apps/web/tsconfig.json'), ts.sys.readFile).config;
const parsed = ts.parseJsonConfigFileContent(config, ts.sys, path.join(root, 'apps/web'));
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();
const components = [], calls = [], layouts = [], forms = [], text = [];
function namedOwner(node, source) {
    for (let current = node; current; current = current.parent) {
        if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
        if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current)) && ts.isVariableDeclaration(current.parent)) return current.parent.name.getText(source);
    }
    return '<module>';
}
for (const file of files.filter(f => /\.[cm]?tsx?$/.test(f))) {
    const source = program.getSourceFile(file) || ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function visit(node) {
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
            let renders = false;
            function hasJSX(child) { if (child !== node && (ts.isFunctionDeclaration(child) || ts.isArrowFunction(child) || ts.isFunctionExpression(child))) return; if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) renders = true; ts.forEachChild(child, hasJSX); }
            hasJSX(node);
            const name = ts.isFunctionDeclaration(node) ? node.name?.text : ts.isVariableDeclaration(node.parent) ? node.parent.name.getText(source) : undefined;
            if (renders && name) components.push({ file: rel(file), line, name, exported: !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) });
        }
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
            const tag = node.tagName.getText(source), props = Object.fromEntries(node.attributes.properties.map(p => ts.isJsxAttribute(p) ? [p.name.getText(source), p.initializer?.getText(source) || 'true'] : ['...spread', p.getText(source)]));
            const owner = namedOwner(node, source);
            let symbol = checker.getSymbolAtLocation(node.tagName);
            if (symbol?.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
            const decl = symbol?.declarations?.[0];
            const target = decl ? { file: rel(decl.getSourceFile().fileName), line: decl.getSourceFile().getLineAndCharacterOfPosition(decl.getStart()).line + 1, name: symbol.name } : null;
            const record = { file: rel(file), line, owner, tag, props, target };
            calls.push(record);
            if (['Stack', 'Box', 'FormFields', 'FieldGroup', 'SurfaceContent', 'ActionGroup', 'PageSections', 'SectionGrid', 'Grid', 'DialogActions'].includes(tag) || /flex|grid/.test(props.sx || '')) {
                const full = node.parent && ts.isJsxElement(node.parent) ? node.parent.getText(source) : node.getText(source);
                layouts.push({ ...record, controls: [...new Set([...full.matchAll(/<(Button|IconButton|MutationButton|RouteLink|TextField|Select|Checkbox|Radio|Switch|Autocomplete|LookupLoadMore|Status)\b/g)].map(m => m[1]))], helper: /helperText|ErrorNotice|Alert|multiline/.test(full) });
            }
            if (tag === 'form' || props.component === '"form"' || props.component === "'form'") forms.push(record);
            if (props.noWrap || /nowrap|overflow.*hidden|textOverflow|height:/.test(props.sx || '')) text.push(record);
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
}
const router = fs.readFileSync(path.join(root, 'apps/web/src/app/router.tsx'), 'utf8');
const pages = Object.fromEntries([...router.matchAll(/^\s+(R\d+): (\w+),$/gm)].map(m => [m[1], m[2]]));
const manifest = JSON.parse(fs.readFileSync(path.join(root, '../botsales-kit/contracts/route-manifest.json'), 'utf8'));
const routes = manifest.routes.map(r => ({ ...r, owner: pages[r.id] }));
const fingerprints = Object.fromEntries(files.map(f => [rel(f), crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
const shared = components.filter(c => c.file.startsWith('apps/web/src/shared/ui/'));
const sharedUses = shared.map(c => ({ ...c, uses: calls.filter(call => call.target?.file === c.file && call.target?.name === c.name) }));
const rowCandidates = layouts.filter(l => l.tag === 'ActionGroup' || /row/.test(l.props.direction || '') || /display:.*['"]flex['"]/.test(l.props.sx || ''));
const gridCandidates = layouts.filter(l => l.tag === 'SectionGrid' || /gridTemplateColumns/.test(l.props.sx || ''));
const summary = { runtimeFiles: files.length, typescriptFiles: files.filter(f => /\.[cm]?tsx?$/.test(f)).length, moduleDirectories: fs.readdirSync(path.join(root, 'apps/web/src/modules'), { withFileTypes: true }).filter(e => e.isDirectory()).length, namedRenderingFunctions: components.length, sharedPublicComponents: shared.filter(c => c.exported).length, jsxCalls: calls.length, layouts: layouts.length, rowCandidates: rowCandidates.length, gridCandidates: gridCandidates.length, explicitForms: forms.length, truncationHeightCandidates: text.length, routes: routes.length };
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'inventory.json'), JSON.stringify({ capturedAt: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), summary, fingerprints, components, sharedUses, calls, layouts, rowCandidates, gridCandidates, forms, text, routes }, null, 2));
console.log(JSON.stringify(summary));
console.log('ROWS_WITH_CONTROLS_AND_WITHOUT_EXPLICIT_ALIGNMENT');
for (const l of rowCandidates.filter(l => l.controls.length && !l.props.alignItems && !/alignItems|alignSelf/.test(l.props.sx || ''))) console.log(JSON.stringify({ file: l.file, line: l.line, owner: l.owner, tag: l.tag, direction: l.props.direction, controls: l.controls, helper: l.helper, sx: l.props.sx }));
