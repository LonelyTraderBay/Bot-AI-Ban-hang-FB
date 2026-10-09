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

test('UI010 a discarded confirmation reason is cleared before the dialog opens again', async ({ page }) => {
    const takeoverRequests: string[] = [];
    page.on('request', request => {
        if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/takeover'))
            takeoverRequests.push(request.url());
    });

    await page.goto(new URL('/s/shop-demo/inbox/cv1', demoUrl).toString());
    const trigger = page.getByRole('button', { name: 'Tiếp quản', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Tiếp quản cuộc trò chuyện' });
    const reason = dialog.getByRole('textbox', { name: /Lý do/ });
    await reason.fill('Lý do không được gửi vì tôi đã bỏ bản nháp.');
    await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();

    const discardPrompt = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?' });
    await expect(discardPrompt).toBeVisible();
    await discardPrompt.getByRole('button', { name: 'Bỏ thay đổi', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await page.getByRole('button', { name: 'Tiếp quản', exact: true }).click();
    await expect(dialog.getByRole('textbox', { name: /Lý do/ })).toHaveValue('');
    expect(takeoverRequests).toEqual([]);
});
