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
evidence.scope = 'S17 governance validation refreshed after GitHub run #53. The Procurement R44-R47 responsive matrix now has one page/test per route and retains all five widths. Local focused Firefox/Chromium E2E repeated three times passed 30/30; full local npm run verify and hosted validation of the new revision are pending. This record does not certify backend, owner acceptance, assistive-technology acceptance or production.';
evidence.knownLimits = [...new Set([
    ...evidence.knownLimits,
    'GitHub run #53 on SHA 7b5a9b2213859aed9937ff248ddd1bab905f5197 passed npm run verify and Chromium E2E; Firefox reached 441/442 and timed out in the single Procurement responsive-layout test while navigating the route matrix. This result belongs to the previous source revision.',
    'The Procurement matrix now isolates each R44-R47 route in a separate Playwright test/page, loads each route once, and checks 320, 390, 768, 1280 and 1440 CSS px. Local focused repeat-3 verification passed 30/30; GitHub validation for this revision is pending.',
])];

fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ checks: evidence.checks.length, fingerprints: Object.keys(evidence.sourceFingerprints).length }));
