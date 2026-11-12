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
if (!['before', 'after'].includes(stage)) throw new Error('stage must be before or after');
const runId = `data-sync-${stage}-${process.pid}`;
const cacheDir = isolatedViteCacheDir(root, 'data-sync-capture', runId);
let server, browser;
const files = ['apps/web/src/shared/api/hooks.ts', 'apps/web/src/modules/finance/index.tsx', 'apps/web/src/modules/inbox/index.tsx', 'apps/web/src/modules/orders/index.tsx', 'apps/web/src/modules/orders/draft-form.tsx', 'tests/data-sync-cross-page.spec.ts', 'apps/web/vite.config.ts', 'playwright.config.ts', 'docs/FRONTEND_SPACING_STANDARD.md'];
try {
  server = await createServer({ configFile: path.join(root, 'apps/web/vite.config.ts'), root: path.join(root, 'apps/web'), mode: 'demo', cacheDir, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const captures = [];
  for (const [name, route, title] of [['overview','overview','Tổng quan cửa hàng'], ['inbox','inbox/cv1','Hộp thư khách hàng'], ['order','orders/DH-1001','Đơn DH-1001'], ['entries','finance/entries','Sổ thu chi']]) {
    for (const [size, viewport] of [['desktop',{width:1440,height:900}], ['mobile',{width:390,height:844}]]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await page.goto(`${origin}/s/shop-demo/${route}`);
      await page.getByRole('heading', {name:title, exact:true}).waitFor();
      await page.locator('main#main-content').waitFor();
      await page.locator('main [role=progressbar]').first().waitFor({state:'hidden'}).catch(() => {});
      const nameFile = `${stage}-${name}-${size}.png`;
      await page.screenshot({path:path.join(out,nameFile), fullPage:true});
      captures.push({route, size, viewport, title, file:nameFile, sha256:createHash('sha256').update(await readFile(path.join(out,nameFile))).digest('hex')});
      await context.close();
    }
  }
  const hashes = {};
  for (const file of files) hashes[file] = createHash('sha256').update(await readFile(path.join(root,file))).digest('hex');
  await writeFile(path.join(out,`${stage}.json`),JSON.stringify({stage,revision:'a458ea926bf3a54e424f50f7c7b91b5fe096b71f',capturedAt:new Date().toISOString(), browser:browser.version(), captures, hashes},null,2)+'\n');
  console.log(`${stage}: captured ${captures.length} loaded route/viewport combinations`);
} finally {
  await browser?.close();
  await closeIsolatedViteCacheServer(server, root, 'data-sync-capture', runId);
}

