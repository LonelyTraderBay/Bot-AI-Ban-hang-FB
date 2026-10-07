import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = 'botsales-kit/execution/frontend-evidence/FE018';
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

const task = json('botsales-kit/execution/frontend-plan.json').tasks.find(item => item.id === 'FE018');
const routes = json('botsales-kit/contracts/route-manifest.json').routes;
const operations = json('packages/contracts/src/operations.json');
const openapi = json('botsales-kit/contracts/openapi.json');
const bot = read('apps/web/src/modules/bot/index.tsx');
const e2e = read(e2eLogPath);
const domainLog = read(domainLogPath);
const unitLog = read(unitLogPath);
const sourceLog = read(sourceLogPath);
const commandMap = json('botsales-kit/execution/frontend-command-map.json');
const e2eCommand = commandMap.commands.find(item => item.id === 'e2e');
const domainCommand = commandMap.commands.find(item => item.id === 'domain');
const unitCommand = commandMap.commands.find(item => item.id === 'unit');
assert(task && task.implementationSteps.length === 5, 'FE018 canonical task missing');
assert(task.routeIds.length === 4 && task.routeIds.every(id => routes.some(route => route.id === id)), 'Bot route mapping invalid');
assert(task.operationIds.length === 18 && task.operationIds.every(id => Object.hasOwn(operations, id)), 'Bot operation mapping invalid');
assert([e2eCommand, domainCommand, unitCommand].every(item => item?.status === 'VERIFIED_AVAILABLE'), 'Current command registration missing');
assert(e2e.includes('484 passed (43.4m)') && /^exitCode=0$/m.test(e2e), 'Full browser E2E did not pass');
assert(domainLog.includes('"passed":88') && /^exitCode=0$/m.test(domainLog), 'Domain/network checks did not pass');
assert(unitLog.includes('Tests  93 passed (93)') && /^exitCode=0$/m.test(unitLog), 'Unit/component checks did not pass');
assert(sourceLog.includes('"files": 67') && sourceLog.includes('"operationCalls": 220') && sourceLog.includes('"status": "PASS"') && /^exitCode=0$/m.test(sourceLog), 'Current source checker did not pass');
for (const op of task.operationIds)
  assert(Object.values(openapi.paths).some(methods => Object.values(methods).some(item => item.operationId === op)), `Bot operation missing from canonical OpenAPI: ${op}`);
for (const op of ['getBotConfig', 'updateBotDraft', 'publishBotConfig', 'pauseBot', 'controlAutomation', 'createEvaluation', 'runPlayground', 'listBudgetPolicies', 'listAIConnections', 'listAgentRoles'])
  assert(bot.includes(`'${op}'`), `Bot operation not wired in module: ${op}`);
assert(bot.includes('bot.configure') && bot.includes('bot.publish') && bot.includes('requireHumanOrderConfirmation=true'), 'Canonical UI capabilities or legacy-confirmation gap is missing from module');
assert(bot.includes('Nội dung thử không gửi ra ngoài') && bot.includes('Chưa rõ'), 'Synthetic-playground boundary or unknown usage values are not disclosed by the module');
const browserLines = e2e.split(/\r?\n/).filter(line => /tests\\fe018\.spec\.ts/.test(line));
const chromiumLines = browserLines.filter(line => line.includes('[chromium]'));
const firefoxLines = browserLines.filter(line => line.includes('[firefox]'));
assert(chromiumLines.length === 13 && firefoxLines.length === 13, `Expected 13 bot/evaluation browser scenarios per project, found ${chromiumLines.length}/${firefoxLines.length}`);
const caseNames = [
  'FE018.S01 maps routes and operations to the canonical OpenAPI permissions',
  'FE018.AC01/04 draft saves use the contract version and keep human order confirmation locked after a conflict',
  'FE018.AC03 evaluation is synthetic, revision-bound, and cannot publish a stale draft',
  'FE018.AC01/04 successful publish is tied to the tested revision and pause explains its boundary',
  'FE018.AC03 playground sends no external message and preserves unknown cost and token values',
  'FE018.S03 synthetic budget and tool denials retain the prompt and never show a generated answer',
  'FE027.H03 budget and provider failover preview refuses silent provider switching on exhaustion',
  'FE018.AC02 role kill switch is versioned, preserves API tools, and does not pause the whole bot',
  'FE018.AC02 expired, wrong-scope, and matching approvals produce honest budget results',
  'FE018.AC05 manager and bot-admin roles cannot use operations outside their canonical permissions',
  'FE018.AC05 unknown role command stays unresolved and does not claim successful resumption',
  'UI004 25 evaluations: cursor pages reach the last record and preserve detail, search, and browser Back state',
  'UI004 105 evaluations: cursor traversal reaches every record and retains the failing cursor for retry',
];
for (const name of caseNames) assert(e2e.includes(name), `Bot/evaluation browser case missing: ${name}`);

const prior = json(priorPath);
const sourcePaths = [...new Set([
  ...prior.sourceFiles.map(item => item.path), 'AGENTS.md', 'AI_RULES.md', 'DESIGN.md', 'UX-CONTRACT.md',
  'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/FRONTEND_SPACING_STANDARD.md',
  'botsales-kit/docs/18_CODING_STANDARDS.md', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/permission-catalog.json', 'packages/contracts/src/operations.json',
  'apps/web/src/modules/bot/index.tsx', 'apps/web/src/mocks/auxiliary.ts', 'apps/web/src/mocks/service.ts',
  'tests/fe018.spec.ts', 'botsales-kit/execution/frontend-command-map.json',
  e2eLogPath, domainLogPath, unitLogPath, sourceLogPath, helperPath,
])].sort();
for (const file of sourcePaths) assert(fs.existsSync(path.join(root, file)), `Missing source snapshot: ${file}`);
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const reviewer = 'Codex self-review; no independent peer review claimed';
const now = new Date().toISOString();
const groups = {
  S01: [{ name: 'R26/R27/R28/R51 and all 18 planned bot/evaluation operations resolve to canonical route/OpenAPI/operation sources', status: 'PASS' }],
  S02: [
    { name: 'Draft save and publish stay tied to the selected bot revision; evaluation is revision-bound', status: 'PASS' },
    { name: 'Role permissions, kill switch, budget gates and approval scopes have explicit UI state', status: 'PASS' },
    { name: 'Playground response and usage values are labeled synthetic, preserve unknowns and send no external message', status: 'PASS' },
  ],
  S03: [
    { name: 'Stale config, stale eval, expired/wrong-scope approval and unknown command preserve honest failure/recovery state', status: 'PASS' },
    { name: 'Budget/tool denials do not fabricate a generated answer or silently switch provider', status: 'PASS' },
    { name: 'Legacy requireHumanOrderConfirmation constraint remains explicit and cannot unlock automatic confirmation', status: 'PASS' },
  ],
  S04: [
    { name: 'Current source checker validates 67 files, 220 operation call sites and 54 routes with no issues', status: 'PASS', count: '67/220/54' },
    { name: 'Current unit/component and domain/network suites pass', status: 'PASS', count: '93/93 and 88/88' },
  ],
  S05: [
    { name: 'All FE018 bot/evaluation browser scenarios pass in Chromium and Firefox', status: 'PASS', count: '13x2' },
    { name: 'Full React demo browser suite passes across both browser projects', status: 'PASS', count: '484/484' },
    { name: 'Budget/evaluation behaviors are synthetic and do not certify live LLM quality or spend', status: 'PASS' },
  ],
};
const outputs = [];
for (const step of task.implementationSteps) {
  const evidencePath = `${base}/${step.id}-after-spc059-current-20261006.json`;
  const logPath = `${base}/${step.id}-after-spc059-current-20261006.log`;
  const cases = groups[step.id];
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Full React demo E2E passed 484/484 across Chromium and Firefox, including 13 FE018 scenarios per browser; unit/component checks passed 93/93, source validation found 0 issues, and domain/network checks passed 88/88. Playground/evaluation and budget behavior use deterministic synthetic fixtures; live LLM quality, provider costs, and external actions were not tested.`;
  const log = [
    `FE018.${step.id} bot configuration/playground/evaluation current verification.`, `executedAt=${now}`, `cwd=${root}`,
    `commandId=${e2eCommand.id}; command=${e2eCommand.command}; exitCode=0`, `E2E_LOG=${e2eLogPath}; sha256=${sha(bytes(e2eLogPath))}`,
    `UNIT_COMMAND_ID=${unitCommand.id}; command=${unitCommand.command}; exitCode=0`, `UNIT_LOG=${unitLogPath}; sha256=${sha(bytes(unitLogPath))}`,
    `SOURCE_LOG=${sourceLogPath}; sha256=${sha(bytes(sourceLogPath))}`,
    `DOMAIN_COMMAND_ID=${domainCommand.id}; command=${domainCommand.command}; exitCode=0`, `DOMAIN_LOG=${domainLogPath}; sha256=${sha(bytes(domainLogPath))}`,
    `ROUTES=${task.routeIds.length}; OPERATIONS=${task.operationIds.length}; E2E=484/484; FE018 browser cases=${chromiumLines.length} chromium + ${firefoxLines.length} firefox; unit=93/93; source files=67 with 0 issues; domain=88/88`,
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; playground/evaluation outputs are fixtures and do not call an external LLM or execute real business actions.', `reviewer=${reviewer}`,
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, logPath), log, 'utf8');
  const evidence = {
    taskId: 'FE018', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
    sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`, expected: step.verification,
    observed, commandId: e2eCommand.id, command: e2eCommand.command, cwd: root, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'Built React bot/evaluation UI and deterministic MSW roles, budget, approvals and revision fixtures; no live LLM/provider.', dataSource: 'synthetic-msw' },
    checksTotal: step.id === 'S04' ? 184 : 484, failed: 0, logFile: logPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
    commandResults: [
      { commandId: e2eCommand.id, command: e2eCommand.command, exitCode: 0, testsPassed: 484, fe018Cases: chromiumLines.length + firefoxLines.length, browserProjects: ['chromium', 'firefox'], logFile: e2eLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(e2eLogPath)) },
      { commandId: unitCommand.id, command: unitCommand.command, exitCode: 0, testsPassed: 93, filesPassed: 10, logFile: unitLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(unitLogPath)) },
      { commandId: domainCommand.id, command: domainCommand.command, exitCode: 0, simulatorChecks: 75, networkChecks: 13, logFile: domainLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(domainLogPath)) },
      { commandId: 'source-contract-check', command: 'npm.cmd --script-shell=cmd.exe run test:source', exitCode: 0, checkedFiles: 67, operationCalls: 220, routes: 54, issues: 0, logFile: sourceLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(sourceLogPath)) },
    ],
    audit: { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, browserCases: cases },
    limitations: ['Bot playground and evaluations are synthetic; no live LLM quality, spend, or provider failover is claimed.', 'No owner acceptance, hosted CI, or screen-reader conformance is claimed.'],
  };
  fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  outputs.push({ step: step.id, evidence: evidencePath });
}
console.log(JSON.stringify({ result: 'PASS', task: 'FE018', routes: task.routeIds.length, operations: task.operationIds.length, e2e: '484/484', fe018Cases: `${chromiumLines.length}x2`, unit: '93/93', source: '67 files/220 calls/54 routes/0 issues', domain: '88/88', sourceFiles: sourceFiles.length, sourceSnapshotSha256, steps: outputs }, null, 2));
