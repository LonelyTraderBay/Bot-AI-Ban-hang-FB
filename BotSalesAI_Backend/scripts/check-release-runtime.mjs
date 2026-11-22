import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { matchesProbeScope } from './probe-target.mjs';

const sha256 = /^[a-f0-9]{64}$/;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const publicPath = /^web\/(?:[a-z0-9_-][a-z0-9._-]*\/)*[a-z0-9_-][a-z0-9._-]*$/i;
class CheckFailure extends Error {}

async function request(origin, path) {
    let response;
    try {
        response = await fetch(origin + path, { redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(5000) });
    } catch {
        throw new CheckFailure('HTTPS request failed for ' + path);
    }
    if (response.status !== 200) {
        await response.body?.cancel().catch(() => {});
        throw new CheckFailure('Unexpected HTTP ' + response.status + ' for ' + path);
    }
    return response;
}

async function verifyHealth(origin, path, status, expected) {
    const response = await request(origin, path);
    if (response.headers.get('x-botsales-release-manifest') !== expected) {
        await response.body?.cancel().catch(() => {});
        throw new CheckFailure('API release manifest differs for ' + path);
    }
    const body = await response.json().catch(() => undefined);
    if (body?.status !== status) throw new CheckFailure('Unexpected health status for ' + path);
}

async function verifyWebFile(origin, path, expected) {
    const response = await request(origin, path);
    const hash = createHash('sha256');
    try {
        for await (const part of response.body) hash.update(part);
    } catch {
        throw new CheckFailure('HTTPS response did not complete for ' + path);
    }
    if (hash.digest('hex') !== expected) throw new CheckFailure('Web file content differs for ' + path);
}

async function main() {
    const [file, expected, mode, extra] = process.argv.slice(2);
    const fixture = mode === '--fixture';
    if (!file || !sha256.test(expected ?? '') || (mode && !fixture) || extra) {
        throw new CheckFailure('Usage: check-release-runtime <manifest-file> <verified-manifest-sha256> [--fixture]');
    }
    const origin = URL.parse(process.env.APP_ORIGIN ?? '');
    if (!origin || origin.protocol !== 'https:' || origin.origin !== process.env.APP_ORIGIN ||
        !matchesProbeScope(origin.hostname, fixture) || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
        throw new CheckFailure('Use a trusted HTTPS APP_ORIGIN in the selected staging or loopback fixture scope.');
    }
    const bytes = readFileSync(file);
    if (sha(bytes) !== expected) throw new CheckFailure('Release manifest checksum mismatch');
    const manifest = JSON.parse(bytes.toString('utf8'));
    if (manifest?.format !== 1 || !/^[a-f0-9]{40}$/.test(manifest.sourceBase ?? '') ||
        typeof manifest.dirtyWorktree !== 'boolean' || (!fixture && manifest.dirtyWorktree) ||
        !manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) {
        throw new CheckFailure('Invalid manifest or staging candidate built from a dirty checkout');
    }
    const web = Object.entries(manifest.files).filter(([path]) => path.startsWith('web/'));
    if (!sha256.test(manifest.files['web/index.html'] ?? '') || !web.some(([path]) => path.startsWith('web/assets/')) ||
        web.some(([path, hash]) => !publicPath.test(path) || typeof hash !== 'string' || !sha256.test(hash))) {
        throw new CheckFailure('Invalid web file list in release manifest');
    }
    const target = origin.origin;
    await verifyHealth(target, '/api/v2/health/live', 'ok', expected);
    await verifyHealth(target, '/api/v2/health/ready', 'ready', expected);
    for (const [path, hash] of web) await verifyWebFile(target, path === 'web/index.html' ? '/' : path.slice(3), hash);
    await verifyWebFile(target, '/workspaces', manifest.files['web/index.html']);
    console.log(JSON.stringify({ status: fixture ? 'LOCAL_RUNTIME_VERIFIED' : 'STAGING_RUNTIME_VERIFIED',
        sourceBase: manifest.sourceBase, manifestSha256: expected, healthRoutes: 2, webFiles: web.length, deepLink: '/workspaces' }));
}

try {
    await main();
} catch (error) {
    console.error(error instanceof CheckFailure ? error.message : 'Could not read the verified release manifest');
    process.exitCode = 1;
}
