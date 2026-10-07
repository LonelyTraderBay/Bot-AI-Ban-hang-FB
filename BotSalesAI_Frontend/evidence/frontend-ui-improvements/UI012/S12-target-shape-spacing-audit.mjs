import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {startDemoServer} from '../../../tests/session/demo-server.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../../..');
const manifest=JSON.parse(await fs.readFile(path.join(ROOT,'botsales-kit/contracts/route-manifest.json'),'utf8'));
const OUTPUT=path.join(HERE,'S12-target-shape-spacing-audit-20261003.json');
const DETAILS={conversationId:'cv1',customerId:'c1',productId:'p1',orderId:'DH-1001',knowledgeId:'k1',jobId:'missing-job'};
const TARGET_SELECTOR=[
    'a[href]','button','input:not([type="hidden"])','select','textarea',
    '[role="button"]','[role="link"]','[role="tab"]','[role="checkbox"]',
    '[role="radio"]','[role="switch"]','[role="menuitem"]',
].join(',');
const VIEWPORTS=[320,390];
const server=await startDemoServer({cacheIsolationKey:'ui012-target-shape-spacing'});
let browser;

try {
    browser=await chromium.launch({headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
    const page=await context.newPage();
    const pageErrors=[];
    const samples=[];
    let routeId='';
    page.on('pageerror',error=>pageErrors.push({routeId,message:error.message}));
    for(const width of VIEWPORTS) {
        await page.setViewportSize({width,height:844});
        for(const route of manifest.routes) {
            routeId=route.id;
            const routePath=route.path.replace(':shopId','shop-demo').replace(/:([A-Za-z]+)/g,(_,key)=>DETAILS[key]||'missing');
            await page.goto(new URL(routePath,server.url).toString(),{waitUntil:'domcontentloaded'});
            await page.locator('main#main-content h1').first().waitFor({state:'visible',timeout:20000});
            await page.locator('main#main-content .MuiLinearProgress-root').waitFor({state:'detached',timeout:20000}).catch(()=>{});
            await page.waitForTimeout(100);
            const routeSamples=await page.evaluate(({selector,routeId})=>{
                const measure=({selector,routeId,scopeSelector,state})=>{
                const px=(value,reference)=>value.endsWith('%')?parseFloat(value)*reference/100:parseFloat(value)||0;
                const radius=(style,name,width,height)=>{
                    const parts=style[name].trim().split(/\s+/);
                    return [px(parts[0]||'0px',width),px(parts[1]||parts[0]||'0px',height)];
                };
                const insideRoundedRect=(x,y,width,height,corners)=>{
                    const [tl,tr,br,bl]=corners;
                    if(x<tl[0]&&y<tl[1]&&tl[0]&&tl[1]) return ((x-tl[0])/tl[0])**2+((y-tl[1])/tl[1])**2<=1+1e-8;
                    if(x>width-tr[0]&&y<tr[1]&&tr[0]&&tr[1]) return ((x-(width-tr[0]))/tr[0])**2+((y-tr[1])/tr[1])**2<=1+1e-8;
                    if(x>width-br[0]&&y>height-br[1]&&br[0]&&br[1]) return ((x-(width-br[0]))/br[0])**2+((y-(height-br[1]))/br[1])**2<=1+1e-8;
                    if(x<bl[0]&&y>height-bl[1]&&bl[0]&&bl[1]) return ((x-bl[0])/bl[0])**2+((y-(height-bl[1]))/bl[1])**2<=1+1e-8;
                    return x>=-1e-8&&y>=-1e-8&&x<=width+1e-8&&y<=height+1e-8;
                };
                const hasSquare=(width,height,corners)=>{
                    const side=24;
                    if(width<side||height<side) return null;
                    const xs=new Set([0,width-side,(width-side)/2]);
                    const ys=new Set([0,height-side,(height-side)/2]);
                    xs.add(Math.max(0,Math.min(width-side,corners[0][0])));
                    xs.add(Math.max(0,Math.min(width-side,width-side-corners[1][0])));
                    xs.add(Math.max(0,Math.min(width-side,width-side-corners[2][0])));
                    xs.add(Math.max(0,Math.min(width-side,corners[3][0])));
                    ys.add(Math.max(0,Math.min(height-side,corners[0][1])));
                    ys.add(Math.max(0,Math.min(height-side,corners[3][1])));
                    ys.add(Math.max(0,Math.min(height-side,height-side-corners[1][1])));
                    ys.add(Math.max(0,Math.min(height-side,height-side-corners[2][1])));
                    for(const x of xs) for(const y of ys) {
                        const points=[[x,y],[x+side,y],[x,y+side],[x+side,y+side]];
                        if(points.every(([px,py])=>insideRoundedRect(px,py,width,height,corners))) return {x:Number(x.toFixed(2)),y:Number(y.toFixed(2))};
                    }
                    return null;
                };
                const nameOf=element=>{
                    const labelledBy=element.getAttribute('aria-labelledby')?.split(/\s+/).map(id=>document.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ');
                    return (element.getAttribute('aria-label')||labelledBy||element.getAttribute('title')||element.getAttribute('placeholder')||element.innerText||element.value||'').replace(/\s+/g,' ').trim().slice(0,100);
                };
                const scope=scopeSelector?document.querySelector(scopeSelector):document;
                if(!scope) return [];
                return [...scope.querySelectorAll(selector)].flatMap(element=>{
                    const style=getComputedStyle(element),rect=element.getBoundingClientRect();
                    if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0||rect.width<=0||rect.height<=0||rect.bottom<=0||rect.top>=innerHeight||rect.right<=0||rect.left>=innerWidth) return [];
                    const width=rect.width,height=rect.height;
                    const corners=[
                        radius(style,'borderTopLeftRadius',width,height),
                        radius(style,'borderTopRightRadius',width,height),
                        radius(style,'borderBottomRightRadius',width,height),
                        radius(style,'borderBottomLeftRadius',width,height),
                    ];
                    const horizontalSums=[corners[0][0]+corners[1][0],corners[3][0]+corners[2][0]];
                    const verticalSums=[corners[0][1]+corners[3][1],corners[1][1]+corners[2][1]];
                    const scale=Math.min(1,width/Math.max(...horizontalSums,1),height/Math.max(...verticalSums,1));
                    const normalized=corners.map(corner=>corner.map(value=>value*scale));
                    const clippedShape=style.clipPath!=='none'||style.maskImage!=='none'||style.webkitMaskImage!=='none';
                    const transformed=style.transform!=='none'&&!/^matrix\(1,\s*0,\s*0,\s*1,\s*0,\s*0\)$/.test(style.transform);
                    const unsupportedGeometry=clippedShape||transformed;
                    const squarePosition=unsupportedGeometry?null:hasSquare(width,height,normalized);
                    return [{
                        routeId,state,tag:element.tagName.toLowerCase(),role:element.getAttribute('role')||element.tagName.toLowerCase(),name:nameOf(element),
                        rect:{x:Number(rect.x.toFixed(2)),y:Number(rect.y.toFixed(2)),width:Number(width.toFixed(2)),height:Number(height.toFixed(2))},
                        boundsAtLeast24By24:width>=24&&height>=24,
                        borderRadius:style.borderRadius,
                        roundedCorners:normalized,
                        squarePosition,
                        inlineLink:element.tagName==='A'&&style.display==='inline',
                        disabled:element.hasAttribute('disabled')||element.getAttribute('aria-disabled')==='true',
                        unsupportedGeometry,
                    }];
                });
                };
                Object.assign(window,{__ui012MeasureTargets:measure});
                return measure({selector,routeId,scopeSelector:null,state:'default'});
            },{selector:TARGET_SELECTOR,routeId});
            samples.push(...routeSamples.map(sample=>({...sample,viewportWidthCssPx:width})));
            if(route.id==='R49') {
                const trigger=page.getByRole('button',{name:'Nhập bảng đối soát',exact:true});
                if(await trigger.count()!==1) throw new Error('The representative reconciliation import dialog trigger was not found.');
                await trigger.click();
                const dialog=page.getByRole('dialog',{name:'Nhập bảng đối soát'});
                await dialog.waitFor({state:'visible',timeout:10000});
                const dialogSamples=await page.evaluate(({selector,routeId})=>{
                    const measure=window.__ui012MeasureTargets;
                    return measure?measure({selector,routeId,scopeSelector:'[role="dialog"]',state:'dialog'}):[];
                },{selector:TARGET_SELECTOR,routeId});
                samples.push(...dialogSamples.map(sample=>({...sample,viewportWidthCssPx:width})));
                await page.keyboard.press('Escape');
                await dialog.waitFor({state:'detached',timeout:10000});
            }
        }
    }
    const groups=[];
    for(const width of VIEWPORTS) {
        const current=samples.filter(sample=>sample.viewportWidthCssPx===width);
        const indexByRoute=new Map();
        for(const sample of current) {
            const groupKey=sample.state+':'+sample.routeId;
            const list=indexByRoute.get(groupKey)||[];
            list.push(sample);
            indexByRoute.set(groupKey,list);
        }
        const targetResults=current.map(sample=>{
            if(sample.inlineLink) return {...sample,classification:'inline-exception'};
            if(sample.unsupportedGeometry) return {...sample,classification:'geometry-unassessed'};
            if(sample.squarePosition) return {...sample,classification:'24px-square-fits'};
            const peers=indexByRoute.get(sample.state+':'+sample.routeId)||[];
            const cx=sample.rect.x+sample.rect.width/2,cy=sample.rect.y+sample.rect.height/2;
            const collisions=peers.filter(other=>{
                if(other===sample) return false;
                const otherUndersized=!other.squarePosition&&!other.inlineLink&&!other.unsupportedGeometry;
                const dx=cx-(other.rect.x+other.rect.width/2),dy=cy-(other.rect.y+other.rect.height/2);
                if(otherUndersized) return dx*dx+dy*dy<24*24-1e-6;
                const nearestX=Math.max(other.rect.x,Math.min(cx,other.rect.x+other.rect.width));
                const nearestY=Math.max(other.rect.y,Math.min(cy,other.rect.y+other.rect.height));
                return (cx-nearestX)**2+(cy-nearestY)**2<12*12-1e-6;
            });
            return {...sample,classification:collisions.length?'spacing-review-required':'spacing-exception-geometry-pass',spacingCollisions:collisions.map(item=>({role:item.role,name:item.name,rect:item.rect}))};
        });
        groups.push({
            viewportWidthCssPx:width,
            routeCount:manifest.routes.length,
            visibleTargets:targetResults.length,
            squareFits:targetResults.filter(item=>item.classification==='24px-square-fits').length,
            inlineExceptions:targetResults.filter(item=>item.classification==='inline-exception').length,
            spacingExceptionGeometryPass:targetResults.filter(item=>item.classification==='spacing-exception-geometry-pass').length,
            spacingReviewRequired:targetResults.filter(item=>item.classification==='spacing-review-required').length,
            geometryUnassessed:targetResults.filter(item=>item.classification==='geometry-unassessed').length,
            notSquareFit:targetResults.filter(item=>!item.squarePosition&&!item.inlineLink&&!item.unsupportedGeometry).length,
            states:[...new Set(targetResults.map(item=>item.state))],
            defaultTargetCount:targetResults.filter(item=>item.state==='default').length,
            dialogTargetCount:targetResults.filter(item=>item.state==='dialog').length,
            routeCounts:manifest.routes.map(route=>({routeId:route.id,default:targetResults.filter(item=>item.routeId===route.id&&item.state==='default').length,dialog:targetResults.filter(item=>item.routeId===route.id&&item.state==='dialog').length})),
            nonSizePassTargets:targetResults.filter(item=>item.classification!=='24px-square-fits'&&item.classification!=='inline-exception'),
        });
    }
    const report={
        title:'UI012 target-shape and WCAG spacing-exception geometry sample',
        recordedAt:new Date().toISOString(),
        scope:'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        source:'React demo Vite server; synthetic MSW; Chromium mobile viewport/touch emulation',
        command:'node evidence/frontend-ui-improvements/UI012/S12-target-shape-spacing-audit.mjs',
        standard:{
            criterion:'WCAG 2.2 SC 2.5.8 Target Size (Minimum), Level AA',
            squareRequirementCssPx:24,
            spacingCircleDiameterCssPx:24,
            officialReference:'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum',
            methodNote:'A target meets the size limb only if an axis-aligned 24×24 CSS px square can fit inside the target shape. For an undersized target, the spacing sample checks whether a 24px-diameter circle centered on its bounding box intersects another target or another undersized target circle.',
        },
        method:{
            routeIds:manifest.routes.map(route=>route.id),
            viewportWidthsCssPx:VIEWPORTS,
            targetSelector:TARGET_SELECTOR,
            includedStates:'Visible default/success state on all 54 routes plus the opened bank reconciliation import dialog on R49; no menus, hover, pressed or validation-error state.',
            geometry:'Tests rounded-rectangle border geometry using the computed per-corner radii and a finite set of axis-aligned square placements. Clip-path, mask and non-identity transforms are reported unassessed. Spacing uses neighboring target bounding boxes conservatively.',
            limitations:'The finite candidate placements can prove a fitting square when one is found, but absence from this candidate set is classified only as a review candidate, not a definitive size failure. Bounding-box spacing that overlaps an irregular target is also a conservative review candidate. No inline, equivalent, user-agent, essential or interactive-state decision is inferred.',
        },
        routeCount:manifest.routes.length,
        pageErrors,
        groups,
    };
    await fs.writeFile(OUTPUT,JSON.stringify(report,null,2)+'\n','utf8');
    console.log(JSON.stringify({output:path.relative(ROOT,OUTPUT),routeCount:report.routeCount,groups:groups.map(({viewportWidthCssPx,visibleTargets,squareFits,inlineExceptions,spacingExceptionGeometryPass,spacingReviewRequired,geometryUnassessed,defaultTargetCount,dialogTargetCount})=>({viewportWidthCssPx,visibleTargets,defaultTargetCount,dialogTargetCount,squareFits,inlineExceptions,spacingExceptionGeometryPass,spacingReviewRequired,geometryUnassessed})),pageErrors:pageErrors.length},null,2));
} finally {
    await browser?.close();
    await server.close();
}
