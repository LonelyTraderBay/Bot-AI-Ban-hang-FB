import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { evidenceRunId } from './evidence-run-id.mjs';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer({ cacheIsolationKey: 's15-positive-ancestry' });
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

function sourceFingerprints() {
    const root = process.cwd();
    const files = [
        'tests/ui-composition-positive-ancestry.spec.ts',
        'apps/web/src/shared/ui/composition.tsx',
        'apps/web/src/shared/ui/components.tsx',
        'apps/web/src/shared/ui/layout.ts',
        'apps/web/src/modules/dashboard/index.tsx',
        'apps/web/src/modules/catalog/index.tsx',
        'apps/web/src/modules/knowledge/index.tsx',
        '../botsales-kit/contracts/route-manifest.json',
        'playwright.config.ts',
    ];
    return Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
}

async function openRoute(page: Page, pathname: string, width: number) {
    await page.setViewportSize({ width, height: 900 });
    const url = new URL(pathname, demoUrl).toString();
    await page.goto(url);
    await expect(page).toHaveURL(url);
    await page.locator('main h1').waitFor({ state: 'visible' });
}

async function persistReport(info: TestInfo, name: string, observations: Array<Record<string, unknown>>, pageErrors: string[]) {
    expect(pageErrors, `${name} page errors`).toEqual([]);
    const report = {
        schemaVersion: 1,
        step: 'S15',
        capturedAt: new Date().toISOString(),
        result: 'PASS',
        scope: 'Local React Frontend with synthetic MSW; browser-positive shared composition ownership observations.',
        browser: info.project.name,
        observations,
        pageErrors,
        sourceFingerprints: sourceFingerprints(),
    };
    const output = path.join(process.cwd(), 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007', `S15-positive-${name}-${info.project.name}-${evidenceRunId}.json`);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await info.attach(path.basename(output), { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
}

test('S15 Dashboard conditional content keeps an independently bordered surface inside its Panel owner', async ({ page }, info) => {
    const errors: string[] = [];
    const observations: Array<Record<string, unknown>> = [];
    page.on('pageerror', error => errors.push(error.message));

    for (const width of [390, 1440]) {
        await openRoute(page, '/s/shop-demo/overview', width);
        const heading = page.getByRole('heading', { name: 'Đội ngũ AI của cửa hàng', exact: true });
        await expect(heading).toBeVisible();
        const panel = heading.locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]');
        const grid = panel.locator('[data-ui-composition="section-grid"]');
        await expect(grid).toBeVisible();
        const surfaces = grid.locator('[data-ui-composition="surface-content"]');
        await expect(surfaces.first()).toBeVisible();
        const geometry = await surfaces.first().evaluate(element => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            const panel = element.closest('.MuiPaper-root');
            const panelRect = panel?.getBoundingClientRect();
            return {
                borderStyle: style.borderTopStyle,
                borderWidth: style.borderTopWidth,
                borderRadius: style.borderTopLeftRadius,
                paddingTop: style.paddingTop,
                paddingInlineStart: style.paddingInlineStart,
                containedByPanel: !!panelRect && rect.left > panelRect.left && rect.right < panelRect.right,
                documentWidth: document.documentElement.scrollWidth,
                viewportWidth: document.documentElement.clientWidth,
            };
        });
        expect(geometry.borderStyle, `R04 ${width}px nested surface border`).toBe('solid');
        expect(geometry.borderWidth, `R04 ${width}px nested surface border width`).toBe('1px');
        expect(Number.parseFloat(geometry.paddingInlineStart), `R04 ${width}px nested surface inset`).toBeGreaterThan(0);
        expect(geometry.containedByPanel, `R04 ${width}px independent surface containment`).toBe(true);
        expect(geometry.documentWidth, `R04 ${width}px no horizontal overflow`).toBeLessThanOrEqual(geometry.viewportWidth);
        observations.push({ routeId: 'R04', pathname: '/s/shop-demo/overview', viewport: { width, height: 900 }, nestedSurfaceCount: await surfaces.count(), geometry });
    }

    await persistReport(info, 'dashboard-nested-surface', observations, errors);
});

test('S15 catalog QueryState fragment keeps DataTable and Pager as peer children of one Panel', async ({ page }, info) => {
    const errors: string[] = [];
    const observations: Array<Record<string, unknown>> = [];
    page.on('pageerror', error => errors.push(error.message));

    for (const width of [390, 806, 1440]) {
        await openRoute(page, '/s/shop-demo/products', width);
        await expect(page.getByRole('heading', { name: 'Sản phẩm', exact: true })).toBeVisible();
        const table = page.getByRole('table').first();
        const next = page.getByRole('button', { name: 'Trang tiếp', exact: true });
        await expect(table).toBeVisible();
        await expect(next).toBeVisible();
        const relationship = await page.evaluate(() => {
            const main = document.querySelector('main');
            const region = main?.querySelector('[role="region"]');
            const nextButton = [...(main?.querySelectorAll('button') || [])].find(button => button.textContent?.trim() === 'Trang tiếp');
            const pagerRoot = nextButton?.parentElement?.parentElement;
            const panel = region?.closest('.MuiPaper-root');
            return {
                regionAndPagerShareContentParent: !!region && !!pagerRoot && region.parentElement === pagerRoot.parentElement,
                regionAndPagerSharePanel: !!panel && panel === pagerRoot?.closest('.MuiPaper-root'),
                documentWidth: document.documentElement.scrollWidth,
                viewportWidth: document.documentElement.clientWidth,
            };
        });
        expect(relationship.regionAndPagerShareContentParent, `R09 ${width}px fragment siblings`).toBe(true);
        expect(relationship.regionAndPagerSharePanel, `R09 ${width}px shared Panel owner`).toBe(true);
        expect(relationship.documentWidth, `R09 ${width}px no horizontal overflow`).toBeLessThanOrEqual(relationship.viewportWidth);
        observations.push({ routeId: 'R09', pathname: '/s/shop-demo/products', viewport: { width, height: 900 }, relationship });
    }

    await persistReport(info, 'catalog-query-fragment', observations, errors);
});

test('S15 Knowledge action group wraps children without losing its shared action owner', async ({ page }, info) => {
    const errors: string[] = [];
    const observations: Array<Record<string, unknown>> = [];
    page.on('pageerror', error => errors.push(error.message));

    for (const width of [390, 806, 1440]) {
        await openRoute(page, '/s/shop-demo/knowledge/k1', width);
        await expect(page.getByRole('heading', { name: 'Chính sách giao hàng', exact: true })).toBeVisible();
        const action = page.getByRole('button', { name: 'Soạn phiên bản mới', exact: true });
        await expect(action).toBeVisible();
        const group = action.locator('xpath=ancestor::*[@data-ui-composition="action-group"][1]');
        const geometry = await group.evaluate(element => {
            const style = getComputedStyle(element);
            const children = [...element.children].map(child => {
                const rect = child.getBoundingClientRect();
                return { top: rect.top, left: rect.left, right: rect.right, width: rect.width };
            });
            return {
                flexWrap: style.flexWrap,
                gap: style.gap,
                childCount: children.length,
                lineCount: new Set(children.map(child => Math.round(child.top))).size,
                children,
                documentWidth: document.documentElement.scrollWidth,
                viewportWidth: document.documentElement.clientWidth,
            };
        });
        expect(geometry.flexWrap, `R24 ${width}px action group wrap contract`).toBe('wrap');
        expect(geometry.childCount, `R24 ${width}px visible action set`).toBe(4);
        expect(geometry.lineCount, `R24 ${width}px children remain measurable`).toBeGreaterThanOrEqual(1);
        if (width === 390) expect(geometry.lineCount, 'R24 narrow viewport wraps actions onto multiple lines').toBeGreaterThan(1);
        expect(geometry.documentWidth, `R24 ${width}px no horizontal overflow`).toBeLessThanOrEqual(geometry.viewportWidth);
        observations.push({ routeId: 'R24', pathname: '/s/shop-demo/knowledge/k1', viewport: { width, height: 900 }, geometry });
    }

    await persistReport(info, 'knowledge-wrapped-actions', observations, errors);
});
