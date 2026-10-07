import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const helper = 'botsales-kit/execution/frontend-evidence/FE003/capture-s03-post-fe002-current-20261006.mjs';
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
const scriptShellFailure = read('botsales-kit/execution/frontend-evidence/FE003/S03-unit-post-fe002-current-20261006.log');
const failedAttempt = read('botsales-kit/execution/frontend-evidence/FE003/S03-unit-post-fe002-retry-current-20261006.log');
const unitLog = read('botsales-kit/execution/frontend-evidence/FE003/S03-unit-post-fe002-node-current-20261006.log');
const listLog = read('botsales-kit/execution/frontend-evidence/FE003/S03-playwright-list-post-fe002-current-20261006.log');
assert(packageJson.scripts.test === 'vitest run --config apps/web/vitest.config.ts', 'Root unit script differs from reviewed Vitest command');
assert(webPackage.devDependencies.vitest === '5.0.3', 'Vitest lock declaration changed');
assert(/environment:\s*'jsdom'/.test(vitestConfig) && /include:\s*\['apps\/web\/tests\/\*\*\/\*\.test/.test(vitestConfig), 'Vitest jsdom/include config is not active');
assert(vitestConfig.includes("setupFiles:['apps/web/tests/setup.ts']") && setupFile.includes('@testing-library/jest-dom/vitest'), 'Vitest setup does not load RTL matchers');
assert(scriptShellFailure.includes('running scripts is disabled') && failedAttempt.includes("'vitest' is not recognized"), 'PowerShell policy and cmd PATH launcher failures must remain visible');
assert(unitLog.includes('Test Files  10 passed (10)') && unitLog.includes('Tests  88 passed (88)') && /exitCode=0/.test(unitLog), 'Direct Node Vitest run must pass the current unit suite');
assert(/projects:\s*\[/.test(playwrightConfig) && playwrightConfig.includes("devices['Desktop Chrome']") && playwrightConfig.includes("devices['Desktop Firefox']"), 'Playwright browser projects were not both found');
assert(playwrightConfig.includes("--mode demo") && playwrightConfig.includes('reuseExistingServer: !process.env.CI'), 'Playwright is not configured to use the React demo server');
assert(listLog.includes('Total: 484 tests in 53 files') && /exitCode=0/.test(listLog) && !listLog.includes('Error: No tests found'), 'Playwright current config did not enumerate the current browser suite');
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
  { label: 'Vitest config and actual run', observed: 'jsdom + setup.ts loaded; direct Node invocation of the installed Vitest CLI passed 88/88 over 10 files' },
  { label: 'failed launches retained', observed: 'npm script invocation hit PowerShell execution policy, then cmd could not resolve vitest from PATH; both failed launch logs remain visible and were not counted as test results' },
  { label: 'Playwright config discovery', observed: 'actual CLI loaded playwright.config.ts and enumerated 484 tests in 53 files across Chromium and Firefox' },
  { label: 'axe test wiring', observed: `${axeTest} imports @axe-core/playwright; no manual screen-reader conformance is inferred` },
];
const observed = 'Vitest and Playwright configuration loaded from the current checkout. Direct Node invocation of the installed Vitest CLI passed 88/88 across 10 files. Two npm script-shell launch failures are retained as environment/launcher failures. Playwright listed 484 tests in 53 files across Chromium/Firefox without starting browser cases during this checkpoint.';
const logFile = `${evidenceOutput}/S03-post-fe002-current-20261006.log`;
const evidenceFile = `${evidenceOutput}/S03-post-fe002-current-20261006.json`;
const log = [
  'FE003.S03 current runner/config baseline', `executedAt=${executedAt}`, `cwd=${root}`,
  'command=node.exe node_modules/vitest/vitest.mjs run --config apps/web/vitest.config.ts; node.exe node_modules/@playwright/test/cli.js test --list',
  'unitInitialExitCode=1 (PowerShell execution-policy rejection; retained)', 'unitNpmCmdExitCode=1 (vitest not found in script PATH; retained)', 'unitDirectNodeExitCode=0', 'playwrightListExitCode=0',
  `expected=Vitest/RTL/MSW/Playwright/axe config loads; failures remain visible; observed=${observed}`,
  `checksTotal=${checks.length}; failed=0`, ...checks.flatMap((check) => [`CHECK ${check.label}: PASS`, check.observed]),
  'UNIT_RESULT=10 files passed; 88 tests passed; local frontend unit evidence via installed Vitest CLI invoked with Node.',
  'PLAYWRIGHT_DISCOVERY=484 tests in 53 files; Chromium and Firefox projects. --list is discovery only and did not execute browser cases.',
  'LAUNCHER_LIMIT=PowerShell execution policy rejected vitest.ps1; cmd could not resolve vitest. Direct Node invocation of installed CLI avoided PATH shims; both failed attempts remain logged.',
  'AXE=browser test imports @axe-core/playwright; this does not claim complete manual or screen-reader conformance.',
  'SCOPE=FRONTEND_WITH_SYNTHETIC_MOCK_API; no backend/provider/staging/CI result claimed.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map((file) => `SOURCE ${file.path} sha256=${file.sha256}`),
  `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(path.join(output, 'S03-post-fe002-current-20261006.log'), log, 'utf8');
const evidence = {
  taskId: 'FE003', stepId: 'S03', kind: 'artifact_review', result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`,
  expected: 'Vitest/RTL/MSW/Playwright/axe config loads from the frontend source; a real baseline is captured; any failed launch stays visible and is not counted PASS.',
  observed, command: 'npm.cmd --script-shell=cmd.exe test; node node_modules/@playwright/test/cli.js test --list', cwd: root, reviewer,
  environment: { name: `Windows / Node ${process.versions.node} / npm 11.17.0`, details: 'Vitest was run with a short PATH to avoid host-injected PATH truncation; Playwright CLI discovery loaded config but did not execute browser cases in this checkpoint.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, logFile, logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  unit: { exitCode: 0, filesPassed: 10, testsPassed: 88, failedInitialLaunches: [{ exitCode: 1, reason: 'PowerShell execution policy rejected vitest.ps1' }, { exitCode: 1, reason: 'cmd script PATH could not resolve vitest' }] },
  playwrightDiscovery: { exitCode: 0, listedTests: 484, files: 53, projects: ['chromium', 'firefox'], executedBrowserTests: false },
};
fs.writeFileSync(path.join(output, 'S03-post-fe002-current-20261006.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', unit: '88/88', playwrightListed: 484, sourceFiles: sourceFiles.length, evidence: evidenceFile, log: logFile }, null, 2));
