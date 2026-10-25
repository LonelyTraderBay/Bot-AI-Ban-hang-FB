// Timing changes scheduling only. The current Playwright inventory owns coverage.
export const independentRoleFiles = Object.freeze([
    'states/route-role-state-composition.spec.ts',
    'states/route-role-ready-composition.spec.ts',
]);

// These cases also own fresh page/context state; the server URL is worker-local.
export const independentTestFiles = Object.freeze([
    ...independentRoleFiles,
    'states/route-error-composition.spec.ts',
    'ui61-consistency.spec.ts',
    'ui-composition-layout.spec.ts',
    'ui-toolbar-layout.spec.ts',
]);

export function collectedTests(report, project) {
    if (report.errors?.length || !Array.isArray(report.suites)) throw new Error('Playwright discovery failed.');
    const tests = [];
    function visit(suite, parents) {
        for (const spec of suite.specs ?? []) {
            for (const test of spec.tests ?? []) {
                if (test.projectName !== project) throw new Error('Unexpected project in inventory.');
                const file = spec.file.replaceAll('\\', '/');
                const title = [...parents, spec.title].join(' › ');
                tests.push({ id: spec.id, file, title, key: `${file} › ${title}`, order: tests.length, test });
            }
        }
        for (const child of suite.suites ?? []) visit(child, [...parents, child.title]);
    }
    for (const suite of report.suites) visit(suite, []);
    if (!tests.length || new Set(tests.map(t => t.id)).size !== tests.length)
        throw new Error('Empty or duplicate Playwright inventory.');
    return tests;
}

export function partitionTests(tests, timing, total = 3, workers = 2) {
    if (!Number.isInteger(total) || total < 1 || total > tests.length) throw new Error('Invalid partition count.');
    if (!Number.isInteger(workers) || workers < 1 || workers > 4) throw new Error('Invalid worker count.');
    const groups = new Map();
    for (const test of tests) {
        // Other files retain their existing hook/order semantics.
        const key = independentTestFiles.includes(test.file) ? test.key : test.file;
        if (!groups.has(key)) groups.set(key, { key, tests: [], selector: key, seconds: 0 });
        groups.get(key).tests.push(test);
    }
    for (const group of groups.values()) {
        const measured = independentTestFiles.includes(group.tests[0].file) ? timing.tests[group.key] : timing.files[group.key];
        group.seconds = measured ?? group.tests.length * 30;
        if (!Number.isFinite(group.seconds) || group.seconds <= 0) throw new Error('Invalid timing: ' + group.key);
    }
    // Longest groups first; deterministic tie breaks keep all jobs on the same plan.
    const sorted = [...groups.values()].sort((a, b) => b.seconds - a.seconds || a.key.localeCompare(b.key, 'en'));
    const builtDemoSeconds = timing.builtDemoSeconds ?? 0;
    if (!Number.isFinite(builtDemoSeconds) || builtDemoSeconds < 0) throw new Error('Invalid built-demo timing.');
    // Lane 1 runs the built-demo suite serially after native E2E. Convert that
    // observed wall time to a duration budget for the requested worker count.
    const partitions = Array.from({ length: total }, (_, index) => ({ seconds: index === 0 ? builtDemoSeconds * workers : 0,
        estimatedWallSeconds: index === 0 ? builtDemoSeconds : 0, groups: [], tests: [] }));
    for (const group of sorted) {
        const choices = partitions.map((partition, index) => ({ partition, index,
            wall: estimateWorkerQueue([...partition.groups, group], workers) + (index === 0 ? builtDemoSeconds : 0) }));
        choices.sort((a, b) => a.wall - b.wall || a.partition.seconds - b.partition.seconds || a.index - b.index);
        const target = choices[0].partition;
        target.groups.push(group);
        target.tests.push(...group.tests);
        target.seconds += group.seconds;
        target.estimatedWallSeconds = choices[0].wall;
    }
    if (partitions.some(p => !p.tests.length)) throw new Error('Empty CI partition.');
    return partitions;
}

// Approximate the current native queue, without importing Playwright internals.
// Ordinary files remain indivisible; explicit parallel all-hooks suites split
// selected cases into ceil(count / workers) chunks in their discovery order.
// This is a scheduling hint. Native selection/results still own correctness.
function estimateWorkerQueue(groups, workers) {
    const files = new Map();
    for (const group of groups) {
        const file = group.tests[0].file;
        if (!files.has(file)) files.set(file, []);
        files.get(file).push(group);
    }
    const queue = [];
    for (const file of [...files.keys()].sort()) {
        const selected = files.get(file);
        if (!independentTestFiles.includes(file)) {
            queue.push(selected[0].seconds);
            continue;
        }
        selected.sort((a, b) => (a.tests[0].order ?? 0) - (b.tests[0].order ?? 0) || a.key.localeCompare(b.key, 'en'));
        const size = Math.ceil(selected.length / workers);
        for (let i = 0; i < selected.length; i += size)
            queue.push(selected.slice(i, i + size).reduce((sum, group) => sum + group.seconds, 0));
    }
    const available = Array(workers).fill(0);
    for (const seconds of queue) {
        const next = available.indexOf(Math.min(...available));
        available[next] += seconds;
    }
    return Math.max(...available);
}

export function requireExactTests(expected, actual, requirePassed = false) {
    const ids = rows => rows.map(t => t.id).sort();
    if (JSON.stringify(ids(expected)) !== JSON.stringify(ids(actual)))
        throw new Error('Selected/executed tests differ from the planned inventory.');
    if (requirePassed && actual.some(t => t.test.expectedStatus !== 'passed'
        || t.test.results.length !== 1 || t.test.results[0].status !== 'passed'))
        throw new Error('Every planned test must pass once; skipped/retried/missing results are rejected.');
}

export function testList(partition, project) {
    return partition.groups.map(g => `[${project}] › ${g.selector}`).join('\n') + '\n';
}
