import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

// Evidence evaluator: named owner assertions and current execution records are
// required per checkpoint. The canonical progress CLI remains the only writer.
const frontend = path.resolve(import.meta.dirname, '../..'), repository = path.dirname(frontend), kit = path.join(repository, 'botsales-kit');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const plan = read(path.join(kit, 'execution/frontend-plan.json'));
const taskId = process.argv[2], stepId = process.argv[3], task = plan.tasks.find(item => item.id === taskId), step = task?.implementationSteps.find(item => item.id === stepId);
assert(task && step && plan.tasks.length === 28 && plan.tasks.reduce((n, item) => n + item.implementationSteps.length, 0) === 140, 'Pass one canonical TASK STEP; denominator must remain 140');
const resolveSource = file => path.join(file.startsWith('botsales-kit/') ? kit : frontend, file.replace(/^botsales-kit\//, ''));
const records = {}, logs = {};
function record(stage) {
    if (records[stage]) return records[stage];
    const pointer = read(path.join(import.meta.dirname, stage + '-latest.json'));
    const value = read(path.join(repository, pointer.record));
    assert(value.exitCode === 0 && !value.sourceDrift.length, 'Failed/changed run: ' + stage);
    assert(digest(path.join(repository, value.log.path)) === value.log.sha256, 'Changed log: ' + stage);
    for (const [file, hash] of Object.entries(value.sourceFingerprints)) assert(digest(path.join(repository, file)) === hash, 'Run is stale: ' + stage + ':' + file);
    records[stage] = value; logs[stage] = fs.readFileSync(path.join(repository, value.log.path), 'utf8');
    return value;
}
record('e2e'); record('verify'); record('unit'); record('source-maps'); record('built-demo');
assert(/\b580 passed \(/.test(logs.e2e) && !/\b\d+ failed\b/.test(logs.e2e), 'A complete passing 580-case run is required; targeted retests cannot close it');
assert(/Tests\s+174 passed \(174\)/.test(logs.unit), '174 current unit cases required');
assert(logs.verify.includes('"passed":88') && logs.verify.includes('Boundary fixtures: PASS 10/10'), 'Current domain and negative-boundary evidence required');
assert(/\b6 passed \(/.test(logs['built-demo']), 'Six current built-artifact cases required');
assert(/pass 16\s/.test(logs['source-maps']), '16 current source-map cases required');

const crosswalkFile = path.join(import.meta.dirname, 'S01-contract-crosswalk-current-20261008.json'), crosswalk = read(crosswalkFile);
assert(crosswalk.result === 'PASS' && crosswalk.gaps.length === 0 && crosswalk.sourceChecker.files === 71 && crosswalk.sourceChecker.operationCalls === 222, 'Current AST/OpenAPI crosswalk required');
const manifest = read(path.join(kit, 'contracts/route-manifest.json'));
const operations = read(path.join(frontend, 'packages/contracts/src/operations.json'));
const routes = read(path.join(frontend, 'docs/route-implementation.json'));
const stateMatrix = read(path.join(frontend, 'docs/route-state-role-matrix.json'));
const taskRoutes = task.routeIds.map(id => routes.find(route => route.routeId === id));
assert(taskRoutes.every(Boolean), 'Missing task route binding');
for (const route of taskRoutes) {
    const file = path.join(frontend, route.source);
    assert(fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes(route.component), 'Unresolved current route owner: ' + route.routeId);
    assert(manifest.routes.some(item => item.id === route.routeId), 'Route absent from canonical manifest');
}
assert(task.operationIds.every(id => Object.hasOwn(operations, id)), 'Task operation absent from generated canonical contract');
assert(stateMatrix.summary.routeRoleBrowserMatrix === 'PASS' && stateMatrix.summary.routeMountSmoke === 'PASS', 'Current matrix needs route/role execution proof');

function browserCases(relative) {
    const file = path.join(frontend, relative), source = fs.readFileSync(file, 'utf8');
    const ast = ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS), cases = [];
    function visit(node) {
        if (ts.isCallExpression(node) && node.expression.getText(ast) === 'test' && ts.isStringLiteral(node.arguments[0])) {
            const title = node.arguments[0].text, callback = node.arguments[1];
            const assertions = [];
            function inspect(child) {
                if (ts.isCallExpression(child) && /^expect(?:\.|\()/.test(child.expression.getText(ast))) assertions.push(child.getText(ast));
                ts.forEachChild(child, inspect);
            }
            if (callback) inspect(callback);
            assert(assertions.length, 'A named browser case has no assertions: ' + title);
            for (const browser of ['chromium', 'firefox']) assert(logs.e2e.split('\n').some(line => /^\s*ok\s+\d+/.test(line) && line.includes('[' + browser + ']') && line.includes(title)), 'Named owner case did not pass: ' + browser + ':' + title);
            cases.push({ title, line: ast.getLineAndCharacterOfPosition(node.getStart()).line + 1, assertions, projects: ['chromium', 'firefox'] });
        }
        ts.forEachChild(node, visit);
    }
    visit(ast);
    assert(cases.length, 'Empty owner browser suite: ' + relative);
    return { file: relative, sha256: digest(file), cases };
}
let ownerFiles;
const number = Number(taskId.slice(2));
if (number >= 9 && number <= 21) ownerFiles = [`tests/${taskId.toLowerCase()}.spec.ts`];
else if (taskId === 'FE022') ownerFiles = ['tests/vertical-slices/fe022-flows.spec.ts'];
else if (taskId === 'FE024') ownerFiles = ['tests/security.spec.ts', 'tests/session/session-revocation.spec.ts', 'tests/ui009-scope-regression.spec.ts'];
else if (taskId === 'FE025') ownerFiles = ['tests/artifacts/demo-preview.spec.ts', 'tests/ui012-keyboard.spec.ts'];
else if (taskId === 'FE006') ownerFiles = ['tests/ui-composition-layout.spec.ts', 'tests/ui012-keyboard.spec.ts'];
else if (taskId === 'FE007') ownerFiles = ['tests/frontend.spec.ts', 'tests/session/session-revocation.spec.ts', 'tests/ui009-scope-regression.spec.ts'];
else if (taskId === 'FE008') ownerFiles = ['tests/vertical-slices/fe022-flows.spec.ts', 'tests/frontend.spec.ts'];
else if (taskId === 'FE023') ownerFiles = ['tests/states/fe023.spec.ts', 'tests/ui010-dialog-draft.spec.ts', 'tests/frontend-corrections.spec.ts'];
else if (['FE001', 'FE027', 'FE028'].includes(taskId)) ownerFiles = ['tests/frontend.spec.ts', 'tests/vertical-slices/fe022-flows.spec.ts', 'tests/frontend-corrections.spec.ts'];
else if (taskId === 'FE026') ownerFiles = ['tests/artifacts/demo-preview.spec.ts'];
else ownerFiles = ['tests/frontend-corrections.spec.ts'];
if (['FE006','FE010','FE011','FE025','FE028'].includes(taskId)) ownerFiles.push('tests/ui-toolbar-layout.spec.ts', 'tests/ui-shell-layout.spec.ts');
if (['FE006','FE009','FE010','FE011','FE012','FE014','FE015','FE017','FE018','FE020','FE021','FE025','FE028'].includes(taskId)) ownerFiles.push('tests/ui-component-layout.spec.ts');
const ownerProof = [...new Set(ownerFiles)].map(browserCases);
const allCases = ownerProof.flatMap(item => item.cases);
const negativeCases = allCases.filter(item => /unknown|reject|conflict|stale|forbidden|redact|denied|offline|error|expired|cannot|scope|invalid|read-only|unavailable|empty|blocks|does not|never/i.test(item.title));
if (number >= 9 && number <= 21 && stepId === 'S03') assert(negativeCases.length, 'Task needs named negative-case evidence');

const unitFiles = {
    FE005: ['api-client.test.tsx', 'command-lifetime.test.tsx'],
    FE006: ['components.test.tsx', 'composition.test.tsx', 'shared-ui-render-contract.test.tsx'],
    FE007: ['scope-events.test.tsx', 'command-lifetime.test.tsx'],
    FE023: ['states/fe023-state.test.tsx', 'versioned-draft.test.tsx'],
    FE024: ['api-client.test.tsx', 'format.test.ts'],
}[taskId] || ['versioned-draft.test.tsx', 'command-lifetime.test.tsx', 'scope-events.test.tsx'];
const unitProof = unitFiles.map(name => {
    const file = 'apps/web/tests/' + name, source = fs.readFileSync(path.join(frontend, file), 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), titles = [];
    function visit(node) {
        if (ts.isCallExpression(node) && ['it', 'test'].includes(node.expression.getText(ast)) && ts.isStringLiteral(node.arguments[0])) {
            const title = node.arguments[0].text;
            assert(logs.unit.split('\n').some(line => line.includes('✓ ' + file + ' >') && line.includes(title)), 'Unit owner case not executed: ' + file + ':' + title);
            titles.push(title);
        }
        ts.forEachChild(node, visit);
    }
    visit(ast);
    assert(titles.length, 'No literal owner unit cases: ' + file);
    return { file, sha256: digest(path.join(frontend, file)), cases: titles };
});

const coldFile = path.join(import.meta.dirname, 'clean-artifacts-components-20261008.json'), cold = read(coldFile);
assert(cold.status === 'PASS' && cold.commandRuns.length === 10 && cold.commandRuns.every(item => item.exitCode === 0), 'Ten actual cold-build stages required');
assert(cold.sourceLockSha256 === digest(path.join(frontend, 'package-lock.json')), 'Cold lock differs from current lock');
const builtComparison = read(path.join(import.meta.dirname, 'built-comparison-review-current.json'));
assert(builtComparison.status === 'PASS' && builtComparison.execution.exitCode === 0 && builtComparison.observations.map(item => item.browser).sort().join(',') === 'chromium,firefox' && builtComparison.observations.every(item => item.result === 'PASS'), 'Compiled comparison behavior not observed in both engines');
for (const file of builtComparison.artifactFiles) assert(digest(path.join(frontend, file.path)) === file.sha256, 'Built comparison artifact changed');
for (const [source, hash] of Object.entries(builtComparison.sourceFingerprints)) assert(digest(path.join(frontend, source)) === hash, 'Built comparison reviewer changed');
const environmentFile = path.join(import.meta.dirname, 'environment-current.json'), environment = read(environmentFile);
assert(environment.runs.length === 6 && !environment.drift.length && environment.runs.every(item => item.exitCode === 0), 'Current install/setup/doctor/audit evidence required');
for (const [file, hash] of Object.entries(environment.before)) assert(digest(path.join(frontend, file)) === hash, 'Toolchain/environment source changed: ' + file);

const facts = [
    { name: 'Canonical task criteria', action: step.action, verification: step.verification },
    { name: 'Current task contract/source ownership', routes: taskRoutes.map(item => ({ id: item.routeId, source: item.source, component: item.component })), operationIds: task.operationIds, crosswalk: { operations: 210, files: 71, calls: 222, unresolved: 0 } },
    { name: 'Named executed owner behavior', scope: stepId === 'S03' ? 'negative cases plus owner suite' : 'owner suite', cases: (stepId === 'S03' && negativeCases.length ? negativeCases : allCases).map(item => item.title), executions: allCases.length * 2, assertionInventory: ownerProof },
    { name: 'Current shared dependency regressions', unit: 174, domain: 88, sourceMap: 16, browser: 580, builtArtifact: 6, limits: 'Counts describe distinct suites; they are not added into a checkpoint percentage. Owner case and source checks above are required independently.' },
    { name: 'Executed unit owners', owners: unitProof, limit: 'Literal owner titles bind actual verbose output; parameterized cases remain covered by the whole 174-case run, without inventing separate executions.' },
    { name: 'Compiled comparison behavior', browsers: builtComparison.observations.map(item => ({ browser: item.browser, writes: item.writes, result: item.result })), artifact: 'built-comparison-review-current.json', limit: 'Additional built-artifact observation; not added into full browser or six-case built-suite counts.' },
];
const nativeProofCounts = {
 "evidence/frontend-corrections-20261008/actual-browser-zoom-200-current-components-inherited-current-20261008.json":1,
 "evidence/frontend-corrections-20261008/native-text-only-200-current-components-inherited-current-20261008.json":1,
 "evidence/frontend-ui-improvements/UI028/W30/actual-browser-zoom-200-current-components-inherited-current-20261008.json":5,
 "evidence/frontend-ui-improvements/UI028/W30/native-text-only-200-current-components-inherited-current-20261008.json":5,
 "evidence/frontend-toolbar-20261008/actual-browser-zoom-200-current-components-inherited-current-20261008.json":3,
 "evidence/frontend-toolbar-20261008/native-text-only-200-current-components-inherited-current-20261008.json":4,
 "evidence/frontend-component-fixes-20261008/actual-browser-zoom-200-current-components-native-r5-20261008.json":7,
 "evidence/frontend-component-fixes-20261008/native-text-only-200-current-components-native-r5-20261008.json":7,
};
const nativeProofFiles = Object.keys(nativeProofCounts);
if (['FE003','FE004','FE005','FE006','FE008','FE024','FE026','FE028'].includes(taskId)) {
    assert(logs.verify.includes('Boundary fixtures: PASS 10/10') && /"operations":\s*210/.test(logs.verify) && /"operationCalls":\s*222/.test(logs.verify), 'Strict architecture and generated source gates missing');
    const domain = read(path.join(frontend, 'evidence/domain-tests.json'));
    assert(domain.status === 'PASS' && domain.network.status === 'PASS' && domain.checks.length === 75 && domain.network.checks.length === 13 && [...domain.checks, ...domain.network.checks].every(item => item.status === 'PASS'), 'Current 75 simulator plus 13 network cases required');
    facts.push({ name: 'Strict verification and simulator/network criteria', simulatorChecks: domain.checks.map(item => item.name), networkChecks: domain.network.checks.map(item => item.name), artifact: { path: 'evidence/domain-tests.json', sha256: digest(path.join(frontend, 'evidence/domain-tests.json')) }, verifyLog: records.verify.log, source: 'Full typecheck/lint/source/boundary/negative fixtures/generator/bundle isolation are actual npm verify stages; no backend enforcement claim.' });
}
if (['FE006', 'FE025', 'FE027', 'FE028'].includes(taskId)) {
    const natives = nativeProofFiles.map(file => ({ file, value: read(path.join(frontend, file)) }));
    for (const native of natives) {
        assert(native.value.result === 'PASS' && native.value.scenarios.length === nativeProofCounts[native.file] && native.value.scenarios.every(item => item.result === 'PASS'), 'Actual native zoom scenarios are incomplete');
        for (const [file, hash] of Object.entries(native.value.sourceSha256)) assert(digest(path.resolve(frontend, file)) === hash, 'Native zoom source changed: ' + file);
    }
    facts.push({ name: 'Actual native UI review', artifacts: natives.map(item => ({ path: item.file, sha256: digest(path.join(frontend, item.file)) })), limit: 'Keyboard/axe/reflow/native zoom observed; screen-reader speech and broad human conformance NOT_RUN.' });
}
if (taskId === 'FE002') facts.push({ name: 'Current environment executions', runs: environment.runs, coldInstall: cold.commandRuns.find(item => item.name === 'clean-install'), exactLockPreserved: true });
if (taskId === 'FE026') facts.push({ name: 'Current isolated reproducibility/artifact isolation', artifactManifest: coldFile, runs: cold.commandRuns, limit: 'Local cold execution; no hosted CI or deployment.' });
if (['FE001', 'FE003', 'FE028'].includes(taskId)) facts.push({ name: 'Review boundaries', baseline: 'baseline.json', analogousReview: 'ANALOGOUS_PATTERNS.md', handoff: 'ACCEPTANCE_GUIDE.md', ownerAcceptance: 'PENDING', hostedCI: 'NOT_RUN', backend: 'OUTSIDE_SCOPE', review: 'Codex self-review; no independent peer-review claim.' });

let primaryStage = number >= 9 && number <= 27 ? 'e2e' : 'verify';
if (stepId === 'S01' && number >= 9 && number <= 21) primaryStage = [11,12,13,14,15,16,17,18,20].includes(number) ? 'source-maps' : 'verify';
if (['FE005', 'FE006', 'FE007', 'FE023'].includes(taskId) && ['S02', 'S03', 'S04'].includes(stepId)) primaryStage = 'unit';
if (taskId === 'FE026') primaryStage = 'built-demo';
let primary = record(primaryStage);
let commandId = 'components-' + primaryStage;
if (taskId === 'FE002' && ['S03','S04'].includes(stepId)) {
    const index = stepId === 'S03' ? 1 : 3;
    primary = { ...environment.runs[index], stage: 'environment', sourceFingerprints: records.verify.sourceFingerprints };
    commandId = stepId === 'S03' ? 'components-install' : 'components-setup';
}
if (taskId === 'FE002' && stepId === 'S05') {
    const install = cold.commandRuns.find(item => item.name === 'clean-install');
    primary = { ...install, stage: 'cold-install', log: { path: 'BotSalesAI_Frontend/evidence/frontend-component-fixes-20261008/clean-build-components-20261008.log', sha256: digest(path.join(import.meta.dirname, 'clean-build-components-20261008.log')) }, sourceFingerprints: records.verify.sourceFingerprints };
    commandId = 'components-clean-install';
}
const command = primary.command || '"' + primary.executable + '" ' + primary.args.map(value => /\s/.test(value) ? '"' + value + '"' : value).join(' ');
const commandMapFile = path.join(kit, 'execution/frontend-command-map.json'), commandMap = read(commandMapFile);
assert(commandMap.commands.some(item => item.id === commandId && item.command === command && item.status === 'VERIFIED_AVAILABLE'), 'Register the exact successful executed command first: ' + commandId);

const sources = [...new Set([
    ...taskRoutes.map(item => item.source), ...ownerFiles, ...unitProof.map(item => item.file),
    ...Object.keys(primary.sourceFingerprints).filter(file => /^BotSalesAI_Frontend\/(apps\/web\/src|apps\/web\/tests|packages)\//.test(file)).map(file => file.slice('BotSalesAI_Frontend/'.length)),
    'package.json', 'package-lock.json', 'playwright.config.ts', 'docs/route-implementation.json', 'docs/route-state-role-matrix.json',
    'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
    ...['openapi.json', 'route-manifest.json', 'permission-catalog.json', 'events.schema.json'].map(file => 'botsales-kit/contracts/' + file),
    'evidence/frontend-component-fixes-20261008/revalidate-checkpoints.mjs', 'evidence/frontend-component-fixes-20261008/ANALOGOUS_PATTERNS.md',
    'evidence/frontend-component-fixes-20261008/ACCEPTANCE_GUIDE.md', 'evidence/frontend-component-fixes-20261008/S01-contract-crosswalk-current-20261008.json',
    'evidence/frontend-component-fixes-20261008/clean-artifacts-components-20261008.json', 'evidence/frontend-component-fixes-20261008/environment-current.json',
    'evidence/frontend-component-fixes-20261008/built-comparison-review-current.json', 'evidence/frontend-component-fixes-20261008/review-built-comparison.mjs',
    ...(['FE006', 'FE025', 'FE027', 'FE028'].includes(taskId) ? nativeProofFiles : []),
    ...(step.requiredEvidenceKind === 'artifact_review' ? ['docs/PROJECT_CONTEXT.md', 'docs/CONTINUE_FRONTEND.md', 'docs/KNOWN_GAPS.md', 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', 'evidence/REPORT.md', 'evidence/frontend-component-fixes-20261008/REPORT.md'] : []),
])].sort();
const sourceFiles = sources.map(file => ({ path: file, sha256: digest(resolveSource(file)) }));
const sourceSnapshotSha256 = sha(sourceFiles.map(item => item.path + ':' + item.sha256).sort().join('\n'));
const round = process.argv[4] || 'r1';
assert(/^r\d+$/.test(round), 'Evidence round must be r plus digits');
const out = path.join(kit, 'execution/frontend-evidence', taskId), suffix = stepId + '-components-20261008-' + round;
const reviewLog = path.join(out, suffix + '.log');
const executedAt = new Date().toISOString(), head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim();
const observation = `${taskId}.${stepId}: ${taskRoutes.length} current route owners, ${task.operationIds.length} canonical operations; ${allCases.length} named owner browser scenarios passed in both engines with ${allCases.reduce((n, item) => n + item.assertions.length, 0)} source assertions. ${negativeCases.length} named negative scenarios. Current shared and artifact dependencies also pass. Criterion details, actual assertions, executed log hashes and limits are recorded; no Backend or human acceptance claim.`;
fs.writeFileSync(reviewLog, JSON.stringify({ executedAt, taskId, stepId, facts, executionRecords: Object.values(records).map(item => ({ stage: item.stage, startedAt: item.startedAt, finishedAt: item.finishedAt, log: item.log, sourceDrift: item.sourceDrift })), sourceSnapshotSha256 }, null, 2) + '\n');
const receipt = { taskId, stepId, kind: step.requiredEvidenceKind, result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt, sourceRevision: head + ' plus hashed current working tree', expected: step.verification, observed: observation, commandId, command, cwd: frontend, reviewer: 'Codex current criterion/source/owner-case self-review; no independent review or user acceptance claimed', environment: { name: 'Windows Node ' + process.version + ' / Chromium + Firefox', details: 'Actual React/MSW tests on the current source. This evaluator binds named task cases and their source assertions to completed raw command logs; it does not invent a focused test run.', dataSource: 'synthetic-msw' }, checksTotal: facts.length, failed: 0, sourceFiles, sourceSnapshotSha256, logFile: path.relative(kit, reviewLog).replaceAll('\\', '/'), logSha256: digest(reviewLog), facts, supportingLogs: Object.values(records).map(item => item.log) };
receipt.cwd = primary.cwd;
const receiptPath = path.join(out, suffix + '.json'); fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ taskId, stepId, receipt: path.relative(kit, receiptPath).replaceAll('\\', '/'), ownerCases: allCases.length, negativeCases: negativeCases.length, checks: facts.length }));
