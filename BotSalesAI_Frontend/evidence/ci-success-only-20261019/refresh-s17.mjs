import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '../..');
const repository = path.dirname(frontend);
const manifest = path.join(frontend, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const sourcePaths = ['.github/scripts/require-success.mjs', '.github/scripts/require-success.test.mjs',
    '.github/workflows/frontend.yml', '.github/workflows/repository-hygiene.yml'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const current = Object.fromEntries(await Promise.all(sourcePaths.map(async relative =>
    [relative, hash(await readFile(path.join(repository, relative)))])));
const preverify = process.argv.includes('--preverify'), finalize = process.argv.includes('--finalize');
assert.notEqual(preverify, finalize, 'Choose --preverify or --finalize.');
const raw = await readFile(manifest, 'utf8'), evidence = JSON.parse(raw);
assert.equal(evidence.status, 'COMPLETE');
assert.ok(Object.hasOwn(evidence.sourceFingerprints, '.github/workflows/frontend.yml'));
for (const [relative, expected] of Object.entries(evidence.sourceFingerprints)) {
    if (!sourcePaths.includes(relative))
        assert.equal(hash(await readFile(path.join(repository, relative))), expected, `Unrelated stale fingerprint: ${relative}`);
}
async function record(id, file, command, observed, patterns) {
    const bytes = await readFile(path.join(here, file)), log = bytes.toString('utf8');
    assert.equal((await readFile(path.join(here, file + '.exit'), 'utf8')).trim(), '0', file);
    const header = log.split(/\r?\n/).find(line => line.startsWith('CI_SOURCES_SHA256='));
    assert.ok(header, `${file} must identify the current source.`);
    assert.deepEqual(JSON.parse(header.slice('CI_SOURCES_SHA256='.length)), current, `${file} is stale.`);
    for (const pattern of patterns) assert.match(log, pattern, file);
    const check = { id, command, exitCode: 0, result: 'PASS', expected: observed, observed,
        log: { path: path.relative(repository, path.join(here, file)).replaceAll(path.sep, '/'), sha256: hash(bytes) } };
    const previous = evidence.checks.find(item => item.id === id);
    if (previous) Object.assign(previous, check); else evidence.checks.push(check);
    const coverage = { name: id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
    const old = evidence.coverage.find(item => item.name === id);
    if (old) Object.assign(old, coverage); else evidence.coverage.push(coverage);
}
await record('ci-success-only-unit-20261019', 'unit.log',
    'node --test --test-reporter=tap .github/scripts/check-repository-hygiene.test.mjs .github/scripts/require-success.test.mjs',
    '48/48 local Node tests pass, including skipped/neutral for each of seven producer jobs, matrix inventory, run/attempt identity and fail-closed API errors.',
    [/# tests 48/, /# pass 48/, /# fail 0/, /# skipped 0/]);
await record('ci-success-only-live-api-20261019', 'live-api.log',
    'node .github/scripts/require-success.mjs frontend; node .github/scripts/require-success.mjs repository-hygiene (read-only API, baseline runs)',
    'Current CLI validates five frontend and two hygiene producer jobs from completed baseline runs 39182884694 and 39182884686, attempt 1; this is local integration with real GitHub metadata, not hosted verification of the new commit.',
    [/"profile": "frontend"/, /"profile": "repository-hygiene"/, /"runId": 39182884694/, /"runId": 39182884686/, /"status": "PASS"/]);
if (finalize) await record('ci-success-only-verify-20261019', 'verify.log',
    'node C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js run verify (Node 24.19.0, npm 11.17.0)',
    'Full local frontend verify exits 0 with 252 Vitest cases and the existing source, contracts, build, UI composition and S17 validators. No application source changed.',
    [/Tests\s+252 passed \(252\)/, /ui-evidence PASS: S17;/, /status=COMPLETE/]);
Object.assign(evidence.sourceFingerprints, current);
const clause = 'CI success-only gates validate each required producer conclusion against exact run/attempt metadata, rejecting skipped/neutral and incomplete inventories. Local unit, baseline API integration and full frontend verify evidence are recorded under evidence/ci-success-only-20261019; new hosted runs and branch-policy enforcement are verified separately.';
if (!evidence.scope.includes(clause)) evidence.scope = evidence.scope.trim() + ' ' + clause;
evidence.recordedAt = new Date().toISOString();
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
await writeFile(manifest, JSON.stringify(evidence, null, 2).replaceAll('\n', newline) + newline, 'utf8');
console.log(JSON.stringify({ phase: preverify ? 'preverify' : 'finalize', checks: evidence.checks.length,
    coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length, sourceHashes: current }, null, 2));
