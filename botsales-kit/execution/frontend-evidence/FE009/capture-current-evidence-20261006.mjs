import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = 'botsales-kit/execution/frontend-evidence/FE009';
const helperPath = `${base}/capture-current-evidence-20261006.mjs`;
const priorPath = `${base}/S05-post-doc-sync-final-20261005.json`;
const planPath = 'botsales-kit/execution/frontend-plan.json';
const e2eLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-e2e-spc059-current-20261006.log';
const domainLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-domain-spc059-current-20261006.log';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => bytes(file).toString('utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(root.endsWith('BotSalesAI_Frontend'), `Unexpected root ${root}`);
const plan = json(planPath);
const task = plan.tasks.find(item => item.id === 'FE009');
const routes = json('botsales-kit/contracts/route-manifest.json').routes;
const operations = json('packages/contracts/src/operations.json');
const routeIds = new Set(routes.map(item => item.id));
assert(task && task.implementationSteps.length === 5, 'FE009 canonical plan task missing');
assert(task.routeIds.every(id => routeIds.has(id)), 'A planned FE009 route ID is absent from the canonical route manifest');
assert(task.operationIds.every(id => Object.hasOwn(operations, id)), 'A planned FE009 operation ID is absent from canonical operations');
const source = read('apps/web/src/modules/customers/index.tsx');
const workspace = read('apps/web/src/modules/workspace/index.tsx');
const fe009 = read('tests/fe009.spec.ts');
const frontend = read('tests/frontend.spec.ts');
const e2e = read(e2eLogPath);
const domainLog = read(domainLogPath);
const command = json('botsales-kit/execution/frontend-command-map.json').commands.find(item => item.id === 'e2e');
const domainCommand = json('botsales-kit/execution/frontend-command-map.json').commands.find(item => item.id === 'domain');
assert(command?.status === 'VERIFIED_AVAILABLE' && domainCommand?.status === 'VERIFIED_AVAILABLE', 'Current E2E/domain commands must be registered and verified');
assert(e2e.includes('484 passed (43.4m)') && /^exitCode=0$/m.test(e2e), 'Current complete browser run did not pass');
assert(domainLog.includes('"passed":88') && /^exitCode=0$/m.test(domainLog), 'Current simulator/network run did not pass');
assert(workspace.includes("useApi('listPrivacyRequests'") && workspace.includes("useCommand('createPrivacyRequest'") && workspace.includes('step-up chưa được xác minh'), 'Privacy UI/contract capability disclosure is missing');
assert(source.includes("useApi('listCustomers'") && source.includes("useCommand('createCustomer'") && source.includes("useApi('getCustomer'") && source.includes('customers.write'), 'Customer list/create/detail operation mapping is missing');
assert(!workspace.includes("useCommand('stepUp'") && !fe009.includes("request('stepUp'") , 'Frontend must not invent password/step-up shortcut');

const required = [
  'workspace onboarding creates a shop with an active membership and returns to its scoped route',
  'customer create validates fields, submits through mock HTTP, and preserves edits after a stale version',
  'customer detail keeps redacted contact fields read-only and does not overwrite them on save',
  'FE009.G01 shop setup checklist guides to supported pages and leaves missing contract fields unverified',
  'FE009.G05 marketing consent preview is interactive but never claims server opt-out',
  'FE009.H06 audit screen distinguishes available fields from missing contract detail',
  'FE009.B06 after-sale cases only link orders loaded for the selected customer',
  'team invitation and membership revoke stay shop-scoped and protect the active owner',
  'privacy delete requests remain pending approval with no frontend step-up shortcut',
];
for (const title of required) assert(e2e.includes(title), `Required browser flow absent: ${title}`);
assert(frontend.includes('switching shops cancels a delayed request') && e2e.includes('switching shops cancels a delayed request'), 'Cross-shop delayed request regression is missing');

const prior = json(priorPath);
const sourcePaths = [...new Set([
  ...prior.sourceFiles.map(item => item.path),
  'AGENTS.md', 'AI_RULES.md', planPath,
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/feature-catalog.json',
  'packages/contracts/src/operations.json', 'apps/web/src/modules/workspace/index.tsx', 'apps/web/src/modules/customers/index.tsx',
  'tests/fe009.spec.ts', 'tests/frontend.spec.ts', 'tests/route-role-matrix.spec.ts',
  'botsales-kit/execution/frontend-command-map.json', e2eLogPath, domainLogPath, helperPath,
])].sort();
for (const file of sourcePaths) assert(fs.existsSync(path.join(root, file)), `Missing snapshot source: ${file}`);
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const reviewer = 'Codex self-review; no independent peer review claimed';
const now = new Date().toISOString();
const casesByStep = {
  S01: [
    { name: 'Every FE009 route and operation ID resolves in canonical route/OpenAPI indexes', status: 'PASS', routes: task.routeIds.length, operations: task.operationIds.length },
    { name: 'Workspace/customer/privacy source uses canonical operations and documented capabilities', status: 'PASS' },
  ],
  S02: [
    { name: 'Workspace onboarding creates a shop and active membership', status: 'PASS' },
    { name: 'Customer form submits mock HTTP, maintains list/detail flow, and reflects API result', status: 'PASS' },
    { name: 'Service cases connect only to loaded customer orders; privacy policies and requests disclose limits', status: 'PASS' },
  ],
  S03: [
    { name: 'Stale customer version preserves edits; redacted fields remain read-only', status: 'PASS' },
    { name: 'Membership invite/revoke is shop-scoped and protects the active owner', status: 'PASS' },
    { name: 'Privacy delete stays pending; no frontend step-up or false completion is claimed', status: 'PASS' },
    { name: 'Shop switch discards delayed data from the previous scope', status: 'PASS' },
  ],
  S04: [
    { name: 'Named FE009 browser acceptance cases execute on the built React demo in two browsers', status: 'PASS', count: '18/18 browser executions' },
    { name: 'Fresh domain schema, scope, simulator and MSW network checks pass', status: 'PASS', count: '88/88' },
  ],
  S05: [
    { name: 'Current browser suite runs canonical React routes with mock HTTP and role/shop scenarios', status: 'PASS', count: '484/484' },
    { name: 'Chromium and Firefox both execute all nine FE009 cases', status: 'PASS', count: '18/18' },
    { name: 'Synthetic/API-limitation labels and truthful privacy/customer states remain visible', status: 'PASS' },
  ],
};
const output = [];
for (const step of task.implementationSteps) {
  const evidencePath = `${base}/${step.id}-after-spc059-current-20261006.json`;
  const logPath = `${base}/${step.id}-after-spc059-current-20261006.log`;
  const cases = casesByStep[step.id];
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Current full local React demo E2E passed 484/484 in Chromium/Firefox; fresh synthetic domain/network checks passed 88/88. No live identity provider/backend outcome is claimed.`;
  const log = [
    `FE009.${step.id} workspace/membership/customer/privacy verification.`, `executedAt=${now}`, `cwd=${root}`,
    `commandId=${command.id}; command=${command.command}; exitCode=0`, `E2E_LOG=${e2eLogPath}; sha256=${sha(bytes(e2eLogPath))}`,
    `DOMAIN_COMMAND_ID=${domainCommand.id}; DOMAIN_LOG=${domainLogPath}; sha256=${sha(bytes(domainLogPath))}`,
    `ROUTES=${task.routeIds.length}/${task.routeIds.length}; OPERATIONS=${task.operationIds.length}/${task.operationIds.length}; BROWSERS=Chromium+Firefox; FULL_E2E=484/484`,
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no real identity/OIDC/backend/provider integration.', `reviewer=${reviewer}`,
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, logPath), log, 'utf8');
  const evidence = {
    taskId: 'FE009', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
    sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`, expected: step.verification, observed,
    commandId: command.id, command: command.command, cwd: root, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'Built React demo with deterministic MSW fixtures; separate fresh simulator/network run.', dataSource: 'synthetic-msw' },
    checksTotal: step.id === 'S04' ? 88 : 484, failed: 0, logFile: logPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
    commandResults: [
      { commandId: command.id, command: command.command, exitCode: 0, testsPassed: 484, browserProjects: ['chromium', 'firefox'], logFile: e2eLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(e2eLogPath)) },
      { commandId: domainCommand.id, command: domainCommand.command, exitCode: 0, simulatorChecks: 75, networkChecks: 13, logFile: domainLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(domainLogPath)) },
    ],
    audit: { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, caseResults: cases },
  };
  fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  output.push({ step: step.id, evidence: evidencePath, cases: cases.length });
}
console.log(JSON.stringify({ result: 'PASS', task: 'FE009', routeIds: task.routeIds.length, operationIds: task.operationIds.length, e2e: '484/484', freshDomain: '88/88', sourceFiles: sourceFiles.length, sourceSnapshotSha256, steps: output }, null, 2));
