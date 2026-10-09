import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { createUiBindings } from '../scripts/ui-bindings.mjs';
import { isScriptSource, uiSourceFiles } from '../scripts/ui-source-files.mjs';
import { bodyModes, finiteProps, flowKeys, geometryKeys, independentSurfaceModes, insetModes, publicProps } from '../scripts/check-ui-composition.mjs';

const root = process.cwd();
const configPath = path.join(root, 'apps/web/tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
assert.equal(config.error, undefined, 'apps/web/tsconfig.json must be readable');
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
const componentFiles = fs.readdirSync(path.join(root, 'apps/web/src/shared/ui')).filter(name => name.endsWith('.tsx') && name !== 'composition.tsx').map(name => `apps/web/src/shared/ui/${name}`);
const sharedFiles = [...componentFiles, 'apps/web/src/shared/ui/composition.tsx'];
const programRoots = [...new Set([...sharedFiles, 'apps/web/src/shared/ui/layout.ts'].map(file => path.join(root, file)))];
const program = ts.createProgram(programRoots, parsed.options);
const checker = program.getTypeChecker();

function readSourceFile(file) {
    const absolute = path.resolve(root, file);
    return program.getSourceFile(absolute) || ts.createSourceFile(
        absolute,
        fs.readFileSync(absolute, 'utf8'),
        parsed.options.target || ts.ScriptTarget.Latest,
        true,
        absolute.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
}

function moduleExports(file) {
    const source = program.getSourceFile(path.join(root, file));
    assert.ok(source?.symbol, `expected TypeScript module ${file}`);
    return checker.getExportsOfModule(source.symbol);
}

function publicFunctionContracts(file) {
    return moduleExports(file).flatMap(symbol => {
        const declaration = symbol.valueDeclaration;
        if (!declaration || !ts.isFunctionDeclaration(declaration) || !declaration.parameters[0]) return [];
        const parameter = declaration.parameters[0];
        const type = checker.getTypeOfSymbolAtLocation(parameter.symbol, declaration);
        const names = type => type.isUnionOrIntersection()
            ? [...new Set(type.types.flatMap(names))]
            : checker.getPropertiesOfType(type).map(property => property.getName());
        return [{ name: symbol.getName(), declaration, type, props: names(type) }];
    });
}

const forbiddenStyleProps = new Set([
    'sx', 'style', 'className', 'spacing', 'gap', 'rowGap', 'columnGap',
    'm', 'mt', 'mr', 'mb', 'ml', 'mx', 'my', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
    'p', 'pt', 'pr', 'pb', 'pl', 'px', 'py', 'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
]);

function importedJsxCandidates(source, exportedFiles) {
    const locals = new Map();
    const namespaces = new Map();
    const normalize = file => path.resolve(file).replaceAll('\\', '/').toLowerCase();
    const resolveSharedUiPath = specifier => {
        const target = specifier.startsWith('@/')
            ? path.join(root, 'apps/web/src', specifier.slice(2))
            : path.resolve(path.dirname(source.fileName), specifier);
        return normalize(path.extname(target) ? target : `${target}.tsx`);
    };
    for (const statement of source.statements) {
        if (!ts.isImportDeclaration(statement) || !statement.importClause || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
        const specifier = statement.moduleSpecifier.text.replaceAll('\\', '/');
        if (!specifier.includes('shared/ui/')) continue;
        const resolvedFile = resolveSharedUiPath(specifier);
        const namesFromModule = new Map([...exportedFiles].filter(([, file]) => normalize(file) === resolvedFile).map(([name]) => [name, name]));
        if (!namesFromModule.size) continue;
        const bindings = statement.importClause.namedBindings;
        if (bindings && ts.isNamespaceImport(bindings)) {
            namespaces.set(bindings.name.text, namesFromModule);
        }
        if (bindings && ts.isNamedImports(bindings)) {
            for (const item of bindings.elements) {
                const exportedName = item.propertyName?.text || item.name.text;
                if (namesFromModule.has(exportedName)) locals.set(item.name.text, exportedName);
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

function importedJsxSymbol(tag, candidates) {
    if (ts.isIdentifier(tag)) return candidates.locals.get(tag.text);
    if (ts.isPropertyAccessExpression(tag) && ts.isIdentifier(tag.expression))
        return candidates.namespaces.get(tag.expression.text)?.get(tag.name.text);
    return undefined;
}

function symbolSourcePath(symbol) {
    return (symbol.valueDeclaration || symbol.declarations?.[0])?.getSourceFile().fileName;
}

test('Amount consumers declare wrapping outside DataTable columns and keep table money unbroken', () => {
    let wrapped = 0, table = 0;
    const moduleRoot = path.join(root, 'apps/web/src/modules');
    const amountFiles = uiSourceFiles(root).filter(file => path.resolve(file).startsWith(moduleRoot + path.sep) && file.endsWith('.tsx'));
    for (const file of amountFiles) {
        const sourceText = fs.readFileSync(file, 'utf8');
        if (!sourceText.includes('<Amount') && !sourceText.includes('.Amount')) continue;
        const source = readSourceFile(file);
        assert.ok(source, `missing TypeScript program source for ${file}`);
        const candidates = importedJsxCandidates(source, new Map([['Amount', path.join(root, 'apps/web/src/shared/ui/components.tsx')]]));
        const visit = node => {
            if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && importedJsxSymbol(node.tagName, candidates) === 'Amount') {
                let column = false;
                for (let parent = node.parent; parent; parent = parent.parent) {
                    if (ts.isPropertyAssignment(parent) && parent.name.getText(source) === 'render') column = true;
                }
                const wrap = node.attributes.properties.find(prop => ts.isJsxAttribute(prop) && prop.name.getText(source) === 'wrap');
                if (column) { assert.equal(Boolean(wrap), false, 'table Amount uses the unbroken default'); table++; }
                else { assert.ok(wrap && (!wrap.initializer || wrap.initializer.getText(source) === '{true}'), `outside-table Amount must wrap: ${source.fileName}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`); wrapped++; }
            }
            ts.forEachChild(node, visit);
        };
        visit(source);
    }
    assert.ok(wrapped > 0 && table > 0, 'both Money presentation branches need real consumers');
});

test('the shared catalog covers every public React component and supporting Column type', () => {
    const componentFile = 'apps/web/src/shared/ui/components.tsx';
    const compositionFile = 'apps/web/src/shared/ui/composition.tsx';
    const components = componentFiles.flatMap(publicFunctionContracts).map(api => api.name);
    const compositions = publicFunctionContracts(compositionFile).map(api => api.name);
    const catalog = fs.readFileSync(path.join(root, 'apps/web/src/shared/ui/README.md'), 'utf8');
    const actual = [...components, ...compositions].sort();
    const catalogRows = [...catalog.matchAll(/^\| ([A-Z][A-Za-z0-9]*) \//gm)].map(match => match[1]);
    const documented = catalogRows.filter(name => actual.includes(name));
    const unrecognized = catalogRows.filter(name => !actual.includes(name));

    assert.ok(components.length > 0 && compositions.length > 0, 'both public owner families must be discovered');
    assert.equal(new Set(actual).size, actual.length, 'public API names must be unique across owner files');
    assert.deepEqual(documented.sort(), actual, 'every public component must have exactly one CURRENT/TARGET catalog row');
    assert.ok(unrecognized.every(name => name === 'Component' || name === 'Composition'), `catalog table has unmapped API rows: ${unrecognized.join(', ')}`);
    assert.match(catalog, /`Column<T>`/, 'DataTable supporting type must remain documented');
    assert.ok(moduleExports(componentFile).some(symbol => symbol.getName() === 'Column'), 'Column<T> must remain part of the shared API inventory');

    const rowByName = new Map([...catalog.matchAll(/^\| ([A-Z][A-Za-z0-9]*) \/[^\n]*$/gm)]
        .filter(match => actual.includes(match[1]))
        .map(match => [match[1], match[0]]));
    const compositionSection = catalog.split('## 3. CURRENT/TARGET — sáu compositions')[1]?.split('## 4. Owner UI ngoài catalog')[0] || '';
    for (const prop of flowKeys.filter(name => name !== 'key')) assert.ok(compositionSection.includes(prop), `shared flow prop ${prop} is missing from the catalog contract`);
    const compositionNames = new Set(compositions);
    for (const api of [...componentFiles.flatMap(publicFunctionContracts), ...publicFunctionContracts(compositionFile)]) {
        const row = rowByName.get(api.name);
        assert.ok(row, `missing catalog row for ${api.name}`);
        const undocumented = api.props.filter(prop => !(compositionNames.has(api.name) && flowKeys.includes(prop) && prop !== 'key') && !row.includes(prop));
        assert.deepEqual(undocumented, [], `${api.name} props are missing from its CURRENT/TARGET row`);
    }
});

test('SPC-067 covers discovered public Shared APIs without a fixed export count', () => {
    const standard = fs.readFileSync(path.join(root, 'docs/FRONTEND_SPACING_STANDARD.md'), 'utf8');
    const block = standard.split('**SPC-067')[1]?.split('**SPC-068')[0];
    assert.ok(block, 'the normative forwarding rule must exist');
    assert.match(block, /mọi public Shared API và export mới/);
    assert.match(block, /shared\/ui\/README\.md/);
    assert.doesNotMatch(block, /\b\d+\s+(?:shared|public)\s+(?:exports|APIs|components)/i, 'the rule must cover future discovered exports');
    assert.ok(sharedFiles.flatMap(publicFunctionContracts).length > 0, 'discovery cannot silently become empty');
});

test('every public React API has a direct rendered contract test', () => {
    const exports = sharedFiles.flatMap(publicFunctionContracts);
    const renderTestPath = path.join(root, 'apps/web/tests/shared-ui-render-contract.test.tsx');
    assert.ok(fs.existsSync(renderTestPath), 'the shared rendered-contract suite must exist');
    const renderSource = fs.readFileSync(renderTestPath, 'utf8');
    const testTitles = renderSource.split(/\r?\n/)
        .filter(line => /^\s*it(?:\.each\()/.test(line) || /^\s*it\(/.test(line))
        .map(line => line.match(/\('([^']+)'/)?.[1])
        .filter(Boolean);
    for (const api of exports) {
        assert.match(renderSource, new RegExp('<' + api.name + '(?:\\s|>)'), api.name + ' must be rendered by the contract suite');
        assert.ok(testTitles.some(title => new RegExp('\\b' + api.name + '\\b').test(title)), api.name + ' must have a named rendered-contract case');
    }
    assert.match(renderSource, /\bColumn\s*</, 'DataTable Column<T> must participate in a rendered contract case');
});

test('catalog declaration lines and stated JSX counts match resolved source symbols', () => {
    const catalog = fs.readFileSync(path.join(root, 'apps/web/src/shared/ui/README.md'), 'utf8');
    const owners = new Map(sharedFiles.flatMap(file => publicFunctionContracts(file).map(api => [
        moduleExports(file).find(symbol => symbol.getName() === api.name),
        { ...api, uses: 0 },
    ])));
    const ownerByName = new Map([...owners].map(([symbol, api]) => [api.name, symbol]));
    for (const file of uiSourceFiles(root).filter(file => path.resolve(file).startsWith(path.join(root, 'apps/web/src') + path.sep))) {
        const source = readSourceFile(file);
        if (source.isDeclarationFile) continue;
        const candidates = importedJsxCandidates(source, new Map([...owners].map(([symbol, api]) => [api.name, symbolSourcePath(symbol)])));
        function visit(node) {
            if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && importedJsxSymbol(node.tagName, candidates)) {
                const symbol = ownerByName.get(importedJsxSymbol(node.tagName, candidates));
                const api = owners.get(symbol);
                if (api && api.declaration.getSourceFile() !== source) api.uses++;
            }
            ts.forEachChild(node, visit);
        }
        visit(source);
    }
    const staleRows = [];
    for (const api of owners.values()) {
        const source = api.declaration.getSourceFile();
        const actualLine = source.getLineAndCharacterOfPosition(api.declaration.name.getStart(source)).line + 1;
        const row = catalog.match(new RegExp('^\\| ' + api.name + ' /[^\\n]+$', 'm'))?.[0];
        assert.ok(row, `${api.name} catalog row is required`);
        const documentedLine = Number(row.match(/\/(\d+) \|/)?.[1]);
        if (documentedLine !== actualLine) staleRows.push(`${api.name}: documented line ${documentedLine}, source line ${actualLine}`);
        for (const count of row.matchAll(/\b(\d+) uses\b/g))
            if (Number(count[1]) !== api.uses) staleRows.push(`${api.name}: documented uses ${count[1]}, source uses ${api.uses}`);
    }
    assert.deepEqual(staleRows, [], `shared UI catalog has stale source line/use counts:\n${staleRows.join('\n')}`);
    assert.match(catalog, /<a id="8-layout-owner-crosswalk"><\/a>/, 'the canonical crosswalk anchor must be stable');
});

test('every shared React export has a resolved production consumer or an explicit zero-use lifecycle decision', () => {
    const owners = new Map(sharedFiles.flatMap(file => publicFunctionContracts(file).map(api => [moduleExports(file).find(symbol => symbol.getName() === api.name), api.name])));
    const ownerByName = new Map([...owners].map(([symbol, name]) => [name, symbol]));
    const consumers = new Map([...owners].map(([symbol]) => [symbol, new Set()]));
    const normalized = file => path.resolve(file).replaceAll('\\', '/').toLowerCase();
    const sourceRoot = `${normalized(path.join(root, 'apps/web/src'))}/`;
    const ownerRoot = `${sourceRoot}shared/ui/`;
    const productionFiles = uiSourceFiles(root).filter(file => {
        const normalizedFile = normalized(file);
        return normalizedFile.startsWith(sourceRoot) && normalizedFile.endsWith('.tsx') && !normalizedFile.startsWith(ownerRoot);
    }).map(readSourceFile);

    function tagName(node) {
        return ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node) ? node.tagName : undefined;
    }

    for (const source of productionFiles) {
        const candidates = importedJsxCandidates(source, new Map([...owners].map(([symbol, name]) => [name, symbolSourcePath(symbol)])));
        function visit(node) {
            const tag = tagName(node);
            if (tag && importedJsxSymbol(tag, candidates)) {
                const resolved = ownerByName.get(importedJsxSymbol(tag, candidates));
                const files = resolved ? consumers.get(resolved) : undefined;
                if (files) files.add(path.relative(root, source.fileName).replaceAll('\\', '/'));
            }
            ts.forEachChild(node, visit);
        }
        visit(source);
    }

    const zeroUseOwners = new Set(['PartialDataNotice', 'CapabilityUnavailable']);
    const catalog = fs.readFileSync(path.join(root, 'apps/web/src/shared/ui/README.md'), 'utf8');
    for (const [symbol, name] of owners) {
        const files = consumers.get(symbol);
        assert.ok(files, `${name} must remain in the consumer inventory`);
        if (files.size === 0) {
            assert.ok(zeroUseOwners.has(name), `${name} has no production JSX consumer; add a lifecycle decision before accepting the API`);
            assert.match(catalog, new RegExp(`${name}[\\s\\S]{0,500}0 production uses`), `${name} zero-use decision must be explicit in the shared catalog`);
            assert.match(catalog, new RegExp(`${name}[\\s\\S]{0,700}No artificial consumer`), `${name} must not acquire a fake consumer`);
        } else {
            assert.ok(!zeroUseOwners.has(name), `${name} gained a production consumer; refresh its S14 lifecycle evidence and catalog`);
        }
    }
    assert.equal(owners.size, 28, 'public consumer inventory must include all 28 component/composition exports');
});

test('required UI evidence and regression gates remain wired to root verify and the active parent workflow', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const verify = manifest.scripts.verify;
    const evidence = manifest.scripts['test:evidence'];
    assert.match(verify, /npm run test:layout/);
    assert.match(verify, /npm run test:visual-tokens/);
    assert.match(verify, /npm run test:ui-composition/);
    assert.match(verify, /npm run test:evidence/);
    assert.match(evidence, /tests\/ui-evidence-validator\.test\.mjs/);
    assert.match(evidence, /scripts\/validate-ui-evidence\.mjs/);

    const parentWorkflow = path.resolve(root, '../.github/workflows/frontend.yml');
    assert.ok(fs.existsSync(parentWorkflow), 'the active frontend workflow must remain in the repository root');
    assert.equal(fs.existsSync(path.join(root, '.github/workflows/frontend.yml')), false, 'the retired nested workflow must not shadow the parent workflow');
    const workflow = fs.readFileSync(parentWorkflow, 'utf8');
    assert.match(workflow, /^  push:\s*$/m);
    assert.match(workflow, /^  pull_request:\s*$/m);
    assert.doesNotMatch(workflow, /^\s+paths(?:-ignore)?:/m, 'Every change must run the required gates');
    const browserInstall = workflow.indexOf('npx playwright install --with-deps chromium firefox');
    const verifyStep = workflow.indexOf('run: npm run verify');
    assert.ok(browserInstall >= 0 && browserInstall < verifyStep, 'Browser-backed verify requires installed engines first');
    assert.match(workflow, /npm run verify/);
    assert.match(workflow, /npm run test:e2e/);
    assert.match(workflow, /timeout-minutes: 45/);
    assert.match(workflow, /if: \$\{\{ always\(\) \}\}/);
    assert.match(workflow, /upload-artifact/);
});

test('composition prop allowlists match the TypeScript owners exactly', () => {
    const contracts = publicFunctionContracts('apps/web/src/shared/ui/composition.tsx');
    assert.deepEqual(Object.keys(publicProps).sort(), contracts.map(api => api.name).sort());

    for (const api of contracts) {
        const actualProps = [...new Set([...api.props, 'key'])].sort();
        assert.deepEqual([...publicProps[api.name]].sort(), actualProps, `${api.name} checker allowlist drifted from its TypeScript contract`);
    }
});

test('QueryState uses only the approved inline and section pending profiles', () => {
    const api = publicFunctionContracts('apps/web/src/shared/ui/components.tsx').find(item => item.name === 'QueryState');
    assert.ok(api, 'QueryState must remain part of the shared API');
    const prop = checker.getPropertyOfType(api.type, 'pendingProfile');
    assert.ok(prop, 'QueryState must expose its documented pending profile');
    const type = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(prop, api.declaration));
    const allowed = type.isUnion() ? type.types : [type];
    assert.ok(allowed.every(item => item.isStringLiteral()), 'pendingProfile must be a finite string-literal union');
    assert.deepEqual(allowed.map(item => item.value).sort(), ['inline', 'section']);
});

test('QueryState consumers reserve section loading for primary content and keep every other state inline by default', () => {
    const componentFile = 'apps/web/src/shared/ui/components.tsx';
    const compositionFile = 'apps/web/src/shared/ui/composition.tsx';
    const components = new Map(moduleExports(componentFile).map(symbol => [symbol.getName(), symbol]));
    const compositions = new Map(moduleExports(compositionFile).map(symbol => [symbol.getName(), symbol]));
    const queryState = components.get('QueryState');
    const editDialog = components.get('EditDialog');
    assert.ok(queryState && editDialog, 'QueryState and EditDialog must remain canonical shared owners');

    const primaryOwners = new Set(['DataTable', 'Stats', 'SectionGrid', 'Panel', 'FormFields']);
    const ownerSymbols = new Map([...components, ...compositions].filter(([name]) => primaryOwners.has(name)));
    const candidateNames = new Set(['QueryState', 'EditDialog', ...primaryOwners]);
    const candidateSymbols = new Map([...components, ...compositions].filter(([name]) => candidateNames.has(name)).map(([name, symbol]) => [name, symbolSourcePath(symbol)]));
    const moduleRoot = path.join(root, 'apps/web/src/modules');
    const sourceFiles = uiSourceFiles(root).filter(file => path.resolve(file).startsWith(moduleRoot + path.sep) && file.endsWith('.tsx'));
    let placementCount = 0;
    let sectionCount = 0;

    function resolvesTo(tagName, exportedSymbol, candidates) {
        return importedJsxSymbol(tagName, candidates) === exportedSymbol.getName();
    }

    function tagNameOf(node) {
        return ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node) ? node.tagName : undefined;
    }

    for (const file of sourceFiles) {
        const source = readSourceFile(file);
        assert.ok(source, `missing TypeScript program source for ${file}`);
        const candidates = importedJsxCandidates(source, candidateSymbols);
        function visit(node) {
            const queryTag = tagNameOf(node);
            if (queryTag && resolvesTo(queryTag, queryState, candidates)) {
                const queryElement = ts.isJsxElement(node.parent) ? node.parent : undefined;
                const contentOwners = new Set();
                function inspectChildren(child) {
                    const childTag = tagNameOf(child);
                    if (childTag && resolvesTo(childTag, queryState, candidates)) return;
                    if (childTag) {
                        for (const [owner, symbol] of ownerSymbols) if (resolvesTo(childTag, symbol, candidates)) contentOwners.add(owner);
                    }
                    ts.forEachChild(child, inspectChildren);
                }
                for (const child of queryElement?.children || []) inspectChildren(child);

                let insideDialog = false;
                for (let parent = node.parent; parent; parent = parent.parent) {
                    if (ts.isJsxElement(parent) && resolvesTo(parent.openingElement.tagName, editDialog, candidates)) insideDialog = true;
                }
                const shouldUseSection = !insideDialog && contentOwners.size > 0;
                const profileAttribute = node.attributes.properties.find(property => ts.isJsxAttribute(property) && property.name.text === 'pendingProfile');
                const profile = !profileAttribute ? undefined
                    : profileAttribute.initializer && ts.isStringLiteral(profileAttribute.initializer) ? profileAttribute.initializer.text
                        : '<non-literal>';
                const location = source.getLineAndCharacterOfPosition(node.getStart(source));
                const where = `${path.relative(root, file)}:${location.line + 1}`;
                assert.equal(profile, shouldUseSection ? 'section' : undefined,
                    `${where}: only a primary data/form region outside EditDialog may opt into QueryState section loading; other consumers must use the inline default`);
                placementCount++;
                if (shouldUseSection) sectionCount++;
            }
            ts.forEachChild(node, visit);
        }
        visit(source);
    }

    assert.ok(placementCount > 0, 'the route modules must contain shared QueryState consumers');
    assert.ok(sectionCount > 0, 'large primary QueryState regions must use their reserved section profile');
});

test('body modes, placement roles and geometry keys match the TypeScript contracts', () => {
    const contracts = publicFunctionContracts('apps/web/src/shared/ui/composition.tsx');
    const components = publicFunctionContracts('apps/web/src/shared/ui/components.tsx');
    const byName = new Map(contracts.map(api => [api.name, api]));
    const ownerContract = owner => byName.get(owner) || components.find(api => api.name === owner);

    for (const [owner, values] of Object.entries(bodyModes)) {
        const api = ownerContract(owner);
        assert.ok(api, `missing TypeScript owner ${owner}`);
        const prop = checker.getPropertyOfType(api.type, 'bodyMode');
        assert.ok(prop, `${owner} must declare bodyMode`);
        const valueType = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(prop, api.declaration));
        const allowed = valueType.isUnion() ? valueType.types : [valueType];
        assert.ok(allowed.every(type => type.isStringLiteral()), `${owner}.bodyMode must remain a finite string-literal union`);
        assert.deepEqual(allowed.map(type => type.value).sort(), [...values].sort(), `${owner}.bodyMode checker map drifted`);
    }

    for (const [owner, values] of Object.entries(insetModes)) {
        assert.ok(bodyModes[owner], `inset owner ${owner} has no public bodyMode contract`);
        assert.ok([...values].every(value => bodyModes[owner].has(value)), `${owner} inset modes must be supported bodyMode values`);
    }
    for (const [owner, values] of Object.entries(independentSurfaceModes)) {
        assert.ok(insetModes[owner], `independent surface ${owner} is not an inset owner`);
        assert.ok([...values].every(value => insetModes[owner].has(value)), `${owner} independent surfaces must own an inset`);
    }

    for (const [owner, props] of Object.entries(finiteProps)) {
        const api = ownerContract(owner);
        assert.ok(api, `missing composition owner ${owner}`);
        for (const [name, values] of Object.entries(props)) {
            const prop = checker.getPropertyOfType(api.type, name);
            assert.ok(prop, `${owner}.${name} must be declared`);
            const valueType = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(prop, api.declaration));
            const allowed = valueType.isUnion() ? valueType.types : [valueType];
            assert.ok(allowed.every(type => type.isStringLiteral()), `${owner}.${name} must remain a finite string-literal union`);
            assert.deepEqual(allowed.map(type => type.value).sort(), [...values].sort(), `${owner}.${name} checker map drifted`);
        }
    }

    for (const api of contracts) {
        const prop = checker.getPropertyOfType(api.type, 'geometry');
        assert.ok(prop, `${api.name} must expose the documented geometry object`);
        const geometry = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(prop, api.declaration));
        const actual = checker.getPropertiesOfType(geometry).map(property => property.getName()).sort();
        assert.deepEqual([...geometryKeys].sort(), actual, `${api.name}.geometry checker keys drifted`);
    }
});

test('Panel geometry and DataTable columns remain closed public contracts', () => {
    const components = publicFunctionContracts('apps/web/src/shared/ui/components.tsx');
    const panel = components.find(api => api.name === 'Panel');
    assert.ok(panel, 'Panel must remain part of the public shared API');
    const panelGeometry = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(
        checker.getPropertyOfType(panel.type, 'geometry'), panel.declaration,
    ));
    assert.deepEqual(
        checker.getPropertiesOfType(panelGeometry).map(property => property.getName()).sort(),
        ['display', 'flexDirection', 'gridColumn', 'height'],
        'Panel geometry must stay limited to its documented layout keys',
    );
    const breakpoints = ['xs', 'sm', 'md', 'lg', 'xl'];
    const responsiveObjectMembers = type => (type.isUnion() ? type.types : [type])
        .filter(member => (member.flags & ts.TypeFlags.Object) !== 0);
    for (const name of ['display', 'flexDirection', 'gridColumn']) {
        const property = checker.getPropertyOfType(panelGeometry, name);
        const valueType = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(property, property.valueDeclaration));
        const responsiveObjects = responsiveObjectMembers(valueType);
        assert.equal(responsiveObjects.length, 1, `Panel.geometry.${name} must have one responsive object branch`);
        assert.deepEqual(checker.getPropertiesOfType(responsiveObjects[0]).map(item => item.getName()).sort(), [...breakpoints].sort());
        assert.equal(checker.getIndexTypeOfType(responsiveObjects[0], ts.IndexKind.String), undefined, `Panel.geometry.${name} must reject arbitrary breakpoint keys`);
    }
    const height = checker.getPropertyOfType(panelGeometry, 'height');
    const heightType = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(height, height.valueDeclaration));
    assert.equal(responsiveObjectMembers(heightType).length, 0, 'Panel.geometry.height is intentionally non-responsive');

    const column = moduleExports('apps/web/src/shared/ui/components.tsx').find(symbol => symbol.getName() === 'Column');
    assert.ok(column, 'Column<T> must remain exported for typed DataTable columns');
    const columnType = checker.getDeclaredTypeOfSymbol(column);
    const properties = new Map(checker.getPropertiesOfType(columnType).map(property => [property.getName(), property]));
    assert.deepEqual([...properties.keys()].sort(), ['align', 'key', 'label', 'render']);
    const alignProperty = properties.get('align');
    const align = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(alignProperty, alignProperty.valueDeclaration));
    const alignValues = align.isUnion() ? align.types : [align];
    assert.ok(alignValues.every(type => type.isStringLiteral()), `Column.align must remain a finite variant; resolved ${checker.typeToString(align)}`);
    assert.deepEqual(alignValues.map(type => type.value).sort(), ['center', 'left', 'right']);
    const renderProperty = properties.get('render');
    const render = checker.getTypeOfSymbolAtLocation(renderProperty, renderProperty.valueDeclaration);
    assert.equal(render.getCallSignatures().length, 1, 'Column.render must remain one typed content slot');
    const renderSignature = render.getCallSignatures()[0];
    assert.equal(renderSignature.getParameters().length, 1, 'Column.render receives exactly one row');
    const rowType = checker.getTypeOfSymbolAtLocation(renderSignature.getParameters()[0], renderProperty.valueDeclaration);
    assert.equal(checker.typeToString(rowType), 'T', 'Column.render must receive its DataTable row type');
    assert.equal(checker.typeToString(renderSignature.getReturnType()), 'ReactNode', 'Column.render must remain a ReactNode slot');

    const sectionGrid = publicFunctionContracts('apps/web/src/shared/ui/composition.tsx').find(api => api.name === 'SectionGrid');
    const columns = checker.getPropertyOfType(sectionGrid.type, 'columns');
    const columnTypes = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(columns, columns.valueDeclaration));
    const responsiveColumns = responsiveObjectMembers(columnTypes);
    assert.equal(responsiveColumns.length, 1, 'SectionGrid.columns must retain one responsive object branch');
    assert.deepEqual(checker.getPropertiesOfType(responsiveColumns[0]).map(item => item.getName()).sort(), [...breakpoints].sort());
    assert.equal(checker.getIndexTypeOfType(responsiveColumns[0], ts.IndexKind.String), undefined, 'SectionGrid.columns must reject arbitrary breakpoint keys');
});

test('shared component and composition props expose no arbitrary layout/style escape hatch', () => {
    const contracts = sharedFiles.flatMap(publicFunctionContracts);

    for (const api of contracts) {
        const escaped = api.props.filter(prop => forbiddenStyleProps.has(prop));
        assert.deepEqual(escaped, [], `${api.name} exposes forbidden style props: ${escaped.join(', ')}`);
    }
});

test('layout role types, runtime values, consumers and ownership documentation stay closed', () => {
    const layoutFile = 'apps/web/src/shared/ui/layout.ts';
    const source = readSourceFile(path.join(root, layoutFile));
    assert.ok(source, `expected ${layoutFile}`);
    const contract = source.statements.find(statement => ts.isTypeAliasDeclaration(statement) && statement.name.text === 'LayoutSxContract');
    const layoutDeclaration = source.statements.flatMap(statement => ts.isVariableStatement(statement) ? statement.declarationList.declarations : [])
        .find(declaration => declaration.name.getText(source) === 'layoutSx');
    assert.ok(contract?.type && layoutDeclaration?.initializer, 'LayoutSxContract and runtime layoutSx must both exist');

    const contractPaths = [];
    function collectContract(type, prefix = []) {
        for (const member of type.members) {
            if (!ts.isPropertySignature(member) || !member.name || !member.type) continue;
            const key = member.name.getText(source).replace(/["']/g, '');
            if (ts.isTypeLiteralNode(member.type)) collectContract(member.type, [...prefix, key]);
            else contractPaths.push([...prefix, key].join('.'));
        }
    }
    collectContract(contract.type);

    const unwrap = node => {
        while (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) node = node.expression;
        return node;
    };
    const runtimePaths = [];
    function collectRuntime(node, prefix = []) {
        node = unwrap(node);
        assert.ok(ts.isObjectLiteralExpression(node), `layoutSx.${prefix.join('.')} must be an explicit object`);
        for (const property of node.properties) {
            assert.ok(ts.isPropertyAssignment(property), 'layoutSx roles must not hide behind spread or computed properties');
            const key = property.name.getText(source).replace(/["']/g, '');
            if (prefix.length === 0) collectRuntime(property.initializer, [...prefix, key]);
            else runtimePaths.push([...prefix, key].join('.'));
        }
    }
    collectRuntime(layoutDeclaration.initializer);
    assert.deepEqual(runtimePaths.sort(), contractPaths.sort(), 'runtime layout roles and their TypeScript contract must have identical paths');

    const standard = fs.readFileSync(path.join(root, 'docs/FRONTEND_SPACING_STANDARD.md'), 'utf8');
    const catalog = fs.readFileSync(path.join(root, 'apps/web/src/shared/ui/README.md'), 'utf8');
    const design = fs.readFileSync(path.join(root, 'DESIGN.md'), 'utf8');
    const designFrontmatter = design.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(designFrontmatter, 'DESIGN.md keeps a small machine-readable metadata header');
    assert.match(designFrontmatter[1], /tokens:\s*["']?\.\.\/botsales-kit\/design\/tokens\.json/);
    assert.match(designFrontmatter[1], /uiRules:\s*["']?docs\/FRONTEND_SPACING_STANDARD\.md/);
    assert.match(designFrontmatter[1], /sharedUiCatalog:\s*["']?apps\/web\/src\/shared\/ui\/README\.md/);
    assert.doesNotMatch(designFrontmatter[1], /^(?:colors|typography|rounded|spacing|components):/m, 'DESIGN metadata must not duplicate canonical token values or component/layout rules');
    assert.match(design, /does not duplicate token values or layout rules/);
    assert.match(standard, /leaf paths trong `LayoutSxContract` phải khớp chính xác với object runtime `layoutSx`/);
    assert.match(standard, /phân loại\/rationale `SPACING`, `GEOMETRY` hoặc `INTERNAL`/);
    const registry = catalog.split('## 8. Layout owner crosswalk')[1] || '';
    const registryTable = registry.slice(Math.max(0, registry.indexOf('| Path |')));
    const policyMissing = contractPaths.filter(role => !standard.includes(`\`${role}\``));
    const registryRows = registryTable.split(/\r?\n/).filter(line => line.startsWith('| `'));
    const crosswalk = new Map();
    for (const line of registryRows) {
        const cells = line.split('|').slice(1, 5).map(cell => cell.trim());
        assert.equal(cells.length, 4, `crosswalk row has Path/Class/Owner/Consumer columns: ${line}`);
        const role = cells[0].match(/^`([a-z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*)`$/)?.[1];
        assert.ok(role, `crosswalk row names exactly one layout path: ${line}`);
        assert.ok(!crosswalk.has(role), `crosswalk has one owner row per path: ${role}`);
        assert.ok(['SPACING', 'GEOMETRY', 'INTERNAL'].includes(cells[1]), `${role} has one explicit class`);
        assert.ok(cells[2].length > 0, `${role} has a named owner`);
        const consumers = [...cells[3].matchAll(/`(apps\/web\/src\/[^`]+)`/g)].map(match => match[1]);
        assert.ok(consumers.length > 0, `${role} has at least one real source consumer`);
        for (const consumer of consumers) assert.ok(fs.existsSync(path.join(root, consumer)), `${role} consumer exists: ${consumer}`);
        crosswalk.set(role, { class: cells[1], consumers: [...new Set(consumers)].sort() });
    }
    assert.deepEqual([...crosswalk.keys()].sort(), policyMissing.sort(), 'every role absent from normative policy needs exactly one catalog owner/rationale row');

    const files = uiSourceFiles(root).filter(isScriptSource);
    const bindings = createUiBindings(root, files);
    const usageCounts = new Map(contractPaths.map(role => [role, 0]));
    const observedConsumers = new Map(policyMissing.map(role => [role, new Set()]));
    for (const file of files) {
        const fileSource = bindings.source(file);
        if (!fileSource) continue;
        function visit(node) {
            if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
                const reference = bindings.reference(node);
                if (reference?.owner === 'layout' && reference.exportName === 'layoutSx' && reference.path.length === 2) {
                    const role = reference.path.join('.');
                    if (usageCounts.has(role)) usageCounts.set(role, usageCounts.get(role) + 1);
                    if (observedConsumers.has(role)) observedConsumers.get(role).add(path.relative(root, file).split(path.sep).join('/'));
                }
            }
            ts.forEachChild(node, visit);
        }
        visit(fileSource);
    }
    const unused = [...usageCounts].filter(([, count]) => count === 0).map(([role]) => role);
    assert.deepEqual(unused, [], 'remove or explain layout roles without a real consumer');
    for (const role of policyMissing) {
        assert.deepEqual(crosswalk.get(role).consumers, [...observedConsumers.get(role)].sort(), `${role} crosswalk consumers match resolved source references`);
    }
});
