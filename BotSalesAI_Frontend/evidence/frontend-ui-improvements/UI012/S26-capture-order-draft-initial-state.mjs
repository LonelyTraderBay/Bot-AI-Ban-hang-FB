import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {startDemoServer} from '../../../tests/session/demo-server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const manifest = JSON.parse(await fs.readFile(path.join(root,'botsales-kit/contracts/route-manifest.json'),'utf8'));
const routes = Array.isArray(manifest.routes) ? manifest.routes : manifest;
const route = routes.find(item=>item.id==='R18');
if (!route) throw new Error('Canonical R18 Orders route is missing.');
const demo = await startDemoServer({cacheIsolationKey:'ui012-order-draft-initial-s26'});
let browser;

try {
  browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  const pageErrors = [];
  const mutationRequests = [];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('request',request=>{
    if (!['GET','HEAD','OPTIONS'].includes(request.method())) mutationRequests.push({method:request.method(),path:new URL(request.url()).pathname});
  });
  const routePath = route.path.replace(':shopId','shop-demo');
  await page.goto(new URL(routePath,demo.url).toString(),{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'Tạo đơn hàng',exact:true}).waitFor({state:'visible',timeout:20000});
  const field = page.getByRole('combobox',{name:'Khách hàng'});
  await field.waitFor({state:'visible'});
  await page.getByText('Chọn khách hàng để lưu đơn nháp.',{exact:true}).waitFor({state:'visible'});
  const observation = await field.evaluate(element=>{
    const helperId=element.getAttribute('aria-describedby');
    const helper=helperId?document.getElementById(helperId):null;
    const labelId=element.getAttribute('aria-labelledby')?.split(/\s+/)[0];
    const label=labelId?document.getElementById(labelId):null;
    return {
      role:element.getAttribute('role'),
      ariaRequired:element.getAttribute('aria-required'),
      ariaInvalid:element.getAttribute('aria-invalid'),
      hasMuiError:element.classList.contains('Mui-error'),
      label:label?.innerText?.trim()||'',
      requiredMarkerVisible:Boolean(label?.querySelector('.MuiInputLabel-asterisk')),
      helperText:helper?.innerText?.trim()||'',
      helperAssociated:!!helper&&helper.id===helperId,
    };
  });
  const saveDisabled=await page.getByRole('button',{name:'Lưu đơn nháp',exact:true}).isDisabled();
  const screenshot='S26-order-draft-initial-customer-required.png';
  const screenshotPath=path.join(here,screenshot);
  await page.screenshot({path:screenshotPath,fullPage:false});
  if (observation.ariaRequired!=='true'||observation.ariaInvalid==='true'||observation.hasMuiError||!observation.requiredMarkerVisible||!observation.helperAssociated||!saveDisabled||pageErrors.length||mutationRequests.length) {
    throw new Error(`UI012 initial-state assertion failed: ${JSON.stringify({observation,saveDisabled,pageErrors,mutationRequests})}`);
  }
  const report={
    date:'2026-10-03',
    item:'UI012 / FE-G05',
    scope:'initial state of the canonical new-order draft, React demo + synthetic MSW',
    route:{id:route.id,path:routePath,module:route.module},
    environment:'Chromium 153; 1440x1000 CSS px; deviceScaleFactor 1',
    observation,
    saveDisabled,
    pageErrors,
    mutationRequests,
    screenshot:{name:screenshot,width:1440,height:1000,bytes:(await fs.stat(screenshotPath)).size},
    pairedAssessment:{ui:'PASS — an untouched required customer is exposed as required with helpful text and is not marked invalid.',architecture:'PRESERVED — validation and field ownership remain within the Orders feature; no shared module, API, route, permission, contract, token, or generated output changed.'},
    limits:[
      'The probe covers only the initial create-order form state and does not provide screen-reader speech/transcript evidence.',
      'This local demo observation is not owner UAT, Backend validation, or evidence about persistent writes.',
    ],
  };
  await fs.writeFile(path.join(here,'S26-order-draft-initial-state.json'),`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify(report,null,2));
} finally {
  await browser?.close();
  await demo.close();
}
