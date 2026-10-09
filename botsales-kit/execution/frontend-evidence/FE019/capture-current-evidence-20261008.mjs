import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE019');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const readFrontend = relative => fs.readFileSync(path.join(frontendRoot, relative), 'utf8');
const readKit = relative => fs.readFileSync(path.join(kitRoot, relative), 'utf8');
const jsonKit = relative => JSON.parse(readKit(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(path.basename(frontendRoot) === 'BotSalesAI_Frontend', 'Run this capture from the Frontend workspace');
const plan = jsonKit('execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE019');
assert(task && task.implementationSteps.length === 5, 'Canonical FE019 S01-S05 plan is required');

const logs = {
    e2e: 'execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log',
    verify: 'execution/frontend-evidence/FE001/S03-full-verify-powershell-current-20261008.log',
    source: 'execution/frontend-evidence/FE005/S01-source-check-current-20261008.log',
    sourceReport: 'execution/frontend-evidence/FE005/S01-source-check-report-current-20261008.json',
    sourceMaps: 'execution/frontend-evidence/FE012/S01-source-maps-current-20261008.log',
    focused: 'execution/frontend-evidence/FE019/S05-e2e-focused-current-20261008.log',
    focusedMap: 'execution/frontend-evidence/FE019/S01-source-map-focused-current-20261008.log',
};
const e2eText = readKit(logs.e2e);
const verifyText = readKit(logs.verify);
const sourceText = readKit(logs.source);
const sourceMapText = readKit(logs.sourceMaps);
const focusedText = readKit(logs.focused);
const focusedMapText = readKit(logs.focusedMap);
const sourceReport = jsonKit(logs.sourceReport);
const standaloneSourceMap = JSON.parse(focusedMapText);
assert(/512 passed \(.+\)/.test(e2eText) && e2eText.includes('Chromium 256/256') && e2eText.includes('Firefox 256/256') && e2eText.includes('EXIT_CODE=0'), 'Registered full E2E evidence is not a passing 512/512 run');
assert(verifyText.includes('EXIT_CODE=0') && /Tests\s+138 passed \(138\)/.test(verifyText) && verifyText.includes('"passed":88'), 'Registered verify evidence is missing current unit or domain/network passes');
assert(sourceReport.status === 'PASS' && sourceReport.files === 68 && sourceReport.routes === 54 && sourceReport.operationCalls === 220, 'Current source-check report does not match passing coverage');
assert(sourceText.includes('"status": "PASS"') && sourceText.includes('"routes": 54'), 'Current registered source-check log is not passing');
assert(sourceMapText.includes('ℹ tests 16') && sourceMapText.includes('ℹ pass 16') && sourceMapText.includes('ℹ fail 0'), 'Current grouped source-map suite is not 16/16');
assert(standaloneSourceMap.status === 'PASS' && standaloneSourceMap.plannedOperations === 24 && standaloneSourceMap.wiredWriteOperations === 14 && standaloneSourceMap.checks === 53, 'Current FE019 contract/source map did not pass its 53 assertions');
assert(JSON.stringify(standaloneSourceMap.readOperationsWithoutDirectCallsite) === JSON.stringify(['getChannel', 'getJob', 'getAIConnection']), 'FE019 unused detail-read inventory changed; re-audit before capture');
assert(/20 passed \(.+\)/.test(focusedText), 'Current FE019 focused browser run is not 20/20');

const testSource = readFrontend('tests/fe019.spec.ts');
const browserCases = [...testSource.matchAll(/^test\('([^']+)'/gm)].map(match => match[1]);
assert(browserCases.length === 10, 'Current FE019 shared browser file scenario count changed: ' + browserCases.length);
for (const name of browserCases) assert(focusedText.includes(name), 'Focused browser log is missing scenario: ' + name);
assert((focusedText.match(/tests\\fe019\.spec\.ts/g) || []).length === 20, 'Expected all ten shared-file scenarios in both browser projects');

const routeManifest = jsonKit('contracts/route-manifest.json');
const routes = task.routeIds.map(id => routeManifest.routes.find(route => route.id === id));
assert(routes.every(Boolean), 'A task route is missing from the canonical route manifest');
const routeOperationIds = [...new Set(routes.flatMap(route => [
    ...(route.readOperations || []),
    ...(route.actions || []).map(action => action.operationId),
]))].sort();
assert(JSON.stringify(routeOperationIds) === JSON.stringify([...task.operationIds].sort()), 'FE019 plan operation IDs do not equal the R29/R30/R39/R40 unique route operation union');
const featureCatalog = jsonKit('contracts/feature-catalog.json');
const featureEntries = task.featureIds.map(id => featureCatalog.features.find(feature => feature.id === id));
assert(featureEntries.every(Boolean), 'A FE019 feature is missing from the canonical feature catalog');
for (const feature of featureEntries) assert(routes.some(route => route.id === feature.routeIds[0] && (route.featureIds || []).includes(feature.id)), 'Feature route mapping differs for ' + feature.id);

const commandMap = jsonKit('execution/frontend-command-map.json');
const commandIds = ['e2e', 'verify-current-20261002', 'feature-source-maps-20261002', 'source'];
const commands = Object.fromEntries(commandIds.map(id => {
    const command = commandMap.commands.find(item => item.id === id);
    assert(command && command.status === 'VERIFIED_AVAILABLE', 'Registered command is unavailable: ' + id);
    return [id, command];
}));

const sourcePaths = [
    'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/KNOWN_GAPS.md',
    'package.json', 'package-lock.json', 'playwright.config.ts', 'apps/web/src/app/router.tsx',
    'apps/web/src/modules/integrations/index.tsx', 'apps/web/src/modules/notifications/index.tsx',
    'apps/web/src/modules/notifications/push-capabilities.ts', 'apps/web/src/mocks/auxiliary.ts',
    'apps/web/src/mocks/service.ts', 'apps/web/src/mocks/database.ts', 'apps/web/src/mocks/seed.json',
    'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/model/auth.ts',
    'apps/web/src/shared/ui/components.tsx', 'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json',
    'packages/contracts/src/routes.json', 'packages/contracts/src/permissions.json', 'scripts/run-e2e.mjs',
    'scripts/test-domain.mjs', 'evidence/source-check.json', 'tests/fe019.spec.ts',
    'tests/domain-scenarios.cjs', 'tests/fixtures/mock-network.mjs', 'tests/accessibility/routes.spec.ts', 'tests/security.spec.ts',
    'botsales-kit/AGENTS.md', 'botsales-kit/docs/02_ARCHITECTURE.md', 'botsales-kit/docs/06_API_AND_REALTIME.md',
    'botsales-kit/docs/08_SECURITY_TENANCY_RBAC.md', 'botsales-kit/docs/21_NOTIFICATIONS.md',
    'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
    'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/feature-catalog.json',
    'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
    'botsales-kit/execution/frontend-evidence/FE019/S01-contract-source-map-current-20261004.mjs',
    'botsales-kit/execution/frontend-evidence/FE019/S01-route-operation-map-current-20261008.md',
    'botsales-kit/execution/frontend-evidence/FE019/capture-current-evidence-20261008.mjs',
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
    'getChannel, getJob and getAIConnection are canonical route read operations but currently have no direct callsite in the integrations/notifications React modules; the current list/action workflows remain browser-tested.',
    'No live provider, OS push permission, real Push/Telegram delivery, hardware device test or production notification deduplication/callback protection is exercised by the synthetic frontend.',
];

const casesByStep = {
    S01: [
        { name: 'R29/R30/R39/R40 route and all 24 planned operations match OpenAPI and generated operation metadata', count: '4 routes / 24 operations', status: 'PASS' },
        { name: 'All 14 route write actions are wired to the integrations/notifications React modules with OpenAPI permissions', count: '14 write actions', status: 'PASS' },
        { name: 'A01-A08 catalog feature mappings match the R39/R40 notification route feature IDs', status: 'PASS' },
        { name: 'Three canonical detail-read operations without module callsites are listed for scope review', count: 'getChannel, getJob, getAIConnection', status: 'PASS' },
        { name: 'Standalone FE019 contract/source map passed', count: '53 assertions', status: 'PASS' },
    ],
    S02: [
        { name: 'AI connection create/update keeps credentials write-only and clears the form after submission', status: 'PASS' },
        { name: 'Channel connect/reconnect stays synthetic and never shows a false connected state', status: 'PASS' },
        { name: 'Device registration, Telegram pairing, PWA manifest and icons stay synthetic without requesting OS permission', status: 'PASS' },
        { name: 'Notification policy saves shop-local timezone, quiet hours, reminder bounds and active-shop order link', status: 'PASS' },
    ],
    S03: [
        { name: 'Rejected credential clears the input and sends no create request', status: 'PASS' },
        { name: 'OAuth failure returns MOCK_ONLY, preserves channel state and makes no external request', status: 'PASS' },
        { name: 'Synthetic device test is denied without changing pending state; revoke remains explicit', status: 'PASS' },
        { name: 'Notification policy rejects out-of-range numeric input before sending', status: 'PASS' },
        { name: 'Notification views keep opened, acknowledged, queued and sent states distinct', status: 'PASS' },
    ],
    S04: [
        { name: 'FE019 standalone route/operation/permission/source map', count: '53 assertions passed', status: 'PASS' },
        { name: 'Current registered component/unit suite', count: '138/138', status: 'PASS' },
        { name: 'Current registered synthetic API/domain network regression', count: '88/88', status: 'PASS' },
        { name: 'Current registered source checker', count: '68 files / 54 routes / 220 operation calls', status: 'PASS' },
        { name: 'Current grouped feature source-map suite', count: '16/16; separate from the FE019 standalone map', status: 'PASS' },
    ],
    S05: [
        { name: 'All ten scenarios in the FE019 shared browser spec execute in Chromium and Firefox', count: '20/20; 16 FE019 and 4 shared FE027 results', status: 'PASS' },
        { name: 'Credential secrecy, OAuth refusal, synthetic device/pairing and notification policy flows pass in-browser', status: 'PASS' },
        { name: 'Current registered full React demo E2E passes in both browser projects', count: '512/512; 256 per browser', status: 'PASS' },
    ],
};
const resultSpecs = [
    ['e2e', logs.e2e, { testsPassed: 512, browserProjects: ['chromium', 'firefox'] }],
    ['verify-current-20261002', logs.verify, { unitTestsPassed: 138, domainNetworkPassed: 88 }],
    ['feature-source-maps-20261002', logs.sourceMaps, { testsPassed: 16 }],
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
const supplementalMap = {
    command: 'node botsales-kit/execution/frontend-evidence/FE019/S01-contract-source-map-current-20261004.mjs',
    commandId: 'source',
    registeredAsExactCommand: false,
    exitCode: 0,
    checksPassed: 53,
    logFile: logs.focusedMap,
    logSha256: sha(readKit(logs.focusedMap)),
};
const supplementalBrowser = {
    command: 'npm.cmd --script-shell=cmd.exe run test:e2e -- tests/fe019.spec.ts',
    commandId: 'e2e',
    registeredAsExactCommand: false,
    note: 'The focused file run is supplemental; the receipt primary command points to the exact registered full E2E command.',
    exitCode: 0,
    testsPassed: 20,
    fe019Results: 16,
    sharedFe027Results: 4,
    logFile: logs.focused,
    logSha256: sha(readKit(logs.focused)),
};

for (const step of task.implementationSteps) {
    const cases = casesByStep[step.id];
    const primaryId = primaryByStep[step.id];
    const stepSupplementals = [
        ...(step.id === 'S01' || step.id === 'S04' ? [supplementalMap] : []),
        ...(step.id === 'S02' || step.id === 'S03' || step.id === 'S05' ? [supplementalBrowser] : []),
    ];
    const evidenceLog = [
        'FE019.' + step.id + ' integrations and notification verification.',
        'executedAt=' + executedAt,
        'cwd=' + frontendRoot,
        ...commandResults.map(result => 'supportingCommandId=' + result.commandId + '; command=' + result.command + '; exitCode=0; log=' + result.logFile + '; sha256=' + result.logSha256),
        ...stepSupplementals.map(result => 'supplementalCommand=' + result.command + '; exitCode=0; log=' + result.logFile + '; sha256=' + result.logSha256),
        ...cases.map(item => 'CASE ' + item.status + ': ' + item.name + (item.count ? ' (' + item.count + ')' : '')),
        ...gaps.map(gap => 'SCOPE_OR_COVERAGE_LIMIT=' + gap),
        'sourceSnapshotSha256=' + sourceSnapshotSha256,
        'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no provider OAuth, real AI, OS push permission, external delivery or production security claim.',
    ].join('\n') + '\n';
    const logName = step.id + '-current-20261008.log';
    fs.writeFileSync(path.join(evidenceDir, logName), evidenceLog, 'utf8');
    const observed = cases.map(item => item.name + (item.count ? ' (' + item.count + ')' : '')).join('; ')
        + '. Current full browser E2E passed 512/512; FE019 focused browser file passed 20/20; unit 138/138; domain/network 88/88; source checker 68 files/54 routes/220 operation calls; standalone FE019 source map 53 assertions passed. Three detail-read operations without module callsites and the synthetic-only boundary are recorded. No real provider/backend behavior is claimed.';
    const evidence = {
        taskId: 'FE019',
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
            details: 'React integrations and notifications use local MSW synthetic channels, credentials, devices and notification records.',
            dataSource: 'synthetic-msw',
        },
        checksTotal: cases.length,
        failed: 0,
        checks: cases.map(item => ({ name: item.name, status: item.status })),
        sourceFiles,
        sourceSnapshotSha256,
        logFile: 'execution/frontend-evidence/FE019/' + logName,
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
            standaloneSourceMapChecks: 53,
            readOperationsWithoutDirectCallsite: standaloneSourceMap.readOperationsWithoutDirectCallsite,
            traceabilityGaps: gaps,
            focusedBrowserResults: 20,
            focusedFe019Results: 16,
            focusedSharedFe027Results: 4,
            cases,
            supplementalMapRun: stepSupplementals.includes(supplementalMap) ? supplementalMap : undefined,
            supplementalBrowserRun: stepSupplementals.includes(supplementalBrowser) ? supplementalBrowser : undefined,
        },
    };
    fs.writeFileSync(path.join(evidenceDir, step.id + '-current-20261008.json'), JSON.stringify(evidence, null, 2) + '\n', 'utf8');
}

console.log(JSON.stringify({
    result: 'PASS',
    taskId: 'FE019',
    routes: task.routeIds,
    operations: routeOperationIds.length,
    features: task.featureIds,
    focusedBrowser: '20/20; 16 FE019 and 4 shared FE027 results',
    standaloneSourceMap: '53 assertions passed',
    uncalledDetailReads: standaloneSourceMap.readOperationsWithoutDirectCallsite,
    fullE2E: '512/512',
    unit: '138/138',
    domainNetwork: '88/88',
    groupedSourceMaps: '16/16',
    sourceFiles: sourceFiles.length,
    sourceSnapshotSha256,
    evidenceFiles: task.implementationSteps.map(step => step.id + '-current-20261008.json'),
}, null, 2));
