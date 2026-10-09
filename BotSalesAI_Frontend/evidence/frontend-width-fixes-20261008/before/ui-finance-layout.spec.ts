import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer({ cacheIsolationKey: 'ui028-w15-finance-layout' });
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

async function gotoDemo(page: import('@playwright/test').Page, route: string) {
    await page.goto(new URL(route, demoUrl).toString());
}

async function expectDialogWithinViewport(page: import('@playwright/test').Page, dialog: import('@playwright/test').Locator, width: number, height: number) {
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
}

test('Finance R20/R21/R22/R48/R49/R50 route layouts retain shell gutter without horizontal overflow from 320–1440px', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const routes = [
        { id: 'R20', path: '/s/shop-demo/finance', heading: 'Dòng tiền' },
        { id: 'R21', path: '/s/shop-demo/finance/entries', heading: 'Sổ thu chi' },
        { id: 'R22', path: '/s/shop-demo/finance/profit-loss', heading: 'Lợi nhuận quản trị' },
        { id: 'R48', path: '/s/shop-demo/finance/journals', heading: 'Bút toán' },
        { id: 'R49', path: '/s/shop-demo/finance/reconciliation', heading: 'Đối soát ngân hàng & COD' },
        { id: 'R50', path: '/s/shop-demo/finance/debts-periods', heading: 'Công nợ & khóa kỳ' },
    ];
    const observations: Array<{ route: string; width: number; clientWidth: number; scrollWidth: number }> = [];

    for (const width of [320, 390, 768, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of routes) {
            await gotoDemo(page, route.path);
            await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible();
            await expect(page.locator('main#main-content')).toHaveCSS('padding-left', width >= 768 ? '24px' : '16px');
            const geometry = await page.evaluate(() => ({
                clientWidth: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
            }));
            expect(geometry.scrollWidth, `${route.id} document width at ${width}px`).toBeLessThanOrEqual(geometry.clientWidth);
            observations.push({ route: route.id, width, ...geometry });
        }
    }

    expect(observations).toHaveLength(30);
    expect(errors).toEqual([]);
});

test('titled Finance Panels keep one 16px header-to-first-content boundary', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const cases = [
        { path: '/s/shop-demo/finance', heading: 'Kỳ báo cáo', hasAction: false, firstContentSelector: '.MuiStack-root', firstContentPaddingTop: 12 },
        { path: '/s/shop-demo/finance/profit-loss', heading: 'Chi tiết kết quả kinh doanh', hasAction: true, firstContentSelector: '.MuiStack-root', firstContentPaddingTop: 12 },
        // The mock notice is now first; its MUI inset is separate from the Panel header boundary.
        { path: '/s/shop-demo/finance/profit-loss', heading: 'Hỏi đáp có nguồn', hasAction: false, firstContentSelector: '.MuiAlert-root[role="alert"]', firstContentPaddingTop: 6 },
    ];
    const observations: Array<{ path: string; heading: string; width: number; headerContentBottom: number; firstContentTop: number; gap: number; bodyPaddingTop: number; bodyPaddingInlineStart: number; bodyPaddingBottom: number; firstContentPaddingTop: number; hasAction: boolean }> = [];

    for (const width of [390, 806, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const item of cases) {
            await gotoDemo(page, item.path);
            await expect(page).toHaveURL(new RegExp(`${item.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
            const heading = page.getByRole('heading', { name: item.heading, exact: true });
            await expect(heading).toBeVisible();
            const panel = heading.locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]');
            await expect(panel.locator(`:scope > :last-child > ${item.firstContentSelector}:first-child`)).toBeVisible();
            const geometry = await panel.evaluate(element => {
                const header = [...element.children].find(child => child.querySelector('h2'));
                const body = [...element.children].find(child => child !== header);
                const firstContent = body?.firstElementChild;
                if (!header || !firstContent) return null;
                const headerContentBottom = Math.max(...[...header.children].map(child => child.getBoundingClientRect().bottom));
                const firstContentTop = firstContent.getBoundingClientRect().top;
                const bodyStyle = getComputedStyle(body!);
                const firstContentStyle = getComputedStyle(firstContent);
                return {
                    headerContentBottom,
                    firstContentTop,
                    gap: firstContentTop - headerContentBottom,
                    bodyPaddingTop: Number.parseFloat(bodyStyle.paddingTop),
                    bodyPaddingInlineStart: Number.parseFloat(bodyStyle.paddingInlineStart),
                    bodyPaddingBottom: Number.parseFloat(bodyStyle.paddingBottom),
                    firstContentPaddingTop: Number.parseFloat(firstContentStyle.paddingTop),
                    hasAction: header!.children.length > 1,
                };
            });
            expect(geometry, `${item.heading} must expose header and first body content`).not.toBeNull();
            observations.push({ path: item.path, heading: item.heading, width, ...geometry! });
        }
    }

    await test.info().attach('finance-panel-boundaries.json', {
        body: JSON.stringify(observations, null, 2),
        contentType: 'application/json',
    });
    expect(observations).toHaveLength(9);
    expect(pageErrors).toEqual([]);
    const mismatches = observations.filter(item =>
        Math.abs(item.gap - 16) > 0.5 ||
        item.bodyPaddingTop !== 0 ||
        item.firstContentPaddingTop !== cases.find(testCase => testCase.heading === item.heading)?.firstContentPaddingTop ||
        item.hasAction !== cases.find(testCase => testCase.heading === item.heading)?.hasAction ||
        item.bodyPaddingInlineStart !== (item.width < 768 ? 16 : 24) ||
        item.bodyPaddingBottom !== (item.width < 768 ? 16 : 24),
    );
    expect(mismatches, JSON.stringify(observations)).toEqual([]);
});

test('Finance report, entry, journal, reconciliation and period dialogs remain in the viewport without submitting', async ({ page }) => {
    const errors: string[] = [];
    const writes: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/api/v2/') && request.method() !== 'GET') writes.push(`${request.method()} ${url.pathname}`);
    });

    for (const { width, height } of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
        await page.setViewportSize({ width, height });

        await gotoDemo(page, '/s/shop-demo/finance/entries');
        await page.getByRole('button', { name: 'Tạo phiếu', exact: true }).click();
        let dialog = page.getByRole('dialog', { name: 'Phiếu thu chi mới' });
        await expect(dialog.getByRole('textbox', { name: /Số tiền/ })).toBeVisible();
        await expectDialogWithinViewport(page, dialog, width, height);
        await page.keyboard.press('Escape');

        await gotoDemo(page, '/s/shop-demo/finance/entries');
        await page.getByRole('table').getByRole('button', { name: 'Chi tiết', exact: true }).first().click();
        dialog = page.getByRole('dialog').first();
        await expect(dialog.getByRole('button', { name: 'Đóng', exact: true }).last()).toBeVisible();
        await expectDialogWithinViewport(page, dialog, width, height);

        await gotoDemo(page, '/s/shop-demo/finance/profit-loss');
        await page.getByRole('button', { name: 'Tạo giải thích mô phỏng', exact: true }).click();
        await expect(page.getByRole('region', { name: 'Giải thích báo cáo mô phỏng' })).toBeVisible();

        await gotoDemo(page, '/s/shop-demo/finance/journals');
        await page.getByRole('button', { name: 'Tạo bút toán nháp', exact: true }).click();
        dialog = page.getByRole('dialog', { name: 'Bút toán nháp' });
        await expect(dialog.getByRole('textbox', { name: 'Nợ' }).first()).toBeVisible();
        await expectDialogWithinViewport(page, dialog, width, height);
        await page.keyboard.press('Escape');

        await gotoDemo(page, '/s/shop-demo/finance/reconciliation');
        await page.getByRole('button', { name: 'Nhập bảng đối soát', exact: true }).click();
        dialog = page.getByRole('dialog', { name: 'Nhập bảng đối soát' });
        await expect(dialog.getByRole('textbox', { name: 'Mã đợt nhập duy nhất' })).toBeVisible();
        await expectDialogWithinViewport(page, dialog, width, height);
        await page.keyboard.press('Escape');

        await gotoDemo(page, '/s/shop-demo/finance/reconciliation?tab=cases');
        const match = page.getByRole('button', { name: 'Ghép giao dịch', exact: true }).first();
        if (await match.isVisible().catch(() => false)) {
            await match.click();
            dialog = page.getByRole('dialog', { name: 'Ghép giao dịch với công nợ' });
            await expect(dialog.getByRole('textbox', { name: 'Giao dịch ngoài hệ thống' })).toBeVisible();
            await expectDialogWithinViewport(page, dialog, width, height);
        }

        await gotoDemo(page, '/s/shop-demo/finance/debts-periods');
        const closePeriod = page.getByRole('button', { name: 'Kiểm & khóa kỳ', exact: true }).first();
        if (await closePeriod.isVisible().catch(() => false)) {
            await closePeriod.click();
            dialog = page.getByRole('dialog', { name: 'Khóa kỳ kế toán' });
            await expect(dialog.getByRole('button', { name: 'Xác nhận', exact: true })).toBeVisible();
            await expectDialogWithinViewport(page, dialog, width, height);
            await page.keyboard.press('Escape');
        }
        const reopenPeriod = page.getByRole('button', { name: 'Mở lại có phê duyệt', exact: true }).first();
        if (await reopenPeriod.isVisible().catch(() => false)) {
            await reopenPeriod.click();
            dialog = page.getByRole('dialog', { name: 'Mở lại kỳ đã khóa' });
            await expect(dialog.getByRole('textbox', { name: 'Mã phê duyệt đúng kỳ' })).toBeVisible();
            await expectDialogWithinViewport(page, dialog, width, height);
        }
    }

    expect(writes).toEqual([]);
    expect(errors).toEqual([]);
});
