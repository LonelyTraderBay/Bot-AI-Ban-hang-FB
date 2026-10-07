import fs from 'node:fs';
import { chromium } from '@playwright/test';
import { startDemoServer } from '../../tests/session/demo-server.mjs';
const server = await startDemoServer();
const browser = await chromium.launch({ headless: true });
const output = { scope: 'LOCAL_REACT_DEV_WITH_SYNTHETIC_MSW_ONLY', fixtureMethod: 'Populate schema-shaped synthetic rows in the demo in-memory store; HTTP responses pass the existing runtime schema validators. No source or persistent data changed.', browser: browser.version(), probes: [] };
const folder = 'evidence/frontend-ui-reaudit-20261002';
const only=process.env.BOTSALES_PROBE_ONLY;
if(only&&fs.existsSync(folder+'/browser-probes.json')) {
  fs.copyFileSync(folder+'/browser-probes.json',folder+'/browser-probes-before-'+only.toLowerCase()+'.json');
  output.probes=JSON.parse(fs.readFileSync(folder+'/browser-probes.json','utf8')).probes;
}
async function workspace() {
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  await page.goto(server.url+'/workspaces');
  await page.getByRole('heading',{name:'Chọn cửa hàng',exact:true}).waitFor();
  await page.locator('a[href="/s/shop-demo/overview"]').waitFor();
  return {context,page};
}
async function enter(page) {
  await page.locator('a[href="/s/shop-demo/overview"]').click();
  await page.getByText('cửa hàng của bạn hôm nay.',{exact:true}).waitFor();
}
async function nav(page,suffix) {
  await page.locator(`nav a[href="/s/shop-demo/${suffix}"]`).click();
}
async function api(page,url) { return page.evaluate(async u=>{const r=await fetch(u);return {status:r.status,body:await r.json()};},url); }
try {
  if(!only||only==='PAGINATION_EVALUATIONS') {
    const {context,page}=await workspace();
    const seed=await page.evaluate(async()=>{
      const {db}=await import('/src/mocks/database.ts');
      const sample={id:'audit-eval-template',shopId:'shop-demo',version:1,createdAt:'2026-09-29T14:00:00Z',updatedAt:'2026-09-29T14:00:00Z',configRevision:1,datasetVersion:'audit-dataset',status:'passed',totalCases:1,passedCases:1,criticalFailures:0,reportJobId:null};
      db.evaluations=db.evaluations.filter(x=>x.shopId!=='shop-demo').concat(Array.from({length:25},(_,i)=>({...structuredClone(sample),id:`audit-eval-${i+1}`,datasetVersion:`audit-dataset-${i+1}`})));
      return {count:25};
    });
    await enter(page); await nav(page,'bot/evaluations');
    await page.getByRole('heading',{name:'Đánh giá AI',exact:true}).waitFor();
    await page.getByRole('table').locator('tbody tr').nth(19).waitFor();
    const response=await api(page,'/api/v2/shops/shop-demo/bot/evaluations?limit=20');
    const result={id:'PAGINATION_EVALUATIONS',seed,...response,renderedDataRows:await page.getByRole('table').locator('tbody tr').count(),nextPageControls:await page.getByRole('button',{name:'Trang tiếp',exact:true}).count(),loadMoreControls:await page.getByRole('button',{name:/Tải thêm/}).count()};
    result.reproduced=result.body.page.hasMore===true&&result.renderedDataRows===20&&result.nextPageControls===0&&result.loadMoreControls===0;
    output.probes.push(result);await page.screenshot({path:folder+'/evaluations-25-records.png',fullPage:true});await context.close();
  }
  if(!only||only==='SHOP_TIMEZONE_CASHFLOW') {
    const {context,page}=await workspace();
    await page.evaluate(async()=>{const {db}=await import('/src/mocks/database.ts');db.shops.find(x=>x.id==='shop-demo').timezone='UTC';});
    await enter(page);await nav(page,'finance');
    await page.getByRole('heading',{name:'Dòng tiền',exact:true}).waitFor();
    await page.getByText('Kỳ báo cáo',{exact:true}).waitFor();
    const from=await page.getByLabel('Từ ngày',{exact:true}).inputValue();
    const to=await page.getByLabel('Đến trước ngày',{exact:true}).inputValue();
    const response=await api(page,`/api/v2/shops/shop-demo/finance/cashflow?from=${from}T00%3A00%3A00.000Z&to=${to}T00%3A00%3A00.000Z&timezone=UTC`);
    const mainText=await page.locator('main').innerText();
    const result={id:'SHOP_TIMEZONE_CASHFLOW',shopTimezone:'UTC',response,renderedPeriodText:mainText.slice(mainText.indexOf('Kỳ báo cáo'))};
    result.reproduced=result.response.status===200&&result.renderedPeriodText.includes('07:00');
    output.probes.push(result);await page.screenshot({path:folder+'/cashflow-utc-shop.png',fullPage:true});await context.close();
  }
  if(!only||only==='CHANNELS_EMPTY_COMPOSITION') {
    const {context,page}=await workspace();
    await page.evaluate(async()=>{const {db}=await import('/src/mocks/database.ts');db.channels=db.channels.filter(x=>x.shopId!=='shop-demo');});
    await enter(page);await nav(page,'integrations/channels');
    await page.getByRole('heading',{name:'Kết nối Facebook',exact:true}).waitFor();
    const response=await api(page,'/api/v2/shops/shop-demo/integrations/channels?limit=20');
    await page.waitForTimeout(250);
    const mainText=await page.locator('main').innerText();
    const result={id:'CHANNELS_EMPTY_COMPOSITION',response,mainText,emptyStatusControls:await page.locator('main [role="status"]').count()};
    result.reproduced=result.response.status===200&&result.response.body.data.length===0&&result.emptyStatusControls===0;
    output.probes.push(result);await page.screenshot({path:folder+'/channels-empty.png',fullPage:true});await context.close();
  }
  if(!only||only==='RECONCILIATION_SHARED_CURSOR') {
    const {context,page}=await workspace();
    const seed=await page.evaluate(async()=>{const {db}=await import('/src/mocks/database.ts');const base={shopId:'shop-demo',version:1,createdAt:'2026-09-29T14:00:00Z',updatedAt:'2026-09-29T14:00:00Z'};const sample={...base,id:'audit-bank-template',accountId:'audit-bank-account',externalTransactionId:'audit-transaction',amount:{amount:'100000',currency:'VND'},direction:'credit',occurredAt:base.createdAt,referenceText:'Synthetic audit only',matchState:'unmatched'};db.bankTransactions=db.bankTransactions.filter(x=>x.shopId!=='shop-demo').concat(Array.from({length:25},(_,i)=>({...structuredClone(sample),id:`audit-bank-${i+1}`,externalTransactionId:`audit-bank-external-${i+1}`})));db.codSettlements.push({...base,id:'audit-cod-1',carrierId:'audit-carrier',externalBatchId:'audit-cod-batch',orderIds:[],grossDue:{amount:'100000',currency:'VND'},actualFees:{amount:'0',currency:'VND'},bankReceived:{amount:'0',currency:'VND'},difference:{amount:'100000',currency:'VND'},status:'pending',bankTransactionId:null});return {bankCount:25,codCount:db.codSettlements.filter(x=>x.shopId==='shop-demo').length};});
    await enter(page);await nav(page,'finance/reconciliation');
    await page.getByRole('heading',{name:'Đối soát ngân hàng & COD',exact:true}).waitFor();
    await page.getByRole('table').locator('tbody tr').nth(19).waitFor();
    await page.getByRole('button',{name:'Trang tiếp',exact:true}).click();
    await page.waitForURL(/cursor=/);
    await page.getByRole('tab',{name:'COD',exact:true}).click();
    const cursor=new URL(page.url()).searchParams.get('cursor');
    const firstPage=await api(page,'/api/v2/shops/shop-demo/cod-settlements?limit=20');
    const afterBankPage=await api(page,'/api/v2/shops/shop-demo/cod-settlements?limit=20&cursor='+encodeURIComponent(cursor));
    await page.waitForTimeout(300);
    const result={id:'RECONCILIATION_SHARED_CURSOR',seed,cursor,firstPage,afterBankPage,mainText:await page.locator('main').innerText()};
    result.reproduced=firstPage.status===200&&firstPage.body.data.length>0&&(afterBankPage.status!==200||afterBankPage.body.data.length===0);
    output.probes.push(result);await page.screenshot({path:folder+'/reconciliation-cod-after-bank-page.png',fullPage:true});await context.close();
  }
  if(!only||only==='ADDITIONAL') {
    const {context,page}=await workspace();
    await page.evaluate(async()=>{const {db}=await import('/src/mocks/database.ts');const sample=db.messages.find(x=>x.shopId==='shop-demo'&&x.conversationId==='cv1');if(!sample)throw new Error('No message seed');db.messages=db.messages.filter(x=>x.conversationId!=='cv1').concat(Array.from({length:105},(_,i)=>({...structuredClone(sample),id:`audit-message-${i+1}`,text:`Audit message ${i+1}`})));});
    await enter(page);await nav(page,'inbox');
    await page.locator('main a[href="/s/shop-demo/inbox/cv1"]').click();
    const messageArea=page.getByTestId('inbox-message-list');
    const next=messageArea.getByRole('button',{name:'Trang tiếp',exact:true});
    await next.waitFor();await next.click();await page.waitForURL(/cursor=/);
    const cursor=new URL(page.url()).searchParams.get('cursor');
    const conversations=await api(page,'/api/v2/shops/shop-demo/conversations?limit=40&cursor='+encodeURIComponent(cursor));
    await page.waitForTimeout(300);
    const result={id:'INBOX_SHARED_CURSOR',cursor,conversations,mainText:await page.locator('main').innerText()};
    result.reproduced=conversations.status===422&&conversations.body.code==='INVALID_CURSOR';
    output.probes.push(result);await page.screenshot({path:folder+'/inbox-after-message-page.png',fullPage:true});await context.close();
  }
  if(!only||only==='ADDITIONAL') {
    const {context,page}=await workspace();
    await page.evaluate(async()=>{const {db}=await import('/src/mocks/database.ts');const sample=db.categories.find(x=>x.shopId==='shop-demo');if(!sample)throw new Error('No category seed');db.categories=db.categories.filter(x=>x.shopId!=='shop-demo').concat(Array.from({length:105},(_,i)=>({...structuredClone(sample),id:`audit-category-${String(i+1).padStart(3,'0')}`,name:`Audit category ${String(i+1).padStart(3,'0')}`})));});
    await enter(page);await nav(page,'products');
    await page.getByRole('button',{name:'Thêm sản phẩm',exact:true}).click();
    await page.getByRole('heading',{name:'Thêm sản phẩm',exact:true}).waitFor();
    const categories=await api(page,'/api/v2/shops/shop-demo/categories?limit=100');
    await page.getByRole('combobox',{name:'Danh mục',exact:true}).click();
    const result={id:'PRODUCT_CATEGORY_LOOKUP_100_LIMIT',apiStatus:categories.status,apiPage:categories.body.page,optionCount:await page.getByRole('option').count(),category105Selectable:await page.getByRole('option',{name:'Audit category 105',exact:true}).count(),loadMoreControls:await page.getByRole('button',{name:/Tải thêm/}).count()};
    result.reproduced=result.apiPage.hasMore===true&&result.category105Selectable===0&&result.loadMoreControls===0;
    output.probes.push(result);await page.screenshot({path:folder+'/product-category-105-records.png',fullPage:true});await context.close();
  }
} catch(error) {output.error=error.stack||String(error);process.exitCode=1;}
finally {fs.writeFileSync(folder+'/browser-probes.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({browser:output.browser,probes:output.probes.map(({id,reproduced})=>({id,reproduced})),error:output.error},null,2));await browser.close();await server.close();}
