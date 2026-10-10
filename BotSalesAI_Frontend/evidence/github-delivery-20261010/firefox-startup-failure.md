# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fe015.spec.ts >> FE015.AC02 closed accounting period is visible and disables journal draft creation
- Location: tests\fe015.spec.ts:249:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button[aria-controls="mock-tools-controls"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('button[aria-controls="mock-tools-controls"]') with timeout 5000ms
  - waiting for locator('button[aria-controls="mock-tools-controls"]')

```

```yaml
- link "Đến nội dung chính":
  - /url: "#main-content"
```

# Test source

```ts
  1  | import {expect} from '@playwright/test';
  2  | import type {Page} from '@playwright/test';
  3  | 
  4  | /** Exercise the same public disclosure before operating synthetic demo controls. */
  5  | export async function openDemoControls(page:Page){
  6  |     const toggle=page.locator('button[aria-controls="mock-tools-controls"]');
> 7  |     await expect(toggle).toBeVisible();
     |                          ^ Error: expect(locator).toBeVisible() failed
  8  |     if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
  9  |     await expect(page.locator('#mock-tools-controls')).toBeVisible();
  10 | }
  11 | 
```