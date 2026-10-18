import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '../../../..');
const repository = path.dirname(frontend);
const manifest = path.join(frontend, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const sourcePath = 'BotSalesAI_Frontend/tests/frontend-corrections.spec.ts';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const source = await readFile(path.join(repository, sourcePath));
const sourceHash = hash(source);
const preverify = process.argv.includes('--preverify'), finalize = process.argv.includes('--finalize');
assert.notEqual(preverify, finalize, 'Choose --preverify or --finalize.');
assert.doesNotMatch(source.toString('utf8'), /setOperationDelay/);
assert.equal((source.toString('utf8').match(/await whileMutationPending\(/g) || []).length, 5);
const negative = await readFile(path.join(here, 'ci-failure-excerpt.log'), 'utf8');
assert.match(negative, /toBeEnabled\(\) failed/); assert.match(negative, /196 passed \(/);
const raw = await readFile(manifest, 'utf8'), evidence = JSON.parse(raw);
assert.equal(evidence.status, 'COMPLETE'); assert.ok(Object.hasOwn(evidence.sourceFingerprints, sourcePath));
const unrelated = [];
for (const [relative, expected] of Object.entries(evidence.sourceFingerprints)) {
    if (relative !== sourcePath && hash(await readFile(path.join(repository, relative))) !== expected) unrelated.push(relative);
}
assert.deepEqual(unrelated, [], 'Refuse unrelated fingerprint changes.');
async function record(id, file, command, observed, patterns) {
    const bytes = await readFile(path.join(here, file)), log = bytes.toString('utf8');
    assert.equal((await readFile(path.join(here, file + '.exit'), 'utf8')).trim(), '0', file);
    assert.ok(log.includes(`TEST_SOURCE_SHA256=${sourceHash}`), `${file} must identify the current source.`);
    for (const pattern of patterns) assert.match(log, pattern, file);
    const check = { id, command, exitCode: 0, result: 'PASS', expected: observed, observed,
        log: { path: path.relative(repository, path.join(here, file)).replaceAll(path.sep, '/'), sha256: hash(bytes) } };
    const old = evidence.checks.find(item => item.id === id);
    if (old) Object.assign(old, check); else evidence.checks.push(check);
    const coverage = { name: id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
    const previous = evidence.coverage.find(item => item.name === id);
    if (previous) Object.assign(previous, coverage); else evidence.coverage.push(coverage);
}
await record('uic07-pending-barrier-repeat-20261019', 'targeted.log',
    "node node_modules/@playwright/test/cli.js test tests/frontend-corrections.spec.ts --project=chromium --project=firefox --grep 'F01 shop settings|F01 category keeps|F05 keeps text typed|F05 keeps mode changes|F06 order custom close' --repeat-each=3 --workers=1 --reporter=line",
    'Five pending-save scenarios passed 30/30 local repetitions, three per browser per scenario; edits occur while client fetch is explicitly held and the original payload, busy, retention and navigation assertions remain.',
    [/30 passed \(/, /\[chromium\].*F01 shop settings/, /\[firefox\].*F01 shop settings/]);
await record('uic07-corrections-suite-20261019', 'suite.log',
    'node node_modules/@playwright/test/cli.js test tests/frontend-corrections.spec.ts --project=chromium --project=firefox --workers=1 --reporter=line',
    'All 42 frontend-corrections cases passed on local Chromium/Firefox with the current source.',
    [/42 passed \(/, /\[chromium\].*F01 shop settings/, /\[firefox\].*F01 shop settings/]);
if (finalize) await record('uic07-pending-barrier-verify-20261019', 'verify.log', 'npm.cmd run verify (Node 24.19.0, npm 11.17.0)',
    'Full frontend verify exit 0, including generator/source/boundaries, lint/typecheck, domain, 252 Vitest tests, production build, layout, visual-token, composition and S17 evidence gates.',
    [/Tests\s+252 passed \(252\)/, /ui-evidence PASS: S17;/, /status=COMPLETE/]);
evidence.sourceFingerprints[sourcePath] = sourceHash;
const clause = 'Five frontend-corrections pending-save scenarios use an explicitly released client-fetch barrier instead of 700/800/1200ms mock delay windows; 30 repeated cases and the full 42-case Chromium/Firefox file are recorded under UIC07/deterministic-pending-20261019.';
if (!evidence.scope.includes(clause)) evidence.scope = evidence.scope.trim() + ' ' + clause;
assert.ok(evidence.checks.every(item => ['PASS', 'N/A'].includes(item.result)));
assert.ok(evidence.coverage.every(item => ['COMPLETE', 'N/A'].includes(item.result)));
evidence.recordedAt = new Date().toISOString();
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
await writeFile(manifest, JSON.stringify(evidence, null, 2).replaceAll('\n', newline) + newline, 'utf8');
console.log(JSON.stringify({ phase: preverify ? 'preverify' : 'finalize', checks: evidence.checks.length,
    coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length, sourceHash }, null, 2));
