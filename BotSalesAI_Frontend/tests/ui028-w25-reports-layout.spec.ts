import { openDemoControls } from './session/demo-controls';
import { test, expect } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

test('UI028.W25 Reports semantic spacing stays stable at mobile, tablet and desktop widths', async ({ page }) => {
    const pageErrors: string[] = [];
    const writes: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(`${request.method()} ${request.url()}`);
    });

    const widths = [320, 390, 768, 1024, 1280, 1440];
    for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(new URL('/s/shop-demo/reports?reportType=orders&fromDate=2026-09-28&toDate=2026-09-29', demoUrl).toString());
        await expect(page.getByRole('heading', { name: 'Báo cáo & xuất dữ liệu' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Công việc gần đây' })).toBeVisible();
        const spacing = await page.evaluate(() => {
            const styleOf = (selector: string) => {
                const element = document.querySelector<HTMLElement>(selector);
                if (!element) throw new Error(`Reports spacing target missing: ${selector}`);
                const style = getComputedStyle(element);
                return { gap: style.gap, paddingLeft: style.paddingLeft, paddingRight: style.paddingRight, paddingTop: style.paddingTop, paddingBottom: style.paddingBottom };
            };
            const form = document.querySelector<HTMLElement>('[data-testid="reports-export-form-layout"]');
            const formBody = form?.parentElement;
            if (!form || !formBody) throw new Error('Reports export form or owning Panel body is missing.');
            const bodyStyle = getComputedStyle(formBody);
            return {
                pageGridGap: styleOf('[data-testid="reports-main-layout"]').gap,
                sectionGap: styleOf('[data-testid="reports-page-sections"]').gap,
                bodyInset: { top: bodyStyle.paddingTop, right: bodyStyle.paddingRight, bottom: bodyStyle.paddingBottom, left: bodyStyle.paddingLeft },
                formGap: styleOf('[data-testid="reports-export-form-layout"]').gap,
                dateFieldGap: styleOf('[data-testid="reports-date-filters"]').gap,
            };
        });
        const inset = width < 768 ? '12px' : '16px';
        expect(spacing).toEqual({
            pageGridGap: '16px',
            sectionGap: '16px',
            bodyInset: { top: '0px', right: inset, bottom: inset, left: inset },
            formGap: '16px',
            dateFieldGap: '16px',
        });
        await expect(page.getByLabel('Từ ngày')).toHaveValue('2026-09-28');
        await expect(page.getByLabel('Đến ngày')).toHaveValue('2026-09-29');
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }

    for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        const canonicalResponse = page.waitForResponse(response => {
            const url = new URL(response.url());
            return response.request().method() === 'GET' && url.pathname.endsWith('/marketing-summary')
                && ['fromDate', 'toDate', 'bucket'].every(key => url.searchParams.has(key));
        });
        await page.goto(new URL('/s/shop-demo/reports/marketing', demoUrl).toString());
        expect((await canonicalResponse).status()).toBe(200);
        await expect(page.getByRole('heading', { name: 'Thông tin cho marketing' })).toBeVisible();
        await expect(page.getByTestId('marketing-loss-chart')).toBeVisible();
        await expect(page.getByRole('table', { name: 'Lý do không chốt đơn' })).toBeVisible();
        const chartSvg = page.getByTestId('marketing-loss-chart').locator('svg.recharts-surface');
        await expect(chartSvg).toBeVisible();
        await expect(chartSvg.locator('text')).not.toHaveCount(0);
        const spacing = await page.evaluate(() => {
            const styleOf = (selector: string) => {
                const element = document.querySelector<HTMLElement>(selector);
                if (!element) throw new Error(`Marketing spacing target missing: ${selector}`);
                const style = getComputedStyle(element);
                return { gap: style.gap, padding: style.padding, paddingLeft: style.paddingLeft, marginBottom: style.marginBottom };
            };
            const chart = document.querySelector<HTMLElement>('[data-testid="marketing-loss-chart"]');
            if (!chart) throw new Error('Marketing chart viewport is missing.');
            const chartStyle = getComputedStyle(chart);
            const svg = chart.querySelector<SVGSVGElement>('svg.recharts-surface');
            const svgRect = svg?.getBoundingClientRect();
            const questionSurface = document.querySelector<HTMLElement>('[data-testid="marketing-question-surface"]');
            const questionList = document.querySelector<HTMLElement>('[data-testid="marketing-top-questions"]');
            const firstQuestion = questionList?.querySelector<HTMLElement>(':scope > li');
            if (!questionSurface || !questionList || !firstQuestion) throw new Error('Marketing question surface/list is missing.');
            const surfaceStyle = getComputedStyle(questionSurface);
            const questionStyle = getComputedStyle(questionList);
            return {
                sectionsGap: styleOf('[data-testid="marketing-sections-grid"]').gap,
                asOfGap: styleOf('[data-testid="marketing-as-of"]').gap,
                asOfMarginBottom: styleOf('[data-testid="marketing-as-of"]').marginBottom,
                questionSurfaceInset: surfaceStyle.padding,
                questionList: { gap: questionStyle.gap, padding: questionStyle.padding, paddingLeft: questionStyle.paddingLeft },
                questionTextInset: firstQuestion.getBoundingClientRect().left - questionSurface.getBoundingClientRect().left,
                chartFrame: { height: chartStyle.height, padding: chartStyle.padding },
                chartSvg: svgRect ? { width: svgRect.width, height: svgRect.height } : null,
                chartTextCount: svg?.querySelectorAll('text').length ?? 0,
            };
        });
        expect(spacing.sectionsGap).toBe('16px');
        expect(spacing.asOfGap).toBe('12px');
        expect(spacing.asOfMarginBottom).toBe('16px');
        expect(spacing.questionSurfaceInset).toBe('16px');
        expect(spacing.questionList).toMatchObject({ gap: '12px', padding: '0px 0px 0px 16px', paddingLeft: '16px' });
        expect(spacing.questionTextInset).toBe(32);
        expect(spacing.chartFrame).toEqual({ height: '260px', padding: '16px' });
        expect(spacing.chartSvg).not.toBeNull();
        expect(spacing.chartTextCount).toBeGreaterThan(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }

    expect(writes).toEqual([]);
    expect(pageErrors).toEqual([]);
});

test('UI028.W25 authorized report download link retains its 44px hit target', async ({ page }) => {
    await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
    await openDemoControls(page);
    await page.getByLabel('Vai trò mô phỏng').click();
    await page.getByRole('option', { name: 'owner', exact: true }).click();
    await page.goto(new URL('/s/shop-demo/reports', demoUrl).toString());
    await expect(page.getByRole('heading', { name: 'Tạo tệp báo cáo' })).toBeVisible();
    await page.getByLabel('Từ ngày').fill('2026-09-29');
    await page.getByLabel('Đến ngày').fill('2026-09-29');
    const exportResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/exports'));
    await page.getByRole('button', { name: 'Tạo tệp báo cáo CSV' }).click();
    expect((await exportResponse).status()).toBe(202);
    const downloadLink = page.getByTestId('reports-export-download');
    await expect(downloadLink).toBeVisible();
    const target = await downloadLink.evaluate(element => {
        const style = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        return { minHeight: style.minHeight, height: bounds.height, padding: style.padding };
    });
    expect(target).toEqual({ minHeight: '44px', height: 44, padding: '8px 16px' });
});
