import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { startDemoServer } from '../../../tests/session/demo-server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
const repositoryRoot = path.dirname(frontendRoot);
const { routes } = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'botsales-kit/contracts/route-manifest.json'), 'utf8')) as {
    routes: Array<{ id: string; path: string }>;
};
const ids: Record<string, string> = {
    shopId: 'shop-demo', conversationId: 'cv1', customerId: 'c1', productId: 'p1',
    orderId: 'DH-1001', knowledgeId: 'k1', jobId: 'missing-job',
};
const storageKey = '__botsales_uic03_service_worker_trace__';
let origin = '';
let stopServer: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer({ cacheIsolationKey: 'uic03-worker-lifecycle' });
    origin = server.url;
    stopServer = server.close;
});

test.afterAll(async () => stopServer?.());

test('records service-worker registration lifecycle during a canonical 1440px route walk', async ({ page, browser }, info) => {
    const pageErrors: Array<{ route: string; message: string }> = [];
    const workerResponses: Array<{ route: string; status: number; contentType: string | undefined; etag: string | undefined }> = [];
    const failedWorkerRequests: Array<{ route: string; error: string | null }> = [];
    const serviceWorkerProtocol: {
        enabled: boolean;
        enableError?: string;
        workerErrors: Array<Record<string, unknown>>;
        registrationUpdates: Array<Record<string, unknown>>;
        versionUpdates: Array<Record<string, unknown>>;
    } = { enabled: false, workerErrors: [], registrationUpdates: [], versionUpdates: [] };
    const protocol = await page.context().newCDPSession(page);
    protocol.on('ServiceWorker.workerErrorReported', event => serviceWorkerProtocol.workerErrors.push(event as Record<string, unknown>));
    protocol.on('ServiceWorker.workerRegistrationUpdated', event => serviceWorkerProtocol.registrationUpdates.push(event as Record<string, unknown>));
    protocol.on('ServiceWorker.workerVersionUpdated', event => serviceWorkerProtocol.versionUpdates.push(event as Record<string, unknown>));
    try {
        await protocol.send('ServiceWorker.enable');
        serviceWorkerProtocol.enabled = true;
    } catch (error) {
        serviceWorkerProtocol.enableError = String(error);
    }

    await page.addInitScript((key: string) => {
        const record = (type: string, detail: Record<string, unknown> = {}) => {
            try {
                const rows = JSON.parse(localStorage.getItem(key) || '[]') as Array<Record<string, unknown>>;
                rows.push({ type, at: new Date().toISOString(), href: location.href, hasController: Boolean(navigator.serviceWorker?.controller), ...detail });
                localStorage.setItem(key, JSON.stringify(rows));
            } catch { /* Diagnostics must not change application behavior if storage is unavailable. */ }
        };
        const registrationSummary = (registration: ServiceWorkerRegistration) => ({
            scope: registration.scope,
            active: registration.active?.state ?? null,
            installing: registration.installing?.state ?? null,
            waiting: registration.waiting?.state ?? null,
            scriptURL: registration.active?.scriptURL ?? registration.installing?.scriptURL ?? registration.waiting?.scriptURL ?? null,
        });

        window.addEventListener('error', event => record('window-error', { message: event.message, filename: event.filename }));
        window.addEventListener('unhandledrejection', event => record('unhandled-rejection', { reason: String(event.reason) }));
        navigator.serviceWorker?.addEventListener('controllerchange', () => record('controllerchange'));

        const container = navigator.serviceWorker;
        if (container) {
            const containerPrototype = Object.getPrototypeOf(container) as Record<string, unknown>;
            for (const name of ['getRegistrations', 'register'] as const) {
                const descriptor = Object.getOwnPropertyDescriptor(containerPrototype, name);
                if (!descriptor || typeof descriptor.value !== 'function' || descriptor.configurable === false) {
                    record('instrumentation-unavailable', { target: `ServiceWorkerContainer.${name}` });
                    continue;
                }
                const original = descriptor.value as (...args: unknown[]) => Promise<unknown>;
                Object.defineProperty(containerPrototype, name, {
                    ...descriptor,
                    value: async function (this: ServiceWorkerContainer, ...args: unknown[]) {
                        record(`ServiceWorkerContainer.${name}.before`, { args: args.map(String) });
                        try {
                            const result = await original.apply(this, args);
                            const registrations = Array.isArray(result) ? result as ServiceWorkerRegistration[] : [];
                            record(`ServiceWorkerContainer.${name}.resolved`, {
                                registrations: registrations.map(registrationSummary),
                                registration: result && !Array.isArray(result) ? registrationSummary(result as ServiceWorkerRegistration) : null,
                            });
                            return result;
                        } catch (error) {
                            record(`ServiceWorkerContainer.${name}.rejected`, { error: String(error) });
                            throw error;
                        }
                    },
                });
            }

            const registrationPrototype = ServiceWorkerRegistration.prototype;
            for (const name of ['update', 'unregister'] as const) {
                const descriptor = Object.getOwnPropertyDescriptor(registrationPrototype, name);
                if (!descriptor || typeof descriptor.value !== 'function' || descriptor.configurable === false) {
                    record('instrumentation-unavailable', { target: `ServiceWorkerRegistration.${name}` });
                    continue;
                }
                const original = descriptor.value as (...args: unknown[]) => Promise<unknown>;
                Object.defineProperty(registrationPrototype, name, {
                    ...descriptor,
                    value: function (this: ServiceWorkerRegistration, ...args: unknown[]) {
                        const registration = registrationSummary(this);
                        record(`ServiceWorkerRegistration.${name}.before`, registration);
                        const result = original.apply(this, args);
                        return Promise.resolve(result).then(value => {
                            record(`ServiceWorkerRegistration.${name}.resolved`, { ...registration, value });
                            return value;
                        }, error => {
                            record(`ServiceWorkerRegistration.${name}.rejected`, { ...registration, error: String(error) });
                            throw error;
                        });
                    },
                });
            }
        }
        record('document-start');
    }, storageKey);

    page.on('pageerror', error => pageErrors.push({ route: new URL(page.url()).pathname, message: error.message }));
    page.on('requestfailed', request => {
        if (new URL(request.url()).pathname === '/mockServiceWorker.js') {
            failedWorkerRequests.push({ route: new URL(page.url()).pathname, error: request.failure()?.errorText ?? null });
        }
    });
    page.on('response', response => {
        if (new URL(response.url()).pathname === '/mockServiceWorker.js') {
            workerResponses.push({
                route: new URL(page.url()).pathname,
                status: response.status(),
                contentType: response.headers()['content-type'],
                etag: response.headers().etag,
            });
        }
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of routes) {
        const pathname = route.path.replace(/:([A-Za-z]+)/g, (_, key: string) => ids[key] || 'missing');
        await page.goto(new URL(pathname, origin).toString(), { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main h1'), `${route.id} heading`).toBeVisible();
        await expect(page.locator('main .MuiCircularProgress-root, main .MuiLinearProgress-root'), `${route.id} loading state`).toHaveCount(0, { timeout: 30_000 });
    }

    const lifecycle = await page.evaluate((key: string) => JSON.parse(localStorage.getItem(key) || '[]') as Array<Record<string, unknown>>, storageKey);
    const report = {
        scope: 'local built-asset-independent demo server with synthetic MSW; diagnostic instrumentation may affect timing',
        browser: 'Google Chrome Stable',
        browserVersion: browser.version(),
        viewport: { width: 1440, height: 900 },
        routesExpected: routes.length,
        routesVisited: routes.length,
        pageErrors,
        workerResponses,
        failedWorkerRequests,
        serviceWorkerProtocol,
        lifecycle,
    };
    const output = info.outputPath('service-worker-lifecycle.json');
    fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await info.attach('service-worker-lifecycle', { path: output, contentType: 'application/json' });

    expect(lifecycle.some(event => event.type === 'instrumentation-unavailable'), 'Lifecycle instrumentation must attach to browser APIs').toBe(false);
    expect(routes).toHaveLength(61);
    expect(pageErrors).toEqual([]);
    expect(failedWorkerRequests).toEqual([]);
    await protocol.detach();
});
