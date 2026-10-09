import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import ts from 'typescript';
import { chromium, firefox, expect } from '@playwright/test';

const frontend = path.resolve(import.meta.dirname, '../..');
const repository = path.dirname(frontend);
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const relative = file => path.relative(repository, file).replaceAll('\\', '/');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(path.join(directory, item.name)) : [path.join(directory, item.name)]);
const files = walk(path.join(frontend, 'apps/web/src'));
const fingerprint = list => list.map(file => ({ path: relative(file), sha256: sha(file) }));
const sources = fingerprint([...files, path.join(frontend, 'packages/contracts/src/routes.json')]);
const artifacts = fingerprint(walk(path.join(frontend, 'apps/web/dist-demo')));
const manifest = JSON.parse(fs.readFileSync(path.join(frontend, 'packages/contracts/src/routes.json'), 'utf8'));
const seed = JSON.parse(fs.readFileSync(path.join(frontend, 'apps/web/src/mocks/seed.json'), 'utf8'));
const inventory = [];
const pageMap = new Map();
const routerFile = path.join(frontend, 'apps/web/src/app/router.tsx');
const router = ts.createSourceFile(routerFile, fs.readFileSync(routerFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function routerVisit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(router) === 'pages' && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
        for (const property of node.initializer.properties) if (ts.isPropertyAssignment(property)) pageMap.set(property.initializer.getText(router), property.name.getText(router));
    }
    ts.forEachChild(node, routerVisit);
}
routerVisit(router);
for (const file of files.filter(file => /modules[/\\].*\.tsx$/.test(file) || file.endsWith('draft-conflict.tsx'))) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
            const opening = ts.isJsxElement(node) ? node.openingElement : node;
            const tag = opening.tagName.getText(source);
            if (tag === 'SectionGrid') {
                let parent = node.parent;
                while (parent && !ts.isFunctionDeclaration(parent)) parent = parent.parent;
                const owner = parent?.name?.getText(source) || 'nested';
                const route = pageMap.get(owner);
                inventory.push({ path: relative(file), placement: file.includes(`${path.sep}modules${path.sep}`) ? 'module' : 'shared', line: source.getLineAndCharacterOfPosition(opening.getStart(source)).line + 1, owner, route, columns: opening.attributes.properties.find(p => p.name?.getText(source) === 'columns')?.initializer?.getText(source), children: ts.isJsxElement(node) ? node.children.filter(c => !ts.isJsxText(c) || c.text.trim()).map(child => ({ kind: ts.SyntaxKind[child.kind], expression: child.getText(source).slice(0, 190) })) : [] });
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
}
fs.writeFileSync(path.join(import.meta.dirname, 'source-inventory.json'), JSON.stringify({ recordedAt: new Date().toISOString(), modules: fs.readdirSync(path.join(frontend, 'apps/web/src/modules'), { withFileTypes: true }).filter(item => item.isDirectory()).map(item => item.name), sectionGrids: inventory, seedAIConnections: seed.aiConnections.map(({ id, shopId, name }) => ({ id, shopId, name })), sources }, null, 2) + '\n');

const temporary = net.createServer();
await new Promise((resolve, reject) => { temporary.once('error', reject); temporary.listen(0, '127.0.0.1', resolve); });
const port = temporary.address().port;
await new Promise(resolve => temporary.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const args = [path.join(frontend, 'node_modules/vite/bin/vite.js'), 'preview', '--outDir', 'dist-demo', '--host', '127.0.0.1', '--port', String(port), '--strictPort'];
const server = spawn(process.execPath, args, { cwd: path.join(frontend, 'apps/web'), windowsHide: true, stdio: 'pipe' });
let serverOutput = '', failure = null;
for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { serverOutput += chunk; });
const observations = [], aiStates = [], counterfactual = [];
const reportFile = path.join(import.meta.dirname, 'measurements.json');
const startedAt = new Date().toISOString();
const ids = { conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001', knowledgeId: 'k1', jobId: 'missing-job' };
const pathname = route => route.path.replace(':shopId', 'shop-demo').replace(/:([A-Za-z]+)/g, (_, key) => ids[key] || 'missing');
async function measure(page) {
    return page.evaluate(() => {
        const main = document.querySelector('main');
        const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
        if (!main) return { url: location.href, main: null };
        const m = rect(main), ms = getComputedStyle(main);
        const contentWidth = m.width - parseFloat(ms.paddingLeft) - parseFloat(ms.paddingRight);
        const describe = element => { const style = getComputedStyle(element); return { tag: element.tagName, heading: element.querySelector('h2')?.textContent || null, rect: rect(element), width: style.width, minWidth: style.minWidth, maxWidth: style.maxWidth, overflowX: style.overflowX, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }; };
        return {
            url: location.href, viewport: { width: innerWidth, height: innerHeight }, document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }, heading: main.querySelector('h1')?.textContent, main: { rect: m, contentWidth, paddingLeft: ms.paddingLeft, paddingRight: ms.paddingRight },
            grids: Array.from(main.querySelectorAll('[data-ui-composition="section-grid"]')).map(element => { const style = getComputedStyle(element); return { ...describe(element), columns: style.gridTemplateColumns, gap: style.gap, children: Array.from(element.children).map(child => ({ ...describe(child), fractionOfGrid: child.getBoundingClientRect().width / element.getBoundingClientRect().width })) }; }),
            boundedForms: Array.from(main.querySelectorAll('[data-ui-composition="form-fields"]')).filter(element => getComputedStyle(element).maxWidth !== 'none').map(element => ({ ...describe(element), fractionOfMainContent: element.getBoundingClientRect().width / contentWidth, parent: describe(element.parentElement) })),
            widthConstraints: Array.from(main.querySelectorAll('div,form')).filter(element => ['760px', '850px'].includes(getComputedStyle(element).maxWidth)).map(element => ({ ...describe(element), fractionOfMainContent: element.getBoundingClientRect().width / contentWidth, parent: describe(element.parentElement) })),
            detailGroups: Array.from(main.querySelectorAll('[data-ui-composition="surface-content"]')).filter(element => Array.from(element.children).some(child => child.matches('.MuiDivider-root'))).map(element => ({ ...describe(element), gap: getComputedStyle(element).gap, children: Array.from(element.children).map(child => ({ tag: child.tagName, text: child.textContent?.slice(0, 95), ...rect(child) })) })),
            panels: Array.from(main.querySelectorAll('.MuiPaper-root')).filter(element => element.querySelector('h2')).map(element => ({ ...describe(element), fractionOfMainContent: element.getBoundingClientRect().width / contentWidth })),
        };
    });
}
async function open(page, route, width) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(origin + pathname(route), { waitUntil: 'domcontentloaded' });
    await page.locator('main h1').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'), { timeout: 15000 });
    return measure(page);
}
try {
    const deadline = Date.now() + 15000;
    while (true) {
        if (server.exitCode !== null) throw new Error('Preview exited: ' + serverOutput);
        try { if ((await fetch(origin)).ok) break; } catch { /* Wait for the owned preview readiness only. */ }
        if (Date.now() > deadline) throw new Error('Preview readiness timeout');
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    const servedIndex = crypto.createHash('sha256').update(await (await fetch(origin)).text()).digest('hex');
    expect(servedIndex).toBe(sha(path.join(frontend, 'apps/web/dist-demo/index.html')));
    for (const [name, engine] of [['chromium', chromium], ['firefox', firefox]]) {
        const browser = await engine.launch({ headless: true });
        try {
            const page = await browser.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            for (const route of manifest.routes) {
                const result = await open(page, route, 1920);
                observations.push({ browser: name, route: route.id, module: route.module, state: 'default-seed', ...result });
                if (['R30', 'R33', 'R13', 'R42'].includes(route.id)) await page.locator('main').screenshot({ path: path.join(import.meta.dirname, `${route.id}-${name}-1920.png`) });
                if (observations.length % 12 === 0) console.log(JSON.stringify({ stage: 'routes', browser: name, completed: observations.length }));
            }
            const aiRoute = manifest.routes.find(route => route.id === 'R30');
            for (const width of [320, 768, 1279, 1280, 1440, 1920]) aiStates.push({ browser: name, state: 'one-connection', ...await open(page, aiRoute, width) });
            const grid = page.locator('[data-ui-composition="section-grid"]');
            await expect(grid.locator(':scope > .MuiPaper-root')).toHaveCount(1);
            const before = await measure(page);
            await grid.evaluate(element => { element.style.gridTemplateColumns = 'minmax(0, 1fr)'; });
            const after = await measure(page);
            counterfactual.push({ browser: name, kind: 'temporary-DOM-only-one-column', before, after });
            await page.reload();
            await expect(page.getByRole('button', { name: 'Thêm kết nối AI', exact: true })).toBeVisible();
            for (let count = 2; count <= 3; count++) {
                await page.getByRole('button', { name: 'Thêm kết nối AI', exact: true }).click();
                const dialog = page.getByRole('dialog', { name: 'Kết nối AI mới', exact: true });
                await dialog.getByLabel('Tên kết nối', { exact: true }).fill(`Đối chiếu bố cục ${count}`);
                await dialog.getByLabel('Model ID được adapter hỗ trợ', { exact: true }).fill('synthetic-model');
                await dialog.getByLabel('Khóa API', { exact: true }).fill('demo-key-width');
                await dialog.getByRole('button', { name: 'Lưu cấu hình', exact: true }).click();
                await expect(dialog).not.toBeVisible();
                await expect(grid.locator(':scope > .MuiPaper-root')).toHaveCount(count);
                aiStates.push({ browser: name, state: `${count}-connections-ephemeral-mock`, ...await measure(page) });
            }
            await page.goto(origin + pathname(aiRoute));
            await expect(grid.locator(':scope > .MuiPaper-root')).toHaveCount(1);
            await page.getByRole('combobox', { name: /Trạng thái thử/ }).click();
            await page.getByRole('option', { name: 'Danh sách rỗng (demo)', exact: true }).click();
            await expect(page.getByText('Trạng thái thử đã được áp dụng.', { exact: true })).toBeVisible();
            // SPA navigation triggers a fresh query while keeping this isolated mock control.
            await page.getByRole('link', { name: 'Kết nối Facebook', exact: true }).click();
            await page.locator('main h1').waitFor({ state: 'visible' });
            await page.getByRole('link', { name: 'Nhà cung cấp AI', exact: true }).click();
            await expect(page.getByText('Chưa có kết nối AI. Thêm một kết nối để cấu hình nhà cung cấp.', { exact: true })).toBeVisible();
            aiStates.push({ browser: name, state: 'empty-persistent-demo', ...await measure(page) });
            expect(errors).toEqual([]);
            console.log(JSON.stringify({ stage: 'browser-complete', browser: name, pageErrors: errors }));
        } finally { await browser.close(); }
    }
} catch (error) { failure = String(error.stack || error); process.exitCode = 1; }
finally {
    if (server.exitCode === null) { server.kill(); await new Promise(resolve => server.once('exit', resolve)); }
    const drift = [...sources, ...artifacts].filter(file => sha(path.join(repository, file.path)) !== file.sha256);
    if (drift.length) { failure = 'Source/artifact drift: ' + JSON.stringify(drift); process.exitCode = 1; }
    fs.writeFileSync(reportFile, JSON.stringify({ status: failure ? 'PARTIAL_DIAGNOSTIC' : 'DIAGNOSTIC_COMPLETE', scope: 'Read-only product source and compiled demo; isolated browser contexts, synthetic data only; DOM counterfactual is temporary and not a source fix. No full acceptance or release claim.', startedAt, finishedAt: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim(), execution: { executable: process.execPath, args: process.argv.slice(1), cwd: process.cwd(), exitCode: failure ? 1 : 0 }, diagnosticScriptSha256: sha(import.meta.filename), preview: { origin, args, cwd: path.join(frontend, 'apps/web') }, sourceDrift: drift, sources, artifacts, sourceInventory: inventory, observations, aiStates, counterfactual, failure }, null, 2) + '\n');
    console.log(JSON.stringify({ status: failure ? 'PARTIAL_DIAGNOSTIC' : 'DIAGNOSTIC_COMPLETE', routesMeasured: observations.length, aiStates: aiStates.length, sourceGrids: inventory.length, failure, reportFile }));
}
