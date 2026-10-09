import fs from 'node:fs';
import path from 'node:path';
import { chromium, firefox } from 'playwright';

const out = path.resolve('evidence/frontend-component-risk-audit-20261008');
const scenarios = [
    { id: 'bot-connection', route: 'bot', trigger: 'Sửa bản nháp', label: 'Kết nối AI' },
    { id: 'ai-provider', route: 'integrations/ai', trigger: 'Thêm kết nối AI', label: 'Provider đã có adapter' },
    { id: 'order-product', route: 'orders/DH-1001', trigger: 'Sửa đơn nháp', label: 'Sản phẩm 1' },
    { id: 'purchase-offer', route: 'purchases', trigger: 'Tạo đơn mua', label: 'Nhà cung cấp đã duyệt' },
];
const observations = [], errors = [], writes = [];
function selectData(e) {
    const s = getComputedStyle(e), r = e.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(e);
    const text = range.getBoundingClientRect();
    return { text: e.textContent, clientWidth: e.clientWidth, scrollWidth: e.scrollWidth, disabled: e.getAttribute('aria-disabled'), whiteSpace: s.whiteSpace, textOverflow: s.textOverflow, overflowX: s.overflowX, box: { x: r.x, y: r.y, width: r.width, height: r.height }, content: { x: text.x, y: text.y, width: text.width, height: text.height }, title: e.getAttribute('title'), describedBy: e.getAttribute('aria-describedby') };
}
for (const engine of ['chromium', 'firefox']) {
    const browser = await ({ chromium, firefox }[engine]).launch({ headless: true });
    try {
        const page = await browser.newPage();
        let scope = '';
        page.on('pageerror', error => errors.push({ engine, scope, message: error.message }));
        page.on('request', r => { if (new URL(r.url()).pathname.startsWith('/api/v2/') && !['GET', 'HEAD', 'OPTIONS'].includes(r.method())) writes.push({ engine, scope, method: r.method(), path: new URL(r.url()).pathname }); });
        for (const width of [320, 768]) for (const scenario of scenarios) {
            scope = `${scenario.id}:${width}`;
            await page.setViewportSize({ width, height: 900 });
            await page.goto('http://127.0.0.1:4173/s/shop-demo/' + scenario.route);
            await page.locator('main h1').waitFor();
            await page.waitForFunction(() => !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'));
            await page.getByRole('button', { name: scenario.trigger, exact: true }).first().click();
            await page.getByRole('dialog').first().waitFor();
            const selected = await page.getByRole('dialog').first().getByRole('combobox', { name: scenario.label, exact: true }).evaluate(selectData);
            let address;
            if (scenario.id === 'order-product') address = await page.getByRole('dialog').first().getByRole('combobox', { name: 'Địa chỉ giao hàng (mẫu demo)', exact: true }).evaluate(selectData);
            await page.getByRole('dialog').first().getByRole('combobox', { name: scenario.label, exact: true }).click();
            await page.getByRole('listbox').waitFor();
            const options = await page.getByRole('option').evaluateAll(options => options.map(e => {
                const style = getComputedStyle(e), range = document.createRange(); range.selectNodeContents(e);
                const r = e.getBoundingClientRect(), text = range.getBoundingClientRect();
                const clips = []; for (let p = e.parentElement; p; p = p.parentElement) if (['hidden', 'clip'].includes(getComputedStyle(p).overflowX)) { const a = p.getBoundingClientRect(); clips.push({ className: p.className, left: a.left, right: a.right, contentOutside: text.right > a.right + 1 || text.left < a.left - 1 }); }
                return { label: e.textContent, whiteSpace: style.whiteSpace, width: r.width, textWidth: text.width, clips };
            }));
            const result = { engine, id: scenario.id, width, selected, address, options, clippedOptions: options.filter(o => o.clips.some(c => c.contentOutside)) };
            const screenshot = `${engine}-select-${scenario.id}-${width}.png`; await page.screenshot({ path: path.join(out, screenshot) }); result.screenshot = screenshot;
            observations.push(result);
            console.log(JSON.stringify({ engine, id: scenario.id, width, clippedSelected: selected.scrollWidth > selected.clientWidth + 2, clippedAddress: address && address.scrollWidth > address.clientWidth + 2, clippedOptions: result.clippedOptions.map(o => o.label) }));
        }
    } finally { await browser.close(); }
}
fs.writeFileSync(path.join(out, 'select-overflow.json'), JSON.stringify({ capturedAt: new Date().toISOString(), method: 'canonical dialogs and option popup geometry, VIEWPORT_REFLOW only', observations, errors, writes }, null, 2));
