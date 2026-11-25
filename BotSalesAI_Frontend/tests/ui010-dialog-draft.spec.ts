import { test, expect, type Locator, type Page } from '@playwright/test';
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

async function expectKeyboardScroll(page: Page, warning: Locator, title: string) {
    const content = warning.getByRole('region', { name: title });
    await expect(content).toBeVisible();
    for (let step = 0; step < 3; step++) {
        if (await content.evaluate(element => document.activeElement === element)) break;
        await page.keyboard.press('Tab');
        expect(await warning.evaluate(element => element.contains(document.activeElement))).toBe(true);
    }
    await expect(content).toBeFocused();
    const { scrollHeight, clientHeight } = await content.evaluate(element => ({
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
    }));
    expect(scrollHeight).toBeGreaterThan(clientHeight);
    await page.keyboard.press('End');
    await expect.poll(() => content.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    await page.keyboard.press('Home');
    await expect.poll(() => content.evaluate(element => element.scrollTop)).toBe(0);
}

test('the discard confirmation can be scrolled with the keyboard in a short viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 225 });
    await page.goto(new URL('/s/shop-demo/inbox/cv1', demoUrl).toString());
    await page.getByRole('button', { name: 'Tiếp quản', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Tiếp quản cuộc trò chuyện' });
    const reason = editor.getByRole('textbox', { name: /Lý do/ });
    await reason.fill('Bản nháp vẫn còn sau Escape.');
    await page.keyboard.press('Escape');
    const title = 'Rời biểu mẫu chưa lưu?';
    const warning = page.getByRole('dialog', { name: title });
    await expectKeyboardScroll(page, warning, title);
    await page.keyboard.press('Escape');
    await expect(warning).toBeHidden();
    await expect(reason).toHaveValue('Bản nháp vẫn còn sau Escape.');
    await expect(reason).toBeFocused();
});

test('the dirty navigation warning can be scrolled with the keyboard in a short viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 225 });
    await page.goto(new URL('/onboarding', demoUrl).toString());
    const name = page.getByRole('textbox', { name: 'Tên cửa hàng', exact: true });
    await name.fill('Bản nháp cửa hàng');
    const back = page.getByRole('link', { name: 'Quay lại', exact: true });
    await back.focus();
    await page.keyboard.press('Enter');
    const title = 'Rời màn hình chưa lưu?';
    const warning = page.getByRole('dialog', { name: title });
    await expectKeyboardScroll(page, warning, title);
    await page.keyboard.press('Escape');
    await expect(warning).toBeHidden();
    await expect(name).toHaveValue('Bản nháp cửa hàng');
    await expect(back).toBeFocused();
});
