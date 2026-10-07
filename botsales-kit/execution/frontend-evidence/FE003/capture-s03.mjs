import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const helper = 'botsales-kit/execution/frontend-evidence/FE003/capture-s03.mjs';
const output = path.join(root, 'botsales-kit/execution/frontend-evidence/FE003');
const evidenceOutput = 'execution/frontend-evidence/FE003';
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(root.endsWith('BotSalesAI_Frontend'), `Unexpected cwd: ${root}`);
const packageJson = JSON.parse(read('package.json'));
const webPackage = JSON.parse(read('apps/web/package.json'));
const vitestConfig = read('apps/web/vitest.config.ts');
const setupFile = read('apps/web/tests/setup.ts');
const playwrightConfig = read('playwright.config.ts');
const failedAttempt = read('botsales-kit/execution/frontend-evidence/FE003/S03-unit-current-20261004.log');
const unitLog = read('botsales-kit/execution/frontend-evidence/FE003/S03-unit-current-20261004-retry.log');
const listLog = read('botsales-kit/execution/frontend-evidence/FE003/S03-playwright-list-current-20261004.log');
assert(packageJson.scripts.test === 'vitest run --config apps/web/vitest.config.ts', 'Root unit script differs from reviewed Vitest command');
assert(webPackage.devDependencies.vitest === '5.0.3', 'Vitest lock declaration changed');
assert(/environment:\s*'jsdom'/.test(vitestConfig) && /include:\s*\['apps\/web\/tests\/\*\*\/\*\.test/.test(vitestConfig), 'Vitest jsdom/include config is not active');
assert(vitestConfig.includes("setupFiles:['apps/web/tests/setup.ts']") && setupFile.includes('@testing-library/jest-dom/vitest'), 'Vitest setup does not load RTL matchers');
assert(failedAttempt.includes("'vitest' is not recognized") && unitLog.includes('Test Files  10 passed (10)') && unitLog.includes('Tests  85 passed (85)'), 'Both the initial PATH failure and successful sanitized-PATH unit rerun must be preserved');
assert(/projects:\s*\[/.test(playwrightConfig) && playwrightConfig.includes("devices['Desktop Chrome']") && playwrightConfig.includes("devices['Desktop Firefox']"), 'Playwright browser projects were not both found');
assert(playwrightConfig.includes("--mode demo") && playwrightConfig.includes('reuseExistingServer: !process.env.CI'), 'Playwright is not configured to use the React demo server');
assert(listLog.includes('Total: 388 tests in 33 files') && !listLog.includes('Error: No tests found'), 'Playwright current config did not enumerate the expected browser suite');
const axeTest = 'tests/accessibility/routes.spec.ts';
assert(read(axeTest).includes("@axe-core/playwright"), 'Whole-page axe test does not import the configured browser audit');

const walk = (relative) => fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap((entry) => {
  const child = path.join(relative, entry.name).replaceAll('\\', '/');
  return entry.isDirectory() ? walk(child) : [child];
});
const testSources = [
  ...walk('apps/web/tests').filter((file) => /\.test\.(ts|tsx)$/.test(file)),
  ...walk('tests').filter((file) => /\.(spec\.(ts|tsx)|test\.mjs)$/.test(file)),
];
const sourcePaths = [
  'package.json', 'package-lock.json', 'apps/web/package.json', 'apps/web/vitest.config.ts', 'apps/web/tests/setup.ts',
  'playwright.config.ts', 'scripts/run-e2e.mjs', axeTest, ...testSources, helper,
].filter((file, index, files) => files.indexOf(file) === index);
const sourceFiles = sourcePaths.map((file) => ({ path: file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map((file) => `${file.path}:${file.sha256}`).sort().join('\n')));
const reviewer = 'Codex self-review; no independent peer review claimed';
const executedAt = new Date().toISOString();
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const checks = [
  { label: 'Vitest config and actual run', observed: 'jsdom + setup.ts loaded; sanitized Windows PATH run passed 85/85 over 10 files' },
  { label: 'failed launch retained', observed: 'initial npm test in host-injected PATH failed to resolve vitest; no result was counted from that attempt' },
  { label: 'Playwright config discovery', observed: 'actual CLI loaded playwright.config.ts and enumerated 388 tests in 33 files across Chromium and Firefox' },
  { label: 'axe test wiring', observed: `${axeTest} imports @axe-core/playwright; no manual screen-reader conformance is inferred` },
];
const observed = 'Vitest and Playwright configuration loaded from the current checkout. Unit baseline passed 85/85 on retry after trimming the unusually long injected host PATH; the initial failed launch is preserved. Playwright listed 388 tests in 33 files across Chromium/Firefox without starting the browser suite during this checkpoint.';
const logFile = `${evidenceOutput}/S03-current-runner-baseline-20261004.log`;
const evidenceFile = `${evidenceOutput}/S03-current-runner-baseline-20261004.json`;
const log = [
  'FE003.S03 current runner/config baseline', `executedAt=${executedAt}`, `cwd=${root}`,
  'command=npm.cmd --script-shell=cmd.exe test (first attempt), then same command with a bounded explicit PATH; node node_modules/@playwright/test/cli.js test --list',
  'unitInitialExitCode=1 (host PATH lookup failure; retained separately)', 'unitRetryExitCode=0', 'playwrightListExitCode=0',
  `expected=Vitest/RTL/MSW/Playwright/axe config loads; failures remain visible; observed=${observed}`,
  `checksTotal=${checks.length}; failed=0`, ...checks.flatMap((check) => [`CHECK ${check.label}: PASS`, check.observed]),
  'UNIT_RESULT=10 files passed; 85 tests passed; 7.36 seconds. This is local frontend unit evidence.',
  'PLAYWRIGHT_DISCOVERY=388 tests in 33 files; Chromium and Firefox projects. --list is discovery only and did not execute browser cases.',
  'FIRST_ATTEMPT=vitest not found due the oversized host-injected PATH; resolved for this run with a bounded PATH. The original failed log remains available.',
  'AXE=browser test imports @axe-core/playwright; this does not claim complete manual or screen-reader conformance.',
  'SCOPE=FRONTEND_WITH_SYNTHETIC_MOCK_API; no backend/provider/staging/CI result claimed.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map((file) => `SOURCE ${file.path} sha256=${file.sha256}`),
  `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(path.join(output, 'S03-current-runner-baseline-20261004.log'), log, 'utf8');
const evidence = {
  taskId: 'FE003', stepId: 'S03', kind: 'artifact_review', result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`,
  expected: 'Vitest/RTL/MSW/Playwright/axe config loads from the frontend source; a real baseline is captured; any failed launch stays visible and is not counted PASS.',
  observed, command: 'npm.cmd --script-shell=cmd.exe test; node node_modules/@playwright/test/cli.js test --list', cwd: root, reviewer,
  environment: { name: `Windows / Node ${process.versions.node} / npm 11.17.0`, details: 'Vitest was run with a short PATH to avoid host-injected PATH truncation; Playwright CLI discovery loaded config but did not execute browser cases in this checkpoint.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, logFile, logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  unit: { exitCode: 0, filesPassed: 10, testsPassed: 85, durationSeconds: 7.36, failedInitialLaunch: { exitCode: 1, reason: 'vitest command not found in oversized injected PATH' } },
  playwrightDiscovery: { exitCode: 0, listedTests: 388, files: 33, projects: ['chromium', 'firefox'], executedBrowserTests: false },
};
fs.writeFileSync(path.join(output, 'S03-current-runner-baseline-20261004.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', unit: '85/85', playwrightListed: 388, sourceFiles: sourceFiles.length, evidence: evidenceFile, log: logFile }, null, 2));
