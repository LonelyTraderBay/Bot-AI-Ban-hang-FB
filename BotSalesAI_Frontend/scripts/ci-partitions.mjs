// Timing changes scheduling only. The current Playwright inventory owns coverage.
const splitFile = 'states/route-role-state-composition.spec.ts';

export function collectedTests(report, project) {
    if (report.errors?.length || !Array.isArray(report.suites)) throw new Error('Playwright discovery failed.');
    const tests = [];
    function visit(suite, parents) {
        for (const spec of suite.specs ?? []) {
            for (const test of spec.tests ?? []) {
                if (test.projectName !== project) throw new Error('Unexpected project in inventory.');
                const file = spec.file.replaceAll('\\', '/');
                const title = [...parents, spec.title].join(' › ');
                tests.push({ id: spec.id, file, title, key: `${file} › ${title}`, test });
            }
        }
        for (const child of suite.suites ?? []) visit(child, [...parents, child.title]);
    }
    for (const suite of report.suites) visit(suite, []);
    if (!tests.length || new Set(tests.map(t => t.id)).size !== tests.length)
        throw new Error('Empty or duplicate Playwright inventory.');
    return tests;
}

export function partitionTests(tests, timing, total = 3) {
    if (!Number.isInteger(total) || total < 1 || total > tests.length) throw new Error('Invalid partition count.');
    const groups = new Map();
    for (const test of tests) {
        // Other files retain their existing hook/order semantics.
        const key = test.file === splitFile ? test.key : test.file;
        if (!groups.has(key)) groups.set(key, { key, tests: [], selector: key, seconds: 0 });
        groups.get(key).tests.push(test);
    }
    for (const group of groups.values()) {
        const measured = group.tests[0].file === splitFile ? timing.tests[group.key] : timing.files[group.key];
        group.seconds = measured ?? group.tests.length * 30;
        if (!Number.isFinite(group.seconds) || group.seconds <= 0) throw new Error('Invalid timing: ' + group.key);
    }
    // Longest groups first; deterministic tie breaks keep all jobs on the same plan.
    const sorted = [...groups.values()].sort((a, b) => b.seconds - a.seconds || a.key.localeCompare(b.key, 'en'));
    const partitions = Array.from({ length: total }, () => ({ seconds: 0, groups: [], tests: [] }));
    for (const group of sorted) {
        const target = partitions.reduce((best, next) => next.seconds < best.seconds ? next : best);
        target.groups.push(group);
        target.tests.push(...group.tests);
        target.seconds += group.seconds;
    }
    if (partitions.some(p => !p.tests.length)) throw new Error('Empty CI partition.');
    return partitions;
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
