import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {startDemoServer} from '../session/demo-server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUTPUT = process.env.BOTSALES_UI012_CONTRAST_OUTPUT
    ? path.resolve(ROOT, process.env.BOTSALES_UI012_CONTRAST_OUTPUT)
    : path.join(ROOT, 'evidence/frontend-ui-improvements/UI012/S09-route-contrast-audit-20261003.json');
const manifest = JSON.parse(await fs.readFile(path.join(ROOT, '../botsales-kit/contracts/route-manifest.json'), 'utf8'));
const details = {
    conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001',
    knowledgeId: 'k1', jobId: 'missing-job',
};

const server = await startDemoServer({cacheIsolationKey: 'ui012-route-contrast'});
let browser;
try {
    browser = await chromium.launch({headless:true});
    const page = await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
    const pageErrors = [];
    let currentRoute = '';
    page.on('pageerror', error => pageErrors.push({route:currentRoute,message:error.message}));
    const routes = [];
    const nonText = {statusChips:[],outlinedInputs:[],disabledControls:[],focusIndicator:null,focusInputBorder:null,chartMarks:[],limitations:[]};
    for (const route of manifest.routes) {
        currentRoute = route.id;
        const routePath = route.path.replace(':shopId','shop-demo').replace(/:([A-Za-z]+)/g,(_,key)=>details[key]||'missing');
        await page.goto(new URL(routePath,server.url).toString(),{waitUntil:'domcontentloaded'});
        await page.locator('main#main-content h1').waitFor({state:'visible',timeout:20000});
        await page.locator('main#main-content .MuiLinearProgress-root').waitFor({state:'detached',timeout:20000}).catch(()=>{});
        const result = await page.evaluate(() => {
            const parse = value => {
                const match = value.match(/^rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)(?:,\s*(\d+(?:\.\d+)?))?\)$/);
                return match ? {rgb:match.slice(1,4).map(Number),alpha:match[4]===undefined?1:Number(match[4])} : null;
            };
            const blend = (foreground,background,alpha) => foreground.map((channel,index)=>Math.round(channel*alpha+background[index]*(1-alpha)));
            const luminance = rgb => rgb.reduce((sum,channel,index)=>{
                const value=channel/255;
                const linear=value<=.04045?value/12.92:((value+.055)/1.055)**2.4;
                return sum+linear*[.2126,.7152,.0722][index];
            },0);
            const ratio = (first,second) => (Math.max(luminance(first),luminance(second))+.05)/(Math.min(luminance(first),luminance(second))+.05);
            const uniqueBackgrounds = values => [...new Map(values.map(background=>[background.join(','),background])).values()];
            const main = document.querySelector('main#main-content');
            const rootColor = parse(getComputedStyle(document.documentElement).backgroundColor)?.rgb??[17,19,24];
            const gradientStops = image => {
                if(!image.startsWith('linear-gradient(')||image.match(/linear-gradient\(/g)?.length!==1||image.includes('url(')) return null;
                const stops=[...image.matchAll(/rgba?\([^)]*\)/g)].map(match=>parse(match[0])).filter(Boolean);
                if(stops.length<2) return null;
                for(let channel=0;channel<3;channel++) {
                    const deltas=stops.slice(1).map((stop,index)=>stop.rgb[channel]-stops[index].rgb[channel]).filter(delta=>delta!==0);
                    if(deltas.some(delta=>Math.sign(delta)!==Math.sign(deltas[0]))) return null;
                }
                return stops;
            };
            const backgroundFor = element => {
                const layers=[];
                let unsupportedImage=false;
                for(let current=element;current;current=current.parentElement) {
                    const style=getComputedStyle(current);
                    layers.push({color:parse(style.backgroundColor),image:style.backgroundImage});
                }
                let backgrounds=[rootColor];
                for(const layer of layers.reverse()) {
                    if(layer.color&&layer.color.alpha>0) backgrounds=uniqueBackgrounds(backgrounds.map(background=>blend(layer.color.rgb,background,layer.color.alpha)));
                    if(layer.image&&layer.image!=='none') {
                        const stops=gradientStops(layer.image);
                        if(!stops) unsupportedImage=true;
                        else backgrounds=uniqueBackgrounds(backgrounds.flatMap(background=>stops.map(stop=>blend(stop.rgb,background,stop.alpha))));
                    }
                }
                return {background:backgrounds[0],backgrounds,unsupportedImage};
            };
            const visible = element => {
                const style=getComputedStyle(element);
                const rect=element.getBoundingClientRect();
                return rect.width>0&&rect.height>0&&style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>0;
            };
            const text=[];
            let unsupportedTextBackgrounds=0;
            const walker=document.createTreeWalker(main,NodeFilter.SHOW_TEXT);
            for(let node;(node=walker.nextNode());) {
                const value=node.nodeValue?.replace(/\s+/g,' ').trim();
                const element=node.parentElement;
                if(!value||!element||!visible(element)||element.closest('[aria-hidden="true"]')) continue;
                const style=getComputedStyle(element);
                const foreground=parse(style.color);
                if(!foreground) continue;
                const composed=backgroundFor(element);
                if(composed.unsupportedImage) unsupportedTextBackgrounds++;
                const fontSize=parseFloat(style.fontSize)||16;
                const weight=parseInt(style.fontWeight,10)||400;
                const large=fontSize>=24||(fontSize>=18.66&&weight>=700);
                const candidates=composed.backgrounds.map(background=>({background,contrastRatio:ratio(blend(foreground.rgb,background,foreground.alpha),background)}));
                const worst=candidates.sort((a,b)=>a.contrastRatio-b.contrastRatio)[0];
                const measured=Number(worst.contrastRatio.toFixed(2));
                text.push({text:value.slice(0,96),selector:`${element.tagName.toLowerCase()}${element.classList.length?'.'+[...element.classList].slice(0,2).join('.'):''}`,fontSizePx:fontSize,fontWeight:weight,threshold:large?3:4.5,contrastRatio:measured,worstBackgroundRgb:worst.background,gradientStopCount:composed.backgrounds.length,assessable:!composed.unsupportedImage,passes:!composed.unsupportedImage&&measured>=(large?3:4.5),unsupportedBackgroundImage:composed.unsupportedImage});
            }
            const gradientText=text.filter(sample=>sample.gradientStopCount>1);
            const statusChips=[...main.querySelectorAll('.MuiChip-root')].filter(visible).map(element=>{
                const style=getComputedStyle(element);
                const fg=parse(style.color), bg=parse(style.backgroundColor);
                const measured=fg&&bg?Number(ratio(blend(fg.rgb,bg.rgb,fg.alpha),bg.rgb).toFixed(2)):null;
                return fg&&bg?{label:(element.innerText||'').trim().slice(0,80),foreground:style.color,background:style.backgroundColor,contrastRatio:measured,threshold:4.5,passes:measured>=4.5}:null;
            }).filter(Boolean);
            const outlinedInputs=[...main.querySelectorAll('.MuiOutlinedInput-notchedOutline')].filter(visible).map(element=>{
                const style=getComputedStyle(element);
                const input=element.closest('.MuiOutlinedInput-root');
                const background=input?parse(getComputedStyle(input).backgroundColor):null;
                const foreground=parse(style.borderColor);
                const measured=background&&foreground?Number(ratio(foreground.rgb,background.rgb).toFixed(2)):null;
                return background&&foreground?{border:style.borderColor,background:getComputedStyle(input).backgroundColor,borderWidth:style.borderWidth,contrastRatio:measured,threshold:3,passes:measured>=3}:null;
            }).filter(Boolean);
            const disabledControls=[...main.querySelectorAll('button:disabled,[aria-disabled="true"]')].filter(visible).map(element=>({label:(element.innerText||element.getAttribute('aria-label')||'').trim().slice(0,80),tag:element.tagName.toLowerCase(),color:getComputedStyle(element).color,background:getComputedStyle(element).backgroundColor}));
            const focusSamples=[...main.querySelectorAll('button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(visible);
            const chartMarks=[...main.querySelectorAll('[data-testid="marketing-loss-chart"] .recharts-bar-rectangle path')].filter(visible).map(element=>{
                const style=getComputedStyle(element);
                const composed=backgroundFor(element.parentElement);
                const paint=parse(style.fill)&&style.fill!=='none'?parse(style.fill):parse(style.stroke);
                return {fill:style.fill,stroke:style.stroke,backgroundRgb:composed.background,backgroundImageAncestor:composed.unsupportedImage,contrastRatio:paint?Number(ratio(blend(paint.rgb,composed.background,paint.alpha),composed.background).toFixed(2)):null,passes:paint&&!composed.unsupportedImage&&ratio(blend(paint.rgb,composed.background,paint.alpha),composed.background)>=3};
            });
            return {sampleCount:text.length,failedCount:text.filter(sample=>!sample.passes&&sample.assessable).length,minimumRatio:text.length?Math.min(...text.filter(sample=>sample.assessable).map(sample=>sample.contrastRatio)):null,gradientTextSampleCount:gradientText.length,minimumGradientTextRatio:gradientText.length?Math.min(...gradientText.map(sample=>sample.contrastRatio)):null,gradientTextSamples:gradientText,unsupportedTextBackgrounds,lowestSamples:[...text].filter(sample=>sample.assessable).sort((a,b)=>a.contrastRatio-b.contrastRatio).slice(0,3),failures:text.filter(sample=>!sample.passes&&sample.assessable),statusChips,outlinedInputs,disabledControls,focusTargetCount:focusSamples.length,chartMarks};
        });
        routes.push({id:route.id,path:routePath,...result});
        nonText.statusChips.push(...result.statusChips.map(sample=>({routeId:route.id,...sample})));
        nonText.outlinedInputs.push(...result.outlinedInputs.slice(0,4).map(sample=>({routeId:route.id,...sample})));
        nonText.disabledControls.push(...result.disabledControls.slice(0,3).map(sample=>({routeId:route.id,...sample})));
        if(route.id==='R10') {
            await page.locator('main#main-content .MuiOutlinedInput-input').first().focus();
            nonText.focusInputBorder=await page.locator('main#main-content .MuiOutlinedInput-notchedOutline').first().evaluate(element=>{
                const border=getComputedStyle(element), input=element.closest('.MuiOutlinedInput-root'), background=getComputedStyle(input).backgroundColor;
                const channels=value=>value.match(/\d+(?:\.\d+)?/g)?.slice(0,3).map(Number);
                const lum=rgb=>rgb.reduce((sum,channel,index)=>{const v=channel/255;return sum+(v<=.04045?v/12.92:((v+.055)/1.055)**2.4)*[.2126,.7152,.0722][index];},0);
                const fg=channels(border.borderColor), bg=channels(background), measured=(Math.max(lum(fg),lum(bg))+.05)/(Math.min(lum(fg),lum(bg))+.05);
                return {borderColor:border.borderColor,borderWidth:border.borderWidth,background,contrastRatio:Number(measured.toFixed(2)),threshold:3,passes:measured>=3};
            });
        }
        if(route.id==='R49') {
            for(let tab=0;tab<80;tab++) {
                await page.keyboard.press('Tab');
                const focus=await page.evaluate(()=>{
                    const element=document.activeElement;
                    if(!element||!element.matches(':focus-visible')) return null;
                    const style=getComputedStyle(element);
                    const outline=parseFloat(style.outlineWidth)||0;
                    if(style.outlineStyle==='none'||outline<=0) return null;
                    const colors=style.outlineColor.match(/\d+(?:\.\d+)?/g)?.slice(0,3).map(Number)||null;
                    let parentBackground=[17,19,24];
                    const layers=[];
                    for(let current=element.parentElement;current;current=current.parentElement) {
                        const match=getComputedStyle(current).backgroundColor.match(/^rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)(?:,\s*(\d+(?:\.\d+)?))?\)$/);
                        if(match&&Number(match[4]??1)>0) layers.push({rgb:match.slice(1,4).map(Number),alpha:Number(match[4]??1)});
                    }
                    for(const layer of layers.reverse()) parentBackground=layer.rgb.map((channel,index)=>Math.round(channel*layer.alpha+parentBackground[index]*(1-layer.alpha)));
                    const lum=rgb=>rgb.reduce((sum,channel,index)=>{const v=channel/255;return sum+(v<=.04045?v/12.92:((v+.055)/1.055)**2.4)*[.2126,.7152,.0722][index];},0);
                    const outlineRatio=colors?(Math.max(lum(colors),lum(parentBackground))+.05)/(Math.min(lum(colors),lum(parentBackground))+.05):null;
                    return {tag:element.tagName.toLowerCase(),label:element.getAttribute('aria-label')||element.innerText?.trim().slice(0,80)||element.getAttribute('name'),outlineStyle:style.outlineStyle,outlineWidthPx:outline,outlineColor:style.outlineColor,adjacentBackgroundRgb:parentBackground,contrastRatio:Number(outlineRatio?.toFixed(2)),threshold:3,passes:outlineRatio>=3};
                });
                if(focus) { nonText.focusIndicator=focus; break; }
            }
        }
        if(route.id==='R53') nonText.chartMarks=result.chartMarks;
    }
    const report={
        scope:'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        routeCount:routes.length,
        method:'Rendered visible text sampled on all canonical routes at 1440x1000; computed foreground is composited against every computed ancestor background candidate and the worst contrast is checked against WCAG 2.x text thresholds. A simple single linear gradient is assessed at its CSS stop colors only when each RGB channel is monotonic across the stops, making its luminance monotonic along the gradient; other background images are marked unassessable. Representative status chips and marketing chart marks are checked at 4.5:1/3:1 respectively; normal/focused input borders and a keyboard focus outline are sampled separately. Disabled controls are inventoried without applying a contrast threshold because WCAG exempts inactive controls. This is a local automated scan, not a complete manual contrast or assistive-technology assessment.',
        totals:{textNodes:routes.reduce((sum,route)=>sum+route.sampleCount,0),assessableTextNodes:routes.reduce((sum,route)=>sum+route.sampleCount-route.unsupportedTextBackgrounds,0),failedTextNodes:routes.reduce((sum,route)=>sum+route.failedCount,0),routesWithText:routes.filter(route=>route.sampleCount>0).length,gradientTextNodes:routes.reduce((sum,route)=>sum+route.gradientTextSampleCount,0),minimumGradientTextRatio:Math.min(...routes.filter(route=>route.minimumGradientTextRatio!==null).map(route=>route.minimumGradientTextRatio)),unsupportedTextBackgrounds:routes.reduce((sum,route)=>sum+route.unsupportedTextBackgrounds,0),minimumRatio:Math.min(...routes.filter(route=>route.minimumRatio!==null).map(route=>route.minimumRatio))},
        methodLimitations:['Monotonic single-layer linear gradients are evaluated conservatively at their computed stop colors; unsupported image, multi-gradient or non-monotonic backgrounds are marked unassessable and do not count as passing.','This is an automated local contrast scan. It does not replace review of every visual state or actual zoom/screen-reader testing.'],
        nonText:{...nonText,totals:{statusChips:nonText.statusChips.length,failedStatusChipText:nonText.statusChips.filter(sample=>!sample.passes).length,inputBorders:nonText.outlinedInputs.length,failedInputBorders:nonText.outlinedInputs.filter(sample=>!sample.passes).length,disabledControlsInventoried:nonText.disabledControls.length,chartMarks:nonText.chartMarks.length,failedChartMarks:nonText.chartMarks.filter(sample=>!sample.passes).length}},
        pageErrors,
        routes,
    };
    await fs.mkdir(path.dirname(OUTPUT),{recursive:true});
    await fs.writeFile(OUTPUT,JSON.stringify(report,null,2)+'\n','utf8');
    console.log(JSON.stringify({output:path.relative(ROOT,OUTPUT),routeCount:report.routeCount,totals:report.totals,pageErrors:pageErrors.length,focusIndicator:nonText.focusIndicator,statusChips:nonText.statusChips.length,inputBorders:nonText.outlinedInputs.length,chartMarks:nonText.chartMarks.length},null,2));
    const nonTextTotals=report.nonText.totals;
    if(routes.length!==54||report.totals.routesWithText!==54||report.totals.assessableTextNodes!==report.totals.textNodes||report.totals.failedTextNodes||report.totals.gradientTextNodes===0||!Number.isFinite(report.totals.minimumGradientTextRatio)||pageErrors.length||nonTextTotals.failedStatusChipText||nonTextTotals.failedInputBorders||nonTextTotals.failedChartMarks||!nonText.focusIndicator?.passes||!nonText.focusInputBorder?.passes||nonTextTotals.statusChips===0||nonTextTotals.inputBorders===0||nonTextTotals.chartMarks===0) process.exitCode=1;
} finally {
    await browser?.close();
    await server.close();
}
