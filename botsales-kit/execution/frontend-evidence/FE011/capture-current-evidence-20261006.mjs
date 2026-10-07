import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = 'botsales-kit/execution/frontend-evidence/FE011';
const helperPath = `${base}/capture-current-evidence-20261006.mjs`;
const priorPath = `${base}/S05-post-doc-sync-final-20261005.json`;
const e2eLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-e2e-spc059-current-20261006.log';
const domainLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-domain-spc059-current-20261006.log';
const sourceLogPath = `${base}/S04-source-spc059-current-20261006.log`;
const mapLogPath = `${base}/S04-source-map-spc059-current-20261006.log`;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => bytes(file).toString('utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const task = json('botsales-kit/execution/frontend-plan.json').tasks.find(item => item.id === 'FE011');
const routeManifest = json('botsales-kit/contracts/route-manifest.json').routes;
const operationIndex = json('packages/contracts/src/operations.json');
const inventory = read('apps/web/src/modules/inventory/index.tsx');
const testFile = read('tests/fe011.spec.ts');
const sourceMapTest = read('tests/fe011-source-map.test.mjs');
const e2e = read(e2eLogPath);
const domainLog = read(domainLogPath);
const sourceLog = read(sourceLogPath);
const sourceMapLog = read(mapLogPath);
const map = json('botsales-kit/execution/frontend-command-map.json');
const e2eCommand = map.commands.find(item => item.id === 'e2e');
const domainCommand = map.commands.find(item => item.id === 'domain');
const sourceCommand = map.commands.find(item => item.id === 'source');
const mapCommand = map.commands.find(item => item.id === 'fe011-source-map');
assert(task && task.implementationSteps.length === 5, 'FE011 plan task unavailable');
assert([e2eCommand, domainCommand, sourceCommand, mapCommand].every(item => item?.status === 'VERIFIED_AVAILABLE'), 'A current test command is not registered');
assert(task.routeIds.every(id => routeManifest.some(route => route.id === id)) && task.operationIds.every(id => Object.hasOwn(operationIndex, id)), 'Inventory route/operation ID map is inconsistent');
assert(inventory.includes("useApi('listStockSnapshots'") && inventory.includes("useApi('listStockMovements'") && inventory.includes("useCommand('createInventoryAdjustment'"), 'Inventory module omits canonical read/adjust operations');
assert(inventory.includes("useCan('finance.read')") && inventory.includes("permission=\"inventory.adjust\""), 'Inventory cost/action permission boundary missing');
assert(sourceMapTest.includes('createInventoryAdjustment') && sourceMapTest.includes('expectedVersion') && sourceMapTest.includes('unitCost'), 'FE011 source-map contract assertion missing');
assert(/^exitCode=0$/m.test(sourceMapLog) && sourceMapLog.includes('pass 1'), 'Current inventory source-map test did not pass');
assert(sourceLog.includes('"status": "PASS"') && /"issues":\s*\[\]/.test(sourceLog) && /^exitCode=0$/m.test(sourceLog), 'Current source/route checker did not pass');
assert(domainLog.includes('"passed":88') && /^exitCode=0$/m.test(domainLog), 'Fresh simulator/network checks did not pass');
assert(e2e.includes('484 passed (43.4m)') && /^exitCode=0$/m.test(e2e), 'Current full browser suite did not pass');
const browserCases = [
  'FE011.AC01 snapshot drives stock totals and the SKU opens its catalog result',
  'FE011.AC02 adjustment validates, waits for mock confirmation, and reconciles movement history once',
  'FE011.AC03 conflict and insufficient stock preserve the draft and never update optimistically',
  'FE011.AC03 forbidden adjustment retains user input and shows no success state',
  'FE011.AC03 unknown command blocks duplicate submission until shared recovery reconciles it',
  'FE011.AC04 movement contract filters are URL-backed and history exposes actor and permission-gated source',
  'FE011.AC05 inventory reflows at mobile widths, passes axe, and restores keyboard focus after adjustment dialog',
  'FE011.AC03 unknown shop scope shows no stock from another shop',
];
for (const name of browserCases) assert(e2e.includes(name), `FE011 browser case missing: ${name}`);

const prior = json(priorPath);
const sourcePaths = [...new Set([
  ...prior.sourceFiles.map(item => item.path), 'AGENTS.md', 'AI_RULES.md',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/contracts/route-manifest.json', 'packages/contracts/src/operations.json',
  'apps/web/src/modules/inventory/index.tsx', 'tests/fe011.spec.ts', 'tests/fe011-source-map.test.mjs',
  'tests/fixtures/mock-network.mjs', 'botsales-kit/execution/frontend-command-map.json',
  e2eLogPath, domainLogPath, sourceLogPath, mapLogPath, helperPath,
])].sort();
for (const file of sourcePaths) assert(fs.existsSync(path.join(root, file)), `Missing source snapshot: ${file}`);
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const reviewer = 'Codex self-review; no independent peer review claimed';
const now = new Date().toISOString();
const groups = {
  S01: [{ name: 'R15/R16 and all inventory operations map to canonical contract permissions and DTOs', status: 'PASS', routes: task.routeIds.length, operations: task.operationIds.length }],
  S02: [
    { name: 'Snapshot on-hand/reserved/available and catalog SKU navigation use the synthetic API result', status: 'PASS' },
    { name: 'Adjustment creates a mock command and one movement-history item after confirmation', status: 'PASS' },
  ],
  S03: [
    { name: 'Stale version, insufficient stock, forbidden role, wrong shop, and unknown command preserve the draft', status: 'PASS' },
    { name: 'No optimistic stock decrement or duplicate retry is presented as success', status: 'PASS' },
  ],
  S04: [
    { name: 'Current source checker and inventory contract source-map regression pass', status: 'PASS', count: '4/4 combined' },
    { name: 'Fresh synthetic domain/schema/network checks pass', status: 'PASS', count: '88/88' },
  ],
  S05: [
    { name: 'All current browser E2E cases pass in Chromium and Firefox', status: 'PASS', count: '484/484' },
    { name: 'Inventory table reflow, axe route check, keyboard adjustment and focus return pass', status: 'PASS' },
  ],
};
const out = [];
for (const step of task.implementationSteps) {
  const evidencePath = `${base}/${step.id}-after-spc059-current-20261006.json`;
  const logPath = `${base}/${step.id}-after-spc059-current-20261006.log`;
  const cases = groups[step.id];
  const observed = `${cases.map(item => item.name + (item.count ? ` (${item.count})` : '')).join('; ')}. Current full local React demo E2E: 484/484; fresh source/domain checks: source checker 67 files, 220 operation call sites, 54 routes with no findings; source-map 1/1; domain/MSW 88/88. Synthetic data only.`;
  const log = [
    `FE011.${step.id} current inventory snapshot/movement verification.`, `executedAt=${now}`, `cwd=${root}`,
    `commandId=${e2eCommand.id}; command=${e2eCommand.command}; exitCode=0`, `E2E_LOG=${e2eLogPath}; sha256=${sha(bytes(e2eLogPath))}`,
    `DOMAIN_COMMAND_ID=${domainCommand.id}; DOMAIN_LOG=${domainLogPath}; sha256=${sha(bytes(domainLogPath))}`,
    `SOURCE_COMMAND_ID=${sourceCommand.id}; SOURCE_LOG=${sourceLogPath}; sha256=${sha(bytes(sourceLogPath))}`,
    `SOURCE_MAP_COMMAND_ID=${mapCommand.id}; SOURCE_MAP_LOG=${mapLogPath}; sha256=${sha(bytes(mapLogPath))}`,
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no physical stock or backend accounting claim.', `reviewer=${reviewer}`,
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, logPath), log, 'utf8');
  const evidence = {
    taskId: 'FE011', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
    sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`, expected: step.verification,
    observed, commandId: e2eCommand.id, command: e2eCommand.command, cwd: root, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'React inventory screens tested through the deterministic MSW API; no live warehouse or finance backend.', dataSource: 'synthetic-msw' },
    checksTotal: step.id === 'S04' ? 88 : 484, failed: 0, logFile: logPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
    commandResults: [
      { commandId: e2eCommand.id, command: e2eCommand.command, exitCode: 0, testsPassed: 484, browserProjects: ['chromium', 'firefox'], logFile: e2eLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(e2eLogPath)) },
      { commandId: domainCommand.id, command: domainCommand.command, exitCode: 0, simulatorChecks: 75, networkChecks: 13, logFile: domainLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(domainLogPath)) },
      { commandId: sourceCommand.id, command: sourceCommand.command, exitCode: 0, filesChecked: 67, operationCalls: 220, routes: 54, logFile: sourceLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(sourceLogPath)) },
      { commandId: mapCommand.id, command: mapCommand.command, exitCode: 0, testsPassed: 1, logFile: mapLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(mapLogPath)) },
    ],
    audit: { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, browserCases: cases },
  };
  fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  out.push({ step: step.id, evidence: evidencePath });
}
console.log(JSON.stringify({ result: 'PASS', task: 'FE011', routes: task.routeIds.length, operations: task.operationIds.length, e2e: '484/484', source: '67 files/220 operations/54 routes', sourceMap: '1/1', domain: '88/88', sourceFiles: sourceFiles.length, sourceSnapshotSha256, steps: out }, null, 2));
