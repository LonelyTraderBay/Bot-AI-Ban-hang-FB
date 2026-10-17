import { expect, test } from '@playwright/test';

test('browser context reports the major version of its actual supported browser binary', async ({ browser, page }) => {
    const engine = browser.browserType().name();
    const version = browser.version();
    const userAgent = await page.evaluate(() => navigator.userAgent);
    const major = Number(version.match(/^\d+/)?.[0]);
    const userAgentMajor = engine === 'chromium'
        ? Number(userAgent.match(/(?:Chrome|Chromium)\/(\d+)/)?.[1])
        : Number(userAgent.match(/Firefox\/(\d+)/)?.[1]);

    console.log(`BROWSER_IDENTITY engine=${engine} binary=${version} uaMajor=${userAgentMajor} userAgent=${userAgent}`);

    expect(Number.isInteger(major), `browser binary version must expose a numeric major: ${version}`).toBe(true);
    expect(Number.isInteger(userAgentMajor), `${engine} user-agent must expose its browser major: ${userAgent}`).toBe(true);
    expect(userAgentMajor, `${engine} context UA must match browser binary ${version}`).toBe(major);
});
