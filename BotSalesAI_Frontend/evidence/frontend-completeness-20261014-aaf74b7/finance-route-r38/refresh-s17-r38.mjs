import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const output = import.meta.dirname;
const frontend = path.resolve(output, '../../..');
const repository = path.dirname(frontend);
const evidenceFile = path.join(frontend, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

const stages = [
    { id: 'layout', command: 'npm run test:layout', log: 'layout-r38.log', count: 86, sourceCheck: /layout-check PASS: \d+ source files, 0 finding\(s\)/ },
    { id: 'contracts', command: 'npm run test:ui-composition', log: 'composition-r38.log', count: 41, sourceCheck: /ui-composition PASS: \d+ source files, 0 finding\(s\)/ },
    { id: 'evidence-validator', command: 'node --test tests/ui-evidence-validator.test.mjs', log: 'evidence-validator-r38.log', count: 11 },
];

const evidence = readJson(evidenceFile);
evidence.checks = stages.map(({ id, command, log, count, sourceCheck }) => {
    const relativeLog = path.relative(repository, path.join(output, log)).replaceAll(path.sep, '/');
    const logPath = path.join(repository, relativeLog);
    const content = fs.readFileSync(logPath, 'utf8');
    assert.match(content, new RegExp('(?:ℹ |# )tests ' + count + '\\b'), `${log} test count`);
    assert.match(content, new RegExp('(?:ℹ |# )pass ' + count + '\\b'), `${log} pass count`);
    assert.match(content, /(?:ℹ |# )fail 0\b/, `${log} failure count`);
    if (sourceCheck) assert.match(content, sourceCheck, `${log} source check`);
    const result = count + '/' + count + ' current fixtures PASS' + (id === 'evidence-validator' ? '' : '; source checker 0 findings');
    return {
        id,
        command,
        exitCode: 0,
        result: 'PASS',
        expected: result,
        observed: result,
        log: { path: relativeLog, sha256: sha256(logPath) },
    };
});

evidence.coverage = stages.map(({ id, count }) => ({ name: id, expected: count, observed: count, missing: 0, result: 'COMPLETE' }));
for (const source of Object.keys(evidence.sourceFingerprints)) {
    evidence.sourceFingerprints[source] = sha256(path.join(repository, source));
}
evidence.recordedAt = new Date().toISOString();
evidence.scope = 'Current S17 governance validation only: 86 layout, 41 composition/shared-contract and 11 provenance fixtures rerun after R38 Finance route-readiness test hardening. Browser behavior evidence is recorded separately; this does not certify backend, owner acceptance, speech or production.';
evidence.knownLimits = [...new Set([
    ...evidence.knownLimits,
    'GitHub run #38 tested the preceding Finance readiness-test source at SHA e781934d316aa39a3f4a73997553a4bb013750ef and had one Firefox route-heading timeout; it is historical for R38 source.',
])];

fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ checks: evidence.checks.length, fingerprints: Object.keys(evidence.sourceFingerprints).length }));
