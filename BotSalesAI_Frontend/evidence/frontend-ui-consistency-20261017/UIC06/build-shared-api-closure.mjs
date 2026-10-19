import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { uiSourceFiles } from '../../../scripts/ui-source-files.mjs';

const root = process.cwd();
const sharedDir = path.join(root, 'apps/web/src/shared/ui');
const testFile = 'apps/web/tests/shared-ui-render-contract.test.tsx';
const catalogFile = 'apps/web/src/shared/ui/README.md';
const standardFile = 'docs/FRONTEND_SPACING_STANDARD.md';
const proofTests = [
    testFile,
    'tests/ui-shared-api-contract.test.mjs',
    'tests/ui-composition-checker.test.mjs',
    'tests/ui-composition-ancestry.test.mjs',
    'tests/ui-layout-binding-gates.test.mjs',
    'tests/layout-checker.test.mjs',
    'tests/ui-component-layout.spec.ts',
    'tests/ui-composition-layout.spec.ts',
    'tests/ui-composition-positive-ancestry.spec.ts',
    'tests/ui-density-layout.spec.ts',
    'tests/ui-panel-layout.spec.ts',
    'tests/ui-toolbar-layout.spec.ts',
    'tests/ui-query-state-layout.spec.ts',
    'tests/ui-width-layout.spec.ts',
];
const proofTools = [
    'scripts/check-ui-composition.mjs',
    'scripts/check-layout.mjs',
];
const componentFiles = fs.readdirSync(sharedDir)
    .filter(name => name.endsWith('.tsx') && name !== 'composition.tsx')
    .map(name => `apps/web/src/shared/ui/${name}`);
const sharedFiles = [...componentFiles, 'apps/web/src/shared/ui/composition.tsx'];
const config = ts.readConfigFile(path.join(root, 'apps/web/tsconfig.json'), ts.sys.readFile);
assert.equal(config.error, undefined, 'apps/web/tsconfig.json must parse');
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(path.join(root, 'apps/web/tsconfig.json')));
const program = ts.createProgram([...sharedFiles, 'apps/web/src/shared/ui/layout.ts'].map(file => path.join(root, file)), parsed.options);
const checker = program.getTypeChecker();
const normalize = file => path.resolve(file).replaceAll('\\', '/').toLowerCase();

function exportsOf(file) {
    const source = program.getSourceFile(path.join(root, file));
    assert.ok(source?.symbol, `TypeScript module is missing: ${file}`);
    return checker.getExportsOfModule(source.symbol);
}

const apiSymbols = sharedFiles.flatMap(file => exportsOf(file)
    .filter(symbol => {
        const declaration = symbol.valueDeclaration;
        return declaration && ts.isFunctionDeclaration(declaration) && declaration.parameters[0];
    })
    .map(symbol => ({ symbol, name: symbol.getName(), owner: path.relative(root, symbol.valueDeclaration.getSourceFile().fileName).replaceAll('\\', '/') })));
const symbolByName = new Map(apiSymbols.map(api => [api.name, api.symbol]));
const exportByOwner = new Map(sharedFiles.map(file => [normalize(path.join(root, file)), new Set(exportsOf(file).map(symbol => symbol.getName()))]));

function importBindings(source) {
    const locals = new Map();
    const namespaces = new Map();
    for (const statement of source.statements) {
        if (!ts.isImportDeclaration(statement) || !statement.importClause || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
        const specifier = statement.moduleSpecifier.text.replaceAll('\\', '/');
        if (!specifier.includes('shared/ui/')) continue;
        const targetBase = specifier.startsWith('@/')
            ? path.join(root, 'apps/web/src', specifier.slice(2))
            : path.resolve(path.dirname(source.fileName), specifier);
        const target = normalize(path.extname(targetBase) ? targetBase : `${targetBase}.tsx`);
        const exported = exportByOwner.get(target);
        if (!exported) continue;
        const bindings = statement.importClause.namedBindings;
        if (bindings && ts.isNamespaceImport(bindings)) namespaces.set(bindings.name.text, exported);
        if (bindings && ts.isNamedImports(bindings)) {
            for (const item of bindings.elements) {
                const exportedName = item.propertyName?.text || item.name.text;
                if (exported.has(exportedName)) locals.set(item.name.text, exportedName);
            }
        }
    }
    const unwrap = node => {
        while (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) node = node.expression;
        return node;
    };
    let changed = true;
    while (changed) {
        changed = false;
        const visit = node => {
            if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
                const initializer = unwrap(node.initializer);
                if (ts.isIdentifier(initializer) && locals.has(initializer.text) && !locals.has(node.name.text)) {
                    locals.set(node.name.text, locals.get(initializer.text));
                    changed = true;
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(source);
    }
    return { locals, namespaces };
}

function resolveTag(tag, bindings) {
    if (ts.isIdentifier(tag)) return bindings.locals.get(tag.text);
    if (ts.isPropertyAccessExpression(tag) && ts.isIdentifier(tag.expression)) return bindings.namespaces.get(tag.expression.text)?.has(tag.name.text) ? tag.name.text : undefined;
    return undefined;
}

const consumers = new Map(apiSymbols.map(api => [api.name, new Map()]));
const appRoot = normalize(path.join(root, 'apps/web/src')) + '/';
const ownerRoot = normalize(sharedDir) + '/';
const productionFiles = uiSourceFiles(root)
    .filter(file => normalize(file).startsWith(appRoot) && normalize(file).endsWith('.tsx') && !normalize(file).startsWith(ownerRoot));
for (const file of productionFiles) {
    const source = program.getSourceFile(path.resolve(file)) || ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), parsed.options.target || ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const bindings = importBindings(source);
    const visit = node => {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
            const name = resolveTag(node.tagName, bindings);
            if (name && consumers.has(name)) {
                const row = consumers.get(name);
                const relative = path.relative(root, source.fileName).replaceAll('\\', '/');
                const previous = row.get(relative) || 0;
                row.set(relative, previous + 1);
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
}

const renderSource = fs.readFileSync(path.join(root, testFile), 'utf8');
const renderTitles = renderSource.split(/\r?\n/)
    .filter(line => /^\s*it(?:\.each\([^)]*\))?\(/.test(line))
    .map(line => line.match(/\('([^']+)'/)?.[1])
    .filter(Boolean);
const lifecycleZeroUse = new Set(['PartialDataNotice', 'CapabilityUnavailable']);
const apiRows = apiSymbols.map(({ name, owner, symbol }) => {
    const declaration = symbol.valueDeclaration;
    const start = declaration.name.getStart(declaration.getSourceFile());
    const sourceLine = declaration.getSourceFile().getLineAndCharacterOfPosition(start).line + 1;
    const files = consumers.get(name);
    const apiUses = [...files.values()].reduce((sum, count) => sum + count, 0);
    const rendered = renderSource.includes(`<${name}`) && renderTitles.some(title => new RegExp(`\\b${name}\\b`).test(title));
    const disposition = apiUses === 0 ? 'KEEP_ZERO_USE_LIFECYCLE_REVIEWED' : 'KEEP_CURRENT_AFTER_CONSUMER_AND_RENDER_REVIEW';
    assert.ok(apiUses > 0 || lifecycleZeroUse.has(name), `${name} has no production consumer and no explicit lifecycle disposition`);
    assert.ok(rendered, `${name} lacks a direct rendered contract case`);
    return {
        api: name,
        owner,
        sourceLine,
        productionConsumerFiles: Object.fromEntries([...files.entries()].sort(([a], [b]) => a.localeCompare(b))),
        productionConsumerFileCount: files.size,
        productionJsxUseCount: apiUses,
        renderedContractTest: testFile,
        renderedContractCoverage: 'PASS',
        disposition,
    };
});

const affectedFiles = new Set([
    testFile,
    catalogFile,
    standardFile,
    ...proofTests,
    ...proofTools,
    ...sharedFiles,
    ...apiRows.flatMap(row => Object.keys(row.productionConsumerFiles)),
]);
const fingerprints = Object.fromEntries([...affectedFiles].sort().map(file => [file,
    crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') ]));
const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    scope: 'Resolved TypeScript shared component/composition function exports; production JSX consumers; named direct render contract tests. Local frontend source evidence only.',
    summary: {
        publicComponentAndCompositionExports: apiRows.length,
        exportsWithProductionConsumers: apiRows.filter(row => row.productionConsumerFileCount > 0).length,
        explicitZeroUseLifecycleExports: apiRows.filter(row => row.productionConsumerFileCount === 0).map(row => row.api),
        uniqueProductionConsumerFiles: new Set(apiRows.flatMap(row => Object.keys(row.productionConsumerFiles))).size,
        directRenderedExports: apiRows.filter(row => row.renderedContractCoverage === 'PASS').length,
        dispositionCoverage: apiRows.filter(row => row.disposition.startsWith('KEEP_')).length,
    },
    apis: apiRows.sort((a, b) => a.api.localeCompare(b.api)),
    sourceFingerprints: fingerprints,
};
assert.equal(report.summary.publicComponentAndCompositionExports, 28);
assert.equal(report.summary.directRenderedExports, 28);
assert.equal(report.summary.dispositionCoverage, 28);
assert.deepEqual(report.summary.explicitZeroUseLifecycleExports.sort(), [...lifecycleZeroUse].sort());
const output = path.join(root, 'evidence/frontend-ui-consistency-20261017/UIC06/shared-api-closure.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(root, output), summary: report.summary, fingerprintCount: Object.keys(fingerprints).length }, null, 2));
