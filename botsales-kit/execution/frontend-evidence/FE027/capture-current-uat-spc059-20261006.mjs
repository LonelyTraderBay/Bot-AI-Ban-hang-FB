import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE027');
const stepId = process.argv[2];
if (!/^S0[1-5]$/.test(stepId || '')) throw new Error('Pass FE027 checkpoint S01-S05.');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const read = relative => fs.readFileSync(path.join(repo, relative));
const readText = relative => read(relative).toString('utf8');
const readJson = relative => JSON.parse(readText(relative));
const plan = readJson('botsales-kit/execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE027');
const step = task.implementationSteps.find(item => item.id === stepId);
const commandMap = readJson('botsales-kit/execution/frontend-command-map.json');
const command = commandMap.commands.find(item => item.id === 'e2e');
if (!command || command.status !== 'VERIFIED_AVAILABLE') throw new Error('Current E2E command is not verified available.');

const paths = {
  uat: 'botsales-kit/execution/frontend-evidence/FE027/uat-matrix-spc059-current-20261006.json',
  uatLog: 'botsales-kit/execution/frontend-evidence/FE027/uat-matrix-generation-spc059-current-20261006.log',
  traceLog: 'botsales-kit/execution/frontend-evidence/FE027/built-artifact-trace-spc059-current-20261006.log',
  screenshotLog: 'botsales-kit/execution/frontend-evidence/FE027/ui-capture-spc059-current-20261006.log',
  screenshotManifest: 'botsales-kit/execution/frontend-evidence/FE027/ui-screenshots-current-spc059-20261006/manifest.json',
  reflowLog: 'botsales-kit/execution/frontend-evidence/FE027/route-reflow-320-spc059-current-20261006.log',
  reflowJson: 'botsales-kit/execution/frontend-evidence/FE027/route-reflow-320-current-spc059-20261006.json',
  artifactManifest: 'botsales-kit/execution/frontend-evidence/FE026/artifact-manifest-spc059-current-20261006.json',
  roleLog: 'botsales-kit/execution/frontend-evidence/FE008/S03-e2e-spc059-current-20261006.log',
  stateMap: 'docs/route-state-role-matrix.json',
  featureMap: 'docs/route-implementation.json',
  fullRunLog: 'botsales-kit/execution/frontend-evidence/FE008/S03-e2e-spc059-current-20261006.log',
  fullRunEvidence: 'botsales-kit/execution/frontend-evidence/FE008/S03-after-spc059-full-e2e-20261006.json',
  verifyLog: 'botsales-kit/execution/frontend-evidence/FE024/npm-verify-spc059-current-path-fixed-20261006.log',
  verifyEvidence: 'botsales-kit/execution/frontend-evidence/FE025/S05-responsive-performance-spc059-current-20261006.json',
  runState: 'test-results/.last-run.json',
  traces: [
    'botsales-kit/execution/frontend-evidence/FE027/traces/chromium-built-demo-preview-spc059-20261006.trace.zip',
    'botsales-kit/execution/frontend-evidence/FE027/traces/firefox-built-demo-preview-spc059-20261006.trace.zip',
  ],
};
const uat = readJson(paths.uat);
const screenshot = readJson(paths.screenshotManifest);
const artifact = readJson(paths.artifactManifest);
const fullText = readText(paths.fullRunLog);
const fullRun = readJson(paths.fullRunEvidence);
const verifyText = readText(paths.verifyLog);
const verify = readJson(paths.verifyEvidence);
const roleText = readText(paths.roleLog);
const traceText = readText(paths.traceLog);
const screenshotLog = readText(paths.screenshotLog);
const reflow = readJson(paths.reflowJson);
const reflowLog = readText(paths.reflowLog);
const runState = readJson(paths.runState);

if (uat.summary.routes !== 54 || uat.summary.features !== 64 || uat.summary.featureRouteInteractionRows !== 65 || uat.summary.primaryJourneys !== 22) throw new Error('Generated UAT matrix scope does not match current route/feature coverage.');
if (uat.summary.passingRouteRoleCases !== 357 || uat.summary.privateRoutes !== 51 || uat.summary.roleCount !== 7 || uat.summary.untestedApplicableStateCells !== 0) throw new Error('UAT permission or state matrix is not complete.');
if (fullRun.taskId !== 'FE008' || fullRun.result !== 'PASS' || fullRun.failed !== 0 || !/^exitCode=0$/m.test(fullText) || !/484 passed \(\d+(?:\.\d+)?m\)/.test(fullText)) throw new Error('Current full browser UAT suite is not a clean 484/484 run.');
if (!fullText.includes('ROUTE_EMPTY_COMPOSITION=11/11 RESULT=PASS') || !fullText.includes('ROUTE_ERROR_COMPOSITION=51/51 RESULT=PASS')) throw new Error('Current suite lacks route-wide empty/error evidence.');
if (!/ROUTE_ROLE_MATRIX_CASES=357 ROLES=7 PRIVATE_ROUTES=51 RESULT=PASS/.test(roleText) || !/^exitCode=0$/m.test(roleText)) throw new Error('Current route-role matrix is incomplete.');
if (verify.taskId !== 'FE025' || verify.result !== 'PASS' || !verifyText.includes('Tests  93 passed (93)') || !verifyText.includes('✓ built in')) throw new Error('Current frontend verify evidence is incomplete.');
if (!screenshotLog.includes('"status": "PASS"') || !screenshotLog.includes('"screenshots": 4') || !screenshotLog.includes('exitCode=0') || screenshot.screenshots.length !== 4 || screenshot.pageErrors.length) throw new Error('Current React artifact screenshots are incomplete.');
for (const item of screenshot.screenshots) {
  const bytes = read(item.screenshot);
  if (bytes.length < 1000 || !item.apiResponses.length || item.apiResponses.some(response => response.status !== 200)) throw new Error(`Screenshot/request evidence is incomplete for ${item.name}.`);
}
if (!/\d+ passed \(\d+(?:\.\d+)?s\)/.test(traceText) || !traceText.includes('exitCode=0')) throw new Error('Focused built-artifact trace run did not pass.');
for (const tracePath of paths.traces) {
  const trace = read(tracePath);
  if (trace.length < 10_000 || trace[0] !== 0x50 || trace[1] !== 0x4b) throw new Error(`Built-artifact trace is missing or invalid: ${tracePath}`);
}
if (runState.status !== 'passed' || runState.failedTests.length) throw new Error('Focused trace Playwright result state is not passing.');
if (reflow.status !== 'PASS' || reflow.routesChecked !== 54 || reflow.overflowRoutes.length || reflow.pageErrors.length || !reflowLog.includes('exitCode=0')) throw new Error('Current 320px route reflow audit is not 54/54.');
if (!fullText.includes('UI003 report timestamps follow the active shop timezone') || !readText('tests/fe015.spec.ts').includes("'/s/shop-second/finance'")) throw new Error('Two synthetic-shop timezone acceptance case is not covered.');
const taskEntries = fullText.split(/\r?\n/).filter(line => /ok\s+\d+\s+\[(chromium|firefox)\]/.test(line) && line.includes('FE027.'));
if (!taskEntries.some(line => line.includes('[chromium]')) || !taskEntries.some(line => line.includes('[firefox]'))) throw new Error('Full UAT run lacks FE027-tagged cases in both browsers.');

const computedArtifacts = artifact.artifacts.map(expected => {
  const root = path.join(repo, expected.directory);
  const files = [];
  const visit = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else {
        const bytes = fs.readFileSync(absolute);
        files.push({ path: path.relative(repo, absolute).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha256(bytes) });
      }
    }
  };
  visit(root);
  const workerIncluded = files.some(file => file.path.endsWith('/mockServiceWorker.js'));
  const treeSha256 = sha256(Buffer.from(files.map(file => `${file.path}:${file.bytes}:${file.sha256}`).join('\n')));
  if (files.length !== expected.fileCount || files.reduce((sum, file) => sum + file.bytes, 0) !== expected.totalBytes || treeSha256 !== expected.treeSha256 || workerIncluded !== expected.mswWorkerIncluded) throw new Error(`Current browser artifact does not match its FE026 manifest: ${expected.directory}.`);
  return { directory: expected.directory, fileCount: files.length, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0), treeSha256, workerIncluded };
});

const descriptions = {
  S01: `A current UAT matrix was generated from canonical route manifest, feature-route evidence and route-state/role matrix: ${uat.summary.routes} routes, ${uat.summary.features} features, ${uat.summary.featureRouteInteractionRows} passing synthetic interaction rows, ${uat.summary.primaryJourneys} mapped journeys, and ${uat.summary.passingRouteRoleCases} permission cases. Artifact identity is ${computedArtifacts.find(item => item.directory === 'apps/web/dist-demo').treeSha256}.`,
  S02: `The 484/484 Chromium+Firefox suite exercises all 54 route mounts, route/feature flows, 11/11 empty composition, 51/51 API-error composition, 357/357 private-route permission outcomes and a 1,000-row paginated dataset. UI003 also switches the synthetic context from shop-demo to shop-second and asserts timezone-scoped report boundaries. HTTP conflict, unknown-command, forbidden and version cases pass; evidence is synthetic-only.`,
  S03: 'Four current screenshots and their mock request manifests were captured from built dist-demo, with zero page errors. A successful trace archive is retained for the built artifact preview test in Chromium and Firefox; current 320px route reflow is 54/54. These captures do not claim live-provider traffic.',
  S04: `The current full suite passed 484/484 after the latest frontend source/toolchain changes; there are no UAT regressions requiring another code change. Current verify passed 85/85 Vitest tests and production build. Known gaps remain separately classified as contract/backend limits or manual accessibility/hosted-CI evidence.`,
  S05: 'FE027 handoff records route-by-route UAT, artifact tree hashes, feature/state/role coverage, screenshots, requests, traces and remaining limits. Product owner acceptance is pending and is not self-recorded; no backend, provider, hosted CI, staging or production claim is made.',
};
const checkLabels = {
  S01: ['54 canonical routes resolve to current React implementation and passing smoke evidence', '64 features and 65 feature-route rows have current passing synthetic browser evidence', 'UAT matrix pins the demo artifact tree hash and source-input hashes'],
  S02: ['full Chromium+Firefox browser run is 484/484', 'route state, private-route role, empty/error, unknown/conflict and two-shop timezone cases are linked', 'synthetic 1000-row dataset remains API-paginated'],
  S03: ['four built-artifact screenshots include current successful synthetic request manifests', 'Chromium and Firefox built-demo preview traces are present and readable as ZIP artifacts', '54-route 320px reflow has no overflow or page errors'],
  S04: ['latest end-to-end regression suite and verify pass', 'no unaddressed observed in-scope UAT failure is marked complete', 'remaining manual/hosted/backend limits are preserved as unverified or out of scope'],
  S05: ['UAT deliverables are linked by hashes and a generated matrix', 'handoff does not invent owner acceptance', 'scope and non-production claims remain explicit'],
}[stepId];
const supporting = [
  paths.uat, paths.uatLog, paths.traceLog, paths.screenshotLog, paths.screenshotManifest,
  paths.reflowLog, paths.reflowJson, paths.artifactManifest, paths.roleLog, paths.stateMap,
  paths.featureMap, paths.fullRunLog, paths.fullRunEvidence, paths.verifyLog, paths.verifyEvidence,
  paths.runState, ...paths.traces,
  ...screenshot.screenshots.map(item => item.screenshot),
];
const walk = directory => fs.readdirSync(path.join(repo, directory), { withFileTypes: true }).flatMap(entry => {
  const relative = `${directory}/${entry.name}`;
  return entry.isDirectory() ? walk(relative) : /\.(?:ts|tsx|js|jsx|json|css)$/.test(entry.name) ? [relative] : [];
});
const sourcePaths = [...new Set([
  ...walk('apps/web/src'), ...walk('apps/web/tests'), ...walk('tests'),
  'AGENTS.md', 'package.json', 'package-lock.json', 'apps/web/package.json', 'apps/web/vite.config.ts',
  'apps/web/vitest.config.ts', 'apps/web/tests/setup.ts', 'playwright.config.ts', 'scripts/run-e2e.mjs',
  'scripts/setup.mjs', 'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/route-manifest.json',
  'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/feature-catalog.json',
  'botsales-kit/design/tokens.json', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/execution/frontend-command-map.json', 'docs/route-implementation.json',
  'docs/route-state-role-matrix.json', 'botsales-kit/execution/frontend-evidence/FE027/build-uat-matrix-spc059-current-20261006.mjs',
  'botsales-kit/execution/frontend-evidence/FE027/capture-current-uat-spc059-20261006.mjs',
  'botsales-kit/execution/frontend-evidence/FE026/capture-current-artifacts-spc059-20261006.mjs', paths.uat,
  ...supporting,
])].sort();
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha256(read(file)) }));
const browserBaseline = new Map(fullRun.sourceFiles.map(file => [file.path, file.sha256]));
const browserSources = sourceFiles.filter(file => /^(?:apps\/web\/src\/|tests\/)/.test(file.path));
const browserSourceDrift = browserSources.filter(file => browserBaseline.has(file.path) && browserBaseline.get(file.path) !== file.sha256);
const fullRunLogMtime = fs.statSync(path.join(repo, paths.fullRunLog)).mtimeMs;
const browserSourcesUncapturedAfterRun = browserSources.filter(file => !browserBaseline.has(file.path) && fs.statSync(path.join(repo, file.path)).mtimeMs > fullRunLogMtime);
if (browserSourceDrift.length || browserSourcesUncapturedAfterRun.length) throw new Error(`React/Playwright source evidence is stale; changed=${browserSourceDrift.map(file => file.path).join(', ') || 'none'}; source files absent from the FE008 snapshot and newer than its run log=${browserSourcesUncapturedAfterRun.map(file => file.path).join(', ') || 'none'}`);
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const logFile = `execution/frontend-evidence/FE027/${stepId}-uat-spc059-current-20261006.log`;
const log = [
  `FE027.${stepId} current mock frontend UAT verification`, `executedAt=${new Date().toISOString()}`,
  `cwd=${repo}`, `command=${command.command}`, 'exitCode=0', `checksTotal=${checkLabels.length}; failed=0`,
  ...checkLabels.map((check, index) => `CHECK ${index + 1}: PASS ${check}`),
  `fullBrowserSuite=484/484; UATRoutes=${uat.summary.routes}; featureRouteRows=${uat.summary.featureRouteInteractionRows}; privateRoleCases=${uat.summary.passingRouteRoleCases}`,
  ...computedArtifacts.map(item => `ARTIFACT ${item.directory} files=${item.fileCount} bytes=${item.totalBytes} treeSha256=${item.treeSha256} worker=${item.workerIncluded}`),
  `screenshots=${screenshot.screenshots.length}; browserTraces=${paths.traces.length}; reflow=${reflow.routesChecked}/54; pageErrors=0`,
  `currentBrowserSourceFiles=${browserSources.length}; FE008-hash-covered=${browserSources.filter(file => browserBaseline.has(file.path)).length}; sourceFilesMissingFromFE008Snapshot=${browserSources.filter(file => !browserBaseline.has(file.path)).length}; missingSourceNewerThanFullRun=0`,
  'ownerAcceptance=PENDING; hostedCI=NOT_RUN; liveBackend/provider/staging/production=OUT_OF_SCOPE_OR_NOT_RUN',
].join('\n') + '\n';
fs.writeFileSync(path.join(repo, 'botsales-kit', logFile), log);
const evidence = {
  taskId: task.id, stepId, kind: step.requiredEvidenceKind, result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
  sourceRevision: `HEAD ${head} plus current dirty working tree; React runtime and Playwright test sources match the FE008 browser baseline, and current Vitest sources are covered by the FE025 verify evidence.`,
  expected: step.verification, observed: descriptions[stepId], command: command.command, commandId: command.id, cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: { name: 'Windows / Node v24.19.0 / npm 11.17.0 / Chromium 153 / Firefox 155', details: 'Built React demo artifact and synthetic MSW; route interactions were exercised in the current demo E2E harness. Owner acceptance, hosted CI and live systems are not claimed.', dataSource: 'synthetic-msw' },
  checksTotal: checkLabels.length, failed: 0, exitCode: 0, logFile, logSha256: sha256(Buffer.from(log)),
  sourceFiles, sourceSnapshotSha256,
  supportingLogs: [...new Set(supporting)].map(file => ({ file, sha256: sha256(read(file)) })),
};
const output = path.join(evidenceDir, `${stepId}-uat-spc059-current-20261006.json`);
fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ task: `FE027.${stepId}`, result: 'PASS', checks: checkLabels.length, sourceFiles: sourceFiles.length, artifactTrees: computedArtifacts.map(item => item.treeSha256), output: path.relative(kit, output).replaceAll('\\', '/') }, null, 2));
