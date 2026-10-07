import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const root = process.cwd();
const directory = path.join(root, 'evidence/frontend-ui-improvements/UI028/W12');
const phase = process.argv[2];
if (!['baseline', 'after'].includes(phase)) throw new Error('Pass baseline or after.');
const suffix = phase === 'baseline' ? 'before-source-edit' : 'after-source-edit';
const output = path.join(directory, `render-${suffix}-current-20261005.json`);
if (fs.existsSync(output)) throw new Error(`Refusing to overwrite immutable render evidence: ${output}`);
const files = [
    'apps/web/src/modules/inventory/index.tsx',
    'apps/web/src/shared/ui/layout.ts',
    'apps/web/src/shared/ui/components.tsx',
    'apps/web/src/shared/ui/theme.ts',
    'botsales-kit/design/tokens.json',
    'botsales-kit/contracts/route-manifest.json',
];
const sha256 = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const viewports = [{ width: 390, height: 844 }, { width: 1280, height: 900 }];
const browser = await chromium.launch({ headless: true });
const observations = [];
const pageErrors = [];

async function capture(page, viewport, routeId, state, name) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(180);
    const metrics = await page.evaluate(() => {
        const box = element => {
            if (!element) return null;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, padding: style.padding, gap: style.gap, marginBottom: style.marginBottom, display: style.display };
        };
        const main = document.querySelector('main#main-content');
        const alerts = [...(main?.querySelectorAll('.MuiAlert-root') || [])].map(box);
        const surfaces = [...(main?.querySelectorAll('.MuiPaper-root') || [])].map(box);
        const dialog = document.querySelector('[role="dialog"]');
        const tableRegions = [...(main?.querySelectorAll('[role="region"]') || [])].map(box);
        return {
            viewport: { width: innerWidth, height: innerHeight },
            document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
            main: box(main),
            heading: box(main?.querySelector('h1,h2')),
            alerts, surfaces, dialog: box(dialog), tableRegions,
            visibleHeadings: [...document.querySelectorAll('main h1,main h2,[role="dialog"] h1,[role="dialog"] h2')].filter(element => element.getBoundingClientRect().width > 0).map(element => element.textContent?.trim()),
        };
    });
    const screenshotBase = `${name}-${viewport.width}x${viewport.height}-current-20261005`;
    let screenshot = `${screenshotBase}.png`;
    let retry = 2;
    while (fs.existsSync(path.join(directory, screenshot))) screenshot = `${screenshotBase}-retry${retry++}.png`;
    const isDialog = state.includes('dialog');
    await page.screenshot({ path: path.join(directory, screenshot), fullPage: !isDialog, animations: 'disabled' });
    observations.push({ routeId, viewport, state, finalUrl: page.url(), metrics, screenshot });
}

async function goto(page, base, route, heading) {
    await page.goto(new URL(route, base).toString(), { waitUntil: 'domcontentloaded' });
    await page.locator('#root').waitFor({ state: 'visible' });
    await page.getByRole('heading', { name: heading, exact: true }).waitFor({ state: 'visible' });
    await page.waitForTimeout(300);
}

try {
    for (const viewport of viewports) {
        const server = await startDemoServer({ cacheIsolationKey: `ui028-w12-${phase}-${viewport.width}-20261005` });
        try {
            const page = await browser.newPage({ viewport });
            page.on('pageerror', error => pageErrors.push({ route: page.url(), message: error.message }));
            await goto(page, server.url, '/s/shop-demo/inventory', 'Tồn kho');
            await page.getByRole('table', { name: 'Tồn kho theo vị trí' }).waitFor({ state: 'visible' });
            await capture(page, viewport, 'R15', 'success inventory collection and stock count/action columns', `R15-${suffix}`);
            await page.getByRole('button', { name: 'Điều chỉnh', exact: true }).first().click();
            await page.getByRole('dialog').waitFor({ state: 'visible' });
            await capture(page, viewport, 'R15', 'adjustment dialog open with pristine synthetic draft', `R15-adjustment-${suffix}`);
            await goto(page, server.url, '/s/shop-demo/inventory/movements', 'Lịch sử kho');
            await page.getByRole('table', { name: 'Lịch sử biến động kho' }).waitFor({ state: 'visible' });
            await capture(page, viewport, 'R16', 'success stock movement collection and source links', `R16-${suffix}`);
            await page.close();
        } finally {
            await server.close();
        }
    }
    const layoutText = execFileSync(process.execPath, ['scripts/check-layout.mjs', '--report', '--json'], { cwd: root, encoding: 'utf8' });
    const layout = JSON.parse(layoutText);
    const inventoryFindings = layout.findings.filter(finding => finding.file === 'apps/web/src/modules/inventory/index.tsx');
    const result = {
        schemaVersion: 1, task: 'UI028.W12', phase, capturedAt: new Date().toISOString(),
        status: pageErrors.length === 0 && observations.length === 6 ? (phase === 'baseline' ? 'BASELINE_CAPTURED' : 'AFTER_STATE_CAPTURED') : 'CAPTURE_FAILED',
        revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
        browser: { name: 'Chromium', version: browser.version() }, seedMode: 'fresh synthetic in-memory MSW demo server per viewport',
        sourceSha256: Object.fromEntries(files.map(file => [file, sha256(file)])),
        viewports, observations, pageErrors,
        layout: { status: layout.status, totalFindings: layout.findings.length, counts: layout.counts, inventoryFindings, checkerSchemaVersion: layout.schemaVersion },
        visualSourceReview: { status: 'MANUAL_REVIEW_REQUIRED', checker: 'SPC-046 design-system source checker is planned for W26-W27 and is not yet implemented', file: 'apps/web/src/modules/inventory/index.tsx', existingTypographyOverrides: [650, 750], noNewVisualLiteralsInW12: 'TO_VERIFY_AFTER_SOURCE_EDIT' },
        note: phase === 'baseline' ? 'Captured before the first W12 source edit; immutable. Baseline includes untouched synthetic collections and a read-only adjustment dialog; no command was submitted.' : 'After-state only. Compare with the immutable pre-edit captures under identical route, mock seed, browser, state, and viewport. No adjustment command is submitted.',
    };
    fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    if (result.status === 'CAPTURE_FAILED') process.exitCode = 1;
    console.log(JSON.stringify({ status: result.status, observations: observations.length, pageErrors: pageErrors.length, totalFindings: result.layout.totalFindings, inventoryFindings: inventoryFindings.length, output }, null, 2));
} finally {
    await browser.close();
}
