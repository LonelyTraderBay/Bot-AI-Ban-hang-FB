import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const root = process.cwd();
const evidenceDir = path.join(root, 'evidence/frontend-ui-improvements/UI028/W20');
const owner = 'apps/web/src/modules/notifications/index.tsx';
const phase = process.argv[2] || 'before';
if (!['before', 'after'].includes(phase)) throw new Error(`Unsupported capture phase: ${phase}`);
const viewports = [
    { width: 390, height: 844, suffix: '390' },
    { width: 1280, height: 900, suffix: '1280' },
];
const captures = [];
const pageErrors = [];
const setupWrites = [];
const hash = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const sourceHashes = {
    notifications: hash(owner),
    pushCapabilities: hash('apps/web/src/modules/notifications/push-capabilities.ts'),
};
const server = await startDemoServer({ cacheIsolationKey: `ui028-w20-${phase}-20261006` });
const browser = await chromium.launch();

async function openRoute(page, route, heading) {
    await page.goto(new URL(route, server.url).toString(), { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: heading }).waitFor({ state: 'visible', timeout: 20_000 });
}

async function navigateClientSide(page, route) {
    await page.evaluate(nextPath => {
        window.history.pushState({}, '', nextPath);
        window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
    }, route);
}

async function capture(page, viewport, routeId, state) {
    await page.waitForTimeout(250);
    const dialogs = page.getByRole('dialog');
    const dialog = (await dialogs.count()) > 0 && await dialogs.first().isVisible()
        ? await dialogs.first().boundingBox()
        : null;
    const metrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        clientHeight: document.documentElement.clientHeight,
        scrollHeight: document.documentElement.scrollHeight,
    }));
    const screenshot = `${phase}-${routeId.toLowerCase()}-${state}-${viewport.suffix}.png`;
    await page.screenshot({ path: path.join(evidenceDir, screenshot), fullPage: true });
    captures.push({ route: routeId, state, viewport: { width: viewport.width, height: viewport.height }, screenshot, ...metrics, dialogBounds: dialog });
}

try {
    for (const viewport of viewports) {
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
        const page = await context.newPage();
        page.on('pageerror', error => pageErrors.push(`${viewport.suffix}: ${error.message}`));
        page.on('request', request => {
            const url = new URL(request.url());
            if (url.pathname.startsWith('/api/v2/') && request.method() !== 'GET') {
                setupWrites.push({ viewport: viewport.suffix, method: request.method(), path: url.pathname });
            }
        });

        await openRoute(page, '/s/shop-demo/notifications', 'Trung tâm thông báo');
        await capture(page, viewport, 'R39', 'notification-list');

        await page.goto(new URL('/s/shop-demo/overview', server.url).toString(), { waitUntil: 'domcontentloaded' });
        await page.locator('main#main-content').waitFor({ state: 'visible' });
        await page.evaluate(async () => {
            const mock = await import('/src/mocks/service.ts');
            mock.setFault('empty_persistent');
            window.history.pushState({}, '', '/s/shop-demo/notifications');
            window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
        });
        await page.getByRole('status').filter({ hasText: 'Chưa có thông báo.' }).waitFor({ state: 'visible' });
        await capture(page, viewport, 'R39', 'notification-empty');

        await page.evaluate(async () => {
            const mock = await import('/src/mocks/service.ts');
            mock.setFault('none');
        });
        await navigateClientSide(page, '/s/shop-demo/notifications/devices');
        await page.getByRole('heading', { name: 'Điện thoại & lịch trực' }).waitFor({ state: 'visible' });
        await capture(page, viewport, 'R40', 'devices-and-policy');
        await page.getByRole('button', { name: 'Thu hồi' }).first().click();
        await page.getByRole('dialog', { name: 'Thu hồi thiết bị' }).waitFor({ state: 'visible' });
        await capture(page, viewport, 'R40', 'revoke-device-dialog');

        await context.close();
    }
} finally {
    await browser.close();
    await server.close();
}

const output = {
    task: 'UI028.W20',
    phase,
    sourceHashes,
    viewports: viewports.map(({ width, height }) => `${width}x${height}`),
    captures,
    setupWrites,
    pageErrors,
};
fs.writeFileSync(path.join(evidenceDir, `render-${phase}-spacing-current-20261006.json`), `${JSON.stringify(output, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ task: output.task, phase, observations: captures.length, writes: setupWrites.length, pageErrors: pageErrors.length, sourceHashes }));
