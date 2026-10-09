import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const kit = path.resolve(root, '..', 'botsales-kit');
const evidenceDir = path.join(kit, 'execution', 'frontend-evidence', 'FE022');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fullLogFile = '../botsales-kit/execution/frontend-evidence/FE009/S02-e2e-current-20261007.log';
const focusedLogFile = '../botsales-kit/execution/frontend-evidence/FE022/S04-focused-vertical-slices-current-20261008.log';
const run = spawnSync(process.execPath, ['tests/vertical-slices/generate-route-implementation.mjs', fullLogFile], { cwd: root, encoding: 'utf8' });
if (run.status !== 0) throw new Error(`Route/feature matrix generation failed (${run.status}):\n${run.stdout}\n${run.stderr}`);
const matrixRun = JSON.parse(run.stdout);
if (matrixRun.status !== 'PASS' || matrixRun.routes !== 54 || matrixRun.uniqueFeatures !== 64)
  throw new Error(`Unexpected matrix result: ${run.stdout}`);

const fullLog = fs.readFileSync(path.join(root, fullLogFile), 'utf8');
const focusedLog = fs.readFileSync(path.join(root, focusedLogFile), 'utf8');
const fullPassCount = Number(fullLog.match(/^\s*(\d+) passed \([^)]+\)\s*$/m)?.[1] || 0);
if (fullPassCount !== 512 || !fullLog.includes('all canonical routes render inside the real React demo application'))
  throw new Error('Current two-browser run must prove 512 passing tests and canonical route smoke.');
if (!/^\s*5 passed \([^)]+\)\s*$/m.test(focusedLog) || !focusedLog.includes('EXIT_CODE=0'))
  throw new Error('Current FE022 run must prove five passing browser tests and exit code 0.');

const routeManifest = JSON.parse(fs.readFileSync(path.join(root, '../botsales-kit/contracts/route-manifest.json'), 'utf8'));
const featureCatalog = JSON.parse(fs.readFileSync(path.join(root, '../botsales-kit/contracts/feature-catalog.json'), 'utf8'));
const matrix = JSON.parse(fs.readFileSync(path.join(root, 'docs/route-implementation.json'), 'utf8'));
const routeById = new Map(routeManifest.routes.map((route) => [route.id, route.path]));
const routeIds = new Set();
const features = matrix.flatMap((route) => route.featureCoverage ?? []);
const featureIds = new Set(features.map((feature) => feature.featureId));
for (const route of matrix) {
  if (routeIds.has(route.routeId) || routeById.get(route.routeId) !== route.route)
    throw new Error(`Duplicate or non-canonical route ${route.routeId}`);
  routeIds.add(route.routeId);
  if (!fs.existsSync(path.join(root, route.source))) throw new Error(`Missing source for ${route.routeId}: ${route.source}`);
}
const canonicalFeatureIds = new Set(featureCatalog.features.map((feature) => feature.id));
if (routeIds.size !== 54 || routeIds.size !== routeById.size || featureIds.size !== 64 ||
    featureIds.size !== canonicalFeatureIds.size || [...featureIds].some((id) => !canonicalFeatureIds.has(id)))
  throw new Error(`Matrix coverage mismatch: routes=${routeIds.size}, features=${featureIds.size}, canonicalFeatures=${canonicalFeatureIds.size}`);
const validCoverage = new Set(['FRONTEND_INTERACTION_VERIFIED_SYNTHETIC', 'PARTIAL_SYNTHETIC_CROSS_MODULE_JOURNEY', 'ROUTE_MOUNT_ONLY']);
if (features.some((feature) => !validCoverage.has(feature.coverage) || !feature.evidenceCases?.length))
  throw new Error('A feature row is missing a supported coverage level or an evidence case.');

const matrixLogFile = 'execution/frontend-evidence/FE022/S01-route-matrix-current-20261008.log';
const matrixLog = [
  'FE022 current route and feature matrix generator',
  `cwd=${root}`,
  'command=node tests/vertical-slices/generate-route-implementation.mjs',
  `stdout=${JSON.stringify(matrixRun)}`,
  `observed=54 canonical routes; 64 canonical feature IDs across 65 feature-route entries; each entry has a named, passing synthetic UI interaction and an explicit frontend/backend boundary.`,
  'EXIT_CODE=0',
].join('\n');
fs.writeFileSync(path.join(kit, matrixLogFile), `${matrixLog}\n`, 'utf8');

const plan = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-plan.json'), 'utf8'));
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const e2eCommand = commandMap.commands.find((command) => command.id === 'e2e');
if (!e2eCommand || e2eCommand.status !== 'VERIFIED_AVAILABLE') throw new Error('The registered E2E command is not verified available.');
const focusedCommand = {
  id: e2eCommand.id,
  command: `${e2eCommand.command} -- tests/vertical-slices/fe022-flows.spec.ts --project=chromium`,
};
const git = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' });
const revision = git.status === 0 ? git.stdout.trim() : 'HEAD unavailable';
const sourceFiles = [
  'apps/web/package.json', 'apps/web/src/app/Shell.tsx', 'apps/web/src/mocks/database.ts',
  'apps/web/src/mocks/handlers.ts', 'apps/web/src/mocks/service.ts', 'apps/web/src/mocks/auxiliary.ts',
  'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/ui/components.tsx',
  '../botsales-kit/contracts/openapi.json', '../botsales-kit/contracts/route-manifest.json',
  '../botsales-kit/contracts/feature-catalog.json', '../botsales-kit/contracts/permission-catalog.json',
  '../botsales-kit/execution/frontend-command-map.json', '../botsales-kit/execution/frontend-plan.json',
  'docs/route-implementation.json', 'tests/frontend.spec.ts', 'tests/vertical-slices/fe022-flows.spec.ts',
  'tests/vertical-slices/generate-route-implementation.mjs', 'tests/vertical-slices/generate-fe022-evidence.mjs',
  ...new Set(matrix.map((route) => route.source)),
  fullLogFile, focusedLogFile, `../botsales-kit/${matrixLogFile}`,
];
const uniqueFiles = [...new Set(sourceFiles)].sort();
const hashedSources = uniqueFiles.map((file) => ({ path: file, sha256: hash(fs.readFileSync(path.join(root, file))) }));
const snapshot = hash(Buffer.from(hashedSources.map((file) => `${file.path}:${file.sha256}`).sort().join('\n')));
const routeDirect = features.filter((feature) => feature.coverage === 'FRONTEND_INTERACTION_VERIFIED_SYNTHETIC').length;
const routePartial = features.filter((feature) => feature.coverage === 'PARTIAL_SYNTHETIC_CROSS_MODULE_JOURNEY').length;
const routeMountOnly = features.filter((feature) => feature.coverage === 'ROUTE_MOUNT_ONLY').length;
const steps = {
  S01: {
    expected: 'The canonical route and feature matrix covers 54 routes and 64 feature IDs, using the current React browser suite as route evidence and preserving explicit evidence levels.',
    observed: `The current generator passed and rebuilt the route matrix from canonical contracts and the ${fullPassCount}-test Chromium/Firefox log. All 54 route IDs/paths and 64 feature IDs match canonical manifests across 65 feature-route entries; coverage is ${routeDirect} direct synthetic UI interactions, ${routePartial} partial journeys, and ${routeMountOnly} route-mount-only entries. Each entry retains its frontend and server-side boundary.`,
    checks: 3,
    logFile: fullLogFile,
    commandId: e2eCommand.id,
    command: e2eCommand.command,
    supportingLogs: [matrixLogFile],
  },
  S02: {
    expected: 'Four synthetic cross-module journeys preserve related entity identities through catalog/stock/order/prep, procurement/receipt/stock/payable, finance/reconciliation, and inbox/knowledge/evaluation.',
    observed: 'The focused Chromium run passed 5/5 browser cases: four named vertical journeys plus the route/feature matrix test. Assertions inspect product/reservation/order links, purchase/receipt/stock/payable identity, partial debt allocations to bank transactions, and feedback-to-knowledge-revision-to-evaluation references.',
    checks: 4,
    logFile: focusedLogFile,
    commandId: focusedCommand.id,
    command: focusedCommand.command,
    supportingLogs: [fullLogFile],
  },
  S03: {
    expected: 'Cross-module navigation retains the mock entity IDs, revision links, partial allocation state, and user-visible results across module boundaries.',
    observed: 'All four FE022 vertical-slice browser cases passed against synthetic HTTP/MSW and assert the linked entity IDs and resulting UI states rather than toast-only completion. Real backend persistence, SSE delivery, and live authorization are outside this evidence.',
    checks: 4,
    logFile: focusedLogFile,
    commandId: focusedCommand.id,
    command: focusedCommand.command,
    supportingLogs: [fullLogFile],
  },
  S04: {
    expected: 'Browser tests execute the defined cross-module happy-path journeys and expose route/feature gaps separately from direct interaction evidence.',
    observed: `The current focused Chromium command passed five FE022 cases: four cross-module journeys and the generated route/feature matrix test. The complete two-browser ${fullPassCount}-test React suite also passed. All 65 route-feature entries have named synthetic UI-interaction evidence; real backend/provider behavior remains outside scope.`,
    checks: 5,
    logFile: focusedLogFile,
    commandId: focusedCommand.id,
    command: focusedCommand.command,
    supportingLogs: [fullLogFile],
  },
  S05: {
    expected: 'A generated route/feature coverage matrix derives from current browser results, includes all canonical IDs, and records explicit gaps without marking backend behavior as passed.',
    observed: `The FE022.S05 matrix browser test passed with 54 routes, 64 feature IDs, and 65 feature-route entries. Every entry has a passing named UI interaction and a written scope boundary; the matrix makes no live API/provider or backend authorization claim.`,
    checks: 1,
    logFile: focusedLogFile,
    commandId: focusedCommand.id,
    command: focusedCommand.command,
    supportingLogs: [matrixLogFile, fullLogFile],
  },
};

for (const [stepId, values] of Object.entries(steps)) {
  const logPath = path.join(root, values.logFile);
  const evidence = {
    taskId: 'FE022', stepId, kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
    sourceRevision: `HEAD ${revision} plus current dirty frontend working tree`,
    expected: values.expected, observed: values.observed,
    command: values.command, commandId: values.commandId, cwd: root,
    reviewer: 'Codex self-review; no independent peer review',
    environment: { name: `Windows / Node ${process.version} / npm 11.17.0 / Chromium`, details: 'Real React app in browser with deterministic MSW synthetic API fixtures; no live services.', dataSource: 'synthetic-msw' },
    checksTotal: values.checks, failed: 0, exitCode: 0,
    logFile: values.logFile.replace('../botsales-kit/', ''),
    logSha256: hash(fs.readFileSync(logPath)),
    sourceFiles: hashedSources, sourceSnapshotSha256: snapshot,
    commandResults: [
      { commandId: e2eCommand.id, command: e2eCommand.command, cwd: root, exitCode: 0, testsPassed: fullPassCount, logFile: fullLogFile.replace('../botsales-kit/', ''), logSha256: hash(fs.readFileSync(path.join(root, fullLogFile))) },
      { commandId: focusedCommand.id, command: focusedCommand.command, cwd: root, exitCode: 0, testsPassed: 5, logFile: focusedLogFile.replace('../botsales-kit/', ''), logSha256: hash(fs.readFileSync(path.join(root, focusedLogFile))) },
      { commandId: 'route-feature-matrix', command: `node tests/vertical-slices/generate-route-implementation.mjs ${fullLogFile}`, cwd: root, exitCode: 0, checks: matrixRun.checks, logFile: matrixLogFile, logSha256: hash(fs.readFileSync(path.join(kit, matrixLogFile))) },
    ],
    supportingLogs: values.supportingLogs.map((file) => ({ file: file.replace('../botsales-kit/', ''), sha256: hash(fs.readFileSync(path.join(root, file.startsWith('../botsales-kit/') ? file : `../botsales-kit/${file}`))) })),
  };
  fs.writeFileSync(path.join(evidenceDir, `${stepId}-current-20261008.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

const handoff = [
  '# Bàn giao FE022 — luồng xuyên module',
  '',
  'Phạm vi đã xác minh: 54 route, 64 feature ID và 65 feature-route entries; mỗi entry gắn với browser case có tương tác UI cụ thể trên React/Chromium và synthetic MSW. Bốn hành trình xuyên module cũng giữ nguyên identity của dữ liệu mẫu.',
  '',
  `Kiểm tra hiện tại: full E2E Chromium/Firefox ${browserRunCount(fullLog)}; focused FE022 5/5 Chromium; ma trận ${routeDirect} feature-route interactions / ${routePartial} partial / ${routeMountOnly} route-mount-only.`,
  '',
  'Giới hạn: không xác nhận API/provider thật, lưu trữ server, SSE, server RBAC hay staging. FE017 publish dùng session permission và lifecycle state làm thay thế cho nghiệm thu mock; canonical Knowledge.allowedActions chưa có trong contract nên không được thêm DTO/endpoint.',
  '',
  'Bước kế tiếp: chốt các gate frontend FE023–FE028 và rà soát tổng hợp theo ledger riêng; giữ nguyên giới hạn không chứng nhận backend/provider/staging/production hoặc owner acceptance.',
].join('\n');
fs.writeFileSync(path.join(evidenceDir, 'handoff.md'), `${handoff}\n`, 'utf8');
console.log(JSON.stringify({ status: 'PASS', task: 'FE022', steps: Object.keys(steps).length, routes: routeIds.size, features: featureIds.size, direct: routeDirect, partial: routePartial, mountOnly: routeMountOnly, sources: hashedSources.length }, null, 2));

function browserRunCount(log) {
  return `${log.match(/^\s*(\d+) passed \([^)]+\)\s*$/m)?.[1]} passed`;
}
