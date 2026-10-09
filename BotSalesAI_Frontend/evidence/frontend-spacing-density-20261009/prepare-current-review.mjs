import fs from 'node:fs'; import path from 'node:path';
const output=import.meta.dirname, root=path.resolve(output,'../..'), previous=path.join(root,'evidence/frontend-shared-consolidation-20261009');
const namespace='evidence/frontend-spacing-density-20261009';
const additions=[
 {id:'products',route:'/s/shop-demo/products',targets:['main form button[type="submit"]'],focus:'main input[placeholder]'},
 {id:'ai',route:'/s/shop-demo/integrations/ai',targets:['main [data-ui-detail-line]'],focus:'main button'},
 {id:'category-dialog',route:'/s/shop-demo/categories',targets:['[role="dialog"] .MuiDialogContent-root'],focus:'[role="dialog"] input',open:'Thêm danh mục'},
 {id:'reading',route:'/s/shop-demo/knowledge/k1',targets:['main [data-ui-density="comfortable"]'],focus:'main textarea'},
];
for(const name of ['capture-shared-browser-zoom.mjs','capture-shared-text-zoom.mjs','native-label-route-probes.mjs','record-native.mjs','review-built-shared.mjs','capture-contract-crosswalk.mjs','review-tooling-imports.mjs','publish-current-proofs.mjs']) {
 const target=path.join(output,name); if(fs.existsSync(target))throw Error('Already prepared '+name);
 let s=fs.readFileSync(path.join(previous,name),'utf8').replaceAll('evidence/frontend-shared-consolidation-20261009',namespace);
 if(name.startsWith('capture-shared-')) {
  const existing=JSON.parse(s.match(/^const scenarios = (.*);$/m)[1]);
  s=s.replace(/^const scenarios = .*;$/m,'const scenarios = '+JSON.stringify([...existing,...additions.map(row=>({...row,...(name.includes('browser')?{path:row.route}:{viewport:{width:390,height:800}})}))])+';');
  const sources=JSON.parse(s.match(/^const sourceInputs = (.*);$/m)[1]);
  for(const file of ['apps/web/src/modules/integrations/index.tsx','apps/web/src/modules/knowledge/index.tsx','tests/ui-density-layout.spec.ts'])if(!sources.includes(file))sources.push(file);
  s=s.replace(/^const sourceInputs = .*;$/m,'const sourceInputs = '+JSON.stringify(sources)+';');
  if(name.includes('browser'))s=s.replace('async function prepare(page, scenario) {','async function prepare(page, scenario) {\n    if(scenario.open) await page.getByRole("button",{name:scenario.open,exact:true}).click();\n    if(scenario.open) await page.getByRole("dialog").evaluate(async element=>{await Promise.all(element.closest(".MuiDialog-root").getAnimations({subtree:true}).map(a=>a.finished));});');
  else s=s.replace('async function prepareScenario(send, context, scenario) {',`async function prepareScenario(send, context, scenario) {
    if(scenario.open) await evaluateString(send, context, \`new Promise((resolve,reject)=>{const start=Date.now();const check=()=>{const button=[...document.querySelectorAll('main button')].find(e=>e.textContent.trim()===\${JSON.stringify(scenario.open)});if(button){button.click();resolve('opened-real-dialog');}else if(Date.now()-start>15000)reject(Error('Dialog trigger missing'));else setTimeout(check,50);};check();})\`);
`);
 }
 if(name==='record-native.mjs')s=s.replace("[['actual-browser-zoom-200-current-', 3], ['native-text-only-200-current-', 5]]","[['actual-browser-zoom-200-current-', 7], ['native-text-only-200-current-', 9]]").replace('Eight deep affected R04/R05/R06 profiles','Sixteen deep Inbox/dashboard/products/AI/category-dialog/reading profiles');
 if(name==='review-built-shared.mjs') {
  s=s.replace("['R04','R05','R06']","['R04','R05','R06',...routes.filter(r=>['/s/:shopId/products','/s/:shopId/integrations/ai','/s/:shopId/categories','/s/:shopId/knowledge/:knowledgeId'].includes(r.path)).map(r=>r.id)]");
  s=s.replace('expect(details).toHaveLength(30)','expect(details).toHaveLength(70)');
  s=s.replace('geometry/axe/keyboard on R04/R05/R06','geometry/axe/keyboard on seven affected routes');
  // Default route probes plus ordinary dialog; no mutation requests needed.
  s=s.replace("const violations=(await new AxeBuilder",`if(route.path.endsWith('/categories')){await page.getByRole('button',{name:'Thêm danh mục',exact:true}).click();await page.getByRole('dialog').evaluate(async element=>{await Promise.all(element.closest('.MuiDialog-root').getAnimations({subtree:true}).map(a=>a.finished));});const dialogAxe=(await new AxeBuilder({page}).include('[role="dialog"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;expect(dialogAxe).toEqual([]);actual.dialogAxeViolations=0;await page.keyboard.press('Escape');}
    const violations=(await new AxeBuilder`);
 }
 fs.writeFileSync(target,s);
}
console.log('Prepared current compiled and actual native review runners with broader density owner scope.');
