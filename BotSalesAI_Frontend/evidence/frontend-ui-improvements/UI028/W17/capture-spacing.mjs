import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const root = process.cwd();
const evidence = path.join(root, 'evidence/frontend-ui-improvements/UI028/W17');
const phase = process.argv.includes('--after') ? 'after' : 'before';
const sourcePath = path.join(root, 'apps/web/src/modules/knowledge/index.tsx');
const sourceSha256 = createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
const captures = [];
const pageErrors = [];
const setupWrites = [];
const captureWrites = [];
const browser = await chromium.launch();

function refuseOverwrite(file) {
    if (fs.existsSync(file)) throw new Error(`Refusing to overwrite W17 ${phase} evidence: ${file}`);
}

async function capture(page, name, route, state, viewport) {
    const file = path.join(evidence, `${phase}-${name}-${viewport.width}.png`);
    refuseOverwrite(file);
    await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
    const geometry = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        clientHeight: document.documentElement.clientHeight,
        scrollHeight: document.documentElement.scrollHeight,
    }));
    const dialog = page.getByRole('dialog').first();
    const dialogBounds = await dialog.isVisible().catch(() => false) ? await dialog.boundingBox() : null;
    captures.push({ route, state, viewport, screenshot: path.basename(file), ...geometry, dialogBounds });
}

async function openRoute(page, server, route, heading) {
    await page.goto(new URL(route, server.url).toString());
    if (heading) await page.getByRole('heading', { name: heading, exact: true }).waitFor();
    await page.waitForLoadState('networkidle');
}

try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
        const currentServer = await startDemoServer({ cacheIsolationKey: `ui028-w17-${phase}-${viewport.width}` });
        const page = await browser.newPage({ viewport });
        let captureStarted = false;
        page.on('pageerror', error => pageErrors.push(error.message));
        page.on('request', request => {
            const url = new URL(request.url());
            if (url.pathname.startsWith('/api/v2/') && request.method() !== 'GET') {
                (captureStarted ? captureWrites : setupWrites).push(`${request.method()} ${url.pathname}`);
            }
        });

        try {
            await openRoute(page, currentServer, '/s/shop-demo/knowledge', 'Kiến thức cửa hàng');
            await page.getByRole('table').first().waitFor();
            captureStarted = true;
            await capture(page, 'r23-knowledge-list', 'R23', 'collection', viewport);
            await page.getByRole('button', { name: 'Thêm nguồn kiến thức', exact: true }).click();
            await page.getByRole('dialog', { name: 'Nguồn kiến thức mới' }).waitFor();
            await capture(page, 'r23-create-source-dialog', 'R23', 'create-source-dialog', viewport);

            await openRoute(page, currentServer, '/s/shop-demo/knowledge/k3', 'Chính sách đổi hàng');
            await page.getByRole('heading', { name: 'Lịch sử phiên bản', exact: true }).waitFor();
            await capture(page, 'r24-draft-detail', 'R24', 'draft-detail-and-history', viewport);
            await page.getByRole('button', { name: 'Sửa bản nháp', exact: true }).click();
            await page.getByRole('dialog', { name: 'Sửa nháp' }).waitFor();
            await capture(page, 'r24-edit-draft-dialog', 'R24', 'edit-draft-dialog', viewport);

            captureStarted = false;
            await openRoute(page, currentServer, '/s/shop-demo/inbox/cv1', '');
            const feedbackAction = page.getByRole('button', { name: /^Đánh giá tin nhắn/ }).first();
            await feedbackAction.waitFor();
            await feedbackAction.click();
            const createFeedback = page.getByRole('dialog', { name: 'Đánh giá câu trả lời' });
            await createFeedback.getByRole('textbox', { name: 'Nội dung đề xuất sửa' }).fill('Kiểm tra điều kiện theo chính sách đã duyệt.');
            const feedbackResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/feedback'));
            await createFeedback.getByRole('button', { name: 'Lưu phản hồi', exact: true }).click();
            if ((await feedbackResponse).status() !== 201) throw new Error('Synthetic feedback setup did not return 201');
            captureStarted = true;
            await page.evaluate(() => {
                window.history.pushState({}, '', '/s/shop-demo/knowledge/review');
                window.dispatchEvent(new PopStateEvent('popstate'));
            });
            await page.getByRole('heading', { name: 'Duyệt phản hồi AI', exact: true }).waitFor();
            await page.waitForLoadState('networkidle');
            await page.getByRole('button', { name: 'Duyệt nội dung', exact: true }).first().waitFor();
            await capture(page, 'r25-feedback-review-list', 'R25', 'pending-feedback-list', viewport);
            await page.getByRole('button', { name: 'Duyệt nội dung', exact: true }).first().click();
            await page.getByRole('dialog', { name: 'Kiểm tra phản hồi' }).waitFor();
            await capture(page, 'r25-feedback-review-dialog', 'R25', 'review-decision-dialog', viewport);
        } finally {
            await page.close();
            await currentServer.close();
        }
    }

    if (pageErrors.length || captureWrites.length) throw new Error(`Unexpected W17 capture errors/writes: ${JSON.stringify({ pageErrors, captureWrites })}`);
    const report = {
        schemaVersion: 1,
        task: 'UI028.W17',
        capturedAt: new Date().toISOString(),
        phase,
        mode: 'synthetic in-memory MSW; route reads and local dialogs only during capture; no upload, knowledge mutation, review decision, or publish submitted',
        source: { path: 'apps/web/src/modules/knowledge/index.tsx', sha256: sourceSha256 },
        browser: 'Chromium',
        setupFixture: 'For R25 only, create one deterministic pending feedback through the existing inbox UI flow, then enter the review route through client-side history so the in-memory synthetic dataset is preserved. This is setup only; the R25 list/dialog capture itself is read-only.',
        captures,
        setupWrites,
        captureWrites,
        pageErrors,
        verdict: `W17_${phase.toUpperCase()}_SPACING_RENDER_BASELINE_WITH_HASH_AND_SYNTHETIC_FEEDBACK_FIXTURE`,
    };
    const output = path.join(evidence, `render-${phase}-spacing-current-20261006.json`);
    refuseOverwrite(output);
    fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
    process.stdout.write(`${JSON.stringify({ output: path.basename(output), observations: captures.length, setupWrites: setupWrites.length, captureWrites: captureWrites.length, pageErrors: pageErrors.length, sourceSha256 })}\n`);
} finally {
    await browser.close();
}
