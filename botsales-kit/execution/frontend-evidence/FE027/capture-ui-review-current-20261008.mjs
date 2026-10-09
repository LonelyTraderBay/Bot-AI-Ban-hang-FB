import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const frontend = process.cwd();
const frontendRequire = createRequire(path.join(frontend, 'package.json'));
const { chromium, expect } = frontendRequire('@playwright/test');
const { preview } = frontendRequire('vite');
const repo = path.resolve(frontend, '..');
const kit = path.join(repo, 'botsales-kit');
const outputDir = path.join(kit, 'execution/frontend-evidence/FE027/ui-screenshots-current-20261008');
const buildManifestPath = path.join(kit, 'execution/frontend-evidence/FE026/clean-artifacts-current-20261008-attempt03.json');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const tree = directory => {
    const files = [];
    const visit = current => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
            const absolute = path.join(current, entry.name);
            if (entry.isDirectory()) visit(absolute);
            else {
                const bytes = fs.readFileSync(absolute);
                files.push({ path: path.relative(directory, absolute).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha256(bytes) });
            }
        }
    };
    visit(directory);
    return { fileCount: files.length, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0), treeSha256: sha256(Buffer.from(files.map(file => `${file.path}:${file.bytes}:${file.sha256}`).join('\n'))), files };
};

if (!fs.existsSync(buildManifestPath)) throw new Error('Current FE026 clean artifact manifest is missing.');
if (fs.existsSync(outputDir)) throw new Error(`Refusing to overwrite existing evidence directory: ${outputDir}`);
const cleanManifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8'));
if (cleanManifest.status !== 'PASS' || !cleanManifest.artifacts?.demoRepeat?.treeSha256) throw new Error('FE026 clean demo artifact is not a verified PASS.');
const demoRoot = path.join(frontend, 'apps/web/dist-demo');
const actualArtifact = tree(demoRoot);
if (actualArtifact.treeSha256 !== cleanManifest.artifacts.demoRepeat.treeSha256) throw new Error('Current local demo artifact hash differs from the FE026 clean-build output.');

fs.mkdirSync(outputDir, { recursive: false });
const webRoot = path.join(frontend, 'apps/web');
const server = await preview({
    configFile: path.join(webRoot, 'vite.config.ts'),
    root: webRoot,
    mode: 'demo',
    logLevel: 'error',
    build: { outDir: 'dist-demo' },
    preview: { host: '127.0.0.1', port: 0, strictPort: false },
});
const address = server.httpServer.address();
if (!address || typeof address === 'string') {
    await server.close();
    throw new Error('Built demo preview did not expose a local port.');
}
const baseUrl = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const pageErrors = [];
const screenshots = [];
let traceStarted = false;
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
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const screenshotPath = path.join(outputDir, `${name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    const screenshotBytes = fs.readFileSync(screenshotPath);
    if (screenshotBytes.length < 10_000) throw new Error(`Screenshot is unexpectedly small: ${name}`);
    screenshots.push({ name, route, screenshot: path.relative(repo, screenshotPath).replaceAll('\\', '/'), bytes: screenshotBytes.length, sha256: sha256(screenshotBytes), apiResponses });
    page.off('response', onResponse);
}

try {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
    traceStarted = true;
    await capture('inbox-sales-script', '/s/shop-demo/inbox/cv1', 'Ranh giới mẫu', async () => {
        await expect(page.getByRole('tab', { name: 'Kịch bản' })).toBeVisible();
    });
    await capture('inbox-price-stock-source', '/s/shop-demo/inbox/cv1', 'Áo thun Essential', async () => {
        await page.getByRole('tab', { name: 'Giá & tồn' }).click();
    });
    await capture('knowledge-content-preview', '/s/shop-demo/knowledge', 'Nội dung sản phẩm · xem trước cục bộ');
    await capture('operations-digest-readiness', '/s/shop-demo/operations/digests', 'Phục hồi & sẵn sàng triển khai');

    if (pageErrors.length) throw new Error(`Built demo produced page errors: ${JSON.stringify(pageErrors)}`);
    const tracePath = path.join(outputDir, 'built-demo-uat-current-20261008.trace.zip');
    await context.tracing.stop({ path: tracePath });
    traceStarted = false;
    const traceBytes = fs.readFileSync(tracePath);
    if (traceBytes.length < 10_000 || traceBytes[0] !== 0x50 || traceBytes[1] !== 0x4b) throw new Error('Built demo Playwright trace is missing or invalid.');
    const manifest = {
        scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        artifact: 'apps/web/dist-demo',
        artifactTreeSha256: actualArtifact.treeSha256,
        browser: await browser.version(),
        viewportCssPixels: { width: 1280, height: 900 },
        screenshots,
        trace: { path: path.relative(repo, tracePath).replaceAll('\\', '/'), bytes: traceBytes.length, sha256: sha256(traceBytes) },
        pageErrors,
        note: 'Screenshots and trace show the built React demo artifact. Recorded API responses are synthetic MSW only; no Backend/provider was contacted. Values shown are generated demo fixture data.',
    };
    const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
    fs.writeFileSync(path.join(outputDir, 'manifest.json'), manifestBytes, { encoding: 'utf8', flag: 'wx' });
    const log = [
        'FE027 current built-demo React screenshot, trace, and request evidence',
        `executedAt=${new Date().toISOString()}`,
        `cwd=${frontend}`,
        'commandId=e2e-current-20261002',
        'command=npm.cmd --script-shell=cmd.exe run test:e2e',
        'supplementaryArtifactCaptureCommand=node botsales-kit/execution/frontend-evidence/FE027/capture-ui-review-current-20261008.mjs',
        'exitCode=0',
        `screenshots=${screenshots.length}; pageErrors=${pageErrors.length}`,
        `artifactTreeSha256=${actualArtifact.treeSha256}`,
        `traceSha256=${manifest.trace.sha256}; traceBytes=${manifest.trace.bytes}`,
        `manifestSha256=${sha256(manifestBytes)}`,
        `manifestPath=${path.relative(kit, path.join(outputDir, 'manifest.json')).replaceAll('\\', '/')}`,
        'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; local built demo and synthetic MSW only.',
    ].join('\n') + '\n';
    fs.writeFileSync(path.join(kit, 'execution/frontend-evidence/FE027/built-demo-review-current-20261008.log'), log, { encoding: 'utf8', flag: 'wx' });
    console.log(log);
} finally {
    if (traceStarted) await context.tracing.stop().catch(() => undefined);
    await context.close();
    await browser.close();
    await server.close();
}
