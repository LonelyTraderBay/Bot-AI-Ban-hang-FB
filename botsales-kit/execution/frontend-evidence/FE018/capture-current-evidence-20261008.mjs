import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE018');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const readFrontend = relative => fs.readFileSync(path.join(frontendRoot, relative), 'utf8');
const readKit = relative => fs.readFileSync(path.join(kitRoot, relative), 'utf8');
const jsonKit = relative => JSON.parse(readKit(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(path.basename(frontendRoot) === 'BotSalesAI_Frontend', 'Run this capture from the Frontend workspace');
const plan = jsonKit('execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE018');
assert(task && task.implementationSteps.length === 5, 'Canonical FE018 S01-S05 plan is required');

const logs = {
    e2e: 'execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log',
    verify: 'execution/frontend-evidence/FE001/S03-full-verify-powershell-current-20261008.log',
    sourceMaps: 'execution/frontend-evidence/FE012/S01-source-maps-current-20261008.log',
    sourceReport: 'execution/frontend-evidence/FE005/S01-source-check-report-current-20261008.json',
    focused: 'execution/frontend-evidence/FE018/S05-e2e-focused-current-20261008.log',
    focusedMap: 'execution/frontend-evidence/FE018/S01-source-map-focused-current-20261008.log',
};
const e2eText = readKit(logs.e2e);
const verifyText = readKit(logs.verify);
const sourceMapText = readKit(logs.sourceMaps);
const focusedText = readKit(logs.focused);
const focusedMapText = readKit(logs.focusedMap);
const sourceReport = jsonKit(logs.sourceReport);
assert(/512 passed \(.+\)/.test(e2eText) && e2eText.includes('Chromium 256/256') && e2eText.includes('Firefox 256/256') && e2eText.includes('EXIT_CODE=0'), 'Registered full E2E evidence is not a passing 512/512 run');
assert(verifyText.includes('EXIT_CODE=0') && /Tests\s+138 passed \(138\)/.test(verifyText) && verifyText.includes('"passed":88'), 'Registered verify evidence is missing current unit or domain/network passes');
assert(sourceReport.status === 'PASS' && sourceReport.files === 68 && sourceReport.routes === 54 && sourceReport.operationCalls === 220, 'Current source-check report does not match passing coverage');
assert(sourceMapText.includes('"taskId":"FE018"') && sourceMapText.includes('"checks":2'), 'Current FE018 source-map record is absent');
assert(sourceMapText.includes('ℹ tests 16') && sourceMapText.includes('ℹ pass 16') && sourceMapText.includes('ℹ fail 0'), 'Current source-map group is not 16/16');
assert(focusedMapText.includes('ℹ tests 2') && focusedMapText.includes('ℹ pass 2') && focusedMapText.includes('ℹ fail 0'), 'Current focused FE018 source map is not 2/2');
assert(/26 passed \(.+\)/.test(focusedText), 'Current focused FE018 browser file is not 26/26');

const testSource = readFrontend('tests/fe018.spec.ts');
const browserCases = [...testSource.matchAll(/^test\('([^']+)'/gm)].map(match => match[1]);
assert(browserCases.length === 13, 'Current FE018 shared browser file scenario count changed: ' + browserCases.length);
for (const name of browserCases) assert(focusedText.includes(name), 'Focused browser log is missing scenario: ' + name);
assert((focusedText.match(/tests\\fe018\.spec\.ts/g) || []).length === 26, 'Expected all 13 FE018 shared-file scenarios in both browser projects');

const routeManifest = jsonKit('contracts/route-manifest.json');
const routes = task.routeIds.map(id => routeManifest.routes.find(route => route.id === id));
assert(routes.every(Boolean), 'A task route is missing from the canonical route manifest');
const routeOperationIds = [...new Set(routes.flatMap(route => [
    ...(route.readOperations || []),
    ...(route.actions || []).map(action => action.operationId),
]))].sort();
assert(JSON.stringify(routeOperationIds) === JSON.stringify([...task.operationIds].sort()), 'FE018 plan operation IDs do not equal the unique R26/R27/R28/R51 route operation union');
const featureCatalog = jsonKit('contracts/feature-catalog.json');
const featureEntries = task.featureIds.map(id => featureCatalog.features.find(feature => feature.id === id));
assert(featureEntries.every(Boolean), 'A FE018 feature is missing from the canonical feature catalog');
assert(featureEntries.every(feature => feature.routeIds.includes('R51')), 'FE018 team features no longer map to R51');
assert(routes.find(route => route.id === 'R51').featureIds.length === 3, 'R51 no longer declares FE018 team feature IDs');

const openapi = jsonKit('contracts/openapi.json');
const operations = Object.fromEntries(Object.values(openapi.paths).flatMap(methods => Object.values(methods))
    .filter(operation => operation.operationId)
    .map(operation => [operation.operationId, operation]));
const botModule = readFrontend('apps/web/src/modules/bot/index.tsx');
const schemas = openapi.components.schemas;
const permissions = JSON.parse(readFrontend('packages/contracts/src/permissions.json'));
const routeActions = routes.flatMap(route => (route.actions || []).map(action => action.operationId));
const updateBudgetPolicyGap = !task.operationIds.includes('updateBudgetPolicy')
    && !routeActions.includes('updateBudgetPolicy')
    && Boolean(operations.updateBudgetPolicy)
    && operations.updateBudgetPolicy['x-permission'] === 'operations.manage'
    && botModule.includes("useCommand('updateBudgetPolicy'");
assert(updateBudgetPolicyGap, 'The updateBudgetPolicy plan/route discrepancy changed; re-audit before capturing');
assert(schemas.AIConnection.properties.capabilities, 'Provider capability must remain contract-defined');
assert(schemas.AgentRole.properties.allowedToolIds, 'AgentRole tool IDs must remain contract-defined');
assert(schemas.AgentRoleWrite.properties.allowedToolIds === undefined, 'AgentRoleWrite must not grant tools through an uncontracted field');
assert(schemas.BotConfigWritePatch.properties.requireHumanOrderConfirmation.const === true, 'Human confirmation must remain contract-locked');
assert(schemas.BotConfigWritePatch.properties.allowedActions === undefined, 'BotConfig.allowedActions remains absent from the canonical DTO');
assert(schemas.Evaluation.properties.mockOnly === undefined, 'Synthetic mockOnly metadata must not become an API DTO field');
assert(JSON.stringify(permissions.agentRoles.sales_admin) === JSON.stringify(['catalog.read', 'customers.read', 'conversations.read', 'orders.read', 'orders.write', 'orders.confirm']), 'Canonical sales_admin tool permission boundary changed');

const commandMap = jsonKit('execution/frontend-command-map.json');
const commandIds = ['e2e', 'verify-current-20261002', 'feature-source-maps-20261002'];
const commands = Object.fromEntries(commandIds.map(id => {
    const command = commandMap.commands.find(item => item.id === id);
    assert(command && command.status === 'VERIFIED_AVAILABLE', 'Registered command is unavailable: ' + id);
    return [id, command];
}));

const sourcePaths = [
    'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/KNOWN_GAPS.md',
    'package.json', 'package-lock.json', 'playwright.config.ts', 'apps/web/src/app/router.tsx', 'apps/web/src/app/Shell.tsx',
    'apps/web/src/modules/bot/index.tsx', 'apps/web/src/mocks/auxiliary.ts', 'apps/web/src/mocks/service.ts',
    'apps/web/src/mocks/database.ts', 'apps/web/src/mocks/seed.json', 'apps/web/src/shared/api/client.ts',
    'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/model/scope.tsx', 'apps/web/src/shared/model/auth.ts',
    'apps/web/src/shared/ui/components.tsx', 'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json',
    'packages/contracts/src/routes.json', 'packages/contracts/src/permissions.json', 'scripts/run-e2e.mjs',
    'scripts/test-domain.mjs', 'evidence/source-check.json', 'tests/fe018.spec.ts', 'tests/fe018-source-map.test.mjs',
    'tests/domain-scenarios.cjs', 'tests/fixtures/mock-network.mjs', 'tests/accessibility/routes.spec.ts', 'tests/security.spec.ts',
    'botsales-kit/AGENTS.md', 'botsales-kit/docs/02_ARCHITECTURE.md', 'botsales-kit/docs/06_API_AND_REALTIME.md',
    'botsales-kit/docs/18_CODING_STANDARDS.md', 'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
    'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/feature-catalog.json',
    'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
    'botsales-kit/execution/frontend-evidence/FE018/S01-route-operation-map.md',
    'botsales-kit/execution/frontend-evidence/FE018/capture-current-evidence-20261008.mjs',
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
    'OpenAPI defines updateBudgetPolicy with operations.manage and the bot module uses it for versioned budget edits, but FE018 operationIds and R51 actions omit it. The implementation is visible and browser-tested, while task/route traceability remains unresolved.',
    'BotConfig.allowedActions is absent from the canonical DTO. The UI uses canonical operation permissions, config version, and lifecycle controls; this does not establish a server-provided allowedActions contract.',
];

const casesByStep = {
    S01: [
        { name: 'R26/R27/R28/R51 unique route-operation union equals the 18 planned FE018 operations', count: '4 routes / 18 operations', status: 'PASS' },
        { name: 'F01/H02/H03 feature catalog mapping to R51 matches route-manifest feature IDs', status: 'PASS' },
        { name: 'updateBudgetPolicy OpenAPI permission and UI usage are traced; missing plan and R51 mapping are recorded', count: '1 traceability gap', status: 'PASS' },
        { name: 'Capabilities, tool grants, human confirmation and synthetic evaluation fields match canonical schemas', count: '2 FE018 source-map checks', status: 'PASS' },
    ],
    S02: [
        { name: 'Bot draft save, publish and pause bind to config version and the revision that was evaluated', status: 'PASS' },
        { name: 'Playground and evaluation remain synthetic, send no external message, and retain unknown cost/token values', status: 'PASS' },
        { name: 'Versioned role kill switch changes selected scope and preserves declared API tool permissions', status: 'PASS' },
        { name: 'Budget approval outcomes and evaluation cursor detail/navigation state are exercised', count: '25 and 105 record UI004 cases also pass', status: 'PASS' },
    ],
    S03: [
        { name: 'Config conflict preserves human order confirmation as locked true', status: 'PASS' },
        { name: 'Stale revision-bound evaluation cannot publish a newer bot draft', status: 'PASS' },
        { name: 'Budget and tool denials preserve the prompt and do not show a generated answer', status: 'PASS' },
        { name: 'Expired and wrong-scope approvals return honest budget outcomes', status: 'PASS' },
        { name: 'Unauthorized role operations are denied and unknown automation commands remain unresolved', status: 'PASS' },
    ],
    S04: [
        { name: 'FE018 canonical route/operation/permission and DTO source-map regression', count: '2 FE018 checks; current group 16/16', status: 'PASS' },
        { name: 'Current registered component/unit regression', count: '138/138', status: 'PASS' },
        { name: 'Current registered synthetic API/domain network regression', count: '88/88', status: 'PASS' },
        { name: 'Current source checker', count: '68 files / 54 routes / 220 operation calls', status: 'PASS' },
        { name: 'Current cross-browser React demo suite', count: '512/512', status: 'PASS' },
    ],
    S05: [
        { name: 'All 13 scenarios in the FE018 shared spec file execute in Chromium and Firefox', count: '26/26; 20 FE018, 2 shared FE027, 4 UI004 results', status: 'PASS' },
        { name: 'Config revision, evaluation, role boundary, budget denial/approval and unknown command flows pass in browser', status: 'PASS' },
        { name: 'Current registered full React demo E2E passes in both browser projects', count: '512/512; 256 per browser', status: 'PASS' },
    ],
};
const resultSpecs = [
    ['e2e', logs.e2e, { testsPassed: 512, browserProjects: ['chromium', 'firefox'] }],
    ['verify-current-20261002', logs.verify, { unitTestsPassed: 138, domainNetworkPassed: 88 }],
    ['feature-source-maps-20261002', logs.sourceMaps, { testsPassed: 16, fe018SourceMapChecks: 2 }],
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
    S01: 'feature-source-maps-20261002',
    S02: 'e2e',
    S03: 'e2e',
    S04: 'verify-current-20261002',
    S05: 'e2e',
};
const primaryLogs = {
    e2e: logs.e2e,
    'verify-current-20261002': logs.verify,
    'feature-source-maps-20261002': logs.sourceMaps,
};

for (const step of task.implementationSteps) {
    const cases = casesByStep[step.id];
    const primaryId = primaryByStep[step.id];
    const supplementalMap = step.id === 'S01' ? {
        command: 'node --test tests/fe018-source-map.test.mjs',
        commandId: 'feature-source-maps-20261002',
        registeredAsExactCommand: false,
        exitCode: 0,
        testsPassed: 2,
        logFile: logs.focusedMap,
        logSha256: sha(readKit(logs.focusedMap)),
    } : undefined;
    const supplementalBrowser = step.id === 'S05' ? {
        command: 'npm.cmd --script-shell=cmd.exe run test:e2e -- tests/fe018.spec.ts',
        commandId: 'e2e',
        registeredAsExactCommand: false,
        note: 'The filtered file run is supplemental; the receipt primary command points to the exact registered full E2E command.',
        exitCode: 0,
        testsPassed: 26,
        fe018Results: 20,
        sharedFe027Results: 2,
        ui004Results: 4,
        logFile: logs.focused,
        logSha256: sha(readKit(logs.focused)),
    } : undefined;
    const primaryLog = primaryLogs[primaryId];
    const evidenceLog = [
        'FE018.' + step.id + ' bot configuration, playground and evaluation verification.',
        'executedAt=' + executedAt,
        'cwd=' + frontendRoot,
        ...commandResults.map(result => 'supportingCommandId=' + result.commandId + '; command=' + result.command + '; exitCode=0; log=' + result.logFile + '; sha256=' + result.logSha256),
        ...(supplementalMap ? ['supplementalSourceMapCommand=' + supplementalMap.command + '; exitCode=0; checks=2/2; log=' + supplementalMap.logFile + '; sha256=' + supplementalMap.logSha256] : []),
        ...(supplementalBrowser ? ['supplementalBrowserCommand=' + supplementalBrowser.command + '; exitCode=0; tests=26/26; log=' + supplementalBrowser.logFile + '; sha256=' + supplementalBrowser.logSha256] : []),
        ...cases.map(item => 'CASE ' + item.status + ': ' + item.name + (item.count ? ' (' + item.count + ')' : '')),
        ...gaps.map(gap => 'TRACEABILITY_OR_CONTRACT_GAP=' + gap),
        'sourceSnapshotSha256=' + sourceSnapshotSha256,
        'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no external AI, real model evaluation, purchase confirmation, production budget enforcement or kill-switch execution is claimed.',
    ].join('\n') + '\n';
    const logName = step.id + '-current-20261008.log';
    fs.writeFileSync(path.join(evidenceDir, logName), evidenceLog, 'utf8');
    const observed = cases.map(item => item.name + (item.count ? ' (' + item.count + ')' : '')).join('; ')
        + '. Current full browser E2E passed 512/512 (Chromium 256/256; Firefox 256/256); focused shared file passed 26/26; unit 138/138; domain/network 88/88; source-map suite 16/16 including 2 FE018 checks. updateBudgetPolicy and BotConfig.allowedActions traceability gaps are explicitly recorded. All runtime behavior is synthetic MSW.';
    const evidence = {
        taskId: 'FE018',
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
            details: 'React bot demo uses synthetic configurations, role/tool/budget policies and evaluation fixtures over MSW.',
            dataSource: 'synthetic-msw',
        },
        checksTotal: cases.length,
        failed: 0,
        checks: cases.map(item => ({ name: item.name, status: item.status })),
        sourceFiles,
        sourceSnapshotSha256,
        logFile: 'execution/frontend-evidence/FE018/' + logName,
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
            updateBudgetPolicyGap,
            traceabilityGaps: gaps,
            focusedBrowserResults: 26,
            focusedFe018Results: 20,
            focusedSharedFe027Results: 2,
            focusedUi004Results: 4,
            cases,
            ...(supplementalMap ? { supplementalSourceMapRun: supplementalMap } : {}),
            ...(supplementalBrowser ? { supplementalBrowserRun: supplementalBrowser } : {}),
        },
    };
    fs.writeFileSync(path.join(evidenceDir, step.id + '-current-20261008.json'), JSON.stringify(evidence, null, 2) + '\n', 'utf8');
}

console.log(JSON.stringify({
    result: 'PASS',
    taskId: 'FE018',
    routes: task.routeIds,
    operations: routeOperationIds.length,
    features: task.featureIds,
    updateBudgetPolicyTraceabilityGap: true,
    focusedBrowser: '26/26; 20 FE018, 2 shared FE027, 4 UI004 results',
    focusedSourceMap: '2/2',
    fullE2E: '512/512',
    unit: '138/138',
    domainNetwork: '88/88',
    sourceMaps: '16/16',
    sourceFiles: sourceFiles.length,
    sourceSnapshotSha256,
    evidenceFiles: task.implementationSteps.map(step => step.id + '-current-20261008.json'),
}, null, 2));
