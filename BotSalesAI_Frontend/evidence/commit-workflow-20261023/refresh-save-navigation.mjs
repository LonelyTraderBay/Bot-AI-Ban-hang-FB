import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '../../..');
const file = path.join(repo, 'BotSalesAI_Frontend/evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const raw = fs.readFileSync(file, 'utf8'), evidence = JSON.parse(raw);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inputs = ['BotSalesAI_Frontend/tests/fe010.spec.ts', '.github/workflows/frontend.yml', '.github/CI_POLICY.md', 'BotSalesAI_Frontend/tests/ui-shared-api-contract.test.mjs'];
const owned = [...inputs, 'BotSalesAI_Frontend/evidence/commit-workflow-20261023/refresh-save-navigation.mjs'];
for (const [name, digest] of Object.entries(evidence.sourceFingerprints)) if (!owned.includes(name)) assert.equal(hash(fs.readFileSync(path.join(repo, name))), digest, `Unrelated stale source: ${name}`);
function record(id, logFile, expected, patterns) {
    const bytes = fs.readFileSync(path.join(here, logFile));
    const text = bytes.toString('utf8').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
    const header = JSON.parse(text.split(/\r?\n/)[0]);
    for (const name of inputs) assert.equal(header.inputs[name], hash(fs.readFileSync(path.join(repo, name))), `Stale ${logFile}: ${name}`);
    assert.match(text, /COMMAND_EXIT=0/);
    for (const pattern of patterns) assert.match(text, pattern);
    const check = { id, command: JSON.stringify(header.command), result: 'PASS', exitCode: 0, expected, observed: expected,
        log: { path: `BotSalesAI_Frontend/evidence/commit-workflow-20261023/${logFile}`, sha256: hash(bytes) } };
    const at = evidence.checks.findIndex(item => item.id === id);
    if (at < 0) evidence.checks.push(check); else evidence.checks[at] = check;
    const row = { name: id, result: 'COMPLETE', expected: 1, observed: 1, missing: 0 };
    const ci = evidence.coverage.findIndex(item => item.name === id);
    if (ci < 0) evidence.coverage.push(row); else evidence.coverage[ci] = row;
}
record('save-navigation-browser-20261024', 'save-navigation-target.log', 'Six repeated Chromium/Firefox FE010 save/draft/payload/navigation cases pass.', [/6 passed/]);
record('save-feedback-contracts-20261024', 'save-workflow-contracts.log', 'All 90 repository/gate/frontend contract cases pass with early shard failure feedback.', [/pass 90/, /fail 0/]);
if (process.argv.includes('--finalize')) record('save-feedback-verify-20261024', 'save-feedback-verify.log', 'Full verify passes after saved-route readiness and early shard feedback changes.', [/256 passed/, /ui-evidence PASS: S17/]);
for (const name of owned) evidence.sourceFingerprints[name] = hash(fs.readFileSync(path.join(repo, name)));
const scope = ' Saved-route readiness 20261024: FE010 waits for the canonical detail title and Shell main focus before the post-save list click, because createdProductId can trigger its GET before the router focus commit. Application code and payload/draft checks are retained. Browser shards stop after their first failure for prompt feedback while other shards continue; green partitions still run every case and success-only gates remain strict. Failed a7 closing CI is retained separately, not counted as passing evidence.';
if (!evidence.scope.includes(scope)) evidence.scope += scope;
evidence.recordedAt = new Date().toISOString();
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
fs.writeFileSync(file, JSON.stringify(evidence, null, 2).replaceAll('\n', nl) + nl);
console.log(JSON.stringify({ checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length }));
