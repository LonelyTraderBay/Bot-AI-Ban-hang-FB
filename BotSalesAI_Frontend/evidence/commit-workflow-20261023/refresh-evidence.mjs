import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const evidencePath = path.join(repo, 'BotSalesAI_Frontend/evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const raw = fs.readFileSync(evidencePath, 'utf8');
const evidence = JSON.parse(raw);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inputs = ['.github/workflows/frontend.yml', '.github/workflows/repository-hygiene.yml',
    '.github/scripts/require-success.mjs', '.github/scripts/require-success.test.mjs', '.github/CI_POLICY.md',
    'BotSalesAI_Frontend/tests/ui-shared-api-contract.test.mjs'];
const owned = [...inputs, 'BotSalesAI_Frontend/evidence/commit-workflow-20261023/refresh-evidence.mjs'];
for (const [name, digest] of Object.entries(evidence.sourceFingerprints)) {
    if (!owned.includes(name)) assert.equal(hash(fs.readFileSync(path.join(repo, name))), digest, `Unrelated stale input: ${name}`);
}
function record(id, file, expected, patterns) {
    const bytes = fs.readFileSync(path.join(here, file));
    const log = bytes.toString('utf8');
    const header = JSON.parse(log.split(/\r?\n/)[0]);
    for (const name of inputs) assert.equal(header.inputs[name], hash(fs.readFileSync(path.join(repo, name))), `Stale ${file}: ${name}`);
    assert.match(log, /COMMAND_EXIT=0/);
    for (const pattern of patterns) assert.match(log, pattern);
    const check = { id, command: JSON.stringify(header.command), exitCode: 0, result: 'PASS', expected, observed: expected,
        log: { path: `BotSalesAI_Frontend/evidence/commit-workflow-20261023/${file}`, sha256: hash(bytes) } };
    const at = evidence.checks.findIndex(item => item.id === id);
    if (at < 0) evidence.checks.push(check); else evidence.checks[at] = check;
    const coverage = { name: id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
    const ci = evidence.coverage.findIndex(item => item.name === id);
    if (ci < 0) evidence.coverage.push(coverage); else evidence.coverage[ci] = coverage;
}
record('commit-ci-contracts-20261023', 'repository-contracts.log', 'All 76 repository and success-only gate cases pass.', [/pass 76/, /fail 0/]);
record('commit-frontend-contracts-20261023', 'frontend-contracts.log', 'All 14 frontend contract cases pass, including the six-shard workflow consumer.', [/pass 14/, /fail 0/]);
if (process.argv.includes('--finalize')) record('commit-workflow-verify-20261023', 'verify.log', 'Full frontend verify passes with the updated CI wiring.', [/256 passed/, /ui-evidence PASS: S17/]);
for (const name of owned) evidence.sourceFingerprints[name] = hash(fs.readFileSync(path.join(repo, name)));
const scope = ' Commit workflow 20261023: PR and main push run full checks without duplicate feature-push CI. Chromium and Firefox each use three file shards; the preserved Chromium-all context and final gate validate every producer against current run/attempt metadata. Browser counts, source/runtime and main protection remain unchanged. Local workflow-contract proof does not replace hosted closing CI or measured runtime.';
if (!evidence.scope.includes(scope)) evidence.scope += scope;
evidence.recordedAt = new Date().toISOString();
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2).replaceAll('\n', newline) + newline);
console.log(JSON.stringify({ checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length }));
