import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const root = process.cwd();
const evidenceDir = path.join(root, 'evidence/frontend-ui-improvements/UI028/W22');
const viewports = [
    { width: 390, height: 844, suffix: '390' },
    { width: 1280, height: 900, suffix: '1280' },
];
const routes = [
    { id: 'R01', path: '/login', heading: 'Chào mừng trở lại', state: 'mock-auth-card' },
    { id: 'R02', path: '/workspaces', heading: 'Chọn cửa hàng', state: 'shop-selection-cards' },
    { id: 'R03', path: '/onboarding', heading: 'Tạo cửa hàng', state: 'shop-onboarding-form' },
    { id: 'R32', path: '/s/shop-demo/settings/team', heading: 'Nhân sự & phân quyền', state: 'member-table-and-invite-entry' },
    { id: 'R33', path: '/s/shop-demo/settings/shop', heading: 'Thiết lập cửa hàng', state: 'shop-settings-and-readonly-fields' },
    { id: 'R34', path: '/s/shop-demo/settings/audit', heading: 'Nhật ký hoạt động', state: 'sanitized-audit-collection' },
    { id: 'R35', path: '/s/shop-demo/settings/privacy', heading: 'Quyền riêng tư & vòng đời dữ liệu', state: 'privacy-policy-and-request-collection' },
    { id: 'R36', path: '/s/shop-demo/jobs/missing-job', heading: 'Công việc missing-job', state: 'missing-job-error-empty-state' },
];
const hash = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const sourceHashes = {
    workspace: hash('apps/web/src/modules/workspace/index.tsx'),
    layout: hash('apps/web/src/shared/ui/layout.ts'),
    components: hash('apps/web/src/shared/ui/components.tsx'),
    routeManifest: hash('botsales-kit/contracts/route-manifest.json'),
    openapi: hash('botsales-kit/contracts/openapi.json'),
    uxContract: hash('UX-CONTRACT.md'),
    tokens: hash('botsales-kit/design/tokens.json'),
    spacingStandard: hash('docs/FRONTEND_SPACING_STANDARD.md'),
};

const layoutOutput = execFileSync(process.execPath, [
    path.join(root, 'scripts/check-layout.mjs'), '--report', '--json',
], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const layoutReport = JSON.parse(layoutOutput);
const layoutPath = path.join(evidenceDir, 'layout-before-spacing-current-20261006.json');
fs.writeFileSync(layoutPath, `${JSON.stringify(layoutReport, null, 2)}\n`, { flag: 'wx' });

const captures = [];
const pageErrors = [];
const apiWrites = [];
const server = await startDemoServer({ cacheIsolationKey: 'ui028-w22-before-20261006' });
const browser = await chromium.launch();

try {
    for (const viewport of viewports) {
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
        const page = await context.newPage();
        page.on('pageerror', error => pageErrors.push(`${viewport.suffix}: ${error.message}`));
        page.on('request', request => {
            const url = new URL(request.url());
            if (url.pathname.startsWith('/api/v2/') && request.method() !== 'GET') {
                apiWrites.push({ viewport: viewport.suffix, method: request.method(), path: url.pathname });
            }
        });
        for (const route of routes) {
            await page.goto(new URL(route.path, server.url).toString(), { waitUntil: 'domcontentloaded' });
            await page.getByRole('heading', { name: route.heading, exact: true }).first().waitFor({ state: 'visible', timeout: 20_000 });
            await page.waitForTimeout(250);
            const metrics = await page.evaluate(() => ({
                clientWidth: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
                clientHeight: document.documentElement.clientHeight,
                scrollHeight: document.documentElement.scrollHeight,
            }));
            const screenshot = `before-${route.id.toLowerCase()}-${viewport.suffix}.png`;
            await page.screenshot({ path: path.join(evidenceDir, screenshot), fullPage: true });
            captures.push({ route: route.id, path: route.path, heading: route.heading, state: route.state, viewport: { width: viewport.width, height: viewport.height }, screenshot, ...metrics });
        }
        await context.close();
    }
} finally {
    await browser.close();
    await server.close();
}

const output = {
    schemaVersion: 1,
    task: 'UI028.W22',
    phase: 'before-spacing-source-edit',
    date: '2026-10-06',
    browser: 'Chromium',
    mode: 'local demo / synthetic mock API',
    sourceHashes,
    layoutReport: {
        file: path.basename(layoutPath),
        status: layoutReport.status,
        files: layoutReport.files,
        totalFindings: layoutReport.findings.length,
        workspaceOwnerFindings: layoutReport.findings.filter(finding => finding.file === 'apps/web/src/modules/workspace/index.tsx').length,
    },
    viewports: viewports.map(({ width, height }) => `${width}x${height}`),
    captures,
    apiWrites,
    pageErrors,
};
const jsonPath = path.join(evidenceDir, 'render-before-spacing-current-20261006.json');
const logPath = path.join(evidenceDir, 'capture-before-spacing-current-20261006.log');
fs.writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`, { flag: 'wx' });
fs.writeFileSync(logPath, `${JSON.stringify({ task: output.task, phase: output.phase, observations: captures.length, apiWrites: apiWrites.length, pageErrors: pageErrors.length, layoutReport: output.layoutReport, sourceHashes }, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ task: output.task, observations: captures.length, apiWrites: apiWrites.length, pageErrors: pageErrors.length, layoutReport: output.layoutReport, sourceHashes }));
