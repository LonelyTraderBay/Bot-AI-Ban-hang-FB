import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('..');
const manifest = 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json';
const target = 'BotSalesAI_Frontend/tests/states/route-role-command-unknown-master-actions.spec.ts';
const script = 'BotSalesAI_Frontend/evidence/ci-main-followup-20261112/refresh-s17.mjs';
const log = 'BotSalesAI_Frontend/evidence/ci-main-followup-20261112/r47-test.log';
const previous = '406517c1290c2368a7b653ed47609c7313061bd461c11115f61a20daef3fba0f';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const evidence = JSON.parse(await readFile(manifest, 'utf8'));
const current = sha(await readFile(path.join(root, target)));
assert([previous, current].includes(evidence.sourceFingerprints[target]));
for (const [file, hash] of Object.entries(evidence.sourceFingerprints)) {
    if (file !== target && file !== script) assert.equal(sha(await readFile(path.join(root, file))), hash, `Stale fingerprint: ${file}`);
}
const output = await readFile(path.join(root, log));
assert.match(output.toString('utf8'), /4 passed[\s\S]*COMMAND_EXIT=0/);
evidence.sourceFingerprints[target] = current;
evidence.sourceFingerprints[script] = sha(await readFile(path.join(root, script)));
evidence.checks = evidence.checks.filter(check => check.id !== 'main-r47-demo-menu-20261112');
const summary = 'Four scoped R47 browser tests passed for owner and warehouse in Chromium and Firefox.';
evidence.checks.push({ id: 'main-r47-demo-menu-20261112', command: 'playwright test tests/states/route-role-command-unknown-master-actions.spec.ts --grep R47 postGoodsReceipt --workers=1', exitCode: 0, result: 'PASS', expected: summary, observed: summary, log: { path: log, sha256: sha(output) } });
const limit = 'Main CI run 43186969926 failed on the R47 mock selector with the menu still open and normal selected. The local menu readiness fix has scoped browser coverage; hosted follow-up and exact-main checks remain separate.';
if (!evidence.knownLimits.includes(limit)) evidence.knownLimits.push(limit);
evidence.recordedAt = new Date().toISOString();
await writeFile(manifest, JSON.stringify(evidence, null, 2) + '\n');
console.log('Recorded R47 menu readiness checks; S17 remains ' + evidence.status);
