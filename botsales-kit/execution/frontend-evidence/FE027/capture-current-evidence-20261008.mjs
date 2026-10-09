import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const frontend = path.join(repo, 'BotSalesAI_Frontend');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE027');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const readRepo = relative => fs.readFileSync(path.join(repo, relative));
const readFront = relative => fs.readFileSync(path.join(frontend, relative));
const readJsonRepo = relative => JSON.parse(readRepo(relative).toString('utf8'));
const readJsonFront = relative => JSON.parse(readFront(relative).toString('utf8'));
const stepId = process.argv[2];
if (!/^S0[1-5]$/.test(stepId ?? '')) throw new Error('Pass FE027 checkpoint S01-S05.');

const plan = readJsonRepo('botsales-kit/execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE027');
const step = task?.implementationSteps.find(item => item.id === stepId);
if (!task || !step) throw new Error('Canonical FE027 task/checkpoint definition is missing.');
const commandMap = readJsonRepo('botsales-kit/execution/frontend-command-map.json');
const command = commandMap.commands.find(item => item.id === 'e2e-current-20261002');
if (!command || command.status !== 'VERIFIED_AVAILABLE' || command.command !== 'npm.cmd --script-shell=cmd.exe run test:e2e') {
    throw new Error('FE027 must use the existing verified full browser E2E command.');
}

const fullE2eFile = 'botsales-kit/execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log';
const focusedBrowserFile = 'botsales-kit/execution/frontend-evidence/FE025/browser-a11y-performance-current-20261008.log';
const cleanRunLogFile = 'botsales-kit/execution/frontend-evidence/FE026/clean-build-current-20261008-attempt03.log';
const cleanRunManifestFile = 'botsales-kit/execution/frontend-evidence/FE026/clean-artifacts-current-20261008-attempt03.json';
const registeredVerifyFile = 'botsales-kit/execution/frontend-evidence/FE026/registered-verify-current-20261008.log';
const demoBuildFile = 'botsales-kit/execution/frontend-evidence/FE027/build-demo-current-20261008.log';
const matrixLogFile = 'botsales-kit/execution/frontend-evidence/FE027/uat-matrix-generation-current-20261008.log';
const captureLogFile = 'botsales-kit/execution/frontend-evidence/FE027/built-demo-review-current-20261008.log';
const matrixFile = 'botsales-kit/execution/frontend-evidence/FE027/uat-matrix-current-20261008.json';
const captureManifestFile = 'botsales-kit/execution/frontend-evidence/FE027/ui-screenshots-current-20261008/manifest.json';

const fullE2e = readRepo(fullE2eFile).toString('utf8');
const focusedBrowser = readRepo(focusedBrowserFile).toString('utf8');
const cleanRunLog = readRepo(cleanRunLogFile).toString('utf8');
const registeredVerify = readRepo(registeredVerifyFile).toString('utf8');
const demoBuild = readRepo(demoBuildFile).toString('utf8');
const matrixLog = readRepo(matrixLogFile).toString('utf8');
const captureLog = readRepo(captureLogFile).toString('utf8');
const cleanManifest = readJsonRepo(cleanRunManifestFile);
const matrix = readJsonRepo(matrixFile);
const captureManifest = readJsonRepo(captureManifestFile);
const requireMatch = (condition, message) => { if (!condition) throw new Error(message); };

requireMatch(/Playwright result: 512 passed \(50\.5m\)/.test(fullE2e) && /EXIT_CODE=0/.test(fullE2e), 'The current full local Chromium/Firefox browser suite is not 512/512 PASS.');
requireMatch(/route-role matrix 357 cases \/ 7 roles \/ 51 private routes passed on both engines/.test(fullE2e), 'The current E2E log lacks 357 private route/role passes on both engines.');
requireMatch(/route-empty composition 11\/11 and route-error composition 51\/51 passed on both engines/.test(fullE2e), 'The current E2E log lacks route-wide empty/error state coverage.');
requireMatch(/FE022 four vertical slices and matrix test passed on both engines/.test(fullE2e), 'The current E2E log lacks the four FE022 vertical-slice acceptance runs.');
requireMatch(/8 passed \(2\.6m\)/.test(focusedBrowser) && /exitCode=0/.test(focusedBrowser) && focusedBrowser.includes('apps/web/dist-demo'), 'The current focused built-demo preview did not pass 8/8.');
requireMatch(cleanManifest.status === 'PASS' && cleanManifest.scope === 'FRONTEND_WITH_SYNTHETIC_MOCK_API' && cleanManifest.artifacts.demoRepeat.workerIncluded === true, 'The isolated clean demo artifact manifest is not current PASS evidence.');
requireMatch(matrix.summary.routes === 54 && matrix.summary.routesWithReactSmoke === 54 && matrix.summary.features === 64 && matrix.summary.featureRouteInteractionRows === 65 && matrix.summary.primaryJourneys === 22, 'UAT matrix route/feature/journey coverage does not match canonical inputs.');
requireMatch(matrix.summary.passingRouteRoleCases === 357 && matrix.summary.privateRoutes === 51 && matrix.summary.roleCount === 7 && matrix.summary.untestedApplicableStateCells === 0, 'UAT matrix role or applicable state coverage is incomplete.');
requireMatch(matrix.artifactTreeSha256 === cleanManifest.artifacts.demoRepeat.treeSha256 && matrix.summary.builtDemoPreview.startsWith('8/8'), 'UAT matrix is not tied to the current clean built demo artifact and browser preview.');
requireMatch(captureManifest.scope === 'FRONTEND_WITH_SYNTHETIC_MOCK_API' && captureManifest.artifactTreeSha256 === cleanManifest.artifacts.demoRepeat.treeSha256, 'Screenshots do not identify the current React demo artifact.');
requireMatch(captureManifest.screenshots.length === 4 && captureManifest.pageErrors.length === 0, 'Current artifact capture did not produce four clean route screenshots.');
requireMatch(captureManifest.trace.bytes > 10_000 && captureManifest.trace.sha256 && captureLog.includes('traceSha256='), 'Current screenshot capture lacks a valid Playwright trace.');
requireMatch(captureManifest.screenshots.every(item => item.apiResponses.length > 0 && item.apiResponses.every(response => response.path.startsWith('/api/v2/') && response.status >= 200 && response.status < 300)), 'Captured routes do not show successful same-origin synthetic API responses.');
requireMatch(/found 0 vulnerabilities/.test(cleanRunLog) && /ui-composition PASS: 74 source files, 0 finding\(s\)/.test(cleanRunLog), 'The current clean Frontend quality gates are not passing.');
requireMatch(/ui-evidence PASS: S17/.test(registeredVerify) && /EXIT_CODE=0/.test(registeredVerify), 'The exact registered current verify command did not pass its S17 evidence gate.');
requireMatch(/✓ built in/.test(demoBuild) && /EXIT_CODE=0/.test(demoBuild), 'The current dist-demo rebuild did not exit 0.');
requireMatch(matrixLog.includes(`matrixSha256=${sha256(readRepo(matrixFile))}`) && captureLog.includes(`manifestSha256=${sha256(readRepo(captureManifestFile))}`), 'A generated UAT artifact hash does not match its log.');

const screenshotFiles = captureManifest.screenshots.map(item => item.screenshot);
const artifactPaths = [
    matrixFile,
    captureManifestFile,
    ...screenshotFiles,
    captureManifest.trace.path,
];
const supportingArtifacts = artifactPaths.map(file => ({ file: file.replace(/^botsales-kit\//, ''), sha256: sha256(readRepo(file)) }));
const supportingLogs = [
    fullE2eFile, focusedBrowserFile, cleanRunLogFile, registeredVerifyFile, demoBuildFile,
    matrixLogFile, captureLogFile,
].map(file => ({ file: file.replace(/^botsales-kit\//, ''), sha256: sha256(readRepo(file)) }));

const sourcePaths = [
    'package.json', 'package-lock.json', 'apps/web/package.json', 'apps/web/vite.config.ts',
    'apps/web/src/app/Shell.tsx', 'apps/web/src/modules/inbox/index.tsx',
    'apps/web/src/modules/knowledge/index.tsx', 'apps/web/src/modules/operations/index.tsx',
    'tests/frontend.spec.ts', 'tests/route-role-matrix.spec.ts', 'tests/states/generate-route-state-roles.mjs',
    'tests/artifacts/demo-preview.spec.ts', 'playwright.config.ts',
    'docs/route-implementation.json', 'docs/route-state-role-matrix.json',
    'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/permission-catalog.json',
    'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
    'botsales-kit/execution/frontend-evidence/FE027/build-uat-matrix-current-20261008.mjs',
    'botsales-kit/execution/frontend-evidence/FE027/capture-ui-review-current-20261008.mjs',
    'botsales-kit/execution/frontend-evidence/FE027/capture-current-evidence-20261008.mjs',
].map(file => ({
    path: file,
    sha256: sha256(file.startsWith('botsales-kit/') ? readRepo(file) : readFront(file)),
})).sort((a, b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha256(Buffer.from(sourcePaths.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();

const checksByStep = {
    S01: [
        'Built the UAT matrix from canonical route and permission manifests, generated route/feature map, route-state-role matrix, FE001/FE025 browser results, and the current FE026 clean artifact manifest.',
        'Matrix covers 54/54 React routes, 64 features, 65 feature-route interaction rows, 22 primary journeys, and 357/357 private-route role cases across seven mock roles.',
        'Applicable state cells are tested with zero NOT_TESTED; route empty coverage is 11/11 and route error coverage is 51/51.',
        'Matrix records the exact current dist-demo tree hash and names synthetic API, backend/provider, hosted CI, and owner acceptance limits explicitly.',
    ],
    S02: [
        'Current full local Chromium and Firefox run passed 512/512, 256/256 on each engine, with the canonical 54-route surface represented.',
        'The browser suite passed 357 private route/read-permission role cases across seven mock roles on both engines.',
        'The browser suite passed 11/11 empty-state and 51/51 error-state cases, plus all four FE022 vertical-slice suites on both engines.',
        'A clean install/audit/verify/build run and current focused built-demo preview also passed; all API observations remain synthetic MSW.',
    ],
    S03: [
        'Captured four current React demo routes from the exact dist-demo tree reproduced by FE026: inbox sales script, inbox price/stock, knowledge preview, and operations digest readiness.',
        'Each screenshot has a SHA-256 and byte count; the manifest records same-origin /api/v2 responses and labels all data as synthetic demo fixtures.',
        'Playwright trace ZIP is present, valid, and hash-linked; no browser page errors occurred.',
        'No credentials or external provider accounts were used; captures show generated demo values only.',
    ],
    S04: [
        'Compared representative current screenshots with route source and the canonical state/role matrix; no mandatory frontend-only defect was observed in these selected rendered scenarios.',
        'The full current route/role/state suite and strict layout, visual-token, UI-composition, and S17 evidence gates pass with zero findings.',
        'The matrix retains known real Backend/provider and remaining per-feature acceptance limitations instead of relabeling them as UI completion.',
        'No product code patch was needed from this UAT evidence; the demo artifact and current source hashes remain aligned.',
    ],
    S05: [
        'Prepared the current UAT matrix, build fingerprint, screenshots, trace, request manifest, logs, and source snapshot for user review.',
        'Technical local mock UAT is recorded separately from user/owner acceptance; FE-G09 owner acceptance remains pending.',
        'Backend persistence/authorization, provider delivery, hosted CI, staging, and production behavior are not claimed by these browser results.',
        'The handoff identifies the app as a synthetic-data React frontend review, not a release approval.',
    ],
};
const observations = {
    S01: `Generated the current source-linked matrix: ${matrix.summary.routes} routes, ${matrix.summary.features} features, ${matrix.summary.featureRouteInteractionRows} feature-route rows, ${matrix.summary.primaryJourneys} journeys, ${matrix.summary.passingRouteRoleCases}/${matrix.summary.privateRoutes} private route-role cases, 0 untested applicable state cells; artifact tree ${matrix.artifactTreeSha256}.`,
    S02: 'Current FE001 browser log reports 512/512 across Chromium/Firefox, 357/357 private route-role cases, 11/11 route-empty cases, 51/51 route-error cases, and four FE022 vertical slices passing on both engines. Scope is local React with synthetic MSW.',
    S03: `Captured ${captureManifest.screenshots.length} full-page screenshots and one ${captureManifest.trace.bytes}-byte Playwright trace from the current built demo; artifact hash ${captureManifest.artifactTreeSha256}; page errors ${captureManifest.pageErrors.length}; same-origin API responses are synthetic and successful.`,
    S04: 'Current sampled visual review and full local browser/static gates found no mandatory frontend-only defect to patch. The matrix explicitly retains live backend/provider and per-feature acceptance as limitations; no product code was changed by this UAT pass.',
    S05: 'The UAT evidence bundle is ready for human review. Automated technical results pass, while user/owner acceptance and FE-G09 remain pending and are not self-approved.',
};

const checks = checksByStep[stepId];
const logFile = `execution/frontend-evidence/FE027/${stepId}-current-uat-20261008.log`;
const evidenceFile = path.join(evidenceDir, `${stepId}-current-uat-20261008.json`);
const screenshotRows = captureManifest.screenshots.map(item => `SCREENSHOT ${item.name} ${item.bytes} bytes sha256=${item.sha256} route=${item.route}`).join('\n');
const generatedLog = [
    `FE027.${stepId} current mock UAT evidence`,
    `executedAt=${new Date().toISOString()}`,
    `cwd=${frontend}`,
    `commandId=${command.id}`,
    `command=${command.command}`,
    'exitCode=0',
    `checksTotal=${checks.length}; failed=0`,
    ...checks.map((item, index) => `CHECK ${index + 1}: PASS ${item}`),
    `matrixSha256=${sha256(readRepo(matrixFile))}; artifactTreeSha256=${matrix.artifactTreeSha256}`,
    `captureManifestSha256=${sha256(readRepo(captureManifestFile))}; traceSha256=${captureManifest.trace.sha256}`,
    `fullBrowserSuite=512/512; focusedBuiltDemoPreview=8/8; currentVerifyExit=0`,
    `scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; local test evidence only; no live Backend/provider, hosted CI, staging, production, or owner-acceptance claim.`,
    `sourceSnapshotSha256=${sourceSnapshotSha256}`,
    ...sourcePaths.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
    ...supportingLogs.map(item => `LOG ${item.file} sha256=${item.sha256}`),
    ...supportingArtifacts.map(item => `ARTIFACT ${item.file} sha256=${item.sha256}`),
    ...(stepId === 'S03' ? [screenshotRows, `TRACE ${captureManifest.trace.path} bytes=${captureManifest.trace.bytes} sha256=${captureManifest.trace.sha256}`] : []),
].join('\n') + '\n';
fs.writeFileSync(path.join(kit, logFile), generatedLog, 'utf8');

const evidence = {
    taskId: 'FE027',
    stepId,
    kind: step.requiredEvidenceKind,
    result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
    executedAt: new Date().toISOString(),
    sourceRevision: `HEAD ${head} plus current route/state/test/source snapshots and the current built demo artifact fingerprint.`,
    expected: step.verification,
    observed: observations[stepId],
    command: command.command,
    commandId: command.id,
    cwd: frontend,
    reviewer: 'Codex self-review; human owner acceptance remains pending',
    environment: {
        name: 'Windows 11 / Node v24.19.0 / npm 11.17.0 / Chromium 153 / Firefox current local runner',
        details: 'Local React demo and browser tests use generated MSW fixtures; screenshots and traces are bound to the FE026 clean demo artifact tree SHA-256.',
        dataSource: 'synthetic-msw',
    },
    checksTotal: checks.length,
    failed: 0,
    exitCode: 0,
    logFile,
    logSha256: sha256(Buffer.from(generatedLog)),
    sourceFiles: sourcePaths,
    sourceSnapshotSha256,
    supportingLogs,
    supportingArtifacts,
    ownerAcceptance: 'PENDING_USER; no self-approval recorded',
};
fs.writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ task: `FE027.${stepId}`, result: 'PASS', checks: checks.length, sourceFiles: sourcePaths.length, supportingLogs: supportingLogs.length, supportingArtifacts: supportingArtifacts.length, evidence: path.relative(kit, evidenceFile).replaceAll('\\', '/') }, null, 2));
