import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let origin = '';
let closeDemo: (() => Promise<void>) | undefined;
test.beforeAll(async () => { const server = await startDemoServer(); origin = server.url; closeDemo = server.close; });
test.afterAll(async () => closeDemo?.());

async function ready(page: Page, route: string, width = 1920) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(origin + '/s/shop-demo/' + route);
    await page.locator('main h1').waitFor({ state: 'visible' });
    await page.waitForFunction(() => !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'));
}
async function clientNavigate(page: Page, route: string) {
    await page.evaluate(route => { history.pushState({}, '', route); dispatchEvent(new PopStateEvent('popstate', { state: history.state })); }, route);
}
async function gridGeometry(page: Page) {
    return page.locator('main [data-ui-composition="section-grid"]').first().evaluate(grid => {
        const rect = grid.getBoundingClientRect();
        return { width: rect.width, columns: getComputedStyle(grid).gridTemplateColumns, gap: parseFloat(getComputedStyle(grid).gap), children: [...grid.children].map(child => { const c = child.getBoundingClientRect(); return { x: c.x, y: c.y, width: c.width, right: c.right }; }) };
    });
}
async function documentFits(page: Page, width: number) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
}

test('W01 AI single connection fills its collection at breakpoint edges and wide viewports', async ({ page }, info) => {
    const observed = [];
    for (const width of [320, 768, 1279, 1280, 1440, 1920]) {
        await ready(page, 'integrations/ai', width);
        const geometry = await gridGeometry(page);
        expect(geometry.children).toHaveLength(1);
        expect(geometry.children[0].width).toBeCloseTo(geometry.width, 0);
        await documentFits(page, width);
        observed.push({ width, ...geometry });
    }
    await info.attach('W01-single-widths', { body: JSON.stringify(observed), contentType: 'application/json' });
});

test('W01 AI keeps two-column collection for two/three items and refetch preserves the new count', async ({ page }, info) => {
    await ready(page, 'integrations/ai');
    const observed = [];
    for (let count = 2; count <= 3; count++) {
        await page.getByRole('button', { name: 'Thêm kết nối AI', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Kết nối AI mới', exact: true });
        await dialog.getByLabel('Tên kết nối', { exact: true }).fill(`Kết nối bố cục ${count}`);
        await dialog.getByLabel('Model ID được adapter hỗ trợ', { exact: true }).fill('synthetic-model');
        await dialog.getByLabel('Khóa API', { exact: true }).fill('demo-width-key');
        await dialog.getByRole('button', { name: 'Lưu cấu hình', exact: true }).click();
        await expect(dialog).not.toBeVisible();
        await expect(page.locator('main [data-ui-composition="section-grid"] > .MuiPaper-root')).toHaveCount(count);
        const geometry = await gridGeometry(page);
        expect(geometry.children[0].width * 2 + geometry.gap).toBeCloseTo(geometry.width, 0);
        expect(geometry.children[1].y).toBeCloseTo(geometry.children[0].y, 0);
        if (count === 3) expect(geometry.children[2].y).toBeGreaterThan(geometry.children[0].y);
        observed.push({ count, ...geometry });
    }
    await info.attach('W01-multiple-widths', { body: JSON.stringify(observed), contentType: 'application/json' });
});

test('W01 AI empty result keeps one accessible create action and no empty grid', async ({ page }) => {
    await ready(page, 'overview');
    await page.evaluate(async () => { const mock = await import('/src/mocks/service.ts'); mock.setFault('empty_persistent'); });
    await clientNavigate(page, '/s/shop-demo/integrations/ai');
    await expect(page.locator('main').getByRole('status').filter({ hasText: 'Chưa có kết nối AI.' })).toBeVisible();
    await expect(page.locator('main').getByRole('button', { name: 'Thêm kết nối AI', exact: true })).toHaveCount(1);
    await expect(page.locator('main [data-ui-composition="section-grid"]')).toHaveCount(0);
});

for (const count of [0, 1, 2, 3]) test(`W01 workspace collection handles ${count} visible shops`, async ({ page }, info) => {
    const observations = [];
    for (const width of [320, 768, 1280, 1920]) {
        await ready(page, 'overview', width);
        // Preserve schema-complete seed objects, only vary this test's visible shop list.
        await page.evaluate(async count => {
            const store = await import('/src/mocks/database.ts');
            const state = structuredClone(store.db);
            const shop = state.shops[0], membership = state.members[0];
            state.shops = Array.from({ length: count }, (_, index) => ({ ...shop, id: index ? `shop-width-${index}` : shop.id, name: `Cửa hàng bố cục ${index + 1}` }));
            state.members = state.shops.map((shop, index) => ({ ...membership, id: `member-width-${index}`, shopId: shop.id }));
            store.restoreDb(state);
        }, count);
        await clientNavigate(page, '/workspaces');
        await expect(page.getByRole('heading', { name: 'Chọn cửa hàng', exact: true })).toBeVisible();
        await page.waitForFunction(() => !document.querySelector('main .MuiCircularProgress-root'));
        if (!count) {
            await expect(page.locator('main').getByRole('status').filter({ hasText: 'Chưa có cửa hàng.' })).toBeVisible();
            await expect(page.locator('main').getByRole('link', { name: 'Tạo cửa hàng', exact: true })).toHaveCount(1);
            await expect(page.locator('main [data-ui-composition="section-grid"]')).toHaveCount(0);
        } else {
            const geometry = await gridGeometry(page);
            expect(geometry.children).toHaveLength(count);
            const columns = count === 1 || width < 768 ? 1 : 2;
            expect(geometry.children[0].width * columns + geometry.gap * (columns - 1)).toBeCloseTo(geometry.width, 0);
            observations.push({ count, width, ...geometry });
        }
        await documentFits(page, width);
    }
    await info.attach('W01-workspaces', { body: JSON.stringify(observations), contentType: 'application/json' });
});

test('W02 full-width form groups fill their panel and retain input/mapping/shipping behavior', async ({ page }, info) => {
    const observed = [];
    for (const width of [320, 768, 1280, 1920]) for (const route of ['settings/shop', 'imports', 'shipments']) {
        await ready(page, route, width);
        if (route === 'shipments') await page.getByRole('button', { name: 'Mở bản xem thử phí giao hàng', exact: true }).click();
        const panel = page.locator('main .MuiPaper-root').filter({ has: page.getByRole('heading', { name: route === 'settings/shop' ? 'Thông tin cơ sở' : route === 'imports' ? 'Tệp & ánh xạ' : 'Xem thử phí và vùng giao hàng', exact: true }) }).first();
        const geometry = await panel.locator('[data-ui-composition="form-fields"]').first().evaluate(form => {
            const body = form.closest('.MuiPaper-root')!.lastElementChild!;
            const style = getComputedStyle(body);
            return { width: form.getBoundingClientRect().width, available: body.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), maxWidth: getComputedStyle(form).maxWidth };
        });
        expect(geometry.width).toBeCloseTo(geometry.available, 0);
        expect(geometry.maxWidth).toBe('none');
        if (route === 'settings/shop') {
            await page.getByRole('textbox', { name: 'Tên cửa hàng', exact: true }).fill('Tên cửa hàng cần giữ');
            if (width < 1280) await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
            await page.getByRole('link', { name: 'Sản phẩm', exact: true }).click();
            await expect(page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?', exact: true })).toBeVisible();
            await page.getByRole('button', { name: 'Tiếp tục chỉnh sửa', exact: true }).click();
            await expect(page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?', exact: true })).toHaveCount(0);
            if (width < 1280) {
                await page.keyboard.press('Escape');
                await expect(page.locator('.MuiDrawer-modal')).toHaveCount(0);
            }
            await expect(page.getByRole('textbox', { name: 'Tên cửa hàng', exact: true })).toHaveValue('Tên cửa hàng cần giữ');
        } else if (route === 'imports') {
            await page.getByRole('textbox', { name: 'Tên cột trong tệp', exact: true }).first().fill('sku-width');
            await page.locator('main').getByRole('button', { name: 'Bỏ', exact: true }).last().click();
            await page.getByRole('button', { name: 'Thêm cột', exact: true }).click();
            await expect(page.getByRole('textbox', { name: 'Tên cột trong tệp', exact: true }).first()).toHaveValue('sku-width');
        } else {
            await page.getByRole('checkbox', { name: 'Có địa chỉ giao hàng mẫu', exact: true }).uncheck();
            await expect(page.getByText('Thiếu địa chỉ giao hàng; chưa thể xác định vùng hoặc hiển thị phí.', { exact: true })).toBeVisible();
        }
        await documentFits(page, width);
        observed.push({ route, width, ...geometry });
    }
    await info.attach('W02-panel-form-widths', { body: JSON.stringify(observed), contentType: 'application/json' });
});

test('W03 notification protection notice occupies the full page row after the two panes', async ({ page }, info) => {
    const observed = [];
    for (const width of [320, 768, 1280, 1920]) {
        await ready(page, 'notifications/devices', width);
        const geometry = await page.getByTestId('notification-protection-note').evaluate(notice => {
            const grid = document.querySelector('main [data-ui-composition="section-grid"]')!;
            const n = notice.getBoundingClientRect(), g = grid.getBoundingClientRect();
            return { noticeWidth: n.width, gridWidth: g.width, noticeY: n.y, gridBottom: g.bottom, gap: n.y - g.bottom, insideGrid: grid.contains(notice), rhythm: notice.parentElement?.getAttribute('data-ui-rhythm') };
        });
        expect(geometry.insideGrid).toBe(false);
        expect(geometry.noticeWidth).toBeCloseTo(geometry.gridWidth, 0);
        expect(geometry.rhythm).toBe('section');
        expect(geometry.gap).toBeCloseTo(16, 0);
        await documentFits(page, width);
        observed.push({ width, ...geometry });
    }
    await info.attach('W03-notice-widths', { body: JSON.stringify(observed), contentType: 'application/json' });
});

test('W04 detail rows stay atomic in divided rhythm and plain containers', async ({ page }, info) => {
    const observed = [];
    for (const width of [320, 768, 1280, 1920]) {
        await ready(page, 'integrations/ai', width);
        const geometry = await page.locator('main').evaluate(main => {
            const group = main.querySelector('[data-ui-composition="surface-content"][data-ui-rhythm="dividedRows"]')!;
            const slots = [...group.children];
            return { rhythm: group.getAttribute('data-ui-rhythm'), gap: parseFloat(getComputedStyle(group).gap), childCount: slots.length, slots: slots.map(slot => ({ text: slot.textContent, rowHeight: slot.firstElementChild?.getBoundingClientRect().height, height: slot.getBoundingClientRect().height, y: slot.getBoundingClientRect().y, separators: slot.querySelectorAll('.MuiDivider-root').length })), plain: [...main.querySelectorAll('[data-ui-detail-line]')].filter(slot => slot.parentElement?.getAttribute('data-ui-composition') !== 'surface-content').slice(0, 4).map(slot => ({ height: slot.getBoundingClientRect().height, rowHeight: slot.firstElementChild!.getBoundingClientRect().height, separatorHeight: slot.lastElementChild!.getBoundingClientRect().height })) };
        });
        expect(geometry.childCount).toBe(7);
        expect(geometry.rhythm).toBe('dividedRows');
        expect(geometry.gap).toBe(0);
        for (let index = 0; index < geometry.slots.length; index++) {
            expect(geometry.slots[index].separators).toBe(1);
            if (index) expect(geometry.slots[index].y - geometry.slots[index - 1].y - geometry.slots[index - 1].height).toBeCloseTo(0, 0);
        }
        expect(geometry.plain).toHaveLength(4);
        for (const row of geometry.plain) expect(row.height).toBeCloseTo(row.rowHeight + row.separatorHeight, 0);
        await documentFits(page, width);
        observed.push({ width, ...geometry });
    }
    await info.attach('W04-logical-detail-rows', { body: JSON.stringify(observed), contentType: 'application/json' });
});
