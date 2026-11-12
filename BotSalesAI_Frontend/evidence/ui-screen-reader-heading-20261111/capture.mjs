import { chromium } from 'playwright';
import { startDemoServer } from '../../tests/session/demo-server.mjs';
const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw new Error('Expected before or after');
const server = await startDemoServer({ cacheIsolationKey: `heading-${phase}` });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
    for (const width of [390, 1440]) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.goto(`${server.url}/s/shop-demo/service-cases`);
        await page.getByRole('button', { name: 'Chi tiết yêu cầu', exact: true }).first().click();
        const dialog = page.getByRole('dialog', { name: 'Chi tiết yêu cầu sau bán' });
        await dialog.getByRole('link', { name: 'Minh (khách mẫu)' }).waitFor();
        await page.waitForFunction(() => getComputedStyle(document.querySelector('[role="dialog"]').parentElement).opacity === '1');
        console.log(JSON.stringify({ phase, width, heading: await dialog.getByRole('heading').first().ariaSnapshot() }));
        await page.screenshot({ path: `evidence/ui-screen-reader-heading-20261111/${phase}-${width}.png`, fullPage: true });
        await page.close();
    }
} finally { await browser.close(); await server.close(); }
