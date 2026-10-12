import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
    closeIsolatedViteCacheServer,
    createIsolatedViteCacheLifecycle,
    createViteCacheRunId,
    isolatedViteCacheDir,
} from '../../scripts/vite-cache.mjs';

class FakeChild extends EventEmitter {
    constructor({ pid = 123, onKill = child => queueMicrotask(() => child.finish(0, null)) } = {}) {
        super();
        this.pid = pid;
        this.exitCode = null;
        this.signalCode = null;
        this.killCount = 0;
        this.onKill = onKill;
    }

    kill() {
        this.killCount++;
        this.onKill(this);
        return true;
    }

    finish(code, signal) {
        this.exitCode = code;
        this.signalCode = signal;
        this.emit('exit', code, signal);
    }
}

async function fixture(t) {
    const sandbox = await mkdtemp(path.join(os.tmpdir(), 'botsales-vite-cache-lifecycle-'));
    const tempDirectory = path.join(sandbox, 'temp');
    await mkdir(tempDirectory, { recursive: true });
    t.after(() => rm(sandbox, { recursive: true, force: true }));
    return { projectRoot: path.join(sandbox, 'project'), tempDirectory };
}

async function seedCache(directory) {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'deps.json'), '{}');
}

async function exists(target) {
    try {
        await access(target);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

async function waitUntilRemoved(target) {
    const deadline = Date.now() + 1000;
    while (await exists(target)) {
        if (Date.now() >= deadline) throw new Error('Run cache was not removed after child exit.');
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}

test('run cache closes once after success and preserves sibling run caches', async t => {
    const { projectRoot, tempDirectory } = await fixture(t);
    const runId = createViteCacheRunId('playwright-same-run', 'server');
    const siblingRunId = createViteCacheRunId('playwright-same-run', 'server');
    assert.notEqual(runId, siblingRunId);

    const ownCache = isolatedViteCacheDir(projectRoot, 'test-demo', runId, tempDirectory);
    const siblingCache = isolatedViteCacheDir(projectRoot, 'test-demo', siblingRunId, tempDirectory);
    await seedCache(ownCache);
    await seedCache(siblingCache);

    const child = new FakeChild();
    const lifecycle = createIsolatedViteCacheLifecycle(child, projectRoot, 'test-demo', runId, { tempDirectory });
    const firstClose = lifecycle.close();
    const racingClose = lifecycle.close();
    assert.strictEqual(firstClose, racingClose);

    await Promise.all([firstClose, racingClose]);
    assert.equal(lifecycle.exit.code, 0);
    assert.equal(child.killCount, 1);
    assert.equal(await exists(ownCache), false);
    assert.equal(await exists(siblingCache), true);
});

test('early nonzero exit cleans only its run cache', async t => {
    const { projectRoot, tempDirectory } = await fixture(t);
    const runId = createViteCacheRunId('playwright-startup', 'server');
    const siblingRunId = createViteCacheRunId('playwright-startup', 'server');
    const ownCache = isolatedViteCacheDir(projectRoot, 'test-demo', runId, tempDirectory);
    const siblingCache = isolatedViteCacheDir(projectRoot, 'test-demo', siblingRunId, tempDirectory);
    await seedCache(ownCache);
    await seedCache(siblingCache);

    const child = new FakeChild();
    const lifecycle = createIsolatedViteCacheLifecycle(child, projectRoot, 'test-demo', runId, { tempDirectory });
    child.finish(1, null);
    await lifecycle.close();

    assert.equal(lifecycle.exit.code, 1);
    assert.equal(child.killCount, 0);
    assert.equal(await exists(ownCache), false);
    assert.equal(await exists(siblingCache), true);
});

test('signal exit cleans its run cache', async t => {
    const { projectRoot, tempDirectory } = await fixture(t);
    const runId = createViteCacheRunId('playwright-signal', 'server');
    const ownCache = isolatedViteCacheDir(projectRoot, 'test-demo', runId, tempDirectory);
    await seedCache(ownCache);

    const child = new FakeChild();
    const lifecycle = createIsolatedViteCacheLifecycle(child, projectRoot, 'test-demo', runId, { tempDirectory });
    child.finish(null, 'SIGTERM');
    await lifecycle.close();

    assert.equal(lifecycle.exit.signal, 'SIGTERM');
    assert.equal(await exists(ownCache), false);
});

test('spawn failure without a child process cleans the unique run cache', async t => {
    const { projectRoot, tempDirectory } = await fixture(t);
    const runId = createViteCacheRunId('playwright-spawn-failure', 'server');
    const ownCache = isolatedViteCacheDir(projectRoot, 'test-demo', runId, tempDirectory);
    await seedCache(ownCache);

    const child = new FakeChild();
    child.pid = undefined;
    const lifecycle = createIsolatedViteCacheLifecycle(child, projectRoot, 'test-demo', runId, { tempDirectory });
    const spawnError = new Error('spawn failed');
    child.emit('error', spawnError);
    await lifecycle.close();

    assert.strictEqual(lifecycle.error, spawnError);
    assert.equal(child.killCount, 0);
    assert.equal(await exists(ownCache), false);
});

test('timeout keeps cache while child is alive and later exit triggers cleanup', async t => {
    const { projectRoot, tempDirectory } = await fixture(t);
    const runId = createViteCacheRunId('playwright-slow-stop', 'server');
    const ownCache = isolatedViteCacheDir(projectRoot, 'test-demo', runId, tempDirectory);
    await seedCache(ownCache);

    const child = new FakeChild({ onKill: () => {} });
    const lifecycle = createIsolatedViteCacheLifecycle(child, projectRoot, 'test-demo', runId, {
        tempDirectory,
        exitTimeoutMs: 10,
    });

    await assert.rejects(lifecycle.close(), /keeping its cache/);
    assert.equal(await exists(ownCache), true);

    child.finish(null, 'SIGTERM');
    await waitUntilRemoved(ownCache);
    assert.equal(await exists(ownCache), false);
});

test('Playwright API server teardown removes its run cache and preserves sibling cache', async t => {
    const { projectRoot, tempDirectory } = await fixture(t);
    const runId = createViteCacheRunId('playwright-run', 'server');
    const siblingRunId = createViteCacheRunId('playwright-run', 'server');
    const ownCache = isolatedViteCacheDir(projectRoot, 'playwright-webserver', runId, tempDirectory);
    const siblingCache = isolatedViteCacheDir(projectRoot, 'playwright-webserver', siblingRunId, tempDirectory);
    await seedCache(ownCache);
    await seedCache(siblingCache);

    let closeCount = 0;
    await closeIsolatedViteCacheServer(
        { async close() { closeCount++; } },
        projectRoot,
        'playwright-webserver',
        runId,
        tempDirectory,
    );

    assert.equal(closeCount, 1);
    assert.equal(await exists(ownCache), false);
    assert.equal(await exists(siblingCache), true);
});

test('Playwright setup failure before server creation removes its run cache', async t => {
    const { projectRoot, tempDirectory } = await fixture(t);
    const runId = createViteCacheRunId('playwright-start-failure', 'server');
    const ownCache = isolatedViteCacheDir(projectRoot, 'playwright-webserver', runId, tempDirectory);
    await seedCache(ownCache);

    await closeIsolatedViteCacheServer(undefined, projectRoot, 'playwright-webserver', runId, tempDirectory);

    assert.equal(await exists(ownCache), false);
});

test('Playwright server close failure preserves its run cache', async t => {
    const { projectRoot, tempDirectory } = await fixture(t);
    const runId = createViteCacheRunId('playwright-close-failure', 'server');
    const ownCache = isolatedViteCacheDir(projectRoot, 'playwright-webserver', runId, tempDirectory);
    await seedCache(ownCache);
    const closeError = new Error('close failed');

    await assert.rejects(
        closeIsolatedViteCacheServer(
            { async close() { throw closeError; } },
            projectRoot,
            'playwright-webserver',
            runId,
            tempDirectory,
        ),
        error => error === closeError,
    );

    assert.equal(await exists(ownCache), true);
});
test('cache paths reject dot-segment traversal', async t => {
    const { projectRoot, tempDirectory } = await fixture(t);
    assert.throws(() => isolatedViteCacheDir(projectRoot, '..', 'run', tempDirectory));
    assert.throws(() => isolatedViteCacheDir(projectRoot, 'test-demo', '..', tempDirectory));
});
