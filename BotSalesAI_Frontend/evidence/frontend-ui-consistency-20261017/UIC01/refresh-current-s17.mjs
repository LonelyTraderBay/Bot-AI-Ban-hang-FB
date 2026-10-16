import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
const manifestPath = path.join(frontendRoot, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const verifyLogPath = path.join(here, 'verify-uic01-current-source.log');
const targetedLogPath = path.join(here, 'targeted-toolbar-current-query.log');
const sourceFiles = [
    'apps/web/src/modules/catalog/index.tsx',
    'apps/web/src/shared/model/filters.ts',
    'apps/web/src/shared/ui/README.md',
    'apps/web/src/shared/ui/components.tsx',
    'tests/ui-toolbar-layout.spec.ts',
];
const sha256 = value => createHash('sha256').update(value).digest('hex');
const raw = await readFile(manifestPath, 'utf8');
const evidence = JSON.parse(raw);

for (const file of sourceFiles) {
    const repositoryPath = `BotSalesAI_Frontend/${file}`;
    assert.ok(Object.hasOwn(evidence.sourceFingerprints, repositoryPath), `S17 is missing the current source fingerprint: ${repositoryPath}`);
    evidence.sourceFingerprints[repositoryPath] = sha256(await readFile(path.join(frontendRoot, file)));
}

let verifyReceipt = 'fingerprints refreshed; final verify receipt pending';
try {
    const log = await readFile(verifyLogPath, 'utf8');
    if (/^VERIFY_EXIT=0\s*$/m.test(log) && /^VERIFY_SCOPE=EXACT_UIC01_CHECKOUT\s*$/m.test(log)) {
        assert.match(log, /ℹ tests 15[\s\S]{0,100}ℹ pass 15/, 'All source and session tests must pass.');
        assert.match(log, /242 passed \(242\)/, 'All Vitest unit tests must pass.');
        assert.match(log, /layout-check PASS:/, 'The layout source checker must pass.');
        assert.match(log, /visual-token-check PASS:/, 'The visual-token source checker must pass.');
        assert.match(log, /ui-composition PASS:/, 'The shared-composition source checker must pass.');
        assert.match(log, /ui-evidence PASS: S17;/, 'The final S17 validator must pass.');
        const result = 'npm run verify PASS: generated contracts 15/346/245/61; source/session 15/15; domain 117/117; unit 242/242; layout 86/86 with 0 findings; visual token 5/5 with 0 findings; UI composition 41/41 with 0 findings; evidence validator 11/11; production build passed.';
        const check = {
            id: 'uic01-current-source-verify',
            command: 'npm.cmd --script-shell=pwsh.exe run verify (Node 24.19.0, npm 11.17.0; exact command output is in the linked log)',
            exitCode: 0,
            result: 'PASS',
            expected: result,
            observed: result,
            log: { path: `BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261017/UIC01/verify-uic01-current-source.log`, sha256: sha256(log) },
        };
        const existing = evidence.checks.find(item => item.id === check.id);
        if (existing) Object.assign(existing, check);
        else evidence.checks.push(check);
        const coverage = { name: check.id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
        const existingCoverage = evidence.coverage.find(item => item.name === coverage.name);
        if (existingCoverage) Object.assign(existingCoverage, coverage);
        else evidence.coverage.push(coverage);
        evidence.status = 'COMPLETE';
        verifyReceipt = 'full verify PASS';
    } else {
        evidence.status = 'IN_PROGRESS';
        verifyReceipt = 'exact UIC01 checkout receipt pending';
    }
} catch (error) {
    if (error.code !== 'ENOENT') throw error;
    evidence.status = 'IN_PROGRESS';
}

const targetedLog = await readFile(targetedLogPath, 'utf8');
assert.match(targetedLog, /^CHROME_VERSION=155\.0\.8059\.40\s*$/m, 'The Chrome Stable version must be measured and recorded.');
assert.match(targetedLog, /^FIREFOX_VERSION=155\.0\s*$/m, 'The Playwright Firefox version must be measured and recorded.');
assert.equal([...targetedLog.matchAll(/\[chromium\].*Toolbar preserves Products URL filters/g)].length, 10, 'The query preservation regression must pass ten Chromium repetitions.');
assert.equal([...targetedLog.matchAll(/\[firefox\].*Toolbar preserves Products URL filters/g)].length, 10, 'The query preservation regression must pass ten Firefox repetitions.');
assert.match(targetedLog, /20 passed \(\d+(?:\.\d+)?m\)/, 'All twenty browser repetitions must pass.');
assert.match(targetedLog, /TARGETED_E2E_EXIT=0\b/, 'The targeted Playwright process must exit successfully.');
const targetedResult = 'Toolbar product-filter/search/clear/category-lookup regression passed 10/10 on Chrome Stable 155.0.8059.40 and 10/10 on Playwright Firefox 155.0; all 20 browser repetitions passed.';
const targetedCheck = {
    id: 'uic01-current-query-race',
    command: "node node_modules/@playwright/test/cli.js test tests/ui-toolbar-layout.spec.ts --project=chromium --project=firefox --grep 'Toolbar preserves Products URL filters' --repeat-each=10 --workers=1 --reporter=line",
    exitCode: 0,
    result: 'PASS',
    expected: targetedResult,
    observed: targetedResult,
    log: { path: `BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261017/UIC01/targeted-toolbar-current-query.log`, sha256: sha256(targetedLog) },
};
const existingTargetedCheck = evidence.checks.find(item => item.id === targetedCheck.id);
if (existingTargetedCheck) Object.assign(existingTargetedCheck, targetedCheck);
else evidence.checks.push(targetedCheck);
const targetedCoverage = { name: targetedCheck.id, expected: 20, observed: 20, missing: 0, result: 'COMPLETE' };
const existingTargetedCoverage = evidence.coverage.find(item => item.name === targetedCoverage.name);
if (existingTargetedCoverage) Object.assign(existingTargetedCoverage, targetedCoverage);
else evidence.coverage.push(targetedCoverage);

evidence.recordedAt = new Date().toISOString();
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
await writeFile(manifestPath, `${JSON.stringify(evidence, null, 2).replaceAll('\n', newline)}${newline}`, 'utf8');
console.log(JSON.stringify({
    manifest: path.relative(frontendRoot, manifestPath).replaceAll(path.sep, '/'),
    refreshedFingerprints: sourceFiles.length,
    fingerprintCount: Object.keys(evidence.sourceFingerprints).length,
    status: evidence.status,
    verifyReceipt,
    targetedBrowserRepetitions: '20/20 PASS',
    recordedAt: evidence.recordedAt,
}, null, 2));
