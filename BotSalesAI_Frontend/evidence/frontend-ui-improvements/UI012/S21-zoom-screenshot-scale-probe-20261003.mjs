import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startDemoServer } from '../../../tests/session/demo-server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const temporaryParent = path.resolve(os.tmpdir());
const temporaryRoot = await mkdtemp(path.join(temporaryParent, 'botsales-ui012-s21-'));
const extensionPath = path.join(temporaryRoot, 'extension');
const profilePath = path.join(temporaryRoot, 'profile');
const resultPath = path.join(here, 'S21-zoom-screenshot-scale-20261003.json');
const server = await startDemoServer({ cacheIsolationKey: 'ui012-s21-screenshot-scale' });
let context;
const result = { recordedAt: '2026-10-03', scope: 'Compare Playwright CSS/device screenshots with Chromium CDP raster capture under measured 400% Chrome tab zoom on the React demo with synthetic MSW.', status: 'FAILED', routes: [] };

try {
  await mkdir(extensionPath, { recursive: true });
  await writeFile(path.join(extensionPath, 'manifest.json'), JSON.stringify({
    manifest_version: 3,
    name: 'BotSales UI012 screenshot scale probe',
    version: '1.0.0',
    permissions: ['tabs'],
    host_permissions: ['http://127.0.0.1/*'],
    background: { service_worker: 'service-worker.js' },
  }, null, 2));
  await writeFile(path.join(extensionPath, 'service-worker.js'), `
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type !== 'set-probe-zoom') return;
      (async () => {
        const tabs = await chrome.tabs.query({ url: 'http://127.0.0.1/*' });
        const tab = tabs.find(candidate => candidate.url?.startsWith(message.target));
        if (!tab?.id) throw new Error('Could not identify the isolated React demo tab.');
        await chrome.tabs.setZoomSettings(tab.id, { mode: 'automatic', scope: 'per-origin' });
        await chrome.tabs.setZoom(tab.id, message.factor);
        sendResponse({ ok: true, measuredZoomFactor: await chrome.tabs.getZoom(tab.id) });
      })().catch(error => sendResponse({ ok: false, error: String(error) }));
      return true;
    });
  `);
  await writeFile(path.join(extensionPath, 'popup.html'), '<!doctype html><html><body><output id="result"></output><script src="popup.js"></script></body></html>');
  await writeFile(path.join(extensionPath, 'popup.js'), `
    const params = new URLSearchParams(location.search);
    chrome.runtime.sendMessage({ type: 'set-probe-zoom', factor: Number(params.get('factor')), target: params.get('target') })
      .then(result => { document.body.dataset.result = JSON.stringify(result); document.querySelector('#result').textContent = JSON.stringify(result); });
  `);
  context = await chromium.launchPersistentContext(profilePath, {
    channel: 'chromium', headless: true, viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  let worker;
  const workerDeadline = Date.now() + 15000;
  while (!worker && Date.now() < workerDeadline) {
    worker = context.serviceWorkers()[0];
    if (!worker) await new Promise(resolve => setTimeout(resolve, 200));
  }
  if (!worker) throw new Error('The isolated zoom extension service worker did not start.');
  const extensionId = new URL(worker.url()).host;
  const origin = new URL(server.url).origin;
  const page = await context.newPage();
  for (const route of [
    { id: 'R31', path: '/s/shop-demo/reports' },
    { id: 'R26', path: '/s/shop-demo/bot' },
  ]) {
    await page.goto(new URL(route.path, server.url).toString(), { waitUntil: 'domcontentloaded' });
    await page.locator('main h1').first().waitFor({ state: 'visible', timeout: 30000 });
    const popup = await context.newPage();
    const query = new URLSearchParams({ factor: '4', target: origin });
    await popup.goto(`chrome-extension://${extensionId}/popup.html?${query}`, { waitUntil: 'load' });
    await popup.waitForFunction(() => Boolean(document.body.dataset.result), { timeout: 15000 });
    const zoom = JSON.parse(await popup.locator('body').getAttribute('data-result'));
    await popup.close();
    if (!zoom.ok || Math.abs(zoom.measuredZoomFactor - 4) > 0.02) throw new Error(`Expected measured 4x zoom: ${JSON.stringify(zoom)}`);
    await page.waitForFunction(() => Math.abs(window.devicePixelRatio - 4) < 0.02, undefined, { timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    const metrics = await page.evaluate(() => {
      const heading = document.querySelector('main h1');
      const rect = heading.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(heading);
      return {
        measuredZoom: 4,
        innerWidth: window.innerWidth,
        devicePixelRatio: window.devicePixelRatio,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        heading: heading.textContent?.trim(),
        headingFontSize: getComputedStyle(heading).fontSize,
        headingRect: { left: rect.left, right: rect.right, width: rect.width },
        textRects: [...range.getClientRects()].map(r => ({ left: r.left, right: r.right, width: r.width })),
      };
    });
    const screenshots = [];
    for (const scale of ['css', 'device']) {
      const name = `S21-${route.id}-400-${scale}-20261003.png`;
      const target = path.join(here, name);
      const bytes = await page.screenshot({ path: target, fullPage: true, scale });
      screenshots.push({ name, scale, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes: bytes.length });
    }
    const cdp = await context.newCDPSession(page);
    await cdp.send('Page.enable');
    const { contentSize } = await cdp.send('Page.getLayoutMetrics');
    const capture = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: contentSize.width, height: contentSize.height, scale: 1 },
    });
    const cdpBytes = Buffer.from(capture.data, 'base64');
    const cdpName = `S21-${route.id}-400-cdp-device-surface-20261003.png`;
    await writeFile(path.join(here, cdpName), cdpBytes);
    screenshots.push({ name: cdpName, scale: 'cdp-device-surface', width: cdpBytes.readUInt32BE(16), height: cdpBytes.readUInt32BE(20), bytes: cdpBytes.length, cdpContentSize: contentSize, cssViewport: { width: metrics.innerWidth, height: metrics.scrollHeight }, devicePixelRatio: metrics.devicePixelRatio });
    await cdp.detach();
    result.routes.push({ ...route, zoom, metrics, screenshots });
  }
  result.status = 'PROBE_COMPLETE';
} catch (error) {
  result.error = error instanceof Error ? error.stack ?? error.message : String(error);
} finally {
  if (context) await context.close().catch(() => {});
  await server.close().catch(() => {});
  const resolvedTemp = path.resolve(temporaryRoot);
  if (path.dirname(resolvedTemp) !== temporaryParent || !path.basename(resolvedTemp).startsWith('botsales-ui012-s21-')) {
    throw new Error(`Refusing to remove unexpected temporary path: ${resolvedTemp}`);
  }
  await rm(resolvedTemp, { recursive: true, force: true });
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PROBE_COMPLETE') process.exitCode = 1;
