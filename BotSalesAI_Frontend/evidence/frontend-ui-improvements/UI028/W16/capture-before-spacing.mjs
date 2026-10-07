import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const root = process.cwd();
const evidence = path.join(root, 'evidence/frontend-ui-improvements/UI028/W16');
const sourcePath = path.join(root, 'apps/web/src/modules/customers/index.tsx');
const sourceSha256 = createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
const captures = [];
const pageErrors = [];
const writeRequests = [];
const server = await startDemoServer({ cacheIsolationKey: 'ui028-w16-before-spacing' });
const browser = await chromium.launch();

function refuseOverwrite(file) {
    if (fs.existsSync(file)) throw new Error(`Refusing to overwrite W16 baseline evidence: ${file}`);
}

async function capture(page, name, route, state, viewport) {
    const file = path.join(evidence, `before-${name}-${viewport.width}.png`);
    refuseOverwrite(file);
    await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
    const geometry = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        clientHeight: document.documentElement.clientHeight,
        scrollHeight: document.documentElement.scrollHeight,
    }));
    const dialog = page.getByRole('dialog').first();
    const dialogBounds = await dialog.isVisible().catch(() => false) ? await dialog.boundingBox() : null;
    captures.push({ route, state, viewport, screenshot: path.basename(file), ...geometry, dialogBounds });
}

async function openRoute(page, route, heading) {
    await page.goto(new URL(route, server.url).toString());
    await page.getByRole('heading', { name: heading, exact: true }).waitFor();
    await page.waitForLoadState('networkidle');
}

try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
        const page = await browser.newPage({ viewport });
        page.on('pageerror', error => pageErrors.push(error.message));
        page.on('request', request => {
            const url = new URL(request.url());
            if (url.pathname.startsWith('/api/v2/') && request.method() !== 'GET') writeRequests.push(`${request.method()} ${url.pathname}`);
        });

        await openRoute(page, '/s/shop-demo/customers', 'Khách hàng');
        await page.getByRole('table', { name: 'Danh sách khách hàng' }).waitFor();
        await capture(page, 'r07-customer-list', 'R07', 'collection', viewport);
        await page.getByRole('button', { name: 'Thêm khách hàng', exact: true }).click();
        await page.getByRole('dialog', { name: 'Thêm khách hàng' }).waitFor();
        await capture(page, 'r07-customer-create-dialog', 'R07', 'create-dialog', viewport);

        await openRoute(page, '/s/shop-demo/customers/c1', 'Linh (khách mẫu)');
        await page.getByRole('heading', { name: 'Yêu cầu hỗ trợ', exact: true }).waitFor();
        await capture(page, 'r08-customer-profile', 'R08', 'masked-profile-related-previews', viewport);

        await openRoute(page, '/s/shop-demo/service-cases', 'Chăm sóc sau bán');
        await page.getByRole('table').first().waitFor();
        await capture(page, 'r54-service-cases', 'R54', 'collection', viewport);
        await page.getByRole('button', { name: 'Tạo yêu cầu', exact: true }).click();
        await page.getByRole('dialog', { name: 'Yêu cầu mới' }).waitFor();
        await capture(page, 'r54-create-case-dialog', 'R54', 'create-dialog', viewport);
        await page.getByRole('button', { name: 'Đóng', exact: true }).last().click();
        await page.getByRole('button', { name: 'Xử lý', exact: true }).first().click();
        await page.getByRole('dialog', { name: 'Cập nhật yêu cầu' }).waitFor();
        await capture(page, 'r54-status-dialog', 'R54', 'versioned-status-and-reason-dialog', viewport);

        await page.close();
    }

    if (pageErrors.length || writeRequests.length) throw new Error(`Unexpected W16 baseline browser errors/writes: ${JSON.stringify({ pageErrors, writeRequests })}`);
    const report = {
        schemaVersion: 1,
        task: 'UI028.W16',
        capturedAt: new Date().toISOString(),
        mode: 'synthetic in-memory MSW demo; only route reads and opening/closing local dialogs; no mutation submitted',
        source: { path: 'apps/web/src/modules/customers/index.tsx', sha256: sourceSha256 },
        browser: 'Chromium',
        captures,
        pageErrors,
        writeRequests,
        verdict: 'PRE_SOURCE_BASELINE_FOR_W16_SPACING_DELTA; checkout customer source had pre-existing staged changes at intake',
    };
    const output = path.join(evidence, 'render-before-spacing-current-20261005.json');
    refuseOverwrite(output);
    fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
    process.stdout.write(`${JSON.stringify({ output: path.basename(output), observations: captures.length, pageErrors: pageErrors.length, writeRequests: writeRequests.length, sourceSha256 })}\n`);
} finally {
    await browser.close();
    await server.close();
}
