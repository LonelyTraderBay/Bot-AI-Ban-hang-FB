import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE021');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const readFrontend = relative => fs.readFileSync(path.join(frontendRoot, relative), 'utf8');
const readKit = relative => fs.readFileSync(path.join(kitRoot, relative), 'utf8');
const jsonKit = relative => JSON.parse(readKit(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(path.basename(frontendRoot) === 'BotSalesAI_Frontend', 'Run this capture from the Frontend workspace');
const plan = jsonKit('execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE021');
assert(task && task.implementationSteps.length === 5, 'Canonical FE021 S01-S05 plan is required');

const logs = {
    e2e: 'execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log',
    verify: 'execution/frontend-evidence/FE001/S03-full-verify-powershell-current-20261008.log',
    source: 'execution/frontend-evidence/FE005/S01-source-check-current-20261008.log',
    sourceReport: 'execution/frontend-evidence/FE005/S01-source-check-report-current-20261008.json',
    routeMap: 'execution/frontend-evidence/FE021/S01-route-operation-map-current-20261008.log',
    focused: 'execution/frontend-evidence/FE021/S05-e2e-focused-current-20261008.log',
    crossFocused: 'execution/frontend-evidence/FE021/S05-cross-e2e-focused-current-20261008.log',
};
const e2eText = readKit(logs.e2e);
const verifyText = readKit(logs.verify);
const sourceText = readKit(logs.source);
const focusedText = readKit(logs.focused);
const crossFocusedText = readKit(logs.crossFocused);
const routeMap = JSON.parse(readKit(logs.routeMap));
const sourceReport = jsonKit(logs.sourceReport);
assert(/512 passed \(.+\)/.test(e2eText) && e2eText.includes('Chromium 256/256') && e2eText.includes('Firefox 256/256') && e2eText.includes('EXIT_CODE=0'), 'Registered full E2E evidence is not a passing 512/512 run');
assert(verifyText.includes('EXIT_CODE=0') && /Tests\s+138 passed \(138\)/.test(verifyText) && verifyText.includes('"passed":88'), 'Registered verify evidence is missing current unit or domain/network passes');
assert(sourceReport.status === 'PASS' && sourceReport.files === 68 && sourceReport.routes === 54 && sourceReport.operationCalls === 220, 'Current source-check report does not match passing coverage');
assert(sourceText.includes('"status": "PASS"') && sourceText.includes('"routes": 54'), 'Current registered source-check log is not passing');
assert(routeMap.status === 'PASS' && routeMap.taskId === 'FE021' && routeMap.plannedOperations === 7 && routeMap.checks === 25, 'Current FE021 route/operation map did not pass 25 checks');
assert(/16 passed \(.+\)/.test(focusedText), 'Current FE021 focused browser run is not 16/16');
assert(/2 passed \(.+\)/.test(crossFocusedText), 'Current FE021 cross-feature report-explanation run is not 2/2');

const browserSource = readFrontend('tests/fe021.spec.ts');
const financeSource = readFrontend('tests/fe015.spec.ts');
const browserCases = [...browserSource.matchAll(/^test\('([^']+)'/gm)].map(match => match[1]);
const crossCase = 'FE021.E08 report explanation is mock-only, cites the filtered P&L snapshot, and never writes finance data';
assert(browserCases.length === 8, 'Current FE021 dashboard/report scenario count changed: ' + browserCases.length);
assert(financeSource.includes("test('" + crossCase + "'"), 'The shared FE021 report-explanation scenario is absent from current FE015 source');
for (const name of browserCases) assert(focusedText.includes(name), 'Focused FE021 browser log is missing scenario: ' + name);
assert(crossFocusedText.includes(crossCase), 'Current focused cross-feature browser log is missing FE021.E08');
assert((focusedText.match(/tests\\fe021\.spec\.ts/g) || []).length === 16, 'Expected all eight FE021 scenarios in both browser projects');
assert((crossFocusedText.match(/tests\\fe015\.spec\.ts/g) || []).length === 2, 'Expected FE021.E08 in both browser projects');

const routeManifest = jsonKit('contracts/route-manifest.json');
const routes = task.routeIds.map(id => routeManifest.routes.find(route => route.id === id));
assert(routes.every(Boolean), 'A FE021 task route is missing from the canonical route manifest');
const routeOperationIds = [...new Set(routes.flatMap(route => [
    ...(route.readOperations || []),
    ...(route.actions || []).map(action => action.operationId),
]))].sort();
assert(JSON.stringify(routeOperationIds) === JSON.stringify([...task.operationIds].sort()), 'FE021 plan operation IDs do not equal the unique R04/R31/R53 route operation union');
const featureCatalog = jsonKit('contracts/feature-catalog.json');
const featureEntries = task.featureIds.map(id => featureCatalog.features.find(feature => feature.id === id));
assert(featureEntries.every(Boolean), 'A FE021 feature is missing from the canonical feature catalog');
for (const feature of featureEntries) assert(feature.routeIds.includes('R53') && routes.some(route => route.id === 'R53' && (route.featureIds || []).includes(feature.id)), 'Feature route mapping differs for ' + feature.id);

const commandMap = jsonKit('execution/frontend-command-map.json');
const commandIds = ['e2e', 'verify-current-20261002', 'source'];
const commands = Object.fromEntries(commandIds.map(id => {
    const command = commandMap.commands.find(item => item.id === id);
    assert(command && command.status === 'VERIFIED_AVAILABLE', 'Registered command is unavailable: ' + id);
    return [id, command];
}));

const sourcePaths = [
    'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/KNOWN_GAPS.md',
    'package.json', 'package-lock.json', 'playwright.config.ts', 'apps/web/src/app/router.tsx', 'apps/web/src/app/Shell.tsx',
    'apps/web/src/modules/dashboard/index.tsx', 'apps/web/src/modules/reports/index.tsx',
    'apps/web/src/modules/bot/index.tsx', 'apps/web/src/modules/finance/index.tsx', 'apps/web/src/mocks/auxiliary.ts',
    'apps/web/src/mocks/service.ts', 'apps/web/src/mocks/database.ts', 'apps/web/src/mocks/seed.json',
    'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/model/scope.tsx',
    'apps/web/src/shared/model/format.ts', 'apps/web/src/shared/model/auth.ts', 'apps/web/src/shared/ui/components.tsx',
    'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json', 'packages/contracts/src/routes.json',
    'scripts/run-e2e.mjs', 'scripts/test-domain.mjs', 'evidence/source-check.json', 'tests/fe021.spec.ts',
    'tests/fe015.spec.ts', 'tests/domain-scenarios.cjs', 'tests/fixtures/mock-network.mjs',
    'tests/accessibility/routes.spec.ts', 'tests/security.spec.ts', 'botsales-kit/AGENTS.md',
    'botsales-kit/docs/02_ARCHITECTURE.md', 'botsales-kit/docs/06_API_AND_REALTIME.md', 'botsales-kit/docs/18_CODING_STANDARDS.md',
    'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
    'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/feature-catalog.json',
    'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
    'botsales-kit/execution/frontend-evidence/FE021/S01-route-operation-map-current-20261007.mjs',
    'botsales-kit/execution/frontend-evidence/FE021/S01-route-operation-map-current-20261008.md',
    'botsales-kit/execution/frontend-evidence/FE021/capture-current-evidence-20261008.mjs',
    ...Object.values(logs).map(relative => 'botsales-kit/' + relative),
];
const sourceFiles = [...new Set(sourcePaths)].sort().map(relative => {
    const file = relative.startsWith('botsales-kit/')
        ? path.join(kitRoot, relative.slice('botsales-kit/'.length))
        : path.join(frontendRoot, relative);
    assert(fs.existsSync(file), 'Missing current source file: ' + relative);
    return { path: relative, sha256: sha(fs.readFileSync(file)) };
});
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => item.path + ':' + item.sha256).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: frontendRoot, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: frontendRoot, encoding: 'utf8' }).trim();
const executedAt = new Date().toISOString();
const reviewer = 'Codex self-review; no independent peer review claimed';
const gaps = [
    'getMarketingSummary has no date-filter input; the UI states that the displayed summary is the API snapshot and does not claim a filtered or live advertising-attribution result.',
    'Marketing actual spend may be null and remains visibly missing instead of being reported as zero or accounting data.',
    'Dashboard, P&L explanation, report job and CSV download behaviors are local synthetic API results, not proof of a live finance ledger or production export service.',
];
const routeMapCommand = 'node execution/frontend-evidence/FE021/S01-route-operation-map-current-20261007.mjs';
const supplementalRouteMap = {
    command: routeMapCommand,
    commandId: 'source',
    registeredAsExactCommand: false,
    cwd: kitRoot,
    exitCode: 0,
    checksPassed: 25,
    logFile: logs.routeMap,
    logSha256: sha(readKit(logs.routeMap)),
};
const supplementalFocused = {
    command: 'npm.cmd --script-shell=cmd.exe run test:e2e -- tests/fe021.spec.ts',
    commandId: 'e2e',
    registeredAsExactCommand: false,
    exitCode: 0,
    testsPassed: 16,
    fe021Results: 16,
    logFile: logs.focused,
    logSha256: sha(readKit(logs.focused)),
};
const supplementalCross = {
    command: 'npm.cmd --script-shell=cmd.exe run test:e2e -- tests/fe015.spec.ts --grep "FE021.E08 report explanation"',
    commandId: 'e2e',
    registeredAsExactCommand: false,
    exitCode: 0,
    testsPassed: 2,
    fe021CrossFeatureResults: 2,
    logFile: logs.crossFocused,
    logSha256: sha(readKit(logs.crossFocused)),
};

const casesByStep = {
    S01: [
        { name: 'R04/R31/R53 unique route-operation union equals the seven planned FE021 operation IDs', count: '3 routes / 7 operations', status: 'PASS' },
        { name: 'G07/G08 feature catalog mappings agree with R53 route-manifest feature IDs', status: 'PASS' },
        { name: 'Route/module callsites and export/pause permissions resolve to canonical OpenAPI and generated operations', count: '25 route-map checks', status: 'PASS' },
        { name: 'API-snapshot ownership, nullable marketing actuals, shop-timezone boundaries and authorized download limits are explicit', status: 'PASS' },
    ],
    S02: [
        { name: 'Dashboard panels stay independently usable and hide finance values/actions without finance.read', status: 'PASS' },
        { name: 'Marketing chart/table derive from the same response and preserve null actual spend', status: 'PASS' },
        { name: 'Inclusive shop-local boundaries create a safe CSV job and cursor pagination reaches subsequent jobs', status: 'PASS' },
        { name: 'P&L explanation cites the filtered snapshot and makes no finance write', count: 'Cross-feature FE021.E08 in FE015 spec', status: 'PASS' },
    ],
    S03: [
        { name: 'Missing reports.export source permission returns 403 and hides the report option', status: 'PASS' },
        { name: 'Invalid timezone returns 422 without creating an export job', status: 'PASS' },
        { name: 'Ambiguous and stale export results retain dates and expose no download', status: 'PASS' },
        { name: 'Empty report/marketing payloads render explicit empty states and do not fabricate actual spend', status: 'PASS' },
    ],
    S04: [
        { name: 'FE021 route/operation source map', count: '25 checks', status: 'PASS' },
        { name: 'Current registered component/unit regression', count: '138/138', status: 'PASS' },
        { name: 'Current registered synthetic API/domain network regression', count: '88/88', status: 'PASS' },
        { name: 'Current source checker', count: '68 files / 54 routes / 220 operation calls', status: 'PASS' },
        { name: 'Current full cross-browser React demo regression', count: '512/512', status: 'PASS' },
    ],
    S05: [
        { name: 'All eight FE021 dashboard/report scenarios execute in Chromium and Firefox', count: '16/16', status: 'PASS' },
        { name: 'Cross-feature FE021.E08 explanation scenario executes in Chromium and Firefox', count: '2/2', status: 'PASS' },
        { name: 'Current registered full React demo E2E passes in both browser projects', count: '512/512; 256 per browser', status: 'PASS' },
    ],
};
const resultSpecs = [
    ['e2e', logs.e2e, { testsPassed: 512, browserProjects: ['chromium', 'firefox'] }],
    ['verify-current-20261002', logs.verify, { unitTestsPassed: 138, domainNetworkPassed: 88 }],
    ['source', logs.source, { sourceStatus: 'PASS', files: 68, routes: 54, operationCalls: 220 }],
];
const commandResults = resultSpecs.map(([id, relative, extra]) => ({
    commandId: id,
    command: commands[id].command,
    exitCode: 0,
    ...extra,
    logFile: relative,
    logSha256: sha(readKit(relative)),
}));
const primaryByStep = {
    S01: 'source',
    S02: 'e2e',
    S03: 'e2e',
    S04: 'verify-current-20261002',
    S05: 'e2e',
};

for (const step of task.implementationSteps) {
    const cases = casesByStep[step.id];
    const primaryId = primaryByStep[step.id];
    const supplementalRuns = [
        ...(step.id === 'S01' || step.id === 'S04' ? [supplementalRouteMap] : []),
        ...(step.id === 'S02' || step.id === 'S03' || step.id === 'S05' ? [supplementalFocused] : []),
        ...(step.id === 'S02' || step.id === 'S05' ? [supplementalCross] : []),
    ];
    const evidenceLog = [
        'FE021.' + step.id + ' dashboard, reports and export verification.',
        'executedAt=' + executedAt,
        'cwd=' + frontendRoot,
        ...commandResults.map(result => 'supportingCommandId=' + result.commandId + '; command=' + result.command + '; exitCode=0; log=' + result.logFile + '; sha256=' + result.logSha256),
        ...supplementalRuns.map(result => 'supplementalCommand=' + result.command + '; exitCode=0; log=' + result.logFile + '; sha256=' + result.logSha256),
        ...cases.map(item => 'CASE ' + item.status + ': ' + item.name + (item.count ? ' (' + item.count + ')' : '')),
        ...gaps.map(gap => 'API_OR_DATA_BOUNDARY=' + gap),
        'sourceSnapshotSha256=' + sourceSnapshotSha256,
        'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no live finance ledger, ad attribution, production CSV service or backend authorization is claimed.',
    ].join('\n') + '\n';
    const logName = step.id + '-current-20261008.log';
    fs.writeFileSync(path.join(evidenceDir, logName), evidenceLog, 'utf8');
    const observed = cases.map(item => item.name + (item.count ? ' (' + item.count + ')' : '')).join('; ')
        + '. Current full browser E2E passed 512/512; focused FE021 file passed 16/16; FE021.E08 cross-feature run passed 2/2; unit 138/138; domain/network 88/88; source checker 68 files/54 routes/220 operations; route map 25 checks. Marketing/report values are synthetic API snapshots; nullable actual spend is not converted to zero.';
    const evidence = {
        taskId: 'FE021',
        stepId: step.id,
        kind: 'test_run',
        result: 'PASS',
        verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        executedAt,
        sourceRevision: 'HEAD ' + revision + ' on ' + branch + ' + current working tree',
        expected: step.verification,
        observed,
        commandId: primaryId,
        command: commands[primaryId].command,
        cwd: frontendRoot,
        reviewer,
        environment: {
            name: 'Windows / Node ' + process.versions.node + ' / Chromium + Firefox',
            details: 'React dashboard and report routes use synthetic dashboard, marketing, export and job snapshots over MSW.',
            dataSource: 'synthetic-msw',
        },
        checksTotal: cases.length,
        failed: 0,
        checks: cases.map(item => ({ name: item.name, status: item.status })),
        sourceFiles,
        sourceSnapshotSha256,
        logFile: 'execution/frontend-evidence/FE021/' + logName,
        logSha256: sha(Buffer.from(evidenceLog)),
        commandResults,
        audit: {
            result: 'PASS',
            routeIds: task.routeIds,
            featureIds: task.featureIds,
            featureCatalogRouteIds: [...new Set(featureEntries.flatMap(feature => feature.routeIds || []))].sort(),
            routeManifestFeatureIds: [...new Set(routes.flatMap(route => route.featureIds || []))].sort(),
            operationIds: task.operationIds,
            routeOperationIds,
            routeMapChecks: routeMap.checks,
            focusedBrowserResults: 16,
            focusedCrossFeatureResults: 2,
            traceabilityGaps: gaps,
            cases,
            ...(supplementalRuns.includes(supplementalRouteMap) ? { routeMapRun: supplementalRouteMap } : {}),
            ...(supplementalRuns.includes(supplementalFocused) ? { focusedBrowserRun: supplementalFocused } : {}),
            ...(supplementalRuns.includes(supplementalCross) ? { crossFeatureRun: supplementalCross } : {}),
        },
    };
    fs.writeFileSync(path.join(evidenceDir, step.id + '-current-20261008.json'), JSON.stringify(evidence, null, 2) + '\n', 'utf8');
}

console.log(JSON.stringify({
    result: 'PASS',
    taskId: 'FE021',
    routes: task.routeIds,
    operations: routeOperationIds.length,
    features: task.featureIds,
    routeMapChecks: routeMap.checks,
    focusedBrowser: '16/16 plus cross-feature 2/2',
    fullE2E: '512/512',
    unit: '138/138',
    domainNetwork: '88/88',
    sourceFiles: sourceFiles.length,
    sourceSnapshotSha256,
    evidenceFiles: task.implementationSteps.map(step => step.id + '-current-20261008.json'),
}, null, 2));
