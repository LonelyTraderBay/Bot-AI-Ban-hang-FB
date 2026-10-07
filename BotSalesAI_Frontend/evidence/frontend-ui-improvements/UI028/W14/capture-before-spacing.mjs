import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const root = process.cwd();
const evidence = path.join(root, 'evidence/frontend-ui-improvements/UI028/W14');
const captureVersion = 'v3';
const sourcePath = path.join(root, 'apps/web/src/modules/fulfillment/index.tsx');
const sourceSha256 = createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
const screenshots = [];
const pageErrors = [];
const writes = [];
const server = await startDemoServer({ cacheIsolationKey: 'ui028-w14-before-spacing-v3' });
const browser = await chromium.launch();

function assertNewArtifact(file) {
    if (fs.existsSync(file)) throw new Error(`Refusing to overwrite evidence artifact: ${file}`);
}

async function snapshot(page, name, route, state, viewport) {
    const file = path.join(evidence, `before-${captureVersion}-${name}-${viewport.width}.png`);
    assertNewArtifact(file);
    await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
    const geometry = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        clientHeight: document.documentElement.clientHeight,
        scrollHeight: document.documentElement.scrollHeight,
    }));
    const dialog = page.getByRole('dialog').first();
    const dialogBounds = await dialog.isVisible().catch(() => false) ? await dialog.boundingBox() : null;
    screenshots.push({ route, state, viewport, screenshot: path.basename(file), ...geometry, dialogBounds });
}

try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
        const page = await browser.newPage({ viewport });
        page.on('pageerror', error => pageErrors.push(error.message));
        page.on('request', request => {
            const url = new URL(request.url());
            if (url.pathname.startsWith('/api/v2/') && request.method() !== 'GET') writes.push(`${request.method()} ${url.pathname}`);
        });

        await page.goto(new URL('/s/shop-demo/fulfillment', server.url).toString());
        await page.getByRole('heading', { name: 'Chuẩn bị hàng', exact: true }).waitFor();
        await page.getByRole('table').first().waitFor();
        await snapshot(page, 'r41-list', 'R41', 'table', viewport);
        await page.getByRole('button', { name: 'Mở phiếu lấy hàng' }).first().click();
        await page.getByRole('dialog').waitFor();
        await page.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' }).first().waitFor();
        await snapshot(page, 'r41-prep-dialog', 'R41', 'prep-dialog', viewport);
        await page.keyboard.press('Escape');

        await page.goto(new URL('/s/shop-demo/shipments', server.url).toString());
        await page.getByRole('heading', { name: 'Vận đơn & giao hàng', exact: true }).waitFor();
        await page.getByRole('table').first().waitFor();
        await snapshot(page, 'r42-list', 'R42', 'table', viewport);
        await page.getByRole('button', { name: 'Tạo vận đơn', exact: true }).click();
        const createDialog = page.getByRole('dialog', { name: 'Tạo vận đơn' });
        await createDialog.waitFor();
        await createDialog.getByRole('textbox', { name: 'Tìm đơn hàng' }).waitFor();
        await snapshot(page, 'r42-create-dialog', 'R42', 'create-shipment-dialog', viewport);
        await page.keyboard.press('Escape');

        await page.getByRole('table').first().getByRole('button', { name: 'Chi tiết' }).first().click();
        const detailDialog = page.getByRole('dialog', { name: 'Chi tiết vận đơn' });
        await detailDialog.waitFor();
        await detailDialog.getByText('Sự kiện vận chuyển', { exact: true }).waitFor();
        await snapshot(page, 'r42-detail-dialog', 'R42', 'shipment-detail-dialog', viewport);
        const eventButton = detailDialog.getByRole('button', { name: 'Cập nhật hành trình', exact: true });
        if (await eventButton.isVisible().catch(() => false)) {
            await eventButton.click();
            const eventDialog = page.getByRole('dialog', { name: 'Cập nhật hành trình có bằng chứng' });
            await eventDialog.getByRole('textbox', { name: 'Mã sự kiện bên vận chuyển' }).waitFor();
            await snapshot(page, 'r42-event-dialog', 'R42', 'shipment-event-dialog', viewport);
        }
        await page.close();
    }

    if (pageErrors.length || writes.length) throw new Error(`Unexpected browser errors/writes: ${JSON.stringify({ pageErrors, writes })}`);
    const report = {
        schemaVersion: 1,
        task: 'UI028.W14',
        capturedAt: new Date().toISOString(),
        mode: 'synthetic in-memory MSW demo; no submit actions',
        source: { path: 'apps/web/src/modules/fulfillment/index.tsx', sha256: sourceSha256 },
        browser: 'Chromium',
        screenshots,
        pageErrors,
        writeRequests: writes,
        verdict: 'BASELINE_FOR_W14_SPACING_DELTA_ONLY; source already contained staged changes at task intake',
    };
    const output = path.join(evidence, `render-before-spacing-${captureVersion}-current-20261005.json`);
    assertNewArtifact(output);
    fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
    process.stdout.write(`${JSON.stringify({ output: path.basename(output), observations: screenshots.length, pageErrors: pageErrors.length, writeRequests: writes.length, sourceSha256 })}\n`);
} finally {
    await browser.close();
    await server.close();
}
