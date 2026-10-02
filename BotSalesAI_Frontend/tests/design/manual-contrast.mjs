import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {startDemoServer} from '../session/demo-server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUTPUT = path.join(ROOT, 'botsales-kit/execution/frontend-evidence/FE006/S04-contrast-manual.json');

const server = await startDemoServer();
let browser;
try {
    browser = await chromium.launch({headless:true});
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    await page.goto(`${server.url}/s/shop-demo/overview`,{waitUntil:'domcontentloaded'});
    await page.locator('main#main-content h1').waitFor({state:'visible',timeout:20000});
    const samples = await page.evaluate(() => {
        const parse = value => {
            const match = value.match(/^rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)(?:,\s*(\d+(?:\.\d+)?))?\)$/);
            return match ? {rgb:match.slice(1,4).map(Number),alpha:match[4] === undefined ? 1 : Number(match[4])} : null;
        };
        const blend = (foreground,background,alpha) => foreground.map((channel,index)=>Math.round(channel*alpha+background[index]*(1-alpha)));
        const rootColor = parse(getComputedStyle(document.documentElement).backgroundColor)?.rgb ?? [17,19,24];
        const walker = document.createTreeWalker(document.querySelector('main#main-content'),NodeFilter.SHOW_TEXT);
        const result = [];
        for(let node; (node=walker.nextNode());) {
            const text = node.nodeValue?.replace(/\s+/g,' ').trim();
            if(!text) continue;
            const parent = node.parentElement;
            if(!parent || !node.parentElement.getClientRects().length) continue;
            const style = getComputedStyle(parent);
            if(style.visibility==='hidden'||style.display==='none'||Number(style.opacity)===0) continue;
            const foreground = parse(style.color);
            if(!foreground) continue;
            const layers = [];
            for(let element=parent;element;element=element.parentElement) {
                const color=parse(getComputedStyle(element).backgroundColor);
                if(color&&color.alpha>0) layers.push(color);
            }
            let background=rootColor;
            for(const layer of layers.reverse()) background=blend(layer.rgb,background,layer.alpha);
            const effectiveForeground=blend(foreground.rgb,background,foreground.alpha);
            const fontSize=parseFloat(style.fontSize)||16;
            const weight=Number.parseInt(style.fontWeight,10)||400;
            const large=fontSize>=24||(fontSize>=18.66&&weight>=700);
            const ratio=(Math.max(...[effectiveForeground,background].map(rgb=>{
                const channel=value=>{const v=value/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
                return .2126*channel(rgb[0])+.7152*channel(rgb[1])+.0722*channel(rgb[2]);
            }))+0.05)/(Math.min(...[effectiveForeground,background].map(rgb=>{
                const channel=value=>{const v=value/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
                return .2126*channel(rgb[0])+.7152*channel(rgb[1])+.0722*channel(rgb[2]);
            }))+0.05);
            result.push({text:text.slice(0,120),element:parent.tagName.toLowerCase(),fontSizePx:fontSize,fontWeight:weight,threshold:large?3:4.5,contrastRatio:Number(ratio.toFixed(2)),passes:ratio>=(large?3:4.5)});
        }
        return result;
    });
    if(!samples.length) throw new Error('No visible text samples were measured.');
    const failures=samples.filter(sample=>!sample.passes);
    const report={scope:'FRONTEND_WITH_SYNTHETIC_MOCK_API',route:'/s/shop-demo/overview',viewport:{width:1440,height:1000},method:'Rendered visible text nodes; composited computed foreground/background colors; WCAG 2.x text contrast thresholds (4.5:1 normal, 3:1 large).',sampleCount:samples.length,failedCount:failures.length,minimumRatio:Math.min(...samples.map(sample=>sample.contrastRatio)),lowestSamples:[...samples].sort((a,b)=>a.contrastRatio-b.contrastRatio).slice(0,10),failures};
    await fs.mkdir(path.dirname(OUTPUT),{recursive:true});
    await fs.writeFile(OUTPUT,JSON.stringify(report,null,2)+'\n','utf8');
    console.log(JSON.stringify({route:report.route,viewport:report.viewport,sampleCount:report.sampleCount,failedCount:report.failedCount,minimumRatio:report.minimumRatio,output:path.relative(ROOT,OUTPUT)},null,2));
    if(failures.length) process.exitCode=1;
} finally {
    await browser?.close();
    await server.close();
}
