import { expect, test } from '@playwright/test';
import { preview } from 'vite';
import type { PreviewServer } from 'vite';
import { evidenceRunId } from '../evidence-run-id.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const root = process.cwd();
const webRoot = path.join(root, 'apps/web');
let server: PreviewServer | undefined;
let baseUrl = '';

function filesUnder(directory: string): string[] {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? filesUnder(file) : [file];
    });
}

test.beforeAll(async () => {
    server = await preview({
        configFile: path.join(webRoot, 'vite.config.ts'),
        root: webRoot,
        mode: 'demo',
        logLevel: 'error',
        build: { outDir: 'dist-demo' },
        preview: { host: '127.0.0.1', port: 0, strictPort: false },
    });
    const address = server.httpServer.address();
    if (!address || typeof address === 'string') throw new Error('The demo artifact preview did not expose a local port.');
    baseUrl = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
    await server?.close();
});

test('the built demo artifact serves the React UI and synthetic API through preview', async ({ page, browserName }) => {
    const sessionResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v2/session', { timeout: 15_000 });
    await page.goto(`${baseUrl}/s/shop-demo/overview`);
    const response = await sessionResponse;
    expect(response.status()).toBe(200);
    await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toBeVisible();
    await expect(page.locator('main h1').first()).toBeVisible();

    const browserMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const scripts = resources.filter(resource => new URL(resource.name).pathname.endsWith('.js'));
        return {
            browser: navigator.userAgent,
            viewport: { width: innerWidth, height: innerHeight },
            route: location.pathname,
            domContentLoadedMs: Math.round(navigation?.domContentLoadedEventEnd ?? 0),
            loadEventMs: Math.round(navigation?.loadEventEnd ?? 0),
            scriptCount: scripts.length,
            scriptTransferBytes: scripts.reduce((total, resource) => total + resource.transferSize, 0),
            scriptAssets: scripts.map(resource => ({
                file: new URL(resource.name).pathname.split('/').pop() || '',
                transferBytes: resource.transferSize,
                decodedBytes: resource.decodedBodySize,
                durationMs: Math.round(resource.duration),
            })),
        };
    });
    const demoAssets = filesUnder(path.join(webRoot, 'dist-demo', 'assets'))
        .filter(file => file.endsWith('.js'))
        .map(file => {
            const content = fs.readFileSync(file);
            return { file: path.relative(root, file).replaceAll('\\', '/'), bytes: content.length, gzipBytes: gzipSync(content).length };
        });
    const initialGzipBytes = browserMetrics.scriptAssets.reduce((total, asset) => total + (demoAssets.find(file => path.basename(file.file) === asset.file)?.gzipBytes ?? 0), 0);
    const largestGzipBytes = Math.max(...demoAssets.map(asset => asset.gzipBytes));
    expect(initialGzipBytes).toBeLessThanOrEqual(500 * 1024);
    expect(largestGzipBytes).toBeLessThanOrEqual(200 * 1024);
    const report = {
        scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        artifact: 'apps/web/dist-demo',
        browserMetrics,
        bundles: {
            javascriptFiles: demoAssets.length,
            totalBytes: demoAssets.reduce((total, asset) => total + asset.bytes, 0),
            totalGzipBytes: demoAssets.reduce((total, asset) => total + asset.gzipBytes, 0),
            initialRouteGzipBytes: initialGzipBytes,
            proposedBudgets: { initialRouteGzipKiB: 500, largestChunkGzipKiB: 200, basis: 'Local demo preview limits for the measured Chromium artifact; not a backend or platform SLO.' },
            largest: demoAssets.sort((a, b) => b.bytes - a.bytes).slice(0, 5),
        },
        observedApi: { path: '/api/v2/session', status: response.status(), servedBy: 'MSW in the built demo artifact' },
        dataSource: 'synthetic-msw',
    };
    const evidenceDir = path.join(root, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007');
    const output = path.join(evidenceDir, `S19-demo-preview-metrics-${browserName}-${evidenceRunId}.json`);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    const screenshot = path.join(evidenceDir, `S19-demo-preview-overview-${browserName}-${evidenceRunId}.png`);
    fs.mkdirSync(path.dirname(screenshot), { recursive: true });
    if (fs.existsSync(screenshot)) throw new Error(`Refusing to overwrite existing evidence ${screenshot}`);
    await page.screenshot({ path: screenshot, fullPage: true });
    console.log(`[artifact-preview] ${JSON.stringify(report)}`);
});

test('a thousand synthetic customers remain API-paginated in the built demo artifact', async ({ page, browserName }) => {
    await page.goto(`${baseUrl}/s/shop-demo/overview`);
    await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: 'Dataset mô phỏng' }).click();
    await page.getByRole('option', { name: '1.000 khách hàng tổng hợp' }).click();
    await expect(page.getByRole('status')).toHaveText('Đã tải 1.000 khách hàng tổng hợp vào API mô phỏng.');

    const customersResponsePromise = page.waitForResponse(response => new URL(response.url()).pathname.startsWith('/api/v2/shops/shop-demo/customers'));
    const startedAt = Date.now();
    await page.getByRole('link', { name: 'Khách hàng', exact: true }).click();
    const response = await customersResponsePromise;
    expect(response.status()).toBe(200);
    const envelope = await response.json() as { data: Array<{ id: string }>; page: { limit: number; total: number; hasMore: boolean; nextCursor: string | null } };
    console.log(`[large-dataset-api] ${JSON.stringify({ url: response.url(), count: envelope.data.length, page: envelope.page, firstIds: envelope.data.slice(0, 3).map(customer => customer.id) })}`);
    const renderedRows = page.getByRole('table').getByRole('row');
    await expect(renderedRows).toHaveCount(21);
    await expect(page.locator('a[href*="perf-customer-"]').first()).toBeVisible();

    const report = {
        scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        artifact: 'apps/web/dist-demo',
        datasetId: 'FE025-LARGE-CUSTOMERS-1000-V1',
        generatedRows: 1000,
        firstPageIds: envelope.data.map(customer => customer.id),
        api: { status: response.status(), pageLimit: envelope.page.limit, total: envelope.page.total, hasMore: envelope.page.hasMore, nextCursor: envelope.page.nextCursor },
        domRowsIncludingHeader: await renderedRows.count(),
        firstPageReadyMs: Date.now() - startedAt,
        browser: await page.evaluate(() => navigator.userAgent),
        viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight })),
        note: 'Synthetic customer identities only; the React screen renders one API page and exposes the next cursor instead of mounting the full collection.',
    };
    expect(envelope.page).toMatchObject({ limit: 20, total: 1004, hasMore: true });
    const output = path.join(root, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007', `S19-demo-large-dataset-${browserName}-${evidenceRunId}.json`);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    console.log(`[large-dataset-preview] ${JSON.stringify(report)}`);
});

test('the production artifact contains neither the mock worker asset nor MSW fixtures/runtime', () => {
    const productionRoot = path.join(webRoot, 'dist');
    const files = filesUnder(productionRoot);
    expect(files.some(file => path.basename(file) === 'mockServiceWorker.js')).toBe(false);
    const bundles = files.filter(file => file.endsWith('.js')).map(file => fs.readFileSync(file, 'utf8')).join('\n');
    for (const marker of ['setupWorker(', 'DEMO-NOT-A-REAL-PAIRING', 'Joker Studio', 'shop-second'])
        expect(bundles).not.toContain(marker);
    expect(bundles).not.toContain('service worker mô phỏng');
});
