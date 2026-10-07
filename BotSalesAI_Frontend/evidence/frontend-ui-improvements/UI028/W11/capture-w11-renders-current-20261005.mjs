import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const root = process.cwd();
const directory = path.join(root, 'evidence/frontend-ui-improvements/UI028/W11');
const phase = process.argv[2];
if (!['baseline', 'baseline-stable', 'after'].includes(phase)) throw new Error('Pass baseline, baseline-stable, or after.');
const suffix = phase === 'baseline' ? 'before-source-edit' : phase === 'baseline-stable' ? 'before-source-edit-stable' : 'after-source-edit';
const output = path.join(directory, `render-${suffix}-current-20261005.json`);
if (fs.existsSync(output)) throw new Error(`Refusing to overwrite immutable render evidence: ${output}`);
const files = [
    'apps/web/src/modules/orders/index.tsx',
    'apps/web/src/modules/orders/demo-address-preview.ts',
    'apps/web/src/shared/ui/layout.ts',
    'apps/web/src/shared/ui/components.tsx',
    'apps/web/src/shared/ui/theme.ts',
    'botsales-kit/design/tokens.json',
    'botsales-kit/contracts/route-manifest.json',
];
const sha256 = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const viewports = [{ width: 390, height: 844 }, { width: 1280, height: 900 }];
const browser = await chromium.launch({ headless: true });
const observations = [];
const pageErrors = [];

async function capture(page, viewport, routeId, state, screenshotName) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    const metrics = await page.evaluate(() => {
        const box = element => {
            if (!element) return null;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return {
                x: rect.x, y: rect.y, width: rect.width, height: rect.height,
                padding: style.padding, paddingLeft: style.paddingLeft, paddingRight: style.paddingRight,
                gap: style.gap, display: style.display, minWidth: style.minWidth,
            };
        };
        const main = document.querySelector('main#main-content');
        const dialog = document.querySelector('[role="dialog"]');
        return {
            viewport: { width: innerWidth, height: innerHeight },
            document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
            main: box(main),
            firstHeading: box(main?.querySelector('h1,h2')),
            surfaces: [...(main?.querySelectorAll('.MuiPaper-root') || [])].slice(0, 8).map(box),
            dialog: box(dialog),
            visibleHeadings: [...document.querySelectorAll('main h1,main h2,[role="dialog"] h1,[role="dialog"] h2')].filter(element => element.getBoundingClientRect().width > 0).slice(0, 12).map(element => element.textContent?.trim()),
        };
    });
    const screenshot = `${screenshotName}-${viewport.width}x${viewport.height}-current-20261005.png`;
    const modalState = /dialog|inspection/i.test(state);
    await page.screenshot({ path: path.join(directory, screenshot), fullPage: !modalState, animations: 'disabled' });
    observations.push({ routeId, viewport, state, finalUrl: page.url(), metrics, screenshot });
}

async function goto(page, base, routeId, route, heading) {
    await page.goto(new URL(route, base).toString(), { waitUntil: 'domcontentloaded' });
    await page.locator('#root').waitFor({ state: 'visible' });
    await page.getByRole('heading', { name: heading, exact: true }).waitFor({ state: 'visible' });
    await page.waitForTimeout(350);
}

async function chooseOption(page, label, option) {
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: option, exact: true }).click();
}

try {
    for (const viewport of viewports) {
        const server = await startDemoServer({ cacheIsolationKey: `ui028-w11-${phase}-${viewport.width}-20261005` });
        try {
            const page = await browser.newPage({ viewport });
            page.on('pageerror', error => pageErrors.push({ route: page.url(), message: error.message }));

            await goto(page, server.url, 'R17', '/s/shop-demo/orders', 'Đơn hàng');
            await capture(page, viewport, 'R17', 'success collection, search, table and pager', `R17-${suffix}`);

            await goto(page, server.url, 'R18', '/s/shop-demo/orders/new', 'Tạo đơn hàng');
            await capture(page, viewport, 'R18', 'empty draft form and synthetic address notice', `R18-${suffix}`);
            await chooseOption(page, 'Khách hàng', 'Linh (khách mẫu)');
            await chooseOption(page, 'Hội thoại liên quan', 'Linh (khách mẫu) · cv1');
            await chooseOption(page, 'Sản phẩm 1', 'Áo thun Essential · L · Than · AO-002');
            await chooseOption(page, 'Địa chỉ giao hàng (mẫu demo)', 'Địa chỉ mẫu · shop-demo (chỉ dùng trong demo)');
            await capture(page, viewport, 'R18', 'selected customer/conversation/product and explicitly synthetic address preview; draft not submitted', `R18-address-preview-${suffix}`);

            await goto(page, server.url, 'R19', '/s/shop-demo/orders/DH-1001', 'Đơn DH-1001');
            await capture(page, viewport, 'R19', 'draft detail, three separate statuses, server version and allowed actions', `R19-${suffix}`);
            await page.getByRole('button', { name: 'Sửa đơn nháp', exact: true }).click();
            await page.getByRole('heading', { name: 'Người mua và giao hàng', exact: true }).waitFor({ state: 'visible' });
            await capture(page, viewport, 'R19', 'draft edit form; no save submitted', `R19-draft-edit-${suffix}`);
            await goto(page, server.url, 'R19', '/s/shop-demo/orders/DH-1001', 'Đơn DH-1001');
            await page.getByRole('button', { name: 'Lấy báo giá hiện tại', exact: true }).click();
            await page.getByText(/Mã báo giá:/).waitFor({ state: 'visible' });
            await capture(page, viewport, 'R19', 'synthetic quote panel with order version/expiry; confirmation remains gated', `R19-quote-${suffix}`);

            await goto(page, server.url, 'R43', '/s/shop-demo/returns', 'Đổi và trả hàng');
            await capture(page, viewport, 'R43', 'return collection', `R43-${suffix}`);
            await page.getByRole('row').filter({ hasText: 'seed-returncase-10036' }).getByRole('button', { name: 'Kiểm nhận' }).click();
            await page.getByRole('dialog', { name: 'Kiểm nhận hàng trả' }).waitFor({ state: 'visible' });
            await capture(page, viewport, 'R43', 'seeded return inspection dialog loaded read-only; no inspection submitted', `R43-inspection-${suffix}`);
            await page.keyboard.press('Escape');
            await goto(page, server.url, 'R43', '/s/shop-demo/returns?orderId=DH-DEMO-PAID-01', 'Đổi và trả hàng');
            await page.getByRole('button', { name: 'Tạo yêu cầu trả', exact: true }).click();
            await page.getByRole('dialog', { name: 'Yêu cầu trả hàng' }).waitFor({ state: 'visible' });
            await page.getByRole('textbox', { name: 'Lý do trả' }).fill('Kiểm tra bố cục yêu cầu trả W11');
            await page.getByRole('spinbutton', { name: /tối đa 1/ }).fill('1');
            await capture(page, viewport, 'R43', 'valid synthetic return-request draft in dialog; not submitted', `R43-create-${suffix}`);

            await page.close();
        } finally {
            await server.close();
        }
    }
    const reportText = execFileSync(process.execPath, ['scripts/check-layout.mjs', '--report', '--json'], { cwd: root, encoding: 'utf8' });
    const layoutReport = JSON.parse(reportText);
    const result = {
        schemaVersion: 1,
        status: pageErrors.length === 0 && observations.length === 18 ? (phase.startsWith('baseline') ? 'BASELINE_CAPTURED' : 'AFTER_STATE_CAPTURED') : 'CAPTURE_FAILED',
        task: 'UI028.W11', phase, capturedAt: new Date().toISOString(),
        revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
        browser: { name: 'Chromium', version: browser.version() }, seedMode: 'fresh synthetic in-memory MSW demo server per viewport',
        sourceSha256: Object.fromEntries(files.map(file => [file, sha256(file)])),
        viewports, observations, pageErrors,
        layout: { status: layoutReport.status, totalFindings: layoutReport.findings.length, counts: layoutReport.counts, ordersFindings: layoutReport.findings.filter(finding => finding.file === 'apps/web/src/modules/orders/index.tsx'), checkerSchemaVersion: layoutReport.schemaVersion },
        note: phase === 'baseline-stable' ? 'Stable supplementary baseline; the first baseline remains preserved but action screenshots had browser auto-scroll/transition artifacts. This stable capture is the comparison baseline. R18 selections remain unsaved; R19 quote is synthetic mock on a fresh in-memory server; R43 inspection/request states are not submitted.' : 'For R18 the selected synthetic address and other selections remain unsaved. R19 quote is a synthetic mock command on a fresh in-memory server. R43 inspection/request states are not submitted. Each route state is captured before any W11 source edit; this artifact and its screenshots are immutable.',
    };
    fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    if (result.status === 'CAPTURE_FAILED') process.exitCode = 1;
    console.log(JSON.stringify({ status: result.status, phase, observations: observations.length, pageErrors: pageErrors.length, totalFindings: result.layout.totalFindings, ordersFindings: result.layout.ordersFindings.length, output }, null, 2));
} finally {
    await browser.close();
}
