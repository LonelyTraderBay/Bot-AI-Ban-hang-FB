import { chromium } from 'playwright';
import { startDemoServer } from '../../tests/session/demo-server.mjs';
const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw new Error('Expected before or after');
const server = await startDemoServer({ cacheIsolationKey: `inbox-text-${phase}` });
const browser = await chromium.launch({ channel: 'chrome' });
try {
    for (const width of [390, 1440]) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.goto(`${server.url}/s/shop-demo/inbox${width > 900 ? '/cv1' : ''}`);
        await page.getByRole('link', { name: /Linh \(khách mẫu\)/ }).first().waitFor();
        await page.addStyleTag({ content: 'main .MuiListItemButton-root p { font-size: 28px !important; }' });
        await page.screenshot({ path: `evidence/ui-accessibility-20261111/${phase}-inbox-text-${width}.png`, fullPage: true });
        await page.close();
    }
} finally { await browser.close(); await server.close(); }
