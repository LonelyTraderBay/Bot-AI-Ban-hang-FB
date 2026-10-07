import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const dir = 'botsales-kit/execution/frontend-evidence/FE003';
const helper = `${dir}/capture-s03-after-fi011-fix-20261006.mjs`;
const unitLog = `${dir}/S03-unit-current-spc059-20261006.log`;
const e2eLog = 'botsales-kit/execution/frontend-evidence/FE008/S03-e2e-spc059-current-20261006.log';
const evidencePath = `${dir}/S03-after-fi011-fix-20261006.json`;
const logPath = `${dir}/S03-after-fi011-fix-20261006.log`;
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
const spacing = read('docs/FRONTEND_SPACING_STANDARD.md');
const ux = read('UX-CONTRACT.md');
const designNotes = read('DESIGN.md');
const codingStandards = read('botsales-kit/docs/18_CODING_STANDARDS.md');
const uiPlan = read('docs/FRONTEND_UI_IMPROVEMENT_PLAN.md');
const context = read('docs/PROJECT_CONTEXT.md');
const continuation = read('docs/CONTINUE_FRONTEND.md');
const unit = read(unitLog);
const e2e = read(e2eLog);

assert(packageJson.scripts.test === 'vitest run --config apps/web/vitest.config.ts', 'Root unit script changed unexpectedly');
assert(webPackage.devDependencies.vitest === '5.0.3', 'Vitest version declaration changed');
assert(/environment:\s*'jsdom'/.test(vitest) && /include:\s*\['apps\/web\/tests\/\*\*\/\*\.test/.test(vitest), 'Vitest config does not load expected React tests');
assert(vitest.includes("setupFiles:['apps/web/tests/setup.ts']") && setup.includes('@testing-library/jest-dom/vitest'), 'RTL setup is not wired');
assert(unit.includes('Test Files  10 passed (10)') && unit.includes('Tests  93 passed (93)') && /^exitCode=0$/m.test(unit), 'Fresh Vitest run did not pass 93/93');
assert(/projects:\s*\[/.test(playwright) && playwright.includes("devices['Desktop Chrome']") && playwright.includes("devices['Desktop Firefox']"), 'Chromium and Firefox projects are not configured');
assert(playwright.includes('--mode demo') && playwright.includes('reuseExistingServer: !process.env.CI'), 'Playwright demo server configuration changed');
assert(e2e.includes('484 passed (43.4m)') && /^exitCode=0$/m.test(e2e), 'Fresh browser E2E run did not finish 484/484');
assert((e2e.match(/ROUTE_ERROR_COMPOSITION=51\/51 RESULT=PASS/g) ?? []).length === 2, 'Both Chromium and Firefox route-error composition batches must pass 51/51');
assert(axe.includes('@axe-core/playwright'), 'axe browser suite is not wired');
assert(/SPC-059[\s\S]*no-op[\s\S]*FRONTEND_ONLY_GAP/i.test(spacing) && /SPC-059/.test(ux) && /SPC-059/.test(designNotes) && /SPC-059/.test(uiPlan) && /SPC-059/.test(context) && /SPC-059/.test(continuation) && /CODE-032/.test(codingStandards), 'SPC-059/CODE-032 is not synchronized in contributor guidance');

const walk = relative => fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap(entry => {
  const child = `${relative}/${entry.name}`.replaceAll('\\', '/');
  return entry.isDirectory() ? walk(child) : [child];
});
const testSources = [
  ...walk('apps/web/tests').filter(file => /\.test\.(ts|tsx)$/.test(file)),
  ...walk('tests').filter(file => /\.(spec\.(ts|tsx)|test\.mjs)$/.test(file)),
];
const sourcePaths = [...new Set([
  'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/FRONTEND_SPACING_STANDARD.md', 'DESIGN.md', 'UX-CONTRACT.md', 'botsales-kit/docs/18_CODING_STANDARDS.md', 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', 'docs/PROJECT_CONTEXT.md', 'docs/CONTINUE_FRONTEND.md',
  'package.json', 'package-lock.json', 'apps/web/package.json', 'apps/web/vitest.config.ts', 'apps/web/tests/setup.ts',
  'playwright.config.ts', 'scripts/run-e2e.mjs', 'tests/accessibility/routes.spec.ts', ...testSources,
  unitLog, e2eLog, helper,
])].sort();
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const executedAt = new Date().toISOString();
const reviewer = 'Codex self-review; no independent peer review claimed';
const observed = 'Fresh local Vitest passed 93/93 tests across 10 files. The full built-demo Playwright suite executed 484/484 tests across Chromium and Firefox and exited 0; route-error composition passed 51/51 in each browser. This confirms local React frontend behavior against synthetic MSW only, not live backend, hosted CI, screen-reader conformance, or owner acceptance.';
const checks = [
  { label: 'Vitest config and run', observed: 'jsdom and RTL setup are wired; direct npm test completed with 93/93 passing tests in 10 files.' },
  { label: 'Playwright full execution', observed: 'Local built-demo Playwright execution passed all 484 tests across Chromium and Firefox; exit code 0.' },
  { label: 'Route error composition', observed: 'All 51 shop routes composed the shared API error state in both Chromium and Firefox.' },
  { label: 'axe test wiring', observed: 'Whole-page browser tests import @axe-core/playwright; this does not claim screen-reader or full manual conformance.' },
  { label: 'SPC-059/CODE-032 policy wiring', observed: 'Honest-action, state, and truthful-outcome rules are present in canonical spacing guidance and synced contributor docs.' },
  { label: 'scope and provenance', observed: 'Local frontend with synthetic MSW fixtures; no live API, backend, provider, hosted CI, or owner acceptance claimed.' },
];
const command = `npm.cmd --script-shell=cmd.exe test; npm.cmd --script-shell=cmd.exe run test:e2e`;
const log = [
  'FE003.S03 runner/config revalidation after FE011 source-map expected-schema correction.', `executedAt=${executedAt}`, `cwd=${root}`,
  `UNIT_COMMAND=${command.split('; ')[0]}`, `UNIT_LOG=${unitLog}; sha256=${sha(bytes(unitLog))}`,
  `E2E_COMMAND=${command.split('; ')[1]}; full local built-demo suite`, `E2E_LOG=${e2eLog}; sha256=${sha(bytes(e2eLog))}`,
  'unit=93/93 tests in 10 files; playwrightExecuted=484/484 tests in 53 files across Chromium/Firefox; routeErrorComposition=51/51 per browser; exitCode=0',
  `checksTotal=${checks.length}; failed=0`, ...checks.flatMap(check => [`CHECK ${check.label}: PASS`, check.observed]),
  'SCOPE=FRONTEND_WITH_SYNTHETIC_MOCK_API; local React/browser execution only.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`), `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(path.join(root, logPath), log, 'utf8');
const evidence = {
  taskId: 'FE003', stepId: 'S03', kind: 'artifact_review', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} plus current frontend working tree`,
  expected: 'Vitest/RTL/MSW/Playwright/axe config loads; capture current unit baseline and execute the browser suite without disabling failures.', observed,
  command, cwd: root, reviewer,
  environment: { name: `Windows / Node ${process.versions.node} / local frontend test toolchain`, details: 'Vitest and built-demo Playwright ran locally using deterministic in-memory synthetic fixtures. No remote services were used.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, logFile: logPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  unit: { exitCode: 0, filesPassed: 10, testsPassed: 93 },
  playwright: { exitCode: 0, testsPassed: 484, files: 53, projects: ['chromium', 'firefox'], executedBrowserTests: true, routeErrorCompositionPerProject: '51/51' },
};
fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', unit: '93/93', playwright: '484/484', routeErrorCompositionPerProject: '51/51', sourceFiles: sourceFiles.length, evidence: evidencePath, log: logPath }, null, 2));
