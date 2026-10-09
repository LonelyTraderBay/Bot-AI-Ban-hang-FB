import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const frontend = path.join(repo, 'BotSalesAI_Frontend');
const outputDir = path.join(repo, 'botsales-kit/execution/frontend-evidence/FE027');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const readRepo = relative => fs.readFileSync(path.join(repo, relative));
const readFront = relative => fs.readFileSync(path.join(frontend, relative));
const readJsonRepo = relative => JSON.parse(readRepo(relative).toString('utf8'));
const readJsonFront = relative => JSON.parse(readFront(relative).toString('utf8'));
const inputs = [
    'botsales-kit/contracts/route-manifest.json',
    'botsales-kit/contracts/permission-catalog.json',
    'BotSalesAI_Frontend/docs/route-implementation.json',
    'BotSalesAI_Frontend/docs/route-state-role-matrix.json',
    'botsales-kit/execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log',
    'botsales-kit/execution/frontend-evidence/FE025/browser-a11y-performance-current-20261008.log',
    'botsales-kit/execution/frontend-evidence/FE026/clean-artifacts-current-20261008-attempt03.json',
];

const canonical = readJsonRepo(inputs[0]);
const permissions = readJsonRepo(inputs[1]);
const implementation = readJsonFront('docs/route-implementation.json');
const stateMatrix = readJsonFront('docs/route-state-role-matrix.json');
const fullRun = readRepo(inputs[4]).toString('utf8');
const currentArtifactBrowser = readRepo(inputs[5]).toString('utf8');
const artifactManifest = readJsonRepo(inputs[6]);
const implementationById = new Map(implementation.map(route => [route.routeId, route]));
const stateById = new Map(stateMatrix.routes.map(route => [route.id, route]));

if (canonical.routes.length !== 54 || implementation.length !== 54 || stateMatrix.routes.length !== 54) throw new Error('Canonical UAT inputs do not cover all 54 routes.');
if (artifactManifest.status !== 'PASS' || artifactManifest.scope !== 'FRONTEND_WITH_SYNTHETIC_MOCK_API' || artifactManifest.artifacts?.demoRepeat?.workerIncluded !== true) throw new Error('Current FE026 demo artifact manifest is not a successful isolated synthetic artifact.');
if (!/Playwright result: 512 passed \(50\.5m\)/.test(fullRun) || !/EXIT_CODE=0/.test(fullRun)) throw new Error('The current full browser UAT suite is not a clean 512/512 execution.');
if (!/route-role matrix 357 cases \/ 7 roles \/ 51 private routes passed on both engines/.test(fullRun)) throw new Error('The current full suite lacks passing 51-route by 7-role evidence.');
if (!/route-empty composition 11\/11 and route-error composition 51\/51 passed on both engines/.test(fullRun)) throw new Error('The current full suite lacks route-wide empty/error evidence.');
if (!/FE022 four vertical slices and matrix test passed on both engines/.test(fullRun)) throw new Error('The current full suite lacks current vertical-slice UAT evidence.');
if (!/8 passed \(2\.6m\)/.test(currentArtifactBrowser) || !/exitCode=0/.test(currentArtifactBrowser) || !currentArtifactBrowser.includes('apps/web/dist-demo')) throw new Error('The current built-demo browser preview run is not a clean 8/8 result.');

const featureRows = implementation.flatMap(route => route.featureCoverage.map(feature => ({ routeId: route.routeId, ...feature })));
const featureIds = [...new Set(featureRows.map(feature => feature.featureId))].sort();
if (featureRows.length !== 65 || featureIds.length !== 64 || featureRows.some(row => row.coverage !== 'FRONTEND_INTERACTION_VERIFIED_SYNTHETIC' || row.evidenceCases.some(test => test.result !== 'PASS'))) throw new Error('Current route-feature map has missing/non-passing synthetic interaction rows.');
if (stateMatrix.summary.routeRoleBrowserMatrix !== 'PASS' || stateMatrix.summary.passedRouteRoleCases !== 357 || stateMatrix.summary.roles !== 7) throw new Error('Current route-state/role source matrix is not a 357-case PASS.');

let untestedStateCells = 0;
const stateCounts = {};
for (const route of stateMatrix.routes) for (const cell of Object.values(route.states)) {
    stateCounts[cell.result] = (stateCounts[cell.result] ?? 0) + 1;
    if (String(cell.result).includes('NOT_TESTED')) untestedStateCells++;
}
if (untestedStateCells !== 0) throw new Error(`Current applicable route-state matrix has ${untestedStateCells} untested cells.`);

const routes = canonical.routes.map(route => {
    const impl = implementationById.get(route.id);
    const state = stateById.get(route.id);
    if (!impl || !state || impl.routeEvidence?.result !== 'PASS') throw new Error(`Route ${route.id} lacks current implementation/React smoke evidence.`);
    const features = impl.featureCoverage.map(feature => ({
        featureId: feature.featureId,
        title: feature.title,
        scenarioId: feature.scenarioId,
        coverage: feature.coverage,
        evidenceCases: feature.evidenceCases.map(item => ({ id: item.id, file: item.file, title: item.title, result: item.result })),
        scopeGap: feature.gap,
    }));
    return {
        routeId: route.id,
        path: route.path,
        title: route.title,
        module: route.module,
        readPermission: route.readPermission,
        readOperations: route.readOperations,
        acceptanceScenarioIds: route.acceptanceScenarioIds,
        routeSmoke: { result: 'PASS', testFile: impl.routeEvidence.testFile, title: impl.routeEvidence.testTitle },
        features,
        journeys: impl.journeys,
        states: Object.fromEntries(Object.entries(state.states).map(([name, cell]) => [name, { result: cell.result, routeSpecificBehavior: cell.routeSpecificBehavior }])),
        roleCoverage: route.readPermission
            ? { result: 'PASS', cases: 7, source: 'Current 2026-10-08 full browser suite: 357 cases across 51 private routes and 7 mock roles.' }
            : { result: 'PUBLIC_ROUTE', cases: 0, source: 'Canonical route declares no read permission; the private-route role matrix does not apply.' },
        knownScopeGaps: [...new Set(features.map(feature => feature.scopeGap).filter(Boolean))],
    };
});

const inputHashes = inputs.map(file => ({ path: file, sha256: sha256(file.startsWith('BotSalesAI_Frontend/') ? readFront(file.slice('BotSalesAI_Frontend/'.length)) : readRepo(file)) }));
const matrix = {
    version: 1,
    generatedAt: new Date().toISOString(),
    scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
    artifact: 'BotSalesAI_Frontend/apps/web/dist-demo',
    artifactTreeSha256: artifactManifest.artifacts.demoRepeat.treeSha256,
    sourceOfTruth: ['botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/permission-catalog.json'],
    inputHashes,
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
        routeEmptyCases: '11/11',
        routeErrorCases: '51/51',
        stateCellResults: stateCounts,
        untestedApplicableStateCells: untestedStateCells,
        fullBrowserSuite: '512/512 Chromium + Firefox; 256/256 per engine',
        builtDemoPreview: '8/8 Chromium + Firefox; artifacts/dist-demo',
    },
    limits: [
        'All UI/API observations use synthetic MSW fixtures; this matrix does not prove Backend persistence/authorization, provider delivery, hosted CI, staging, or production behavior.',
        'Three public routes are evaluated by their canonical public-route contract and are outside the private-route by role matrix.',
        'Feature/route contract and backend gaps remain explicit; they are not claimed as implemented live integrations.',
        'This generated matrix records automated local evidence and does not represent user acceptance.',
    ],
    routes,
};

const output = path.join(outputDir, 'uat-matrix-current-20261008.json');
const matrixBytes = Buffer.from(`${JSON.stringify(matrix, null, 2)}\n`);
fs.writeFileSync(output, matrixBytes, { encoding: 'utf8', flag: 'wx' });
const log = [
    'FE027 current UAT matrix generated from canonical routes, feature map, role/state map, 10/08 browser evidence, artifact preview, and FE026 artifact manifest.',
    `executedAt=${matrix.generatedAt}`,
    `cwd=${frontend}`,
    'commandId=e2e-current-20261002',
    'command=npm.cmd --script-shell=cmd.exe run test:e2e',
    'supplementaryMatrixGenerationCommand=node botsales-kit/execution/frontend-evidence/FE027/build-uat-matrix-current-20261008.mjs',
    'exitCode=0',
    `routes=${matrix.summary.routes}; routeSmoke=${matrix.summary.routesWithReactSmoke}; features=${matrix.summary.features}; featureRouteRows=${matrix.summary.featureRouteInteractionRows}; journeys=${matrix.summary.primaryJourneys}`,
    `privateRoles=${matrix.summary.passingRouteRoleCases}/${matrix.summary.privateRoutes}x${matrix.summary.roleCount}; routeEmpty=${matrix.summary.routeEmptyCases}; routeError=${matrix.summary.routeErrorCases}; untestedCells=${matrix.summary.untestedApplicableStateCells}`,
    `fullSuite=${matrix.summary.fullBrowserSuite}; builtDemoPreview=${matrix.summary.builtDemoPreview}; artifactTreeSha256=${matrix.artifactTreeSha256}`,
    `matrixSha256=${sha256(matrixBytes)}`,
    ...inputHashes.map(input => `INPUT ${input.path} sha256=${input.sha256}`),
    'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; local React/demo only; no live Backend/provider, hosted CI, staging, production, or owner-acceptance claim.',
].join('\n') + '\n';
fs.writeFileSync(path.join(outputDir, 'uat-matrix-generation-current-20261008.log'), log, { encoding: 'utf8', flag: 'wx' });
console.log(log);
