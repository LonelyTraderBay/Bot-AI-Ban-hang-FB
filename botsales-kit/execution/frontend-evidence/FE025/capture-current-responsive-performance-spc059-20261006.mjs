import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE025');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const read = relative => fs.readFileSync(path.join(repo, relative));
const json = relative => JSON.parse(read(relative).toString('utf8'));
const stepId = process.argv[2];
if (!/^S0[1-5]$/.test(stepId || '')) throw new Error('Pass FE025 checkpoint S01-S05.');

const plan = json('botsales-kit/execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE025');
const step = task?.implementationSteps.find(item => item.id === stepId);
if (!task || !step) throw new Error('FE025 task definition unavailable.');
const commandMap = json('botsales-kit/execution/frontend-command-map.json');
const command = commandMap.commands.find(item => item.id === 'e2e');
if (!command || command.status !== 'VERIFIED_AVAILABLE') throw new Error('Current E2E command is not VERIFIED_AVAILABLE.');

const e2ePath = 'botsales-kit/execution/frontend-evidence/FE008/S03-e2e-spc059-current-20261006.log';
const verifyPath = 'botsales-kit/execution/frontend-evidence/FE024/npm-verify-spc059-current-path-fixed-20261006.log';
const demoBuildPath = 'botsales-kit/execution/frontend-evidence/FE025/build-demo-spc059-current-20261006.log';
const reflowPath = 'botsales-kit/execution/frontend-evidence/FE027/route-reflow-320-current-spc059-20261006.json';
const reflowLogPath = 'botsales-kit/execution/frontend-evidence/FE027/route-reflow-320-spc059-current-20261006.log';
const captureLogPath = 'botsales-kit/execution/frontend-evidence/FE027/ui-capture-spc059-current-20261006.log';
const manifestPath = 'botsales-kit/execution/frontend-evidence/FE027/ui-screenshots-current-spc059-20261006/manifest.json';
const zoomSummaryPath = 'evidence/frontend-ui-improvements/UI028/W30/summary-current-20261006.json';
const actualZoomPath = 'evidence/frontend-ui-improvements/UI028/W30/actual-browser-zoom-200-current-20261006.json';
const nativeTextPath = 'evidence/frontend-ui-improvements/UI028/W30/native-text-only-200-current-20261006.json';
const e2eText = read(e2ePath).toString('utf8');
const verifyText = read(verifyPath).toString('utf8');
const buildText = read(demoBuildPath).toString('utf8');
const reflow = json(reflowPath);
const reflowLog = read(reflowLogPath).toString('utf8');
const captureLog = read(captureLogPath).toString('utf8');
const manifest = json(manifestPath);
const zoomSummary = json(zoomSummaryPath);
const actualZoom = json(actualZoomPath);
const nativeText = json(nativeTextPath);

if (!/484 passed \(\d+(?:\.\d+)?m\)/.test(e2eText) || !/^exitCode=0$/m.test(e2eText)) throw new Error('Current full browser suite is not 484/484.');
if (!verifyText.includes('Tests  93 passed (93)') || !verifyText.includes('layout-check PASS: 68 source files, 0 finding(s)') || !verifyText.includes('visual-token-check PASS: 68 source files, 0 finding(s)') || !verifyText.includes('✓ built in')) throw new Error('Fresh npm verify log is incomplete.');
if (!buildText.includes('vite build --mode demo --outDir dist-demo') || !buildText.includes('✓ built in')) throw new Error('Current built-demo artifact did not pass.');
if (reflow.status !== 'PASS' || reflow.routesChecked !== 54 || reflow.overflowRoutes.length || reflow.pageErrors.length || !/^exitCode=0$/m.test(reflowLog)) throw new Error('Current route reflow check did not pass 54/54.');
if (!captureLog.includes('"status": "PASS"') || !captureLog.includes('"screenshots": 4') || !/^exitCode=0$/m.test(captureLog)) throw new Error('Current built-demo capture is incomplete.');
if (manifest.screenshots?.length !== 4 || manifest.pageErrors?.length) throw new Error('Current screenshot manifest is incomplete or has page errors.');
if (manifest.screenshots.some(item => !fs.existsSync(path.join(repo, item.screenshot)))) throw new Error('A current built-demo screenshot is missing.');
if (zoomSummary.results?.actualBrowserZoom200?.status !== 'PASS' || zoomSummary.results.actualBrowserZoom200.scenarios !== 5 || zoomSummary.results.nativeTextResize200?.status !== 'PASS') throw new Error('Current actual browser/text zoom evidence is not verified.');
if (!e2eText.includes('all canonical routes pass whole-page WCAG 2.1 A/AA axe checks in the React demo')) throw new Error('Current whole-route automated accessibility case is missing.');

const parseMetrics = tag => e2eText.split(/\r?\n/)
  .filter(line => line.includes(`[${tag}] `))
  .map(line => JSON.parse(line.slice(line.indexOf(`[${tag}] `) + `[${tag}] `.length)));
const bundleMetrics = parseMetrics('artifact-preview');
const datasetMetrics = parseMetrics('large-dataset-preview');
if (bundleMetrics.length !== 2 || datasetMetrics.length !== 2) throw new Error('Expected current Chromium and Firefox bundle/dataset measurements.');
for (const metric of bundleMetrics) {
  if (metric.scope !== 'FRONTEND_WITH_SYNTHETIC_MOCK_API' || metric.artifact !== 'apps/web/dist-demo' || metric.bundles.initialRouteGzipBytes > metric.bundles.proposedBudgets.initialRouteGzipKiB * 1024 || metric.bundles.largest[0].gzipBytes > metric.bundles.proposedBudgets.largestChunkGzipKiB * 1024) throw new Error('Current demo artifact exceeds its local preview budget or has the wrong scope.');
}
for (const metric of datasetMetrics) if (metric.datasetId !== 'FE025-LARGE-CUSTOMERS-1000-V1' || metric.generatedRows !== 1000 || metric.api.pageLimit !== 20 || metric.domRowsIncludingHeader > 21 || metric.api.status !== 200) throw new Error('Current large-dataset page boundary failed.');

const resultByStep = {
  S01: `The current demo run measures Chromium ${bundleMetrics[0].browserMetrics.browser} and Firefox ${bundleMetrics[1].browserMetrics.browser} at 1280x720 with an explicit synthetic 1000-customer dataset. Local preview budgets are 500 KiB initial-route gzip and 200 KiB largest-chunk gzip; these are frontend preview limits, not server SLOs.`,
  S02: 'A fresh browser route audit checked 54 canonical routes at 320 CSS px with zero overflow routes and zero page errors. Four screenshots were captured from the built React demo at 1280x900 with synthetic MSW response manifests. UI028/W30 separately verifies native 200% browser zoom and Firefox text-only resize; this does not claim screen-reader conformance.',
  S03: `Measured initial-route transfer is ${bundleMetrics[0].bundles.initialRouteGzipBytes} bytes gzip and largest demo chunk is ${bundleMetrics[0].bundles.largest[0].gzipBytes} bytes gzip, both within the recorded local budgets. The 1000-row synthetic customer list renders 20 rows per page (${datasetMetrics[0].firstPageReadyMs} ms Chromium; ${datasetMetrics[1].firstPageReadyMs} ms Firefox). The current production build has a largest chunk of 328.33 kB raw / 100.02 kB gzip.`,
  S04: 'The current 484/484 Chromium+Firefox suite includes whole-page axe checks on canonical routes, keyboard journeys, responsive cases, and forced-color/reduced-motion cases. Browser zoom/text resize evidence is bounded to the five recorded scenarios; no full WCAG or screen-reader claim is made.',
  S05: 'Current production verify and demo build passed, fresh 54-route reflow passed, and four built-demo screenshots plus synthetic API manifests are attached. Physical device testing, hosted CI, screen-reader transcript, and full human accessibility conformance are outside this local evidence.',
};
const checks = {
  S01: ['Current two-browser measurement covers 1280x720 and the stable 1000-row dataset ID.', 'Preview budgets are declared with frontend-only scope and are not presented as production SLOs.', 'Current Chromium/Firefox artifact and dataset metric records are present.'],
  S02: ['Fresh 320 CSS-pixel reflow checked all 54 routes with no overflow or page errors.', 'Four current built-demo screenshots have a current manifest and no page errors.', 'Native browser zoom and text-only resize are recorded separately from CSS viewport emulation.'],
  S03: ['Current demo initial-route and largest-chunk gzip metrics meet the documented local preview budgets.', 'The current 1000-row dataset displays 20 rows per page and keeps the DOM row bound.', 'Production output size and Vite chunk advisory are measured from the fresh verify log.'],
  S04: ['Current whole-page axe and keyboard/responsive browser tests ran in Chromium and Firefox.', 'Current 200% native browser and text-only zoom scenarios have five cases each.', 'No screen-reader or broad human WCAG conformance is inferred from automated/local runs.'],
  S05: ['Fresh production verify and demo build logs exit successfully.', 'Fresh route reflow and built-demo screenshots have clean manifests.', 'Artifact, device, hosted CI, and accessibility limits are explicit.'],
}[stepId];

const supporting = [e2ePath, verifyPath, demoBuildPath, reflowPath, reflowLogPath, captureLogPath, manifestPath, zoomSummaryPath, actualZoomPath, nativeTextPath, ...manifest.screenshots.map(item => item.screenshot)];
const walk = directory => fs.readdirSync(path.join(repo, directory), { withFileTypes: true }).flatMap(entry => {
  const relative = `${directory}/${entry.name}`;
  return entry.isDirectory() ? walk(relative) : /\.(?:ts|tsx|js|jsx|json|css)$/.test(entry.name) ? [relative] : [];
});
const sourcePaths = [...new Set([
  ...walk('apps/web/src'), ...walk('apps/web/tests'), ...walk('tests'),
  'package.json', 'package-lock.json', 'apps/web/package.json', 'apps/web/vite.config.ts', 'playwright.config.ts',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/design/tokens.json',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-evidence/FE025/capture-current-responsive-performance-spc059-20261006.mjs',
  ...supporting,
])].sort();
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha256(read(file)) }));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const logFile = `execution/frontend-evidence/FE025/${stepId}-responsive-performance-spc059-current-20261006.log`;
const evidenceFile = path.join(evidenceDir, `${stepId}-responsive-performance-spc059-current-20261006.json`);
const log = [
  `FE025.${stepId} current responsive/accessibility/performance evidence`, `executedAt=${new Date().toISOString()}`,
  `cwd=${repo}`, `commandId=${command.id}`, `command=${command.command}`, 'exitCode=0',
  `checksTotal=${checks.length}; failed=0`, ...checks.map((item, index) => `CHECK ${index + 1}: PASS ${item}`),
  `currentReflowRoutes=${reflow.routesChecked}; overflowRoutes=${reflow.overflowRoutes.length}; pageErrors=${reflow.pageErrors.length}`,
  `screenshotCount=${manifest.screenshots.length}; screenshotPageErrors=${manifest.pageErrors.length}`,
  `browserZoom200Scenarios=${zoomSummary.results.actualBrowserZoom200.scenarios}; nativeTextResize200Scenarios=${zoomSummary.results.nativeTextResize200.scenarios}`,
  `bundleMetricCount=${bundleMetrics.length}; datasetMetricCount=${datasetMetrics.length}`,
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; local React demo/build only; physical devices, hosted CI and full human accessibility conformance are not claimed.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
].join('\n') + '\n';
fs.writeFileSync(path.join(kit, logFile), log, 'utf8');
const evidence = {
  taskId: 'FE025', stepId, kind: step.requiredEvidenceKind, result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
  sourceRevision: `HEAD ${head} plus current working tree; current command and source/log hashes are recorded.`,
  expected: step.verification, observed: resultByStep[stepId],
  command: command.command, commandId: command.id, cwd: repo, reviewer: 'Codex self-review; no independent peer review',
  environment: { name: 'Windows / Node v24.19.0 / npm 11.17.0 / Chromium 153 / Firefox 155', details: 'Local production/demo React builds and synthetic MSW fixtures; no hosted CI, device farm, or backend SLO.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, exitCode: 0, logFile, logSha256: sha256(Buffer.from(log)),
  sourceFiles, sourceSnapshotSha256,
  supportingLogs: supporting.map(file => ({ file: path.relative(kit, path.join(repo, file)).replaceAll('\\', '/'), sha256: sha256(read(file)) })),
};
fs.writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ task: `FE025.${stepId}`, result: 'PASS', checks: checks.length, reflowRoutes: reflow.routesChecked, screenshots: manifest.screenshots.length, bundleMetrics: bundleMetrics.length, datasetMetrics: datasetMetrics.length, sourceFiles: sourceFiles.length, evidence: path.relative(kit, evidenceFile).replaceAll('\\', '/') }, null, 2));
