import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { openDemoControls } from '../session/demo-controls';
import { startDemoServer } from '../session/demo-server.mjs';

type Role = 'owner' | 'manager' | 'sales' | 'warehouse' | 'accountant' | 'bot_admin';
type RouteManifest = { routes: Array<{ id: string; path: string; actions: Array<{ operationId: string; permission: string | null }> }> };
type PermissionCatalog = { rolePresets: Record<string, string[]> };
type OperationIndex = Record<string, { method: string; responseSchema: string }>;
const routes = JSON.parse(readFileSync(new URL('../../../botsales-kit/contracts/route-manifest.json', import.meta.url), 'utf8')) as RouteManifest;
const permissions = JSON.parse(readFileSync(new URL('../../../botsales-kit/contracts/permission-catalog.json', import.meta.url), 'utf8')) as PermissionCatalog;
const operations = JSON.parse(readFileSync(new URL('../../packages/contracts/src/operations.json', import.meta.url), 'utf8')) as OperationIndex;
let demoUrl = '';
let stopDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer({ cacheIsolationKey: 'uic07-command-unknown-master-actions' });
    demoUrl = server.url;
    stopDemo = server.close;
});

test.afterAll(async () => stopDemo?.());

function assertPermittedCommand(role: Role, routeId: string, operation: string) {
    const route = routes.routes.find(item => item.id === routeId);
    const action = route?.actions.find(item => item.operationId === operation);
    expect(route?.path, `${routeId} should be present in the canonical route manifest`).toBeTruthy();
    expect(action, `${operation} should be a declared route action`).toBeTruthy();
    expect(operations[operation]?.responseSchema, `${operation} should return a command result`).toBe('CommandResponse');
    expect(!action?.permission || permissions.rolePresets[role]?.includes(action.permission), `${role} should be granted ${operation}`).toBe(true);
}

async function chooseMockOption(page: import('@playwright/test').Page, label: string, value: string) {
    if (label === 'Vai trò mô phỏng' && value === 'owner') return;
    if (label === 'Vai trò mô phỏng' || label === 'Trạng thái thử') await openDemoControls(page);
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
    const message = label === 'Vai trò mô phỏng' ? 'Vai trò mô phỏng đã được áp dụng.' : 'Trạng thái thử đã được áp dụng.';
    await expect(page.getByRole('status').filter({ hasText: message })).toBeVisible();
}

async function chooseDemoDataset(page: import('@playwright/test').Page, value: string) {
    await openDemoControls(page);
    await page.getByRole('combobox', { name: 'Dataset mô phỏng' }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: /^Đã (tải|khôi phục)/ })).toBeVisible();
}

async function restartCommandDemoServer() {
    await stopDemo?.();
    const server = await startDemoServer({ cacheIsolationKey: `uic07-command-unknown-${randomUUID()}` });
    demoUrl = server.url;
    stopDemo = server.close;
}

async function navigateInApp(page: import('@playwright/test').Page, pathname: string) {
    await page.evaluate(nextPath => {
        window.history.pushState({}, '', nextPath);
        window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
    }, pathname);
    await expect.poll(() => new URL(page.url()).pathname).toBe(pathname);
    await expect(page.locator('#main-content h1').first()).toBeVisible();
}

async function createFixture(page: import('@playwright/test').Page, path: string, body: unknown) {
    // Wait for the app and mock service worker to finish booting before setup API calls.
    await page.locator('#main-content h1').first().waitFor({ state: 'visible' });
    return page.evaluate(async ({ path, body }) => {
        const session = (await (await fetch('/api/v2/session')).json()).data;
        const response = await fetch(`/api/v2/shops/shop-demo/${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': session.csrfToken,
                'Idempotency-Key': crypto.randomUUID(),
            },
            body: JSON.stringify(body),
        });
        const payload = await response.json();
        if (response.status !== 201) throw new Error(`Fixture POST ${path} returned HTTP ${response.status}: ${JSON.stringify(payload)}`);
        return payload.data as { id: string; version: number };
    }, { path, body });
}

async function createFinanceEntryDraft(page: import('@playwright/test').Page, description: string) {
    await page.getByRole('button', { name: 'Tạo phiếu', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Phiếu thu chi mới' });
    await editor.getByLabel(/Số tiền/).fill('25000');
    await editor.getByLabel('Thời điểm ISO 8601').fill('2026-09-15T12:00:00.000Z');
    await editor.getByLabel('Diễn giải').fill(description);
    const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
        && new URL(candidate.url()).pathname.endsWith('/finance/entries'));
    await editor.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
    const created = await response;
    expect(created.status()).toBe(201);
    return (await created.json()).data.id as string;
}

async function confirmSeedOrder(page: import('@playwright/test').Page) {
    await page.goto(new URL('/s/shop-demo/orders/DH-1001', demoUrl).toString());
    await expect(page.getByRole('heading', { name: 'Đơn DH-1001', exact: true })).toBeVisible();
    const quote = page.waitForResponse(candidate => candidate.request().method() === 'POST'
        && new URL(candidate.url()).pathname.endsWith('/orders/DH-1001/quote'));
    await page.getByRole('button', { name: 'Lấy báo giá hiện tại', exact: true }).click();
    expect((await quote).status()).toBe(200);
    const confirmation = page.waitForResponse(candidate => candidate.request().method() === 'POST'
        && new URL(candidate.url()).pathname.endsWith('/customer-confirmations'));
    await page.getByRole('button', { name: 'Mô phỏng khách đồng ý báo giá', exact: true }).click();
    expect((await confirmation).status()).toBe(200);
    const confirm = page.waitForResponse(candidate => candidate.request().method() === 'POST'
        && new URL(candidate.url()).pathname.endsWith('/orders/DH-1001/confirm'));
    await page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng', exact: true }).click();
    expect((await confirm).status()).toBe(202);
    await expect(page.getByRole('link', { name: 'Chuẩn bị đơn' })).toBeVisible();
}

async function createSeedShipmentFromOrder(page: import('@playwright/test').Page, fulfillmentRole: Role = 'owner') {
    await restartCommandDemoServer();
    await page.goto(new URL('/s/shop-demo/orders', demoUrl).toString());
    await expect(page.locator('#main-content h1').first()).toBeVisible();
    await confirmSeedOrder(page);
    if (fulfillmentRole !== 'owner') await chooseMockOption(page, 'Vai trò mô phỏng', fulfillmentRole);
    await page.getByRole('link', { name: 'Chuẩn bị đơn' }).click();
    const prepRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
    await expect(prepRow).toBeVisible();
    await prepRow.getByRole('button', { name: 'Mở phiếu lấy hàng' }).click();
    const prep = page.getByRole('dialog', { name: 'Phiếu chuẩn bị DH-1001' });
    const refreshedPrep = page.waitForResponse(candidate => candidate.request().method() === 'GET'
        && /\/prep-jobs\/[^/]+$/.test(new URL(candidate.url()).pathname));
    const refreshedWorkItem = page.waitForResponse(candidate => candidate.request().method() === 'GET'
        && /\/work-items\/[^/]+$/.test(new URL(candidate.url()).pathname));
    const claim = page.waitForResponse(candidate => candidate.request().method() === 'POST'
        && new URL(candidate.url()).pathname.endsWith('/claim'));
    await prep.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' }).click();
    expect((await claim).status()).toBe(200);
    await Promise.all([refreshedPrep, refreshedWorkItem]);
    const scannedSku = prep.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' });
    const pickedQuantity = prep.getByRole('spinbutton', { name: 'Số lượng đã lấy' });
    await expect(scannedSku).toBeEnabled();
    await scannedSku.fill('AO-002');
    await expect(scannedSku).toHaveValue('AO-002');
    await pickedQuantity.fill('1');
    await expect(pickedQuantity).toHaveValue('1');
    const confirmPick = prep.getByRole('button', { name: 'Xác nhận dòng đã kiểm' });
    await expect(confirmPick).toBeEnabled();
    const pick = page.waitForResponse(candidate => candidate.request().method() === 'POST'
        && new URL(candidate.url()).pathname.endsWith('/pick'));
    await confirmPick.click();
    expect((await pick).status()).toBe(200);
    await prep.getByRole('button', { name: 'Xác nhận đã đóng gói' }).click();
    const packDialog = page.getByRole('dialog', { name: 'Hoàn tất đóng gói' });
    const pack = page.waitForResponse(candidate => candidate.request().method() === 'POST'
        && new URL(candidate.url()).pathname.endsWith('/pack'));
    await packDialog.getByRole('button', { name: 'Xác nhận đã đóng gói', exact: true }).click();
    expect((await pack).status()).toBe(200);
    await prep.getByRole('link', { name: 'Tạo vận đơn để bàn giao' }).click();
    await page.getByRole('button', { name: 'Tạo vận đơn', exact: true }).click();
    const createDialog = page.getByRole('dialog', { name: 'Tạo vận đơn' });
    const created = page.waitForResponse(candidate => candidate.request().method() === 'POST'
        && new URL(candidate.url()).pathname.endsWith('/shipments'));
    await createDialog.getByRole('button', { name: 'Tạo bản vận chuyển', exact: true }).click();
    const response = await created;
    expect(response.status()).toBe(201);
    return (await response.json()).data.id as string;
}

async function createJournalDraft(page: import('@playwright/test').Page, sourceId: string) {
    await page.getByRole('button', { name: 'Tạo bút toán nháp', exact: true }).click();
    const draft = page.getByRole('dialog', { name: 'Bút toán nháp' });
    await draft.getByRole('textbox', { name: 'Ngày hiệu lực' }).fill('2026-09-29');
    await draft.getByRole('textbox', { name: 'Mã chứng từ nguồn' }).fill(sourceId);
    await draft.getByRole('textbox', { name: 'Loại chứng từ nguồn' }).fill('manual');
    await draft.getByRole('combobox', { name: 'Tài khoản dòng 1' }).click();
    await page.getByRole('option', { name: '111 · Tiền mặt', exact: true }).click();
    await draft.getByRole('combobox', { name: 'Tài khoản dòng 2' }).click();
    await page.getByRole('option', { name: '711 · Thu nhập khác', exact: true }).click();
    await draft.getByRole('textbox', { name: 'Nợ' }).nth(0).fill('100');
    await draft.getByRole('textbox', { name: 'Có' }).nth(1).fill('100');
    await draft.getByRole('textbox', { name: 'Diễn giải dòng' }).nth(0).fill('Thu tổng hợp UIC07');
    await draft.getByRole('textbox', { name: 'Diễn giải dòng' }).nth(1).fill('Doanh thu tổng hợp UIC07');
    await draft.getByRole('textbox', { name: 'Lý do' }).fill('Kiểm chứng trạng thái command unknown.');
    const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
        && new URL(candidate.url()).pathname.endsWith('/journals'));
    await draft.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
    const created = await response;
    expect(created.status()).toBe(201);
    return (await created.json()).data.id as string;
}

async function createGoodsReceiptDraft(page: import('@playwright/test').Page, sourceDocumentRef: string) {
    await page.goto(new URL('/s/shop-demo/receipts', demoUrl).toString());
    await expect(page.locator('#main-content h1').first()).toBeVisible();
    await page.getByRole('button', { name: 'Tạo phiếu nhận', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Phiếu nhận hàng mới' });
    await dialog.getByRole('combobox', { name: 'Đơn mua đã xác nhận' }).click();
    await page.getByRole('option', { name: 'seed-purchaseorder-10046', exact: true }).click();
    await expect(dialog.getByText('Đặt 10 · đã nhận 4 · bị từ chối 0 · còn 6')).toBeVisible();
    await dialog.getByRole('spinbutton', { name: 'Nhận đạt mã biến thể v-p6' }).fill('1');
    await dialog.getByRole('textbox', { name: 'Mã phiếu giao / chứng từ nguồn' }).fill(sourceDocumentRef);
    const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
        && new URL(candidate.url()).pathname.endsWith('/goods-receipts'));
    await dialog.getByRole('button', { name: 'Tạo phiếu nháp', exact: true }).click();
    const created = await response;
    expect(created.status()).toBe(201);
    return (await created.json()).data.id as string;
}

async function createOpeningBalanceDraft(page: import('@playwright/test').Page, reason: string) {
    await page.getByRole('button', { name: 'Tạo nháp mở sổ', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nháp mở sổ mới' });
    await dialog.getByLabel('Ngày mở sổ').fill('2026-09-15');
    await dialog.getByLabel('Lý do mở sổ').fill(reason);
    const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
        && new URL(candidate.url()).pathname.endsWith('/finance/opening-balances'));
    await dialog.getByRole('button', { name: 'Lưu nháp mở sổ', exact: true }).click();
    const created = await response;
    expect(created.status()).toBe(201);
    return (await created.json()).data.id as string;
}

async function createBankReconciliationCase(page: import('@playwright/test').Page, batch: string) {
    await page.getByRole('button', { name: 'Nhập bảng đối soát', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nhập bảng đối soát' });
    const transactionId = `UIC07-${batch}`;
    const csv = [
        'externalTransactionId,amount,currency,direction,occurredAt,referenceText',
        `${transactionId},100000,VND,credit,2026-09-29T13:30:00Z,UIC07 bank match`,
    ].join('\n');
    await dialog.locator('input[type="file"]').setInputFiles({ name: `${batch}.csv`, mimeType: 'text/csv', buffer: Buffer.from(csv, 'utf8') });
    await dialog.getByRole('combobox', { name: 'Tài khoản / đơn vị vận chuyển' }).click();
    await page.getByRole('option', { name: '112 · Tiền ngân hàng', exact: true }).click();
    await dialog.getByRole('textbox', { name: 'Mã đợt nhập duy nhất' }).fill(batch);
    const preview = page.waitForResponse(candidate => candidate.request().method() === 'POST'
        && new URL(candidate.url()).pathname.endsWith('/finance/statement-import-preview'));
    await dialog.getByRole('button', { name: 'Xem trước bảng đối soát', exact: true }).click();
    expect((await preview).status()).toBe(200);
    const imported = page.waitForResponse(candidate => candidate.request().method() === 'POST'
        && new URL(candidate.url()).pathname.endsWith('/bank-transactions/import'));
    await dialog.getByRole('button', { name: 'Nhập các dòng hợp lệ', exact: true }).click();
    expect((await imported).status()).toBe(200);
    await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    return transactionId;
}

async function expectUnknownCommand(page: import('@playwright/test').Page, role: Role, routeId: string, operation: string, responsePromise: Promise<import('@playwright/test').Response>) {
    const response = await responsePromise;
    expect(response.status()).toBe(202);
    expect((await response.json()).data.status).toBe('unknown');
    await expect(page.getByRole('alert').filter({ hasText: 'Chưa xác minh được kết quả' })).toBeVisible();
    await expect(page.getByText(/Có 1 thao tác chưa xác minh kết quả/)).toBeVisible();
    expect(await page.getByRole('status').filter({ hasText: /Đã ngừng dùng địa chỉ|Đã ngừng bán|Điều chỉnh đã được xác nhận/ }).count()).toBe(0);
    console.log(`BROWSER=${test.info().project.name} ROLE_STATE=command_unknown ROLE=${role} ROUTE=${routeId} OPERATION=${operation} RESULT=PASS`);
}

test.describe('UIC07 real UI command result for additional route-role pairs', () => {
    for (const role of ['owner', 'manager', 'sales'] as const) {
        test(`R08 archiveCustomerAddress remains unknown for ${role}`, async ({ page }) => {
            assertPermittedCommand(role, 'R08', 'archiveCustomerAddress');
            await page.goto(new URL('/s/shop-demo/notifications', demoUrl).toString());
            const customer = await createFixture(page, 'customers', {
                displayName: `UIC07 ${role} ${randomUUID().slice(0, 8)}`, phone: null, email: null, notes: '',
            });
            const label = `UIC07 ${role} ${randomUUID().slice(0, 8)}`;
            const address = await createFixture(page, `customers/${customer.id}/addresses`, {
                label, recipient: 'Người nhận kiểm chứng', phone: '0000000000', line1: 'Địa chỉ tổng hợp',
                ward: null, district: null, province: 'Địa bàn kiểm chứng', postalCode: null, countryCode: 'VN',
            });
            await chooseMockOption(page, 'Vai trò mô phỏng', role);
            await navigateInApp(page, `/s/shop-demo/customers/${customer.id}`);
            const row = page.getByRole('table', { name: 'Địa chỉ trong hồ sơ khách' }).getByRole('row').filter({ hasText: label });
            await expect(row).toBeVisible();
            await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
            await row.getByRole('button', { name: new RegExp(`Ngừng dùng ${label}`) }).click();
            const dialog = page.getByRole('dialog', { name: 'Ngừng dùng địa chỉ' });
            await dialog.getByLabel('Lý do').fill(`UIC07 unknown ${role}`);
            const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && new URL(candidate.url()).pathname.endsWith(`/customers/${customer.id}/addresses/${address.id}/archive`));
            await dialog.getByRole('button', { name: 'Ngừng dùng địa chỉ', exact: true }).click();
            await expectUnknownCommand(page, role, 'R08', 'archiveCustomerAddress', response);
        });
    }

    for (const role of ['owner', 'manager'] as const) {
        test(`R11 archiveProduct remains unknown for ${role}`, async ({ page }) => {
            assertPermittedCommand(role, 'R11', 'archiveProduct');
            await page.goto(new URL('/s/shop-demo/notifications', demoUrl).toString());
            const sku = `UIC07-${role}-${randomUUID().slice(0, 8)}`;
            const product = await createFixture(page, 'products', {
                name: `Sản phẩm kiểm chứng ${sku}`, description: '', categoryId: null, status: 'active',
                variants: [{ sku, name: 'Phiên bản kiểm chứng', options: {}, price: { amount: '10000', currency: 'VND' }, active: true }],
                imageFileIds: [],
            });
            await chooseMockOption(page, 'Vai trò mô phỏng', role);
            await navigateInApp(page, `/s/shop-demo/products/${product.id}`);
            const archiveButton = page.getByRole('button', { name: 'Ngừng bán', exact: true });
            await expect(archiveButton).toBeVisible();
            await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
            await archiveButton.click();
            const dialog = page.getByRole('dialog', { name: 'Ngừng bán sản phẩm' });
            await dialog.getByLabel('Lý do').fill(`UIC07 unknown ${role}`);
            const suffix = `/products/${product.id}/archive`;
            const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && new URL(candidate.url()).pathname.endsWith(suffix));
            await dialog.getByRole('button', { name: 'Ngừng bán sản phẩm', exact: true }).click();
            await expectUnknownCommand(page, role, 'R11', 'archiveProduct', response);
        });

        test(`R12 archiveCategory remains unknown for ${role}`, async ({ page }) => {
            assertPermittedCommand(role, 'R12', 'archiveCategory');
            await page.goto(new URL('/s/shop-demo/notifications', demoUrl).toString());
            const name = `UIC07 ${role} ${randomUUID().slice(0, 8)}`;
            const category = await createFixture(page, 'categories', { name, parentId: null });
            await chooseMockOption(page, 'Vai trò mô phỏng', role);
            await navigateInApp(page, '/s/shop-demo/categories');
            const row = page.getByRole('table', { name: 'Danh sách danh mục' }).getByRole('row').filter({ hasText: name });
            await expect(row).toBeVisible();
            await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
            await row.getByRole('button', { name: 'Ngừng dùng', exact: true }).click();
            const dialog = page.getByRole('dialog', { name: 'Ngừng dùng danh mục' });
            await dialog.getByLabel('Lý do').fill(`UIC07 unknown ${role}`);
            const suffix = `/categories/${category.id}/archive`;
            const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && new URL(candidate.url()).pathname.endsWith(suffix));
            await dialog.getByRole('button', { name: 'Ngừng dùng danh mục', exact: true }).click();
            await expectUnknownCommand(page, role, 'R12', 'archiveCategory', response);
        });
    }

    for (const role of ['manager', 'warehouse'] as const) {
        test(`R15 createInventoryAdjustment remains unknown for ${role}`, async ({ page }) => {
            assertPermittedCommand(role, 'R15', 'createInventoryAdjustment');
            await page.goto(new URL('/s/shop-demo/inventory', demoUrl).toString());
            await chooseMockOption(page, 'Vai trò mô phỏng', role);
            const row = page.getByRole('row').filter({ hasText: 'DEMO-001' }).first();
            await expect(row.getByRole('button', { name: 'Điều chỉnh', exact: true })).toBeEnabled();
            await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
            await row.getByRole('button', { name: 'Điều chỉnh', exact: true }).click();
            const dialog = page.getByRole('dialog', { name: 'Điều chỉnh DEMO-001' });
            await dialog.getByLabel('Thay đổi số lượng').fill('1');
            await dialog.getByLabel('Lý do điều chỉnh').fill(`UIC07 unknown ${role}`);
            const suffix = '/inventory/adjustments';
            const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && new URL(candidate.url()).pathname.endsWith(suffix));
            await dialog.getByRole('button', { name: 'Xác nhận điều chỉnh', exact: true }).click();
            await expectUnknownCommand(page, role, 'R15', 'createInventoryAdjustment', response);
        });
    }

    for (const role of ['manager', 'sales'] as const) {
        test(`R06 sendMessage remains unknown for ${role}`, async ({ page }) => {
            assertPermittedCommand(role, 'R06', 'sendMessage');
            await page.goto(new URL('/s/shop-demo/inbox/cv2', demoUrl).toString());
            await expect(page.locator('#main-content h1').first()).toBeVisible();
            await chooseMockOption(page, 'Vai trò mô phỏng', role);
            await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
            const reply = `UIC07 unknown ${role} ${randomUUID().slice(0, 8)}`;
            await page.getByRole('textbox', { name: 'Nội dung trả lời khách' }).fill(reply);
            const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && new URL(candidate.url()).pathname.endsWith('/messages'));
            await page.getByRole('button', { name: 'Gửi trả lời', exact: true }).click();
            await expectUnknownCommand(page, role, 'R06', 'sendMessage', response);
            await expect(page.getByRole('textbox', { name: 'Nội dung trả lời khách' })).toHaveValue(reply);
        });
    }

    for (const role of ['manager', 'sales'] as const) {
        test(`R19 confirmOrder remains unknown for ${role}`, async ({ page }) => {
            assertPermittedCommand(role, 'R19', 'confirmOrder');
            await page.goto(new URL('/s/shop-demo/orders/DH-1001', demoUrl).toString());
            await expect(page.locator('#main-content h1').first()).toBeVisible();
            await chooseMockOption(page, 'Vai trò mô phỏng', role);
            const quoteResponse = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && new URL(candidate.url()).pathname.endsWith('/orders/DH-1001/quote'));
            await page.getByRole('button', { name: 'Lấy báo giá hiện tại' }).click();
            expect((await quoteResponse).status()).toBe(200);
            const confirmationResponse = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && new URL(candidate.url()).pathname.endsWith('/customer-confirmations'));
            await page.getByRole('button', { name: 'Mô phỏng khách đồng ý báo giá' }).click();
            expect((await confirmationResponse).status()).toBe(200);
            await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
            const confirm = page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng', exact: true });
            await expect(confirm).toBeEnabled();
            const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && new URL(candidate.url()).pathname.endsWith('/orders/DH-1001/confirm'));
            await confirm.click();
            await expectUnknownCommand(page, role, 'R19', 'confirmOrder', response);
            await expect(page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng', exact: true })).toHaveCount(0);
        });
    }

    test('R04 pauseBot remains unknown for owner', async ({ page }) => {
        assertPermittedCommand('owner', 'R04', 'pauseBot');
        // The canonical seed starts the bot paused, so publish the unchanged synthetic draft first
        // through the real UI. This makes the R04 pause action available without mutating fixtures.
        await page.goto(new URL('/s/shop-demo/bot/evaluations', demoUrl).toString());
        await expect(page.locator('#main-content h1').first()).toBeVisible();
        await expect(page.getByRole('alert').filter({ hasText: 'không đánh giá chất lượng mô hình AI thật' })).toBeVisible();
        await page.getByRole('button', { name: 'Chạy đánh giá' }).click();
        const evaluationDialog = page.getByRole('dialog', { name: 'Đánh giá cấu hình nháp' });
        await evaluationDialog.getByLabel('Phiên bản bộ kiểm thử đã đăng ký').fill('uic07-synthetic-pause-fixture');
        const evaluationResponse = page.waitForResponse(candidate => candidate.request().method() === 'POST'
            && new URL(candidate.url()).pathname.endsWith('/bot/evaluations'));
        await evaluationDialog.getByRole('button', { name: 'Bắt đầu' }).click();
        const evaluation = await evaluationResponse;
        expect(evaluation.status()).toBe(202);
        const evaluationId = (await evaluation.json()).data.id as string;
        await page.getByRole('dialog', { name: 'Chi tiết đánh giá' }).getByRole('button', { name: 'Đóng' }).last().click();
        await navigateInApp(page, '/s/shop-demo/bot');
        await page.getByRole('button', { name: 'Duyệt & xuất bản' }).click();
        const publishDialog = page.getByRole('dialog', { name: 'Xuất bản cấu hình đã đánh giá' });
        await publishDialog.getByLabel('Mã lần đánh giá đúng bản nháp').fill(evaluationId);
        await publishDialog.getByLabel('Lý do').fill('Kích hoạt fixture mô phỏng để kiểm chứng R04');
        const publishResponse = page.waitForResponse(candidate => candidate.request().method() === 'POST'
            && new URL(candidate.url()).pathname.endsWith('/bot/config/publish'));
        await publishDialog.getByRole('button', { name: 'Xuất bản' }).click();
        expect((await publishResponse).status()).toBe(202);
        await expect.poll(async () => page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/bot/config')).json()).data.status)).toBe('active');
        await navigateInApp(page, '/s/shop-demo/overview');
        await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
        await page.getByRole('button', { name: 'Tạm dừng bot', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Tạm dừng trợ lý bán hàng' });
        await dialog.getByLabel('Lý do').fill('UIC07 đối chiếu kết quả tạm dừng');
        const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
            && new URL(candidate.url()).pathname.endsWith('/bot/pause'));
        await dialog.getByRole('button', { name: 'Tạm dừng trợ lý', exact: true }).click();
        await expectUnknownCommand(page, 'owner', 'R04', 'pauseBot', response);
    });

    test('R52 controlAutomation remains unknown for owner', async ({ page }) => {
        test.setTimeout(30_000);
        assertPermittedCommand('owner', 'R52', 'controlAutomation');
        await page.goto(new URL('/s/shop-demo/operations/digests', demoUrl).toString());
        await expect(page.locator('#main-content h1').first()).toBeVisible();
        await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
        await page.getByRole('button', { name: 'Kiểm tra điều kiện tiếp tục', exact: true }).first().click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toContainText('Kiểm tra điều kiện tiếp tục');
        await dialog.getByLabel('Lý do (ít nhất 5 ký tự)').fill('UIC07 kiểm tra lệnh tiếp tục');
        const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
            && new URL(candidate.url()).pathname.endsWith('/automation-control'));
        await dialog.getByRole('button', { name: 'Kiểm tra để tiếp tục', exact: true }).click();
        await expectUnknownCommand(page, 'owner', 'R52', 'controlAutomation', response);
    });

    for (const role of ['owner', 'manager'] as const) {
        test(`R40 testDevice remains unknown for ${role}`, async ({ page }) => {
            assertPermittedCommand(role, 'R40', 'testDevice');
            await page.goto(new URL('/s/shop-demo/notifications', demoUrl).toString());
            const device = await createFixture(page, 'devices', {
                deviceName: `UIC07 ${role} ${randomUUID().slice(0, 8)}`,
                endpoint: `https://example.test/uic07/${randomUUID()}`,
                p256dh: 'synthetic-device-public-key', auth: 'synthetic-device-auth',
            });
            await navigateInApp(page, '/s/shop-demo/notifications/devices');
            await chooseMockOption(page, 'Vai trò mô phỏng', role);
            const row = page.getByRole('table', { name: 'Thiết bị nhận thông báo' }).getByRole('row').filter({ hasText: `UIC07 ${role}` });
            await expect(row).toBeVisible();
            await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
            const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && new URL(candidate.url()).pathname.endsWith(`/devices/${device.id}/test`));
            await row.getByRole('button', { name: 'Kiểm tra mô phỏng', exact: true }).click();
            await expectUnknownCommand(page, role, 'R40', 'testDevice', response);
            await expect(page.getByRole('alert').filter({ hasText: 'thiết bị vẫn chờ xác minh' })).toHaveCount(0);
        });
    }

    test('R19 payOrder remains unknown for accountant after a real order confirmation flow', async ({ page }) => {
        assertPermittedCommand('accountant', 'R19', 'payOrder');
        await confirmSeedOrder(page);
        await chooseMockOption(page, 'Vai trò mô phỏng', 'accountant');
        await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
        await page.getByRole('button', { name: 'Ghi nhận tiền đã thu', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Ghi nhận tiền đã thu' });
        await dialog.getByLabel('Mã tham chiếu giao dịch').fill(`UIC07-PAY-${randomUUID().slice(0, 8)}`);
        await dialog.getByLabel('Mã chứng từ đã xác minh').fill(`UIC07-EVIDENCE-${randomUUID().slice(0, 8)}`);
        await dialog.getByLabel('Lý do').fill('Kiểm chứng kết quả thanh toán trong dữ liệu mô phỏng.');
        const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
            && new URL(candidate.url()).pathname.endsWith('/orders/DH-1001/pay'));
        await dialog.getByRole('button', { name: 'Ghi nhận chứng từ', exact: true }).click();
        await expectUnknownCommand(page, 'accountant', 'R19', 'payOrder', response);
        await expect(dialog).toBeVisible();
    });

    test('R19 handoverShipment remains unknown for warehouse from the order fulfillment journey', async ({ page }) => {
        assertPermittedCommand('warehouse', 'R19', 'handoverShipment');
        const shipmentId = await createSeedShipmentFromOrder(page);
        await chooseMockOption(page, 'Vai trò mô phỏng', 'warehouse');
        await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
        const row = page.getByRole('row').filter({ hasText: 'DH-1001' });
        await expect(row).toBeVisible();
        await row.getByRole('button', { name: 'Bàn giao', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Xác nhận bàn giao kiện hàng' });
        const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
            && new URL(candidate.url()).pathname.endsWith(`/shipments/${shipmentId}/handover`));
        await dialog.getByRole('button', { name: 'Xác nhận bàn giao', exact: true }).click();
        await expectUnknownCommand(page, 'warehouse', 'R19', 'handoverShipment', response);
        await expect(dialog).toBeVisible();
    });

    for (const role of ['manager', 'warehouse'] as const) {
        test(`R42 handoverShipment remains unknown for ${role}`, async ({ page }) => {
            assertPermittedCommand(role, 'R42', 'handoverShipment');
            const shipmentId = await createSeedShipmentFromOrder(page, 'manager');
            if (role === 'warehouse') await chooseMockOption(page, 'Vai trò mô phỏng', 'warehouse');
            await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
            const row = page.getByRole('row').filter({ hasText: 'DH-1001' });
            await expect(row).toBeVisible();
            await row.getByRole('button', { name: 'Bàn giao', exact: true }).click();
            const dialog = page.getByRole('dialog', { name: 'Xác nhận bàn giao kiện hàng' });
            const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && new URL(candidate.url()).pathname.endsWith(`/shipments/${shipmentId}/handover`));
            await dialog.getByRole('button', { name: 'Xác nhận bàn giao', exact: true }).click();
            await expectUnknownCommand(page, role, 'R42', 'handoverShipment', response);
            await expect(dialog).toBeVisible();
        });
    }

    for (const role of ['owner', 'bot_admin'] as const) {
        test(`R26 pauseBot remains unknown for ${role}`, async ({ page }) => {
            assertPermittedCommand(role, 'R26', 'pauseBot');
            await page.goto(new URL('/s/shop-demo/bot', demoUrl).toString());
            await expect(page.locator('#main-content h1').first()).toBeVisible();
            await chooseMockOption(page, 'Vai trò mô phỏng', role);
            await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
            await page.getByRole('button', { name: 'Tạm dừng bot', exact: true }).click();
            const dialog = page.getByRole('dialog', { name: 'Tạm dừng Admin AI' });
            await dialog.getByLabel('Lý do (ít nhất 5 ký tự)').fill(`UIC07 pauseBot ${role}`);
            const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && new URL(candidate.url()).pathname.endsWith('/bot/pause'));
            await dialog.getByRole('button', { name: 'Tạm dừng Admin AI', exact: true }).click();
            await expectUnknownCommand(page, role, 'R26', 'pauseBot', response);
            await expect(dialog).toBeVisible();
        });
    }

    for (const role of ['owner', 'accountant'] as const) {
        test(`R21 postFinanceEntry remains unknown for ${role}`, async ({ page }) => {
            test.setTimeout(30_000);
            assertPermittedCommand(role, 'R21', 'postFinanceEntry');
            await page.goto(new URL('/s/shop-demo/finance/entries', demoUrl).toString());
            await expect(page.locator('#main-content h1').first()).toBeVisible();
            await chooseMockOption(page, 'Vai trò mô phỏng', role);
            const description = `UIC07 postFinanceEntry ${role} ${randomUUID().slice(0, 8)}`;
            const entryId = await createFinanceEntryDraft(page, description);
            await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
            const row = page.getByRole('table', { name: 'Chứng từ thu chi' }).getByRole('row').filter({ hasText: entryId });
            await expect(row).toBeVisible();
            await row.getByRole('button', { name: 'Chi tiết', exact: true }).click();
            const detail = page.getByRole('dialog', { name: `Chứng từ ${entryId}` });
            await expect(detail.getByRole('button', { name: 'Ghi sổ', exact: true })).toBeVisible();
            await detail.getByRole('button', { name: 'Ghi sổ', exact: true }).click();
            const confirm = page.getByRole('dialog', { name: 'Ghi sổ phiếu đã kiểm' });
            await confirm.getByLabel('Lý do (ít nhất 5 ký tự)').fill('Kiểm chứng kết quả ghi sổ');
            const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && new URL(candidate.url()).pathname.endsWith(`/finance/entries/${entryId}/post`));
            await confirm.getByRole('button', { name: 'Ghi sổ phiếu', exact: true }).click();
            await expectUnknownCommand(page, role, 'R21', 'postFinanceEntry', response);
            await expect(confirm).toBeVisible();
            await expect(confirm.getByRole('alert').filter({ hasText: 'Chưa xác minh được kết quả' })).toBeVisible();
        });
    }

    for (const role of ['owner', 'bot_admin'] as const) {
        test(`R24 retireKnowledge remains unknown for ${role}`, async ({ page }) => {
            assertPermittedCommand(role, 'R24', 'retireKnowledge');
            await page.goto(new URL('/s/shop-demo/knowledge', demoUrl).toString());
            await expect(page.locator('#main-content h1').first()).toBeVisible();
            const knowledgeId = await page.evaluate(async () => {
                const response = await fetch('/api/v2/shops/shop-demo/knowledge');
                const payload = await response.json();
                return payload.data.find((item: { status: string }) => item.status === 'published')?.id as string | undefined;
            });
            expect(knowledgeId, 'the synthetic knowledge list must contain a published item').toBeTruthy();
            await chooseMockOption(page, 'Vai trò mô phỏng', role);
            await navigateInApp(page, `/s/shop-demo/knowledge/${knowledgeId}`);
            const retire = page.getByRole('button', { name: 'Ngừng sử dụng', exact: true });
            await expect(retire).toBeEnabled();
            await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
            await retire.click();
            const dialog = page.getByRole('dialog', { name: 'Ngừng sử dụng kiến thức' });
            await dialog.getByLabel('Lý do').fill(`UIC07 knowledge ${role}`);
            const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && new URL(candidate.url()).pathname.endsWith(`/knowledge/${knowledgeId}/retire`));
            await dialog.getByRole('button', { name: 'Ngừng sử dụng nguồn', exact: true }).click();
            await expectUnknownCommand(page, role, 'R24', 'retireKnowledge', response);
            await expect(dialog).toBeVisible();
        });
    }

    test('R29 disconnectChannel remains unknown for owner', async ({ page }) => {
        assertPermittedCommand('owner', 'R29', 'disconnectChannel');
        await page.goto(new URL('/s/shop-demo/integrations/channels', demoUrl).toString());
        await expect(page.locator('#main-content h1').first()).toBeVisible();
        const disconnect = page.getByRole('button', { name: 'Ngắt kết nối', exact: true }).first();
        await expect(disconnect).toBeEnabled();
        await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
        await disconnect.click();
        const dialog = page.getByRole('dialog', { name: 'Ngắt kết nối Page' });
        await dialog.getByLabel('Lý do').fill('UIC07 xác minh trạng thái ngắt kết nối');
        const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
            && /\/channels\/[^/]+\/disconnect$/.test(new URL(candidate.url()).pathname));
        await dialog.getByRole('button', { name: 'Ngắt kết nối Page', exact: true }).click();
        await expectUnknownCommand(page, 'owner', 'R29', 'disconnectChannel', response);
        await expect(dialog).toBeVisible();
    });

    test('R35 approvePrivacyRequest stays unavailable until the frontend has the required step-up flow', async ({ page }) => {
        assertPermittedCommand('owner', 'R35', 'approvePrivacyRequest');
        await page.goto(new URL('/s/shop-demo/settings/privacy', demoUrl).toString());
        await expect(page.locator('#main-content h1').first()).toBeVisible();
        const requests = page.getByRole('table', { name: 'Yêu cầu quyền riêng tư' });
        await expect(requests).toBeVisible();
        await expect(requests.getByRole('button')).toHaveCount(0);
        await expect(page.getByRole('alert').filter({ hasText: 'Phê duyệt yêu cầu xóa cần xác thực nâng cao của backend' })).toBeVisible();
        console.log(`BROWSER=${test.info().project.name} ROLE_STATE_NA=command_unknown ROLE=owner ROUTE=R35 OPERATION=approvePrivacyRequest REASON=frontend-step-up-not-implemented RESULT=PASS`);
    });

    for (const role of ['owner', 'warehouse'] as const) {
        test(`R45 evaluateReorder remains unknown for ${role}`, async ({ page }) => {
            assertPermittedCommand(role, 'R45', 'evaluateReorder');
            await page.goto(new URL('/s/shop-demo/replenishment', demoUrl).toString());
            await expect(page.locator('#main-content h1').first()).toBeVisible();
            await chooseMockOption(page, 'Vai trò mô phỏng', role);
            const evaluate = page.getByRole('button', { name: 'Đánh giá nhu cầu nhập', exact: true });
            await expect(evaluate).toBeEnabled();
            await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
            const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && new URL(candidate.url()).pathname.endsWith('/purchase-suggestions/evaluate'));
            await evaluate.click();
            await expectUnknownCommand(page, role, 'R45', 'evaluateReorder', response);
        });
    }

    for (const role of ['owner', 'warehouse'] as const) {
        test(`R47 postGoodsReceipt remains unknown for ${role}`, async ({ page }) => {
            assertPermittedCommand(role, 'R47', 'postGoodsReceipt');
            const sourceDocumentRef = `UIC07-GR-${role}-${randomUUID().slice(0, 8)}`;
            const receiptId = await createGoodsReceiptDraft(page, sourceDocumentRef);
            await chooseMockOption(page, 'Vai trò mô phỏng', role);
            await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
            const row = page.getByRole('row').filter({ hasText: sourceDocumentRef });
            await expect(row).toBeVisible();
            await row.getByRole('button', { name: 'Xem / ghi nhận phiếu', exact: true }).click();
            const detail = page.getByRole('dialog', { name: `Phiếu nhận ${receiptId}` });
            await detail.getByRole('button', { name: 'Kiểm & ghi nhận vào kho', exact: true }).click();
            const confirm = page.getByRole('dialog', { name: 'Ghi nhận hàng đã kiểm vào kho' });
            const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && new URL(candidate.url()).pathname.endsWith(`/goods-receipts/${receiptId}/post`));
            await confirm.getByRole('button', { name: 'Ghi nhận vào kho', exact: true }).click();
            await expectUnknownCommand(page, role, 'R47', 'postGoodsReceipt', response);
            await expect(confirm).toBeVisible();
        });
    }

    test('R48 postJournal remains unknown for accountant', async ({ page }) => {
        assertPermittedCommand('accountant', 'R48', 'postJournal');
        await page.goto(new URL('/s/shop-demo/finance/journals', demoUrl).toString());
        await expect(page.locator('#main-content h1').first()).toBeVisible();
        await chooseMockOption(page, 'Vai trò mô phỏng', 'accountant');
        const sourceId = `UIC07-JOURNAL-${randomUUID().slice(0, 8)}`;
        const journalId = await createJournalDraft(page, sourceId);
        await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
        const row = page.getByRole('row').filter({ hasText: sourceId });
        await expect(row).toBeVisible();
        await row.getByRole('button', { name: 'Chi tiết', exact: true }).click();
        const detail = page.getByRole('dialog', { name: `Bút toán ${journalId}` });
        await detail.getByRole('button', { name: 'Ghi sổ', exact: true }).click();
        const confirm = page.getByRole('dialog', { name: 'Ghi sổ bút toán' });
        const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
            && new URL(candidate.url()).pathname.endsWith(`/journals/${journalId}/post`));
        await confirm.getByRole('button', { name: 'Ghi sổ bút toán', exact: true }).click();
        await expectUnknownCommand(page, 'accountant', 'R48', 'postJournal', response);
        await expect(confirm).toBeVisible();
    });

    for (const role of ['owner', 'accountant'] as const) {
        test(`R49 matchSettlement remains unknown for ${role}`, async ({ page }) => {
            assertPermittedCommand(role, 'R49', 'matchSettlement');
            await page.goto(new URL('/s/shop-demo/finance/reconciliation', demoUrl).toString());
            await expect(page.locator('#main-content h1').first()).toBeVisible();
            const transactionId = await createBankReconciliationCase(page, `UIC07-BANK-${role}-${randomUUID().slice(0, 6)}`);
            await chooseMockOption(page, 'Vai trò mô phỏng', role);
            await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
            await page.getByRole('tab', { name: 'Chênh lệch cần xử lý' }).click();
            const row = page.getByRole('row').filter({ hasText: transactionId });
            await expect(row).toBeVisible();
            await row.getByRole('button', { name: 'Ghép giao dịch', exact: true }).click();
            const dialog = page.getByRole('dialog', { name: 'Ghép giao dịch với công nợ' });
            await dialog.getByRole('combobox', { name: 'Khoản công nợ' }).click();
            await page.getByRole('option', { name: /seed-debtitem-10028/ }).click();
            await dialog.getByRole('textbox', { name: 'Số tiền phân bổ (VND)' }).fill('50000');
            await dialog.getByRole('textbox', { name: 'Lý do' }).fill(`UIC07 xác minh đối soát ${role}`);
            const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && /\/reconciliation-cases\/[^/]+\/match$/.test(new URL(candidate.url()).pathname));
            await dialog.getByRole('button', { name: 'Ghi kết quả đối soát', exact: true }).click();
            await expectUnknownCommand(page, role, 'R49', 'matchSettlement', response);
            await expect(dialog).toBeVisible();
        });
    }

    for (const role of ['owner', 'accountant'] as const) {
        test(`R50 closeAccountingPeriod remains unknown for ${role}`, async ({ page }) => {
            assertPermittedCommand(role, 'R50', 'closeAccountingPeriod');
            await page.goto(new URL('/s/shop-demo/finance/debts-periods', demoUrl).toString());
            await expect(page.locator('#main-content h1').first()).toBeVisible();
            await chooseDemoDataset(page, 'Shop mở sổ mới (tổng hợp)');
            const opening = await createFixture(page, 'finance/opening-balances', {
                effectiveDate: '2026-09-01', policyVersion: 'synthetic-policy-1', lines: [], inventory: [],
                reason: `UIC07 zero opening setup ${role}`,
            });
            const post = await page.evaluate(async openingId => {
                const session = (await (await fetch('/api/v2/session')).json()).data;
                const response = await fetch(`/api/v2/shops/shop-demo/finance/opening-balances/${openingId}/post`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrfToken, 'Idempotency-Key': crypto.randomUUID() },
                    body: JSON.stringify({ expectedVersion: 1 }),
                });
                return { status: response.status, payload: await response.json() };
            }, opening.id);
            expect(post.status).toBe(202);
            await expect(page.getByRole('row').filter({ hasText: '1/9/26 → 30/9/26' })).toBeVisible();
            await chooseMockOption(page, 'Vai trò mô phỏng', role);
            await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
            const period = page.getByRole('row').filter({ hasText: '1/9/26 → 30/9/26' });
            await period.getByRole('button', { name: 'Kiểm & khóa kỳ', exact: true }).click();
            const confirm = page.getByRole('dialog', { name: 'Khóa kỳ kế toán' });
            const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && new URL(candidate.url()).pathname.endsWith('/periods/period-2026-09/close'));
            await confirm.getByRole('button', { name: 'Khóa kỳ kế toán', exact: true }).click();
            await expectUnknownCommand(page, role, 'R50', 'closeAccountingPeriod', response);
            await expect(confirm).toBeVisible();
        });
    }

    for (const role of ['owner', 'accountant'] as const) {
        test(`R56 archiveAccount remains unknown for ${role}`, async ({ page }) => {
            assertPermittedCommand(role, 'R56', 'archiveAccount');
            await page.goto(new URL('/s/shop-demo/finance/accounts', demoUrl).toString());
            await expect(page.locator('#main-content h1').first()).toBeVisible();
            const code = `UIC07-${role}-${randomUUID().slice(0, 6)}`;
            await page.getByRole('button', { name: 'Thêm tài khoản', exact: true }).click();
            const editor = page.getByRole('dialog', { name: 'Thêm tài khoản' });
            await editor.getByLabel('Mã tài khoản').fill(code);
            await editor.getByLabel('Tên tài khoản').fill(`Tài khoản kiểm chứng ${role}`);
            const created = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && new URL(candidate.url()).pathname.endsWith('/finance/accounts'));
            await editor.getByRole('button', { name: 'Lưu tài khoản', exact: true }).click();
            const createdResponse = await created;
            expect(createdResponse.status()).toBe(201);
            const accountId = (await createdResponse.json()).data.id as string;
            await chooseMockOption(page, 'Vai trò mô phỏng', role);
            await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
            const row = page.getByRole('row').filter({ hasText: code });
            await expect(row).toBeVisible();
            await row.getByRole('button', { name: `Ngừng dùng ${code}`, exact: true }).click();
            const confirm = page.getByRole('dialog', { name: 'Ngừng dùng tài khoản' });
            await confirm.getByLabel('Lý do').fill(`UIC07 giữ tài khoản lịch sử ${role}`);
            const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && new URL(candidate.url()).pathname.endsWith(`/finance/accounts/${accountId}/archive`));
            await confirm.getByRole('button', { name: 'Ngừng dùng tài khoản', exact: true }).click();
            await expectUnknownCommand(page, role, 'R56', 'archiveAccount', response);
            await expect(confirm).toBeVisible();
        });
    }

    for (const role of ['owner', 'accountant'] as const) {
        test(`R57 postOpeningBalance remains unknown for ${role}`, async ({ page }) => {
            assertPermittedCommand(role, 'R57', 'postOpeningBalance');
            await page.goto(new URL('/s/shop-demo/finance/opening-balances', demoUrl).toString());
            await expect(page.locator('#main-content h1').first()).toBeVisible();
            await chooseDemoDataset(page, 'Shop mở sổ mới (tổng hợp)');
            const openingId = await createOpeningBalanceDraft(page, `UIC07 opening balance ${role}`);
            await chooseMockOption(page, 'Vai trò mô phỏng', role);
            await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
            const button = page.getByRole('button', { name: `Ghi mở sổ ${openingId}`, exact: true });
            await expect(button).toBeVisible();
            await button.click();
            const confirm = page.getByRole('dialog', { name: 'Ghi mở sổ' });
            const response = page.waitForResponse(candidate => candidate.request().method() === 'POST'
                && new URL(candidate.url()).pathname.endsWith(`/finance/opening-balances/${openingId}/post`));
            await confirm.getByRole('button', { name: 'Ghi mở sổ', exact: true }).click();
            await expectUnknownCommand(page, role, 'R57', 'postOpeningBalance', response);
            await expect(confirm).toBeVisible();
        });
    }
});
