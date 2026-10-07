import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import postcss from 'postcss';

// Evidence collector only. This is not a production spacing gate and never edits app source.
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, '../../..');
const directory = path.join(scriptDirectory, 'W02');
fs.mkdirSync(directory, { recursive: true });
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const tokens = JSON.parse(read('botsales-kit/design/tokens.json'));
const routes = JSON.parse(read('botsales-kit/contracts/route-manifest.json')).routes;
const routeSource = JSON.parse(read('docs/route-implementation.json'));
const scale = [0, ...Object.values(tokens.space)];
const base = tokens.space.sm;
const spacingKeys = new Set(['p', 'px', 'py', 'pt', 'pb', 'pl', 'pr', 'm', 'mx', 'my', 'mt', 'mb', 'ml', 'mr', 'gap', 'rowGap', 'columnGap', 'spacing', 'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'paddingInline', 'paddingBlock', 'marginInline', 'marginBlock']);
const geometryKeys = new Set(['width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight', 'gridTemplateColumns', 'overflow', 'overflowX', 'overflowY']);
const typographyKeys = new Set(['fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing']);
const files = [];
function walk(directoryPath) {
    for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
        const file = path.join(directoryPath, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (/\.(tsx?|css)$/.test(file)) files.push(file);
    }
}
walk(path.join(root, 'apps/web/src'));
files.sort();
const declarations = [];
const typography = [];
const geometry = [];
const diagnostics = [];
function owner(file) {
    const match = file.match(/^apps\/web\/src\/modules\/([^/]+)\//);
    return match ? `module:${match[1]}` : file.split('/')[3];
}
function numeric(node) {
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) return -Number(node.operand.text);
    return null;
}
function numberLeaves(node, leafPath = '') {
    const value = numeric(node);
    if (value !== null) return [{ path: leafPath, units: value, px: Number((value * base).toFixed(4)), onScale: scale.includes(Math.abs(Number((value * base).toFixed(4)))) }];
    if (ts.isObjectLiteralExpression(node)) return node.properties.flatMap(property => ts.isPropertyAssignment(property) ? numberLeaves(property.initializer, `${leafPath}/${property.name.getText()}`) : []);
    if (ts.isConditionalExpression(node)) return [...numberLeaves(node.whenTrue, `${leafPath}/whenTrue`), ...numberLeaves(node.whenFalse, `${leafPath}/whenFalse`)];
    return [];
}
function component(node) {
    for (let current = node; current; current = current.parent) {
        if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
        if (ts.isVariableDeclaration(current) && current.name) return current.name.getText();
    }
    return '(module scope)';
}
for (const file of files.filter(file => /\.tsx?$/.test(file))) {
    const source = fs.readFileSync(file, 'utf8');
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const sourcePath = relative(file);
    for (const diagnostic of tree.parseDiagnostics) diagnostics.push({ file: sourcePath, message: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ') });
    function visit(node) {
        let name;
        let valueNode;
        let tag = '';
        if (ts.isPropertyAssignment(node)) {
            name = node.name.getText(tree).replace(/^['"]|['"]$/g, '');
            valueNode = node.initializer;
        } else if (ts.isJsxAttribute(node) && node.initializer) {
            name = node.name.text;
            valueNode = ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
            tag = node.parent.parent.tagName?.getText(tree) || '';
        }
        if (valueNode && (spacingKeys.has(name) || geometryKeys.has(name) || typographyKeys.has(name))) {
            const row = { file: sourcePath, line: tree.getLineAndCharacterOfPosition(node.getStart()).line + 1, owner: owner(sourcePath), component: component(node), tag, property: name, expression: valueNode.getText(tree) };
            if (spacingKeys.has(name)) {
                row.directNumeric = numeric(valueNode) !== null;
                row.numericLeaves = numberLeaves(valueNode);
                // theme.spacing is a base configuration, not a component's padding/gap.
                row.category = sourcePath.endsWith('/theme.ts') && name === 'spacing' ? 'THEME_BASE' : row.numericLeaves.length ? 'MUI_NUMERIC' : 'NON_NUMERIC_REVIEW';
                declarations.push(row);
            } else if (geometryKeys.has(name)) geometry.push(row);
            else typography.push(row);
        }
        ts.forEachChild(node, visit);
    }
    visit(tree);
}
const cssDeclarations = [];
for (const file of files.filter(file => file.endsWith('.css'))) {
    const css = postcss.parse(fs.readFileSync(file, 'utf8'), { from: file });
    css.walkDecls(declaration => {
        if (/^(margin|padding|gap|row-gap|column-gap)(-|$)/.test(declaration.prop)) cssDeclarations.push({ file: relative(file), line: declaration.source.start.line, selector: declaration.parent.selector, property: declaration.prop, expression: declaration.value });
    });
}
const numericDeclarations = declarations.filter(row => row.category === 'MUI_NUMERIC');
const direct = numericDeclarations.filter(row => row.directNumeric);
const outside = numericDeclarations.flatMap(row => row.numericLeaves.filter(leaf => !leaf.onScale).map(leaf => ({ ...row, leafPath: leaf.path, units: leaf.units, px: leaf.px })));
const directOutside = outside.filter(row => row.directNumeric);
const unique = rows => [...new Set(rows)].sort((a, b) => a - b);
const groupOwners = [...new Set([...declarations.map(row => row.owner), ...routes.map(route => `module:${route.module}`)])].sort().map(name => {
    const rows = declarations.filter(row => row.owner === name);
    return { owner: name, sourceFiles: files.filter(file => owner(relative(file)) === name && /\.tsx?$/.test(file)).length, spacingDeclarations: rows.length, directNumericDeclarations: rows.filter(row => row.category === 'MUI_NUMERIC' && row.directNumeric).length, outsideScaleDirect: directOutside.filter(row => row.owner === name).length, outsideScaleAllBranches: outside.filter(row => row.owner === name).length, routes: routes.filter(route => `module:${route.module}` === name).map(route => route.id) };
});
const formRoutes = new Set(['R03', 'R10', 'R11', 'R13', 'R18', 'R26', 'R30', 'R33', 'R35', 'R40']);
const detailRoutes = new Set(['R08', 'R14', 'R19', 'R24', 'R36']);
const dashboardRoutes = new Set(['R04', 'R37', 'R51']);
const reportRoutes = new Set(['R22', 'R31', 'R53']);
function profile(route) {
    if (route.id === 'R01') return 'AUTH';
    if (['R05', 'R06', 'R27'].includes(route.id)) return 'WORKSPACE_PANES';
    if (formRoutes.has(route.id)) return 'FORM';
    if (detailRoutes.has(route.id)) return 'DETAIL';
    if (dashboardRoutes.has(route.id)) return 'DASHBOARD';
    if (reportRoutes.has(route.id)) return 'REPORT';
    return 'COLLECTION';
}
const routeCoverage = routes.map(route => {
    const match = routeSource.find(row => row.routeId === route.id);
    const sourceExists = Boolean(match && fs.existsSync(path.join(root, match.source)));
    const declaredComponent = Boolean(sourceExists && new RegExp(`\\bfunction\\s+${match.component}\\s*\\(`).test(read(match.source)));
    return { id: route.id, path: route.path, module: route.module, title: route.title, source: match?.source || null, component: match?.component || null, sourceExists, declaredComponent, targetProfile: profile(route), profileStatus: 'PROPOSED_FROM_ROUTE_PURPOSE_NOT_BROWSER_VERIFIED' };
});
const inputPaths = [...new Set([...files.map(relative), 'botsales-kit/design/tokens.json', 'botsales-kit/contracts/route-manifest.json', 'docs/route-implementation.json', 'DESIGN.md', 'scripts/check-source.mjs', 'scripts/source-policy.mjs'])].sort();
const inputHashes = inputPaths.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
const output = {
    capturedAt: new Date().toISOString(), scope: 'FRONTEND_ONLY_STATIC_SPACING_INVENTORY',
    status: diagnostics.length || routeCoverage.some(row => !row.sourceExists || !row.declaredComponent) ? 'INVALID_INPUT' : 'CAPTURED_NOT_CONFORMANCE_PASS',
    limitations: ['AST inventory captures spacing-named property candidates, not their rendered cascade.', 'Numeric spacing uses the currently verified 8px MUI base. Theme base is classified separately.', 'Conditional/responsive numeric leaves are candidate values, not simultaneously rendered positions.', 'Non-numeric expressions, MUI internals, transforms, inherited styles and geometry require separate review.', 'Route coverage verifies source mapping/component declarations only. No 54-route browser run, build or accessibility certification occurred.'],
    summary: { typescriptFiles: files.filter(file => /\.tsx?$/.test(file)).length, cssFiles: files.filter(file => file.endsWith('.css')).length, modules: new Set(routes.map(route => route.module)).size, routes: routes.length, matchedRoutes: routeCoverage.filter(row => row.sourceExists && row.declaredComponent).length, muiBasePx: base, canonicalSpacingPx: Object.values(tokens.space), spacingPropertyCandidates: declarations.length, directNumericDeclarations: direct.length, directNumericUniquePxIncludingZero: unique(direct.flatMap(row => row.numericLeaves.map(leaf => leaf.px))), directOutsideScaleDeclarations: directOutside.length, directOutsideScaleUniquePx: unique(directOutside.map(row => row.px)), outsideScaleLeavesIncludingResponsive: outside.length, outsideScaleResponsiveLeaves: outside.filter(row => !row.directNumeric).length, cssSpacingDeclarations: cssDeclarations.length, geometryCandidates: geometry.length, parserDiagnostics: diagnostics.length },
    inputHashes, owners: groupOwners, outsideScale: outside, declarations, cssDeclarations, typography, geometry, routeCoverage, diagnostics,
};
fs.writeFileSync(path.join(directory, 'source-inventory.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ status: output.status, summary: output.summary, routeFailures: routeCoverage.filter(row => !row.sourceExists || !row.declaredComponent) }, null, 2));
if (output.status === 'INVALID_INPUT') process.exitCode = 1;
