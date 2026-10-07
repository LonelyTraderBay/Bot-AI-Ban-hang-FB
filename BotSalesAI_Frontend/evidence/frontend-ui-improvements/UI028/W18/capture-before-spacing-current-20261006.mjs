import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const root = process.cwd();
const evidenceDir = path.join(root, 'evidence/frontend-ui-improvements/UI028/W18');
const sourcePath = 'apps/web/src/modules/bot/index.tsx';
const phase = process.argv[2] || 'before';
if (!['before', 'after'].includes(phase)) throw new Error(`Unsupported capture phase: ${phase}`);
const viewports = [
    { width: 390, height: 844, suffix: '390' },
    { width: 1280, height: 900, suffix: '1280' },
];
const captures = [];
const pageErrors = [];
const setupWrites = [];
const server = await startDemoServer({ cacheIsolationKey: 'ui028-w18-before-20261006' });
const browser = await chromium.launch();

async function openRoute(page, route, heading) {
    await page.goto(new URL(route, server.url).toString(), { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: heading }).waitFor({ state: 'visible', timeout: 20_000 });
}

async function capture(page, viewport, routeId, state) {
    await page.waitForTimeout(300);
    const dialogs = page.getByRole('dialog');
    const dialog = (await dialogs.count()) > 0 && await dialogs.first().isVisible()
        ? await dialogs.first().boundingBox()
        : null;
    const metrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        clientHeight: document.documentElement.clientHeight,
        scrollHeight: document.documentElement.scrollHeight,
    }));
    const screenshot = `${phase}-${routeId.toLowerCase()}-${state}-${viewport.suffix}.png`;
    await page.screenshot({ path: path.join(evidenceDir, screenshot), fullPage: true });
    captures.push({
        route: routeId,
        state,
        viewport: { width: viewport.width, height: viewport.height },
        screenshot,
        ...metrics,
        dialogBounds: dialog,
    });
}

try {
    for (const viewport of viewports) {
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
        const page = await context.newPage();
        page.on('pageerror', error => pageErrors.push(`${viewport.suffix}: ${error.message}`));
        page.on('request', request => {
            const url = new URL(request.url());
            if (url.pathname.startsWith('/api/v2/') && request.method() !== 'GET') {
                setupWrites.push({ viewport: viewport.suffix, method: request.method(), path: url.pathname });
            }
        });

        await openRoute(page, '/s/shop-demo/bot', 'Điều khiển Admin AI');
        await capture(page, viewport, 'R26', 'configuration');
        await page.getByRole('button', { name: 'Sửa bản nháp' }).click();
        await page.getByRole('dialog', { name: 'Cấu hình bản nháp' }).waitFor({ state: 'visible' });
        await capture(page, viewport, 'R26', 'draft-editor-dialog');

        await openRoute(page, '/s/shop-demo/bot/playground', 'Phòng thử bot');
        await capture(page, viewport, 'R27', 'sandbox-empty');
        await page.getByLabel('Nội dung khách hỏi').fill('Kiểm tra bố cục câu trả lời mô phỏng an toàn.');
        const beforePlaygroundWrites = setupWrites.length;
        const resultResponse = page.waitForResponse(response => response.request().method() === 'POST'
            && new URL(response.url()).pathname.endsWith('/bot/playground'));
        await page.getByRole('button', { name: 'Chạy thử' }).click();
        const response = await resultResponse;
        if (response.status() !== 200) throw new Error(`R27 synthetic playground returned ${response.status()}`);
        await page.getByText('[Mô phỏng, không gọi AI]', { exact: false }).waitFor({ state: 'visible' });
        await capture(page, viewport, 'R27', 'sandbox-result');
        setupWrites.splice(beforePlaygroundWrites, setupWrites.length - beforePlaygroundWrites,
            ...setupWrites.slice(beforePlaygroundWrites).map(write => ({ ...write, purpose: 'synthetic local R27 render fixture' })));

        await openRoute(page, '/s/shop-demo/bot/evaluations', 'Đánh giá AI');
        await capture(page, viewport, 'R28', 'evaluation-list');
        await page.getByRole('button', { name: 'Chạy đánh giá' }).click();
        await page.getByRole('dialog', { name: 'Đánh giá cấu hình nháp' }).waitFor({ state: 'visible' });
        await capture(page, viewport, 'R28', 'evaluation-dialog');

        await openRoute(page, '/s/shop-demo/bot/team', 'Đội ngũ AI');
        await capture(page, viewport, 'R51', 'team-and-budgets');
        await page.getByRole('button', { name: 'Phân công' }).first().click();
        await page.getByRole('dialog').first().waitFor({ state: 'visible' });
        await capture(page, viewport, 'R51', 'role-assignment-dialog');
        await openRoute(page, '/s/shop-demo/bot/team', 'Đội ngũ AI');
        await page.getByRole('button', { name: 'Đổi có phê duyệt' }).first().click();
        await page.getByRole('dialog', { name: 'Đổi giới hạn được duyệt' }).waitFor({ state: 'visible' });
        await capture(page, viewport, 'R51', 'budget-approval-dialog');

        await context.close();
    }
} finally {
    await browser.close();
    await server.close();
}

const report = {
    schemaVersion: 1,
    task: 'UI028.W18',
    capturedAt: new Date().toISOString(),
    phase,
    scope: 'Synthetic in-memory MSW; R27 playground requests are local-only fixtures and are recorded separately.',
    source: { path: sourcePath, sha256: '' },
    browser: 'Chromium',
    viewports: viewports.map(({ width, height }) => ({ width, height })),
    captures,
    setupWrites,
    pageErrors,
    verdict: pageErrors.length === 0 ? `W18_${phase.toUpperCase()}_SPACING_RENDER` : `W18_${phase.toUpperCase()}_SPACING_RENDER_WITH_PAGE_ERRORS`,
};
const { createHash } = await import('node:crypto');
report.source.sha256 = createHash('sha256').update(fs.readFileSync(path.join(root, sourcePath))).digest('hex');
fs.writeFileSync(path.join(evidenceDir, `render-${phase}-spacing-current-20261006.json`), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ task: report.task, observations: captures.length, writes: setupWrites.length, pageErrors: pageErrors.length, sourceSha256: report.source.sha256 }));
