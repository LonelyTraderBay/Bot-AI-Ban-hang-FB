import { openDemoControls } from './session/demo-controls';
import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';
import { evidenceRunId } from './evidence-run-id.mjs';

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
    await openDemoControls(page);
    await expect(page.getByRole('combobox', { name: 'Trạng thái thử' })).toBeVisible();
}

async function setFault(page: import('@playwright/test').Page, fault: string) {
    await page.evaluate(async value => {
        const mock = await import('/src/mocks/service.ts');
        mock.setFault(value as 'none' | 'empty_persistent');
    }, fault);
}

async function setOperationFailure(page: import('@playwright/test').Page, failure: { status: number; code: string; message: string } | null) {
    await page.evaluate(async nextFailure => {
        const mock = await import('/src/mocks/service.ts');
        mock.setOperationFailure('listChannels', nextFailure);
    }, failure);
}

async function setOperationDelay(page: import('@playwright/test').Page, delayMs: number | null) {
    await page.evaluate(async nextDelay => {
        const mock = await import('/src/mocks/service.ts');
        mock.setOperationDelay('listChannels', nextDelay);
    }, delayMs);
}

async function chooseMockOption(page: import('@playwright/test').Page, label: string, value: string) {
    if (['Vai trò mô phỏng', 'Trạng thái thử', 'Dataset mô phỏng'].includes(label)) await openDemoControls(page);
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
}

async function navigateClientSide(page: import('@playwright/test').Page, path: string) {
    await page.evaluate(nextPath => {
        window.history.pushState({}, '', nextPath);
        window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
    }, path);
}

test('UI008 R29 successful empty collection exposes an accessible state and one permission-guarded connect CTA', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/overview');
    await setFault(page, 'empty_persistent');
    const channelsResponse = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname.endsWith('/integrations/channels'));
    await navigateClientSide(page, '/s/shop-demo/integrations/channels');
    const response = await channelsResponse;
    const payload = await response.json() as { data: unknown[] };

    expect(response.status()).toBe(200);
    expect(payload.data).toEqual([]);
    const main = page.locator('main#main-content');
    const emptyState = main.getByRole('status').filter({ hasText: 'Chưa có Page kết nối.' });
    await expect(emptyState).toBeVisible();
    await expect(main.getByRole('button', { name: 'Kết nối Page', exact: true })).toHaveCount(1);
    await page.screenshot({ path: `evidence/frontend-ui-improvements/UI008/S04-R29-empty-after-${test.info().project.name}-${evidenceRunId}.png`, fullPage: true });
});

test('UI008 R29 read-only bot_admin sees the empty state without a manage action', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/overview');
    await chooseMockOption(page, 'Vai trò mô phỏng', 'bot_admin');
    await expect(page.getByRole('combobox', { name: 'Vai trò mô phỏng' })).toContainText('bot_admin');
    await setFault(page, 'empty_persistent');
    const channelsResponse = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname.endsWith('/integrations/channels'));
    await navigateClientSide(page, '/s/shop-demo/integrations/channels');
    expect((await channelsResponse).status()).toBe(200);

    const main = page.locator('main#main-content');
    await expect(main.getByRole('status').filter({ hasText: 'Chưa có Page kết nối.' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Kết nối Page', exact: true })).toHaveCount(0);
});

test('UI008 R29 pending channel query stays loading until its response arrives', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/overview');
    await setOperationDelay(page, 900);
    const channelsResponse = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname.endsWith('/integrations/channels'));
    await navigateClientSide(page, '/s/shop-demo/integrations/channels');

    const main = page.locator('main#main-content');
    await main.getByRole('heading', { name: 'Kết nối Facebook', exact: true }).waitFor({ state: 'visible' });
    await expect(main.getByRole('progressbar')).toBeVisible();
    await expect(main.getByText('Chưa có Page kết nối.', { exact: false })).toHaveCount(0);
    const response = await channelsResponse;
    expect(response.status()).toBe(200);
    expect(((await response.json()) as { data: unknown[] }).data.length).toBeGreaterThan(0);
    await setOperationDelay(page, null);
    await expect(main.getByRole('progressbar')).toHaveCount(0);
    await expect(main.getByRole('status').filter({ hasText: 'Chưa có Page kết nối.' })).toHaveCount(0);
});

test('UI008 R29 forbidden channel query is not presented as empty or retryable', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/overview');
    await setOperationFailure(page, { status: 403, code: 'UI008_R29_FORBIDDEN', message: 'UI008_R29_FORBIDDEN' });
    const channelsResponse = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname.endsWith('/integrations/channels'));
    await navigateClientSide(page, '/s/shop-demo/integrations/channels');
    expect((await channelsResponse).status()).toBe(403);

    const main = page.locator('main#main-content');
    await expect(main.getByRole('alert').filter({ hasText: 'UI008_R29_FORBIDDEN' })).toBeVisible();
    await expect(main.getByRole('status').filter({ hasText: 'Chưa có Page kết nối.' })).toHaveCount(0);
    await expect(main.getByRole('button', { name: 'Thử lại', exact: true })).toHaveCount(0);
});

test('UI008 R29 503 remains an error and recovers through its retry control', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/overview');
    await setOperationFailure(page, { status: 503, code: 'UI008_R29_UNAVAILABLE', message: 'UI008_R29_UNAVAILABLE' });
    const failedResponse = page.waitForResponse(response => response.request().method() === 'GET'
        && response.status() === 503 && new URL(response.url()).pathname.endsWith('/integrations/channels'));
    await navigateClientSide(page, '/s/shop-demo/integrations/channels');
    expect((await failedResponse).status()).toBe(503);

    const main = page.locator('main#main-content');
    const queryError = main.getByRole('alert').filter({ hasText: 'UI008_R29_UNAVAILABLE' });
    await expect(queryError).toBeVisible();
    await expect(main.getByRole('status').filter({ hasText: 'Chưa có Page kết nối.' })).toHaveCount(0);
    await setOperationFailure(page, null);
    const retriedResponse = page.waitForResponse(response => response.request().method() === 'GET'
        && response.status() === 200 && new URL(response.url()).pathname.endsWith('/integrations/channels'));
    await queryError.getByRole('button', { name: 'Thử lại', exact: true }).click();
    const response = await retriedResponse;
    expect(((await response.json()) as { data: unknown[] }).data.length).toBeGreaterThan(0);
    await expect(queryError).toHaveCount(0);
});

test('UI008 R30 successful empty AI connection cards show a first-use state and one add CTA', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/overview');
    await setFault(page, 'empty_persistent');
    const connectionsResponse = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname.endsWith('/integrations/ai'));
    await navigateClientSide(page, '/s/shop-demo/integrations/ai');
    const response = await connectionsResponse;
    const payload = await response.json() as { data: unknown[] };

    expect(response.status()).toBe(200);
    expect(payload.data).toEqual([]);
    const main = page.locator('main#main-content');
    const emptyState = main.getByRole('status').filter({ hasText: 'Chưa có kết nối AI.' });
    await expect(emptyState).toBeVisible();
    await expect(main.getByRole('button', { name: 'Thêm kết nối AI', exact: true })).toHaveCount(1);
    await page.screenshot({ path: `evidence/frontend-ui-improvements/UI008/S04-R30-empty-after-${test.info().project.name}-${evidenceRunId}.png`, fullPage: true });
});

test('UI008 R30 read-only bot_admin sees the empty state without an add action', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/overview');
    await chooseMockOption(page, 'Vai trò mô phỏng', 'bot_admin');
    await expect(page.getByRole('combobox', { name: 'Vai trò mô phỏng' })).toContainText('bot_admin');
    await setFault(page, 'empty_persistent');
    const connectionsResponse = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname.endsWith('/integrations/ai'));
    await navigateClientSide(page, '/s/shop-demo/integrations/ai');
    expect((await connectionsResponse).status()).toBe(200);

    const main = page.locator('main#main-content');
    await expect(main.getByRole('status').filter({ hasText: 'Chưa có kết nối AI.' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Thêm kết nối AI', exact: true })).toHaveCount(0);
});
