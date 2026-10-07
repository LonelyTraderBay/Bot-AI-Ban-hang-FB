import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { evidenceRunId } from './evidence-run-id.mjs';
import { startDemoServer } from './session/demo-server.mjs';

const root = process.cwd();
const scenarios = [
    { id: 'form-error-short', path: '/s/shop-demo/products/new', viewport: { width: 320, height: 480 } },
    { id: 'mobile-menu-long-label', path: '/s/shop-demo/overview', viewport: { width: 390, height: 560 } },
    { id: 'report-long-id', path: '/s/shop-demo/reports/marketing', viewport: { width: 640, height: 450 } },
    { id: 'inbox-long-composer', path: '/s/shop-demo/inbox/cv1', viewport: { width: 390, height: 560 } },
    { id: 'dialog-long-reason', path: '/s/shop-demo/inbox/cv1', viewport: { width: 320, height: 480 } },
] as const;

let demoUrl = '';
let stopDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    stopDemo = server.close;
});

test.afterAll(async () => stopDemo?.());

async function prepareScenario(page: import('@playwright/test').Page, id: string) {
    if (id === 'form-error-short') {
        await page.getByRole('textbox', { name: 'Tên sản phẩm' }).fill(`Tên sản phẩm tổng hợp ${'Bản thử dài '.repeat(10)}`);
        await page.getByRole('textbox', { name: 'SKU' }).fill(`SKU-${'IDENTIFIER-VERY-LONG-'.repeat(8)}`);
        await page.getByRole('textbox', { name: 'Giá bán (VND)' }).fill('0');
        await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
        const error = page.getByText('Giá phải lớn hơn 0', { exact: true });
        await error.waitFor({ state: 'visible', timeout: 8_000 });
        await error.evaluate(element => { element.textContent += ` · mã lỗi ${'PRICE-VALIDATION-IDENTIFIER-'.repeat(6)}`; });
        return { targets: ['main h1', 'input[name="name"]', 'input[name="variants.0.sku"]', 'button[type="submit"]'], focusTarget: 'button[type="submit"]' };
    }
    if (id === 'mobile-menu-long-label') {
        await page.getByRole('button', { name: 'Mở menu' }).click();
        const link = page.getByRole('link', { name: 'Sản phẩm', exact: true }).filter({ visible: true });
        await link.waitFor({ state: 'visible', timeout: 8_000 });
        await expect(page.locator('.MuiDrawer-paper').filter({ has: link })).toHaveCSS('transform', 'none');
        await link.evaluate(element => {
            element.dataset.w30LongLabel = 'true';
            element.append(document.createTextNode(` ${'Danh mục sản phẩm nhãn dài '.repeat(8)} ID-${'NAV-LONG-'.repeat(8)}`));
        });
        return { targets: ['[data-w30-long-label="true"]', 'main h1'], focusTarget: '[data-w30-long-label="true"]' };
    }
    if (id === 'report-long-id') {
        await page.locator('main#main-content').evaluate(element => {
            const node = document.createElement('p');
            node.dataset.w30LongId = 'true';
            node.textContent = `Mã công việc xuất ${'JOB-2026-IDENTIFIER-'.repeat(12)}`;
            element.prepend(node);
        });
        return { targets: ['[data-w30-long-id="true"]', 'main h1', 'button'], focusTarget: 'button' };
    }
    if (id === 'inbox-long-composer') {
        const composer = page.getByRole('textbox', { name: 'Nội dung trả lời khách' });
        await composer.fill(`Nội dung trả lời khách hàng tổng hợp. ${'Giải thích chi tiết về trạng thái đơn hàng, lựa chọn giao nhận và bước tiếp theo. '.repeat(20)}`);
        return { targets: ['textarea', 'button[type="submit"]', 'main h1'], focusTarget: 'textarea' };
    }
    const takeover = page.getByRole('button', { name: 'Tiếp quản', exact: true });
    await takeover.click();
    const dialog = page.getByRole('dialog', { name: 'Tiếp quản cuộc trò chuyện' });
    await dialog.waitFor({ state: 'visible', timeout: 8_000 });
    const reason = dialog.getByRole('textbox', { name: /Lý do/ });
    await reason.fill(`Lý do tổng hợp để kiểm tra reflow. ${'Mã hội thoại CV-2026-'.repeat(14)}`);
    return { targets: ['[role="dialog"]', '[role="dialog"] textarea', '[role="dialog"] button'], focusTarget: '[role="dialog"] textarea' };
}

for (const scenario of scenarios) {
    test(`UI028.W30 ${scenario.id}: 200% text and spacing stress at ${scenario.viewport.width}x${scenario.viewport.height}`, async ({ page, browserName }) => {
        test.setTimeout(90_000);
        const pageErrors: string[] = [];
        const issues: string[] = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        await page.setViewportSize(scenario.viewport);
        await page.goto(new URL(scenario.path, demoUrl).toString(), { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading').first().waitFor({ state: 'visible', timeout: 15_000 });
        const fixture = await prepareScenario(page, scenario.id);

        const scale = await page.evaluate(() => {
            const directText = (element: HTMLElement) => [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()));
            const textElements = [...document.querySelectorAll<HTMLElement>('body *')].filter(element => {
                if (!element.getClientRects().length) return false;
                return directText(element) || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(element.tagName);
            });
            const values = textElements.map(element => ({ element, size: Number.parseFloat(getComputedStyle(element).fontSize) })).filter(item => Number.isFinite(item.size) && item.size > 0);
            const style = document.createElement('style');
            style.dataset.w30SpacingOverride = 'true';
            style.textContent = `body.w30-text-stress *{letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important}body.w30-text-stress p{margin-block:2em!important}`;
            document.head.append(style);
            document.body.classList.add('w30-text-stress');
            for (const { element, size } of values) element.style.setProperty('font-size', `${size * 2}px`, 'important');
            return { scaledTextElements: values.length, devicePixelRatio: window.devicePixelRatio, cssViewport: { width: innerWidth, height: innerHeight }, actualBrowserZoom: 'NOT_MEASURED_BY_PLAYWRIGHT' };
        });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

        await page.locator(fixture.focusTarget).first().focus();
        await page.keyboard.press('Tab');
        const measured = await page.evaluate((selectors: string[]) => {
            const bounds = (element: HTMLElement) => {
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                return {
                    x: Math.round(rect.x * 100) / 100,
                    y: Math.round(rect.y * 100) / 100,
                    width: Math.round(rect.width * 100) / 100,
                    height: Math.round(rect.height * 100) / 100,
                    right: Math.round(rect.right * 100) / 100,
                    bottom: Math.round(rect.bottom * 100) / 100,
                    scrollWidth: element.scrollWidth,
                    clientWidth: element.clientWidth,
                    scrollHeight: element.scrollHeight,
                    clientHeight: element.clientHeight,
                    overflowX: style.overflowX,
                    overflowY: style.overflowY,
                    fontSize: style.fontSize,
                    textLength: element.innerText?.length || element.value?.length || 0,
                };
            };
            const targetGeometry = selectors.map(selector => {
                const element = document.querySelector<HTMLElement>(selector);
                return { selector, found: Boolean(element), ...(element ? bounds(element) : {}) };
            });
            const viewportWidth = document.documentElement.clientWidth;
            const documentWidth = document.documentElement.scrollWidth;
            const overflowCandidates = [...document.querySelectorAll<HTMLElement>('body *')]
                .filter(element => {
                    const rect = element.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0 && rect.right > viewportWidth + 1;
                })
                .map(element => {
                    const rect = element.getBoundingClientRect();
                    const style = getComputedStyle(element);
                    return {
                        tag: element.tagName.toLowerCase(),
                        className: typeof element.className === 'string' ? element.className.slice(0, 180) : '',
                        text: (element.innerText || '').slice(0, 100),
                        x: Math.round(rect.x * 100) / 100,
                        right: Math.round(rect.right * 100) / 100,
                        width: Math.round(rect.width * 100) / 100,
                        position: style.position,
                        overflowX: style.overflowX,
                    };
                })
                .sort((a, b) => b.right - a.right)
                .slice(0, 25);
            const textClips = [...document.querySelectorAll<HTMLElement>('main *,nav *,[role="dialog"] *')]
                .filter(element => {
                    if (element.tagName === 'LEGEND') return false;
                    const rect = element.getBoundingClientRect();
                    if (!rect.width || !rect.height || !element.innerText?.trim()) return false;
                    const style = getComputedStyle(element);
                    const clippedX = ['hidden', 'clip'].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 2;
                    const clippedY = ['hidden', 'clip'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 2;
                    return clippedX || clippedY;
                })
                .slice(0, 20)
                .map(element => ({ tag: element.tagName.toLowerCase(), role: element.getAttribute('role'), text: (element.innerText || '').slice(0, 100), ...bounds(element) }));
            const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            const focusStyle = active ? getComputedStyle(active) : null;
            const focusRect = active?.getBoundingClientRect();
            return {
                viewport: { width: innerWidth, height: innerHeight, clientWidth: viewportWidth, documentWidth, pageOverflow: documentWidth - viewportWidth, scrollHeight: document.documentElement.scrollHeight, scrollY },
                targets: targetGeometry,
                overflowCandidates,
                textClips,
                activeFocus: active && focusStyle && focusRect ? {
                    tag: active.tagName.toLowerCase(),
                    role: active.getAttribute('role'),
                    label: active.getAttribute('aria-label') || active.innerText?.slice(0, 80) || '',
                    outlineStyle: focusStyle.outlineStyle,
                    outlineWidth: focusStyle.outlineWidth,
                    outlineColor: focusStyle.outlineColor,
                    boxShadow: focusStyle.boxShadow,
                    bounds: { x: focusRect.x, right: focusRect.right, y: focusRect.y, bottom: focusRect.bottom },
                } : null,
            };
        }, fixture.targets);
        if (measured.viewport.pageOverflow > 1) issues.push(`Document horizontal overflow: ${measured.viewport.pageOverflow}px`);
        for (const target of measured.targets) {
            if (!target.found) issues.push(`Stress target missing after reflow: ${target.selector}`);
            else if (typeof target.x === 'number' && (target.x < -1 || Number(target.right) > scenario.viewport.width + 1))
                issues.push(`Target extends past viewport: ${target.selector} x=${target.x} right=${target.right}`);
        }
        const focus = measured.activeFocus;
        if (!focus || (focus.outlineStyle === 'none' || focus.outlineWidth === '0px') && focus.boxShadow === 'none')
            issues.push('Keyboard focus indicator was not measurable after simultaneous text/spacing stress');
        if (measured.textClips.length) issues.push(`Potential clipped text elements: ${measured.textClips.length}`);
        if (pageErrors.length) issues.push(`React page errors: ${pageErrors.length}`);

        const report = {
            schemaVersion: 1,
            task: 'UI028.W30',
            scenario: scenario.id,
            scope: 'Local React Frontend with synthetic MSW; DOM text-scale stress and CSS viewport, not actual browser chrome zoom',
            browser: browserName,
            viewportMode: 'Playwright CSS viewport profile; separately reported from browser zoom',
            textScale: { ratio: 2, method: 'each visible text element current computed font-size multiplied by 2 in the browser DOM', scaledTextElements: scale.scaledTextElements },
            spacingOverride: { letterSpacing: '0.12em', wordSpacing: '0.16em', lineHeight: 1.5, paragraphBlockMargin: '2em' },
            actualBrowserZoom: { result: 'NOT_MEASURED', devicePixelRatio: scale.devicePixelRatio, note: 'Playwright page automation does not expose browser chrome zoom; this report does not label DOM text scaling as actual browser zoom.' },
            pageErrors,
            issues,
            measurements: measured,
        };
        const output = path.join(root, 'evidence/frontend-ui-improvements/UI028/W30', `stress-${browserName}-${scenario.id}-current-${evidenceRunId}.json`);
        fs.mkdirSync(path.dirname(output), { recursive: true });
        fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        console.log(`[w30-stress] ${JSON.stringify({ browser: browserName, scenario: scenario.id, viewport: scenario.viewport, scaledTextElements: scale.scaledTextElements, issues: issues.length, pageErrors: pageErrors.length, evidence: path.relative(root, output) })}`);
        expect(issues).toEqual([]);
    });
}
