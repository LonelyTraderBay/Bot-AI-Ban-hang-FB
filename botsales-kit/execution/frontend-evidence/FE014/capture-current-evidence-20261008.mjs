import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE014');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const readFrontend = relative => fs.readFileSync(path.join(frontendRoot, relative), 'utf8');
const readKit = relative => fs.readFileSync(path.join(kitRoot, relative), 'utf8');
const jsonKit = relative => JSON.parse(readKit(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(path.basename(frontendRoot) === 'BotSalesAI_Frontend', `Run from Frontend workspace; got ${frontendRoot}`);
const plan = jsonKit('execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE014');
assert(task?.implementationSteps?.length === 5, 'Canonical FE014 S01-S05 plan not found');

const logs = {
    e2e: 'execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log',
    verify: 'execution/frontend-evidence/FE001/S03-full-verify-powershell-current-20261008.log',
    sourceMaps: 'execution/frontend-evidence/FE012/S01-source-maps-current-20261008.log',
    sourceReport: 'execution/frontend-evidence/FE005/S01-source-check-report-current-20261008.json',
    crosswalk: 'execution/frontend-evidence/FE005/S01-contract-crosswalk-current-20261008.log',
    focused: 'execution/frontend-evidence/FE014/S05-e2e-focused-current-20261008.log',
    detailedHistory: 'execution/frontend-evidence/FE009/S02-e2e-current-20261007.log',
};

const e2eText = readKit(logs.e2e);
const verifyText = readKit(logs.verify);
const sourceMapText = readKit(logs.sourceMaps);
const focusedText = readKit(logs.focused);
const sourceReport = jsonKit(logs.sourceReport);
const sourceMapJsonMatch = sourceMapText.match(/\{\s*"taskId": "FE014"[\s\S]*?\n\}/);
assert(sourceMapJsonMatch, 'Current FE014 source-map report is missing');
const sourceMap = JSON.parse(sourceMapJsonMatch[0]);
assert(e2eText.includes('512 passed (50.5m)') && e2eText.includes('Chromium 256/256 and Firefox 256/256') && e2eText.includes('EXIT_CODE=0'), 'Current registered full E2E is not 512/512');
assert(verifyText.includes('EXIT_CODE=0') && verifyText.includes('Tests  138 passed (138)') && verifyText.includes('"passed":88'), 'Current full verify does not show all expected gates');
assert(sourceReport.status === 'PASS' && sourceReport.files === 68 && sourceReport.operationCalls === 220 && sourceReport.routes === 54, 'Current source report is not passing at the expected coverage');
assert(sourceMap.taskId === 'FE014' && sourceMap.checks === 95 && sourceMap.operations === 13 && sourceMap.routes.join(',') === 'R44,R45,R46,R47', 'Current FE014 route/source map is incomplete');
assert(sourceMapText.includes('ℹ tests 16') && sourceMapText.includes('ℹ pass 16') && sourceMapText.includes('ℹ fail 0'), 'Current feature source-map suite is not 16/16');
assert(focusedText.includes('14 passed (1.1m)') && focusedText.includes('EXIT_CODE=0'), 'Current focused FE014 browser run is not 14/14');

const browserCases = [
    'FE014.AC01 multi-line purchase validates MOQ/pack size and binds approval to the created intent',
    'FE027.D02 supplier workspace edits the selected contact through its current version and displays MOQ offers',
    'FE014.AC02 approval covers the exact purchase intent; unknown send is blocked from blind retry',
    'FE014.S03 auto-send cannot be configured without an enabled procurement budget',
    'FE014.S03 manager without procurement.receive cannot open receipt actions',
    'FE014.AC03 partial receipt posts only accepted units to synthetic stock and payable once',
    'FE014.D03/D04/D07 replenishment uses min-max rules, labels forecast limits, and blocks duplicate proposals',
];
const testSource = readFrontend('tests/fe014.spec.ts');
for (const name of browserCases) {
    assert(testSource.includes(`test('${name}'`), `FE014 browser test is missing from source: ${name}`);
    assert(focusedText.includes(name), `Current focused browser log is missing scenario: ${name}`);
}

const routeManifest = jsonKit('contracts/route-manifest.json');
const routes = task.routeIds.map(id => routeManifest.routes.find(route => route.id === id));
assert(routes.every(Boolean), 'FE014 canonical route is missing');
const routeOperations = [...new Set(routes.flatMap(route => [
    ...route.readOperations,
    ...route.actions.map(action => action.operationId),
]))].sort();
assert(JSON.stringify(routeOperations) === JSON.stringify([...task.operationIds].sort()), 'FE014 task operation IDs differ from unique operations in R44-R47');
const routeFeatures = [...new Set(routes.flatMap(route => route.featureIds))].sort();
assert(JSON.stringify(routeFeatures) === JSON.stringify([...task.featureIds].sort()), 'FE014 feature IDs do not match R44-R47 route feature IDs');
const actionOperations = [...new Set(routes.flatMap(route => route.actions.map(action => action.operationId)))];
assert(actionOperations.length === sourceMap.operations && routeOperations.length === task.operationIds.length, 'FE014 action/read operation counts do not reconcile');

const commandMap = jsonKit('execution/frontend-command-map.json');
const commands = Object.fromEntries(['e2e', 'verify-current-20261002', 'feature-source-maps-20261002'].map(id => {
    const command = commandMap.commands.find(item => item.id === id);
    assert(command?.status === 'VERIFIED_AVAILABLE', `Registered command ${id} is unavailable`);
    return [id, command];
}));

const sourcePaths = [
    'AGENTS.md', 'AI_RULES.md', 'docs/KNOWN_GAPS.md', 'package.json', 'package-lock.json', 'playwright.config.ts',
    'apps/web/vite.config.ts', 'apps/web/src/app/router.tsx', 'apps/web/src/app/Shell.tsx', 'apps/web/src/app/SessionProvider.tsx',
    'apps/web/src/app/CommandRecovery.tsx', 'apps/web/src/modules/procurement/index.tsx', 'apps/web/src/modules/finance/index.tsx',
    'apps/web/src/mocks/procurement.ts', 'apps/web/src/mocks/finance.ts', 'apps/web/src/mocks/database.ts', 'apps/web/src/mocks/seed.json',
    'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/model/scope.tsx',
    'apps/web/src/shared/model/auth.ts', 'apps/web/src/shared/ui/components.tsx',
    'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json', 'packages/contracts/src/routes.json',
    'scripts/run-e2e.mjs', 'scripts/test-domain.mjs', 'tests/fe014.spec.ts', 'tests/fe014-source-map.test.mjs',
    'tests/domain-scenarios.cjs', 'tests/fe013-source-map.test.mjs', 'tests/fe015-source-map.test.mjs',
    'tests/fe016-source-map.test.mjs', 'tests/fe017-source-map.test.mjs', 'tests/fe018-source-map.test.mjs',
    'tests/fe020-source-map.test.mjs', 'tests/fixtures/mock-network.mjs', 'tests/accessibility/routes.spec.ts', 'tests/security.spec.ts',
    'botsales-kit/AGENTS.md', 'botsales-kit/docs/08_SECURITY_TENANCY_RBAC.md',
    'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
    'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/feature-catalog.json',
    'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
    'botsales-kit/execution/frontend-evidence/FE014/S01-route-operation-map.md',
    ...Object.values(logs).map(relative => `botsales-kit/${relative}`),
    'botsales-kit/execution/frontend-evidence/FE014/capture-current-evidence-20261008.mjs',
].sort();
const sourceFiles = [...new Set(sourcePaths)].map(relative => {
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
        { name: 'R44-R47 and D01-D08 match canonical route and feature catalogs', count: '4 routes / 8 features / 22 unique operations', status: 'PASS' },
        { name: 'Current procurement source-map validates action operation IDs, DTOs, permissions and behaviors', count: '95 assertions; 13 mutation operations', status: 'PASS' },
        { name: 'Current cross-feature route/operation source-map suite passes with FE014 included', count: '16/16 tests', status: 'PASS' },
    ],
    S02: [
        { name: 'Multi-line purchase enforces MOQ/pack size and approval binds the created intent hash', status: 'PASS' },
        { name: 'Partial receipt records accepted/rejected quantities and posts accepted stock/payable once', status: 'PASS' },
        { name: 'Min-max replenishment labels forecast limits and prevents duplicate proposals', status: 'PASS' },
        { name: 'Supplier offer/contact and procurement view use the current supplier resource', status: 'PASS' },
    ],
    S03: [
        { name: 'Approval is tied to exact intent; unknown purchase send disables blind retry', status: 'PASS' },
        { name: 'Auto-send remains blocked without enabled, limited procurement budget', status: 'PASS' },
        { name: 'Receipt posting requires procurement.receive; manager role cannot open receipt actions', status: 'PASS' },
        { name: 'Current contracts/mock checks reject unapproved suppliers, stale approval, invalid MOQ/pack and receipt replay', count: '95 source assertions plus current domain/network suite', status: 'PASS' },
    ],
    S04: [
        { name: 'Current FE014 contract/source map', count: '95 assertions', status: 'PASS' },
        { name: 'Full verify exits zero; generated contracts, source, boundaries, lint, typecheck and build gates pass', status: 'PASS' },
        { name: 'Component/unit suite', count: '138/138', status: 'PASS' },
        { name: 'Synthetic domain/network suite', count: '88/88', status: 'PASS' },
        { name: 'Route/source-map suite', count: '16/16', status: 'PASS' },
    ],
    S05: [
        { name: 'Seven procurement browser scenarios run in Chromium and Firefox', count: '14/14; 7 per engine', status: 'PASS' },
        { name: 'Partial receipt updates stock/payable once; budget and receive permission gates are visible', status: 'PASS' },
        { name: 'Receipt view is overflow-free at 320px and focused axe check has zero violations', status: 'PASS' },
        { name: 'Current registered full React demo E2E', count: '512/512; Chromium 256/256 and Firefox 256/256', status: 'PASS' },
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
    commandResult('feature-source-maps-20261002', logs.sourceMaps, { testsPassed: 16, fe014Assertions: 95 }),
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

for (const step of task.implementationSteps) {
    const cases = groups[step.id];
    const primaryId = primaryCommandByStep[step.id];
    const primaryLog = primaryLogByCommand[primaryId];
    const supplemental = step.id === 'S05' ? {
        command: 'npm.cmd --script-shell=cmd.exe run test:e2e -- tests/fe014.spec.ts',
        commandId: 'e2e',
        registeredAsExactCommand: false,
        note: 'Focused invocation is supplemental only; the tracker command must match the exact registered full-suite command used as the primary receipt.',
        exitCode: 0,
        testsPassed: 14,
        logFile: logs.focused,
    } : undefined;
    const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Current registered full E2E passed 512/512 (Chromium 256/256; Firefox 256/256); current verify passed 138/138 unit and 88/88 domain/network checks; source-map suite passed 16/16 including FE014's 95 assertions. R44-R47 route/read/action operation union matches all 22 planned unique operation IDs. All writes ran against synthetic MSW only; no supplier, payment or database integration is claimed.`;
    const evidenceLog = [
        `FE014.${step.id} procurement, approval and receipt verification.`,
        `executedAt=${executedAt}`,
        `cwd=${frontendRoot}`,
        `primaryCommandId=${primaryId}; command=${commands[primaryId].command}; exitCode=0; log=${primaryLog}`,
        ...results.map(result => `supportingCommandId=${result.commandId}; command=${result.command}; exitCode=${result.exitCode}; log=${result.logFile}; sha256=${result.logSha256}`),
        ...(supplemental ? [`supplementalCommand=${supplemental.command}; exitCode=0; tests=14/14; log=${supplemental.logFile}; not registered as the primary progress command`] : []),
        ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
        `sourceSnapshotSha256=${sourceSnapshotSha256}`,
        'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no real supplier transaction, transfer of money, database race or hosted integration claim.',
    ].join('\n') + '\n';
    const logName = `${step.id}-current-20261008.log`;
    fs.writeFileSync(path.join(evidenceDir, logName), evidenceLog, 'utf8');
    const evidence = {
        taskId: 'FE014',
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
            details: 'React demo uses local synthetic supplier, purchase, approval, budget, receipt, stock and debt fixtures over MSW.',
            dataSource: step.id === 'S01' ? 'source-only' : 'synthetic-msw',
        },
        checksTotal: cases.length,
        failed: 0,
        checks: cases.map(item => ({ name: item.name, status: item.status })),
        sourceFiles,
        sourceSnapshotSha256,
        logFile: `execution/frontend-evidence/FE014/${logName}`,
        logSha256: sha(Buffer.from(evidenceLog)),
        commandResults: results,
        audit: {
            result: 'PASS',
            routeIds: task.routeIds,
            featureIds: task.featureIds,
            operationIds: task.operationIds,
            actionOperationCount: sourceMap.operations,
            cases,
            ...(supplemental ? { supplementalRun: supplemental } : {}),
        },
    };
    fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261008.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
    result: 'PASS',
    taskId: 'FE014',
    routes: task.routeIds,
    features: task.featureIds,
    uniqueRouteOperations: routeOperations.length,
    actionOperations: sourceMap.operations,
    fullE2E: '512/512; Chromium 256/256; Firefox 256/256',
    focusedFE014: '14/14; Chromium 7/7; Firefox 7/7',
    unit: '138/138',
    domainNetwork: '88/88',
    sourceMapChecks: 95,
    sourceMapSuite: '16/16',
    sourceFiles: sourceFiles.length,
    sourceSnapshotSha256,
    evidenceFiles: task.implementationSteps.map(step => `${step.id}-current-20261008.json`),
}, null, 2));
