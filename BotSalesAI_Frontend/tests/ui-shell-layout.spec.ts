import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

type Route = { id: string; path: string; title: string; module: string };
type RouteManifest = { routes: Route[] };

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, '../botsales-kit/contracts/route-manifest.json'), 'utf8')) as RouteManifest;
const shellRoutes = manifest.routes.filter(route => route.path.startsWith('/s/'));
const detailIds: Record<string, string> = {
    conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001',
    knowledgeId: 'k1', jobId: 'missing-job',
};

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

function routePath(route: Route) {
    return route.path
        .replace(':shopId', 'shop-demo')
        .replace(/:([A-Za-z]+)/g, (_, key: string) => detailIds[key] || 'missing');
}

function profileFor(route: Route) {
    if (route.path.includes('/inbox')) return 'inbox';
    if (route.path.includes('/reports')) return 'report';
    if (route.path.endsWith('/overview')) return 'dashboard';
    if (route.path.includes('/settings/')) return 'settings';
    if (route.path.includes('/new') || route.path.includes('/imports')) return 'form-or-import';
    if (route.path.includes('/:')) return 'detail-or-workflow';
    return 'collection-or-workflow';
}

test('Shell keeps an 8px content edge on desktop and mobile', async ({ page }) => {
    for (const viewport of [{ width: 1280, height: 900, header: 64 }, { width: 390, height: 844, header: 56 }]) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
        await expect(page.locator('main#main-content')).toBeVisible();
        await expect(page.getByRole('button', { name: /Công cụ demo/i })).toHaveCount(0);

        const metrics = await page.evaluate(() => {
            const header = document.querySelector('header')!;
            const headerContent = header.querySelector('.MuiStack-root')!;
            const main = document.querySelector('main#main-content')!;
            const footer = document.querySelector('footer')!;
            const navigation = document.querySelector('nav')!;
            const account = navigation.querySelector('button[aria-label="Đăng xuất"]')!.parentElement!;
            const accountName = account.querySelector('p')!;
            const edge = (element: Element, side: 'left' | 'right', insetProperty: 'paddingLeft' | 'paddingRight') => {
                const rect = element.getBoundingClientRect();
                const inset = Number.parseFloat(getComputedStyle(element)[insetProperty]);
                return side === 'left' ? rect.left + inset : rect.right - inset;
            };
            const contentColumn = header.parentElement!;
            return {
                headerHeight: header.getBoundingClientRect().height,
                headerContentLeft: edge(headerContent, 'left', 'paddingLeft'),
                headerContentRight: edge(headerContent, 'right', 'paddingRight'),
                mainLeft: edge(main, 'left', 'paddingLeft'),
                mainRight: edge(main, 'right', 'paddingRight'),
                footerLeft: edge(footer, 'left', 'paddingLeft'),
                footerRight: edge(footer, 'right', 'paddingRight'),
                headerToMain: main.getBoundingClientRect().top - header.getBoundingClientRect().bottom,
                footerBlockInset: getComputedStyle(footer).paddingTop,
                mainFlexGrow: getComputedStyle(main).flexGrow,
                mainBlockInset: [getComputedStyle(main).paddingTop, getComputedStyle(main).paddingBottom],
                contentColumn: { display: getComputedStyle(contentColumn).display, direction: getComputedStyle(contentColumn).flexDirection },
                document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
                navigationWidth: navigation.closest('.MuiDrawer-paper')!.getBoundingClientRect().width,
                accountName: { whiteSpace: getComputedStyle(accountName).whiteSpace, overflowWrap: getComputedStyle(accountName).overflowWrap, clientWidth: accountName.clientWidth, scrollWidth: accountName.scrollWidth },
            };
        });

        expect(metrics.headerHeight).toBe(viewport.header);
        expect(metrics.headerContentLeft).toBe(metrics.navigationWidth + 8);
        expect(metrics.headerContentRight).toBe(viewport.width - 8);
        expect(metrics.mainLeft).toBe(metrics.navigationWidth + 8);
        expect(metrics.mainRight).toBe(viewport.width - 8);
        expect(metrics.headerToMain).toBeCloseTo(0, 0);
        expect(metrics.footerLeft).toBe(metrics.navigationWidth + 8);
        expect(metrics.footerRight).toBe(viewport.width - 8);
        expect(metrics.footerBlockInset).toBe('8px');
        expect(metrics.mainFlexGrow).toBe('1');
        expect(metrics.mainBlockInset).toEqual(['8px', '8px']);
        expect(metrics.contentColumn).toEqual({ display: 'flex', direction: 'column' });
        expect(metrics.document.scrollWidth).toBe(metrics.document.clientWidth);
        expect(metrics.accountName.whiteSpace).toBe('normal');
        expect(metrics.accountName.overflowWrap).toBe('anywhere');
        expect(metrics.accountName.scrollWidth).toBeLessThanOrEqual(metrics.accountName.clientWidth + 1);
    }
});

test('Every shop route renders without demo controls', async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 806, height: 884 });

    for (const route of shellRoutes) {
        const pathname = routePath(route);
        await page.goto(new URL(pathname, demoUrl).toString(), { waitUntil: 'domcontentloaded' });
        await page.getByRole('progressbar', { name: 'Đang tải cửa hàng', exact: true }).waitFor({ state: 'hidden', timeout: 30000 });
        await expect(page.locator('#main-content'), route.id + ' ' + profileFor(route) + ' ' + pathname).toBeVisible({ timeout: 30_000 });
        await expect(page.getByRole('complementary', { name: 'Công cụ mô phỏng', exact: true })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /Công cụ demo/i })).toHaveCount(0);
    }
});

test('unmatched route fallback owns its page gutter without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(new URL('/w09-unmatched-route', demoUrl).toString());
    await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
    const fallback = page.locator('main#main-content');
    await expect(fallback).toHaveCSS('padding-left', '8px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
