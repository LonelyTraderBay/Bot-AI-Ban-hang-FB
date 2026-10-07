import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium } from '@playwright/test';
import { performance } from 'node:perf_hooks';

const appRoot = process.cwd();
const artifactRoot = path.resolve(appRoot, process.argv[2] || 'dist-demo');
const artifactLabel = process.argv[3] || 'UI027-current';
if (!fs.existsSync(path.join(artifactRoot, 'index.html'))) {
  throw new Error(`Built artifact is missing index.html: ${artifactRoot}`);
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }

  let file = path.resolve(artifactRoot, `.${pathname}`);
  if (!file.startsWith(`${artifactRoot}${path.sep}`) && file !== artifactRoot) {
    response.writeHead(403).end();
    return;
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(artifactRoot, 'index.html');

  let body = fs.readFileSync(file);
  const extension = path.extname(file);
  const headers = { 'Content-Type': mimeTypes[extension] || 'application/octet-stream', 'Cache-Control': 'no-store' };
  if (['.html', '.js', '.css', '.json', '.webmanifest'].includes(extension)
      && String(request.headers['accept-encoding'] || '').includes('gzip')) {
    body = zlib.gzipSync(body, { level: 6 });
    headers['Content-Encoding'] = 'gzip';
    headers.Vary = 'Accept-Encoding';
  }
  headers['Content-Length'] = String(body.length);
  response.writeHead(200, headers);
  response.end(body);
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const samples = [];
let warmup;

async function run(label) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'allow' });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const jsContentEncodings = [];
  page.on('response', async response => {
    try {
      if (new URL(response.url()).pathname.endsWith('.js')) {
        jsContentEncodings.push(await response.headerValue('content-encoding'));
      }
    } catch {
      // Ignore responses canceled while a page closes.
    }
  });

  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 200_000,
    uploadThroughput: 93_750,
    connectionType: 'cellular3g',
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  const routeStartedAt = performance.now();
  await page.goto(`${baseUrl}/s/shop-demo/overview`, { waitUntil: 'load', timeout: 90_000 });
  await page.getByText('Dữ liệu mô phỏng', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  await page.locator('main h1').first().waitFor({ state: 'visible' });
  const routeReadyMs = Number((performance.now() - routeStartedAt).toFixed(1));
  const browserMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const scripts = performance.getEntriesByType('resource')
      .filter(resource => new URL(resource.name).pathname.endsWith('.js'));
    return {
      domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
      loadEventMs: Math.round(navigation.loadEventEnd),
      scriptCount: scripts.length,
      scriptTransferBytes: scripts.reduce((total, resource) => total + resource.transferSize, 0),
      scriptDurationMs: Math.round(scripts.reduce((total, resource) => total + resource.duration, 0)),
    };
  });

  await page.getByRole('combobox', { name: 'Dataset mô phỏng' }).click();
  await page.getByRole('option', { name: '1.000 khách hàng tổng hợp' }).click();
  await page.getByRole('status')
    .filter({ hasText: 'Đã tải 1.000 khách hàng tổng hợp vào API mô phỏng.' })
    .waitFor({ state: 'visible', timeout: 15_000 });

  const listStartedAt = performance.now();
  const customersResponsePromise = page.waitForResponse(response =>
    new URL(response.url()).pathname.startsWith('/api/v2/shops/shop-demo/customers'),
  { timeout: 30_000 });
  await page.getByRole('link', { name: 'Khách hàng', exact: true }).click();
  const customersResponse = await customersResponsePromise;
  await page.getByRole('table').getByRole('row').nth(20).waitFor({ state: 'visible', timeout: 30_000 });
  const result = {
    label,
    routeReadyMs,
    ...browserMetrics,
    listReadyMs: Number((performance.now() - listStartedAt).toFixed(1)),
    apiStatus: customersResponse.status(),
    renderedRowsIncludingHeader: await page.getByRole('table').getByRole('row').count(),
    jsContentEncodings: [...new Set(jsContentEncodings)],
  };
  await context.close();
  return result;
}

try {
  warmup = await run('warmup');
  for (let index = 1; index <= 5; index += 1) samples.push(await run(`sample-${index}`));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

const routeTimes = samples.map(sample => sample.routeReadyMs).sort((a, b) => a - b);
const listTimes = samples.map(sample => sample.listReadyMs).sort((a, b) => a - b);
console.log(JSON.stringify({
  method: {
    artifact: artifactLabel,
    artifactRoot,
    server: 'local static Node server; gzip level 6 for HTML/JS/CSS/JSON',
    browser: `Chromium ${browser.version()} via Playwright`,
    viewport: '1280x720',
    cache: 'new context per sample; HTTP cache disabled',
    cpu: 'CDP 4x throttle',
    network: 'CDP 150ms RTT; 1.6 Mbit/s down; 0.75 Mbit/s up',
    dataset: 'synthetic 1,004 customers; API page size 20',
    warmupCount: 1,
    sampleCount: samples.length,
  },
  warmup,
  samples,
  summary: {
    routeReadyMedianMs: routeTimes[2],
    routeReadyMinMs: routeTimes[0],
    routeReadyMaxMs: routeTimes.at(-1),
    listReadyMedianMs: listTimes[2],
    listReadyMinMs: listTimes[0],
    listReadyMaxMs: listTimes.at(-1),
  },
}, null, 2));
