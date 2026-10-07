import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

async function gotoDemo(page: import('@playwright/test').Page, route: string) {
    await page.goto(new URL(route, demoUrl).toString());
}

test('FE019.S01 maps integrations and notification routes, actions, schemas, and mock boundaries', () => {
    const root = process.cwd();
    const manifest = JSON.parse(readFileSync(join(root, '../botsales-kit/contracts/route-manifest.json'), 'utf8')) as {
        routes: Array<{ id: string; path: string; module: string; readPermission: string; actions: Array<{ operationId: string; permission: string }> }>;
    };
    const openapi = JSON.parse(readFileSync(join(root, '../botsales-kit/contracts/openapi.json'), 'utf8')) as {
        paths: Record<string, Record<string, { operationId?: string; 'x-permission'?: string }>>;
        components: { schemas: Record<string, { properties?: Record<string, { writeOnly?: boolean; minimum?: number; enum?: string[]; anyOf?: Array<{ minimum?: number }> }> }> };
    };
    const routes = new Map(manifest.routes.map(route => [route.id, route]));
    const operations = Object.values(openapi.paths).flatMap(path => Object.values(path)).filter(operation => operation.operationId);
    const byId = new Map(operations.map(operation => [operation.operationId, operation]));
    const expected = {
        R29: ['integrations', '/s/:shopId/integrations/channels', 'integrations.read'],
        R30: ['integrations', '/s/:shopId/integrations/ai', 'integrations.read'],
        R39: ['notifications', '/s/:shopId/notifications', 'notifications.read'],
        R40: ['notifications', '/s/:shopId/notifications/devices', 'notifications.manage'],
    } as const;
    for (const [id, [module, path, permission]] of Object.entries(expected)) {
        const route = routes.get(id);
        expect(route, `${id} exists in the canonical route manifest`).toBeTruthy();
        expect(route).toMatchObject({ module, path, readPermission: permission });
        for (const action of route!.actions) {
            expect(byId.has(action.operationId), `${action.operationId} exists in OpenAPI`).toBe(true);
            expect(byId.get(action.operationId)?.['x-permission']).toBe(action.permission);
        }
    }
    expect(openapi.components.schemas.AIConnectionWrite?.properties?.credential?.writeOnly).toBe(true);
    expect(openapi.components.schemas.AIConnectionPatch?.properties?.credential?.writeOnly).toBe(true);
    expect(openapi.components.schemas.NotificationPolicyWrite?.properties?.remindAfterMinutes?.anyOf?.some(schema => schema.minimum === 1)).toBe(true);
    expect(openapi.components.schemas.NotificationPolicyWrite?.properties?.maxReminders?.minimum).toBe(0);
    expect(openapi.components.schemas.DeviceSubscription?.properties?.status?.enum).toContain('pending');

    const integrations = readFileSync(join(root, 'apps/web/src/modules/integrations/index.tsx'), 'utf8');
    const notifications = readFileSync(join(root, 'apps/web/src/modules/notifications/index.tsx'), 'utf8');
    const pushCapabilities = readFileSync(join(root, 'apps/web/src/modules/notifications/push-capabilities.ts'), 'utf8');
    const mock = readFileSync(join(root, 'apps/web/src/mocks/auxiliary.ts'), 'utf8');
    for (const operationId of ['listChannels', 'beginChannelConnect', 'reconnectChannel', 'disconnectChannel', 'checkChannelHealth', 'listAIConnections', 'getProviderCatalog', 'createAIConnection', 'updateAIConnection', 'testAIConnection', 'deleteAIConnection'])
        expect(integrations).toContain(`'${operationId}'`);
    for (const operationId of ['listNotifications', 'acknowledgeNotification', 'listDevices', 'createDevice', 'testDevice', 'revokeDevice', 'getNotificationPolicy', 'updateNotificationPolicy', 'beginTelegramPairing'])
        expect(notifications).toContain(`'${operationId}'`);
    expect(mock).toMatch(/case 'beginChannelConnect':[\s\S]*?throw new MockFailure\(409, 'MOCK_ONLY'/);
    expect(mock).toMatch(/case 'createAIConnection':[\s\S]*?const \{ credential, \.\.\.data \} = body/);
    expect(mock).toContain("status: 'pending'");
    expect(mock).toContain('DEMO-NOT-A-REAL-PAIRING');
    expect(pushCapabilities).toContain("permission !== 'granted'");
    expect(notifications.indexOf('assertPushPermissionGranted(await Notification.requestPermission())')).toBeLessThan(notifications.indexOf('endpoint: json.endpoint'));
});

test('FE019.AC01 AI secret is write-only, cleared after submit, and absent from stored/read data', async ({ page }) => {
    const secret = 'demo-fe019-synthetic-credential';
    const consoleMessages: string[] = [];
    page.on('console', message => consoleMessages.push(message.text()));
    await gotoDemo(page, '/s/shop-demo/integrations/ai');
    await page.getByRole('button', { name: 'Thêm kết nối AI' }).click();
    const dialog = page.getByRole('dialog', { name: 'Kết nối AI mới' });
    await dialog.getByRole('textbox', { name: 'Tên kết nối' }).fill('FE019 kết nối giả');
    await dialog.getByRole('combobox', { name: 'Provider đã có adapter' }).click();
    await page.getByRole('option', { name: /Nhà cung cấp mô phỏng/ }).click();
    await dialog.getByRole('textbox', { name: 'Model ID được adapter hỗ trợ' }).fill('synthetic-model');
    await dialog.getByLabel('Khóa API').fill(secret);

    const requestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/integrations/ai'));
    const responseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/integrations/ai'));
    await dialog.getByRole('button', { name: 'Lưu cấu hình' }).click();
    const request = await requestWait;
    expect(request.postDataJSON()).toMatchObject({ providerId: 'mock', modelId: 'synthetic-model', credential: secret });
    const response = await responseWait;
    expect(response.status()).toBe(201);
    const responseText = await response.text();
    const createdConnection = JSON.parse(responseText).data;
    expect(responseText).not.toContain(secret);
    expect(responseText).toContain('"hasCredential":false');
    expect(responseText).toContain('"status":"unconfigured"');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('FE019 kết nối giả', { exact: true })).toBeVisible();
    const clientStorage = await page.evaluate(() => `${localStorage.getItem('') || ''}\n${sessionStorage.getItem('') || ''}\n${Object.keys(localStorage).map(key => localStorage.getItem(key)).join('\n')}\n${Object.keys(sessionStorage).map(key => sessionStorage.getItem(key)).join('\n')}`);
    expect(clientStorage).not.toContain(secret);
    expect(consoleMessages.join('\n')).not.toContain(secret);
    const listed = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/integrations/ai')).json()).data);
    expect(JSON.stringify(listed)).not.toContain(secret);
    expect(JSON.stringify(listed)).not.toContain('credential');

    await page.getByRole('button', { name: 'Sửa / xoay khóa' }).first().click();
    const editDialog = page.getByRole('dialog', { name: 'Sửa kết nối / xoay khóa' });
    await editDialog.getByRole('textbox', { name: 'Tên kết nối' }).fill('FE019 cấu hình cập nhật');
    const updateRequestWait = page.waitForRequest(request => request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith(`/integrations/ai/${createdConnection.id}`));
    const updateResponseWait = page.waitForResponse(update => update.request().method() === 'PATCH' && new URL(update.url()).pathname.includes('/integrations/ai/'));
    await editDialog.getByRole('button', { name: 'Lưu cấu hình' }).click();
    const updateRequest = await updateRequestWait;
    expect(updateRequest.postDataJSON()).toEqual({ name: 'FE019 cấu hình cập nhật', modelId: 'synthetic-model' });
    const updateResponse = await updateResponseWait;
    expect(updateResponse.status()).toBe(200);
    expect(await updateResponse.text()).not.toContain(secret);
});

test('FE019.AC01 invalid mock credential is rejected, cleared from the form, and not submitted', async ({ page }) => {
    const secret = 'not-a-demo-secret-value';
    let createRequests = 0;
    page.on('request', request => {
        if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/integrations/ai')) createRequests += 1;
    });
    await gotoDemo(page, '/s/shop-demo/integrations/ai');
    await page.getByRole('button', { name: 'Thêm kết nối AI' }).click();
    const dialog = page.getByRole('dialog', { name: 'Kết nối AI mới' });
    await dialog.getByRole('textbox', { name: 'Tên kết nối' }).fill('Credential bị từ chối');
    await dialog.getByRole('combobox', { name: 'Provider đã có adapter' }).click();
    await page.getByRole('option', { name: /Nhà cung cấp mô phỏng/ }).click();
    await dialog.getByRole('textbox', { name: 'Model ID được adapter hỗ trợ' }).fill('synthetic-model');
    const credentialInput = dialog.getByLabel('Khóa API');
    await credentialInput.fill(secret);
    await dialog.getByRole('button', { name: 'Lưu cấu hình' }).click();
    await expect(dialog.getByRole('alert').filter({ hasText: 'Chỉ nhập khóa giả' })).toBeVisible();
    await expect(credentialInput).toHaveValue('');
    expect(createRequests).toBe(0);
});

test('FE019.AC02 channel OAuth failure stays on the page and never marks a channel connected', async ({ page }) => {
    const externalRequests: string[] = [];
    page.on('request', request => {
        const url = new URL(request.url());
        if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') externalRequests.push(url.origin);
    });
    const channelListWait = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.startsWith('/api/v2/') && new URL(response.url()).pathname.endsWith('/integrations/channels'));
    await gotoDemo(page, '/s/shop-demo/integrations/channels');
    await expect(page.getByText('Mô phỏng, chưa liên kết thật', { exact: true })).toBeVisible();
    await expect(page.getByText('Đã kết nối', { exact: true })).toHaveCount(0);
    const channelListResponse = await channelListWait;
    const before = (await channelListResponse.json()).data;
    const startUrl = page.url();
    const responseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/integrations/channels/connect'));
    await page.getByRole('button', { name: 'Kết nối Page' }).click();
    const response = await responseWait;
    expect(response.status()).toBe(409);
    expect((await response.json()).code).toBe('MOCK_ONLY');
    await expect(page.getByRole('alert').filter({ hasText: 'không mở OAuth hoặc kết nối Page thật' })).toBeVisible();
    expect(page.url()).toBe(startUrl);
    const after = await page.evaluate(async path => (await (await fetch(path)).json()).data, new URL(channelListResponse.url()).pathname);
    expect(after).toEqual(before);
    expect(externalRequests).toEqual([]);

    const reconnectWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/fb-01/reconnect'));
    await page.getByRole('button', { name: 'Kết nối lại' }).click();
    const reconnectResponse = await reconnectWait;
    expect(reconnectResponse.status()).toBe(409);
    expect((await reconnectResponse.json()).code).toBe('MOCK_ONLY');
    const afterReconnect = await page.evaluate(async path => (await (await fetch(path)).json()).data, new URL(channelListResponse.url()).pathname);
    expect(afterReconnect).toEqual(before);
    expect(externalRequests).toEqual([]);
});

test('FE019.AC03/04 device, Telegram, and PWA checks stay synthetic and do not request OS permission', async ({ page }) => {
    await page.addInitScript(() => {
        Object.assign(window, { __fe019PermissionCalls: 0 });
        if ('Notification' in window) {
            Object.defineProperty(Notification, 'requestPermission', {
                configurable: true,
                value: () => {
                    const state = window as Window & { __fe019PermissionCalls: number };
                    state.__fe019PermissionCalls += 1;
                    return Promise.resolve('granted' as NotificationPermission);
                },
            });
        }
    });
    await gotoDemo(page, '/s/shop-demo/notifications/devices');
    await expect(page.getByText('Mô phỏng không yêu cầu quyền hệ điều hành', { exact: false })).toBeVisible();
    const manifest = await page.request.get(new URL('/manifest.webmanifest', demoUrl).toString());
    expect(manifest.ok()).toBe(true);
    const manifestJson = await manifest.json();
    expect(manifestJson.icons).toEqual(expect.arrayContaining([expect.objectContaining({ src: '/app-icon.svg' })]));
    expect((await page.request.get(new URL('/app-icon.svg', demoUrl).toString())).ok()).toBe(true);

    await page.getByLabel('Tên thiết bị').fill('Thiết bị FE019');
    const deviceRequestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/devices'));
    const deviceResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/devices'));
    await page.getByRole('button', { name: 'Mô phỏng đăng ký thiết bị' }).click();
    const deviceRequest = await deviceRequestWait;
    expect(deviceRequest.postDataJSON()).toMatchObject({ deviceName: 'Thiết bị FE019', endpoint: 'https://example.test/mock-push' });
    const deviceResponse = await deviceResponseWait;
    expect(deviceResponse.status()).toBe(201);
    const device = (await deviceResponse.json()).data;
    expect(device).toMatchObject({ deviceName: 'Thiết bị FE019', channel: 'web_push', status: 'pending', lastVerifiedAt: null });
    expect(device).not.toHaveProperty('endpoint');
    expect(device).not.toHaveProperty('p256dh');
    await expect(page.getByRole('row').filter({ hasText: 'Thiết bị FE019' }).getByText('Đang chờ')).toBeVisible();
    expect(await page.evaluate(() => (window as Window & { __fe019PermissionCalls: number }).__fe019PermissionCalls)).toBe(0);

    const syntheticPairWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/telegram-pairing'));
    await page.getByRole('button', { name: 'Tạo mã liên kết' }).click();
    const pairingResponse = await syntheticPairWait;
    const pairing = (await pairingResponse.json()).data;
    expect(pairing.pairingCode).toBe('DEMO-NOT-A-REAL-PAIRING');
    const pairingAlert = page.getByRole('alert').filter({ hasText: 'Mã minh họa, không dùng để liên kết thật' });
    await expect(pairingAlert).toContainText('DEMO-NOT-A-REAL-PAIRING');
    await page.getByRole('combobox', { name: 'Kênh dự phòng' }).click();
    const telegramOption = page.getByRole('option', { name: 'Telegram (chưa có thiết bị active)' });
    await expect(telegramOption).toHaveAttribute('aria-disabled', 'true');

    const testRequestWait = page.waitForRequest(request => request.method() === 'POST' && /\/devices\/[^/]+\/test$/.test(new URL(request.url()).pathname));
    const testResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && /\/devices\/[^/]+\/test$/.test(new URL(response.url()).pathname));
    await page.keyboard.press('Escape');
    await page.getByRole('row').filter({ hasText: 'Thiết bị FE019' }).getByRole('button', { name: 'Kiểm tra mô phỏng' }).click();
    const testRequest = await testRequestWait;
    expect(testRequest.postDataJSON()).toMatchObject({ expectedVersion: device.version });
    const testResponse = await testResponseWait;
    expect(testResponse.status()).toBe(202);
    const testResult = (await testResponse.json()).data;
    expect(testResult).toMatchObject({ status: 'failed', problem: { code: 'MOCK_ONLY' } });
    await expect(page.getByText('Mô phỏng: không gửi Push thật; kiểm tra bị từ chối và trạng thái thiết bị không đổi.')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Thiết bị FE019' }).getByText('Đang chờ')).toBeVisible();

    const deviceRow = page.getByRole('row').filter({ hasText: 'Thiết bị FE019' });
    await deviceRow.getByRole('button', { name: 'Thu hồi' }).click();
    const revokeDialog = page.getByRole('dialog', { name: 'Thu hồi thiết bị' });
    const revokeResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/devices/${device.id}/revoke`));
    await revokeDialog.getByRole('button', { name: 'Xác nhận' }).click();
    const revokeResponse = await revokeResponseWait;
    expect(revokeResponse.status()).toBe(200);
    expect((await revokeResponse.json()).data).toMatchObject({ id: device.id, status: 'revoked' });
    await expect(page.getByRole('row').filter({ hasText: 'Thiết bị FE019' }).getByText('Đã thu hồi')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Thiết bị FE019' }).getByRole('button', { name: 'Kiểm tra mô phỏng' })).toBeDisabled();

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole('heading', { name: 'Điện thoại & lịch trực' })).toBeVisible();
    const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(documentWidth).toBeLessThanOrEqual(viewportWidth + 1);
});

test('FE019.AC05 notification policy validates canonical numeric bounds before sending and acknowledges only allowed work', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/notifications/devices');
    const maxReminders = page.getByLabel('Số lần nhắc tối đa');
    await maxReminders.fill('-1');
    await expect(page.getByRole('alert').filter({ hasText: 'số nguyên từ 0 trở lên' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lưu quy tắc' })).toBeDisabled();
    await maxReminders.fill('2');
    await expect(page.getByRole('alert').filter({ hasText: 'Số lần nhắc tối đa' })).toHaveCount(0);
    const policyRequestWait = page.waitForRequest(request => request.method() === 'PUT' && new URL(request.url()).pathname.endsWith('/notification-policy'));
    const policyResponseWait = page.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname.endsWith('/notification-policy'));
    await page.getByRole('button', { name: 'Lưu quy tắc' }).click();
    const policyRequest = await policyRequestWait;
    expect(policyRequest.postDataJSON()).toMatchObject({ maxReminders: 2, remindAfterMinutes: null, fallbackChannel: 'none' });
    expect((await policyResponseWait).status()).toBe(200);

    await gotoDemo(page, '/s/shop-demo/notifications');
    await expect(page.getByText('Có ghi nhận mở thông báo; chưa nhận việc.', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Đã nhận việc lúc/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' })).toHaveCount(0);
    await expect(page.getByText('Đã gửi', { exact: true })).toHaveCount(0);
});

test('FE019.A03 notification order link stays within the active shop scope', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/notifications');
    const orderLink = page.getByRole('link', { name: 'Xem đơn', exact: true });
    await expect(orderLink).toHaveAttribute('href', '/s/shop-demo/orders/DH-DEMO-PAID-01');
    await orderLink.click();
    await expect(page).toHaveURL(/\/s\/shop-demo\/orders\/DH-DEMO-PAID-01$/);
    await expect(page.getByRole('heading', { name: 'Đơn DH-DEMO-PAID-01', exact: true })).toBeVisible();
});

test('FE019.A05 reminder policy saves shop-local schedule and quiet hours through the synthetic API', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/notifications/devices');
    await expect(page.getByText('Theo múi giờ Asia/Vientiane', { exact: true })).toBeVisible();
    await page.getByLabel('Bật quy tắc thông báo').check();
    await page.getByLabel('Nhắc sau (phút), để trống nếu chưa chốt').fill('30');
    await page.getByLabel('Số lần nhắc tối đa').fill('3');
    await page.getByLabel('Có giờ yên lặng').check();
    await page.getByLabel('Từ').fill('21:00');
    await page.getByLabel('Đến').fill('08:00');

    const requestWait = page.waitForRequest(request => request.method() === 'PUT' && new URL(request.url()).pathname.endsWith('/notification-policy'));
    const responseWait = page.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname.endsWith('/notification-policy'));
    await page.getByRole('button', { name: 'Lưu quy tắc', exact: true }).click();
    const request = await requestWait;
    const response = await responseWait;
    expect(response.status()).toBe(200);
    expect(request.postDataJSON()).toMatchObject({
        enabled: true,
        timezone: 'Asia/Vientiane',
        remindAfterMinutes: 30,
        maxReminders: 3,
        quietHours: { start: '21:00', end: '08:00' },
        fallbackChannel: 'none',
    });
    await expect(page.getByText('Theo múi giờ Asia/Vientiane', { exact: true })).toBeVisible();
});

test('FE027.A02/A07 preparation notification keeps order evidence and separates queued, opened, and acknowledged states', async ({ page }) => {
    const listWait = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.includes('/api/v2/') && new URL(response.url()).pathname.endsWith('/notifications'));
    await gotoDemo(page, '/s/shop-demo/notifications');
    const response = await listWait;
    expect(response.status()).toBe(200);
    type Notice = { id: string; title: string; safeBody: string; deliveryStatus: string; openedAt: string | null; acknowledgedAt: string | null; workItemId: string | null; source: { type: string; id: string } };
    const payload = (await response.json()).data as Notice[] | { data?: Notice[]; items?: Notice[] };
    const notices = Array.isArray(payload) ? payload : payload.data || payload.items || [];
    const notice = notices.find(item => item.source.type === 'order' && item.source.id === 'DH-DEMO-PAID-01');
    expect(notice).toMatchObject({
        title: 'Đơn DH-DEMO-PAID-01 cần chuẩn bị',
        deliveryStatus: 'queued',
        openedAt: expect.any(String),
        acknowledgedAt: expect.any(String),
        source: { type: 'order', id: 'DH-DEMO-PAID-01' },
    });
    expect(notice?.workItemId).toBeTruthy();
    await expect(page.getByText(notice!.title, { exact: true })).toBeVisible();
    await expect(page.getByText(notice!.safeBody, { exact: true })).toBeVisible();
    await expect(page.getByText('Đang chờ', { exact: true })).toBeVisible();
    await expect(page.getByText(/Đã nhận việc lúc/)).toBeVisible();
    await expect(page.getByText('Đã gửi', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Xem đơn', exact: true })).toHaveAttribute('href', '/s/shop-demo/orders/DH-DEMO-PAID-01');
});

test('FE027.A08 notification settings disclose server-only deduplication and callback safeguards', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', request => {
        if (request.method() !== 'GET' && new URL(request.url()).pathname.startsWith('/api/v2/')) writes.push(request.method());
    });
    await gotoDemo(page, '/s/shop-demo/notifications/devices');
    const note = page.getByTestId('notification-protection-note');
    await expect(note).toContainText('Chống gửi lặp theo sự kiện');
    await expect(note).toContainText('thời hạn token và giới hạn tốc độ');
    await expect(note).toContainText('không xác minh các lớp bảo vệ phía máy chủ');
    expect(writes).toEqual([]);
});
