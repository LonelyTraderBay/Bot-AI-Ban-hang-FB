import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {FullConfig} from '@playwright/test';
import {createServer} from 'vite';

/** Own the server in this process; teardown needs no shell or Windows process-tree kill. */
export default async function setup(config:FullConfig) {
    const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
    const url=new URL(config.projects[0].use.baseURL!);
    const server=await createServer({configFile:path.join(root,'apps/web/vite.config.ts'),root:path.join(root,'apps/web'),mode:'demo',server:{host:url.hostname,port:Number(url.port),strictPort:true},cacheDir:process.env.BOTSALES_VITE_CACHE_DIR,logLevel:'error'});
    try{await server.listen();}catch(error){await server.close();throw error;}
    return async()=>{await server.close();};
}
