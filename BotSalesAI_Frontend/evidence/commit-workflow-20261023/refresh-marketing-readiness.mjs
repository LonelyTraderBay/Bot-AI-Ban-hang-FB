import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '../../..');
const file = path.join(repo, 'BotSalesAI_Frontend/evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const raw = fs.readFileSync(file, 'utf8'), evidence = JSON.parse(raw);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inputs = ['BotSalesAI_Frontend/tests/states/route-role-ready-composition.spec.ts'];
const owned = [...inputs, 'BotSalesAI_Frontend/evidence/commit-workflow-20261023/refresh-marketing-readiness.mjs'];
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
record('marketing-retained-browser-20261024', 'marketing-readiness-target.log', 'Full owner/accountant ready and stale route walks pass in Chromium/Firefox.', [/4 passed/, ...['chromium', 'firefox'].flatMap(browser => ['owner', 'accountant'].map(role => new RegExp(`BROWSER=${browser} ROLE_STATE=stale_or_offline ROLE=${role} ROUTE=R53 RESULT=PASS`)))]);
if (process.argv.includes('--finalize')) record('marketing-retained-verify-20261024', 'marketing-readiness-verify.log', 'Full verify passes after the consumer waits for normalized Marketing data and reuses its loaded location.', [/256 passed/, /ui-evidence PASS: S17/]);
for (const name of owned) evidence.sourceFingerprints[name] = hash(fs.readFileSync(path.join(repo, name)));
const scope = ' Marketing consumer readiness 20261024: register the filtered R53 success read before route entry, wait for response completion and visible marketing-as-of, then reuse its canonical URL in the retained-data walk. All roles/routes and stale assertions remain. Main a7 Firefox2 failure is archived separately; no application or API change.';
if (!evidence.scope.includes(scope)) evidence.scope += scope;
evidence.recordedAt = new Date().toISOString();
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
fs.writeFileSync(file, JSON.stringify(evidence, null, 2).replaceAll('\n', nl) + nl);
console.log(JSON.stringify({ checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length }));
