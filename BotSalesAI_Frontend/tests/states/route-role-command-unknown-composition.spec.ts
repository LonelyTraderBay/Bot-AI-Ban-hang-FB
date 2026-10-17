import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { openDemoControls } from '../session/demo-controls';
import { startDemoServer } from '../session/demo-server.mjs';

type Role = 'owner' | 'manager';
const route = '/s/:shopId/settings/warehouses';
const roles: Role[] = ['owner', 'manager'];
const operationIndex = JSON.parse(readFileSync(new URL('../../packages/contracts/src/operations.json', import.meta.url), 'utf8')) as Record<string, { method: string; responseSchema: string }>;
const routeManifest = JSON.parse(readFileSync(new URL('../../../botsales-kit/contracts/route-manifest.json', import.meta.url), 'utf8')) as {
    routes: Array<{ id: string; path: string; actions: Array<{ operationId: string; permission: string | null }> }>;
};
const permissionCatalog = JSON.parse(readFileSync(new URL('../../../botsales-kit/contracts/permission-catalog.json', import.meta.url), 'utf8')) as { rolePresets: Record<string, string[]> };
const warehouseRoute = routeManifest.routes.find(item => item.id === 'R55');
if (!warehouseRoute || warehouseRoute.path !== route || !warehouseRoute.actions.some(action => action.operationId === 'archiveWarehouse' && action.permission === 'warehouses.manage'))
    throw new Error('R55 route/action contract changed; update this route-specific command-unknown proof.');
if (operationIndex.archiveWarehouse?.method !== 'POST' || operationIndex.archiveWarehouse.responseSchema !== 'CommandResponse')
    throw new Error('R55 archiveWarehouse no longer returns a command; update this route-specific proof.');
for (const role of roles) {
    if (!permissionCatalog.rolePresets[role]?.includes('warehouses.manage'))
        throw new Error(`R55 command-unknown fixture role ${role} lost warehouses.manage.`);
}

let demoUrl = '';
let stopDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    stopDemo = server.close;
});

test.afterAll(async () => stopDemo?.());

async function chooseMockOption(page: import('@playwright/test').Page, label: string, value: string) {
    await openDemoControls(page);
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
}

async function chooseRole(page: import('@playwright/test').Page, role: Role) {
    if (role === 'owner') return;
    await chooseMockOption(page, 'Vai trò mô phỏng', role);
}

for (const role of roles) {
    test(`unknown archiveWarehouse result remains visible on R55 for ${role}`, async ({ page }) => {
        const browser = test.info().project.name;
        const pageErrors: string[] = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        await page.goto(new URL('/s/shop-demo/settings/warehouses', demoUrl).toString());
        await chooseRole(page, role);
        await expect(page.getByRole('heading', { name: 'Quản trị kho', exact: true })).toBeVisible();
        const code = `UIC07-${role}`;
        await page.getByRole('button', { name: 'Thêm kho', exact: true }).click();
        const createDialog = page.getByRole('dialog', { name: 'Thêm kho' });
        await createDialog.getByRole('textbox', { name: 'Mã kho' }).fill(code);
        await createDialog.getByRole('textbox', { name: 'Tên kho' }).fill(`Kho kiểm chứng ${role}`);
        await createDialog.getByRole('textbox', { name: 'Địa điểm kho' }).fill('Khu vực thử nghiệm tổng hợp');
        const createResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/warehouses'));
        await createDialog.getByRole('button', { name: 'Lưu kho', exact: true }).click();
        const createResponse = await createResponseWait;
        expect(createResponse.status()).toBe(201);
        const createdWarehouse = (await createResponse.json()).data as { id: string };
        await expect(page.getByRole('row').filter({ hasText: code })).toBeVisible();
        await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');

        const row = page.getByRole('row').filter({ hasText: code });
        await row.getByRole('button', { name: `Ngừng dùng ${code}`, exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Ngừng dùng kho' });
        await expect(dialog).toBeVisible();
        await dialog.getByRole('textbox', { name: 'Lý do' }).fill(`UIC07 unknown ${role}`);
        const responseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/warehouses/${createdWarehouse.id}/archive`));
        await dialog.getByRole('button', { name: 'Ngừng dùng kho', exact: true }).click();
        const response = await responseWait;
        expect(response.status()).toBe(202);
        expect((await response.json()).data.status).toBe('unknown');
        await expect(dialog.getByRole('alert').filter({ hasText: 'Chưa xác minh được kết quả' })).toBeVisible();
        await expect(page.getByText(/Có 1 thao tác chưa xác minh kết quả/)).toBeVisible();
        await expect(page.getByRole('status').filter({ hasText: `Đã ngừng dùng kho ${code}` })).toHaveCount(0);
        expect(pageErrors).toEqual([]);
        console.log(`BROWSER=${browser} ROLE_STATE=command_unknown ROLE=${role} ROUTE=R55 OPERATION=archiveWarehouse RESULT=PASS`);
    });
}
