# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui028-w25-reports-layout.spec.ts >> UI028.W25 Reports semantic spacing stays stable at mobile, tablet and desktop widths
- Location: tests/ui028-w25-reports-layout.spec.ts:16:1

# Error details

```
Error: expect(received).not.toBeNull()

Received: null
```

# Test source

```ts
  5   | let demoUrl = '';
  6   | let closeDemo: (() => Promise<void>) | undefined;
  7   | 
  8   | test.beforeAll(async () => {
  9   |     const server = await startDemoServer();
  10  |     demoUrl = server.url;
  11  |     closeDemo = server.close;
  12  | });
  13  | 
  14  | test.afterAll(async () => closeDemo?.());
  15  | 
  16  | test('UI028.W25 Reports semantic spacing stays stable at mobile, tablet and desktop widths', async ({ page }) => {
  17  |     const pageErrors: string[] = [];
  18  |     const writes: string[] = [];
  19  |     page.on('pageerror', error => pageErrors.push(error.message));
  20  |     page.on('request', request => {
  21  |         if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(`${request.method()} ${request.url()}`);
  22  |     });
  23  | 
  24  |     const widths = [320, 390, 768, 1024, 1280, 1440];
  25  |     for (const width of widths) {
  26  |         await page.setViewportSize({ width, height: 900 });
  27  |         await page.goto(new URL('/s/shop-demo/reports?reportType=orders&fromDate=2026-09-28&toDate=2026-09-29', demoUrl).toString());
  28  |         await expect(page.getByRole('heading', { name: 'Báo cáo & xuất dữ liệu' })).toBeVisible();
  29  |         await expect(page.getByRole('heading', { name: 'Công việc gần đây' })).toBeVisible();
  30  |         const spacing = await page.evaluate(() => {
  31  |             const styleOf = (selector: string) => {
  32  |                 const element = document.querySelector<HTMLElement>(selector);
  33  |                 if (!element) throw new Error(`Reports spacing target missing: ${selector}`);
  34  |                 const style = getComputedStyle(element);
  35  |                 return { gap: style.gap, paddingLeft: style.paddingLeft, paddingRight: style.paddingRight, paddingTop: style.paddingTop, paddingBottom: style.paddingBottom };
  36  |             };
  37  |             const form = document.querySelector<HTMLElement>('[data-testid="reports-export-form-layout"]');
  38  |             const formBody = form?.parentElement;
  39  |             if (!form || !formBody) throw new Error('Reports export form or owning Panel body is missing.');
  40  |             const bodyStyle = getComputedStyle(formBody);
  41  |             return {
  42  |                 pageGridGap: styleOf('[data-testid="reports-main-layout"]').gap,
  43  |                 sectionGap: styleOf('[data-testid="reports-page-sections"]').gap,
  44  |                 bodyInset: { top: bodyStyle.paddingTop, right: bodyStyle.paddingRight, bottom: bodyStyle.paddingBottom, left: bodyStyle.paddingLeft },
  45  |                 formGap: styleOf('[data-testid="reports-export-form-layout"]').gap,
  46  |                 dateFieldGap: styleOf('[data-testid="reports-date-filters"]').gap,
  47  |             };
  48  |         });
  49  |         const inset = width < 768 ? '12px' : '16px';
  50  |         expect(spacing).toEqual({
  51  |             pageGridGap: '16px',
  52  |             sectionGap: '16px',
  53  |             bodyInset: { top: '0px', right: inset, bottom: inset, left: inset },
  54  |             formGap: '16px',
  55  |             dateFieldGap: '16px',
  56  |         });
  57  |         await expect(page.getByLabel('Từ ngày')).toHaveValue('2026-09-28');
  58  |         await expect(page.getByLabel('Đến ngày')).toHaveValue('2026-09-29');
  59  |         expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  60  |     }
  61  | 
  62  |     for (const width of widths) {
  63  |         await page.setViewportSize({ width, height: 900 });
  64  |         await page.goto(new URL('/s/shop-demo/reports/marketing', demoUrl).toString());
  65  |         await expect(page.getByRole('heading', { name: 'Thông tin cho marketing' })).toBeVisible();
  66  |         await expect(page.getByTestId('marketing-loss-chart')).toBeVisible();
  67  |         await expect(page.getByRole('table', { name: 'Lý do không chốt đơn' })).toBeVisible();
  68  |         const spacing = await page.evaluate(() => {
  69  |             const styleOf = (selector: string) => {
  70  |                 const element = document.querySelector<HTMLElement>(selector);
  71  |                 if (!element) throw new Error(`Marketing spacing target missing: ${selector}`);
  72  |                 const style = getComputedStyle(element);
  73  |                 return { gap: style.gap, padding: style.padding, paddingLeft: style.paddingLeft, marginBottom: style.marginBottom };
  74  |             };
  75  |             const chart = document.querySelector<HTMLElement>('[data-testid="marketing-loss-chart"]');
  76  |             if (!chart) throw new Error('Marketing chart viewport is missing.');
  77  |             const chartStyle = getComputedStyle(chart);
  78  |             const svg = chart.querySelector<SVGSVGElement>('svg.recharts-surface');
  79  |             const svgRect = svg?.getBoundingClientRect();
  80  |             const questionSurface = document.querySelector<HTMLElement>('[data-testid="marketing-question-surface"]');
  81  |             const questionList = document.querySelector<HTMLElement>('[data-testid="marketing-top-questions"]');
  82  |             const firstQuestion = questionList?.querySelector<HTMLElement>(':scope > li');
  83  |             if (!questionSurface || !questionList || !firstQuestion) throw new Error('Marketing question surface/list is missing.');
  84  |             const surfaceStyle = getComputedStyle(questionSurface);
  85  |             const questionStyle = getComputedStyle(questionList);
  86  |             return {
  87  |                 sectionsGap: styleOf('[data-testid="marketing-sections-grid"]').gap,
  88  |                 asOfGap: styleOf('[data-testid="marketing-as-of"]').gap,
  89  |                 asOfMarginBottom: styleOf('[data-testid="marketing-as-of"]').marginBottom,
  90  |                 questionSurfaceInset: surfaceStyle.padding,
  91  |                 questionList: { gap: questionStyle.gap, padding: questionStyle.padding, paddingLeft: questionStyle.paddingLeft },
  92  |                 questionTextInset: firstQuestion.getBoundingClientRect().left - questionSurface.getBoundingClientRect().left,
  93  |                 chartFrame: { height: chartStyle.height, padding: chartStyle.padding },
  94  |                 chartSvg: svgRect ? { width: svgRect.width, height: svgRect.height } : null,
  95  |                 chartTextCount: svg?.querySelectorAll('text').length ?? 0,
  96  |             };
  97  |         });
  98  |         expect(spacing.sectionsGap).toBe('16px');
  99  |         expect(spacing.asOfGap).toBe('12px');
  100 |         expect(spacing.asOfMarginBottom).toBe('16px');
  101 |         expect(spacing.questionSurfaceInset).toBe('16px');
  102 |         expect(spacing.questionList).toMatchObject({ gap: '12px', padding: '0px 0px 0px 16px', paddingLeft: '16px' });
  103 |         expect(spacing.questionTextInset).toBe(32);
  104 |         expect(spacing.chartFrame).toEqual({ height: '260px', padding: '16px' });
> 105 |         expect(spacing.chartSvg).not.toBeNull();
      |                                      ^ Error: expect(received).not.toBeNull()
  106 |         expect(spacing.chartTextCount).toBeGreaterThan(0);
  107 |         expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  108 |     }
  109 | 
  110 |     expect(writes).toEqual([]);
  111 |     expect(pageErrors).toEqual([]);
  112 | });
  113 | 
  114 | test('UI028.W25 authorized report download link retains its 44px hit target', async ({ page }) => {
  115 |     await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
  116 |     await openDemoControls(page);
  117 |     await page.getByLabel('Vai trò mô phỏng').click();
  118 |     await page.getByRole('option', { name: 'owner', exact: true }).click();
  119 |     await page.goto(new URL('/s/shop-demo/reports', demoUrl).toString());
  120 |     await expect(page.getByRole('heading', { name: 'Tạo tệp báo cáo' })).toBeVisible();
  121 |     await page.getByLabel('Từ ngày').fill('2026-09-29');
  122 |     await page.getByLabel('Đến ngày').fill('2026-09-29');
  123 |     const exportResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/exports'));
  124 |     await page.getByRole('button', { name: 'Tạo tệp báo cáo CSV' }).click();
  125 |     expect((await exportResponse).status()).toBe(202);
  126 |     const downloadLink = page.getByTestId('reports-export-download');
  127 |     await expect(downloadLink).toBeVisible();
  128 |     const target = await downloadLink.evaluate(element => {
  129 |         const style = getComputedStyle(element);
  130 |         const bounds = element.getBoundingClientRect();
  131 |         return { minHeight: style.minHeight, height: bounds.height, padding: style.padding };
  132 |     });
  133 |     expect(target).toEqual({ minHeight: '44px', height: 44, padding: '8px 16px' });
  134 | });
  135 | 
```