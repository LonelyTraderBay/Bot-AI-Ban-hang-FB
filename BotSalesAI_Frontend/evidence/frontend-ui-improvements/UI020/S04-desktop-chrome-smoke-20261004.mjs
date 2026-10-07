import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { startDemoServer } from '../../../tests/session/demo-server.mjs';

const demo = await startDemoServer();
let browser;
try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const pageErrors = [];
    const writes = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => {
        if (request.method() !== 'GET' && new URL(request.url()).pathname.startsWith('/api/'))
            writes.push({ method: request.method(), path: new URL(request.url()).pathname });
    });

    const route = '/s/shop-demo/orders/DH-1001';
    await page.goto(new URL(route, demo.url).toString(), { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Đơn DH-1001', exact: true }).waitFor({ state: 'visible' });
    const browserBrand = await page.evaluate(() => ({
        userAgent: navigator.userAgent,
        brands: navigator.userAgentData?.brands.map(({ brand, version }) => ({ brand, version })) ?? [],
    }));
    assert.ok(browserBrand.brands.some(brand => brand.brand === 'Google Chrome'), 'Expected the installed Google Chrome channel.');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Đơn DH-1001', exact: true }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Sửa đơn nháp', exact: true }).click();
    const note = page.getByRole('textbox', { name: 'Ghi chú chuẩn bị' });
    await note.waitFor({ state: 'visible' });
    await note.fill('Chrome smoke draft, must not be saved');
    assert.equal(await note.inputValue(), 'Chrome smoke draft, must not be saved');

    assert.deepEqual(writes, [], 'The edit-dialog smoke must not write API state.');
    assert.deepEqual(pageErrors, [], 'The Chrome smoke must not produce page errors.');
    console.log(JSON.stringify({
        status: 'PASS',
        scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        browser: 'Google Chrome',
        browserVersion: browser.version(),
        userAgent: browserBrand.userAgent,
        userAgentBrands: browserBrand.brands,
        route,
        deepLinkAndRefresh: 'PASS',
        editDialogRetainsDraftWithoutSave: 'PASS',
        apiWrites: writes.length,
        pageErrors: pageErrors.length,
    }, null, 2));
} finally {
    await browser?.close();
    await demo.close();
}
