import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {startDemoServer} from '../../../tests/session/demo-server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'botsales-kit/contracts/route-manifest.json'), 'utf8'));
const routes = Array.isArray(manifest.routes) ? manifest.routes : manifest;
const route = path => {
  const record = routes.find(item => item.path === path);
  if (!record) throw new Error(`Canonical route is missing: ${path}`);
  return record;
};
const entryRoute = route('/s/:shopId/finance/entries');
const reconcileRoute = route('/s/:shopId/finance/reconciliation');
const demo = await startDemoServer({cacheIsolationKey:'ui012-manual-states-s24'});
let browser;

try {
  browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:1440,height:1000}, deviceScaleFactor:1});
  const pageErrors = [];
  const mutations = [];
  const captures = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) mutations.push({method:request.method(),url:new URL(request.url()).pathname});
  });
  const waitForMain = async () => {
    await page.locator('main#main-content h1').waitFor({state:'visible', timeout:20000});
    await page.locator('main#main-content .MuiLinearProgress-root').waitFor({state:'detached', timeout:20000}).catch(()=>{});
  };
  const waitForAnimations = async () => {
    await page.waitForFunction(() => document.getAnimations().every(animation => animation.playState !== 'running'), null, {timeout:5000});
  };
  const capture = async (name, state, routeId) => {
    await waitForAnimations();
    const file = path.join(here, name);
    await page.screenshot({path:file, fullPage:false});
    captures.push({name, state, routeId, width:1440, height:1000, bytes:(await fs.stat(file)).size});
  };

  await page.goto(new URL(entryRoute.path.replace(':shopId', 'shop-demo'), demo.url).toString(), {waitUntil:'domcontentloaded'});
  await waitForMain();
  await page.getByRole('button', {name:'Tạo phiếu', exact:true}).click();
  const kind = page.getByRole('combobox', {name:'Loại phiếu'});
  await kind.click();
  const listbox = page.getByRole('listbox');
  await listbox.waitFor({state:'visible'});
  await waitForAnimations();
  const menuOptions = await listbox.getByRole('option').allTextContents();
  const activeOption = await listbox.getByRole('option', {selected:true}).allTextContents();
  await capture('S24-finance-entry-kind-options.png', 'visible combobox options', entryRoute.id);
  await page.keyboard.press('Escape');
  const focusedAfterClose = await kind.evaluate(element => element === document.activeElement);
  await page.getByRole('textbox', {name:'Số tiền (VND)'}).fill('1250');
  await page.getByRole('button', {name:'Hủy', exact:true}).click();
  await page.getByRole('dialog', {name:'Rời biểu mẫu chưa lưu?'}).getByRole('button', {name:'Bỏ thay đổi', exact:true}).click();
  await page.getByRole('dialog', {name:'Phiếu thu chi mới'}).waitFor({state:'detached'});

  await page.goto(new URL(reconcileRoute.path.replace(':shopId', 'shop-demo'), demo.url).toString(), {waitUntil:'domcontentloaded'});
  await waitForMain();
  const importTrigger = page.getByRole('button', {name:'Nhập bảng đối soát', exact:true});
  await importTrigger.click();
  const importDialog = page.getByRole('dialog', {name:'Nhập bảng đối soát'});
  await importDialog.waitFor({state:'visible'});
  await waitForAnimations();
  await capture('S24-reconciliation-import-empty.png', 'import dialog before file selection', reconcileRoute.id);

  const chooserPromise = page.waitForEvent('filechooser');
  await importDialog.getByRole('button', {name:'Chọn CSV', exact:true}).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({name:'ui012-s24-synthetic.csv', mimeType:'text/csv', buffer:Buffer.from('transaction_id,amount\nS24-SYNTHETIC,100')});
  const selectedFile = await importDialog.getByRole('button', {name:'ui012-s24-synthetic.csv', exact:true}).isVisible();
  await capture('S24-reconciliation-import-selected.png', 'synthetic file selected locally; not uploaded', reconcileRoute.id);
  await importDialog.getByRole('button', {name:'Hủy', exact:true}).click();
  const discard = page.getByRole('dialog', {name:'Rời biểu mẫu chưa lưu?'});
  await discard.waitFor({state:'visible'});
  await waitForAnimations();
  await capture('S24-reconciliation-import-discard.png', 'confirm discard after file selection', reconcileRoute.id);
  await discard.getByRole('button', {name:'Bỏ thay đổi', exact:true}).click();
  await importDialog.waitFor({state:'detached'});
  const focusReturned = await importTrigger.evaluate(element => element === document.activeElement);
  if (pageErrors.length) throw new Error(`Unexpected page errors: ${pageErrors.join('; ')}`);
  if (!focusedAfterClose || !selectedFile || !focusReturned || mutations.length) throw new Error('A focus, selected-file, focus-return, or no-mutation assertion failed.');

  const report = {
    date:'2026-10-03',
    scope:'bounded visual review of shared MUI select and reconciliation import/discard states on the local React demo + synthetic MSW',
    environment:'Chromium 153; 1440x1000 CSS px; deviceScaleFactor 1; synthetic data only',
    routes:[{id:entryRoute.id, path:entryRoute.path, module:entryRoute.module},{id:reconcileRoute.id,path:reconcileRoute.path,module:reconcileRoute.module}],
    captures,
    observations:{menuOptions,activeOption,focusAfterMenuEscape:focusedAfterClose,syntheticFileVisible:selectedFile,focusReturnedToImportTrigger:focusReturned,mutations,pageErrors},
    limits:[
      'The file is selected by Playwright in a local synthetic demo; the operating-system file chooser and assistive-technology speech were not observed.',
      'This review covers only one MUI select and one reconciliation import/discard flow; it does not close the plan-required broad manual review or FE-G05.',
      'Route IDs are resolved from the canonical route manifest to prevent metadata drift.',
    ],
    architecture:'PRESERVED — no app source, module boundary, route, contract, permission, token, or generated file changed.',
  };
  await fs.writeFile(path.join(here,'S24-select-and-import-review.json'), `${JSON.stringify(report,null,2)}\n`, 'utf8');
  console.log(JSON.stringify(report,null,2));
} finally {
  await browser?.close();
  await demo.close();
}
