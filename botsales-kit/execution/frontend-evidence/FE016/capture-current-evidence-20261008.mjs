import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE016');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const readFrontend = relative => fs.readFileSync(path.join(frontendRoot, relative), 'utf8');
const readKit = relative => fs.readFileSync(path.join(kitRoot, relative), 'utf8');
const jsonKit = relative => JSON.parse(readKit(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(path.basename(frontendRoot) === 'BotSalesAI_Frontend', `Run from Frontend workspace; got ${frontendRoot}`);
const plan = jsonKit('execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE016');
assert(task?.implementationSteps?.length === 5, 'Canonical FE016 S01-S05 plan not found');

const logs = {
    e2e: 'execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log',
    verify: 'execution/frontend-evidence/FE001/S03-full-verify-powershell-current-20261008.log',
    sourceMaps: 'execution/frontend-evidence/FE012/S01-source-maps-current-20261008.log',
    sourceReport: 'execution/frontend-evidence/FE005/S01-source-check-report-current-20261008.json',
    crosswalk: 'execution/frontend-evidence/FE005/S01-contract-crosswalk-current-20261008.log',
    focused: 'execution/frontend-evidence/FE016/S05-e2e-focused-current-20261008.log',
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
assert(sourceMapText.includes('"taskId":"FE016"') && sourceMapText.includes('"checks":3') && sourceMapText.includes('"knownGap":"Canonical Message has no media or attachment field/operation'), 'Current FE016 source map or known gap is missing');
assert(sourceMapText.includes('ℹ tests 16') && sourceMapText.includes('ℹ pass 16') && sourceMapText.includes('ℹ fail 0'), 'Current feature source-map suite is not 16/16');
assert(focusedText.includes('42 passed (1.7m)') && focusedText.includes('EXIT_CODE=0'), 'Current focused FE016 browser run is not 42/42');

const testSource = readFrontend('tests/fe016.spec.ts');
const browserCases = [...testSource.matchAll(/^test\('([^']+)'/gm)].map(match => match[1]);
assert(browserCases.length === 21, `Expected 21 FE016 browser scenarios; found ${browserCases.length}`);
for (const name of browserCases) assert(focusedText.includes(name), `Current focused browser log is missing scenario: ${name}`);

const routeManifest = jsonKit('contracts/route-manifest.json');
const routes = task.routeIds.map(id => routeManifest.routes.find(route => route.id === id));
assert(routes.every(Boolean), 'FE016 canonical route is missing');
const routeOperations = [...new Set(routes.flatMap(route => [
    ...route.readOperations,
    ...route.actions.map(action => action.operationId),
]))].sort();
assert(JSON.stringify(routeOperations) === JSON.stringify([...task.operationIds].sort()), 'FE016 task operation IDs differ from R05/R06');
const featureCatalog = jsonKit('contracts/feature-catalog.json');
const featureEntries = task.featureIds.map(id => featureCatalog.features.find(feature => feature.id === id));
assert(featureEntries.every(Boolean), 'FE016 feature catalog entry is missing');
assert(featureEntries.every(feature => feature.routeIds.some(id => task.routeIds.includes(id))), 'FE016 feature catalog points outside the task route scope');
const routeManifestFeatureIds = [...new Set(routes.flatMap(route => route.featureIds ?? []))].sort();
assert(routeManifestFeatureIds.length === 0 && featureEntries.every(feature => feature.routeIds.includes('R06')), 'FE016 route/feature traceability gap changed');

const commandMap = jsonKit('execution/frontend-command-map.json');
const commands = Object.fromEntries(['e2e', 'verify-current-20261002', 'feature-source-maps-20261002'].map(id => {
    const command = commandMap.commands.find(item => item.id === id);
    assert(command?.status === 'VERIFIED_AVAILABLE', `Registered command ${id} is unavailable`);
    return [id, command];
}));

const sourcePaths = [
    'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/KNOWN_GAPS.md',
    'package.json', 'package-lock.json', 'playwright.config.ts', 'apps/web/vite.config.ts',
    'apps/web/src/app/router.tsx', 'apps/web/src/app/Shell.tsx', 'apps/web/src/app/ScopeEvents.tsx',
    'apps/web/src/app/CommandRecovery.tsx', 'apps/web/src/modules/inbox/index.tsx',
    'apps/web/src/modules/inbox/conversation-components.tsx', 'apps/web/src/modules/orders/index.tsx',
    'apps/web/src/mocks/auxiliary.ts', 'apps/web/src/mocks/service.ts', 'apps/web/src/mocks/database.ts',
    'apps/web/src/mocks/seed.json', 'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts',
    'apps/web/src/shared/model/scope.tsx', 'apps/web/src/shared/model/auth.ts', 'apps/web/src/shared/ui/components.tsx',
    'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json', 'packages/contracts/src/routes.json',
    'scripts/run-e2e.mjs', 'scripts/test-domain.mjs', 'tests/fe016.spec.ts', 'tests/fe016-source-map.test.mjs',
    'tests/domain-scenarios.cjs', 'tests/fixtures/mock-network.mjs', 'tests/accessibility/routes.spec.ts',
    'tests/security.spec.ts', 'tests/fe011-source-map.test.mjs', 'tests/fe012-source-map.test.mjs',
    'tests/fe013-source-map.test.mjs', 'tests/fe014-source-map.test.mjs', 'tests/fe015-source-map.test.mjs',
    'tests/fe017-source-map.test.mjs', 'tests/fe018-source-map.test.mjs', 'tests/fe020-source-map.test.mjs',
    'botsales-kit/AGENTS.md', 'botsales-kit/docs/02_ARCHITECTURE.md', 'botsales-kit/docs/06_API_AND_REALTIME.md',
    'botsales-kit/docs/07_AI_AND_CHANNELS.md', 'botsales-kit/docs/09_STATE_AND_DATA_ACCESS.md',
    'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
    'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/feature-catalog.json',
    'botsales-kit/contracts/events.schema.json', 'botsales-kit/execution/frontend-plan.json',
    'botsales-kit/execution/frontend-command-map.json', 'botsales-kit/execution/frontend-evidence/FE016/S01-route-operation-map.md',
    ...Object.values(logs).map(relative => `botsales-kit/${relative}`),
    'botsales-kit/execution/frontend-evidence/FE016/capture-current-evidence-20261008.mjs',
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

const casesByStep = {
    S01: [
        { name: 'R05/R06 route, operation and capability mapping matches canonical API and inbox source', count: '2 routes / 12 task operations', status: 'PASS' },
        { name: 'Current source-map suite covers safe message refs, versioned send, resync and command recovery', count: '3 FE016 source-map tests', status: 'PASS' },
        { name: 'Feature catalog maps B01-B05/B07-B08 to R06 while route manifest leaves R05/R06 featureIds empty', count: '1 documented route-feature traceability gap', status: 'PASS' },
        { name: 'Canonical Message intentionally has no media/attachment contract; UI discloses unsupported media', status: 'PASS' },
    ],
    S02: [
        { name: 'Conversation filters, bookmarks, list/message cursor independence, paging and resync work in the React demo', status: 'PASS' },
        { name: 'Takeover and replies use current versions and display API state without claiming delivery', status: 'PASS' },
        { name: 'Internal notes and feedback stay distinct; HTML-like message content renders inertly', status: 'PASS' },
        { name: 'Order composition stays app-owned and passes customer/conversation references only when permitted', status: 'PASS' },
        { name: 'Cross-sell, image and voice previews disclose synthetic/local-only behavior', status: 'PASS' },
    ],
    S03: [
        { name: 'Unknown send preserves draft and opens command recovery; no blind resend', status: 'PASS' },
        { name: 'Stale takeover preserves reason and reports current-version conflict', status: 'PASS' },
        { name: 'Untrusted HTML-like content stays inert; customer/order links respect permissions', status: 'PASS' },
        { name: 'Unsupported media and automatic order confirmation remain unavailable without contract/policy/evidence', status: 'PASS' },
    ],
    S04: [
        { name: 'FE016 route, permission and DTO source-map regression', count: '3 FE016 tests; included in 16/16 suite', status: 'PASS' },
        { name: 'Current registered full verify', status: 'PASS' },
        { name: 'Component/unit suite', count: '138/138', status: 'PASS' },
        { name: 'Synthetic domain/network suite', count: '88/88', status: 'PASS' },
        { name: 'Feature source-map suite', count: '16/16', status: 'PASS' },
    ],
    S05: [
        { name: 'All 21 inbox browser scenarios run in Chromium and Firefox', count: '42/42; 21 per engine', status: 'PASS' },
        { name: 'Mobile inbox, keyboard controls, split scrolling and error isolation are exercised', status: 'PASS' },
        { name: 'Takeover, reply, unknown recovery, role scope and inert message content pass in-browser', status: 'PASS' },
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
    commandResult('feature-source-maps-20261002', logs.sourceMaps, { testsPassed: 16, fe016SourceMapTests: 3 }),
];
const primaryByStep = { S01: 'feature-source-maps-20261002', S02: 'e2e', S03: 'e2e', S04: 'verify-current-20261002', S05: 'e2e' };
const primaryLogs = { e2e: logs.e2e, 'verify-current-20261002': logs.verify, 'feature-source-maps-20261002': logs.sourceMaps };
const traceabilityGaps = [
    'The feature catalog maps B01-B05/B07-B08 to R06, but route-manifest entries R05 and R06 both omit featureIds.',
    'Canonical Message has no media/attachment field or media operation; the UI correctly avoids inventing one.',
];

for (const step of task.implementationSteps) {
    const cases = casesByStep[step.id];
    const primaryId = primaryByStep[step.id];
    const supplemental = step.id === 'S05' ? {
        command: 'npm.cmd --script-shell=cmd.exe run test:e2e -- tests/fe016.spec.ts',
        commandId: 'e2e',
        registeredAsExactCommand: false,
        note: 'Filtered run is supplemental only; the tracker receipt primary command must match the exact registered full-suite command.',
        exitCode: 0,
        testsPassed: 42,
        logFile: logs.focused,
    } : undefined;
    const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Current registered full E2E passed 512/512 (Chromium 256/256; Firefox 256/256); current verify passed 138/138 unit and 88/88 domain/network checks; source-map suite passed 16/16 and FE016's 3 focused source-map tests. Feature catalog/route-manifest featureIds mismatch and absent media contract are recorded. Local MSW synthetic only; no provider delivery or external media is claimed.`;
    const evidenceLog = [
        `FE016.${step.id} inbox, takeover, messaging and role verification.`,
        `executedAt=${executedAt}`,
        `cwd=${frontendRoot}`,
        `primaryCommandId=${primaryId}; command=${commands[primaryId].command}; exitCode=0; log=${primaryLogs[primaryId]}`,
        ...results.map(result => `supportingCommandId=${result.commandId}; command=${result.command}; exitCode=${result.exitCode}; log=${result.logFile}; sha256=${result.logSha256}`),
        ...(supplemental ? [`supplementalCommand=${supplemental.command}; exitCode=0; tests=42/42; log=${supplemental.logFile}; not registered as the primary progress command`] : []),
        ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
        ...traceabilityGaps.map(gap => `TRACEABILITY_GAP=${gap}`),
        `sourceSnapshotSha256=${sourceSnapshotSha256}`,
        'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no Meta/provider send, media transport, live delivery or backend result is claimed.',
    ].join('\n') + '\n';
    const logName = `${step.id}-current-20261008.log`;
    fs.writeFileSync(path.join(evidenceDir, logName), evidenceLog, 'utf8');
    const evidence = {
        taskId: 'FE016',
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
            details: 'React inbox demo uses local synthetic MSW conversations/messages; route changes and command recovery are exercised in the browser.',
            dataSource: step.id === 'S01' ? 'source-only' : 'synthetic-msw',
        },
        checksTotal: cases.length,
        failed: 0,
        checks: cases.map(item => ({ name: item.name, status: item.status })),
        sourceFiles,
        sourceSnapshotSha256,
        logFile: `execution/frontend-evidence/FE016/${logName}`,
        logSha256: sha(Buffer.from(evidenceLog)),
        commandResults: results,
        audit: {
            result: 'PASS',
            routeIds: task.routeIds,
            featureIds: task.featureIds,
            routeManifestFeatureIds,
            featureCatalogRouteIds: [...new Set(featureEntries.flatMap(feature => feature.routeIds))].sort(),
            operationIds: task.operationIds,
            traceabilityGaps,
            cases,
            ...(supplemental ? { supplementalRun: supplemental } : {}),
        },
    };
    fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261008.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
    result: 'PASS',
    taskId: 'FE016',
    routes: task.routeIds,
    taskFeatures: task.featureIds,
    routeManifestFeatureIds,
    featureCatalogRouteIds: [...new Set(featureEntries.flatMap(feature => feature.routeIds))].sort(),
    operations: task.operationIds.length,
    focusedSourceMapTests: 3,
    fullE2E: '512/512; Chromium 256/256; Firefox 256/256',
    focusedFE016: '42/42; Chromium 21/21; Firefox 21/21',
    unit: '138/138',
    domainNetwork: '88/88',
    sourceMapSuite: '16/16',
    sourceFiles: sourceFiles.length,
    sourceSnapshotSha256,
    evidenceFiles: task.implementationSteps.map(step => `${step.id}-current-20261008.json`),
}, null, 2));
