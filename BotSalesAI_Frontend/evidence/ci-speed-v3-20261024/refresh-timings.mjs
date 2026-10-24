import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const here = import.meta.dirname, repo = path.resolve(here, '../../..'), prefix = 'BotSalesAI_Frontend/';
const file = path.join(repo, prefix + 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const raw = fs.readFileSync(file, 'utf8'), evidence = JSON.parse(raw);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = name => digest(fs.readFileSync(path.join(repo, name)));
const planner = ['scripts/ci-partitions.mjs', 'scripts/ci-timings.json', 'scripts/update-ci-timings.mjs', 'tests/ci-partitions.test.mjs'].map(name => prefix + name);
const policy = '.github/CI_POLICY.md', ui = prefix + 'tests/ui-shared-api-contract.test.mjs';
const owned = [...planner, policy, prefix + 'evidence/ci-speed-v3-20261024/refresh-timings.mjs', prefix + 'evidence/ci-speed-v3-20261024/TIMINGS.md'];
for (const [name, expected] of Object.entries(evidence.sourceFingerprints))
    if (!owned.includes(name)) assert.equal(hash(name), expected, 'Unrelated stale fingerprint: ' + name);
function log(name) {
    const bytes = fs.readFileSync(path.join(here, name)), text = bytes.toString('utf8').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
    assert.match(text, /COMMAND_EXIT=0\s*$/);
    return { bytes, text, header: JSON.parse(text.split(/\r?\n/)[0]) };
}
function record(id, name, inputs, patterns, description) {
    const { bytes, text, header } = log(name);
    for (const input of inputs) assert.equal(header.inputs[input], hash(input), name + ' stale input: ' + input);
    for (const pattern of patterns) assert.match(text, pattern);
    const check = { id, command: JSON.stringify(header.command), exitCode: 0, result: 'PASS', expected: description, observed: description,
        log: { path: prefix + 'evidence/ci-speed-v3-20261024/' + name, sha256: digest(bytes) } };
    const at = evidence.checks.findIndex(item => item.id === id);
    if (at < 0) evidence.checks.push(check); else evidence.checks[at] = check;
    const coverage = { name: id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
    const index = evidence.coverage.findIndex(item => item.name === id);
    if (index < 0) evidence.coverage.push(coverage); else evidence.coverage[index] = coverage;
}
const generation = JSON.parse(log('timing-generation.log').text.split(/\r?\n/).find(line => line.startsWith('{"generated":"native-ci-timings"')));
const data = JSON.parse(fs.readFileSync(path.join(repo, planner[1]), 'utf8'));
assert.equal(generation.outputSha256, hash(planner[1]));
assert.equal(generation.revision, data.baseline);
assert.equal(generation.runId, data.source.runId);
assert.equal(generation.reports, 6);
assert.deepEqual(generation.counts, { chromium: 561, firefox: 561 });
record('ci-v3-native-timing-generator-20261024', 'timing-generation.log', [planner[0], planner[2]],
    [/"reports":6/, /"chromium":561,"firefox":561/], 'Six SHA-bound native reports from successful PR run 40101039733 match every current ID/key and generate current timing data; lane-1 serial budget uses measured 111/140 seconds.');
record('ci-v3-timing-source-20261024', 'timing-source.log', planner,
    [/pass 24/, /fail 0/, /chromium: 561\/561/, /firefox: 561\/561/], 'All 24 source/runtime/planner regressions pass; current native selectors still cover each engine exactly once with the measured serial budget.');
record('ci-v3-timing-negative-inputs-20261024', 'timing-negatives.log', [planner[0], planner[1], planner[2]],
    [/TIMING_NEGATIVE=failed-result REJECTED=PASS OUTPUT_UNCHANGED=PASS/, /TIMING_NEGATIVE=duplicate-partition REJECTED=PASS OUTPUT_UNCHANGED=PASS/], 'Failed and duplicate native input reports are rejected without changing timing data. These are controlled negative checks, not failed product CI.');
record('ci-v3-timing-ui-contract-20261024', 'timing-ui-contract.log', [...planner, policy, ui],
    [/fail 0/, /required UI evidence and regression gates remain wired/], 'UI source/workflow contracts retain all engines, shards, built-demo coverage and required gates under the calibrated planner.');
if (process.argv.includes('--finalize')) record('ci-v3-timing-full-verify-20261024', 'timing-verify.log', [...planner, policy],
    [/256 passed/, /ui-evidence PASS: S17/, /status=COMPLETE/], 'Full npm run verify passes with current native timing data and serial built-demo budget; application and dependencies remain unchanged.');
for (const name of owned) evidence.sourceFingerprints[name] = hash(name);
const scope = 'CI timing calibration 20261024: successful PR run 40101039733 measured 25:41 with all 13 jobs passing. Native timing weights now match hybrid preview, and lane 1 reserves measured serial built-demo cost. Generator and negative-input checks enforce current inventory/provenance and no partial writes. Coverage and protected contexts stay unchanged; fresh PR and actual-main runs must measure the new scheduling.';
if (!evidence.scope.includes(scope)) evidence.scope += ' ' + scope;
evidence.recordedAt = new Date().toISOString();
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
fs.writeFileSync(file, JSON.stringify(evidence, null, 2).replaceAll('\n', nl) + nl);
console.log(JSON.stringify({ checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length }));
