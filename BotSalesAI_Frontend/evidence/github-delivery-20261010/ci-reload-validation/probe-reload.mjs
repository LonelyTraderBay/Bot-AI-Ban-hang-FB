import fs from 'node:fs';
import path from 'node:path';
import { chromium, firefox, expect } from '../../../node_modules/@playwright/test/index.mjs';
import { startDemoServer } from '../../../tests/session/demo-server.mjs';

const output = import.meta.dirname;
const server = await startDemoServer({ cacheIsolationKey: 'marketing-reload-request-probe' });
let misattributed = 0;
try {
    for (const [engine, browserType] of Object.entries({ chromium, firefox })) {
        const browser = await browserType.launch();
        const context = await browser.newContext();
        await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
        const page = await context.newPage();
        await page.addInitScript(() => {
            const nativeFetch = window.fetch.bind(window);
            const gate = new Promise(resolve => { window.releaseMarketingReload = resolve; });
            window.fetch = async (...args) => {
                const raw = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].href : args[0].url;
                const url = new URL(raw, location.href);
                if (sessionStorage.getItem('probeMarketingReload') === '1' && url.pathname.endsWith('/marketing-summary')) {
                    window.marketingReloadPending = true;
                    await gate;
                }
                return nativeFetch(...args);
            };
        });
        const route = '/s/shop-demo/reports/marketing?fromDate=2026-09-18&toDate=2026-09-24&bucket=week';
        await page.goto(server.url + route);
        await expect(page.getByTestId('marketing-loss-chart')).toBeVisible();
        await page.evaluate(() => sessionStorage.setItem('probeMarketingReload', '1'));
        await page.reload();
        await expect(page.getByLabel('Từ ngày', { exact: true })).toHaveValue('2026-09-18');
        await expect(page.getByRole('combobox', { name: 'Gộp theo' })).toHaveText('Tuần');
        await page.waitForFunction(() => window.marketingReloadPending === true);
        const requests = [];
        page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/marketing-summary')) requests.push(request.url()); });
        const beforeInvalidSubmit = requests.length;
        await page.getByLabel('Từ ngày', { exact: true }).fill('2025-10-01');
        await page.getByLabel('Đến ngày', { exact: true }).fill('2026-10-02');
        const response = page.waitForResponse(candidate => new URL(candidate.url()).pathname.endsWith('/marketing-summary'));
        await page.evaluate(() => window.releaseMarketingReload());
        expect((await response).status()).toBe(200);
        await page.getByRole('button', { name: 'Áp dụng' }).click();
        await expect(page.getByRole('alert').filter({ hasText: 'không được vượt quá 366 ngày' })).toBeVisible();
        const invalidRequests = requests.filter(raw => new URL(raw).searchParams.get('fromDate') === '2025-10-01');
        expect(invalidRequests).toHaveLength(0);
        await expect(page).toHaveURL(/fromDate=2026-09-18.*toDate=2026-09-24.*bucket=week/);
        const oldCounterWouldPass = requests.length === beforeInvalidSubmit;
        if (!oldCounterWouldPass) misattributed++;
        const result = { engine, sourceSha: 'c9d2a5816206aac80d906af68073d6a088a8f489', beforeInvalidSubmit, afterInvalidSubmit: requests.length, requests, invalidRequests, oldCounterWouldPass, appliedUrl: page.url() };
        fs.writeFileSync(path.join(output, `probe-${engine}.json`), JSON.stringify(result, null, 2) + '\n');
        await page.screenshot({ path: path.join(output, `probe-${engine}.png`), fullPage: true });
        await context.tracing.stop({ path: path.join(output, `probe-${engine}.zip`) });
        await browser.close();
        console.log(JSON.stringify(result));
    }
} finally { await server.close(); }
console.log(JSON.stringify({ enginesWithMisattributedValidReload: misattributed }));
process.exitCode = misattributed ? 1 : 0;
