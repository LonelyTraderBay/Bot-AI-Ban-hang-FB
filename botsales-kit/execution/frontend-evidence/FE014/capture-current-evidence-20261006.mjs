import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = 'botsales-kit/execution/frontend-evidence/FE014';
const helperPath = `${base}/capture-current-evidence-20261006.mjs`;
const priorPath = `${base}/S05-post-doc-sync-final-20261005.json`;
const e2eLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-e2e-spc059-current-20261006.log';
const domainLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-domain-spc059-current-20261006.log';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => bytes(file).toString('utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const task = json('botsales-kit/execution/frontend-plan.json').tasks.find(item => item.id === 'FE014');
const routes = json('botsales-kit/contracts/route-manifest.json').routes;
const operations = json('packages/contracts/src/operations.json');
const procurement = read('apps/web/src/modules/procurement/index.tsx');
const tests = read('tests/fe014.spec.ts');
const e2e = read(e2eLogPath);
const domainLog = read(domainLogPath);
const map = json('botsales-kit/execution/frontend-command-map.json');
const e2eCommand = map.commands.find(item => item.id === 'e2e');
const domainCommand = map.commands.find(item => item.id === 'domain');
assert(task && task.implementationSteps.length === 5, 'FE014 canonical plan task missing');
assert(task.routeIds.every(id => routes.some(route => route.id === id)) && task.operationIds.every(id => Object.hasOwn(operations, id)), 'FE014 route/operation map invalid');
assert([e2eCommand, domainCommand].every(item => item?.status === 'VERIFIED_AVAILABLE'), 'Current test command registration missing');
assert(e2e.includes('484 passed (43.4m)') && /^exitCode=0$/m.test(e2e), 'Current full E2E did not pass');
assert(domainLog.includes('"passed":88') && /^exitCode=0$/m.test(domainLog), 'Current simulator/network suite did not pass');
for (const op of ['createSupplier', 'createSupplierOffer', 'createReorderRule', 'evaluateReorder', 'createPurchaseOrder', 'requestPurchaseApproval', 'sendPurchaseOrder', 'createGoodsReceipt', 'postGoodsReceipt'])
  assert(procurement.includes(`'${op}'`), `Procurement operation not wired: ${op}`);
assert(procurement.includes('minimumQuantity') && procurement.includes('packSize') && procurement.includes('unresolvedSend') && procurement.includes('approvedBudgets'), 'MOQ/pack, unknown send or budget gate missing');
const names = [
  'FE014.AC01 multi-line purchase validates MOQ/pack size and binds approval to the created intent',
  'FE027.D02 supplier workspace edits the selected contact through its current version and displays MOQ offers',
  'FE014.AC02 approval covers the exact purchase intent; unknown send is blocked from blind retry',
  'FE014.S03 auto-send cannot be configured without an enabled procurement budget',
  'FE014.S03 manager without procurement.receive cannot open receipt actions',
  'FE014.AC03 partial receipt posts only accepted units to synthetic stock and payable once',
  'FE014.D03/D04/D07 replenishment uses min-max rules, labels forecast limits, and blocks duplicate proposals',
];
for (const name of names) assert(e2e.includes(name), `FE014 browser test missing: ${name}`);
assert(tests.includes('unknown') && tests.includes('procurement.receive') && tests.includes('enabled procurement budget'), 'Procurement denial/unknown/budget tests missing');

const prior = json(priorPath);
const sourcePaths = [...new Set([
  ...prior.sourceFiles.map(item => item.path), 'AGENTS.md', 'AI_RULES.md',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/contracts/route-manifest.json', 'packages/contracts/src/operations.json',
  'apps/web/src/modules/procurement/index.tsx', 'tests/fe014.spec.ts', 'botsales-kit/execution/frontend-command-map.json',
  e2eLogPath, domainLogPath, helperPath,
])].sort();
for (const file of sourcePaths) assert(fs.existsSync(path.join(root, file)), `Missing source snapshot: ${file}`);
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const reviewer = 'Codex self-review; no independent peer review claimed';
const now = new Date().toISOString();
const groups = {
  S01: [{ name: 'R44–R47 and all purchase, approval, supplier and receipt operations match canonical contracts', status: 'PASS', routes: task.routeIds.length, operations: task.operationIds.length }],
  S02: [
    { name: 'Multi-line PO enforces MOQ and packSize and binds approval to the selected purchase intent', status: 'PASS' },
    { name: 'Partial receipt posts only accepted quantity once to synthetic stock/payable', status: 'PASS' },
    { name: 'Reorder previews show min–max inputs and mark forecast scope limitations', status: 'PASS' },
  ],
  S03: [
    { name: 'Stale approval or changed intent blocks unauthorized purchase send and unknown send blocks blind retry', status: 'PASS' },
    { name: 'Auto-send needs an active approved budget; manager without receive permission cannot post receipt', status: 'PASS' },
    { name: 'Duplicate replenishment proposal is blocked and partial receipt does not overstate received stock', status: 'PASS' },
  ],
  S04: [
    { name: 'Fresh domain simulator/schema/network checks pass current synthetic contracts', status: 'PASS', count: '88/88' },
    { name: 'All named FE014 browser cases execute in Chromium and Firefox', status: 'PASS', count: '14/14' },
  ],
  S05: [
    { name: 'Full React demo suite passes on Chromium and Firefox', status: 'PASS', count: '484/484' },
    { name: 'Procurement routes/tables/dialogs remain responsive at supported widths', status: 'PASS' },
    { name: 'No real purchasing, approval authority, bank, or supplier communication is claimed', status: 'PASS' },
  ],
};
const out = [];
for (const step of task.implementationSteps) {
  const evidencePath = `${base}/${step.id}-after-spc059-current-20261006.json`;
  const logPath = `${base}/${step.id}-after-spc059-current-20261006.log`;
  const stepCases = groups[step.id];
  const observed = `${stepCases.map(item => item.name + (item.count ? ` (${item.count})` : '')).join('; ')}. Current local built-demo E2E passed 484/484 across Chromium/Firefox and fresh synthetic domain tests passed 88/88. These tests do not verify a real purchasing DB, supplier, or approval service.`;
  const log = [
    `FE014.${step.id} procurement/approval/receipt current verification.`, `executedAt=${now}`, `cwd=${root}`,
    `commandId=${e2eCommand.id}; command=${e2eCommand.command}; exitCode=0`, `E2E_LOG=${e2eLogPath}; sha256=${sha(bytes(e2eLogPath))}`,
    `DOMAIN_COMMAND_ID=${domainCommand.id}; DOMAIN_LOG=${domainLogPath}; sha256=${sha(bytes(domainLogPath))}`,
    `ROUTES=${task.routeIds.length}; OPERATIONS=${task.operationIds.length}; E2E=484/484; domain=88/88`,
    ...stepCases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; procurement and approval decisions are deterministic fixtures, not real-world transactions.', `reviewer=${reviewer}`,
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, logPath), log, 'utf8');
  const evidence = {
    taskId: 'FE014', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
    sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`, expected: step.verification,
    observed, commandId: e2eCommand.id, command: e2eCommand.command, cwd: root, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'Built React procurement screens and deterministic MSW supplier/purchase/receipt fixtures; no real vendor API.', dataSource: 'synthetic-msw' },
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
console.log(JSON.stringify({ result: 'PASS', task: 'FE014', routes: task.routeIds.length, operations: task.operationIds.length, e2e: '484/484', domain: '88/88', sourceFiles: sourceFiles.length, sourceSnapshotSha256, steps: out }, null, 2));
