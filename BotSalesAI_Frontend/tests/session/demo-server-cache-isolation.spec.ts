import { expect, test } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';
import { startDemoServer } from './demo-server.mjs';
import { isolatedViteCacheDir } from '../../scripts/vite-cache.mjs';

test('concurrent demo servers use isolated Vite caches and load the React app', async ({ browser }) => {
    const servers: Array<{ url: string; cacheDir: string; close: () => Promise<void> }> = [];
    const contexts: import('@playwright/test').BrowserContext[] = [];
    const failedOptimizedDependencies: string[] = [];

    try {
        const starts = await Promise.allSettled([
            startDemoServer({ cacheIsolationKey: 'parallel-a' }),
            startDemoServer({ cacheIsolationKey: 'parallel-b' }),
        ]);
        const startErrors: unknown[] = [];
        for (const result of starts) {
            if (result.status === 'fulfilled') servers.push(result.value);
            else startErrors.push(result.reason);
        }
        if (startErrors.length) throw new AggregateError(startErrors, 'Could not start both isolated demo servers.');

        const first = servers[0];
        const second = servers[1];
        if (!first || !second) throw new Error('Expected two demo servers to start.');

        contexts.push(...await Promise.all([browser.newContext(), browser.newContext()]));
        const pages = await Promise.all(contexts.map(context => context.newPage()));
        for (const page of pages) {
            page.on('response', response => {
                if (response.status() === 504 && response.url().includes('/node_modules/.vite/deps/')) {
                    failedOptimizedDependencies.push(`${response.status()} ${response.url()}`);
                }
            });
        }

        expect(first.cacheDir).not.toBe(second.cacheDir);
        const cacheA = path.relative(os.tmpdir(), first.cacheDir);
        const cacheB = path.relative(os.tmpdir(), second.cacheDir);
        expect(path.isAbsolute(cacheA)).toBe(false);
        expect(cacheA === '..' || cacheA.startsWith(`..${path.sep}`)).toBe(false);
        expect(cacheB === '..' || cacheB.startsWith(`..${path.sep}`)).toBe(false);

        const rootCacheA = isolatedViteCacheDir(path.join(process.cwd(), 'snapshot-a'), 'test-demo', 'same-run');
        const rootCacheB = isolatedViteCacheDir(path.join(process.cwd(), 'snapshot-b'), 'test-demo', 'same-run');
        expect(rootCacheA).not.toBe(rootCacheB);
        console.log(`VITE_CACHE_ISOLATION=PASS rootA=${first.cacheDir} rootB=${second.cacheDir} otherCheckout=${rootCacheA !== rootCacheB}`);

        await Promise.all(pages.map((page, index) => {
            const server = index === 0 ? first : second;
            return page.goto(`${server.url}/s/shop-demo/overview`);
        }));
        await Promise.all(pages.map(page => expect(page.locator('main#main-content')).toBeVisible()));
        expect(failedOptimizedDependencies).toEqual([]);
    } finally {
        await Promise.allSettled([...contexts.map(context => context.close()), ...servers.map(server => server.close())]);
    }
});
