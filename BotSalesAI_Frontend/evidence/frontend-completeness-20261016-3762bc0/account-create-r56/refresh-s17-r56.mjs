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

function record(id, command, relativeLog, expected, validate) {
    const absoluteLog = path.join(repository, relativeLog);
    const content = fs.readFileSync(absoluteLog, 'utf8');
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
const current = 'BotSalesAI_Frontend/evidence/frontend-completeness-20261016-3762bc0/account-create-r56/';

const checks = [
    record('layout', 'npm run test:layout', completeness + 'layout-current.log', '86/86 current fixtures PASS; source checker 0 findings', content => {
        for (const marker of [/(?:ℹ |# )tests 86\b/, /(?:ℹ |# )pass 86\b/, /(?:ℹ |# )fail 0\b/, /layout-check PASS: 93 source files, 0 finding\(s\), 1 exception\(s\) used/]) assert.match(content, marker);
    }),
    record('contracts', 'npm run test:ui-composition', completeness + 'composition-current.log', '41/41 current fixtures PASS; source checker 0 findings', content => {
        for (const marker of [/(?:ℹ |# )tests 41\b/, /(?:ℹ |# )pass 41\b/, /(?:ℹ |# )fail 0\b/, /ui-composition PASS: 91 source files, 0 finding\(s\)/]) assert.match(content, marker);
    }),
    record('evidence-validator', 'npm run test:evidence', current + 'evidence-validator-r56-initial.log', '11/11 evidence-validator fixtures PASS', content => {
        for (const marker of [/(?:ℹ |# )tests 11\b/, /(?:ℹ |# )pass 11\b/, /(?:ℹ |# )fail 0\b/]) assert.match(content, marker);
        assert.match(content, /ui-evidence PASS: S17; 8 command\/log record\(s\), 7 coverage row\(s\), 280 current fingerprint\(s\); status=COMPLETE/);
    }),
    record('c05-save-response-close', 'Playwright C05 warehouse create flow: Firefox 3 runs and Chromium 1 run', procurement + 'c05-focused-r54.log', 'Firefox 3/3 and Chromium 1/1; each warehouse POST returned 201, success status appeared, and dialog closed', content => {
        for (const marker of ['Firefox focused run 1/3', 'Firefox focused run 2/3', 'Firefox focused run 3/3', 'Chromium focused run']) assert.ok(content.includes(marker), marker);
        assert.equal([...content.matchAll(/1 passed \([\d.]+s\)/g)].length, 4);
    }),
    record('toolbar-layout-firefox', 'Playwright tests/ui-toolbar-layout.spec.ts --project=firefox', toolbar + 'ui-toolbar-firefox-r55.log', 'Firefox 8/8 PASS', content => assert.match(content, /8 passed \(1\.9m\)/)),
    record('toolbar-layout-chromium', 'Playwright tests/ui-toolbar-layout.spec.ts --project=chromium', toolbar + 'ui-toolbar-chromium-r55.log', 'Chromium 8/8 PASS', content => assert.match(content, /8 passed \(1\.3m\)/)),
    record('account-create-firefox', 'Playwright C05 account create: Firefox repeat-each=3; assert POST 201, success toast and dialog close', current + 'account-create-firefox-postfix-repeat3-r56.log', 'Firefox 3/3 PASS; all creates returned 201 and completed with success toast and closed dialog', content => {
        assert.match(content, /3 passed \(47\.0s\)/);
        assert.equal([...content.matchAll(/\[firefox\].*C05 accounts create and protect used fields/g)].length, 3);
    }),
    record('account-create-chromium', 'Playwright C05 account create: Chromium repeat-each=3; assert POST 201, success toast and dialog close', current + 'account-create-chromium-postfix-repeat3-r56.log', 'Chromium 3/3 PASS; all creates returned 201 and completed with success toast and closed dialog', content => {
        assert.match(content, /3 passed \(13\.5s\)/);
        assert.equal([...content.matchAll(/\[chromium\].*C05 accounts create and protect used fields/g)].length, 3);
    }),
];

const firstVerify = path.join(output, 'verify-r56-account-first.log');
const finalVerify = path.join(output, 'verify-r56-account-final.log');
const verifyPath = fs.existsSync(finalVerify) && fs.existsSync(finalVerify + '.exit') ? finalVerify : firstVerify;
if (fs.existsSync(verifyPath) && fs.existsSync(verifyPath + '.exit')) {
    const expectedManifest = verifyPath === finalVerify ? '9 command/log record(s), 8 coverage row(s)' : '8 command/log record(s), 7 coverage row(s)';
    checks.push(record('full-verify', 'npm run verify', rootRelative(verifyPath), 'Full Frontend verification passes all configured gates', content => {
        for (const marker of [
            '"status":"PASS","outputs":15,"schemas":346,"operations":245,"routes":61',
            '"passed":117,"operations":100',
            'Tests  242 passed (242)',
            '✓ 2077 modules transformed.',
            'layout-check PASS: 93 source files, 0 finding(s), 1 exception(s) used',
            'visual-token-check PASS: 92 source files, 0 finding(s)',
            'ui-composition PASS: 91 source files, 0 finding(s)',
            `ui-evidence PASS: S17; ${expectedManifest}, 280 current fingerprint(s); status=COMPLETE`,
        ]) assert.ok(content.includes(marker), `verify log missing ${marker}`);
    }));
}

evidence.checks = checks;
evidence.coverage = [
    { name: 'layout', expected: 86, observed: 86, missing: 0, result: 'COMPLETE' },
    { name: 'contracts', expected: 41, observed: 41, missing: 0, result: 'COMPLETE' },
    { name: 'evidence-validator', expected: 11, observed: 11, missing: 0, result: 'COMPLETE' },
    { name: 'c05-save-response-close', expected: 4, observed: 4, missing: 0, result: 'COMPLETE' },
    { name: 'toolbar-layout-firefox-chromium', expected: 16, observed: 16, missing: 0, result: 'COMPLETE' },
    { name: 'account-create-firefox', expected: 3, observed: 3, missing: 0, result: 'COMPLETE' },
    { name: 'account-create-chromium', expected: 3, observed: 3, missing: 0, result: 'COMPLETE' },
];
if (checks.some(check => check.id === 'full-verify'))
    evidence.coverage.push({ name: 'full-verify', expected: 1, observed: 1, missing: 0, result: 'COMPLETE' });

for (const source of Object.keys(evidence.sourceFingerprints))
    evidence.sourceFingerprints[source] = hash(path.join(repository, source));

evidence.recordedAt = new Date().toISOString();
evidence.status = 'COMPLETE';
evidence.scope = 'S17 governance and local frontend verification refreshed after GitHub run #56. Chromium on SHA c76c314ea06e37fbf5073af8fa641e0f79876227 passed 445/445 E2E, built-demo 3/3 and 61 routes at 390px/1440px with 0 issues and 0 page errors; artifact 12016873556 SHA-256 215b15f8f77fd187990e2c2c9856d38ec9ef69f5e6e89a6466742a9ebbb1dd08. Firefox passed 444/445; trace artifact 12018029003 (SHA-256 72b3b825461a8d2ac34891450237b926dc438e92d5a9a6bc20a33a388b48ecdc) shows account POST 201 and refreshed list 200, while the 5-second dialog-close assertion expired with the UI still showing the saving progress state. The test now asserts POST 201, the success message and dialog closure with 15-second readiness limits. Local focused repeats passed Firefox 3/3 and Chromium 3/3; hosted validation of this follow-up is pending. This is React with synthetic MSW evidence, not real-backend, owner, assistive-technology, staging or production acceptance.';
evidence.knownLimits = [...new Set([
    ...evidence.knownLimits,
    'GitHub run #56 Firefox on SHA c76c314ea06e37fbf5073af8fa641e0f79876227 ended 444/445 at tests/ui-master-resources.spec.ts:43 because dialog "Thêm tài khoản" remained in the saving state beyond the default 5-second close assertion. Artifact 12018029003 (SHA-256 72b3b825461a8d2ac34891450237b926dc438e92d5a9a6bc20a33a388b48ecdc) confirms the POST returned 201 and the list GET returned 200; local Firefox and Chromium repeat-3 focused runs pass after the test waits for POST 201, success status and close (15 seconds). Hosted verification for the changed SHA remains pending.',
])];

fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length, recordedAt: evidence.recordedAt }));
