import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

async function gotoDemo(page: import('@playwright/test').Page, path: string) {
    await page.goto(new URL(path, demoUrl).toString());
}

function panel(page: import('@playwright/test').Page, title: string) {
    return page.getByRole('heading', { name: title, exact: true }).locator('xpath=../../..');
}

test('UI009 delayed customer orders from the previous shop cannot leak into the new shop profile', async ({ page }) => {
    const observedOrderRequests: Array<{ shopId: string; customerId: string | null }> = [];
    let staleRequestState: 'pending' | 'finished' | 'failed' = 'pending';
    page.on('request', request => {
        if (request.method() !== 'GET') return;
        const url = new URL(request.url());
        const match = url.pathname.match(/\/api\/v2\/shops\/([^/]+)\/orders$/);
        if (match) observedOrderRequests.push({ shopId: match[1], customerId: url.searchParams.get('customerId') });
    });
    page.on('requestfinished', request => {
        const url = new URL(request.url());
        if (url.pathname === '/api/v2/shops/shop-demo/orders' && url.searchParams.get('customerId') === 'c1') staleRequestState = 'finished';
    });
    page.on('requestfailed', request => {
        const url = new URL(request.url());
        if (url.pathname === '/api/v2/shops/shop-demo/orders' && url.searchParams.get('customerId') === 'c1') staleRequestState = 'failed';
    });

    await gotoDemo(page, '/s/shop-demo/customers');
    await expect(page.getByRole('heading', { name: 'Khách hàng', exact: true })).toBeVisible();
    await page.evaluate(async () => {
        const mock = await import('/src/mocks/service.ts');
        mock.setOperationDelay('listOrders', 5000);
    });

    const oldShopOrdersRequest = page.waitForRequest(request => {
        const url = new URL(request.url());
        return request.method() === 'GET'
            && url.pathname === '/api/v2/shops/shop-demo/orders'
            && url.searchParams.get('customerId') === 'c1';
    });
    await page.getByRole('row').filter({ hasText: 'Linh (khách mẫu)' }).getByRole('link', { name: 'Hồ sơ', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Linh (khách mẫu)', exact: true })).toBeVisible();
    // Firefox reports requests handled by the service worker after the mock delay;
    // assert the pending UI immediately, before awaiting that delayed request event.
    await expect(panel(page, 'Đơn hàng gần đây').getByRole('progressbar')).toBeVisible({ timeout: 1_000 });
    await oldShopOrdersRequest;

    await page.evaluate(async () => {
        const mock = await import('/src/mocks/service.ts');
        mock.setOperationDelay('listOrders', null);
    });

    await page.getByRole('link', { name: /Joker Studio/ }).click();
    await expect(page.getByRole('heading', { name: 'Chọn cửa hàng' })).toBeVisible();
    await page.locator('a[href="/s/shop-second/overview"]').click();
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Khách hàng', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Khách hàng', exact: true })).toBeVisible();

    const newShopOrdersResponse = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET'
            && url.pathname === '/api/v2/shops/shop-second/orders'
            && url.searchParams.get('customerId') === 'b-c1';
    });
    await page.getByRole('row').filter({ hasText: 'Linh (khách mẫu)' }).getByRole('link', { name: 'Hồ sơ', exact: true }).click();
    const currentResponse = await newShopOrdersResponse;
    expect(currentResponse.status()).toBe(200);
    await expect.poll(() => staleRequestState, { timeout: 7000 }).not.toBe('pending');

    const ordersPanel = panel(page, 'Đơn hàng gần đây');
    await expect(page.getByRole('heading', { name: 'Linh (khách mẫu)', exact: true })).toBeVisible();
    await expect(ordersPanel.getByText('b-DH-1001', { exact: true })).toBeVisible();
    await expect(ordersPanel.getByText('DH-DEMO-PAID-01', { exact: true })).toHaveCount(0);
    expect(observedOrderRequests).toEqual(expect.arrayContaining([
        { shopId: 'shop-demo', customerId: 'c1' },
        { shopId: 'shop-second', customerId: 'b-c1' },
    ]));
    expect(observedOrderRequests.every(request =>
        (request.shopId === 'shop-demo' && request.customerId === 'c1')
        || (request.shopId === 'shop-second' && request.customerId === 'b-c1'),
    )).toBe(true);
    await test.info().attach('ui009-shop-scope-race.json', {
        body: JSON.stringify({
            oldRequest: { shopId: 'shop-demo', customerId: 'c1', result: staleRequestState },
            newRequest: { shopId: 'shop-second', customerId: 'b-c1', status: currentResponse.status() },
            renderedOrders: ['b-DH-1001'],
            forbiddenOldShopOrders: ['DH-DEMO-PAID-01'],
            observedOrderRequests,
        }, null, 2),
        contentType: 'application/json',
    });
});
