import {chromium} from '@playwright/test';
import {startDemoServer} from '../../tests/session/demo-server.mjs';
import fs from 'node:fs';
const server=await startDemoServer({cacheIsolationKey:'inspect-master-geometry'}),browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:320,height:900}});
 await page.goto(server.url+'/s/shop-demo/customers/c1');await page.getByRole('table',{name:'Địa chỉ trong hồ sơ khách'}).waitFor();
 const geometry=await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,owners:[...document.querySelectorAll('main [data-ui-composition],main .MuiCard-root,main [role="region"]')].map(node=>({element:node.tagName,owner:node.getAttribute('data-ui-composition')||node.getAttribute('aria-label')||node.className,rect:node.getBoundingClientRect().toJSON(),minWidth:getComputedStyle(node).minWidth,columns:getComputedStyle(node).gridTemplateColumns,scrollWidth:node.scrollWidth}))}));
 const phase=process.argv.includes('--after')?'after':'before';console.log(JSON.stringify(geometry,null,2));fs.writeFileSync(`evidence/frontend-ux-completion-20261009/C05-overflow-${phase}.json`,JSON.stringify(geometry,null,2)+'\n');
 await page.screenshot({path:`evidence/frontend-ux-completion-20261009/C05-overflow-${phase}.png`});
 await page.goto(server.url+'/s/shop-demo/finance/accounts');await page.getByRole('button',{name:'Sửa tài khoản 111',exact:true}).click();
 console.log((await page.locator('[role="dialog"]').ariaSnapshot()));
 console.log(await page.locator('[role="dialog"]').locator('[role="combobox"]').evaluateAll(nodes=>nodes.map(node=>({html:node.outerHTML,labelledby:node.getAttribute('aria-labelledby')}))));
}finally{await browser.close();await server.close();}
