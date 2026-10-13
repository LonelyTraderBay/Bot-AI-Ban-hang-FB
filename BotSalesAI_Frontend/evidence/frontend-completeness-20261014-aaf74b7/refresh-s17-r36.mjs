import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const output = import.meta.dirname;
const frontend = path.resolve(output, '../..');
const repository = path.dirname(frontend);
const evidenceFile = path.join(frontend, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const evidence = readJson(evidenceFile);

const stages = [
    ['layout', 'density-r36-layout', 86],
    ['contracts', 'density-r36-composition', 41],
    ['evidence-validator', 'density-r36-evidence-validator', 11],
];

evidence.checks = stages.map(([id, stage, count]) => {
    const record = readJson(path.join(output, stage + '.record.json'));
    assert.equal(record.exitCode, 0, `${stage} must pass`);
    assert.deepEqual(record.sourceDrift, [], `${stage} must have a stable source snapshot`);

    const logFile = path.join(repository, record.log.path);
    assert.equal(sha256(logFile), record.log.sha256, `${stage} log fingerprint`);
    for (const [source, fingerprint] of Object.entries(record.sourceFingerprints)) {
        assert.equal(sha256(path.join(repository, source)), fingerprint, `${stage} source fingerprint: ${source}`);
    }

    const log = fs.readFileSync(logFile, 'utf8');
    assert.match(log, new RegExp('(?:ℹ |# )tests ' + count + '\\b'));
    assert.match(log, new RegExp('(?:ℹ |# )pass ' + count + '\\b'));
    assert.match(log, /(?:ℹ |# )fail 0\b/);
    if (id === 'layout') assert.match(log, /layout-check PASS: \d+ source files, 0 finding\(s\)/);
    if (id === 'contracts') assert.match(log, /ui-composition PASS: \d+ source files, 0 finding\(s\)/);

    const result = count + '/' + count + ' current fixtures PASS' + (id === 'evidence-validator' ? '' : '; source checker 0 findings');
    return { id, command: record.command, exitCode: 0, result: 'PASS', expected: result, observed: result, log: record.log };
});

evidence.coverage = stages.map(([name, , count]) => ({ name, expected: count, observed: count, missing: 0, result: 'COMPLETE' }));
for (const source of Object.keys(evidence.sourceFingerprints)) {
    evidence.sourceFingerprints[source] = sha256(path.join(repository, source));
}
for (const source of [
    'BotSalesAI_Frontend/tests/frontend-completeness.spec.ts',
    'BotSalesAI_Frontend/tests/session/playwright-run-isolation.test.mjs',
    'BotSalesAI_Frontend/apps/web/tests/command-read-scope.test.ts',
    'BotSalesAI_Frontend/apps/web/tests/pager-retention.test.tsx',
]) evidence.sourceFingerprints[source] = sha256(path.join(repository, source));

evidence.recordedAt = new Date().toISOString();
evidence.scope = 'Current S17 governance validation only: 86 layout, 41 composition/shared-contract and 11 provenance fixtures executed on this source, including the R35 Orders readiness correction and R36 viewport-split route-matrix test. Browser proof is recorded separately; prior browser records remain historical in s17-before-completion.json.';
evidence.knownLimits = [...new Set([
    ...evidence.knownLimits,
    'This refresh verifies governance fixtures only. Full FE/browser/native/cold evidence is separate; Backend, owner acceptance, speech and hosted CI are not certified.',
])];

fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ checks: evidence.checks.length, fingerprints: Object.keys(evidence.sourceFingerprints).length }));
