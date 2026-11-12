import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeIsolatedViteCacheServer, isolatedViteCacheDir } from '../../scripts/vite-cache.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.dirname(fileURLToPath(import.meta.url));
const stage = process.argv[2];
if (!['before', 'after'].includes(stage)) throw new Error('Expected before or after');
const runId = `module-structure-${stage}-${process.pid}`;
const cacheDir = isolatedViteCacheDir(root, 'module-structure-capture', runId);
const routes = [
  ['R17','/s/shop-demo/orders'], ['R18','/s/shop-demo/orders/new'], ['R19','/s/shop-demo/orders/DH-1001'], ['R43','/s/shop-demo/returns'],
  ['R37','/s/shop-demo/operations'], ['R38','/s/shop-demo/approvals'], ['R52','/s/shop-demo/operations/digests'],
  ['R33','/s/shop-demo/settings/shop'], ['R35','/s/shop-demo/settings/privacy'], ['R61','/consent/confirm'],
];
const files = ['apps/web/src/modules/orders/index.tsx','apps/web/src/modules/operations/index.tsx','apps/web/src/modules/workspace/index.tsx','apps/web/src/app/router.tsx','apps/web/src/app/Shell.tsx','apps/web/src/shared/api/hooks.ts','tests/fe012-source-map.test.mjs','tests/fe013-source-map.test.mjs','tests/fe020-source-map.test.mjs','tests/vertical-slices/fe022-flows.spec.ts','apps/web/vite.config.ts','playwright.config.ts','docs/FRONTEND_SPACING_STANDARD.md','docs/route-source-map.json'];
let server, browser;
try {
  server = await createServer({ configFile:path.join(root,'apps/web/vite.config.ts'), root:path.join(root,'apps/web'), mode:'demo', cacheDir, logLevel:'error', server:{host:'127.0.0.1',port:0} });
  await server.listen(); const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
  browser=await chromium.launch({channel:'chrome',headless:true});
  const captures=[];
  for (const [id,route] of routes) for (const [size,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]) {
    const context=await browser.newContext({viewport}); const page=await context.newPage();
    await page.goto(origin+route); await page.locator('main h1').first().waitFor();
    await page.waitForFunction(() => !document.querySelector('main [role="progressbar"]'), {timeout:30000});
    const title=await page.locator('main h1').first().innerText();
    const file=`${stage}-${id}-${size}.png`; await page.screenshot({path:path.join(out,file),fullPage:true});
    captures.push({id,route,size,viewport,title,file,sha256:createHash('sha256').update(await readFile(path.join(out,file))).digest('hex')});
    await context.close();
  }
  const hashes={}; for (const file of files) hashes[file]=createHash('sha256').update(await readFile(path.join(root,file))).digest('hex');
  await writeFile(path.join(out,`${stage}.json`),JSON.stringify({stage,gitHead:'60900d41a90799e8f6d43e24f31989a50cb5956c',capturedAt:new Date().toISOString(),browser:browser.version(),captures,hashes},null,2)+'\n');
  console.log(`${stage}: ${captures.length} loaded route/viewport captures`);
} finally { await browser?.close(); await closeIsolatedViteCacheServer(server,root,'module-structure-capture',runId); }
