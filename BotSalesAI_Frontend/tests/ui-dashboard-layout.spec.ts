import path from 'node:path';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

test('Shared consolidation Dashboard primary link respects all eight permission tuples and native anchor interactions', async ({ page }, info) => {
    await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
    await expect(page.locator('main h1')).toBeVisible();
    const fixtureUrl = '/@fs/' + path.resolve('tests/design/shared-consolidation-fixture.ts').replaceAll('\\', '/');
    const observations = [];
    for (const ops of [false, true]) for (const orders of [false, true]) for (const create of [false, true]) {
        const tuple = { ops, orders, create };
        await page.evaluate(async ({ url, tuple }) => (await import(/* @vite-ignore */ url)).installDashboardPermissions(tuple), { url: fixtureUrl, tuple });
        const refreshed = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v2/session');
        await page.evaluate(() => window.dispatchEvent(new Event('online')));
        const response = await refreshed;
        expect(response.status()).toBe(200);
        const membership = (await response.json()).data.memberships.find((row: { shopId: string }) => row.shopId === 'shop-demo');
        expect(membership.permissions.includes('operations.read')).toBe(ops);
        expect(membership.permissions.includes('orders.read')).toBe(orders);
        expect(membership.permissions.includes('orders.write')).toBe(create);
        const primary = page.getByRole('link', { name: /^Xem (việc cần làm|đơn hàng)$/ });
        const createLink = page.getByRole('link', { name: 'Tạo đơn hàng', exact: true });
        await expect(primary).toHaveCount(Number(ops || orders));
        await expect(createLink).toHaveCount(Number(create));
        await page.waitForFunction(() => !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'));
        if (ops || orders) {
            const label = ops ? 'Xem việc cần làm' : 'Xem đơn hàng';
            const href = `/s/shop-demo/${ops ? 'operations' : 'orders'}`;
            await expect(primary).toHaveText(label);
            await expect(primary).toHaveAttribute('href', href);
            await primary.focus(); await expect(primary).toBeFocused();
            const style = await primary.evaluate(element => {
                const s = getComputedStyle(element), r = element.getBoundingClientRect();
                return { tag: element.tagName, height: r.height, outline: s.outlineStyle, outlineWidth: parseFloat(s.outlineWidth), background: s.backgroundColor };
            });
            expect(style.tag).toBe('A'); expect(style.height).toBeGreaterThanOrEqual(44);
            expect(style.outline).not.toBe('none'); expect(style.outlineWidth).toBeGreaterThanOrEqual(2);
            await primary.hover();
            await expect.poll(() => primary.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(style.background);
            if (create) { await primary.press('Tab'); await expect(createLink).toBeFocused(); }
        }
        if (create) { await expect(createLink).toHaveAttribute('href', '/s/shop-demo/orders/new'); expect((await createLink.boundingBox())!.height).toBeGreaterThanOrEqual(44); }
        observations.push({ ...tuple, primary: ops ? 'operations' : orders ? 'orders' : null, createVisible: create });
    }
    expect(observations).toHaveLength(8);
    expect((await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await info.attach('dashboard-permission-tuples', { body: JSON.stringify(observations), contentType: 'application/json' });
});

test('Shared consolidation Dashboard leaves native modified-click navigation to the browser', async ({ page }) => {
    const session = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname === '/api/v2/session');
    const dashboard = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname === '/api/v2/shops/shop-demo/dashboard');
    await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
    const current = await session; expect(current.status()).toBe(200);
    const membership = (await current.json()).data.memberships.find((row: { shopId: string }) => row.shopId === 'shop-demo');
    expect(membership.permissions).toEqual(expect.arrayContaining(['operations.read', 'orders.read', 'orders.write']));
    expect((await dashboard).status()).toBe(200);
    await expect(page.getByText('Dữ liệu cập nhật', { exact: false })).toBeVisible();
    const primary = page.getByRole('link', { name: 'Xem việc cần làm', exact: true });
    const href = '/s/shop-demo/operations';
    await expect(primary).toHaveAttribute('href', href);
    await page.evaluate(() => {
        const root = document.documentElement;
        root.removeAttribute('data-modified-click-default-prevented');
        document.addEventListener('click', event => {
            if (event instanceof MouseEvent && (event.ctrlKey || event.metaKey)) {
                root.dataset.modifiedClickDefaultPrevented = String(event.defaultPrevented);
            }
        }, { once: true });
    });
    await primary.click({ modifiers: ['Control'] });
    await expect(page.locator('html')).toHaveAttribute('data-modified-click-default-prevented', 'false');
    expect(new URL(page.url()).pathname).toBe('/s/shop-demo/overview');
});

test('dashboard hierarchy, CTA targets, and page width hold across supported breakpoints', async ({ page }) => {
    await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
    await expect(page.getByRole('heading', { name: 'Tình hình hiện tại', exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Dữ liệu cập nhật', { exact: false })).toBeVisible();

    for (const width of [320, 390, 768, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.getByRole('heading', { name: 'Tình hình hiện tại', exact: true })).toBeVisible();
        await expect(page.getByText('Hội thoại đang mở', { exact: true })).toBeVisible();
        await expect(page.getByText('Đơn chờ xử lý', { exact: true })).toBeVisible();
        await expect(page.getByText('Sản phẩm gần hết', { exact: true })).toBeVisible();
        await expect(page.getByText('Trợ lý bán hàng', { exact: true })).toBeVisible();

        for (const action of [
            page.getByRole('link', { name: 'Xem việc cần làm', exact: true }),
            page.getByRole('link', { name: 'Tạo đơn hàng', exact: true }),
        ]) {
            await expect(action).toBeVisible();
            const target = await action.boundingBox();
            expect(target).not.toBeNull();
            expect(target!.height).toBeGreaterThanOrEqual(44);
        }

        const teamPanel = page.locator('.MuiPaper-outlined').filter({ has: page.getByRole('heading', { name: 'Đội ngũ AI của cửa hàng', exact: true }) }).first();
        const teamStatus = teamPanel.locator('.MuiChip-root').first();
        const statusBounds = await teamStatus.boundingBox();
        const roleCardBounds = await teamStatus.locator('xpath=..').boundingBox();
        expect(statusBounds).not.toBeNull();
        expect(roleCardBounds).not.toBeNull();
        expect(statusBounds!.width).toBeLessThan(roleCardBounds!.width / 2);

        const dimensions = await page.evaluate(() => ({
            clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(dimensions.clientWidth).toBe(width);
        expect(dimensions.scrollWidth).toBeLessThanOrEqual(width + 1);
    }
});

test('dashboard finance summary uses one content track at every supported width', async ({ page }) => {
    await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
    const financeHeading = page.getByRole('heading', { name: 'Dòng tiền và doanh thu', exact: true });
    await expect(financeHeading).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: 'Xem lợi nhuận', exact: true })).toHaveAttribute('href', '/s/shop-demo/finance/profit-loss');

    for (const width of [390, 768, 1279, 1280, 1440, 1920]) {
        await page.setViewportSize({ width, height: 1000 });
        const geometry = await financeHeading.evaluate(heading => {
            const panel = heading.closest('.MuiPaper-outlined');
            const grid = panel?.parentElement;
            if (!panel || !grid) throw new Error('Không tìm thấy Panel tài chính hoặc lưới Dashboard.');
            const panelRect = panel.getBoundingClientRect();
            const gridRect = grid.getBoundingClientRect();
            return {
                columns: getComputedStyle(grid).gridTemplateColumns,
                panelWidth: panelRect.width,
                gridWidth: gridRect.width,
                unusedWidth: Math.max(0, gridRect.right - panelRect.right),
                viewport: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
            };
        });
        expect(geometry.columns.trim().split(/\s+/), `grid columns at ${width}px`).toHaveLength(1);
        expect(Math.abs(geometry.panelWidth - geometry.gridWidth), `Panel fills the grid at ${width}px`).toBeLessThanOrEqual(1);
        expect(geometry.unusedWidth, `unused row width at ${width}px`).toBeLessThanOrEqual(1);
        expect(geometry.scrollWidth, `document width at ${width}px`).toBeLessThanOrEqual(geometry.viewport + 1);
    }
});

test('dashboard nested cards keep one inset and one card radius at every breakpoint', async ({ page }) => {
    await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
    await expect(page.getByText('Dữ liệu cập nhật', { exact: false })).toBeVisible();
    const observations = [];
    for (const width of [320, 390, 768, 1280, 1920]) {
        await page.setViewportSize({ width, height: 1000 });
        const metrics = await page.getByRole('heading', { name: 'Tình hình hiện tại', exact: true }).evaluate(heading => {
            const panel = heading.closest('.MuiPaper-root')!;
            const cards = [...panel.querySelectorAll<HTMLElement>('.MuiPaper-root')];
            const outer = panel.getBoundingClientRect();
            const first = cards[0].getBoundingClientRect(), last = cards.at(-1)!.getBoundingClientRect();
            const header = panel.firstElementChild!;
            const headerText = header.querySelector('p')!.getBoundingClientRect();
            const notes = cards.map(card => card.lastElementChild!.getBoundingClientRect().top - card.getBoundingClientRect().top);
            return {
                left: first.left - outer.left - Number.parseFloat(getComputedStyle(panel).borderLeftWidth),
                right: outer.right - last.right - Number.parseFloat(getComputedStyle(panel).borderRightWidth),
                bottom: outer.bottom - last.bottom - Number.parseFloat(getComputedStyle(panel).borderBottomWidth),
                headerGap: first.top - headerText.bottom,
                gridMarginBottom: getComputedStyle(cards[0].parentElement!).marginBottom,
                gridGap: getComputedStyle(cards[0].parentElement!).gap,
                noteOffset: Math.max(...notes) - Math.min(...notes),
                radii: cards.map(card => getComputedStyle(card).borderRadius),
            };
        });
        const inset = width < 768 ? 12 : 16;
        expect(metrics.left, `KPI left inset at ${width}`).toBeCloseTo(inset, 2);
        expect(metrics.right, `KPI right inset at ${width}`).toBeCloseTo(inset, 2);
        expect(metrics.bottom, `KPI bottom inset at ${width}`).toBeCloseTo(inset, 2);
        expect(metrics.headerGap).toBeCloseTo(12, 1);
        expect(metrics.gridMarginBottom).toBe('0px');
        expect(metrics.gridGap).toBe('16px');
        expect(metrics.radii).toEqual(['12px', '12px', '12px', '12px']);
        expect(metrics.noteOffset, `metric note alignment at ${width}`).toBeLessThanOrEqual(0.5);

        const team = page.getByRole('heading', { name: 'Đội ngũ AI của cửa hàng', exact: true }).locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]');
        const roleCards = team.locator('[data-ui-composition="surface-content"]');
        await expect(roleCards).toHaveCount(4);
        expect(await roleCards.evaluateAll(cards => cards.map(card => ({ radius: getComputedStyle(card).borderRadius, padding: getComputedStyle(card).padding })))).toEqual(
            Array.from({ length: 4 }, () => ({ radius: '12px', padding: '12px' })),
        );
        for (const name of ['Xem việc cần làm', 'Tạo đơn hàng']) {
            expect(await page.getByRole('link', { name, exact: true }).evaluate(link => getComputedStyle(link).borderRadius)).toBe('8px');
        }
        const control = page.getByRole('heading', { name: 'Điều khiển trợ lý', exact: true }).locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]');
        const statusBounds = await control.locator('.MuiChip-root').boundingBox();
        const controlBounds = await control.boundingBox();
        expect(statusBounds!.width).toBeLessThan(controlBounds!.width / 2);
        expect((await control.getByRole('button', { name: 'Bot đã tạm dừng', exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
        const finance = page.getByRole('heading', { name: 'Dòng tiền và doanh thu', exact: true }).locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]');
        const amountGrid = finance.locator('[data-ui-composition="section-grid"]');
        const columns = await amountGrid.evaluate(grid => getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length);
        expect(columns).toBe(width < 768 ? 1 : 2);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
        observations.push({ width, inset, columns, ...metrics });
    }
    await test.info().attach('overview-surface-geometry.json', { body: JSON.stringify(observations, null, 2), contentType: 'application/json' });
});

test('dashboard order identifier stays a single link with accessible copy success and failure', async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
            writeText: async (value: string) => {
                if (document.documentElement.dataset.rejectCopy === 'true') throw new Error('Clipboard permission denied');
                document.documentElement.dataset.copiedOrder = value;
            },
        } });
    });
    await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
    const link = page.getByRole('link', { name: 'DH-1001', exact: true });
    await expect(link).toBeVisible();
    const row = link.locator('xpath=ancestor::tr');
    expect((await row.innerText()).match(/DH-1001/g)).toHaveLength(1);
    await expect(link).toHaveAttribute('href', '/s/shop-demo/orders/DH-1001');
    const copy = row.getByRole('button', { name: 'Sao chép mã đơn hàng DH-1001', exact: true });
    await copy.click();
    await expect(page.locator('html')).toHaveAttribute('data-copied-order', 'DH-1001');
    await expect(row.getByRole('status')).toHaveText('Đã sao chép mã đơn hàng.');
    await page.evaluate(() => { document.documentElement.dataset.rejectCopy = 'true'; });
    await copy.click();
    await expect(row.getByRole('status')).toHaveText('Không thể sao chép mã đơn hàng; hãy chọn mã để sao chép.');
    await link.click();
    await expect(page).toHaveURL(/\/orders\/DH-1001$/);
});

test('shared standalone Stats retain their boundary and long values on every affected report route', async ({ page }) => {
    const observations = [];
    for (const route of ['operations', 'finance', 'finance/profit-loss', 'finance/ledger', 'finance/trial-balance', 'finance/balance-sheet', 'reports/marketing']) {
        for (const width of [390, 1440]) {
            await page.setViewportSize({ width, height: 1000 });
            await page.goto(new URL(`/s/shop-demo/${route}`, demoUrl).toString());
            if (route === 'reports/marketing') {
                await expect(page).toHaveURL(url => ['fromDate', 'toDate', 'bucket'].every(key => url.searchParams.has(key)));
            }
            await expect(page.locator('main h1')).toBeVisible();
            await expect(page.locator('main .MuiCircularProgress-root, main .MuiLinearProgress-root')).toHaveCount(0);
            const readGeometry = () => page.locator('main').evaluate(main => {
                const grids = [...main.querySelectorAll('div')].filter(node => getComputedStyle(node).display === 'grid'
                    && node.children.length === 4
                    && [...node.children].every(child => child.classList.contains('MuiPaper-outlined') && !child.querySelector('h2')));
                return grids.map(grid => ({
                    marginBottom: getComputedStyle(grid).marginBottom,
                    gap: getComputedStyle(grid).gap,
                    radii: [...grid.children].map(card => getComputedStyle(card).borderRadius),
                    overflow: [...grid.children].map(card => card.scrollWidth - card.clientWidth),
                }));
            });
            // Use the successful measurement itself; a second read can race a query render.
            let geometry: Awaited<ReturnType<typeof readGeometry>> = [];
            await expect.poll(async () => {
                geometry = await readGeometry();
                return geometry.map(value => ({
                    marginBottom: value.marginBottom, gap: value.gap, radii: value.radii,
                    contentFits: value.overflow.every(overflow => overflow <= 1),
                }));
            }, { message: `Stats loaded with their complete layout on ${route} at ${width}` }).toEqual([
                { marginBottom: '16px', gap: '16px', radii: ['12px', '12px', '12px', '12px'], contentFits: true },
            ]);
            expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
            observations.push({ route, width, ...geometry[0] });
        }
    }
    await test.info().attach('shared-stats-affected-routes.json', { body: JSON.stringify(observations, null, 2), contentType: 'application/json' });
});
