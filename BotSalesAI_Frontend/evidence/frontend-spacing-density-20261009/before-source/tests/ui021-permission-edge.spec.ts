import { test, expect } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

test('privacy page keeps the customers link when the destination permission is present', async ({ page }) => {
    const server = await startDemoServer();

    try {
        await page.goto(new URL('/s/shop-demo/settings/privacy', server.url).toString());
        const customerLink = page.getByRole('link', { name: 'Mở danh sách khách đầy đủ' });
        await expect(customerLink).toBeVisible();
        await customerLink.click();
        await expect(page).toHaveURL(/\/s\/shop-demo\/customers$/);
        await expect(page.getByText(/Bạn không có quyền truy cập màn hình này/)).toHaveCount(0);
    } finally {
        await server.close();
    }
});

test('privacy page hides the customers link when the destination permission is missing', async ({ page }) => {
    const server = await startDemoServer();

    try {
        await page.addInitScript(() => {
            const originalFetch = window.fetch.bind(window);
            window.fetch = async (input, init) => {
                const response = await originalFetch(input, init);
                const requestUrl = input instanceof Request ? input.url : input instanceof URL ? input.href : input;
                if (new URL(requestUrl, window.location.href).pathname !== '/api/v2/session' || !response.ok)
                    return response;

                const session = await response.clone().json();
                for (const membership of session.data?.memberships || []) {
                    if (membership.shopId === 'shop-demo' && membership.status === 'active')
                        membership.permissions = membership.permissions.filter((permission: string) => permission !== 'customers.read');
                }
                return new Response(JSON.stringify(session), {
                    status: response.status,
                    headers: { 'Content-Type': 'application/json' },
                });
            };
        });

        await page.goto(new URL('/s/shop-demo/settings/privacy', server.url).toString());
        await expect(page.getByRole('heading', { name: 'Quyền riêng tư & vòng đời dữ liệu' })).toBeVisible();
        await expect(page.getByText(/không có customers\.read/)).toBeVisible();
        await expect(page.getByRole('link', { name: 'Mở danh sách khách đầy đủ' })).toHaveCount(0);

        await page.goto(new URL('/s/shop-demo/customers', server.url).toString());
        await expect(page.getByText(/Bạn không có quyền truy cập màn hình này/)).toBeVisible();
    } finally {
        await server.close();
    }
});
