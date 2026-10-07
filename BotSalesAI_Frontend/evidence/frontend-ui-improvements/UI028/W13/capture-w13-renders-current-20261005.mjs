import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const root = process.cwd();
const directory = path.join(root, 'evidence/frontend-ui-improvements/UI028/W13');
const phase = process.argv[2];
if (!['baseline', 'after'].includes(phase)) throw new Error('Pass baseline or after.');
const captureVariant = process.argv[3] ? `-${process.argv[3]}` : '';
const suffix = phase === 'baseline' ? 'before-source-edit' : 'after-source-edit';
const output = path.join(directory, `render-${suffix}${captureVariant}-current-20261005.json`);
if (fs.existsSync(output)) throw new Error(`Refusing to overwrite immutable render evidence: ${output}`);

const files = [
    'apps/web/src/modules/procurement/index.tsx',
    'apps/web/src/shared/ui/layout.ts',
    'apps/web/src/shared/ui/components.tsx',
    'apps/web/src/shared/ui/theme.ts',
    'botsales-kit/design/tokens.json',
    'botsales-kit/contracts/route-manifest.json',
    'botsales-kit/contracts/openapi.json',
];
const sha256 = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const viewports = [{ width: 390, height: 844 }, { width: 1280, height: 900 }];
const states = [
    { routeId: 'R44', route: '/s/shop-demo/suppliers', heading: 'Nhà cung cấp hàng hóa', name: 'supplier collection' },
    { routeId: 'R44', route: '/s/shop-demo/suppliers', heading: 'Nhà cung cấp hàng hóa', name: 'new supplier dialog', dialog: true, open: async page => page.getByRole('button', { name: 'Thêm nhà cung cấp', exact: true }).click() },
    { routeId: 'R44', route: '/s/shop-demo/suppliers', heading: 'Nhà cung cấp hàng hóa', name: 'new supplier offer dialog', dialog: true, open: async page => page.getByRole('button', { name: 'Thêm báo giá', exact: true }).first().click() },
    { routeId: 'R45', route: '/s/shop-demo/replenishment', heading: 'Nhập lại hàng', name: 'suggestions and supplier/offer lookup rows' },
    { routeId: 'R45', route: '/s/shop-demo/replenishment', heading: 'Nhập lại hàng', name: 'SKU reorder rules collection', open: async page => page.getByRole('tab', { name: 'Quy tắc theo SKU' }).click() },
    { routeId: 'R45', route: '/s/shop-demo/replenishment', heading: 'Nhập lại hàng', name: 'new reorder rule dialog', dialog: true, open: async page => { await page.getByRole('tab', { name: 'Quy tắc theo SKU' }).click(); await page.getByRole('button', { name: 'Thêm quy tắc', exact: true }).click(); } },
    { routeId: 'R46', route: '/s/shop-demo/purchases', heading: 'Đơn mua hàng', name: 'purchase collection' },
    { routeId: 'R46', route: '/s/shop-demo/purchases', heading: 'Đơn mua hàng', name: 'new purchase draft dialog', dialog: true, open: async page => page.getByRole('button', { name: 'Tạo đơn mua', exact: true }).click() },
    { routeId: 'R46', route: '/s/shop-demo/purchases', heading: 'Đơn mua hàng', name: 'purchase detail dialog', dialog: true, open: async page => page.getByRole('button', { name: 'Xem chi tiết', exact: true }).first().click() },
    { routeId: 'R47', route: '/s/shop-demo/receipts', heading: 'Nhận hàng', name: 'receipt collection' },
    { routeId: 'R47', route: '/s/shop-demo/receipts', heading: 'Nhận hàng', name: 'new receipt draft dialog', dialog: true, open: async page => page.getByRole('button', { name: 'Tạo phiếu nhận', exact: true }).click() },
];

const browser = await chromium.launch({ headless: true });
const observations = [];
const pageErrors = [];
const requestWrites = [];

async function capture(page, viewport, state) {
    await page.waitForTimeout(160);
    const metrics = await page.evaluate(() => {
        const box = element => {
            if (!element) return null;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, padding: style.padding, gap: style.gap, marginBottom: style.marginBottom, display: style.display };
        };
        const main = document.querySelector('main#main-content');
        return {
            viewport: { width: innerWidth, height: innerHeight },
            document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
            main: box(main),
            heading: box(main?.querySelector('h1,h2')),
            alerts: [...(main?.querySelectorAll('.MuiAlert-root') || [])].map(box),
            surfaces: [...(main?.querySelectorAll('.MuiPaper-root') || [])].map(box),
            dialog: box(document.querySelector('[role="dialog"]')),
            tableRegions: [...(main?.querySelectorAll('[role="region"]') || [])].map(box),
            visibleHeadings: [...document.querySelectorAll('main h1,main h2,[role="dialog"] h1,[role="dialog"] h2')]
                .filter(element => element.getBoundingClientRect().width > 0).map(element => element.textContent?.trim()),
        };
    });
    const id = state.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const stem = `${state.routeId}-${id}-${suffix}${captureVariant}-${viewport.width}x${viewport.height}-current-20261005`;
    let screenshot = `${stem}.png`;
    for (let attempt = 2; fs.existsSync(path.join(directory, screenshot)); attempt++) screenshot = `${stem}-retry${attempt}.png`;
    await page.screenshot({ path: path.join(directory, screenshot), fullPage: !state.name.includes('dialog'), animations: 'disabled' });
    observations.push({ routeId: state.routeId, route: state.route, viewport, state: state.name, finalUrl: page.url(), metrics, screenshot });
}

try {
    for (const viewport of viewports) {
        const server = await startDemoServer({ cacheIsolationKey: `ui028-w13-${phase}-${viewport.width}-20261005` });
        try {
            for (const state of states) {
                const context = await browser.newContext({ viewport });
                const page = await context.newPage();
                page.on('pageerror', error => pageErrors.push({ route: page.url(), message: error.message }));
                page.on('request', request => {
                    if (request.method() === 'POST') requestWrites.push({ routeId: state.routeId, url: request.url() });
                });
                await page.goto(new URL(state.route, server.url).toString(), { waitUntil: 'domcontentloaded' });
                await page.getByRole('heading', { name: state.heading, exact: true }).waitFor({ state: 'visible' });
                if (state.open) await state.open(page);
                if (state.dialog) {
                    await page.getByRole('dialog').waitFor({ state: 'visible' });
                } else {
                    await page.getByRole('table').first().waitFor({ state: 'visible' });
                }
                await capture(page, viewport, state);
                await context.close();
            }
        } finally {
            await server.close();
        }
    }
    const layoutText = execFileSync(process.execPath, ['scripts/check-layout.mjs', '--report', '--json'], { cwd: root, encoding: 'utf8' });
    const layout = JSON.parse(layoutText);
    const procurementFindings = layout.findings.filter(finding => finding.file === 'apps/web/src/modules/procurement/index.tsx');
    const result = {
        schemaVersion: 1,
        task: 'UI028.W13',
        phase,
        capturedAt: new Date().toISOString(),
        status: pageErrors.length === 0 && requestWrites.length === 0 && observations.length === states.length * viewports.length
            ? phase === 'baseline' ? 'BASELINE_CAPTURED' : 'AFTER_STATE_CAPTURED'
            : 'CAPTURE_FAILED',
        revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
        browser: { name: 'Chromium', version: browser.version() },
        seedMode: 'fresh synthetic in-memory MSW demo server per viewport; no writes submitted',
        sourceSha256: Object.fromEntries(files.map(file => [file, sha256(file)])),
        viewports,
        observations,
        pageErrors,
        requestWrites,
        layout: { status: layout.status, totalFindings: layout.findings.length, counts: layout.counts, procurementFindings, checkerSchemaVersion: layout.schemaVersion },
        visualSourceReview: { status: 'MANUAL_REVIEW_REQUIRED', checker: 'SPC-046 visual-token checker is planned for W26-W27 and is not implemented' },
        note: phase === 'baseline'
            ? 'Captured before W13 source edits from the existing working-tree state, including its pre-existing staged and unstaged procurement changes. No mutation command was submitted.'
            : 'After-state capture. Compare only with the immutable W13 baseline under matching route/state/viewport and seed mode.',
    };
    fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
    console.log(JSON.stringify({ status: result.status, observations: observations.length, pageErrors: pageErrors.length,
        writes: requestWrites.length, globalFindings: result.layout.totalFindings,
        procurementFindings: procurementFindings.length, output }, null, 2));
    if (result.status === 'CAPTURE_FAILED') process.exitCode = 1;
} finally {
    await browser.close();
}
