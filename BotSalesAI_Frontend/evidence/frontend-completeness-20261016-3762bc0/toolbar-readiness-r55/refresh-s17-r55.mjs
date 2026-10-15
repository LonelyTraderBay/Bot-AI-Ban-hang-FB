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
const current = 'BotSalesAI_Frontend/evidence/frontend-completeness-20261016-3762bc0/toolbar-readiness-r55/';
const checks = [
    record('layout', 'npm run test:layout', completeness + 'layout-current.log', '86/86 current fixtures PASS; source checker 0 findings', content => {
        for (const marker of [/(?:ℹ |# )tests 86\b/, /(?:ℹ |# )pass 86\b/, /(?:ℹ |# )fail 0\b/, /layout-check PASS: 93 source files, 0 finding\(s\), 1 exception\(s\) used/]) assert.match(content, marker);
    }),
    record('contracts', 'npm run test:ui-composition', completeness + 'composition-current.log', '41/41 current fixtures PASS; source checker 0 findings', content => {
        for (const marker of [/(?:ℹ |# )tests 41\b/, /(?:ℹ |# )pass 41\b/, /(?:ℹ |# )fail 0\b/, /ui-composition PASS: 91 source files, 0 finding\(s\)/]) assert.match(content, marker);
    }),
    record('evidence-validator', 'npm run test:evidence', current + 'evidence-validator-final.log', '11/11 current fixtures and current S17 log/fingerprints PASS', content => {
        for (const marker of [/(?:ℹ |# )tests 11\b/, /(?:ℹ |# )pass 11\b/, /(?:ℹ |# )fail 0\b/]) assert.match(content, marker);
        assert.match(content, /ui-evidence PASS: S17; 7 command\/log record\(s\), 6 coverage row\(s\), 280 current fingerprint\(s\); status=COMPLETE/);
    }),
    record('c05-save-response-close', 'Playwright C05 warehouse create flow: Firefox 3 runs and Chromium 1 run', procurement + 'c05-focused-r54.log', 'Firefox 3/3 and Chromium 1/1; each warehouse POST returned 201, success status appeared, and dialog closed', content => {
        for (const marker of ['Firefox focused run 1/3', 'Firefox focused run 2/3', 'Firefox focused run 3/3', 'Chromium focused run']) assert.ok(content.includes(marker), marker);
        assert.equal([...content.matchAll(/1 passed \([\d.]+s\)/g)].length, 4);
    }),
    record('toolbar-layout-cold-start', 'Playwright tests/ui-toolbar-layout.spec.ts: Firefox 8/8 and Chromium 8/8', current + 'ui-toolbar-firefox-r55.log', 'Firefox 8/8 PASS after DOM readiness on cold Vite start', content => assert.match(content, /8 passed \(1\.9m\)/)),
    record('toolbar-layout-chromium', 'Playwright tests/ui-toolbar-layout.spec.ts: Chromium', current + 'ui-toolbar-chromium-r55.log', 'Chromium 8/8 PASS', content => assert.match(content, /8 passed \(1\.3m\)/)),
];

const verifyPath = path.join(output, 'verify-r55-toolbar-final.log');
if (fs.existsSync(verifyPath) && fs.existsSync(verifyPath + '.exit')) {
    checks.push(record('full-verify', 'npm run verify', rootRelative(verifyPath), 'Full Frontend verification passes all configured gates', content => {
        for (const marker of [
            '"status":"PASS","outputs":15,"schemas":346,"operations":245,"routes":61',
            '"passed":117,"operations":100',
            'Tests  242 passed (242)',
            '✓ 2077 modules transformed.',
            'layout-check PASS: 93 source files, 0 finding(s), 1 exception(s) used',
            'visual-token-check PASS: 92 source files, 0 finding(s)',
            'ui-composition PASS: 91 source files, 0 finding(s)',
            'ui-evidence PASS: S17; 7 command/log record(s), 6 coverage row(s), 280 current fingerprint(s); status=COMPLETE',
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
];
if (checks.some(check => check.id === 'full-verify'))
    evidence.coverage.push({ name: 'full-verify', expected: 1, observed: 1, missing: 0, result: 'COMPLETE' });

for (const source of Object.keys(evidence.sourceFingerprints))
    evidence.sourceFingerprints[source] = hash(path.join(repository, source));

evidence.recordedAt = new Date().toISOString();
evidence.status = 'COMPLETE';
evidence.scope = 'S17 governance and frontend verification refreshed after GitHub run #55. On SHA 3762bc09f1975aedbc33d71115a696fd903966fa, Chromium passed 445/445 E2E and built-demo 3/3; Firefox attempts 1 and 2 ended with runner shutdown, and attempt 3 passed 444/445. Trace artifact 12014006194 (SHA-256 efe625f4c0c7a8a23f775dfc7c47784d15f7f82ce22abf0190b7241133160d57) shows the Toolbar layout test waiting through a Vite cold transform until its 180-second timeout, before the conversations request. The test now uses DOMContentLoaded readiness and a 300-second timeout for that cold-start case. Local focused runs passed Firefox 8/8 and Chromium 8/8; hosted verification of this test fix is pending. This is React with synthetic MSW evidence, not real-backend, owner, assistive-technology, staging or production acceptance.';
evidence.knownLimits = [...new Set([
    ...evidence.knownLimits,
    'GitHub run #55 Firefox attempt 3 on SHA 3762bc09f1975aedbc33d71115a696fd903966fa finished 444/445; artifact 12014006194 shows the Toolbar layout readiness wait consumed nearly its 180-second test budget during Vite cold transform before the conversations request. The test now uses DOMContentLoaded and 300 seconds; local focused Firefox and Chromium both passed 8/8. Hosted validation for the changed SHA remains pending.',
])];

fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length, recordedAt: evidence.recordedAt }));
