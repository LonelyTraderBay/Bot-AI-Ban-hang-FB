import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';
import { openDemoControls } from './session/demo-controls';
let url = '', close: (() => Promise<void>) | undefined;
test.beforeAll(async () => { const server = await startDemoServer({ cacheIsolationKey: 'ui-order-permission' }); url = server.url; close = server.close; });
test.afterAll(async () => close?.());
test('order customer name is hidden when customers.read is revoked', async ({ page }) => {
    await page.goto(`${url}/s/shop-demo/orders`);
    const region = page.getByRole('region', { name: 'Danh sách đơn hàng', exact: true });
    await expect(region.getByRole('link', { name: 'Linh (khách mẫu)' }).first()).toBeVisible();
    await openDemoControls(page);
    await page.getByRole('combobox', { name: 'Vai trò mô phỏng' }).click();
    await page.getByRole('option', { name: 'warehouse', exact: true }).click();
    await expect(region.getByText('Mã khách hàng: c1').first()).toBeVisible();
    await expect(region.getByRole('link', { name: 'Linh (khách mẫu)' })).toHaveCount(0);
    await expect(region.getByRole('link', { name: /Mã khách hàng/ })).toHaveCount(0);
});
