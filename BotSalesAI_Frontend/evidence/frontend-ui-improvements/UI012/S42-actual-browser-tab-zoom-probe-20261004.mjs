import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startDemoServer } from '../../../tests/session/demo-server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const evidencePath = path.join(here, 'S42-actual-browser-tab-zoom-20261004.json');
const temporaryParent = path.resolve(os.tmpdir());
const temporaryRoot = await mkdtemp(path.join(temporaryParent, 'botsales-ui012-zoom-'));
const extensionPath = path.join(temporaryRoot, 'extension');
const profilePath = path.join(temporaryRoot, 'profile');
const server = await startDemoServer({ cacheIsolationKey: 'ui012-s42-zoom' });
const zoom400Routes = [
  { id: 'R04', path: '/s/shop-demo/overview' },
  { id: 'R05', path: '/s/shop-demo/inbox' },
  { id: 'R07', path: '/s/shop-demo/customers' },
  { id: 'R09', path: '/s/shop-demo/products' },
  { id: 'R15', path: '/s/shop-demo/inventory' },
  { id: 'R17', path: '/s/shop-demo/orders' },
  { id: 'R20', path: '/s/shop-demo/finance' },
  { id: 'R23', path: '/s/shop-demo/knowledge' },
  { id: 'R26', path: '/s/shop-demo/bot' },
  { id: 'R29', path: '/s/shop-demo/integrations/channels' },
  { id: 'R31', path: '/s/shop-demo/reports' },
  { id: 'R37', path: '/s/shop-demo/operations' },
  { id: 'R39', path: '/s/shop-demo/notifications' },
  { id: 'R41', path: '/s/shop-demo/fulfillment' },
  { id: 'R44', path: '/s/shop-demo/suppliers' },
  { id: 'R46', path: '/s/shop-demo/purchases' },
  { id: 'R49', path: '/s/shop-demo/finance/reconciliation' },
];
let context;
const pageErrors = [];
let result = {
  recordedAt: '2026-10-04',
  scope: 'Automated actual Chromium tab zoom using Chrome Tabs API; React demo and local synthetic MSW; no product mutation',
  status: 'FAILED',
  browser: {},
  route: '/s/shop-demo/overview',
  results: [],
  zoom400RouteAudit: [],
  pageErrors,
  limitations: [
    'This is browser-level zoom controlled by an isolated test extension, not a human manual visual or assistive-technology review.',
    'It cannot provide screen-reader speech/transcript or close the full UI012.C04 manual checkpoint.'
  ],
};

try {
  await mkdir(extensionPath, { recursive: true });
  await writeFile(path.join(extensionPath, 'manifest.json'), JSON.stringify({
    manifest_version: 3,
    name: 'BotSales UI012 isolated zoom probe',
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
        const measuredZoomFactor = await chrome.tabs.getZoom(tab.id);
        sendResponse({ ok: true, measuredZoomFactor, tabUrl: tab.url });
      })().catch(error => sendResponse({ ok: false, error: String(error) }));
      return true;
    });
  `);
  await writeFile(path.join(extensionPath, 'popup.html'), `
    <!doctype html><html><body><output id="result"></output><script src="popup.js"></script></body></html>
  `);
  await writeFile(path.join(extensionPath, 'popup.js'), `
    const params = new URLSearchParams(location.search);
    chrome.runtime.sendMessage({
      type: 'set-probe-zoom',
      factor: Number(params.get('factor')),
      target: params.get('target'),
    }).then(result => {
      document.body.dataset.result = JSON.stringify(result);
      document.querySelector('#result').textContent = JSON.stringify(result);
    }).catch(error => {
      document.body.dataset.result = JSON.stringify({ ok: false, error: String(error) });
    });
  `);

  context = await chromium.launchPersistentContext(profilePath, {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 800 },
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  const browser = context.browser();
  result.browser = { name: 'Playwright Chromium', version: browser?.version() ?? 'unknown', headless: true };
  let serviceWorker;
  const serviceWorkerDeadline = Date.now() + 15000;
  while (!serviceWorker && Date.now() < serviceWorkerDeadline) {
    serviceWorker = context.serviceWorkers()[0];
    if (!serviceWorker) await new Promise(resolve => setTimeout(resolve, 200));
  }
  if (!serviceWorker) throw new Error('The isolated zoom extension service worker did not start.');
  const extensionId = new URL(serviceWorker.url()).host;
  const targetUrl = new URL('/s/shop-demo/overview', server.url).toString();
  const targetOrigin = new URL(server.url).origin;
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('main').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('main h1').first().waitFor({ state: 'visible', timeout: 30000 });

  const measure = async () => page.evaluate(() => {
    const main = document.querySelector('main');
    const documentClientWidth = document.documentElement.clientWidth;
    const documentScrollWidth = document.documentElement.scrollWidth;
    const horizontalDocumentOverflow = documentScrollWidth > documentClientWidth + 1;
    const pageHeading = document.querySelector('main h1');
    const headingRect = pageHeading?.getBoundingClientRect();
    const headingTextRange = pageHeading ? document.createRange() : null;
    if (headingTextRange && pageHeading) headingTextRange.selectNodeContents(pageHeading);
    const headingLineRects = headingTextRange ? [...headingTextRange.getClientRects()].map(rect => ({
      left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width),
    })) : [];
    const visibleChildrenBeyondViewport = [...document.querySelectorAll('body *')]
      .filter(element => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none'
          && style.visibility !== 'hidden' && Number(style.opacity) > 0
          && rect.right > documentClientWidth + 1;
      });
    return {
      innerWidth: window.innerWidth,
      outerWidth: window.outerWidth,
      devicePixelRatio: window.devicePixelRatio,
      visualViewportScale: window.visualViewport?.scale ?? null,
      documentClientWidth,
      documentScrollWidth,
      horizontalDocumentOverflow,
      rootFontSize: getComputedStyle(document.documentElement).fontSize,
      mainWidth: main ? Math.round(main.getBoundingClientRect().width) : null,
      mainScrollWidth: main?.scrollWidth ?? null,
      heading: document.querySelector('main h1')?.textContent?.trim() ?? null,
      headingLayout: pageHeading && headingRect ? {
        left: Math.round(headingRect.left),
        right: Math.round(headingRect.right),
        width: Math.round(headingRect.width),
        clientWidth: pageHeading.clientWidth,
        scrollWidth: pageHeading.scrollWidth,
        fontSize: getComputedStyle(pageHeading).fontSize,
        lineRects: headingLineRects,
        textExtendsPastViewport: headingLineRects.some(line => line.right > documentClientWidth + 1),
      } : null,
      visibleChildrenBeyondViewportCount: visibleChildrenBeyondViewport.length,
      offViewportVisibleElementDetails: visibleChildrenBeyondViewport.slice(0, 12).map(element => {
        const rect = element.getBoundingClientRect();
        let scrollAncestor = null;
        for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor);
          if (['auto', 'scroll'].includes(style.overflowX) && ancestor.scrollWidth > ancestor.clientWidth) {
            scrollAncestor = ancestor;
            break;
          }
        }
        return {
          tag: element.tagName.toLowerCase(),
          className: typeof element.className === 'string' ? element.className.slice(0, 100) : '',
          text: element.textContent?.replace(/\\s+/g, ' ').trim().slice(0, 52) ?? '',
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          scrollAncestor: scrollAncestor ? {
            tag: scrollAncestor.tagName.toLowerCase(),
            role: scrollAncestor.getAttribute('role'),
            clientWidth: scrollAncestor.clientWidth,
            scrollWidth: scrollAncestor.scrollWidth,
          } : null,
        };
      }),
      overflowDiagnostics: horizontalDocumentOverflow ? visibleChildrenBeyondViewport
        .filter(element => ![...element.children].some(child => {
          const rect = child.getBoundingClientRect();
          const style = getComputedStyle(child);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none'
            && style.visibility !== 'hidden' && Number(style.opacity) > 0
            && rect.right > documentClientWidth + 1;
        }))
        .slice(0, 6)
        .map(element => {
          const rect = element.getBoundingClientRect();
          const ancestors = [];
          for (let ancestor = element.parentElement, depth = 0; ancestor && depth < 5; ancestor = ancestor.parentElement, depth += 1) {
            const ancestorRect = ancestor.getBoundingClientRect();
            const ancestorStyle = getComputedStyle(ancestor);
            ancestors.push({
              tag: ancestor.tagName.toLowerCase(),
              className: typeof ancestor.className === 'string' ? ancestor.className.slice(0, 140) : '',
              id: ancestor.id || '',
              role: ancestor.getAttribute('role'),
              left: Math.round(ancestorRect.left),
              right: Math.round(ancestorRect.right),
              width: Math.round(ancestorRect.width),
              minWidth: ancestorStyle.minWidth,
              gridTemplateColumns: ancestorStyle.gridTemplateColumns,
              overflowX: ancestorStyle.overflowX,
              text: ancestor.textContent?.replace(/\\s+/g, ' ').trim().slice(0, 70) ?? '',
            });
          }
          return {
            tag: element.tagName.toLowerCase(),
            role: element.getAttribute('role'),
            text: element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 64) ?? '',
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            overflowX: getComputedStyle(element).overflowX,
            ancestors,
          };
        }) : [],
    };
  });

  const applyZoom = async factor => {
    const popup = await context.newPage();
    const query = new URLSearchParams({ factor: String(factor), target: targetOrigin });
    await popup.goto(`chrome-extension://${extensionId}/popup.html?${query}`, { waitUntil: 'load' });
    await popup.waitForFunction(() => Boolean(document.body.dataset.result), { timeout: 15000 });
    const command = JSON.parse(await popup.locator('body').getAttribute('data-result'));
    await popup.close();
    if (!command.ok || Math.abs(command.measuredZoomFactor - factor) > 0.02) {
      throw new Error(`Chrome tab zoom API did not apply ${factor}x: ${JSON.stringify(command)}`);
    }
    await page.waitForFunction(expected => Math.abs(window.devicePixelRatio - expected) < 0.02, factor, { timeout: 15000 });
    await page.waitForTimeout(200);
    return { requestedFactor: factor, measuredBrowserZoomFactor: command.measuredZoomFactor, metrics: await measure() };
  };

  result.results.push({ requestedFactor: 1, measuredBrowserZoomFactor: 1, metrics: await measure() });
  result.results.push(await applyZoom(2));
  result.results.push(await applyZoom(4));
  const screenshot = path.join(here, 'S42-dashboard-400-20261004.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  result.screenshot = path.basename(screenshot);
  for (const route of zoom400Routes) {
    const priorPageErrorCount = pageErrors.length;
    const routeUrl = new URL(route.path, server.url).toString();
    await page.goto(routeUrl, { waitUntil: 'domcontentloaded' });
    await page.locator('main h1').first().waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForFunction(() => Math.abs(window.devicePixelRatio - 4) < 0.02, undefined, { timeout: 15000 });
    const metrics = await measure();
    result.zoom400RouteAudit.push({
      ...route,
      heading: metrics.heading,
      headingLayout: metrics.headingLayout,
      browserZoomFactor: 4,
      viewportCssWidth: metrics.innerWidth,
      documentWidth: metrics.documentClientWidth,
      documentScrollWidth: metrics.documentScrollWidth,
      horizontalDocumentOverflow: metrics.horizontalDocumentOverflow,
      offViewportVisibleElementCount: metrics.visibleChildrenBeyondViewportCount,
      pageErrors: pageErrors.slice(priorPageErrorCount),
      offViewportVisibleElementDetails: route.id === 'R31' ? metrics.offViewportVisibleElementDetails : [],
      overflowDiagnostics: metrics.overflowDiagnostics,
    });
    if (route.id === 'R31') {
      const reportScreenshot = path.join(here, 'S42-reports-400-20261004.png');
      await page.screenshot({ path: reportScreenshot, fullPage: true });
      result.reportScreenshot = path.basename(reportScreenshot);
    }
  }
  result.results.push(await applyZoom(1));
  result.zoom400RouteSummary = {
    routes: result.zoom400RouteAudit.length,
    noDocumentHorizontalOverflow: result.zoom400RouteAudit.filter(route => !route.horizontalDocumentOverflow).length,
    overflowRoutes: result.zoom400RouteAudit.filter(route => route.horizontalDocumentOverflow).map(route => ({ id: route.id, path: route.path, documentScrollWidth: route.documentScrollWidth, viewportCssWidth: route.viewportCssWidth, overflowDiagnostics: route.overflowDiagnostics })),
    noPageErrors: result.zoom400RouteAudit.filter(route => route.pageErrors.length === 0).length,
    allAt400Percent: result.zoom400RouteAudit.every(route => route.browserZoomFactor === 4 && route.viewportCssWidth === 320),
  };
  result.zoom400RouteSummary.layoutAssertionStatus = result.zoom400RouteSummary.noDocumentHorizontalOverflow === zoom400Routes.length
    && result.zoom400RouteSummary.noPageErrors === zoom400Routes.length
    && result.zoom400RouteSummary.allAt400Percent ? 'PASS' : 'FAIL';
  result.status = 'PROBE_COMPLETE';
  result.interpretation = 'Chrome Tabs API reported each browser zoom factor and the page devicePixelRatio/layout metrics were sampled at 100%, 200%, 400% and reset. This automated evidence supplements but does not replace the manual/screen-reader review.';
} catch (error) {
  result.error = error instanceof Error ? error.stack ?? error.message : String(error);
} finally {
  if (context) await context.close().catch(() => {});
  await server.close().catch(() => {});
  const resolvedTemp = path.resolve(temporaryRoot);
  if (path.dirname(resolvedTemp) !== temporaryParent || !path.basename(resolvedTemp).startsWith('botsales-ui012-zoom-')) {
    throw new Error(`Refusing to remove unexpected temporary path: ${resolvedTemp}`);
  }
  await rm(resolvedTemp, { recursive: true, force: true });
  await writeFile(evidencePath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PROBE_COMPLETE' || result.zoom400RouteSummary?.layoutAssertionStatus !== 'PASS') process.exitCode = 1;
