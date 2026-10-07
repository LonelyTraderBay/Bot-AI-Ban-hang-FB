import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startDemoServer } from '../../../tests/session/demo-server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'botsales-kit/contracts/route-manifest.json'), 'utf8'));
const routes = Array.isArray(manifest.routes) ? manifest.routes : manifest;
const record = routes.find(route => route.path === '/s/:shopId/inbox/:conversationId');
if (!record) throw new Error('Canonical Inbox detail route is missing.');

const demo = await startDemoServer({ cacheIsolationKey: 'ui012-inbox-action-review-s27' });
let browser;

try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const pageErrors = [];
  const mutationRequests = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      mutationRequests.push({ method: request.method(), path: new URL(request.url()).pathname });
    }
  });

  const routePath = record.path.replace(':shopId', 'shop-demo').replace(':conversationId', 'cv1');
  await page.goto(new URL(routePath, demo.url).toString(), { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Hộp thư khách hàng', exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
  await page.locator('main#main-content .MuiLinearProgress-root').waitFor({ state: 'detached', timeout: 20_000 }).catch(() => {});
  await page.getByTestId('inbox-message-list').getByText(/./).first().waitFor({ state: 'visible' });

  const waitForAnimations = async () => {
    await page.waitForFunction(() => document.getAnimations().every(animation => animation.playState !== 'running'), null, { timeout: 5_000 });
  };

  const actions = page.getByRole('button', { name: /^Đánh giá tin nhắn/ });
  const actionCount = await actions.count();
  const messageContexts = await actions.evaluateAll(elements => elements.map(button => {
    const row = button.parentElement;
    const message = row?.parentElement;
    return {
      accessibleLabel: button.getAttribute('aria-label') || button.innerText.trim(),
      contextText: (message?.innerText || row?.innerText || '').replace(/\s+/g, ' ').trim(),
    };
  }));
  const listSnapshot = await page.getByTestId('inbox-message-list').ariaSnapshot();

  const messageListScreenshot = path.join(here, 'S27-inbox-message-action-context.png');
  await page.screenshot({ path: messageListScreenshot, fullPage: false });

  let dialog = null;
  let focusOnDialogOpen = '';
  let focusReturnedAfterClose = false;
  let dialogVisualState = null;
  if (actionCount > 0) {
    await actions.first().click();
    const ratingDialog = page.getByRole('dialog', { name: /Đánh giá câu trả lời/ });
    await ratingDialog.waitFor({ state: 'visible' });
    await waitForAnimations();
    dialogVisualState = await ratingDialog.evaluate(element => {
      const style = getComputedStyle(element);
      return { opacity: style.opacity, visibility: style.visibility };
    });
    if (Number(dialogVisualState.opacity) < 0.99 || dialogVisualState.visibility !== 'visible') {
      throw new Error(`Rating dialog was not visually settled before capture: ${JSON.stringify(dialogVisualState)}`);
    }
    dialog = await ratingDialog.ariaSnapshot();
    focusOnDialogOpen = await page.evaluate(() => {
      const active = document.activeElement;
      const labelledBy = active?.getAttribute('aria-labelledby')?.split(/\s+/).map(id => document.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ');
      return active?.getAttribute('aria-label') || active?.getAttribute('name') || labelledBy || active?.textContent?.trim() || active?.tagName || '';
    });
    const dialogScreenshot = path.join(here, 'S27-inbox-rating-dialog.png');
    await page.screenshot({ path: dialogScreenshot, fullPage: false });
    await page.keyboard.press('Escape');
    await ratingDialog.waitFor({ state: 'detached' });
    focusReturnedAfterClose = await actions.first().evaluate(element => element === document.activeElement);
  }

  const report = {
    date: '2026-10-03',
    item: 'UI012 / FE-G05',
    scope: 'bounded browser-visible review of repeated message-feedback actions and dialog focus on the Inbox detail route',
    environment: 'Chromium 153; 1440x1000 CSS px; deviceScaleFactor 1; local React demo + synthetic MSW',
    route: { id: record.id, path: routePath, module: record.module },
    observation: {
      messageFeedbackButtonCount: actionCount,
      uniqueAccessibleNames: [...new Set(messageContexts.map(item => item.accessibleLabel))],
      messageContexts,
      repeatedAccessibleName: actionCount > 1 && new Set(messageContexts.map(item => item.accessibleLabel)).size === 1,
      messageListAccessibilitySnapshot: listSnapshot,
      ratingDialogSnapshot: dialog,
      ratingDialogVisualState: dialogVisualState,
      focusOnDialogOpen,
      focusReturnedAfterClose,
    },
    pageErrors,
    mutationRequests,
    screenshots: ['S27-inbox-message-action-context.png', ...(dialog ? ['S27-inbox-rating-dialog.png'] : [])],
    limits: [
      'DOM-derived names and Playwright accessibility snapshots are not screen-reader speech or transcript evidence.',
      'This is one Inbox detail conversation with synthetic data; it does not represent all message or permission states.',
      'No message feedback was submitted and no Backend/provider or persistent data was used.',
    ],
    architecture: 'PRESERVED — this probe changes no React source, module boundary, contract, route, permission, token or generated output.',
  };
  await fs.writeFile(path.join(here, 'S27-inbox-message-action-review.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ output: 'S27-inbox-message-action-review.json', ...report.observation, pageErrors, mutationRequests }, null, 2));
} finally {
  await browser?.close();
  await demo.close();
}
