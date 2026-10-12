import { createHash, randomUUID } from 'node:crypto';
import { lstat, rm, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const CACHE_ROOT_NAME = 'botsales-vite-cache';
const SAFE_SEGMENT = /^[a-zA-Z0-9._-]+$/;
const ROOT_ID = /^[a-f0-9]{20}$/;

function validateSegment(value) {
    return typeof value === 'string'
        && SAFE_SEGMENT.test(value)
        && value !== '.'
        && value !== '..';
}

function cacheRoot(tempDirectory) {
    return path.resolve(tempDirectory, CACHE_ROOT_NAME);
}

function projectRootId(projectRoot) {
    let normalizedRoot = path.resolve(projectRoot);
    if (process.platform === 'win32') normalizedRoot = normalizedRoot.toLowerCase();
    return createHash('sha256').update(normalizedRoot).digest('hex').slice(0, 20);
}

export function createViteCacheRunId(parentRunId, isolationKey) {
    const hasIsolationKey = Boolean(isolationKey);
    if (!validateSegment(parentRunId) || (hasIsolationKey && !validateSegment(isolationKey))) {
        throw new Error('Vite cache run ID and isolation key must contain only letters, numbers, dots, underscores, or hyphens.');
    }

    const prefix = hasIsolationKey ? parentRunId + '-' + isolationKey : parentRunId;
    return prefix + '-' + randomUUID();
}

export function isolatedViteCacheDir(projectRoot, role, runId, tempDirectory = os.tmpdir()) {
    if (!validateSegment(role) || !validateSegment(runId)) {
        throw new Error('Vite cache role and run ID must contain only letters, numbers, dots, underscores, or hyphens.');
    }

    return path.join(cacheRoot(tempDirectory), projectRootId(projectRoot), role, runId);
}

function assertRunCachePath(projectRoot, role, runId, tempDirectory) {
    const target = path.resolve(isolatedViteCacheDir(projectRoot, role, runId, tempDirectory));
    const base = cacheRoot(tempDirectory);
    const relative = path.relative(base, target);
    const parts = relative.split(path.sep);
    const rootId = projectRootId(projectRoot);

    if (path.isAbsolute(relative) || parts.length !== 3
        || parts[0] !== rootId || parts[1] !== role || parts[2] !== runId
        || !ROOT_ID.test(parts[0])) {
        throw new Error('Refusing to remove a Vite cache path outside its exact run directory.');
    }

    return target;
}

export async function removeIsolatedViteCacheDir(projectRoot, role, runId, tempDirectory = os.tmpdir()) {
    const target = assertRunCachePath(projectRoot, role, runId, tempDirectory);

    try {
        const entry = await lstat(target);
        if (entry.isSymbolicLink()) {
            await unlink(target);
        } else {
            await rm(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        }
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
}

export function createIsolatedViteCacheLifecycle(
    child,
    projectRoot,
    role,
    runId,
    { tempDirectory = os.tmpdir(), exitTimeoutMs = 5000 } = {},
) {
    const cacheDir = isolatedViteCacheDir(projectRoot, role, runId, tempDirectory);
    let exitInfo = null;
    let childError = null;
    let cleanupError = null;
    let resolveExit;
    let closePromise = null;

    const exited = new Promise(resolve => { resolveExit = resolve; });
    const recordExit = info => {
        if (exitInfo) return;
        exitInfo = info;
        resolveExit(info);
    };

    child.once('exit', (code, signal) => recordExit({ code, signal }));
    child.once('error', error => {
        childError = error;
        if (child.pid === undefined) recordExit({ error });
    });

    if (child.exitCode !== null || child.signalCode !== null) {
        recordExit({ code: child.exitCode, signal: child.signalCode });
    }

    const cleanupAfterExit = exited.then(async () => {
        try {
            await removeIsolatedViteCacheDir(projectRoot, role, runId, tempDirectory);
        } catch (error) {
            cleanupError = error;
        }
    });

    async function waitForExit() {
        if (exitInfo) return exitInfo;

        let timer;
        try {
            return await Promise.race([
                exited,
                new Promise((_, reject) => {
                    timer = setTimeout(() => {
                        reject(new Error('Vite child did not exit within ' + exitTimeoutMs + 'ms; keeping its cache.'));
                    }, exitTimeoutMs);
                }),
            ]);
        } finally {
            clearTimeout(timer);
        }
    }

    function close() {
        if (closePromise) return closePromise;

        closePromise = (async () => {
            let killError = null;
            if (!exitInfo) {
                try {
                    child.kill();
                } catch (error) {
                    killError = error;
                }

                try {
                    await waitForExit();
                } catch (waitError) {
                    if (killError) {
                        throw new AggregateError([killError, waitError], 'Vite child did not exit; its cache was kept.');
                    }
                    throw waitError;
                }
            }

            await cleanupAfterExit;
            if (cleanupError && killError) {
                throw new AggregateError([cleanupError, killError], 'Vite child exited but its run cache cleanup failed.');
            }
            if (cleanupError) throw cleanupError;
            if (killError) throw killError;
        })();

        return closePromise;
    }

    return {
        cacheDir,
        get exit() { return exitInfo; },
        get error() { return childError; },
        close,
    };
}

export async function closeIsolatedViteCacheServer(
    server,
    projectRoot,
    role,
    runId,
    tempDirectory = os.tmpdir(),
) {
    if (server) await server.close();
    await removeIsolatedViteCacheDir(projectRoot, role, runId, tempDirectory);
}
