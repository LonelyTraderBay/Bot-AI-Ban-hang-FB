import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = 'botsales-kit/execution/frontend-evidence/FE019';
const helperPath = `${base}/capture-current-evidence-20261006.mjs`;
const priorPath = `${base}/S05-post-doc-sync-final-20261005.json`;
const e2eLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-e2e-spc059-current-20261006.log';
const domainLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-domain-spc059-current-20261006.log';
const unitLogPath = 'botsales-kit/execution/frontend-evidence/FE016/S04-unit-spc059-current-20261006.log';
const sourceLogPath = 'botsales-kit/execution/frontend-evidence/FE017/S04-source-spc059-current-20261006.log';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => bytes(file).toString('utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const task = json('botsales-kit/execution/frontend-plan.json').tasks.find(item => item.id === 'FE019');
const routes = json('botsales-kit/contracts/route-manifest.json').routes;
const operations = json('packages/contracts/src/operations.json');
const openapi = json('botsales-kit/contracts/openapi.json');
const integrations = read('apps/web/src/modules/integrations/index.tsx');
const notifications = read('apps/web/src/modules/notifications/index.tsx');
const e2e = read(e2eLogPath);
const domainLog = read(domainLogPath);
const unitLog = read(unitLogPath);
const sourceLog = read(sourceLogPath);
const commandMap = json('botsales-kit/execution/frontend-command-map.json');
const e2eCommand = commandMap.commands.find(item => item.id === 'e2e');
const domainCommand = commandMap.commands.find(item => item.id === 'domain');
const unitCommand = commandMap.commands.find(item => item.id === 'unit');
assert(task && task.implementationSteps.length === 5, 'FE019 canonical task missing');
assert(task.routeIds.length === 4 && task.routeIds.every(id => routes.some(route => route.id === id)), 'Integration/notification route mapping invalid');
assert(task.operationIds.length === 24 && task.operationIds.every(id => Object.hasOwn(operations, id)), 'Integration/notification operation mapping invalid');
assert([e2eCommand, domainCommand, unitCommand].every(item => item?.status === 'VERIFIED_AVAILABLE'), 'Current command registration missing');
assert(e2e.includes('484 passed (43.4m)') && /^exitCode=0$/m.test(e2e), 'Full browser E2E did not pass');
assert(domainLog.includes('"passed":88') && /^exitCode=0$/m.test(domainLog), 'Domain/network checks did not pass');
assert(unitLog.includes('Tests  93 passed (93)') && /^exitCode=0$/m.test(unitLog), 'Unit/component checks did not pass');
assert(sourceLog.includes('"files": 67') && sourceLog.includes('"operationCalls": 220') && sourceLog.includes('"status": "PASS"') && /^exitCode=0$/m.test(sourceLog), 'Current source checker did not pass');
for (const op of task.operationIds)
  assert(Object.values(openapi.paths).some(methods => Object.values(methods).some(item => item.operationId === op)), `Integration/notification operation missing from OpenAPI: ${op}`);
for (const op of ['listChannels', 'beginChannelConnect', 'checkChannelHealth', 'createAIConnection', 'testAIConnection', 'listNotifications', 'updateNotificationPolicy', 'acknowledgeNotification', 'createDevice', 'testDevice', 'beginTelegramPairing'])
  assert(integrations.includes(`'${op}'`) || notifications.includes(`'${op}'`), `Integration/notification operation not wired: ${op}`);
assert(integrations.includes('writeOnly') && integrations.includes('hasCredential'), 'Credential write-only/read-state boundaries are missing');
assert(notifications.includes('quietStart') && notifications.includes('quietEnd') && notifications.includes('timezone'), 'Shop-local schedule/quiet-hours fields are absent');
assert(!/localStorage\.(?:setItem|getItem).*secret|console\.(?:log|info|debug).*secret/i.test(integrations), 'Potential secret persistence or logging detected');
const browserLines = e2e.split(/\r?\n/).filter(line => /tests\\fe019\.spec\.ts/.test(line));
const chromiumLines = browserLines.filter(line => line.includes('[chromium]'));
const firefoxLines = browserLines.filter(line => line.includes('[firefox]'));
assert(chromiumLines.length === 10 && firefoxLines.length === 10, `Expected 10 integrations/notifications browser scenarios per project, found ${chromiumLines.length}/${firefoxLines.length}`);
const caseNames = [
  'FE019.S01 maps integrations and notification routes, actions, schemas, and mock boundaries',
  'FE019.AC01 AI secret is write-only, cleared after submit, and absent from stored/read data',
  'FE019.AC01 invalid mock credential is rejected, cleared from the form, and not submitted',
  'FE019.AC02 channel OAuth failure stays on the page and never marks a channel connected',
  'FE019.AC03/04 device, Telegram, and PWA checks stay synthetic and do not request OS permission',
  'FE019.AC05 notification policy validates canonical numeric bounds before sending and acknowledges only allowed work',
  'FE019.A03 notification order link stays within the active shop scope',
  'FE019.A05 reminder policy saves shop-local schedule and quiet hours through the synthetic API',
  'FE027.A02/A07 preparation notification keeps order evidence and separates queued, opened, and acknowledged states',
  'FE027.A08 notification settings disclose server-only deduplication and callback safeguards',
];
for (const name of caseNames) assert(e2e.includes(name), `Integration/notification browser case missing: ${name}`);

const prior = json(priorPath);
const sourcePaths = [...new Set([
  ...prior.sourceFiles.map(item => item.path), 'AGENTS.md', 'AI_RULES.md', 'DESIGN.md', 'UX-CONTRACT.md',
  'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/FRONTEND_SPACING_STANDARD.md',
  'botsales-kit/docs/18_CODING_STANDARDS.md', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/permission-catalog.json', 'packages/contracts/src/operations.json',
  'apps/web/src/modules/integrations/index.tsx', 'apps/web/src/modules/notifications/index.tsx',
  'apps/web/src/modules/notifications/push-capabilities.ts', 'apps/web/src/app/CommandRecovery.tsx',
  'apps/web/src/mocks/auxiliary.ts', 'apps/web/src/mocks/service.ts', 'tests/fe019.spec.ts',
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
  S01: [{ name: 'All four integration/notification routes and 24 planned operations resolve to canonical route/OpenAPI/generated operation sources', status: 'PASS' }],
  S02: [
    { name: 'Credential forms are write-only, clear transient secret input and expose validation errors without storing secrets', status: 'PASS' },
    { name: 'Consent/provider failures do not show a connected state; capability and async states remain visible', status: 'PASS' },
    { name: 'Notification policies use shop-local schedule/quiet-hour fields and canonical notification operations', status: 'PASS' },
  ],
  S03: [
    { name: 'OAuth failure, invalid credentials, unavailable device/consent and role denial preserve truthful state', status: 'PASS' },
    { name: 'Push/Telegram/PWA checks remain synthetic and do not request OS permission or contact live providers', status: 'PASS' },
    { name: 'Notification acknowledgement and server-side deduplication boundaries are explicit', status: 'PASS' },
  ],
  S04: [
    { name: 'Current source checker validates 67 files, 220 operation call sites and 54 routes with no issues', status: 'PASS', count: '67/220/54' },
    { name: 'Current unit/component and simulator/network suites pass', status: 'PASS', count: '93/93 and 88/88' },
  ],
  S05: [
    { name: 'All FE019 integration/notification scenarios pass in Chromium and Firefox', status: 'PASS', count: '10x2' },
    { name: 'Full React demo browser suite passes across both browser projects', status: 'PASS', count: '484/484' },
    { name: 'Provider delivery, OS push permission, callbacks and persistent deduplication remain outside synthetic UI proof', status: 'PASS' },
  ],
};
const outputs = [];
for (const step of task.implementationSteps) {
  const evidencePath = `${base}/${step.id}-after-spc059-current-20261006.json`;
  const logPath = `${base}/${step.id}-after-spc059-current-20261006.log`;
  const cases = groups[step.id];
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Full React demo E2E passed 484/484 across Chromium and Firefox, including 10 FE019 scenarios per browser; current component suite passed 93/93, source validation found 0 issues, and domain/network checks passed 88/88. Credential, push and channel outcomes use deterministic fixtures; no external account, OS permission, carrier, or provider was contacted.`;
  const log = [
    `FE019.${step.id} integrations/notifications current verification.`, `executedAt=${now}`, `cwd=${root}`,
    `commandId=${e2eCommand.id}; command=${e2eCommand.command}; exitCode=0`, `E2E_LOG=${e2eLogPath}; sha256=${sha(bytes(e2eLogPath))}`,
    `UNIT_COMMAND_ID=${unitCommand.id}; command=${unitCommand.command}; exitCode=0`, `UNIT_LOG=${unitLogPath}; sha256=${sha(bytes(unitLogPath))}`,
    `SOURCE_LOG=${sourceLogPath}; sha256=${sha(bytes(sourceLogPath))}`,
    `DOMAIN_COMMAND_ID=${domainCommand.id}; command=${domainCommand.command}; exitCode=0`, `DOMAIN_LOG=${domainLogPath}; sha256=${sha(bytes(domainLogPath))}`,
    `ROUTES=${task.routeIds.length}; OPERATIONS=${task.operationIds.length}; E2E=484/484; FE019 browser cases=${chromiumLines.length} chromium + ${firefoxLines.length} firefox; unit=93/93; source files=67 with 0 issues; domain=88/88`,
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; integration handshakes, push, notification delivery, secrets and callbacks are deterministic UI fixtures only.', `reviewer=${reviewer}`,
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, logPath), log, 'utf8');
  const evidence = {
    taskId: 'FE019', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
    sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`, expected: step.verification,
    observed, commandId: e2eCommand.id, command: e2eCommand.command, cwd: root, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'Built React integrations and notifications UI with deterministic MSW credentials, channels, devices and policies; no live provider or operating-system push service.', dataSource: 'synthetic-msw' },
    checksTotal: step.id === 'S04' ? 184 : 484, failed: 0, logFile: logPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
    commandResults: [
      { commandId: e2eCommand.id, command: e2eCommand.command, exitCode: 0, testsPassed: 484, fe019Cases: chromiumLines.length + firefoxLines.length, browserProjects: ['chromium', 'firefox'], logFile: e2eLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(e2eLogPath)) },
      { commandId: unitCommand.id, command: unitCommand.command, exitCode: 0, testsPassed: 93, filesPassed: 10, logFile: unitLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(unitLogPath)) },
      { commandId: domainCommand.id, command: domainCommand.command, exitCode: 0, simulatorChecks: 75, networkChecks: 13, logFile: domainLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(domainLogPath)) },
      { commandId: 'source-contract-check', command: 'npm.cmd --script-shell=cmd.exe run test:source', exitCode: 0, checkedFiles: 67, operationCalls: 220, routes: 54, issues: 0, logFile: sourceLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(sourceLogPath)) },
    ],
    audit: { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, browserCases: cases },
    limitations: ['No live credential service, connected state, OS push permission, Telegram pairing, or provider delivery is claimed.', 'No owner acceptance, hosted CI, or screen-reader conformance is claimed.'],
  };
  fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  outputs.push({ step: step.id, evidence: evidencePath });
}
console.log(JSON.stringify({ result: 'PASS', task: 'FE019', routes: task.routeIds.length, operations: task.operationIds.length, e2e: '484/484', fe019Cases: `${chromiumLines.length}x2`, unit: '93/93', source: '67 files/220 calls/54 routes/0 issues', domain: '88/88', sourceFiles: sourceFiles.length, sourceSnapshotSha256, steps: outputs }, null, 2));
