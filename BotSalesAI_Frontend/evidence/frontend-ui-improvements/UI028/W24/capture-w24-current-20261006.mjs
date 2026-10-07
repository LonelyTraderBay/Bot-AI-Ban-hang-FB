import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium, expect } from '@playwright/test';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const root = process.cwd();
const evidenceDir = path.join(root, 'evidence/frontend-ui-improvements/UI028/W24');
const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw new Error('Usage: node capture-w24-current-20261006.mjs <before|after>');
const date = '2026-10-06';
const viewports = [
    { width: 390, height: 844 },
    { width: 1280, height: 900 },
];
const routes = [
    { id: 'R05', state: 'inbox-list', path: '/s/shop-demo/inbox', ready: async page => expect(page.getByRole('heading', { name: 'Hộp thư khách hàng', exact: true })).toBeVisible() },
    { id: 'R06', state: 'conversation-latest', path: '/s/shop-demo/inbox/cv1', ready: async page => {
        await expect(page.getByTestId('inbox-thread').getByRole('textbox', { name: 'Nội dung trả lời khách' })).toBeVisible();
        await expect(page.getByTestId('inbox-context-panel')).toBeAttached();
    } },
    { id: 'R06', state: 'conversation-paged', path: '/s/shop-demo/inbox/cv2?listCursor=cv1&cursor=m2', ready: async page => {
        await expect(page.getByRole('heading', { name: 'Minh (khách mẫu)', exact: true })).toBeVisible();
        await expect(page).toHaveURL(/listCursor=cv1.*cursor=m2|cursor=m2.*listCursor=cv1/);
    } },
];
const sourceFiles = [
    'apps/web/src/modules/inbox/index.tsx',
    'apps/web/src/modules/inbox/conversation-components.tsx',
    'apps/web/src/shared/ui/layout.ts',
    'apps/web/src/shared/ui/components.tsx',
    'botsales-kit/contracts/route-manifest.json',
    'botsales-kit/contracts/openapi.json',
    'UX-CONTRACT.md',
    'botsales-kit/design/tokens.json',
    'docs/FRONTEND_SPACING_STANDARD.md',
];
const hash = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const sourceHashes = Object.fromEntries(sourceFiles.map(file => [file, hash(file)]));
const layoutPath = path.join(evidenceDir, `layout-${phase}-spacing-current-${date}.json`);
let layout;
if (fs.existsSync(layoutPath)) {
    if (phase === 'after') throw new Error(`Refusing to overwrite report: ${layoutPath}`);
    layout = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
} else {
    layout = JSON.parse(execFileSync(process.execPath, [path.join(root, 'scripts/check-layout.mjs'), '--report', '--json'], { cwd: root, encoding: 'utf8' }));
    fs.writeFileSync(layoutPath, `${JSON.stringify(layout, null, 2)}\n`, { flag: 'wx' });
}

const captures = [];
const writes = [];
const apiErrors = [];
const pageErrors = [];
const server = await startDemoServer({ cacheIsolationKey: `ui028-w24-${phase}-${date}` });
const browser = await chromium.launch();
try {
    for (const route of routes) {
        for (const viewport of viewports) {
            const context = await browser.newContext({ viewport });
            const page = await context.newPage();
            page.on('pageerror', error => pageErrors.push({ route: route.state, viewport: `${viewport.width}x${viewport.height}`, message: error.message }));
            page.on('request', request => {
                const url = new URL(request.url());
                if (!url.pathname.startsWith('/api/v2/')) return;
                if (request.method() !== 'GET') writes.push({ route: route.state, method: request.method(), path: url.pathname });
            });
            page.on('response', response => {
                const url = new URL(response.url());
                if (url.pathname.startsWith('/api/v2/') && response.status() >= 400) apiErrors.push({ route: route.state, status: response.status(), path: url.pathname });
            });

            if (route.state === 'conversation-paged') {
                const list = page.waitForResponse(response => {
                    const url = new URL(response.url());
                    return response.request().method() === 'GET' && url.pathname.endsWith('/conversations') && url.searchParams.get('cursor') === 'cv1';
                });
                const messages = page.waitForResponse(response => {
                    const url = new URL(response.url());
                    return response.request().method() === 'GET' && url.pathname.endsWith('/cv2/messages') && url.searchParams.get('cursor') === 'm2';
                });
                await page.goto(new URL(route.path, server.url).toString(), { waitUntil: 'domcontentloaded' });
                const [listResponse, messageResponse] = await Promise.all([list, messages]);
                if (listResponse.status() !== 200 || messageResponse.status() !== 200) throw new Error(`Paged cursor response failed: ${listResponse.status()}/${messageResponse.status()}`);
            } else {
                await page.goto(new URL(route.path, server.url).toString(), { waitUntil: 'domcontentloaded' });
            }
            await route.ready(page);
            await page.waitForTimeout(250);
            const metrics = await page.evaluate(() => {
                const rect = (selector) => {
                    const node = document.querySelector(selector);
                    if (!node) return null;
                    const box = node.getBoundingClientRect();
                    const style = getComputedStyle(node);
                    return {
                        x: Math.round(box.x * 100) / 100,
                        y: Math.round(box.y * 100) / 100,
                        width: Math.round(box.width * 100) / 100,
                        height: Math.round(box.height * 100) / 100,
                        padding: style.padding,
                        margin: style.margin,
                        gap: style.gap,
                        overflowX: style.overflowX,
                        overflowY: style.overflowY,
                    };
                };
                return {
                    document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, clientHeight: document.documentElement.clientHeight, scrollHeight: document.documentElement.scrollHeight },
                    inboxGrid: rect('[data-testid="inbox-conversation-layout"]'),
                    thread: rect('[data-testid="inbox-thread"]'),
                    messageViewport: rect('[data-testid="inbox-message-list"]'),
                    context: rect('[data-testid="inbox-context-panel"]'),
                    composer: rect('[data-testid="inbox-thread"] form'),
                    listRow: rect('.MuiListItemButton-root'),
                };
            });
            const screenshot = `${phase}-${route.id}-${route.state}-${viewport.width}.png`;
            await page.screenshot({ path: path.join(evidenceDir, screenshot), fullPage: true });
            captures.push({ routeId: route.id, state: route.state, path: route.path, viewport, screenshot, metrics });
            await context.close();
        }
    }
} finally {
    await browser.close();
    await server.close();
}

const output = {
    schemaVersion: 1,
    task: 'UI028.W24',
    phase: phase === 'before' ? 'pre-source-edit' : 'post-source-edit',
    date,
    revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    browser: 'Chromium',
    mode: 'local Vite demo with synthetic MSW; owner permissions; captures are read-only',
    sourceHashes,
    layoutReport: { file: path.basename(layoutPath), checkerStatus: layout.status, files: layout.files, totalFindings: layout.findings.length, inboxIndexFindings: layout.findings.filter(item => item.file === 'apps/web/src/modules/inbox/index.tsx').length, conversationComponentFindings: layout.findings.filter(item => item.file === 'apps/web/src/modules/inbox/conversation-components.tsx').length },
    captures,
    writes,
    apiErrors,
    pageErrors,
};
const jsonPath = path.join(evidenceDir, `render-${phase}-current-${date}.json`);
const logPath = path.join(evidenceDir, `capture-${phase}-current-${date}.log`);
fs.writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`, { flag: 'wx' });
fs.writeFileSync(logPath, `${JSON.stringify({ task: output.task, phase: output.phase, captures: captures.length, layoutReport: output.layoutReport, writes, apiErrors, pageErrors, sourceHashes }, null, 2)}\n`, { flag: 'wx' });
if (writes.length || apiErrors.length || pageErrors.length) process.exitCode = 1;
console.log(JSON.stringify({ task: output.task, phase: output.phase, captures: captures.length, layoutReport: output.layoutReport, writes, apiErrors, pageErrors }));
