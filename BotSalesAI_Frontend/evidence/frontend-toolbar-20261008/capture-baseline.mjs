import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { startDemoServer } from '../../tests/session/demo-server.mjs';
import { toolbarImpact } from '../../tests/design/toolbar-impact.mjs';
const root = path.resolve(import.meta.dirname, '../..'), output = import.meta.dirname;
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
if (fs.existsSync(path.join(output, 'baseline.json'))) throw new Error('Baseline is immutable');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
});
const inputs = ['apps/web/src', 'apps/web/tests', 'packages', 'scripts', 'tests'].flatMap(directory => walk(path.join(root, directory)))
    .concat(['package.json', 'package-lock.json', 'playwright.config.ts', 'apps/web/vite.config.ts', 'docs/FRONTEND_SPACING_STANDARD.md', 'apps/web/src/shared/ui/README.md'].map(file => path.join(root, file)))
    .filter(file => !/[/\\](?:node_modules|dist|\.vite)[/\\]/.test(file));
const sourceFingerprints = Object.fromEntries(inputs.map(file => [path.relative(root, file).replaceAll('\\', '/'), hash(file)]));
const impact = toolbarImpact(root), startedAt = new Date().toISOString();
const snapshots = ['apps/web/src/shared/ui/components.tsx', 'apps/web/src/modules/catalog/index.tsx', 'apps/web/src/modules/inventory/index.tsx', 'apps/web/src/shared/ui/README.md', 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md'];
for (const relative of snapshots) { const to = path.join(output, 'source-before', relative); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(root, relative), to); }
const server = await startDemoServer({ cacheIsolationKey: 'toolbar-baseline' }), browser = await chromium.launch();
const page = await browser.newPage(), observations = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
    for (const width of [320, 1440]) for (const route of impact.routes) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(new URL(route.path, server.url).toString());
        await page.locator('main h1').waitFor({ state: 'visible' });
        await page.waitForFunction(() => !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'));
        const search = page.getByRole('textbox', { name: 'Tìm kiếm', exact: true, includeHidden: true });
        if (await search.count() !== Number(route.supportsSearch)) throw new Error(`Capability mismatch ${route.id}`);
        const geometry = route.supportsSearch && await search.isVisible() ? await search.evaluate(input => {
            const form = input.closest('form'), button = form.querySelector('button[type=submit]');
            const box = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
            return { form: box(form), button: box(button), input: box(input.closest('.MuiOutlinedInput-root')), alignItems: getComputedStyle(form).alignItems, documentWidth: document.documentElement.scrollWidth };
        }) : { notApplicable: route.supportsSearch ? 'R06 hides list pane at mobile while conversation detail is open' : 'Canonical operation does not support q; no search form', documentWidth: await page.evaluate(() => document.documentElement.scrollWidth) };
        observations.push({ ...route, width, geometry });
        if (route.id === 'R09') await page.screenshot({ path: path.join(output, `products-before-${width}.png`), fullPage: true });
    }
    if (errors.length) throw new Error(errors.join('\n'));
    const defect = observations.find(row => row.id === 'R09' && row.width === 1440).geometry;
    if (defect.button.height < 100 || defect.input.height > 60) throw new Error('Expected stretch defect not reproduced');
    fs.writeFileSync(path.join(output, 'baseline.json'), JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), HEAD: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), gitStatus: execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }), sourceFingerprints, impact, observations, errors, expectedDefect: 'Products search button stretched over 100px by multi-row extra', observedDefect: defect }, null, 2) + '\n');
    console.log(JSON.stringify({ calls: impact.calls.length, routes: impact.routes.length, observations: observations.length, defect }));
} finally { await browser.close(); await server.close(); }
