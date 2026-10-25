import path from 'node:path';
import { fileURLToPath } from 'node:url';

const browserProducers = ['verify (source and build)', 'build (browser artifacts)', 'built demo (both engines)',
    ...['chromium', 'firefox'].flatMap(browser => [1, 2, 3, 4, 5, 6, 7, 8, 9].map(shard => `e2e (${browser} ${shard}-of-9)`))];

export const profiles = {
    chromium: {
        needs: ['verify', 'build-artifacts', 'e2e', 'built-demo'],
        gate: 'e2e (chromium all)',
        jobs: browserProducers,
        // The final gate cannot complete until this aggregate has succeeded.
        downstreamJobs: ['gate frontend (success only)'],
    },
    frontend: {
        needs: ['verify', 'build-artifacts', 'e2e', 'built-demo', 'chromium-gate'],
        gate: 'gate frontend (success only)',
        jobs: [...browserProducers, 'e2e (chromium all)'],
    },
    'repository-hygiene': {
        needs: ['check'],
        gate: 'gate repository hygiene (success only)',
        jobs: ['repository-hygiene (ubuntu-latest)', 'repository-hygiene (windows-latest)'],
    },
};

function profileFor(name) {
    if (!Object.hasOwn(profiles, name)) throw new Error(`Unknown gate profile: ${name}`);
    return profiles[name];
}

export function requireSuccessfulNeeds(name, needs) {
    const profile = profileFor(name);
    if (!needs || typeof needs !== 'object' || Array.isArray(needs)
        || Object.keys(needs).sort().join(',') !== [...profile.needs].sort().join(','))
        throw new Error('Gate dependencies do not match the required job IDs.');
    for (const id of profile.needs) {
        if (needs[id]?.result !== 'success')
            throw new Error(`Required dependency ${id} returned ${needs[id]?.result}; only success is allowed.`);
    }
}

export function requireSuccessfulJobs(name, payload, { runId, attempt }) {
    const profile = profileFor(name);
    if (!payload || !Array.isArray(payload.jobs) || !Number.isInteger(payload.total_count)
        || payload.total_count !== payload.jobs.length || payload.total_count > 100)
        throw new Error('Incomplete or invalid job inventory; rerun all jobs if this was a partial rerun.');
    const seen = new Set();
    const ids = new Set();
    for (const job of payload.jobs) {
        if (!job || !Number.isSafeInteger(job.id) || ids.has(job.id)
            || job.run_id !== runId || job.run_attempt !== attempt)
            throw new Error('Job identity does not match this workflow run and attempt.');
        ids.add(job.id);
        if (seen.has(job.name)) throw new Error(`Duplicate job: ${job.name}`);
        seen.add(job.name);
        // The gate itself is still running; only its upstream jobs are evaluated.
        if (job.name === profile.gate) continue;
        if (profile.downstreamJobs?.includes(job.name)) continue;
        if (!profile.jobs.includes(job.name)) throw new Error(`Unexpected job: ${job.name}`);
        if (job.status !== 'completed' || job.conclusion !== 'success')
            throw new Error(`Required job ${job.name}: ${job.status}/${job.conclusion}; only completed/success is allowed.`);
    }
    for (const required of profile.jobs) {
        if (!seen.has(required)) throw new Error(`Missing required job: ${required}; rerun all jobs.`);
    }
    return { profile: name, runId, attempt, successfulJobs: profile.jobs };
}

function positiveInteger(value, name) {
    if (!/^[1-9]\d*$/.test(value ?? '') || !Number.isSafeInteger(Number(value)))
        throw new Error(`${name} must be a positive safe integer.`);
    return Number(value);
}

export async function readAttemptJobs({ repository, runId, attempt, token }, fetchImpl = fetch) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || !token)
        throw new Error('A repository and read-only GitHub token are required.');
    positiveInteger(String(runId), 'runId');
    positiveInteger(String(attempt), 'attempt');
    const response = await fetchImpl(
        `https://api.github.com/repos/${repository}/actions/runs/${runId}/attempts/${attempt}/jobs?per_page=100`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28' },
            signal: AbortSignal.timeout(30_000),
        });
    if (!response.ok) throw new Error(`GitHub job lookup failed (HTTP ${response.status}); gate stays closed.`);
    try { return await response.json(); }
    catch { throw new Error('GitHub returned invalid job metadata; gate stays closed.'); }
}

export async function runGate(name, env = process.env, fetchImpl = fetch) {
    const needs = JSON.parse(env.NEEDS_JSON ?? 'null');
    requireSuccessfulNeeds(name, needs);
    const runId = positiveInteger(env.GITHUB_RUN_ID, 'GITHUB_RUN_ID');
    const attempt = positiveInteger(env.GITHUB_RUN_ATTEMPT, 'GITHUB_RUN_ATTEMPT');
    const jobs = await readAttemptJobs({ repository: env.GITHUB_REPOSITORY, runId, attempt,
        token: env.GITHUB_TOKEN }, fetchImpl);
    return requireSuccessfulJobs(name, jobs, { runId, attempt });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        if (process.argv.length !== 3) throw new Error('Usage: node require-success.mjs <chromium|frontend|repository-hygiene>');
        console.log(JSON.stringify({ status: 'PASS', ...await runGate(process.argv[2]) }, null, 2));
    } catch (error) {
        console.error(`Required CI gate failed: ${error.message}`);
        process.exitCode = 1;
    }
}
