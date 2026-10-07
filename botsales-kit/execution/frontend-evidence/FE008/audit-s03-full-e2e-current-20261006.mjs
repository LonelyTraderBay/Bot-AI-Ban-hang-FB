import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = 'botsales-kit/execution/frontend-evidence/FE008';
const priorEvidencePath = `${base}/S03-post-ui027-revalidation-20261005.json`;
const e2eLogPath = `${base}/S03-e2e-spc059-current-20261006.log`;
const domainLogPath = `${base}/S03-domain-spc059-current-20261006.log`;
const unitLogPath = 'botsales-kit/execution/frontend-evidence/FE003/S03-unit-current-spc059-20261006.log';
const domainReportPath = 'evidence/domain-tests.json';
const evidencePath = `${base}/S03-after-spc059-full-e2e-20261006.json`;
const logPath = `${base}/S03-after-spc059-full-e2e-20261006.log`;
const helperPath = `${base}/audit-s03-full-e2e-current-20261006.mjs`;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => bytes(file).toString('utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(root.endsWith('BotSalesAI_Frontend'), `Unexpected cwd: ${root}`);
const e2e = read(e2eLogPath);
const domainLog = read(domainLogPath);
const unitLog = read(unitLogPath);
const domain = json(domainReportPath);
const prior = json(priorEvidencePath);
const map = json('botsales-kit/execution/frontend-command-map.json');
const e2eCommand = map.commands.find(command => command.id === 'e2e');
const domainCommand = map.commands.find(command => command.id === 'domain');
assert(e2eCommand?.status === 'VERIFIED_AVAILABLE', 'Full E2E command is not registered as verified available');
assert(domainCommand?.status === 'VERIFIED_AVAILABLE', 'Domain command is not registered as verified available');
assert(e2e.includes('484 passed (43.4m)') && /^exitCode=0$/m.test(e2e), 'Full browser suite must pass 484/484 with exit 0');
assert((e2e.match(/ROUTE_ERROR_COMPOSITION=51\/51 RESULT=PASS/g) ?? []).length === 2, 'Route error composition must pass 51/51 in both browser projects');
assert(e2e.includes('ROUTE_EMPTY_COMPOSITION=11/11 RESULT=PASS'), 'Route empty-state composition did not pass 11/11');
assert(e2e.includes('issues":0') && e2e.includes('pageErrors":0'), 'Responsive/layout evidence must report no issues or page errors');
assert(e2e.includes('UI006.C05 lookup and table cursors reach records after 150 synthetic suppliers, offers, and orders'), 'Large collection cursor case missing');
assert(e2e.includes('UI008 R29 successful empty collection exposes an accessible state') && e2e.includes('R29 forbidden channel query is not presented as empty'), 'Empty, forbidden, and loading/error coverage missing');
assert(e2e.includes('FE011.AC03 conflict and insufficient stock preserve the draft') && e2e.includes('FE012.AC03 mock stale-version 412 preserves draft fields'), 'Stale/conflict unhappy-flow cases missing');
assert(e2e.includes('FE016.AC03 unknown send keeps the reply draft') && e2e.includes('UI009 delayed customer orders from the previous shop cannot leak'), 'Unknown-result and delayed-scope cases missing');
assert(domain.status === 'PASS' && domain.checks.length === 75 && domain.checks.every(check => check.status === 'PASS'), 'Fresh domain simulator checks did not pass');
assert(domain.network.handlers === 210 && domain.network.checks.length === 13 && domain.network.checks.every(check => check.status === 'PASS'), 'Fresh MSW network handlers/scenarios did not pass');
assert(domain.network.checks.some(check => check.name.includes('Streams only the authorized shop') && check.name.includes('canonical v2 schema')), 'Authorized SSE fixture coverage missing');
assert(domain.network.checks.some(check => check.name.includes('Aborted delayed reads')), 'Delayed/aborted network fixture coverage missing');
assert(domainLog.includes('"passed":88') && /^exitCode=0$/m.test(domainLog), 'Fresh registered domain command log is incomplete');
assert(unitLog.includes('Tests  93 passed (93)') && /^exitCode=0$/m.test(unitLog), 'Fresh unit test run did not pass 93/93');

const scenarios = [
  { id: 'browser-suite', name: 'Built demo: full React Playwright suite across Chromium and Firefox', status: 'PASS', count: '484/484' },
  { id: 'route-errors', name: 'Shared API error composition on every shop route', status: 'PASS', count: '51/51 per browser project' },
  { id: 'route-empty', name: 'Accessible empty-state composition on canonical list routes', status: 'PASS', count: '11/11 per browser project' },
  { id: 'large-collections', name: 'Cursor lookup through 150 synthetic suppliers, offers, and orders', status: 'PASS' },
  { id: 'empty-forbidden-retry', name: 'Empty, forbidden, pending, and recoverable API error states remain distinct', status: 'PASS' },
  { id: 'stale-422-unknown', name: 'Stale/412, validation/422, and unknown mutation outcomes preserve drafts and avoid false success', status: 'PASS' },
  { id: 'delayed-shop-scope', name: 'Delayed previous-shop reads cannot leak after shop switch', status: 'PASS' },
  { id: 'keyboard-viewport', name: 'Keyboard interaction, focus return, responsive geometry, and 200 percent text stress', status: 'PASS' },
  { id: 'sse', name: 'Authorized-shop SSE events match canonical schema', status: 'PASS', evidence: 'fresh FE008 domain run' },
  { id: 'network-reset', name: 'Deterministic reset, delayed abort, schema validation, and 210 operation handlers', status: 'PASS', evidence: 'fresh FE008 domain run' },
];
const evidenceScenarios = scenarios.map(scenario => ({ ...scenario }));
const audit = {
  scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  result: 'PASS',
  browserProjects: ['chromium', 'firefox'],
  playwrightTestsPassed: 484,
  routeErrorCompositionPerProject: '51/51',
  routeEmptyCompositionPerProject: '11/11',
  domainSimulatorChecks: domain.checks.length,
  networkScenarios: domain.network.checks.length,
  networkHandlers: domain.network.handlers,
  operationsWithSyntheticCoverage: domain.operations,
  scenarios: evidenceScenarios,
  falseSuccessCases: 0,
  externalServicesCalled: false,
  observedAt: new Date().toISOString(),
};
const sourcePaths = [...new Set([
  ...prior.sourceFiles.map(file => file.path),
  priorEvidencePath,
  'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-plan.json',
  e2eLogPath,
  domainLogPath,
  domainReportPath,
  unitLogPath,
  helperPath,
])].sort();
for (const file of sourcePaths) assert(fs.existsSync(path.join(root, file)), `Missing snapshot file: ${file}`);
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const executedAt = audit.observedAt;
const reviewer = 'Codex self-review; no independent peer review claimed';
const observed = 'The full built-demo Playwright suite passed 484/484 tests on Chromium and Firefox. All 51 route-error composition and 11 empty-state composition cases passed per browser project. A fresh domain run also passed 75 simulator checks, 13 network scenarios, and 210 MSW handlers, including schema validation, shop/role isolation, delayed abort, and authorized canonical SSE. Unit tests passed 93/93. All results use deterministic synthetic data and local React/MSW only.';
const log = [
  'FE008.S03 named happy/unhappy browser flows, full responsive suite, and current synthetic network scenarios.',
  `executedAt=${executedAt}`, `cwd=${root}`,
  `commandId=${e2eCommand.id}; command=${e2eCommand.command}; exitCode=0`, `E2E_LOG=${e2eLogPath}; sha256=${sha(bytes(e2eLogPath))}`,
  `commandId=${domainCommand.id}; command=${domainCommand.command}; exitCode=0`, `DOMAIN_LOG=${domainLogPath}; sha256=${sha(bytes(domainLogPath))}`,
  `UNIT_LOG=${unitLogPath}; sha256=${sha(bytes(unitLogPath))}`,
  `playwright=484/484; routeErrors=51/51 x 2 browser projects; emptyStates=11/11 x 2 browser projects; domain=${domain.checks.length}/${domain.checks.length}; network=${domain.network.checks.length}/${domain.network.checks.length}; handlers=${domain.network.handlers}`,
  ...scenarios.map(scenario => `SCENARIO ${scenario.status} ${scenario.id}: ${scenario.name}${scenario.count ? ` (${scenario.count})` : ''}`),
  'Scope=local React frontend and deterministic synthetic MSW; no live backend/provider, hosted CI, screen-reader, or owner acceptance claim.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
  `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(path.join(root, logPath), log, 'utf8');
const evidence = {
  taskId: 'FE008', stepId: 'S03', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`,
  expected: 'Identified happy/unhappy UI cases cover large and empty datasets, permission denial, stale/422/unknown outcomes, delayed requests, and SSE. Failures preserve drafts and never show false success; no real service is called.',
  observed,
  commandId: e2eCommand.id, command: e2eCommand.command, cwd: root, reviewer,
  environment: { name: `Windows / Node ${process.versions.node} / npm ${process.env.npm_config_user_agent || '11.17.0'} / Chromium + Firefox`, details: 'Full local built-demo React Playwright suite plus fresh local synthetic MSW domain run. Deterministic in-memory data only; no live API or external provider.', dataSource: 'synthetic-msw' },
  checksTotal: 484, failed: 0, logFile: logPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  commandResults: [
    { commandId: e2eCommand.id, command: e2eCommand.command, exitCode: 0, testsPassed: 484, logFile: e2eLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(e2eLogPath)) },
    { commandId: domainCommand.id, command: domainCommand.command, exitCode: 0, simulatorChecks: 75, networkChecks: 13, networkHandlers: 210, logFile: domainLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(domainLogPath)) },
    { command: 'npm.cmd --script-shell=cmd.exe test', exitCode: 0, testsPassed: 93, logFile: unitLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(unitLogPath)) },
  ],
  audit,
};
fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', playwright: '484/484', domain: '88/88', handlers: domain.network.handlers, scenarios: scenarios.length, sourceFiles: sourceFiles.length, sourceSnapshotSha256, evidence: evidencePath, log: logPath }, null, 2));
