import fs from 'node:fs';
import { chromium } from 'playwright';
import { startDemoServer } from '../../tests/session/demo-server.mjs';

const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw new Error('Expected before or after');
const server = await startDemoServer({ cacheIsolationKey: `a11y-service-${phase}` });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const observations = [];
try {
    for (const width of [390, 1440]) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.goto(`${server.url}/s/shop-demo/service-cases`);
        await page.getByRole('heading', { name: 'Chăm sóc sau bán', exact: true }).waitFor();
        const region = page.getByRole('region', { name: 'Yêu cầu chăm sóc sau bán' });
        const row = region.getByRole('row').nth(1);
        await row.waitFor();
        const buttons = await row.getByRole('button').evaluateAll(elements => elements.map(element => {
            const r = element.getBoundingClientRect();
            const container = element.closest('[role="region"]').getBoundingClientRect();
            return { name: element.textContent.trim(), x: r.x, right: r.right, containerLeft: container.left, containerRight: container.right, display: getComputedStyle(element).display };
        }));
        const customer = await row.getByRole('cell').nth(1).innerText();
        await page.screenshot({ path: `evidence/ui-accessibility-20261111/${phase}-service-cases-${width}.png`, fullPage: true });
        await row.getByRole('button', { name: 'Chi tiết yêu cầu', exact: true }).first().click();
        const dialog = page.getByRole('dialog', { name: 'Chi tiết yêu cầu sau bán' });
        await dialog.getByText('Mã yêu cầu', { exact: true }).waitFor();
        await page.waitForFunction(() => {
            const dialog = document.querySelector('[role="dialog"]');
            return dialog && getComputedStyle(dialog.parentElement).opacity === '1';
        });
        const detail = await dialog.innerText();
        await page.screenshot({ path: `evidence/ui-accessibility-20261111/${phase}-service-case-detail-${width}.png`, fullPage: true });
        observations.push({ width, buttons, customer, detail });
        await page.close();
    }
} finally {
    await browser.close();
    await server.close();
}
fs.writeFileSync(`evidence/ui-accessibility-20261111/${phase}-service-cases.json`, JSON.stringify(observations, null, 2) + '\n');
console.log(JSON.stringify(observations, null, 2));
