import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { startDemoServer } from '../session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

async function gotoDemo(page: import('@playwright/test').Page, route: string) {
    await page.goto(new URL(route, demoUrl).toString());
}

async function chooseOption(page: import('@playwright/test').Page, label: string, value: string | RegExp, within?: import('@playwright/test').Locator) {
    const scope = within || page;
    await scope.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: typeof value === 'string' }).click();
}

async function readList<T>(page: import('@playwright/test').Page, resource: string): Promise<T[]> {
    return page.evaluate(async (path) => {
        const response = await fetch(`/api/v2/shops/shop-demo/${path}?limit=100`);
        if (!response.ok) throw new Error(`Expected ${path} GET to succeed, got ${response.status}`);
        const envelope = await response.json();
        return envelope.data as T[];
    }, resource);
}

test('FE022.VS01 catalog → stock → order → prep keeps product, reservation, and order references linked', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/inventory');
    const stockRow = page.getByRole('row').filter({ hasText: 'AO-002' });
    await expect(stockRow).toBeVisible();
    await stockRow.getByRole('link', { name: 'Mở sản phẩm' }).click();
    await expect(page).toHaveURL(/\/products\?q=AO-002$/);
    await expect(page.getByText('Áo thun Essential', { exact: true })).toBeVisible();

    const before = (await readList<{ variantId: string; onHand: number; reserved: number; available: number }>(page, 'inventory')).find(item => item.variantId === 'v-p2');
    expect(before).toBeTruthy();
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Đơn hàng' }).click();
    const orderRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
    await expect(orderRow).toBeVisible();
    await orderRow.getByRole('link', { name: 'Xem đơn' }).click();
    await expect(page.getByRole('heading', { name: 'Đơn DH-1001', exact: true })).toBeVisible();
    const quote = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders/DH-1001/quote'));
    await page.getByRole('button', { name: 'Lấy báo giá hiện tại' }).click();
    expect((await quote).status()).toBe(200);
    const customerConfirmation = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/customer-confirmations'));
    await page.getByRole('button', { name: 'Mô phỏng khách đồng ý báo giá' }).click();
    expect((await customerConfirmation).status()).toBe(200);
    const confirmation = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders/DH-1001/confirm'));
    await page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng' }).click();
    expect((await confirmation).status()).toBe(202);
    await expect(page.getByText('Đã xác nhận', { exact: true })).toBeVisible();

    const after = (await readList<{ variantId: string; onHand: number; reserved: number; available: number }>(page, 'inventory')).find(item => item.variantId === 'v-p2');
    expect(after).toBeTruthy();
    expect(after?.onHand).toBe(before?.onHand);
    expect(after?.reserved).toBe((before?.reserved || 0) + 1);
    expect(after?.available).toBe((before?.available || 0) - 1);

    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Chuẩn bị hàng' }).click();
    const jobs = await readList<{ id: string; orderId: string; lines: Array<{ sku: string; orderLineId: string }> }>(page, 'prep-jobs');
    const prep = jobs.find(job => job.orderId === 'DH-1001');
    expect(prep).toBeTruthy();
    expect(prep?.lines).toEqual(expect.arrayContaining([expect.objectContaining({ sku: 'AO-002', orderLineId: 'ol-1001' })]));
    const prepRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
    await expect(prepRow).toBeVisible();
    await prepRow.getByRole('button', { name: 'Mở phiếu lấy hàng' }).click();
    const dialog = page.getByRole('dialog', { name: 'Phiếu chuẩn bị DH-1001' });
    const claim = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/claim'));
    await dialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' }).click();
    expect((await claim).status()).toBe(200);
    await dialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' }).fill('AO-002');
    await dialog.getByRole('spinbutton', { name: 'Số lượng đã lấy' }).fill('1');
    const pick = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/pick'));
    await dialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' }).click();
    const picked = await pick;
    expect(picked.status()).toBe(200);
    expect(JSON.parse(picked.request().postData() || 'null')).toMatchObject({ orderLineId: 'ol-1001', scannedSku: 'AO-002', pickedQuantity: 1 });
    await expect(dialog.getByText('1/1', { exact: true })).toBeVisible();
});

test('FE022.VS02 procurement → approval → receipt → stock and payable preserves the purchase identity', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/purchases');
    await expect(page.getByRole('heading', { name: 'Đơn mua hàng', exact: true })).toBeVisible();
    const before = (await readList<{ variantId: string; onHand: number }>(page, 'inventory')).find(item => item.variantId === 'v-p1');
    expect(before).toBeTruthy();
    await page.getByRole('button', { name: 'Tạo đơn mua', exact: true }).click();
    const draft = page.getByRole('dialog', { name: 'Đơn mua mới' });
    await chooseOption(page, 'Nhà cung cấp đã duyệt', 'Xưởng hàng mẫu', draft);
    await chooseOption(page, 'Báo giá dòng 1', /v-p1/, draft);
    await draft.getByRole('spinbutton', { name: 'Số lượng dòng 1' }).fill('10');
    const createPurchase = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/purchase-orders'));
    await draft.getByRole('button', { name: 'Lưu đơn nháp' }).click();
    const created = await createPurchase;
    expect(created.status()).toBe(201);
    const purchase = (await created.json()).data;
    const purchaseId = purchase.id as string;

    const requestApproval = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/purchase-orders/${purchaseId}/request-approval`));
    await page.getByRole('button', { name: 'Xin phê duyệt', exact: true }).click();
    expect((await requestApproval).status()).toBe(200);
    await page.getByRole('link', { name: /Xem phê duyệt/ }).click();
    const approvalRow = page.getByRole('row').filter({ hasText: purchaseId });
    await expect(approvalRow).toBeVisible();
    await approvalRow.getByRole('button', { name: 'Xem & quyết định' }).click();
    const decisionDialog = page.getByRole('dialog', { name: 'Xem xét phê duyệt' });
    await decisionDialog.getByRole('textbox', { name: 'Lý do quyết định' }).fill('Duyệt đơn của scenario FE022.');
    const decision = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/decision'));
    await decisionDialog.getByRole('button', { name: 'Duyệt đúng nội dung này' }).click();
    expect((await decision).status()).toBe(200);

    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Đơn mua hàng' }).click();
    const purchaseRow = page.getByRole('row').filter({ hasText: purchaseId });
    await expect(purchaseRow).toBeVisible();
    await purchaseRow.getByRole('button', { name: 'Xem chi tiết' }).click();
    const details = page.getByRole('dialog', { name: `Đơn mua ${purchaseId}` });
    const sendReady = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/purchase-orders/${purchaseId}/send`));
    await details.getByRole('button', { name: 'Gửi đơn mua' }).click();
    await page.getByRole('dialog', { name: 'Gửi đơn mua đã duyệt' }).getByRole('button', { name: 'Xác nhận', exact: true }).click();
    expect((await sendReady).status()).toBe(202);
    await expect(details.getByText('Đã gửi', { exact: true })).toBeVisible();
    await details.getByRole('button', { name: 'Nhà cung cấp đã xác nhận' }).click();
    const supplierDialog = page.getByRole('dialog', { name: 'Ghi nhận xác nhận của nhà cung cấp' });
    await supplierDialog.getByRole('textbox', { name: 'Tham chiếu đơn phía nhà cung cấp' }).fill(`FE022-${purchaseId}`);
    await supplierDialog.getByRole('textbox', { name: 'Mã bằng chứng xác nhận' }).fill(`FE022-PROOF-${purchaseId}`);
    const supplierConfirmation = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/purchase-orders/${purchaseId}/confirm`));
    await supplierDialog.getByRole('button', { name: 'Ghi xác nhận' }).click();
    expect((await supplierConfirmation).status()).toBe(200);
    await expect(details.getByText('Đã xác nhận', { exact: true })).toBeVisible();
    await details.getByRole('link', { name: /Nhận hàng theo đơn này/ }).click();

    await page.getByRole('button', { name: 'Tạo phiếu nhận', exact: true }).click();
    const receiptDraft = page.getByRole('dialog', { name: 'Phiếu nhận hàng mới' });
    await chooseOption(page, 'Đơn mua đã xác nhận', purchaseId, receiptDraft);
    await receiptDraft.getByRole('textbox', { name: 'Mã phiếu giao / chứng từ nguồn' }).fill('FE022-RECEIPT-VS02');
    await receiptDraft.getByRole('spinbutton', { name: 'Nhận đạt v-p1' }).fill('2');
    const createReceipt = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/goods-receipts'));
    await receiptDraft.getByRole('button', { name: 'Tạo phiếu nháp' }).click();
    const receiptResponse = await createReceipt;
    expect(receiptResponse.status()).toBe(201);
    const receipt = (await receiptResponse.json()).data;
    expect(receipt).toMatchObject({ purchaseOrderId: purchaseId, status: 'draft', sourceDocumentRef: 'FE022-RECEIPT-VS02' });
    const receiptRow = page.getByRole('row').filter({ hasText: 'FE022-RECEIPT-VS02' });
    await receiptRow.getByRole('button', { name: 'Xem / ghi nhận phiếu' }).click();
    const receiptDetails = page.getByRole('dialog', { name: new RegExp(`Phiếu nhận ${receipt.id}`) });
    await receiptDetails.getByRole('button', { name: 'Kiểm & ghi nhận vào kho' }).click();
    const post = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/goods-receipts/${receipt.id}/post`));
    await page.getByRole('dialog', { name: 'Ghi nhận hàng đã kiểm vào kho' }).getByRole('button', { name: 'Xác nhận', exact: true }).click();
    expect((await post).status()).toBe(202);

    const after = (await readList<{ variantId: string; onHand: number }>(page, 'inventory')).find(item => item.variantId === 'v-p1');
    expect(after?.onHand).toBe((before?.onHand || 0) + 2);
    const debts = await readList<{ source?: { type?: string; id?: string }; direction: string; originalAmount: { amount: string } }>(page, 'debts');
    const payable = debts.find(debt => debt.source?.type === 'goods_receipt' && debt.source.id === receipt.id);
    expect(payable).toMatchObject({ direction: 'payable', originalAmount: { amount: '200000' } });
});

test('FE022.VS03 finance → reconciliation retains bank transaction and partial debt allocation', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/finance');
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Đối soát', exact: true }).click();
    await page.getByRole('button', { name: 'Nhập bảng đối soát', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nhập bảng đối soát' });
    await dialog.locator('input[type="file"]').setInputFiles({
        name: 'fe022-bank.csv', mimeType: 'text/csv',
        buffer: Buffer.from('externalTransactionId,amount,currency,direction,occurredAt,referenceText\nFE022-BANK-01,100000,VND,credit,2026-09-29T13:30:00Z,FE022 vertical reconciliation', 'utf8'),
    });
    await dialog.getByRole('textbox', { name: 'Mã tài khoản / đơn vị vận chuyển' }).fill('bank-fixture-01');
    await dialog.getByRole('textbox', { name: 'Mã đợt nhập duy nhất' }).fill('FE022-BANK-BATCH-01');
    const importResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/bank-transactions/import'));
    await dialog.getByRole('button', { name: 'Kiểm tra và nhập' }).click();
    expect((await importResponse).status()).toBe(200);
    await dialog.getByRole('button', { name: 'Hủy' }).click();

    await page.getByRole('tab', { name: 'Chênh lệch cần xử lý' }).click();
    const caseRow = page.getByRole('row').filter({ hasText: 'FE022-BANK-01' });
    await expect(caseRow).toBeVisible();
    const debtBefore = (await readList<{ id: string; outstandingAmount: { amount: string } }>(page, 'debts')).find(debt => debt.id === 'seed-debtitem-10028');
    expect(debtBefore).toBeTruthy();
    await caseRow.getByRole('button', { name: 'Ghép giao dịch' }).click();
    const matchDialog = page.getByRole('dialog', { name: 'Ghép giao dịch với công nợ' });
    await chooseOption(page, 'Khoản công nợ', /seed-debtitem-10028/, matchDialog);
    await matchDialog.getByRole('textbox', { name: 'Số tiền phân bổ (VND)' }).fill('50000');
    await matchDialog.getByRole('textbox', { name: 'Lý do' }).fill('Ghép một phần trong scenario FE022.');
    const matchResponse = page.waitForResponse(response => response.request().method() === 'POST' && /\/reconciliation-cases\/[^/]+\/match$/.test(new URL(response.url()).pathname));
    await matchDialog.getByRole('button', { name: 'Ghi kết quả đối soát' }).click();
    expect((await matchResponse).status()).toBe(202);
    const transactions = await readList<{ id: string; externalTransactionId: string; matchState: string }>(page, 'bank-transactions');
    const imported = transactions.find(transaction => transaction.externalTransactionId === 'FE022-BANK-01');
    expect(imported).toMatchObject({ matchState: 'suggested' });
    const debts = await readList<{ id: string; outstandingAmount: { amount: string } }>(page, 'debts');
    expect(Number(debts.find(debt => debt.id === 'seed-debtitem-10028')?.outstandingAmount.amount)).toBe(Number(debtBefore?.outstandingAmount.amount) - 50000);
});

test('FE022.VS04 inbox → knowledge draft → bot evaluation preserves feedback and revision source IDs', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/inbox/cv1');
    await page.getByRole('button', { name: /^Đánh giá tin nhắn/ }).first().click();
    const feedbackDialog = page.getByRole('dialog', { name: 'Đánh giá câu trả lời' });
    await feedbackDialog.getByRole('textbox', { name: 'Nội dung đề xuất sửa' }).fill('Xác minh điều kiện đổi hàng trước khi tư vấn.');
    const feedbackResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/feedback'));
    await feedbackDialog.getByRole('button', { name: 'Lưu phản hồi' }).click();
    const feedbackResponseResult = await feedbackResponse;
    expect(feedbackResponseResult.status()).toBe(201);
    const feedback = await feedbackResponseResult.json();
    expect(feedback.data.status).toBe('pending');

    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Phản hồi cần duyệt' }).click();
    await page.getByRole('button', { name: 'Duyệt nội dung' }).click();
    const review = page.getByRole('dialog', { name: 'Kiểm tra phản hồi' });
    await review.getByRole('textbox', { name: 'Nội dung đã loại dữ liệu riêng tư' }).fill('Đã xác minh chính sách đổi hàng trong dữ liệu mẫu.');
    await review.getByRole('textbox', { name: 'Lý do' }).fill('Chấp nhận trong kịch bản frontend mô phỏng.');
    const reviewResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/feedback/${feedback.data.id}/review`));
    await review.getByRole('button', { name: 'Lưu kết quả' }).click();
    const reviewed = (await (await reviewResponse).json()).data;
    expect(reviewed).toMatchObject({ id: feedback.data.id, status: 'approved', knowledgeDraftId: expect.any(String) });

    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Kiến thức cửa hàng' }).click();
    const draftRow = page.getByRole('row').filter({ hasText: 'Đề xuất từ phản hồi' });
    await expect(draftRow).toBeVisible();
    await draftRow.getByRole('link', { name: 'Đề xuất từ phản hồi' }).click();
    const detailResponse = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith(`/knowledge/${reviewed.knowledgeDraftId}`));
    const detail = (await (await detailResponse).json()).data;
    expect(detail).toMatchObject({ id: reviewed.knowledgeDraftId, status: 'draft', sourceKind: 'feedback' });
    await expect(page.getByText('Đã xác minh chính sách đổi hàng trong dữ liệu mẫu.', { exact: true })).toBeVisible();

    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Chất lượng AI' }).click();
    await page.getByRole('button', { name: 'Chạy đánh giá', exact: true }).click();
    const evaluationDialog = page.getByRole('dialog', { name: 'Đánh giá cấu hình nháp' });
    await evaluationDialog.getByRole('textbox', { name: 'Phiên bản bộ kiểm thử đã đăng ký' }).fill('FE022-synthetic-dataset-v1');
    await evaluationDialog.getByRole('textbox', { name: 'Mã bản kiến thức (tùy chọn)' }).fill(detail.draftRevisionId);
    const evaluationResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/bot/evaluations'));
    await evaluationDialog.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    const evaluation = (await (await evaluationResponse).json()).data;
    expect(evaluation).toMatchObject({ status: 'passed', knowledgeRevisionId: detail.draftRevisionId, mockOnly: true });
});

test('FE022.S05 route and feature matrix covers canonical IDs with executed cases or explicit frontend gaps', async () => {
    const readJson = <T,>(relative: string): T => JSON.parse(fs.readFileSync(path.resolve(process.cwd(), relative), 'utf8')) as T;
    const routeManifest = readJson<{ routes: Array<{ id: string; path: string; acceptanceScenarioIds: string[] }> }>('../botsales-kit/contracts/route-manifest.json');
    const featureCatalog = readJson<{ features: Array<{ id: string; title: string; scenarioId: string; routeIds: string[] }> }>('../botsales-kit/contracts/feature-catalog.json');
    const matrix = readJson<Array<{
        routeId: string;
        route: string;
        state: string;
        routeEvidence: { testFile: string; testTitle: string; result: string; logFile: string };
        acceptanceScenarioIds: string[];
        featureCoverage: Array<{
            featureId: string;
            canonicalRouteIds: string[];
            coverage: string;
            gap: string;
            evidenceCases: Array<{ id: string; file: string; title: string; result: string; logFile: string }>;
        }>;
    }>>('docs/route-implementation.json');
    const routeSource = fs.readFileSync(path.resolve(process.cwd(), 'tests/frontend.spec.ts'), 'utf8');
    const journeySource = fs.readFileSync(path.resolve(process.cwd(), 'tests/vertical-slices/fe022-flows.spec.ts'), 'utf8');
    expect(routeManifest.routes).toHaveLength(54);
    expect(featureCatalog.features).toHaveLength(64);
    expect(matrix).toHaveLength(routeManifest.routes.length);
    expect(new Set(matrix.map(route => route.routeId))).toEqual(new Set(routeManifest.routes.map(route => route.id)));

    for (const route of routeManifest.routes) {
        const row = matrix.find(item => item.routeId === route.id);
        expect(row).toMatchObject({ route: route.path, state: 'BROWSER_ROUTE_RENDERED_WITH_SYNTHETIC_API', acceptanceScenarioIds: route.acceptanceScenarioIds });
        expect(row?.routeEvidence).toMatchObject({
            testFile: 'tests/frontend.spec.ts',
            testTitle: 'all canonical routes render inside the real React demo application',
            result: 'PASS',
        });
        expect(routeSource).toContain(row?.routeEvidence.testTitle || '');
        expect(fs.existsSync(path.resolve(process.cwd(), row?.routeEvidence.logFile || ''))).toBeTruthy();
        const expectedFeatures = featureCatalog.features.filter(feature => feature.routeIds.includes(route.id));
        expect(new Set(row?.featureCoverage.map(feature => feature.featureId))).toEqual(new Set(expectedFeatures.map(feature => feature.id)));
        for (const feature of row?.featureCoverage || []) {
            const definition = expectedFeatures.find(item => item.id === feature.featureId);
            expect(feature.canonicalRouteIds).toEqual(definition?.routeIds);
            expect(['ROUTE_MOUNT_ONLY', 'PARTIAL_SYNTHETIC_CROSS_MODULE_JOURNEY', 'FRONTEND_INTERACTION_VERIFIED_SYNTHETIC']).toContain(feature.coverage);
            expect(feature.gap.trim().length).toBeGreaterThan(20);
            expect(feature.evidenceCases.length).toBeGreaterThan(0);
            if (feature.coverage === 'FRONTEND_INTERACTION_VERIFIED_SYNTHETIC')
                expect(feature.evidenceCases.some(evidence => evidence.id !== 'ROUTE-SMOKE-54')).toBeTruthy();
            for (const evidence of feature.evidenceCases) {
                expect(evidence.result).toBe('PASS');
                expect(fs.existsSync(path.resolve(process.cwd(), evidence.file))).toBeTruthy();
                expect(fs.existsSync(path.resolve(process.cwd(), evidence.logFile))).toBeTruthy();
                const source = fs.readFileSync(path.resolve(process.cwd(), evidence.file), 'utf8');
                expect(source).toContain(evidence.id === 'ROUTE-SMOKE-54' ? evidence.title : evidence.id);
                expect(fs.readFileSync(path.resolve(process.cwd(), evidence.logFile), 'utf8')).toContain(evidence.title);
            }
            expect(feature.coverage).toBe('FRONTEND_INTERACTION_VERIFIED_SYNTHETIC');
        }
    }
    const mappedIds = new Set(matrix.flatMap(route => route.featureCoverage.map(feature => feature.featureId)));
    expect(mappedIds).toEqual(new Set(featureCatalog.features.map(feature => feature.id)));
    expect(journeySource).toContain('FE022.VS01');
    expect(journeySource).toContain('FE022.VS02');
    expect(journeySource).toContain('FE022.VS03');
    expect(journeySource).toContain('FE022.VS04');
    expect(mappedIds.has('B06')).toBeTruthy();
    expect(mappedIds.has('C04')).toBeTruthy();
    expect(mappedIds.has('E08')).toBeTruthy();
    for (const featureId of ['B06', 'C04', 'E08', 'G05', 'F03']) {
        const feature = matrix.flatMap(route => route.featureCoverage).find(item => item.featureId === featureId);
        expect(feature?.coverage).toBe('FRONTEND_INTERACTION_VERIFIED_SYNTHETIC');
    }
});
