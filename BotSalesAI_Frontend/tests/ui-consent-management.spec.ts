import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

test('R35 creates a pending challenge from API and shows consent history without local opt-out state', async ({ page }) => {
    await page.goto(new URL('/s/shop-demo/settings/privacy', demoUrl).toString());
    await expect(page.getByRole('heading', { name: 'Quyền riêng tư & vòng đời dữ liệu', exact: true })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Lịch sử consent khách hàng' })).toContainText('c1');
    await expect(page.getByRole('table', { name: 'Yêu cầu xác nhận đang chờ' })).toContainText('c3');
    await expect(page.getByRole('checkbox')).toHaveCount(0);

    const createResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/customers/c1/consent-challenges'));
    await page.getByRole('button', { name: 'Tạo yêu cầu xác nhận lại', exact: true }).click();
    const response = await createResponse;
    expect(response.status()).toBe(201);
    const created = await response.json();
    expect(created.data.status).toBe('pending');
    expect(created.data.action).toBe('confirm');
    expect(created.data).not.toHaveProperty('tokenHash');
    expect(created.data).not.toHaveProperty('identityId');
    await expect(page.getByRole('status').filter({ hasText: 'Đã tạo challenge chờ khách xác nhận' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Yêu cầu xác nhận đang chờ' })).toContainText('Đang chờ khách xác nhận');
});

test('R61 confirms an opt-out through POST body, removes the token from URL and leaves service messages available', async ({ page }) => {
    const token = 'local-demo-optout-consent-challenge-20261009';
    let csrfReferer: string | undefined;
    page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname === '/api/v2/auth/csrf') csrfReferer = request.headers()['referer'];
    });
    await page.goto(new URL(`/consent/confirm?token=${token}`, demoUrl).toString());
    await expect(page.getByRole('heading', { name: 'Xác nhận lựa chọn marketing', exact: true })).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');

    const exchangeRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname === '/api/v2/public/consent/challenges/exchange');
    const exchangeResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v2/public/consent/challenges/exchange');
    await page.getByRole('button', { name: 'Xem nội dung yêu cầu', exact: true }).click();
    const outbound = await exchangeRequest;
    expect(outbound.url()).not.toContain(token);
    expect(outbound.postDataJSON()).toEqual({ token });
    const exchanged = await exchangeResponse;
    expect(exchanged.status()).toBe(200);
    const challenge = await exchanged.json();
    expect(challenge.data.action).toBe('withdraw');
    expect(challenge.data).not.toHaveProperty('customerId');
    expect(challenge.data).not.toHaveProperty('identityId');
    await expect(page).toHaveURL(new URL('/consent/confirm', demoUrl).toString());
    expect(csrfReferer || '').not.toContain(token);

    const confirmation = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v2/public/consent/confirmations');
    await page.getByRole('button', { name: 'Xác nhận ngừng marketing', exact: true }).click();
    const confirmed = await confirmation;
    expect(confirmed.status()).toBe(200);
    expect((await confirmed.json()).data.consentStatus).toBe('withdrawn');
    await expect(page.getByRole('status')).toContainText('Tin nhắn phục vụ đơn hàng không bị ảnh hưởng');

    const storedConsents = await page.evaluate(async () => (await fetch('/api/v2/shops/shop-demo/customer-consents')).json());
    expect(storedConsents.data.find((record: { customerId: string }) => record.customerId === 'c2').status).toBe('withdrawn');
});

test('R61 public confirmation remains keyboard-accessible and reflows at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    const token = 'local-demo-reconfirm-consent-challenge-20261009';
    await page.goto(new URL(`/consent/confirm?token=${token}`, demoUrl).toString());
    const checkButton = page.getByRole('button', { name: 'Xem nội dung yêu cầu', exact: true });
    await expect(checkButton).toBeVisible();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(checkButton).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Đồng ý nhận marketing', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations, JSON.stringify(violations.map(violation => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map(node => node.target) }))).toString()).toEqual([]);
});
