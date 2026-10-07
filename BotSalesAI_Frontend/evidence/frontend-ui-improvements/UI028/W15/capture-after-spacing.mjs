import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const root = process.cwd();
const evidence = path.join(root, 'evidence/frontend-ui-improvements/UI028/W15');
const sourcePath = path.join(root, 'apps/web/src/modules/finance/index.tsx');
const sourceSha256 = createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
const captures = [];
const pageErrors = [];
const writeRequests = [];
const server = await startDemoServer({ cacheIsolationKey: 'ui028-w15-after-spacing' });
const browser = await chromium.launch();

function refuseOverwrite(file) {
    if (fs.existsSync(file)) throw new Error(`Refusing to overwrite W15 evidence: ${file}`);
}

async function capture(page, name, route, state, viewport) {
    const file = path.join(evidence, `after-${name}-${viewport.width}.png`);
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

async function openRoute(page, route, title) {
    await page.goto(new URL(route, server.url).toString());
    await page.getByRole('heading', { name: title, exact: true }).waitFor();
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

        await openRoute(page, '/s/shop-demo/finance', 'Dòng tiền');
        await page.getByRole('textbox', { name: 'Từ ngày' }).waitFor();
        await capture(page, 'r20-cashflow', 'R20', 'report-summary', viewport);

        await openRoute(page, '/s/shop-demo/finance/entries', 'Sổ thu chi');
        await page.getByRole('table').first().waitFor();
        await capture(page, 'r21-entries', 'R21', 'collection', viewport);
        await page.getByRole('button', { name: 'Tạo phiếu', exact: true }).click();
        await page.getByRole('dialog', { name: 'Phiếu thu chi mới' }).waitFor();
        await capture(page, 'r21-entry-draft-dialog', 'R21', 'new-draft-dialog', viewport);

        await openRoute(page, '/s/shop-demo/finance/profit-loss', 'Lợi nhuận quản trị');
        await page.getByRole('heading', { name: 'Hỏi đáp có nguồn', exact: true }).waitFor();
        await capture(page, 'r22-profit-loss', 'R22', 'report-summary', viewport);
        await page.getByRole('button', { name: 'Tạo giải thích mô phỏng', exact: true }).click();
        await page.getByRole('region', { name: 'Giải thích báo cáo mô phỏng' }).waitFor();
        await capture(page, 'r22-explanation', 'R22', 'local-mock-explanation', viewport);

        await openRoute(page, '/s/shop-demo/finance/journals', 'Bút toán');
        await page.getByRole('table').first().waitFor();
        await capture(page, 'r48-journals', 'R48', 'collection', viewport);
        await page.getByRole('button', { name: 'Tạo bút toán nháp', exact: true }).click();
        await page.getByRole('dialog', { name: 'Bút toán nháp' }).waitFor();
        await capture(page, 'r48-journal-draft-dialog', 'R48', 'new-journal-dialog', viewport);

        await openRoute(page, '/s/shop-demo/finance/reconciliation', 'Đối soát ngân hàng & COD');
        await page.getByRole('table').first().waitFor();
        await capture(page, 'r49-bank', 'R49', 'bank-tab', viewport);
        await page.getByRole('tab', { name: 'COD', exact: true }).click();
        await page.getByRole('table').first().waitFor();
        await capture(page, 'r49-cod', 'R49', 'cod-tab', viewport);
        await page.getByRole('tab', { name: 'Chênh lệch cần xử lý', exact: true }).click();
        await page.getByRole('table').first().waitFor();
        await capture(page, 'r49-cases', 'R49', 'cases-tab', viewport);
        const match = page.getByRole('button', { name: 'Ghép giao dịch', exact: true }).first();
        if (await match.isVisible().catch(() => false)) {
            await match.click();
            await page.getByRole('dialog', { name: 'Ghép giao dịch với công nợ' }).waitFor();
            await capture(page, 'r49-bank-match-dialog', 'R49', 'case-match-dialog', viewport);
        }
        await openRoute(page, '/s/shop-demo/finance/reconciliation', 'Đối soát ngân hàng & COD');
        await page.getByRole('button', { name: 'Nhập bảng đối soát', exact: true }).click();
        await page.getByRole('dialog', { name: 'Nhập bảng đối soát' }).waitFor();
        await capture(page, 'r49-import-dialog', 'R49', 'import-dialog', viewport);

        await openRoute(page, '/s/shop-demo/finance/debts-periods', 'Công nợ & khóa kỳ');
        await page.getByRole('table').first().waitFor();
        await capture(page, 'r50-debts-periods', 'R50', 'debts-and-periods', viewport);
        const closePeriod = page.getByRole('button', { name: 'Kiểm & khóa kỳ', exact: true }).first();
        if (await closePeriod.isVisible().catch(() => false)) {
            await closePeriod.click();
            await page.getByRole('dialog', { name: 'Khóa kỳ kế toán' }).waitFor();
            await capture(page, 'r50-close-period-dialog', 'R50', 'close-period-confirmation', viewport);
        }
        const reopenPeriod = page.getByRole('button', { name: 'Mở lại có phê duyệt', exact: true }).first();
        if (await reopenPeriod.isVisible().catch(() => false)) {
            await reopenPeriod.click();
            await page.getByRole('dialog', { name: 'Mở lại kỳ đã khóa' }).waitFor();
            await capture(page, 'r50-reopen-period-dialog', 'R50', 'reopen-period-form', viewport);
        }

        await page.close();
    }

    if (pageErrors.length || writeRequests.length) throw new Error(`Unexpected baseline browser errors/writes: ${JSON.stringify({ pageErrors, writeRequests })}`);
    const report = {
        schemaVersion: 1,
        task: 'UI028.W15',
        capturedAt: new Date().toISOString(),
        mode: 'synthetic in-memory MSW demo; interactions open/read only and local mock explanation does not write',
        source: { path: 'apps/web/src/modules/finance/index.tsx', sha256: sourceSha256 },
        browser: 'Chromium',
        captures,
        pageErrors,
        writeRequests,
        verdict: 'AFTER_SOURCE_RENDER_FOR_W15_SPACING_DELTA; checkout source had staged and unstaged changes at W15 intake',
    };
    const output = path.join(evidence, 'render-after-spacing-current-20261005.json');
    refuseOverwrite(output);
    fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
    process.stdout.write(`${JSON.stringify({ output: path.basename(output), observations: captures.length, pageErrors: pageErrors.length, writeRequests: writeRequests.length, sourceSha256 })}\n`);
} finally {
    await browser.close();
    await server.close();
}
