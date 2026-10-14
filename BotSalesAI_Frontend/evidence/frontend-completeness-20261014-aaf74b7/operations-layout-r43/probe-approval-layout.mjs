import { chromium, firefox } from '@playwright/test';
import { startDemoServer } from '../../../tests/session/demo-server.mjs';

const server = await startDemoServer();
const results = [];

try {
    for (const engine of [chromium, firefox]) {
        const browser = await engine.launch({ headless: true });
        try {
            const page = await browser.newPage({ viewport: { width: 768, height: 900 } });
            await page.goto(new URL('/s/shop-demo/approvals', server.url).toString(), { waitUntil: 'domcontentloaded' });
            await page.getByRole('heading', { name: 'Cần phê duyệt', exact: true }).waitFor({ timeout: 30000 });
            await page.locator('.MuiCircularProgress-root,.MuiLinearProgress-root').waitFor({ state: 'detached', timeout: 30000 }).catch(() => undefined);
            const geometry = await page.evaluate(() => {
                const viewportWidth = document.documentElement.clientWidth;
                const offenders = Array.from(document.body.querySelectorAll('*')).flatMap(element => {
                    const rect = element.getBoundingClientRect();
                    const style = getComputedStyle(element);
                    if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || (rect.right <= viewportWidth + 1 && rect.left >= -1)) return [];
                    return [{
                        tag: element.tagName.toLowerCase(),
                        className: typeof element.className === 'string' ? element.className : '',
                        text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 90),
                        left: Math.round(rect.left * 100) / 100,
                        right: Math.round(rect.right * 100) / 100,
                        width: Math.round(rect.width * 100) / 100,
                        minWidth: style.minWidth,
                        display: style.display,
                        overflowX: style.overflowX,
                        scrollWidth: element.scrollWidth,
                        clientWidth: element.clientWidth,
                    }];
                }).sort((a, b) => b.right - a.right).slice(0, 20);
                return {
                    innerWidth: window.innerWidth,
                    documentElementClientWidth: document.documentElement.clientWidth,
                    documentElementScrollWidth: document.documentElement.scrollWidth,
                    bodyClientWidth: document.body.clientWidth,
                    bodyScrollWidth: document.body.scrollWidth,
                    offenders,
                };
            });
            results.push({ browser: engine.name(), version: browser.version(), geometry });
        } finally {
            await browser.close();
        }
    }
} finally {
    await server.close();
}

process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
