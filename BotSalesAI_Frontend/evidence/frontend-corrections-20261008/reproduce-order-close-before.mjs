import fs from 'node:fs';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { startDemoServer } from '../../tests/session/demo-server.mjs';
const source = 'apps/web/src/modules/orders/index.tsx';
const sourceSha256 = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
const server = await startDemoServer({ cacheIsolationKey: 'order-close-before' });
const browser = await chromium.launch();
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(server.url + '/s/shop-demo/orders');
    await page.getByRole('heading', { name: 'Đơn hàng', exact: true }).waitFor();
    const current = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/orders')).json()).data.find(item => item.orderState === 'draft'));
    if (!current) throw new Error('No draft fixture');
    await page.goto(server.url + '/s/shop-demo/orders/' + current.id);
    await page.getByRole('button', { name: 'Sửa đơn nháp', exact: true }).click();
    await page.getByLabel('Ghi chú chuẩn bị').fill('Synthetic draft lost by inline close');
    await page.screenshot({ path: import.meta.dirname + '/order-close-before.png' });
    await page.getByRole('button', { name: 'Đóng chỉnh sửa', exact: true }).click();
    const lost = await page.getByLabel('Ghi chú chuẩn bị').count() === 0 && await page.getByRole('dialog').count() === 0;
    fs.writeFileSync(import.meta.dirname + '/order-close-before.json', JSON.stringify({ source, sourceSha256, observed: { draftLostWithoutConfirmation: lost }, verdict: lost ? 'REPRODUCED' : 'NOT_REPRODUCED', synthetic: true }, null, 2) + '\n');
    if (!lost) throw new Error('Inline close bypass was not reproduced');
    console.log('Analogous order close: REPRODUCED');
} finally { await browser.close(); await server.close(); }
