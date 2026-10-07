import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const root = process.cwd();
const evidenceDir = path.join(root, 'evidence/frontend-ui-improvements/UI028/W23');
const capturePrefix = process.argv[2] === 'after' ? 'after' : 'before';
const phase = capturePrefix === 'after' ? 'after-spacing-source-edit' : 'before-spacing-source-edit';
const viewports = [
    { width: 390, height: 844, suffix: '390' },
    { width: 1280, height: 900, suffix: '1280' },
];
const roles = [
    { id: 'owner', select: false },
    { id: 'viewer-no-finance', select: true },
];
const route = { id: 'R04', path: '/s/shop-demo/overview', heading: 'Tình hình hiện tại' };
const hash = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const sourceHashes = {
    dashboard: hash('apps/web/src/modules/dashboard/index.tsx'),
    layout: hash('apps/web/src/shared/ui/layout.ts'),
    components: hash('apps/web/src/shared/ui/components.tsx'),
    routeManifest: hash('botsales-kit/contracts/route-manifest.json'),
    openapi: hash('botsales-kit/contracts/openapi.json'),
    uxContract: hash('UX-CONTRACT.md'),
    tokens: hash('botsales-kit/design/tokens.json'),
    spacingStandard: hash('docs/FRONTEND_SPACING_STANDARD.md'),
};

const layoutPath = path.join(evidenceDir, `layout-${capturePrefix}-spacing-current-20261006.json`);
const layoutReport = fs.existsSync(layoutPath)
    ? JSON.parse(fs.readFileSync(layoutPath, 'utf8'))
    : JSON.parse(execFileSync(process.execPath, [
        path.join(root, 'scripts/check-layout.mjs'), '--report', '--json',
    ], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
if (!fs.existsSync(layoutPath)) fs.writeFileSync(layoutPath, `${JSON.stringify(layoutReport, null, 2)}\n`, { flag: 'wx' });

const captures = [];
const pageErrors = [];
const roleSetupWrites = [];
const productRouteWrites = [];
const server = await startDemoServer({ cacheIsolationKey: `ui028-w23-${capturePrefix}-20261006` });
const browser = await chromium.launch();

try {
    for (const role of roles) {
        for (const viewport of viewports) {
            const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
            const page = await context.newPage();
            page.on('pageerror', error => pageErrors.push(`${role.id}/${viewport.suffix}: ${error.message}`));
            let configuredRole = false;
            page.on('request', request => {
                const url = new URL(request.url());
                if (url.pathname.startsWith('/api/v2/') && request.method() !== 'GET') {
                    const entry = { role: role.id, viewport: viewport.suffix, method: request.method(), path: url.pathname };
                    (configuredRole ? productRouteWrites : roleSetupWrites).push(entry);
                }
            });

            await page.goto(new URL(route.path, server.url).toString(), { waitUntil: 'domcontentloaded' });
            await page.getByRole('heading', { name: route.heading, exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
            await page.getByText('Dữ liệu cập nhật', { exact: false }).waitFor({ state: 'visible', timeout: 20_000 });
            if (role.select) {
                if (viewport.width < 900) await page.getByRole('button', { name: 'Công cụ demo', exact: true }).click();
                await page.getByRole('combobox', { name: 'Vai trò mô phỏng' }).click();
                await page.getByRole('option', { name: 'viewer', exact: true }).click();
                await page.getByText('Chỉ hiển thị khi vai trò có finance.read.', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
                configuredRole = true;
            } else {
                await page.getByRole('link', { name: 'Tạo đơn hàng', exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
                await page.getByRole('link', { name: 'Xem lợi nhuận', exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
                configuredRole = true;
            }
            await page.waitForTimeout(300);
            const metrics = await page.evaluate(() => ({
                clientWidth: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
                clientHeight: document.documentElement.clientHeight,
                scrollHeight: document.documentElement.scrollHeight,
            }));
            const screenshot = `${capturePrefix}-${role.id}-${viewport.suffix}.png`;
            if (!fs.existsSync(path.join(evidenceDir, screenshot))) await page.screenshot({ path: path.join(evidenceDir, screenshot), fullPage: true });
            captures.push({ route: route.id, path: route.path, heading: route.heading, state: role.id, viewport: { width: viewport.width, height: viewport.height }, screenshot, ...metrics });
            await context.close();
        }
    }
} finally {
    await browser.close();
    await server.close();
}

const output = {
    schemaVersion: 1,
    task: 'UI028.W23',
    phase,
    date: '2026-10-06',
    browser: 'Chromium',
    mode: 'local demo / synthetic mock API; read-only dashboard; viewer role selector used only for test-state setup',
    sourceHashes,
    layoutReport: {
        file: path.basename(layoutPath),
        status: layoutReport.status,
        files: layoutReport.files,
        totalFindings: layoutReport.findings.length,
        dashboardOwnerFindings: layoutReport.findings.filter(finding => finding.file === 'apps/web/src/modules/dashboard/index.tsx').length,
    },
    viewports: viewports.map(({ width, height }) => `${width}x${height}`),
    roles: roles.map(role => role.id),
    captures,
    roleSetupWrites,
    productRouteWrites,
    pageErrors,
};
const jsonPath = path.join(evidenceDir, `render-${capturePrefix}-spacing-current-20261006.json`);
const logPath = path.join(evidenceDir, `capture-${capturePrefix}-spacing-current-20261006.log`);
fs.writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`, { flag: 'wx' });
fs.writeFileSync(logPath, `${JSON.stringify({ task: output.task, phase: output.phase, observations: captures.length, roleSetupWrites, productRouteWrites, pageErrors, layoutReport: output.layoutReport, sourceHashes }, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ task: output.task, observations: captures.length, roleSetupWrites, productRouteWrites, pageErrors, layoutReport: output.layoutReport, sourceHashes }));
