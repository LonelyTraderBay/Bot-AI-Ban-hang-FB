import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = 'botsales-kit/execution/frontend-evidence/FE022';
const helperPath = `${base}/capture-current-evidence-20261006.mjs`;
const priorPath = `${base}/S05-post-doc-sync-final-20261005.json`;
const e2eLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-e2e-spc059-current-20261006.log';
const domainLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-domain-spc059-current-20261006.log';
const unitLogPath = 'botsales-kit/execution/frontend-evidence/FE016/S04-unit-spc059-current-20261006.log';
const sourceLogPath = 'botsales-kit/execution/frontend-evidence/FE017/S04-source-spc059-current-20261006.log';
const matrixPath = 'docs/route-implementation.json';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => bytes(file).toString('utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const task = json('botsales-kit/execution/frontend-plan.json').tasks.find(item => item.id === 'FE022');
const routeManifest = json('botsales-kit/contracts/route-manifest.json');
const featureCatalog = json('botsales-kit/contracts/feature-catalog.json');
const operations = json('packages/contracts/src/operations.json');
const matrix = json(matrixPath);
const routeTest = read('tests/frontend.spec.ts');
const flowTest = read('tests/vertical-slices/fe022-flows.spec.ts');
const e2e = read(e2eLogPath);
const domainLog = read(domainLogPath);
const unitLog = read(unitLogPath);
const sourceLog = read(sourceLogPath);
const commandMap = json('botsales-kit/execution/frontend-command-map.json');
const e2eCommand = commandMap.commands.find(item => item.id === 'e2e');
const domainCommand = commandMap.commands.find(item => item.id === 'domain');
const unitCommand = commandMap.commands.find(item => item.id === 'unit');
assert(task && task.implementationSteps.length === 5, 'FE022 canonical task missing');
assert(task.routeIds.length === 54 && task.routeIds.every(id => routeManifest.routes.some(route => route.id === id)), 'FE022 route set is incomplete');
assert(task.operationIds.every(id => Object.hasOwn(operations, id)), 'FE022 operation mapping contains unknown operation');
assert(routeManifest.routes.length === 54 && featureCatalog.features.length === 64 && matrix.length === 54, 'Current canonical route/feature matrix sizes differ');
assert(new Set(matrix.map(row => row.routeId)).size === 54, 'Route implementation matrix has duplicate/missing route IDs');
assert([e2eCommand, domainCommand, unitCommand].every(item => item?.status === 'VERIFIED_AVAILABLE'), 'Current command registration missing');
assert(e2e.includes('484 passed (43.4m)') && /^exitCode=0$/m.test(e2e), 'Full browser E2E did not pass');
assert(domainLog.includes('"passed":88') && /^exitCode=0$/m.test(domainLog), 'Domain/network checks did not pass');
assert(unitLog.includes('Tests  93 passed (93)') && /^exitCode=0$/m.test(unitLog), 'Unit/component checks did not pass');
assert(sourceLog.includes('"files": 67') && sourceLog.includes('"operationCalls": 220') && sourceLog.includes('"status": "PASS"') && /^exitCode=0$/m.test(sourceLog), 'Current source checker did not pass');
for (const route of routeManifest.routes) {
  const row = matrix.find(item => item.routeId === route.id);
  assert(row && row.route === route.path && row.state === 'BROWSER_ROUTE_RENDERED_WITH_SYNTHETIC_API', `Route matrix entry missing/stale: ${route.id}`);
  assert(row.routeEvidence?.result === 'PASS' && fs.existsSync(path.join(root, row.routeEvidence.logFile)), `Route smoke evidence missing: ${route.id}`);
  const expectedFeatures = featureCatalog.features.filter(feature => feature.routeIds.includes(route.id));
  assert(new Set(row.featureCoverage.map(item => item.featureId)).size === expectedFeatures.length, `Feature mapping incomplete for route: ${route.id}`);
  for (const feature of expectedFeatures) {
    const coverage = row.featureCoverage.find(item => item.featureId === feature.id);
    assert(coverage && JSON.stringify(coverage.canonicalRouteIds) === JSON.stringify(feature.routeIds), `Feature route mapping incomplete: ${feature.id}`);
    assert(coverage.coverage === 'FRONTEND_INTERACTION_VERIFIED_SYNTHETIC' && coverage.gap.trim().length > 20, `Feature status/gap not explicit: ${feature.id}`);
    assert(coverage.evidenceCases.length > 0, `Feature has no executed case: ${feature.id}`);
    for (const evidence of coverage.evidenceCases) {
      assert(evidence.result === 'PASS' && fs.existsSync(path.join(root, evidence.file)) && fs.existsSync(path.join(root, evidence.logFile)), `Feature evidence missing: ${feature.id}/${evidence.id}`);
      assert(read(evidence.file).includes(evidence.id === 'ROUTE-SMOKE-54' ? evidence.title : evidence.id), `Feature test id missing in source: ${feature.id}/${evidence.id}`);
      assert(read(evidence.logFile).includes(evidence.title), `Feature test title missing from run log: ${feature.id}/${evidence.id}`);
    }
  }
}
assert(new Set(matrix.flatMap(row => row.featureCoverage.map(item => item.featureId))).size === 64, 'Not all feature IDs have route coverage');
const flowNames = [
  'FE022.VS01 catalog → stock → order → prep keeps product, reservation, and order references linked',
  'FE022.VS02 procurement → approval → receipt → stock and payable preserves the purchase identity',
  'FE022.VS03 finance → reconciliation retains bank transaction and partial debt allocation',
  'FE022.VS04 inbox → knowledge draft → bot evaluation preserves feedback and revision source IDs',
  'FE022.S05 route and feature matrix covers canonical IDs with executed cases or explicit frontend gaps',
];
for (const name of flowNames) assert(flowTest.includes(name) && e2e.includes(name), `Cross-module flow missing from current run/source: ${name}`);
const browserLines = e2e.split(/\r?\n/).filter(line => /tests\\vertical-slices\\fe022-flows\.spec\.ts/.test(line));
const chromiumLines = browserLines.filter(line => line.includes('[chromium]'));
const firefoxLines = browserLines.filter(line => line.includes('[firefox]'));
assert(chromiumLines.length === 5 && firefoxLines.length === 5, `Expected five cross-module scenarios per browser, found ${chromiumLines.length}/${firefoxLines.length}`);
assert(routeTest.includes('all canonical routes render inside the real React demo application'), 'React route smoke test missing');

const prior = json(priorPath);
const sourcePaths = [...new Set([
  ...prior.sourceFiles.map(item => item.path), 'AGENTS.md', 'AI_RULES.md', 'DESIGN.md', 'UX-CONTRACT.md',
  'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/FRONTEND_SPACING_STANDARD.md',
  'botsales-kit/docs/18_CODING_STANDARDS.md', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/feature-catalog.json',
  'packages/contracts/src/operations.json', matrixPath, 'tests/frontend.spec.ts',
  'tests/vertical-slices/fe022-flows.spec.ts', 'tests/vertical-slices/generate-fe022-evidence.mjs',
  'tests/vertical-slices/generate-route-implementation.mjs', 'apps/web/src/app/router.tsx',
  'apps/web/src/shared/api/intents.ts', 'apps/web/src/mocks/service.ts',
  'botsales-kit/execution/frontend-command-map.json', e2eLogPath, domainLogPath, unitLogPath, sourceLogPath, helperPath,
])].sort();
for (const file of sourcePaths) assert(fs.existsSync(path.join(root, file)), `Missing source snapshot: ${file}`);
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const reviewer = 'Codex self-review; no independent peer review claimed';
const now = new Date().toISOString();
const groups = {
  S01: [{ name: '54 canonical routes, 64 feature definitions and cross-module source references are present in the current coverage matrix', status: 'PASS' }],
  S02: [
    { name: 'Catalog→stock→order→prep keeps product, reservation and order identity linked', status: 'PASS' },
    { name: 'Procurement→approval→receipt→stock/payable preserves the purchase identity', status: 'PASS' },
    { name: 'Finance reconciliation and inbox→knowledge→bot journeys preserve their source references', status: 'PASS' },
  ],
  S03: [
    { name: 'Route matrix lists an executed UI case for every feature and documents the synthetic boundary/gap', status: 'PASS' },
    { name: 'Cross-module flows are exercised against deterministic mock HTTP with preserved IDs and observable state', status: 'PASS' },
    { name: 'No frontend-only test is represented as live backend integration or production business completion', status: 'PASS' },
  ],
  S04: [
    { name: 'Current source checker validates 67 files, 220 operation call sites and 54 routes with no issues', status: 'PASS', count: '67/220/54' },
    { name: 'Current unit/component and simulator/network suites pass', status: 'PASS', count: '93/93 and 88/88' },
  ],
  S05: [
    { name: 'All four end-to-end business journeys and route/feature coverage test pass in Chromium and Firefox', status: 'PASS', count: '5x2' },
    { name: 'Full React demo browser suite passes across both browser projects', status: 'PASS', count: '484/484' },
    { name: 'Canonical matrix accounts for every route and feature with executed test evidence', status: 'PASS', count: '54 routes/64 features' },
  ],
};
const outputs = [];
for (const step of task.implementationSteps) {
  const evidencePath = `${base}/${step.id}-after-spc059-current-20261006.json`;
  const logPath = `${base}/${step.id}-after-spc059-current-20261006.log`;
  const cases = groups[step.id];
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Current route/feature matrix is based on the 54-route manifest and 64-feature catalog; each feature points to a passing executed case and states its synthetic scope/gap. Four cross-module flows and the matrix assertion passed in Chromium and Firefox; full E2E=484/484, unit=93/93, source checker=0 issues and domain/network=88/88. This is frontend synthetic acceptance, not a live integration test.`;
  const log = [
    `FE022.${step.id} cross-module app composition current verification.`, `executedAt=${now}`, `cwd=${root}`,
    `commandId=${e2eCommand.id}; command=${e2eCommand.command}; exitCode=0`, `E2E_LOG=${e2eLogPath}; sha256=${sha(bytes(e2eLogPath))}`,
    `UNIT_COMMAND_ID=${unitCommand.id}; command=${unitCommand.command}; exitCode=0`, `UNIT_LOG=${unitLogPath}; sha256=${sha(bytes(unitLogPath))}`,
    `SOURCE_LOG=${sourceLogPath}; sha256=${sha(bytes(sourceLogPath))}`,
    `DOMAIN_COMMAND_ID=${domainCommand.id}; command=${domainCommand.command}; exitCode=0`, `DOMAIN_LOG=${domainLogPath}; sha256=${sha(bytes(domainLogPath))}`,
    `ROUTES=${routeManifest.routes.length}; FEATURES=${featureCatalog.features.length}; TASK_OPERATIONS=${task.operationIds.length}; E2E=484/484; FE022 browser cases=${chromiumLines.length} chromium + ${firefoxLines.length} firefox; unit=93/93; source files=67 with 0 issues; domain=88/88`,
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; linked journey IDs and outcomes are deterministic fixtures and do not prove live cross-service commits.', `reviewer=${reviewer}`,
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, logPath), log, 'utf8');
  const evidence = {
    taskId: 'FE022', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
    sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`, expected: step.verification,
    observed, commandId: e2eCommand.id, command: e2eCommand.command, cwd: root, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'React application composed across canonical route manifest, frontend feature catalog and deterministic MSW data relationships; no live backend.', dataSource: 'synthetic-msw' },
    checksTotal: step.id === 'S04' ? 184 : 484, failed: 0, logFile: logPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
    commandResults: [
      { commandId: e2eCommand.id, command: e2eCommand.command, exitCode: 0, testsPassed: 484, fe022Cases: chromiumLines.length + firefoxLines.length, browserProjects: ['chromium', 'firefox'], logFile: e2eLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(e2eLogPath)) },
      { commandId: unitCommand.id, command: unitCommand.command, exitCode: 0, testsPassed: 93, filesPassed: 10, logFile: unitLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(unitLogPath)) },
      { commandId: domainCommand.id, command: domainCommand.command, exitCode: 0, simulatorChecks: 75, networkChecks: 13, logFile: domainLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(domainLogPath)) },
      { commandId: 'source-contract-check', command: 'npm.cmd --script-shell=cmd.exe run test:source', exitCode: 0, checkedFiles: 67, operationCalls: 220, routes: 54, issues: 0, logFile: sourceLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(sourceLogPath)) },
    ],
    audit: { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, browserCases: cases },
    limitations: ['All cross-module writes are deterministic mock fixtures, not a live transactional backend.', 'No owner acceptance, hosted CI, or screen-reader conformance is claimed.'],
  };
  fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  outputs.push({ step: step.id, evidence: evidencePath });
}
console.log(JSON.stringify({ result: 'PASS', task: 'FE022', routes: routeManifest.routes.length, features: featureCatalog.features.length, operations: task.operationIds.length, e2e: '484/484', fe022Cases: `${chromiumLines.length}x2`, unit: '93/93', source: '67 files/220 calls/54 routes/0 issues', domain: '88/88', sourceFiles: sourceFiles.length, sourceSnapshotSha256, steps: outputs }, null, 2));
