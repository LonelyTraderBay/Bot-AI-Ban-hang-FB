import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {startDemoServer} from '../../../tests/session/demo-server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUTPUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'S11-interactive-contrast-audit-20261003.json');
const server = await startDemoServer({cacheIsolationKey:'ui012-interactive-contrast'});
let browser;

const waitForMain = async page => {
    await page.locator('main#main-content h1').waitFor({state:'visible',timeout:20000});
    await page.locator('main#main-content .MuiLinearProgress-root').waitFor({state:'detached',timeout:20000}).catch(()=>{});
};

try {
    browser = await chromium.launch({headless:true});
    const page = await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
    const pageErrors = [];
    page.on('pageerror',error=>pageErrors.push(error.message));

    await page.goto(new URL('/s/shop-demo/overview',server.url).toString(),{waitUntil:'domcontentloaded'});
    await waitForMain(page);
    const action = page.getByRole('link',{name:'Xem việc cần làm',exact:true});
    await action.waitFor({state:'visible'});
    const actionSamples = [];
    const captureAction = state => action.evaluate((element,stateName)=>{
        const style=getComputedStyle(element);
        const rect=element.getBoundingClientRect();
        return {
            state:stateName,
            label:(element.innerText||element.getAttribute('aria-label')||'').trim(),
            foreground:style.color,
            background:style.backgroundColor,
            backgroundImage:style.backgroundImage,
            fontSizePx:parseFloat(style.fontSize),
            fontWeight:parseInt(style.fontWeight,10)||400,
            outline:{style:style.outlineStyle,width:style.outlineWidth,color:style.outlineColor,offset:style.outlineOffset},
            focusVisible:element.matches(':focus-visible'),
            hovered:element.matches(':hover'),
            active:element.matches(':active'),
            bounds:{width:Number(rect.width.toFixed(1)),height:Number(rect.height.toFixed(1))},
        };
    },state);

    actionSamples.push(await captureAction('default'));
    await action.hover();
    actionSamples.push(await captureAction('hover'));
    const actionBox=await action.boundingBox();
    if(!actionBox) throw new Error('Dashboard action link has no visible bounding box.');
    await page.mouse.move(actionBox.x+actionBox.width/2,actionBox.y+actionBox.height/2);
    await page.mouse.down();
    actionSamples.push(await captureAction('pressed-before-release'));
    await page.mouse.move(0,0);
    await page.mouse.up();

    await page.goto(new URL('/s/shop-demo/overview',server.url).toString(),{waitUntil:'domcontentloaded'});
    await waitForMain(page);
    await page.keyboard.press('Tab');
    const skip=page.getByRole('link',{name:'Đến nội dung chính',exact:true});
    await skip.waitFor({state:'attached'});
    await page.keyboard.press('Enter');
    for(let index=0;index<100;index++) {
        if(await action.evaluate(element=>element===document.activeElement)) break;
        await page.keyboard.press('Tab');
    }
    const keyboardFocus=await action.evaluate(element=>{
        const style=getComputedStyle(element);
        return {focused:element===document.activeElement,focusVisible:element.matches(':focus-visible'),outline:{style:style.outlineStyle,width:style.outlineWidth,color:style.outlineColor,offset:style.outlineOffset}};
    });

    await page.addInitScript(()=>{
        const originalFetch=window.fetch.bind(window);
        window.fetch=(input,init)=>{
            const requestUrl=input instanceof Request?input.url:String(input);
            const method=init?.method||(input instanceof Request?input.method:'GET');
            if(new URL(requestUrl,window.location.href).pathname==='/api/v2/shops/shop-demo/knowledge'&&method==='POST') {
                return Promise.resolve(new Response(JSON.stringify({
                    type:'about:blank',title:'Dữ liệu chưa hợp lệ',status:422,code:'VALIDATION_ERROR',
                    detail:'Nội dung cần được kiểm tra trước khi lưu.',requestId:'ui012-interactive-422',
                    errors:[{path:'content',code:'CONTENT_REVIEW_REQUIRED',message:'Hãy rà soát nội dung nguồn.'}],
                }),{status:422,headers:{'content-type':'application/problem+json'}}));
            }
            return originalFetch(input,init);
        };
    });
    await page.goto(new URL('/s/shop-demo/knowledge',server.url).toString(),{waitUntil:'domcontentloaded'});
    await waitForMain(page);
    await page.getByRole('button',{name:'Thêm nguồn kiến thức',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Nguồn kiến thức mới'});
    await dialog.getByRole('textbox',{name:'Tiêu đề'}).fill('Quy trình đổi hàng đã rà soát');
    const invalidContent=dialog.getByRole('textbox',{name:'Nội dung'});
    await invalidContent.fill('Nội dung tổng hợp cần xác minh thêm trước khi tạo bản nháp.');
    await dialog.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();
    const errorAlert=dialog.getByRole('alert').filter({hasText:'Nội dung cần được kiểm tra trước khi lưu.'});
    await errorAlert.waitFor({state:'visible',timeout:10000});
    const errorState=await page.evaluate(()=>{
        const parse=value=>{
            const match=value.match(/^rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)(?:,\s*(\d+(?:\.\d+)?))?\)$/);
            return match?{rgb:match.slice(1,4).map(Number),alpha:match[4]===undefined?1:Number(match[4])}:null;
        };
        const blend=(foreground,background,alpha)=>foreground.map((channel,index)=>Math.round(channel*alpha+background[index]*(1-alpha)));
        const luminance=rgb=>rgb.reduce((sum,channel,index)=>{const value=channel/255;return sum+(value<=.04045?value/12.92:((value+.055)/1.055)**2.4)*[.2126,.7152,.0722][index];},0);
        const ratio=(first,second)=>(Math.max(luminance(first),luminance(second))+.05)/(Math.min(luminance(first),luminance(second))+.05);
        const contrast=(foreground,background)=>{
            const fg=parse(foreground),bg=parse(background);
            if(!fg||!bg)return null;
            return Number(ratio(blend(fg.rgb,bg.rgb,fg.alpha),bg.rgb).toFixed(2));
        };
        const alert=[...document.querySelectorAll('[role="alert"]')].find(element=>(element.innerText||'').includes('Nội dung cần được kiểm tra trước khi lưu.'));
        if(!alert) throw new Error('Synthetic validation alert was not found.');
        const alertStyle=getComputedStyle(alert);
        const alertIcon=alert.querySelector('.MuiAlert-icon');
        const iconStyle=alertIcon?getComputedStyle(alertIcon):null;
        const invalid=document.querySelector('[aria-invalid="true"]');
        const inputRoot=invalid?.closest('.MuiOutlinedInput-root');
        const border=inputRoot?.querySelector('.MuiOutlinedInput-notchedOutline');
        const borderStyle=border?getComputedStyle(border):null;
        const inputStyle=inputRoot?getComputedStyle(inputRoot):null;
        const fieldId=invalid?.getAttribute('id');
        const helper=fieldId?document.querySelector(`[id="${CSS.escape(fieldId)}-helper-text"]`):null;
        const helperStyle=helper?getComputedStyle(helper):null;
        const fg=parse(alertStyle.color),bg=parse(alertStyle.backgroundColor);
        const alertTextRatio=fg&&bg?contrast(alertStyle.color,alertStyle.backgroundColor):null;
        const iconColor=iconStyle?.color||null;
        const fieldBorderRatio=borderStyle&&inputStyle?contrast(borderStyle.borderColor,inputStyle.backgroundColor):null;
        return {
            alert:{text:(alert.innerText||'').trim(),foreground:alertStyle.color,background:alertStyle.backgroundColor,contrastRatio:alertTextRatio,textThreshold:4.5,passesText:alertTextRatio!==null&&alertTextRatio>=4.5,iconColor,iconContrastRatio:iconColor?contrast(iconColor,alertStyle.backgroundColor):null,iconThreshold:3,passesIcon:!!iconColor&&contrast(iconColor,alertStyle.backgroundColor)>=3},
            invalidField:invalid?{label:invalid.getAttribute('aria-label')||invalid.getAttribute('name'),ariaInvalid:invalid.getAttribute('aria-invalid'),borderColor:borderStyle?.borderColor||null,borderWidth:borderStyle?.borderWidth||null,background:inputStyle?.backgroundColor||null,borderContrastRatio:fieldBorderRatio,threshold:3,passesBorder:fieldBorderRatio!==null&&fieldBorderRatio>=3,helperText:helper?.innerText?.trim()||null,helperColor:helperStyle?.color||null,helperBackground:helperStyle?.backgroundColor||null,helperContrastRatio:helperStyle?contrast(helperStyle.color,helperStyle.backgroundColor):null}:null,
        };
    });

    const contrastStateSamples=actionSamples.map(sample=>{
        const parse=value=>{const match=value.match(/^rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)(?:,\s*(\d+(?:\.\d+)?))?\)$/);return match?{rgb:match.slice(1,4).map(Number),alpha:match[4]===undefined?1:Number(match[4])}:null;};
        const blend=(fg,bg,alpha)=>fg.map((channel,index)=>Math.round(channel*alpha+bg[index]*(1-alpha)));
        const lum=rgb=>rgb.reduce((sum,channel,index)=>{const value=channel/255;return sum+(value<=.04045?value/12.92:((value+.055)/1.055)**2.4)*[.2126,.7152,.0722][index];},0);
        const fg=parse(sample.foreground),bg=parse(sample.background);
        const ratio=fg&&bg?(Math.max(lum(blend(fg.rgb,bg.rgb,fg.alpha)),lum(bg.rgb))+.05)/(Math.min(lum(blend(fg.rgb,bg.rgb,fg.alpha)),lum(bg.rgb))+.05):null;
        return {...sample,contrastRatio:ratio===null?null:Number(ratio.toFixed(2)),threshold:4.5,assessable:ratio!==null,passesText:ratio!==null&&ratio>=4.5};
    });
    const report={
        date:'2026-10-03',scope:'LOCAL_FRONTEND_WITH_SYNTHETIC_MOCK_API',routeCount:2,
        method:'Chromium captured a rendered dashboard primary action in default, real pointer hover, pointer-down, and keyboard-focus states. A separate knowledge form received a locally intercepted synthetic 422 response to expose its actual error alert and invalid-field styling. Text/background colors use computed CSS colors; no external API request or persistent write was made.',
        actionStates:contrastStateSamples,
        keyboardFocus,
        syntheticValidationError:errorState,
        pageErrors,
        limitations:[
            'Two representative routes and one button/link composition only; this is not full state coverage across all routes/components.',
            'The alert icon check uses computed icon color against the computed alert surface; SVG path pixel geometry and anti-aliasing were not sampled.',
            'The active state is sampled during pointer-down before release; it does not test all device/browser input modalities.',
            'Actual browser zoom, physical touch, screen-reader speech, non-rectangular target geometry, forced-colors usage and complete manual review remain unverified.',
            'Synthetic 422 response is test-only and is not evidence of backend behavior.'
        ],
    };
    await fs.writeFile(OUTPUT,JSON.stringify(report,null,2)+'\n','utf8');
    console.log(JSON.stringify({output:path.relative(ROOT,OUTPUT),actionStates:report.actionStates.map(({state,contrastRatio,passesText,hovered,active})=>({state,contrastRatio,passesText,hovered,active})),keyboardFocus,syntheticValidationError:errorState,pageErrors:pageErrors.length},null,2));
    const failedAction=report.actionStates.some(sample=>sample.assessable&&!sample.passesText);
    if(pageErrors.length||failedAction||!errorState.alert.passesText||!errorState.alert.passesIcon||!errorState.invalidField?.passesBorder||!keyboardFocus.focused||!keyboardFocus.focusVisible) process.exitCode=1;
} finally {
    await browser?.close();
    await server.close();
}
