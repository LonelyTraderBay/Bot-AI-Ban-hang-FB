import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { startDemoServer, startLiveServer } from './demo-server.mjs';

let demoUrl = '';
let stopDemoServer: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer({ runtime: 'dev' });
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

test('demo keeps the active mock worker and UI when its update request is rejected', async ({ browser }, info) => {
    const workerUrl = new URL('/mockServiceWorker.js', demoUrl).href;
    const scopeUrl = new URL('/', demoUrl).href;
    const context = await browser.newContext({ serviceWorkers: 'allow' });
    try {
        const page = await context.newPage();
        const errors: string[] = [];
        const diagnostics: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => {
            if (message.type() === 'warning' && message.text().startsWith('[MSW demo]')) diagnostics.push(message.text());
        });
        await page.addInitScript(({ expectedScope, expectedWorkerUrl }) => {
            const registrationPrototype = ServiceWorkerRegistration.prototype;
            const descriptor = Object.getOwnPropertyDescriptor(registrationPrototype, 'update');
            if (!descriptor || typeof descriptor.value !== 'function' || descriptor.configurable === false) {
                throw new Error('ServiceWorkerRegistration.update cannot be instrumented in this browser.');
            }
            const originalUpdate = descriptor.value as (...args: unknown[]) => Promise<void>;
            Object.defineProperty(registrationPrototype, 'update', {
                ...descriptor,
                value: function (this: ServiceWorkerRegistration, ...args: unknown[]) {
                    if (this.active?.scriptURL === expectedWorkerUrl) {
                        return Promise.reject(new TypeError(`Failed to update a ServiceWorker for scope ('${expectedScope}') with script ('${expectedWorkerUrl}'): Not found`));
                    }
                    return originalUpdate.apply(this, args);
                },
            });
        }, { expectedScope: scopeUrl, expectedWorkerUrl: workerUrl });

        await page.goto(new URL('/s/shop-demo/overview', demoUrl).href, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible();
        await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toBe(workerUrl);

        await page.goto(new URL('/s/shop-demo/service-cases', demoUrl).href, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main h1')).toBeVisible();
        await page.evaluate((expectedWorkerUrl: string) => {
            void navigator.serviceWorker.getRegistrations().then(registrations => {
                const registration = registrations.find(candidate => candidate.active?.scriptURL === expectedWorkerUrl);
                if (!registration) throw new Error('The active mock Service Worker registration was not found.');
                // Match MSW 2.11.1's fire-and-forget update() behavior for this controlled browser fault.
                void registration.update();
            });
        }, workerUrl);
        await expect.poll(() => diagnostics.length).toBe(1);
        expect(errors).toEqual([]);
        expect(diagnostics[0]).toContain('tiếp tục dùng worker đang hoạt động');
        await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.state)).toBe('activated');
        await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible();

        const unrelatedRejectionWasSuppressed = await page.evaluate(({ expectedScope }) => {
            const messages = [
                'This unrelated error must remain unhandled.',
                `Failed to update a ServiceWorker for scope ('${expectedScope}') with script ('${new URL('/another-worker.js', location.href).href}'): Not found`,
            ];
            return messages.map(message => {
                const event = new PromiseRejectionEvent('unhandledrejection', {
                    promise: Promise.resolve(), reason: new TypeError(message), cancelable: true,
                });
                window.dispatchEvent(event);
                return event.defaultPrevented;
            });
        }, { expectedScope: scopeUrl });
        expect(unrelatedRejectionWasSuppressed).toEqual([false, false]);
        expect(diagnostics).toHaveLength(1);

        const activeController = await page.evaluate(() => {
            const controller = navigator.serviceWorker.controller;
            return controller ? { scriptURL: controller.scriptURL, state: controller.state } : null;
        });
        const report = {
            scope: 'synthetic rejected update() against the active local demo mock worker; no network response is altered',
            browser: info.project.name,
            browserVersion: browser.version(),
            recordedAt: new Date().toISOString(),
            route: new URL(page.url()).pathname,
            scriptURL: workerUrl,
            registrationScope: scopeUrl,
            activeController,
            pageErrors: errors,
            diagnosticWarnings: diagnostics,
            unrelatedRejectionWasSuppressed,
        };
        const output = info.outputPath('service-worker-update-recovery.json');
        fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        await info.attach('service-worker-update-recovery', { path: output, contentType: 'application/json' });
    }
    finally {
        await context.close();
    }
});

test('demo worker remains isolated across concurrent contexts and reloads', async ({ browser }) => {
    const workerUrl = new URL('/mockServiceWorker.js', demoUrl).href;
    const firstContext = await browser.newContext({ serviceWorkers: 'allow' });
    const secondContext = await browser.newContext({ serviceWorkers: 'allow' });
    const errors: string[] = [];
    try {
        const [firstPage, secondPage] = await Promise.all([firstContext.newPage(), secondContext.newPage()]);
        firstPage.on('pageerror', error => errors.push(`first: ${error.message}`));
        secondPage.on('pageerror', error => errors.push(`second: ${error.message}`));
        await Promise.all([
            firstPage.goto(new URL('/s/shop-demo/overview', demoUrl).href, { waitUntil: 'domcontentloaded' }),
            secondPage.goto(new URL('/s/shop-demo/overview', demoUrl).href, { waitUntil: 'domcontentloaded' }),
        ]);
        for (const page of [firstPage, secondPage]) {
            await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible();
            await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toBe(workerUrl);
        }

        await firstPage.reload({ waitUntil: 'domcontentloaded' });
        await expect(firstPage.locator('main h1')).toBeVisible();
        await expect.poll(() => firstPage.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toBe(workerUrl);
        await firstContext.close();

        await secondPage.goto(new URL('/s/shop-demo/service-cases', demoUrl).href, { waitUntil: 'domcontentloaded' });
        await expect(secondPage.locator('main h1')).toBeVisible();
        await expect.poll(() => secondPage.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toBe(workerUrl);
        expect(errors).toEqual([]);
    }
    finally {
        await Promise.all([firstContext.close(), secondContext.close()]);
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
