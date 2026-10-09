import fs from 'node:fs';
import path from 'node:path';
import { chromium, firefox } from 'playwright';
import { measurePage } from './browser-probe.mjs';

const out = path.resolve('evidence/frontend-component-risk-audit-20261008');
const engine = process.argv[2] || 'chromium';
const scenarios = [
    ['customer-create', 'customers', 'Thêm khách hàng'],
    ['category-create', 'categories', 'Thêm danh mục'],
    ['bot-draft', 'bot', 'Sửa bản nháp'],
    ['bot-evaluation', 'bot/evaluations', 'Chạy đánh giá'],
    ['agent-assign', 'bot/team', 'Phân công'],
    ['agent-budget', 'bot/team', 'Đổi có phê duyệt'],
    ['entry-create', 'finance/entries', 'Tạo phiếu'],
    ['entry-detail', 'finance/entries', 'Chi tiết'],
    ['journal-create', 'finance/journals', 'Tạo bút toán nháp'],
    ['statement-import', 'finance/reconciliation', 'Nhập bảng đối soát'],
    ['shipment-create', 'shipments', 'Tạo vận đơn'],
    ['shipment-detail', 'shipments', 'Chi tiết'],
    ['supplier-create', 'suppliers', 'Thêm nhà cung cấp'],
    ['supplier-offer', 'suppliers', 'Thêm báo giá'],
    ['replenishment-create', 'replenishment', 'Thêm quy tắc'],
    ['purchase-create', 'purchases', 'Tạo đơn mua'],
    ['receipt-create', 'receipts', 'Tạo phiếu nhận'],
    ['team-invite', 'team', 'Mời nhân viên'],
    ['privacy-request', 'privacy', 'Tạo yêu cầu'],
    ['knowledge-create', 'knowledge', 'Thêm nguồn kiến thức'],
    ['knowledge-draft', 'knowledge/k3', 'Sửa bản nháp'],
    ['service-case-create', 'service-cases', 'Tạo yêu cầu'],
    ['device-revoke', 'devices', 'Thu hồi'],
    ['channel-disconnect', 'channels', 'Ngắt kết nối'],
    ['ai-provider-create', 'ai-providers', 'Thêm kết nối AI'],
    ['return-create', 'returns?orderId=DH-DEMO-PAID-01', 'Tạo yêu cầu trả'],
    ['fulfillment-prep', 'fulfillment', 'Mở phiếu lấy hàng'],
    ['order-edit', 'orders/DH-1001', 'Sửa đơn nháp'],
    ['role-control-confirm', 'operations/digests', 'Kiểm tra điều kiện tiếp tục'],
    ['feedback', 'overview', 'Góp ý'],
];

function faces() {
    const visible = e => { const r = e.getBoundingClientRect(); return r.width && r.height && !e.closest('[hidden], [aria-hidden=true]'); };
    return [...document.querySelectorAll('[data-ui-composition], main .MuiStack-root')].filter(visible).filter(e => getComputedStyle(e).flexDirection === 'row').map(e => {
        const fields = [...e.children].map(c => c.matches('.MuiFormControl-root') ? c : c.querySelector('.MuiFormControl-root')).filter(Boolean).map(f => ({ label: f.querySelector('label')?.textContent, y: f.querySelector('.MuiInputBase-root')?.getBoundingClientRect().y, height: f.querySelector('.MuiInputBase-root')?.getBoundingClientRect().height, rootHeight: f.getBoundingClientRect().height }));
        return { composition: e.getAttribute('data-ui-composition'), alignItems: getComputedStyle(e).alignItems, fields, offset: fields.length > 1 ? Math.max(...fields.map(f => f.y)) - Math.min(...fields.map(f => f.y)) : 0 };
    }).filter(r => r.fields.length > 1);
}

const browser = await ({ chromium, firefox }[engine]).launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const observations = [], errors = [], writes = [];
let scope = '';
page.on('pageerror', e => errors.push({ scope, error: e.message }));
page.on('request', r => { const pathname = new URL(r.url()).pathname; if (pathname.startsWith('/api/v2/') && !['GET', 'HEAD', 'OPTIONS'].includes(r.method())) writes.push({ scope, method: r.method(), pathname }); });
async function ready(route, width) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://127.0.0.1:4173/s/shop-demo/' + route);
    await page.locator('main h1').waitFor();
    await page.waitForFunction(() => !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'));
}
async function capture(id, width, screen = false) {
    const geometry = await page.evaluate(measurePage), fieldFaces = await page.evaluate(faces);
    const result = { id, width, url: page.url(), status: 'OBSERVED', dialogTitle: await page.locator('[role=dialog] h2').first().textContent().catch(() => null), ...geometry, fieldFaces };
    observations.push(result);
    if (geometry.stretchedActions.length || geometry.localOverflow.length || fieldFaces.some(f => f.offset > 8)) console.log(JSON.stringify({ engine, id, width, stretched: geometry.stretchedActions.map(a => ({ label: a.label, height: a.box.height, naturalHeight: a.naturalHeight })), faces: fieldFaces.filter(f => f.offset > 8), overflow: geometry.localOverflow.length }));
    if (screen || geometry.stretchedActions.length) { const file = `${engine}-${id}-${width}.png`; await page.screenshot({ path: path.join(out, file), fullPage: true }); result.screenshot = file; }
}
try {
    for (const width of [320, 768, 1440]) {
        for (const [id, route, trigger] of scenarios) {
            scope = `${id}:${width}`;
            try {
                await ready(route, width);
                const button = page.getByRole('button', { name: trigger, exact: true }).first();
                await button.waitFor({ state: 'visible', timeout: 3500 });
                if (!await button.isEnabled()) { observations.push({ id, width, status: 'UNAVAILABLE', reason: 'Trigger disabled in current seed' }); continue; }
                await button.click();
                await page.getByRole('dialog').first().waitFor({ timeout: 5000 });
                await page.waitForFunction(() => !document.querySelector('[role=dialog] .MuiCircularProgress-root, [role=dialog] .MuiLinearProgress-root'));
                // A computed transition state is not the final dialog layout.
                await page.getByRole('dialog').first().evaluate(async e => { await Promise.all(e.getAnimations({ subtree: true }).map(a => a.finished.catch(() => {}))); });
                await capture(id, width);
            } catch (error) { observations.push({ id, width, status: 'NOT_OBSERVED', reason: error.message }); console.log(`${engine} ${scope} NOT_OBSERVED: ${error.message.split('\n')[0]}`); }
        }
        scope = `order-line-clean:${width}`;
        await ready('orders/new', width);
        await capture('order-line-clean', width, width === 1440);
        await page.getByRole('textbox', { name: 'Số lượng', exact: true }).fill('0');
        await capture('order-line-invalid', width, width === 1440);
        scope = `product-editor:${width}`;
        await ready('products/p1', width);
        await capture('product-editor', width, width === 1440);
        scope = `import-mapping:${width}`;
        await ready('products/import', width);
        if (!await page.getByRole('textbox', { name: 'Tên cột trong tệp' }).count()) {
            observations.push({ id: 'import-mapping', width, status: 'NOT_OBSERVED', reason: 'Import route did not render the mapping; route must be corrected from canonical manifest.' });
        } else await capture('import-mapping', width);
    }
} finally {
    fs.writeFileSync(path.join(out, `states-${engine}.json`), JSON.stringify({ capturedAt: new Date().toISOString(), engine, scenarios, observations, errors, writes }, null, 2));
    await browser.close();
    console.log(JSON.stringify({ engine, observations: observations.length, observed: observations.filter(o => o.status === 'OBSERVED').length, notObserved: observations.filter(o => o.status !== 'OBSERVED').map(o => ({ id: o.id, width: o.width, status: o.status })), errors, writes }));
}
