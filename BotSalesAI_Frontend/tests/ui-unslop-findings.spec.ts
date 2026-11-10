import { test, expect } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let url = '';
let close: (() => Promise<void>) | undefined;
test.beforeAll(async () => { const server = await startDemoServer(); url = server.url; close = server.close; });
test.afterAll(async () => close?.());

for (const width of [390, 1440]) {
    for (const [route, name, dialog] of [
        ['products/new', 'Chọn ảnh', false], ['products/p1', 'Chọn ảnh', false],
        ['imports', 'Chọn CSV UTF-8', false], ['knowledge', 'Hoặc tải PDF/tài liệu hỗ trợ', true],
    ] as const) {
        test(`file chooser supports keyboard and pointer: ${route} ${width}`, async ({ page }) => {
            await page.setViewportSize({ width, height: 900 });
            await page.goto(`${url}/s/shop-demo/${route}`);
            await expect(page.locator('main h1')).toBeVisible();
            if (dialog) await page.getByRole('button', { name: 'Thêm nguồn kiến thức', exact: true }).click();
            const button = page.getByRole('button', { name, exact: true });
            await expect(button).toBeVisible();
            await expect(button).toHaveJSProperty('tagName', 'BUTTON');
            for (const activation of ['Enter', 'Space', 'pointer']) {
                await button.focus();
                const chooser = page.waitForEvent('filechooser');
                if (activation === 'pointer') await button.click(); else await button.press(activation);
                await (await chooser).setFiles([]);
            }
        });
    }
    test(`dialog title aligns and restores focus: ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${url}/s/shop-demo/customers`);
        const opener = page.getByRole('button', { name: 'Thêm khách hàng', exact: true });
        await opener.click();
        const dialog = page.getByRole('dialog');
        const offset = await dialog.locator('.MuiDialogTitle-root').evaluate(title => {
            const text = title.firstElementChild!.getBoundingClientRect();
            const close = title.querySelector('button')!.getBoundingClientRect();
            return (text.top + text.height / 2) - (close.top + close.height / 2);
        });
        expect(Math.abs(offset)).toBeLessThanOrEqual(0.5);
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(opener).toBeFocused();
    });
}
