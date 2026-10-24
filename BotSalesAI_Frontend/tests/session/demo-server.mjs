import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { preview } from 'vite';
import { createIsolatedViteCacheLifecycle, createViteCacheRunId, isolatedViteCacheDir } from '../../scripts/vite-cache.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const app = path.join(root, 'apps/web');
const fallbackRunId = `manual-${process.pid}-${randomUUID()}`;

async function freePort() {
    const server = net.createServer();
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Could not allocate a local demo port.');
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    return address.port;
}

export function startDemoServer(options) {
    // Isolation keys get a dedicated server; dev and live retain private process/cache.
    // Borrowers cannot close the global setup's server or remove its cache.
    const runtime = options?.runtime ?? process.env.BOTSALES_E2E_RUNTIME ?? 'dev';
    if (!['dev', 'preview'].includes(runtime)) throw new Error('Demo runtime must be dev or preview.');
    const sharedUrl = runtime === 'preview' ? process.env.BOTSALES_SHARED_PREVIEW_URL : process.env.BOTSALES_SHARED_DEMO_URL;
    if (sharedUrl && !options?.cacheIsolationKey) {
        const url = new URL(sharedUrl);
        if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:' || url.origin !== sharedUrl)
            throw new Error('The shared demo server must be a loopback HTTP origin.');
        return Promise.resolve({ url: sharedUrl, runtime, cacheDir: runtime === 'dev' ? process.env.BOTSALES_SHARED_DEMO_CACHE_DIR : undefined, close: async () => {} });
    }
    if (runtime === 'preview') return startDemoPreview();
    return startViteServer('demo', options);
}

/** Serve the exact current-run demo artifact; source/cache tests explicitly request dev. */
export async function startDemoPreview({ port = 0, strictPort = false } = {}) {
    if (!existsSync(path.join(app, 'dist-demo/index.html'))) throw new Error('Missing demo build; run npm run build:demo before preview E2E.');
    const server = await preview({ configFile: path.join(app, 'vite.config.ts'), root: app, mode: 'demo',
        logLevel: 'error', build: { outDir: 'dist-demo' }, preview: { host: '127.0.0.1', port, strictPort } });
    const address = server.httpServer.address();
    if (!address || typeof address === 'string') {
        await server.close();
        throw new Error('Demo preview did not expose a local port.');
    }
    let closing;
    return { url: `http://127.0.0.1:${address.port}`, runtime: 'preview', close: () => closing ??= server.close() };
}

export function startLiveServer(options) {
    return startViteServer('development', options);
}

async function startViteServer(mode, { timeoutMs = 90000, cacheIsolationKey } = {}) {
    const port = await freePort();
    const url = `http://127.0.0.1:${port}`;
    const runId = process.env.BOTSALES_VITE_CACHE_RUN_ID || fallbackRunId;
    const cacheRole = 'test-' + mode;
    const cacheId = createViteCacheRunId(runId, cacheIsolationKey);
    const cacheDir = isolatedViteCacheDir(root, cacheRole, cacheId);
    const vite = path.join(root, 'node_modules/vite/bin/vite.js');
    const child = spawn(process.execPath, [vite, '--mode', mode, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
        cwd: app,
        env: { ...process.env, BOTSALES_VITE_CACHE_DIR: cacheDir },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
    });
    const lifecycle = createIsolatedViteCacheLifecycle(child, root, cacheRole, cacheId);
    let output = '';
    for (const stream of [child.stdout, child.stderr]) stream?.on('data', chunk => {
        output = (output + chunk.toString()).slice(-8000);
    });

    try {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (lifecycle.error) {
                throw new Error('Demo Vite server process error (' + lifecycle.error.message + '):\n' + output);
            }
            if (lifecycle.exit) {
                throw new Error('Demo Vite server exited before becoming ready (' + JSON.stringify(lifecycle.exit) + '):\n' + output);
            }

            let response;
            try {
                response = await fetch(url, { signal: AbortSignal.timeout(1500) });
            } catch { /* The server is still starting. */ }

            if (lifecycle.exit) {
                throw new Error('Demo Vite server exited before becoming ready (' + JSON.stringify(lifecycle.exit) + '):\n' + output);
            }
            if (response?.ok) return { url, cacheDir, close: lifecycle.close };
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        throw new Error('Demo Vite server did not start within ' + timeoutMs + 'ms:\n' + output);
    } catch (startError) {
        try {
            await lifecycle.close();
        } catch (cleanupError) {
            throw new AggregateError([startError, cleanupError], 'Demo Vite server failed and its run cache cleanup also failed.');
        }
        throw startError;
    }
}
