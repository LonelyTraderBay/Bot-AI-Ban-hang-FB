import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer({ cacheIsolationKey: 'ui028-w10-catalog-layout' });
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

test('catalog R09-R14 keeps shared gutters, inset ownership and dry-run flow at mobile and desktop', async ({ page }) => {
    const pageErrors: string[] = [];
    const commitRequests: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => {
        const url = new URL(request.url());
        if (request.method() === 'POST' && /\/shops\/shop-demo\/imports\/job-[^/]+\/commit$/.test(url.pathname)) commitRequests.push(url.pathname);
    });
    const cases = [
        { id: 'R09', path: '/s/shop-demo/products', heading: 'Sản phẩm' },
        { id: 'R10', path: '/s/shop-demo/products/new', heading: 'Thêm sản phẩm', inset: true },
        { id: 'R11', path: '/s/shop-demo/products/p1', heading: 'Thông tin sản phẩm', inset: true },
        { id: 'R12', path: '/s/shop-demo/categories', heading: 'Danh mục' },
        { id: 'R13', path: '/s/shop-demo/imports', heading: 'Nhập dữ liệu', inset: true },
    ];
    const observations = [];

    for (const viewport of [{ width: 390, height: 844, gutter: '8px' }, { width: 1280, height: 900, gutter: '8px' }]) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        for (const route of cases) {
            await page.goto(new URL(route.path, demoUrl).toString());
            await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible();
            await expect(page.locator('main#main-content')).toHaveCSS('padding-left', viewport.gutter);
            const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
            expect(scrollWidth, `${route.id} document width at ${viewport.width}`).toBe(viewport.width);
            let panelInset: string | null = null;
            if (route.inset) {
                panelInset = await page.locator('main#main-content .MuiPaper-root').first().locator(':scope > .MuiBox-root').evaluate(element => getComputedStyle(element).paddingLeft);
                expect(panelInset, `${route.id} operational body inset at ${viewport.width}`).toBe('12px');
            }
            observations.push({ route: route.id, width: viewport.width, documentWidth: scrollWidth, panelInset });
        }

        await page.goto(new URL('/s/shop-demo/imports', demoUrl).toString());
        const csv = [
            'sku,name,price,description,currency',
            `UI028-W10-${viewport.width},Mẫu catalog ${viewport.width},123000,Kiểm tra trước commit,VND`,
        ].join('\n');
        await page.locator('input[type="file"]').setInputFiles({ name: `w10-${viewport.width}.csv`, mimeType: 'text/csv', buffer: Buffer.from(csv, 'utf8') });
        await page.getByRole('button', { name: 'Kiểm tra trước khi nhập', exact: true }).click();
        await expect(page).toHaveURL(/\/s\/shop-demo\/imports\/job-/);
        await expect(page.getByRole('heading', { name: 'Kết quả kiểm tra tệp', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Xác nhận nhập các dòng hợp lệ', exact: true })).toBeEnabled();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
        observations.push({ route: 'R14', width: viewport.width, dryRunOnly: true, commitAvailable: true });
    }

    expect(observations).toHaveLength(12);
    expect(commitRequests).toEqual([]);
    expect(pageErrors).toEqual([]);
});

test('Imports main starts directly below the header at 806x884', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.setViewportSize({ width: 806, height: 884 });
    const route = new URL('/s/shop-demo/imports', demoUrl);
    await page.goto(route.toString());
    await expect(page).toHaveURL(route.toString());
    await expect(page.getByRole('heading', { name: 'Nhập dữ liệu', exact: true })).toBeVisible();

    await expect(page.getByRole('button', { name: /Công cụ demo/i })).toHaveCount(0);
    const geometry = await page.locator('#main-content').evaluate(main => ({
        headerToMain: main.getBoundingClientRect().top - document.querySelector('header')!.getBoundingClientRect().bottom,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
    }));
    expect(geometry).toEqual({ headerToMain: 0, documentWidth: 806, viewportWidth: 806 });
    expect(pageErrors).toEqual([]);
});
