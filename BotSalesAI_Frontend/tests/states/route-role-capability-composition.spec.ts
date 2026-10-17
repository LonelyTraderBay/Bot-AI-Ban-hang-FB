import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { openDemoControls } from '../session/demo-controls';
import { startDemoServer } from '../session/demo-server.mjs';

type Route = {
    id: string;
    path: string;
    readPermission: string | null;
    actions: Array<{ operationId: string; permission: string | null }>;
};
type RouteManifest = { routes: Route[] };
type PermissionCatalog = { rolePresets: Record<string, string[]> };

const routeManifest = JSON.parse(readFileSync(new URL('../../../botsales-kit/contracts/route-manifest.json', import.meta.url), 'utf8')) as RouteManifest;
const permissionCatalog = JSON.parse(readFileSync(new URL('../../../botsales-kit/contracts/permission-catalog.json', import.meta.url), 'utf8')) as PermissionCatalog;
const playgroundRoute = routeManifest.routes.find(route => route.id === 'R27');
if (!playgroundRoute) throw new Error('The canonical route manifest must contain R27.');
const capabilityRoles = Object.keys(permissionCatalog.rolePresets).filter(role => {
    const permissions = permissionCatalog.rolePresets[role];
    return (!playgroundRoute.readPermission || permissions.includes(playgroundRoute.readPermission))
        && playgroundRoute.actions.some(action => action.operationId === 'runPlayground' && (!action.permission || permissions.includes(action.permission)));
});
const capabilityFaults = [
    {
        option: 'Hết hạn mức AI mô phỏng',
        fault: 'budget_exceeded',
        status: 429,
        code: 'BUDGET_EXCEEDED',
        message: 'Hạn mức AI mô phỏng đã đạt giới hạn',
    },
    {
        option: 'Công cụ bị từ chối',
        fault: 'tool_denied',
        status: 403,
        code: 'TOOL_NOT_ALLOWED',
        message: 'không thuộc allowedToolIds',
    },
];

async function chooseMockOption(page: import('@playwright/test').Page, label: string, value: string) {
    await openDemoControls(page);
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
}

for (const role of capabilityRoles) {
    test(`R27 capability failure stays distinct and preserves the prompt for ${role}`, async ({ page }) => {
        const server = await startDemoServer();
        try {
            await page.goto(new URL('/s/shop-demo/bot/playground', server.url).toString());
            await expect(page.getByRole('heading', { name: 'Phòng thử bot' })).toBeVisible();
            if (role !== 'owner') {
                await chooseMockOption(page, 'Vai trò mô phỏng', role);
                await expect(page.getByRole('status').filter({ hasText: 'Vai trò mô phỏng đã được áp dụng.' })).toBeVisible();
            }

            const prompt = `Kiểm chứng capability_unavailable cho ${role}.`;
            const input = page.getByRole('textbox', { name: 'Nội dung khách hỏi' });
            await input.fill(prompt);
            await expect(input).toHaveValue(prompt);

            for (const fault of capabilityFaults) {
                await chooseMockOption(page, 'Trạng thái thử', fault.option);
                await expect(input).toHaveValue(prompt);
                const responseWait = page.waitForResponse(response => response.request().method() === 'POST'
                    && new URL(response.url()).pathname.endsWith('/bot/playground'));
                await page.getByRole('button', { name: 'Chạy thử' }).click();
                const response = await responseWait;
                expect(response.status()).toBe(fault.status);
                expect(await response.json()).toMatchObject({ code: fault.code, status: fault.status });
                await expect(page.getByRole('status').filter({ hasText: fault.message })).toBeVisible();
                await expect(page.getByRole('alert').filter({ hasText: 'Không đủ quyền truy cập' })).toHaveCount(0);
                await expect(page.getByRole('alert').filter({ hasText: 'Không thể hoàn thành yêu cầu' })).toHaveCount(0);
                await expect(input).toHaveValue(prompt);
                await expect(page.getByText('Chạy câu hỏi để xem câu trả lời, nguồn và cảnh báo. Không có điểm chất lượng tự tạo.')).toBeVisible();
                console.log(`BROWSER=${test.info().project.name} ROLE_STATE=capability_unavailable ROLE=${role} ROUTE=R27 OPERATION=runPlayground FAULT=${fault.fault} RESULT=PASS`);
            }
        } finally {
            await server.close();
        }
    });
}
