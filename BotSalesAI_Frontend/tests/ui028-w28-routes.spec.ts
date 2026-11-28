import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { evidenceRunId } from './evidence-run-id.mjs';
import { startDemoServer } from './session/demo-server.mjs';
import { expectedDocumentTitle } from './session/document-title';
import { frontendTestOutput } from '../scripts/test-output.mjs';

type Route = { id: string; path: string; title: string; module: string; readOperations: string[] };
type RouteManifest = { routes: Route[] };

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, '../botsales-kit/contracts/route-manifest.json'), 'utf8')) as RouteManifest;
const operations = JSON.parse(fs.readFileSync(path.join(root, 'packages/contracts/src/operations.json'), 'utf8')) as Record<string, { path: string }>;
const errorFixtures = new Set(['R14', 'R36']);
const screenHeadings: Record<string, string> = {
    R01: 'BotSales AI', R03: 'BotSales AI', R05: 'Hộp thư khách hàng', R06: 'Hộp thư khách hàng',
    R08: 'Linh (khách mẫu)', R11: 'Thông tin sản phẩm', R12: 'Danh mục', R14: 'Kết quả kiểm tra tệp',
    R18: 'Tạo đơn hàng', R19: 'Đơn DH-1001', R20: 'Thu chi', R21: 'Sổ thu chi', R22: 'Lợi nhuận',
    R23: 'Kiến thức cửa hàng', R24: 'Chính sách giao hàng', R25: 'Phản hồi cần duyệt',
    R26: 'Cấu hình Admin', R27: 'Thử bot', R28: 'Chất lượng AI', R31: 'Xuất báo cáo',
    R32: 'Nhân sự & quyền', R33: 'Cửa hàng', R34: 'Nhật ký', R35: 'Quyền riêng tư',
    R36: 'Công việc missing-job', R37: 'Công việc hôm nay', R38: 'Cần phê duyệt',
    R40: 'Điện thoại & lịch trực', R41: 'Chuẩn bị hàng', R42: 'Vận đơn & giao hàng',
    R43: 'Đổi trả', R44: 'Nhà cung cấp', R45: 'Đề nghị nhập', R47: 'Nhận hàng',
    R48: 'Chứng từ & sổ kép', R49: 'Đối soát', R50: 'Công nợ & khóa kỳ',
    R51: 'Bốn nhân viên AI', R52: 'Bản tin & sức khỏe', R53: 'Thông tin marketing',
    R54: 'Chăm sóc sau bán', R61: 'Xác nhận lựa chọn marketing', R65: 'Xác minh thu và hoàn tiền',
};
const detailIds: Record<string, string> = {
    conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001',
    knowledgeId: 'k1', jobId: 'missing-job',
};
const viewports = [{ width: 390, height: 844 }, { width: 1440, height: 900 }] as const;
const families = {
    overview: ['R04', 'R20', 'R22', 'R31', 'R52', 'R53'],
    workspace: ['R05', 'R06', 'R13', 'R25', 'R27', 'R35', 'R37', 'R38', 'R41', 'R43', 'R45', 'R46', 'R47', 'R49', 'R50', 'R63', 'R65'],
    list: ['R07', 'R09', 'R12', 'R16', 'R17', 'R21', 'R23', 'R28', 'R32', 'R34', 'R39', 'R42', 'R44', 'R48', 'R54', 'R55', 'R56', 'R64', 'R66', 'R67'],
    reconciliation: ['R15', 'R58', 'R59', 'R60'],
    detail: ['R08', 'R11', 'R14', 'R19', 'R24', 'R36'],
    form: ['R10', 'R18', 'R26', 'R29', 'R30', 'R33', 'R40', 'R51', 'R57', 'R62'],
    global: ['R01', 'R02', 'R03', 'R61'],
};
const assignedRoutes = Object.entries(families).flatMap(([family, ids]) => ids.map(id => [id, family] as const));
const profiles = new Map(assignedRoutes);
const capture = process.env.BOTSALES_LAYOUT_CAPTURE;
if (capture && capture !== 'before' && capture !== 'after') throw new Error('Use before or after for BOTSALES_LAYOUT_CAPTURE.');

let demoUrl = '';
let stopDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    stopDemo = server.close;
});

test.afterAll(async () => stopDemo?.());

function routePath(route: Route) {
    return route.path
        .replace(':shopId', 'shop-demo')
        .replace(/:([A-Za-z]+)/g, (_, key: string) => detailIds[key] || 'missing');
}

for (const viewport of viewports) {
    test(`UI028.W28 ${manifest.routes.length} canonical routes render with measured ${viewport.width}px layout geometry`, async ({ page, browserName }) => {
        test.setTimeout(300_000);
        const pageErrors: string[] = [];
        const issues: string[] = [];
        const observations: Array<Record<string, unknown>> = [];
        expect(assignedRoutes.map(([id]) => id).sort()).toEqual(manifest.routes.map(route => route.id).sort());
        expect(profiles.size).toBe(manifest.routes.length);
        page.on('pageerror', error => pageErrors.push(error.message));
        await page.setViewportSize(viewport);
        const captureRoot = capture && path.join(frontendTestOutput(root), evidenceRunId, capture, browserName, String(viewport.width));

        for (const route of manifest.routes) {
            const pathName = routePath(route);
            let headingText = '';
            let primaryStatus: number | undefined;
            let geometry: Record<string, number | null> = {};
            let screenshot: string | undefined;
            try {
                const primary = route.path.startsWith('/s/') ? operations[route.readOperations[0]] : undefined;
                const endpoint = primary && new RegExp(primary.path.replace(/\{[^}]+\}/g, '[^/]+') + '$');
                const response = endpoint ? page.waitForResponse(item =>
                    item.request().method() === 'GET' && endpoint.test(new URL(item.url()).pathname), { timeout: 15_000 }) : undefined;
                void response?.catch(() => {});
                await page.goto(new URL(pathName, demoUrl).toString(), { waitUntil: 'domcontentloaded' });
                const main = page.locator('main#main-content');
                const heading = main.getByRole('heading').first();
                await expect(heading).toBeVisible({ timeout: 15_000 });
                await expect(page).toHaveTitle(expectedDocumentTitle(route));
                await expect(main.getByText(/^Đang tải/)).toHaveCount(0, { timeout: 15_000 });
                await expect(main.getByRole('heading', { name: /^(Không thể mở màn hình|Không tìm thấy trang)$/ })).toHaveCount(0);
                if (capture !== 'before') await expect(heading).toHaveText(screenHeadings[route.id] ?? route.title);
                primaryStatus = (await response)?.status();
                if (primary && primaryStatus !== (errorFixtures.has(route.id) ? 404 : 200)) {
                    issues.push(`${route.id} ${pathName}: ${route.readOperations[0]} returned ${primaryStatus}`);
                }
                if (capture !== 'before' && viewport.width >= 1280 && ['R05', 'R06'].includes(route.id)) {
                    const draft = main.getByRole('complementary', { name: 'Đơn đang nhập' });
                    await expect(main.getByRole('region', { name: 'Lịch sử tin nhắn' })).toBeVisible();
                    await expect(draft.getByRole('heading', { name: 'Đơn đang nhập', exact: true })).toBeVisible();
                    await expect(draft.getByText('Chưa có bản đang nhập.', { exact: true })).toBeVisible();
                }
                await expect(main.getByRole('progressbar', { name: /^Đang tải/ })).toHaveCount(0, { timeout: 15_000 });
                headingText = (await heading.innerText()).trim();
                if (captureRoot) {
                    screenshot = path.join(captureRoot, `${route.id}.png`);
                    await page.screenshot({ path: screenshot, animations: 'disabled' });
                }

                geometry = await page.evaluate(() => {
                    const main = document.querySelector<HTMLElement>('main#main-content');
                    const heading = document.querySelector<HTMLElement>('main#main-content h1, main#main-content [role="heading"][aria-level="1"], h1');
                    const viewportWidth = document.documentElement.clientWidth;
                    const documentWidth = document.documentElement.scrollWidth;
                    if (!main) return { viewportWidth, documentWidth, pageOverflow: documentWidth - viewportWidth, mainPaddingInlineStart: null, mainPaddingInlineEnd: null, headingInsetFromMainContent: null };
                    const mainStyle = getComputedStyle(main);
                    const mainRect = main.getBoundingClientRect();
                    const headingRect = heading?.getBoundingClientRect();
                    const firstTable = main.querySelector('table');
                    const primaryRows = Array.from(firstTable?.tBodies[0]?.rows ?? []);
                    const thirdRow = primaryRows[2]?.getBoundingClientRect();
                    const firstControl = main.querySelector('input,select,button');
                    const hasAlert = Boolean(main.querySelector('[role="alert"]'));
                    const inlineStart = Number.parseFloat(mainStyle.paddingInlineStart) || 0;
                    return {
                        viewportWidth,
                        documentWidth,
                        pageOverflow: documentWidth - viewportWidth,
                        mainPaddingInlineStart: inlineStart,
                        mainPaddingInlineEnd: Number.parseFloat(mainStyle.paddingInlineEnd) || 0,
                        mainPaddingBlockStart: Number.parseFloat(mainStyle.paddingBlockStart) || 0,
                        mainPaddingBlockEnd: Number.parseFloat(mainStyle.paddingBlockEnd) || 0,
                        headingInsetFromMainContent: headingRect ? Math.round((headingRect.left - mainRect.left - inlineStart) * 100) / 100 : null,
                        headingFont: heading ? Number.parseFloat(getComputedStyle(heading).fontSize) : null,
                        standardHeading: Number(Boolean(heading?.hasAttribute('data-ui-page-title'))),
                        primaryRowCount: primaryRows.length,
                        firstTableTop: firstTable ? Math.round(firstTable.getBoundingClientRect().top) : null,
                        firstControlTop: firstControl ? Math.round(firstControl.getBoundingClientRect().top) : null,
                        thirdRowBottom: thirdRow ? Math.round(thirdRow.bottom) : null,
                        hasAlert: Number(hasAlert),
                    };
                });

                if (capture !== 'before') {
                    const gutters = [geometry.mainPaddingInlineStart, geometry.mainPaddingInlineEnd, geometry.mainPaddingBlockStart, geometry.mainPaddingBlockEnd];
                    if (gutters.some(gutter => gutter !== 8))
                        issues.push(`${route.id} ${pathName}: content insets ${gutters.join('/')}px, expected 8px on each side`);
                    const expectedFont = viewport.width === 390 ? 20 : 22;
                    if (geometry.standardHeading !== 1 || geometry.headingFont !== expectedFont)
                        issues.push(`${route.id} ${pathName}: page title font ${geometry.headingFont}px, expected shared ${expectedFont}px`);
                    if (profiles.get(route.id) === 'list' && viewport.width === 1440 && geometry.hasAlert === 0
                        && typeof geometry.thirdRowBottom === 'number' && geometry.thirdRowBottom > viewport.height)
                        issues.push(`${route.id} ${pathName}: third primary table row is below the initial viewport`);
                }
                if (typeof geometry.pageOverflow === 'number' && geometry.pageOverflow > 0)
                    issues.push(`${route.id} ${pathName}: document overflows viewport by ${geometry.pageOverflow}px`);
            } catch (error) {
                issues.push(`${route.id} ${pathName}: ${(error as Error).message}`);
            }
            observations.push({ routeId: route.id, path: pathName, title: route.title, profile: profiles.get(route.id), heading: headingText,
                state: errorFixtures.has(route.id) ? 'unknown-job' : 'fixture', primaryStatus, rendered: Boolean(headingText), screenshot, ...geometry });
        }

        const report = {
            schemaVersion: 1,
            task: 'UI028.W28',
            scope: 'Local React Frontend with synthetic MSW; route smoke and shared shell geometry only',
            browser: browserName,
            viewport,
            routeManifest: '../botsales-kit/contracts/route-manifest.json',
            expectedRoutes: manifest.routes.length,
            renderedRoutes: observations.filter(item => item.rendered).length,
            pageErrors,
            issues,
            observations,
        };
        const output = captureRoot ? path.join(captureRoot, 'routes.json')
            : path.join(root, 'evidence/frontend-ui-improvements/UI028/W28', `route-geometry-${browserName}-${viewport.width}-current-${evidenceRunId}.json`);
        fs.mkdirSync(path.dirname(output), { recursive: true });
        fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        console.log(`[w28-route-geometry] ${JSON.stringify({ browser: browserName, width: viewport.width, routes: report.renderedRoutes, issues: issues.length, pageErrors: pageErrors.length, evidence: path.relative(root, output) })}`);

        expect(report.renderedRoutes).toBe(manifest.routes.length);
        expect(issues).toEqual([]);
        expect(pageErrors).toEqual([]);
    });
}
