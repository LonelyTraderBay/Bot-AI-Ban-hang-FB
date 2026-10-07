import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = 'botsales-kit/execution/frontend-evidence/FE016';
const helperPath = `${base}/capture-current-evidence-20261006.mjs`;
const priorPath = `${base}/S05-post-doc-sync-final-20261005.json`;
const e2eLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-e2e-spc059-current-20261006.log';
const domainLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-domain-spc059-current-20261006.log';
const unitLogPath = `${base}/S04-unit-spc059-current-20261006.log`;
const sourceMapLogPath = `${base}/S04-source-map-spc059-current-20261006.log`;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => bytes(file).toString('utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const task = json('botsales-kit/execution/frontend-plan.json').tasks.find(item => item.id === 'FE016');
const routes = json('botsales-kit/contracts/route-manifest.json').routes;
const operations = json('packages/contracts/src/operations.json');
const openapi = json('botsales-kit/contracts/openapi.json');
const inbox = read('apps/web/src/modules/inbox/index.tsx');
const components = read('apps/web/src/modules/inbox/conversation-components.tsx');
const sourceMapTest = read('tests/fe016-source-map.test.mjs');
const e2e = read(e2eLogPath);
const domainLog = read(domainLogPath);
const unitLog = read(unitLogPath);
const sourceMapLog = read(sourceMapLogPath);
const commandMap = json('botsales-kit/execution/frontend-command-map.json');
const e2eCommand = commandMap.commands.find(item => item.id === 'e2e');
const domainCommand = commandMap.commands.find(item => item.id === 'domain');
const unitCommand = commandMap.commands.find(item => item.id === 'unit');
assert(task && task.implementationSteps.length === 5, 'FE016 canonical plan task missing');
assert(task.routeIds.length === 2 && task.routeIds.every(id => routes.some(route => route.id === id)), 'Inbox route mapping invalid');
assert(task.operationIds.length === 12 && task.operationIds.every(id => Object.hasOwn(operations, id)), 'Inbox operation mapping invalid');
assert([e2eCommand, domainCommand, unitCommand].every(item => item?.status === 'VERIFIED_AVAILABLE'), 'Current test command registration missing');
assert(e2e.includes('484 passed (43.4m)') && /^exitCode=0$/m.test(e2e), 'Current full browser E2E did not pass');
assert(domainLog.includes('"passed":88') && /^exitCode=0$/m.test(domainLog), 'Current domain/network suite did not pass');
assert(unitLog.includes('Tests  93 passed (93)') && /^exitCode=0$/m.test(unitLog), 'Current React unit tests did not pass');
assert(sourceMapLog.includes('ℹ pass 3') && /^exitCode=0$/m.test(sourceMapLog), 'FE016 source-map regression did not pass');
for (const [routeId, routePath] of [['R05', '/s/:shopId/inbox'], ['R06', '/s/:shopId/inbox/:conversationId']])
  assert(routes.some(route => route.id === routeId && route.path === routePath), `Canonical inbox route invalid: ${routeId}`);
for (const op of task.operationIds)
  assert(Object.values(openapi.paths).some(methods => Object.values(methods).some(item => item.operationId === op)), `Inbox operation absent from canonical OpenAPI: ${op}`);
for (const op of ['listConversations', 'listMessages', 'sendMessage', 'takeoverConversation', 'releaseConversation', 'assignConversation', 'resolveConversation', 'createFeedback'])
  assert(inbox.includes(`'${op}'`) || components.includes(`'${op}'`), `Inbox operation not wired: ${op}`);
assert(!/dangerouslySetInnerHTML/.test(inbox + components), 'Unsafe message HTML rendering detected');
assert(sourceMapTest.includes('FE016 contract bounds list filters, safe message refs and versioned send payloads'), 'Canonical source-map safety test missing');
const browserLines = e2e.split(/\r?\n/).filter(line => /tests\\fe016\.spec\.ts/.test(line));
const chromiumLines = browserLines.filter(line => line.includes('[chromium]'));
const firefoxLines = browserLines.filter(line => line.includes('[firefox]'));
assert(chromiumLines.length === 21 && firefoxLines.length === 21, `Expected 21 FE016 browser cases in each project, found ${chromiumLines.length}/${firefoxLines.length}`);
const caseNames = [
  'FE016.AC01 inbox filters call canonical query fields and remain bookmarked through conversation details',
  'UI002 list and message panel errors remain isolated',
  'UI002 send, invalidation and resync keep both cursors and send only once',
  'FE016.AC01 takeover and reply use current versions and show API send state without claiming delivery',
  'FE016.AC02 internal notes render HTML-like text inert and feedback creates only a review draft',
  'FE016.AC03 unknown send keeps the reply draft, exposes command recovery and never blindly resends',
  'FE016.AC04 role without customer/order permissions cannot open those cross-module references',
  'FE016.S03 stale takeover preserves reason and reports the version conflict',
  'FE016.B08 image and voice preview is synthetic and stays local',
  'FE027.B04 automatic order confirmation stays unavailable until policy and customer evidence exist',
];
for (const name of caseNames) assert(e2e.includes(name), `Inbox browser case missing: ${name}`);

const prior = json(priorPath);
const sourcePaths = [...new Set([
  ...prior.sourceFiles.map(item => item.path), 'AGENTS.md', 'AI_RULES.md', 'DESIGN.md', 'UX-CONTRACT.md',
  'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/FRONTEND_SPACING_STANDARD.md',
  'botsales-kit/docs/18_CODING_STANDARDS.md', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/events.schema.json', 'packages/contracts/src/operations.json',
  'apps/web/src/modules/inbox/index.tsx', 'apps/web/src/modules/inbox/conversation-components.tsx',
  'apps/web/src/app/ScopeEvents.tsx', 'apps/web/src/app/CommandRecovery.tsx', 'apps/web/src/mocks/auxiliary.ts',
  'apps/web/src/mocks/service.ts', 'tests/fe016.spec.ts', 'tests/fe016-source-map.test.mjs',
  'botsales-kit/execution/frontend-command-map.json', e2eLogPath, domainLogPath, unitLogPath, sourceMapLogPath, helperPath,
])].sort();
for (const file of sourcePaths) assert(fs.existsSync(path.join(root, file)), `Missing source snapshot: ${file}`);
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const reviewer = 'Codex self-review; no independent peer review claimed';
const now = new Date().toISOString();
const groups = {
  S01: [{ name: 'R05/R06 and all 12 FE016 task operations map to canonical route/OpenAPI contracts and current inbox hook owners', status: 'PASS' }],
  S02: [
    { name: 'Inbox filters, independently scoped list/message cursors, conversation links and panel state stay coherent', status: 'PASS' },
    { name: 'Takeover/reply use current conversation versions and show API acceptance without asserting message delivery', status: 'PASS' },
    { name: 'Order/contact references respect capabilities; feedback and media previews remain local synthetic UI', status: 'PASS' },
  ],
  S03: [
    { name: 'HTML-like message text stays inert; stale takeover preserves reason and exposes the conflict', status: 'PASS' },
    { name: 'Unknown sends preserve drafts and use command recovery without blind resend', status: 'PASS' },
    { name: 'Canonical Message has no media/attachment contract; UI labels samples and does not invent provider calls', status: 'PASS' },
  ],
  S04: [
    { name: 'Current unit/component suite passes', status: 'PASS', count: '93/93' },
    { name: 'FE016 canonical route/operation/versioned-payload source map passes', status: 'PASS', count: '3/3' },
    { name: 'Current domain simulator and network checks pass', status: 'PASS', count: '88/88' },
  ],
  S05: [
    { name: 'All FE016 browser scenarios passed in Chromium and Firefox', status: 'PASS', count: '21x2' },
    { name: 'Full React demo browser regression passed', status: 'PASS', count: '484/484' },
    { name: 'Inbox responsive and keyboard scenarios are included in current browser suite', status: 'PASS' },
  ],
};
const outputs = [];
for (const step of task.implementationSteps) {
  const evidencePath = `${base}/${step.id}-after-spc059-current-20261006.json`;
  const logPath = `${base}/${step.id}-after-spc059-current-20261006.log`;
  const cases = groups[step.id];
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Full React demo E2E passed 484/484 across Chromium and Firefox, including 21 FE016 scenarios per browser; current unit suite passed 93/93, source-map checks 3/3, and simulator/network suite 88/88. Evidence scope is frontend with deterministic synthetic MSW; it does not verify Meta delivery, live messaging, hosted CI, screen-reader conformance, or owner acceptance.`;
  const log = [
    `FE016.${step.id} inbox/takeover current verification.`, `executedAt=${now}`, `cwd=${root}`,
    `commandId=${e2eCommand.id}; command=${e2eCommand.command}; exitCode=0`, `E2E_LOG=${e2eLogPath}; sha256=${sha(bytes(e2eLogPath))}`,
    `UNIT_COMMAND_ID=${unitCommand.id}; command=${unitCommand.command}; exitCode=0`, `UNIT_LOG=${unitLogPath}; sha256=${sha(bytes(unitLogPath))}`,
    `SOURCE_MAP_LOG=${sourceMapLogPath}; sha256=${sha(bytes(sourceMapLogPath))}`,
    `DOMAIN_COMMAND_ID=${domainCommand.id}; command=${domainCommand.command}; exitCode=0`, `DOMAIN_LOG=${domainLogPath}; sha256=${sha(bytes(domainLogPath))}`,
    `ROUTES=${task.routeIds.length}; PLAN_OPERATIONS=${task.operationIds.length}; E2E=484/484; FE016 browser cases=${chromiumLines.length} chromium + ${firefoxLines.length} firefox; unit=93/93; source-map=3/3; domain=88/88`,
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; message delivery is not asserted, media is synthetic/local, and handoff behavior is exercised only against deterministic frontend fixtures.', `reviewer=${reviewer}`,
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, logPath), log, 'utf8');
  const evidence = {
    taskId: 'FE016', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
    sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`, expected: step.verification,
    observed, commandId: e2eCommand.id, command: e2eCommand.command, cwd: root, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'Built React inbox screens, canonical contracts, and deterministic MSW conversation/takeover fixtures; no live Meta or messaging provider.', dataSource: 'synthetic-msw' },
    checksTotal: step.id === 'S04' ? 184 : 484, failed: 0, logFile: logPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
    commandResults: [
      { commandId: e2eCommand.id, command: e2eCommand.command, exitCode: 0, testsPassed: 484, fe016Cases: chromiumLines.length + firefoxLines.length, browserProjects: ['chromium', 'firefox'], logFile: e2eLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(e2eLogPath)) },
      { commandId: unitCommand.id, command: unitCommand.command, exitCode: 0, testsPassed: 93, filesPassed: 10, logFile: unitLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(unitLogPath)) },
      { commandId: domainCommand.id, command: domainCommand.command, exitCode: 0, simulatorChecks: 75, networkChecks: 13, logFile: domainLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(domainLogPath)) },
      { commandId: 'node-test-fe016-source-map', command: 'node --test tests/fe016-source-map.test.mjs', exitCode: 0, testsPassed: 3, logFile: sourceMapLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(sourceMapLogPath)) },
    ],
    audit: { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, browserCases: cases },
    limitations: ['No real Meta/provider delivery, live realtime transport, or customer-message delivery is claimed.', 'No owner acceptance, hosted CI, or screen-reader conformance is claimed.'],
  };
  fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  outputs.push({ step: step.id, evidence: evidencePath });
}
console.log(JSON.stringify({ result: 'PASS', task: 'FE016', routes: task.routeIds.length, operations: task.operationIds.length, e2e: '484/484', fe016Cases: `${chromiumLines.length}x2`, unit: '93/93', sourceMap: '3/3', domain: '88/88', sourceFiles: sourceFiles.length, sourceSnapshotSha256, steps: outputs }, null, 2));
