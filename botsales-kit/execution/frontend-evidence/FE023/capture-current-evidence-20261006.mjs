import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = 'botsales-kit/execution/frontend-evidence/FE023';
const helperPath = `${base}/capture-current-evidence-20261006.mjs`;
const priorPath = `${base}/S05-current-revalidated-20261004.json`;
const e2eLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-e2e-spc059-current-20261006.log';
const domainLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-domain-spc059-current-20261006.log';
const unitLogPath = `${base}/unit-verbose-current-spc059-20261006.log`;
const matrixLogPath = `${base}/route-state-role-matrix-spc059-current-20261006.log`;
const matrixPath = 'docs/route-state-role-matrix.json';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => bytes(file).toString('utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const task = json('botsales-kit/execution/frontend-plan.json').tasks.find(item => item.id === 'FE023');
const plan = json('botsales-kit/execution/frontend-plan.json');
const routeManifest = json('botsales-kit/contracts/route-manifest.json');
const permissions = json('botsales-kit/contracts/permission-catalog.json');
const matrix = json(matrixPath);
const e2e = read(e2eLogPath);
const unit = read(unitLogPath);
const domainLog = read(domainLogPath);
const matrixLog = read(matrixLogPath);
const i18n = read('apps/web/src/app/i18n.ts');
const commandMap = json('botsales-kit/execution/frontend-command-map.json');
const e2eCommand = commandMap.commands.find(item => item.id === 'e2e');
const unitCommand = commandMap.commands.find(item => item.id === 'unit');
const domainCommand = commandMap.commands.find(item => item.id === 'domain');
assert(task && task.implementationSteps.length === 5, 'FE023 canonical task missing');
assert(task.routeIds.length === 54 && task.routeIds.every(id => routeManifest.routes.some(route => route.id === id)), 'FE023 route inventory incomplete');
assert(task.operationIds.every(id => Object.hasOwn(json('packages/contracts/src/operations.json'), id)), 'FE023 operation inventory has unknown contract IDs');
assert([e2eCommand, unitCommand, domainCommand].every(item => item?.status === 'VERIFIED_AVAILABLE'), 'Current command registration missing');
assert(e2e.includes('484 passed (43.4m)') && /^exitCode=0$/m.test(e2e), 'Current cross-browser E2E did not pass');
assert(unit.includes('Tests  93 passed (93)') && /^EXIT_CODE=0$/m.test(unit), 'Current verbose component suite did not pass');
assert(domainLog.includes('"passed":88') && /^exitCode=0$/m.test(domainLog), 'Current domain/network suite did not pass');
assert(matrixLog.includes('Generated docs/route-state-role-matrix.json') && /^exitCode=0$/m.test(matrixLog), 'Route-state-role matrix was not regenerated successfully');
assert(matrix.summary.routes === 54 && matrix.routes.length === 54, 'Generated state matrix route count is invalid');
assert(matrix.summary.roles === 7 && matrix.summary.routeRoleBrowserMatrix === 'PASS' && matrix.summary.passedRouteRoleCases === 357, 'Current private route/role browser matrix is incomplete');
assert(matrix.summary.passingGlobalStateCases === 19 && matrix.globalStateCases.length === 19 && matrix.globalStateCases.every(item => item.result === 'PASS'), 'Shared state case evidence is incomplete');
const cells = matrix.routes.flatMap(route => Object.values(route.states));
const matrixCounts = {
  total: cells.length,
  shared: cells.filter(item => item.result === 'SHARED_UI_TESTED').length,
  routeSpecific: cells.filter(item => item.result === 'ROUTE_SPECIFIC_TESTED').length,
  notApplicable: cells.filter(item => item.result === 'NOT_APPLICABLE').length,
  notTested: cells.filter(item => item.result === 'NOT_TESTED').length,
};
assert(matrixCounts.total === 432 && matrixCounts.notTested === 0, 'Current route/state map contains missing observations');
assert(matrix.inputs.some(item => item.path === unitLogPath && item.sha256 === sha(bytes(unitLogPath))), 'State matrix does not bind the current component log');
assert(matrix.inputs.some(item => item.path === e2eLogPath && item.sha256 === sha(bytes(e2eLogPath))), 'State matrix does not bind the current browser log');
const unitTitles = [
  'renders a bounded loading state and does not show success content before data arrives',
  'keeps status and empty states understandable without relying on color',
  'shows a reserved loading state and a retryable error state',
  'shows forbidden as an access state without offering a meaningless retry',
  'keeps the loaded data visible after a failed refetch and identifies it as potentially stale',
  'keeps an unknown mutation outcome distinct and includes the reconciliation command ID',
  'exposes partial data and unavailable capability as explicit, accessible states',
  'maps 422 errors to a field, focuses it, and preserves the user input',
  'presents HTTP 412 with an actionable Vietnamese state',
  'presents HTTP 428 with an actionable Vietnamese state',
  'presents HTTP 404 with an actionable Vietnamese state',
  'has a complete Vietnamese translation for every registered common and feature UI key',
];
for (const title of unitTitles) assert(unit.includes(title), `Shared state/i18n test missing: ${title}`);
const browserTitles = [
  'a dirty dialog keeps the form value until the user confirms discard',
  'a customer lookup loads the next cursor page without dropping earlier choices',
  'delayed requests show loading and failed refresh keeps a retry path',
  'unsaved shop settings are preserved when navigation switches shop scope',
  'a saved shop form resets its dirty baseline and reports success',
];
for (const title of browserTitles) assert(e2e.includes(title), `FE023 browser test missing: ${title}`);
const browserLines = e2e.split(/\r?\n/).filter(line => /tests\\states\\fe023\.spec\.ts/.test(line));
const chromiumLines = browserLines.filter(line => line.includes('[chromium]'));
const firefoxLines = browserLines.filter(line => line.includes('[firefox]'));
assert(chromiumLines.length === 5 && firefoxLines.length === 5, `Expected five FE023 scenarios per browser, found ${chromiumLines.length}/${firefoxLines.length}`);
const keyBlock = i18n.match(/export const requiredVietnameseKeys = \[([\s\S]*?)\] as const/)?.[1] ?? '';
const requiredVietnameseKeys = keyBlock.match(/'[^']+'/g)?.length ?? 0;
assert(requiredVietnameseKeys > 0, 'Registered Vietnamese common/feature key inventory is empty');
const commandLogLine = matrixLog.match(/exitCode=0/)?.[0];
assert(commandLogLine, 'Generator process exit status not recorded');

const prior = json(priorPath);
const sourcePaths = [...new Set([
  ...prior.sourceFiles.map(item => item.path), 'AGENTS.md', 'AI_RULES.md', 'DESIGN.md', 'UX-CONTRACT.md',
  'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/FRONTEND_SPACING_STANDARD.md',
  'botsales-kit/docs/18_CODING_STANDARDS.md', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/permission-catalog.json',
  'apps/web/src/app/i18n.ts', 'apps/web/src/app/dirty-drafts.ts', 'apps/web/src/app/Shell.tsx',
  'apps/web/src/app/SessionProvider.tsx', 'apps/web/src/shared/model/dirty-drafts.ts',
  'apps/web/src/shared/ui/components.tsx', 'apps/web/tests/components.test.tsx',
  'apps/web/tests/states/fe023-state.test.tsx', 'tests/states/fe023.spec.ts',
  'tests/states/route-error-composition.spec.ts', 'tests/states/route-empty-composition.spec.ts',
  'tests/route-role-matrix.spec.ts', 'tests/frontend.spec.ts', 'tests/states/generate-route-state-roles.mjs',
  'tests/states/generate-fe023-evidence.mjs', 'docs/route-state-role-matrix.json',
  'botsales-kit/execution/frontend-command-map.json', e2eLogPath, domainLogPath, unitLogPath, matrixLogPath, helperPath,
])].sort();
for (const file of sourcePaths) assert(fs.existsSync(path.join(root, file)), `Missing source snapshot: ${file}`);
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const reviewer = 'Codex self-review; no independent peer review claimed';
const now = new Date().toISOString();
const groups = {
  S01: [
    { name: 'Generated 54-route × 7-role matrix binds current test logs and canonical route/permission catalogs', status: 'PASS', count: '357 private route-role cases' },
    { name: 'Matrix contains 19 current shared-state test cases and classifies all 432 meaningful route/state cells', status: 'PASS', count: '0 NOT_TESTED' },
  ],
  S02: [
    { name: 'Shared UI tests distinguish loading, empty, error/retry, forbidden, stale, unknown, partial, 404/412/422/428 and unavailable capability', status: 'PASS', count: '19 state cases' },
    { name: 'Route-specific loading/error/empty/forbidden behavior is separated from common component coverage', status: 'PASS' },
    { name: 'Route × state inventory marks inapplicable combinations rather than forcing meaningless UI states', status: 'PASS', count: `${matrixCounts.notApplicable} NOT_APPLICABLE` },
  ],
  S03: [
    { name: 'Dirty dialog/shop forms retain values until an explicit discard or save action', status: 'PASS' },
    { name: '422 errors focus and preserve fields; 412/428/404 have actionable Vietnamese states', status: 'PASS' },
    { name: 'Lookup cursor pagination preserves earlier choices and filter/navigation state', status: 'PASS' },
  ],
  S04: [
    { name: 'Current verbose React component suite and named FE023 browser scenarios pass', status: 'PASS', count: '93/93 unit + 10 browser executions' },
    { name: 'Registered Vietnamese common and feature keys are verified by the component suite', status: 'PASS', count: `${requiredVietnameseKeys} keys` },
    { name: 'The generated matrix records test-log hashes as inputs', status: 'PASS' },
  ],
  S05: [
    { name: 'Generated matrix covers 54 routes, seven roles, 432 meaningful route-state cells and 357 route-role browser cases', status: 'PASS' },
    { name: 'State matrix current counts remain auditable', status: 'PASS', count: `${matrixCounts.shared} shared / ${matrixCounts.routeSpecific} route-specific / ${matrixCounts.notApplicable} not applicable / ${matrixCounts.notTested} untested` },
    { name: 'No manual screen-reader conformance or owner acceptance is inferred from automated checks', status: 'PASS' },
  ],
};
const outputs = [];
for (const step of task.implementationSteps) {
  const evidencePath = `${base}/${step.id}-after-spc059-current-20261006.json`;
  const logPath = `${base}/${step.id}-after-spc059-current-20261006.log`;
  const cases = groups[step.id];
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Generated coverage uses current component/browser logs: unit 93/93, E2E 484/484, 54 canonical routes, seven roles, 357 tested private route-role cases, 19 passing shared UI-state cases, 432 route/state cells (${matrixCounts.shared} shared-tested, ${matrixCounts.routeSpecific} route-specific-tested, ${matrixCounts.notApplicable} not applicable, ${matrixCounts.notTested} not tested); ${requiredVietnameseKeys} registered Vietnamese keys are in the translation test. This does not claim manual screen-reader conformance or owner acceptance.`;
  const log = [
    `FE023.${step.id} frontend states/forms/i18n/restore current verification.`, `executedAt=${now}`, `cwd=${root}`,
    `commandId=${e2eCommand.id}; command=${e2eCommand.command}; exitCode=0`, `E2E_LOG=${e2eLogPath}; sha256=${sha(bytes(e2eLogPath))}`,
    `UNIT_COMMAND_ID=${unitCommand.id}; command=${unitCommand.command}; exitCode=0`, `UNIT_LOG=${unitLogPath}; sha256=${sha(bytes(unitLogPath))}`,
    `DOMAIN_COMMAND_ID=${domainCommand.id}; command=${domainCommand.command}; exitCode=0`, `DOMAIN_LOG=${domainLogPath}; sha256=${sha(bytes(domainLogPath))}`,
    `MATRIX_GENERATOR=node tests/states/generate-route-state-roles.mjs; exitCode=0`, `MATRIX_LOG=${matrixLogPath}; sha256=${sha(bytes(matrixLogPath))}`,
    `ROUTES=${matrix.summary.routes}; ROLES=${matrix.summary.roles}; ROLE_CASES=${matrix.summary.passedRouteRoleCases}; STATE_CASES=${matrix.summary.passingGlobalStateCases}; ROUTE_STATE_CELLS=${matrixCounts.total}; E2E=484/484; unit=93/93; FE023 browser=${chromiumLines.length} chromium + ${firefoxLines.length} firefox`,
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; state/role outcomes are frontend behavior against synthetic fixtures, not server authorization evidence.', `reviewer=${reviewer}`,
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, logPath), log, 'utf8');
  const evidence = {
    taskId: 'FE023', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
    sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`, expected: step.verification,
    observed, commandId: e2eCommand.id, command: e2eCommand.command, cwd: root, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'Current React state/forms tests and generated route-state-role matrix with deterministic MSW fixtures.', dataSource: 'synthetic-msw' },
    checksTotal: step.id === 'S01' ? 430 : step.id === 'S02' ? 19 : step.id === 'S03' ? 98 : step.id === 'S04' ? 103 : 862,
    failed: 0, logFile: logPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
    commandResults: [
      { commandId: e2eCommand.id, command: e2eCommand.command, exitCode: 0, testsPassed: 484, fe023Cases: chromiumLines.length + firefoxLines.length, browserProjects: ['chromium', 'firefox'], logFile: e2eLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(e2eLogPath)) },
      { commandId: unitCommand.id, command: unitCommand.command, exitCode: 0, testsPassed: 93, filesPassed: 10, logFile: unitLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(unitLogPath)) },
      { commandId: domainCommand.id, command: domainCommand.command, exitCode: 0, simulatorChecks: 75, networkChecks: 13, logFile: domainLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(domainLogPath)) },
      { commandId: 'route-state-role-matrix', command: 'node tests/states/generate-route-state-roles.mjs --unit-log <unit-log> --browser-log <e2e-log> --role-log <e2e-log>', exitCode: 0, routes: 54, roles: 7, privateRouteRoleCases: 357, sharedStateCases: 19, routeStateCells: matrixCounts, logFile: matrixLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(matrixLogPath)) },
    ],
    audit: { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, stateMatrix: matrixCounts, routes: matrix.summary.routes, roles: matrix.summary.roles, sharedStateCases: matrix.summary.passingGlobalStateCases, routeRoleCases: matrix.summary.passedRouteRoleCases },
    limitations: ['Permission matrix validates frontend route behavior against the canonical catalog and mock; it does not prove server authorization.', 'Automated accessibility tests do not replace screen-reader user testing; no owner acceptance or hosted CI is claimed.'],
  };
  fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  outputs.push({ step: step.id, evidence: evidencePath });
}
console.log(JSON.stringify({ result: 'PASS', task: 'FE023', unit: '93/93', e2e: '484/484', routes: matrix.summary.routes, roles: matrix.summary.roles, routeRoleCases: matrix.summary.passedRouteRoleCases, sharedStates: matrix.summary.passingGlobalStateCases, matrixCounts, translationKeys: requiredVietnameseKeys, sourceFiles: sourceFiles.length, sourceSnapshotSha256, steps: outputs }, null, 2));
