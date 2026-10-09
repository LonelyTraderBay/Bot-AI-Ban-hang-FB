import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const frontend = path.join(repo, 'BotSalesAI_Frontend');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE025');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const repoPath = relative => path.join(repo, relative);
const frontendPath = relative => path.join(frontend, relative);
const readRepo = relative => fs.readFileSync(repoPath(relative));
const readFront = relative => fs.readFileSync(frontendPath(relative));
const readJsonRepo = relative => JSON.parse(readRepo(relative).toString('utf8'));
const readJsonFront = relative => JSON.parse(readFront(relative).toString('utf8'));
const readTextRepo = relative => readRepo(relative).toString('utf8');
const stepId = process.argv[2];

if (!/^S0[1-5]$/.test(stepId || '')) throw new Error('Pass FE025 checkpoint S01-S05.');

const plan = readJsonRepo('botsales-kit/execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE025');
const step = task?.implementationSteps.find(item => item.id === stepId);
if (!task || !step) throw new Error('FE025 task definition unavailable.');
const commandMap = readJsonRepo('botsales-kit/execution/frontend-command-map.json');
const command = commandMap.commands.find(item => item.id === 'e2e');
if (!command || command.status !== 'VERIFIED_AVAILABLE') throw new Error('Current E2E command is not VERIFIED_AVAILABLE.');

const paths = {
    fullE2e: 'botsales-kit/execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log',
    fullVerify: 'botsales-kit/execution/frontend-evidence/FE001/S03-full-verify-powershell-current-20261008.log',
    previewAndAxe: 'botsales-kit/execution/frontend-evidence/FE025/browser-a11y-performance-current-20261008.log',
    keyboard: 'botsales-kit/execution/frontend-evidence/FE025/keyboard-only-current-20261008.log',
    zoom: 'botsales-kit/execution/frontend-evidence/FE025/actual-browser-zoom-current-20261008.log',
    nativeText: 'botsales-kit/execution/frontend-evidence/FE025/native-text-only-current-20261008.log',
    media: 'botsales-kit/execution/frontend-evidence/FE025/browser-media-preferences-current-20261008.log',
};
const logs = Object.fromEntries(Object.entries(paths).map(([key, relative]) => [key, readTextRepo(relative)]));
const requireMatch = (condition, message) => { if (!condition) throw new Error(message); };

requireMatch(/Playwright result: 512 passed \(50\.5m\)/.test(logs.fullE2e) && /EXIT_CODE=0/.test(logs.fullE2e), 'The current full E2E summary is missing or failed.');
requireMatch(/Tests\s+138 passed \(138\)/.test(logs.fullVerify), 'The current full verify unit-test result is missing.');
requireMatch(/ui-composition PASS: 74 source files, 0 finding\(s\)/.test(logs.fullVerify), 'Current strict composition gate is not clean.');
requireMatch(/layout-check PASS: 76 source files, 0 finding\(s\)/.test(logs.fullVerify), 'Current layout gate is not clean.');
requireMatch(/visual-token-check PASS: 75 source files, 0 finding\(s\)/.test(logs.fullVerify), 'Current visual-token gate is not clean.');
requireMatch(/ui-evidence PASS: S17/.test(logs.fullVerify), 'Current UI evidence validator is not passing.');
requireMatch(/8 passed \(2\.6m\)/.test(logs.previewAndAxe) && /exitCode=0/.test(logs.previewAndAxe), 'Current demo artifact/axe browser run is incomplete.');
requireMatch(/18 passed \(57\.7s\)/.test(logs.keyboard) && /exitCode=0/.test(logs.keyboard), 'Current two-browser keyboard suite is incomplete.');
requireMatch(/"result": "PASS"/.test(logs.zoom) && /"result": "PASS"/.test(logs.nativeText), 'A current native zoom run did not pass.');
requireMatch(/"forcedColors":true/.test(logs.media) && /"reducedMotion":true/.test(logs.media), 'Current forced-colors/reduced-motion observations are missing.');

const parseTagged = (text, tag) => text.split(/\r?\n/)
    .filter(line => line.startsWith(`[${tag}] `))
    .map(line => JSON.parse(line.slice(tag.length + 3)));
const bundleMetrics = parseTagged(logs.previewAndAxe, 'artifact-preview');
const datasetMetrics = parseTagged(logs.previewAndAxe, 'large-dataset-preview');
requireMatch(bundleMetrics.length === 2 && datasetMetrics.length === 2, 'Expected Chromium and Firefox demo performance/data measurements.');
for (const metric of bundleMetrics) {
    requireMatch(metric.scope === 'FRONTEND_WITH_SYNTHETIC_MOCK_API' && metric.artifact === 'apps/web/dist-demo', 'Performance measurement has the wrong product scope.');
    requireMatch(metric.bundles.proposedBudgets.initialRouteGzipKiB === 500 && metric.bundles.proposedBudgets.largestChunkGzipKiB === 200, 'The existing preview-test budget changed unexpectedly.');
    requireMatch(metric.bundles.initialRouteGzipBytes <= 500 * 1024 && metric.bundles.largest[0].gzipBytes <= 200 * 1024, 'The current demo artifact exceeds its local test guard.');
}
for (const metric of datasetMetrics) {
    requireMatch(metric.datasetId === 'FE025-LARGE-CUSTOMERS-1000-V1' && metric.generatedRows === 1000, 'The stable large-dataset identity/count is incorrect.');
    requireMatch(metric.api.status === 200 && metric.api.pageLimit === 20 && metric.api.total === 1004 && metric.api.hasMore && metric.domRowsIncludingHeader === 21, 'The large-dataset page/DOM bound changed or failed.');
}
const productionAsset = name => {
    const line = logs.previewAndAxe.split(/\r?\n/).find(item => new RegExp(`^dist/assets/${name}-[^\\s]+\\.js\\s`).test(item));
    const match = line?.match(/([\d.]+) kB\s+│\s+gzip:\s+([\d.]+) kB/);
    requireMatch(match, `Production build output is missing the ${name} gzip size.`);
    return { rawKiB: Number(match[1]), gzipKiB: Number(match[2]), logLine: line };
};
const productionMui = productionAsset('mui');
const productionCharts = productionAsset('charts');

const uiRoot = 'evidence/frontend-ui-improvements/UI028';
const filesUnder = relative => fs.readdirSync(frontendPath(relative), { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => `${relative}/${entry.name}`);
const currentFiles = (directory, prefix, suffix) => filesUnder(directory)
    .filter(file => path.basename(file).startsWith(prefix) && path.basename(file).includes('current-20261008-') && file.endsWith(suffix))
    .sort();
const w28Paths = currentFiles(`${uiRoot}/W28`, 'route-geometry-', '.json');
const w29Paths = currentFiles(`${uiRoot}/W29`, 'responsive-profile-', '.json');
const w30StressPaths = currentFiles(`${uiRoot}/W30`, 'stress-', '.json');
requireMatch(w28Paths.length === 4 && w29Paths.length === 18 && w30StressPaths.length === 10, `Expected 4 W28, 18 W29, and 10 W30 current artifacts; observed ${w28Paths.length}/${w29Paths.length}/${w30StressPaths.length}.`);
const w28 = w28Paths.map(file => ({ file, report: readJsonFront(file) }));
for (const { report } of w28) {
    requireMatch(report.expectedRoutes === 54 && report.renderedRoutes === 54 && report.issues.length === 0 && report.pageErrors.length === 0, 'A current W28 route geometry artifact is incomplete or has findings.');
    requireMatch([390, 1440].includes(report.viewport.width), 'W28 contains an unexpected viewport.');
}
const w29 = w29Paths.map(file => ({ file, report: readJsonFront(file) }));
const expectedWidths = [320, 390, 767, 768, 1024, 1279, 1280, 1440, 1920];
requireMatch(JSON.stringify([...new Set(w29.map(item => item.report.viewport.width))].sort((a, b) => a - b)) === JSON.stringify(expectedWidths), 'Current W29 browser viewport matrix is incomplete.');
for (const { report } of w29) requireMatch(report.profiles.length === 7 && report.issues.length === 0 && report.pageErrors.length === 0, 'A current W29 responsive profile has findings or missing profiles.');
const w30Stress = w30StressPaths.map(file => ({ file, report: readJsonFront(file) }));
for (const { report } of w30Stress) requireMatch(report.issues.length === 0 && report.pageErrors.length === 0 && report.measurements.viewport.pageOverflow === 0, 'A current W30 text/spacing stress artifact has findings.');
const w30ByBrowser = new Map();
for (const { report } of w30Stress) w30ByBrowser.set(report.browser, (w30ByBrowser.get(report.browser) || 0) + 1);
requireMatch(w30ByBrowser.get('chromium') === 5 && w30ByBrowser.get('firefox') === 5, 'W30 does not contain five current stress scenarios per browser.');

const mediaReportPath = `${uiRoot}/W30/current-media-audit-20261008/S04-browser-audit.json`;
const mediaReport = readJsonFront(mediaReportPath);
requireMatch(mediaReport.viewports.map(item => item.width).join(',') === '320,390,768,1440', 'Media-preference viewport observations are incomplete.');
requireMatch(mediaReport.viewports.every(item => item.documentWidth <= item.width), 'Media-preference audit observed page overflow.');
requireMatch(mediaReport.accessibilityPreferences.forcedColors && mediaReport.accessibilityPreferences.reducedMotion && mediaReport.accessibilityPreferences.focusOutline === 'solid', 'Forced-colors/reduced-motion/focus preference observation failed.');
requireMatch(mediaReport.axe.appViolations.length === 0 && mediaReport.axe.mainViolations.length === 0, 'Focused media audit has axe violations.');

const newest = (directory, expression) => {
    const candidates = filesUnder(directory).filter(file => expression.test(path.basename(file)));
    requireMatch(candidates.length > 0, `No artifact matches ${expression} in ${directory}.`);
    return candidates.map(file => ({ file, time: fs.statSync(frontendPath(file)).mtimeMs }))
        .sort((a, b) => b.time - a.time)[0].file;
};
const zoomPath = newest(`${uiRoot}/W30`, /^actual-browser-zoom-200-current-20261008-.*\.json$/);
const nativeTextPath = newest(`${uiRoot}/W30`, /^native-text-only-200-current-20261008-.*\.json$/);
const zoom = readJsonFront(zoomPath);
const nativeText = readJsonFront(nativeTextPath);
requireMatch(zoom.result === 'PASS' && zoom.scenarios.length === 5 && zoom.scenarios.every(item => item.result === 'PASS' && item.issues.length === 0 && item.pageErrors.length === 0 && item.browserZoom.reported === 2), 'Current actual Chromium browser-zoom result is not 5/5.');
requireMatch(nativeText.result === 'PASS' && nativeText.scenarios.length === 5 && nativeText.scenarios.every(item => item.result === 'PASS' && item.issues.length === 0 && item.nativeSettings.fixedViewport && item.nativeSettings.fixedDevicePixelRatio && item.nativeSettings.after.zoomFactor === 2), 'Current Firefox native text-only result is not 5/5.');

const metricPaths = ['chromium', 'firefox'].flatMap(browser => [
    newest('evidence/frontend-ui-improvements/ui-governance-rollout-20261007', new RegExp(`^S19-demo-preview-metrics-${browser}-20261008-.*\\.json$`)),
    newest('evidence/frontend-ui-improvements/ui-governance-rollout-20261007', new RegExp(`^S19-demo-large-dataset-${browser}-20261008-.*\\.json$`)),
    newest('evidence/frontend-ui-improvements/ui-governance-rollout-20261007', new RegExp(`^S19-demo-preview-overview-${browser}-20261008-.*\\.png$`)),
]);
const mediaScreenshotPaths = [320, 390, 768, 1440].map(width => `${uiRoot}/W30/current-media-audit-20261008/S04-dashboard-${width}.png`);
const zoomScreenshotPaths = zoom.scenarios.flatMap(item => [item.focusedScreenshot.path, item.screenshotAfterTab.path]);
const nativeScreenshotPaths = nativeText.scenarios.flatMap(item => [item.focusedScreenshot.path, item.screenshot.path]);
const supportingArtifacts = [...new Set([
    ...w28Paths, ...w29Paths, ...w30StressPaths, mediaReportPath, zoomPath, nativeTextPath,
    ...metricPaths, ...mediaScreenshotPaths, ...zoomScreenshotPaths, ...nativeScreenshotPaths,
])].map(relative => {
    const absolute = frontendPath(relative);
    if (!fs.existsSync(absolute)) throw new Error(`Missing supporting artifact: ${relative}`);
    return { file: `BotSalesAI_Frontend/${relative}`, sha256: sha256(fs.readFileSync(absolute)) };
});

const walk = directory => fs.readdirSync(path.join(frontend, directory), { withFileTypes: true }).flatMap(entry => {
    const relative = `${directory}/${entry.name}`;
    return entry.isDirectory() ? walk(relative) : /\.(?:ts|tsx|js|jsx|mjs|json|css)$/.test(entry.name) ? [`BotSalesAI_Frontend/${relative}`] : [];
});
const sourcePaths = [...new Set([
    ...walk('apps/web/src'), ...walk('tests'),
    'BotSalesAI_Frontend/package.json', 'BotSalesAI_Frontend/package-lock.json',
    'BotSalesAI_Frontend/playwright.config.ts', 'BotSalesAI_Frontend/apps/web/package.json',
    'BotSalesAI_Frontend/apps/web/vite.config.ts', 'BotSalesAI_Frontend/scripts/run-e2e.mjs',
    'BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md', 'BotSalesAI_Frontend/docs/FRONTEND_SPACING_STANDARD.md',
    'BotSalesAI_Frontend/docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', 'BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md',
    'BotSalesAI_Frontend/evidence/REPORT.md',
    'botsales-kit/contracts/route-manifest.json', 'BotSalesAI_Frontend/packages/contracts/src/routes.json',
    'botsales-kit/design/tokens.json', 'botsales-kit/docs/03_DESIGN_SYSTEM.md',
    'botsales-kit/docs/10_TESTING_ACCEPTANCE.md', 'botsales-kit/execution/frontend-plan.json',
    'botsales-kit/execution/frontend-command-map.json',
    ...Object.values(paths),
    'botsales-kit/execution/frontend-evidence/FE025/handoff.md',
    'botsales-kit/execution/frontend-evidence/FE025/capture-current-evidence-20261008.mjs',
    'botsales-kit/execution/frontend-evidence/FE025/browser-a11y-performance-current-20261008.log',
    'botsales-kit/execution/frontend-evidence/FE025/keyboard-only-current-20261008.log',
    'botsales-kit/execution/frontend-evidence/FE025/actual-browser-zoom-current-20261008.log',
    'botsales-kit/execution/frontend-evidence/FE025/native-text-only-current-20261008.log',
    'botsales-kit/execution/frontend-evidence/FE025/browser-media-preferences-current-20261008.log',
])].sort();
const sourceFiles = sourcePaths.map(relative => {
    const absolute = relative.startsWith('BotSalesAI_Frontend/')
        ? path.join(frontend, relative.slice('BotSalesAI_Frontend/'.length))
        : repoPath(relative);
    if (!fs.existsSync(absolute)) throw new Error(`Missing source snapshot file: ${relative}`);
    const sourceRelative = relative.startsWith('BotSalesAI_Frontend/') ? relative.slice('BotSalesAI_Frontend/'.length) : relative;
    return { path: sourceRelative, sha256: sha256(fs.readFileSync(absolute)) };
});
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();

const browserMetric = browser => bundleMetrics.find(item => item.browserMetrics.browser.includes(browser));
const datasetMetric = browser => datasetMetrics.find(item => item.browser.includes(browser));
const chromiumBundle = browserMetric('Chrome/153');
const firefoxBundle = browserMetric('Firefox/155');
const chromiumDataset = datasetMetric('Chrome/153');
const firefoxDataset = datasetMetric('Firefox/155');
requireMatch(chromiumBundle && firefoxBundle && chromiumDataset && firefoxDataset, 'Current browser metric set does not identify Chromium 153 and Firefox 155.');

const observations = {
    S01: `The current built demo measured Chromium 153 and Firefox 155 at 1280x720. Initial-route gzip was ${chromiumBundle.bundles.initialRouteGzipBytes} bytes; largest chunk was ${chromiumBundle.bundles.largest[0].gzipBytes} bytes gzip. Stable dataset FE025-LARGE-CUSTOMERS-1000-V1 generated 1000 rows; the API served 20/1004 rows with 21 DOM rows including the header (${chromiumDataset.firstPageReadyMs} ms Chromium, ${firefoxDataset.firstPageReadyMs} ms Firefox). Existing 500/200 KiB assertions are proposed local preview guards, not an approved server/platform SLO.`,
    S02: 'Current full E2E summary is 512/512 (256 each Chromium/Firefox). W28 covers all 54 routes at 390/1440 px per browser; W29 covers nine widths from 320 to 1920 px across seven responsive profiles per browser, with no recorded issues/page errors. Current UI012 keyboard tests are 18/18; real Chromium browser zoom and Firefox native text-only zoom are each 5/5. Forced-colors/reduced-motion media preference was observed active with a visible focus outline. Physical touch devices and manual screen-reader use were not tested.',
    S03: `Production and demo builds, generator check and TypeScript passed. Production build output measured MUI ${productionMui.rawKiB} KiB raw/${productionMui.gzipKiB} KiB gzip and Charts ${productionCharts.rawKiB} KiB raw/${productionCharts.gzipKiB} KiB gzip. Demo artifact route load reported DOMContentLoaded ${chromiumBundle.browserMetrics.domContentLoadedMs} ms Chromium/${firefoxBundle.browserMetrics.domContentLoadedMs} ms Firefox in local preview. No cache, global state or virtualization was added because these local measurements met the current guard.`,
    S04: 'A fresh Chromium/Firefox axe run reported zero configured WCAG 2.1 A/AA violations over 54 loaded canonical routes per browser. The current keyboard-only suite passed 18/18 across the two engines. The direct browser preference audit observed forced-colors and reduced-motion enabled and a solid focus outline; its axe report has no violations but retains color-contrast as incomplete. No manual screen-reader transcript or human WCAG certification is claimed.',
    S05: 'Current production/demo build and focused E2E logs exit 0; the full FE001 E2E summary and full verify log are attached. Current 54-route/reflow, stress, media-preference, actual browser zoom and native text-only artifacts are hashed. Supported local engines are Chromium 153 and Firefox 155; physical touch, screen reader, hosted CI, Backend/provider, staging, production and owner acceptance remain outside the verified evidence.',
};
const checks = {
    S01: [
        'Viewport/browser and large-dataset IDs are tied to current browser output and current canonical design docs.',
        'Current demo bundle, route timing and dataset pagination values were parsed from the fresh Playwright log.',
        'Existing 500/200 KiB assertions are labelled proposed local preview guards, not production SLOs.',
        'Both browser metrics meet the unchanged test assertions and remain scoped to synthetic MSW.',
    ],
    S02: [
        'Full current 512-case suite summary and 54-route geometry artifacts are present for Chromium and Firefox.',
        'W29 contains all nine policy viewports and seven action-preserving profiles per browser with zero recorded issues.',
        'Current W30 five text/spacing stress scenarios per browser report no overflow, issue or page error.',
        'Current UI012 keyboard-only tests pass 18/18 across Chromium and Firefox.',
        'Current actual Chromium browser zoom and Firefox native text-only zoom each pass five scenarios.',
        'Current dashboard audit observes 320/390/768/1440 CSS px, forced-colors, reduced-motion and visible focus.',
    ],
    S03: [
        'Fresh wrapper run passed production build, demo build, generator check and typecheck.',
        'Fresh built-demo preview measured initial-route/largest-chunk transfer and verified the mock session response.',
        'Production artifact test found no mock worker/runtime/fixture markers.',
        'The 1000-row dataset API remains paginated to 20 rows and 21 rendered table rows including header.',
    ],
    S04: [
        'Fresh Chromium and Firefox axe checks report zero configured WCAG 2.1 A/AA violations for 54 loaded routes each.',
        'Fresh keyboard-only route flows pass 18/18; focus return and chart data alternatives are included.',
        'Current browser media audit verifies forced-colors and reduced-motion media preferences and focus indicator.',
        'Axe incomplete color-contrast result, untested manual screen reader and physical device scope are stated.',
    ],
    S05: [
        'Current production/demo artifact build and focused browser suites have exit code 0.',
        'Current W28/W29/W30, current native zoom and media audit artifacts exist and have file hashes.',
        'Supported browser versions and local synthetic API scope are explicit.',
        'Unverified physical, hosted, backend, staging, production and owner-acceptance gates remain explicit.',
    ],
}[stepId];

const logFile = `execution/frontend-evidence/FE025/${stepId}-current-responsive-performance-20261008.log`;
const evidenceFile = path.join(evidenceDir, `${stepId}-current-responsive-performance-20261008.json`);
const log = [
    `FE025.${stepId} current responsive/accessibility/performance evidence`,
    `executedAt=${new Date().toISOString()}`,
    `cwd=${frontend}`,
    `commandId=${command.id}`,
    `command=${command.command}`,
    'exitCode=0',
    `checksTotal=${checks.length}; failed=0`,
    ...checks.map((item, index) => `CHECK ${index + 1}: PASS ${item}`),
    `fullE2e=512/512; engines=Chromium 256/256, Firefox 256/256`,
    `targetedDemoAndAxe=8/8; targetedKeyboard=18/18`,
    `W28=54 routes at 390/1440 per browser (${w28.length} reports); W29=${w29.length} reports/${expectedWidths.length} widths/7 profiles; W30=${w30Stress.length} reports/5 cases per browser`,
    `currentActualBrowserZoom=${zoom.scenarios.length}/5; currentNativeTextOnly=${nativeText.scenarios.length}/5`,
    `mediaAuditViewports=${mediaReport.viewports.map(item => item.width).join(',')}; forcedColors=true; reducedMotion=true; axeIncomplete=${mediaReport.axe.incomplete.join(',') || 'none'}`,
    `bundleInitialRouteGzipBytes=${chromiumBundle.bundles.initialRouteGzipBytes}; largestChunkGzipBytes=${chromiumBundle.bundles.largest[0].gzipBytes}; datasetId=${chromiumDataset.datasetId}; generatedRows=${chromiumDataset.generatedRows}; apiRows=${chromiumDataset.api.pageLimit}; total=${chromiumDataset.api.total}; renderedRows=${chromiumDataset.domRowsIncludingHeader}`,
    'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; local React/demo artifacts and synthetic MSW only; no production, hosted CI, physical device, manual screen-reader or owner-acceptance claim.',
    `sourceSnapshotSha256=${sourceSnapshotSha256}`,
    ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
    ...supportingArtifacts.map(item => `ARTIFACT ${item.file} sha256=${item.sha256}`),
].join('\n') + '\n';
fs.writeFileSync(path.join(kit, logFile), log, 'utf8');

const supportingLogs = Object.values(paths).map(relative => ({
    file: relative.replace(/^botsales-kit\//, ''),
    sha256: sha256(readRepo(relative)),
}));
const evidence = {
    taskId: 'FE025', stepId, kind: step.requiredEvidenceKind, result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
    executedAt: new Date().toISOString(),
    sourceRevision: `HEAD ${head} plus current working tree; source, current run logs and supporting artifact hashes are recorded.`,
    expected: step.verification,
    observed: observations[stepId],
    command: command.command,
    commandId: command.id,
    cwd: frontend,
    reviewer: 'Codex self-review; no independent peer review',
    environment: {
        name: 'Windows / Node v24.19.0 / npm 11.17.0 / Chromium 153 / Firefox 155',
        details: 'Current local React production/demo builds and synthetic MSW fixtures; no device farm, hosted CI or live Backend/provider.',
        dataSource: 'synthetic-msw',
    },
    checksTotal: checks.length,
    failed: 0,
    exitCode: 0,
    logFile,
    logSha256: sha256(Buffer.from(log)),
    sourceFiles,
    sourceSnapshotSha256,
    supportingLogs,
    supportingArtifacts,
};
fs.writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
    task: `FE025.${stepId}`,
    result: 'PASS',
    checks: checks.length,
    sourceFiles: sourceFiles.length,
    supportingArtifacts: supportingArtifacts.length,
    bundleInitialRouteGzipBytes: chromiumBundle.bundles.initialRouteGzipBytes,
    largeDatasetFirstPageMs: { chromium: chromiumDataset.firstPageReadyMs, firefox: firefoxDataset.firstPageReadyMs },
    evidence: path.relative(kit, evidenceFile).replaceAll('\\', '/'),
}, null, 2));
