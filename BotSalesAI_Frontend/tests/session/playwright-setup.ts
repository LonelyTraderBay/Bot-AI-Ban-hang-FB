import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {FullConfig} from '@playwright/test';
import {createServer} from 'vite';
import {closeIsolatedViteCacheServer} from '../../scripts/vite-cache.mjs';
import {startDemoPreview} from './demo-server.mjs';

/** Own the server in this process; teardown needs no shell or Windows process-tree kill. */
export default async function setup(config:FullConfig) {
    const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
    const url=new URL(config.projects[0].use.baseURL!);
    const runId=process.env.BOTSALES_VITE_CACHE_RUN_ID;
    if (!runId) throw new Error('Playwright Vite cache run ID is missing.');

    let server;
    let built;
    const runtime=process.env.BOTSALES_E2E_RUNTIME ?? 'dev';
    if (!['dev','preview'].includes(runtime)) throw new Error('Demo runtime must be dev or preview.');
    const close=async()=>{
        delete process.env.BOTSALES_SHARED_DEMO_URL;
        delete process.env.BOTSALES_SHARED_DEMO_CACHE_DIR;
        delete process.env.BOTSALES_SHARED_PREVIEW_URL;
        const results=await Promise.allSettled([built?.close(),closeIsolatedViteCacheServer(server,root,'playwright-webserver',runId)]);
        const errors=results.filter(result=>result.status==='rejected').map(result=>result.reason);
        if(errors.length)throw new AggregateError(errors,'Playwright server cleanup failed.');
    };
    try {
        server=await createServer({configFile:path.join(root,'apps/web/vite.config.ts'),root:path.join(root,'apps/web'),mode:'demo',server:{host:url.hostname,port:runtime==='preview'?0:Number(url.port),strictPort:runtime==='dev'},cacheDir:process.env.BOTSALES_VITE_CACHE_DIR,logLevel:'error'});
        await server.listen();
        // One optimizer owner per run. Browser pages keep their own MSW state.
        const address=server.httpServer!.address();
        if(!address||typeof address==='string')throw new Error('Demo dev server did not expose a local port.');
        process.env.BOTSALES_SHARED_DEMO_URL=`http://${url.hostname}:${address.port}`;
        process.env.BOTSALES_SHARED_DEMO_CACHE_DIR=process.env.BOTSALES_VITE_CACHE_DIR;
        if(runtime==='preview'){
            built=await startDemoPreview({port:Number(url.port),strictPort:true});
            process.env.BOTSALES_SHARED_PREVIEW_URL=built.url;
        }
    } catch(error) {
        try {
            await close();
        } catch(cleanupError) {
            throw new AggregateError([error,cleanupError],'Playwright Vite server failed to start and its run cache cleanup also failed.');
        }
        throw error;
    }
    return close;
}
