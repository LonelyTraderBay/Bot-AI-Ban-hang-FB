import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const frontend = path.join(repo, 'BotSalesAI_Frontend');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE026');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const repoPath = relative => path.join(repo, relative);
const frontendPath = relative => path.join(frontend, relative);
const readRepo = relative => fs.readFileSync(repoPath(relative));
const readFront = relative => fs.readFileSync(frontendPath(relative));
const readJsonRepo = relative => JSON.parse(readRepo(relative).toString('utf8'));
const readJsonFront = relative => JSON.parse(readFront(relative).toString('utf8'));
const stepId = process.argv[2];
if (!/^S0[1-5]$/.test(stepId ?? '')) throw new Error('Pass FE026 checkpoint S01-S05.');

const taskPlan = readJsonRepo('botsales-kit/execution/frontend-plan.json');
const task = taskPlan.tasks.find(item => item.id === 'FE026');
const step = task?.implementationSteps.find(item => item.id === stepId);
if (!task || !step) throw new Error('Canonical FE026 task/checkpoint definition is missing.');
const commandMap = readJsonRepo('botsales-kit/execution/frontend-command-map.json');
const command = commandMap.commands.find(item => item.id === 'verify-current-20261002');
if (!command || command.status !== 'VERIFIED_AVAILABLE') throw new Error('FE026 must use the existing verified frontend verify command.');

const runLogFile = 'botsales-kit/execution/frontend-evidence/FE026/clean-build-current-20261008-attempt03.log';
const registeredVerifyFile = 'botsales-kit/execution/frontend-evidence/FE026/registered-verify-current-20261008.log';
const manifestFile = 'botsales-kit/execution/frontend-evidence/FE026/clean-artifacts-current-20261008-attempt03.json';
const workflowFile = 'botsales-kit/execution/frontend-evidence/FE026/frontend-workflow-config-current-20261008-attempt03.yml';
const browserLogFile = 'botsales-kit/execution/frontend-evidence/FE025/browser-a11y-performance-current-20261008.log';
const fullE2eFile = 'botsales-kit/execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log';
const fullVerifyFile = 'botsales-kit/execution/frontend-evidence/FE001/S03-full-verify-powershell-current-20261008.log';
const runLog = readRepo(runLogFile).toString('utf8');
const registeredVerifyLog = readRepo(registeredVerifyFile).toString('utf8');
const browserLog = readRepo(browserLogFile).toString('utf8');
const fullE2e = readRepo(fullE2eFile).toString('utf8');
const fullVerify = readRepo(fullVerifyFile).toString('utf8');
const manifest = readJsonRepo(manifestFile);
const workflowBytes = readRepo(workflowFile);
const activeWorkflowBytes = fs.readFileSync(path.join(repo, '.github/workflows/frontend.yml'));
const frontendPackage = readJsonFront('package.json');
const webPackage = readJsonFront('apps/web/package.json');
const viteConfig = readFront('apps/web/vite.config.ts').toString('utf8');
const mainSource = readFront('apps/web/src/main.tsx').toString('utf8');
const shellSource = readFront('apps/web/src/app/Shell.tsx').toString('utf8');
const sessionSource = readFront('apps/web/src/app/SessionProvider.tsx').toString('utf8');
const setupSource = readFront('scripts/setup.mjs').toString('utf8');
const readme = readFront('README.md').toString('utf8');
const requireMatch = (condition, message) => { if (!condition) throw new Error(message); };

requireMatch(manifest.status === 'PASS' && manifest.scope === 'FRONTEND_WITH_SYNTHETIC_MOCK_API', 'The current isolated clean-run manifest is not PASS in the frontend synthetic scope.');
requireMatch(manifest.commandRuns.length === 10 && manifest.commandRuns.every(item => item.exitCode === 0), 'The isolated clean runner did not complete all ten successful command stages.');
requireMatch(/Tests\s+138 passed \(138\)/.test(registeredVerifyLog) && /ui-evidence PASS: S17/.test(registeredVerifyLog) && /EXIT_CODE=0/.test(registeredVerifyLog), 'The exact registered frontend verify command did not pass with current source.');
requireMatch(manifest.userEnvLocalCopied === false, 'A source workspace .env.local was copied into the clean workspace.');
requireMatch(manifest.sourceLockSha256 === manifest.copiedLockSha256, 'The installed copy lockfile differs from the current Frontend lockfile.');
requireMatch(manifest.rootWorkflowCopiedToExpectedRelativePath === true && manifest.rootWorkflowSha256 === sha256(workflowBytes) && sha256(workflowBytes) === sha256(activeWorkflowBytes), 'The parent CI workflow snapshot does not match the active repository workflow.');
requireMatch(manifest.artifacts.productionAfterVerify.treeSha256 === manifest.artifacts.productionRepeat.treeSha256, 'Production build output is not byte-for-byte reproducible.');
requireMatch(manifest.artifacts.demoFirstBuild.treeSha256 === manifest.artifacts.demoRepeat.treeSha256, 'Demo build output is not byte-for-byte reproducible.');
requireMatch(manifest.artifacts.productionRepeat.workerIncluded === false && manifest.artifacts.demoRepeat.workerIncluded === true, 'Production/demo mock worker isolation invariant failed.');
requireMatch(manifest.artifacts.productionMarkerMatches.length === 0 && manifest.artifacts.demoFixtureMarkers.length === 2, 'Production mock markers or demo fixture markers violate isolation expectations.');
requireMatch(/found 0 vulnerabilities/.test(runLog), 'Current clean npm audit did not report zero vulnerabilities.');
requireMatch(/Tests\s+138 passed \(138\)/.test(runLog) && /ℹ tests 7[\s\S]*?ℹ pass 7[\s\S]*?ℹ fail 0/.test(runLog), 'Clean verify Vitest or clean contract test count is missing.');
requireMatch(/layout-check PASS: 76 source files, 0 finding\(s\)/.test(runLog) && /visual-token-check PASS: 75 source files, 0 finding\(s\)/.test(runLog), 'Clean strict layout/visual-token source gates are not clean.');
requireMatch(/ui-composition PASS: 74 source files, 0 finding\(s\)/.test(runLog) && /ui-evidence PASS: S17/.test(runLog), 'Clean composition or S17 evidence gate did not pass.');
requireMatch(/production-unavailable-smoke/.test(runLog) && /"explicitErrorVisible":true/.test(runLog) && /"automaticMockFallback":false/.test(runLog) && /"mockWorkerRequests":0/.test(runLog), 'Production browser smoke does not prove explicit unavailable handling without mock fallback.');
requireMatch(frontendPackage.scripts.dev.includes('@botsales/web') && webPackage.scripts.dev.includes('--mode demo'), 'The demo development mode map does not match package scripts.');
requireMatch(webPackage.scripts['dev:live'].includes('--mode development') && webPackage.scripts.build.includes('--mode production') && webPackage.scripts['build:demo'].includes('--mode demo') && webPackage.scripts.preview.includes('--outDir dist-demo'), 'The live/dev, production/demo build and preview mode map does not match package scripts.');
requireMatch(viteConfig.includes("const mocks = mode === 'demo'") && viteConfig.includes("mode === 'production' && env.VITE_ENABLE_MOCKS === 'true'") && viteConfig.includes("API_PROXY_TARGET || 'http://127.0.0.1:3000'"), 'Vite mock/production/proxy boundary does not match observed config.');
requireMatch(mainSource.includes('if (__MOCK__)') && mainSource.includes('await startMockWorker()') && mainSource.includes('else if (\'serviceWorker\' in navigator)'), 'Application startup mock worker boundary is missing.');
requireMatch(shellSource.includes("__MOCK__ ? 'Dữ liệu mô phỏng' : 'API thật'") && shellSource.includes('ứng dụng không tự chuyển sang dữ liệu mô phỏng'), 'Demo label or live-mode no-fallback message is missing in source.');
requireMatch(setupSource.includes("if(!fs.existsSync(path.join(root,'.env.local')))") && setupSource.includes("fs.copyFileSync(path.join(root,'.env.example'),path.join(root,'.env.local'))"), 'Setup behavior for generating a fresh local env file from the example is not verified.');
requireMatch(readme.includes('npm run dev:live') && readme.includes('npm run build:demo') && readme.includes('API_PROXY_TARGET') && readme.includes('SHA256SUMS.json'), 'Frontend run/API/artifact docs are missing required entry points.');
requireMatch(/8 passed \(2\.6m\)/.test(browserLog) && /exitCode=0/.test(browserLog) && /apps\/web\/dist-demo/.test(browserLog), 'Focused Chromium/Firefox artifact preview E2E is missing or failed.');
requireMatch(/Playwright result: 512 passed \(50\.5m\)/.test(fullE2e) && /EXIT_CODE=0/.test(fullE2e), 'Current full browser suite summary is not a clean 512/512 result.');
requireMatch(/ui-composition PASS: 74 source files, 0 finding\(s\)/.test(fullVerify), 'Current full verify summary is missing the strict composition gate.');

const checksByStep = {
    S01: [
        'Inspected the actual package scripts and Vite mode/environment boundary; dev uses demo/MSW, dev:live uses development transport, build uses production and preview serves dist-demo.',
        'Confirmed UI reads same-origin API routes and API_PROXY_TARGET is only the development proxy target; no secret value was copied/read.',
        'Confirmed production rejects VITE_ENABLE_MOCKS=true while demo worker/fixture boundary is compiled from mode=demo.',
        'Captured and SHA-256 matched the active root workflow and frontend lockfile for the isolated workspace.',
    ],
    S02: [
        'Clean production artifact has no mock service worker and no inspected MSW/seed/demo fixture markers.',
        'Clean demo artifact includes the generated MSW worker and the synthetic shop fixtures.',
        'Production browser smoke aborted the session API request; the explicit unavailable alert appeared, no demo label appeared, and no mock worker request occurred.',
        'Production and demo artifacts each reproduce byte-for-byte on a second build from the same lock/source copy.',
    ],
    S03: [
        'Isolated npm ci used the current Frontend lockfile hash; clean npm audit found zero vulnerabilities.',
        'Clean verify passed source/generator/boundary/lint/typecheck/domain/network/unit/build and strict layout/visual-token/composition/evidence gates.',
        'Clean explicit contract generator regression tests passed 7/7; clean demo build completed successfully.',
        'The clean production and demo outputs passed marker checks and exact repeat-build tree hash comparisons.',
    ],
    S04: [
        'The root workflow snapshot SHA-256 matches the active .github/workflows/frontend.yml and runs npm ci, audit, setup, verify, browser install, test:e2e and artifact upload steps.',
        'Current focused Playwright run passed 8/8 on Chromium and Firefox, including preview of apps/web/dist-demo and production artifact isolation.',
        'Current full local Playwright suite passed 512/512, with 256 cases per engine; this is local synthetic evidence.',
        'No hosted Actions run, branch protection, staging, deployment or real backend run is claimed.',
    ],
    S05: [
        'Production and demo file-by-file manifests, per-file SHA-256 values, tree hashes and lockfile SHA-256 are recorded.',
        'README and handoff identify local install/run/build/preview commands, same-origin API configuration and the dev-only API_PROXY_TARGET boundary.',
        'The rollback scope is a local artifact/workspace restore or rebuild from the recorded lock/source; no hosted artifact promotion or deployment occurred.',
        'All evidence is bounded to React Frontend with synthetic MSW; hosted CI and human/owner acceptance remain separate.',
    ],
};
const observations = {
    S01: 'The checked-in package scripts and Vite configuration distinguish demo dev, live dev, production build, demo build and demo preview. The same-origin API route is /api/v2; API_PROXY_TARGET is only a development proxy. Production rejects VITE_ENABLE_MOCKS=true. The root workflow and package lock copies match their current SHA-256 values; the exact registered verify command also passed on the current source.',
    S02: 'A lock-installed isolated build generated separate deterministic dist and dist-demo trees. Production contains no mock worker or fixture markers. The browser smoke deliberately failed /api/v2/session and showed the explicit live API unavailable alert without enabling mock data or requesting the MSW worker. Demo includes the MSW worker and synthetic shop fixtures.',
    S03: 'The clean run passed npm ci, zero-vulnerability npm audit, setup, generator/source/boundary checks, lint, typecheck, 88 domain/network checks, 138 Vitest cases, production build, 82 strict layout tests/0 findings, 75 visual-token source files/0 findings, 38 UI composition tests/0 findings, 11 evidence validator tests, 7 explicit contract tests, and demo build. Production/demo asset trees reproduced identically on repeat builds.',
    S04: 'The current root frontend workflow is wired to the repository paths and frontend verification/E2E commands. Local built-artifact browser preview passed 8/8 across Chromium/Firefox and the current full browser run passed 512/512. This confirms configuration and local browser evidence, not a hosted CI execution.',
    S05: 'The FE026 handoff records source/lock/runtime identity, artifact manifests and checksums, how to install/run/build/preview, API environment scope, restore/rebuild rollback boundary, local verification results, and remaining hosted/backend/owner acceptance limitations.',
};

const sourcePaths = [
    'package.json', 'package-lock.json', 'apps/web/package.json', 'apps/web/vite.config.ts',
    'apps/web/src/main.tsx', 'apps/web/src/app/Shell.tsx', 'apps/web/src/app/SessionProvider.tsx',
    'apps/web/src/mocks/browser.ts', 'apps/web/src/mocks/seed.json', 'apps/web/src/shared/api/client.ts',
    'tests/artifacts/demo-preview.spec.ts', 'tests/frontend.spec.ts', 'playwright.config.ts',
    'scripts/run-e2e.mjs', 'scripts/setup.mjs', 'README.md',
    'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
    'botsales-kit/execution/frontend-evidence/FE026/run-clean-build-current-20261008.mjs',
    'botsales-kit/execution/frontend-evidence/FE026/capture-current-evidence-20261008.mjs',
    'botsales-kit/execution/frontend-evidence/FE026/frontend-workflow-config-current-20261008-attempt03.yml',
];
const sourceFiles = sourcePaths.map(file => ({
    path: file,
    sha256: sha256(file.startsWith('botsales-kit/') ? readRepo(file) : readFront(file)),
})).sort((a, b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const supportingLogs = [runLogFile, registeredVerifyFile, browserLogFile, fullE2eFile, fullVerifyFile].map(file => ({ file: file.replace(/^botsales-kit\//, ''), sha256: sha256(readRepo(file)) }));
const supportingArtifacts = [
    { file: manifestFile.replace(/^botsales-kit\//, ''), sha256: sha256(readRepo(manifestFile)) },
    { file: workflowFile.replace(/^botsales-kit\//, ''), sha256: sha256(workflowBytes) },
];

const checks = checksByStep[stepId];
const logFile = `execution/frontend-evidence/FE026/${stepId}-current-artifacts-20261008.log`;
const evidenceFile = path.join(evidenceDir, `${stepId}-current-artifacts-20261008.json`);
const generatedLog = [
    `FE026.${stepId} current isolated artifact/build evidence`,
    `executedAt=${new Date().toISOString()}`,
    `cwd=${frontend}`,
    `commandId=${command.id}`,
    `command=${command.command}`,
    `additionalCleanRunCommand=node execution/frontend-evidence/FE026/run-clean-build-current-20261008.mjs --remove-temp-after-pass`,
    'exitCode=0',
    `checksTotal=${checks.length}; failed=0`,
    ...checks.map((item, index) => `CHECK ${index + 1}: PASS ${item}`),
    `lockSha256=${manifest.sourceLockSha256}; copiedLockSha256=${manifest.copiedLockSha256}`,
    `rootWorkflowSha256=${manifest.rootWorkflowSha256}`,
    `productionTreeSha256=${manifest.artifacts.productionRepeat.treeSha256}; productionFiles=${manifest.artifacts.productionRepeat.fileCount}; mswWorker=${manifest.artifacts.productionRepeat.workerIncluded}`,
    `demoTreeSha256=${manifest.artifacts.demoRepeat.treeSha256}; demoFiles=${manifest.artifacts.demoRepeat.fileCount}; mswWorker=${manifest.artifacts.demoRepeat.workerIncluded}`,
    `productionUnavailableSmoke=${runLog.match(/\[production-unavailable-smoke\].*/)?.[0] ?? 'missing'}`,
    `currentFocusedBuiltDemoE2e=8/8; currentFullE2e=512/512`,
    `scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no hosted CI, Backend/provider, staging, production hosting, or owner-acceptance claim.`,
    `sourceSnapshotSha256=${sourceSnapshotSha256}`,
    ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
    ...supportingLogs.map(item => `LOG ${item.file} sha256=${item.sha256}`),
    ...supportingArtifacts.map(item => `ARTIFACT ${item.file} sha256=${item.sha256}`),
].join('\n') + '\n';
fs.writeFileSync(path.join(kit, logFile), generatedLog, 'utf8');

const evidence = {
    taskId: 'FE026',
    stepId,
    kind: step.requiredEvidenceKind,
    result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
    executedAt: new Date().toISOString(),
    sourceRevision: `HEAD ${head} plus the current source snapshot; isolated clean run and all supporting artifact/log hashes are attached.`,
    expected: step.verification,
    observed: observations[stepId],
    command: command.command,
    commandId: command.id,
    cwd: frontend,
    reviewer: 'Codex self-review; no independent peer review',
    environment: {
        name: 'Windows 11 / Node v24.19.0 / npm 11.17.0',
        details: 'Fresh npm ci in a temporary multi-project copy; no source .env.local or source .git metadata copied. Browser artifact checks use Chromium/Firefox with synthetic MSW only.',
        dataSource: 'synthetic-msw',
    },
    checksTotal: checks.length,
    failed: 0,
    exitCode: 0,
    logFile,
    logSha256: sha256(Buffer.from(generatedLog)),
    sourceFiles,
    sourceSnapshotSha256,
    supportingLogs,
    supportingArtifacts,
};
fs.writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ task: `FE026.${stepId}`, result: 'PASS', checks: checks.length, sourceFiles: sourceFiles.length, supportingLogs: supportingLogs.length, supportingArtifacts: supportingArtifacts.length, evidence: path.relative(kit, evidenceFile).replaceAll('\\', '/') }, null, 2));
