import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

type Route = { id: string; path: string };
const routes = (JSON.parse(fs.readFileSync('../botsales-kit/contracts/route-manifest.json', 'utf8')) as { routes: Route[] }).routes;
const ids: Record<string, string> = { conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001', knowledgeId: 'k1', jobId: 'missing-job' };
let url = '';
let closeDemo: (() => Promise<void>) | undefined;
test.beforeAll(async () => { const server = await startDemoServer(); url = server.url; closeDemo = server.close; });
test.afterAll(async () => closeDemo?.());

test('SPC-061/062 shared compositions own their gap and child boundaries on every canonical route', async ({ page }, info) => {
    test.setTimeout(300_000);
    const errors: string[] = [];
    const observations: Array<Record<string, unknown>> = [];
    const observedOwners = new Set<string>();
    page.on('pageerror', error => errors.push(error.message));
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
        await page.setViewportSize(viewport);
        for (const route of routes) {
            const pathname = route.path.replace(':shopId', 'shop-demo').replace(/:([A-Za-z]+)/g, (_, key: string) => ids[key] || 'missing');
            await page.goto(new URL(pathname, url).toString(), { waitUntil: 'domcontentloaded' });
            await page.locator('main h1').waitFor({ state: 'visible' });
            await page.waitForFunction(() => !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'));
            const result = await page.evaluate(() => {
                const main = document.querySelector('main') || document.getElementById('root')!;
                return {
                    inset: [getComputedStyle(main).paddingTop, getComputedStyle(main).paddingBottom],
                    document: [document.documentElement.scrollWidth, document.documentElement.clientWidth],
                    groups: Array.from(main.querySelectorAll('[data-ui-composition]')).map(group => ({
                        owner: group.getAttribute('data-ui-composition')!,
                        rhythm: group.getAttribute('data-ui-rhythm'),
                        gap: getComputedStyle(group).gap,
                        childMargins: Array.from(group.children).map(child => [getComputedStyle(child).marginTop, getComputedStyle(child).marginBottom]),
                    })),
                };
            });
            const context = `${route.id} ${viewport.width}px`;
            const gaps: Record<string, string> = { 'form-fields': '16px', 'field-group': '8px', 'surface-content': '12px', 'page-sections': '16px' };
            for (const group of result.groups) {
                observedOwners.add(group.owner);
                let expected = gaps[group.owner];
                if (group.owner === 'form-fields') {
                    expect(group.rhythm, context).toMatch(/^(compact|comfortable)$/);
                    expected = group.rhythm === 'compact' ? '12px' : '16px';
                } else if (group.owner === 'surface-content') {
                    expect(group.rhythm, context).toMatch(/^(content|dividedRows)$/);
                    expected = group.rhythm === 'dividedRows' ? '0px' : '12px';
                } else if (group.owner === 'page-sections') {
                    expect(group.rhythm, context).toMatch(/^(section|major)$/);
                    expected = group.rhythm === 'major' ? '24px' : '16px';
                } else if (group.owner === 'action-group') {
                    expect(group.rhythm, `${context} action-group rhythm`).toMatch(/^(compact|comfortable)$/);
                    expected = group.rhythm === 'comfortable' ? '12px' : '8px';
                } else if (group.owner === 'section-grid') {
                    expect(group.rhythm, `${context} section-grid rhythm`).toMatch(/^(section|content)$/);
                    expected = group.rhythm === 'content' ? '12px' : '16px';
                }
                expect(group.gap, `${context} ${group.owner}`).toBe(expected);
                for (const margins of group.childMargins) expect(margins, `${context} ${group.owner} child boundary`).toEqual(['0px', '0px']);
            }
            if (pathname.startsWith('/s/')) expect(result.inset, `${context} Shell main`).toEqual(['16px', '16px']);
            expect(result.document[0], `${context} page overflow`).toBeLessThanOrEqual(result.document[1]);
            observations.push({ route: route.id, pathname, viewport, ...result });
        }
    }
    expect(errors).toEqual([]);
    expect(observations).toHaveLength(routes.length * 2);
    expect([...observedOwners].sort()).toEqual(['action-group', 'field-group', 'form-fields', 'page-sections', 'section-grid', 'surface-content']);
    await info.attach('composition-route-matrix', { body: JSON.stringify(observations, null, 2), contentType: 'application/json' });
});
