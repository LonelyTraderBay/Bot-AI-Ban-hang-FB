import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE022');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const readFrontend = relative => fs.readFileSync(path.join(frontendRoot, relative), 'utf8');
const readKit = relative => fs.readFileSync(path.join(kitRoot, relative), 'utf8');
const jsonFrontend = relative => JSON.parse(readFrontend(relative));
const jsonKit = relative => JSON.parse(readKit(relative));

assert(path.basename(frontendRoot) === 'BotSalesAI_Frontend', 'Run this evidence capture from the Frontend workspace.');

const evidence = {
  fullE2E: 'execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log',
  fullVerify: 'execution/frontend-evidence/FE001/S03-full-verify-powershell-current-20261008.log',
  sourceLog: 'execution/frontend-evidence/FE005/S01-source-check-current-20261008.log',
  sourceReport: 'execution/frontend-evidence/FE005/S01-source-check-report-current-20261008.json',
  routeMatrixLog: 'execution/frontend-evidence/FE022/S01-route-matrix-current-20261008.log',
  priorDetailedE2E: 'execution/frontend-evidence/FE009/S02-e2e-current-20261007.log',
  focusedE2E: 'execution/frontend-evidence/FE022/S04-focused-vertical-slices-current-20261008-revalidated.log',
};

const plan = jsonKit('execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE022');
const routeManifest = jsonKit('contracts/route-manifest.json');
const featureCatalog = jsonKit('contracts/feature-catalog.json');
const operationIndex = jsonFrontend('packages/contracts/src/operations.json');
const matrix = jsonFrontend('docs/route-implementation.json');
const commandMap = jsonKit('execution/frontend-command-map.json');
const commands = Object.fromEntries(['e2e', 'verify-current-20261002', 'source'].map(id => {
  const command = commandMap.commands.find(item => item.id === id);
  assert(command && command.status === 'VERIFIED_AVAILABLE', 'Required command is not verified available: ' + id);
  return [id, command];
}));

assert(task && task.implementationSteps.length === 5, 'Canonical FE022 S01-S05 task is required.');
assert(task.routeIds.length === 54 && routeManifest.routes.length === 54, 'FE022 must cover the 54-route manifest.');
assert(task.featureIds.length === 64 && featureCatalog.features.length === 64, 'FE022 must cover the 64-feature catalog.');
assert(task.operationIds.length === 189, 'Expected 189 FE022 route operations.');

const routeById = new Map(routeManifest.routes.map(route => [route.id, route]));
const featureById = new Map(featureCatalog.features.map(feature => [feature.id, feature]));
const routeOperationIds = [...new Set(routeManifest.routes.flatMap(route => [
  ...(route.readOperations || []),
  ...(route.actions || []).map(action => action.operationId).filter(Boolean),
]))].sort();
assert(JSON.stringify(routeOperationIds) === JSON.stringify([...task.operationIds].sort()), 'FE022 operation IDs differ from the route read/action union.');
assert(task.operationIds.every(id => Object.hasOwn(operationIndex, id)), 'FE022 references an operation missing from the generated contract package.');
assert(task.routeIds.every(id => routeById.has(id)), 'FE022 references a missing canonical route.');
assert(task.featureIds.every(id => featureById.has(id)), 'FE022 references a missing canonical feature.');

const catalogPairs = featureCatalog.features.flatMap(feature => feature.routeIds.map(routeId => ({ routeId, featureId: feature.id })));
assert(catalogPairs.length === 65, 'Expected 65 canonical feature-route pairs.');
assert(catalogPairs.every(pair => routeById.has(pair.routeId)), 'Feature catalog references a missing route.');

const manifestPairs = new Set(routeManifest.routes.flatMap(route => (route.featureIds || []).map(featureId => route.id + '|' + featureId)));
const missingManifestPairs = catalogPairs.filter(pair => !manifestPairs.has(pair.routeId + '|' + pair.featureId));
assert(missingManifestPairs.length === 16, 'Route-manifest featureIds mismatch changed; re-review instead of silently carrying it forward.');
const manifestFeaturePairCount = manifestPairs.size;
assert(manifestFeaturePairCount === 49, 'Expected 49 route-manifest featureIds links before contract-owner resolution.');

assert(matrix.length === 54 && new Set(matrix.map(route => route.routeId)).size === 54, 'Generated route matrix does not contain 54 unique routes.');
for (const route of routeManifest.routes) {
  const row = matrix.find(item => item.routeId === route.id);
  const expectedFeatureIds = featureCatalog.features.filter(feature => feature.routeIds.includes(route.id)).map(feature => feature.id).sort();
  const actualFeatureIds = (row?.featureCoverage || []).map(feature => feature.featureId).sort();
  assert(row && row.route === route.path && row.state === 'BROWSER_ROUTE_RENDERED_WITH_SYNTHETIC_API', 'Route matrix is missing/stale: ' + route.id);
  assert(JSON.stringify(actualFeatureIds) === JSON.stringify(expectedFeatureIds), 'Feature-catalog mapping differs in the generated matrix: ' + route.id);
  for (const feature of row.featureCoverage) {
    assert(feature.coverage === 'FRONTEND_INTERACTION_VERIFIED_SYNTHETIC', 'Feature lacks direct synthetic UI evidence: ' + feature.featureId);
    assert(feature.gap.trim().length > 20 && feature.evidenceCases.length > 0, 'Feature evidence boundary is missing: ' + feature.featureId);
  }
}
assert(new Set(matrix.flatMap(route => route.featureCoverage.map(feature => feature.featureId))).size === 64, 'Generated matrix misses a feature.');

const fullE2E = readKit(evidence.fullE2E);
const fullVerify = readKit(evidence.fullVerify);
const sourceText = readKit(evidence.sourceLog);
const sourceReport = jsonKit(evidence.sourceReport);
const routeMatrixText = readKit(evidence.routeMatrixLog);
const priorDetailedE2E = readKit(evidence.priorDetailedE2E);
const focusedE2E = readKit(evidence.focusedE2E);
const flowSource = readFrontend('tests/vertical-slices/fe022-flows.spec.ts');

assert(/512 passed \(50\.5m\)/.test(fullE2E) && fullE2E.includes('Chromium 256/256') && fullE2E.includes('Firefox 256/256') && fullE2E.includes('EXIT_CODE=0'), 'Latest full browser session summary is not a 512/512 pass.');
assert(fullE2E.includes('FE022 four vertical slices and matrix test passed on both engines.'), 'Latest full browser run does not confirm the FE022 cases.');
assert(fullVerify.includes('EXIT_CODE=0') && /Tests\s+138 passed \(138\)/.test(fullVerify) && /"passed":\s*88/.test(fullVerify), 'Latest full verify run is missing unit or domain/network success.');
assert(sourceReport.status === 'PASS' && sourceReport.files === 68 && sourceReport.routes === 54 && sourceReport.operationCalls === 220, 'Source-check report is not the observed 68/54/220 PASS.');
assert(sourceText.includes('Exit: 0') && sourceText.includes('"status": "PASS"'), 'Source-check log is not passing.');
assert(routeMatrixText.includes('"status":"PASS"') && routeMatrixText.includes('"routes":54') && routeMatrixText.includes('"uniqueFeatures":64'), 'Route matrix generator output is not passing.');
assert(/512 passed \([^)]+\)/.test(priorDetailedE2E) && priorDetailedE2E.includes('all canonical routes render inside the real React demo application'), 'Detailed route/test-name index is unavailable.');
assert(/10 passed \([^)]+\)/.test(focusedE2E) && focusedE2E.includes('EXIT_CODE=0'), 'Current focused FE022 browser run is not 10/10.');

const flowNames = [
  'FE022.VS01 catalog → stock → order → prep keeps product, reservation, and order references linked',
  'FE022.VS02 procurement → approval → receipt → stock and payable preserves the purchase identity',
  'FE022.VS03 finance → reconciliation retains bank transaction and partial debt allocation',
  'FE022.VS04 inbox → knowledge draft → bot evaluation preserves feedback and revision source IDs',
  'FE022.S05 route and feature matrix covers canonical IDs with executed cases or explicit frontend gaps',
];
for (const title of flowNames) {
  assert(flowSource.includes("test('" + title + "'"), 'FE022 test source misses: ' + title);
  assert(focusedE2E.split(title).length - 1 === 2, 'Current Chromium/Firefox run does not contain exactly two results for: ' + title);
}
const browserLines = focusedE2E.split(/\r?\n/).filter(line => /tests\\vertical-slices\\fe022-flows\.spec\.ts/.test(line));
assert(browserLines.filter(line => line.includes('[chromium]')).length === 5, 'Expected 5 FE022 Chromium cases.');
assert(browserLines.filter(line => line.includes('[firefox]')).length === 5, 'Expected 5 FE022 Firefox cases.');

const gapList = missingManifestPairs.map(pair => pair.routeId + ':' + pair.featureId).sort();
const gapText = 'Contract trace gap (not a UI PASS): feature-catalog.json contains 65 route-feature links, while route-manifest.json contains 49 featureIds links; the 16 absent pairs are ' + gapList.join(', ') + '. The route matrix uses feature-catalog routeIds, validates every referenced route and executed UI case, and does not establish that the two source contracts agree. Contract data remains unchanged pending owner confirmation of featureIds semantics.';

const sourcePaths = new Set([
  'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/KNOWN_GAPS.md',
  'package.json', 'package-lock.json', 'playwright.config.ts',
  'packages/contracts/src/operations.json', 'packages/contracts/src/routes.json', 'packages/contracts/src/schemas.json',
  'scripts/run-e2e.mjs', 'scripts/check-source.mjs', 'scripts/check-boundaries.mjs', 'scripts/generate.mjs',
  'tests/frontend.spec.ts', 'tests/vertical-slices/fe022-flows.spec.ts',
  'tests/vertical-slices/generate-route-implementation.mjs',
  'docs/route-implementation.json',
  'botsales-kit/AGENTS.md', 'botsales-kit/docs/02_ARCHITECTURE.md', 'botsales-kit/docs/06_API_AND_REALTIME.md',
  'botsales-kit/docs/17_TRACEABILITY.md', 'botsales-kit/docs/18_CODING_STANDARDS.md',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/feature-catalog.json',
  'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/permission-catalog.json',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-evidence/FE022/handoff.md',
  'botsales-kit/execution/frontend-evidence/FE022/capture-current-evidence-20261008-revalidated.mjs',
  'botsales-kit/' + evidence.fullE2E,
  'botsales-kit/' + evidence.fullVerify,
  'botsales-kit/' + evidence.sourceLog,
  'botsales-kit/' + evidence.sourceReport,
  'botsales-kit/' + evidence.routeMatrixLog,
  'botsales-kit/' + evidence.priorDetailedE2E,
  'botsales-kit/' + evidence.focusedE2E,
]);

function addTree(relativeRoot) {
  const absoluteRoot = path.join(frontendRoot, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return;
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (/\.(ts|tsx|js|mjs|json|css)$/.test(entry.name)) sourcePaths.add(path.relative(frontendRoot, absolute).split(path.sep).join('/'));
    }
  };
  visit(absoluteRoot);
}
addTree('apps/web/src/app');
addTree('apps/web/src/mocks');
addTree('apps/web/src/modules');
addTree('apps/web/src/shared');

for (const route of matrix) {
  sourcePaths.add(route.routeEvidence.testFile);
  for (const feature of route.featureCoverage) {
    for (const item of feature.evidenceCases) {
      sourcePaths.add(item.file);
      const absolute = path.resolve(frontendRoot, item.logFile);
      if (absolute.startsWith(kitRoot + path.sep)) sourcePaths.add('botsales-kit/' + path.relative(kitRoot, absolute).split(path.sep).join('/'));
      else if (absolute.startsWith(frontendRoot + path.sep)) sourcePaths.add(path.relative(frontendRoot, absolute).split(path.sep).join('/'));
      else throw new Error('Evidence log escapes both approved workspaces: ' + item.logFile);
    }
  }
}

const sourceFiles = [...sourcePaths].sort().map(relative => {
  const absolute = relative.startsWith('botsales-kit/')
    ? path.join(kitRoot, relative.slice('botsales-kit/'.length))
    : path.join(frontendRoot, relative);
  assert(fs.existsSync(absolute) && fs.statSync(absolute).isFile(), 'Missing hashed source/evidence: ' + relative);
  return { path: relative, sha256: sha(fs.readFileSync(absolute)) };
});
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => item.path + ':' + item.sha256).sort().join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: frontendRoot, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: frontendRoot, encoding: 'utf8' }).trim();
const reviewer = 'Codex tự rà soát; không tuyên bố đã có peer review độc lập';
const executedAt = new Date().toISOString();
const stepData = {
  S01: {
    checksTotal: 372,
    cases: ['54 route, 64 feature, 65 feature-route pairs và 189 operation IDs được đối chiếu với canonical sources.', gapText],
  },
  S02: {
    checksTotal: 14,
    cases: ['Bốn luồng ghép UI qua app navigation và synthetic mock HTTP chạy trong hai trình duyệt (8 lần journey).', 'Full verify đạt boundary/typecheck/build gates; frontend module không được ghi nhận import chéo module trong lần kiểm này.'],
  },
  S03: {
    checksTotal: 8,
    cases: ['VS01 kiểm reservation trước/sau, order line ol-1001 và prep job cùng tham chiếu.', 'VS02 giữ purchaseId qua approval, receipt, stock và payable; VS03 giữ bank transaction và phần công nợ còn lại; VS04 nối feedback, knowledge draft/revision và evaluation.'],
  },
  S04: {
    checksTotal: 522,
    cases: ['FE022 chạy 10/10 browser cases, gồm 5 scenario trên Chromium và 5 trên Firefox; full app E2E đạt 512/512.', 'Hai luồng partial receipt và partial debt allocation được chạy trực tiếp; replay/version/forbidden/unknown cases được kiểm ở các FE module suite phụ thuộc và trong full E2E. Mỗi loại lỗi không được suy rộng thành đã lặp lại trên từng luồng ghép.'],
  },
  S05: {
    checksTotal: 183,
    cases: ['Ma trận 54 route / 64 feature / 65 feature-route entries được generator và browser assertion kiểm tra; mọi feature có source test, run record và gap synthetic/backend riêng.', 'acceptanceScenarioIds là liên kết về route contract; kết quả ở đây chứng minh tương tác feature UI đã chạy, không chứng minh từng backend acceptance scenario hoặc live integration. ' + gapText],
  },
};

for (const step of task.implementationSteps) {
  const detail = stepData[step.id];
  assert(detail, 'Missing FE022 checkpoint summary: ' + step.id);
  const logPath = 'execution/frontend-evidence/FE022/' + step.id + '-current-20261008-revalidated.log';
  const evidencePath = 'execution/frontend-evidence/FE022/' + step.id + '-current-20261008-revalidated.json';
  const logText = [
    'FE022.' + step.id + ' — xác minh hiện tại trên mã nguồn frontend.',
    'executedAt=' + executedAt,
    'cwd=' + frontendRoot,
    'commandId=' + commands.e2e.id,
    'registeredCommand=' + commands.e2e.command,
    'fullE2E=' + evidence.fullE2E,
    'fullE2E_sha256=' + sha(Buffer.from(fullE2E)),
    'focusedCommand=npm.cmd --script-shell=cmd.exe run test:e2e -- tests/vertical-slices/fe022-flows.spec.ts',
    'focusedLog=' + evidence.focusedE2E,
    'focusedLog_sha256=' + sha(Buffer.from(focusedE2E)),
    'focusedObserved=10 passed; Chromium=5; Firefox=5; EXIT_CODE=0',
    'fullObserved=512 passed; Chromium=256; Firefox=256; EXIT_CODE=0',
    'verifyObserved=unit 138/138; domain/network 88/88; source 68 files/54 routes/220 calls; build/typecheck pass; EXIT_CODE=0',
    'routeMatrixObserved=54 routes; 64 feature IDs; 65 feature-route pairs; 189 operations; all 65 entries have direct synthetic UI evidence.',
    'routeManifestFeaturePairs=' + manifestFeaturePairCount + '/65; missing=' + gapList.join(', '),
    ...detail.cases.map(line => 'CHECK: ' + line),
    'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; không xác nhận backend/provider thật, staging, production hoặc owner acceptance.',
    'reviewer=' + reviewer,
  ].join('\n') + '\n';
  const logBytes = Buffer.from(logText, 'utf8');
  fs.writeFileSync(path.join(evidenceDir, step.id + '-current-20261008-revalidated.log'), logBytes);
  const observed = detail.cases.join(' ');
  const receipt = {
    taskId: 'FE022', stepId: step.id, kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
    sourceRevision: 'HEAD ' + revision + ' on ' + branch + ' plus the hashed working tree',
    expected: step.verification,
    observed: observed + ' Bằng chứng E2E hiện tại: FE022=10/10, full app=512/512, unit=138/138, domain/network=88/88; ' + gapText,
    commandId: commands.e2e.id, command: commands.e2e.command, cwd: frontendRoot, reviewer,
    environment: { name: 'Windows / Node ' + process.versions.node + ' / Chromium + Firefox', details: 'React demo app với deterministic MSW; browser requests và state transitions được kiểm trong 2 engine, không có live backend.', dataSource: 'synthetic-msw' },
    checksTotal: detail.checksTotal, failed: 0,
    logFile: logPath, logSha256: sha(logBytes), sourceFiles, sourceSnapshotSha256,
    commandResults: [
      { commandId: commands.e2e.id, command: commands.e2e.command, exitCode: 0, testsPassed: 512, chromium: 256, firefox: 256, logFile: evidence.fullE2E, logSha256: sha(Buffer.from(fullE2E)) },
      { commandId: commands.e2e.id, command: 'npm.cmd --script-shell=cmd.exe run test:e2e -- tests/vertical-slices/fe022-flows.spec.ts', exitCode: 0, testsPassed: 10, chromium: 5, firefox: 5, logFile: evidence.focusedE2E, logSha256: sha(Buffer.from(focusedE2E)) },
      { commandId: commands['verify-current-20261002'].id, command: commands['verify-current-20261002'].command, exitCode: 0, unitTestsPassed: 138, domainNetworkPassed: 88, logFile: evidence.fullVerify, logSha256: sha(Buffer.from(fullVerify)) },
      { commandId: commands.source.id, command: commands.source.command, exitCode: 0, sourceFiles: 68, routes: 54, operationCalls: 220, logFile: evidence.sourceLog, logSha256: sha(Buffer.from(sourceText)) },
      { commandId: 'route-feature-matrix', command: 'node tests/vertical-slices/generate-route-implementation.mjs ../botsales-kit/' + evidence.priorDetailedE2E, exitCode: 0, routes: 54, features: 64, logFile: evidence.routeMatrixLog, logSha256: sha(Buffer.from(routeMatrixText)) },
    ],
    limitations: [
      'Cross-module results are deterministic synthetic fixtures; they do not prove a live transactional backend, provider, server RBAC or SSE integration.',
      'The 16 route-manifest featureIds omissions are reported in the evidence and handoff; no contract mapping was invented or silently marked consistent.',
      'Route acceptance scenario IDs remain canonical traceability links; this run does not certify each backend acceptance scenario.',
    ],
  };
  fs.writeFileSync(path.join(evidenceDir, step.id + '-current-20261008-revalidated.json'), JSON.stringify(receipt, null, 2) + '\n', 'utf8');
}

console.log(JSON.stringify({
  result: 'PASS', task: 'FE022', routes: 54, features: 64, featureRoutePairs: 65,
  routeOperations: 189, routeManifestFeatureIdPairs: manifestFeaturePairCount,
  missingRouteManifestPairs: gapList, fullE2E: '512/512', focusedFE022: '10/10',
  unit: '138/138', domainNetwork: '88/88', source: '68 files/220 calls/54 routes',
  sourceFiles: sourceFiles.length, sourceSnapshotSha256,
  receipts: task.implementationSteps.map(step => step.id + '-current-20261008-revalidated.json'),
}, null, 2));
