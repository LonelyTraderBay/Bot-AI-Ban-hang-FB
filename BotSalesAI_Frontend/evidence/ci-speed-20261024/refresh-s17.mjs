import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const prefix = 'BotSalesAI_Frontend/';
const manifest = path.join(repo, prefix + 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const raw = fs.readFileSync(manifest, 'utf8'), evidence = JSON.parse(raw);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const harness = ['playwright.config.ts', 'tests/session/demo-server.mjs', 'tests/session/playwright-setup.ts', 'tests/session/demo-server-reuse.spec.ts'].map(p => prefix + p);
const planner = ['package.json', 'scripts/ci-partitions.mjs', 'scripts/run-ci-e2e.mjs', 'scripts/ci-timings.json', 'tests/ci-partitions.test.mjs'].map(p => prefix + p);
const workflow = ['.github/workflows/frontend.yml', '.github/CI_POLICY.md', '.github/scripts/require-success.test.mjs'];
const role = prefix + 'tests/states/route-role-state-composition.spec.ts';
const uiContract = prefix + 'tests/ui-shared-api-contract.test.mjs';
const owned = [...harness, ...planner, ...workflow, role, uiContract, prefix + 'evidence/ci-speed-20261024/refresh-s17.mjs'];
for (const [name, hash] of Object.entries(evidence.sourceFingerprints))
    if (!owned.includes(name)) assert.equal(digest(fs.readFileSync(path.join(repo, name))), hash, 'Unrelated stale fingerprint: ' + name);

function record(id, file, inputs, patterns, expected) {
    const bytes = fs.readFileSync(path.join(here, file));
    const text = bytes.toString('utf8').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
    const header = JSON.parse(text.split(/\r?\n/)[0]);
    for (const name of inputs)
        assert.equal(header.inputs[name], digest(fs.readFileSync(path.join(repo, name))), file + ' stale input: ' + name);
    assert.match(text, /COMMAND_EXIT=0/);
    for (const pattern of patterns) assert.match(text, pattern, file);
    const check = { id, command: JSON.stringify(header.command), exitCode: 0, result: 'PASS', expected, observed: expected,
        log: { path: prefix + 'evidence/ci-speed-20261024/' + file, sha256: digest(bytes) } };
    const index = evidence.checks.findIndex(c => c.id === id);
    if (index < 0) evidence.checks.push(check); else evidence.checks[index] = check;
    const coverage = { name: id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
    const at = evidence.coverage.findIndex(c => c.name === id);
    if (at < 0) evidence.coverage.push(coverage); else evidence.coverage[at] = coverage;
}
record('ci-speed-planner-20261024', 'source.log', [...planner, harness[0]], [/pass 16/, /fail 0/, /chromium: 559\/559/, /firefox: 559\/559/],
    '16 planner/cache lifecycle/run isolation regressions pass; native test-list selectors cover each engine inventory exactly once.');
record('ci-speed-gates-20261024', 'repository.log', workflow, [/pass 76/, /fail 0/],
    '76 repository/gate regressions pass with the unchanged required contexts and same-run build wiring.');
record('ci-speed-harness-20261024', 'harness-smoke.log', harness, [/12 passed/, /using 2 workers/, /VITE_CACHE_ISOLATION=PASS/],
    '12 Chromium/Firefox lifecycle, cache and worker scenarios pass with two workers.');
record('ci-speed-role-parallel-20261024', 'role-parallel.log', [...harness, role], [/2 passed/, /using 2 workers/, /ROLE=owner ROUTE=R60/, /ROLE=manager ROUTE=R60/],
    'Owner and manager loading matrices pass in separate page fixtures running concurrently with two workers.');
record('ci-speed-ui-contract-20261024', 'ui-contract.log', [...workflow, ...planner, harness[0], uiContract], [/fail 0/, /required UI evidence and regression gates remain wired/],
    'The UI workflow contract retains browser installation, all matrix lanes, built-demo coverage and strict inventory/result checks with the new CI driver.');
if (process.argv.includes('--finalize')) record('ci-speed-verify-20261024', 'verify.log', [...harness, ...planner, ...workflow, role, uiContract],
    [/256 passed/, /ui-evidence PASS: S17/, /status=COMPLETE/], 'Full npm run verify passes for the current CI/harness inputs.');
for (const name of owned) evidence.sourceFingerprints[name] = digest(fs.readFileSync(path.join(repo, name)));
const scope = 'CI speed 20261024: current-inventory duration partitions, two CI workers, per-run single-owner Vite reuse, and same-run build artifact reuse. Local regressions preserve coverage and isolation; dated earlier browser records remain historical. Full hosted and closing-main results must be verified separately by exact SHA/run.';
if (!evidence.scope.includes(scope)) evidence.scope += ' ' + scope;
evidence.recordedAt = new Date().toISOString();
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
fs.writeFileSync(manifest, JSON.stringify(evidence, null, 2).replaceAll('\n', nl) + nl);
console.log(JSON.stringify({ checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length }));
