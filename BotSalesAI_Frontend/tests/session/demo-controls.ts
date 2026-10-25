import {expect} from '@playwright/test';
import type {Page,Response} from '@playwright/test';

/** Exercise the same public disclosure before operating synthetic demo controls. */
export async function openDemoControls(page:Page){
    const toggle=page.locator('button[aria-controls="mock-tools-controls"]');
    await expect(toggle).toBeVisible();
    if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
    await expect(page.locator('#mock-tools-controls')).toBeVisible();
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
