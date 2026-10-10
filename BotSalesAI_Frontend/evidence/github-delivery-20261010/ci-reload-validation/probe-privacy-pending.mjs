import fs from 'node:fs';
import path from 'node:path';
import { chromium, firefox, expect } from '../../../node_modules/@playwright/test/index.mjs';
import { startDemoServer } from '../../../tests/session/demo-server.mjs';
const server = await startDemoServer({ cacheIsolationKey: 'privacy-pending-save-probe' });
try {
    for (const [engine, browserType] of Object.entries({ chromium, firefox })) {
        const browser = await browserType.launch();
        const context = await browser.newContext();
        await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
        const page = await context.newPage();
        await page.addInitScript(() => {
            const nativeFetch = window.fetch.bind(window);
            const gate = new Promise(resolve => { window.releasePrivacyRefetch = resolve; });
            window.fetch = async (...args) => {
                const raw = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].href : args[0].url;
                const url = new URL(raw, location.href);
                const response = await nativeFetch(...args);
                if (window.holdPrivacyRefetch && url.pathname.endsWith('/privacy/policy') && response.status === 200 && (!args[1]?.method || args[1].method === 'GET')) {
                    window.privacyRefetchPending = true;
                    await gate;
                }
                return response;
            };
        });
        await page.goto(server.url + '/s/shop-demo/settings/privacy');
        const days = page.getByLabel('Số ngày lưu hội thoại', { exact: true });
        const note = page.getByLabel('Căn cứ / thị trường áp dụng', { exact: true });
        await expect(note).not.toHaveValue('');
        await days.fill('36500');
        await note.fill('n'.repeat(2000));
        await page.evaluate(() => { window.holdPrivacyRefetch = true; });
        await page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true }).click();
        await page.waitForFunction(() => window.privacyRefetchPending === true);
        await note.fill('😀'.repeat(4));
        await expect(note).toHaveAttribute('aria-invalid', 'true');
        await page.evaluate(() => window.releasePrivacyRefetch());
        await expect(page.getByText('Đã lưu phần thay đổi đã gửi; chỉnh sửa mới vẫn chưa được lưu.', { exact: true })).toBeVisible();
        await expect(note).toHaveValue('😀'.repeat(4));
        await expect(note).toHaveAttribute('aria-invalid', 'true');
        await expect(page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true })).toBeDisabled();
        const result = { engine, applicationRevision: 'c9d2a5816206aac80d906af68073d6a088a8f489', preservedValue: await note.inputValue(), ariaInvalid: await note.getAttribute('aria-invalid'), savedNewEditsSeparately: true };
        fs.writeFileSync(path.join(import.meta.dirname, `privacy-pending-${engine}.json`), JSON.stringify(result, null, 2) + '\n');
        await page.screenshot({ path: path.join(import.meta.dirname, `privacy-pending-${engine}.png`), fullPage: true });
        await context.tracing.stop({ path: path.join(import.meta.dirname, `privacy-pending-${engine}.zip`) });
        await browser.close();
        console.log(JSON.stringify(result));
    }
} finally { await server.close(); }
