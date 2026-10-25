import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { collectedTests, independentTestFiles, requireExactTests } from './ci-partitions.mjs';

// Inputs are all native reports extracted from verified CI artifact ZIPs and a
// provenance.json with revision/run/attempt, report hashes and serial step times.
// Discovery still owns coverage; these durations change scheduling only.
const directory = fs.realpathSync(process.argv[2]);
const root = path.resolve(import.meta.dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(directory, 'provenance.json'), 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
assert.match(source.revision, /^[a-f0-9]{40}$/);
assert.ok(Number.isSafeInteger(source.runId) && source.runId > 0 && Number.isSafeInteger(source.attempt) && source.attempt > 0
    && Number.isInteger(source.workers) && source.workers >= 1 && source.workers <= 4);
const partitions = source.partitions ?? 3;
assert.ok([3, 6, 8, 9].includes(partitions), 'Unsupported native partition count.');
assert.equal(source.reports.length, partitions * 2);
const output = { baseline: source.revision,
    scope: `Native JSON result durations from complete CI run ${source.runId}; ${source.workers} workers and hybrid preview. Summed seconds are scheduling hints, not assertion CPU time or workflow wall time. Observed built-demo wall time is preserved; the caller decides whether lane 1 reserves it or an independent producer owns it.`,
    source: { runId: source.runId, attempt: source.attempt, workers: source.workers, partitions,
        reports: source.reports.map(({ project, shard, artifactId, artifactDigest, sha256 }) => ({ project, shard, artifactId, artifactDigest, sha256 })) }, projects: {} };
const counts = {};
for (const project of ['chromium', 'firefox']) {
    const rows = source.reports.filter(row => row.project === project);
    assert.deepEqual(rows.map(row => row.shard).sort(), Array.from({ length: partitions }, (_, i) => `${i + 1}/${partitions}`));
    const timing = { files: {}, tests: {}, builtDemoSeconds: source.builtDemoSeconds[project] };
    assert.ok(Number.isFinite(timing.builtDemoSeconds) && timing.builtDemoSeconds > 0);
    const actual = [];
    for (const row of rows) {
        assert.equal(row.file, `${project}-${row.shard[0]}.json`);
        assert.match(row.artifactDigest, /^sha256:[a-f0-9]{64}$/);
        const file = path.join(directory, row.file);
        assert.ok(!fs.lstatSync(file).isSymbolicLink());
        const bytes = fs.readFileSync(file);
        assert.equal(digest(bytes), row.sha256, 'Native report digest differs from provenance.');
        const report = JSON.parse(bytes);
        assert.equal(report.config.workers, source.workers, 'Native worker count differs from provenance.');
        const tests = collectedTests(report, project);
        requireExactTests(tests, tests, true);
        actual.push(...tests);
        for (const test of tests) {
            const seconds = test.test.results[0].duration / 1000;
            assert.ok(Number.isFinite(seconds) && seconds > 0);
            timing.files[test.file] = (timing.files[test.file] ?? 0) + seconds;
            if (independentTestFiles.includes(test.file)) timing.tests[test.key] = seconds;
        }
    }
    const listed = spawnSync(process.execPath, [path.join(root, 'node_modules/@playwright/test/cli.js'), 'test', `--project=${project}`, '--list', '--reporter=json'],
        { cwd: root, env: process.env, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
    assert.equal(listed.status, 0, listed.error?.message ?? listed.stderr);
    const inventory = collectedTests(JSON.parse(listed.stdout), project);
    requireExactTests(inventory, actual, true);
    const keys = new Map(inventory.map(test => [test.id, test.key]));
    for (const test of actual) assert.equal(test.key, keys.get(test.id));
    for (const field of ['files', 'tests']) timing[field] = Object.fromEntries(Object.entries(timing[field])
        .sort(([a], [b]) => a.localeCompare(b, 'en')).map(([key, seconds]) => [key, Math.round(seconds * 1000) / 1000]));
    output.projects[project] = timing;
    counts[project] = actual.length;
}
const bytes = JSON.stringify(output, null, 2) + '\n';
fs.writeFileSync(new URL('./ci-timings.json', import.meta.url), bytes);
console.log(JSON.stringify({ generated: 'native-ci-timings', revision: source.revision, runId: source.runId, reports: source.reports.length, counts,
    builtDemoSeconds: source.builtDemoSeconds, outputSha256: digest(bytes) }));
