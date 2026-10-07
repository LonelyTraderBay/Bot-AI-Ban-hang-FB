import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {startDemoServer} from '../../../tests/session/demo-server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const waitForMain = async page => {
  await page.locator('main#main-content h1').waitFor({state:'visible', timeout:20000});
  await page.locator('main#main-content .MuiLinearProgress-root').waitFor({state:'detached', timeout:20000}).catch(()=>{});
};
const screenshot = async (page, name, state, route) => {
  const file = path.join(here, name);
  await page.screenshot({path:file, fullPage:false});
  const size = (await fs.stat(file)).size;
  return {name, state, route, width:page.viewportSize().width, height:page.viewportSize().height, bytes:size};
};
const demo = await startDemoServer({cacheIsolationKey:'ui012-visual-review-s22'});
let browser;

try {
  browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:1440,height:1000}, deviceScaleFactor:1});
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const captures = [];

  await page.goto(new URL('/s/shop-demo/overview', demo.url).toString(), {waitUntil:'domcontentloaded'});
  await waitForMain(page);
  const action = page.getByRole('link', {name:'Xem việc cần làm', exact:true});
  await action.waitFor({state:'visible'});
  captures.push(await screenshot(page, 'S22-overview-default.png', 'default', 'R04'));

  await action.hover();
  captures.push(await screenshot(page, 'S22-overview-hover.png', 'pointer hover', 'R04'));
  const bounds = await action.boundingBox();
  if (!bounds) throw new Error('Dashboard action has no visible bounds.');
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  captures.push(await screenshot(page, 'S22-overview-pressed.png', 'pointer down before release', 'R04'));
  await page.mouse.up();

  await page.goto(new URL('/s/shop-demo/overview', demo.url).toString(), {waitUntil:'domcontentloaded'});
  await waitForMain(page);
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', {name:'Đến nội dung chính', exact:true});
  await skip.waitFor({state:'attached'});
  await page.keyboard.press('Enter');
  for (let i=0; i<100 && !(await action.evaluate(el => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab');
  }
  const focused = await action.evaluate(el => ({
    focused:el === document.activeElement,
    focusVisible:el.matches(':focus-visible'),
    outline:getComputedStyle(el).outline,
  }));
  if (!focused.focused || !focused.focusVisible) throw new Error('Dashboard action did not reach visible keyboard focus.');
  captures.push(await screenshot(page, 'S22-overview-keyboard-focus.png', 'keyboard focus-visible', 'R04'));

  const accessibleTree = await page.locator('main#main-content').ariaSnapshot();
  await fs.writeFile(path.join(here, 'S22-overview-accessibility-tree.yaml'), `${accessibleTree}\n`, 'utf8');
  const iconOnlyControls = await page.locator('button, [role="button"], a[href]').evaluateAll(elements => elements
    .filter(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    })
    .filter(element => element.querySelector('svg') && !(element.innerText || '').trim())
    .map(element => {
      const ids = (element.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
      const labelledBy = ids.map(id => document.getElementById(id)?.textContent?.trim() || '').filter(Boolean).join(' ');
      const svgTitles = [...element.querySelectorAll('svg title')].map(title => title.textContent?.trim() || '').filter(Boolean).join(' ');
      return {
        tag:element.tagName.toLowerCase(),
        role:element.getAttribute('role'),
        accessibleNameSource:element.getAttribute('aria-label') || labelledBy || element.getAttribute('title') || svgTitles || '',
        ariaLabelledby:element.getAttribute('aria-labelledby'),
        href:element.getAttribute('href'),
      };
    }));

  const errorPage = await browser.newPage({viewport:{width:1440,height:1000}, deviceScaleFactor:1});
  errorPage.on('pageerror', error => pageErrors.push(error.message));
  await errorPage.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      const method = init?.method || (input instanceof Request ? input.method : 'GET');
      if (new URL(url, window.location.href).pathname === '/api/v2/shops/shop-demo/knowledge' && method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({
          type:'about:blank', title:'Dữ liệu chưa hợp lệ', status:422, code:'VALIDATION_ERROR',
          detail:'Nội dung cần được kiểm tra trước khi lưu.', requestId:'ui012-visual-review-422',
          errors:[{path:'content', code:'CONTENT_REVIEW_REQUIRED', message:'Hãy rà soát nội dung nguồn.'}],
        }), {status:422, headers:{'content-type':'application/problem+json'}}));
      }
      return originalFetch(input, init);
    };
  });
  await errorPage.goto(new URL('/s/shop-demo/knowledge', demo.url).toString(), {waitUntil:'domcontentloaded'});
  await waitForMain(errorPage);
  await errorPage.getByRole('button', {name:'Thêm nguồn kiến thức', exact:true}).click();
  const dialog = errorPage.getByRole('dialog', {name:'Nguồn kiến thức mới'});
  await dialog.getByRole('textbox', {name:'Tiêu đề'}).fill('Quy trình đổi hàng đã rà soát');
  await dialog.getByRole('textbox', {name:'Nội dung'}).fill('Nội dung tổng hợp cần xác minh thêm trước khi tạo bản nháp.');
  await dialog.getByRole('button', {name:'Lưu bản nháp', exact:true}).click();
  const errorAlert = dialog.getByRole('alert').filter({hasText:'Nội dung cần được kiểm tra trước khi lưu.'});
  await errorAlert.waitFor({state:'visible'});
  captures.push(await screenshot(errorPage, 'S22-knowledge-synthetic-422.png', 'validation error with synthetic 422', 'R23'));
  const errorSemantics = {
    dialogName:(await dialog.getAttribute('aria-label')) || 'Nguồn kiến thức mới (role-based accessible name)',
    alertVisible:await errorAlert.isVisible(),
    alertText:await errorAlert.innerText(),
    invalidFieldCount:await dialog.locator('[aria-invalid="true"]').count(),
    focusedFieldName:await errorPage.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.getAttribute('name') || document.activeElement?.id || document.activeElement?.tagName || ''),
  };

  const report = {
    date:'2026-10-03',
    scope:'local React demo + synthetic MSW; representative visual-state captures only',
    viewport:'1440x1000 CSS px; Chromium 153; deviceScaleFactor 1',
    architecture:'PRESERVED — no app source, route, permission, API contract, generated source, or design token changed for this review.',
    captures,
    keyboardFocus:focused,
    iconOnlyControls,
    errorSemantics,
    pageErrors,
    reviewLimits:[
      'Screenshots are sampled compositions, not all routes/components/error/hover/pressed/icon states.',
      'The accessibility tree and DOM-derived labels are not screen-reader speech or transcript evidence.',
      'No real backend/provider request or persistent mutation was made; the 422 response is local and synthetic.',
      'FE-G05/UI012.C04 remains PARTIAL until real screen-reader evidence and the plan-required broad manual review are recorded.',
    ],
  };
  await fs.writeFile(path.join(here, 'S22-visual-state-review-capture.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({output:'evidence/frontend-ui-improvements/UI012/S22-visual-state-review-capture.json',captures,keyboardFocus:focused,iconOnlyControls,errorSemantics,pageErrors}, null, 2));
} finally {
  await browser?.close();
  await demo.close();
}
