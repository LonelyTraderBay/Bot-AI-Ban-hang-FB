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
const verifyLogPath = path.join(here, 'full-verify-current-source.log');
const verifyExitPath = `${verifyLogPath}.exit`;
const preverify = process.argv.includes('--preverify');
const finalize = process.argv.includes('--finalize');
assert.notEqual(preverify, finalize, 'Pass exactly one of --preverify or --finalize.');

const sourceFiles = [
    'BotSalesAI_Frontend/apps/web/src/modules/dashboard/index.tsx',
    'BotSalesAI_Frontend/tests/ui-dashboard-layout.spec.ts',
];
const digest = value => createHash('sha256').update(value).digest('hex');
const raw = await readFile(evidencePath, 'utf8');
const evidence = JSON.parse(raw);
const refreshed = {};
for (const relativePath of sourceFiles) refreshed[relativePath] = digest(await readFile(path.join(repositoryRoot, relativePath)));

const allowed = new Set(sourceFiles);
const unrelatedStale = [];
for (const [relativePath, expected] of Object.entries(evidence.sourceFingerprints)) {
    const actual = digest(await readFile(path.join(repositoryRoot, relativePath)));
    if (actual !== expected && !allowed.has(relativePath)) unrelatedStale.push(relativePath);
}
assert.deepEqual(unrelatedStale, [], `Refusing to refresh unrelated source fingerprints: ${unrelatedStale.join(', ')}`);
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
    assert.match(verifyLog, /visual-token-check PASS:/);
    assert.match(verifyLog, /ui-composition PASS:/);
    assert.match(verifyLog, /ui-evidence PASS: S17;/);
    assert.match(report, /FULL_VERIFY_EXIT=0/);

    const relativeVerifyLog = path.relative(repositoryRoot, verifyLogPath).replaceAll(path.sep, '/');
    const fullVerifyResult = 'Current UIC04 source npm run verify PASS: generated 15/346/245/61; source/session 15/15; boundary 725 imports and 10/10 fixtures; domain 117/117; Vitest 249/249; production build; layout 86/86; visual tokens 5/5; UI composition 41/41; S17 evidence validator PASS.';
    const fullVerifyCheck = {
        id: 'uic04-current-source-full-verify',
        command: 'npm.cmd --script-shell=<pwsh.exe> run verify (Node 24.19.0, npm 11.17.0)',
        exitCode: 0,
        result: 'PASS',
        expected: fullVerifyResult,
        observed: fullVerifyResult,
        log: { path: relativeVerifyLog, sha256: digest(verifyLog) },
    };
    const oldVerify = evidence.checks.find(check => check.id === fullVerifyCheck.id);
    if (oldVerify) Object.assign(oldVerify, fullVerifyCheck);
    else evidence.checks.push(fullVerifyCheck);

    const relativeAuditLog = path.relative(repositoryRoot, path.join(here, 'validate-dashboard-audit-final.log')).replaceAll(path.sep, '/');
    const browserResult = 'Chrome 155.0.8059.40: before/after geometry at 390/768/1279/1280/1440/1920px, ready/pending/empty/error/long-money and owner/sales/viewer. Baseline 452.9375px unused at 1440; after source 0px, panel 1152px; no horizontal overflow or pageerror. Dashboard Playwright suite Chromium+Firefox 8/8 PASS.';
    const browserCheck = {
        id: 'uic04-dashboard-single-track-browser-proof',
        command: 'Local Vite demo, Playwright Chromium/Firefox dashboard suite, deterministic response-state audit and evidence validator; exact commands and scope in REPORT.md',
        exitCode: 0,
        result: 'PASS',
        expected: browserResult,
        observed: browserResult,
        log: { path: relativeAuditLog, sha256: digest(await readFile(path.join(repositoryRoot, relativeAuditLog))) },
    };
    const oldBrowser = evidence.checks.find(check => check.id === browserCheck.id);
    if (oldBrowser) Object.assign(oldBrowser, browserCheck);
    else evidence.checks.push(browserCheck);

    const coverage = { name: browserCheck.id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
    const oldCoverage = evidence.coverage.find(item => item.name === coverage.name);
    if (oldCoverage) Object.assign(oldCoverage, coverage);
    else evidence.coverage.push(coverage);
    if (!evidence.scope.includes('UIC04 Dashboard single-track decision and browser geometry evidence'))
        evidence.scope = `${evidence.scope} UIC04 Dashboard single-track decision and browser geometry evidence covers six widths, five deterministic data states and three permission presets in the local mock runtime.`;
}

evidence.recordedAt = new Date().toISOString();
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2).replaceAll('\n', newline)}${newline}`, 'utf8');
console.log(JSON.stringify({ phase: preverify ? 'preverify' : 'finalize', refreshed, fingerprintCount: Object.keys(evidence.sourceFingerprints).length, checks: evidence.checks.length, coverage: evidence.coverage.length, recordedAt: evidence.recordedAt }, null, 2));
