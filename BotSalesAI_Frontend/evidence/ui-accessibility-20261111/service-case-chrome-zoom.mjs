import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { startDemoServer } from '../../tests/session/demo-server.mjs';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'botsales-service-zoom-'));
const server = await startDemoServer({ cacheIsolationKey: 'service-case-native-zoom' });
let browser;
try {
    browser = await chromium.launchPersistentContext(temp, { channel: 'chrome', headless: false, viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const settings = await browser.newPage();
    await settings.goto('chrome://settings/appearance');
    const zoom = settings.locator('#zoomLevel');
    await zoom.waitFor();
    await zoom.selectOption('2');
    if (await zoom.inputValue() !== '2') throw new Error('Native Chrome page zoom was not confirmed at 200%');
    const page = await browser.newPage();
    await page.goto(`${server.url}/s/shop-demo/service-cases`);
    const row = page.getByRole('region', { name: 'Yêu cầu chăm sóc sau bán' }).getByRole('row').nth(1);
    const button = row.getByRole('cell').first().getByRole('button', { name: 'Chi tiết yêu cầu' });
    await button.waitFor();
    const before = await page.evaluate(() => ({ viewport: innerWidth, dpr: devicePixelRatio, documentWidth: document.documentElement.scrollWidth }));
    const box = await button.boundingBox();
    if (before.viewport !== 640 || before.dpr !== 2 || before.documentWidth > before.viewport || !box || box.x < 0 || box.x + box.width > before.viewport) throw new Error(`Unexpected zoom or control geometry: ${JSON.stringify({ before, box })}`);
    await button.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Chi tiết yêu cầu sau bán' });
    await dialog.getByRole('link', { name: 'Minh (khách mẫu)' }).waitFor();
    await dialog.locator('..').waitFor();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[role="dialog"]').parentElement).opacity === '1');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: 'evidence/ui-accessibility-20261111/service-case-chrome-native-200.png' });
    const dialogGeometry = await dialog.evaluate(element => {
        const r = element.getBoundingClientRect();
        return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight, scrollY };
    });
    console.log('DIALOG_GEOMETRY=' + JSON.stringify(dialogGeometry));
    if (dialogGeometry.y < -1 || dialogGeometry.bottom > dialogGeometry.viewportHeight + 1) throw new Error('Dialog extends outside the native zoom viewport');
    const processing = dialog.getByRole('button', { name: 'Xử lý', exact: true });
    await processing.click();
    await page.getByRole('dialog', { name: 'Cập nhật yêu cầu' }).getByLabel('Trạng thái mới').waitFor();
    console.log(JSON.stringify({ result: 'PASS', nativeZoom: await zoom.inputValue(), ...before, firstAction: box, dialog: 'customer name and processing dialog observed' }, null, 2));
} finally {
    await browser?.close();
    await server.close();
    if (path.dirname(path.resolve(temp)) !== path.resolve(os.tmpdir()) || !path.basename(temp).startsWith('botsales-service-zoom-')) throw new Error('Unexpected temporary profile path');
    fs.rmSync(temp, { recursive: true, force: true });
}
