import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { startDemoServer } from './session/demo-server.mjs';
import { ownedLabelGeometry } from './design/owned-label-geometry.mjs';

let url = '';
let close: (() => Promise<void>) | undefined;
test.beforeAll(async () => { const server = await startDemoServer({ cacheIsolationKey: 'component-layout' }); url = server.url; close = server.close; });
test.afterAll(async () => close?.());
test.beforeEach(async ({ page }) => { page.setDefaultTimeout(15000); page.on('dialog', dialog => { void dialog.accept(); }); });
async function ready(page: Page, route: string) {
    await page.goto(url + '/s/shop-demo/' + route);
    await expect(page.locator('main h1')).toBeVisible();
    await page.waitForFunction(() => !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'));
}
async function intrinsic(button: Locator) {
    return button.evaluate(node => {
        const clone = node.cloneNode(true) as HTMLElement;
        Object.assign(clone.style, { position: 'fixed', visibility: 'hidden', height: 'auto', width: node.getBoundingClientRect().width + 'px', alignSelf: 'start' });
        node.parentElement!.append(clone);
        const result = { actual: node.getBoundingClientRect().height, natural: clone.getBoundingClientRect().height };
        clone.remove(); return result;
    });
}
async function reflow(page: Page, width: number) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
}
async function fixture(page: Page, caseId: string) {
    const moduleUrl = '/@fs/' + path.resolve('tests/design/component-layout-fixture.tsx').replaceAll('\\', '/');
    const expected = await page.evaluate(async ({ moduleUrl, caseId }) => {
        const container = document.createElement('section');
        document.querySelector('main')!.replaceChildren(container);
        return (await import(/* @vite-ignore */ moduleUrl)).mountComponentFixture(container, caseId);
    }, { moduleUrl, caseId });
    await expect(page.getByRole('button', { name: 'Tiếp tục', exact: true })).toBeVisible();
    return expected;
}
test('A01 order lines keep intrinsic remove actions with clean and invalid quantities', async ({ page }, info) => {
    const observations = [];
    for (const width of [320, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await ready(page, 'orders/new');
        await expect(page.getByRole('button', { name: 'Bỏ dòng 1', exact: true })).toBeVisible();
        for (const quantity of ['1', '0']) {
            await page.getByRole('textbox', { name: 'Số lượng', exact: true }).fill(quantity);
            const geometry = await intrinsic(page.getByRole('button', { name: 'Bỏ dòng 1', exact: true }));
            observations.push({ width, quantity, ...geometry });
            expect(geometry.actual).toBeLessThanOrEqual(geometry.natural + 1);
            await reflow(page, width);
        }
        await page.getByRole('button', { name: 'Thêm dòng', exact: true }).click();
        await expect(page.getByRole('combobox', { name: 'Sản phẩm 2', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Bỏ dòng 1', exact: true }).click();
        await expect(page.getByRole('combobox', { name: 'Sản phẩm 2', exact: true })).toHaveCount(0);
    }
    await info.attach('order-line-geometry', { body: JSON.stringify(observations), contentType: 'application/json' });
});

test('A02 product editors align category and status faces independently from lookup metadata', async ({ page }, info) => {
    const observations = [];
    for (const route of ['products/new', 'products/p1']) for (const width of [320, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await ready(page, route);
        await expect(page.getByRole('textbox', { name: 'Tìm danh mục', exact: true })).toBeVisible();
        await expect(page.getByText('Đã tải 3 lựa chọn', { exact: true })).toBeVisible();
        const geometry = { category: (await page.getByRole('combobox', { name: /^Danh mục/ }).boundingBox())!, status: (await page.locator('main').getByRole('combobox', { name: /^Trạng thái/ }).boundingBox())! };
        if (width >= 768) expect(Math.abs(geometry.category.y - geometry.status.y)).toBeLessThanOrEqual(1);
        else expect(geometry.status.y).toBeGreaterThan(geometry.category.y);
        await reflow(page, width);
        await page.getByRole('textbox', { name: 'Tên sản phẩm', exact: true }).fill('Bản nháp cần giữ');
        await page.getByRole('textbox', { name: 'Tìm danh mục', exact: true }).fill('Không có danh mục này');
        await expect(page.getByText('Không tìm thấy danh mục phù hợp.', { exact: true })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Tên sản phẩm', exact: true })).toHaveValue('Bản nháp cần giữ');
        const category = await page.getByRole('combobox', { name: /^Danh mục/ }).boundingBox();
        const status = await page.locator('main').getByRole('combobox', { name: /^Trạng thái/ }).boundingBox();
        if (width >= 768) expect(Math.abs(category!.y - status!.y)).toBeLessThanOrEqual(1);
        observations.push({ route, width, geometry });
    }
    await info.attach('product-editor-faces', { body: JSON.stringify(observations), contentType: 'application/json' });
});

test('Shared outlined labels focus empty and populated native controls', async ({ page }) => {
    await ready(page, 'products/new');
    for (const labelText of ['Tên sản phẩm', 'Mô tả dùng cho AI tư vấn']) {
        const control = page.getByRole('textbox', { name: labelText, exact: true });
        const label = control.locator('xpath=ancestor::*[contains(@class,"MuiTextField-root")]').locator('label');
        for (const value of ['', 'Bản nháp được giữ khi click nhãn']) {
            await control.fill(value);
            await page.locator('main h1').click();
            await label.click();
            await expect(control).toBeFocused();
            await expect(control).toHaveValue(value);
        }
    }
});

test('A02 variant fields retain readable widths when text doubles', async ({ page }, info) => {
    const observations = [];
    for (const route of ['products/new', 'products/p1']) for (const width of [320, 390, 1280, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await ready(page, route);
        const name = page.getByRole('textbox', { name: 'Tên / màu / kích cỡ', exact: true }).first();
        await expect(name).toBeVisible();
        await name.fill('Bản nháp biến thể cần giữ');
        // Deterministic layout stress; real Firefox text-only zoom is a separate gate.
        await page.evaluate(() => {
            const sizes = [...document.querySelectorAll<HTMLElement>('*')].map(element => [element, parseFloat(getComputedStyle(element).fontSize)] as const);
            for (const [element, size] of sizes) if (Number.isFinite(size)) element.style.fontSize = `${size * 2}px`;
        });
        const labels = (await page.evaluate(ownedLabelGeometry, true)).filter(label => ['SKU', 'Tên / màu / kích cỡ', 'Giá bán (VND)'].includes(label.label));
        await info.attach(`variant-fields-${route.replace('/', '-')}-${width}`, { body: JSON.stringify(labels), contentType: 'application/json' });
        expect(labels.length).toBeGreaterThanOrEqual(3);
        expect(labels.filter(label => label.overlaps || label.outsideField)).toEqual([]);
        for (const label of labels) expect(label.fieldBounds.right - label.fieldBounds.left).toBeGreaterThanOrEqual(120);
        await reflow(page, width);
        await expect(name).toHaveValue('Bản nháp biến thể cần giữ');
        const initial = await page.getByRole('textbox', { name: 'Tên / màu / kích cỡ', exact: true }).count();
        await page.getByRole('button', { name: 'Thêm biến thể', exact: true }).click();
        await expect(page.getByRole('textbox', { name: 'Tên / màu / kích cỡ', exact: true })).toHaveCount(initial + 1);
        await page.getByRole('button', { name: `Xóa biến thể ${initial + 1}`, exact: true }).click();
        await expect(page.getByRole('textbox', { name: 'Tên / màu / kích cỡ', exact: true })).toHaveCount(initial);
        await expect(name).toHaveValue('Bản nháp biến thể cần giữ');
        observations.push({ route, width, labels });
    }
    await info.attach('variant-field-doubled-text', { body: JSON.stringify(observations), contentType: 'application/json' });
});

test('A03 import mapping preserves natural remove actions and editable mappings', async ({ page }, info) => {
    const observations = [];
    for (const width of [320, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 }); await ready(page, 'imports');
        const remove = page.locator('main').getByRole('button', { name: 'Bỏ', exact: true });
        await expect(remove).toHaveCount(5);
        for (const button of await remove.all()) {
            const geometry = await intrinsic(button);
            expect(geometry.actual).toBeLessThanOrEqual(geometry.natural + 1);
            observations.push({ width, ...geometry });
        }
        await page.getByRole('textbox', { name: 'Tên cột trong tệp', exact: true }).first().fill('Mã SKU đã sửa');
        await remove.last().click(); await expect(remove).toHaveCount(4);
        await page.getByRole('button', { name: 'Thêm cột', exact: true }).click(); await expect(remove).toHaveCount(5);
        await expect(page.getByRole('textbox', { name: 'Tên cột trong tệp', exact: true }).first()).toHaveValue('Mã SKU đã sửa');
        await reflow(page, width);
    }
    await info.attach('import-mapping-geometry', { body: JSON.stringify(observations), contentType: 'application/json' });
});

test('A04 full precision money wraps outside tables and remains unbroken in the named scroll region', async ({ page }) => {
    for (const width of [320, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 }); await ready(page, 'products');
        const expected = await fixture(page, 'money');
        const amount = page.getByText(expected.money, { exact: true });
        await expect(amount).toHaveCount(2);
        await expect(page.getByText(expected.negative, { exact: true })).toBeVisible();
        expect(await amount.first().evaluate(node => getComputedStyle(node).whiteSpace)).toBe('normal');
        expect(await amount.last().evaluate(node => getComputedStyle(node).whiteSpace)).toBe('nowrap');
        const clipping = await page.getByText(expected.negative, { exact: true }).evaluate(node => {
            const range = document.createRange(); range.selectNodeContents(node);
            const parent = node.parentElement!.getBoundingClientRect();
            return [...range.getClientRects()].some(rect => rect.left < parent.left - 1 || rect.right > parent.right + 1);
        });
        expect(clipping).toBe(false); await reflow(page, width);
        const table = page.getByRole('region', { name: 'Tiền trong bảng', exact: true });
        const overflow = await table.evaluate(node => node.scrollWidth > node.clientWidth);
        if (width === 320) expect(overflow).toBe(true);
        await table.focus(); const before = await table.evaluate(node => node.scrollLeft);
        await page.keyboard.press('ArrowRight');
        if (overflow) await expect.poll(() => table.evaluate(node => node.scrollLeft)).toBeGreaterThan(before);
        else expect(await table.evaluate(node => node.scrollLeft)).toBe(before);
        expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
    }
});

test('A05 status height follows its own label while long labels remain fully readable', async ({ page }) => {
    for (const width of [320, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 }); await ready(page, 'products'); await fixture(page, 'status');
        const chip = page.locator('main .MuiChip-root').first();
        const geometry = await chip.evaluate(node => {
            const parent = node.parentElement!, text = node.querySelector('.MuiChip-label')!;
            return { actual: node.getBoundingClientRect().height, minimum: parseFloat(getComputedStyle(node).minHeight), label: text.getBoundingClientRect().height, parent: parent.getBoundingClientRect().height };
        });
        expect(geometry.actual).toBeLessThanOrEqual(Math.max(geometry.minimum, geometry.label) + 1);
        const intrinsicSize = await intrinsic(chip);
        expect(geometry.actual).toBeLessThanOrEqual(intrinsicSize.natural + 1);
        const long = page.locator('main .MuiChip-label').last();
        await expect(long).toHaveText('Chưa xác định');
        await expect(long.locator('..')).toHaveAttribute('title','Trạng thái chưa biết ' + 'A'.repeat(120));
        expect(await long.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
        await reflow(page, width);
        expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
    }
});

test('A06 Empty wraps unbroken reference text and retains its keyboard action', async ({ page }) => {
    for (const width of [320, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 }); await ready(page, 'products'); await fixture(page, 'empty');
        await expect(page.getByRole('status')).toContainText('Mã tham chiếu: ' + 'A'.repeat(120));
        const text = page.getByText('Mã tham chiếu: ' + 'A'.repeat(120), { exact: true });
        expect(await text.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
        await reflow(page, width);
        const action = page.getByRole('button', { name: 'Tiếp tục', exact: true });
        await action.focus(); await expect(action).toBeFocused(); await page.keyboard.press('Enter');
        expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
    }
});

test('A07 canonical order address selection exposes full text and edit lines retain intrinsic actions', async ({ page }) => {
    for (const width of [320, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 }); await ready(page, 'orders');
        const moduleUrl = '/@fs/' + path.resolve('tests/design/component-layout-fixture.tsx').replaceAll('\\', '/');
        const expected = await page.evaluate(async moduleUrl => (await import(/* @vite-ignore */ moduleUrl)).installReadonlyAddressFixture(), moduleUrl);
        await page.locator('main a[href="/s/shop-demo/orders/DH-1001"]').click();
        await page.getByRole('button', { name: 'Sửa đơn nháp', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Sửa đơn nháp', exact: true }); await expect(dialog).toBeVisible();
        const address = dialog.getByRole('group', { name: 'Thông tin địa chỉ giao hàng', exact: true });
        await expect(address).toBeVisible();
        await expect(dialog.getByRole('combobox', { name: /^Địa chỉ giao hàng(?: |$)/ })).toBeVisible();
        await expect(dialog.getByRole('combobox', { name: /^Thanh toán/ })).toHaveCount(0);
        await expect(dialog.getByRole('group', { name: 'Thanh toán', exact: true })).toContainText('Thu khi giao (COD)');
        const addressText = address.locator('p'); await expect(addressText).toHaveText(expected);
        expect(await addressText.evaluate(node => node.scrollWidth <= node.clientWidth + 1 && getComputedStyle(node).textOverflow !== 'ellipsis')).toBe(true);
        const original = await addressText.textContent();
        for (const quantity of ['1', '0']) {
            await dialog.getByRole('textbox', { name: 'Số lượng', exact: true }).first().fill(quantity);
            const geometry = await intrinsic(dialog.getByRole('button', { name: 'Bỏ dòng 1', exact: true }));
            expect(geometry.actual).toBeLessThanOrEqual(geometry.natural + 1);
            await expect(addressText).toHaveText(original!); await reflow(page, width);
        }
        expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual([]);
        const variant = dialog.getByRole('combobox', { name: /^Sản phẩm 1/ }); await variant.click();
        const option = page.getByRole('option', { selected: true }); await expect(option).toBeVisible();
        await option.evaluate(async node => { const paper = node.closest('.MuiPaper-root')!; await Promise.allSettled(paper.getAnimations().map(animation => animation.finished)); });
        expect(await option.evaluate(node => {
            const paper = node.closest('.MuiPaper-root')!.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(node);
            return getComputedStyle(node).whiteSpace === 'normal' && [...range.getClientRects()].every(rect => rect.left >= paper.left - 1 && rect.right <= paper.right + 1);
        })).toBe(true);
        await page.keyboard.press('Escape'); await expect(page.getByRole('listbox')).toHaveCount(0);
    }
});
