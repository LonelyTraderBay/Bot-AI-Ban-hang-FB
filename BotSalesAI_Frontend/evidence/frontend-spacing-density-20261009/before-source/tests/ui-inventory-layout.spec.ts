import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer({ cacheIsolationKey: 'ui028-w12-inventory-layout' });
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

test('Inventory R15/R16 preserve shared gutter and contain table overflow at 320-1440px', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const routes = [
        { id: 'R15', path: '/s/shop-demo/inventory', heading: 'Tồn kho', region: 'Tồn kho theo vị trí' },
        { id: 'R16', path: '/s/shop-demo/inventory/movements', heading: 'Lịch sử kho', region: 'Lịch sử biến động kho' },
    ];
    const observations = [];

    for (const width of [320, 390, 768, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of routes) {
            await page.goto(new URL(route.path, demoUrl).toString());
            await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible();
            await expect(page.getByRole('table', { name: route.region })).toBeVisible();
            await expect(page.locator('main#main-content')).toHaveCSS('padding-left', width >= 768 ? '24px' : '16px');
            const geometry = await page.evaluate(() => ({
                clientWidth: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
            }));
            expect(geometry.scrollWidth, `${route.id} page width at ${width}px`).toBeLessThanOrEqual(geometry.clientWidth);
            const tableRegion = page.getByRole('region', { name: route.region });
            const tableGeometry = await tableRegion.evaluate(element => ({
                clientWidth: element.clientWidth,
                scrollWidth: element.scrollWidth,
            }));
            expect(tableGeometry.clientWidth, `${route.id} table region width at ${width}px`).toBeLessThanOrEqual(width);
            if (width < 768) expect(tableGeometry.scrollWidth, `${route.id} table can scroll at ${width}px`).toBeGreaterThan(tableGeometry.clientWidth);
            observations.push({ route: route.id, width, ...geometry, tableRegion: tableGeometry });
        }
    }

    expect(observations).toHaveLength(10);
    expect(pageErrors).toEqual([]);
});

test('Inventory filters reset cursor and preserve other URL state; adjustment validation sends no command', async ({ page }) => {
    const pageErrors: string[] = [];
    const writes: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => {
        if (request.method() !== 'POST') return;
        const url = new URL(request.url());
        if (url.pathname.includes('/shops/shop-demo/')) writes.push(url.pathname);
    });

    await page.setViewportSize({ width: 390, height: 844 });
    const staleInventoryCursor = 'w12-stale-cursor-probe';
    const inventoryCursorRequest = page.waitForRequest(request => request.method() === 'GET' && new URL(request.url()).searchParams.get('cursor') === staleInventoryCursor);
    await page.goto(new URL(`/s/shop-demo/inventory?cursor=${staleInventoryCursor}&preserve=keep`, demoUrl).toString());
    await page.getByRole('textbox', { name: 'Mã kho' }).waitFor({ state: 'visible' });
    await inventoryCursorRequest;

    await page.getByRole('textbox', { name: 'Mã kho' }).fill('warehouse-01');
    const filteredRequest = page.waitForRequest(request => request.method() === 'GET' && new URL(request.url()).searchParams.get('warehouseId') === 'warehouse-01');
    await page.getByRole('button', { name: 'Áp dụng bộ lọc', exact: true }).click();
    const request = await filteredRequest;
    const appliedQuery = new URL(request.url()).searchParams;
    expect(appliedQuery.get('warehouseId')).toBe('warehouse-01');
    expect(appliedQuery.has('cursor')).toBe(false);
    await expect(page).toHaveURL(/preserve=keep/);
    await expect(page).not.toHaveURL(/cursor=/);
    await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).click();
    await expect(page).toHaveURL(/preserve=keep/);
    await expect(page).not.toHaveURL(/warehouseId=/);
    await expect(page).not.toHaveURL(/cursor=/);

    const staleMovementCursor = 'w12-stale-cursor-probe';
    const movementCursorRequest = page.waitForRequest(request => request.method() === 'GET' && new URL(request.url()).searchParams.get('cursor') === staleMovementCursor);
    await page.goto(new URL(`/s/shop-demo/inventory/movements?cursor=${staleMovementCursor}&preserve=keep`, demoUrl).toString());
    await page.getByRole('textbox', { name: 'Mã biến thể' }).waitFor({ state: 'visible' });
    await movementCursorRequest;
    await page.getByRole('textbox', { name: 'Mã kho' }).fill('warehouse-01');
    await page.getByRole('textbox', { name: 'Mã biến thể' }).fill('v-p1');
    const movementFilterRequest = page.waitForRequest(request => {
        const query = new URL(request.url()).searchParams;
        return request.method() === 'GET' && new URL(request.url()).pathname.endsWith('/inventory/movements') && query.get('warehouseId') === 'warehouse-01' && query.get('variantId') === 'v-p1';
    });
    await page.getByRole('button', { name: 'Áp dụng bộ lọc', exact: true }).click();
    const movementRequest = await movementFilterRequest;
    const movementQuery = new URL(movementRequest.url()).searchParams;
    expect(movementQuery.get('warehouseId')).toBe('warehouse-01');
    expect(movementQuery.get('variantId')).toBe('v-p1');
    expect(movementQuery.has('kind')).toBe(false);
    expect(movementQuery.has('cursor')).toBe(false);
    await expect(page).toHaveURL(/preserve=keep/);
    await expect(page).toHaveURL(/warehouseId=warehouse-01/);
    await expect(page).toHaveURL(/variantId=v-p1/);
    await expect(page).not.toHaveURL(/cursor=/);

    for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(new URL('/s/shop-demo/inventory', demoUrl).toString());
        await page.getByRole('button', { name: 'Điều chỉnh', exact: true }).first().click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        const box = await dialog.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
        await dialog.getByRole('textbox', { name: 'Thay đổi số lượng' }).fill('0');
        await dialog.getByRole('textbox', { name: 'Lý do điều chỉnh' }).fill('Kiểm tra layout kho');
        await dialog.getByRole('button', { name: 'Xác nhận điều chỉnh', exact: true }).click();
        await expect(dialog.getByText(/Số điều chỉnh phải khác 0/)).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }

    expect(writes).toEqual([]);
    expect(pageErrors).toEqual([]);
});
