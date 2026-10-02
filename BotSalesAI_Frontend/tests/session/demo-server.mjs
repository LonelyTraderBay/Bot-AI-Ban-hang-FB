import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const app = path.join(root, 'apps/web');

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
    return startViteServer('demo', options);
}

export function startLiveServer(options) {
    return startViteServer('development', options);
}

async function startViteServer(mode, { timeoutMs = 90000 } = {}) {
    const port = await freePort();
    const url = `http://127.0.0.1:${port}`;
    const vite = path.join(root, 'node_modules/vite/bin/vite.js');
    const child = spawn(process.execPath, [vite, '--mode', mode, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
        cwd: app,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
    });
    let output = '';
    for (const stream of [child.stdout, child.stderr]) stream?.on('data', chunk => {
        output = (output + chunk.toString()).slice(-8000);
    });
    let exit;
    child.once('exit', (code, signal) => { exit = { code, signal }; });
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (exit) throw new Error(`Demo Vite server exited before becoming ready (${JSON.stringify(exit)}):\n${output}`);
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
            if (response.ok) return { url, close: () => stop(child) };
        } catch { /* The server is still starting. */ }
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    await stop(child);
    throw new Error(`Demo Vite server did not start within ${timeoutMs}ms:\n${output}`);
}

async function stop(child) {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill();
    await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 5000))]);
}
