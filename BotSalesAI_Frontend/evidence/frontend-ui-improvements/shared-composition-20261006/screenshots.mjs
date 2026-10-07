import fs from 'node:fs';
import { chromium } from '@playwright/test';
import { startDemoServer } from '../../../tests/session/demo-server.mjs';
const directory='evidence/frontend-ui-improvements/shared-composition-20261006';
const server=await startDemoServer({cacheIsolationKey:'composition-visual-review'});
const browser=await chromium.launch();
try {
    const page=await browser.newPage();
    for(const scenario of [{id:'imports-806',path:'/s/shop-demo/imports',width:806,height:884},{id:'imports-390',path:'/s/shop-demo/imports',width:390,height:844},{id:'imports-1440',path:'/s/shop-demo/imports',width:1440,height:900},{id:'dashboard-390',path:'/s/shop-demo/overview',width:390,height:844},{id:'order-form-390',path:'/s/shop-demo/orders/new',width:390,height:844}]) {
        await page.setViewportSize({width:scenario.width,height:scenario.height});
        await page.goto(new URL(scenario.path,server.url).toString());
        await page.locator('main h1').waitFor();
        await page.waitForFunction(()=>!document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'));
        await page.evaluate(()=>document.fonts.ready);
        await page.screenshot({path:`${directory}/${scenario.id}.png`,fullPage:true});
        console.log(scenario.id);
    }
} finally {await browser.close();await server.close();}
