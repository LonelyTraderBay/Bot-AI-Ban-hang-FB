import { test, expect } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer({ cacheIsolationKey: 'ui028-w17-knowledge-layout' });
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

async function gotoDemo(page: import('@playwright/test').Page, route: string) {
    await page.goto(new URL(route, demoUrl).toString());
}

async function gotoKnowledgeDetail(page: import('@playwright/test').Page) {
    const detailResponse = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname === '/api/v2/shops/shop-demo/knowledge/k3');
    const revisionsResponse = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname === '/api/v2/shops/shop-demo/knowledge/k3/revisions');
    await gotoDemo(page, '/s/shop-demo/knowledge/k3');
    expect((await detailResponse).status()).toBe(200);
    expect((await revisionsResponse).status()).toBe(200);
    await page.getByRole('progressbar', { name: 'Đang tải màn hình', exact: true }).waitFor({ state: 'hidden' });
}

async function seedPendingFeedbackAndOpenReview(page: import('@playwright/test').Page) {
    await gotoDemo(page, '/s/shop-demo/inbox/cv1');
    await page.getByRole('button', { name: /^Đánh giá tin nhắn/ }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Đánh giá câu trả lời' });
    await dialog.getByRole('textbox', { name: 'Nội dung đề xuất sửa' }).fill('Kiểm tra điều kiện theo chính sách đã duyệt.');
    const responseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/feedback'));
    await dialog.getByRole('button', { name: 'Lưu phản hồi', exact: true }).click();
    expect((await responseWait).status()).toBe(201);
    await page.evaluate(() => {
        window.history.pushState({}, '', '/s/shop-demo/knowledge/review');
        window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page.getByRole('heading', { name: 'Duyệt phản hồi AI', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Duyệt nội dung', exact: true }).first()).toBeVisible();
}

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page, width: number) {
    const metrics = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
    }));
    expect(metrics.viewport).toBe(width);
    expect(metrics.content).toBeLessThanOrEqual(metrics.viewport);
}

async function expectDialogFits(page: import('@playwright/test').Page, width: number, height: number) {
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height + 1);
    await expectNoHorizontalOverflow(page, width);
}

test('Knowledge routes R23/R24/R25 fit every supported layout boundary', async ({ page }) => {
    for (const width of [320, 390, 768, 1280, 1440]) {
        const height = width < 600 ? 844 : 900;
        await page.setViewportSize({ width, height });

        await gotoDemo(page, '/s/shop-demo/knowledge');
        await expect(page.getByRole('heading', { name: 'Kiến thức cửa hàng', exact: true })).toBeVisible();
        await expect(page.getByRole('table').first()).toBeVisible();
        await expectNoHorizontalOverflow(page, width);

        await gotoKnowledgeDetail(page);
        await expect(page.getByRole('heading', { name: 'Chính sách đổi hàng', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Lịch sử phiên bản', exact: true })).toBeVisible();
        await expectNoHorizontalOverflow(page, width);

        await seedPendingFeedbackAndOpenReview(page);
        await expectNoHorizontalOverflow(page, width);
    }
});

test('Knowledge create, edit, and feedback-review dialogs remain inside mobile and desktop viewports', async ({ page }) => {
    for (const width of [320, 390, 1280]) {
        const height = width < 600 ? 844 : 900;
        await page.setViewportSize({ width, height });

        await gotoDemo(page, '/s/shop-demo/knowledge');
        await page.getByRole('button', { name: 'Thêm nguồn kiến thức', exact: true }).click();
        await page.getByRole('dialog', { name: 'Nguồn kiến thức mới' }).waitFor();
        await expectDialogFits(page, width, height);

        await gotoKnowledgeDetail(page);
        await page.getByRole('button', { name: 'Sửa bản nháp', exact: true }).click();
        await page.getByRole('dialog', { name: 'Sửa nháp' }).waitFor();
        await expectDialogFits(page, width, height);

        await seedPendingFeedbackAndOpenReview(page);
        await page.getByRole('button', { name: 'Duyệt nội dung', exact: true }).first().click();
        await page.getByRole('dialog', { name: 'Kiểm tra phản hồi' }).waitFor();
        await expectDialogFits(page, width, height);
    }
});
