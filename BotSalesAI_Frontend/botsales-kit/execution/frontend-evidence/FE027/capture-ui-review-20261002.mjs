import fs from 'node:fs';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import { preview } from 'vite';

const root = process.cwd();
const webRoot = path.join(root, 'apps/web');
const outputDir = path.join(root, 'botsales-kit/execution/frontend-evidence/FE027/ui-screenshots-20261002');
fs.mkdirSync(outputDir, { recursive: true });
const server = await preview({
    configFile: path.join(webRoot, 'vite.config.ts'),
    root: webRoot,
    mode: 'demo',
    logLevel: 'error',
    build: { outDir: 'dist-demo' },
    preview: { host: '127.0.0.1', port: 0, strictPort: false },
});
const address = server.httpServer.address();
if (!address || typeof address === 'string') throw new Error('Built demo preview did not expose a local port.');
const baseUrl = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const pageErrors = [];
const artifacts = [];
page.on('pageerror', error => pageErrors.push(error.message));

async function capture(name, route, readyText, interact) {
    const apiResponses = [];
    const onResponse = response => {
        const url = new URL(response.url());
        if (url.pathname.startsWith('/api/v2/')) apiResponses.push({ method: response.request().method(), path: url.pathname, status: response.status() });
    };
    page.on('response', onResponse);
    await page.goto(new URL(route, baseUrl).toString());
    await expect(page.locator('#root')).not.toBeEmpty();
    await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toBeVisible();
    if (interact) await interact();
    await expect(page.getByText(readyText, { exact: false }).first()).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(50);
    const screenshot = path.join(outputDir, `${name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    artifacts.push({ name, route, screenshot: path.relative(root, screenshot).replaceAll('\\', '/'), apiResponses });
    page.off('response', onResponse);
}

try {
    await capture('inbox-sales-script', '/s/shop-demo/inbox/cv1', 'Ranh giới mẫu', async () => {
        await expect(page.getByRole('tab', { name: 'Kịch bản' })).toBeVisible();
    });
    await capture('inbox-price-stock-source', '/s/shop-demo/inbox/cv1', 'Áo thun Essential', async () => {
        await page.getByRole('tab', { name: 'Giá & tồn' }).click();
    });
    await capture('knowledge-content-preview', '/s/shop-demo/knowledge', 'Nội dung sản phẩm · xem trước cục bộ');
    await capture('operations-digest-readiness', '/s/shop-demo/operations/digests', 'Phục hồi & sẵn sàng triển khai');

    if (pageErrors.length) throw new Error(`Built demo produced page errors: ${JSON.stringify(pageErrors)}`);
    const manifest = {
        scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        artifact: 'apps/web/dist-demo',
        browser: await browser.version(),
        viewportCssPixels: { width: 1280, height: 900 },
        screenshots: artifacts,
        pageErrors,
        note: 'Screenshots show the built React demo artifact. All requests shown are synthetic MSW responses; no live backend/provider was contacted.',
    };
    fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({ status: 'PASS', artifact: manifest.artifact, screenshots: artifacts.length, pageErrors }, null, 2));
} finally {
    await browser.close();
    await server.close();
}
