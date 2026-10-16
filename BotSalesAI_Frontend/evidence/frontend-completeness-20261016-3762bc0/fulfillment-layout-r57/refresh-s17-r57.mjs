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

function refreshFingerprints() {
    for (const source of Object.keys(evidence.sourceFingerprints))
        evidence.sourceFingerprints[source] = hash(path.join(repository, source));
}

if (process.argv.includes('--prepare')) {
    refreshFingerprints();
    evidence.recordedAt = new Date().toISOString();
    evidence.status = 'IN_PROGRESS';
    evidence.scope = 'S17 fingerprints refreshed for the R57 fulfillment-layout timeout investigation. The local browser repeat and full verification records are being collected; this interim snapshot is not a completion claim.';
    fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify({ phase: 'prepared', fingerprints: Object.keys(evidence.sourceFingerprints).length, status: evidence.status }));
    process.exit(0);
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

const completeness = 'BotSalesAI_Frontend/evidence/frontend-completeness-20261015-aaf74b7/procurement-layout-r53/';
const procurement = 'BotSalesAI_Frontend/evidence/frontend-completeness-20261016-1f483c8/procurement-save-r54/';
const toolbar = 'BotSalesAI_Frontend/evidence/frontend-completeness-20261016-3762bc0/toolbar-readiness-r55/';
const account = 'BotSalesAI_Frontend/evidence/frontend-completeness-20261016-3762bc0/account-create-r56/';
const current = 'BotSalesAI_Frontend/evidence/frontend-completeness-20261016-3762bc0/fulfillment-layout-r57/';

const checks = [
    record('layout', 'npm run test:layout', completeness + 'layout-current.log', '86/86 current fixtures PASS; source checker 0 findings', content => {
        for (const marker of [/(?:ℹ |# )tests 86\b/, /(?:ℹ |# )pass 86\b/, /(?:ℹ |# )fail 0\b/, /layout-check PASS: 93 source files, 0 finding\(s\), 1 exception\(s\) used/]) assert.match(content, marker);
    }),
    record('contracts', 'npm run test:ui-composition', completeness + 'composition-current.log', '41/41 current fixtures PASS; source checker 0 findings', content => {
        for (const marker of [/(?:ℹ |# )tests 41\b/, /(?:ℹ |# )pass 41\b/, /(?:ℹ |# )fail 0\b/, /ui-composition PASS: 91 source files, 0 finding\(s\)/]) assert.match(content, marker);
    }),
    record('evidence-validator', 'npm run test:evidence', account + 'evidence-validator-r56-confirmation.log', '11/11 current evidence validator fixtures PASS', content => {
        for (const marker of [/(?:ℹ |# )tests 11\b/, /(?:ℹ |# )pass 11\b/, /(?:ℹ |# )fail 0\b/, /ui-evidence PASS: S17;/]) assert.match(content, marker);
    }),
    record('c05-save-response-close', 'Playwright C05 warehouse create flow: Firefox 3 runs and Chromium 1 run', procurement + 'c05-focused-r54.log', 'Firefox 3/3 and Chromium 1/1; each warehouse POST returned 201, success status appeared, and dialog closed', content => {
        for (const marker of ['Firefox focused run 1/3', 'Firefox focused run 2/3', 'Firefox focused run 3/3', 'Chromium focused run']) assert.ok(content.includes(marker), marker);
        assert.equal([...content.matchAll(/1 passed \([\d.]+s\)/g)].length, 4);
    }),
    record('toolbar-layout-firefox', 'Playwright tests/ui-toolbar-layout.spec.ts --project=firefox', toolbar + 'ui-toolbar-firefox-r55.log', 'Firefox 8/8 PASS', content => assert.match(content, /8 passed \(1\.9m\)/)),
    record('toolbar-layout-chromium', 'Playwright tests/ui-toolbar-layout.spec.ts --project=chromium', toolbar + 'ui-toolbar-chromium-r55.log', 'Chromium 8/8 PASS', content => assert.match(content, /8 passed \(1\.3m\)/)),
    record('account-create-firefox', 'Playwright C05 account create: Firefox repeat-each=3', account + 'account-create-firefox-postfix-repeat3-r56.log', 'Firefox 3/3 PASS; each POST returned 201 and completed with success status and dialog close', content => {
        assert.match(content, /3 passed \(47\.0s\)/);
        assert.equal([...content.matchAll(/\[firefox\].*C05 accounts create and protect used fields/g)].length, 3);
    }),
    record('account-create-chromium', 'Playwright C05 account create: Chromium repeat-each=3', account + 'account-create-chromium-postfix-repeat3-r56.log', 'Chromium 3/3 PASS; each POST returned 201 and completed with success status and dialog close', content => {
        assert.match(content, /3 passed \(13\.5s\)/);
        assert.equal([...content.matchAll(/\[chromium\].*C05 accounts create and protect used fields/g)].length, 3);
    }),
    record('fulfillment-layout-r57', 'Playwright R41/R42 fulfillment layout: Chromium and Firefox, repeat-each=3', current + 'fulfillment-layout-firefox-chromium-repeat3-r57.log', 'Chromium 3/3 and Firefox 3/3 PASS; all 10 route/viewport observations retained each run', content => {
        assert.match(content, /6 passed \([\d.]+m\)/);
        assert.equal([...content.matchAll(/Fulfillment R41\/R42 preserve shell gutter and contain responsive route layouts from 320-1440px/g)].length, 6);
    }),
];

const verifyPath = path.join(output, 'verify-r57-final.log');
checks.push(record('full-verify', 'npm run verify', rootRelative(verifyPath), 'All configured Frontend gates pass on the R57 test and report state', content => {
    for (const marker of [
        '"status":"PASS","outputs":15,"schemas":346,"operations":245,"routes":61',
        '"passed":117,"operations":100',
        'Tests  242 passed (242)',
        '✓ 2077 modules transformed.',
        'layout-check PASS: 93 source files, 0 finding(s), 1 exception(s) used',
        'visual-token-check PASS: 92 source files, 0 finding(s)',
        'ui-composition PASS: 91 source files, 0 finding(s)',
        'ui-evidence PASS: S17; 10 command/log record(s), 9 coverage row(s), 280 current fingerprint(s); status=COMPLETE',
    ]) assert.ok(content.includes(marker), `verify log missing ${marker}`);
}));

evidence.checks = checks;
evidence.coverage = [
    { name: 'layout', expected: 86, observed: 86, missing: 0, result: 'COMPLETE' },
    { name: 'contracts', expected: 41, observed: 41, missing: 0, result: 'COMPLETE' },
    { name: 'evidence-validator', expected: 11, observed: 11, missing: 0, result: 'COMPLETE' },
    { name: 'c05-save-response-close', expected: 4, observed: 4, missing: 0, result: 'COMPLETE' },
    { name: 'toolbar-layout-firefox-chromium', expected: 16, observed: 16, missing: 0, result: 'COMPLETE' },
    { name: 'account-create-firefox', expected: 3, observed: 3, missing: 0, result: 'COMPLETE' },
    { name: 'account-create-chromium', expected: 3, observed: 3, missing: 0, result: 'COMPLETE' },
    { name: 'fulfillment-layout-firefox-chromium', expected: 6, observed: 6, missing: 0, result: 'COMPLETE' },
    { name: 'full-verify', expected: 1, observed: 1, missing: 0, result: 'COMPLETE' },
];

refreshFingerprints();
evidence.recordedAt = new Date().toISOString();
evidence.status = 'COMPLETE';
evidence.scope = 'S17 governance and local verification refreshed after GitHub run #57. Chromium on SHA e92a42e16423af6e717a934f291ce5c6610f350d passed 445/445 E2E and built-demo 3/3; Firefox passed 444/445 because the R41 heading assertion expired after 5 seconds while Vite was still loading modules. The trace records successful MSW API responses and no pageerror. The test retains its heading/table/layout checks with a 15-second heading timeout; local Chromium and Firefox each passed 3/3 repeats. Full local Frontend verification passed all configured gates. Hosted validation for this change is pending. This is synthetic MSW evidence, not real-backend, owner, assistive-technology, staging or production acceptance.';
evidence.knownLimits = [...new Set([
    ...evidence.knownLimits,
    'GitHub run #57 Firefox on SHA e92a42e16423af6e717a934f291ce5c6610f350d ended 444/445 at the FE023 R41 heading assertion. Trace artifact 12022231931 (SHA-256 2fcbb8f1837e2b4323b445ea43c48547e6528a3e96daacfd868c891b83ab4403) shows route/API responses with status 200, ongoing Vite module requests and a loading spinner when the 5-second heading assertion expired. After increasing only that heading timeout to 15 seconds, local Chromium and Firefox repeat-3 focused runs passed; hosted validation for the new commit is pending.',
])];

fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length, recordedAt: evidence.recordedAt, status: evidence.status }));
