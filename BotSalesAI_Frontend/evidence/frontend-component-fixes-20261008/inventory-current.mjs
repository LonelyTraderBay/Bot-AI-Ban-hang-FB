import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { loadContractBundle, renderGenerated } from '../../scripts/generate.mjs';

// Read-only product inventory. Only this evidence directory receives output.
const outputDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(outputDir, '../..');
const outputFile = process.argv[2] ? path.resolve(root, process.argv[2]) : path.join(outputDir, 'inventory-current.json');
if (!outputFile.startsWith(path.join(root, 'evidence') + path.sep)) throw new Error('Inventory output must remain in frontend evidence');
const gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' }).trim();
const frontendPrefix = `${path.relative(gitRoot, root).replaceAll('\\', '/')}/`;
const posix = value => value.replaceAll('\\', '/');
const read = file => fs.readFileSync(path.resolve(root, file), 'utf8');
const hash = file => createHash('sha256').update(fs.readFileSync(path.resolve(root, file))).digest('hex');
const gitBlobHash = file => {
    const repoPath = `${frontendPrefix}${file}`;
    for (const revision of [`:${repoPath}`, `HEAD:${repoPath}`]) {
        try {
            return { revision, sha256: createHash('sha256').update(execFileSync('git', ['show', revision], { cwd: gitRoot, maxBuffer: 16e6, stdio: ['ignore', 'pipe', 'ignore'] })).digest('hex') };
        } catch { /* A staged deletion has no index blob; fall back to HEAD. */ }
    }
    return { revision: null, sha256: null };
};
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) return [{ path: posix(path.relative(root, full)), symlink: true }];
    return entry.isDirectory() ? walk(full) : [{ path: posix(path.relative(root, full)), symlink: false }];
});
const all = [...walk(root), ...walk(path.resolve(root, '../botsales-kit'))];
const excluded = new Map();
const generated = new Set(Object.keys(renderGenerated(loadContractBundle(root))));
const tracked = new Set(execFileSync('git', ['ls-files', '-z'], { cwd: gitRoot, encoding: 'utf8', maxBuffer: 16e6 }).split('\0').filter(Boolean));
const untracked = new Set(execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], { cwd: gitRoot, encoding: 'utf8', maxBuffer: 16e6 }).split('\0').filter(Boolean));
const previousTracked = execFileSync('git', ['ls-tree', '-r', '--name-only', '-z', 'HEAD'], { cwd: gitRoot, encoding: 'utf8', maxBuffer: 16e6 }).split('\0').filter(Boolean);
const deleted = [...new Set([...tracked, ...previousTracked])].filter(file => file.startsWith(frontendPrefix) && !fs.existsSync(path.join(gitRoot, file))).map(file => file.slice(frontendPrefix.length));
const excludedFamilies = [
    ['dependencies', /(^|\/)node_modules\//, 'Third-party installed files; dependency policy is checked at package/lock boundary, not re-authored as UI code.'],
    ['build-output', /(^|\/)dist(?:-demo)?\//, 'Generated build artifacts; verify from fresh source, never edit directly.'],
    ['test-output', /^(?:test-results|playwright-report|coverage)\//, 'Generated run output; not first-party source or independent implementation.'],
    ['historical-evidence', /^(?:evidence|botsales-kit\/(?:evidence|execution\/(?:frontend-evidence|evidence)))\//, 'Current and historical evidence snapshots are retained; audit tooling in this directory is evidence, not a product gate.'],
    ['prototype-reference', /^botsales-kit\/(?:prototype|reference)\//, 'Archived specification/demo reference; React app does not import it and instructions prohibit porting the prototype.'],
    ['full-product-tracker', /^botsales-kit\/execution\/(?:tasks\/T\d+\.md|(?:plan|progress|progress-report|owner-inputs|command-map|design-adoption|universal-source)\.json|PROGRESS(?:\.md|\.html)|PLAN_GUIDE\.md|SESSION_HANDOFF\.md)$/, 'Full-product/backend tracker is read-only and outside frontend rollout.'],
    ['machine-local-secret', /^\.env(?:\.local|\..+\.local)?$/, 'Local environment file; content and hash deliberately not read or exposed. Template is inventoried separately.'],
    ['machine-cache', /(?:^|\/)(?:\.cache|\.vite|__pycache__)\//, 'Machine cache or compiled tooling output; regenerate, never treat as source.'],
];
function exclude(file) {
    file = file.replace(/^\.\.\/botsales-kit\//, 'botsales-kit/');
    return excludedFamilies.find(([, pattern]) => pattern.test(file));
}
function classification(file) {
    file = file.replace(/^\.\.\/botsales-kit\//, 'botsales-kit/');
    if (generated.has(file)) return ['generated-frontend-output', 'scripts/generate.mjs + canonical contract/token owners', 'GENERATE_ONLY', ['generate:check'], ['S04', 'S08', 'S18', 'S19']];
    if (file === 'apps/web/public/mockServiceWorker.js') return ['generated-vendor-worker', 'MSW package + scripts/setup.mjs', 'SETUP_ONLY; never hand-edit vendor worker', ['setup', 'built demo/live isolation browser tests'], ['S04', 'S18', 'S19']];
    if (['botsales-kit/contracts/openapi.yaml', 'botsales-kit/contracts/operation-index.json', 'botsales-kit/design/tokens.css'].includes(file)) return ['derived-kit-input-view', 'canonical OpenAPI/tokens + kit generators', 'GENERATE_ONLY; root generator verifies canonical JSON parity, never create a second source', ['generate:check where supported', 'kit generator/validator parity'], ['S03', 'S04', 'S08', 'S14']];
    if (file === 'botsales-kit/execution/frontend-plan.json') return ['canonical-frontend-plan', 'frontend task plan canonical source', 'EDIT_PLAN_IF_SCOPE_REQUIRES; regenerate plan views, not manual Markdown counters', ['frontend plan renderer/validator', 'policy scope/links'], ['S02', 'S03', 'S14', 'S20']];
    if (/^botsales-kit\/execution\/frontend-progress(?:-report)?\.json$/.test(file)) return ['frontend-ledger-or-ledger-view', 'botsales-kit/scripts/progress.mjs; FE001–FE028 evidence', 'READ_ONLY_IN_THIS_AUDIT; only canonical checkpoint with complete original task evidence', ['FE evidence freshness; no UI/docs-only increments'], ['S17', 'S20']];
    if (file === 'botsales-kit/IMPLEMENTATION_PLAN.md' || file === 'botsales-kit/execution/FRONTEND_PROGRESS.md' || /^botsales-kit\/execution\/frontend-tasks\/FE\d+\.md$/.test(file)) return ['generated-frontend-plan-view', 'canonical frontend-plan/progress + kit renderer', 'GENERATE_ONLY; never hand-edit display status', ['canonical FE renderer --check'], ['S02', 'S14', 'S20']];
    if (file.startsWith('apps/web/src/modules/')) return ['feature-ui-or-helper', `modules/${file.split('/')[4]}`, 'EDIT_CANONICAL_SOURCE after contract/baseline', ['source', 'boundaries', 'lint', 'typecheck', 'layout', 'visual-tokens', 'ui-composition', 'unit/browser impact'], ['S04', 'S09', 'S10', 'S11', 'S12', 'S13', 'S15', 'S16', 'S19']];
    if (file.startsWith('apps/web/src/shared/ui/')) return ['shared-ui-owner-or-catalog', 'shared/ui; normative policy lives in docs/FRONTEND_SPACING_STANDARD.md', 'EDIT_OWNER; catalog mirrors API, no independent token scale', ['source', 'boundaries', 'lint', 'typecheck', 'layout', 'visual-tokens', 'ui-composition', 'all consumer regression'], ['S05', 'S06', 'S08', 'S09', 'S10', 'S11', 'S12', 'S13', 'S14', 'S19']];
    if (file.startsWith('apps/web/src/shared/')) return ['shared-behavior-or-model', 'shared/api or shared/model; domain-free boundary', 'EDIT_SOURCE only if UI migration affects behavior', ['source', 'boundaries', 'lint', 'typecheck', 'unit/browser impact'], ['S04', 'S05', 'S19']];
    if (file.startsWith('apps/web/src/mocks/')) return ['synthetic-demo-state', 'mocks; demo/test only', 'EDIT_SOURCE only for truthful UI acceptance fixtures, not Backend', ['source', 'boundaries', 'lint', 'typecheck', 'test:domain', 'demo/live isolation', 'state/browser impact'], ['S04', 'S15', 'S17', 'S19']];
    if (file.startsWith('apps/web/src/')) return ['app-shell-entry-css-or-types', 'app/main; router/session/shell and global bootstrap owner', 'EDIT_SOURCE after whole-app impact baseline', ['source', 'boundaries', 'lint', 'typecheck', 'layout', 'visual-tokens', 'ui-composition', 'shell/route/browser impact'], ['S04', 'S05', 'S07', 'S08', 'S09', 'S15', 'S16', 'S19']];
    if (file === 'apps/web/index.html') return ['html-entry', 'app bootstrap; includes native HTML, styles and startup fallback', 'EDIT_ENTRY after HTML/CSS source coverage exists', ['strict layout gate parses the HTML entry and rejects inline style tags/attributes; import-scope gate resolves first-party scripts, styles and assets; build and browser entry smoke'], ['S04', 'S07', 'S08', 'S15', 'S19']];
    if (file.startsWith('apps/web/public/')) return ['public-asset-or-worker', 'app public entry + notification worker/sample owner', 'EDIT_HANDWRITTEN_ONLY; generator/vendor assets remain generated', ['asset reference validation planned', 'notification worker unit/browser', 'demo/live build isolation'], ['S04', 'S07', 'S08', 'S18', 'S19']];
    if (file.startsWith('apps/web/tests/') || file.startsWith('tests/')) return ['frontend-test-fixture-or-generator', 'test file owner; runtime assertions must measure behavior', 'EDIT_TEST_SOURCE; generated reports remain separate', ['relevant node/Vitest/Playwright suite', 'negative + positive + UNKNOWN fixtures'], ['S04', 'S05', 'S07', 'S08', 'S09', 'S10', 'S14', 'S15', 'S16', 'S17', 'S19']];
    if (file.startsWith('scripts/')) return ['frontend-tooling-or-gate-config', 'script owner; current gates remain independently testable', 'EDIT_TOOLING; no silent suppression or weakening', ['checker fixtures', 'generate:check', 'verify wiring', 'scope/parse failure controls'], ['S04', 'S05', 'S06', 'S07', 'S08', 'S09', 'S14', 'S17', 'S18']];
    if (/^botsales-kit\/(?:contracts|design|fixtures|governance)\//.test(file)) return ['canonical-contract-token-or-acceptance-input', 'kit canonical owner; frontend consumes specification only', 'EDIT_CANONICAL_IF_REQUIRED; regenerate derived YAML/index/CSS; no Backend implementation', ['generate:check', 'contract/theme validators', 'affected UI/mock tests'], ['S03', 'S04', 'S08', 'S14', 'S19']];
    if (file === 'AI_RULES.md' || file === 'botsales-kit/AI_RULES.md') return ['universal-original', 'Universal rules source', 'READ_ONLY; original root/kit copies preserved', ['byte identity only'], ['S02', 'S14', 'S20']];
    if (file.startsWith('docs/') || file.endsWith('.md') || file.endsWith('.txt') || /^botsales-kit\/(?:docs|templates|execution\/frontend)/.test(file)) return ['policy-plan-doc-or-frontend-ledger', 'frontend scope/policy/plan owner; generated FE views and ledger retain canonical writers', 'DOCS_EDIT_ALLOWED; FE ledger/generator views never hand-increment', ['policy links/IDs/authority checks', 'plan generator for generator-owned views', 'evidence freshness separate'], ['S02', 'S03', 'S14', 'S17', 'S20']];
    if (file.startsWith('botsales-kit/scripts/')) return ['kit-validator-or-generator', 'kit canonical validator; full-product functions outside FE closure', 'EDIT_ONLY_IF_FRONTEND_POLICY_SYNC_REQUIRES; no full-product checkpoints', ['relevant validator/fixture; generator sync'], ['S03', 'S14', 'S20']];
    if (file.startsWith('packages/')) return ['package-source-UNKNOWN', 'UNASSIGNED; new package file is not automatically trusted', 'UNKNOWN requires review before source rollout closes', ['UNKNOWN'], ['S04', 'S05']];
    if (file.startsWith('samples/')) return ['synthetic-sample', 'frontend CSV acceptance owner', 'EDIT_SYNTHETIC_SAMPLE only if frontend fixture changes', ['CSV parser/import UI tests', 'sample/public parity where intended'], ['S03', 'S15', 'S19']];
    if (file.startsWith('.vscode/') || /^apps\/web\/(?:package\.json|[^/]+config\.ts|tsconfig\.json)$/.test(file) || /^(?:\.env\.example|\.gitignore|\.node-version|\.npmrc|\.nvmrc|package(?:-lock)?\.json|eslint\.config\.mjs|playwright.*\.config\.ts|START_WINDOWS\.cmd)$/.test(file)) return ['toolchain-config', 'frontend toolchain/config owner', 'EDIT_CONFIG if required; locked dependencies no speculative additions', ['config parse', 'doctor/setup/verify', 'test discovery', 'build/demo isolation'], ['S03', 'S04', 'S05', 'S18', 'S19']];
    if (/^(?:DELIVERY|SHA256SUMS|premium-audit|premium-ui)\.json$/.test(file) || /^botsales-kit\/(?:release|DELIVERY_SUMMARY)\.json$/.test(file) || file === 'botsales-kit/MANIFEST.sha256') return ['snapshot-or-release-metadata', 'release/evidence owner; snapshot does not certify current source', 'READ_ONLY unless relevant canonical release/evidence command regenerates', ['provenance/freshness; never count as runtime PASS'], ['S17', 'S20']];
    return ['UNKNOWN_FILE', 'UNASSIGNED', 'UNKNOWN: manually assign before claiming complete coverage', ['UNKNOWN'], ['S04']];
}
function treatment(file) {
    if (generated.has(file.path) || ['generated-vendor-worker', 'generated-frontend-plan-view', 'derived-kit-input-view'].includes(file.category) || ['docs/route-implementation.json', 'docs/route-state-role-matrix.json'].includes(file.path)) return 'GENERATE_VERIFY';
    if (file.category === 'public-asset-or-worker' || file.category === 'synthetic-sample') return 'ASSET_VERIFY';
    if (['active-external-workflow', 'frontend-test-fixture-or-generator', 'frontend-tooling-or-gate-config', 'toolchain-config', 'kit-validator-or-generator'].includes(file.category)) return 'TOOLING_VERIFY';
    if (['universal-original', 'frontend-ledger-or-ledger-view', 'snapshot-or-release-metadata'].includes(file.category)) return 'REFERENCE_READONLY';
    if (file.category === 'policy-plan-doc-or-frontend-ledger') return /^docs\/(?:FRONTEND_SPACING_STANDARD|FRONTEND_UI_IMPROVEMENT_PLAN|FRONTEND_SCOPE|PROJECT_CONTEXT|CONTINUE_FRONTEND)\.md$/.test(file.path) || /(?:^|\/)(?:AGENTS|README|DESIGN|UX-CONTRACT|18_CODING_STANDARDS)\.md$/.test(file.path) ? 'EDIT_VERIFY' : 'REFERENCE_READONLY';
    return 'KEEP_VERIFY';
}

const configResult = ts.readConfigFile(path.join(root, 'apps/web/tsconfig.json'), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(configResult.config, ts.sys, path.join(root, 'apps/web'));
const compilerInput = new Set(ts.createProgram(parsed.fileNames, parsed.options).getSourceFiles().map(file => posix(path.relative(root, file.fileName))));
const files = [];
for (const entry of all) {
    const family = exclude(entry.path);
    if (family) {
        const group = excluded.get(family[0]) || { family: family[0], count: 0, reason: family[2] };
        group.count++;
        excluded.set(family[0], group);
        continue;
    }
    const [category, owner, editPolicy, requiredVerification, rolloutSteps] = classification(entry.path);
    const source = entry.path.startsWith('apps/web/src/');
    files.push({ ...entry, bytes: fs.statSync(path.join(root, entry.path)).size, sha256: hash(entry.path), category, owner, editPolicy, requiredVerification, rolloutSteps,
        gitState: tracked.has(posix(path.relative(gitRoot, path.resolve(root, entry.path)))) ? 'TRACKED_PRESENT' : untracked.has(posix(path.relative(gitRoot, path.resolve(root, entry.path)))) ? 'UNTRACKED_PRESENT' : 'IGNORED_PRESENT',
        currentGates: {
            typecheck: compilerInput.has(entry.path),
            lint: source && /\.[cm]?[jt]sx?$/.test(entry.path),
            source: source && /\.[jt]sx?$/.test(entry.path),
            layout: entry.path === 'apps/web/index.html' || (source && /\.(?:ts|tsx|mts|cts|css)$/.test(entry.path) && !generated.has(entry.path)),
            visual: source && /\.(?:js|jsx|ts|tsx|mts|cts|css)$/.test(entry.path) && !generated.has(entry.path),
            composition: source && /\.tsx?$/.test(entry.path),
            generator: generated.has(entry.path),
            htmlEntry: entry.path === 'apps/web/index.html',
        }, importReferences: [] });
}

const workflowPath = '../.github/workflows/frontend.yml';
if (fs.existsSync(path.resolve(root, workflowPath))) files.push({ path: workflowPath, bytes: fs.statSync(path.resolve(root, workflowPath)).size, sha256: hash(workflowPath), category: 'active-external-workflow', owner: 'Git repository root workflow; not nested frontend/.github', editPolicy: 'EDIT_CONFIG within frontend workflow scope', requiredVerification: ['workflow structure/path filters', 'verify/E2E commands', 'artifact paths/timeout; hosted NOT_RUN'], rolloutSteps: ['S04', 'S18', 'S19'], gitState: tracked.has('.github/workflows/frontend.yml') ? 'TRACKED_PRESENT' : untracked.has('.github/workflows/frontend.yml') ? 'UNTRACKED_PRESENT' : 'IGNORED_PRESENT', currentGates: {}, importReferences: [] });

const byPath = new Map(files.map(file => [file.path, file]));
const unresolved = [];
const externalModules = new Set();
for (const file of files.filter(file => /\.(?:tsx?|[cm]?js)$/.test(file.path))) {
    const sf = ts.createSourceFile(file.path, read(file.path), ts.ScriptTarget.Latest, true, file.path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function reference(node, specifier, kind) {
        if (!specifier) { unresolved.push({ file: file.path, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, kind, reason: 'NON_LITERAL_DYNAMIC_IMPORT' }); return; }
        const own = specifier.startsWith('.') || specifier.startsWith('@/') || specifier.startsWith('@botsales/');
        if (!own) { externalModules.add(specifier); return; }
        let resolved = ts.resolveModuleName(specifier, path.resolve(root, file.path), parsed.options, ts.sys).resolvedModule?.resolvedFileName;
        if (!resolved && specifier.startsWith('.')) {
            const candidate = path.resolve(root, path.dirname(file.path), specifier);
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) resolved = candidate;
        }
        const target = resolved ? posix(path.relative(root, resolved)) : null;
        const item = { kind, specifier, target, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 };
        file.importReferences.push(item);
        if (!target || (!byPath.has(target) && !target.includes('node_modules/'))) unresolved.push({ file: file.path, ...item, reason: target ? 'OWN_IMPORT_OUTSIDE_INVENTORY' : 'UNRESOLVED_OWN_IMPORT' });
    }
    function visit(node) {
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) reference(node, ts.isStringLiteralLike(node.moduleSpecifier) ? node.moduleSpecifier.text : null, ts.isImportDeclaration(node) ? 'import' : 're-export');
        if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) reference(node, node.arguments[0] && ts.isStringLiteralLike(node.arguments[0]) ? node.arguments[0].text : null, node.expression.kind === ts.SyntaxKind.ImportKeyword ? 'dynamic-import' : 'require');
        ts.forEachChild(node, visit);
    }
    visit(sf);
}
// Explicitly classify existing finite tooling constructions without executing them.
// A source mapping is not proof that an associated runtime check has run.
let tempRequireIndex = 0;
for (const item of unresolved) {
    if (item.file === 'scripts/test-domain.mjs' && item.line === 13) {
        const source = ['apps/web/src/mocks/service.ts', 'apps/web/src/mocks/database.ts', 'apps/web/src/mocks/files.ts'][tempRequireIndex++];
        item.resolutionClassification = 'BOUNDED_TEMP_COMPILE_OUTPUT';
        item.mappedCanonicalSource = source;
        item.sourceExists = byPath.has(source);
        item.runtimeOutputStatus = 'SEE_S03_DOMAIN_LOG; not inferred by inventory';
    } else if (item.file === 'scripts/test-domain.mjs' && item.line === 14) {
        item.resolutionClassification = 'BOUNDED_REPOSITORY_TEST_MODULE';
        item.mappedCanonicalSource = 'tests/domain-scenarios.cjs';
        item.sourceExists = byPath.has(item.mappedCanonicalSource);
        item.runtimeOutputStatus = 'SEE_S03_DOMAIN_LOG; not inferred by inventory';
    } else if (item.file === 'tests/tools.test.mjs') {
        item.resolutionClassification = 'BOUNDED_COPIED_COMPILER_HELPER_FIXTURE';
        item.mappedCanonicalSource = 'scripts/tools.mjs';
        item.sourceExists = byPath.has(item.mappedCanonicalSource);
        item.runtimeOutputStatus = 'SEE_S04_FIXTURES_FINAL_LOG; synthetic compiler fixture, not a real typecheck';
    } else if (item.file === 'tests/ui-toolbar-layout.spec.ts' && item.kind === 'dynamic-import'
        && read(item.file).includes("path.resolve('tests/design/toolbar-render-fixture.tsx')")) {
        item.resolutionClassification = 'BOUNDED_BROWSER_RENDER_FIXTURE';
        item.mappedCanonicalSource = 'tests/design/toolbar-render-fixture.tsx';
        item.sourceExists = byPath.has(item.mappedCanonicalSource);
        item.runtimeOutputStatus = 'SEE_CURRENT_FULL_E2E_TOOLBAR_CASES; inventory only resolves the explicit fixture URL';
    } else if (item.file === 'tests/ui-component-layout.spec.ts' && item.kind === 'dynamic-import'
        && read(item.file).includes("path.resolve('tests/design/component-layout-fixture.tsx')")) {
        item.resolutionClassification = 'BOUNDED_BROWSER_RENDER_FIXTURE';
        item.mappedCanonicalSource = 'tests/design/component-layout-fixture.tsx';
        item.sourceExists = byPath.has(item.mappedCanonicalSource);
        item.runtimeOutputStatus = 'SEE_CURRENT_FULL_E2E_COMPONENT_CASES; inventory resolves the explicit test-only URL, not a production import';
    }
}

const entryReferences = [];
for (const [, attribute, target] of read('apps/web/index.html').matchAll(/\b(src|href)="([^"]+)"/g)) {
    if (!target.startsWith('/')) continue;
    const file = target.startsWith('/src/') ? `apps/web${target}` : `apps/web/public${target}`;
    entryReferences.push({ source: 'apps/web/index.html', attribute, target: file, exists: byPath.has(file) });
}
for (const icon of JSON.parse(read('apps/web/public/manifest.webmanifest')).icons || []) {
    const target = `apps/web/public${icon.src}`;
    entryReferences.push({ source: 'apps/web/public/manifest.webmanifest', attribute: 'icons.src', target, exists: byPath.has(target) });
}
for (const file of files.filter(file => file.path.endsWith('.css'))) for (const [, target] of read(file.path).matchAll(/(?:@import\s+(?:url\()?|url\()\s*['"]([^'"]+)['"]/g)) {
    if (/^(?:https?:|data:|#)/.test(target)) continue;
    const resolved = target.startsWith('/') ? `apps/web/public${target}` : posix(path.relative(root, path.resolve(root, path.dirname(file.path), target)));
    entryReferences.push({ source: file.path, attribute: 'CSS import/url', target: resolved, exists: byPath.has(resolved) });
}

const runtimeRoots = ['apps/web/src/main.tsx', 'apps/web/index.html', 'apps/web/public/manifest.webmanifest', 'apps/web/public/app-icon.svg', 'apps/web/public/app-sw.js', 'apps/web/public/mockServiceWorker.js'];
const closure = new Set();
function include(file) {
    if (!byPath.has(file) || closure.has(file)) return;
    closure.add(file);
    for (const item of byPath.get(file).importReferences || []) if (item.target && !item.target.includes('node_modules/')) include(item.target);
}
runtimeRoots.forEach(include);
for (const file of files) file.runtimeImportClosureOrEntrypoint = closure.has(file.path);
const manifest = JSON.parse(read('../botsales-kit/contracts/route-manifest.json'));
const implementation = JSON.parse(read('docs/route-implementation.json'));
const router = ts.createSourceFile('router.tsx', read('apps/web/src/app/router.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const routerBindings = new Map(), pageBindings = new Map(), wrapperBindings = new Map();
function visitRouter(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        if (node.name.text === 'pages' && ts.isObjectLiteralExpression(node.initializer)) for (const prop of node.initializer.properties) if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.initializer)) pageBindings.set(prop.name.getText(router).replaceAll(/['"]/g, ''), prop.initializer.text);
        if (ts.isCallExpression(node.initializer) && node.initializer.expression.getText(router) === 'lazy') {
            let module = null, exportedComponent = null;
            const inspect = child => {
                if (ts.isCallExpression(child) && child.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteralLike(child.arguments[0])) module = child.arguments[0].text;
                if (ts.isPropertyAssignment(child) && child.name.getText(router) === 'default' && ts.isPropertyAccessExpression(child.initializer)) exportedComponent = child.initializer.name.text;
                ts.forEachChild(child, inspect);
            };
            inspect(node.initializer);
            routerBindings.set(node.name.text, { module, exportedComponent });
        }
    }
    if (ts.isFunctionDeclaration(node) && node.name) {
        let firstJsx = null;
        const inspect = child => { if (!firstJsx && (ts.isJsxOpeningElement(child) || ts.isJsxSelfClosingElement(child))) firstJsx = child.tagName.getText(router); ts.forEachChild(child, inspect); };
        inspect(node);
        if (firstJsx) wrapperBindings.set(node.name.text, firstJsx);
    }
    ts.forEachChild(node, visitRouter);
}
visitRouter(router);
const routes = manifest.routes.map(route => {
    const mapped = implementation.find(item => item.routeId === route.id);
    const sourceExists = mapped && byPath.has(mapped.source);
    const pageBinding = pageBindings.get(route.id);
    const actual = routerBindings.get(pageBinding) || routerBindings.get(wrapperBindings.get(pageBinding));
    const sourceTree = sourceExists ? ts.createSourceFile(mapped.source, read(mapped.source), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX) : null;
    const componentDeclared = Boolean(sourceTree?.statements.some(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === mapped.component));
    const routerComponentMatches = actual?.exportedComponent === mapped?.component;
    return { routeId: route.id, path: route.path, module: route.module, component: mapped?.component || null, source: mapped?.source || null, sourceExists: Boolean(sourceExists), componentDeclared, routerBinding: pageBinding || null, routerLazyModule: actual?.module || null, routerExportedComponent: actual?.exportedComponent || null, routerComponentMatches, implementationPathMatches: mapped?.route === route.path, readOperations: route.readOperations || [], actionOperations: (route.actions || []).map(action => action.operationId).filter(Boolean), verdict: sourceExists && mapped.route === route.path && componentDeclared && routerComponentMatches ? 'MAPPED_STATICALLY_NOT_RUNTIME_VERIFIED' : 'UNKNOWN_MAPPING' };
});
const modules = [...new Set(routes.map(route => route.module))].sort().map(module => ({ module, routes: routes.filter(route => route.module === module).map(route => route.routeId), files: files.filter(file => file.path.startsWith(`apps/web/src/modules/${module}/`)).map(file => file.path), rolloutSteps: ['S04', 'S09', 'S10', 'S11', 'S12', 'S13', 'S15', 'S16', 'S19'] }));
for (const file of files) {
    file.routeImpact = file.path.startsWith('apps/web/src/modules/') ? routes.filter(route => route.module === file.path.split('/')[4]).map(route => route.routeId) : file.runtimeImportClosureOrEntrypoint && !file.path.startsWith('apps/web/src/mocks/') ? routes.map(route => route.routeId) : [];
    file.plannedTreatment = treatment(file);
    if (file.path.startsWith('apps/web/src/')) {
        file.verificationStatus = 'SOURCE_GATES_COVERED';
        file.treatmentNote = 'Frontend source is included in the final local verify gates applicable in currentGates and in browser impact evidence; see S19 local-verify and whole-e2e checks. This is local evidence, not hosted CI or production acceptance.';
    } else if (file.path === 'apps/web/index.html') {
        file.verificationStatus = 'HTML_ENTRY_GATES_COVERED';
        file.treatmentNote = 'Strict layout/import-scope gates scan the HTML entry, reject inline styling/events, resolve first-party scripts/styles/assets, and the build/browser entry tests exercise it; see S19 local-verify and whole-e2e.';
    } else if (file.plannedTreatment === 'GENERATE_VERIFY') {
        file.verificationStatus = 'GENERATED_TREATMENT_RECORDED';
        file.treatmentNote = 'Canonical generator/output ownership is recorded; generate:check is part of local verify where applicable. This disposition does not assert that unrelated kit plan views are regenerated by the app generator.';
    } else if (file.plannedTreatment === 'REFERENCE_READONLY') {
        file.verificationStatus = 'READONLY_REFERENCE_RECORDED';
        file.treatmentNote = 'Retained as read-only source/history by scope; current path and content hash are recorded. No runtime conformance claim is inferred.';
    } else if (file.plannedTreatment === 'ASSET_VERIFY') {
        file.verificationStatus = 'ASSET_TREATMENT_RECORDED';
        file.treatmentNote = 'Asset/sample ownership and references are inventoried; applicable build, import-scope, sample and browser checks are recorded separately. No visual or backend assertion is inferred.';
    } else if (file.plannedTreatment === 'TOOLING_VERIFY') {
        file.verificationStatus = 'TOOLING_TREATMENT_RECORDED';
        file.treatmentNote = 'Tool/test/config ownership and required verification are enumerated on this row; local verify results are separate, and hosted workflow execution is not claimed.';
    } else {
        file.verificationStatus = 'KEEP_TREATMENT_RECORDED';
        file.treatmentNote = 'Retain the current owner and required checks listed on this row; frontend runtime conformance is claimed only for app source covered by the source gates above.';
    }
}
const allowedTreatments = new Set(['EDIT_VERIFY', 'KEEP_VERIFY', 'GENERATE_VERIFY', 'ASSET_VERIFY', 'TOOLING_VERIFY', 'REFERENCE_READONLY']);
const retiredTreatment = deleted.map(file => {
    const original = gitBlobHash(file);
    if (file === '.github/workflows/frontend.yml' && fs.existsSync(path.resolve(root, '../.github/workflows/frontend.yml'))) {
        const replacement = '../.github/workflows/frontend.yml';
        return { path: file, category: 'retired-tracked-workflow', plannedTreatment: 'RETIRED_VALIDATE', owner: 'Nested frontend workflow retired in favor of the active repository-root frontend workflow', verificationStatus: 'RETIRED_PATH_VALIDATED', rationale: 'The nested workflow is deleted from the current checkout; the parent workflow is the sole active workflow and its frontend scope, verify/E2E, timeout and artifact behavior are checked by the shared API governance test and S18 local workflow audit.', sourceRevision: original.revision, sourceSha256: original.sha256, replacementPath: replacement, replacementSha256: hash(replacement), requiredVerification: ['nested workflow absent', 'active parent workflow exists', 'workflow contract test and local verify pass'] };
    }
    return { path: file, category: 'retired-tracked-path', plannedTreatment: 'RETIRED_VALIDATE', owner: 'Previous Git entry; preserve existing deletion and validate references/replacement', verificationStatus: 'NOT_RUN_THIS_INVENTORY', rationale: 'No retirement-specific evidence has been attached yet.', sourceRevision: original.revision, sourceSha256: original.sha256, requiredVerification: ['no active imports/links/route/build references', 'replacement or intentional removal evidence'] };
});
const allowedRetired = new Set(['RETIRED_PATH_VALIDATED']);
const dispositionErrors = files.filter(file => !allowedTreatments.has(file.plannedTreatment) || !file.owner || !file.verificationStatus || /ASSESSMENT_PENDING|UNKNOWN/.test(`${file.category} ${file.verificationStatus}`) || !file.treatmentNote?.trim());
const retiredErrors = retiredTreatment.filter(file => file.plannedTreatment !== 'RETIRED_VALIDATE' || !file.path || !file.owner || !file.rationale || !file.sourceRevision || !file.sourceSha256 || !/^[a-f\d]{64}$/i.test(file.sourceSha256) || !allowedRetired.has(file.verificationStatus) || (file.replacementPath && !/^[a-f\d]{64}$/i.test(file.replacementSha256 || '')));
if (dispositionErrors.length) throw new Error(`File disposition is incomplete: ${dispositionErrors.map(file => file.path).join(', ')}`);
if (retiredErrors.length) throw new Error(`Deleted-path disposition is incomplete: ${retiredErrors.map(file => file.path).join(', ')}`);
const counts = items => Object.fromEntries([...new Set(items.map(item => item.category))].sort().map(category => [category, items.filter(item => item.category === category).length]));
const report = {
    schemaVersion: 1, checkedAt: new Date().toISOString(), scope: 'Read-only UI governance file coverage, not UI implementation/production readiness percentage.', root, gitRoot,
    summary: { diskFiles: all.length, workspaceRelevantFiles: files.filter(file => !file.path.startsWith('../')).length, externalRelevantFiles: files.filter(file => file.path.startsWith('../')).length, excludedFiles: [...excluded.values()].reduce((sum, group) => sum + group.count, 0), exhaustiveDiskPartition: all.length === files.filter(file => !file.path.startsWith('../')).length + [...excluded.values()].reduce((sum, group) => sum + group.count, 0), allRelevantAssigned: files.every(file => !/UNKNOWN/.test(file.category)) && retiredErrors.length === 0, dispositionRecords: files.filter(file => file.verificationStatus && file.treatmentNote).length + retiredTreatment.filter(file => file.verificationStatus && file.rationale).length, currentPathDispositionRecords: files.filter(file => file.verificationStatus && file.treatmentNote).length, retiredPathDispositions: retiredTreatment.length, pendingDispositionRecords: files.filter(file => !file.verificationStatus || /ASSESSMENT_PENDING|UNKNOWN/.test(file.verificationStatus)).length + retiredTreatment.filter(file => !allowedRetired.has(file.verificationStatus)).length, categories: counts(files), sourceFiles: files.filter(file => file.path.startsWith('apps/web/src/')).length, sourceTsTsxFiles: files.filter(file => file.path.startsWith('apps/web/src/') && /\.tsx?$/.test(file.path)).length, runtimeImportClosureOrEntrypoints: closure.size, routes: routes.length, routerPageBindings: pageBindings.size, extraRouterPages: [...pageBindings.keys()].filter(id => !routes.some(route => route.routeId === id)), routeMappingsMissing: routes.filter(route => route.verdict === 'UNKNOWN_MAPPING').length, modules: modules.length, generatedFrontendOutputs: generated.size },
    excludedFamilies: [...excluded.values()].sort((a, b) => b.count - a.count), deletedTrackedPaths: deleted.sort(), retiredTreatment, generatedOutputs: [...generated].sort(), runtimeRoots, entryReferences,
    unknownFiles: files.filter(file => /UNKNOWN/.test(file.category)).map(file => file.path),
    unresolvedOwnImports: unresolved, runtimeUnresolvedOwnImports: unresolved.filter(item => closure.has(item.file)), externalDependencyImports: [...externalModules].sort(),
    coverageLimits: ['File inventory classification is complete only at this snapshot; it does not prove source gates cover HTML/assets/tooling.', 'Import closure includes literal dynamic imports and demo mocks regardless of conditional __MOCK__; production artifact isolation is a separate check.', 'Whole module route impact is conservative; direct symbol-level and state/profile impact must be refined before consumer migration.', 'Four nonliteral test-domain require paths have finite canonical source mappings; actual checks are recorded separately in S03-domain.log. The removed global compiler fallback is not an active resolution path.', 'No build, typecheck, E2E, native zoom or hosted CI was run by this inventory script; check results belong to separate rollout artifacts.', 'Protected local environment contents are never read or hashed.'],
    routes, modules, files: files.sort((a, b) => a.path.localeCompare(b.path)),
};
report.summary.exhaustiveDiskPartition = all.length === files.filter(file => file.path !== workflowPath).length + [...excluded.values()].reduce((sum, group) => sum + group.count, 0);
fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report.summary, unknownFiles: report.unknownFiles, runtimeUnresolvedOwnImports: report.runtimeUnresolvedOwnImports, toolingUnresolved: unresolved.filter(item => !closure.has(item.file)).length, retiredTreatment }, null, 2));
