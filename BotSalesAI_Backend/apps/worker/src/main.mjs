import { runWorker } from './runner.mjs';
import { catalogJobHandlers } from '../../api/dist/modules/catalog/index.js';
import { expireOrdersWithReservations } from '../../api/dist/modules/orders/index.js';

runWorker(catalogJobHandlers, undefined, expireOrdersWithReservations).catch(() => {
    console.error('Worker could not start. Check DATABASE_URL and REDIS_URL.');
    process.exitCode = 1;
});
