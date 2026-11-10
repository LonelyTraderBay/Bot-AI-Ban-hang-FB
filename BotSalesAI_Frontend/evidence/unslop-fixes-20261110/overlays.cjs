const fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, firefox, expect } = require('@playwright/test');
const out = __dirname;
const cases = [
    ['R07','customers','Thêm khách hàng'], ['R08','customers/c1','Thêm địa chỉ'],
    ['R12','categories','Thêm danh mục'], ['R15','inventory','Điều chỉnh'],
    ['R21','finance/entries','Tạo phiếu'], ['R23','knowledge','Thêm nguồn kiến thức'],
    ['R26','bot','Sửa bản nháp'], ['R28','bot/evaluations','Chạy đánh giá'],
    ['R29','integrations/channels','Chi tiết kết nối'], ['R30','integrations/ai','Thêm kết nối AI'],
    ['R32','settings/team','Mời nhân viên'], ['R35','settings/privacy','Tạo yêu cầu'],
    ['R37','operations','Chi tiết thao tác'], ['R38','approvals','Tạo ủy quyền có giới hạn'],
    ['R39','notifications','Chi tiết thông báo'], ['R42','shipments','Tạo vận đơn'],
    ['R43','returns','Tạo yêu cầu trả'], ['R44','suppliers','Thêm nhà cung cấp'],
    ['R45','replenishment','Thêm quy tắc'], ['R46','purchases','Tạo đơn mua'],
    ['R47','receipts','Tạo phiếu nhận'], ['R48','finance/journals','Tạo bút toán nháp'],
    ['R49','finance/reconciliation','Nhập bảng đối soát'], ['R50','finance/debts-periods','Tạo kỳ kế toán'],
    ['R54','service-cases','Tạo yêu cầu'], ['R55','settings/warehouses','Thêm kho'],
    ['R56','finance/accounts','Thêm tài khoản'], ['R57','finance/opening-balances','Tạo nháp mở sổ'],
];

(async () => {
    const { startDemoPreview } = await import(pathToFileURL(path.resolve('tests/session/demo-server.mjs')));
    const server = await startDemoPreview(), observations = [], uploads = [];
    fs.mkdirSync(path.join(out, 'overlays'), { recursive: true });
    try {
        await Promise.all([['chromium',chromium],['firefox',firefox]].map(async ([engine,type]) => {
            const browser = await type.launch(engine === 'chromium' ? { channel: 'chrome' } : {});
            try {
                for (const width of [1440,390]) {
                    const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 } });
                    const page = await context.newPage();
                    for (const [route,pathname,button] of cases) {
                        const record = { route, engine, width, button };
                        try {
                            await page.goto(`${server.url}/s/shop-demo/${pathname}`);
                            await expect(page.locator('main h1')).toBeVisible();
                            await expect(page.locator('main [role="progressbar"]')).toHaveCount(0, { timeout: 15000 });
                            const opener = page.getByRole('button', { name: button, exact: true }).first();
                            await opener.click({ timeout: 5000 });
                            const dialog = page.getByRole('dialog').filter({ visible: true }).first();
                            await expect(dialog).toBeVisible({ timeout: 5000 });
                            await expect(dialog.locator('..')).toHaveCSS('opacity','1');
                            await expect(dialog.getByRole('progressbar')).toHaveCount(0, { timeout: 15000 });
                            record.metrics = await dialog.evaluate(dialog => {
                                const r = dialog.getBoundingClientRect(), title = dialog.querySelector('.MuiDialogTitle-root');
                                const caption = title?.firstElementChild, close = title?.querySelector('button');
                                const t = caption?.getBoundingClientRect(), c = close?.getBoundingClientRect();
                                const controls = [...dialog.querySelectorAll('button,[role="combobox"]')].filter(e => e.getBoundingClientRect().width > 0);
                                return { title: title?.textContent, titleCenterDelta: t && c ? t.top+t.height/2-c.top-c.height/2 : null,
                                    titleAlign: title ? getComputedStyle(title).alignItems : null,
                                    viewportFits: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
                                    dialogOverflow: dialog.scrollWidth-dialog.clientWidth,
                                    small: controls.filter(e => e.getBoundingClientRect().height < 43.5 || e.getBoundingClientRect().width < 43.5).map(e => ({text:e.getAttribute('aria-label')||e.textContent,height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width})),
                                    focusInside: dialog.contains(document.activeElement), text: dialog.textContent.slice(0,12000) };
                            });
                            if (engine === 'chromium') {
                                record.screenshot = `overlays/${route}-${width}.png`;
                                await dialog.screenshot({ path: path.join(out,record.screenshot) });
                            }
                            for (let index=0;index<4;index++) await page.keyboard.press('Tab');
                            record.focusRemainsInside = await dialog.evaluate(e => e.contains(document.activeElement));
                            await page.keyboard.press('Escape');
                            record.escapeCloses = await dialog.waitFor({state:'hidden',timeout:3000}).then(()=>true,()=>false);
                            record.focusRestored = record.escapeCloses ? await expect(opener).toBeFocused({timeout:1000}).then(()=>true,()=>false) : false;
                            if (!record.escapeCloses) record.afterEscape = await page.getByRole('dialog').allTextContents();
                        } catch(e) { record.error = e.message; }
                        observations.push(record);
                        fs.appendFileSync(path.join(out,'overlays.ndjson'),JSON.stringify(record)+'\n');
                    }
                    await context.close();
                }
                for (const [route,pathname,label] of [['R10','products/new','Chọn ảnh'],['R11','products/p1','Chọn ảnh'],['R13','imports','Chọn CSV UTF-8']]) {
                    for (const key of ['Enter','Space','pointer']) {
                        const page=await browser.newPage({viewport:{width:1440,height:900}});
                        const record={route,engine,key};
                        try {
                            await page.goto(`${server.url}/s/shop-demo/${pathname}`);
                            const button=page.getByRole('button',{name:label,exact:true});
                            await expect(button).toBeVisible();
                            await button.focus();
                            const event=page.waitForEvent('filechooser',{timeout:2000}).then(chooser=>chooser,()=>null);
                            if(key==='pointer')await button.click();else await button.press(key==='Space'?'Space':key);
                            const chooser=await event;
                            record.opened=Boolean(chooser);
                            record.element=await button.evaluate(e=>e.outerHTML);
                            if(chooser)await chooser.setFiles([]);
                        }catch(e){record.error=e.message;}
                        uploads.push(record);
                        await page.close();
                    }
                }
            } finally { await browser.close(); }
        }));
    } finally { await server.close(); }
    fs.writeFileSync(path.join(out,'overlays.json'),JSON.stringify({expected:cases.length*4,observed:observations.length,observations,uploads},null,2));
    console.log(JSON.stringify({expected:cases.length*4,observed:observations.length,errors:observations.filter(x=>x.error).map(x=>({route:x.route,engine:x.engine,width:x.width,error:x.error.slice(0,150)})),escapeFailures:observations.filter(x=>x.escapeCloses===false).map(x=>({route:x.route,engine:x.engine,width:x.width})),uploadResults:uploads.map(({route,engine,key,opened,error})=>({route,engine,key,opened,error}))}));
})().catch(e=>{console.error(e);process.exitCode=1;});
