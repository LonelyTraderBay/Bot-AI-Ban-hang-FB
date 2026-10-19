import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '../../../..');
const repository = path.dirname(frontend);
const manifest = path.join(frontend, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const sourcePath = 'BotSalesAI_Frontend/tests/vertical-slices/fe022-flows.spec.ts';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const source = await readFile(path.join(repository, sourcePath));
const sourceHash = hash(source);
const preverify = process.argv.includes('--preverify');
const finalize = process.argv.includes('--finalize');
assert.notEqual(preverify, finalize, 'Choose --preverify or --finalize.');

const negative = (await readFile(path.join(here, 'repro-before.log'), 'utf8'));
assert.equal((await readFile(path.join(here, 'repro-before.log.exit'), 'utf8')).trim(), '1');
assert.match(negative, /getByRole\('link', \{ name: 'Đề xuất từ phản hồi', exact: true \}\)/);
assert.match(negative, /Timeout: 5000ms/);
assert.match(negative, /1 failed/);
assert.match(source.toString('utf8'), /window\.setTimeout\(resolve, 6000\)/);
assert.match(source.toString('utf8'), /const knowledgeResponse = page\.waitForResponse/);
assert.match(source.toString('utf8'), /const detailResponse = page\.waitForResponse[^\n]+\n\s+await draftLink\.click\(\)/);

const raw = await readFile(manifest, 'utf8');
const evidence = JSON.parse(raw);
assert.equal(evidence.status, 'COMPLETE');
assert.ok(Object.hasOwn(evidence.sourceFingerprints, sourcePath));
const unrelated = [];
for (const [relative, expected] of Object.entries(evidence.sourceFingerprints)) {
    if (relative !== sourcePath && hash(await readFile(path.join(repository, relative))) !== expected) unrelated.push(relative);
}
assert.deepEqual(unrelated, [], 'Refuse to refresh unrelated fingerprints.');

async function record(id, file, command, observed, patterns) {
    const bytes = await readFile(path.join(here, file));
    const log = bytes.toString('utf8');
    assert.equal((await readFile(path.join(here, file + '.exit'), 'utf8')).trim(), '0', file);
    assert.ok(log.includes(`TEST_SOURCE_SHA256=${sourceHash}`), `${file} must identify the current test source.`);
    for (const pattern of patterns) assert.match(log, pattern, file);
    const item = { id, command, exitCode: 0, result: 'PASS', expected: observed, observed,
        log: { path: path.relative(repository, path.join(here, file)).replaceAll(path.sep, '/'), sha256: hash(bytes) } };
    const prior = evidence.checks.find(check => check.id === id);
    if (prior) Object.assign(prior, item);
    else evidence.checks.push(item);
    const coverage = { name: id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
    const previous = evidence.coverage.find(row => row.name === id);
    if (previous) Object.assign(previous, coverage);
    else evidence.coverage.push(coverage);
}

await record('uic07-vs04-slow-collection-repeat-20261019', 'targeted.log',
    'node node_modules/@playwright/test/cli.js test tests/vertical-slices/fe022-flows.spec.ts --project=chromium --project=firefox --grep FE022.VS04 --repeat-each=3 --workers=1 --reporter=line',
    'FE022.VS04: 6/6 repetitions passed on local Chromium/Firefox with a 6000ms synthetic knowledge-list delay; payload, rendered link, draft/revision identity and bot evaluation assertions retained.',
    [/6 passed \(/, /\[chromium\].*FE022\.VS04/, /\[firefox\].*FE022\.VS04/]);
await record('uic07-fe022-all-flows-20261019', 'flows.log',
    'node node_modules/@playwright/test/cli.js test tests/vertical-slices/fe022-flows.spec.ts --project=chromium --project=firefox --workers=1 --reporter=line',
    'FE022 VS01-VS04 and S05: 10/10 passed on local Chromium/Firefox with the current test source.',
    [/10 passed \(/, /\[chromium\].*FE022\.VS04/, /\[firefox\].*FE022\.VS04/]);
if (finalize) {
    await record('uic07-vs04-full-verify-20261019', 'verify.log', 'npm.cmd run verify (Node 24.19.0, npm 11.17.0)',
        'Full frontend verify exit 0: generator, source/session, boundaries, lint/typecheck, domain, 252 Vitest tests, production build, layout, visual-token, composition and S17 evidence gates passed.',
        [/Tests\s+252 passed \(252\)/, /ui-evidence PASS: S17;/, /status=COMPLETE/]);
}
evidence.sourceFingerprints[sourcePath] = sourceHash;
const clause = 'FE022.VS04 waits for the knowledge collection response before DOM assertions, verifies the reviewed draft ID in its payload, and registers the detail listener before clicking; a 6000ms delayed-list negative reproduction and repeated Chromium/Firefox proof are retained under UIC07/VS04-response-ready-20261019.';
if (!evidence.scope.includes(clause)) evidence.scope = evidence.scope.trim() + ' ' + clause;
assert.ok(evidence.checks.every(check => ['PASS', 'N/A'].includes(check.result)));
assert.ok(evidence.coverage.every(row => ['COMPLETE', 'N/A'].includes(row.result)));
evidence.recordedAt = new Date().toISOString();
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
await writeFile(manifest, JSON.stringify(evidence, null, 2).replaceAll('\n', newline) + newline, 'utf8');
console.log(JSON.stringify({ phase: preverify ? 'preverify' : 'finalize', checks: evidence.checks.length,
    coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length, sourceHash }, null, 2));
