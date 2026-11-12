import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('..');
const manifest = 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json';
const target = 'BotSalesAI_Frontend/tests/fe013.spec.ts';
const previous = '9afa75f8036f26ecfaccc5f5c5d7b81102d5a86493b51e01dcc5ee8b3f5a10d8';
const log = 'BotSalesAI_Frontend/evidence/ci-pr21-20261112/fe013-test.log';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const evidence = JSON.parse(await readFile(manifest, 'utf8'));
const current = sha(await readFile(path.join(root, target)));
assert([previous, current].includes(evidence.sourceFingerprints[target]));
for (const [file, hash] of Object.entries(evidence.sourceFingerprints)) {
    if (file !== target && file !== 'BotSalesAI_Frontend/evidence/ci-pr21-20261112/refresh-s17.mjs') assert.equal(sha(await readFile(path.join(root, file))), hash, `Stale fingerprint: ${file}`);
}
const output = await readFile(path.join(root, log));
assert.match(output.toString('utf8'), /2 passed[\s\S]*COMMAND_EXIT=0/);
evidence.sourceFingerprints[target] = current;
evidence.sourceFingerprints['BotSalesAI_Frontend/evidence/ci-pr21-20261112/refresh-s17.mjs'] = sha(await readFile('evidence/ci-pr21-20261112/refresh-s17.mjs'));
evidence.checks = evidence.checks.filter(check => check.id !== 'pr21-fe013-demo-control-20261112');
const summary = 'Two scoped browser tests passed after the demo control acknowledged the fault.';
evidence.checks.push({ id: 'pr21-fe013-demo-control-20261112', command: 'playwright test tests/fe013.spec.ts --grep unknown handover --workers=1', exitCode: 0, result: 'PASS', expected: summary, observed: summary, log: { path: log, sha256: sha(output) } });
const limit = 'PR 21 Chromium shard 8 initially failed because the unknown handover response was succeeded. A scoped local test waits for the demo fault acknowledgment; the full hosted PR and exact-main checks are separate.';
if (!evidence.knownLimits.includes(limit)) evidence.knownLimits.push(limit);
evidence.recordedAt = new Date().toISOString();
await writeFile(manifest, JSON.stringify(evidence, null, 2) + '\n');
console.log('Refreshed FE013 fingerprint and recorded scoped checks; S17 remains ' + evidence.status);
