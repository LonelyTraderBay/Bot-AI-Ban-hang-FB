import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, typescript } from './tools.mjs';

const { ts } = typescript();
const defaultSourceRoot = path.join(root, 'apps/web/src');
const sourceRoot = process.argv[2] ? path.resolve(process.argv[2]) : defaultSourceRoot;
const reportPath = process.argv[3]
    ? path.resolve(process.argv[3])
    : path.join(root, 'evidence/boundaries.json');
const issues = [];
const graph = new Map();
let importCount = 0;

function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const entryPath = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(entryPath) : [entryPath];
    }).filter(file => /\.(ts|tsx)$/.test(file));
}

function resolveImport(specifier, importer) {
    const base = specifier.startsWith('@/')
        ? path.join(sourceRoot, specifier.slice(2))
        : specifier === '@botsales/contracts'
            ? path.join(root, 'packages/contracts/src/index.ts')
            : specifier === '@botsales/tokens'
                ? path.join(root, 'packages/design-tokens/src/index.ts')
                : specifier.startsWith('.')
                    ? path.resolve(path.dirname(importer), specifier)
                    : null;

    if (!base) return null;
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.json`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }

    issues.push(`Unresolved local import ${specifier}: ${path.relative(root, importer)}`);
    return null;
}

for (const file of walk(sourceRoot)) {
    const tree = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const diagnostic of tree.parseDiagnostics) {
        const position = diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
        const location = position ? `:${position.line + 1}:${position.character + 1}` : '';
        issues.push(`Parse error ${path.relative(sourceRoot, file)}${location}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
    }

    const edges = [];
    const from = path.relative(sourceRoot, file).replaceAll('\\', '/');
    function visit(node) {
        let specifier = null;
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            specifier = node.moduleSpecifier.text;
        } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
            specifier = node.arguments[0].text;
        }

        if (specifier) {
            importCount++;
            const target = resolveImport(specifier, file);
            if (target) {
                edges.push(target);
                const to = path.relative(sourceRoot, target).replaceAll('\\', '/');
                const fromModule = from.match(/^modules\/([^/]+)/);
                const toModule = to.match(/^modules\/([^/]+)/);
                const fromApp = from.startsWith('app/');
                if (fromModule && toModule && fromModule[1] !== toModule[1]) issues.push(`Cross-feature import ${from} → ${to}`);
                if (fromModule && (to.startsWith('app/') || to.startsWith('mocks/'))) issues.push(`Feature imports application/mock ${from} → ${to}`);
                if (fromApp && toModule && !new RegExp(`^modules/${toModule[1]}/index\\.(?:ts|tsx)$`).test(to)) issues.push(`App deep import ${from} → ${to}; import the module public entry instead`);
                if (from.startsWith('shared/') && /^(app|modules|mocks)\//.test(to)) issues.push(`Shared dependency violation ${from} → ${to}`);
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(tree);
    graph.set(file, edges);
}

const visited = new Set();
const active = new Set();
function visitGraph(file, trail = []) {
    if (active.has(file)) {
        issues.push(`Import cycle: ${[...trail, file].map(item => path.relative(sourceRoot, item)).join(' → ')}`);
        return;
    }
    if (visited.has(file) || !graph.has(file)) return;
    visited.add(file);
    active.add(file);
    for (const target of graph.get(file)) visitGraph(target, [...trail, file]);
    active.delete(file);
}
for (const file of graph.keys()) visitGraph(file);

let fixtureSummary;
if (sourceRoot === defaultSourceRoot) {
    const fixtureRun = spawnSync(process.execPath, [path.join(root, 'tests/architecture/check-boundaries.mjs')], { cwd: root, encoding: 'utf8' });
    fixtureSummary = fixtureRun.status === 0 ? fixtureRun.stdout.trim() : 'FAIL';
    if (fixtureRun.status !== 0) issues.push(`Negative boundary fixtures failed: ${fixtureRun.stderr || fixtureRun.stdout}`);
}

const report = {
    checkedAt: new Date().toISOString(),
    scope: 'AST imports resolve aliases/relative paths, module boundaries and cycles; parser diagnostics are errors',
    files: graph.size,
    imports: importCount,
    ...(fixtureSummary ? { negativeFixtures: fixtureSummary } : {}),
    status: issues.length ? 'FAIL' : 'PASS',
    issues,
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (issues.length) process.exitCode = 1;
