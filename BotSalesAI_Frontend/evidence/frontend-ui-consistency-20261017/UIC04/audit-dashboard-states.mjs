import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
process.env.BOTSALES_VITE_CACHE_RUN_ID ||= `uic04-state-audit-${process.pid}`;
const { startDemoServer } = await import(pathToFileURL(path.join(frontendRoot, 'tests/session/demo-server.mjs')));
const server = await startDemoServer({ cacheIsolationKey: 'uic04-state-audit' });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const widths = [390, 768, 1279, 1280, 1440, 1920];
const dashboardPath = '/api/v2/shops/shop-demo/dashboard';

function instrumentation(mode) {
    const nativeFetch = window.fetch.bind(window);
    let release;
    window.__uic04ReleaseDashboard = () => release?.();
    window.fetch = async (input, init) => {
        const requestUrl = new URL(typeof input === 'string' ? input : input.url, window.location.href);
        if (requestUrl.pathname !== '/api/v2/shops/shop-demo/dashboard') return nativeFetch(input, init);
        if (mode === 'pending') await new Promise(resolve => { release = resolve; });
        if (mode === 'error') return new Response(JSON.stringify({ type: 'about:blank', title: 'Yêu cầu chưa hoàn tất', status: 503, code: 'SERVICE_UNAVAILABLE', detail: 'Lỗi API mô phỏng UIC04.', requestId: 'uic04-error' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        if (mode === 'empty' || mode === 'long-money') {
            const long = '987654321098765432109876543210987654321098765432109876543210';
            const amount = mode === 'empty' ? '0' : long;
            const response = {
                data: { shopId: 'shop-demo', asOf: '2026-10-17T01:00:00Z', openConversations: 0, pendingOrders: 0, lowStockVariants: 0, botStatus: 'active', recognizedRevenue: { amount, currency: 'VND' }, cashReceived: { amount, currency: 'VND' }, warnings: ['Dữ liệu tổng hợp do UIC04 kiểm thử.'] },
                meta: { requestId: `uic04-${mode}`, asOf: '2026-10-17T01:00:00Z' },
            };
            return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return nativeFetch(input, init);
    };
}

async function capture(page, mode) {
    const rows = [];
    for (const width of widths) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        rows.push(await page.evaluate(() => {
            const title = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].find(element => element.textContent?.trim() === 'Dòng tiền và doanh thu');
            if (!title) throw new Error('Không tìm thấy Panel tài chính.');
            const panel = title.closest('.MuiPaper-outlined');
            if (!panel?.parentElement) throw new Error('Không tìm thấy lưới cha của Panel tài chính.');
            const grid = panel.parentElement;
            const gridRect = grid.getBoundingClientRect();
            const panelRect = panel.getBoundingClientRect();
            const rowChildren = [...grid.children].map(child => {
                const rect = child.getBoundingClientRect();
                const heading = child.querySelector('h1,h2,h3,h4,h5,h6');
                return { title: heading?.textContent?.trim() || '(không tiêu đề)', left: rect.left, top: rect.top, right: rect.right, width: rect.width, gridColumn: getComputedStyle(child).gridColumn };
            }).filter(child => Math.abs(child.top - panelRect.top) < 1);
            return { viewport: document.documentElement.clientWidth, documentScrollWidth: document.documentElement.scrollWidth, grid: { left: gridRect.left, right: gridRect.right, width: gridRect.width, columns: getComputedStyle(grid).gridTemplateColumns, gap: getComputedStyle(grid).columnGap }, finance: { left: panelRect.left, right: panelRect.right, width: panelRect.width }, unusedWidthAfterFinance: Math.max(0, gridRect.right - panelRect.right), sameRowChildren: rowChildren };
        }));
    }
    const visibleAlerts = await page.locator('main [role="alert"]').allTextContents();
    const visibleStatuses = await page.locator('main [role="status"]').allTextContents();
    const financePanel = page.locator('.MuiPaper-outlined').filter({ has: page.getByRole('heading', { name: 'Dòng tiền và doanh thu', exact: true }) }).first();
    const financeText = await financePanel.innerText();
    return { mode, measurements: rows, alerts: visibleAlerts, statuses: visibleStatuses, financeText, horizontalOverflow: rows.some(row => row.documentScrollWidth > row.viewport) };
}

async function simulateSingleColumn(page) {
    await page.getByRole('heading', { name: 'Dòng tiền và doanh thu', exact: true }).evaluate(title => {
        const panel = title.closest('.MuiPaper-outlined');
        if (!panel?.parentElement) throw new Error('Không tìm thấy lưới Dashboard để mô phỏng phương án một cột.');
        panel.parentElement.style.gridTemplateColumns = '1fr';
    });
}

try {
    const states = {};
    for (const mode of ['ready', 'pending', 'empty', 'error', 'long-money']) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        const page = await context.newPage();
        const pageErrors = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        await page.addInitScript(instrumentation, mode);
        await page.goto(new URL('/s/shop-demo/overview?uic04-audit=1', server.url).toString(), { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading', { name: 'Dòng tiền và doanh thu', exact: true }).waitFor({ state: 'visible' });
        if (mode === 'pending') await page.getByText('Đang tải số liệu tài chính…', { exact: true }).waitFor({ state: 'visible' });
        else if (mode === 'error') await page.getByText('Không thể tải số liệu tài chính. Dữ liệu của các khu vực khác vẫn dùng được.', { exact: false }).waitFor({ state: 'visible' });
        else await page.getByText('Dữ liệu cập nhật', { exact: false }).waitFor({ state: 'visible' });
        states[mode] = await capture(page, mode);
        await simulateSingleColumn(page);
        states[mode].candidateSingleColumn = await capture(page, `${mode}-candidate-single-column`);
        if (mode === 'ready') {
            await page.setViewportSize({ width: 1440, height: 1000 });
            await page.screenshot({ path: path.join(here, 'candidate-single-column-1440.png'), fullPage: true });
        }
        if (mode === 'pending') {
            await page.evaluate(() => window.__uic04ReleaseDashboard());
            await page.getByText('Dữ liệu cập nhật', { exact: false }).waitFor({ state: 'visible' });
        }
        states[mode].pageErrors = pageErrors;
        await context.close();
    }
    const permissionProfiles = [];
    for (const role of ['owner', 'sales', 'viewer']) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        const page = await context.newPage();
        const rolePageErrors = [];
        page.on('pageerror', error => rolePageErrors.push(error.message));
        await page.goto(new URL('/s/shop-demo/overview?uic04-role-audit=1', server.url).toString(), { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading', { name: 'Dòng tiền và doanh thu', exact: true }).waitFor({ state: 'visible' });
        await page.getByText('Dữ liệu cập nhật', { exact: false }).waitFor({ state: 'visible' });
        const sessionRefresh = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v2/session');
        const dashboardRefresh = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === dashboardPath);
        const fixtureUrl = '/@fs/' + path.join(here, 'role-fixture.ts').replaceAll('\\', '/');
        const permissions = await page.evaluate(async ({ url, roleName }) => {
            const fixture = await import(url);
            const current = fixture.installRoleFixture(roleName);
            window.dispatchEvent(new Event('online'));
            return current;
        }, { url: fixtureUrl, roleName: role });
        const sessionResponse = await sessionRefresh;
        const session = await sessionResponse.json();
        const membership = session.data.memberships.find(row => row.shopId === 'shop-demo');
        if (!membership || sessionResponse.status() !== 200) throw new Error(`Không nhận được session hợp lệ cho role ${role}.`);
        const dashboardResponse = await dashboardRefresh;
        if (dashboardResponse.status() !== 200) throw new Error(`Dashboard trả ${dashboardResponse.status()} cho role ${role}.`);
        if (membership.permissions.includes('finance.read')) await page.getByText('Doanh thu đã ghi nhận', { exact: true }).waitFor({ state: 'visible' });
        else await page.getByText('Chỉ hiển thị khi vai trò có finance.read.', { exact: true }).waitFor({ state: 'visible' });
        const measured = await capture(page, `role-${role}`);
        await simulateSingleColumn(page);
        const candidate = await capture(page, `role-${role}-candidate-single-column`);
        permissionProfiles.push({ role, permissionCount: membership.permissions.length, financeRead: membership.permissions.includes('finance.read'), operationsRead: membership.permissions.includes('operations.read'), ordersRead: membership.permissions.includes('orders.read'), ordersWrite: membership.permissions.includes('orders.write'), visibleDashboardHeadings: await page.locator('main h1,main h2,main h3,main h4,main h5,main h6').allTextContents(), permissions, pageErrors: rolePageErrors, ...measured, candidateSingleColumn: candidate });
        await context.close();
    }
    const measuredFiles = ['apps/web/src/modules/dashboard/index.tsx', 'tests/ui-dashboard-layout.spec.ts'];
    const sourceFingerprints = {};
    for (const relativePath of measuredFiles) sourceFingerprints[relativePath] = createHash('sha256').update(await readFile(path.join(frontendRoot, relativePath))).digest('hex');
    const result = { recordedAt: new Date().toISOString(), browserVersion: browser.version(), gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: frontendRoot, encoding: 'utf8' }).trim(), sourceFingerprints, source: 'Local Vite demo and actual Chrome; ready data uses MSW. Loading/error/empty/long-money and role fixtures are deterministic local simulations based on the API schema and permission catalog; no backend or production claim.', widths, states, permissionProfiles };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
    await browser.close();
    await server.close();
}
