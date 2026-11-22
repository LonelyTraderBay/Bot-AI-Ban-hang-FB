import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isIP } from 'node:net';

function readReleaseManifest() {
    try {
        return readFileSync(new URL('../../../../release-manifest.json', import.meta.url));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        return undefined;
    }
}

export function readReleaseManifestHash(): string | undefined {
    const manifest = readReleaseManifest();
    return manifest && createHash('sha256').update(manifest).digest('hex');
}

export function readCleanReleaseManifestHash(): string | undefined {
    const manifest = readReleaseManifest();
    return manifest && cleanReleaseManifestHash(manifest);
}

export function cleanReleaseManifestHash(manifest: Buffer): string | undefined {
    const { format, dirtyWorktree, sourceBase } = JSON.parse(manifest.toString('utf8'));
    if (format === 1 && dirtyWorktree === false && typeof sourceBase === 'string' && /^[a-f0-9]{40}$/.test(sourceBase)) {
        return createHash('sha256').update(manifest).digest('hex');
    }
    return undefined;
}

export function readDatabaseUrl(environment: NodeJS.ProcessEnv): string {
    const value = environment.DATABASE_URL;
    if (!value?.trim()) throw new Error('Missing required configuration: DATABASE_URL');
    const url = URL.parse(value);
    if (!url || !['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.pathname.length < 2 || url.hash) {
        throw new Error('DATABASE_URL must be a direct PostgreSQL URL with a database name');
    }
    return value;
}

export function readHttpConfig(environment: NodeJS.ProcessEnv): { bind: string; port: number } {
    const bind = environment.API_BIND;
    const portText = environment.API_PORT;
    const missing = Object.entries({ API_BIND: bind, API_PORT: portText })
        .filter(([, value]) => !value?.trim()).map(([name]) => name);
    if (missing.length) throw new Error('Missing required configuration: ' + missing.join(', '));
    if (!bind || !isIP(bind)) throw new Error('API_BIND must be an IPv4 or IPv6 address');
    const port = Number(portText);
    if (!portText || !/^[0-9]+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('API_PORT must be an integer from 1 to 65535');
    }
    return { bind, port };
}
