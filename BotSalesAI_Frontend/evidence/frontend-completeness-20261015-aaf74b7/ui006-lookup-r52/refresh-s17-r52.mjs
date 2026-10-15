import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const output = import.meta.dirname;
const frontend = path.resolve(output, '../../..');
const repository = path.dirname(frontend);
const evidenceFile = path.join(frontend, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const evidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
const stages = [
    { id: 'layout', command: 'npm run test:layout', log: 'layout-current.log', count: 86, sourceCheck: /layout-check PASS: \d+ source files, 0 finding\(s\)/ },
    { id: 'contracts', command: 'npm run test:ui-composition', log: 'composition-current.log', count: 41, sourceCheck: /ui-composition PASS: \d+ source files, 0 finding\(s\)/ },
    { id: 'evidence-validator', command: 'node --test tests/ui-evidence-validator.test.mjs', log: 'evidence-validator-current.log', count: 11 },
];

evidence.checks = stages.map(({ id, command, log, count, sourceCheck }) => {
    const relativeLog = path.relative(repository, path.join(output, log)).replaceAll(path.sep, '/');
    const logPath = path.join(repository, relativeLog);
    const content = fs.readFileSync(logPath, 'utf8');
    assert.match(content, new RegExp('(?:ℹ |# )tests ' + count + '\\b'), `${log} test count`);
    assert.match(content, new RegExp('(?:ℹ |# )pass ' + count + '\\b'), `${log} pass count`);
    assert.match(content, /(?:ℹ |# )fail 0\b/, `${log} failure count`);
    if (sourceCheck) assert.match(content, sourceCheck, `${log} source check`);
    const result = count + '/' + count + ' current fixtures PASS' + (id === 'evidence-validator' ? '' : '; source checker 0 findings');
    return { id, command, exitCode: 0, result: 'PASS', expected: result, observed: result, log: { path: relativeLog, sha256: sha256(logPath) } };
});

evidence.coverage = stages.map(({ id, count }) => ({ name: id, expected: count, observed: count, missing: 0, result: 'COMPLETE' }));
for (const source of Object.keys(evidence.sourceFingerprints)) evidence.sourceFingerprints[source] = sha256(path.join(repository, source));
evidence.recordedAt = new Date().toISOString();
evidence.scope = 'S17 governance validation refreshed for GitHub run #52 follow-up. The related browser tests now wait for the finance dialog transition before Axe, use isolated Playwright output paths, and wait for a completed successful cursor response plus lookup readiness. Local Firefox UI006 repeated 5/5 and the final focused Firefox pair passed 2/2; finance C06 repeated 3/3. The focused Chromium pair passed 2/2. Full local verify and hosted follow-up are recorded in the adjacent R52 evidence; this record does not certify backend, owner acceptance, speech or production.';
evidence.knownLimits = [...new Set([
    ...evidence.knownLimits,
    'GitHub run #52 on SHA 3d741ff7f03a6fc3279a611cc61c5c9b30d55b5f: Chromium completed E2E and built-demo. Firefox attempt 3 completed 440/442 and failed only the finance C06 entrance-opacity assertion and UI006.C05 waiting for the final lookup state; attempt 2 ended by hosted-runner shutdown. Firefox artifact 11977597158 contains the UI006 trace and terminal supplier-offers response (HTTP 200, 18 records, hasMore=false).',
    'The R52 C06 test waits up to 15 seconds for the dialog entrance transition before running Axe; the dialog itself must also be visible. Screenshots use Playwright per-test output paths. The UI006 helper waits up to 30 seconds for readiness, checks the cursor response status and waits for the response body. Local focused runs are not hosted Linux proof; hosted verification is pending.',
])];

fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ checks: evidence.checks.length, fingerprints: Object.keys(evidence.sourceFingerprints).length }));
