import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startDemoServer } from '../../../tests/session/demo-server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const routeManifest = JSON.parse(await fs.readFile(path.join(root, 'botsales-kit/contracts/route-manifest.json'), 'utf8'));
const routes = Array.isArray(routeManifest.routes) ? routeManifest.routes : routeManifest;
const route = routes.find(item => item.id === 'R53' && item.path === '/s/:shopId/reports/marketing');
if (!route) throw new Error('Canonical R53 marketing route was not found.');

const expectedLabels = ['Không còn đúng kích cỡ', 'Chưa rõ phí giao hàng', 'Chưa đủ thông tin sản phẩm'];
const viewports = [
  { width: 1280, height: 720, name: '1280x720' },
  { width: 1440, height: 1000, name: '1440x1000' },
  { width: 320, height: 860, name: '320x860' },
];
const source = await fs.readFile(path.join(root, 'apps/web/src/modules/reports/index.tsx'));
const sourceSha256 = createHash('sha256').update(source).digest('hex').toUpperCase();
const demo = await startDemoServer({ cacheIsolationKey: 'ui012-chart-s28' });
let browser;

try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const pageErrors = [];
  const mutationRequests = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) mutationRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  const captures = [];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(new URL(route.path.replace(':shopId', 'shop-demo'), demo.url).toString(), { waitUntil: 'domcontentloaded' });
    await page.locator('main#main-content h1').waitFor({ state: 'visible', timeout: 20000 });
    const chart = page.getByRole('img', { name: 'Biểu đồ lý do không chốt đơn, 3 nhóm' });
    await chart.waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.fonts.status === 'loaded' && document.getAnimations().every(animation => animation.playState !== 'running'));

    const observation = await page.evaluate(expectedLabels => {
      const chart = document.querySelector('[data-testid="marketing-loss-chart"]');
      if (!chart) throw new Error('Marketing loss-reason chart is missing.');
      const chartRect = chart.getBoundingClientRect();
      return {
        chartLabels: [...chart.querySelectorAll('svg text')].map(node => node.textContent?.trim() || '').filter(Boolean),
        labelBounds: [...chart.querySelectorAll('svg text')].filter(node => expectedLabels.includes(node.textContent?.trim() || '')).map(node => {
          const rect = node.getBoundingClientRect();
          return { text: node.textContent?.trim() || '', x: rect.x, right: rect.right, y: rect.y, bottom: rect.bottom };
        }),
        tableRows: [...document.querySelectorAll('table[aria-label="Lý do không chốt đơn"] tbody tr')].map(row => row.innerText),
        chartBounds: { x: chartRect.x, y: chartRect.y, width: chartRect.width, height: chartRect.height },
        document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
      };
    }, expectedLabels);
    const missingLabels = expectedLabels.filter(label => !observation.chartLabels.includes(label));
    if (missingLabels.length) throw new Error(`${viewport.name}: missing chart labels ${JSON.stringify(missingLabels)}; observed ${JSON.stringify(observation.chartLabels)}`);
    if (observation.tableRows.length !== 3) throw new Error(`${viewport.name}: expected 3 table rows, got ${observation.tableRows.length}.`);
    if (observation.document.scrollWidth > observation.document.clientWidth) throw new Error(`${viewport.name}: document overflow ${JSON.stringify(observation.document)}.`);

    await chart.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.getAnimations().every(animation => animation.playState !== 'running'));
    const settledBounds = await page.evaluate(() => {
      const chart = document.querySelector('[data-testid="marketing-loss-chart"]');
      if (!chart) throw new Error('Marketing loss-reason chart disappeared before capture.');
      const chartRect = chart.getBoundingClientRect();
      const labels = [...chart.querySelectorAll('svg text')].filter(node => ['Không còn đúng kích cỡ', 'Chưa rõ phí giao hàng', 'Chưa đủ thông tin sản phẩm'].includes(node.textContent?.replace(/\s+/gu, ' ').trim() || '')).map(node => {
        const rect = node.getBoundingClientRect();
        return { text: node.textContent?.replace(/\s+/gu, ' ').trim(), x: rect.x, right: rect.right, y: rect.y, bottom: rect.bottom };
      });
      return { chart: { x: chartRect.x, right: chartRect.right, y: chartRect.y, bottom: chartRect.bottom }, labels, scrollY };
    });
    if (settledBounds.labels.length !== expectedLabels.length) throw new Error(`${viewport.name}: not all labels were present in the settled visual bounds.`);
    if (settledBounds.labels.some(label => label.x < settledBounds.chart.x || label.right > settledBounds.chart.right)) throw new Error(`${viewport.name}: a category label is clipped by the chart bounds: ${JSON.stringify(settledBounds)}.`);
    const screenshot = `S28-marketing-chart-labels-${viewport.name}.png`;
    await page.screenshot({ path: path.join(here, screenshot), fullPage: false });
    captures.push({ viewport: viewport.name, routeId: route.id, labels: expectedLabels, labelBounds: settledBounds, tableRows: observation.tableRows, document: observation.document, screenshot, screenshotBytes: (await fs.stat(path.join(here, screenshot))).size });
  }

  if (pageErrors.length || mutationRequests.length) throw new Error(`Unexpected errors or mutations: ${JSON.stringify({ pageErrors, mutationRequests })}`);
  const report = {
    date: '2026-10-03',
    item: 'UI012/S28 — marketing chart category labels',
    scope: 'Local React demo with synthetic MSW data; visual sample at 1280, 1440 and 320 CSS pixel widths.',
    route: { id: route.id, path: route.path, module: route.module },
    sourceSha256,
    captures,
    pageErrors,
    mutationRequests,
    baseline: {
      viewport: '1280x720 CSS px, before the XAxis adjustment',
      chartLabels: ['Không còn đúng kích cỡ', 'Chưa đủ thông tin sản phẩm'],
      tableRows: ['Không còn đúng kích cỡ\t4', 'Chưa rõ phí giao hàng\t3', 'Chưa đủ thông tin sản phẩm\t2'],
      observation: 'The middle bar had no x-axis label because the chart auto-skipped the middle tick; the parallel data table retained all three categories.',
    },
    limits: [
      'The sample verifies rendered Chromium snapshots; it is not screen-reader speech, physical-device testing, owner UAT or cross-browser evidence.',
      'No backend/provider call or mutation was made; the chart uses the local synthetic MSW response.',
      'The chart has a semantic data-table alternative; this fix restores the missing visible category label but does not close UI012.C04 or FE-G05.',
    ],
  };
  await fs.writeFile(path.join(here, 'S28-marketing-chart-labels.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await demo.close();
}
