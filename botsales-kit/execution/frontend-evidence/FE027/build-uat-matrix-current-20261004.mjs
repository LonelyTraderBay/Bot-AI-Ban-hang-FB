import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const outputDir = path.join(repo, 'botsales-kit/execution/frontend-evidence/FE027');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const read = relative => fs.readFileSync(path.join(repo, relative));
const readJson = relative => JSON.parse(read(relative).toString('utf8'));
const inputs = [
  'botsales-kit/contracts/route-manifest.json',
  'botsales-kit/contracts/permission-catalog.json',
  'docs/route-implementation.json',
  'docs/route-state-role-matrix.json',
  'botsales-kit/execution/frontend-evidence/FE023/route-role-matrix-current-20261004.log',
  'botsales-kit/execution/frontend-evidence/FE008/S05-e2e-rerun-current-20261004.log',
];
const manifest = readJson(inputs[0]);
const permissionCatalog = readJson(inputs[1]);
const implementation = readJson(inputs[2]);
const stateMatrix = readJson(inputs[3]);
const roleEvidence = read(inputs[4]).toString('utf8');
const routeEvidenceLog = read(inputs[5]).toString('utf8');
const implementationById = new Map(implementation.map(route => [route.routeId, route]));
const stateById = new Map(stateMatrix.routes.map(route => [route.id, route]));
const permissions = permissionCatalog.permissions ?? permissionCatalog;

if (manifest.routes.length !== 54 || implementation.length !== 54 || stateMatrix.routes.length !== 54) throw new Error('UAT inputs do not cover all 54 canonical routes.');
const featureRows = implementation.flatMap(route => route.featureCoverage.map(feature => ({ routeId: route.routeId, ...feature })));
const featureIds = [...new Set(featureRows.map(feature => feature.featureId))].sort();
if (featureRows.length !== 65 || featureIds.length !== 64 || featureRows.some(row => row.coverage !== 'FRONTEND_INTERACTION_VERIFIED_SYNTHETIC' || row.evidenceCases.some(test => test.result !== 'PASS'))) throw new Error('Current route-feature coverage is incomplete or has non-passing evidence.');
if (!/ROUTE_ROLE_MATRIX_CASES=357 ROLES=7 PRIVATE_ROUTES=51 RESULT=PASS/.test(roleEvidence) || !roleEvidence.includes('EXIT_CODE=0')) throw new Error('Current 51-route × 7-role browser matrix did not pass.');
if (!/388 passed \(\d+(?:\.\d+)?m\)/.test(routeEvidenceLog) || !routeEvidenceLog.includes('ROUTE_EMPTY_COMPOSITION=11/11 RESULT=PASS') || !routeEvidenceLog.includes('ROUTE_ERROR_COMPOSITION=51/51 RESULT=PASS')) throw new Error('Current full browser UAT evidence is incomplete.');

const routes = manifest.routes.map(canonical => {
  const implementationRow = implementationById.get(canonical.id);
  const stateRow = stateById.get(canonical.id);
  if (!implementationRow || !stateRow || implementationRow.routeEvidence.result !== 'PASS') throw new Error(`Missing current browser mapping for ${canonical.id}.`);
  const features = implementationRow.featureCoverage.map(feature => ({
    featureId: feature.featureId,
    title: feature.title,
    scenarioId: feature.scenarioId,
    coverage: feature.coverage,
    evidenceCases: feature.evidenceCases.map(test => ({ id: test.id, file: test.file, title: test.title, result: test.result })),
    scopeGap: feature.gap,
  }));
  return {
    routeId: canonical.id,
    path: canonical.path,
    title: canonical.title,
    module: canonical.module,
    readPermission: canonical.readPermission,
    readOperations: canonical.readOperations,
    acceptanceScenarioIds: canonical.acceptanceScenarioIds,
    routeSmoke: { result: 'PASS', testFile: implementationRow.routeEvidence.testFile, title: implementationRow.routeEvidence.testTitle },
    features,
    journeys: implementationRow.journeys,
    states: Object.fromEntries(Object.entries(stateRow.states).map(([name, state]) => [name, { result: state.result, routeSpecificBehavior: state.routeSpecificBehavior }])),
    roleCoverage: canonical.readPermission
      ? { result: 'PASS', cases: 7, source: 'Current canonical route-role browser matrix; the matrix has 51 private routes and 357 observed cases.' }
      : { result: 'PUBLIC_ROUTE', cases: 0, source: 'Route contract declares no read permission; private-route role matrix does not apply.' },
    knownScopeGaps: [...new Set(features.map(feature => feature.scopeGap).filter(Boolean))],
  };
});
const stateCounts = {};
let untestedStateCells = 0;
for (const route of stateMatrix.routes) for (const cell of Object.values(route.states)) {
  stateCounts[cell.result] = (stateCounts[cell.result] ?? 0) + 1;
  if (String(cell.result).includes('NOT_TESTED')) untestedStateCells++;
}
if (untestedStateCells !== 0 || stateMatrix.summary.routeRoleBrowserMatrix !== 'PASS') throw new Error('State/role summary includes an untested applicable cell or failed role matrix.');

const sourceHashes = inputs.map(file => ({ path: file, sha256: sha256(read(file)) }));
const matrix = {
  version: 1,
  generatedAt: new Date().toISOString(),
  scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  artifact: 'apps/web/dist-demo',
  sourceOfTruth: ['botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/permission-catalog.json'],
  inputHashes: sourceHashes,
  summary: {
    routes: routes.length,
    routesWithReactSmoke: routes.filter(route => route.routeSmoke.result === 'PASS').length,
    features: featureIds.length,
    featureRouteInteractionRows: featureRows.length,
    featureRouteRowsWithPassingSyntheticEvidence: featureRows.length,
    primaryJourneys: implementation.reduce((count, route) => count + route.journeys.length, 0),
    privateRoutes: stateMatrix.summary.routeRoleBrowserMatrix === 'PASS' ? 51 : null,
    roleCount: stateMatrix.summary.roles,
    passingRouteRoleCases: stateMatrix.summary.passedRouteRoleCases,
    publicRoutesOutsidePrivateRoleMatrix: routes.filter(route => !route.readPermission).length,
    sharedGlobalStateCases: stateMatrix.summary.passingGlobalStateCases,
    routeSpecificSuccessRoutes: stateMatrix.summary.routeSpecificSuccessRoutes,
    routeSpecificEmptyRoutes: stateMatrix.summary.routeSpecificEmptyRoutes,
    emptyStateCases: '11/11',
    routeErrorCases: '51/51',
    stateCellResults: stateCounts,
    untestedApplicableStateCells: untestedStateCells,
    fullBrowserSuite: '388/388 Chromium + Firefox',
  },
  limits: [
    'All UI and API observations use synthetic MSW data; the matrix does not assert backend persistence, authorization, provider delivery, staging, or production behavior.',
    'Public routes are evaluated by their canonical public-route contract and are outside the 51 private-route × 7-role matrix.',
    'Scope gaps attached to features remain explicit contract/backend boundaries; they are not counted as missing Frontend UI test cases.',
  ],
  routes,
};
const output = path.join(outputDir, 'uat-matrix-current-20261004.json');
const bytes = Buffer.from(`${JSON.stringify(matrix, null, 2)}\n`);
fs.writeFileSync(output, bytes);
const log = [
  'FE027 UAT matrix generated from canonical route manifest, route implementation map, state-role matrix and browser evidence.',
  `executedAt=${matrix.generatedAt}`, `cwd=${repo}`, 'command=node botsales-kit/execution/frontend-evidence/FE027/build-uat-matrix-current-20261004.mjs', 'exitCode=0',
  `routes=${matrix.summary.routes}; routeSmoke=${matrix.summary.routesWithReactSmoke}; features=${matrix.summary.features}; featureRouteRows=${matrix.summary.featureRouteInteractionRows}; journeys=${matrix.summary.primaryJourneys}`,
  `privateRoleCases=${matrix.summary.passingRouteRoleCases}/${matrix.summary.privateRoutes}x${matrix.summary.roleCount}; empty=${matrix.summary.emptyStateCases}; errors=${matrix.summary.routeErrorCases}; stateUntested=${matrix.summary.untestedApplicableStateCells}`,
  `scope=${matrix.scope}; artifact=${matrix.artifact}; matrixSha256=${sha256(bytes)}`,
  ...sourceHashes.map(item => `INPUT ${item.path} sha256=${item.sha256}`),
].join('\n') + '\n';
fs.writeFileSync(path.join(outputDir, 'uat-matrix-generation-current-20261004.log'), log);
console.log(log);
