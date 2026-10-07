import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {startDemoServer} from '../../../../tests/session/demo-server.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const demo=await startDemoServer({cacheIsolationKey:'ui028-w07-render-20261005'});
let browser;
const pageErrors=[];
const screenshots=[];
const measurements=[];
const interactions={};
const routes=[
    {id:'R17',path:'/s/shop-demo/orders',name:'orders'},
    {id:'R18',path:'/s/shop-demo/orders/new',name:'order-create'},
    {id:'R07',path:'/s/shop-demo/customers',name:'customers'},
    {id:'R13',path:'/s/shop-demo/imports',name:'imports'},
    {id:'R29',path:'/s/shop-demo/integrations/channels',name:'integration-channels'},
    {id:'R04',path:'/s/shop-demo/overview',name:'overview-copy'},
];

async function waitForRoute(page){
    await page.locator('main#main-content h1').waitFor({state:'visible',timeout:20000});
    await page.locator('main#main-content .MuiLinearProgress-root').waitFor({state:'detached',timeout:20000}).catch(()=>{});
    await page.waitForTimeout(300);
}
async function capture(page,route,width){
    await page.setViewportSize({width,height:width<500?844:900});
    await page.goto(new URL(route.path,demo.url).toString(),{waitUntil:'domcontentloaded'});
    await waitForRoute(page);
    const metrics=await page.evaluate(()=>{
        const exactText=(text)=>[...document.querySelectorAll('body *')].find(el=>el.childElementCount===0&&el.textContent?.trim()===text);
        const hint=exactText('Cuộn ngang để xem đủ cột.');
        const lookupLabel=[...document.querySelectorAll('body *')].find(el=>el.childElementCount===0&&/^Đã tải \d+ lựa chọn$/.test(el.textContent?.trim()||''));
        const lookupRow=lookupLabel?.closest('.MuiStack-root');
        const search=document.querySelector('input[aria-label="Tìm kiếm"]');
        const toolbar=document.querySelector('main#main-content button[type="submit"]')?.closest('.MuiStack-root')||null;
        const tableRegion=document.querySelector('main#main-content [role="region"][tabindex="0"]');
        const pagerButton=[...document.querySelectorAll('button')].find(el=>el.textContent?.trim()==='Trang tiếp');
        let pager=pagerButton?.parentElement?.parentElement;
        const detailLabel=[...document.querySelectorAll('main#main-content .MuiTypography-root')].find(el=>['Page ID','Webhook gần nhất','Phí dự kiến'].includes(el.textContent?.trim()||''));
        let detail=detailLabel?.parentElement;
        while(detail&&!(detail.classList.contains('MuiStack-root')&&detailLabel&&detail.contains(detailLabel))) detail=detail.parentElement;
        const style=(el)=>el?(()=>{const s=getComputedStyle(el);return{padding:s.padding,paddingTop:s.paddingTop,paddingRight:s.paddingRight,paddingBottom:s.paddingBottom,paddingLeft:s.paddingLeft,gap:s.gap,marginTop:s.marginTop,display:s.display}})():null;
        return{
            viewport:{width:innerWidth,height:innerHeight},heading:document.querySelector('main#main-content h1')?.textContent?.trim()||null,
            documentWidth:document.documentElement.scrollWidth,
            mobileHint:style(hint),toolbar:style(toolbar),lookupRow:style(lookupRow),
            lookupLabel:lookupLabel?.textContent?.trim()||null,lookupButton:document.querySelector('button[aria-label^="Tải thêm"]')?.getAttribute('aria-label')||null,
            tableContainer:tableRegion?{clientWidth:tableRegion.clientWidth,scrollWidth:tableRegion.scrollWidth}:null,
            tableCell:style(document.querySelector('main#main-content [role="cell"],main#main-content td')),
            pager:{inset:style(pager),enabled:pagerButton?!pagerButton.disabled:null},
            detailLine:style(detail),copyable:style(document.querySelector('main#main-content button[aria-label^="Sao chép"]')?.parentElement),
        };
    });
    measurements.push({route:route.path,routeId:route.id,name:`${route.name}-${width}`,metrics});
    if(width===1280){
        const file=`w07-${route.name}-desktop.png`;
        await page.screenshot({path:path.join(here,file),fullPage:false});
        screenshots.push(file);
    }
    else if(route.name==='orders'||route.name==='customers'||route.name==='order-create'||route.name==='imports'){
        const file=`w07-${route.name}-mobile.png`;
        await page.screenshot({path:path.join(here,file),fullPage:false});
        screenshots.push(file);
    }
    return metrics;
}

try{
    browser=await chromium.launch({headless:true});
    const context=await browser.newContext({viewport:{width:1280,height:900},permissions:['clipboard-read','clipboard-write']});
    const page=await context.newPage();
    page.on('pageerror',error=>pageErrors.push(error.message));
    for(const route of routes){
        await capture(page,route,1280);
        if(['orders','customers','order-create','imports'].includes(route.name)) await capture(page,route,390);
    }

    await page.setViewportSize({width:390,height:844});
    await page.goto(new URL('/s/shop-demo/orders',demo.url).toString(),{waitUntil:'domcontentloaded'});
    await waitForRoute(page);
    const search=page.getByRole('textbox',{name:'Tìm kiếm'});
    await search.fill('  DH-DEMO-RETURN  ');
    await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();
    await page.waitForTimeout(250);
    interactions.searchCommitted={query:new URL(page.url()).searchParams.get('q'),cursor:new URL(page.url()).searchParams.get('cursor')};
    await page.getByRole('button',{name:'Xóa tìm kiếm'}).click();
    interactions.clear={query:new URL(page.url()).searchParams.get('q'),cursor:new URL(page.url()).searchParams.get('cursor'),focusReturned:await search.evaluate(el=>el===document.activeElement)};
    const pager=page.getByRole('button',{name:'Trang tiếp'});
    interactions.pager={enabled:await pager.isEnabled(),cursor:new URL(page.url()).searchParams.get('cursor')};
    const table=page.locator('main#main-content [role="region"][tabindex="0"]').first();
    await table.focus();
    const before=await table.evaluate(el=>({scrollLeft:el.scrollLeft,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}));
    await page.keyboard.press('ArrowRight');
    const after=await table.evaluate(el=>({scrollLeft:el.scrollLeft,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}));
    interactions.keyboardTable={before,after,scrollChanged:after.scrollLeft>before.scrollLeft};

    await page.goto(new URL('/s/shop-demo/orders/new',demo.url).toString(),{waitUntil:'domcontentloaded'});
    await waitForRoute(page);
    const lookup=page.locator('button[aria-label^="Tải thêm"]').first();
    const lookupLabel=page.locator('text=/Đã tải \\d+ lựa chọn/').first();
    if(await lookupLabel.count()){
        interactions.lookup={rowPresent:true,rowText:(await lookupLabel.textContent())?.trim()||null,loadMoreExposed:(await lookup.count())>0,enabled:(await lookup.count())?await lookup.isEnabled():null};
        if(await lookup.count()&&await lookup.isEnabled()){
            await lookup.click();
            await page.waitForTimeout(350);
            interactions.lookup.after=(await page.locator('text=/Đã tải \\d+ lựa chọn/').first().textContent())?.trim()||null;
        }else interactions.lookup.nextPageUnavailableInDemoSeed=true;
    }else interactions.lookup={rowPresent:false,loadMoreExposed:(await lookup.count())>0};

    await page.goto(new URL('/s/shop-demo/overview',demo.url).toString(),{waitUntil:'domcontentloaded'});
    await waitForRoute(page);
    const copyButton=page.locator('main#main-content button[aria-label^="Sao chép"]').first();
    if(await copyButton.count()){
        const code=await copyButton.evaluate(el=>el.parentElement?.querySelector('code')?.textContent?.trim()||'');
        await copyButton.click();
        await page.getByRole('status').filter({hasText:'Đã sao chép'}).first().waitFor({state:'visible',timeout:5000});
        const clipboard=await page.evaluate(()=>navigator.clipboard.readText());
        interactions.copy={value:code,clipboardMatches:clipboard===code,feedbackVisible:await page.getByRole('status').filter({hasText:'Đã sao chép'}).first().isVisible()};
    }else interactions.copy={available:false};

    const actualPath=new URL(page.url()).pathname;
    const result={
        capturedAt:'2026-10-05',status:'PASS',browser:'Chromium via Playwright',scope:'local React demo with in-memory/mock API; layout/interactions only, no backend or owner acceptance',
        screenshots,measurements,interactions,pageErrors,
        checks:{
            routesFound:measurements.every(item=>!String(item.metrics.heading||'').includes('Không tìm thấy')),
            noDocumentOverflow:measurements.every(item=>item.metrics.documentWidth<=item.metrics.viewport.width),
            toolbarInsetAndGap:measurements.filter(item=>item.metrics.toolbar).every(item=>item.metrics.toolbar.paddingLeft==='16px'&&item.metrics.toolbar.gap==='12px'),
            mobileHintInset:measurements.filter(item=>item.metrics.mobileHint).every(item=>item.metrics.mobileHint.paddingLeft==='16px'&&item.metrics.mobileHint.paddingTop==='8px'),
            lookupSemanticSpacing:measurements.filter(item=>item.metrics.lookupRow).every(item=>item.metrics.lookupRow.gap==='8px'&&item.metrics.lookupRow.paddingLeft==='8px'&&item.metrics.lookupRow.marginTop==='4px'),
            detailSemanticSpacing:measurements.filter(item=>item.metrics.detailLine).every(item=>item.metrics.detailLine.gap==='16px'&&item.metrics.detailLine.paddingTop==='12px'&&item.metrics.detailLine.paddingBottom==='12px'),
            keyboardScroll:interactions.keyboardTable?.scrollChanged===true,
            clearReturnsFocus:interactions.clear?.focusReturned===true,
            copyWorks:interactions.copy?.clipboardMatches===true&&interactions.copy?.feedbackVisible===true,
            noPageErrors:pageErrors.length===0,
        },
    };
    const required=['routesFound','noDocumentOverflow','toolbarInsetAndGap','mobileHintInset','lookupSemanticSpacing','detailSemanticSpacing','keyboardScroll','clearReturnsFocus','copyWorks','noPageErrors'];
    result.failedChecks=required.filter(key=>result.checks[key]===false);
    result.status=result.failedChecks.length?'FAIL':'PASS';
    await fs.writeFile(path.join(here,'render-check-current-20261005.json'),`${JSON.stringify(result,null,2)}\n`,'utf8');
    console.log(JSON.stringify({status:result.status,failedChecks:result.failedChecks,checks:result.checks,interactions,screenshots,measurements:measurements.map(item=>({route:item.route,name:item.name,metrics:item.metrics}))},null,2));
    if(result.failedChecks.length) process.exitCode=1;
}catch(error){
    const result={capturedAt:'2026-10-05',status:'FAIL',error:error instanceof Error?error.stack:String(error),pageErrors,measurements,interactions};
    await fs.writeFile(path.join(here,'render-check-current-20261005.json'),`${JSON.stringify(result,null,2)}\n`,'utf8');
    throw error;
}finally{
    await browser?.close();
    await demo.close();
}
