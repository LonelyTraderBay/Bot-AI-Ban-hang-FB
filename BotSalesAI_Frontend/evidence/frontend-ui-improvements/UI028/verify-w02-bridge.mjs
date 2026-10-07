import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const evidenceDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(evidenceDir, '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const checks = [];
const check = (name, passed, observed) => checks.push({ name, status: passed ? 'PASS' : 'FAIL', observed });
const commands = [];
function run(name, args) {
    const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
    const output = `${result.stdout || ''}${result.stderr || ''}${result.error ? `\n${result.error.message}` : ''}`;
    commands.push({ name, executable: process.execPath, args, cwd: root, exitCode: result.status, output });
    check(name, result.status === 0, { exitCode: result.status, commandIndex: commands.length - 1 });
    return output;
}

const standard = read('docs/FRONTEND_SPACING_STANDARD.md');
const sourcePath = 'apps/web/src/shared/ui/layout.ts';
const source = read(sourcePath);
const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const findVariable = name => sourceFile.statements.flatMap(statement => ts.isVariableStatement(statement) ? statement.declarationList.declarations : []).find(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === name);
const findType = name => sourceFile.statements.find(statement => ts.isTypeAliasDeclaration(statement) && statement.name.text === name)?.type;
const unwrapped = node => node && (ts.isSatisfiesExpression(node) || ts.isAsExpression(node) || ts.isParenthesizedExpression(node) ? unwrapped(node.expression) : node);
function objectPaths(node, prefix = '') {
    node = unwrapped(node);
    if (!node || !ts.isObjectLiteralExpression(node)) return [];
    return node.properties.flatMap(property => {
        if (!ts.isPropertyAssignment(property)) return [];
        const key = property.name && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) ? property.name.text : null);
        if (!key) return [];
        const next = prefix ? `${prefix}.${key}` : key;
        const child = unwrapped(property.initializer);
        return [next, ...objectPaths(child, next)];
    });
}
function typePaths(node, prefix = '') {
    if (!node || !ts.isTypeLiteralNode(node)) return [];
    return node.members.flatMap(member => {
        if (!ts.isPropertySignature(member) || !member.name) return [];
        const key = ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) ? member.name.text : null;
        if (!key) return [];
        const next = prefix ? `${prefix}.${key}` : key;
        return [next, ...typePaths(member.type, next)];
    });
}
const contractPaths = typePaths(findType('LayoutSxContract'));
const sxDeclaration = findVariable('layoutSx');
const cssDeclaration = findVariable('layoutCss');
const sxPaths = objectPaths(sxDeclaration?.initializer).filter(role => role.split('.').length <= 2);
const cssPaths = objectPaths(cssDeclaration?.initializer);
const ruleSection = standard.slice(standard.indexOf('## 4. Preset semantic'), standard.indexOf('**SPC-006'));
const canonicalRoles = [...ruleSection.matchAll(/^\| `([^`]+)` \|/gm)].map(match => match[1]);
const missingCanonicalRoles = canonicalRoles.filter(role => role.startsWith('table.') ? !cssPaths.includes(role) : !contractPaths.includes(role) || !sxPaths.includes(role));
check('all-25-normative-semantic-roles-have-typed-exported-values', canonicalRoles.length === 25 && missingCanonicalRoles.length === 0, { count: canonicalRoles.length, missing: missingCanonicalRoles, tableRawCssRoles: cssPaths.filter(role => role.startsWith('table.')) });
const supplementalRoles = ['navigation.brandInset', 'navigation.groupGap', 'inbox.paneInset', 'inbox.bubbleInset', 'inbox.messageContentGap', 'inbox.messageMetaGap', 'inbox.messageGroupGap', 'inbox.composerInset', 'report.listSurfaceInset', 'report.listMarkerInset', 'dashboard.groupInset', 'auth.surfaceInset'];
const missingSupplementalRoles = supplementalRoles.filter(role => !contractPaths.includes(role) || !sxPaths.includes(role));
check('inbox-navigation-auth-report-dashboard-profiles-are-present', missingSupplementalRoles.length === 0, { required: supplementalRoles, missing: missingSupplementalRoles });
const typePathsSorted = [...contractPaths].sort();
const sxPathsSorted = [...sxPaths].sort();
check('semantic-contract-and-exported-role-map-match-exactly', JSON.stringify(typePathsSorted) === JSON.stringify(sxPathsSorted) && contractPaths.length === sxPaths.length, { contractPaths: contractPaths.length, exportedStylePaths: sxPaths.length });
const imports = sourceFile.statements.filter(ts.isImportDeclaration).map(node => ({ module: node.moduleSpecifier.text, isTypeOnly: Boolean(node.importClause?.isTypeOnly) }));
check('bridge-imports-only-canonical-tokens-and-type-only-mui-contract', imports.length === 2 && imports.some(row => row.module === '@botsales/tokens' && !row.isTypeOnly) && imports.some(row => row.module === '@mui/material/styles' && row.isTypeOnly), imports);
const factorDeclaration = findVariable('factor');
const factorObject = unwrapped(factorDeclaration?.initializer);
const factorProperties = ts.isObjectLiteralExpression(factorObject) ? factorObject.properties.filter(ts.isPropertyAssignment) : [];
const factorScale = factorProperties.map(property => ({ name: property.name?.getText(sourceFile), expression: property.initializer.getText(sourceFile) }));
const validFactors = factorScale.length === 8 && factorScale[0].expression === '0' && factorScale.slice(1).every(item => /^tokens\.space\.(xs|sm|md|lg|xl|xxl|xxxl) \/ tokens\.space\.sm$/.test(item.expression));
check('private-mui-factors-derive-from-canonical-8px-token', validFactors, factorScale);
let numericSxLiterals = 0;
function countNumbers(node) { if (ts.isNumericLiteral(node)) numericSxLiterals++; ts.forEachChild(node, countNumbers); }
countNumbers(unwrapped(sxDeclaration?.initializer));
check('semantic-roles-contain-no-unowned-numeric-spacing-literals', numericSxLiterals === 0, { numericLiterals: numericSxLiterals, inventoryClassification: 'All 58 new spacing expressions are unresolved helper references for W03 resolver work.' });
check('raw-theme-spacing-uses-semantic-css-pixel-strings', cssPaths.includes('table.cellInset') && cssPaths.includes('table.denseCellInset') && source.includes('type CssPixel = `${number}px`') && source.includes('cssPixel(tokens.space.md)') && source.includes('cssPixel(tokens.space.lg)'), cssPaths.filter(role => role.startsWith('table.')));
const inventory = JSON.parse(read('evidence/frontend-ui-improvements/UI028/W02/source-inventory.json'));
const bridgeDeclarations = inventory.declarations.filter(row => row.file === sourcePath);
const inventoryHash = inventory.inputHashes.find(row => row.file === sourcePath)?.sha256;
check('collector-classifies-each-bridge-spacing-expression-for-future-resolver', bridgeDeclarations.length === 58 && bridgeDeclarations.every(row => row.category === 'NON_NUMERIC_REVIEW') && inventory.summary.matchedRoutes === 54 && inventory.summary.parserDiagnostics === 0 && inventoryHash === sha(sourcePath), { bridgeSpacingExpressions: bridgeDeclarations.length, categories: [...new Set(bridgeDeclarations.map(row => row.category))], routes: inventory.summary.matchedRoutes, parserDiagnostics: inventory.summary.parserDiagnostics, inventoryMatchesBridge: inventoryHash === sha(sourcePath) });
const pathMatches = source.match(/[\t ]+$/gm) || [];
check('bridge-source-format-has-no-trailing-whitespace', pathMatches.length === 0, { linesWithTrailingWhitespace: pathMatches.length });

run('frontend-typecheck', ['node_modules/typescript/bin/tsc', '-p', 'apps/web/tsconfig.json', '--noEmit']);
run('module-boundaries-and-import-cycle-gate', ['scripts/check-boundaries.mjs']);
const sourceHashBefore = sha(sourcePath);
const sourceHashAfter = sha(sourcePath);
check('verified-bridge-source-hash-recorded', sourceHashBefore === sourceHashAfter, { source: sourcePath, sha256: sourceHashAfter });

const result = {
    capturedAt: new Date().toISOString(), scope: 'UI028_W02_TYPED_SHARED_LAYOUT_BRIDGE',
    status: checks.every(row => row.status === 'PASS') ? 'PASS_W02_BRIDGE' : 'FAIL_W02_BRIDGE',
    files: [{ file: sourcePath, sha256: sourceHashAfter }, { file: 'botsales-kit/design/tokens.json', sha256: sha('botsales-kit/design/tokens.json') }, { file: 'docs/FRONTEND_SPACING_STANDARD.md', sha256: sha('docs/FRONTEND_SPACING_STANDARD.md') }],
    canonicalRoleCount: canonicalRoles.length, supplementalRoleCount: supplementalRoles.length, layoutSxRoleCount: sxPaths.length, rawCssRolePaths: cssPaths.filter(role => role.startsWith('table.')),
    sourceInventory: { spacingCandidates: inventory.summary.spacingPropertyCandidates, directNumeric: inventory.summary.directNumericDeclarations, outsideScale: inventory.summary.outsideScaleLeavesIncludingResponsive, routes: inventory.summary.routes, matchedRoutes: inventory.summary.matchedRoutes, parserDiagnostics: inventory.summary.parserDiagnostics },
    consumers: { importedByApplicationModules: 0, plannedUsage: 'W05-W25 connect theme/shared shell and 16 route modules in dependency order.' },
    checks, commands: commands.map(({ name, executable, args, cwd, exitCode }) => ({ name, executable, args, cwd, exitCode })), commandLog: 'W02/verify-w02-bridge-20261005.log',
    limitations: ['No consumer source migration was performed in W02; the typed bridge precedes adoption in W05-W25.', 'The inventory collector marks semantic factor references NON_NUMERIC_REVIEW; W03 must resolve these and enforce consumer ownership.', 'No browser route geometry or conformance result is claimed by a source/type/boundary check.'],
};
fs.writeFileSync(path.join(evidenceDir, 'W02', 'verify-w02-bridge-20261005.log'), commands.map(command => JSON.stringify(command, null, 2)).join('\n\n') + '\n');
fs.writeFileSync(path.join(evidenceDir, 'W02', 'verify-w02-bridge-20261005.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: result.status, checks: checks.map(({ name, status }) => ({ name, status })), roles: { canonical: canonicalRoles.length, supplemental: supplementalRoles.length, bridge: sxPaths.length, rawCss: result.rawCssRolePaths }, inventory: result.sourceInventory }, null, 2));
if (result.status !== 'PASS_W02_BRIDGE') process.exitCode = 1;
