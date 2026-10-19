import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const relativeDir = 'evidence/frontend-ui-consistency-20261017/UIC06';
const dir = path.join(root, relativeDir);
const expectedBaselineFailures = new Map([
    ['baseline-layout.log.exit', '1: checker ran before owner setup generated mockServiceWorker.js'],
    ['baseline-composition.log.exit', '1: checker ran before owner setup generated mockServiceWorker.js'],
]);
const externalEvidencePaths = [
    'evidence/boundaries.json',
    'evidence/domain-tests.json',
    'evidence/source-check.json',
    'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S12-query-state-R09-chromium-after-profile-20261017-120016-93172.json',
    'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S12-query-state-R09-firefox-after-profile-20261017-120702-64748.json',
    'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S12-query-state-R11-chromium-after-profile-20261017-120016-93172.json',
    'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S12-query-state-R11-firefox-after-profile-20261017-120702-64748.json',
    'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S15-positive-catalog-query-fragment-chromium-20261017-120016-93172.json',
    'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S15-positive-catalog-query-fragment-firefox-20261017-120702-64748.json',
    'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S15-positive-dashboard-nested-surface-chromium-20261017-120016-93172.json',
    'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S15-positive-dashboard-nested-surface-firefox-20261017-120702-64748.json',
    'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S15-positive-knowledge-wrapped-actions-chromium-20261017-120016-93172.json',
    'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S15-positive-knowledge-wrapped-actions-firefox-20261017-120702-64748.json',
];
const files = fs.readdirSync(dir).filter(name => name !== 'proof-manifest.json').sort();
const entries = files.map(name => {
    const file = path.join(dir, name);
    const bytes = fs.readFileSync(file);
    const entry = {
        path: `${relativeDir}/${name}`,
        sizeBytes: bytes.length,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    };
    if (name.endsWith('.log.exit')) {
        const code = Number(bytes.toString('utf8').trim());
        assert.ok(Number.isInteger(code), `${name} must contain a numeric exit code`);
        const log = path.join(dir, name.slice(0, -'.exit'.length));
        assert.ok(fs.existsSync(log), `${name} must have its original command log`);
        entry.exitCode = code;
        if (expectedBaselineFailures.has(name)) {
            assert.equal(code, 1, `${name} is retained as the pre-setup baseline`);
            entry.classification = 'EXPECTED_BASELINE_FAILURE';
            entry.explanation = expectedBaselineFailures.get(name);
        } else {
            assert.equal(code, 0, `${name} is a required UIC06 PASS receipt`);
            entry.classification = 'PASS';
        }
    }
    return entry;
});
for (const relativePath of externalEvidencePaths) {
    const file = path.join(root, relativePath);
    assert.ok(fs.existsSync(file), `missing generated evidence: ${relativePath}`);
    const bytes = fs.readFileSync(file);
    entries.push({
        path: relativePath,
        sizeBytes: bytes.length,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        classification: 'GENERATED_VERIFICATION_EVIDENCE',
    });
}

for (const name of expectedBaselineFailures.keys()) assert.ok(files.includes(name), `missing retained baseline: ${name}`);
assert.equal(fs.readFileSync(path.join(dir, 'full-verify.log.exit'), 'utf8').trim(), '0');
const api = JSON.parse(fs.readFileSync(path.join(dir, 'shared-api-closure.json'), 'utf8'));
assert.equal(api.summary.publicComponentAndCompositionExports, 28);
assert.equal(api.summary.directRenderedExports, 28);
assert.equal(api.summary.dispositionCoverage, 28);
for (const name of ['browser-profiles-chromium.log', 'browser-profiles-firefox.log']) {
    assert.match(fs.readFileSync(path.join(dir, name), 'utf8'), /30 passed/);
}
for (const name of ['collection-0-1-2-3-chromium.log', 'collection-0-1-2-3-firefox.log']) {
    assert.match(fs.readFileSync(path.join(dir, name), 'utf8'), /10 passed/);
}
assert.match(fs.readFileSync(path.join(dir, 'layout-post-setup.log'), 'utf8'), /94 source files, 0 finding/);
assert.match(fs.readFileSync(path.join(dir, 'composition-post-setup.log'), 'utf8'), /92 source files, 0 finding/);
assert.match(fs.readFileSync(path.join(dir, 'REPORT.md'), 'utf8'), /LOCAL VERIFIED/);

const plan = path.join(root, 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md');
entries.push({
    path: 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md',
    sizeBytes: fs.statSync(plan).size,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(plan)).digest('hex'),
    classification: 'CANONICAL_PLAN',
});
const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    scope: 'UIC06 local evidence files, generated source-check receipts, S12/S15 browser observations, and canonical plan snapshot; raw logs are hashed as captured; baseline pre-setup failures remain explicitly classified.',
    summary: {
        evidenceFilesHashed: entries.filter(entry => entry.path.startsWith(`${relativeDir}/`)).length,
        additionalEvidenceFilesHashed: entries.filter(entry => entry.classification === 'GENERATED_VERIFICATION_EVIDENCE').length,
        commandReceipts: entries.filter(entry => entry.exitCode !== undefined).length,
        requiredCommandPasses: entries.filter(entry => entry.classification === 'PASS' && entry.exitCode !== undefined).length,
        expectedPreSetupFailures: entries.filter(entry => entry.classification === 'EXPECTED_BASELINE_FAILURE').length,
        publicApis: api.summary.publicComponentAndCompositionExports,
        directRenderedApis: api.summary.directRenderedExports,
        sourceFingerprintCount: Object.keys(api.sourceFingerprints).length,
    },
    entries,
};
const output = path.join(dir, 'proof-manifest.json');
fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(root, output), summary: manifest.summary }, null, 2));
