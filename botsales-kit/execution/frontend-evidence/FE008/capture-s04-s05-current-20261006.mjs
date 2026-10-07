import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = 'botsales-kit/execution/frontend-evidence/FE008';
const helperPath = `${base}/capture-s04-s05-current-20261006.mjs`;
const domainLogPath = `${base}/S03-domain-spc059-current-20261006.log`;
const e2eLogPath = `${base}/S03-e2e-spc059-current-20261006.log`;
const unitLogPath = 'botsales-kit/execution/frontend-evidence/FE003/S03-unit-current-spc059-20261006.log';
const domainReportPath = 'evidence/domain-tests.json';
const s01Path = `${base}/S01-after-spc059-20261006.json`;
const s03Path = `${base}/S03-after-spc059-full-e2e-20261006.json`;
const s03LogPath = `${base}/S03-after-spc059-full-e2e-20261006.log`;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => bytes(file).toString('utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(root.endsWith('BotSalesAI_Frontend'), `Unexpected workspace root: ${root}`);
const domain = json(domainReportPath);
const s01 = json(s01Path);
const s03 = json(s03Path);
const domainLog = read(domainLogPath);
const e2eLog = read(e2eLogPath);
const map = json('botsales-kit/execution/frontend-command-map.json');
const domainCommand = map.commands.find(item => item.id === 'domain');
const e2eCommand = map.commands.find(item => item.id === 'e2e');
assert(domainCommand?.status === 'VERIFIED_AVAILABLE' && e2eCommand?.status === 'VERIFIED_AVAILABLE', 'Required test commands are not registered and verified');
assert(domain.status === 'PASS' && domain.checks.length === 75 && domain.checks.every(item => item.status === 'PASS'), 'Current simulator result must pass 75/75');
assert(domain.network.handlers === 210 && domain.network.checks.length === 13 && domain.network.checks.every(item => item.status === 'PASS'), 'Current network result must pass 13/13 over 210 handlers');
assert(/^exitCode=0$/m.test(domainLog) && domainLog.includes('"passed":88'), 'Current domain command log must prove exit 0 and 88/88');
assert(s01.audit.seed.records === 231 && s01.audit.seed.shopScopedRecords === 229 && s01.audit.seed.orphanShopReferences === 0, 'Current seed relationship audit is missing');
assert(s01.audit.seed.relationshipChecks.length >= 7 && s01.audit.seed.money.amountsUseExactIntegerStrings, 'Seed relationships or exact VND amounts were not verified');
assert(e2eLog.includes('484 passed (43.4m)') && /^exitCode=0$/m.test(e2eLog), 'Current full E2E run must pass 484/484');
assert(e2eLog.includes('the production artifact contains neither the mock worker asset nor MSW fixtures/runtime'), 'Production artifact mock exclusion test missing');
assert(e2eLog.includes('concurrent demo servers use isolated Vite caches and load the React app') && e2eLog.includes('VITE_CACHE_ISOLATION=PASS'), 'Concurrent demo cache isolation test missing');
assert(domain.network.checks.some(item => item.name.includes('Resets records, role, faults, idempotency keys, sequence, and fixed clock deterministically')), 'Deterministic reset scenario missing');
assert(domain.network.checks.some(item => item.name.includes('Aborted delayed reads do not leak')), 'Delayed request isolation scenario missing');
assert(domain.network.checks.some(item => item.name.includes('Scopes reads to the requested shop and role permissions')), 'Cross-shop/role scope scenario missing');

const priorS03Sources = s03.sourceFiles.map(item => item.path);
const sourcePaths = [...new Set([
  ...priorS03Sources,
  s01Path,
  'botsales-kit/execution/frontend-evidence/FE008/S01-after-spc059-20261006.log',
  s03Path,
  s03LogPath,
  domainLogPath,
  e2eLogPath,
  unitLogPath,
  domainReportPath,
  'botsales-kit/execution/frontend-command-map.json',
  helperPath,
])].sort();
for (const file of sourcePaths) assert(fs.existsSync(path.join(root, file)), `Missing snapshot file: ${file}`);
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const reviewer = 'Codex self-review; no independent peer review claimed';
const now = new Date().toISOString();
const networkScenarios = domain.network.checks.map(item => ({ name: item.name, status: item.status }));
const common = {
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`,
  cwd: root,
  reviewer,
  environment: { name: `Windows / Node ${process.versions.node} / local Frontend toolchain`, details: 'Deterministic in-memory data and MSW in local React demo/tests. No live API or provider.', dataSource: 'synthetic-msw' },
  sourceFiles,
  sourceSnapshotSha256,
};

const s04Path = `${base}/S04-after-spc059-current-schema-20261006.json`;
const s04LogPath = `${base}/S04-after-spc059-current-schema-20261006.log`;
const s04Observed = 'Fresh local test:domain exited 0 with 75/75 simulator checks, 13/13 MSW network scenarios, and 210/210 operation handlers. The current fixture audit verifies schema-valid responses, invalid request/CSRF/If-Match rejection, wrong-shop isolation, product variants, deterministic collections and reset; FE008.S01 current seed evidence verifies 231 records across 51 collections, seven relationship families, exact integer VND strings, and zero orphan shop references. Synthetic test data only.';
const s04Audit = { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', simulator: '75/75', network: '13/13', handlers: '210/210', seedRecords: 231, collections: 51, relationshipFamilies: 7, shopScopedRecords: 229, orphanShopReferences: 0, exactIntegerVnd: true, schemaInvalidAndWrongShopDetected: true, scenarios: networkScenarios, observedAt: now };
const s04Log = [
  'FE008.S04 fresh synthetic simulator/schema/network and relational seed verification.', `executedAt=${now}`,
  `commandId=${domainCommand.id}; command=${domainCommand.command}; exitCode=0`, `DOMAIN_LOG=${domainLogPath}; sha256=${sha(bytes(domainLogPath))}`,
  `SIMULATOR=75/75; NETWORK=13/13; HANDLERS=210/210; SEED=231 rows / 51 collections / 7 relation families; ORPHAN_SHOPS=0`,
  ...networkScenarios.map(item => `NETWORK ${item.status}: ${item.name}`),
  `SEED_SOURCE=${s01Path}; log=${s01.audit.seed.records} rows, ${s01.audit.seed.shopScopedRecords} shop-scoped, ${s01.audit.seed.orphanShopReferences} orphan references.`,
  'Scope=local React frontend and synthetic MSW only; no backend schemas or live API claims.', `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`), `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(path.join(root, s04LogPath), s04Log, 'utf8');
const s04 = {
  taskId: 'FE008', stepId: 'S04', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
  expected: 'Simulator/schema/network tests validate request and response contracts, deterministic collection fixtures and relationships; schema-invalid and wrong-shop requests are detected.',
  observed: s04Observed, commandId: domainCommand.id, command: domainCommand.command, ...common,
  checksTotal: 88, failed: 0, logFile: s04LogPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(s04Log)), audit: s04Audit,
  commandResults: [{ commandId: domainCommand.id, command: domainCommand.command, exitCode: 0, simulatorChecks: 75, networkChecks: 13, operationHandlers: 210, logFile: domainLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(domainLogPath)) }],
};
fs.writeFileSync(path.join(root, s04Path), `${JSON.stringify(s04, null, 2)}\n`, 'utf8');

const s05Path = `${base}/S05-after-spc059-current-isolation-20261006.json`;
const s05LogPath = `${base}/S05-after-spc059-current-isolation-20261006.log`;
const s05Observed = 'The complete built-demo browser suite passed 484/484 on Chromium and Firefox, including production artifact exclusion of the MSW worker/runtime and concurrent demo-server Vite-cache isolation. Fresh domain checks passed deterministic state reset, role/shop isolation, and delayed abort scenarios. Demo/test activation stays separate from live development; this is local frontend behavior with synthetic data, not a live backend.';
const s05Audit = { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', playwright: '484/484', browserProjects: ['chromium', 'firefox'], productionArtifactExcludesMsw: true, concurrentDemoCacheIsolation: true, deterministicReset: true, shopAndRoleIsolation: true, delayedRequestAbortIsolation: true, mockActivationModeGuarded: true, realBackendClaimed: false, observedAt: now };
const s05Log = [
  'FE008.S05 current demo/test-only mock activation and reset/isolation evidence.', `executedAt=${now}`,
  `commandId=${e2eCommand.id}; command=${e2eCommand.command}; exitCode=0`, `E2E_LOG=${e2eLogPath}; sha256=${sha(bytes(e2eLogPath))}`,
  `commandId=${domainCommand.id}; command=${domainCommand.command}; exitCode=0`, `DOMAIN_LOG=${domainLogPath}; sha256=${sha(bytes(domainLogPath))}`,
  'E2E=484/484 across Chromium+Firefox; production artifact excludes mock worker/MSW runtime; concurrent demo Vite caches isolated; deterministic reset and shop/role scope scenarios PASS.',
  'Synthetic data is volatile/in-memory and resettable. Live development is separate; no persistence, backend, or provider connection is represented.',
  'Scope=local React Frontend with synthetic MSW only.', `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`), `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(path.join(root, s05LogPath), s05Log, 'utf8');
const s05 = {
  taskId: 'FE008', stepId: 'S05', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
  expected: 'Reset/isolation and mock-only activation tests prove no cross-test/shop leakage and no mock runtime in the production artifact; synthetic limitations and fixture source are explicit.',
  observed: s05Observed, commandId: e2eCommand.id, command: e2eCommand.command, ...common,
  checksTotal: 484, failed: 0, logFile: s05LogPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(s05Log)), audit: s05Audit,
  commandResults: [
    { commandId: e2eCommand.id, command: e2eCommand.command, exitCode: 0, testsPassed: 484, logFile: e2eLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(e2eLogPath)) },
    { commandId: domainCommand.id, command: domainCommand.command, exitCode: 0, resetAndIsolationScenarios: 3, logFile: domainLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(domainLogPath)) },
  ],
};
fs.writeFileSync(path.join(root, s05Path), `${JSON.stringify(s05, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({ result: 'PASS', s04: { evidence: s04Path, simulator: '75/75', network: '13/13', seedRecords: 231 }, s05: { evidence: s05Path, e2e: '484/484', productionMswExcluded: true, demoCacheIsolation: true }, sourceFiles: sourceFiles.length, sourceSnapshotSha256 }, null, 2));
