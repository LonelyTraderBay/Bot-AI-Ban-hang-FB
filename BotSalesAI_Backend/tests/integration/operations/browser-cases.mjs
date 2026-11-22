import assert from 'node:assert/strict';
import { appOrigin } from '../../../infra/p0/oidc/tls.mjs';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { fixtureWriter } from '../orders/fixtures.mjs';

const [shop] = fixtureShops;
const shopPath = appOrigin + '/s/' + shop.id;
const api = appOrigin + '/api/v2/shops/' + shop.id;

async function get(page, path) {
    const response = await page.request.get(api + path);
    assert.equal(response.status(), 200, path);
    return (await response.json()).data;
}

export async function verifyOperationsFlow(page, before = false) {
    const writer = fixtureWriter();
    let work, rule;
    try {
        work = await writer.workItem.findFirstOrThrow({ where: {
            shopId: shop.id, kind: 'recovery', sourceType: 'purchase_order', state: { in: ['queued', 'claimed', 'working', 'blocked'] },
        }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
        if (!before) rule = await writer.reorderRule.findFirstOrThrow({ where: { shopId: shop.id, enabled: true, mode: 'auto_send',
            delegation: { status: 'active', expiresAt: { gt: new Date() } },
        }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    } finally {
        await writer.$disconnect();
    }
    const purchaseId = work.sourceId;
    await page.goto(shopPath + '/operations/exceptions?q=' + purchaseId);
    await page.getByRole('heading', { name: 'Ngoại lệ và tác vụ nền' }).waitFor();
    const task = page.getByRole('row').filter({ hasText: work.id });
    await task.getByRole('link', { name: before ? 'Tìm đơn mua' : 'Mở đơn mua' }).click();
    await page.waitForURL(url => url.pathname.endsWith('/purchases'));
    const dialog = page.getByRole('dialog', { name: 'Đơn mua ' + purchaseId, exact: true });
    if (before) {
        await page.getByRole('table', { name: 'Đơn mua hàng' }).waitFor();
        assert.equal(new URL(page.url()).searchParams.get('q'), purchaseId);
        assert.equal(await dialog.count(), 0);
        assert.equal((await get(page, '/purchase-orders/' + purchaseId)).id, purchaseId);
        await page.goto(shopPath + '/operations/digests');
        await page.getByText('Đây là dữ liệu mô phỏng.', { exact: false }).waitFor();
        console.log('Baseline R63 passes an unused q and fails to open R46 details. R52 shows a mock notice while consuming the live backend.');
        return;
    }
    assert.equal(new URL(page.url()).searchParams.get('purchaseId'), purchaseId);
    await dialog.waitFor();
    await dialog.getByRole('table', { name: 'Sản phẩm trong đơn mua', exact: true }).waitFor();

    await page.goto(shopPath + '/operations');
    await page.getByRole('heading', { name: 'Công việc hôm nay', exact: true }).waitFor();
    await page.getByText('Chờ phê duyệt', { exact: true }).waitFor();
    assert.equal(await page.getByText('Dữ liệu vận hành và trạng thái dịch vụ đang được mô phỏng', { exact: false }).count(), 0);
    await page.goto(shopPath + '/operations/digests');
    await page.getByRole('heading', { name: 'Bản tin & sức khỏe hệ thống', exact: true }).waitFor();
    await page.getByText('worker', { exact: true }).waitFor();
    assert.equal(await page.getByText('Đây là dữ liệu mô phỏng.', { exact: false }).count(), 0);
    const digests = await get(page, '/digests?limit=20');
    assert.ok(digests.length);
    await page.getByText(digests[0].id, { exact: false }).waitFor();

    await page.goto(shopPath + '/bot/team');
    await page.getByRole('heading', { name: 'Đội ngũ AI', exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Kho & mua hàng', exact: true }).waitFor();
    await page.getByText('purchase.send', { exact: true }).waitFor();
    const roles = await get(page, '/agent-roles');
    assert.equal(roles.length, 4);
    const grants = await get(page, '/purchase-delegations?limit=20');
    assert.ok(grants.length);
    await page.goto(shopPath + '/approvals');
    await page.getByRole('heading', { name: 'Cần phê duyệt', exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Ủy quyền gửi đơn mua', exact: true }).waitFor();
    await page.getByRole('table', { name: 'Ủy quyền gửi đơn mua' }).getByRole('row')
        .filter({ hasText: grants[0].budgetPolicyId }).first().waitFor();
    assert.equal(await page.getByText('Đây là worker MSW local xác định.', { exact: false }).count(), 0);
    await page.goto(shopPath + '/replenishment');
    await page.getByRole('tab', { name: 'Quy tắc theo SKU', exact: true }).click();
    await page.getByRole('row').filter({ hasText: rule.variantId }).getByRole('button', { name: 'Chỉnh quy tắc' }).click();
    const editor = page.getByRole('dialog', { name: 'Quy tắc nhập lại', exact: true });
    await editor.getByRole('combobox', { name: /^Ngân sách mua hàng đã duyệt/ }).waitFor();
    await editor.getByRole('combobox', { name: /^Ủy quyền purchase\.send/ }).waitFor();
    const warehouse = editor.getByRole('combobox', { name: /^Kho nhập lại/ });
    const more = editor.getByRole('button', { name: 'Tải thêm kho nhập lại' });
    for (let pageNumber = 0; pageNumber < 10 && (await warehouse.innerText()).includes('Đang giữ kho') && await more.isVisible(); pageNumber++) {
        const loaded = page.waitForResponse(response => new URL(response.url()).pathname === new URL(api + '/warehouses').pathname &&
            new URL(response.url()).searchParams.has('cursor'));
        void loaded.catch(() => {});
        await more.click();
        assert.equal((await loaded).status(), 200);
    }
    const saved = page.waitForResponse(response => response.url() === api + '/reorder-rules/' + rule.id && response.request().method() === 'PUT');
    void saved.catch(() => {});
    await editor.getByRole('checkbox', { name: 'Tôi đã kiểm giới hạn, snapshot và phạm vi tự gửi' }).check();
    try {
        await editor.getByRole('button', { name: 'Lưu quy tắc', exact: true }).click({ timeout: 10000 });
    } catch (error) {
        throw new Error('R45 không lưu: ' + (await editor.getByRole('combobox').allTextContents()).join(' | '), { cause: error });
    }
    const submitted = await saved;
    const response = await submitted.json();
    assert.equal(submitted.status(), 200, `R45 received HTTP ${submitted.status()} (${response.code ?? 'unknown'}): ${JSON.stringify(response.errors ?? [])}`);
    const confirmedRule = response.data;
    assert.equal(confirmedRule.budgetPolicyId, rule.budgetPolicyId);
    assert.equal(confirmedRule.purchaseDelegationId, rule.purchaseDelegationId);
    const dashboard = await get(page, '/dashboard');
    assert.ok(dashboard.pendingOrders > 0);
    await page.goto(shopPath + '/overview');
    await page.getByText('Đơn chờ xử lý', { exact: true }).waitFor();

    await page.goto(shopPath + '/reports/marketing');
    await page.getByRole('heading', { name: 'Thông tin cho marketing', exact: true }).waitFor();
    await page.getByText('Kỳ này chưa có số thực tế từ API', { exact: true }).waitFor();
    const summary = await get(page, '/marketing-summary?bucket=week');
    const promo = summary.promotionResults.find(row => row.name.startsWith('R53 kiểm xác nhận') && row.netSales.amount === '190');
    assert.ok(promo);
    await page.getByRole('table', { name: 'Kết quả ưu đãi' }).getByRole('row').filter({ hasText: promo.name }).waitFor();
    console.log('R63 opens the exact R46 order directly. R45 saved with an applied budget and matching delegation. R37, R38, R52, R51, R04 and R53 rendered live scoped data.');
}
