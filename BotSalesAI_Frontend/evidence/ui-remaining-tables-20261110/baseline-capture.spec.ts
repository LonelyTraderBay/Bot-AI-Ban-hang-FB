import path from 'node:path';
import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';
let url = '', close: (() => Promise<void>) | undefined;
test.beforeAll(async () => { const server = await startDemoServer({ cacheIsolationKey: 'remaining-baseline' }); url=server.url; close=server.close; });
test.afterAll(async () => close?.());
test('capture pre-edit loaded screens', async ({page}) => {
 for (const width of [390,1440]) for (const route of ['products','inventory','inventory/movements','fulfillment','purchases','settings/team']) {
  await page.setViewportSize({width,height:900}); await page.goto(`${url}/s/shop-demo/${route}`);
  await expect(page.locator('main h1')).toBeVisible(); await expect(page.locator('main .MuiCircularProgress-root, main .MuiLinearProgress-root')).toHaveCount(0);
  await expect(page.getByRole('region').filter({has:page.locator('table')}).first()).toBeVisible();
  await page.screenshot({path:path.join('evidence/ui-remaining-tables-20261110',`baseline-${route.replaceAll('/','-')}-${width}.png`),fullPage:true});
 }
});
