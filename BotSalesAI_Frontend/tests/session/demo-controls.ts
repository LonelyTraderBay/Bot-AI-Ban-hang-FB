import {expect} from '@playwright/test';
import type {Page,Response} from '@playwright/test';

type MockControlWindow = Window & {
    __setMockControl?: (key: string, value: string) => Promise<void>;
};

/** Configure this page's mock service after the shop shell has bootstrapped. */
export async function setDemoControl(page: Page, key: 'role' | 'fault' | 'dataset', value: string) {
    await expect(page.getByRole('banner')).toBeVisible({ timeout: 15_000 });
    await page.evaluate(async ({ key, value }) => {
        const apply = (window as MockControlWindow).__setMockControl;
        if (!apply) throw new Error('Build the demo with VITE_E2E_MOCK_CONTROL=1 for this test.');
        await apply(key, value);
    }, { key, value });
}

/** A compositor transition can move an option after pointer actionability checks. */
export async function waitForDemoMenu(page:Page,label:string){
    const menu=page.getByRole('listbox',{name:label,exact:true});
    await expect(menu).toBeVisible();
    const surface=menu.locator('..');
    await expect(surface).toHaveCSS('opacity','1');
    await expect(surface).toHaveCSS('transform','none');
}

/** Capture fast reads before navigation; give navigation and bootstrap their own budgets. */
export async function navigateDemoAndRead(page:Page,url:string,matches:(response:Response)=>boolean,waitUntil:'load'|'domcontentloaded'='load'){
    let observed:Response|undefined;
    const remember=(response:Response)=>{if(!observed&&matches(response))observed=response;};
    page.on('response',remember);
    try{
        await page.goto(url,{waitUntil});
        await expect.poll(()=>Boolean(observed),{timeout:15_000,message:'Demo bootstrap read after navigation: '+new URL(url).pathname}).toBe(true);
        if(!observed)throw new Error('Demo bootstrap read was not observed.');
        return observed;
    }finally{
        page.off('response',remember);
    }
}
