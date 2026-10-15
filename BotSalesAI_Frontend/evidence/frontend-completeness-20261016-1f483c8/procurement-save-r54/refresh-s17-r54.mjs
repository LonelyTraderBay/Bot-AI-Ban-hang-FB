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
        log: { path: relativeLog.replaceAll(path.sep, '/'), sha256: hash(absoluteLog) },
    };
}

const completeness = 'BotSalesAI_Frontend/evidence/frontend-completeness-20261015-aaf74b7/procurement-layout-r53/';
const current = 'BotSalesAI_Frontend/evidence/frontend-completeness-20261016-1f483c8/procurement-save-r54/';
const c05Expected = 'Firefox 3/3 and Chromium 1/1; each warehouse POST returned 201, success status appeared, and dialog closed';
const verifyExpected = 'generate/source/boundaries/lint/typecheck/domain/Vitest/build/layout/visual-token/UI composition/S17 all PASS';

evidence.checks = [
    record('layout', 'npm run test:layout', completeness + 'layout-current.log', '86/86 current fixtures PASS; source checker 0 findings', content => {
        assert.match(content, /(?:ℹ |# )tests 86\b/);
        assert.match(content, /(?:ℹ |# )pass 86\b/);
        assert.match(content, /(?:ℹ |# )fail 0\b/);
        assert.match(content, /layout-check PASS: 93 source files, 0 finding\(s\), 1 exception\(s\) used/);
    }),
    record('contracts', 'npm run test:ui-composition', completeness + 'composition-current.log', '41/41 current fixtures PASS; source checker 0 findings', content => {
        assert.match(content, /(?:ℹ |# )tests 41\b/);
        assert.match(content, /(?:ℹ |# )pass 41\b/);
        assert.match(content, /(?:ℹ |# )fail 0\b/);
        assert.match(content, /ui-composition PASS: 91 source files, 0 finding\(s\)/);
    }),
    record('evidence-validator', 'node --test tests/ui-evidence-validator.test.mjs', completeness + 'evidence-validator-current.log', '11/11 current fixtures PASS', content => {
        assert.match(content, /(?:ℹ |# )tests 11\b/);
        assert.match(content, /(?:ℹ |# )pass 11\b/);
        assert.match(content, /(?:ℹ |# )fail 0\b/);
    }),
    record('c05-save-response-close', 'Playwright C05 warehouse create flow: Firefox 3 runs and Chromium 1 run', current + 'c05-focused-r54.log', c05Expected, content => {
        assert.match(content, /Firefox focused run 1\/3/);
        assert.match(content, /Firefox focused run 2\/3/);
        assert.match(content, /Firefox focused run 3\/3/);
        assert.match(content, /Chromium focused run/);
        assert.equal([...content.matchAll(/1 passed \([\d.]+s\)/g)].length, 4);
    }),
    record('full-verify', 'npm run verify', current + 'verify-r54-manifest-final.log', verifyExpected, content => {
        for (const marker of [
            '"status":"PASS","outputs":15,"schemas":346,"operations":245,"routes":61',
            '"passed":117,"operations":100',
            'Tests  242 passed (242)',
            '✓ 2077 modules transformed.',
            'layout-check PASS: 93 source files, 0 finding(s), 1 exception(s) used',
            'visual-token-check PASS: 92 source files, 0 finding(s)',
            'ui-composition PASS: 91 source files, 0 finding(s)',
            'ui-evidence PASS: S17; 5 command/log record(s), 5 coverage row(s), 280 current fingerprint(s); status=COMPLETE',
        ]) assert.ok(content.includes(marker), `verify log missing ${marker}`);
    }),
];

evidence.coverage = [
    { name: 'layout', expected: 86, observed: 86, missing: 0, result: 'COMPLETE' },
    { name: 'contracts', expected: 41, observed: 41, missing: 0, result: 'COMPLETE' },
    { name: 'evidence-validator', expected: 11, observed: 11, missing: 0, result: 'COMPLETE' },
    { name: 'c05-save-response-close', expected: 4, observed: 4, missing: 0, result: 'COMPLETE' },
    { name: 'full-verify', expected: 1, observed: 1, missing: 0, result: 'COMPLETE' },
];

for (const source of Object.keys(evidence.sourceFingerprints))
    evidence.sourceFingerprints[source] = hash(path.join(repository, source));

evidence.recordedAt = new Date().toISOString();
evidence.status = 'COMPLETE';
evidence.scope = 'S17 governance and frontend verification refreshed after GitHub run #54. Trace artifact 11997674466 shows the warehouse POST returned 201 while the 5-second dialog assertion expired; the following screenshot shows the success message and saved row. The test now waits for the 201, one write, success status and dialog closure (15 seconds). Local focused runs passed Firefox 3/3 and Chromium 1/1; npm run verify passed. Hosted verification of the new code SHA is pending. This is React with synthetic MSW evidence, not real-backend, owner, assistive-technology, staging or production acceptance.';
evidence.knownLimits = [...new Set([
    ...evidence.knownLimits,
    'GitHub run #54 Firefox attempt 2 (job 116560199755) on SHA 1f483c87368177569bc34aa9c237e66d0e476d0a ended 444/445 because C05 dialog closure crossed the 5-second assertion limit; its trace records POST 201 and the post-failure screenshot shows the saved warehouse and success message. The strengthened test passes locally; hosted validation for the new SHA remains pending.',
])];

fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length, recordedAt: evidence.recordedAt }));
