import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {startDemoServer} from '../../../../tests/session/demo-server.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const demo=await startDemoServer({cacheIsolationKey:'ui028-w08-before-20261005'});
let browser;
const errors=[];
const states=[];
const emptyStates=[];
async function openRoute(page,route){
    await page.goto(new URL(route,demo.url).toString(),{waitUntil:'domcontentloaded'});
    await page.locator('main#main-content h1').waitFor({state:'visible',timeout:20000});
    await page.locator('main#main-content .MuiLinearProgress-root').waitFor({state:'detached',timeout:20000}).catch(()=>{});
}
async function recordDialog(page,{route,name,width,trigger}){
    await page.setViewportSize({width,height:width<500?844:900});
    await openRoute(page,route);
    await page.getByRole('button',{name:trigger,exact:true}).click();
    const dialog=page.getByRole('dialog').last();
    await dialog.waitFor({state:'visible',timeout:5000});
    await page.waitForTimeout(200);
    const metric=await dialog.evaluate(el=>{
        const paper=el;
        const container=el.closest('.MuiDialog-container');
        const content=el.querySelector('.MuiDialogContent-root');
        const actions=el.querySelector('.MuiDialogActions-root');
        const description=el.querySelector('.MuiDialogContent-root > .MuiTypography-root');
        const style=node=>node?(()=>{const s=getComputedStyle(node);return{padding:s.padding,paddingTop:s.paddingTop,paddingRight:s.paddingRight,paddingBottom:s.paddingBottom,paddingLeft:s.paddingLeft,gap:s.gap,marginBottom:s.marginBottom,marginLeft:s.marginLeft}})():null;
        const rect=node=>node?(()=>{const r=node.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height),right:Math.round(r.right),bottom:Math.round(r.bottom)}})():null;
        return{title:el.getAttribute('aria-labelledby')?document.getElementById(el.getAttribute('aria-labelledby'))?.textContent?.trim():null,container:rect(container),paper:rect(paper),paperStyle:style(paper),content:style(content),description:style(description),actions:style(actions),actionButtons:[...el.querySelectorAll('.MuiDialogActions-root button')].map(style),viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth};
    });
    const file=`w08-before-${name}-${width}.png`;
    await page.screenshot({path:path.join(here,file),fullPage:false});
    states.push({route,name,width,trigger,measurement:metric,screenshot:file});
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({state:'detached',timeout:5000}).catch(()=>{});
}

try{
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
    page.on('pageerror',error=>errors.push(error.message));
    for(const width of [1280,390]){
        await recordDialog(page,{route:'/s/shop-demo/customers',name:'customer-create',width,trigger:'Thêm khách hàng'});
        await recordDialog(page,{route:'/s/shop-demo/integrations/channels',name:'channel-confirm',width,trigger:'Ngắt kết nối'});
        await page.setViewportSize({width,height:width<500?844:900});
        await openRoute(page,'/s/shop-demo/integrations/ai');
        const empty=page.locator('main#main-content .MuiStack-root[role="status"]').filter({has:page.getByText('—',{exact:true})}).first();
        const available=(await empty.count())>0;
        if(available){
            const measurement=await empty.evaluate(el=>{const s=getComputedStyle(el);return{padding:s.padding,paddingTop:s.paddingTop,paddingRight:s.paddingRight,paddingBottom:s.paddingBottom,paddingLeft:s.paddingLeft,gap:s.gap,documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,text:el.textContent?.trim()}});
            const screenshot=`w08-before-ai-empty-${width}.png`;
            await page.screenshot({path:path.join(here,screenshot),fullPage:false});
            emptyStates.push({route:'/s/shop-demo/integrations/ai',width,available,measurement,screenshot});
        }else emptyStates.push({route:'/s/shop-demo/integrations/ai',width,available});
    }
    const result={capturedAt:'2026-10-05',status:errors.length?'FAIL':'CAPTURED',scope:'pre-code geometry baseline; local React demo with synthetic in-memory API; dialog open/close and empty-state observation only; no mutation',browser:'Chromium via Playwright',states,emptyStates,pageErrors:errors,expectedAfterCode:{dialogContentInset:'16px mobile / 24px desktop',viewportMargin:'16px mobile / 32px desktop',actionsInset:'16px',actionsGap:'8px',descriptionAfterGap:'16px',emptyInset:'16px inline, 32px mobile block, 48px desktop block'}};
    await fs.writeFile(path.join(here,'render-before-code-current-20261005.json'),`${JSON.stringify(result,null,2)}\n`,'utf8');
    console.log(JSON.stringify({status:result.status,states:states.map(x=>({name:x.name,width:x.width,measurement:x.measurement,screenshot:x.screenshot})),pageErrors:errors},null,2));
}catch(error){
    await fs.writeFile(path.join(here,'render-before-code-current-20261005.json'),`${JSON.stringify({capturedAt:'2026-10-05',status:'FAIL',error:error instanceof Error?error.stack:String(error),states,emptyStates,pageErrors:errors},null,2)}\n`,'utf8');
    throw error;
}finally{
    await browser?.close();
    await demo.close();
}
