import { expect, test } from '@playwright/test';
import { startDemoServer, startLiveServer } from './demo-server.mjs';

let demoUrl = '';
let stopDemoServer: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    stopDemoServer = server.close;
});

test.afterAll(async () => {
    await stopDemoServer?.();
});

test('demo conditional module requests return complete exports without changing live or non-asset caching', async ({ browser, request }) => {
    const modulePath = `/@fs/${process.cwd().replaceAll('\\', '/').replace(/^\//u, '')}/packages/contracts/src/generated.ts`;
    const moduleUrl = new URL(modulePath, demoUrl).toString();
    const initial = await request.get(moduleUrl);
    expect(initial.status()).toBe(200);
    const etag = initial.headers().etag;
    expect(etag).toBeTruthy();

    const conditional = await request.get(moduleUrl, {
        headers: { 'If-None-Match': etag, 'Sec-Fetch-Dest': 'script' },
    });
    expect(conditional.status()).toBe(200);
    expect(await conditional.text()).toContain('API_BASE_PATH');
    const nonAsset = await request.get(moduleUrl, { headers: { 'If-None-Match': etag } });
    expect(nonAsset.status()).toBe(304);
    const head = await request.head(moduleUrl, {
        headers: { 'If-None-Match': etag, 'Sec-Fetch-Dest': 'script' },
    });
    expect(head.status()).toBe(304);
    const styleUrl = new URL('/src/app/bootstrap.css?direct', demoUrl).toString();
    const styleInitial = await request.get(styleUrl);
    expect(styleInitial.status()).toBe(200);
    const styleConditional = await request.get(styleUrl, {
        headers: { 'If-None-Match': styleInitial.headers().etag, 'Sec-Fetch-Dest': 'style' },
    });
    expect(styleConditional.status()).toBe(200);
    expect(await styleConditional.text()).toBe(await styleInitial.text());

    const live = await startLiveServer();
    try {
        const liveUrl = new URL(modulePath, live.url).toString();
        const liveInitial = await request.get(liveUrl);
        expect(liveInitial.status()).toBe(200);
        const liveConditional = await request.get(liveUrl, {
            headers: { 'If-None-Match': liveInitial.headers().etag, 'Sec-Fetch-Dest': 'script' },
        });
        expect(liveConditional.status()).toBe(304);
    }
    finally {
        await live.close();
    }

    const context = await browser.newContext({
        serviceWorkers: 'allow', extraHTTPHeaders: { 'If-None-Match': etag },
    });
    try {
        const page = await context.newPage();
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        const moduleResponse = page.waitForResponse(response => response.url() === moduleUrl);
        await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
        expect((await moduleResponse).status()).toBe(200);
        await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible();
        await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
        await page.goto(new URL('/s/shop-demo/service-cases', demoUrl).toString());
        await expect(page.locator('main h1')).toBeVisible();
        expect(errors).toEqual([]);
    }
    finally {
        await context.close();
    }
});

test('demo startup explains the required setup when the browser blocks Service Workers', async ({ browser }) => {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    try {
        const page = await context.newPage();
        await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());

        await expect(page.getByRole('heading', { name: 'Chưa khởi động được ứng dụng', exact: true })).toBeVisible();
        await expect(page.getByText(/Chạy npm run setup để tạo service worker mô phỏng/)).toBeVisible();
        await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toHaveCount(0);
        await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toHaveCount(0);
    }
    finally {
        await context.close();
    }
});
