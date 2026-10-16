import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const output = import.meta.dirname;
const frontend = path.resolve(output, '../../..');
const repository = path.dirname(frontend);
const evidencePath = path.join(frontend, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const rootRelative = value => path.relative(repository, value).replaceAll(path.sep, '/');
const current = 'BotSalesAI_Frontend/evidence/frontend-completeness-20261016-3762bc0/product-editor-r58/';

function refreshFingerprints() {
    for (const source of Object.keys(evidence.sourceFingerprints))
        evidence.sourceFingerprints[source] = hash(path.join(repository, source));
}

function record(id, command, relativeLog, expected, validate) {
    const absoluteLog = path.join(repository, relativeLog);
    const content = fs.readFileSync(absoluteLog, 'utf8').replace(/^\uFEFF/, '');
    assert.equal(fs.readFileSync(absoluteLog + '.exit', 'utf8').trim(), '0', `${id} exit code`);
    validate(content);
    return {
        id,
        command,
        exitCode: 0,
        result: 'PASS',
        expected,
        observed: expected,
        log: { path: relativeLog, sha256: hash(absoluteLog) },
    };
}

const focusedChecks = [
    record('product-editor-navigation-chromium', 'node scripts/run-e2e.mjs --project=chromium FE010 --repeat-each=20', current + 'fe010-navigation-chromium-repeat20-r58.log', 'Chromium 20/20 PASS; create response is rendered and the list route opens after save', content => {
        assert.match(content, /20 passed \([\d.]+m\)/);
        assert.equal([...content.matchAll(/\[chromium\].*product editor validates positive prices, protects image-only drafts, and saves variant payload through mock HTTP/g)].length, 20);
    }),
    record('product-editor-navigation-firefox', 'node scripts/run-e2e.mjs --project=firefox FE010 --repeat-each=5', current + 'fe010-navigation-firefox-repeat5-r58.log', 'Firefox 5/5 PASS; create response is rendered and the list route opens after save', content => {
        assert.match(content, /5 passed \([\d.]+m\)/);
        assert.equal([...content.matchAll(/\[firefox\].*product editor validates positive prices, protects image-only drafts, and saves variant payload through mock HTTP/g)].length, 5);
    }),
];

function refreshCoverage() {
    evidence.coverage = evidence.coverage.filter(item => !['full-verify', 'product-editor-navigation-chromium', 'product-editor-navigation-firefox'].includes(item.name));
    evidence.coverage.push(
        { name: 'product-editor-navigation-chromium', expected: 20, observed: 20, missing: 0, result: 'COMPLETE' },
        { name: 'product-editor-navigation-firefox', expected: 5, observed: 5, missing: 0, result: 'COMPLETE' },
    );
}

if (process.argv.includes('--prepare')) {
    refreshFingerprints();
    evidence.checks = evidence.checks.filter(check => !['full-verify', ...focusedChecks.map(check => check.id)].includes(check.id));
    evidence.checks.push(...focusedChecks);
    refreshCoverage();
    evidence.recordedAt = new Date().toISOString();
    evidence.status = 'IN_PROGRESS';
    evidence.scope = 'S17 fingerprints and FE010 save/navigation browser evidence refreshed for R58. The full Frontend verification is being collected before this evidence is finalized.';
    fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify({ phase: 'prepared', checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length, status: evidence.status }));
    process.exit(0);
}

const verifyPath = path.join(output, 'verify-r58-pre-final.log');
const verifyRecord = record('full-verify', 'npm run verify', rootRelative(verifyPath), 'All non-S17 Frontend gates pass; S17 interim evidence is valid against refreshed fingerprints', content => {
    for (const marker of [
        '"status":"PASS","outputs":15,"schemas":346,"operations":245,"routes":61',
        '"passed":117,"operations":100',
        'Tests  242 passed (242)',
        '✓ 2077 modules transformed.',
        'layout-check PASS: 93 source files, 0 finding(s), 1 exception(s) used',
        'visual-token-check PASS: 92 source files, 0 finding(s)',
        'ui-composition PASS: 91 source files, 0 finding(s)',
        'ui-evidence PASS: S17; 11 command/log record(s), 10 coverage row(s), 280 current fingerprint(s); status=IN_PROGRESS',
    ]) assert.ok(content.includes(marker), `verify log missing ${marker}`);
});

evidence.checks = evidence.checks.filter(check => !['full-verify', ...focusedChecks.map(check => check.id)].includes(check.id));
evidence.checks.push(...focusedChecks, verifyRecord);
refreshCoverage();
evidence.coverage.push({ name: 'full-verify', expected: 1, observed: 1, missing: 0, result: 'COMPLETE' });
refreshFingerprints();
evidence.recordedAt = new Date().toISOString();
evidence.status = 'COMPLETE';
evidence.scope = 'S17 governance refreshed after the R58 FE010 product-save navigation correction. Local Chromium 20/20 and Firefox 5/5 repeats pass, and the full verification log validates all non-S17 gates against current fingerprints. The final COMPLETE evidence state is verified by the separate final npm run verify. This remains synthetic MSW evidence, not real-backend, owner, assistive-technology, staging or production acceptance.';
evidence.knownLimits = [...new Set([
    ...evidence.knownLimits,
    'GitHub run #58 on the parent SHA f19d2be reported a Chromium FE010 product-editor list-navigation timeout after save; the browser stayed on the detail URL. The trace showed the save and product detail load completed without pageerror. The current code awaits the React Router navigation promise after the mock save; local repeats pass Chromium 20/20 and Firefox 5/5. Hosted validation of the R58 source remains pending.',
])];

fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ phase: 'finalized', checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length, recordedAt: evidence.recordedAt, status: evidence.status }));
