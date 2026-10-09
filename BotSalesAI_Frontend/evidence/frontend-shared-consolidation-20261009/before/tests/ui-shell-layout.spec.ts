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

test('Shell keeps header, banner, main and footer on one responsive gutter', async ({ page }) => {
    for (const viewport of [{ width: 1280, height: 900, gutter: 24, header: 64 }, { width: 390, height: 844, gutter: 16, header: 56 }]) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
        await expect(page.locator('main#main-content')).toBeVisible();

        const metrics = await page.evaluate(() => {
            const header = document.querySelector('header')!;
            const headerContent = header.querySelector('.MuiStack-root')!;
            const main = document.querySelector('main#main-content')!;
            const footer = document.querySelector('footer')!;
            const banner = header.nextElementSibling!.querySelector('.MuiAlert-root')!;
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
                bannerLeft: banner.getBoundingClientRect().left,
                bannerRight: banner.getBoundingClientRect().right,
                footerBlockInset: getComputedStyle(footer).paddingTop,
                mainFlexGrow: getComputedStyle(main).flexGrow,
                mainBlockInset: [getComputedStyle(main).paddingTop, getComputedStyle(main).paddingBottom],
                contentColumn: { display: getComputedStyle(contentColumn).display, direction: getComputedStyle(contentColumn).flexDirection },
                document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
                navigationWidth: navigation.getBoundingClientRect().width,
                accountName: { whiteSpace: getComputedStyle(accountName).whiteSpace, overflowWrap: getComputedStyle(accountName).overflowWrap, clientWidth: accountName.clientWidth, scrollWidth: accountName.scrollWidth },
            };
        });

        expect(metrics.headerHeight).toBe(viewport.header);
        expect(metrics.headerContentLeft).toBe(metrics.navigationWidth + viewport.gutter);
        expect(metrics.headerContentRight).toBe(viewport.width - viewport.gutter);
        expect(metrics.mainLeft).toBe(metrics.navigationWidth + viewport.gutter);
        expect(metrics.mainRight).toBe(viewport.width - viewport.gutter);
        expect(metrics.bannerLeft).toBe(metrics.navigationWidth + viewport.gutter);
        expect(metrics.bannerRight).toBe(viewport.width - viewport.gutter);
        expect(metrics.footerLeft).toBe(metrics.navigationWidth + viewport.gutter);
        expect(metrics.footerRight).toBe(viewport.width - viewport.gutter);
        expect(metrics.footerBlockInset).toBe('16px');
        expect(metrics.mainFlexGrow).toBe('1');
        expect(metrics.mainBlockInset).toEqual(['24px', '24px']);
        expect(metrics.contentColumn).toEqual({ display: 'flex', direction: 'column' });
        expect(metrics.document.scrollWidth).toBe(metrics.document.clientWidth);
        expect(metrics.accountName.whiteSpace).toBe('normal');
        expect(metrics.accountName.overflowWrap).toBe('anywhere');
        expect(metrics.accountName.scrollWidth).toBeLessThanOrEqual(metrics.accountName.clientWidth + 1);
    }
});

test('demo controls stay discoverable on mobile and usable on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
    const toggle = page.getByRole('button', { name: 'Công cụ demo' });
    const controls = page.locator('#mock-tools-controls');
    await expect(toggle).toBeVisible();
    await expect(controls).toBeHidden();
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Ẩn công cụ demo' })).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('combobox', { name: 'Vai trò mô phỏng' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Trạng thái thử' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Dataset mô phỏng' })).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(toggle).toBeHidden();
    await expect(controls).toBeVisible();
});

test('SPC-055/057 floated demo-control labels keep a clear gap on every Shell route consumer', async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 806, height: 884 });

    for (const route of shellRoutes) {
        const pathname = routePath(route);
        await page.goto(new URL(pathname, demoUrl).toString(), { waitUntil: 'domcontentloaded' });
        const alert = page.locator('header').locator('xpath=following-sibling::*[1]').locator('.MuiAlert-root');
        const controls = page.locator('#mock-tools-controls');
        await expect(alert).toBeVisible();
        await expect(controls).toBeVisible();

        const visibleGap = await page.evaluate(() => {
            const banner = document.querySelector('header')?.nextElementSibling?.querySelector('.MuiAlert-root');
            const label = document.querySelector('#mock-tools-controls label.MuiInputLabel-root');
            if (!banner || !label) return null;
            return label.getBoundingClientRect().top - banner.getBoundingClientRect().bottom;
        });

        expect(visibleGap, `${route.id} (${profileFor(route)}) ${pathname}: visible gap from demo review alert to floated control label`).not.toBeNull();
        expect(visibleGap, `${route.id} (${profileFor(route)}) ${pathname}: visible gap from demo review alert to floated control label`).toBeGreaterThanOrEqual(8);
    }
});

test('unmatched route fallback owns its page gutter without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(new URL('/w09-unmatched-route', demoUrl).toString());
    await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
    const fallback = page.locator('main#main-content');
    await expect(fallback).toHaveCSS('padding-left', '16px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
