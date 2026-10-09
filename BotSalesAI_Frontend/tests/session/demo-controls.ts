import {expect} from '@playwright/test';
import type {Page} from '@playwright/test';

/** Exercise the same public disclosure before operating synthetic demo controls. */
export async function openDemoControls(page:Page){
    const toggle=page.locator('button[aria-controls="mock-tools-controls"]');
    await expect(toggle).toBeVisible();
    if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
    await expect(page.locator('#mock-tools-controls')).toBeVisible();
}
