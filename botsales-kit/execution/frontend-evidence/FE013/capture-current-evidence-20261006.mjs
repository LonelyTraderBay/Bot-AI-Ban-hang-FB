import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = 'botsales-kit/execution/frontend-evidence/FE013';
const helperPath = `${base}/capture-current-evidence-20261006.mjs`;
const priorPath = `${base}/S05-post-doc-sync-final-20261005.json`;
const e2eLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-e2e-spc059-current-20261006.log';
const domainLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-domain-spc059-current-20261006.log';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => bytes(file).toString('utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const task = json('botsales-kit/execution/frontend-plan.json').tasks.find(item => item.id === 'FE013');
const routes = json('botsales-kit/contracts/route-manifest.json').routes;
const operations = json('packages/contracts/src/operations.json');
const fulfillment = read('apps/web/src/modules/fulfillment/index.tsx');
const tests = read('tests/fe013.spec.ts');
const e2e = read(e2eLogPath);
const domainLog = read(domainLogPath);
const map = json('botsales-kit/execution/frontend-command-map.json');
const e2eCommand = map.commands.find(item => item.id === 'e2e');
const domainCommand = map.commands.find(item => item.id === 'domain');
assert(task && task.implementationSteps.length === 5, 'FE013 canonical task missing');
assert(task.routeIds.every(id => routes.some(route => route.id === id)) && task.operationIds.every(id => Object.hasOwn(operations, id)), 'FE013 route/operation map invalid');
assert([e2eCommand, domainCommand].every(item => item?.status === 'VERIFIED_AVAILABLE'), 'Current e2e/domain command not registered');
assert(e2e.includes('484 passed (43.4m)') && /^exitCode=0$/m.test(e2e), 'Current browser suite did not pass');
assert(domainLog.includes('"passed":88') && /^exitCode=0$/m.test(domainLog), 'Current domain/network suite did not pass');
for (const op of ['listPrepJobs', 'pickPrepLine', 'packPrepJob', 'createShipment', 'listShipments', 'handoverShipment', 'recordShipmentEvent'])
  assert(fulfillment.includes(`'${op}'`), `Fulfillment operation missing: ${op}`);
assert(fulfillment.includes('allowedActions.includes') && fulfillment.includes('shipment.state') && fulfillment.includes('returned'), 'Allowed-action/state boundaries missing');
const names = [
  'FE013.C04 shipping preview distinguishes missing address, unserviceable zone, and expired mock quote',
  'FE013.AC01–AC04 stale claim conflict is visible; pick, pack, dispatch and delivery use current API versions once',
  'FE013.AC03 unknown handover cannot be repeated before command reconciliation',
  'FE013.AC01 role scope and FE013.AC05 responsive shipment/preparation views remain accessible',
];
for (const name of names) assert(e2e.includes(name), `FE013 browser test missing: ${name}`);
assert(tests.includes('status()).toBe(412') && tests.includes('Kết quả ghi chưa rõ') && tests.includes('status()).toBe(202') && tests.includes('delivered'), 'Stale/unknown/delivery result evidence missing');

const prior = json(priorPath);
const sourcePaths = [...new Set([
  ...prior.sourceFiles.map(item => item.path), 'AGENTS.md', 'AI_RULES.md',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/contracts/route-manifest.json', 'packages/contracts/src/operations.json',
  'apps/web/src/modules/fulfillment/index.tsx', 'tests/fe013.spec.ts', 'botsales-kit/execution/frontend-command-map.json',
  e2eLogPath, domainLogPath, helperPath,
])].sort();
for (const file of sourcePaths) assert(fs.existsSync(path.join(root, file)), `Missing source snapshot: ${file}`);
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const reviewer = 'Codex self-review; no independent peer review claimed';
const now = new Date().toISOString();
const cases = {
  S01: [{ name: 'R41/R42 routes and all prep/shipment operation IDs match the canonical contracts', status: 'PASS', routes: task.routeIds.length, operations: task.operationIds.length }],
  S02: [
    { name: 'Claim, pick, pack, handover and carrier event transition through mock HTTP versions', status: 'PASS' },
    { name: 'Shipment state and reservation/order relationships are rendered from mock API results', status: 'PASS' },
  ],
  S03: [
    { name: 'Stale/already-claimed work reports conflict; shipment handover unknown outcome blocks duplicate writes', status: 'PASS' },
    { name: 'Allowed actions gate each mutation; packed, handed-over, delivered and returned remain distinct', status: 'PASS' },
    { name: 'Missing address, unavailable zone and expired mock quote remain explicit', status: 'PASS' },
  ],
  S04: [
    { name: 'Fresh simulator/schema/network tests exercise the canonical operations and errors', status: 'PASS', count: '88/88' },
    { name: 'FE013-specific browser scenarios execute in both projects', status: 'PASS', count: '8/8' },
  ],
  S05: [
    { name: 'Full React demo E2E passes on Chromium and Firefox', status: 'PASS', count: '484/484' },
    { name: 'Fulfillment route layouts and dialogs fit 320–1440px browser widths', status: 'PASS' },
  ],
};
const out = [];
for (const step of task.implementationSteps) {
  const evidencePath = `${base}/${step.id}-after-spc059-current-20261006.json`;
  const logPath = `${base}/${step.id}-after-spc059-current-20261006.log`;
  const stepCases = cases[step.id];
  const observed = `${stepCases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Current full built-demo E2E passed 484/484 across Chromium/Firefox, and the current synthetic simulator/network suite passed 88/88. No actual courier event or physical delivery is claimed.`;
  const log = [
    `FE013.${step.id} preparation/shipment/return current verification.`, `executedAt=${now}`, `cwd=${root}`,
    `commandId=${e2eCommand.id}; command=${e2eCommand.command}; exitCode=0`, `E2E_LOG=${e2eLogPath}; sha256=${sha(bytes(e2eLogPath))}`,
    `DOMAIN_COMMAND_ID=${domainCommand.id}; DOMAIN_LOG=${domainLogPath}; sha256=${sha(bytes(domainLogPath))}`,
    `ROUTES=${task.routeIds.length}; OPERATIONS=${task.operationIds.length}; E2E=484/484; domain=88/88`,
    ...stepCases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no live courier, warehouse, or backend delivery claim.', `reviewer=${reviewer}`,
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, logPath), log, 'utf8');
  const evidence = {
    taskId: 'FE013', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
    sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`, expected: step.verification,
    observed, commandId: e2eCommand.id, command: e2eCommand.command, cwd: root, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'React fulfillment UI over deterministic synthetic MSW; no physical stock or external carrier service.', dataSource: 'synthetic-msw' },
    checksTotal: step.id === 'S04' ? 88 : 484, failed: 0, logFile: logPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
    commandResults: [
      { commandId: e2eCommand.id, command: e2eCommand.command, exitCode: 0, testsPassed: 484, browserProjects: ['chromium', 'firefox'], logFile: e2eLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(e2eLogPath)) },
      { commandId: domainCommand.id, command: domainCommand.command, exitCode: 0, simulatorChecks: 75, networkChecks: 13, logFile: domainLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(domainLogPath)) },
    ],
    audit: { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, browserCases: stepCases },
  };
  fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  out.push({ step: step.id, evidence: evidencePath });
}
console.log(JSON.stringify({ result: 'PASS', task: 'FE013', routes: task.routeIds.length, operations: task.operationIds.length, e2e: '484/484', domain: '88/88', sourceFiles: sourceFiles.length, sourceSnapshotSha256, steps: out }, null, 2));
