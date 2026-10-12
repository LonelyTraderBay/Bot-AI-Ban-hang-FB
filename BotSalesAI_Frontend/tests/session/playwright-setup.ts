import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {FullConfig} from '@playwright/test';
import {createServer} from 'vite';
import {closeIsolatedViteCacheServer} from '../../scripts/vite-cache.mjs';

/** Own the server in this process; teardown needs no shell or Windows process-tree kill. */
export default async function setup(config:FullConfig) {
    const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
    const url=new URL(config.projects[0].use.baseURL!);
    const runId=process.env.BOTSALES_VITE_CACHE_RUN_ID;
    if (!runId) throw new Error('Playwright Vite cache run ID is missing.');

    let server;
    try {
        server=await createServer({configFile:path.join(root,'apps/web/vite.config.ts'),root:path.join(root,'apps/web'),mode:'demo',server:{host:url.hostname,port:Number(url.port),strictPort:true},cacheDir:process.env.BOTSALES_VITE_CACHE_DIR,logLevel:'error'});
        await server.listen();
    } catch(error) {
        try {
            await closeIsolatedViteCacheServer(server,root,'playwright-webserver',runId);
        } catch(cleanupError) {
            throw new AggregateError([error,cleanupError],'Playwright Vite server failed to start and its run cache cleanup also failed.');
        }
        throw error;
    }
    return async()=>{await closeIsolatedViteCacheServer(server,root,'playwright-webserver',runId);};
}
