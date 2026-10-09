import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { chromium, firefox, expect } from '@playwright/test';

const frontend = path.resolve(import.meta.dirname, '../..'), repository = path.dirname(frontend);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const cold = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'clean-artifacts-components-20261008.json'), 'utf8'));
const artifactFiles = cold.artifacts.demoRepeat.files.map(file => ({ path: 'apps/web/dist-demo/' + file.path, sha256: file.sha256 }));
const checkArtifacts = () => { for (const file of artifactFiles) expect(hash(path.join(frontend, file.path))).toBe(file.sha256); };
checkArtifacts();
const port = 4175, origin = `http://127.0.0.1:${port}`, startedAt = new Date().toISOString(), observations = [];
const args = [path.join(frontend, 'node_modules/vite/bin/vite.js'), 'preview', '--outDir', 'dist-demo', '--host', '127.0.0.1', '--port', String(port), '--strictPort'];
const server = spawn(process.execPath, args, { cwd: path.join(frontend, 'apps/web'), windowsHide: true, stdio: 'pipe' });
let serverLog = '', failure = null;
for (const stream of [server.stdout, server.stderr]) stream.on('data', data => { serverLog += data; });
try {
    const deadline = Date.now() + 15000;
    while (true) {
        if (server.exitCode !== null) throw new Error('Isolated preview exited: ' + serverLog);
        try { if ((await fetch(origin)).status === 200) break; } catch { /* Await owned server readiness. */ }
        if (Date.now() > deadline) throw new Error('Preview startup timed out: ' + serverLog);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    for (const [name, engine] of [['chromium', chromium], ['firefox', firefox]]) {
        const browser = await engine.launch({ headless: true });
        try {
            const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
            page.on('dialog', dialog => { void dialog.accept(); });
            const errors = [], writes = [];
            page.on('pageerror', error => errors.push(error.message));
            page.on('request', request => { if (request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith('/customers/c1')) writes.push({ version: request.headers()['if-match'], body: request.postDataJSON() }); });
            await page.goto(origin + '/s/shop-demo/customers/c1');
            const nameField = page.getByLabel('Tên khách hàng', { exact: true }), notes = page.getByLabel('Ghi chú (không bắt buộc)', { exact: true });
            await expect(nameField).toHaveValue('Linh (khách mẫu)');
            const originalNotes = await notes.inputValue();
            await nameField.fill('Built local draft');
            const refetched = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/customers/c1'));
            const concurrentStatus = await page.evaluate(async () => (await fetch('/api/v2/shops/shop-demo/customers/c1', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'botsales-demo-csrf-not-a-real-secret', 'Idempotency-Key': crypto.randomUUID(), 'If-Match': '"1"' }, body: JSON.stringify({ notes: 'Built concurrent server note' }) })).status);
            expect(concurrentStatus).toBe(200); await refetched;
            await expect(nameField).toHaveValue('Built local draft'); await expect(notes).toHaveValue(originalNotes);
            await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
            const dialog = page.getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true });
            await expect(dialog).toBeVisible(); await expect(dialog.getByText('Built concurrent server note', { exact: true })).toBeVisible();
            await expect.poll(() => dialog.evaluate(element => {
                for (let current = element; current; current = current.parentElement)
                    if (Number(getComputedStyle(current).opacity) !== 1) return false;
                return true;
            })).toBe(true);
            const screenshot = path.join(import.meta.dirname, `built-comparison-${name}.png`); await dialog.screenshot({ path: screenshot });
            expect(writes).toHaveLength(1);
            await dialog.getByRole('button', { name: 'Áp dụng vào bản nháp', exact: true }).click();
            await expect(dialog).not.toBeVisible(); await expect(notes).toHaveValue('Built concurrent server note'); expect(writes).toHaveLength(1);
            const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.endsWith('/customers/c1'));
            await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
            expect((await saved).status()).toBe(200);
            expect(writes).toEqual([{ version: '"1"', body: { notes: 'Built concurrent server note' } }, { version: '"2"', body: { displayName: 'Built local draft' } }]);
            await expect(page.getByRole('heading', { name: 'Built local draft', exact: true })).toBeVisible();
            const stored = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/customers/c1')).json()).data);
            expect(stored.displayName).toBe('Built local draft'); expect(stored.notes).toBe('Built concurrent server note'); expect(stored.version).toBe(3);
            expect(errors).toEqual([]);
            const assets = await page.evaluate(() => performance.getEntriesByType('resource').map(resource => new URL(resource.name).pathname).filter(file => file.startsWith('/assets/')));
            expect(assets.some(file => file.includes('/draft-conflict-'))).toBe(true);
            const toolbar = [];
            for (const width of [1440, 320]) {
                await page.setViewportSize({ width, height: 900 });
                await page.goto(origin + '/s/shop-demo/products');
                await expect(page.getByRole('heading', { name: 'Sản phẩm', exact: true })).toBeVisible();
                await expect(page.getByText('Đã tải 3 lựa chọn', { exact: true })).toBeVisible();
                const input = page.getByRole('textbox', { name: 'Tìm kiếm', exact: true });
                const geometry = await input.evaluate(element => {
                    const form = element.closest('form'), button = form.querySelector('button[type=submit]');
                    return { buttonHeight: button.getBoundingClientRect().height, minimumHeight: parseFloat(getComputedStyle(button).minHeight), formHeight: form.getBoundingClientRect().height, documentWidth: document.documentElement.scrollWidth, searchFieldHeight: element.closest('.MuiOutlinedInput-root').getBoundingClientRect().height };
                });
                expect(geometry.buttonHeight).toBe(geometry.minimumHeight);
                expect(geometry.documentWidth).toBe(width);
                await expect(input.locator('xpath=ancestor::form').getByRole('textbox', { name: 'Tìm danh mục', exact: true })).toHaveCount(0);
                const picture = path.join(import.meta.dirname, `products-built-${name}-${width}.png`);
                await input.locator('xpath=ancestor::form/parent::*').screenshot({ path: picture });
                toolbar.push({ width, geometry, screenshot: { path: path.relative(repository, picture).replaceAll('\\', '/'), sha256: hash(picture) } });
            }
            expect(errors).toEqual([]);
            const components = [];
            for (const width of [320, 1440]) {
                await page.setViewportSize({width, height: 900});
                const geometry = async locator => locator.evaluate(node => {
                    const clone = node.cloneNode(true);
                    Object.assign(clone.style, {position: 'fixed', visibility: 'hidden', height: 'auto', width: node.getBoundingClientRect().width+'px', alignSelf: 'start'});
                    node.parentElement.append(clone);
                    const measurement = {actual: node.getBoundingClientRect().height, natural: clone.getBoundingClientRect().height};
                    clone.remove(); return measurement;
                });
                await page.goto(origin+'/s/shop-demo/orders/new');
                const remove = page.getByRole('button', {name: 'Bỏ dòng 1', exact: true});
                await expect(remove).toBeVisible();
                await page.getByRole('textbox', {name: 'Số lượng', exact: true}).fill('0');
                const order = await geometry(remove); expect(order.actual).toBeLessThanOrEqual(order.natural+1);
                await page.goto(origin+'/s/shop-demo/products/new');
                await expect(page.getByText('Đã tải 3 lựa chọn', {exact:true})).toBeVisible();
                const category = await page.getByRole('combobox', {name:/^Danh mục/}).boundingBox();
                const status = await page.locator('main').getByRole('combobox', {name:/^Trạng thái/}).boundingBox();
                if(width===1440) expect(Math.abs(category.y-status.y)).toBeLessThanOrEqual(1);
                else expect(status.y).toBeGreaterThan(category.y);
                await page.goto(origin+'/s/shop-demo/imports');
                const mapping = page.locator('main').getByRole('button', {name:'Bỏ', exact:true});
                await expect(mapping).toHaveCount(5);
                const imports = await geometry(mapping.first()); expect(imports.actual).toBeLessThanOrEqual(imports.natural+1);
                await page.goto(origin+'/s/shop-demo/orders');
                await page.locator('main a[href="/s/shop-demo/orders/DH-1001"]').click();
                await page.getByRole('button', {name:'Sửa đơn nháp', exact:true}).click();
                const edit = page.getByRole('dialog', {name:'Sửa đơn nháp', exact:true});
                await expect(edit.getByRole('group', {name:'Địa chỉ giao hàng (mẫu demo)', exact:true})).toBeVisible();
                await expect(edit.getByRole('group', {name:'Thanh toán', exact:true})).toBeVisible();
                await expect(edit.getByRole('combobox', {name:/Địa chỉ|Thanh toán/})).toHaveCount(0);
                expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
                const picture = path.join(import.meta.dirname, `order-readonly-built-${name}-${width}.png`);
                await edit.screenshot({path:picture});
                components.push({width, order, category, status, imports, readonlyAddress:true, readonlyPayment:true, screenshot:{path:path.relative(repository,picture).replaceAll('\\','/'),sha256:hash(picture)}});
                await page.keyboard.press('Escape'); await expect(edit).not.toBeVisible();
            }
            expect(errors).toEqual([]);
            observations.push({ browser: name, toolbar, components, result: 'PASS', writes, stored: { displayName: stored.displayName, notes: stored.notes, version: stored.version }, assets, pageErrors: errors, screenshot: { path: path.relative(repository, screenshot).replaceAll('\\', '/'), sha256: hash(screenshot) } });
        } finally { await browser.close(); }
    }
    checkArtifacts();
} catch (error) { failure = String(error.stack || error); process.exitCode = 1; }
finally {
    if (server.exitCode === null) { server.kill(); await new Promise(resolve => server.once('exit', resolve)); }
    const file = path.join(import.meta.dirname, 'built-comparison-review-current.json');
    fs.writeFileSync(file, JSON.stringify({ status: failure ? 'FAIL' : 'PASS', scope: 'Built dist-demo artifact; two isolated browser contexts with synthetic HTTP only; supplements the six-case built suite, does not change full-run counts.', execution: { executable: process.execPath, args: process.argv.slice(1), cwd: process.cwd(), exitCode: failure ? 1 : 0 }, startedAt, finishedAt: new Date().toISOString(), preview: { executable: process.execPath, args, cwd: path.join(frontend, 'apps/web'), origin }, artifactFiles, sourceFingerprints: { 'evidence/frontend-component-fixes-20261008/review-built-comparison.mjs': hash(import.meta.filename) }, observations, failure }, null, 2) + '\n');
    console.log(JSON.stringify({ status: failure ? 'FAIL' : 'PASS', browsers: observations.map(item => item.browser), failure, evidence: file }));
}
