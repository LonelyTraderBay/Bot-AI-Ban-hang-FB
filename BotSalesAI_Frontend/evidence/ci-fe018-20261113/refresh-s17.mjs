import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('..');
const manifest = 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json';
const target = 'BotSalesAI_Frontend/tests/fe018.spec.ts';
const script = 'BotSalesAI_Frontend/evidence/ci-fe018-20261113/refresh-s17.mjs';
const log = 'BotSalesAI_Frontend/evidence/ci-fe018-20261113/focused.log';
const previous = 'f5e11dcd8006378f8d3cf5dd5c1d1f919b8a9537ef510495ef75017084582160';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const evidence = JSON.parse(await readFile(manifest, 'utf8'));
const current = sha(await readFile(path.join(root, target)));
assert([previous, current].includes(evidence.sourceFingerprints[target]));
for (const [file, hash] of Object.entries(evidence.sourceFingerprints)) {
    if (file !== target && file !== script) assert.equal(sha(await readFile(path.join(root, file))), hash, `Stale fingerprint: ${file}`);
}
const output = await readFile(path.join(root, log));
const text = output.toString('utf8');
assert.match(text, new RegExp(`SOURCE_SHA256=${current}`));
assert.match(text, new RegExp(`SOURCE_AFTER_SHA256=${current}`));
assert.match(text, /4 passed[\s\S]*COMMAND_EXIT=0\s*$/);
evidence.sourceFingerprints[target] = current;
evidence.sourceFingerprints[script] = sha(await readFile(path.join(root, script)));
evidence.checks = evidence.checks.filter(check => check.id !== 'main-fe018-config-readiness-20261113');
const summary = 'Four focused preview tests passed on Chromium and Firefox, including a delayed configuration read and the original draft conflict flow.';
evidence.checks.push({ id: 'main-fe018-config-readiness-20261113', command: 'Playwright FE018 readiness and draft conflict, Chromium and Firefox, preview, one worker', exitCode: 0, result: 'PASS', expected: summary, observed: summary, log: { path: log, sha256: sha(output) } });
const limit = 'Main CI run 43376152293 failed FE018 on Firefox while configuration was still loading. Local preview regression covers delayed configuration reads; hosted CI for the fix and exact-main CI remain unverified.';
if (!evidence.knownLimits.includes(limit)) evidence.knownLimits.push(limit);
evidence.recordedAt = new Date().toISOString();
await writeFile(manifest, JSON.stringify(evidence, null, 2) + '\n');
console.log('Recorded FE018 readiness checks; S17 remains ' + evidence.status);
