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
const outputs = [
  path.join(here, 'S30-marketing-chart-labels.json'),
  ...viewports.map(viewport => path.join(here, `S30-marketing-chart-labels-${viewport.name}.png`)),
];
for (const output of outputs) {
  try {
    await fs.access(output);
    throw new Error(`Refusing to overwrite existing evidence: ${output}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Refusing to overwrite')) throw error;
    if (error?.code !== 'ENOENT') throw error;
  }
}

const demo = await startDemoServer({ cacheIsolationKey: 'ui012-chart-s30' });
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
    await chart.scrollIntoViewIfNeeded();

    const observation = await page.evaluate(labels => {
      const chart = document.querySelector('[data-testid="marketing-loss-chart"]');
      if (!chart) throw new Error('Marketing loss-reason chart is missing.');
      const chartRect = chart.getBoundingClientRect();
      const labelNodes = [...chart.querySelectorAll('svg text')].filter(node => labels.includes(node.textContent?.replace(/\s+/gu, ' ').trim() || ''));
      const labelBounds = labelNodes.map(node => {
        const rect = node.getBoundingClientRect();
        return {
          text: node.textContent?.replace(/\s+/gu, ' ').trim() || '',
          x: rect.x,
          right: rect.right,
          y: rect.y,
          bottom: rect.bottom,
          fontSize: Number.parseFloat(getComputedStyle(node).fontSize),
          lines: node.querySelectorAll('tspan').length,
        };
      });
      return {
        chartLabels: [...chart.querySelectorAll('svg text')].map(node => node.textContent?.replace(/\s+/gu, ' ').trim() || '').filter(Boolean),
        labelBounds,
        tableRows: [...document.querySelectorAll('table[aria-label="Lý do không chốt đơn"] tbody tr')].map(row => row.innerText),
        chartBounds: { x: chartRect.x, right: chartRect.right, y: chartRect.y, bottom: chartRect.bottom },
        document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
      };
    }, expectedLabels);

    const missingLabels = expectedLabels.filter(label => !observation.chartLabels.includes(label));
    if (missingLabels.length) throw new Error(`${viewport.name}: missing labels ${JSON.stringify(missingLabels)}.`);
    if (observation.labelBounds.length !== expectedLabels.length) throw new Error(`${viewport.name}: expected ${expectedLabels.length} measured labels.`);
    if (observation.labelBounds.some(label => label.fontSize < 14)) throw new Error(`${viewport.name}: a label is below 14 CSS px: ${JSON.stringify(observation.labelBounds)}.`);
    if (observation.labelBounds.some(label => label.x < observation.chartBounds.x || label.right > observation.chartBounds.right)) throw new Error(`${viewport.name}: a label is clipped by the chart.`);
    for (let index = 1; index < observation.labelBounds.length; index += 1) {
      if (observation.labelBounds[index - 1].right > observation.labelBounds[index].x) throw new Error(`${viewport.name}: neighboring labels overlap.`);
    }
    if (observation.tableRows.length !== expectedLabels.length) throw new Error(`${viewport.name}: expected ${expectedLabels.length} table rows.`);
    if (observation.document.scrollWidth > observation.document.clientWidth) throw new Error(`${viewport.name}: document overflow ${JSON.stringify(observation.document)}.`);

    const screenshot = `S30-marketing-chart-labels-${viewport.name}.png`;
    await page.screenshot({ path: path.join(here, screenshot), fullPage: false });
    captures.push({ viewport: viewport.name, routeId: route.id, labels: expectedLabels, labelBounds: observation.labelBounds, chartBounds: observation.chartBounds, tableRows: observation.tableRows, document: observation.document, screenshot, screenshotBytes: (await fs.stat(path.join(here, screenshot))).size });
  }

  if (pageErrors.length || mutationRequests.length) throw new Error(`Unexpected errors or mutations: ${JSON.stringify({ pageErrors, mutationRequests })}`);
  const report = {
    date: '2026-10-03',
    item: 'UI012/S30 — mobile legibility follow-up for R53 category labels',
    scope: 'Local React demo with synthetic MSW data; Chromium 153 visual/geometry sample at 1280, 1440 and 320 CSS pixel widths.',
    route: { id: route.id, path: route.path, module: route.module },
    sourceSha256,
    acceptance: {
      allThreeCategoryLabels: true,
      computedLabelFontSizeAtLeastCssPx: 14,
      adjacentLabelsDoNotOverlap: true,
      allThreeDataRowsRemainVisible: true,
      documentHasNoHorizontalOverflow: true,
      pageErrors: 0,
      mutationRequests: 0,
    },
    captures,
    pageErrors,
    mutationRequests,
    limits: [
      'The 14 CSS-pixel threshold and geometric spacing are automated readability proxies; they do not replace human visual judgment or user testing.',
      'Rendered Chromium screenshots and DOM measurements are not screen-reader speech/transcript, physical-device, owner-UAT, cross-browser or hosted-CI evidence.',
      'The chart and table use a local synthetic MSW response; no Backend/provider behavior is established.',
      'UI012.C04 and FE-G05 remain partial because screen-reader output and broad manual review of remaining interaction/error/icon states are still open.',
    ],
  };
  await fs.writeFile(path.join(here, 'S30-marketing-chart-labels.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await demo.close();
}

