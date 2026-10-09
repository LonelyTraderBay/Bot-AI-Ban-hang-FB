import fs from 'node:fs';
import { chromium } from 'playwright';
import { startDemoServer } from '../../tests/session/demo-server.mjs';
const server=await startDemoServer({cacheIsolationKey:'label-click-probe'}), browser=await chromium.launch(),page=await browser.newPage();
try {
 await page.goto(server.url+'/s/shop-demo/products/new');await page.getByRole('textbox',{name:'Tên sản phẩm',exact:true}).waitFor();
 const label=page.locator('main label').filter({hasText:/^Tên sản phẩm$/});
 const before=await label.evaluate(node=>({pointerEvents:getComputedStyle(node).pointerEvents,for:node.htmlFor,shrink:node.getAttribute('data-shrink')}));
 const bounds=await label.boundingBox();await page.mouse.click(bounds.x+5,bounds.y+bounds.height/2);
 const focused=await page.getByRole('textbox',{name:'Tên sản phẩm',exact:true}).evaluate(node=>node===document.activeElement);
 const record={checkedAt:new Date().toISOString(),before,focused,result:focused?'PASS':'FAIL'};
 fs.writeFileSync(new URL('./label-focus-probe-'+Date.now()+'.json',import.meta.url),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record));
}finally{await browser.close();await server.close();}
