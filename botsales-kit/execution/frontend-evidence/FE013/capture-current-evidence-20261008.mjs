import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE013');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const readFrontend = relative => fs.readFileSync(path.join(frontendRoot, relative), 'utf8');
const readKit = relative => fs.readFileSync(path.join(kitRoot, relative), 'utf8');
const jsonKit = relative => JSON.parse(readKit(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(path.basename(frontendRoot) === 'BotSalesAI_Frontend', `Run from Frontend workspace; got ${frontendRoot}`);

const plan = jsonKit('execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE013');
assert(task?.implementationSteps?.length === 5, 'Canonical FE013 S01-S05 plan not found');

const logs = {
    e2e: 'execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log',
    verify: 'execution/frontend-evidence/FE001/S03-full-verify-powershell-current-20261008.log',
    sourceMaps: 'execution/frontend-evidence/FE012/S01-source-maps-current-20261008.log',
    sourceReport: 'execution/frontend-evidence/FE005/S01-source-check-report-current-20261008.json',
    crosswalk: 'execution/frontend-evidence/FE005/S01-contract-crosswalk-current-20261008.log',
    focused: 'execution/frontend-evidence/FE013/S05-e2e-focused-current-20261008.log',
    detailedHistory: 'execution/frontend-evidence/FE009/S02-e2e-current-20261007.log',
};

const e2eText = readKit(logs.e2e);
const verifyText = readKit(logs.verify);
const sourceMapText = readKit(logs.sourceMaps);
const focusedText = readKit(logs.focused);
const sourceReport = jsonKit(logs.sourceReport);
const sourceMapJsonMatch = sourceMapText.match(/\{\s*"taskId": "FE013"[\s\S]*?\n\}/);
assert(sourceMapJsonMatch, 'Current FE013 source-map report is missing');
const sourceMap = JSON.parse(sourceMapJsonMatch[0]);
assert(e2eText.includes('512 passed (50.5m)') && e2eText.includes('Chromium 256/256 and Firefox 256/256') && e2eText.includes('EXIT_CODE=0'), 'Current registered full E2E is not 512/512');
assert(verifyText.includes('EXIT_CODE=0') && verifyText.includes('Tests  138 passed (138)') && verifyText.includes('"passed":88'), 'Current full verify does not show all expected gates');
assert(sourceReport.status === 'PASS' && sourceReport.files === 68 && sourceReport.operationCalls === 220 && sourceReport.routes === 54, 'Current source report is not passing at the expected coverage');
assert(sourceMap.taskId === 'FE013' && sourceMap.checks === 54 && sourceMap.routes.join(',') === 'R41,R42', 'Current FE013 route/source map is incomplete');
assert(sourceMapText.includes('ℹ tests 16') && sourceMapText.includes('ℹ pass 16') && sourceMapText.includes('ℹ fail 0'), 'Current feature source-map suite is not 16/16');
assert(focusedText.includes('8 passed (55.3s)') && focusedText.includes('EXIT_CODE=0'), 'Current focused FE013 browser run is not 8/8');

const browserCases = [
    'FE013.C04 shipping preview distinguishes missing address, unserviceable zone, and expired mock quote',
    'FE013.AC01–AC04 stale claim conflict is visible; pick, pack, dispatch and delivery use current API versions once',
    'FE013.AC03 unknown handover cannot be repeated before command reconciliation',
    'FE013.AC01 role scope and FE013.AC05 responsive shipment/preparation views remain accessible',
];
const testSource = readFrontend('tests/fe013.spec.ts');
for (const name of browserCases) {
    assert(testSource.includes(`test('${name}'`), `FE013 browser test is missing from source: ${name}`);
    assert(focusedText.includes(name), `Current focused browser log is missing scenario: ${name}`);
}

const routeManifest = jsonKit('contracts/route-manifest.json');
const routes = task.routeIds.map(id => routeManifest.routes.find(route => route.id === id));
assert(routes.every(Boolean), 'FE013 canonical route is missing');
const routeOperations = routes.flatMap(route => [
    ...route.readOperations,
    ...route.actions.map(action => action.operationId),
]).sort();
assert(JSON.stringify(routeOperations) === JSON.stringify([...task.operationIds].sort()), 'FE013 task operation list differs from R41/R42 route operations');
const routeFeatures = [...new Set(routes.flatMap(route => route.featureIds))].sort();
assert(JSON.stringify(routeFeatures) === JSON.stringify([...task.featureIds].sort()), 'FE013 feature IDs do not match R41/R42 route feature IDs');
const extras = sourceMap.operations.filter(operation => !task.operationIds.includes(operation));
assert(JSON.stringify([...extras].sort()) === JSON.stringify(['claimWorkItem', 'getWorkItem']), 'Unexpected FE013 source-map operation difference');
const operationIndex = jsonKit('contracts/operation-index.json').operations;
for (const [id, permission] of [['getWorkItem', 'operations.read'], ['claimWorkItem', 'operations.claim']]) {
    const operation = operationIndex.find(item => item.operationId === id);
    assert(operation?.module === 'operations' && operation.permission === permission, `Canonical operation-index boundary changed for ${id}`);
}
const operationsRoute = routeManifest.routes.find(route => route.id === 'R37');
assert(operationsRoute?.actions.some(action => action.operationId === 'claimWorkItem' && action.permission === 'operations.claim'), 'R37 no longer owns the canonical claim capability');

const commandMap = jsonKit('execution/frontend-command-map.json');
const commands = Object.fromEntries(['e2e', 'verify-current-20261002', 'feature-source-maps-20261002'].map(id => {
    const command = commandMap.commands.find(item => item.id === id);
    assert(command?.status === 'VERIFIED_AVAILABLE', `Registered command ${id} is unavailable`);
    return [id, command];
}));

const sourcePaths = [
    'AGENTS.md', 'AI_RULES.md', 'package.json', 'package-lock.json', 'playwright.config.ts', 'apps/web/vite.config.ts',
    'apps/web/src/app/router.tsx', 'apps/web/src/app/Shell.tsx', 'apps/web/src/app/SessionProvider.tsx',
    'apps/web/src/app/CommandRecovery.tsx', 'apps/web/src/modules/fulfillment/index.tsx', 'apps/web/src/modules/orders/index.tsx',
    'apps/web/src/mocks/fulfillment.ts', 'apps/web/src/mocks/handlers.ts', 'apps/web/src/mocks/database.ts', 'apps/web/src/mocks/seed.json',
    'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/model/scope.tsx',
    'apps/web/src/shared/model/auth.ts', 'apps/web/src/shared/ui/components.tsx',
    'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json', 'packages/contracts/src/routes.json',
    'scripts/run-e2e.mjs', 'tests/fe013.spec.ts', 'tests/fe013-source-map.test.mjs',
    'tests/fe011-source-map.test.mjs', 'tests/fe012-source-map.test.mjs', 'tests/fe014-source-map.test.mjs',
    'tests/fe015-source-map.test.mjs', 'tests/fe016-source-map.test.mjs', 'tests/fe017-source-map.test.mjs',
    'tests/fe018-source-map.test.mjs', 'tests/fe020-source-map.test.mjs',
    'botsales-kit/AGENTS.md', 'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/openapi.yaml',
    'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/operation-index.json',
    'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/feature-catalog.json',
    'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
    ...Object.values(logs).map(relative => `botsales-kit/${relative}`),
    'botsales-kit/execution/frontend-evidence/FE013/capture-current-evidence-20261008.mjs',
].sort();
const uniqueSourcePaths = [...new Set(sourcePaths)];
const sourceFiles = uniqueSourcePaths.map(relative => {
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

const groups = {
    S01: [
        { name: 'R41/R42 and C01-C06 match the canonical route and feature catalogs', count: '2 routes / 6 features / 9 route operations', status: 'PASS' },
        { name: 'Canonical OpenAPI/operation-index and the fulfillment source map validate the two shared WorkItem operations and their permissions', count: '54 source assertions', status: 'PASS' },
        { name: 'The feature source-map suite passes with FE013 included', count: '16/16 tests', status: 'PASS' },
        { name: 'Current source checker covers 54 routes and 220 operation calls with no issues', count: '68 files; PASS', status: 'PASS' },
    ],
    S02: [
        { name: 'Claim, pick, partial/complete quantity validation, pack, shipment creation and delivery state are exercised against the React mock demo', count: '4 FE013 scenarios in two browsers', status: 'PASS' },
        { name: 'Delivered order separately exposes return request and unpaid COD state from the order API', status: 'PASS' },
        { name: 'Shipping preview displays synthetic quote and blocks missing address, unsupported zone and expired quote', status: 'PASS' },
        { name: 'All observations use local synthetic MSW data; no physical stock or carrier is asserted', status: 'PASS' },
    ],
    S03: [
        { name: 'Stale claim returns 412, retains the work item and offers explicit reload', status: 'PASS' },
        { name: 'Wrong SKU and fractional quantity are rejected; partial pick cannot be packed', status: 'PASS' },
        { name: 'Duplicate shipment creation returns conflict; command includes idempotency key', status: 'PASS' },
        { name: 'Unknown handover becomes 202/unknown and disables a second write pending reconciliation', status: 'PASS' },
        { name: 'Delivered status does not imply COD collection; return eligibility stays order-owned', status: 'PASS' },
    ],
    S04: [
        { name: 'Canonical FE013 route, DTO, permission and state source map', count: '54 assertions', status: 'PASS' },
        { name: 'Current full registered verify command exits 0', status: 'PASS' },
        { name: 'Component/unit suite', count: '138/138', status: 'PASS' },
        { name: 'Synthetic domain/network suite', count: '88/88', status: 'PASS' },
        { name: 'Typecheck, lint, boundaries, generated-contract check and production/demo builds', status: 'PASS' },
    ],
    S05: [
        { name: 'Current focused FE013 browser scenarios pass in Chromium and Firefox', count: '8/8; 4 per engine', status: 'PASS' },
        { name: 'Warehouse role cannot claim without operations.claim; owner route remains available', status: 'PASS' },
        { name: 'Shipment/preparation page has no horizontal overflow at 320/390/768/1440px and focused axe reports no violations', status: 'PASS' },
        { name: 'Registered current full cross-browser suite', count: '512/512; Chromium 256/256 and Firefox 256/256', status: 'PASS' },
    ],
};

const commandResult = (id, relativeLog, extra = {}) => ({
    commandId: id,
    command: commands[id].command,
    exitCode: 0,
    ...extra,
    logFile: relativeLog,
    logSha256: sha(readKit(relativeLog)),
});
const results = [
    commandResult('e2e', logs.e2e, { testsPassed: 512, browserProjects: ['chromium', 'firefox'] }),
    commandResult('verify-current-20261002', logs.verify, { unitTestsPassed: 138, domainNetworkPassed: 88, sourceFiles: 68, routes: 54, operationCalls: 220 }),
    commandResult('feature-source-maps-20261002', logs.sourceMaps, { testsPassed: 16, fe013Assertions: 54 }),
];
const primaryCommandByStep = {
    S01: 'feature-source-maps-20261002',
    S02: 'e2e',
    S03: 'e2e',
    S04: 'verify-current-20261002',
    S05: 'e2e',
};
const primaryLogByCommand = {
    e2e: logs.e2e,
    'verify-current-20261002': logs.verify,
    'feature-source-maps-20261002': logs.sourceMaps,
};

const traceabilityGaps = [
    {
        operationId: 'getWorkItem',
        evidence: 'Canonical OpenAPI and operation-index define this as operations.read; FE013 UI/source-map consumes it, but FE013 operationIds and R41/R42 route operations omit it.',
    },
    {
        operationId: 'claimWorkItem',
        evidence: 'Canonical OpenAPI and operation-index define operations.claim and R37 owns the action; FE013 preparation UI/source-map consumes it, but FE013 operationIds and R41/R42 route operations omit it.',
    },
];

for (const step of task.implementationSteps) {
    const cases = groups[step.id];
    const primaryId = primaryCommandByStep[step.id];
    const primaryLog = primaryLogByCommand[primaryId];
    const supplemental = step.id === 'S05' ? {
        command: 'npm.cmd --script-shell=cmd.exe run test:e2e -- tests/fe013.spec.ts',
        commandId: 'e2e',
        registeredAsExactCommand: false,
        note: 'Focused run is supplemental only; the progress validator requires the exact registered full-suite command, whose current 512/512 run is the primary receipt command.',
        exitCode: 0,
        testsPassed: 8,
        logFile: logs.focused,
    } : undefined;
    const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Current registered full E2E passed 512/512 (Chromium 256/256; Firefox 256/256); current verify passed 138/138 unit and 88/88 domain/network checks; source-map suite passed 16/16 including FE013's 54 assertions. FE013 map has 9 route operations; two additional canonical WorkItem operations used by the UI are documented as traceability gaps. Synthetic mock only; no live backend, physical inventory or carrier integration is claimed.`;
    const evidenceLog = [
        `FE013.${step.id} preparation, shipment and return verification.`,
        `executedAt=${executedAt}`,
        `cwd=${frontendRoot}`,
        `primaryCommandId=${primaryId}; command=${commands[primaryId].command}; exitCode=0; log=${primaryLog}`,
        ...results.map(result => `supportingCommandId=${result.commandId}; command=${result.command}; exitCode=${result.exitCode}; log=${result.logFile}; sha256=${result.logSha256}`),
        ...(supplemental ? [`supplementalCommand=${supplemental.command}; exitCode=0; tests=8/8; log=${supplemental.logFile}; not registered as the primary progress command`] : []),
        ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
        `traceabilityGap=${traceabilityGaps.map(item => item.operationId).join(',')}: canonical operations exist and are used; task/route linkage remains unsynchronized.`,
        `sourceSnapshotSha256=${sourceSnapshotSha256}`,
        'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; return/refund ownership remains with the order API; no live integration claim.',
    ].join('\n') + '\n';
    const logName = `${step.id}-current-20261008.log`;
    fs.writeFileSync(path.join(evidenceDir, logName), evidenceLog, 'utf8');
    const evidence = {
        taskId: 'FE013',
        stepId: step.id,
        kind: 'test_run',
        result: 'PASS',
        verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        executedAt,
        sourceRevision: `HEAD ${revision} on ${branch} + current working tree`,
        expected: step.verification,
        observed,
        commandId: primaryId,
        command: commands[primaryId].command,
        cwd: frontendRoot,
        reviewer,
        environment: {
            name: `Windows / Node ${process.versions.node} / Chromium + Firefox`,
            details: 'Current React demo build and Playwright use local synthetic MSW fulfillment/order data; no real carrier or backend is connected.',
            dataSource: step.id === 'S01' ? 'source-only' : 'synthetic-msw',
        },
        checksTotal: cases.length,
        failed: 0,
        checks: cases.map(item => ({ name: item.name, status: item.status })),
        sourceFiles,
        sourceSnapshotSha256,
        logFile: `execution/frontend-evidence/FE013/${logName}`,
        logSha256: sha(Buffer.from(evidenceLog)),
        commandResults: results,
        audit: {
            result: 'PASS',
            routeIds: task.routeIds,
            featureIds: task.featureIds,
            plannedOperationIds: task.operationIds,
            mappedOperationIds: sourceMap.operations,
            traceabilityGaps,
            cases,
            ...(supplemental ? { supplementalRun: supplemental } : {}),
        },
    };
    fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261008.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
    result: 'PASS',
    taskId: 'FE013',
    routes: task.routeIds,
    features: task.featureIds,
    plannedRouteOperations: task.operationIds.length,
    mappedOperations: sourceMap.operations.length,
    traceabilityGaps: extras,
    fullE2E: '512/512; Chromium 256/256; Firefox 256/256',
    focusedFE013: '8/8; Chromium 4/4; Firefox 4/4',
    unit: '138/138',
    domainNetwork: '88/88',
    sourceMapChecks: 54,
    sourceMapSuite: '16/16',
    sourceFiles: sourceFiles.length,
    sourceSnapshotSha256,
    evidenceFiles: task.implementationSteps.map(step => `${step.id}-current-20261008.json`),
}, null, 2));
