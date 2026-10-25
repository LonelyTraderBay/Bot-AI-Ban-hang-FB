import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { collectedTests, partitionTests, requireExactTests, testList } from '../scripts/ci-partitions.mjs';

const row = (id, file, title = id) => ({ id, file, title, key: `${file} › ${title}` });
const timing = { files: { 'slow.spec.ts': 90, 'medium.spec.ts': 60 }, tests: {} };

test('duration partitions cover every discovered test once, keeping ordinary files together', () => {
    const tests = [row('a', 'slow.spec.ts'), row('b', 'slow.spec.ts'), row('c', 'medium.spec.ts'),
        row('d', 'new.spec.ts'), row('e', 'states/route-role-state-composition.spec.ts'),
        row('f', 'states/route-role-state-composition.spec.ts'),
        row('g', 'states/route-role-ready-composition.spec.ts'),
        row('h', 'states/route-role-ready-composition.spec.ts')];
    const plan = partitionTests(tests, timing);
    requireExactTests(tests, plan.flatMap(p => p.tests));
    assert.equal(plan.flatMap(p => p.tests).length, new Set(plan.flatMap(p => p.tests.map(t => t.id))).size);
    assert.ok(plan.some(p => p.tests.some(t => t.id === 'a') && p.tests.some(t => t.id === 'b')));
    assert.ok(plan.some(p => p.tests.some(t => t.id === 'd')), 'new specs are included without timing metadata');
    const readyGroups = plan.flatMap(p => p.groups).filter(g => g.tests[0].file === 'states/route-role-ready-composition.spec.ts');
    assert.equal(readyGroups.length, 2, 'fresh-context ready walks can be selected independently');
    assert.ok(readyGroups.every(g => g.tests.length === 1));
    const membership = partitions => partitions.map(p => p.tests.map(t => t.id).sort());
    assert.deepEqual(membership(plan), membership(partitionTests(tests.slice().reverse(), timing)),
        'discovery order must not affect partition membership');
    assert.match(testList(plan[0], 'firefox'), /\[firefox\] › slow.spec.ts/);
});

test('missing, duplicate, skipped and retried results cannot masquerade as complete coverage', () => {
    const expected = [row('a', 'a.spec.ts'), row('b', 'b.spec.ts')];
    assert.throws(() => requireExactTests(expected, expected.slice(1)), /differ/);
    assert.throws(() => requireExactTests(expected, [expected[0], expected[0]]), /differ/);
    const passed = expected.map(t => ({ ...t, test: { expectedStatus: 'passed', results: [{ status: 'passed' }] } }));
    requireExactTests(expected, passed, true);
    for (const status of ['skipped', 'failed', 'timedOut', 'interrupted']) {
        const changed = structuredClone(passed); changed[0].test.results[0].status = status;
        assert.throws(() => requireExactTests(expected, changed, true), /must pass once/);
    }
    passed[0].test.results.push({ status: 'passed' });
    assert.throws(() => requireExactTests(expected, passed, true), /must pass once/);
});

test('the observed serial built-demo budget leaves lane 1 less native work without dropping coverage', () => {
    const tests = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => row(id, id + '.spec.ts'));
    const measured = { files: Object.fromEntries(tests.map(t => [t.file, 20])), tests: {} };
    const original = partitionTests(tests, measured);
    const reserved = partitionTests(tests, { ...measured, builtDemoSeconds: 15 });
    requireExactTests(tests, reserved.flatMap(p => p.tests));
    assert.equal(original[0].tests.length, 2);
    assert.equal(reserved[0].tests.length, 1);
    assert.ok(Math.max(...reserved.map(p => p.seconds)) - Math.min(...reserved.map(p => p.seconds)) <= 20);
});

test('invalid built-demo measurements fail closed instead of changing the selected coverage', () => {
    for (const builtDemoSeconds of [-1, Infinity, NaN, '10', false])
        assert.throws(() => partitionTests([row('a', 'x')], { files: { x: 1 }, tests: {}, builtDemoSeconds }, 1), /Invalid built-demo timing/);
});

test('four-worker scheduling reserves the serial demo wall time without losing native cases', () => {
    const tests = Array.from({ length: 12 }, (_, i) => row(String(i), i + '.spec.ts'));
    const measured = { files: Object.fromEntries(tests.map(t => [t.file, 20])), tests: {}, builtDemoSeconds: 15 };
    const two = partitionTests(tests, measured, 3, 2);
    const four = partitionTests(tests, measured, 3, 4);
    requireExactTests(tests, four.flatMap(p => p.tests));
    assert.ok(four[0].tests.length < two[0].tests.length, 'the serial demo requires more reserved capacity with four workers');
    for (const [workers, plan] of [[2, two], [4, four]]) {
        assert.equal(plan[0].seconds - plan[0].groups.reduce((sum, g) => sum + g.seconds, 0), 15 * workers);
        assert.ok(plan.every(p => p.tests.length > 0));
    }
    for (const workers of [0, 5, -1, 1.5, NaN, Infinity, '4'])
        assert.throws(() => partitionTests(tests, measured, 3, workers), /Invalid worker count/);
});

test('discovery errors, wrong projects, duplicate IDs and empty inventories fail closed', () => {
    for (const report of [{ errors: [{}], suites: [] }, { suites: [] }])
        assert.throws(() => collectedTests(report, 'chromium'));
    const spec = { id: 'a', file: 'x.spec.ts', title: 'x', tests: [{ projectName: 'firefox' }] };
    assert.throws(() => collectedTests({ suites: [{ specs: [spec] }] }, 'chromium'), /project/);
    assert.throws(() => collectedTests({ suites: [{ specs: [spec, spec] }] }, 'firefox'), /duplicate/);
    assert.throws(() => partitionTests([row('a', 'x')], timing, 3), /count/);
    assert.throws(() => partitionTests([row('a', 'x')], { files: { x: -1 }, tests: {} }, 1), /timing/);
});

test('real Playwright selectors cover the current Chrome/Firefox inventories exactly once', { timeout: 60_000 }, () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const outputRoot = path.join(root, 'test-results');
    fs.mkdirSync(outputRoot, { recursive: true });
    const output = fs.mkdtempSync(path.join(outputRoot, 'ci-discovery-'));
    const timings = JSON.parse(fs.readFileSync(new URL('../scripts/ci-timings.json', import.meta.url), 'utf8'));
    function collect(project, extra = []) {
        const result = spawnSync(process.execPath, [path.join(root, 'node_modules/@playwright/test/cli.js'),
            'test', `--project=${project}`, '--list', '--reporter=json', ...extra],
        { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 15_000, maxBuffer: 32 * 1024 * 1024 });
        assert.equal(result.status, 0, result.error?.message ?? result.stderr);
        return collectedTests(JSON.parse(result.stdout), project);
    }
    try {
        for (const project of ['chromium', 'firefox']) {
            const inventory = collect(project);
            const partitions = partitionTests(inventory, timings.projects[project], 8, 2);
            const executed = [];
            for (const [index, partition] of partitions.entries()) {
                const list = path.join(output, `${project}-${index}.txt`);
                fs.writeFileSync(list, testList(partition, project));
                const selected = collect(project, ['--test-list', list]);
                requireExactTests(partition.tests, selected);
                executed.push(...selected);
            }
            requireExactTests(inventory, executed);
            console.log(`${project}: ${inventory.length}/${executed.length} tests, partitions ${partitions.map(p => p.tests.length).join('/')}`);
        }
    } finally {
        fs.rmSync(output, { recursive: true });
    }
});
