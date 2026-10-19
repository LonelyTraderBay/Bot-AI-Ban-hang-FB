import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

const tokens = JSON.parse(fs.readFileSync('../botsales-kit/design/tokens.json','utf8'));
const output = process.env.UI_AUDIT_OUTPUT_DIR!;
const rgb = (hex:string) => { const s=hex.replace('#',''); return 'rgb('+[0,2,4].map(i=>parseInt(s.slice(i,i+2),16)).join(', ')+')'; };
let origin='', close:(()=>Promise<void>)|undefined;
test.beforeAll(async()=>{const server=await startDemoServer({cacheIsolationKey:'ui-consistency-audit'});origin=server.url;close=server.close;});
test.afterAll(async()=>close?.());
const profiles=[
 ['login','/login'],['workspaces','/workspaces'],['dashboard','/s/shop-demo/overview'],
 ['products','/s/shop-demo/products'],['order-form','/s/shop-demo/orders/new'],
 ['inbox','/s/shop-demo/inbox/cv1'],['finance','/s/shop-demo/finance'],['knowledge','/s/shop-demo/knowledge/k1'],
 ['reports','/s/shop-demo/reports']
] as const;
test('audit actual token/theme values, shared surfaces/actions and portal scope on representative route profiles',async({page,browserName,browser},info)=>{
 test.setTimeout(240_000);
 const observations:any[]=[],pageErrors:string[]=[];
 page.on('pageerror',e=>pageErrors.push(e.message));
 const ready=async(route:string)=>{await page.goto(origin+route);await expect(page.locator('main h1')).toBeVisible({timeout:30000});await expect(page.locator('main .MuiCircularProgress-root, main .MuiLinearProgress-root')).toHaveCount(0,{timeout:30000});};
 try{
  for(const width of [390,1440])for(const [profile,route] of profiles){
   await page.setViewportSize({width,height:900});await ready(route);
   const observed=await page.evaluate(()=>{
    const css=getComputedStyle(document.documentElement),body=getComputedStyle(document.body),main=document.querySelector('main')!;
    const visible=(e:Element)=>e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
    const styles=(e:Element)=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {text:e.textContent?.trim().slice(0,90),color:s.color,background:s.backgroundColor,radius:s.borderRadius,fontSize:s.fontSize,lineHeight:s.lineHeight,height:r.height,width:r.width,padding:s.padding,outline:s.outline};};
    return {cssColors:Object.fromEntries([...css].filter(k=>k.startsWith('--color-')).map(k=>[k,css.getPropertyValue(k).trim()])),colorScheme:css.colorScheme,body:styles(document.body),fontFamily:body.fontFamily,mainPadding:[getComputedStyle(main).paddingLeft,getComputedStyle(main).paddingRight],h1:styles(main.querySelector('h1')!),panels:[...main.querySelectorAll('[data-ui-density]')].filter(visible).map(styles),primaryButtons:[...main.querySelectorAll('.MuiButton-containedPrimary:not(.Mui-disabled)')].filter(visible).map(styles),inputs:[...main.querySelectorAll('.MuiInputBase-root')].filter(visible).map(styles),labels:[...main.querySelectorAll('.MuiInputLabel-outlined')].filter(visible).map(styles),documentWidth:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth};
   });
   expect(observed.colorScheme).toBe('dark');
   expect(observed.body.background).toBe(rgb(tokens.colors.canvas));
   for(const [key,value]of Object.entries(tokens.colors)as[string,string][]){
    const cssName='--color-'+key.replace(/[A-Z]/g,x=>'-'+x.toLowerCase());
    expect(observed.cssColors[cssName],profile+' '+cssName).toBe(value);
   }
   expect(observed.documentWidth).toBeLessThanOrEqual(observed.viewport);
   if(route.startsWith('/s/'))expect(observed.mainPadding).toEqual(width<768?['16px','16px']:['24px','24px']);
   for(const panel of observed.panels){expect(panel.background).toBe(rgb(tokens.colors.surface));expect(panel.radius).toBe(tokens.radius.card+'px');}
   for(const button of observed.primaryButtons){expect(button.background).toBe(rgb(tokens.colors.accent));expect(button.color).toBe(rgb(tokens.colors.onAccent));expect(button.radius).toBe(tokens.radius.control+'px');expect(button.height).toBeGreaterThanOrEqual(tokens.layout.touchTarget);}
   for(const label of observed.labels)expect(label.fontSize).toBe(tokens.fontSizes.meta+'px');
   observations.push({profile,route,width,...observed});
   if(['dashboard','products','inbox','order-form'].includes(profile)&&browserName==='chromium')await page.screenshot({path:path.join(output,info.project.name+'-'+profile+'-'+width+'.png'),fullPage:true});
  }
  for(const width of[390,1440]){
   await page.setViewportSize({width,height:900});await ready('/s/shop-demo/categories');
   const add=page.getByRole('button',{name:'Thêm danh mục',exact:true});
   await add.hover();await expect(add).toHaveCSS('background-color',rgb(tokens.colors.accentHover));
   await add.focus();await expect(add).toBeFocused();
   const focus=await add.evaluate(e=>({outline:getComputedStyle(e).outline,offset:getComputedStyle(e).outlineOffset}));
   expect(focus.outline).toContain('solid');
   await page.mouse.down();await expect(add).toHaveCSS('background-color',rgb(tokens.colors.accentPressed));await page.mouse.up();
   const dialog=page.getByRole('dialog',{name:'Thêm danh mục',exact:true});await expect(dialog).toBeVisible();
   await dialog.evaluate(async e=>{await Promise.all(e.closest('.MuiDialog-root')!.getAnimations({subtree:true}).map(a=>a.finished));});
   const overlay=await dialog.evaluate(e=>{const s=getComputedStyle(e),backdrop=e.closest('.MuiDialog-root')!.querySelector('.MuiBackdrop-root')!;return{background:s.backgroundColor,radius:s.borderRadius,backdrop:getComputedStyle(backdrop).backgroundColor,backdropOpacity:getComputedStyle(backdrop).opacity};});
   expect(overlay.background).toBe(rgb(tokens.colors.surface));expect(overlay.radius).toBe(tokens.radius.dialog+'px');
   observations.push({profile:'portal-dialog',width,focus,overlay});
   await page.screenshot({path:path.join(output,info.project.name+'-dialog-'+width+'.png'),fullPage:true});
   await dialog.getByRole('button',{name:'Hủy',exact:true}).click();await expect(dialog).toBeHidden();
  }
  await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});await ready('/s/shop-demo/products');
  const preferences=await page.evaluate(()=>({colorScheme:getComputedStyle(document.documentElement).colorScheme,bodyBackground:getComputedStyle(document.body).backgroundColor,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,lightPreference:matchMedia('(prefers-color-scheme: light)').matches}));
  expect(preferences.colorScheme).toBe('dark');expect(preferences.bodyBackground).toBe(rgb(tokens.colors.canvas));expect(preferences.reducedMotion).toBe(true);expect(preferences.lightPreference).toBe(true);
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
  const addProduct=page.getByRole('button',{name:'Thêm sản phẩm',exact:true});await addProduct.focus();
  const forced=await addProduct.evaluate(e=>({active:matchMedia('(forced-colors: active)').matches,outline:getComputedStyle(e).outlineStyle}));
  expect(forced.active).toBe(true);expect(forced.outline).toBe('solid');observations.push({profile:'system-preferences',preferences,forced});
  expect(pageErrors).toEqual([]);
 }finally{
  const report={scope:'Readonly audit of source snapshot; synthetic MSW demo; head 1fd4530609f4e69193a27b0d5a4959181e3f8fc9',browser:browserName,project:info.project.name,browserVersion:browser.version(),observations,pageErrors};
  fs.writeFileSync(path.join(output,'runtime-tokens-'+info.project.name+'.json'),JSON.stringify(report,null,2)+'\n');
  await info.attach('runtime-token-profile-observations',{body:JSON.stringify(report,null,2),contentType:'application/json'});
 }
});
