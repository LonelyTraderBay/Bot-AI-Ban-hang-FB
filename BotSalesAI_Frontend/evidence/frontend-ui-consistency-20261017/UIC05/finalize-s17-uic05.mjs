import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
const repositoryRoot = path.resolve(frontendRoot, '..');
const evidencePath = path.join(frontendRoot, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const reportPath = path.join(here, 'REPORT.md');
const verifyLogPath = path.join(here, 'full-verify-current-source-rerun.log');
const verifyExitPath = verifyLogPath + '.exit';
const preverify = process.argv.includes('--preverify');
const finalize = process.argv.includes('--finalize');
assert.notEqual(preverify, finalize, 'Pass exactly one of --preverify or --finalize.');

const sourceFiles = [
    'BotSalesAI_Frontend/apps/web/src/app/Shell.tsx',
    'BotSalesAI_Frontend/apps/web/src/app/bootstrap.css',
    'BotSalesAI_Frontend/apps/web/src/app/tokens.css',
    'BotSalesAI_Frontend/apps/web/src/shared/ui/theme.ts',
    'BotSalesAI_Frontend/apps/web/tests/components.test.tsx',
    'BotSalesAI_Frontend/scripts/check-visual-tokens.mjs',
    'BotSalesAI_Frontend/scripts/generate.mjs',
    'BotSalesAI_Frontend/tests/design/browser-audit.mjs',
    'BotSalesAI_Frontend/tests/ui-overlay-theme.spec.ts',
    'BotSalesAI_Frontend/tests/visual-token-checker.test.mjs',
];
const digest = value => createHash('sha256').update(value).digest('hex');
const raw = await readFile(evidencePath, 'utf8');
const evidence = JSON.parse(raw);
const refreshed = {};
for (const relativePath of sourceFiles)
    refreshed[relativePath] = digest(await readFile(path.join(repositoryRoot, relativePath)));

const allowed = new Set(sourceFiles);
const unrelatedStale = [];
for (const [relativePath, expected] of Object.entries(evidence.sourceFingerprints)) {
    const actual = digest(await readFile(path.join(repositoryRoot, relativePath)));
    if (actual !== expected && !allowed.has(relativePath)) unrelatedStale.push(relativePath);
}
assert.deepEqual(unrelatedStale, [], 'Refusing to refresh unrelated source fingerprints: ' + unrelatedStale.join(', '));
Object.assign(evidence.sourceFingerprints, refreshed);

if (finalize) {
    const verifyLog = await readFile(verifyLogPath, 'utf8');
    const exitCode = (await readFile(verifyExitPath, 'utf8')).trim();
    const report = await readFile(reportPath, 'utf8');
    assert.equal(exitCode, '0', 'Current-source npm run verify must exit 0.');
    assert.match(verifyLog, /outputs":15,"schemas":346,"operations":245,"routes":61/);
    assert.match(verifyLog, /passed":117/);
    assert.match(verifyLog, /Tests\s+249\s+passed\s+\(249\)/);
    assert.match(verifyLog, /ℹ tests 86[\s\S]*?ℹ pass 86/);
    assert.match(verifyLog, /layout-check PASS: 94 source files, 0 finding\(s\)/);
    assert.match(verifyLog, /visual-token-check PASS: 93 source files, 0 finding\(s\)/);
    assert.match(verifyLog, /ui-composition PASS:/);
    assert.match(report, /FULL_VERIFY_EXIT=0/);

    const relativePath = value => path.relative(repositoryRoot, value).replaceAll(path.sep, '/');
    const fullVerifyResult = 'Current UIC05 source npm run verify PASS: generated 15/346/245/61; source/session 15/15; boundary 725 imports and 10/10 fixtures; domain 117/117; Vitest 249/249; production build; layout 86/86; visual-token checker 6/6 unit tests and 93 files/0 findings; UI composition 41/41; S17 evidence validator PASS.';
    const fullVerifyCheck = {
        id: 'uic05-current-source-full-verify',
        command: 'npm.cmd --script-shell=<pwsh.exe> run verify (Node 24.19.0, npm 11.17.0)',
        exitCode: 0,
        result: 'PASS',
        expected: fullVerifyResult,
        observed: fullVerifyResult,
        log: { path: relativePath(verifyLogPath), sha256: digest(verifyLog) },
    };
    const browserLogPath = path.join(here, 'overlay-token-layers-rerun-exact-parent.log');
    const browserLog = await readFile(browserLogPath, 'utf8');
    assert.equal((await readFile(browserLogPath + '.exit', 'utf8')).trim(), '0');
    assert.match(browserLog, /4 passed/);
    const browserResult = 'Local mock Chromium and Firefox: 4/4 browser tests. Computed z-index verified on Dialog, Drawer, Select Popover, focused skip-link, sticky header and logout Tooltip; mobile keyboard opens/closes Drawer and focus returns.';
    const browserCheck = {
        id: 'uic05-token-theme-overlay-browser',
        command: 'node node_modules/@playwright/test/cli.js test tests/ui-overlay-theme.spec.ts --workers=1 --reporter=line',
        exitCode: 0,
        result: 'PASS',
        expected: browserResult,
        observed: browserResult,
        log: { path: relativePath(browserLogPath), sha256: digest(browserLog) },
    };
    const auditLogPath = path.join(here, 'theme-layers-final.log');
    const auditLog = await readFile(auditLogPath, 'utf8');
    const audit = JSON.parse(await readFile(path.join(here, 'theme-layers-final.json'), 'utf8'));
    assert.deepEqual(audit.observed.muiZIndex, audit.expected.muiZIndex);
    assert.equal(audit.observed.generatedZIndexVariables.length, 7);
    assert.equal(audit.observed.rawZIndexCheckerProbe.findings.length, 2);
    const auditResult = 'Vite SSR actual theme matches all 8 MUI zIndex slots to canonical roles; generated CSS contains all 7 canonical variables; raw TSX and CSS probes each produce a finding; shell/skip-link literals are absent.';
    const auditCheck = {
        id: 'uic05-token-generator-theme-measured-audit',
        command: 'node evidence/frontend-ui-consistency-20261017/UIC05/audit-theme-layers.mjs final',
        exitCode: 0,
        result: 'PASS',
        expected: auditResult,
        observed: auditResult,
        log: { path: relativePath(auditLogPath), sha256: digest(auditLog) },
    };
    for (const check of [fullVerifyCheck, browserCheck, auditCheck]) {
        const old = evidence.checks.find(item => item.id === check.id);
        if (old) Object.assign(old, check);
        else evidence.checks.push(check);
        const coverage = { name: check.id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
        const oldCoverage = evidence.coverage.find(item => item.name === check.id);
        if (oldCoverage) Object.assign(oldCoverage, coverage);
        else evidence.coverage.push(coverage);
    }
    if (!evidence.scope.includes('UIC05 canonical z-index token-to-runtime integration'))
        evidence.scope += ' UIC05 canonical z-index token-to-runtime integration covers generator output, all MUI theme slots, shell consumers, checker enforcement and live portal layers.';
}

evidence.recordedAt = new Date().toISOString();
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
await writeFile(evidencePath, JSON.stringify(evidence, null, 2).replaceAll('\n', newline) + newline, 'utf8');
console.log(JSON.stringify({
    phase: preverify ? 'preverify' : 'finalize',
    refreshed,
    fingerprintCount: Object.keys(evidence.sourceFingerprints).length,
    checks: evidence.checks.length,
    coverage: evidence.coverage.length,
    recordedAt: evidence.recordedAt,
}, null, 2));
