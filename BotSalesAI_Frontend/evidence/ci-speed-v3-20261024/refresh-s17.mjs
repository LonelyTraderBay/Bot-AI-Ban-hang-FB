import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const here = import.meta.dirname, repo = path.resolve(here, '../../..'), prefix = 'BotSalesAI_Frontend/';
const file = path.join(repo, prefix + 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const raw = fs.readFileSync(file, 'utf8'), evidence = JSON.parse(raw);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = name => digest(fs.readFileSync(path.join(repo, name)));
const workflow = ['.github/CI_POLICY.md', '.github/workflows/frontend.yml', '.github/scripts/require-success.mjs', '.github/scripts/require-success.test.mjs'];
const harness = ['package.json', 'tests/session/demo-server.mjs', 'tests/session/playwright-setup.ts',
    'tests/session/demo-preview-runtime.spec.ts', 'tests/session/preview-runtime-policy.test.mjs', 'tests/session/read-barrier.ts'].map(name => prefix + name);
const sourceSpecs = ['fe016.spec.ts', 'frontend-corrections.spec.ts', 'frontend.spec.ts',
    'session/demo-server-cache-isolation.spec.ts', 'session/demo-server-reuse.spec.ts', 'session/demo-worker-startup.spec.ts',
    'states/route-role-unknown-shell-composition.spec.ts', 'ui-component-layout.spec.ts', 'ui-dashboard-layout.spec.ts',
    'ui-finance-management.spec.ts', 'ui-master-resources.spec.ts', 'ui-query-state-layout.spec.ts', 'ui-toolbar-layout.spec.ts',
    'ui-width-layout.spec.ts', 'ui006-lookups.spec.ts', 'ui007-query-states.spec.ts', 'ui008-integration-empty.spec.ts',
    'ui009-scope-regression.spec.ts', 'ui012-keyboard.spec.ts', 'ui61-states.spec.ts'].map(name => prefix + 'tests/' + name);
const role = prefix + 'tests/states/route-role-state-composition.spec.ts';
const ui = prefix + 'tests/ui-shared-api-contract.test.mjs';
const code = [...workflow, ...harness, ...sourceSpecs, role, ui];
const owned = [...code, prefix + 'evidence/ci-speed-v3-20261024/refresh-s17.mjs', prefix + 'evidence/ci-speed-v3-20261024/REPORT.md'];
for (const [name, expected] of Object.entries(evidence.sourceFingerprints))
    if (!owned.includes(name)) assert.equal(hash(name), expected, 'Unrelated stale fingerprint: ' + name);

function record(id, log, inputs, patterns, description) {
    const bytes = fs.readFileSync(path.join(here, log));
    const text = bytes.toString('utf8').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
    const header = JSON.parse(text.split(/\r?\n/)[0]);
    for (const name of inputs) assert.equal(header.inputs[name], hash(name), log + ' stale input: ' + name);
    assert.match(text, /COMMAND_EXIT=0\s*$/);
    for (const pattern of patterns) assert.match(text, pattern, log);
    const check = { id, command: JSON.stringify(header.command), exitCode: 0, result: 'PASS', expected: description, observed: description,
        log: { path: prefix + 'evidence/ci-speed-v3-20261024/' + log, sha256: digest(bytes) } };
    const at = evidence.checks.findIndex(check => check.id === id);
    if (at < 0) evidence.checks.push(check); else evidence.checks[at] = check;
    const coverage = { name: id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
    const index = evidence.coverage.findIndex(item => item.name === id);
    if (index < 0) evidence.coverage.push(coverage); else evidence.coverage[index] = coverage;
}
record('ci-v3-runtime-policy-20261024', 'source.log', [...harness, ...sourceSpecs],
    [/DEV_RUNTIME_SPECS=20/, /fail 0/, /chromium: 561\/561/, /firefox: 561\/561/],
    'Native selection covers 561 tests per engine exactly once; runtime policy, cache cleanup and run isolation regressions pass. All 20 source/cache specs explicitly retain dev.');
record('ci-v3-parallel-build-gates-20261024', 'repository.log', workflow,
    [/pass 80/, /fail 0/], 'All 80 repository/strict-gate regressions pass, including skipped/neutral artifact producer rejection and same-attempt inventory.');
for (const runtime of ['preview', 'dev'])
    record('ci-v3-harness-' + runtime + '-20261024', 'harness-' + runtime + '.log', [...harness, ...sourceSpecs.filter(name => name.includes('/session/'))],
        [/16 passed/, /using 2 workers/, /VITE_CACHE_ISOLATION=PASS/, new RegExp('"runtime":"' + runtime + '"')],
        '16 Chromium/Firefox server lifecycle, source/cache, worker startup, preview isolation and response-barrier checks pass with two workers in ' + runtime + ' mode.');
record('ci-v3-role-states-20261024', 'role-states.log', [...harness, role],
    [/28 passed/, /using 2 workers/, /BROWSER=chromium ROLE_STATE=loading ROLE=owner ROUTE=R60/, /BROWSER=firefox ROLE_STATE=loading ROLE=owner ROUTE=R60/],
    'All 28 Chromium/Firefox role-state cases pass with the original error/empty/loading matrix and explicit pending-request/loading/released-response checks.');
record('ci-v3-workflow-contract-20261024', 'ui-contract.log', [...workflow, prefix + 'package.json', ui],
    [/fail 0/, /required UI evidence and regression gates remain wired/], 'The UI source contract retains every quality gate, engine/partition and built-demo check while E2E depends on independent artifact preparation.');
if (process.argv.includes('--finalize'))
    record('ci-v3-full-verify-20261024', 'verify.log', code, [/256 passed/, /ui-evidence PASS: S17/, /status=COMPLETE/],
        'Full npm run verify passes on current workflow/harness/source annotations, with application sources and dependencies unchanged.');
for (const name of owned) evidence.sourceFingerprints[name] = hash(name);
const scope = 'CI v3 20261024: independent artifact preparation overlaps full verify with E2E; compatible UI tests use the same-run built preview while 20 source/cache specs retain explicit dev. Loading tests keep fresh documents and canonical coverage, holding real client GETs until pending UI is asserted instead of fixed waits. Local current-input regressions pass; hosted PR and actual-main closing CI, artifact integrity and measured elapsed time are reported separately. Application source and dependencies are unchanged.';
if (!evidence.scope.includes(scope)) evidence.scope += ' ' + scope;
evidence.recordedAt = new Date().toISOString();
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
fs.writeFileSync(file, JSON.stringify(evidence, null, 2).replaceAll('\n', nl) + nl);
console.log(JSON.stringify({ checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length }));
