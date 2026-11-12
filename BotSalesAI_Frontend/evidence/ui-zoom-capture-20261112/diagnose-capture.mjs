import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { startDemoServer } from '../../tests/session/demo-server.mjs';

const dir = 'evidence/ui-zoom-capture-20261112/recapture-v5';
fs.mkdirSync(dir, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'botsales-zoom-diagnostic-'));
let server, context, browserVersion;
const records = [];
try {
    server = await startDemoServer({ cacheIsolationKey: 'zoom-image-diagnostic' });
    context = await chromium.launchPersistentContext(profile, { channel: 'chrome', headless: false, viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    browserVersion = context.browser().version();
    const settings = await context.newPage();
    await settings.goto('chrome://settings/appearance');
    const zoom = settings.locator('#zoomLevel');
    await zoom.waitFor();
    await zoom.selectOption('2');
    if (await zoom.inputValue() !== '2') throw new Error('Native page zoom is not 200%');
    const page = context.pages()[0];
    for (const scenario of ['form-error-short', 'inbox-long-composer']) {
        const route = scenario === 'form-error-short' ? '/s/shop-demo/products/new' : '/s/shop-demo/inbox/cv1';
        await page.goto(`${server.url}${route}`, { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading').first().waitFor({ state: 'visible' });
        let target;
        if (scenario === 'form-error-short') {
            await page.getByRole('textbox', { name: 'Tên sản phẩm' }).fill(`Tên sản phẩm tổng hợp ${'Bản thử dài '.repeat(10)}`);
            await page.getByRole('textbox', { name: 'SKU' }).fill(`SKU-${'IDENTIFIER-VERY-LONG-'.repeat(8)}`);
            await page.getByRole('textbox', { name: 'Giá bán (VND)' }).fill('0');
            target = page.getByRole('button', { name: 'Lưu sản phẩm', exact: true });
            await target.click();
            const error = page.getByText('Giá phải lớn hơn 0', { exact: true });
            await error.waitFor({ state: 'visible' });
            await error.evaluate(element => { element.textContent += ` · mã lỗi ${'PRICE-VALIDATION-IDENTIFIER-'.repeat(6)}`; });
        } else {
            target = page.getByRole('textbox', { name: 'Nội dung trả lời khách' });
            await target.fill(`Nội dung trả lời khách hàng tổng hợp. ${'Giải thích chi tiết về trạng thái đơn hàng, lựa chọn giao nhận và bước tiếp theo. '.repeat(20)}`);
        }
        await page.waitForTimeout(500);
        await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
        await target.focus();
        await page.evaluate(async () => { await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
        if (!await target.evaluate(element => document.activeElement === element)) throw new Error(`Requested focus was not retained for ${scenario}`);
        for (const phase of ['focused', 'after-tab']) {
            if (phase === 'after-tab') await page.keyboard.press('Tab');
            const before = await page.evaluate(() => {
                const element = document.activeElement;
                const rect = element?.getBoundingClientRect();
                return { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, scrollX, scrollY, activeTag: element?.tagName, activeLabel: element?.getAttribute('aria-label'), activeText: element?.textContent?.trim().slice(0, 80), activeBounds: rect ? { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom } : null };
            });
            if (before.width !== 640 || before.height !== 360 || before.dpr !== 2) throw new Error(`Unexpected zoom: ${JSON.stringify(before)}`);
            const captures = {};
            const session = await context.newCDPSession(page);
            const clip = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: before.scrollX * before.dpr, y: before.scrollY * before.dpr, width: before.width * before.dpr, height: before.height * before.dpr, scale: 1 } });
            await session.detach();
            const clipBytes = Buffer.from(clip.data, 'base64');
            const clipPath = `${dir}/${scenario}-${phase}-cdp-clip.png`;
            fs.writeFileSync(clipPath, clipBytes, { flag: 'wx' });
            const width = clipBytes.readUInt32BE(16), height = clipBytes.readUInt32BE(20);
            if (width !== 1280 || height !== 720) throw new Error(`Unexpected captured dimensions: ${width}x${height}`);
            captures['cdp-clip'] = { path: clipPath, bytes: clipBytes.length, width, height, sha256: createHash('sha256').update(clipBytes).digest('hex') };
            const after = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio, scrollX, scrollY, activeTag: document.activeElement?.tagName, activeLabel: document.activeElement?.getAttribute('aria-label') }));
            records.push({ scenario, route, phase, zoomSetting: await zoom.inputValue(), before, after, captures });
        }
    }
} finally {
    await context?.close();
    await server?.close();
    fs.writeFileSync(`${dir}/diagnostic.json`, `${JSON.stringify({ browserVersion, method: 'Native Chrome default page zoom at 200%; CDP captureBeyondViewport clip uses scroll and viewport multiplied by observed DPR', records }, null, 2)}\n`, { flag: 'wx' });
    console.log(`Diagnostic records: ${records.length}; temporary profile retained at ${profile}`);
}
