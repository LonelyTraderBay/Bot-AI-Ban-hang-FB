import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE020');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const readFrontend = relative => fs.readFileSync(path.join(frontendRoot, relative), 'utf8');
const readKit = relative => fs.readFileSync(path.join(kitRoot, relative), 'utf8');
const jsonKit = relative => JSON.parse(readKit(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(path.basename(frontendRoot) === 'BotSalesAI_Frontend', 'Run this capture from the Frontend workspace');
const plan = jsonKit('execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE020');
assert(task && task.implementationSteps.length === 5, 'Canonical FE020 S01-S05 plan is required');

const logs = {
    e2e: 'execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log',
    verify: 'execution/frontend-evidence/FE001/S03-full-verify-powershell-current-20261008.log',
    sourceMaps: 'execution/frontend-evidence/FE012/S01-source-maps-current-20261008.log',
    sourceReport: 'execution/frontend-evidence/FE005/S01-source-check-report-current-20261008.json',
    focused: 'execution/frontend-evidence/FE020/S05-e2e-focused-current-20261008.log',
    focusedMap: 'execution/frontend-evidence/FE020/S01-source-map-focused-current-20261008.log',
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
assert(sourceMapText.includes('FE020 source stays mapped to canonical operations, permissions, and safe missing-schedule boundary')
    && sourceMapText.includes('FE020 mock enforces work-item capabilities and keeps integration readiness unknown'), 'Current FE020 source-map tests are absent from the grouped run');
assert(sourceMapText.includes('ℹ tests 16') && sourceMapText.includes('ℹ pass 16') && sourceMapText.includes('ℹ fail 0'), 'Current grouped source-map suite is not 16/16');
assert(/14 passed \(.+\)/.test(focusedText), 'Current FE020 focused browser run is not 14/14');
assert(focusedMapText.includes('ℹ tests 2') && focusedMapText.includes('ℹ pass 2') && focusedMapText.includes('ℹ fail 0'), 'Current focused FE020 source-map tests are not 2/2');

const testSource = readFrontend('tests/fe020.spec.ts');
const browserCases = [...testSource.matchAll(/^test\('([^']+)'/gm)].map(match => match[1]);
assert(browserCases.length === 7, 'Current FE020 browser scenario count changed: ' + browserCases.length);
for (const name of browserCases) assert(focusedText.includes(name), 'Focused browser log is missing scenario: ' + name);
assert((focusedText.match(/tests\\fe020\.spec\.ts/g) || []).length === 14, 'Expected all seven browser scenarios in both browser projects');

const routeManifest = jsonKit('contracts/route-manifest.json');
const routes = task.routeIds.map(id => routeManifest.routes.find(route => route.id === id));
assert(routes.every(Boolean), 'A FE020 task route is missing from the canonical route manifest');
const routeOperationIds = [...new Set(routes.flatMap(route => [
    ...(route.readOperations || []),
    ...(route.actions || []).map(action => action.operationId),
]))].sort();
assert(JSON.stringify(routeOperationIds) === JSON.stringify([...task.operationIds].sort()), 'FE020 plan operation IDs do not equal the unique R37/R38/R52 route operation union');
const featureCatalog = jsonKit('contracts/feature-catalog.json');
const featureEntries = task.featureIds.map(id => featureCatalog.features.find(feature => feature.id === id));
assert(featureEntries.every(Boolean), 'A FE020 feature is missing from the canonical feature catalog');
for (const feature of featureEntries) assert(routes.some(route => route.id === feature.routeIds[0] && (route.featureIds || []).includes(feature.id)), 'Feature route mapping differs for ' + feature.id);

const openapi = jsonKit('contracts/openapi.json');
const digestWrites = Object.entries(openapi.paths)
    .filter(([apiPath]) => apiPath.includes('/digests'))
    .flatMap(([, methods]) => Object.values(methods))
    .filter(operation => operation.operationId && /^(create|update)/i.test(operation.operationId));
const moduleSource = readFrontend('apps/web/src/modules/operations/index.tsx');
assert(digestWrites.length === 0 && moduleSource.includes('Chưa có API tạo/sửa lịch bản tin'), 'Digest schedule contract boundary changed; re-audit before capture');

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
    'apps/web/src/modules/operations/index.tsx', 'apps/web/src/mocks/fulfillment.ts',
    'apps/web/src/mocks/service.ts', 'apps/web/src/mocks/database.ts', 'apps/web/src/mocks/seed.json',
    'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/model/auth.ts',
    'apps/web/src/shared/ui/components.tsx', 'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json',
    'packages/contracts/src/routes.json', 'packages/contracts/src/permissions.json', 'scripts/run-e2e.mjs',
    'scripts/test-domain.mjs', 'evidence/source-check.json', 'tests/fe020.spec.ts', 'tests/fe020-source-map.test.mjs',
    'tests/domain-scenarios.cjs', 'tests/fixtures/mock-network.mjs', 'tests/accessibility/routes.spec.ts', 'tests/security.spec.ts',
    'botsales-kit/AGENTS.md', 'botsales-kit/docs/02_ARCHITECTURE.md', 'botsales-kit/docs/06_API_AND_REALTIME.md',
    'botsales-kit/docs/08_SECURITY_TENANCY_RBAC.md', 'botsales-kit/docs/18_CODING_STANDARDS.md',
    'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
    'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/feature-catalog.json',
    'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
    'botsales-kit/execution/frontend-evidence/FE020/S01-route-operation-map-current-20261008.md',
    'botsales-kit/execution/frontend-evidence/FE020/capture-current-evidence-20261008.mjs',
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
    'OpenAPI has no create/update digest schedule operation. The UI reports that the schedule cannot be created or edited; no endpoint or capability is invented.',
    'Readiness and dependency health in the mock remain unknown without real backend/provider checks; this evidence is not a worker, integration, deployment or rehearsal result.',
];

const casesByStep = {
    S01: [
        { name: 'R37/R38/R52 unique route-operation union equals the nine planned FE020 operation IDs', count: '3 routes / 9 operations', status: 'PASS' },
        { name: 'F02-F08/H01/H04/H08 feature catalog mappings agree with route-manifest feature IDs', status: 'PASS' },
        { name: 'Approval permissions, intent/version fields and per-item allowedActions match canonical DTOs and operations', count: '2 FE020 source-map tests', status: 'PASS' },
        { name: 'Missing digest schedule mutation API and synthetic health/readiness boundaries are explicit', status: 'PASS' },
    ],
    S02: [
        { name: 'Approval detail loads the exact approval and posts current version, intent hash and resource policy versions', status: 'PASS' },
        { name: 'Work-item actions follow allowedActions and role pause uses a versioned, scoped mock command', status: 'PASS' },
        { name: 'Operations exceptions and delegation rule preview show synthetic data without granting API approval capability', status: 'PASS' },
        { name: 'Digest history and dependency panels do not claim workers or integrations are ready', status: 'PASS' },
    ],
    S03: [
        { name: 'Changed source resource rejects a stale approval decision', status: 'PASS' },
        { name: 'Work-item controls deny actions outside allowedActions', status: 'PASS' },
        { name: 'Automation pause remains versioned and scoped, with readiness unknown', status: 'PASS' },
        { name: 'Delegation preview grants no API approval capability', status: 'PASS' },
        { name: 'Digest schedule remains unavailable without a canonical mutation operation', status: 'PASS' },
    ],
    S04: [
        { name: 'FE020 canonical route/operation/permission and mock source-map regression', count: '2 FE020 checks', status: 'PASS' },
        { name: 'Current grouped feature source-map suite', count: '16/16', status: 'PASS' },
        { name: 'Current registered component/unit regression', count: '138/138', status: 'PASS' },
        { name: 'Current registered synthetic API/domain network regression', count: '88/88', status: 'PASS' },
        { name: 'Current source checker', count: '68 files / 54 routes / 220 operation calls', status: 'PASS' },
        { name: 'Current full cross-browser React demo regression', count: '512/512', status: 'PASS' },
    ],
    S05: [
        { name: 'All seven FE020 browser scenarios execute in Chromium and Firefox', count: '14/14; 12 FE020 and 2 shared FE027 results', status: 'PASS' },
        { name: 'Approval staleness, action capabilities, automation pause, synthetic digests and readiness limits pass in-browser', status: 'PASS' },
        { name: 'Current registered full React demo E2E passes in both browser projects', count: '512/512; 256 per browser', status: 'PASS' },
    ],
};
const resultSpecs = [
    ['e2e', logs.e2e, { testsPassed: 512, browserProjects: ['chromium', 'firefox'] }],
    ['verify-current-20261002', logs.verify, { unitTestsPassed: 138, domainNetworkPassed: 88 }],
    ['feature-source-maps-20261002', logs.sourceMaps, { testsPassed: 16, fe020SourceMapTests: 2 }],
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
const supplementalMap = {
    command: 'node --test tests/fe020-source-map.test.mjs',
    commandId: 'feature-source-maps-20261002',
    registeredAsExactCommand: false,
    exitCode: 0,
    testsPassed: 2,
    logFile: logs.focusedMap,
    logSha256: sha(readKit(logs.focusedMap)),
};
const supplementalBrowser = {
    command: 'npm.cmd --script-shell=cmd.exe run test:e2e -- tests/fe020.spec.ts',
    commandId: 'e2e',
    registeredAsExactCommand: false,
    note: 'The focused file run is supplemental; the receipt primary command points to the exact registered full E2E command.',
    exitCode: 0,
    testsPassed: 14,
    fe020Results: 12,
    sharedFe027Results: 2,
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
        'FE020.' + step.id + ' operations, approval and automation verification.',
        'executedAt=' + executedAt,
        'cwd=' + frontendRoot,
        ...commandResults.map(result => 'supportingCommandId=' + result.commandId + '; command=' + result.command + '; exitCode=0; log=' + result.logFile + '; sha256=' + result.logSha256),
        ...stepSupplementals.map(result => 'supplementalCommand=' + result.command + '; exitCode=0; log=' + result.logFile + '; sha256=' + result.logSha256),
        ...cases.map(item => 'CASE ' + item.status + ': ' + item.name + (item.count ? ' (' + item.count + ')' : '')),
        ...gaps.map(gap => 'CONTRACT_OR_ENVIRONMENT_LIMIT=' + gap),
        'sourceSnapshotSha256=' + sourceSnapshotSha256,
        'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no production approvals, real worker readiness, integrations, deployment or rehearsal are claimed.',
    ].join('\n') + '\n';
    const logName = step.id + '-current-20261008.log';
    fs.writeFileSync(path.join(evidenceDir, logName), evidenceLog, 'utf8');
    const observed = cases.map(item => item.name + (item.count ? ' (' + item.count + ')' : '')).join('; ')
        + '. Current full browser E2E passed 512/512; FE020 focused browser file passed 14/14; source-map suite 16/16 including 2 FE020 tests; unit 138/138; domain/network 88/88. Digest schedule mutation API is absent and synthetic integration readiness remains unknown. No backend or production behavior is claimed.';
    const evidence = {
        taskId: 'FE020',
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
            details: 'React operations/approval demo uses synthetic work items, approvals, digests and automation state over MSW.',
            dataSource: 'synthetic-msw',
        },
        checksTotal: cases.length,
        failed: 0,
        checks: cases.map(item => ({ name: item.name, status: item.status })),
        sourceFiles,
        sourceSnapshotSha256,
        logFile: 'execution/frontend-evidence/FE020/' + logName,
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
            digestMutationOperations: digestWrites.map(operation => operation.operationId),
            traceabilityGaps: gaps,
            focusedBrowserResults: 14,
            focusedFe020Results: 12,
            focusedSharedFe027Results: 2,
            cases,
            supplementalSourceMapRun: stepSupplementals.includes(supplementalMap) ? supplementalMap : undefined,
            supplementalBrowserRun: stepSupplementals.includes(supplementalBrowser) ? supplementalBrowser : undefined,
        },
    };
    fs.writeFileSync(path.join(evidenceDir, step.id + '-current-20261008.json'), JSON.stringify(evidence, null, 2) + '\n', 'utf8');
}

console.log(JSON.stringify({
    result: 'PASS',
    taskId: 'FE020',
    routes: task.routeIds,
    operations: routeOperationIds.length,
    features: task.featureIds,
    focusedBrowser: '14/14; 12 FE020 and 2 shared FE027 results',
    focusedSourceMap: '2/2',
    digestMutationOperations: digestWrites.map(operation => operation.operationId),
    fullE2E: '512/512',
    unit: '138/138',
    domainNetwork: '88/88',
    groupedSourceMaps: '16/16',
    sourceFiles: sourceFiles.length,
    sourceSnapshotSha256,
    evidenceFiles: task.implementationSteps.map(step => step.id + '-current-20261008.json'),
}, null, 2));
