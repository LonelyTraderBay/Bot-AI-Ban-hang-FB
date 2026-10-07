import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateUiEvidence } from '../scripts/validate-ui-evidence.mjs';

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-evidence-validator-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const source = path.join(root, 'source.tsx');
    fs.writeFileSync(source, 'export const source = true;\n');
    const fingerprint = createHash('sha256').update(fs.readFileSync(source)).digest('hex');
    const log = path.join(root, 'command.log');
    fs.writeFileSync(log, 'test command passed\n');
    const logHash = createHash('sha256').update(fs.readFileSync(log)).digest('hex');
    return {
        root,
        evidence: {
            schemaVersion: 1,
            step: 'S17',
            recordedAt: '2026-10-07T00:00:00.000Z',
            scope: 'Synthetic frontend evidence fixture',
            status: 'IN_PROGRESS',
            checks: [{ id: 'layout', command: 'npm run test:layout', exitCode: 0, result: 'PASS', expected: '0 findings', observed: '0 findings', log: { path: 'command.log', sha256: logHash } }],
            coverage: [
                { name: 'source-files', expected: 2, observed: 2, missing: 0, result: 'COMPLETE' },
                { name: 'rendered-routes', expected: 4, observed: 3, missing: 1, result: 'OPEN', reason: 'Final route-state acceptance remains open.' },
                { name: 'hosted-ci', expected: 0, observed: 0, missing: 0, result: 'N/A', reason: 'No hosted run is part of this local evidence.' },
            ],
            baseline: { status: 'N/A', reason: 'This fixture tests evidence governance, not a rendered UI source change.' },
            sourceFingerprints: { 'source.tsx': fingerprint },
            knownLimits: ['A passing schema check does not establish that the captured browser output is truthful.'],
        },
    };
}

test('accepts current fingerprints, honest open coverage, and explained N/A', t => {
    const { root, evidence } = fixture(t);
    assert.deepEqual(validateUiEvidence(evidence, root), []);
});

test('rejects a stale source fingerprint', t => {
    const { root, evidence } = fixture(t);
    fs.appendFileSync(path.join(root, 'source.tsx'), '// changed\n');
    assert.ok(validateUiEvidence(evidence, root).some(error => error.includes('is stale')));
});

test('rejects a stale command log', t => {
    const { root, evidence } = fixture(t);
    fs.appendFileSync(path.join(root, 'command.log'), 'changed\n');
    assert.match(validateUiEvidence(evidence, root).join('\n'), /checks\[0\]\.log is stale/);
});

test('rejects missing, absolute, and escaping source paths', t => {
    const { root, evidence } = fixture(t);
    evidence.sourceFingerprints = { 'missing.tsx': '0'.repeat(64), [path.join(root, 'source.tsx')]: '0'.repeat(64), '../outside.tsx': '0'.repeat(64) };
    const errors = validateUiEvidence(evidence, root).join('\n');
    assert.match(errors, /does not identify a current file/);
    assert.match(errors, /repository-relative path/);
    assert.match(errors, /escapes the repository root/);
});

test('rejects unrun, missing, duplicate, and nonzero command results marked PASS', t => {
    const { root, evidence } = fixture(t);
    evidence.checks.push({ id: 'layout', command: '', exitCode: 2, result: 'PASS', expected: '', observed: '' });
    const errors = validateUiEvidence(evidence, root).join('\n');
    assert.match(errors, /duplicates layout/);
    assert.match(errors, /claims PASS with nonzero exitCode/);
    assert.match(errors, /checks\[1\]\.command is required/);
});

test('rejects PASS when expected and observed results differ', t => {
    const { root, evidence } = fixture(t);
    evidence.checks[0].observed = 'one finding';
    assert.match(validateUiEvidence(evidence, root).join('\n'), /expected and observed differ/);
});

test('rejects inconsistent coverage and N/A without a reason', t => {
    const { root, evidence } = fixture(t);
    evidence.coverage[0].missing = 1;
    evidence.coverage[2].reason = '';
    evidence.coverage[1].reason = '';
    const errors = validateUiEvidence(evidence, root).join('\n');
    assert.match(errors, /missing does not match/);
    assert.match(errors, /N\/A requires a reason/);
    assert.match(errors, /OPEN requires the exact remaining scope/);
});

test('rejects a baseline falsely dated after implementation started and detects changed baseline artifacts', t => {
    const { root, evidence } = fixture(t);
    const baselinePath = path.join(root, 'baseline.json');
    fs.writeFileSync(baselinePath, '{"before":true}\n');
    const baselineHash = createHash('sha256').update(fs.readFileSync(baselinePath)).digest('hex');
    evidence.baseline = {
        status: 'CAPTURED',
        capturedAt: '2026-10-07T00:02:00.000Z',
        implementationStartedAt: '2026-10-07T00:01:00.000Z',
        artifacts: [{ path: 'baseline.json', sha256: baselineHash }],
        sourceFingerprints: { 'source.tsx': 'a'.repeat(64) },
    };
    assert.match(validateUiEvidence(evidence, root).join('\n'), /not earlier than implementationStartedAt/);
    evidence.baseline.capturedAt = '2026-10-07T00:00:00.000Z';
    fs.appendFileSync(baselinePath, 'changed\n');
    assert.match(validateUiEvidence(evidence, root).join('\n'), /baseline\.artifacts\[0\] is stale/);
});

test('COMPLETE cannot contain open coverage or failed commands', t => {
    const { root, evidence } = fixture(t);
    evidence.status = 'COMPLETE';
    evidence.checks[0].result = 'NOT_RUN';
    assert.match(validateUiEvidence(evidence, root).join('\n'), /not passing in COMPLETE evidence/);
    evidence.checks[0].result = 'PASS';
    assert.match(validateUiEvidence(evidence, root).join('\n'), /remains OPEN in COMPLETE evidence/);
});

test('S19 must explicitly reconcile files, APIs, routes, rendered routes, slots, and states', t => {
    const { root, evidence } = fixture(t);
    evidence.step = 'S19';
    assert.match(validateUiEvidence(evidence, root).join('\n'), /S19 coverage is missing required domain shared-api-exports/);
    for (const name of ['shared-api-exports', 'route-mappings', 'slots', 'states', 'baseline-records']) {
        evidence.coverage.push({ name, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' });
    }
    assert.deepEqual(validateUiEvidence(evidence, root), []);
    evidence.coverage.find(item => item.name === 'states').expected = 0;
    evidence.coverage.find(item => item.name === 'states').observed = 0;
    assert.match(validateUiEvidence(evidence, root).join('\n'), /cannot be empty to claim completion/);
});

test('rejects malformed top-level evidence instead of treating missing fields as success', t => {
    const { root } = fixture(t);
    assert.ok(validateUiEvidence({}, root).length >= 8);
});
