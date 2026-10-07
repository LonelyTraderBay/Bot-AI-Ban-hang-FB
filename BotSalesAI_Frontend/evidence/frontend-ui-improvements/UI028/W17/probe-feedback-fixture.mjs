import { chromium } from '@playwright/test';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const server = await startDemoServer({ cacheIsolationKey: 'ui028-w17-probe-feedback-direct-20261006' });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('response', async response => {
    if (new URL(response.url()).pathname.includes('/feedback')) {
        process.stdout.write(`FEEDBACK_RESPONSE ${response.request().method()} ${response.status()} ${new URL(response.url()).pathname} ${(await response.text().catch(() => '')).slice(0, 500)}\n`);
    }
});
try {
    await page.goto(new URL('/s/shop-demo/inbox/cv1', server.url).toString());
    await page.getByRole('button', { name: /^Đánh giá tin nhắn/ }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Đánh giá câu trả lời' });
    await dialog.getByRole('textbox', { name: 'Nội dung đề xuất sửa' }).fill('Kiểm tra điều kiện theo chính sách đã duyệt.');
    const saved = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/feedback'));
    await dialog.getByRole('button', { name: 'Lưu phản hồi', exact: true }).click();
    process.stdout.write(`SAVED ${(await saved).status()}\n`);
    await page.goto(new URL('/s/shop-demo/knowledge/review', server.url).toString());
    await page.getByRole('heading', { name: 'Duyệt phản hồi AI', exact: true }).waitFor();
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('networkidle');
    process.stdout.write(`ROWS ${(await page.getByRole('row').allTextContents()).join(' | ')}\n`);
    process.stdout.write(`BUTTONS ${await page.getByRole('button').allTextContents()}\n`);
} finally {
    await browser.close();
    await server.close();
}
