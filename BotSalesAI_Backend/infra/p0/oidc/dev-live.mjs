import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { appOrigin, localTls } from './tls.mjs';

if (process.env.APP_ORIGIN !== appOrigin) throw new Error('Use the local HTTPS app origin for the P0 frontend');
const frontendPackage = new URL('../../../../BotSalesAI_Frontend/package.json', import.meta.url);
const require = createRequire(frontendPackage);
const { createServer, preview } = await import(pathToFileURL(require.resolve('vite')).href);
const https = localTls();
const [release] = process.argv.slice(2);
if (release) {
    if (process.env.API_PROXY_TARGET !== 'http://127.0.0.1:3000') throw new Error('Use the local API proxy target for packaged browser checks');
    const server = await preview({
        configFile: false,
        build: { outDir: join(release, 'web') },
        preview: { host: 'localhost', port: 5173, strictPort: true, https, proxy: { '/api': { target: process.env.API_PROXY_TARGET } } },
    });
    server.printUrls();
} else {
    const vite = await createServer({
        root: fileURLToPath(new URL('apps/web/', frontendPackage)),
        mode: 'development',
        server: { host: 'localhost', port: 5173, strictPort: true, https },
    });
    await vite.listen();
    vite.printUrls();
}
