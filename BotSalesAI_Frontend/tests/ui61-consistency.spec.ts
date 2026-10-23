import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

const manifest = JSON.parse(fs.readFileSync(path.resolve('../botsales-kit/contracts/route-manifest.json'), 'utf8')) as { routes: { id: string; path: string; title: string }[] };
const ids: Record<string, string> = { shopId: 'shop-demo', conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001', knowledgeId: 'k1', jobId: 'missing-job' };
const routePath = (id: string) => manifest.routes.find(route => route.id === id)!.path.replace(/:([A-Za-z]+)/g, (_, key: string) => ids[key] || 'missing');
let url = '', close: (() => Promise<void>) | undefined;
test.beforeAll(async () => { const server = await startDemoServer({ cacheIsolationKey: 'ui61-consistency' }); url = server.url; close = server.close; });
test.afterAll(async () => close?.());
async function ready(page: Page, id: string) {
    await page.goto(url + routePath(id));
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('main .MuiCircularProgress-root, main .MuiLinearProgress-root')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Không thể mở màn hình', exact: true })).toHaveCount(0);
}

test('UI61 A01 empty table content and actions fit the visible surface at 320/390/1440', async ({ page }, info) => {
    const observations = [];
    for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const id of ['R13','R25','R28','R31','R35','R38','R45','R49','R57']) {
            await ready(page, id);
            const empty = page.locator('main [role="status"]').filter({ hasText: /Chưa|Không có/ });
            expect(await empty.count(), id).toBeGreaterThan(0);
            for (const state of await empty.all()) {
                const geometry = await state.evaluate(node => {
                    const rect = node.getBoundingClientRect();
                    return { left: rect.left, right: rect.right, insideTable: !!node.closest('table'), overflow: node.scrollWidth > node.clientWidth + 1,
                        actions: [...node.querySelectorAll('button,a')].map(button => { const b = button.getBoundingClientRect(); return { left: b.left, right: b.right, height: b.height }; }) };
                });
                expect(geometry.insideTable, id).toBe(false);
                expect(geometry.overflow, id).toBe(false);
                expect(geometry.left).toBeGreaterThanOrEqual(0); expect(geometry.right).toBeLessThanOrEqual(width);
                for (const action of geometry.actions) { expect(action.left).toBeGreaterThanOrEqual(geometry.left); expect(action.right).toBeLessThanOrEqual(geometry.right); expect(action.height).toBeGreaterThanOrEqual(44); }
                observations.push({ id, width, ...geometry });
            }
        }
    }
    await ready(page, 'R07'); const table = page.locator('main [role="region"]').filter({ has: page.locator('table') }).first();
    await page.setViewportSize({ width: 320, height: 900 }); await table.focus();
    const before = await table.evaluate(node => node.scrollLeft); await page.keyboard.press('ArrowRight');
    await expect.poll(() => table.evaluate(node => node.scrollLeft)).toBeGreaterThan(before);
    await info.attach('empty-geometry.json', { body: JSON.stringify(observations), contentType: 'application/json' });
});

test('UI61 A02 status chips retain intrinsic width in headers and privacy fields', async ({ page }, info) => {
    const observations = [];
    for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const id of ['R22','R24','R26','R30','R35','R51']) {
            await ready(page, id);
            const chips = await page.locator('main .MuiChip-root').evaluateAll(nodes => nodes.filter(node => !node.closest('td')).map(node => {
                const clone = node.cloneNode(true) as HTMLElement;
                Object.assign(clone.style, { position: 'fixed', visibility: 'hidden', width: 'max-content', maxWidth: node.parentElement!.clientWidth + 'px' });
                node.parentElement!.append(clone); const natural = clone.getBoundingClientRect().width; clone.remove();
                return { text: node.textContent, width: node.getBoundingClientRect().width, natural };
            }));
            expect(chips.length, id).toBeGreaterThan(0);
            for (const chip of chips) expect(chip.width, `${id} ${chip.text}`).toBeLessThanOrEqual(chip.natural + 1);
            observations.push({ id, width, chips });
        }
    }
    await info.attach('status-geometry.json', { body: JSON.stringify(observations), contentType: 'application/json' });
});

test('UI61 A03 delegation notice and actions share one header boundary and mobile/desktop inset', async ({ page }) => {
    for (const width of [320,390,1440]) {
        await page.setViewportSize({ width, height: 900 }); await ready(page, 'R38');
        const panel = page.getByRole('heading', { name: 'Ủy quyền gửi đơn mua', exact: true }).locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]');
        const geometry = await panel.evaluate(node => {
            const header = node.firstElementChild!, notice = node.querySelector('.MuiAlert-root')!, action = [...node.querySelectorAll('button')].find(button => button.textContent === 'Tạo ủy quyền có giới hạn')!;
            const p = node.getBoundingClientRect(), n = notice.getBoundingClientRect();
            const bottom = Math.max(...[...header.children].map(child => child.getBoundingClientRect().bottom));
            return { left: n.left - p.left - 1, right: p.right - n.right - 1, headerGap: n.top - bottom, actionLeft: action.getBoundingClientRect().left - n.left };
        });
        expect(geometry.left).toBe(width < 768 ? 12 : 16); expect(geometry.right).toBe(width < 768 ? 12 : 16);
        // Firefox DOMRect coordinates can differ by <0.001px after long-page layout.
        expect(geometry.headerGap).toBeCloseTo(12,3); expect(geometry.actionLeft).toBe(0);
    }
});

test('UI61 A04 operational cards and outlined form lines use card radius while dialogs keep dialog radius', async ({ page }) => {
    for (const width of [390,1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const id of ['R02','R39','R52']) {
            await ready(page, id);
            const surfaces = await page.locator('main').evaluate(node => [...node.querySelectorAll('*')].filter(el => {
                const s = getComputedStyle(el); return s.borderStyle === 'solid' && parseFloat(s.borderWidth) > 0 && !el.closest('a,button,input,fieldset,.MuiInputBase-root,.MuiAvatar-root');
            }).map(el => ({ radius: getComputedStyle(el).borderTopLeftRadius, tag: el.tagName })).filter(el => el.radius !== '0px'));
            expect(surfaces.length).toBeGreaterThan(0);
            for (const surface of surfaces) expect(surface.radius, `${id} ${surface.tag}`).toBe('12px');
        }
        for (const id of ['R46','R47']) {
            await ready(page, id); await page.getByRole('button', { name: id === 'R46' ? 'Tạo đơn mua' : 'Tạo phiếu nhận', exact: true }).click();
            const dialog = page.getByRole('dialog'); await expect(dialog).toHaveCSS('border-top-left-radius','16px');
            if (id === 'R47') {
                await dialog.getByRole('combobox', { name: 'Đơn mua đã xác nhận', exact:true }).click();
                await page.getByRole('option', { name: 'seed-purchaseorder-10046',exact:true }).click();
            }
            await expect.poll(() => dialog.locator('[data-ui-composition="form-fields"]').evaluateAll(nodes => nodes.filter(node => getComputedStyle(node).borderStyle === 'solid').map(node => getComputedStyle(node).borderTopLeftRadius))).toEqual(['12px']);
            await page.keyboard.press('Escape');
            const discard=page.getByRole('button',{name:'Bỏ thay đổi',exact:true});
            if (await discard.isVisible()) await discard.click();
            await expect(page.getByRole('dialog')).toHaveCount(0);
        }
    }
});

test('UI61 A05 Pager count and three actions reflow consistently with 44px targets', async ({ page }, info) => {
    const observations = [];
    for (const width of [320,390,768,1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const id of ['R07','R39']) {
            await ready(page, id);
            const first = page.getByRole('button', { name: 'Đầu danh sách', exact: true });
            const geometry = await first.evaluate(node => {
                const actions = node.parentElement!, pager = actions.parentElement!, count = pager.firstElementChild!, c = count.getBoundingClientRect(), a = actions.getBoundingClientRect();
                return { direction: getComputedStyle(pager).flexDirection, countInset: c.left - pager.closest('.MuiPaper-root')!.getBoundingClientRect().left - 1, gap: a.top - c.bottom, countLines: c.height, buttons: [...actions.children].map(b => { const r = b.getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right, width: r.width, height: r.height }; }) };
            });
            expect(geometry.direction).toBe(width < 600 ? 'column' : 'row');
            expect(geometry.countInset).toBe(12);
            if (width < 600) { expect(geometry.gap).toBe(8); expect(new Set(geometry.buttons.map(b => b.top)).size).toBe(1); }
            for (const b of geometry.buttons) { expect(b.height).toBeGreaterThanOrEqual(44); expect(b.left).toBeGreaterThanOrEqual(0); expect(b.right).toBeLessThanOrEqual(width); }
            observations.push({ id, width, ...geometry });
        }
    }
    await info.attach('pager-geometry.json', { body: JSON.stringify(observations), contentType: 'application/json' });
});

for (const width of [390,1440]) test(`UI61 all 61 canonical routes retain loaded layout at ${width}px`, async ({ page }, info) => {
    test.setTimeout(300_000); const errors: string[] = [], observations = [];
    page.on('pageerror', error => errors.push(error.message)); await page.setViewportSize({ width, height: 900 });
    for (const route of manifest.routes) {
        await ready(page, route.id);
        const geometry = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, title: document.querySelector('main h1')?.textContent, emptyStates: document.querySelectorAll('main [role="status"]').length }));
        expect(geometry.document, route.id).toBeLessThanOrEqual(geometry.viewport);
        observations.push({ id: route.id, state: ['R14','R36','R61'].includes(route.id) ? 'missing-fixture-state' : 'seed-content', ...geometry });
    }
    expect(observations).toHaveLength(61); expect(errors).toEqual([]);
    await info.attach(`routes-${width}.json`, { body: JSON.stringify(observations), contentType:'application/json' });
});
