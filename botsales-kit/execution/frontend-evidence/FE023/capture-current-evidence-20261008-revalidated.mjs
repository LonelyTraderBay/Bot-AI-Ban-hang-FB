import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE023');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const readFrontend = relative => fs.readFileSync(path.join(frontendRoot, relative), 'utf8');
const readKit = relative => fs.readFileSync(path.join(kitRoot, relative), 'utf8');
const jsonFrontend = relative => JSON.parse(readFrontend(relative));
const jsonKit = relative => JSON.parse(readKit(relative));

assert(path.basename(frontendRoot) === 'BotSalesAI_Frontend', 'Run this evidence capture from the Frontend workspace.');
const task = jsonKit('execution/frontend-plan.json').tasks.find(item => item.id === 'FE023');
assert(task && task.implementationSteps.length === 5, 'Canonical FE023 S01-S05 plan is required.');

const paths = {
  unit: 'execution/frontend-evidence/FE023/unit-verbose-current-20261008-revalidated.log',
  browser: 'execution/frontend-evidence/FE023/browser-state-current-20261008-revalidated.log',
  matrixLog: 'execution/frontend-evidence/FE023/route-state-role-matrix-current-20261008-revalidated.log',
  fullE2E: 'execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log',
  fullVerify: 'execution/frontend-evidence/FE001/S03-full-verify-powershell-current-20261008.log',
};
const unitText = readKit(paths.unit);
const browserText = readKit(paths.browser);
const matrixLogText = readKit(paths.matrixLog);
const fullE2EText = readKit(paths.fullE2E);
const fullVerifyText = readKit(paths.fullVerify);
const matrix = jsonKit('execution/frontend-evidence/FE023/route-state-role-matrix-current-20261008-revalidated.json');
const i18nSource = readFrontend('apps/web/src/app/i18n.ts');
const routeManifest = jsonKit('contracts/route-manifest.json');
const permissionCatalog = jsonKit('contracts/permission-catalog.json');
const commandMap = jsonKit('execution/frontend-command-map.json');
const unitCommand = commandMap.commands.find(item => item.id === 'unit');
const e2eCommand = commandMap.commands.find(item => item.id === 'e2e');
assert(unitCommand?.status === 'VERIFIED_AVAILABLE' && e2eCommand?.status === 'VERIFIED_AVAILABLE', 'Registered unit/E2E commands are unavailable.');

assert(/Tests\s+138 passed \(138\)/.test(unitText) && unitText.includes('EXIT_CODE=0'), 'Current verbose Vitest run is not 138/138.');
assert(/36 passed \(8\.9m\)/.test(browserText) && browserText.includes('EXIT_CODE=0'), 'Current FE023 browser/state bundle is not 36/36.');
assert(matrix.summary.routes === 54 && matrix.routes.length === 54 && matrix.summary.roles === 7, 'Generated state matrix is not 54 routes × 7 roles.');
assert(matrix.summary.passingGlobalStateCases === 19 && matrix.globalStateCases.length === 19 && matrix.globalStateCases.every(item => item.result === 'PASS'), 'Shared-state matrix does not have 19 passing cases.');
assert(matrix.summary.routeRoleBrowserMatrix === 'PASS' && matrix.summary.passedRouteRoleCases === 357, 'Route role matrix is not 357/357.');

const roleCount = Object.keys(permissionCatalog.rolePresets).length;
const expectedRoleCases = routeManifest.routes.filter(route => route.path.startsWith('/s/')).length * roleCount;
assert(roleCount === 7 && expectedRoleCases === 357, 'Canonical route/role denominator changed.');
const stateCounts = {};
for (const route of matrix.routes) {
  for (const state of Object.values(route.states)) stateCounts[state.result] = (stateCounts[state.result] || 0) + 1;
}
assert(stateCounts.ROUTE_SPECIFIC_TESTED === 163 && stateCounts.SHARED_UI_TESTED === 204 && stateCounts.NOT_APPLICABLE === 65 && !stateCounts.NOT_TESTED, 'Generated route-state cells contain a changed or untested result.');
assert(Object.values(stateCounts).reduce((sum, count) => sum + count, 0) === 432, 'Unexpected route-state cell denominator.');
assert(matrix.summary.routeSpecificSuccessRoutes === 54 && matrix.summary.routeSpecificEmptyRoutes === 9, 'Route success/empty counts changed.');
assert(matrix.summary.routeEmptyComposition === 'PASS' && matrix.summary.observedDeniedRouteRoleCase === 'viewer@R22', 'Empty or forbidden route coverage changed.');

const sourceSection = i18nSource.match(/export const requiredVietnameseKeys = \[([\s\S]*?)\] as const/)?.[1] || '';
const requiredKeyCount = sourceSection.match(/'[^']+'/g)?.length || 0;
assert(requiredKeyCount === 78, 'Registered Vietnamese key count changed; review the current key inventory.');
assert(unitText.includes('has a complete Vietnamese translation for every registered common and feature UI key'), 'Translation test is absent from the current unit run.');
assert(readFrontend('tests/states/route-error-composition.spec.ts').includes('must not show a success toast while an API read is failing'), 'Current route-error test is missing the success-toast guard.');

const fe023Titles = [
  'a dirty dialog keeps the form value until the user confirms discard',
  'a customer lookup loads the next cursor page without dropping earlier choices',
  'delayed requests show loading and failed refresh keeps a retry path',
  'unsaved shop settings are preserved when navigation switches shop scope',
  'a saved shop form resets its dirty baseline and reports success',
];
for (const title of fe023Titles) {
  assert(readFrontend('tests/states/fe023.spec.ts').includes("test('FE023"), 'FE023 browser test source changed unexpectedly.');
  assert(browserText.split(title).length - 1 === 2, 'Current Chromium/Firefox result is missing: ' + title);
}
assert((browserText.match(/ROUTE_ROLE_MATRIX_CASES=357 ROLES=7 PRIVATE_ROUTES=51 RESULT=PASS/g) || []).length === 2, 'Current browser role matrix did not pass in both engines.');
assert((browserText.match(/ROUTE_EMPTY_COMPOSITION=11\/11 RESULT=PASS/g) || []).length === 2, 'Current empty composition did not pass in both engines.');
assert((browserText.match(/ROUTE_ERROR_COMPOSITION=51\/51 RESULT=PASS/g) || []).length === 2, 'Current route API-error composition did not pass in both engines.');
assert(fullE2EText.includes('512 passed (50.5m)') && fullE2EText.includes('EXIT_CODE=0'), 'Latest full-app E2E summary is not 512/512.');
assert(fullVerifyText.includes('EXIT_CODE=0') && /Tests\s+138 passed \(138\)/.test(fullVerifyText), 'Latest full verify summary is not passing.');

const roleEvidence = matrix.inputs.map(input => ({ path: input.path, sha256: input.sha256 }));
assert(roleEvidence.length === 3, 'Generated route-state matrix must bind unit, browser and role logs.');
for (const input of roleEvidence) {
  const file = path.resolve(frontendRoot, input.path);
  assert(fs.existsSync(file) && sha(fs.readFileSync(file)) === input.sha256, 'Route-state matrix input fingerprint differs: ' + input.path);
}
assert(matrixLogText.includes('Generated docs/route-state-role-matrix.json — 54 routes × 7 roles; 19 shared state cases evidenced.') && matrixLogText.includes('exitCode=0'), 'Current route-state matrix generator log is not passing.');

const gapNotes = [
  'Ứng dụng chỉ bật ngôn ngữ vi; 78 key đã đăng ký được test, nhưng điều này không khẳng định mọi chuỗi hard-coded đều đi qua i18next.',
  'Permission matrix chứng minh hành vi route phía frontend với mock/catalog, không chứng minh server RBAC.',
  'Shared-state test không chứng minh mọi biến thể trạng thái đã được chạy trực tiếp ở từng route; 65 ô được đánh dấu NOT_APPLICABLE theo contract và 0 ô NOT_TESTED.',
  'Không có screen-reader UAT, browser zoom thủ công, backend/provider thật, hosted CI hoặc owner acceptance trong phạm vi này.',
];

const sourcePaths = new Set([
  'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/KNOWN_GAPS.md',
  'package.json', 'package-lock.json', 'playwright.config.ts',
  'apps/web/src/app/i18n.ts', 'apps/web/src/app/dirty-drafts.ts', 'apps/web/src/app/Shell.tsx', 'apps/web/src/app/SessionProvider.tsx',
  'apps/web/src/shared/model/dirty-drafts.ts', 'apps/web/src/shared/ui/components.tsx',
  'apps/web/tests/components.test.tsx', 'apps/web/tests/states/fe023-state.test.tsx',
  'tests/states/fe023.spec.ts', 'tests/states/route-empty-composition.spec.ts',
  'tests/states/route-error-composition.spec.ts', 'tests/states/generate-route-state-roles.mjs',
  'tests/states/generate-fe023-evidence.mjs', 'tests/frontend.spec.ts', 'tests/route-role-matrix.spec.ts',
  'botsales-kit/execution/frontend-evidence/FE023/route-state-role-matrix-current-20261008-revalidated.json',
  'scripts/run-e2e.mjs', 'scripts/check-boundaries.mjs',
  'botsales-kit/AGENTS.md', 'botsales-kit/docs/02_ARCHITECTURE.md', 'botsales-kit/docs/06_API_AND_REALTIME.md',
  'botsales-kit/docs/04_SCREENS_AND_FLOWS.md', 'botsales-kit/docs/09_STATE_AND_DATA_ACCESS.md',
  'botsales-kit/docs/18_CODING_STANDARDS.md', 'botsales-kit/contracts/route-manifest.json',
  'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-evidence/FE023/handoff.md',
  'botsales-kit/execution/frontend-evidence/FE023/capture-current-evidence-20261008-revalidated.mjs',
  'botsales-kit/' + paths.unit, 'botsales-kit/' + paths.browser, 'botsales-kit/' + paths.matrixLog,
  'botsales-kit/' + paths.fullE2E, 'botsales-kit/' + paths.fullVerify,
]);

function addTree(relativeRoot) {
  const absoluteRoot = path.join(frontendRoot, relativeRoot);
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (/\.(ts|tsx|js|mjs|json|css)$/.test(entry.name)) sourcePaths.add(path.relative(frontendRoot, absolute).split(path.sep).join('/'));
    }
  };
  visit(absoluteRoot);
}
for (const directory of ['apps/web/src/app', 'apps/web/src/mocks', 'apps/web/src/modules', 'apps/web/src/shared']) addTree(directory);
for (const item of matrix.globalStateCases) sourcePaths.add(item.source);
for (const route of matrix.routes) {
  for (const state of Object.values(route.states)) {
    for (const item of state.evidence || []) {
      if (item.includes('#')) {
        const source = item.split('#')[0];
        if (source && !source.startsWith('../botsales-kit/')) sourcePaths.add(source);
      }
    }
  }
}

const sourceFiles = [...sourcePaths].sort().map(relative => {
  const absolute = relative.startsWith('botsales-kit/')
    ? path.join(kitRoot, relative.slice('botsales-kit/'.length))
    : path.join(frontendRoot, relative);
  assert(fs.existsSync(absolute) && fs.statSync(absolute).isFile(), 'Missing source/evidence file: ' + relative);
  return { path: relative, sha256: sha(fs.readFileSync(absolute)) };
});
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => item.path + ':' + item.sha256).sort().join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: frontendRoot, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: frontendRoot, encoding: 'utf8' }).trim();
const executedAt = new Date().toISOString();
const reviewer = 'Codex tự rà soát; không tuyên bố có peer review độc lập';

const summaries = {
  S01: {
    checks: 432 + 357 + 19,
    evidence: 'Đối chiếu route manifest, 7 role preset và test output; ma trận sinh từ log hiện tại gồm 432 ô route-state, 19 shared-state case PASS, 357 route-role case browser PASS. 65 ô NOT_APPLICABLE có lý do theo contract; không còn ô NOT_TESTED.',
  },
  S02: {
    checks: 19 + 51 + 11,
    evidence: '138/138 Vitest và browser route-error/empty composition đạt trên Chromium + Firefox. 51/51 route xử lý API read lỗi không biến thành success; 11/11 empty routes có accessible state; R33 được phân loại theo shop snapshot của Shell.',
  },
  S03: {
    checks: 5 + 4 + 3,
    evidence: 'Browser kiểm dirty dialog, shop navigation khi còn draft, reset baseline sau save, cursor lookup giữ lựa chọn cũ; unit kiểm 422 focus/giữ input, 412/428/404 recovery và unknown command state.',
  },
  S04: {
    checks: 138 + 36,
    evidence: 'Vitest verbose đạt 138/138; FE023 và route/state browser bundle đạt 36/36 (18 Chromium, 18 Firefox). FE023 riêng đạt 5/5 mỗi engine; route error 51/51, role 357/357, empty composition 11/11 mỗi engine.',
  },
  S05: {
    checks: 432 + 357 + 19 + requiredKeyCount,
    evidence: 'Coverage được sinh từ hash log Vitest/browser hiện tại. Ma trận 54 route × 7 role ghi rõ 432 state cell, 163 route-specific, 204 shared, 65 NOT_APPLICABLE, 0 NOT_TESTED; 19 global states và 78 Vietnamese keys có test evidence.',
  },
};

for (const step of task.implementationSteps) {
  const summary = summaries[step.id];
  assert(summary, 'Missing FE023 checkpoint summary: ' + step.id);
  const logPath = 'execution/frontend-evidence/FE023/' + step.id + '-current-20261008-revalidated.log';
  const evidencePath = 'execution/frontend-evidence/FE023/' + step.id + '-current-20261008-revalidated.json';
  const logText = [
    'FE023.' + step.id + ' — current states/forms/i18n verification.',
    'executedAt=' + executedAt,
    'cwd=' + frontendRoot,
    'commandId=' + (step.id === 'S01' ? unitCommand.id : e2eCommand.id),
    'registeredCommand=' + (step.id === 'S01' ? unitCommand.command : e2eCommand.command),
    'actualUnitInvocation=npm.cmd --script-shell=cmd.exe test -- --reporter=verbose; exit=0; tests=138',
    'unitLog=' + paths.unit + '; sha256=' + sha(Buffer.from(unitText)),
    'actualBrowserInvocation=npm.cmd --script-shell=cmd.exe run test:e2e -- tests/states/fe023.spec.ts tests/states/route-empty-composition.spec.ts tests/states/route-error-composition.spec.ts tests/route-role-matrix.spec.ts tests/frontend.spec.ts; exit=0; tests=36',
    'browserLog=' + paths.browser + '; sha256=' + sha(Buffer.from(browserText)),
    'matrixInvocation=node tests/states/generate-route-state-roles.mjs --unit-log <current-unit-log> --browser-log <current-browser-log> --role-log <current-browser-log>; exit=0',
    'matrixLog=' + paths.matrixLog + '; sha256=' + sha(Buffer.from(matrixLogText)),
    'generatedMatrix=botsales-kit/execution/frontend-evidence/FE023/route-state-role-matrix-current-20261008-revalidated.json',
    'matrixCounts=54 routes; 7 roles; 357 route-role cases; 19 global states; 432 route-state cells; 163 route-specific; 204 shared; 65 not applicable; 0 not tested',
    'translationKeys=' + requiredKeyCount + '; language=vi only',
    'CHECK: ' + summary.evidence,
    ...gapNotes.map(note => 'LIMIT: ' + note),
    'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; không xác nhận server RBAC/backend/provider/staging/production hoặc owner acceptance.',
    'reviewer=' + reviewer,
  ].join('\n') + '\n';
  const logBytes = Buffer.from(logText, 'utf8');
  fs.writeFileSync(path.join(evidenceDir, step.id + '-current-20261008-revalidated.log'), logBytes);
  const primaryCommand = step.id === 'S01' ? unitCommand : e2eCommand;
  const receipt = {
    taskId: 'FE023', stepId: step.id, kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
    sourceRevision: 'HEAD ' + revision + ' on ' + branch + ' plus current hashed working tree',
    expected: step.verification,
    observed: summary.evidence + ' Bằng chứng hiện tại: Vitest 138/138, browser 36/36, matrix 54×7, route-role 357/357; ' + gapNotes.join(' '),
    commandId: primaryCommand.id, command: primaryCommand.command, cwd: frontendRoot, reviewer,
    environment: { name: 'Windows / Node ' + process.versions.node + ' / Chromium + Firefox', details: 'React demo state/forms flows and deterministic MSW API; route and role browser assertions use synthetic fixtures.', dataSource: 'synthetic-msw' },
    checksTotal: summary.checks, failed: 0, logFile: logPath, logSha256: sha(logBytes),
    sourceFiles, sourceSnapshotSha256,
    commandResults: [
      { commandId: unitCommand.id, command: 'npm.cmd --script-shell=cmd.exe test -- --reporter=verbose', exitCode: 0, testsPassed: 138, filesPassed: 12, logFile: paths.unit, logSha256: sha(Buffer.from(unitText)) },
      { commandId: e2eCommand.id, command: 'npm.cmd --script-shell=cmd.exe run test:e2e -- tests/states/fe023.spec.ts tests/states/route-empty-composition.spec.ts tests/states/route-error-composition.spec.ts tests/route-role-matrix.spec.ts tests/frontend.spec.ts', exitCode: 0, testsPassed: 36, chromiumCases: 18, firefoxCases: 18, logFile: paths.browser, logSha256: sha(Buffer.from(browserText)) },
      { commandId: 'route-state-role-matrix', command: 'node tests/states/generate-route-state-roles.mjs --unit-log <unit-log> --browser-log <browser-log> --role-log <browser-log>', exitCode: 0, routes: 54, roles: 7, routeRoleCases: 357, globalStates: 19, stateCells: stateCounts, logFile: paths.matrixLog, logSha256: sha(Buffer.from(matrixLogText)) },
    ],
    audit: { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', routeIds: task.routeIds, featureIds: task.featureIds, operations: task.operationIds.length, routes: 54, roles: 7, stateCounts, requiredVietnameseKeys: requiredKeyCount },
    limitations: gapNotes,
  };
  fs.writeFileSync(path.join(evidenceDir, step.id + '-current-20261008-revalidated.json'), JSON.stringify(receipt, null, 2) + '\n', 'utf8');
}

console.log(JSON.stringify({
  result: 'PASS', task: 'FE023', unit: '138/138', browser: '36/36', engines: { chromium: 18, firefox: 18 },
  routes: 54, roles: 7, routeRoleCases: 357, globalStates: 19, routeStateCells: stateCounts,
  translationKeys: requiredKeyCount, sourceFiles: sourceFiles.length, sourceSnapshotSha256,
  receipts: task.implementationSteps.map(step => step.id + '-current-20261008-revalidated.json'),
}, null, 2));
