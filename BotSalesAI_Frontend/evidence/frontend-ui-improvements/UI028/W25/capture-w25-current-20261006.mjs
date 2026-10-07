import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium, expect } from '@playwright/test';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const root = process.cwd();
const evidenceDir = path.join(root, 'evidence/frontend-ui-improvements/UI028/W25');
const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw new Error('Usage: node capture-w25-current-20261006.mjs <before|after>');
const date = '2026-10-06';
const viewports = [{ width: 390, height: 844 }, { width: 1280, height: 900 }];
const routes = [
    { id: 'R31', state: 'report-export-and-jobs', path: '/s/shop-demo/reports?reportType=orders&fromDate=2026-09-28&toDate=2026-09-29', ready: async page => {
        await expect(page.getByRole('heading', { name: 'Báo cáo & xuất dữ liệu', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Tạo tệp báo cáo', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Công việc gần đây', exact: true })).toBeVisible();
        await expect(page.getByLabel('Từ ngày')).toHaveValue('2026-09-28');
        await expect(page.getByLabel('Đến ngày')).toHaveValue('2026-09-29');
    } },
    { id: 'R53', state: 'marketing-summary-chart-table', path: '/s/shop-demo/reports/marketing', ready: async page => {
        await expect(page.getByRole('heading', { name: 'Thông tin cho marketing', exact: true })).toBeVisible();
        await expect(page.getByTestId('marketing-loss-chart')).toBeVisible();
        await expect(page.getByRole('table', { name: 'Lý do không chốt đơn' })).toBeVisible();
    } },
];
const sourceFiles = [
    'apps/web/src/modules/reports/index.tsx',
    'apps/web/src/modules/reports/report-utils.ts',
    'apps/web/src/modules/dashboard/index.tsx',
    'apps/web/src/shared/ui/layout.ts',
    'apps/web/src/shared/ui/components.tsx',
    'tests/fe021.spec.ts',
    'botsales-kit/contracts/route-manifest.json',
    'botsales-kit/contracts/openapi.json',
    'UX-CONTRACT.md',
    'botsales-kit/design/tokens.json',
    'docs/FRONTEND_SPACING_STANDARD.md',
    'evidence/frontend-ui-improvements/UI028/W25/design-contract-pre-spacing-current-20261006.md',
];
const hash = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const sourceHashes = Object.fromEntries(sourceFiles.map(file => [file, hash(file)]));
const layoutPath = path.join(evidenceDir, `layout-${phase}-spacing-current-${date}.json`);
let layout;
if (fs.existsSync(layoutPath)) {
    if (phase === 'after') throw new Error(`Refusing to overwrite report: ${layoutPath}`);
    layout = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
} else {
    layout = JSON.parse(execFileSync(process.execPath, [path.join(root, 'scripts/check-layout.mjs'), '--report', '--json'], { cwd: root, encoding: 'utf8' }));
    fs.writeFileSync(layoutPath, `${JSON.stringify(layout, null, 2)}\n`, { flag: 'wx' });
}

const captures = [];
const writes = [];
const apiErrors = [];
const pageErrors = [];
const server = await startDemoServer({ cacheIsolationKey: `ui028-w25-${phase}-${date}` });
const browser = await chromium.launch();
try {
    for (const route of routes) {
        for (const viewport of viewports) {
            const context = await browser.newContext({ viewport });
            const page = await context.newPage();
            page.on('pageerror', error => pageErrors.push({ state: route.state, viewport: `${viewport.width}x${viewport.height}`, message: error.message }));
            page.on('request', request => {
                const url = new URL(request.url());
                if (url.pathname.startsWith('/api/v2/') && request.method() !== 'GET') writes.push({ state: route.state, method: request.method(), path: url.pathname });
            });
            page.on('response', response => {
                const url = new URL(response.url());
                if (url.pathname.startsWith('/api/v2/') && response.status() >= 400) apiErrors.push({ state: route.state, status: response.status(), path: url.pathname });
            });
            await page.goto(new URL(route.path, server.url).toString(), { waitUntil: 'domcontentloaded' });
            await route.ready(page);
            await page.waitForTimeout(250);
            const metrics = await page.evaluate(() => {
                const rect = selector => {
                    const element = document.querySelector(selector);
                    if (!(element instanceof HTMLElement || element instanceof SVGElement)) return null;
                    const bounds = element.getBoundingClientRect();
                    const style = getComputedStyle(element);
                    return {
                        x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height,
                        padding: style.padding, margin: style.margin, gap: style.gap,
                        overflowX: style.overflowX, overflowY: style.overflowY,
                    };
                };
                const chart = document.querySelector('[data-testid="marketing-loss-chart"] svg.recharts-surface');
                const chartText = chart ? Array.from(chart.querySelectorAll('text')).map(node => {
                    const bounds = node.getBBox();
                    return { text: node.textContent?.trim() || '', x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
                }) : [];
                const mainGridSelector = location.pathname.endsWith('/reports/marketing')
                    ? '[data-testid="marketing-sections-grid"]'
                    : '[data-testid="reports-main-layout"]';
                const listSurface = document.querySelector('[data-testid="marketing-question-surface"]');
                const list = document.querySelector('[data-testid="marketing-top-questions"]');
                const listItem = list?.querySelector('li');
                const listStyle = list ? getComputedStyle(list) : null;
                const listSurfaceStyle = listSurface ? getComputedStyle(listSurface) : null;
                const formLayout = document.querySelector('[data-testid="reports-export-form-layout"]');
                const formBody = formLayout?.parentElement;
                const formBodyStyle = formBody ? getComputedStyle(formBody) : null;
                const firstQuestionRect = listItem?.getBoundingClientRect();
                const listSurfaceRect = listSurface?.getBoundingClientRect();
                return {
                    document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, clientHeight: document.documentElement.clientHeight, scrollHeight: document.documentElement.scrollHeight },
                    pageTitle: rect('main h1'),
                    mainGrid: rect(mainGridSelector),
                    reportPanel: rect('.MuiPaper-root'),
                    exportForm: rect('input[type="date"]'),
                    exportFormLayout: rect('[data-testid="reports-export-form-layout"]'),
                    exportFormBodyInset: formBodyStyle ? { top: formBodyStyle.paddingTop, right: formBodyStyle.paddingRight, bottom: formBodyStyle.paddingBottom, left: formBodyStyle.paddingLeft } : null,
                    jobTable: rect('main table[aria-label="Công việc gần đây"]'),
                    marketingChartRegion: rect('[data-testid="marketing-loss-chart"]'),
                    marketingChartSvg: chart ? { x: chart.getBoundingClientRect().x, y: chart.getBoundingClientRect().y, width: chart.getBoundingClientRect().width, height: chart.getBoundingClientRect().height } : null,
                    chartText,
                    questionSurface: listSurface && listSurfaceStyle ? { ...rect('[data-testid="marketing-question-surface"]'), padding: listSurfaceStyle.padding } : null,
                    questionList: list && listStyle ? { padding: listStyle.padding, paddingLeft: listStyle.paddingLeft, gap: listStyle.gap, effectiveTextInset: firstQuestionRect && listSurfaceRect ? firstQuestionRect.left - listSurfaceRect.left : null, firstItem: listItem ? rect('[data-testid="marketing-top-questions"] > li') : null } : null,
                    dataTableCount: document.querySelectorAll('main table').length,
                };
            });
            const screenshot = `${phase}-${route.id}-${route.state}-${viewport.width}.png`;
            await page.screenshot({ path: path.join(evidenceDir, screenshot), fullPage: true });
            captures.push({ routeId: route.id, state: route.state, path: route.path, viewport, screenshot, metrics });
            await context.close();
        }
    }
} finally {
    await browser.close();
    await server.close();
}

const output = {
    schemaVersion: 1,
    task: 'UI028.W25',
    phase: phase === 'before' ? 'pre-source-edit' : 'post-source-edit',
    date,
    revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    browser: 'Chromium',
    mode: 'local Vite demo with synthetic MSW; captures are read-only',
    sourceHashes,
    layoutReport: {
        file: path.basename(layoutPath), status: layout.status, files: layout.files, totalFindings: layout.findings.length,
        reportFindings: layout.findings.filter(item => item.file === 'apps/web/src/modules/reports/index.tsx').length,
    },
    captures,
    writes,
    apiErrors,
    pageErrors,
};
const jsonPath = path.join(evidenceDir, `render-${phase}-current-${date}.json`);
const logPath = path.join(evidenceDir, `capture-${phase}-current-${date}.log`);
fs.writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`, { flag: 'wx' });
fs.writeFileSync(logPath, `${JSON.stringify({ task: output.task, phase: output.phase, captures: captures.length, layoutReport: output.layoutReport, writes, apiErrors, pageErrors, sourceHashes }, null, 2)}\n`, { flag: 'wx' });
if (writes.length || apiErrors.length || pageErrors.length) process.exitCode = 1;
console.log(JSON.stringify({ task: output.task, phase: output.phase, captures: captures.length, layoutReport: output.layoutReport, writes, apiErrors, pageErrors }));
