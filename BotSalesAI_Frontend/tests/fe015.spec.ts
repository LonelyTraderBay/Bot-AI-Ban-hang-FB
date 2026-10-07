import { test, expect } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';
import { dateTime, formatMoney } from '../apps/web/src/shared/model/format';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

async function gotoDemo(page: import('@playwright/test').Page, path: string) {
    await page.goto(new URL(path, demoUrl).toString());
}

async function chooseOption(page: import('@playwright/test').Page, label: string, value: string | RegExp, within?: import('@playwright/test').Locator) {
    await (within || page).getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: typeof value === 'string' }).click();
}

async function importCsv(page: import('@playwright/test').Page, kind: 'bank' | 'cod', accountOrCarrier: string, batch: string, contents: string) {
    await page.getByRole('button', { name: 'Nhập bảng đối soát', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nhập bảng đối soát' });
    if (kind === 'cod') await chooseOption(page, 'Loại bảng', 'COD', dialog);
    await dialog.locator('input[type="file"]').setInputFiles({ name: `${kind}-${batch}.csv`, mimeType: 'text/csv', buffer: Buffer.from(contents, 'utf8') });
    await dialog.getByRole('textbox', { name: 'Mã tài khoản / đơn vị vận chuyển' }).fill(accountOrCarrier);
    await dialog.getByRole('textbox', { name: 'Mã đợt nhập duy nhất' }).fill(batch);
    const importPath = kind === 'bank' ? '/bank-transactions/import' : '/cod-settlements/import';
    const responseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(importPath));
    await dialog.getByRole('button', { name: 'Kiểm tra và nhập' }).click();
    const response = await responseWait;
    const payload = await response.json();
    await expect(dialog.getByRole('link', { name: /Xem kết quả nhập/ })).toBeVisible();
    await dialog.getByRole('button', { name: 'Hủy' }).click();
    return { response, payload };
}

async function discardDialogChanges(page: import('@playwright/test').Page, dialog: import('@playwright/test').Locator) {
    await dialog.getByRole('button', { name: 'Đóng' }).click();
    const confirmation = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?' });
    await confirmation.getByRole('button', { name: 'Bỏ thay đổi' }).click();
    await expect(dialog).toBeHidden();
}

test('FE015.AC01 report filters use exact timezone boundaries and mock API aggregates', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/finance');
    const from = page.getByRole('textbox', { name: 'Từ ngày' });
    const to = page.getByRole('textbox', { name: 'Đến trước ngày' });
    await expect(from).toBeVisible();

    const septemberResponseWait = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/finance/cashflow') && url.searchParams.get('from') === '2026-08-31T17:00:00.000Z' && url.searchParams.get('to') === '2026-10-01T17:00:00.000Z';
    });
    // Arm the response listener before changing either date so a fast mock
    // response cannot arrive between the input events and the listener.
    await from.fill('2026-08-01');
    await to.fill('2026-12-01');
    await from.fill('2026-09-01');
    await to.fill('2026-10-02');
    const septemberResponse = await septemberResponseWait;
    expect(septemberResponse.status()).toBe(200);
    const report = (await septemberResponse.json()).data;
    expect(report).toMatchObject({ from: '2026-08-31T17:00:00.000Z', to: '2026-10-01T17:00:00.000Z', timezone: 'Asia/Vientiane' });
    expect(report.receipts.amount).toBe('249000');
    expect(report.disbursements.amount).toBe('274000');

    const octoberResponseWait = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/finance/cashflow') && url.searchParams.get('from') === '2026-09-30T17:00:00.000Z' && url.searchParams.get('to') === '2026-11-01T17:00:00.000Z';
    });
    await to.fill('2026-11-02');
    await from.fill('2026-10-01');
    const octoberResponse = await octoberResponseWait;
    const october = (await octoberResponse.json()).data;
    expect(october.receipts.amount).toBe('0');
    expect(october.disbursements.amount).toBe('0');

    const profitResponseWait = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/finance/profit-loss') && url.searchParams.has('from') && url.searchParams.has('to') && url.searchParams.get('timezone') === 'Asia/Vientiane';
    });
    await page.getByRole('link', { name: 'Lợi nhuận', exact: true }).click();
    const profitResponse = await profitResponseWait;
    expect(profitResponse.status()).toBe(200);
    const profit = (await profitResponse.json()).data;
    expect(profit).toHaveProperty('policyVersion', 'synthetic-policy-1');
    expect(profit).toHaveProperty('asOf');
});

test('FE021.E08 report explanation is mock-only, cites the filtered P&L snapshot, and never writes finance data', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname.includes('/shops/') && request.method() !== 'GET') writes.push(`${request.method()} ${url.pathname}`);
    });
    await gotoDemo(page, '/s/shop-demo/finance/profit-loss');
    await expect(page.getByRole('heading', { name: 'Lợi nhuận quản trị', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hỏi đáp có nguồn', exact: true })).toBeVisible();
    await expect(page.getByText(/Chế độ mô phỏng: câu trả lời theo mẫu cố định/)).toBeVisible();

    await page.getByRole('button', { name: 'Tạo giải thích mô phỏng', exact: true }).click();
    const explanation = page.getByRole('region', { name: 'Giải thích báo cáo mô phỏng' });
    await expect(explanation).toBeVisible();
    await expect(explanation).toContainText('Snapshot báo cáo ghi nhận doanh thu thuần');
    await expect(explanation).toContainText('Khoảng báo cáo');
    await expect(explanation).toContainText('synthetic-policy-1');
    await expect(explanation.getByText(/getProfitLoss chưa trả về journal ID/)).toBeVisible();
    expect(writes).toEqual([]);
});

test('UI003 report timestamps follow the active shop timezone', async ({ browser }) => {
    const isolated = await startDemoServer({ cacheIsolationKey: 'fe015-ui003-timezone' });
    const context = await browser.newContext({ timezoneId: 'America/Los_Angeles' });
    const page = await context.newPage();
    try {
        await page.goto(new URL('/s/shop-demo/settings/shop', isolated.url).toString());
        const timezone = page.getByRole('textbox', { name: 'Múi giờ' });
        await expect(timezone).toHaveValue('Asia/Vientiane');
        await timezone.fill('UTC');
        const updateWait = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname === '/api/v2/shops/shop-demo');
        await page.getByRole('button', { name: 'Lưu cấu hình' }).click();
        const updateResponse = await updateWait;
        expect(updateResponse.status()).toBe(200);
        expect((await updateResponse.json()).data.timezone).toBe('UTC');
        await expect(page.getByRole('status')).toContainText('Đã lưu cấu hình cửa hàng.');

        const utcReportWait = page.waitForResponse(response => {
            const url = new URL(response.url());
            return response.request().method() === 'GET' && url.pathname.endsWith('/finance/cashflow') && url.searchParams.get('from') === '2026-09-01T00:00:00.000Z' && url.searchParams.get('to') === '2026-10-01T00:00:00.000Z' && url.searchParams.get('timezone') === 'UTC';
        });
        await page.evaluate(() => {
            window.history.pushState({}, '', '/s/shop-demo/finance');
            window.dispatchEvent(new PopStateEvent('popstate'));
        });
        await page.getByRole('textbox', { name: 'Từ ngày' }).fill('2026-09-01');
        await page.getByRole('textbox', { name: 'Đến trước ngày' }).fill('2026-10-01');
        const utcReportResponse = await utcReportWait;
        expect(utcReportResponse.status()).toBe(200);
        const utcReport = (await utcReportResponse.json()).data;
        expect(utcReport).toMatchObject({ from: '2026-09-01T00:00:00.000Z', to: '2026-10-01T00:00:00.000Z', timezone: 'UTC' });
        expect(Date.parse(utcReport.asOf)).toBeGreaterThan(0);
        await expect(page.locator('body')).toContainText(dateTime(utcReport.from, 'UTC'));
        await expect(page.locator('body')).toContainText(dateTime(utcReport.to, 'UTC'));
        await expect(page.locator('body')).toContainText(dateTime(utcReport.asOf, 'UTC'));

        const vientianeReportWait = page.waitForResponse(response => {
            const url = new URL(response.url());
            return response.request().method() === 'GET' && url.pathname.endsWith('/finance/cashflow') && url.searchParams.get('from') === '2026-08-31T17:00:00.000Z' && url.searchParams.get('to') === '2026-09-30T17:00:00.000Z' && url.searchParams.get('timezone') === 'Asia/Vientiane';
        });
        await page.evaluate(() => {
            window.history.pushState({}, '', '/s/shop-second/finance');
            window.dispatchEvent(new PopStateEvent('popstate'));
        });
        const vientianeReportResponse = await vientianeReportWait;
        expect(vientianeReportResponse.status()).toBe(200);
        const vientianeReport = (await vientianeReportResponse.json()).data;
        expect(vientianeReport).toMatchObject({ from: '2026-08-31T17:00:00.000Z', to: '2026-09-30T17:00:00.000Z', timezone: 'Asia/Vientiane' });
        expect(Date.parse(vientianeReport.asOf)).toBeGreaterThan(0);
        await expect(page.locator('body')).toContainText(dateTime(vientianeReport.from, 'Asia/Vientiane'));
        await expect(page.locator('body')).toContainText(dateTime(vientianeReport.asOf, 'Asia/Vientiane'));
    }
    finally {
        await context.close();
        await isolated.close();
    }
});

test('FE015.E02/E03 profit report renders canonical cost, gross-profit and operating-expense values', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', request => {
        if (request.method() !== 'GET' && new URL(request.url()).pathname.includes('/shops/')) writes.push(request.method());
    });
    const reportWait = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.includes('/api/v2/') && new URL(response.url()).pathname.endsWith('/finance/profit-loss'));
    await gotoDemo(page, '/s/shop-demo/finance/profit-loss');
    const response = await reportWait;
    expect(response.status()).toBe(200);
    const report = (await response.json()).data as {
        cogs: { amount: string; currency: string };
        grossProfit: { amount: string; currency: string };
        shippingExpense: { amount: string; currency: string };
        platformFees: { amount: string; currency: string };
        paymentFees: { amount: string; currency: string };
        aiExpense: { amount: string; currency: string };
        otherOperatingExpenses: { amount: string; currency: string };
    };
    await expect(page.getByRole('heading', { name: 'Lợi nhuận quản trị', exact: true })).toBeVisible();
    for (const label of ['Giá vốn', 'Lãi gộp', 'Chi phí giao', 'Phí nền tảng', 'Phí thanh toán', 'Chi phí AI', 'Chi phí khác']) {
        await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    for (const amount of [report.cogs, report.grossProfit, report.shippingExpense, report.platformFees, report.paymentFees, report.aiExpense, report.otherOperatingExpenses]) {
        await expect(page.getByText(formatMoney(amount), { exact: true }).first()).toBeVisible();
    }
    expect(writes).toEqual([]);
});

test('FE015.AC02 journal rejects unbalanced decimal lines before POST and sends exact money strings', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/finance/journals');
    await page.getByRole('button', { name: 'Tạo bút toán nháp', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Bút toán nháp' });
    await dialog.getByRole('textbox', { name: 'Ngày hiệu lực' }).fill('2026-09-29');
    await expect(dialog.getByRole('alert').filter({ hasText: 'đang mở' })).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Loại chứng từ nguồn' }).fill('manual');
    await dialog.getByRole('textbox', { name: 'Mã chứng từ nguồn' }).fill('FE015-JOURNAL-01');
    await chooseOption(page, 'Tài khoản dòng 1', 'Tiền mặt · cash (mẫu demo)', dialog);
    await chooseOption(page, 'Tài khoản dòng 2', 'Doanh thu · sales (mẫu demo)', dialog);
    await dialog.getByRole('textbox', { name: 'Nợ' }).nth(0).fill('100.25');
    await dialog.getByRole('textbox', { name: 'Có' }).nth(1).fill('100.24');
    await dialog.getByRole('textbox', { name: 'Diễn giải dòng' }).nth(0).fill('Thu tiền mẫu');
    await dialog.getByRole('textbox', { name: 'Diễn giải dòng' }).nth(1).fill('Doanh thu mẫu');
    await dialog.getByRole('textbox', { name: 'Lý do' }).fill('Ghi nhận bút toán kiểm thử cân bằng.');
    const save = dialog.getByRole('button', { name: 'Lưu nháp' });
    await expect(save).toBeDisabled();
    await expect(dialog.getByRole('alert').filter({ hasText: 'Cần cân bằng' })).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Có' }).nth(1).fill('100.25');
    await expect(dialog.getByRole('alert').filter({ hasText: 'Đã cân bằng' })).toBeVisible();

    const requestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/journals'));
    const responseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/journals'));
    await save.click();
    const request = await requestWait;
    expect(JSON.parse(request.postData() || 'null')).toEqual({
        sourceType: 'manual', sourceId: 'FE015-JOURNAL-01', effectiveDate: '2026-09-29',
        lines: [
            { accountId: 'cash', debit: { amount: '100.25', currency: 'VND' }, credit: { amount: '0', currency: 'VND' }, description: 'Thu tiền mẫu' },
            { accountId: 'sales', debit: { amount: '0', currency: 'VND' }, credit: { amount: '100.25', currency: 'VND' }, description: 'Doanh thu mẫu' },
        ], reason: 'Ghi nhận bút toán kiểm thử cân bằng.',
    });
    expect((await responseWait).status()).toBe(201);
});

test('FE015.AC02 closed accounting period is visible and disables journal draft creation', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/finance/debts-periods');
    const period = page.getByRole('row').filter({ hasText: '2026-09-01' });
    await expect(period).toBeVisible();
    const closeRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/periods/period-2026-09/close'));
    const closeResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/periods/period-2026-09/close'));
    await period.getByRole('button', { name: 'Kiểm & khóa kỳ' }).click();
    const confirm = page.getByRole('dialog', { name: 'Khóa kỳ kế toán' });
    await confirm.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    expect(JSON.parse((await closeRequest).postData() || 'null')).toEqual({ expectedVersion: 1 });
    expect((await closeResponse).status()).toBe(202);
    await expect(period.getByText('Đã đóng', { exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Chứng từ & sổ kép', exact: true }).click();
    await page.getByRole('button', { name: 'Tạo bút toán nháp', exact: true }).click();
    const journal = page.getByRole('dialog', { name: 'Bút toán nháp' });
    await journal.getByRole('textbox', { name: 'Ngày hiệu lực' }).fill('2026-09-29');
    await expect(journal.getByRole('alert').filter({ hasText: 'đã khóa; không thể tạo' })).toBeVisible();
    await expect(journal.getByRole('button', { name: 'Lưu nháp' })).toBeDisabled();
});

test('FE015.AC03 CSV import keeps partial row failures visible and deduplicates external transactions', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/finance/reconciliation');
    const csv = [
        'externalTransactionId,amount,currency,direction,occurredAt,referenceText',
        'FE015-IMPORT-OK,100000,VND,credit,2026-09-29T12:00:00Z,Payment sample',
        'FE015-IMPORT-BAD,invalid,VND,credit,2026-09-29T12:00:00Z,Invalid amount',
    ].join('\n');
    const { response, payload } = await importCsv(page, 'bank', 'bank-fixture-01', 'FE015-BANK-PARTIAL', csv);
    expect(response.status()).toBe(200);
    expect(payload.data).toMatchObject({ status: 'partial', total: 2, completed: 1, errorCount: 1 });
    expect(payload.data.rowErrors).toHaveLength(1);
    await expect(page.getByRole('row').filter({ hasText: 'FE015-IMPORT-OK' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'FE015-IMPORT-BAD' })).toHaveCount(0);

    const duplicate = [
        'externalTransactionId,amount,currency,direction,occurredAt,referenceText',
        'FE015-IMPORT-OK,100000,VND,credit,2026-09-29T12:00:00Z,Reimport duplicate',
    ].join('\n');
    const reimport = await importCsv(page, 'bank', 'bank-fixture-01', 'FE015-BANK-REIMPORT', duplicate);
    expect(reimport.payload.data).toMatchObject({ status: 'failed', completed: 0, errorCount: 1 });
    await expect(page.getByRole('row').filter({ hasText: 'FE015-IMPORT-OK' })).toHaveCount(1);
});

test('UI001 reconciliation cursors stay scoped and dialogs load choices beyond the visible table page', async ({ page }) => {
    const invalidListResponses: string[] = [];
    const listRequests: Array<{ collection: string; cursor: string | null }> = [];
    page.on('request', request => {
        if (request.method() !== 'GET') return;
        const url = new URL(request.url());
        const collection = ['bank-transactions', 'cod-settlements', 'reconciliation-cases', 'debts'].find(name => url.pathname.endsWith(`/${name}`));
        if (collection) listRequests.push({ collection, cursor: url.searchParams.get('cursor') });
    });
    page.on('response', response => {
        if (response.status() === 422 && /\/(bank-transactions|cod-settlements|reconciliation-cases|debts)(\?|$)/.test(new URL(response.url()).pathname)) {
            invalidListResponses.push(`${response.status()} ${response.url()}`);
        }
    });
    const bankRows = Array.from({ length: 25 }, (_, index) => {
        const sequence = String(index + 1).padStart(2, '0');
        const amount = index === 4 ? '249000' : '1000';
        return `FE015-UI001-BANK-${sequence},${amount},VND,credit,2026-09-29T13:${String(index).padStart(2, '0')}:00Z,UI001 cursor fixture ${sequence}`;
    });
    await gotoDemo(page, '/s/shop-demo/finance/reconciliation');
    const bankImport = await importCsv(page, 'bank', 'bank-fixture-ui001', 'FE015-UI001-BANK-BATCH', [
        'externalTransactionId,amount,currency,direction,occurredAt,referenceText',
        ...bankRows,
    ].join('\n'));
    expect(bankImport.payload.data).toMatchObject({ status: 'succeeded', completed: 25, errorCount: 0 });
    const codImport = await importCsv(page, 'cod', 'carrier-fixture-ui001', 'FE015-UI001-COD-BATCH', [
        'externalBatchId,orderIds',
        'FE015-UI001-COD,DH-DEMO-PAID-01',
    ].join('\n'));
    expect(codImport.payload.data).toMatchObject({ status: 'succeeded', completed: 1, errorCount: 0 });

    await page.getByRole('button', { name: 'Trang tiếp' }).click();
    await expect(page.getByRole('row').filter({ hasText: 'FE015-UI001-BANK-05' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'FE015-UI001-BANK-25' })).toHaveCount(0);
    const bankCursor = new URL(page.url()).searchParams.get('bankCursor');
    expect(bankCursor).toBeTruthy();
    expect(new URL(page.url()).searchParams.has('codCursor')).toBe(false);
    expect(new URL(page.url()).searchParams.has('caseCursor')).toBe(false);
    expect(listRequests.some(request => request.collection === 'bank-transactions' && request.cursor === bankCursor)).toBe(true);
    expect(listRequests.filter(request => ['cod-settlements', 'reconciliation-cases'].includes(request.collection)).every(request => request.cursor === null)).toBe(true);
    await test.info().attach('ui001-bank-page-2.png', { body: await page.screenshot(), contentType: 'image/png' });

    await page.getByRole('tab', { name: 'COD' }).click();
    const codRow = page.getByRole('row').filter({ hasText: 'FE015-UI001-COD' });
    await expect(codRow).toBeVisible();
    await codRow.getByRole('button', { name: 'Đối chiếu' }).click();
    const codDialog = page.getByRole('dialog', { name: 'Ghép tiền COD' });
    await expect(codDialog.getByRole('button', { name: 'Tải thêm giao dịch ngân hàng' })).toBeVisible();
    await codDialog.getByRole('button', { name: 'Tải thêm giao dịch ngân hàng' }).click();
    await chooseOption(page, 'Mã giao dịch ngân hàng', /FE015-UI001-BANK-05/, codDialog);
    await codDialog.getByRole('textbox', { name: 'Phí thực tế (VND)' }).fill('0');
    await codDialog.getByRole('textbox', { name: 'Mã chứng từ phí' }).fill('FEE-UI001-CHECK');
    await expect(codDialog.getByRole('button', { name: 'Xác nhận khớp' })).toBeEnabled();
    await test.info().attach('ui001-cod-lookup.png', { body: await page.screenshot(), contentType: 'image/png' });
    await discardDialogChanges(page, codDialog);

    await page.getByRole('tab', { name: 'Chênh lệch cần xử lý' }).click();
    await expect(page.getByRole('tab', { name: 'Chênh lệch cần xử lý' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('alert').filter({ hasText: /Cursor không còn phù hợp|INVALID_CURSOR/ })).toHaveCount(0);
    const rows = page.getByRole('row');
    await expect(rows.nth(1)).toBeVisible();
    let caseRow: import('@playwright/test').Locator | undefined;
    for (let index = 1; index < await rows.count(); index++) {
        const candidate = rows.nth(index);
        const action = candidate.getByRole('button', { name: 'Ghép giao dịch' });
        if (await action.count() && await action.isEnabled()) {
            caseRow = candidate;
            break;
        }
    }
    expect(caseRow).toBeDefined();
    const bankDetailResponse = page.waitForResponse(response => response.request().method() === 'GET' && /\/bank-transactions\/[^/?]+$/.test(new URL(response.url()).pathname));
    await caseRow!.getByRole('button', { name: 'Ghép giao dịch' }).click();
    const bankDetail = (await bankDetailResponse).json();
    const caseDialog = page.getByRole('dialog', { name: 'Ghép giao dịch với công nợ' });
    await expect(caseDialog.getByRole('textbox', { name: 'Giao dịch ngoài hệ thống' })).toHaveValue((await bankDetail).data.externalTransactionId);
    await chooseOption(page, 'Khoản công nợ', /seed-debtitem-10028/, caseDialog);
    await expect(caseDialog.getByRole('combobox', { name: 'Khoản công nợ' })).toContainText('seed-debtitem-10028');
    expect(listRequests.some(request => request.collection === 'debts' && request.cursor === null)).toBe(true);
    await caseDialog.getByRole('textbox', { name: 'Số tiền phân bổ (VND)' }).fill('1000');
    await caseDialog.getByRole('textbox', { name: 'Lý do' }).fill('Đối soát UI001 kiểm tra lựa chọn ngoài trang.');
    await expect(caseDialog.getByRole('button', { name: 'Ghi kết quả đối soát' })).toBeEnabled();
    await test.info().attach('ui001-case-lookup.png', { body: await page.screenshot(), contentType: 'image/png' });
    await discardDialogChanges(page, caseDialog);

    await page.getByRole('tab', { name: 'COD' }).click();
    await codRow.getByRole('button', { name: 'Đối chiếu' }).click();
    const codMatchDialog = page.getByRole('dialog', { name: 'Ghép tiền COD' });
    await chooseOption(page, 'Mã giao dịch ngân hàng', /FE015-UI001-BANK-05/, codMatchDialog);
    await codMatchDialog.getByRole('textbox', { name: 'Phí thực tế (VND)' }).fill('0');
    await codMatchDialog.getByRole('textbox', { name: 'Mã chứng từ phí' }).fill('FEE-UI001-CHECK');
    const codMatchResponse = page.waitForResponse(response => response.request().method() === 'POST' && /\/cod-settlements\/[^/]+\/match$/.test(new URL(response.url()).pathname));
    await codMatchDialog.getByRole('button', { name: 'Xác nhận khớp' }).click();
    expect((await codMatchResponse).status()).toBe(202);

    const afterMatchBank = await importCsv(page, 'bank', 'bank-fixture-ui001', 'FE015-UI001-POSTMATCH-BATCH', [
        'externalTransactionId,amount,currency,direction,occurredAt,referenceText',
        'FE015-UI001-POSTMATCH-BANK,1000,VND,credit,2026-09-29T13:30:00Z,UI001 closed debt filter fixture',
    ].join('\n'));
    expect(afterMatchBank.payload.data).toMatchObject({ status: 'succeeded', completed: 1, errorCount: 0 });
    await page.getByRole('tab', { name: 'Chênh lệch cần xử lý' }).click();
    // The bank table remains on its own second page, so the case table may
    // render an off-page transaction's internal ID. Inspect the newest case
    // through its transaction-detail request instead of relying on that cell.
    const postMatchCase = page.getByRole('row').nth(1);
    await expect(postMatchCase).toBeVisible();
    const postMatchBankDetailResponse = page.waitForResponse(response => response.request().method() === 'GET' && /\/bank-transactions\/[^/?]+$/.test(new URL(response.url()).pathname));
    await postMatchCase.getByRole('button', { name: 'Ghép giao dịch' }).click();
    const postMatchDialog = page.getByRole('dialog', { name: 'Ghép giao dịch với công nợ' });
    const postMatchBankDetail = await postMatchBankDetailResponse;
    expect((await postMatchBankDetail.json()).data.externalTransactionId).toBe('FE015-UI001-POSTMATCH-BANK');
    await expect(postMatchDialog.getByRole('textbox', { name: 'Giao dịch ngoài hệ thống' })).toHaveValue('FE015-UI001-POSTMATCH-BANK');
    await postMatchDialog.getByRole('combobox', { name: 'Khoản công nợ' }).click();
    await expect(page.getByRole('option', { name: /seed-debtitem-10028/ })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.goBack();
    expect(new URL(page.url()).searchParams.has('bankCursor')).toBe(false);
    await expect(page.getByRole('alert').filter({ hasText: /Cursor không còn phù hợp|INVALID_CURSOR/ })).toHaveCount(0);
    expect(invalidListResponses).toEqual([]);
    await test.info().attach('ui001-network-evidence.json', {
        body: JSON.stringify({ route: '/s/shop-demo/finance/reconciliation', bankCursor, listRequests, invalidListResponses, lookupResults: ['off-page COD bank choice loaded independently and was match-valid', 'case transaction detail resolved by ID while bank page cursor was active', 'positive debt choice remained match-valid', 'zero-outstanding debt was excluded after COD settlement'], backNavigation: { bankCursorCleared: !new URL(page.url()).searchParams.has('bankCursor'), invalidCursorResponses: 0 } }, null, 2),
        contentType: 'application/json',
    });
    await test.info().attach('ui001-after-back.png', { body: await page.screenshot(), contentType: 'image/png' });
});

test('FE015.AC03 COD settlement matches net remittance plus documented fee', async ({ page }) => {
    const posts: Array<{ path: string; body: unknown }> = [];
    page.on('request', request => {
        if (request.method() === 'POST' && /\/(cod-settlements|reconciliation-cases)\/[^/]+\/match$/.test(new URL(request.url()).pathname)) {
            posts.push({ path: new URL(request.url()).pathname, body: JSON.parse(request.postData() || 'null') });
        }
    });
    await gotoDemo(page, '/s/shop-demo/finance/reconciliation');
    const bankCsv = [
        'externalTransactionId,amount,currency,direction,occurredAt,referenceText',
        'FE015-COD-BANK,229000,VND,credit,2026-09-29T13:00:00Z,COD net remittance',
    ].join('\n');
    await importCsv(page, 'bank', 'bank-fixture-01', 'FE015-COD-BANK-BATCH', bankCsv);
    const codCsv = ['externalBatchId,orderIds', 'FE015-COD-BATCH,DH-DEMO-PAID-01'].join('\n');
    const codImport = await importCsv(page, 'cod', 'carrier-fixture-01', 'FE015-COD-IMPORT-BATCH', codCsv);
    expect(codImport.payload.data).toMatchObject({ status: 'succeeded', completed: 1, errorCount: 0 });
    await page.getByRole('tab', { name: 'COD' }).click();
    const codRow = page.getByRole('row').filter({ hasText: 'FE015-COD-BATCH' });
    await expect(codRow).toBeVisible();
    await codRow.getByRole('button', { name: 'Đối chiếu' }).click();
    const codDialog = page.getByRole('dialog', { name: 'Ghép tiền COD' });
    await chooseOption(page, 'Mã giao dịch ngân hàng', /FE015-COD-BANK/, codDialog);
    await codDialog.getByRole('textbox', { name: 'Phí thực tế (VND)' }).fill('20000');
    await codDialog.getByRole('textbox', { name: 'Mã chứng từ phí' }).fill('FEE-INVOICE-FE015-01');
    const codRequest = page.waitForRequest(request => request.method() === 'POST' && /\/cod-settlements\/[^/]+\/match$/.test(new URL(request.url()).pathname));
    const codResponse = page.waitForResponse(response => response.request().method() === 'POST' && /\/cod-settlements\/[^/]+\/match$/.test(new URL(response.url()).pathname));
    await codDialog.getByRole('button', { name: 'Xác nhận khớp' }).click();
    const codBody = JSON.parse((await codRequest).postData() || 'null');
    expect(codBody).toMatchObject({ expectedVersion: 1, actualFees: { amount: '20000', currency: 'VND' }, feeEvidenceRef: 'FEE-INVOICE-FE015-01' });
    expect((await codResponse).status()).toBe(202);
    await expect(codRow.getByText('matched', { exact: true })).toBeVisible();
    expect(posts).toHaveLength(1);
});

test('FE015.AC03 partial bank allocation leaves the remaining amount and debt visible', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/finance/reconciliation');
    const partialCsv = [
        'externalTransactionId,amount,currency,direction,occurredAt,referenceText',
        'FE015-PARTIAL-BANK,100000,VND,credit,2026-09-29T13:30:00Z,Partial bank collection',
    ].join('\n');
    await importCsv(page, 'bank', 'bank-fixture-01', 'FE015-PARTIAL-BANK-BATCH', partialCsv);
    await page.getByRole('tab', { name: 'Chênh lệch cần xử lý' }).click();
    const caseRow = page.getByRole('row').filter({ hasText: 'FE015-PARTIAL-BANK' });
    await expect(caseRow).toBeVisible();
    await caseRow.getByRole('button', { name: 'Ghép giao dịch' }).click();
    const allocationDialog = page.getByRole('dialog', { name: 'Ghép giao dịch với công nợ' });
    await chooseOption(page, 'Khoản công nợ', /seed-debtitem-10028/, allocationDialog);
    await allocationDialog.getByRole('textbox', { name: 'Số tiền phân bổ (VND)' }).fill('50000');
    await allocationDialog.getByRole('textbox', { name: 'Lý do' }).fill('Ghép một phần sao kê với công nợ phải thu.');
    const allocationRequest = page.waitForRequest(request => request.method() === 'POST' && /\/reconciliation-cases\/[^/]+\/match$/.test(new URL(request.url()).pathname));
    const allocationResponse = page.waitForResponse(response => response.request().method() === 'POST' && /\/reconciliation-cases\/[^/]+\/match$/.test(new URL(response.url()).pathname));
    await allocationDialog.getByRole('button', { name: 'Ghi kết quả đối soát' }).click();
    const allocationBody = JSON.parse((await allocationRequest).postData() || 'null');
    expect(allocationBody).toMatchObject({ allocations: [{ resource: { type: 'debt', id: 'seed-debtitem-10028' }, amount: { amount: '50000', currency: 'VND' } }] });
    expect((await allocationResponse).status()).toBe(202);
    await expect(caseRow.getByText('suggested', { exact: true })).toBeVisible();
    await expect(allocationDialog).toBeHidden();
});

test('FE015.AC03 unknown journal posting is not resent from the same draft', async ({ page }) => {
    const postCalls: string[] = [];
    page.on('request', request => {
        if (request.method() === 'POST' && /\/journals\/[^/]+\/post$/.test(new URL(request.url()).pathname)) postCalls.push(request.postData() || '');
    });
    await gotoDemo(page, '/s/shop-demo/finance/journals');
    await page.getByRole('button', { name: 'Tạo bút toán nháp', exact: true }).click();
    const draft = page.getByRole('dialog', { name: 'Bút toán nháp' });
    await draft.getByRole('textbox', { name: 'Ngày hiệu lực' }).fill('2026-09-29');
    await draft.getByRole('textbox', { name: 'Mã chứng từ nguồn' }).fill('FE015-UNKNOWN-POST');
    await chooseOption(page, 'Tài khoản dòng 1', 'Tiền mặt · cash (mẫu demo)', draft);
    await chooseOption(page, 'Tài khoản dòng 2', 'Thu khác · income (mẫu demo)', draft);
    await draft.getByRole('textbox', { name: 'Nợ' }).nth(0).fill('100');
    await draft.getByRole('textbox', { name: 'Có' }).nth(1).fill('100');
    await draft.getByRole('textbox', { name: 'Diễn giải dòng' }).nth(0).fill('Thu mô phỏng');
    await draft.getByRole('textbox', { name: 'Diễn giải dòng' }).nth(1).fill('Doanh thu mô phỏng');
    await draft.getByRole('textbox', { name: 'Lý do' }).fill('Đối chiếu kết quả ghi chưa rõ theo demo.');
    const created = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/journals'));
    await draft.getByRole('button', { name: 'Lưu nháp' }).click();
    expect((await created).status()).toBe(201);
    await chooseOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
    const row = page.getByRole('row').filter({ hasText: 'FE015-UNKNOWN-POST' });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Chi tiết' }).click();
    const journal = page.getByRole('dialog', { name: /Bút toán journal-/i });
    await journal.getByRole('button', { name: 'Ghi sổ' }).click();
    const confirm = page.getByRole('dialog', { name: 'Ghi sổ bút toán' });
    const postResponse = page.waitForResponse(response => response.request().method() === 'POST' && /\/journals\/[^/]+\/post$/.test(new URL(response.url()).pathname));
    await confirm.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    expect((await postResponse).status()).toBe(202);
    await expect(page.getByText(/Có 1 thao tác chưa xác minh kết quả/)).toBeVisible();
    await expect(confirm.getByRole('alert')).toContainText(/chưa xác minh|chưa hoàn tất|unknown/i);
    await confirm.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect.poll(() => postCalls.length).toBe(1);
    expect(postCalls).toHaveLength(1);
});
