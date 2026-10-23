import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '../../..');
const file = path.join(repo, 'BotSalesAI_Frontend/evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const raw = fs.readFileSync(file, 'utf8'), evidence = JSON.parse(raw);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inputs = ['BotSalesAI_Frontend/tests/states/route-role-ready-composition.spec.ts', 'BotSalesAI_Frontend/tests/states/route-role-state-composition.spec.ts'];
const owned = [...inputs, 'BotSalesAI_Frontend/evidence/commit-workflow-20261023/refresh-readiness.mjs'];
for (const [name, digest] of Object.entries(evidence.sourceFingerprints)) if (!owned.includes(name))
    assert.equal(hash(fs.readFileSync(path.join(repo, name))), digest, `Unrelated stale source: ${name}`);
function record(id, logFile, expected, patterns) {
    const bytes = fs.readFileSync(path.join(here, logFile)), text = bytes.toString('utf8');
    const header = JSON.parse(text.split(/\r?\n/)[0]);
    for (const name of inputs) assert.equal(header.inputs[name], hash(fs.readFileSync(path.join(repo, name))), `Stale ${logFile}: ${name}`);
    assert.match(text, /COMMAND_EXIT=0/);
    for (const pattern of patterns) assert.match(text, pattern);
    const check = { id, command: JSON.stringify(header.command), result: 'PASS', exitCode: 0, expected, observed: expected,
        log: { path: `BotSalesAI_Frontend/evidence/commit-workflow-20261023/${logFile}`, sha256: hash(bytes) } };
    const ci = evidence.checks.findIndex(item => item.id === id);
    if (ci < 0) evidence.checks.push(check); else evidence.checks[ci] = check;
    const coverage = { name: id, result: 'COMPLETE', expected: 1, observed: 1, missing: 0 };
    const at = evidence.coverage.findIndex(item => item.name === id);
    if (at < 0) evidence.coverage.push(coverage); else evidence.coverage[at] = coverage;
}
record('commit-clock-role-readiness-20261024', 'readiness-owner-sales.log', 'Four Chromium/Firefox cases pass: every owner ready/stale route and sales loading route.',
    [/4 passed/, /BROWSER=chromium ROLE_STATE=stale_or_offline ROLE=owner ROUTE=R60 RESULT=PASS/, /BROWSER=firefox ROLE_STATE=stale_or_offline ROLE=owner ROUTE=R60 RESULT=PASS/, /BROWSER=firefox ROLE_STATE=loading ROLE=sales ROUTE=R\d+ RESULT=PASS/]);
if (process.argv.includes('--finalize')) record('commit-readiness-verify-20261024', 'readiness-verify.log', 'Full verify passes with deterministic clock and role application readiness.', [/256 passed/, /ui-evidence PASS: S17/]);
for (const name of owned) evidence.sourceFingerprints[name] = hash(fs.readFileSync(path.join(repo, name)));
const scope = ' Readiness 20261024: the ready/stale role matrix starts its advancing browser clock at a fixed shop midday, avoiding different date-based query keys when CI crosses shop midnight. Fast-forward explicitly crosses staleTime. Role consumers await the public applied status after session/shop refresh before operating the next selector. Existing routes/roles and stale/loading assertions remain; application source is unchanged. Failed c92 and b023 CI attempts are retained separately and are not passing evidence.';
if (!evidence.scope.includes(scope)) evidence.scope += scope;
evidence.recordedAt = new Date().toISOString();
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
fs.writeFileSync(file, JSON.stringify(evidence, null, 2).replaceAll('\n', nl) + nl);
console.log(JSON.stringify({ checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length }));
