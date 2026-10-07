import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const root = process.cwd();
const evidenceDir = path.join(root, 'evidence/frontend-ui-improvements/UI028/W21');
const phase = process.argv[2] || 'before';
if (!['before', 'after'].includes(phase)) throw new Error(`Unsupported capture phase: ${phase}`);
const viewports = [
    { width: 390, height: 844, suffix: '390' },
    { width: 1280, height: 900, suffix: '1280' },
];
const routes = [
    { id: 'R37', path: '/s/shop-demo/operations', heading: 'Công việc hôm nay', state: 'operations-summary-and-work-items' },
    { id: 'R38', path: '/s/shop-demo/approvals', heading: 'Cần phê duyệt', state: 'approval-queue-and-delegation-preview' },
    { id: 'R52', path: '/s/shop-demo/operations/digests', heading: 'Bản tin & sức khỏe hệ thống', state: 'digests-health-and-readiness' },
];
const captures = [];
const pageErrors = [];
const setupWrites = [];
const hash = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const sourceHashes = {
    operations: hash('apps/web/src/modules/operations/index.tsx'),
    layout: hash('apps/web/src/shared/ui/layout.ts'),
    components: hash('apps/web/src/shared/ui/components.tsx'),
};
const server = await startDemoServer({ cacheIsolationKey: `ui028-w21-${phase}-20261006` });
const browser = await chromium.launch();

try {
    for (const viewport of viewports) {
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
        const page = await context.newPage();
        page.on('pageerror', error => pageErrors.push(`${viewport.suffix}: ${error.message}`));
        page.on('request', request => {
            const url = new URL(request.url());
            if (url.pathname.startsWith('/api/v2/') && request.method() !== 'GET') {
                setupWrites.push({ viewport: viewport.suffix, method: request.method(), path: url.pathname });
            }
        });
        for (const route of routes) {
            await page.goto(new URL(route.path, server.url).toString(), { waitUntil: 'domcontentloaded' });
            await page.getByRole('heading', { name: route.heading }).waitFor({ state: 'visible', timeout: 20_000 });
            await page.waitForTimeout(250);
            const metrics = await page.evaluate(() => ({
                clientWidth: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
                clientHeight: document.documentElement.clientHeight,
                scrollHeight: document.documentElement.scrollHeight,
            }));
            const screenshot = `${phase}-${route.id.toLowerCase()}-${viewport.suffix}.png`;
            await page.screenshot({ path: path.join(evidenceDir, screenshot), fullPage: true });
            captures.push({ route: route.id, state: route.state, viewport: { width: viewport.width, height: viewport.height }, screenshot, ...metrics });
        }
        await context.close();
    }
} finally {
    await browser.close();
    await server.close();
}

const output = {
    task: 'UI028.W21',
    phase,
    sourceHashes,
    viewports: viewports.map(({ width, height }) => `${width}x${height}`),
    captures,
    setupWrites,
    pageErrors,
};
const destination = path.join(evidenceDir, `render-${phase}-spacing-current-20261006.json`);
fs.writeFileSync(destination, `${JSON.stringify(output, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ task: output.task, phase, observations: captures.length, writes: setupWrites.length, pageErrors: pageErrors.length, sourceHashes }));
