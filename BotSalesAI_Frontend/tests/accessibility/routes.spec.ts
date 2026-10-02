import { readFileSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { startDemoServer } from '../session/demo-server.mjs';

type RouteManifest = { routes: Array<{ id: string; path: string }> };
const routeManifest = JSON.parse(
    readFileSync(new URL('../../packages/contracts/src/routes.json', import.meta.url), 'utf8'),
) as RouteManifest;
const detailIds: Record<string, string> = {
    conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001',
    knowledgeId: 'k1', jobId: 'missing-job',
};

test('all canonical routes pass whole-page WCAG 2.1 A/AA axe checks in the React demo', async ({ page }) => {
    test.setTimeout(300_000);
    const server = await startDemoServer();
    const results: Array<{ routeId: string; path: string; state: 'loading' | 'loaded'; violations: Array<{ id: string; impact: string | null; help: string; nodes: Array<{ target: string[]; html: string; summary: string }> }> }> = [];
    const pageErrors: Array<{ routeId: string; message: string }> = [];
    let currentRouteId = '';
    page.on('pageerror', error => pageErrors.push({ routeId: currentRouteId, message: error.message }));

    try {
        for (const route of routeManifest.routes) {
            currentRouteId = route.id;
            const routePath = route.path
                .replace(':shopId', 'shop-demo')
                .replace(/:([A-Za-z]+)/g, (_, key: string) => detailIds[key] || 'missing');
            await page.goto(new URL(routePath, server.url).toString());
            await expect(page.locator('#root')).not.toBeEmpty();
            await expect(page.getByText('Chưa khởi động được ứng dụng', { exact: true })).toHaveCount(0);
            const main = page.locator('main#main-content');
            await expect(main).toBeVisible();
            const skipLink = page.getByRole('link', { name: 'Đến nội dung chính', exact: true });
            await page.keyboard.press('Tab');
            await expect(skipLink).toBeFocused();
            await page.keyboard.press('Enter');
            await expect(main).toBeFocused();
            const auditRoute = async (state: 'loading' | 'loaded') => {
                const audit = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
                .analyze();
                results.push({
                routeId: route.id,
                path: routePath,
                state,
                violations: audit.violations.map(issue => ({
                    id: issue.id,
                    impact: issue.impact,
                    help: issue.help,
                    nodes: issue.nodes.map(node => ({ target: node.target, html: node.html, summary: node.failureSummary || '' })),
                })),
                });
            };
            const progress = main.locator('.MuiLinearProgress-root');
            if (route.id === 'R04' && await progress.count() > 0) await auditRoute('loading');
            await expect(progress).toHaveCount(0, { timeout: 20_000 });
            await auditRoute('loaded');
            const reportPath = process.env.BOTSALES_A11Y_REPORT;
            if (reportPath && results.length % 5 === 0) {
                await mkdir(path.dirname(path.resolve(reportPath)), { recursive: true });
                writeFileSync(path.resolve(reportPath), `${JSON.stringify({ scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', routeCount: results.length, results, pageErrors }, null, 2)}\n`, 'utf8');
            }
        }
    } finally {
        await server.close();
    }

    const report = { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', routeCount: results.length, results, pageErrors };
    const reportPath = process.env.BOTSALES_A11Y_REPORT;
    if (reportPath) {
        await mkdir(path.dirname(path.resolve(reportPath)), { recursive: true });
        writeFileSync(path.resolve(reportPath), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    }

    const violations = results.flatMap(route => route.violations.map(issue => ({ routeId: route.routeId, ...issue })));
    expect(results.filter(result => result.state === 'loaded')).toHaveLength(54);
    expect(pageErrors).toEqual([]);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
});
