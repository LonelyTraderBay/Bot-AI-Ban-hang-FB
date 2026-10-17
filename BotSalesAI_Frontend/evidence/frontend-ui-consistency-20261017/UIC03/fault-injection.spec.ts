import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { startDemoServer } from '../../../tests/session/demo-server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
const repositoryRoot = path.dirname(frontendRoot);
let origin = '';
let stopServer: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer({ cacheIsolationKey: 'uic03-worker-update-fault' });
    origin = server.url;
    stopServer = server.close;
});

test.afterAll(async () => stopServer?.());

test('records behavior when an active mock worker update rejects', async ({ page, browser }, info) => {
    const expectUnhandled = process.env.BOTSALES_UIC03_EXPECT_UNHANDLED === '1';
    const scriptUrl = new URL('/mockServiceWorker.js', origin).href;
    const pageErrors: Array<{ route: string; message: string }> = [];
    const warnings: string[] = [];
    page.on('pageerror', error => pageErrors.push({ route: new URL(page.url()).pathname, message: error.message }));
    page.on('console', message => {
        if (message.type() === 'warning') warnings.push(message.text());
    });

    await page.addInitScript((expectedScriptUrl: string) => {
        const diagnostics: string[] = ['instrumentation-installed'];
        Object.defineProperty(window, '__uic03UpdateFaultDiagnostics', { value: diagnostics });
        window.addEventListener('unhandledrejection', event => {
            diagnostics.push(`unhandled:${event.reason instanceof Error ? event.reason.message : String(event.reason)}`);
        });
        const prototype = ServiceWorkerRegistration.prototype;
        const descriptor = Object.getOwnPropertyDescriptor(prototype, 'update');
        if (!descriptor || typeof descriptor.value !== 'function' || descriptor.configurable === false) {
            diagnostics.push('instrumentation-unavailable');
            return;
        }
        const original = descriptor.value as (...args: unknown[]) => Promise<void>;
        Object.defineProperty(prototype, 'update', {
            ...descriptor,
            value: function (this: ServiceWorkerRegistration, ...args: unknown[]) {
                diagnostics.push(`update-called:${this.active?.scriptURL || 'no-active-worker'}`);
                if (this.active?.scriptURL === expectedScriptUrl) {
                    return Promise.reject(new TypeError(`Failed to update a ServiceWorker for scope ('${this.scope}') with script ('${expectedScriptUrl}'): Not found`));
                }
                return original.apply(this, args);
            },
        });
        diagnostics.push('instrumentation-ready');
    }, scriptUrl);

    await page.goto(new URL('/s/shop-demo/overview', origin).href, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toBe(scriptUrl);

    await page.goto(new URL('/s/shop-demo/service-cases', origin).href, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main h1')).toBeVisible();
    await page.evaluate(async (expectedScriptUrl: string) => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        const registration = registrations.find(candidate => candidate.active?.scriptURL === expectedScriptUrl);
        if (!registration) throw new Error('The existing mock Service Worker registration was not found.');
        // This deliberately mirrors MSW's fire-and-forget update() call.
        void registration.update();
    }, scriptUrl);
    await expect.poll(() => page.evaluate(() => (window as Window & { __uic03UpdateFaultDiagnostics?: string[] }).__uic03UpdateFaultDiagnostics?.filter(entry => entry.startsWith('unhandled:')).length || 0)).toBe(1);

    const observation = await page.evaluate(() => ({
        controllerScriptURL: navigator.serviceWorker.controller?.scriptURL ?? null,
        controllerState: navigator.serviceWorker.controller?.state ?? null,
        rejection: (window as Window & { __uic03UpdateFaultDiagnostics?: string[] }).__uic03UpdateFaultDiagnostics ?? [],
        pageHeading: document.querySelector('main h1')?.textContent ?? null,
    }));
    const report = {
        scope: 'synthetic fault injection: replace update() for an already-active local mock worker; no network response is altered',
        repositoryRevision: execFileSync('git', ['-C', repositoryRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
        recordedAt: new Date().toISOString(),
        browser: 'Playwright browser project',
        browserVersion: browser.version(),
        expectedUnhandledBeforeFix: expectUnhandled,
        scriptUrl,
        observation,
        pageErrors,
        warnings,
    };
    const output = info.outputPath('update-rejection-fault.json');
    fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await info.attach('update-rejection-fault', { path: output, contentType: 'application/json' });

    expect(observation.controllerScriptURL).toBe(scriptUrl);
    expect(observation.controllerState).toBe('activated');
    expect(observation.pageHeading).toBeTruthy();
    expect(observation.rejection).toContain('instrumentation-ready');
    expect(observation.rejection.some(entry => entry.startsWith('update-called:'))).toBe(true);
    expect(observation.rejection.filter(entry => entry.startsWith('unhandled:'))).toHaveLength(1);
    if (expectUnhandled) {
        expect(pageErrors).toHaveLength(1);
        expect(pageErrors[0].message).toContain('Failed to update a ServiceWorker');
        expect(warnings).toHaveLength(0);
    } else {
        expect(pageErrors).toEqual([]);
        expect(warnings).toHaveLength(1);
    }
});
