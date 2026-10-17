import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox } from '@playwright/test';
import { startDemoServer } from '../../../tests/session/demo-server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw new Error('Usage: node capture-uic02-forced-colors.mjs before|after');
const frontendRoot = path.resolve(here, '../../..');
const repoRoot = path.resolve(frontendRoot, '..');
const headSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
const sourceThemeSha256 = createHash('sha256').update(await readFile(path.join(frontendRoot, 'apps/web/src/shared/ui/theme.ts'))).digest('hex');
const demo = await startDemoServer();
const output = { phase, headSha, sourceThemeSha256, capturedAt: new Date().toISOString(), nodeVersion: process.version, viewport: { widths: [390, 1440], height: 900 }, token: '#090C12CC', media: 'forced-colors: active', browsers: [] };

async function sample(browserName, launcher) {
    const browser = await launcher.launch({ headless: true, ...(browserName === 'chrome' ? { channel: 'chrome' } : {}) });
    const result = { name: browserName, version: browser.version(), widths: [] };
    try {
        for (const width of [390, 1440]) {
            const context = await browser.newContext({ viewport: { width, height: 900 }, forcedColors: 'active' });
            const page = await context.newPage();
            await page.goto(new URL('/s/shop-demo/categories', demo.url).toString());
            await page.getByRole('heading', { name: 'Danh mục', exact: true }).waitFor({ state: 'visible' });
            await page.getByRole('button', { name: 'Thêm danh mục', exact: true }).click();
            await page.getByRole('dialog', { name: 'Thêm danh mục', exact: true }).waitFor({ state: 'visible' });
            const backdrop = page.locator('.MuiDialog-root .MuiBackdrop-root:not(.MuiBackdrop-invisible)').last();
            await backdrop.evaluate(async element => { await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => undefined))); });
            await page.keyboard.press('Tab');
            const observation = await page.evaluate(() => {
                const backdropElement = document.querySelector('.MuiDialog-root .MuiBackdrop-root:not(.MuiBackdrop-invisible)');
                const paper = document.querySelector('.MuiDialog-paper');
                const active = document.activeElement;
                const style = element => element ? getComputedStyle(element) : null;
                const backdropStyle = style(backdropElement);
                const paperStyle = style(paper);
                const focusStyle = style(active);
                return {
                    forcedColorsActive: matchMedia('(forced-colors: active)').matches,
                    dialogVisible: Boolean(paper && paper.getBoundingClientRect().width > 0),
                    backdropVisible: Boolean(backdropElement && backdropElement.getBoundingClientRect().width > 0),
                    backdropColor: backdropStyle?.backgroundColor ?? null,
                    backdropOpacity: backdropStyle?.opacity ?? null,
                    paperColor: paperStyle?.backgroundColor ?? null,
                    paperBorderColor: paperStyle?.borderColor ?? null,
                    focusTag: active?.tagName.toLowerCase() ?? null,
                    focusLabel: active?.getAttribute('aria-label') ?? active?.textContent?.trim() ?? null,
                    focusVisible: active?.matches(':focus-visible') ?? false,
                    focusOutlineColor: focusStyle?.outlineColor ?? null,
                };
            });
            result.widths.push({ width, ...observation });
            await context.close();
        }
    } finally {
        await browser.close();
    }
    output.browsers.push(result);
}

try {
    await sample('chrome', chromium);
    await sample('firefox', firefox);
} finally {
    await demo.close();
}

await mkdir(here, { recursive: true });
await writeFile(path.join(here, `forced-colors-${phase}.json`), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
