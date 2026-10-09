import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE015');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const readFrontend = relative => fs.readFileSync(path.join(frontendRoot, relative), 'utf8');
const readKit = relative => fs.readFileSync(path.join(kitRoot, relative), 'utf8');
const jsonKit = relative => JSON.parse(readKit(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(path.basename(frontendRoot) === 'BotSalesAI_Frontend', `Run from Frontend workspace; got ${frontendRoot}`);
const plan = jsonKit('execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE015');
assert(task?.implementationSteps?.length === 5, 'Canonical FE015 S01-S05 plan not found');

const logs = {
    e2e: 'execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log',
    verify: 'execution/frontend-evidence/FE001/S03-full-verify-powershell-current-20261008.log',
    sourceMaps: 'execution/frontend-evidence/FE012/S01-source-maps-current-20261008.log',
    sourceReport: 'execution/frontend-evidence/FE005/S01-source-check-report-current-20261008.json',
    crosswalk: 'execution/frontend-evidence/FE005/S01-contract-crosswalk-current-20261008.log',
    focused: 'execution/frontend-evidence/FE015/S05-e2e-focused-current-20261008.log',
    detailedHistory: 'execution/frontend-evidence/FE009/S02-e2e-current-20261007.log',
};
const e2eText = readKit(logs.e2e);
const verifyText = readKit(logs.verify);
const sourceMapText = readKit(logs.sourceMaps);
const focusedText = readKit(logs.focused);
const sourceReport = jsonKit(logs.sourceReport);
assert(e2eText.includes('512 passed (50.5m)') && e2eText.includes('Chromium 256/256 and Firefox 256/256') && e2eText.includes('EXIT_CODE=0'), 'Current registered full E2E is not 512/512');
assert(verifyText.includes('EXIT_CODE=0') && verifyText.includes('Tests  138 passed (138)') && verifyText.includes('"passed":88'), 'Current full verify does not show all expected gates');
assert(sourceReport.status === 'PASS' && sourceReport.files === 68 && sourceReport.operationCalls === 220 && sourceReport.routes === 54, 'Current source report is not passing at the expected coverage');
assert(sourceMapText.includes('FE015 source map: 131 contract/source assertions passed'), 'Current FE015 finance source map is incomplete');
assert(sourceMapText.includes('ℹ tests 16') && sourceMapText.includes('ℹ pass 16') && sourceMapText.includes('ℹ fail 0'), 'Current feature source-map suite is not 16/16');
assert(focusedText.includes('22 passed (1.4m)') && focusedText.includes('EXIT_CODE=0'), 'Current focused FE015 browser run is not 22/22');

const browserCases = [
    'FE015.AC01 report filters use exact timezone boundaries and mock API aggregates',
    'FE021.E08 report explanation is mock-only, cites the filtered P&L snapshot, and never writes finance data',
    'UI003 report timestamps follow the active shop timezone',
    'FE015.E02/E03 profit report renders canonical cost, gross-profit and operating-expense values',
    'FE015.AC02 journal rejects unbalanced decimal lines before POST and sends exact money strings',
    'FE015.AC02 closed accounting period is visible and disables journal draft creation',
    'FE015.AC03 CSV import keeps partial row failures visible and deduplicates external transactions',
    'UI001 reconciliation cursors stay scoped and dialogs load choices beyond the visible table page',
    'FE015.AC03 COD settlement matches net remittance plus documented fee',
    'FE015.AC03 partial bank allocation leaves the remaining amount and debt visible',
    'FE015.AC03 unknown journal posting is not resent from the same draft',
];
const testSource = readFrontend('tests/fe015.spec.ts');
for (const name of browserCases) {
    assert(testSource.includes(`test('${name}'`), `FE015 browser test is missing from source: ${name}`);
    assert(focusedText.includes(name), `Current focused browser log is missing scenario: ${name}`);
}

const routeManifest = jsonKit('contracts/route-manifest.json');
const routes = task.routeIds.map(id => routeManifest.routes.find(route => route.id === id));
assert(routes.every(Boolean), 'FE015 canonical route is missing');
const routeOperations = [...new Set(routes.flatMap(route => [
    ...route.readOperations,
    ...route.actions.map(action => action.operationId),
]))].sort();
assert(JSON.stringify(routeOperations) === JSON.stringify([...task.operationIds].sort()), 'FE015 task operation IDs differ from unique operations in its six routes');
const featureCatalog = jsonKit('contracts/feature-catalog.json');
const featureEntries = task.featureIds.map(id => featureCatalog.features.find(feature => feature.id === id));
assert(featureEntries.every(Boolean), 'FE015 feature catalog entry is missing');
assert(featureEntries.every(feature => feature.routeIds.some(id => task.routeIds.includes(id))), 'FE015 feature catalog points outside the task route scope');
const routeManifestFeatureIds = [...new Set(routes.flatMap(route => route.featureIds ?? []))].sort();
const unmappedRouteFeatureIds = task.featureIds.filter(id => !routes.some(route => route.featureIds?.includes(id)));
assert(JSON.stringify(unmappedRouteFeatureIds) === JSON.stringify(['E08']), 'Unexpected feature-to-route-manifest gap in FE015');
const e08 = featureEntries.find(feature => feature.id === 'E08');
assert(e08.routeIds.includes('R22') && !routes.find(route => route.id === 'R22').featureIds?.includes('E08'), 'E08 route-manifest mismatch changed');

const commandMap = jsonKit('execution/frontend-command-map.json');
const commands = Object.fromEntries(['e2e', 'verify-current-20261002', 'feature-source-maps-20261002'].map(id => {
    const command = commandMap.commands.find(item => item.id === id);
    assert(command?.status === 'VERIFIED_AVAILABLE', `Registered command ${id} is unavailable`);
    return [id, command];
}));

const sourcePaths = [
    'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/KNOWN_GAPS.md',
    'docs/FRONTEND_SPACING_STANDARD.md', 'package.json', 'package-lock.json', 'playwright.config.ts',
    'apps/web/vite.config.ts', 'apps/web/src/app/router.tsx', 'apps/web/src/app/Shell.tsx',
    'apps/web/src/app/SessionProvider.tsx', 'apps/web/src/app/CommandRecovery.tsx',
    'apps/web/src/modules/finance/index.tsx', 'apps/web/src/modules/fulfillment/index.tsx',
    'apps/web/src/modules/orders/index.tsx', 'apps/web/src/mocks/finance.ts', 'apps/web/src/mocks/fulfillment.ts',
    'apps/web/src/mocks/database.ts', 'apps/web/src/mocks/seed.json', 'apps/web/src/shared/api/client.ts',
    'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/model/scope.tsx', 'apps/web/src/shared/model/format.ts',
    'apps/web/src/shared/model/auth.ts', 'apps/web/src/shared/ui/components.tsx', 'apps/web/src/shared/ui/README.md',
    'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json', 'packages/contracts/src/routes.json',
    'scripts/run-e2e.mjs', 'scripts/test-domain.mjs', 'tests/fe015.spec.ts', 'tests/fe015-source-map.test.mjs',
    'tests/domain-scenarios.cjs', 'tests/fe013-source-map.test.mjs', 'tests/fe014-source-map.test.mjs',
    'tests/fe016-source-map.test.mjs', 'tests/fe017-source-map.test.mjs', 'tests/fe018-source-map.test.mjs',
    'tests/fe020-source-map.test.mjs', 'tests/fixtures/mock-network.mjs', 'tests/accessibility/routes.spec.ts',
    'tests/security.spec.ts', 'botsales-kit/AGENTS.md', 'botsales-kit/docs/02_ARCHITECTURE.md',
    'botsales-kit/docs/06_API_AND_REALTIME.md', 'botsales-kit/docs/18_CODING_STANDARDS.md',
    'botsales-kit/docs/24_FINANCE.md', 'botsales-kit/contracts/route-manifest.json',
    'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/permission-catalog.json',
    'botsales-kit/contracts/feature-catalog.json', 'botsales-kit/execution/frontend-plan.json',
    'botsales-kit/execution/frontend-command-map.json', 'botsales-kit/execution/frontend-evidence/FE015/S01-route-operation-map.md',
    ...Object.values(logs).map(relative => `botsales-kit/${relative}`),
    'botsales-kit/execution/frontend-evidence/FE015/capture-current-evidence-20261008.mjs',
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
        { name: 'R20-R22 and R48-R50 route reads/actions match the 25 task operations; E01-E08 map to these routes in feature catalog', count: '6 routes / 8 features / 25 operations', status: 'PASS' },
        { name: 'R22 omits E08 from route-manifest.featureIds although feature-catalog maps E08 to R22', count: '1 documented traceability gap', status: 'PASS' },
        { name: 'Current finance source map validates reads, writes, permissions, DTOs, decimal and timezone boundaries', count: '131 assertions', status: 'PASS' },
        { name: 'Current cross-feature route/operation source-map suite passes with FE015 included', count: '16/16 tests', status: 'PASS' },
    ],
    S02: [
        { name: 'Cashflow/P&L use exact report range, shop timezone and mock API aggregate', status: 'PASS' },
        { name: 'Journal editor preserves decimal strings, rejects unbalanced lines and respects closed period', status: 'PASS' },
        { name: 'CSV statement import shows partial failures and deduplicates external transaction IDs', status: 'PASS' },
        { name: 'COD net remittance reconciles documented fee; partial bank match leaves remainder/debt visible', status: 'PASS' },
    ],
    S03: [
        { name: 'Unbalanced journal is rejected before POST; amount payload stays exact decimal strings', status: 'PASS' },
        { name: 'Closed period prevents journal creation; CSV invalid and duplicate rows stay visible', status: 'PASS' },
        { name: 'COD fee/net and partial bank-allocation boundaries are checked in the browser', status: 'PASS' },
        { name: 'Unknown journal post cannot be resent blindly from the same draft', status: 'PASS' },
        { name: 'Report filters use the shop timezone and half-open period boundaries', status: 'PASS' },
    ],
    S04: [
        { name: 'Finance contract, permission and UI source regression', count: '131 assertions', status: 'PASS' },
        { name: 'Registered full verify gates', status: 'PASS' },
        { name: 'Component/unit suite', count: '138/138', status: 'PASS' },
        { name: 'Synthetic domain/network suite', count: '88/88', status: 'PASS' },
        { name: 'Feature source-map suite', count: '16/16', status: 'PASS' },
    ],
    S05: [
        { name: 'Eleven current finance/report/reconciliation browser cases pass on Chromium and Firefox', count: '22/22; 11 per engine', status: 'PASS' },
        { name: 'Partial statement and COD matching, timezone labels and report explanation display in the React app', status: 'PASS' },
        { name: 'Unknown posting recovery guard is exercised; tests do not issue live payments or bank transfers', status: 'PASS' },
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
    commandResult('feature-source-maps-20261002', logs.sourceMaps, { testsPassed: 16, fe015Assertions: 131 }),
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
const traceabilityLimits = [
    'Feature catalog maps E08 to R22, but the R22 route-manifest entry has no featureIds; task/feature catalog retained and mismatch recorded without editing shared contract.',
    'No canonical account-catalog operation exists; the journal UI requests an explicit account ID and labels the limit.',
    'The finance views are management summaries over synthetic mock aggregates, not statutory accounting or tax compliance evidence.',
    'Bank/COD files and command outcomes are local fixtures; no live bank/carrier/payment provider is connected.',
];

for (const step of task.implementationSteps) {
    const cases = groups[step.id];
    const primaryId = primaryCommandByStep[step.id];
    const primaryLog = primaryLogByCommand[primaryId];
    const supplemental = step.id === 'S05' ? {
        command: 'npm.cmd --script-shell=cmd.exe run test:e2e -- tests/fe015.spec.ts',
        commandId: 'e2e',
        registeredAsExactCommand: false,
        note: 'Filtered invocation is supplemental only; the exact registered full-suite command is the receipt primary command.',
        exitCode: 0,
        testsPassed: 22,
        logFile: logs.focused,
    } : undefined;
    const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Current registered full E2E passed 512/512 (Chromium 256/256; Firefox 256/256); full verify passed 138/138 unit and 88/88 domain/network checks; current source-map suite passed 16/16 including FE015's 131 assertions. All finance/bank/COD data is synthetic; account catalog and statutory compliance remain outside the available contract.`;
    const evidenceLog = [
        `FE015.${step.id} finance, COD, journal and reconciliation verification.`,
        `executedAt=${executedAt}`,
        `cwd=${frontendRoot}`,
        `primaryCommandId=${primaryId}; command=${commands[primaryId].command}; exitCode=0; log=${primaryLog}`,
        ...results.map(result => `supportingCommandId=${result.commandId}; command=${result.command}; exitCode=${result.exitCode}; log=${result.logFile}; sha256=${result.logSha256}`),
        ...(supplemental ? [`supplementalCommand=${supplemental.command}; exitCode=0; tests=22/22; log=${supplemental.logFile}; not registered as the primary progress command`] : []),
        ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
        ...traceabilityLimits.map(item => `LIMIT=${item}`),
        `sourceSnapshotSha256=${sourceSnapshotSha256}`,
        'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no live bank, COD carrier, payment, statutory or backend result is claimed.',
    ].join('\n') + '\n';
    const logName = `${step.id}-current-20261008.log`;
    fs.writeFileSync(path.join(evidenceDir, logName), evidenceLog, 'utf8');
    const evidence = {
        taskId: 'FE015',
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
            details: 'Finance UI and imports run against local MSW fixtures; no bank account, provider credentials or live ledger is connected.',
            dataSource: step.id === 'S01' ? 'source-only' : 'synthetic-msw',
        },
        checksTotal: cases.length,
        failed: 0,
        checks: cases.map(item => ({ name: item.name, status: item.status })),
        sourceFiles,
        sourceSnapshotSha256,
        logFile: `execution/frontend-evidence/FE015/${logName}`,
        logSha256: sha(Buffer.from(evidenceLog)),
        commandResults: results,
        audit: {
            result: 'PASS',
            routeIds: task.routeIds,
            featureIds: task.featureIds,
            routeManifestFeatureIds,
            traceabilityGaps: traceabilityLimits,
            operationIds: task.operationIds,
            traceabilityLimits,
            cases,
            ...(supplemental ? { supplementalRun: supplemental } : {}),
        },
    };
    fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261008.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
    result: 'PASS',
    taskId: 'FE015',
    routes: task.routeIds,
    features: task.featureIds,
    operations: task.operationIds.length,
    fullE2E: '512/512; Chromium 256/256; Firefox 256/256',
    focusedFE015: '22/22; Chromium 11/11; Firefox 11/11',
    unit: '138/138',
    domainNetwork: '88/88',
    sourceMapChecks: 131,
    sourceMapSuite: '16/16',
    sourceFiles: sourceFiles.length,
    sourceSnapshotSha256,
    evidenceFiles: task.implementationSteps.map(step => `${step.id}-current-20261008.json`),
}, null, 2));
