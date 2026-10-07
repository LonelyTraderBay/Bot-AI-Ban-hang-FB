import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const dir = 'botsales-kit/execution/frontend-evidence/FE003';
const helper = `${dir}/capture-s03-post-api-contract-revalidation-20261006.mjs`;
const unitLog = `${dir}/S03-unit-revalidation-post-api-contract-20261006.log`;
const listLog = `${dir}/S03-playwright-list-revalidation-post-api-contract-20261006.log`;
const evidencePath = `${dir}/S03-post-api-contract-revalidation-20261006.json`;
const logPath = `${dir}/S03-post-api-contract-revalidation-20261006.log`;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => bytes(file).toString('utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(root.endsWith('BotSalesAI_Frontend'), `Unexpected cwd: ${root}`);

const packageJson = JSON.parse(read('package.json'));
const webPackage = JSON.parse(read('apps/web/package.json'));
const vitest = read('apps/web/vitest.config.ts');
const setup = read('apps/web/tests/setup.ts');
const playwright = read('playwright.config.ts');
const axe = read('tests/accessibility/routes.spec.ts');
const units = read(unitLog);
const listed = read(listLog);
assert(packageJson.scripts.test === 'vitest run --config apps/web/vitest.config.ts', 'Root unit script changed unexpectedly');
assert(webPackage.devDependencies.vitest === '5.0.3', 'Vitest version declaration changed');
assert(/environment:\s*'jsdom'/.test(vitest) && /include:\s*\['apps\/web\/tests\/\*\*\/\*\.test/.test(vitest), 'Vitest config is not loading expected React test suite');
assert(vitest.includes("setupFiles:['apps/web/tests/setup.ts']") && setup.includes('@testing-library/jest-dom/vitest'), 'RTL setup is not wired');
assert(units.includes('Test Files  10 passed (10)') && units.includes('Tests  91 passed (91)') && /^exitCode=0$/m.test(units), 'Current Vitest run did not pass 91/91');
assert(/projects:\s*\[/.test(playwright) && playwright.includes("devices['Desktop Chrome']") && playwright.includes("devices['Desktop Firefox']"), 'Both browser projects are not configured');
assert(playwright.includes('--mode demo') && playwright.includes('reuseExistingServer: !process.env.CI'), 'Playwright demo server config changed');
assert(listed.includes('Total: 484 tests in 53 files') && /^exitCode=0$/m.test(listed) && !listed.includes('Error: No tests found'), 'Playwright listing did not load current browser suite');
assert(axe.includes('@axe-core/playwright'), 'axe browser suite is not wired');

const walk = relative => fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap(entry => {
  const child = `${relative}/${entry.name}`.replaceAll('\\', '/');
  return entry.isDirectory() ? walk(child) : [child];
});
const testSources = [
  ...walk('apps/web/tests').filter(file => /\.test\.(ts|tsx)$/.test(file)),
  ...walk('tests').filter(file => /\.(spec\.(ts|tsx)|test\.mjs)$/.test(file)),
];
const sourcePaths = [...new Set([
  'package.json', 'package-lock.json', 'apps/web/package.json', 'apps/web/vitest.config.ts', 'apps/web/tests/setup.ts',
  'playwright.config.ts', 'scripts/run-e2e.mjs', 'tests/accessibility/routes.spec.ts', ...testSources,
  unitLog, listLog, helper,
])].sort();
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const executedAt = new Date().toISOString();
const reviewer = 'Codex self-review; no independent peer review claimed';
const checks = [
  { label: 'Vitest config and run', observed: 'jsdom + setup.ts loaded; direct Node invocation of installed Vitest CLI passed 91/91 tests across 10 files.' },
  { label: 'Playwright config discovery', observed: 'Playwright CLI loaded current config and listed 484 tests in 53 files for Chromium and Firefox. --list does not execute browser tests.' },
  { label: 'axe test wiring', observed: 'The whole-page browser test imports @axe-core/playwright; this does not claim screen-reader or complete manual conformance.' },
  { label: 'scope and source provenance', observed: 'Frontend source/test configuration only; local synthetic demo configuration, no backend/provider/staging/hosted CI result.' },
];
const observed = 'Current Vitest and Playwright configuration loaded from this checkout. Direct Node invocation passed 91/91 unit tests over 10 files. Playwright --list discovered 484 tests across 53 files for Chromium/Firefox; browser cases were not executed in this checkpoint.';
const log = [
  'FE003.S03 runner/config revalidation after API contract parameter validation', `executedAt=${executedAt}`, `cwd=${root}`,
  'UNIT_COMMAND=node.exe node_modules/vitest/vitest.mjs run --config apps/web/vitest.config.ts', `UNIT_LOG=${unitLog}; sha256=${sha(bytes(unitLog))}`,
  'PLAYWRIGHT_COMMAND=node.exe node_modules/@playwright/test/cli.js test --list', `PLAYWRIGHT_LOG=${listLog}; sha256=${sha(bytes(listLog))}`,
  `unit=91/91 tests in 10 files; playwrightDiscovery=484 tests/53 files; executedBrowserTests=false`,
  `checksTotal=${checks.length}; failed=0`, ...checks.flatMap(check => [`CHECK ${check.label}: PASS`, check.observed]),
  'SCOPE=FRONTEND_WITH_SYNTHETIC_MOCK_API; local configuration and test discovery only.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`), `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(path.join(root, logPath), log, 'utf8');
const evidence = {
  taskId: 'FE003', stepId: 'S03', kind: 'artifact_review', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} plus current frontend working tree`,
  expected: 'Vitest/RTL/MSW/Playwright/axe config loads; capture current unit baseline and browser test discovery without treating discovery as executed tests.', observed,
  command: 'node.exe node_modules/vitest/vitest.mjs run --config apps/web/vitest.config.ts; node.exe node_modules/@playwright/test/cli.js test --list', cwd: root, reviewer,
  environment: { name: `Windows / Node ${process.versions.node} / local frontend test toolchain`, details: 'Vitest ran locally; Playwright --list loaded config and enumerated browser cases only. MSW is test/demo fixture infrastructure; no server integration claimed.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, logFile: logPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  unit: { exitCode: 0, filesPassed: 10, testsPassed: 91 },
  playwrightDiscovery: { exitCode: 0, listedTests: 484, files: 53, projects: ['chromium', 'firefox'], executedBrowserTests: false },
};
fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', unit: '91/91', playwrightListed: 484, sourceFiles: sourceFiles.length, evidence: evidencePath, log: logPath }, null, 2));
