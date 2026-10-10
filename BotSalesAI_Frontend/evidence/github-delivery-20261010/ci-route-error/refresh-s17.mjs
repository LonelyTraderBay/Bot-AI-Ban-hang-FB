import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const output = import.meta.dirname;
const repository = path.resolve(output, '../../../..');
const manifestFile = path.join(repository, 'BotSalesAI_Frontend/evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const relative = file => path.relative(repository, file).replaceAll('\\', '/');
const evidence = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const baseline = path.join(output, 's17-before.json');
if (!fs.existsSync(baseline)) fs.copyFileSync(manifestFile, baseline);
const stages = [
    ['contracts', 'npm run test:ui-composition', 'composition.log', 41],
    ['layout', 'npm run test:layout', 'layout.log', 86],
    ['evidence-validator', 'node --test tests/ui-evidence-validator.test.mjs', 'validator-fixtures.log', 11],
];
evidence.checks = stages.map(([id, command, file, expected]) => {
    const log = path.join(output, file);
    const content = fs.readFileSync(log, 'utf8');
    assert.match(content, new RegExp('(?:ℹ |# )tests ' + expected + '\\b'));
    assert.match(content, new RegExp('(?:ℹ |# )pass ' + expected + '\\b'));
    assert.match(content, /(?:ℹ |# )fail 0\b/);
    assert.doesNotMatch(content, /(?:✖|UI_EVIDENCE_INVALID|not ok)/);
    if (id === 'contracts') assert.match(content, /ui-composition PASS: \d+ source files, 0 finding\(s\)/);
    if (id === 'layout') assert.match(content, /layout-check PASS: \d+ source files, 0 finding\(s\)/);
    return { id, command, exitCode: 0, result: 'PASS', expected: `${expected}/${expected} fixtures PASS`, observed: `${expected}/${expected} fixtures PASS`, log: { path: relative(log), sha256: digest(log) } };
});
evidence.coverage = stages.map(([name, , , expected]) => ({ name, expected, observed: expected, missing: 0, result: 'COMPLETE' }));
for (const file of Object.keys(evidence.sourceFingerprints)) evidence.sourceFingerprints[file] = digest(path.join(repository, file));
for (const file of ['.github/workflows/frontend.yml', '.gitattributes']) evidence.sourceFingerprints[file] = digest(path.join(repository, file));
evidence.recordedAt = new Date().toISOString();
evidence.scope = 'Fresh S17 governance regression execution after isolating the 57 canonical route error cases: exact source/log hashes, 41 shared/composition fixtures, 86 layout fixtures and 11 evidence-validator fixtures. The 57 route assertions per browser are recorded separately; this is not canonical FE checkpoint revalidation or backend/production acceptance.';
evidence.knownLimits = [...new Set([...evidence.knownLimits, 'The delivery refresh does not re-certify the historical FE ledger, S19 browser matrix, human acceptance, screen-reader speech, Backend or production. Hosted CI is reported separately from its actual run.'])];
fs.writeFileSync(manifestFile, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ updated: relative(manifestFile), fingerprints: Object.keys(evidence.sourceFingerprints).length, checks: evidence.checks.length }));
