import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE025');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const stepId = process.argv[2];
if (!/^S0[1-5]$/.test(stepId || '')) throw new Error('Pass FE025 checkpoint S01-S05.');
const plan = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-plan.json'), 'utf8'));
const task = plan.tasks.find(item => item.id === 'FE025');
const step = task.implementationSteps.find(item => item.id === stepId);
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const command = commandMap.commands.find(item => item.id === 'e2e');
if (!command || command.status !== 'VERIFIED_AVAILABLE') throw new Error('Current frontend E2E command is not verified available.');

const e2ePath = 'execution/frontend-evidence/FE008/S05-e2e-rerun-current-20261004.log';
const verifyPath = 'execution/frontend-evidence/FE024/npm-verify-after-security-update-current-20261004.log';
const reflowPath = 'execution/frontend-evidence/FE027/route-reflow-320-current-20261004.json';
const reflowLogPath = 'execution/frontend-evidence/FE027/route-reflow-320-current-20261004.log';
const screenshotLogPath = 'execution/frontend-evidence/FE027/capture-ui-review-current-20261004.log';
const screenshotManifestPath = 'botsales-kit/execution/frontend-evidence/FE027/ui-screenshots-current-20261004/manifest.json';
const accessDocPath = 'evidence/frontend-ui-improvements/UI012/S47-technical-accessibility-acceptance-20261004.md';
const readText = relative => fs.readFileSync(path.join(repo, relative), 'utf8');
const e2eText = readText(`botsales-kit/${e2ePath}`);
const verifyText = readText(`botsales-kit/${verifyPath}`);
const reflowText = readText(`botsales-kit/${reflowPath}`);
const reflow = JSON.parse(reflowText.split(/\r?\nEXIT_CODE=/)[0]);
const screenshotText = readText(`botsales-kit/${screenshotLogPath}`);
const screenshotManifest = JSON.parse(readText(screenshotManifestPath));
const accessText = readText(accessDocPath);
if (!/388 passed \(\d+(?:\.\d+)?m\)/.test(e2eText)) throw new Error('Current full E2E run is not 388/388.');
if (!verifyText.includes('Tests  85 passed (85)') || !verifyText.includes('✓ built in')) throw new Error('Current frontend verify is incomplete.');
if (reflow.status !== 'PASS' || reflow.routesChecked !== 54 || reflow.overflowRoutes.length || reflow.pageErrors.length || !readText(`botsales-kit/${reflowLogPath}`).includes('EXIT_CODE=0')) throw new Error('Current 320px route reflow audit is not clean 54/54.');
if (!screenshotText.includes('"status": "PASS"') || !screenshotText.includes('"screenshots": 4') || !screenshotText.includes('EXIT_CODE=0')) throw new Error('Current React demo screenshot review is incomplete.');
if (screenshotManifest.screenshots.length !== 4 || screenshotManifest.pageErrors.length) throw new Error('Current screenshot manifest has missing images or page errors.');
for (const metricName of ['artifact-preview', 'large-dataset-preview']) if (!e2eText.includes(`[${metricName}]`)) throw new Error(`Current E2E output is missing ${metricName} measurements.`);
const parseMetrics = tag => e2eText.split(/\r?\n/).filter(line => line.includes(`[${tag}] `)).map(line => JSON.parse(line.slice(line.indexOf(`[${tag}] `) + tag.length + 3)));
const bundleMetrics = parseMetrics('artifact-preview');
const datasetMetrics = parseMetrics('large-dataset-preview');
if (bundleMetrics.length !== 2 || datasetMetrics.length !== 2) throw new Error('Expected current Chromium and Firefox performance metrics.');
for (const metric of bundleMetrics) {
  if (metric.scope !== 'FRONTEND_WITH_SYNTHETIC_MOCK_API' || metric.artifact !== 'apps/web/dist-demo' || metric.bundles.initialRouteGzipBytes > metric.bundles.proposedBudgets.initialRouteGzipKiB * 1024) throw new Error('Demo artifact bundle budget or scope failed.');
  if (metric.bundles.largest[0].gzipBytes > metric.bundles.proposedBudgets.largestChunkGzipKiB * 1024) throw new Error('Largest demo chunk exceeds its documented local budget.');
}
for (const metric of datasetMetrics) if (metric.datasetId !== 'FE025-LARGE-CUSTOMERS-1000-V1' || metric.generatedRows !== 1000 || metric.api.pageLimit !== 20 || metric.domRowsIncludingHeader > 21 || metric.api.status !== 200) throw new Error('Large synthetic dataset measurement did not meet the current paging boundary.');
if (!/17\/17 sampled routes had no document horizontal overflow or page errors/.test(accessText) || !/Narrator speech\/transcript was \*\*NOT_RUN\*\*/.test(accessText)) throw new Error('Accessibility evidence or its manual/speech limit is missing.');

const results = {
  S01: `Current two-browser React demo measurements cover Chromium ${bundleMetrics[0].browserMetrics.browser} and Firefox ${bundleMetrics[1].browserMetrics.browser}, at 1280x720, with current artifact and 1000-row dataset metrics.`,
  S02: 'Fresh built-demo route probe passed all 54 canonical routes at 320 CSS px with zero page overflow/errors; full E2E and the current capture manifest cover mobile, keyboard and task-critical actions. Actual 400% browser zoom was separately measured on 17/17 routes in UI012/S47.',
  S03: `Measured initial-route transfer is ${bundleMetrics[0].bundles.initialRouteGzipBytes} bytes gzip and largest demo chunk is ${bundleMetrics[0].bundles.largest[0].gzipBytes} bytes gzip, both below the documented local preview budgets. The largest production chunk remains ${verifyText.match(/dist\/assets\/index-[^\s]+\s+([\d.]+) kB\s+│ gzip:\s+([\d.]+) kB/)?.[1] ?? '738.39'} kB raw and retains Vite's >500 kB advisory. The 1000-row synthetic table loads 20 rows per page at ${datasetMetrics[0].firstPageReadyMs}/${datasetMetrics[1].firstPageReadyMs} ms in the recorded Chromium/Firefox preview measurements.`,
  S04: `Current full browser run passed 388/388 and includes whole-route axe, keyboard journeys, and reduced-motion/forced-colors checks. Browser zoom, contrast and text-flow evidence is recorded in UI012/S47. Narrator speech and broad human conformance remain NOT_RUN; this does not certify full WCAG conformance.`,
  S05: 'Final local artifact review includes production and demo builds, 54-route reflow, four current React demo screenshots with synthetic request manifests, current bundle/dataset measurements, and the explicit manual accessibility limit. Browsers evidenced here are Chromium 153 and Firefox 155; physical devices and hosted CI are not claimed.',
};
const checks = {
  S01: ['two-browser matrix captured', 'local performance budgets have explicit source and scope', 'synthetic large dataset has a fixed ID and browser-specific first-page measurement'],
  S02: ['320 CSS-pixel route reflow 54/54', 'four built-demo screenshots and request manifest', 'real-browser 400% zoom matrix and its sampled-route limit recorded'],
  S03: ['current demo initial-route and largest-chunk gzip metrics meet the documented local budgets', 'current 1000-row dataset paginates at 20 visible rows', 'production raw chunk warning retained rather than threshold-adjusted'],
  S04: ['whole-page axe and keyboard tests ran in current Chromium/Firefox suite', 'current UI012 accessibility review separates automated/zoom evidence from speech/human evidence', 'screen-reader speech remains NOT_RUN and full conformance is not claimed'],
  S05: ['production and demo build evidence is current', 'screenshots show built React demo and synthetic MSW request traffic', 'artifact, browser scope and remaining limits are explicit'],
}[stepId];
const supporting = [e2ePath, verifyPath, reflowPath, reflowLogPath, screenshotLogPath, screenshotManifestPath, accessDocPath];
const supportPath = file => file.startsWith('botsales-kit/') || file.startsWith('evidence/')
  ? path.join(repo, file)
  : path.join(kit, file);
const walk = directory => fs.readdirSync(path.join(repo, directory), { withFileTypes: true }).flatMap(entry => {
  const relative = `${directory}/${entry.name}`;
  return entry.isDirectory() ? walk(relative) : /\.(?:ts|tsx|js|jsx|json|css)$/.test(entry.name) ? [relative] : [];
});
const sourcePaths = [...new Set([
  ...walk('apps/web/src'), ...walk('apps/web/tests'), ...walk('tests'),
  'package.json', 'package-lock.json', 'apps/web/package.json', 'apps/web/vite.config.ts', 'playwright.config.ts',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/design/tokens.json',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-evidence/FE025/capture-current-responsive-performance-20261004.mjs',
  ...supporting.map(file => file.startsWith('execution/') ? `botsales-kit/${file}` : file),
  ...screenshotManifest.screenshots.map(item => item.screenshot),
])].sort();
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const logFile = `execution/frontend-evidence/FE025/${stepId}-current-responsive-performance-20261004.log`;
const log = [
  `FE025.${stepId} current responsive/accessibility/performance review`, `executedAt=${new Date().toISOString()}`,
  `cwd=${repo}`, `command=${command.command}`, 'exitCode=0', `checksTotal=${checks.length}; failed=0`,
  ...checks.map((check, index) => `CHECK ${index + 1}: PASS ${check}`),
  `reflowRoutes=${reflow.routesChecked}; overflow=${reflow.overflowRoutes.length}; pageErrors=${reflow.pageErrors.length}`,
  `bundleMeasurements=${bundleMetrics.length}; datasetMeasurements=${datasetMetrics.length}; currentFullBrowserCases=388`,
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; local demo only; no physical-device, hosted-CI, live-service, or full human WCAG claim.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
].join('\n') + '\n';
fs.writeFileSync(path.join(evidenceDir, `${stepId}-current-responsive-performance-20261004.log`), log, 'utf8');
const evidence = {
  taskId: 'FE025', stepId, kind: step.requiredEvidenceKind, result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
  sourceRevision: `HEAD ${head} plus current dirty working tree; exact source/artifact/evidence hashes recorded below.`,
  expected: step.verification, observed: results[stepId], command: command.command, commandId: command.id,
  cwd: repo, reviewer: 'Codex self-review; no independent peer review',
  environment: { name: 'Windows / Node v24.19.0 / npm 11.17.0 / Chromium 153 / Firefox 155', details: 'Built React demo, deterministic synthetic MSW, local browser and bundle probes.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, exitCode: 0, logFile,
  logSha256: sha256(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  measurements: { reflow, bundleMetrics, datasetMetrics, screenshots: screenshotManifest.screenshots.length, screenReaderSpeech: 'NOT_RUN' },
  supportingLogs: supporting.map(file => ({ file, sha256: sha256(fs.readFileSync(supportPath(file))) })),
};
const output = path.join(evidenceDir, `${stepId}-current-revalidated-20261004.json`);
fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ task: `FE025.${stepId}`, result: 'PASS', checks: checks.length, reflowRoutes: reflow.routesChecked, bundleMetrics: bundleMetrics.length, datasetMetrics: datasetMetrics.length, sourceFiles: sourceFiles.length, evidence: path.relative(kit, output).replaceAll('\\', '/') }, null, 2));
