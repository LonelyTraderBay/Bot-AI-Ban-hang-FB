import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('dialog', dialog => { console.log('DIALOG', dialog.type()); void dialog.accept(); });
page.on('pageerror', error => console.log('ERROR', error.message));
for (const route of ['new', 'p1']) for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    console.log('GOTO', route, width);
    await page.goto('http://127.0.0.1:54098/s/shop-demo/products/' + route, { timeout: 15000 });
    console.log('LOADED');
    await page.getByRole('textbox', { name: 'Tìm danh mục', exact: true }).waitFor({ timeout: 15000 });
    console.log('READY');
    console.log('PROGRESS', await page.locator('main .MuiCircularProgress-root, main .MuiLinearProgress-root').count());
    console.log('COUNT', await page.getByText('Đã tải 3 lựa chọn', { exact: true }).count());
    console.log('GEOMETRY', await page.getByRole('combobox', { name: 'Danh mục', exact: true }).boundingBox(), await page.getByRole('combobox', { name: 'Trạng thái', exact: true }).boundingBox());
    await page.getByRole('textbox', { name: 'Tên sản phẩm', exact: true }).fill('Bản nháp cần giữ');
    await page.getByRole('textbox', { name: 'Tìm danh mục', exact: true }).fill('Không có danh mục này');
    await page.getByText('Không tìm thấy danh mục phù hợp.', { exact: true }).waitFor({ timeout: 15000 });
    console.log('EMPTY');
}
await browser.close();
