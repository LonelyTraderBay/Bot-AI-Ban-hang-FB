import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test, type CDPSession } from '@playwright/test';
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
let origin = '';
let stopServer: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer({ cacheIsolationKey: 'uic03-worker-observation' });
    origin = server.url;
    stopServer = server.close;
});

test.afterAll(async () => stopServer?.());

test('observes Service Worker lifecycle across canonical small and large route walks', async ({ page, browser }, info) => {
    const pageErrors: Array<{ route: string; message: string }> = [];
    const workerErrors: Array<Record<string, unknown>> = [];
    const registrationUpdates: Array<Record<string, unknown>> = [];
    const versionUpdates: Array<Record<string, unknown>> = [];
    let protocol: CDPSession | undefined;
    let protocolEnableError: string | undefined;
    try {
        protocol = await page.context().newCDPSession(page);
        protocol.on('ServiceWorker.workerErrorReported', event => workerErrors.push(event as Record<string, unknown>));
        protocol.on('ServiceWorker.workerRegistrationUpdated', event => registrationUpdates.push(event as Record<string, unknown>));
        protocol.on('ServiceWorker.workerVersionUpdated', event => versionUpdates.push(event as Record<string, unknown>));
        await protocol.send('ServiceWorker.enable');
    } catch (error) {
        protocolEnableError = String(error);
        await protocol?.detach();
        protocol = undefined;
    }
    page.on('pageerror', error => pageErrors.push({ route: new URL(page.url()).pathname, message: error.message }));

    const viewports = [{ width: 390, height: 844 }, { width: 1440, height: 900 }];
    const routeStates: Array<Record<string, unknown>> = [];
    for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        for (const route of routes) {
            const pathname = route.path.replace(/:([A-Za-z]+)/g, (_, key: string) => ids[key] || 'missing');
            await page.goto(new URL(pathname, origin).toString(), { waitUntil: 'domcontentloaded' });
            await expect(page.locator('main h1'), `${route.id} heading at ${viewport.width}px`).toBeVisible();
            await expect(page.locator('main .MuiCircularProgress-root, main .MuiLinearProgress-root'), `${route.id} loading state at ${viewport.width}px`).toHaveCount(0, { timeout: 30_000 });
            const serviceWorkerState = await page.evaluate(async () => {
                const registrations = await navigator.serviceWorker.getRegistrations();
                const summarize = (worker: ServiceWorker | null) => worker ? ({ scriptURL: worker.scriptURL, state: worker.state }) : null;
                return {
                    controller: summarize(navigator.serviceWorker.controller),
                    registrations: registrations.map(registration => ({
                        scope: registration.scope,
                        active: summarize(registration.active),
                        installing: summarize(registration.installing),
                        waiting: summarize(registration.waiting),
                    })),
                };
            });
            routeStates.push({ viewport: viewport.width, route: route.id, pathname, serviceWorkerState });
        }
    }

    const report = {
        scope: 'local demo server with synthetic MSW; passive measurement without ServiceWorker API monkeypatches',
        repositoryRevision: execFileSync('git', ['-C', repositoryRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
        recordedAt: new Date().toISOString(),
        browser: info.project.name,
        browserVersion: browser.version(),
        viewports,
        routesExpected: routes.length * viewports.length,
        routesVisited: routeStates.length,
        pageErrors,
        serviceWorkerProtocol: {
            enabled: protocol !== undefined,
            enableError: protocolEnableError,
            workerErrors,
            registrationUpdates,
            versionUpdates,
        },
        routeStates,
    };
    const output = info.outputPath('service-worker-observation.json');
    fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await info.attach('service-worker-observation', { path: output, contentType: 'application/json' });
    await protocol?.detach();

    expect(routes).toHaveLength(61);
    expect(routeStates).toHaveLength(routes.length * viewports.length);
    expect(pageErrors).toEqual([]);
    expect(workerErrors).toEqual([]);
    const expectedWorkerUrl = new URL('/mockServiceWorker.js', origin).href;
    for (const state of routeStates) {
        const workerState = state.serviceWorkerState as {
            controller: { scriptURL: string; state: string } | null;
            registrations: Array<{ active: { scriptURL: string } | null; installing: { scriptURL: string } | null; waiting: { scriptURL: string } | null }>;
        };
        expect(workerState.controller, `${String(state.route)} controller at ${String(state.viewport)}px`).toEqual({ scriptURL: expectedWorkerUrl, state: 'activated' });
        expect(workerState.registrations.some(registration => [registration.active, registration.installing, registration.waiting]
            .some(worker => worker?.scriptURL === expectedWorkerUrl)), `${String(state.route)} mock worker registration at ${String(state.viewport)}px`).toBe(true);
    }
});
