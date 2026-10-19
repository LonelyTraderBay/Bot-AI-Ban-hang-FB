import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '../../../..');
const repository = path.dirname(frontend);
const manifest = path.join(frontend, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const sourcePath = 'BotSalesAI_Frontend/tests/fe020.spec.ts';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceHash = digest(await readFile(path.join(repository, sourcePath)));
const preverify = process.argv.includes('--preverify');
const finalize = process.argv.includes('--finalize');
assert.notEqual(preverify, finalize, 'Choose --preverify or --finalize.');
const negative = await readFile(path.join(here, 'ci-failure-excerpt.log'), 'utf8');
assert.match(negative, /toContainText\(expected\) failed/);
assert.match(negative, /196 passed \(/);
const raw = await readFile(manifest, 'utf8');
const evidence = JSON.parse(raw);
assert.equal(evidence.status, 'COMPLETE');
assert.ok(Object.hasOwn(evidence.sourceFingerprints, sourcePath));
const unrelated = [];
for (const [relative, expected] of Object.entries(evidence.sourceFingerprints)) {
    if (relative !== sourcePath && digest(await readFile(path.join(repository, relative))) !== expected) unrelated.push(relative);
}
assert.deepEqual(unrelated, [], 'Refuse to refresh unrelated fingerprints, including the previous VS04 fix.');

async function record(id, file, command, observed, patterns) {
    const bytes = await readFile(path.join(here, file));
    const log = bytes.toString('utf8');
    assert.equal((await readFile(path.join(here, file + '.exit'), 'utf8')).trim(), '0', file);
    assert.ok(log.includes(`TEST_SOURCE_SHA256=${sourceHash}`), `${file} must identify the current source.`);
    for (const pattern of patterns) assert.match(log, pattern, file);
    const check = { id, command, exitCode: 0, result: 'PASS', expected: observed, observed,
        log: { path: path.relative(repository, path.join(here, file)).replaceAll(path.sep, '/'), sha256: digest(bytes) } };
    const previous = evidence.checks.find(item => item.id === id);
    if (previous) Object.assign(previous, check); else evidence.checks.push(check);
    const coverage = { name: id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
    const prior = evidence.coverage.find(item => item.name === id);
    if (prior) Object.assign(prior, coverage); else evidence.coverage.push(coverage);
}
await record('uic07-fe020-f05-readiness-repeat-20261019', 'targeted.log',
    'node node_modules/@playwright/test/cli.js test tests/fe020.spec.ts --project=chromium --project=firefox --grep FE020.F05 --repeat-each=3 --workers=1 --reporter=line',
    'FE020.F05 passed 6/6 local repetitions, Chromium 3/3 and Firefox 3/3; the approvals response and rendered rows precede the create action, and bounded paused-only delegation assertions remain.',
    [/6 passed \(/, /\[chromium\].*FE020\.F05/, /\[firefox\].*FE020\.F05/]);
await record('uic07-fe020-suite-20261019', 'suite.log',
    'node node_modules/@playwright/test/cli.js test tests/fe020.spec.ts --project=chromium --project=firefox --workers=1 --reporter=line',
    'All 14 FE020/FE027 cases in fe020.spec.ts passed on local Chromium/Firefox with the current source.',
    [/14 passed \(/, /\[chromium\].*FE020\.F05/, /\[firefox\].*FE020\.F05/]);
if (finalize) await record('uic07-fe020-f05-verify-20261019', 'verify.log', 'npm.cmd run verify (Node 24.19.0, npm 11.17.0)',
    'Full frontend verify exit 0, including generation, source/boundaries, lint/typecheck, domain, 252 Vitest tests, production build, layout, visual-token, composition and S17 evidence validation.',
    [/Tests\s+252 passed \(252\)/, /ui-evidence PASS: S17;/, /status=COMPLETE/]);
evidence.sourceFingerprints[sourcePath] = sourceHash;
const clause = 'FE020.F05 waits for the approvals limit=20 response and all rendered table rows before clicking the delegation button below the loading table; CI trace and repeated Chromium/Firefox evidence are retained under UIC07/FE020-F05-readiness-20261019.';
if (!evidence.scope.includes(clause)) evidence.scope = evidence.scope.trim() + ' ' + clause;
assert.ok(evidence.checks.every(item => ['PASS', 'N/A'].includes(item.result)));
assert.ok(evidence.coverage.every(item => ['COMPLETE', 'N/A'].includes(item.result)));
evidence.recordedAt = new Date().toISOString();
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
await writeFile(manifest, JSON.stringify(evidence, null, 2).replaceAll('\n', newline) + newline, 'utf8');
console.log(JSON.stringify({ phase: preverify ? 'preverify' : 'finalize', checks: evidence.checks.length,
    coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length, sourceHash }, null, 2));
