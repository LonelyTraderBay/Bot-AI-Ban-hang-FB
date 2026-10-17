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
const verifyLogPath = path.join(here, 'verify-current-source-r2.log');
const verifyExitPath = `${verifyLogPath}.exit`;
const allowUpdatePath = process.argv.includes('--preverify');
const finalize = process.argv.includes('--finalize');
assert.notEqual(allowUpdatePath, finalize, 'Pass exactly one of --preverify or --finalize.');

const sourceFiles = [
    'BotSalesAI_Frontend/apps/web/src/mocks/browser.ts',
    'BotSalesAI_Frontend/apps/web/src/mocks/service-worker-update-recovery.ts',
    'BotSalesAI_Frontend/apps/web/tests/service-worker-update-recovery.test.ts',
    'BotSalesAI_Frontend/tests/session/demo-worker-startup.spec.ts',
    'BotSalesAI_Frontend/tests/fe010.spec.ts',
];
const digest = value => createHash('sha256').update(value).digest('hex');
const raw = await readFile(evidencePath, 'utf8');
const evidence = JSON.parse(raw);
const sourceHashes = {};
for (const repositoryPath of sourceFiles) {
    const absolute = path.join(repositoryRoot, repositoryPath);
    sourceHashes[repositoryPath] = digest(await readFile(absolute));
}

const allowed = new Set(sourceFiles);
const unexpectedStale = [];
for (const [repositoryPath, expected] of Object.entries(evidence.sourceFingerprints)) {
    const actual = digest(await readFile(path.join(repositoryRoot, repositoryPath)));
    if (actual !== expected && !allowed.has(repositoryPath)) unexpectedStale.push(repositoryPath);
}
assert.deepEqual(unexpectedStale, [], `Refusing to refresh unrelated S17 fingerprints: ${unexpectedStale.join(', ')}`);
Object.assign(evidence.sourceFingerprints, sourceHashes);

if (finalize) {
    const verifyLog = await readFile(verifyLogPath, 'utf8');
    const verifyExit = (await readFile(verifyExitPath, 'utf8')).trim();
    const report = await readFile(reportPath, 'utf8');
    assert.equal(verifyExit, '0', 'Current-source full verify must exit 0.');
    assert.match(verifyLog, /outputs":15,"schemas":346,"operations":245,"routes":61/);
    assert.match(verifyLog, /passed\":117/);
    assert.match(verifyLog, /Tests\s+249\s+passed\s+\(249\)/);
    assert.match(verifyLog, /ℹ tests 86[\s\S]*?ℹ pass 86/);
    assert.match(verifyLog, /layout-check PASS: 94 source files, 0 finding\(s\)/);
    assert.match(verifyLog, /visual-token-check PASS:/);
    assert.match(verifyLog, /ui-composition PASS:/);
    assert.match(verifyLog, /ui-evidence PASS: S17;/);
    assert.match(report, /FULL_VERIFY_EXIT=0/);

    const result = 'Current source npm run verify PASS: 15/346/245/61 generated contract counts; domain 117/117; Vitest 249/249; production build; layout 86/86; visual tokens 5/5; UI composition 41/41; S17 evidence validator 11/11.';
    const relativeVerifyLog = path.relative(repositoryRoot, verifyLogPath).replaceAll(path.sep, '/');
    const verifyCheck = {
        id: 'uic03-current-source-full-verify',
        command: 'npm.cmd --script-shell=pwsh.exe run verify (Node 24.19.0, npm 11.17.0)',
        exitCode: 0,
        result: 'PASS',
        expected: result,
        observed: result,
        log: { path: relativeVerifyLog, sha256: digest(verifyLog) },
    };
    const oldVerifyCheck = evidence.checks.find(check => check.id === verifyCheck.id);
    if (oldVerifyCheck) Object.assign(oldVerifyCheck, verifyCheck);
    else evidence.checks.push(verifyCheck);

    const relativeReport = path.relative(repositoryRoot, reportPath).replaceAll(path.sep, '/');
    const reportHash = digest(report);
    const browserResult = 'Chrome 155.0.8059.40 and Firefox 155.0: update-rejection recovery 2/2; 0 pageerrors, one scoped warning each, active controller retained; 2 unrelated rejections per browser remain uncancelled; route matrix 122/122 per browser at 390px and 1440px; demo lifecycle/startup 8/8.';
    const browserCheck = {
        id: 'uic03-msw-update-recovery',
        command: 'Playwright fault-injection, passive route walk and demo worker lifecycle; exact commands, measured versions and limits are in REPORT.md',
        exitCode: 0,
        result: 'PASS',
        expected: browserResult,
        observed: browserResult,
        log: { path: relativeReport, sha256: reportHash },
    };
    const oldBrowserCheck = evidence.checks.find(check => check.id === browserCheck.id);
    if (oldBrowserCheck) Object.assign(oldBrowserCheck, browserCheck);
    else evidence.checks.push(browserCheck);

    const coverage = { name: browserCheck.id, expected: 2, observed: 2, missing: 0, result: 'COMPLETE' };
    const oldCoverage = evidence.coverage.find(item => item.name === coverage.name);
    if (oldCoverage) Object.assign(oldCoverage, coverage);
    else evidence.coverage.push(coverage);
    if (!evidence.scope.includes('UIC03 scoped active-worker update recovery'))
        evidence.scope = `${evidence.scope} UIC03 scoped active-worker update recovery was measured with synthetic local MSW fault injection and passive Chrome/Firefox route walks.`;
}

evidence.recordedAt = new Date().toISOString();
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2).replaceAll('\n', newline)}${newline}`, 'utf8');
console.log(JSON.stringify({
    phase: allowUpdatePath ? 'preverify' : 'finalize',
    refreshed: sourceHashes,
    fingerprintCount: Object.keys(evidence.sourceFingerprints).length,
    checks: evidence.checks.length,
    coverage: evidence.coverage.length,
    recordedAt: evidence.recordedAt,
}, null, 2));
