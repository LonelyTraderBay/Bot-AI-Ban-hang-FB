import { setTimeout as delay } from 'node:timers/promises';
import { runWorker } from '../../../apps/worker/src/runner.mjs';

const scenario = process.env.BE10_JOB_PAUSE;
let releaseJobs;
const heldJobs = scenario === 'tenant-burst' ? new Promise(resolve => { releaseJobs = resolve; }) : undefined;
const handlers = new Map([['createProductImport', async (job, { beginExternalEffect }) => {
    if (job.input.scenario === 'persistent-failure') throw new Error('Fixture job failure');
    if (heldJobs && job.input.scenario === 'held') {
        console.log('fixture tenant job waiting');
        await heldJobs;
    }
    if (scenario === 'before' && job.input.scenario === 'before') {
        console.log('before effect ' + job.id);
        await delay(30000);
    }
    if (scenario === 'after' && job.input.scenario === 'after') {
        await beginExternalEffect();
        console.log('fixture provider accepted ' + job.id);
        await delay(30000);
    }
    return { status: 'succeeded', completed: 1, total: 1, errorCount: 0 };
}]]);

let releaseDispatch;
const dispatchBarrier = scenario === 'dispatch' ? new Promise(resolve => { releaseDispatch = resolve; }) : undefined;
let polls = 0;
let settled = false;
const pollDispatch = dispatchBarrier ? async () => {
    polls++;
    console.log('fixture dispatch waiting');
    await dispatchBarrier;
    settled = true;
} : undefined;
let parallelPolls = 0;
const dispatchers = pollDispatch ? [pollDispatch, () => {
    if (++parallelPolls === 1) console.log('fixture parallel dispatch advanced');
}] : [];
process.on('message', message => {
    if (message === 'shutdown') {
        process.emit('SIGTERM');
        console.log('fixture shutdown requested');
    }
    if (message === 'release-dispatch') releaseDispatch?.();
    if (message === 'release-jobs') releaseJobs?.();
});
await runWorker(() => handlers, process.env.BE10_JOB_QUEUE_PREFIX, undefined, dispatchers);
if (pollDispatch && (polls !== 1 || !settled)) throw new Error('Dispatch callback did not drain on shutdown');
process.disconnect?.();
