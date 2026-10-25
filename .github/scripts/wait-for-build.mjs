import { realpathSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { readAttemptJobs } from './require-success.mjs';

// Prepare browsers while the build runs, but consume only its successful artifact.
export async function waitForBuild(env = process.env, {
    fetchImpl = fetch, now = () => performance.now(), sleep = delay,
    timeoutMs = 900_000, pollMs = 5_000,
} = {}) {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 900_000
        || !Number.isSafeInteger(pollMs) || pollMs < 1 || pollMs > 5_000)
        throw new Error('Invalid bounded build wait.');
    for (const key of ['GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) {
        if (!/^[1-9]\d*$/.test(env[key] ?? '') || !Number.isSafeInteger(Number(env[key])))
            throw new Error(`${key} must be a positive safe integer.`);
    }
    const runId = Number(env.GITHUB_RUN_ID), attempt = Number(env.GITHUB_RUN_ATTEMPT);
    const start = now(), deadline = start + timeoutMs;
    while (true) {
        const payload = await readAttemptJobs({ repository: env.GITHUB_REPOSITORY,
            runId, attempt, token: env.GITHUB_TOKEN }, fetchImpl);
        if (!payload || !Array.isArray(payload.jobs) || !Number.isInteger(payload.total_count)
            || payload.total_count !== payload.jobs.length || payload.total_count > 100)
            throw new Error('Incomplete or invalid job inventory while waiting for build.');
        const ids = new Set(), names = new Set();
        for (const job of payload.jobs) {
            if (!job || !Number.isSafeInteger(job.id) || job.run_id !== runId || job.run_attempt !== attempt
                || typeof job.name !== 'string' || ids.has(job.id) || names.has(job.name))
                throw new Error('Invalid or duplicate job identity while waiting for build.');
            ids.add(job.id); names.add(job.name);
        }
        const build = payload.jobs.find(job => job.name === 'build (browser artifacts)');
        if (build?.status === 'completed' && build.conclusion === 'success')
            return { runId, attempt, buildJobId: build.id, waitedSeconds: (now() - start) / 1000 };
        if (build && (!['queued', 'in_progress'].includes(build.status) || build.conclusion !== null))
            throw new Error(`Build is not successful: ${build.status}/${build.conclusion}.`);
        const remaining = deadline - now();
        if (remaining <= 0) throw new Error('Timed out waiting for this attempt to produce a successful build.');
        await sleep(Math.min(pollMs, remaining));
    }
}

if (process.argv[1] && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url) {
    try {
        if (process.argv.length !== 2) throw new Error('Usage: node wait-for-build.mjs');
        console.log(JSON.stringify({ kind: 'current-build-ready', ...await waitForBuild() }));
    } catch (error) {
        console.error(`Current-run build required: ${error.message}`);
        process.exitCode = 1;
    }
}
