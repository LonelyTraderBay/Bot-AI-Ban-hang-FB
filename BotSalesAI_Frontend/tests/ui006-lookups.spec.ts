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

async function gotoDemo(page: import('@playwright/test').Page, path: string) {
    await page.goto(new URL(path, demoUrl).toString());
}

async function clickNavigation(page: import('@playwright/test').Page, label: string) {
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: label, exact: true }).click();
}

async function loadAllLookup(page: import('@playwright/test').Page, dialog: import('@playwright/test').Locator, label: string, collection: string) {
    for (let pageNumber = 0; pageNumber < 20; pageNumber++) {
        const button = dialog.getByRole('button', { name: `Tải thêm ${label}`, exact: true });
        if (!(await button.count())) return;
        const response = page.waitForResponse(result => result.request().method() === 'GET'
            && new URL(result.url()).pathname.endsWith(`/${collection}`)
            && Boolean(new URL(result.url()).searchParams.get('cursor')));
        await button.click();
        await response;
    }
    throw new Error(`Lookup ${label} exceeded the pagination safety bound`);
}

async function clickTableNext(page: import('@playwright/test').Page, tableIndex: number, collection: string) {
    const table = page.getByRole('table').nth(tableIndex);
    const firstRow = table.getByRole('row').nth(1);
    const previous = await firstRow.textContent();
    const response = page.waitForResponse(result => result.request().method() === 'GET'
        && new URL(result.url()).pathname.endsWith(`/${collection}`)
        && Boolean(new URL(result.url()).searchParams.get('cursor')));
    await page.getByRole('button', { name: 'Trang tiếp', exact: true }).nth(tableIndex).click();
    await response;
    await expect(firstRow).not.toHaveText(previous || '');
}

async function collectPagedCount(page: import('@playwright/test').Page, collection: string) {
    return page.evaluate(async collectionName => {
        let cursor = '';
        let count = 0;
        for (let pageNumber = 0; pageNumber < 20; pageNumber++) {
            const url = new URL(`/api/v2/shops/shop-demo/${collectionName}`, location.origin);
            url.searchParams.set('limit', '100');
            if (cursor) url.searchParams.set('cursor', cursor);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`GET ${url.pathname} returned ${response.status}`);
            const envelope = await response.json();
            count += envelope.data.length;
            if (!envelope.page?.hasMore) return count;
            cursor = envelope.page.nextCursor;
            if (!cursor) throw new Error(`GET ${url.pathname} omitted its next cursor`);
        }
        throw new Error(`GET ${collectionName} exceeded the pagination safety bound`);
    }, collection);
}

test('UI006.C05 lookup and table cursors reach records after 150 synthetic suppliers, offers, and orders', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/purchases');
    await expect(page.getByRole('heading', { name: 'Đơn mua hàng', exact: true })).toBeVisible();

    const seeded = await page.evaluate(async () => {
        const csrfResponse = await fetch('/api/v2/auth/csrf');
        const csrf = (await csrfResponse.json()).data.csrfToken as string;
        async function write(path: string, body: unknown, key: string) {
            const response = await fetch(`/api/v2/shops/shop-demo/${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, 'Idempotency-Key': key },
                body: JSON.stringify(body),
            });
            const envelope = await response.json();
            if (!response.ok) throw new Error(`${path} returned ${response.status}: ${envelope.detail || JSON.stringify(envelope)}`);
            return envelope.data;
        }

        let targetSupplierId = '';
        let targetOfferId = '';
        for (let index = 1; index <= 150; index++) {
            const suffix = String(index).padStart(3, '0');
            const supplier = await write('suppliers', {
                name: `UI006 nhà cung cấp ${suffix}`,
                contactLabel: `UI006 liên hệ ${suffix}`,
                currency: 'VND',
                leadTimeDays: 1,
                paymentTerms: 'Thanh toán theo xác nhận mẫu',
                sendMethod: 'manual',
                approvedAdapterId: null,
            }, `ui006-supplier-${suffix}`);
            const offer = await write('supplier-offers', {
                supplierId: supplier.id,
                variantId: 'v-p1',
                unitCost: { amount: '123456', currency: 'VND' },
                minimumQuantity: 1,
                packSize: 1,
                leadTimeDays: 1,
                validUntil: null,
            }, `ui006-offer-${suffix}`);
            if (index === 1) {
                await write(`suppliers/${supplier.id}/status`, {
                    expectedVersion: supplier.version,
                    status: 'approved',
                    reason: 'UI006 acceptance fixture approval',
                }, 'ui006-approve-final-supplier');
                targetSupplierId = supplier.id;
                targetOfferId = offer.id;
            }
        }

        let targetOrderId = '';
        for (let index = 1; index <= 150; index++) {
            const suffix = String(index).padStart(3, '0');
            const order = await write('orders', {
                customerId: 'c1',
                conversationId: null,
                warehouseId: 'warehouse-01',
                lines: [{ variantId: 'v-p1', quantity: 1 }],
                notes: `UI006 synthetic cursor record ${suffix}`,
                paymentMethod: 'cod',
                shippingAddressId: null,
            }, `ui006-order-${suffix}`);
            if (index === 1) targetOrderId = order.id;
        }

        return { targetSupplierId, targetOfferId, targetOrderId };
    });

    const [supplierCount, offerCount, orderCount] = await Promise.all([
        collectPagedCount(page, 'suppliers'),
        collectPagedCount(page, 'supplier-offers'),
        collectPagedCount(page, 'orders'),
    ]);
    expect(supplierCount).toBeGreaterThanOrEqual(150);
    expect(offerCount).toBeGreaterThanOrEqual(150);
    expect(orderCount).toBeGreaterThanOrEqual(150);

    await clickNavigation(page, 'Nhà cung cấp');
    await expect(page.getByRole('table')).toHaveCount(2);
    const supplierTable = page.getByRole('table').nth(0);
    const targetSupplierRow = supplierTable.getByRole('row').filter({ hasText: 'UI006 nhà cung cấp 001' });
    for (let pageNumber = 0; pageNumber < 12 && !(await targetSupplierRow.count()); pageNumber++) {
        await clickTableNext(page, 0, 'suppliers');
    }
    await expect(targetSupplierRow).toBeVisible();
    await expect(page).toHaveURL(/supplierCursor=/);

    const offerTable = page.getByRole('table').nth(1);
    const targetOfferRow = offerTable.getByRole('row').filter({ hasText: 'UI006 nhà cung cấp 001' });
    for (let pageNumber = 0; pageNumber < 12 && !(await targetOfferRow.count()); pageNumber++) {
        await clickTableNext(page, 1, 'supplier-offers');
    }
    await expect(targetOfferRow).toBeVisible();
    await expect(page).toHaveURL(/supplierCursor=.*offerCursor=/);

    await clickNavigation(page, 'Đơn mua hàng');
    await page.getByRole('button', { name: 'Tạo đơn mua', exact: true }).click();
    const purchaseDialog = page.getByRole('dialog', { name: 'Đơn mua mới' });
    const supplierSelect = purchaseDialog.getByRole('combobox', { name: 'Nhà cung cấp đã duyệt' });
    await loadAllLookup(page, purchaseDialog, 'nhà cung cấp', 'suppliers');
    await supplierSelect.click();
    await page.getByRole('option', { name: 'UI006 nhà cung cấp 001', exact: true }).click();

    const targetOfferLabel = 'v-p1 · 123456 VND · MOQ 1 / quy cách 1';
    const offerSelect = purchaseDialog.getByRole('combobox', { name: 'Báo giá dòng 1' });
    let foundTargetOffer = false;
    for (let pageNumber = 0; pageNumber < 12; pageNumber++) {
        await offerSelect.click();
        const targetOption = page.getByRole('option', { name: targetOfferLabel, exact: true });
        if (await targetOption.count()) {
            await targetOption.click();
            foundTargetOffer = true;
            break;
        }
        await page.keyboard.press('Escape');
        await loadAllLookup(page, purchaseDialog, 'báo giá', 'supplier-offers');
        await offerSelect.click();
        const loadedTargetOption = page.getByRole('option', { name: targetOfferLabel, exact: true });
        if (await loadedTargetOption.count()) {
            await loadedTargetOption.click();
            foundTargetOffer = true;
            break;
        }
        await page.keyboard.press('Escape');
        break;
    }
    expect(foundTargetOffer).toBeTruthy();

    const purchaseRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/purchase-orders'));
    const purchaseResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/purchase-orders'));
    await purchaseDialog.getByRole('button', { name: 'Lưu đơn nháp', exact: true }).click();
    expect((await purchaseRequest).postDataJSON()).toMatchObject({ supplierId: seeded.targetSupplierId, lines: [{ supplierOfferId: seeded.targetOfferId, variantId: 'v-p1', quantity: 1 }] });
    expect((await purchaseResponse).status()).toBe(201);
    await page.getByRole('dialog', { name: /Đơn mua / }).getByRole('button', { name: 'Đóng', exact: true }).last().click();

    await clickNavigation(page, 'Đơn hàng');
    const ordersTable = page.getByRole('table').first();
    const targetOrderRow = ordersTable.getByRole('row').filter({ hasText: seeded.targetOrderId });
    for (let pageNumber = 0; pageNumber < 20 && !(await targetOrderRow.count()); pageNumber++) {
        await clickTableNext(page, 0, 'orders');
    }
    await expect(targetOrderRow).toBeVisible();
    expect(seeded.targetOrderId).toBeTruthy();
});

test('UI006.C04 bounded previews disclose their sample and link to full collections', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/inbox/cv1');
    await page.getByRole('tab', { name: 'Giá & tồn' }).click();
    await expect(page.getByText('Preview giới hạn ở 100 sản phẩm và 100 snapshot đầu tiên; không phải danh sách đầy đủ.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Mở danh sách sản phẩm' })).toHaveAttribute('href', '/s/shop-demo/products');
    await expect(page.getByRole('link', { name: 'Mở danh sách tồn kho' })).toHaveAttribute('href', '/s/shop-demo/inventory');

    await gotoDemo(page, '/s/shop-demo/knowledge');
    await expect(page.getByText(/Bản đối chiếu giới hạn ở 100 sản phẩm và 100 snapshot đầu tiên/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Mở danh sách sản phẩm' })).toHaveAttribute('href', '/s/shop-demo/products');
    await expect(page.getByRole('link', { name: 'Mở danh sách tồn kho' })).toHaveAttribute('href', '/s/shop-demo/inventory');

    await gotoDemo(page, '/s/shop-demo/customers/c1');
    await expect(page.getByText(/Đang đối chiếu tối đa 10 đơn hàng với 100 vận đơn đã tải/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Mở danh sách vận đơn' })).toHaveAttribute('href', '/s/shop-demo/shipments');
});

test('UI006.C02 selected order identity survives a failed search and cursor retry', async ({ page }) => {
    const selectedOrderId = 'DH-DEMO-RETURN-02';
    const initialOrders = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname.endsWith('/orders')
        && !new URL(response.url()).searchParams.has('q')
        && !new URL(response.url()).searchParams.has('cursor'));
    const detailRequest = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith(`/orders/${selectedOrderId}`));
    await gotoDemo(page, `/s/shop-demo/returns?orderId=${selectedOrderId}`);
    await Promise.all([initialOrders, detailRequest]);
    await page.getByRole('combobox', { name: 'Trạng thái thử' }).click();
    await page.getByRole('option', { name: 'Mất quyền truy vấn tiếp', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Trạng thái thử đã được áp dụng.');
    await page.getByRole('button', { name: 'Tạo yêu cầu trả', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Yêu cầu trả hàng' });
    const selectedOrder = dialog.getByRole('combobox', { name: 'Đơn hàng đã giao' });
    await expect(selectedOrder).toContainText(selectedOrderId);

    const query = 'ui006-no-matching-order';
    const failedSearch = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname.endsWith('/orders')
        && new URL(response.url()).searchParams.get('q') === query);
    await dialog.getByRole('textbox', { name: 'Tìm đơn hàng' }).fill(query);
    const failedResponse = await failedSearch;
    expect(failedResponse.status()).toBe(403);
    await expect(selectedOrder).toContainText(selectedOrderId);
    await expect(dialog.getByRole('alert').filter({ hasText: 'Mô phỏng mất quyền của truy vấn này.' })).toHaveCount(1);
    const retrySearch = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname.endsWith('/orders')
        && new URL(response.url()).searchParams.get('q') === query
        && response.status() === 200);
    await dialog.getByRole('button', { name: 'Thử lại danh sách đơn', exact: true }).click();
    await retrySearch;
    await expect(selectedOrder).toContainText(selectedOrderId);
    await expect(dialog.getByRole('spinbutton', { name: /tối đa/ })).toHaveCount(1);
    await expect(dialog.getByRole('button', { name: 'Tạo yêu cầu', exact: true })).toBeDisabled();
});
