import { setTimeout as delay } from 'node:timers/promises';
import { runWorker } from '../../../apps/worker/src/runner.mjs';

const scenario = process.env.BE10_JOB_PAUSE;
const handlers = new Map([['createProductImport', async (job, { beginExternalEffect }) => {
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

process.on('message', message => {
    if (message === 'shutdown') process.emit('SIGTERM');
});
await runWorker(() => handlers, process.env.BE10_JOB_QUEUE_PREFIX);
process.disconnect?.();
