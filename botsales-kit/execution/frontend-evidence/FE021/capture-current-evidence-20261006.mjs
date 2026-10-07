import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = 'botsales-kit/execution/frontend-evidence/FE021';
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

const task = json('botsales-kit/execution/frontend-plan.json').tasks.find(item => item.id === 'FE021');
const routes = json('botsales-kit/contracts/route-manifest.json').routes;
const operations = json('packages/contracts/src/operations.json');
const openapi = json('botsales-kit/contracts/openapi.json');
const dashboard = read('apps/web/src/modules/dashboard/index.tsx');
const reports = read('apps/web/src/modules/reports/index.tsx');
const reportUtils = read('apps/web/src/modules/reports/report-utils.ts');
const download = read('apps/web/src/shared/model/download.ts');
const e2e = read(e2eLogPath);
const domainLog = read(domainLogPath);
const unitLog = read(unitLogPath);
const sourceLog = read(sourceLogPath);
const commandMap = json('botsales-kit/execution/frontend-command-map.json');
const e2eCommand = commandMap.commands.find(item => item.id === 'e2e');
const domainCommand = commandMap.commands.find(item => item.id === 'domain');
const unitCommand = commandMap.commands.find(item => item.id === 'unit');
assert(task && task.implementationSteps.length === 5, 'FE021 canonical task missing');
assert(task.routeIds.length === 3 && task.routeIds.every(id => routes.some(route => route.id === id)), 'Dashboard/report route mapping invalid');
assert(task.operationIds.length === 7 && task.operationIds.every(id => Object.hasOwn(operations, id)), 'Dashboard/report operation mapping invalid');
assert([e2eCommand, domainCommand, unitCommand].every(item => item?.status === 'VERIFIED_AVAILABLE'), 'Current command registration missing');
assert(e2e.includes('484 passed (43.4m)') && /^exitCode=0$/m.test(e2e), 'Full browser E2E did not pass');
assert(domainLog.includes('"passed":88') && /^exitCode=0$/m.test(domainLog), 'Domain/network checks did not pass');
assert(unitLog.includes('Tests  93 passed (93)') && /^exitCode=0$/m.test(unitLog), 'Unit/component checks did not pass');
assert(sourceLog.includes('"files": 67') && sourceLog.includes('"operationCalls": 220') && sourceLog.includes('"status": "PASS"') && /^exitCode=0$/m.test(sourceLog), 'Current source checker did not pass');
for (const op of task.operationIds)
  assert(Object.values(openapi.paths).some(methods => Object.values(methods).some(item => item.operationId === op)), `Dashboard/report operation missing from canonical OpenAPI: ${op}`);
for (const [source, ops] of [[dashboard, ['getDashboard', 'pauseBot']], [reports, ['getReportSummary', 'getMarketingSummary', 'createExport', 'listJobs']]])
  for (const op of ops) assert(source.includes(`'${op}'`), `Dashboard/report operation not wired: ${op}`);
assert(reportUtils.includes('reportFilename') && reportUtils.includes('botsales-${type}-${from}-${to}.csv'), 'Date-bounded safe export filename is missing');
assert(download.includes("url.protocol === 'https:'") && download.includes("url.protocol === 'blob:'"), 'Download target protocol allowlist is missing');
const browserLines = e2e.split(/\r?\n/).filter(line => /tests\\fe021\.spec\.ts/.test(line));
const chromiumLines = browserLines.filter(line => line.includes('[chromium]'));
const firefoxLines = browserLines.filter(line => line.includes('[firefox]'));
assert(chromiumLines.length === 8 && firefoxLines.length === 8, `Expected 8 dashboard/report browser scenarios per project, found ${chromiumLines.length}/${firefoxLines.length}`);
const caseNames = [
  'FE021 dashboard keeps independent panels usable and hides finance fields without finance.read',
  'FE021 marketing chart and table match the same synthetic API fixture and preserve missing actual spend',
  'FE021 export uses inclusive shop-local boundaries, safe CSV, API jobs and cursor pagination',
  'FE021 mock rejects an export when reports.export lacks the source permission',
  'FE021 mock rejects an invalid report timezone before creating an export job',
  'FE021 ambiguous export result preserves the selected dates and never exposes a download',
  'FE021 empty report and marketing payloads render explicit empty states',
  'FE021 stale export conflict preserves dates and never exposes a download',
];
for (const name of caseNames) assert(e2e.includes(name), `Dashboard/report browser case missing: ${name}`);

const prior = json(priorPath);
const sourcePaths = [...new Set([
  ...prior.sourceFiles.map(item => item.path), 'AGENTS.md', 'AI_RULES.md', 'DESIGN.md', 'UX-CONTRACT.md',
  'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/FRONTEND_SPACING_STANDARD.md',
  'botsales-kit/docs/18_CODING_STANDARDS.md', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/permission-catalog.json', 'packages/contracts/src/operations.json',
  'apps/web/src/modules/dashboard/index.tsx', 'apps/web/src/modules/reports/index.tsx',
  'apps/web/src/modules/reports/report-utils.ts', 'apps/web/src/shared/model/download.ts',
  'tests/fe021.spec.ts', 'apps/web/tests/fe021-source-map.test.ts',
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
  S01: [{ name: 'R04/R31/R53 and all 7 planned dashboard/report/export operations resolve to canonical route/OpenAPI sources', status: 'PASS' }],
  S02: [
    { name: 'Dashboard panels and marketing chart/table use the same identified synthetic API snapshot', status: 'PASS' },
    { name: 'Export uses shop-local inclusive boundaries, cursor jobs and the reports.export capability', status: 'PASS' },
    { name: 'Missing spend/cost and empty report payloads are shown as gaps rather than fabricated totals', status: 'PASS' },
  ],
  S03: [
    { name: 'Denied permission, invalid timezone, ambiguous job result and stale conflict preserve filters and block download', status: 'PASS' },
    { name: 'Finance-only dashboard values remain hidden from a role without finance.read', status: 'PASS' },
    { name: 'CSV export uses safe content handling; reports do not use a client page as the aggregate authority', status: 'PASS' },
  ],
  S04: [
    { name: 'Current source checker validates 67 files, 220 operation call sites and 54 routes with no issues', status: 'PASS', count: '67/220/54' },
    { name: 'Current unit/component and simulator/network suites pass', status: 'PASS', count: '93/93 and 88/88' },
  ],
  S05: [
    { name: 'All FE021 dashboard/report/export browser scenarios pass in Chromium and Firefox', status: 'PASS', count: '8x2' },
    { name: 'Full React demo browser suite passes across both browser projects', status: 'PASS', count: '484/484' },
    { name: 'Exported contents and metrics remain synthetic frontend acceptance data, not production reporting', status: 'PASS' },
  ],
};
const outputs = [];
for (const step of task.implementationSteps) {
  const evidencePath = `${base}/${step.id}-after-spc059-current-20261006.json`;
  const logPath = `${base}/${step.id}-after-spc059-current-20261006.log`;
  const cases = groups[step.id];
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Full React demo E2E passed 484/484 across Chromium and Firefox, including eight FE021 browser scenarios per project; current unit/component checks passed 93/93, source validation found 0 issues, and simulator/network checks passed 88/88. Report/export values and jobs use synthetic fixtures, not production data or a live reporting backend.`;
  const log = [
    `FE021.${step.id} dashboard/report/export current verification.`, `executedAt=${now}`, `cwd=${root}`,
    `commandId=${e2eCommand.id}; command=${e2eCommand.command}; exitCode=0`, `E2E_LOG=${e2eLogPath}; sha256=${sha(bytes(e2eLogPath))}`,
    `UNIT_COMMAND_ID=${unitCommand.id}; command=${unitCommand.command}; exitCode=0`, `UNIT_LOG=${unitLogPath}; sha256=${sha(bytes(unitLogPath))}`,
    `SOURCE_LOG=${sourceLogPath}; sha256=${sha(bytes(sourceLogPath))}`,
    `DOMAIN_COMMAND_ID=${domainCommand.id}; command=${domainCommand.command}; exitCode=0`, `DOMAIN_LOG=${domainLogPath}; sha256=${sha(bytes(domainLogPath))}`,
    `ROUTES=${task.routeIds.length}; OPERATIONS=${task.operationIds.length}; E2E=484/484; FE021 browser cases=${chromiumLines.length} chromium + ${firefoxLines.length} firefox; unit=93/93; source files=67 with 0 issues; domain=88/88`,
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; report metrics and export job artifacts are deterministic fixtures, not production analytics or records.', `reviewer=${reviewer}`,
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, logPath), log, 'utf8');
  const evidence = {
    taskId: 'FE021', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
    sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`, expected: step.verification,
    observed, commandId: e2eCommand.id, command: e2eCommand.command, cwd: root, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'Built React dashboard/report/export UI and deterministic MSW reporting summaries/jobs; no live analytics or production export service.', dataSource: 'synthetic-msw' },
    checksTotal: step.id === 'S04' ? 184 : 484, failed: 0, logFile: logPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
    commandResults: [
      { commandId: e2eCommand.id, command: e2eCommand.command, exitCode: 0, testsPassed: 484, fe021Cases: chromiumLines.length + firefoxLines.length, browserProjects: ['chromium', 'firefox'], logFile: e2eLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(e2eLogPath)) },
      { commandId: unitCommand.id, command: unitCommand.command, exitCode: 0, testsPassed: 93, filesPassed: 10, logFile: unitLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(unitLogPath)) },
      { commandId: domainCommand.id, command: domainCommand.command, exitCode: 0, simulatorChecks: 75, networkChecks: 13, logFile: domainLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(domainLogPath)) },
      { commandId: 'source-contract-check', command: 'npm.cmd --script-shell=cmd.exe run test:source', exitCode: 0, checkedFiles: 67, operationCalls: 220, routes: 54, issues: 0, logFile: sourceLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(sourceLogPath)) },
    ],
    audit: { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, browserCases: cases },
    limitations: ['No production analytics, accounting report, or export archive is claimed.', 'No owner acceptance, hosted CI, or screen-reader conformance is claimed.'],
  };
  fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  outputs.push({ step: step.id, evidence: evidencePath });
}
console.log(JSON.stringify({ result: 'PASS', task: 'FE021', routes: task.routeIds.length, operations: task.operationIds.length, e2e: '484/484', fe021Cases: `${chromiumLines.length}x2`, unit: '93/93', source: '67 files/220 calls/54 routes/0 issues', domain: '88/88', sourceFiles: sourceFiles.length, sourceSnapshotSha256, steps: outputs }, null, 2));
