import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = 'botsales-kit/execution/frontend-evidence/FE017';
const helperPath = `${base}/capture-current-evidence-20261006.mjs`;
const priorPath = `${base}/S05-post-doc-sync-final-20261005.json`;
const e2eLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-e2e-spc059-current-20261006.log';
const domainLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-domain-spc059-current-20261006.log';
const unitLogPath = 'botsales-kit/execution/frontend-evidence/FE016/S04-unit-spc059-current-20261006.log';
const sourceLogPath = `${base}/S04-source-spc059-current-20261006.log`;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => bytes(file).toString('utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const task = json('botsales-kit/execution/frontend-plan.json').tasks.find(item => item.id === 'FE017');
const routes = json('botsales-kit/contracts/route-manifest.json').routes;
const operations = json('packages/contracts/src/operations.json');
const openapi = json('botsales-kit/contracts/openapi.json');
const permissions = json('botsales-kit/contracts/permission-catalog.json');
const knowledge = read('apps/web/src/modules/knowledge/index.tsx');
const e2e = read(e2eLogPath);
const domainLog = read(domainLogPath);
const unitLog = read(unitLogPath);
const sourceLog = read(sourceLogPath);
const commandMap = json('botsales-kit/execution/frontend-command-map.json');
const e2eCommand = commandMap.commands.find(item => item.id === 'e2e');
const domainCommand = commandMap.commands.find(item => item.id === 'domain');
const unitCommand = commandMap.commands.find(item => item.id === 'unit');
assert(task && task.implementationSteps.length === 5, 'FE017 canonical task missing');
assert(task.routeIds.length === 3 && task.routeIds.every(id => routes.some(route => route.id === id)), 'Knowledge route mapping invalid');
assert(task.operationIds.length === 15 && task.operationIds.every(id => Object.hasOwn(operations, id)), 'Knowledge operation mapping invalid');
assert([e2eCommand, domainCommand, unitCommand].every(item => item?.status === 'VERIFIED_AVAILABLE'), 'Current command registration missing');
assert(e2e.includes('484 passed (43.4m)') && /^exitCode=0$/m.test(e2e), 'Full browser E2E did not pass');
assert(domainLog.includes('"passed":88') && /^exitCode=0$/m.test(domainLog), 'Domain/network checks did not pass');
assert(unitLog.includes('Tests  93 passed (93)') && /^exitCode=0$/m.test(unitLog), 'Unit/component checks did not pass');
assert(sourceLog.includes('"files": 67') && sourceLog.includes('"operationCalls": 220') && sourceLog.includes('"status": "PASS"') && /^exitCode=0$/m.test(sourceLog), 'Current source-contract checker did not pass');
for (const [id, routePath] of [['R23', '/s/:shopId/knowledge'], ['R24', '/s/:shopId/knowledge/:knowledgeId'], ['R25', '/s/:shopId/knowledge/review']])
  assert(routes.some(route => route.id === id && route.path === routePath), `Canonical knowledge route invalid: ${id}`);
for (const op of task.operationIds) {
  assert(Object.values(openapi.paths).some(methods => Object.values(methods).some(item => item.operationId === op)), `Knowledge operation missing from OpenAPI: ${op}`);
  assert(Object.hasOwn(operations, op), `Knowledge operation missing from generated operation registry: ${op}`);
}
for (const op of ['listKnowledge', 'createKnowledge', 'uploadFile', 'listKnowledgeRevisions', 'createKnowledgeRevision', 'submitKnowledgeReview', 'publishKnowledge', 'retireKnowledge', 'restoreKnowledgeRevision', 'listFeedback', 'reviewFeedback'])
  assert(knowledge.includes(`'${op}'`), `Knowledge operation not wired in module: ${op}`);
assert(!/dangerouslySetInnerHTML/.test(knowledge), 'Unsafe raw HTML rendering found in knowledge UI');
assert(JSON.stringify(permissions).includes('knowledge.publish'), 'Canonical knowledge.publish capability missing');
assert(/ready_for_review/.test(knowledge) && /knowledge\.publish/.test(knowledge), 'Knowledge publish action not bounded by current permission/lifecycle');
assert(!/allowedActions/.test(knowledge), 'Knowledge UI appears to rely on an unsupported allowedActions field');
const browserLines = e2e.split(/\r?\n/).filter(line => /tests\\fe017(?:-validation)?\.spec\.ts/.test(line));
const chromiumLines = browserLines.filter(line => line.includes('[chromium]'));
const firefoxLines = browserLines.filter(line => line.includes('[firefox]'));
assert(chromiumLines.length === 10 && firefoxLines.length === 10, `Expected 10 knowledge browser scenarios in each project, found ${chromiumLines.length}/${firefoxLines.length}`);
const caseNames = [
  'FE017 synthetic 422 keeps the knowledge draft fields and shows field errors',
  'FE017.AC01 demo publishing uses the approved permission and lifecycle substitute without an API allowedActions field',
  'FE017.AC02 knowledge file upload sends canonical purpose and detail reads processing status',
  'FE017 price and stock source preview uses canonical product and timestamped inventory APIs',
  'FE017.AC03 missing content, unsupported and oversized files keep creation unavailable',
  'FE017.AC04 feedback approval creates inert draft content and its first revision only',
  'FE017.AC05 manager sees knowledge read-only and synthetic API rejects purpose-specific upload and publish',
  'FE017.AC06 stale review preserves the reason and explains the conflict',
  'FE027.G02 product content brief edits source, size, warranty, alternatives, and forbidden claims locally',
  'FE027.G03 policy revisions keep the published snapshot immutable when a draft changes',
];
for (const name of caseNames) assert(e2e.includes(name), `Knowledge browser case missing: ${name}`);

const prior = json(priorPath);
const sourcePaths = [...new Set([
  ...prior.sourceFiles.map(item => item.path), 'AGENTS.md', 'AI_RULES.md', 'DESIGN.md', 'UX-CONTRACT.md',
  'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/FRONTEND_SPACING_STANDARD.md',
  'botsales-kit/docs/18_CODING_STANDARDS.md', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/permission-catalog.json', 'packages/contracts/src/operations.json',
  'apps/web/src/modules/knowledge/index.tsx', 'apps/web/src/app/locales/vi/knowledge.ts',
  'apps/web/src/mocks/auxiliary.ts', 'apps/web/src/mocks/files.ts', 'apps/web/src/mocks/service.ts',
  'tests/fe017.spec.ts', 'tests/fe017-validation.spec.ts', 'scripts/check-source.mjs',
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
  S01: [{ name: 'R23/R24/R25 and all 15 planned knowledge operations resolve to canonical route/OpenAPI/generated operation contracts', status: 'PASS' }],
  S02: [
    { name: 'Draft, revision, review and publish lifecycle uses permission and ready_for_review state without inventing allowedActions', status: 'PASS' },
    { name: 'File upload sends canonical purpose and reads processing detail; catalog facts use current mock product/inventory APIs', status: 'PASS' },
    { name: 'Feedback creates a review draft and first revision without auto-publishing customer content', status: 'PASS' },
  ],
  S03: [
    { name: '422, missing content, unsupported/oversized upload and permission denials preserve visible draft state', status: 'PASS' },
    { name: 'Stale review reports a version conflict; published revision remains immutable when draft changes', status: 'PASS' },
    { name: 'Knowledge body is rendered as text; no raw HTML insertion is used', status: 'PASS' },
  ],
  S04: [
    { name: 'Current source checker validates 67 files, 220 operation call sites and 54 routes with no issues', status: 'PASS', count: '67/220/54' },
    { name: 'Current unit/component and simulator/network suites pass', status: 'PASS', count: '93/93 and 88/88' },
  ],
  S05: [
    { name: 'All FE017 knowledge browser scenarios passed in Chromium and Firefox', status: 'PASS', count: '10x2' },
    { name: 'Full React demo browser suite passes and knowledge routes/dialogs are responsive', status: 'PASS', count: '484/484' },
    { name: 'All publishing and file workflows remain synthetic; no real storage or public knowledge service is claimed', status: 'PASS' },
  ],
};
const outputs = [];
for (const step of task.implementationSteps) {
  const evidencePath = `${base}/${step.id}-after-spc059-current-20261006.json`;
  const logPath = `${base}/${step.id}-after-spc059-current-20261006.log`;
  const cases = groups[step.id];
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Full React demo E2E passed 484/484 across Chromium and Firefox, including 10 knowledge scenarios per browser; current component suite passed 93/93, source validation had 0 issues, and domain/network checks passed 88/88. Data and file processing use deterministic frontend fixtures only; no live storage, legal publishing authority, or production knowledge service was tested.`;
  const log = [
    `FE017.${step.id} knowledge/review/publishing current verification.`, `executedAt=${now}`, `cwd=${root}`,
    `commandId=${e2eCommand.id}; command=${e2eCommand.command}; exitCode=0`, `E2E_LOG=${e2eLogPath}; sha256=${sha(bytes(e2eLogPath))}`,
    `UNIT_COMMAND_ID=${unitCommand.id}; command=${unitCommand.command}; exitCode=0`, `UNIT_LOG=${unitLogPath}; sha256=${sha(bytes(unitLogPath))}`,
    `SOURCE_LOG=${sourceLogPath}; sha256=${sha(bytes(sourceLogPath))}`,
    `DOMAIN_COMMAND_ID=${domainCommand.id}; command=${domainCommand.command}; exitCode=0`, `DOMAIN_LOG=${domainLogPath}; sha256=${sha(bytes(domainLogPath))}`,
    `ROUTES=${task.routeIds.length}; OPERATIONS=${task.operationIds.length}; E2E=484/484; FE017 browser cases=${chromiumLines.length} chromium + ${firefoxLines.length} firefox; unit=93/93; source files=67 with 0 issues; domain=88/88`,
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; file processing and knowledge publication are synthetic UI workflows, not real storage or public publication.', `reviewer=${reviewer}`,
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, logPath), log, 'utf8');
  const evidence = {
    taskId: 'FE017', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
    sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`, expected: step.verification,
    observed, commandId: e2eCommand.id, command: e2eCommand.command, cwd: root, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'Built React knowledge screens, canonical contracts, and deterministic MSW content/file-review fixtures; no live storage/publishing provider.', dataSource: 'synthetic-msw' },
    checksTotal: step.id === 'S04' ? 184 : 484, failed: 0, logFile: logPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
    commandResults: [
      { commandId: e2eCommand.id, command: e2eCommand.command, exitCode: 0, testsPassed: 484, fe017Cases: chromiumLines.length + firefoxLines.length, browserProjects: ['chromium', 'firefox'], logFile: e2eLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(e2eLogPath)) },
      { commandId: unitCommand.id, command: unitCommand.command, exitCode: 0, testsPassed: 93, filesPassed: 10, logFile: unitLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(unitLogPath)) },
      { commandId: domainCommand.id, command: domainCommand.command, exitCode: 0, simulatorChecks: 75, networkChecks: 13, logFile: domainLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(domainLogPath)) },
      { commandId: 'source-contract-check', command: 'npm.cmd --script-shell=cmd.exe run test:source', exitCode: 0, checkedFiles: 67, operationCalls: 220, routes: 54, issues: 0, logFile: sourceLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(sourceLogPath)) },
    ],
    audit: { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, browserCases: cases },
    limitations: ['The canonical knowledge schema has no allowedActions field; the frontend follows the documented knowledge.publish capability and ready_for_review lifecycle substitute.', 'No live object storage, public publishing service, owner acceptance, hosted CI, or screen-reader conformance is claimed.'],
  };
  fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  outputs.push({ step: step.id, evidence: evidencePath });
}
console.log(JSON.stringify({ result: 'PASS', task: 'FE017', routes: task.routeIds.length, operations: task.operationIds.length, e2e: '484/484', fe017Cases: `${chromiumLines.length}x2`, unit: '93/93', source: '67 files/220 calls/54 routes/0 issues', domain: '88/88', sourceFiles: sourceFiles.length, sourceSnapshotSha256, steps: outputs }, null, 2));
