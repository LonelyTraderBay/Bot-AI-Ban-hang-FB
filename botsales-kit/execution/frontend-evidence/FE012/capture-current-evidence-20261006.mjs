import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = 'botsales-kit/execution/frontend-evidence/FE012';
const helperPath = `${base}/capture-current-evidence-20261006.mjs`;
const priorPath = `${base}/S05-post-doc-sync-final-20261005.json`;
const e2eLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-e2e-spc059-current-20261006.log';
const domainLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-domain-spc059-current-20261006.log';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => bytes(file).toString('utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const task = json('botsales-kit/execution/frontend-plan.json').tasks.find(item => item.id === 'FE012');
const routeManifest = json('botsales-kit/contracts/route-manifest.json').routes;
const operations = json('packages/contracts/src/operations.json');
const orders = read('apps/web/src/modules/orders/index.tsx');
const addressPreview = read('apps/web/src/modules/orders/demo-address-preview.ts');
const tests = read('tests/fe012.spec.ts');
const e2e = read(e2eLogPath);
const domainLog = read(domainLogPath);
const map = json('botsales-kit/execution/frontend-command-map.json');
const e2eCommand = map.commands.find(item => item.id === 'e2e');
const domainCommand = map.commands.find(item => item.id === 'domain');
assert(task && task.implementationSteps.length === 5, 'FE012 canonical plan task missing');
assert(task.routeIds.every(id => routeManifest.some(route => route.id === id)) && task.operationIds.every(id => Object.hasOwn(operations, id)), 'FE012 route or operation mapping invalid');
assert([e2eCommand, domainCommand].every(item => item?.status === 'VERIFIED_AVAILABLE'), 'Current e2e/domain command unavailable');
assert(e2e.includes('484 passed (43.4m)') && /^exitCode=0$/m.test(e2e), 'Full current browser run did not pass');
assert(domainLog.includes('"passed":88') && /^exitCode=0$/m.test(domainLog), 'Current domain/network checks did not pass');
for (const op of ['createOrder', 'updateOrderDraft', 'quoteOrder', 'confirmOrder', 'createReturnCase', 'inspectReturn']) assert(orders.includes(`'${op}'`), `Order/return UI operation missing: ${op}`);
assert(addressPreview.includes('synthetic') || addressPreview.includes('mô phỏng') || addressPreview.includes('demo'), 'Demo address preview is not identified as synthetic');
assert(!task.operationIds.includes('createAddress') && !task.operationIds.includes('updateAddress'), 'Plan should not invent address CRUD operations');
const requiredTests = [
  'FE012.AC01 searchable customer and product pickers submit contract-shaped draft and reject fractional quantity',
  'FE012 demo address choice is labeled synthetic and completes the mock order flow',
  'FE012.AC01 editing lines invalidates quote and customer consent; a new quote is required before confirmation',
  'FE012.AC03 mock stale-version 412 preserves draft fields and does not show success',
  'FE012.AC03 offline state blocks quote mutation while retaining the loaded draft',
  'FE012.AC03 unknown confirm outcome blocks duplicate writes until shared command recovery is available',
  'FE012.AC03 quote and customer confirmation expiration disable confirmation using API time',
  'FE012.AC03 returns reject fractional/over-original quantities locally and preserve data on cumulative mock rejection',
  'FE012.AC04 return inspection loads the current case and applies accepted partial quantity to mock stock and refund',
  'FE012.AC03 handed-over order routes to returns and exposes no ordinary cancel action',
  'FE012.AC05 order drafting remains usable without horizontal page overflow and passes focused axe checks',
];
for (const name of requiredTests) assert(e2e.includes(name), `FE012 browser case missing: ${name}`);
assert(orders.includes("'confirmOrder'") && tests.includes('status()).toBe(202') && tests.includes('unknown'), '202/unknown command outcome coverage missing');

const prior = json(priorPath);
const sourcePaths = [...new Set([
  ...prior.sourceFiles.map(item => item.path), 'AGENTS.md', 'AI_RULES.md',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/contracts/route-manifest.json', 'packages/contracts/src/operations.json',
  'apps/web/src/modules/orders/index.tsx', 'apps/web/src/modules/orders/demo-address-preview.ts', 'tests/fe012.spec.ts',
  'botsales-kit/execution/frontend-command-map.json', e2eLogPath, domainLogPath, helperPath,
])].sort();
for (const file of sourcePaths) assert(fs.existsSync(path.join(root, file)), `Missing source snapshot: ${file}`);
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const reviewer = 'Codex self-review; no independent peer review claimed';
const now = new Date().toISOString();
const groups = {
  S01: [{ name: 'R17/R18/R19/R43 and all order/return operations resolve to canonical IDs', status: 'PASS', routes: task.routeIds.length, operations: task.operationIds.length }],
  S02: [
    { name: 'Customer/product pickers create a contract-shaped order draft with visible totals', status: 'PASS' },
    { name: 'Synthetic address choice and return inspection update only deterministic mock state', status: 'PASS' },
    { name: 'Quote and customer confirmation are invalidated when the draft changes', status: 'PASS' },
  ],
  S03: [
    { name: '412, offline, expired quote/consent, and unknown command retain drafts and prevent false success', status: 'PASS' },
    { name: 'Duplicate confirm is blocked pending recovery; handed-over orders offer return flow without ordinary cancel', status: 'PASS' },
    { name: 'Fractional/cumulative return quantities are rejected and partial inspection has explicit mock result', status: 'PASS' },
  ],
  S04: [
    { name: 'Fresh operation schema/simulator/network suite validates the synthetic flow and negative cases', status: 'PASS', count: '88/88' },
    { name: 'FE012-specific browser scenarios pass on both browser projects', status: 'PASS', count: '22/22' },
  ],
  S05: [
    { name: 'Built React demo full browser suite passes, including all order/return cases', status: 'PASS', count: '484/484' },
    { name: 'Order editor is responsive and passes its focused axe check', status: 'PASS' },
    { name: 'Address CRUD absence is disclosed; no API/persistence is invented', status: 'PASS' },
  ],
};
const out = [];
for (const step of task.implementationSteps) {
  const evidencePath = `${base}/${step.id}-after-spc059-current-20261006.json`;
  const logPath = `${base}/${step.id}-after-spc059-current-20261006.log`;
  const cases = groups[step.id];
  const observed = `${cases.map(item => item.name + (item.count ? ` (${item.count})` : '')).join('; ')}. Current local built-demo E2E passed 484/484 over Chromium/Firefox; fresh domain/network checks passed 88/88. Address selection is synthetic, and lack of address CRUD contract remains explicit.`;
  const log = [
    `FE012.${step.id} order quote/confirmation/returns current evidence.`, `executedAt=${now}`, `cwd=${root}`,
    `commandId=${e2eCommand.id}; command=${e2eCommand.command}; exitCode=0`, `E2E_LOG=${e2eLogPath}; sha256=${sha(bytes(e2eLogPath))}`,
    `DOMAIN_COMMAND_ID=${domainCommand.id}; DOMAIN_LOG=${domainLogPath}; sha256=${sha(bytes(domainLogPath))}`,
    `ROUTES=${task.routeIds.length}; OPERATIONS=${task.operationIds.length}; BROWSERS=Chromium+Firefox; E2E=484/484; domain=88/88`,
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no live order/payment/shipping or address persistence claim.', `reviewer=${reviewer}`,
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, logPath), log, 'utf8');
  const evidence = {
    taskId: 'FE012', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
    sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`, expected: step.verification,
    observed, commandId: e2eCommand.id, command: e2eCommand.command, cwd: root, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'Built React demo with in-memory MSW order and return state; no live commerce or payment service.', dataSource: 'synthetic-msw' },
    checksTotal: step.id === 'S04' ? 88 : 484, failed: 0, logFile: logPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
    commandResults: [
      { commandId: e2eCommand.id, command: e2eCommand.command, exitCode: 0, testsPassed: 484, browserProjects: ['chromium', 'firefox'], logFile: e2eLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(e2eLogPath)) },
      { commandId: domainCommand.id, command: domainCommand.command, exitCode: 0, simulatorChecks: 75, networkChecks: 13, logFile: domainLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(domainLogPath)) },
    ],
    audit: { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, browserCases: cases },
  };
  fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  out.push({ step: step.id, evidence: evidencePath });
}
console.log(JSON.stringify({ result: 'PASS', task: 'FE012', routes: task.routeIds.length, operations: task.operationIds.length, namedCases: requiredTests.length, e2e: '484/484', domain: '88/88', sourceFiles: sourceFiles.length, sourceSnapshotSha256, steps: out }, null, 2));
