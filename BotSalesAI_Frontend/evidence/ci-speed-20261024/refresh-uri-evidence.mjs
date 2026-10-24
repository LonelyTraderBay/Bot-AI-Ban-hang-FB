import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const prefix = 'BotSalesAI_Frontend/';
const lockName = prefix + 'package-lock.json';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const lock = JSON.parse(fs.readFileSync(path.join(repo, lockName)));
const original = JSON.parse(execFileSync('git', ['show', '90b25da872092fe2c7b0414dfb4507679268a9b1:' + lockName], { cwd: repo, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }));
assert.equal(original.packages['node_modules/fast-uri'].version, '3.1.8');
assert.equal(lock.packages['node_modules/fast-uri'].version, '3.1.9');
assert.equal(JSON.parse(fs.readFileSync(path.join(repo, prefix + 'node_modules/fast-uri/package.json'))).version, '3.1.9');
delete original.packages['node_modules/fast-uri'];
delete lock.packages['node_modules/fast-uri'];
assert.deepEqual(lock, original, 'Only the transitive fast-uri lock entry may change.');

const manifest = path.join(repo, prefix + 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const raw = fs.readFileSync(manifest, 'utf8'), evidence = JSON.parse(raw);
const owned = [lockName, prefix + 'STACK_LOCK.md', prefix + 'evidence/ci-speed-20261024/refresh-uri-evidence.mjs'];
for (const [name, hash] of Object.entries(evidence.sourceFingerprints))
    if (!owned.includes(name)) assert.equal(digest(fs.readFileSync(path.join(repo, name))), hash, 'Unrelated stale fingerprint: ' + name);
function record(id, file, patterns, expected) {
    const bytes = fs.readFileSync(path.join(here, file));
    const text = bytes.toString('utf8').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
    const header = JSON.parse(text.split(/\r?\n/)[0]);
    assert.equal(header.inputs[lockName], digest(fs.readFileSync(path.join(repo, lockName))), 'Stale lockfile in ' + file);
    assert.match(text, /COMMAND_EXIT=0/);
    for (const pattern of patterns) assert.match(text, pattern, file);
    const check = { id, command: JSON.stringify(header.command), exitCode: 0, result: 'PASS', expected, observed: expected,
        log: { path: prefix + 'evidence/ci-speed-20261024/' + file, sha256: digest(bytes) } };
    const at = evidence.checks.findIndex(c => c.id === id);
    if (at < 0) evidence.checks.push(check); else evidence.checks[at] = check;
    const coverage = { name: id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
    const ci = evidence.coverage.findIndex(c => c.name === id);
    if (ci < 0) evidence.coverage.push(coverage); else evidence.coverage[ci] = coverage;
}
record('ci-speed-uri-audit-20261024', 'uri-audit.log', [/"vulnerabilities":\s*\{\s*\}/, /"total":\s*0/],
    'The lock resolves fast-uri 3.1.9 only, npm ci installs that version and audit at level low reports zero vulnerabilities.');
if (process.argv.includes('--finalize')) record('ci-speed-uri-verify-20261024', 'uri-verify.log', [/256 passed/, /ui-evidence PASS: S17/, /status=COMPLETE/],
    'Full verify passes with the patched fast-uri lock, unchanged Ajv and the current CI/harness.');
for (const name of owned) evidence.sourceFingerprints[name] = digest(fs.readFileSync(path.join(repo, name)));
const scope = 'CI speed audit repair 20261024: the first hosted run on 90b25da8 failed the unchanged low audit gate for fast-uri 3.1.8. Only that transitive lock entry is patched to 3.1.9 within Ajv 8.20.0 range. Earlier local CI-speed logs retain their original lock inputs; new audit/full verify and final hosted/closing CI must bind the patched revision.';
if (!evidence.scope.includes(scope)) evidence.scope += ' ' + scope;
evidence.recordedAt = new Date().toISOString();
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
fs.writeFileSync(manifest, JSON.stringify(evidence, null, 2).replaceAll('\n', nl) + nl);
console.log(JSON.stringify({ fastUri: '3.1.9', checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length }));
