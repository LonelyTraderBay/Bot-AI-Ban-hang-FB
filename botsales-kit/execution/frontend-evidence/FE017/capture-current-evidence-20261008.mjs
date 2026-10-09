import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE017');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const readFrontend = relative => fs.readFileSync(path.join(frontendRoot, relative), 'utf8');
const readKit = relative => fs.readFileSync(path.join(kitRoot, relative), 'utf8');
const jsonKit = relative => JSON.parse(readKit(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(path.basename(frontendRoot) === 'BotSalesAI_Frontend', 'Run this capture from the Frontend workspace');
const plan = jsonKit('execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE017');
assert(task && task.implementationSteps.length === 5, 'Canonical FE017 S01-S05 plan is required');

const logs = {
    e2e: 'execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log',
    verify: 'execution/frontend-evidence/FE001/S03-full-verify-powershell-current-20261008.log',
    sourceMaps: 'execution/frontend-evidence/FE012/S01-source-maps-current-20261008.log',
    sourceReport: 'execution/frontend-evidence/FE005/S01-source-check-report-current-20261008.json',
    focused: 'execution/frontend-evidence/FE017/S05-e2e-focused-current-20261008.log',
};
const e2eText = readKit(logs.e2e);
const verifyText = readKit(logs.verify);
const sourceMapText = readKit(logs.sourceMaps);
const focusedText = readKit(logs.focused);
const sourceReport = jsonKit(logs.sourceReport);
assert(/512 passed \(.+\)/.test(e2eText) && e2eText.includes('Chromium 256/256') && e2eText.includes('Firefox 256/256') && e2eText.includes('EXIT_CODE=0'), 'Registered full E2E evidence is not a passing 512/512 run');
assert(verifyText.includes('EXIT_CODE=0') && /Tests\s+138 passed \(138\)/.test(verifyText) && verifyText.includes('"passed":88'), 'Registered verify evidence is missing current unit or domain/network passes');
assert(sourceReport.status === 'PASS' && sourceReport.files === 68 && sourceReport.routes === 54 && sourceReport.operationCalls === 220, 'Current source-check report does not match expected passing coverage');
assert(sourceMapText.includes('"taskId":"FE017"') && sourceMapText.includes('"checks":4'), 'Current FE017 source-map record is absent');
assert(sourceMapText.includes('ℹ tests 16') && sourceMapText.includes('ℹ pass 16') && sourceMapText.includes('ℹ fail 0'), 'Current source-map group is not 16/16');
assert(/20 passed \(.+\)/.test(focusedText) && !/failed|Error:|EXIT_CODE=[1-9]/i.test(focusedText), 'Current focused FE017 browser run is not 20/20');

const browserSource = readFrontend('tests/fe017.spec.ts');
const validationSource = readFrontend('tests/fe017-validation.spec.ts');
const browserCases = [...browserSource.matchAll(/^test\('([^']+)'/gm)].map(match => match[1]);
const validationCases = [...validationSource.matchAll(/^test\('([^']+)'/gm)].map(match => match[1]);
assert(browserCases.length === 9 && validationCases.length === 1, 'Current FE017 browser scenario inventory changed');
for (const name of [...browserCases, ...validationCases]) assert(focusedText.includes(name), 'Focused E2E log is missing scenario: ' + name);
assert((focusedText.match(/tests\\fe017\.spec\.ts/g) || []).length === 18, 'Expected each of nine shared spec scenarios in both browsers');
assert((focusedText.match(/tests\\fe017-validation\.spec\.ts/g) || []).length === 2, 'Expected validation scenario in both browsers');

const routeManifest = jsonKit('contracts/route-manifest.json');
const routes = task.routeIds.map(id => routeManifest.routes.find(route => route.id === id));
assert(routes.every(Boolean), 'A task route is missing from the canonical route manifest');
const routeOperationIds = [...new Set(routes.flatMap(route => [
    ...(route.readOperations || []),
    ...(route.actions || []).map(action => action.operationId),
]))].sort();
assert(JSON.stringify(routeOperationIds) === JSON.stringify([...task.operationIds].sort()), 'FE017 plan operations do not equal the R23-R25 route operation union');
const featureCatalog = jsonKit('contracts/feature-catalog.json');
const featureEntries = task.featureIds.map(id => featureCatalog.features.find(feature => feature.id === id));
assert(featureEntries.every(Boolean), 'A task feature is missing from the canonical feature catalog');
const catalogRouteIds = [...new Set(featureEntries.flatMap(feature => feature.routeIds || []))].sort();
const routeManifestFeatureIds = [...new Set(routes.flatMap(route => route.featureIds || []))].sort();
const featureTraceabilityGap = routeManifestFeatureIds.length === 0 && !catalogRouteIds.some(id => task.routeIds.includes(id));
assert(featureTraceabilityGap, 'FE017 route/feature mapping changed; re-audit before using this capture');

const openapi = jsonKit('contracts/openapi.json');
assert(openapi.components.schemas.Knowledge.properties.allowedActions === undefined, 'Knowledge.allowedActions is now in the canonical contract; reassess the approved substitute');
const knowledgeModule = readFrontend('apps/web/src/modules/knowledge/index.tsx');
assert(knowledgeModule.includes('permission="knowledge.publish"') && knowledgeModule.includes("k.status !== 'ready_for_review'"), 'The approved permission/lifecycle UI substitute is no longer present');

const commandMap = jsonKit('execution/frontend-command-map.json');
const commandIds = ['e2e', 'verify-current-20261002', 'feature-source-maps-20261002'];
const commands = Object.fromEntries(commandIds.map(id => {
    const command = commandMap.commands.find(item => item.id === id);
    assert(command && command.status === 'VERIFIED_AVAILABLE', 'Registered command is unavailable: ' + id);
    return [id, command];
}));

const sourcePaths = [
    'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/KNOWN_GAPS.md',
    'package.json', 'package-lock.json', 'playwright.config.ts', 'apps/web/src/app/router.tsx',
    'apps/web/src/modules/knowledge/index.tsx', 'apps/web/src/mocks/auxiliary.ts', 'apps/web/src/mocks/files.ts',
    'apps/web/src/mocks/service.ts', 'apps/web/src/mocks/database.ts', 'apps/web/src/mocks/seed.json',
    'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/model/labels.ts',
    'apps/web/src/shared/model/format.ts', 'apps/web/src/shared/model/auth.ts', 'apps/web/src/shared/ui/components.tsx',
    'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json', 'packages/contracts/src/routes.json',
    'scripts/run-e2e.mjs', 'scripts/test-domain.mjs', 'evidence/source-check.json',
    'tests/fe017.spec.ts', 'tests/fe017-validation.spec.ts', 'tests/fe017-source-map.test.mjs',
    'tests/domain-scenarios.cjs', 'tests/fixtures/mock-network.mjs', 'tests/accessibility/routes.spec.ts', 'tests/security.spec.ts',
    'botsales-kit/AGENTS.md', 'botsales-kit/docs/02_ARCHITECTURE.md', 'botsales-kit/docs/06_API_AND_REALTIME.md',
    'botsales-kit/docs/18_CODING_STANDARDS.md', 'botsales-kit/contracts/route-manifest.json',
    'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/permission-catalog.json',
    'botsales-kit/contracts/feature-catalog.json', 'botsales-kit/execution/frontend-plan.json',
    'botsales-kit/execution/frontend-command-map.json', 'botsales-kit/execution/frontend-evidence/FE017/S01-route-operation-map.md',
    'botsales-kit/execution/frontend-evidence/FE017/capture-current-evidence-20261008.mjs',
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
    'Feature catalog maps H07 to R34 and H08 to R52, while FE017 plan scope is R23-R25 and those route-manifest entries omit featureIds. This is an unresolved canonical traceability mismatch.',
    'Knowledge.allowedActions is absent from the canonical DTO. The UI follows the previously approved substitute: knowledge.publish permission plus ready_for_review lifecycle state; this does not prove a server-supplied allowedActions contract.',
];

const casesByStep = {
    S01: [
        { name: 'R23-R25 route operation union equals all 15 FE017 planned operations', count: '3 routes / 15 operations', status: 'PASS' },
        { name: 'H07/H08 feature catalog and R23-R25 route manifest were compared; mapping mismatch is recorded', count: '2 traceability gaps', status: 'PASS' },
        { name: 'Knowledge.allowedActions remains absent; UI uses the approved permission and lifecycle substitute', status: 'PASS' },
        { name: 'FE017 source-map assertions pass in the current 16-test source-map group', count: '4 FE017 checks; group 16/16', status: 'PASS' },
    ],
    S02: [
        { name: 'Draft review and demo publish use the permission/lifecycle substitute and preserve revision behavior', status: 'PASS' },
        { name: 'Knowledge source upload sends canonical purpose and reads file processing state', status: 'PASS' },
        { name: 'Price and stock preview reads use separate catalog/inventory permissions and timestamped data', status: 'PASS' },
        { name: 'Feedback approval creates an inert draft and first revision without mutating published content', status: 'PASS' },
    ],
    S03: [
        { name: 'Missing content, unsupported file type and oversized file keep creation unavailable', status: 'PASS' },
        { name: 'Synthetic 422 preserves the knowledge draft and exposes field errors', status: 'PASS' },
        { name: 'Manager read-only UI and mock API reject upload and publish actions', status: 'PASS' },
        { name: 'Stale review preserves its reason and explains the version conflict', status: 'PASS' },
        { name: 'Feedback-derived content is displayed inertly; it is not interpreted as HTML', status: 'PASS' },
    ],
    S04: [
        { name: 'FE017 route/operation/permission and mock lifecycle source-map regressions', count: '4 FE017 checks; group 16/16', status: 'PASS' },
        { name: 'Current registered component/unit suite', count: '138/138', status: 'PASS' },
        { name: 'Current registered synthetic domain/network suite', count: '88/88', status: 'PASS' },
        { name: 'Current source checker', count: '68 files / 54 routes / 220 operation calls', status: 'PASS' },
    ],
    S05: [
        { name: 'Nine scenarios from the shared FE017 browser spec and one 422 validation scenario run on both browsers', count: '20/20 total; 16 FE017 and 4 shared FE027 results', status: 'PASS' },
        { name: 'Upload, publish, feedback revision, denied role, stale review and invalid-content flows pass in browser', status: 'PASS' },
        { name: 'Current registered full React demo E2E passes on Chromium and Firefox', count: '512/512; 256 per browser', status: 'PASS' },
    ],
};
const resultSpecs = [
    ['e2e', logs.e2e, { testsPassed: 512, browserProjects: ['chromium', 'firefox'] }],
    ['verify-current-20261002', logs.verify, { unitTestsPassed: 138, domainNetworkPassed: 88 }],
    ['feature-source-maps-20261002', logs.sourceMaps, { testsPassed: 16, fe017SourceMapChecks: 4 }],
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
    const supplemental = step.id === 'S05' ? {
        command: 'npm.cmd --script-shell=cmd.exe run test:e2e -- tests/fe017.spec.ts tests/fe017-validation.spec.ts',
        commandId: 'e2e',
        registeredAsExactCommand: false,
        note: 'Focused test-run wrapper is supplemental; the receipt primary command points to the exact registered full E2E command.',
        exitCode: 0,
        testsPassed: 20,
        fe017ScenarioResults: 16,
        sharedFe027ScenarioResults: 4,
        logFile: logs.focused,
        logSha256: sha(readKit(logs.focused)),
    } : undefined;
    const primaryLog = primaryLogs[primaryId];
    const evidenceLog = [
        'FE017.' + step.id + ' knowledge and review lifecycle verification.',
        'executedAt=' + executedAt,
        'cwd=' + frontendRoot,
        ...commandResults.map(result => 'supportingCommandId=' + result.commandId + '; command=' + result.command + '; exitCode=0; log=' + result.logFile + '; sha256=' + result.logSha256),
        ...(supplemental ? ['supplementalCommand=' + supplemental.command + '; exitCode=0; tests=20/20; log=' + supplemental.logFile + '; sha256=' + supplemental.logSha256] : []),
        ...cases.map(item => 'CASE ' + item.status + ': ' + item.name + (item.count ? ' (' + item.count + ')' : '')),
        ...gaps.map(gap => 'TRACEABILITY_OR_CONTRACT_GAP=' + gap),
        'sourceSnapshotSha256=' + sourceSnapshotSha256,
        'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no live file processing, public publication, external feedback service or backend result is claimed.',
    ].join('\n') + '\n';
    const logName = step.id + '-current-20261008.log';
    fs.writeFileSync(path.join(evidenceDir, logName), evidenceLog, 'utf8');
    const primaryResult = commandResults.find(result => result.commandId === primaryId);
    const observed = cases.map(item => item.name + (item.count ? ' (' + item.count + ')' : '')).join('; ')
        + '. Current full browser E2E passed 512/512 (Chromium 256/256; Firefox 256/256); FE017 focused run passed 20/20; unit 138/138; domain/network 88/88; source-map suite 16/16 including 4 FE017 checks. Feature-route and Knowledge.allowedActions contract gaps are explicitly recorded. All behavior is synthetic MSW.';
    const evidence = {
        taskId: 'FE017',
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
            details: 'React knowledge/review demo uses local synthetic MSW file, document, feedback and revision fixtures.',
            dataSource: 'synthetic-msw',
        },
        checksTotal: cases.length,
        failed: 0,
        checks: cases.map(item => ({ name: item.name, status: item.status })),
        sourceFiles,
        sourceSnapshotSha256,
        logFile: 'execution/frontend-evidence/FE017/' + logName,
        logSha256: sha(Buffer.from(evidenceLog)),
        commandResults,
        audit: {
            result: 'PASS',
            routeIds: task.routeIds,
            featureIds: task.featureIds,
            routeManifestFeatureIds,
            featureCatalogRouteIds: catalogRouteIds,
            operationIds: task.operationIds,
            routeOperationIds,
            traceabilityGaps: gaps,
            focusedBrowserResults: 20,
            focusedFe017Results: 16,
            focusedSharedFe027Results: 4,
            cases,
            ...(supplemental ? { supplementalRun: supplemental } : {}),
        },
    };
    fs.writeFileSync(path.join(evidenceDir, step.id + '-current-20261008.json'), JSON.stringify(evidence, null, 2) + '\n', 'utf8');
}

console.log(JSON.stringify({
    result: 'PASS',
    taskId: 'FE017',
    routes: task.routeIds,
    operations: routeOperationIds.length,
    routeFeatureIds: routeManifestFeatureIds,
    featureCatalogRouteIds: catalogRouteIds,
    contractGap: 'Knowledge.allowedActions absent; approved UI substitute retained',
    currentFocusedBrowser: '20/20; 16 FE017 results and 4 shared FE027 results',
    fullE2E: '512/512',
    unit: '138/138',
    domainNetwork: '88/88',
    sourceMaps: '16/16; FE017 4/4',
    sourceFiles: sourceFiles.length,
    sourceSnapshotSha256,
    evidenceFiles: task.implementationSteps.map(step => step.id + '-current-20261008.json'),
}, null, 2));
