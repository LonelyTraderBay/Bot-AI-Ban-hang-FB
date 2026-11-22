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

type RouteAudit = {
    routeId: string;
    path: string;
    state: 'loading' | 'loaded';
    violations: Array<{ id: string; impact: string | null; help: string; nodes: Array<{ target: string[]; html: string; summary: string }> }>;
};
type PageError = { routeId: string; message: string };

test.describe('all canonical routes pass whole-page WCAG 2.1 A/AA axe checks in the React demo', () => {
    // Keep the optional combined report in one worker, with separate test budgets for each batch.
    test.describe.configure({ mode: 'default' });
    const batchSize = 17;
    const allResults: RouteAudit[] = [];
    const allPageErrors: PageError[] = [];
    async function writeReport() {
        const reportPath = process.env.BOTSALES_A11Y_REPORT;
        if (!reportPath) return;
        const target = path.resolve(reportPath);
        await mkdir(path.dirname(target), { recursive: true });
        const report = { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', routeCount: allResults.length, results: allResults, pageErrors: allPageErrors };
        writeFileSync(target, JSON.stringify(report, null, 2) + '\n', 'utf8');
    }
    for (let start = 0; start < routeManifest.routes.length; start += batchSize) {
        const batch = routeManifest.routes.slice(start, start + batchSize);
        test(batch[0]!.id + '–' + batch.at(-1)!.id, async ({ page }) => {
            const server = await startDemoServer();
            const results: RouteAudit[] = [];
            const pageErrors: PageError[] = [];
            let currentRouteId = '';
            page.on('pageerror', error => {
                const errorDetail = { routeId: currentRouteId, message: error.message };
                pageErrors.push(errorDetail);
                allPageErrors.push(errorDetail);
            });
            try {
                for (const route of batch) {
                    currentRouteId = route.id;
                    const routePath = route.path
                        .replace(':shopId', 'shop-demo')
                        .replace(/:([A-Za-z]+)/g, (_, key: string) => detailIds[key] || 'missing');
                    await page.goto(new URL(routePath, server.url).toString());
                    await expect(page.locator('#root'), route.id + ' should start the demo').not.toBeEmpty({ timeout: 15_000 });
                    await expect(page.getByText('Chưa khởi động được ứng dụng', { exact: true })).toHaveCount(0);
                    const main = page.locator('main#main-content');
                    await expect(main, route.id + ' should render the application shell').toBeVisible({ timeout: 15_000 });
                    const skipLink = page.getByRole('link', { name: 'Đến nội dung chính', exact: true });
                    await page.keyboard.press('Tab');
                    await expect(skipLink).toBeFocused();
                    await page.keyboard.press('Enter');
                    await expect(main).toBeFocused();
                    if (route.id === 'R31') {
                        await expect(page).toHaveURL(url => url.searchParams.has('reportType') && url.hash === '#main-content');
                        await expect(main, 'R31 keeps keyboard focus after the report loads its default filters').toBeFocused();
                    }
                    const auditRoute = async (state: 'loading' | 'loaded') => {
                        const audit = await new AxeBuilder({ page })
                            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
                            .analyze();
                        const result = {
                            routeId: route.id, path: routePath, state,
                            violations: audit.violations.map(issue => ({
                                id: issue.id, impact: issue.impact, help: issue.help,
                                nodes: issue.nodes.map(node => ({ target: node.target, html: node.html, summary: node.failureSummary || '' })),
                            })),
                        };
                        results.push(result);
                        allResults.push(result);
                    };
                    const progress = main.locator('.MuiLinearProgress-root');
                    if (route.id === 'R04' && await progress.count() > 0) await auditRoute('loading');
                    await expect(progress).toHaveCount(0, { timeout: 20_000 });
                    await auditRoute('loaded');
                    if (allResults.length % 5 === 0) await writeReport();
                }
            } finally {
                await server.close();
                await writeReport();
            }
            const violations = results.flatMap(route => route.violations.map(issue => ({ routeId: route.routeId, ...issue })));
            expect(results.filter(result => result.state === 'loaded').map(result => result.routeId)).toEqual(batch.map(route => route.id));
            expect(pageErrors).toEqual([]);
            expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
        });
    }
});

test('contained action buttons do not animate between contrasting enabled and disabled color pairs', async ({ page }) => {
    const server = await startDemoServer();
    try {
        await page.goto(new URL('/s/shop-demo/settings/privacy', server.url).toString());
        const action = page.getByRole('button', { name: 'Tạo yêu cầu xác nhận lại', exact: true });
        await expect(action).toBeVisible();
        await expect(action).toBeEnabled();
        const transitions = await action.evaluate(element => getComputedStyle(element).transitionProperty.split(',').map(value => value.trim()));
        expect(transitions).not.toContain('background-color');
    } finally {
        await server.close();
    }
});
