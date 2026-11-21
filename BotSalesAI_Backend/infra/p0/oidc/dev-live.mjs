import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { appOrigin, localTls } from './tls.mjs';

if (process.env.APP_ORIGIN !== appOrigin) throw new Error('Use the local HTTPS app origin for the P0 frontend');
const frontendPackage = new URL('../../../../BotSalesAI_Frontend/package.json', import.meta.url);
const require = createRequire(frontendPackage);
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const vite = await createServer({
    root: fileURLToPath(new URL('apps/web/', frontendPackage)),
    mode: 'development',
    server: { host: 'localhost', port: 5173, strictPort: true, https: localTls() },
});
await vite.listen();
vite.printUrls();
