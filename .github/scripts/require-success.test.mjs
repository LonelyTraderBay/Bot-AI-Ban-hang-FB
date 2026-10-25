import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { profiles, readAttemptJobs, requireSuccessfulJobs, requireSuccessfulNeeds, runGate } from './require-success.mjs';
import { waitForBuild } from './wait-for-build.mjs';

const context = { runId: 123, attempt: 2 };
const jobsFor = name => ({ total_count: profiles[name].jobs.length + 1, jobs: [
    ...profiles[name].jobs.map((job, index) => ({ id: index + 1, run_id: 123, run_attempt: 2,
        name: job, status: 'completed', conclusion: 'success' })),
    { id: 99, run_id: 123, run_attempt: 2, name: profiles[name].gate, status: 'in_progress', conclusion: null },
] });
const needsFor = name => Object.fromEntries(profiles[name].needs.map(id => [id, { result: 'success' }]));

const buildEnv = { GITHUB_REPOSITORY: 'owner/repo', GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '2', GITHUB_TOKEN: 'test-token' };
const buildJob = (status, conclusion = null) => ({ id: 4, run_id: 123, run_attempt: 2, name: 'build (browser artifacts)', status, conclusion });
const inventory = jobs => ({ total_count: jobs.length, jobs });
function fakeBuildClock(payloads) {
    let time = 0, calls = 0;
    return { now: () => time, sleep: async ms => { time += ms; }, timeoutMs: 10, pollMs: 5,
        fetchImpl: async () => Response.json(payloads[Math.min(calls++, payloads.length - 1)]) };
}
test('build rendezvous waits through registration, queue and execution, accepting only current success', async () => {
    const ready = await waitForBuild(buildEnv, fakeBuildClock([inventory([]), inventory([buildJob('queued')]),
        inventory([buildJob('in_progress')]), inventory([buildJob('completed', 'success')])].slice(1)));
    assert.equal(ready.buildJobId, 4); assert.equal(ready.runId, 123); assert.equal(ready.attempt, 2);
    const registration = await waitForBuild(buildEnv, fakeBuildClock([inventory([]), inventory([buildJob('completed', 'success')])]));
    assert.equal(registration.waitedSeconds, 0.005);
});
test('build rendezvous rejects every unsuccessful terminal result and unknown state immediately', async () => {
    for (const conclusion of ['failure', 'cancelled', 'skipped', 'neutral', 'timed_out', 'action_required', 'stale', null])
        await assert.rejects(waitForBuild(buildEnv, fakeBuildClock([inventory([buildJob('completed', conclusion)])])), /not successful/);
    for (const job of [buildJob('unknown'), buildJob('in_progress', 'success')])
        await assert.rejects(waitForBuild(buildEnv, fakeBuildClock([inventory([job])])), /not successful/);
});
test('build rendezvous rejects incomplete metadata and cross-attempt or duplicate identities', async () => {
    const good = buildJob('completed', 'success');
    for (const payload of [null, {}, { total_count: 1, jobs: [] }, inventory([good, good]),
        inventory([{ ...good, run_id: 124 }]), inventory([{ ...good, run_attempt: 1 }]),
        inventory([good, { ...good, id: 5 }]), inventory([{ ...good, id: '4' }])])
        await assert.rejects(waitForBuild(buildEnv, fakeBuildClock([payload])), /inventory|identity/);
});
test('build rendezvous times out missing or unfinished producers without accepting an artifact', async () => {
    for (const jobs of [[], [buildJob('queued')], [buildJob('in_progress')]])
        await assert.rejects(waitForBuild(buildEnv, fakeBuildClock([inventory(jobs)])), /Timed out/);
});
test('build rendezvous propagates API and network errors without polling past the error', async () => {
    for (const fetchImpl of [async () => new Response('{}', { status: 403 }),
        async () => new Response('invalid'), async () => { throw new Error('network unavailable'); }])
        await assert.rejects(waitForBuild(buildEnv, { fetchImpl }), /gate stays closed|invalid job metadata|network unavailable/);
});
test('build rendezvous validates its bounded wait and workflow context before reading metadata', async () => {
    const fetchImpl = async () => { assert.fail('No API call for invalid context'); };
    for (const value of ['0', '-1', '1e2', '9007199254740992'])
        await assert.rejects(waitForBuild({ ...buildEnv, GITHUB_RUN_ID: value }, { fetchImpl }), /positive safe integer/);
    for (const options of [{ timeoutMs: 0 }, { timeoutMs: 900001 }, { pollMs: 0 }, { pollMs: 5001 }])
        await assert.rejects(waitForBuild(buildEnv, { ...options, fetchImpl }), /bounded build wait/);
});

for (const name of Object.keys(profiles)) {
    test(`${name}: accepts every required job, including all matrix children`, () => {
        requireSuccessfulNeeds(name, needsFor(name));
        assert.deepEqual(requireSuccessfulJobs(name, jobsFor(name), context).successfulJobs, profiles[name].jobs);
    });
    for (const jobName of profiles[name].jobs) {
        for (const conclusion of ['skipped', 'neutral']) {
            test(`${name}: rejects ${conclusion} for ${jobName} even when needs reports success`, () => {
                const payload = jobsFor(name);
                payload.jobs.find(job => job.name === jobName).conclusion = conclusion;
                requireSuccessfulNeeds(name, needsFor(name));
                assert.throws(() => requireSuccessfulJobs(name, payload, context), /only completed\/success/);
            });
        }
    }
    for (const result of ['failure', 'cancelled', 'skipped', 'neutral', null, undefined]) {
        test(`${name}: rejects dependency result ${result}`, () => {
            const needs = needsFor(name);
            needs[profiles[name].needs[0]].result = result;
            assert.throws(() => requireSuccessfulNeeds(name, needs), /only success/);
        });
    }
}

for (const conclusion of ['failure', 'cancelled', 'timed_out', 'action_required', 'stale', null]) {
    test(`rejects upstream conclusion ${conclusion}`, () => {
        const payload = jobsFor('frontend');
        payload.jobs[0].conclusion = conclusion;
        assert.throws(() => requireSuccessfulJobs('frontend', payload, context), /only completed\/success/);
    });
}
test('rejects unfinished, missing, duplicate and unexpected jobs', () => {
    const unfinished = jobsFor('frontend'); unfinished.jobs[0].status = 'in_progress';
    assert.throws(() => requireSuccessfulJobs('frontend', unfinished, context), /only completed\/success/);
    const missing = jobsFor('frontend'); missing.jobs.shift(); missing.total_count--;
    assert.throws(() => requireSuccessfulJobs('frontend', missing, context), /Missing required job/);
    const duplicate = jobsFor('frontend'); duplicate.jobs[1].name = duplicate.jobs[0].name;
    assert.throws(() => requireSuccessfulJobs('frontend', duplicate, context), /Duplicate job/);
    const unexpected = jobsFor('frontend'); unexpected.jobs[0].name = 'renamed verification';
    assert.throws(() => requireSuccessfulJobs('frontend', unexpected, context), /Unexpected job/);
});
test('rejects job identities from another run, attempt or a duplicate ID', () => {
    for (const change of [job => { job.run_id = 124; }, job => { job.run_attempt = 1; }, job => { job.id = 2; }]) {
        const payload = jobsFor('frontend'); change(payload.jobs[0]);
        assert.throws(() => requireSuccessfulJobs('frontend', payload, context), /Job identity/);
    }
});
test('rejects malformed or truncated inventories and invalid dependency IDs', () => {
    for (const payload of [null, {}, { total_count: 1, jobs: [] }, { total_count: 101, jobs: Array(101).fill({}) }])
        assert.throws(() => requireSuccessfulJobs('frontend', payload, context), /inventory/);
    for (const needs of [null, [], {}, { verify: { result: 'success' } }, { ...needsFor('frontend'), extra: {} }])
        assert.throws(() => requireSuccessfulNeeds('frontend', needs), /dependencies/);
    assert.throws(() => requireSuccessfulNeeds('unknown', {}), /Unknown gate profile/);
});
test('uses the current attempt endpoint with read-only authentication and a bounded request', async () => {
    const payload = await readAttemptJobs({ repository: 'owner/repo', ...context, token: 'test-token' }, async (url, options) => {
        assert.equal(url, 'https://api.github.com/repos/owner/repo/actions/runs/123/attempts/2/jobs?per_page=100');
        assert.equal(options.headers.Authorization, 'Bearer test-token');
        assert.ok(options.signal instanceof AbortSignal);
        return Response.json(jobsFor('frontend'));
    });
    assert.equal(payload.total_count, profiles.frontend.jobs.length + 1);
});
test('API errors, invalid JSON and network failures keep the gate closed', async () => {
    const options = { repository: 'owner/repo', ...context, token: 'test-token' };
    for (const status of [401, 403, 404, 429, 500])
        await assert.rejects(readAttemptJobs(options, async () => new Response('{}', { status })), /gate stays closed/);
    await assert.rejects(readAttemptJobs(options, async () => new Response('invalid')), /invalid job metadata/);
    await assert.rejects(readAttemptJobs(options, async () => { throw new Error('network unavailable'); }), /network unavailable/);
});
test('runGate rejects bad context before requesting metadata and propagates strict job failures', async () => {
    const env = { GITHUB_REPOSITORY: 'owner/repo', GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '2',
        GITHUB_TOKEN: 'test-token', NEEDS_JSON: JSON.stringify(needsFor('frontend')) };
    const fetchJobs = async () => Response.json(jobsFor('frontend'));
    assert.equal((await runGate('frontend', env, fetchJobs)).attempt, 2);
    for (const value of ['0', '-1', 'invalid', '9007199254740992'])
        await assert.rejects(runGate('frontend', { ...env, GITHUB_RUN_ID: value }, fetchJobs), /positive safe integer/);
    await assert.rejects(runGate('frontend', { ...env, NEEDS_JSON: '{}' }, fetchJobs), /dependencies/);
    await assert.rejects(runGate('frontend', { ...env, GITHUB_TOKEN: '' }, fetchJobs), /token/);
    const neutral = jobsFor('frontend'); neutral.jobs[0].conclusion = 'neutral';
    await assert.rejects(runGate('frontend', env, async () => Response.json(neutral)), /only completed\/success/);
});
test('the Chromium aggregate tolerates only its named downstream gate and still rejects failed shards', () => {
    const payload = jobsFor('chromium');
    payload.jobs.push({ id: 100, run_id: 123, run_attempt: 2, name: 'gate frontend (success only)', status: 'queued', conclusion: null });
    payload.total_count++;
    requireSuccessfulJobs('chromium', payload, context);
    payload.jobs.find(job => job.name === 'e2e (chromium 9-of-9)').conclusion = 'failure';
    assert.throws(() => requireSuccessfulJobs('chromium', payload, context), /only completed\/success/);
});

test('both workflows wire always-running gates to every producer and keep read-only permissions', () => {
    for (const [name, dependencies] of [['frontend', '[verify, build-artifacts, e2e, built-demo, chromium-gate]'], ['repository-hygiene', '[check]']]) {
        const workflow = readFileSync(new URL(`../workflows/${name}.yml`, import.meta.url), 'utf8');
        const gate = workflow.match(/^  success-gate:[\s\S]*$/m)?.[0];
        assert.ok(gate, name);
        assert.ok(gate.includes(`name: ${profiles[name].gate}`));
        assert.ok(gate.includes(`needs: ${dependencies}`));
        assert.match(gate, /if: \$\{\{ always\(\) \}\}/);
        assert.match(gate, /actions: read/);
        if (name === 'frontend') assert.match(gate, /sparse-checkout: \.github\/scripts/);
        assert.doesNotMatch(workflow, /(?:actions|checks|statuses|contents): write|continue-on-error:/);
        assert.ok(gate.includes(`node .github/scripts/require-success.mjs ${name}`));
        assert.match(gate, /NEEDS_JSON: \$\{\{ toJSON\(needs\) \}\}/);
        assert.match(workflow, /^on:\r?\n  push:\r?\n    branches: \[main\]\r?\n  pull_request:/m,
            'Feature pushes must not duplicate PR CI; main pushes must retain full CI');
        assert.doesNotMatch(workflow, /^\s+paths(?:-ignore)?:/m, 'Required PR checks must run for every changed path');
    }
    const frontend = readFileSync(new URL('../workflows/frontend.yml', import.meta.url), 'utf8');
    const aggregate = frontend.match(/^  chromium-gate:[\s\S]*?(?=^  success-gate:)/m)?.[0];
    assert.ok(aggregate);
    assert.match(aggregate, /name: e2e \(chromium all\)/);
    assert.match(aggregate, /needs: \[verify, build-artifacts, e2e, built-demo\]/);
    assert.match(aggregate, /if: \$\{\{ always\(\) \}\}/);
    assert.match(aggregate, /actions: read/);
    assert.match(aggregate, /sparse-checkout: \.github\/scripts/);
    assert.match(aggregate, /node .github\/scripts\/require-success\.mjs chromium/);
    assert.match(aggregate, /NEEDS_JSON: \$\{\{ toJSON\(needs\) \}\}/);
    const producers = frontend.split(/^  chromium-gate:/m)[0];
    const verify = producers.split(/^  build-artifacts:/m)[0];
    const build = producers.match(/^  build-artifacts:[\s\S]*?(?=^  e2e:)/m)?.[0];
    const browserJobs = producers.match(/^  e2e:[\s\S]*?(?=^  built-demo:)/m)?.[0];
    const builtDemo = producers.match(/^  built-demo:[\s\S]*$/m)?.[0];
    assert.match(verify, /run: npm run verify/);
    assert.doesNotMatch(verify, /build:demo|upload-artifact/);
    assert.ok(build);
    assert.doesNotMatch(build, /needs:/, 'Artifact preparation runs independently of full verification');
    assert.match(build, /run: npm run build\r?\n/);
    assert.match(build, /run: npm run build:demo/);
    assert.match(build, /frontend-build-\$\{\{ github.run_id \}\}-\$\{\{ github.run_attempt \}\}-\$\{\{ github.sha \}\}/);
    assert.doesNotMatch(browserJobs, /needs:/, 'Native preparation overlaps the independent build');
    assert.match(browserJobs, /actions: read/);
    assert.match(browserJobs, /node \.\.\/\.github\/scripts\/wait-for-build\.mjs/);
    assert.ok(browserJobs.indexOf('npx playwright install') < browserJobs.indexOf('node ../.github/scripts/wait-for-build.mjs'));
    assert.ok(browserJobs.indexOf('node ../.github/scripts/wait-for-build.mjs') < browserJobs.indexOf('uses: actions/download-artifact'));
    assert.ok(builtDemo);
    assert.match(builtDemo, /needs: build-artifacts/);
    assert.match(builtDemo, /name: built demo \(both engines\)/);
    assert.match(builtDemo, /node scripts\/run-ci-built-demo\.mjs/);
    assert.doesNotMatch(browserJobs, /verify_built_demo|run-ci-built-demo/);
    assert.match(browserJobs, /actions\/download-artifact@[a-f0-9]{40}/);
    assert.match(browserJobs, /frontend-build-\$\{\{ github.run_id \}\}-\$\{\{ github.run_attempt \}\}-\$\{\{ github.sha \}\}/);
    assert.match(browserJobs, /BOTSALES_E2E_WORKERS: '2'/);
    assert.match(browserJobs, /kind: 'browser-runner-capacity'/);
    assert.match(browserJobs, /workers > availableCpus/);
    assert.match(browserJobs, /BOTSALES_E2E_RUNTIME: preview/);
    assert.match(browserJobs, /run: node scripts\/run-ci-e2e.mjs \$\{\{ matrix.browser \}\} \$\{\{ matrix.partition \}\}/);
    assert.doesNotMatch(browserJobs, /run: npm run (?:build|test:e2e)/, 'CI consumes the verified build once');
    assert.equal((browserJobs.match(/partition: '[1-9]\/9'/g) ?? []).length, 18);
    const hygiene = readFileSync(new URL('../workflows/repository-hygiene.yml', import.meta.url), 'utf8');
    assert.match(hygiene, /node --test .*check-repository-hygiene\.test\.mjs .*require-success\.test\.mjs/);
});
