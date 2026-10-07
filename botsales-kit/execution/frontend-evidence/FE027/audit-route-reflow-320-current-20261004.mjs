import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const root = process.cwd();
const routeManifest = JSON.parse(fs.readFileSync(path.join(root, 'packages/contracts/src/routes.json'), 'utf8'));
const detailIds = { conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001', knowledgeId: 'k1', jobId: 'missing-job' };
const errors = [];
const overflows = [];
const server = await startDemoServer();
const browser = await chromium.launch();

try {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));

    for (const route of routeManifest.routes) {
        const routePath = route.path
            .replace(':shopId', 'shop-demo')
            .replace(/:([A-Za-z]+)/g, (_, key) => detailIds[key] || 'missing');
        await page.goto(new URL(routePath, server.url).toString());
        await page.locator('#root').waitFor({ state: 'attached' });
        await page.waitForTimeout(80);
        const layout = await page.evaluate(() => ({
            width: innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            bodyWidth: document.body.scrollWidth,
            heading: document.querySelector('main h1')?.textContent?.trim() ?? null,
        }));
        if (layout.documentWidth > layout.width + 1 || layout.bodyWidth > layout.width + 1)
            overflows.push({ routeId: route.id, route: routePath, ...layout });
    }

    const result = {
        status: errors.length === 0 && overflows.length === 0 ? 'PASS' : 'FAIL',
        scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        viewportCssPixels: { width: 320, height: 900 },
        routesChecked: routeManifest.routes.length,
        overflowRoutes: overflows,
        pageErrors: errors,
        note: '320 CSS px reflow proxy for 400% zoom from a 1280 CSS px viewport; this is not a full assistive-technology audit.',
    };
    const output = path.join(root, 'botsales-kit/execution/frontend-evidence/FE027/route-reflow-320-current-20261004.json');
    fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify(result));
    if (result.status !== 'PASS') process.exitCode = 1;
} finally {
    await browser.close();
    await server.close();
}

