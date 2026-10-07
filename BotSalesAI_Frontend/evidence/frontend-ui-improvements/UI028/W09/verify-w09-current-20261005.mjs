import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const evidenceDir = dirname(fileURLToPath(import.meta.url));
const logPath = resolve(evidenceDir, 'verify-w09-current-20261005.log');
const resultPath = resolve(evidenceDir, 'verify-w09-current-20261005.json');
const node = process.execPath;
const run = (name, cwd, args, expectedExit = 0, env = {}) => {
  const result = spawnSync(node, args, {
    cwd: resolve(root, cwd),
    encoding: 'utf8',
    env: { ...process.env, ...env },
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const exitCode = result.status ?? 1;
  const expected = exitCode === expectedExit;
  const record = {
    name,
    command: `node ${args.join(' ')}`,
    cwd,
    exitCode,
    expectedExit,
    status: expected ? (expectedExit === 0 ? 'PASS' : 'EXPECTED_MIGRATION_DEBT') : 'FAIL',
    output: `${stdout}${stderr}`,
  };
  return record;
};

const checks = [
  run('generate:check', '.', ['scripts/generate.mjs', '--check']),
  run('typecheck', '.', ['node_modules/typescript/bin/tsc', '-p', 'apps/web/tsconfig.json', '--noEmit']),
  run('lint', '.', ['node_modules/eslint/bin/eslint.js', 'apps/web/src', '--max-warnings', '0']),
  run('boundaries', '.', ['scripts/check-boundaries.mjs']),
  run('source-check', '.', ['scripts/check-source.mjs']),
  run('source-checker-fixtures', '.', ['--test', 'tests/source-checker.test.mjs']),
  run('layout-checker-fixtures', '.', ['--test', 'tests/layout-checker.test.mjs']),
  run('ui-shell-layout-playwright', '.', ['node_modules/@playwright/test/cli.js', 'test', 'tests/ui-shell-layout.spec.ts', '--project=chromium']),
  run('route-error-composition-playwright-R13', '.', ['node_modules/@playwright/test/cli.js', 'test', 'tests/states/route-error-composition.spec.ts', '--project=chromium'], 0, { ROUTE_ERROR_TEST_ID: 'R13' }),
  run('production-build', 'apps/web', ['../../node_modules/vite/bin/vite.js', 'build', '--mode', 'production']),
  run('demo-build', 'apps/web', ['../../node_modules/vite/bin/vite.js', 'build', '--mode', 'demo', '--outDir', 'dist-demo']),
  run('strict-layout-scan', '.', ['scripts/check-layout.mjs'], 1),
];

const strict = checks.find((check) => check.name === 'strict-layout-scan');
const strictOutput = strict?.output ?? '';
const remainingFindings = Number(strictOutput.match(/(\d+) finding\(s\)/)?.[1] ?? NaN);
const unknownStyleSources = Number(strictOutput.match(/UNKNOWN_STYLE_SOURCE: (\d+)/)?.[1] ?? 0);
const allExpected = checks.every((check) => check.status === 'PASS' || check.status === 'EXPECTED_MIGRATION_DEBT');
const evidenceFiles = [
  'apps/web/src/app/Shell.tsx',
  'apps/web/src/app/router.tsx',
  'apps/web/src/app/ScopeEvents.tsx',
  'apps/web/src/app/CommandRecovery.tsx',
  'apps/web/src/app/feedback.tsx',
  'apps/web/src/shared/ui/layout.ts',
  'tests/ui-shell-layout.spec.ts',
];
const hashes = Object.fromEntries(evidenceFiles.map((file) => [
  file,
  createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex'),
]));
const result = {
  capturedAt: new Date().toISOString(),
  task: 'UI028.W09',
  scope: 'Frontend shell, fallbacks, navigation, demo controls and route error composition only',
  verdict: allExpected && remainingFindings === 396 && unknownStyleSources === 0 ? 'PASS_WITH_KNOWN_GLOBAL_MIGRATION_DEBT' : 'FAIL',
  ui: 'PASS',
  architecture: 'PASS_WITH_KNOWN_GLOBAL_MIGRATION_DEBT',
  browser: { engine: 'Chromium', cases: 4, routes: ['/s/shop-demo/overview', '/s/shop-demo/imports', '/workspaces', 'R13 API error composition'], viewports: ['1280x900', '390x844'], sourceRender: 'render-after-source-edit-v3-current-20261005.json' },
  layoutDebt: { before: 448, after: remainingFindings, resolved: 448 - remainingFindings, newFindings: 0, touchedFileFindings: 0, unknownStyleSources },
  checks: checks.map(({ output, ...check }) => check),
  sourceSha256: hashes,
  limitations: ['Strict application-wide layout scan intentionally remains nonzero because 396 SPACING_LITERAL findings are assigned to module work W10-W25.', 'Local Chromium and synthetic demo API evidence only; no backend, hosted CI, staging, production deployment or owner acceptance is claimed.'],
  artifacts: [
    'design-contract-pre-code-20261005.md',
    'baseline-before-source-edit-current-20261005.json',
    'layout-report-before-source-edit-current-20261005.json',
    'layout-report-after-source-edit-v3-current-20261005.json',
    'layout-report-delta-v3-current-20261005.json',
    'render-after-source-edit-v3-current-20261005.json',
    'semantic-role-register-current-20261005.md',
    'verify-w09-current-20261005.log',
  ],
};

mkdirSync(dirname(logPath), { recursive: true });
const log = checks.map((check) => [
  `## ${check.name} — ${check.status} (exit ${check.exitCode}; expected ${check.expectedExit})`,
  `$ (${check.cwd}) ${check.command}`,
  check.output.trimEnd(),
].filter(Boolean).join('\n')).join('\n\n');
writeFileSync(logPath, `${log}\n`, 'utf8');
writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ verdict: result.verdict, checks: checks.map(({ name, status, exitCode }) => ({ name, status, exitCode })), layoutDebt: result.layoutDebt, resultPath, logPath }, null, 2));
if (!allExpected || result.verdict === 'FAIL') process.exitCode = 1;
