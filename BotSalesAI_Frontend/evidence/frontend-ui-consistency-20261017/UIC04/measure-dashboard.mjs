import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
process.env.BOTSALES_VITE_CACHE_RUN_ID ||= `uic04-dashboard-${process.pid}`;
const { startDemoServer } = await import(pathToFileURL(path.join(frontendRoot, 'tests/session/demo-server.mjs')));
const server = await startDemoServer({ cacheIsolationKey: 'uic04-measurement' });
const browser = await chromium.launch({ channel: 'chrome', headless: true });

try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(new URL('/s/shop-demo/overview', server.url).toString(), { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Dòng tiền và doanh thu', exact: true }).waitFor({ state: 'visible' });
    await page.getByText('Dữ liệu cập nhật', { exact: false }).waitFor({ state: 'visible' });

    const widths = [390, 768, 1279, 1280, 1440, 1920];
    const measurements = [];
    for (const width of widths) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        measurements.push(await page.evaluate(() => {
            const title = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].find(element => element.textContent?.trim() === 'Dòng tiền và doanh thu');
            if (!title) throw new Error('Không tìm thấy tiêu đề Panel tài chính.');
            const panel = title.closest('.MuiPaper-outlined');
            if (!panel?.parentElement) throw new Error('Không tìm thấy Panel hoặc lưới cha.');
            const grid = panel.parentElement;
            const gridRect = grid.getBoundingClientRect();
            const panelRect = panel.getBoundingClientRect();
            const siblings = [...grid.children].map(child => {
                const rect = child.getBoundingClientRect();
                const heading = child.querySelector('h1,h2,h3,h4,h5,h6');
                return { title: heading?.textContent?.trim() || '(không có tiêu đề)', left: rect.left, top: rect.top, right: rect.right, width: rect.width, gridColumn: getComputedStyle(child).gridColumn };
            });
            return {
                viewport: document.documentElement.clientWidth,
                documentScrollWidth: document.documentElement.scrollWidth,
                grid: { left: gridRect.left, right: gridRect.right, width: gridRect.width, columns: getComputedStyle(grid).gridTemplateColumns, gap: getComputedStyle(grid).columnGap },
                finance: { left: panelRect.left, right: panelRect.right, width: panelRect.width },
                sameRowSiblings: siblings.filter(item => Math.abs(item.top - panelRect.top) < 1),
                unusedWidthAfterFinance: Math.max(0, gridRect.right - panelRect.right),
                renderedSiblingPanels: siblings,
            };
        }));
    }
    process.stdout.write(`${JSON.stringify({ recordedAt: new Date().toISOString(), browserVersion: browser.version(), source: 'local Vite demo; synthetic MSW data; Chrome', widths, measurements }, null, 2)}\n`);
} finally {
    await browser.close();
    await server.close();
}
