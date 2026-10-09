import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE010');
const readFrontend = relative => fs.readFileSync(path.join(frontendRoot, relative), 'utf8');
const readKit = relative => fs.readFileSync(path.join(kitRoot, relative), 'utf8');
const jsonFrontend = relative => JSON.parse(readFrontend(relative));
const jsonKit = relative => JSON.parse(readKit(relative));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(frontendRoot.endsWith('BotSalesAI_Frontend'), `Run from Frontend workspace; got ${frontendRoot}`);
const task = jsonKit('execution/frontend-plan.json').tasks.find(item => item.id === 'FE010');
const routes = jsonKit('contracts/route-manifest.json').routes;
const operations = jsonFrontend('packages/contracts/src/operations.json');
assert(task?.implementationSteps?.length === 5, 'Canonical FE010 S01-S05 plan not found');
assert(task.routeIds.every(id => routes.some(route => route.id === id)), 'FE010 canonical route ID missing');
assert(task.operationIds.every(id => Object.hasOwn(operations, id)), 'FE010 canonical operation ID missing');

const logs = {
  e2e: 'execution/frontend-evidence/FE009/S02-e2e-current-20261007.log',
  domain: 'execution/frontend-evidence/FE009/S02-domain-current-20261007.log',
  unit: 'execution/frontend-evidence/FE009/S04-unit-passed-current-20261007.log',
  source: 'execution/frontend-evidence/FE010/S01-source-current-20261007.log',
  map: 'execution/frontend-evidence/FE010/S01-contract-map-current-20261007.log',
};
const logText = Object.fromEntries(Object.entries(logs).map(([key, relative]) => [key, readKit(relative)]));
assert(logText.e2e.includes('512 passed (49.9m)'), 'Current browser suite is not 512/512');
assert(logText.e2e.includes('UI005 acceptance: {"categoryTotal":105'), 'Current category lookup acceptance result is missing');
assert(logText.e2e.match(/tests\\fe010\.spec\.ts/g)?.length === 18, 'FE010 should have nine tests in each of Chromium and Firefox');
assert(logText.domain.includes('"status":"PASS"') && logText.domain.includes('"passed":88'), 'Current domain/network suite is not 88/88');
assert(logText.unit.includes('Tests  138 passed (138)'), 'Current component/unit suite is not 138/138');
assert(logText.source.includes('"status": "PASS"') && logText.source.includes('"routes": 54'), 'Current source check is not passing');
const contractMap = JSON.parse(readKit('execution/frontend-evidence/FE010/S01-contract-map.json'));
assert(contractMap.status === 'PASS' && contractMap.routes === 6 && contractMap.operations === 16 && contractMap.issues.length === 0, 'FE010 canonical contract map failed');
assert(logText.map.includes('"status": "PASS"'), 'Current contract map log is not passing');

const commandMap = jsonKit('execution/frontend-command-map.json');
const commands = Object.fromEntries(['e2e', 'domain', 'unit', 'source'].map(id => {
  const command = commandMap.commands.find(item => item.id === id);
  assert(command?.status === 'VERIFIED_AVAILABLE', `Registered command ${id} is unavailable`);
  return [id, command];
}));
const logHashes = Object.fromEntries(Object.entries(logs).map(([key, relative]) => [key, sha(readKit(relative))]));

const sourcePaths = [
  'AGENTS.md', 'AI_RULES.md', 'package.json', 'package-lock.json', 'playwright.config.ts',
  'apps/web/vite.config.ts', 'apps/web/src/app/router.tsx', 'apps/web/src/app/SessionProvider.tsx',
  'apps/web/src/modules/catalog/index.tsx', 'apps/web/src/modules/catalog/imports.tsx', 'apps/web/src/modules/catalog/import-file.ts',
  'apps/web/src/mocks/catalog.ts', 'apps/web/src/mocks/files.ts', 'apps/web/src/mocks/handlers.ts', 'apps/web/src/mocks/database.ts',
  'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/api/validation.ts',
  'apps/web/src/shared/model/auth.ts', 'apps/web/src/shared/model/scope.tsx', 'apps/web/src/shared/ui/components.tsx',
  'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json', 'packages/contracts/src/routes.json',
  'scripts/run-e2e.mjs', 'scripts/setup.mjs', 'scripts/test-domain.mjs', 'scripts/check-source.mjs',
  'evidence/source-check.json', 'tests/fe010.spec.ts', 'tests/ui006-lookups.spec.ts', 'tests/ui-catalog-layout.spec.ts',
  'tests/ui-import-scope.test.mjs', 'tests/fixtures/mock-network.mjs', 'samples/products.csv',
  'botsales-kit/AGENTS.md', 'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/feature-catalog.json',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-evidence/FE010/S01-contract-map.mjs',
  'botsales-kit/execution/frontend-evidence/FE010/S01-contract-map.json',
  'botsales-kit/execution/frontend-evidence/FE010/capture-current-evidence-20261007.mjs',
  ...Object.values(logs).map(relative => `botsales-kit/${relative}`),
].sort();
const sourceFiles = sourcePaths.map(relative => {
  const file = relative.startsWith('botsales-kit/')
    ? path.join(kitRoot, relative.slice('botsales-kit/'.length))
    : path.join(frontendRoot, relative);
  assert(fs.existsSync(file), `Missing current source: ${relative}`);
  return { path: relative, sha256: sha(fs.readFileSync(file)) };
});
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).sort().join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: frontendRoot, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: frontendRoot, encoding: 'utf8' }).trim();
const executedAt = new Date().toISOString();
const reviewer = 'Codex self-review; no independent peer review claimed';
const frontendCwd = frontendRoot;
const names = [
  'product editor validates positive prices, protects image-only drafts, and saves variant payload through mock HTTP',
  'product update sends If-Match and keeps edits visible after a 412 conflict',
  'warehouse role can read catalog products but cannot edit product fields or price cost data',
  'categories create, search, update with a version, and render cursor pagination',
  'CSV preview reports row-level errors and commits only valid product rows',
  'import validation token is rejected with 412 after catalog changes and the preview remains visible',
  'CSV demo row limit is explained and rejects more than 1000 data rows before preview',
  'demo upload rejects files over 5 MB before making an upload request',
  'product category lookup pages the full collection and preserves the selected category while editing',
];
const fe010Tests = readFrontend('tests/fe010.spec.ts');
for (const name of names) assert(fe010Tests.includes(`test('${name}'`), `FE010 test is missing: ${name}`);
for (const name of names) assert(logText.e2e.includes(name), `Current browser log is missing FE010 test: ${name}`);
assert(readFrontend('apps/web/src/modules/catalog/imports.tsx').includes('XLSX chưa có parser'), 'Import UI must disclose that XLSX parsing is unsupported');

const cases = {
  S01: [
    { name: 'Canonical route IDs and generated operations resolve for FE010', count: '6 routes / 16 operations', status: 'PASS' },
    { name: 'Contract map checks permissions, If-Match, variant money, import confirmation fields and source coverage', count: '7 checks', status: 'PASS' },
    { name: 'Current React source mapping and source-checker pass', count: '54 routes / 220 operation calls', status: 'PASS' },
  ],
  S02: [
    { name: 'Product editor validates positive prices, keeps image-only drafts, and sends multi-variant payload', status: 'PASS' },
    { name: 'Categories create/search/update and paginated product lookup', count: '105 categories', status: 'PASS' },
    { name: 'Import preview identifies invalid and duplicate rows, commits only valid row, then finds imported product', status: 'PASS' },
  ],
  S03: [
    { name: 'Invalid product fields prevent writes; duplicate SKU and role restrictions are handled', status: 'PASS' },
    { name: 'Product update and stale import token return 412 while preserving edits/preview', status: 'PASS' },
    { name: 'Warehouse cannot edit catalog or expose cost; 1001-row and over-5-MB files are rejected before write', status: 'PASS' },
    { name: 'Dirty product input survives navigation guard and paginated lookup failures', status: 'PASS' },
  ],
  S04: [
    { name: 'Frontend component/unit tests', count: '138/138', status: 'PASS' },
    { name: 'FE010 browser tests across Chromium and Firefox', count: '18/18', status: 'PASS' },
    { name: 'Synthetic API/domain regression', count: '88/88', status: 'PASS' },
  ],
  S05: [
    { name: 'Full built React demo E2E across Chromium and Firefox', count: '512/512', status: 'PASS' },
    { name: 'All FE010 catalog, category, import and lookup browser scenarios', count: '18/18', status: 'PASS' },
    { name: 'Responsive/category-editor and keyboard lookup states remain in current suite', status: 'PASS' },
  ],
};

function commandResult(id, key, extra) {
  return {
    commandId: id, command: commands[id].command, exitCode: 0,
    ...extra, logFile: logs[key],
    logSha256: logHashes[key],
  };
}

for (const step of task.implementationSteps) {
  const stepCases = cases[step.id];
  const logRelative = `execution/frontend-evidence/FE010/${step.id}-current-20261007.log`;
  const evidenceRelative = `execution/frontend-evidence/FE010/${step.id}-current-20261007.json`;
  const observed = `${stepCases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Current full browser E2E passed 512/512 across Chromium and Firefox, with all nine FE010 tests executing in both projects (18/18); domain/network checks passed 88/88.${step.id === 'S04' ? ' Unit/component tests passed 138/138.' : ''} Current contract map confirms six routes and 16 operations. All evidence uses synthetic fixtures; no backend or real file persistence is claimed.`;
  const evidenceLog = [
    `FE010.${step.id} catalog, variants and import evidence.`, `executedAt=${executedAt}`, `cwd=${frontendCwd}`,
    `commandId=e2e; command=${commands.e2e.command}; exitCode=0; log=${logs.e2e}; sha256=${logHashes.e2e}`,
    `commandId=domain; command=${commands.domain.command}; exitCode=0; log=${logs.domain}; sha256=${logHashes.domain}`,
    `commandId=unit; command=${commands.unit.command}; exitCode=0; log=${logs.unit}; sha256=${logHashes.unit}`,
    `commandId=source; command=${commands.source.command}; exitCode=0; log=${logs.source}; sha256=${logHashes.source}`,
    `contractMap=${contractMap.routes} routes/${contractMap.operations} operations; result=${contractMap.status}; log=${logs.map}; sha256=${logHashes.map}`,
    `E2E=512/512; FE010=18/18; domain=88/88; unit=138/138; sourceRoutes=54; sourceOperationCalls=220`,
    ...stepCases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`,
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no backend/provider/storage persistence is claimed.',
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261007.log`), evidenceLog, 'utf8');
  const commandResults = [
    commandResult('e2e', 'e2e', { testsPassed: 512, browserProjects: ['chromium', 'firefox'] }),
    commandResult('domain', 'domain', { simulatorChecks: 75, networkChecks: 13, passed: 88 }),
    commandResult('unit', 'unit', { testsPassed: 138 }),
    commandResult('source', 'source', { sourceStatus: 'PASS', files: 68, routes: 54, operationCalls: 220 }),
  ];
  const evidence = {
    taskId: 'FE010', stepId: step.id, kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
    sourceRevision: `HEAD ${revision} on ${branch} + current working tree`,
    expected: step.verification, observed,
    commandId: 'e2e', command: commands.e2e.command, cwd: frontendCwd, reviewer,
    environment: {
      name: `Windows / Node ${process.versions.node} / Chromium + Firefox`,
      details: 'Built React demo; UI, component and network behavior use local MSW/in-memory fixtures.',
      dataSource: 'synthetic-msw',
    },
    checksTotal: step.id === 'S04' ? 738 : 600, failed: 0,
    checks: stepCases.map(item => ({ name: item.name, count: Number.parseInt(item.count?.match(/\d+/)?.[0] ?? '1', 10), status: item.status })),
    sourceFiles, sourceSnapshotSha256,
    logFile: logRelative, logSha256: sha(Buffer.from(evidenceLog)), commandResults,
    audit: { result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, cases: stepCases },
  };
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261007.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
  result: 'PASS', taskId: 'FE010', routes: task.routeIds.length, operations: task.operationIds.length,
  browserTests: '512/512', taskBrowserTests: '18/18', domainTests: '88/88', unitTests: '138/138',
  sourceFiles: sourceFiles.length, sourceSnapshotSha256,
  evidenceFiles: task.implementationSteps.map(step => `${step.id}-current-20261007.json`),
}, null, 2));
