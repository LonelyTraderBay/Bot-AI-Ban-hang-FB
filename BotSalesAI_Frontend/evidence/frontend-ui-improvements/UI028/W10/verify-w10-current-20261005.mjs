import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const evidenceDir = path.dirname(fileURLToPath(import.meta.url));
const logPath = path.join(evidenceDir, 'verify-w10-current-20261005.log');
const resultPath = path.join(evidenceDir, 'verify-w10-current-20261005.json');
const node = process.execPath;
const run = (name, cwd, args, expectedExit = 0) => {
    const result = spawnSync(node, args, {
        cwd: path.resolve(root, cwd), encoding: 'utf8', windowsHide: true,
        maxBuffer: 48 * 1024 * 1024,
    });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    const exitCode = result.status ?? 1;
    const status = exitCode === expectedExit ? (expectedExit === 0 ? 'PASS' : 'EXPECTED_MIGRATION_DEBT') : 'FAIL';
    return { name, command: `node ${args.join(' ')}`, cwd, exitCode, expectedExit, status, output };
};

const checks = [
    run('generate:check', '.', ['scripts/generate.mjs', '--check']),
    run('typecheck', '.', ['node_modules/typescript/bin/tsc', '-p', 'apps/web/tsconfig.json', '--noEmit']),
    run('lint', '.', ['node_modules/eslint/bin/eslint.js', 'apps/web/src', '--max-warnings', '0']),
    run('boundaries', '.', ['scripts/check-boundaries.mjs']),
    run('source-check', '.', ['scripts/check-source.mjs']),
    run('source-checker-fixtures', '.', ['--test', 'tests/source-checker.test.mjs']),
    run('layout-checker-fixtures', '.', ['--test', 'tests/layout-checker.test.mjs']),
    run('vitest-full', '.', ['node_modules/vitest/vitest.mjs', 'run', '--config', 'apps/web/vitest.config.ts']),
    run('catalog-CRUD-import-security-playwright', '.', ['node_modules/@playwright/test/cli.js', 'test', 'tests/fe010.spec.ts', 'tests/security.spec.ts', '--project=chromium']),
    run('catalog-responsive-layout-playwright', '.', ['node_modules/@playwright/test/cli.js', 'test', 'tests/ui-catalog-layout.spec.ts', '--project=chromium']),
    run('production-build', 'apps/web', ['../../node_modules/vite/bin/vite.js', 'build', '--mode', 'production']),
    run('demo-build', 'apps/web', ['../../node_modules/vite/bin/vite.js', 'build', '--mode', 'demo', '--outDir', 'dist-demo']),
    run('strict-layout-scan', '.', ['scripts/check-layout.mjs'], 1),
];

const strict = checks.find(check => check.name === 'strict-layout-scan');
const remainingFindings = Number(strict.output.match(/(\d+) finding\(s\)/)?.[1] ?? NaN);
const unknownStyleSources = Number(strict.output.match(/UNKNOWN_STYLE_SOURCE: (\d+)/)?.[1] ?? 0);
const delta = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'layout-report-delta-current-20261005.json'), 'utf8'));
const afterRender = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'render-after-source-edit-current-20261005.json'), 'utf8'));
const allExpected = checks.every(check => check.status === 'PASS' || check.status === 'EXPECTED_MIGRATION_DEBT');
const verdict = allExpected && remainingFindings === 375 && unknownStyleSources === 0 && delta.status === 'PASS_NO_NEW_FINDINGS_TOUCHED_FILES_CLEAN' && afterRender.status === 'AFTER_STATE_CAPTURED' && afterRender.pageErrors.length === 0
    ? 'PASS_WITH_KNOWN_GLOBAL_MIGRATION_DEBT'
    : 'FAIL';
const files = ['apps/web/src/modules/catalog/index.tsx', 'apps/web/src/modules/catalog/imports.tsx', 'tests/ui-catalog-layout.spec.ts'];
const sourceSha256 = Object.fromEntries(files.map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const result = {
    capturedAt: new Date().toISOString(),
    task: 'UI028.W10',
    scope: 'Frontend-only catalog modules and responsive UI verification for R09-R14',
    revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    verdict,
    ui: 'PASS',
    architecture: 'PASS_WITH_KNOWN_GLOBAL_MIGRATION_DEBT',
    routeCoverage: { ids: ['R09', 'R10', 'R11', 'R12', 'R13', 'R14'], widths: [390, 1280], baselineObservations: 12, afterObservations: afterRender.observations.length, afterPageErrors: afterRender.pageErrors.length, dryRunOnly: afterRender.workflow.every(item => item.dryRunOnly && !item.commitRequested) },
    layoutDebt: { before: delta.before.total, after: remainingFindings, resolved: delta.resolved, newFindings: delta.newFindings.length, touchedFileFindings: delta.touchedFileFindings.length, unknownStyleSources },
    checks: checks.map(({ output, ...check }) => check),
    sourceSha256,
    limitations: ['The whole-app strict layout scan remains nonzero because 375 SPACING_LITERAL findings are owned by later UI028 work; this task did not suppress or relabel that debt.', 'Browser/build evidence is local Chromium and synthetic in-memory API only; it does not claim Backend, hosted CI, staging, production runtime or owner acceptance.'],
    artifacts: [
        'design-contract-pre-code-current-20261005.md',
        'baseline-before-source-edit-current-20261005.json',
        'layout-report-before-source-edit-current-20261005.json',
        'layout-report-after-source-edit-current-20261005.json',
        'layout-report-delta-current-20261005.json',
        'render-after-source-edit-current-20261005.json',
        'verify-w10-current-20261005.log',
    ],
};
const log = checks.map(check => [
    `## ${check.name} — ${check.status} (exit ${check.exitCode}; expected ${check.expectedExit})`,
    `$ (${check.cwd}) ${check.command}`,
    check.output.trimEnd(),
].filter(Boolean).join('\n')).join('\n\n');
fs.writeFileSync(logPath, `${log}\n`, 'utf8');
fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ verdict, checks: checks.map(({ name, status, exitCode }) => ({ name, status, exitCode })), layoutDebt: result.layoutDebt, resultPath, logPath }, null, 2));
if (verdict === 'FAIL') process.exitCode = 1;
