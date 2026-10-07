import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { evidenceRunId } from './evidence-run-id.mjs';
import { startDemoServer } from './session/demo-server.mjs';

const root = process.cwd();
const widths = [320, 390, 767, 768, 1024, 1279, 1280, 1440, 1920] as const;
const profiles = [
    { name: 'auth', path: '/login', role: 'link' as const, control: /Tiếp tục vào cửa hàng/ },
    { name: 'dashboard', path: '/s/shop-demo/overview', role: 'link' as const, control: /Xem việc cần làm|Xem đơn hàng|Tạo đơn hàng/ },
    { name: 'table', path: '/s/shop-demo/products', role: 'button' as const, control: /^Thêm sản phẩm$/ },
    { name: 'form', path: '/s/shop-demo/products/new', role: 'button' as const, control: /^Lưu sản phẩm$/ },
    { name: 'inbox', path: '/s/shop-demo/inbox/cv1', role: 'button' as const, control: /^Gửi trả lời$/ },
    { name: 'report', path: '/s/shop-demo/reports', role: 'button' as const, control: /^Tạo tệp báo cáo CSV$/ },
];

let demoUrl = '';
let stopDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    stopDemo = server.close;
});

test.afterAll(async () => stopDemo?.());

for (const width of widths) {
    test(`UI028.W29 ${width}px reflow retains representative actions and contains overflow`, async ({ page, browserName }) => {
        test.setTimeout(120_000);
        const issues: string[] = [];
        const pageErrors: string[] = [];
        const observations: Array<Record<string, unknown>> = [];
        await page.setViewportSize({ width, height: 900 });
        page.on('pageerror', error => pageErrors.push(error.message));

        for (const profile of profiles) {
            try {
                await page.goto(new URL(profile.path, demoUrl).toString(), { waitUntil: 'domcontentloaded' });
                const heading = page.getByRole('heading').first();
                await heading.waitFor({ state: 'visible', timeout: 8_000 });
                const control = profile.name === 'auth'
                    ? (await page.getByRole('link', { name: /Tiếp tục vào cửa hàng/ }).count()
                        ? page.getByRole('link', { name: /Tiếp tục vào cửa hàng/ }).first()
                        : page.getByRole('button', { name: /Vào tài khoản mô phỏng|Đăng nhập bằng tài khoản công ty/ }).first())
                    : page.getByRole(profile.role, { name: profile.control }).first();
                await control.waitFor({ state: 'visible', timeout: 8_000 });
                const geometry = await page.evaluate(() => {
                    const viewportWidth = document.documentElement.clientWidth;
                    const documentWidth = document.documentElement.scrollWidth;
                    const main = document.querySelector<HTMLElement>('main#main-content');
                    const mainStyle = main ? getComputedStyle(main) : null;
                    const permittedRegions = [...document.querySelectorAll<HTMLElement>('.MuiTableContainer-root,[data-horizontal-scroll]')]
                        .map(element => ({
                            kind: element.matches('.MuiTableContainer-root') ? 'table-container' : 'named-horizontal-region',
                            scrollWidth: element.scrollWidth,
                            clientWidth: element.clientWidth,
                            overflowX: getComputedStyle(element).overflowX,
                        }))
                        .filter(region => region.scrollWidth > region.clientWidth + 1);
                    return {
                        viewportWidth,
                        documentWidth,
                        pageOverflow: documentWidth - viewportWidth,
                        mainPaddingInlineStart: mainStyle ? Number.parseFloat(mainStyle.paddingInlineStart) || 0 : null,
                        mainPaddingInlineEnd: mainStyle ? Number.parseFloat(mainStyle.paddingInlineEnd) || 0 : null,
                        permittedHorizontalScrollRegions: permittedRegions,
                    };
                });
                const controlBox = await control.boundingBox();
                if (!controlBox) issues.push(`${width}px ${profile.name}: primary action has no measurable box`);
                else if (controlBox.x < -1 || controlBox.x + controlBox.width > width + 1)
                    issues.push(`${width}px ${profile.name}: primary action extends outside viewport`);
                if (geometry.pageOverflow > 1) issues.push(`${width}px ${profile.name}: page overflows by ${geometry.pageOverflow}px`);
                if (profile.path.startsWith('/s/')) {
                    const expectedGutter = width < 768 ? 16 : 24;
                    if (geometry.mainPaddingInlineStart !== expectedGutter || geometry.mainPaddingInlineEnd !== expectedGutter)
                        issues.push(`${width}px ${profile.name}: shell gutter=${geometry.mainPaddingInlineStart}/${geometry.mainPaddingInlineEnd}px; expected=${expectedGutter}px`);
                }
                observations.push({ width, profile: profile.name, path: profile.path, heading: (await heading.innerText()).trim(), primaryAction: await control.innerText(), primaryActionBox: controlBox, ...geometry });
            } catch (error) {
                issues.push(`${width}px ${profile.name}: ${(error as Error).message}`);
                observations.push({ width, profile: profile.name, path: profile.path, failure: (error as Error).message });
            }
        }

        try {
            await page.goto(new URL('/s/shop-demo/products/new', demoUrl).toString(), { waitUntil: 'domcontentloaded' });
            const name = page.getByRole('textbox', { name: 'Tên sản phẩm' });
            await name.fill(`W29 draft ${width}`);
            if (width < 1280) await page.getByRole('button', { name: 'Mở menu' }).click({ timeout: 8_000 });
            await page.getByRole('link', { name: 'Danh mục', exact: true }).filter({ visible: true }).click({ timeout: 8_000 });
            const dialog = page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?' });
            await dialog.waitFor({ state: 'visible', timeout: 8_000 });
            const dialogBox = await dialog.boundingBox();
            const dialogGeometry = await dialog.evaluate(element => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
            const actions = await Promise.all(['Tiếp tục chỉnh sửa', 'Rời màn hình'].map(async label => {
                const box = await dialog.getByRole('button', { name: label }).boundingBox();
                if (!box) issues.push(`${width}px dialog: ${label} has no measurable box`);
                else if (box.x < -1 || box.x + box.width > width + 1) issues.push(`${width}px dialog: ${label} extends outside viewport`);
                return { label, box };
            }));
            if (!dialogBox || dialogBox.x < -1 || dialogBox.x + dialogBox.width > width + 1)
                issues.push(`${width}px dialog: frame extends outside viewport`);
            if (dialogGeometry.scrollWidth > dialogGeometry.clientWidth + 1)
                issues.push(`${width}px dialog: content overflows horizontally`);
            observations.push({ width, profile: 'dirty-draft-dialog', dialogBox, dialogGeometry, actions });
        } catch (error) {
            issues.push(`${width}px dirty-draft-dialog: ${(error as Error).message}`);
            observations.push({ width, profile: 'dirty-draft-dialog', failure: (error as Error).message });
        }

        const report = {
            schemaVersion: 1,
            task: 'UI028.W29',
            scope: 'Local React Frontend with synthetic MSW; responsive profile actions, page containment, semantic gutter and dialog geometry',
            browser: browserName,
            viewport: { width, height: 900 },
            profiles: [...profiles.map(profile => profile.name), 'dirty-draft-dialog'],
            pageErrors,
            issues,
            observations,
        };
        const output = path.join(root, 'evidence/frontend-ui-improvements/UI028/W29', `responsive-profile-${browserName}-${width}-current-${evidenceRunId}.json`);
        fs.mkdirSync(path.dirname(output), { recursive: true });
        fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        console.log(`[w29-responsive-profile] ${JSON.stringify({ browser: browserName, width, profiles: observations.length, issues: issues.length, pageErrors: pageErrors.length, evidence: path.relative(root, output) })}`);
        expect(issues).toEqual([]);
        expect(pageErrors).toEqual([]);
    });
}
