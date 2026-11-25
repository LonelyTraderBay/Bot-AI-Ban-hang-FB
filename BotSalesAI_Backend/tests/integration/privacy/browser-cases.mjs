import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { appOrigin } from '../../../infra/p0/oidc/tls.mjs';
import { fixtureWriter } from '../orders/fixtures.mjs';

const api = appOrigin + '/api/v2';

function responseFor(page, method, path) {
    const expected = page.waitForResponse(response => response.request().method() === method && response.url() === api + path)
        .catch(error => { throw new Error(`Chờ ${method} ${path}: ${error.name}`, { cause: error }); });
    void expected.catch(() => {});
    return expected;
}

async function responseData(response, status) {
    assert.equal(response.status(), status, new URL(response.url()).pathname);
    return (await response.json()).data;
}

async function readDownload(page, path) {
    await page.goto(appOrigin + path);
    await page.getByRole('button', { name: 'Mở kết quả xuất' }).waitFor();
    const result = await page.evaluate(async () => {
        const id = globalThis.location.pathname.split('/').at(-1);
        const shop = globalThis.location.pathname.split('/')[2];
        const job = await fetch('/api/v2/shops/' + shop + '/jobs/' + id).then(response => response.json());
        const response = await fetch(job.data.downloadUrl);
        return { status: response.status, body: await response.text(), type: response.headers.get('content-type') };
    });
    assert.equal(result.status, 200);
    return result;
}

export async function verifyPrivacyFlow(page, cookie) {
    let shopId, userId;
    const writer = fixtureWriter();
    try {
        const tag = 'BE21-' + randomUUID().slice(0, 8);
        userId = (await responseData(await page.request.get(api + '/session'), 200)).user.id;
        await page.goto(appOrigin + '/onboarding');
        await page.getByRole('textbox', { name: 'Tên cửa hàng' }).fill(tag);
        let originalKey;
        await page.route(api + '/shops', async route => {
            if (route.request().method() !== 'POST') return route.continue();
            originalKey = route.request().headers()['idempotency-key'];
            shopId = (await responseData(await route.fetch(), 201)).id;
            await route.abort('connectionreset');
        });
        const createButton = page.getByRole('button', { name: 'Tạo cửa hàng', exact: true });
        await createButton.click();
        await page.getByText('Chưa đọc được kết quả tạo cửa hàng.', { exact: false }).waitFor();
        await page.unroute(api + '/shops');
        const create = responseFor(page, 'POST', '/shops');
        await createButton.click();
        const replay = await create;
        assert.ok(originalKey && replay.request().headers()['idempotency-key'] === originalKey);
        assert.equal((await responseData(replay, 201)).id, shopId);
        assert.equal(await writer.shop.count({ where: { name: tag } }), 1);
        await page.waitForURL(appOrigin + '/s/' + shopId + '/overview');
        const session = await responseData(await page.request.get(api + '/session'), 200);
        userId = session.user.id;
        assert.ok(session.memberships.some(item => item.shopId === shopId && item.roles.includes('owner')));
        const base = '/s/' + shopId;
        const path = '/shops/' + shopId;
        const save = responseFor(page, 'PATCH', path);
        await page.goto(appOrigin + base + '/settings/shop');
        await page.getByRole('textbox', { name: 'Tên cửa hàng' }).fill(tag + ' cập nhật');
        await page.getByRole('button', { name: 'Lưu cấu hình' }).click();
        assert.equal((await responseData(await save, 200)).name, tag + ' cập nhật');
        console.log('R03/R33: mất phản hồi sau khi tạo shop, gửi lại cùng khóa chỉ có một shop, rồi lưu thiết lập qua HTTPS.');

        const fixtureCustomer = await page.evaluate(async ({ path, tag, csrf }) => {
            const response = await fetch('/api/v2' + path + '/customers', { method: 'POST',
                headers: { 'content-type': 'application/json', 'x-csrf-token': csrf, 'idempotency-key': globalThis.crypto.randomUUID() },
                body: JSON.stringify({ displayName: tag, email: 'privacy@example.test', phone: '+84900000001', notes: '' }),
            });
            return { status: response.status, data: (await response.json()).data };
        }, { path, tag, csrf: session.csrfToken });
        assert.equal(fixtureCustomer.status, 201);
        await page.goto(appOrigin + base + '/settings/privacy');
        await page.getByRole('spinbutton', { name: 'Số ngày lưu hội thoại' }).fill('12');
        await page.getByRole('textbox', { name: 'Căn cứ / thị trường áp dụng' }).fill('Bộ dữ liệu tổng hợp chỉ dùng thử nghiệm');
        const policy = responseFor(page, 'PATCH', path + '/privacy/policy');
        await page.getByRole('button', { name: 'Lưu chính sách', exact: true }).click();
        assert.equal((await responseData(await policy, 200)).processingEnabled, true);
        await page.getByRole('button', { name: 'Tạo yêu cầu', exact: true }).click();
        const creation = page.getByRole('dialog', { name: 'Yêu cầu dữ liệu cá nhân' });
        await creation.getByRole('combobox', { name: 'Khách hàng' }).click();
        await page.getByRole('option', { name: tag, exact: true }).click();
        await creation.getByRole('textbox', { name: 'Lý do / xác minh yêu cầu' }).fill('Xuất hồ sơ thử nghiệm ' + tag);
        const submitted = responseFor(page, 'POST', path + '/privacy/requests');
        await creation.getByRole('button', { name: 'Tạo yêu cầu chờ duyệt' }).click();
        const request = await responseData(await submitted, 201);
        await page.setViewportSize({ width: 390, height: 844 });
        const table = page.getByRole('table', { name: 'Yêu cầu quyền riêng tư' });
        await table.getByRole('button', { name: 'Phê duyệt', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Phê duyệt yêu cầu dữ liệu' });
        assert.equal(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth), true);
        const started = responseFor(page, 'POST', '/auth/step-up');
        const callback = page.waitForResponse(response => response.url().startsWith(api + '/auth/callback?') && response.status() === 302);
        await Promise.all([callback, dialog.getByRole('button', { name: 'Xác minh qua tài khoản công ty' }).click()]);
        const authorize = new URL((await responseData(await started, 200)).authorizationUrl);
        assert.equal(authorize.searchParams.get('max_age'), '0');
        assert.equal(authorize.searchParams.get('prompt'), 'login');
        const returnPath = base + '/settings/privacy?approval=' + request.id;
        assert.equal(await (await callback).headerValue('location'), returnPath);
        await page.waitForURL(appOrigin + returnPath);
        const rotated = (await page.context().cookies(appOrigin)).find(entry => entry.name === cookie.name);
        assert.ok(rotated && rotated.value !== cookie.value, 'Step-up must rotate the session cookie');
        const prior = await fetch(api + '/session', { headers: { cookie: cookie.name + '=' + cookie.value } });
        assert.equal(prior.status, 401);
        await prior.arrayBuffer();
        await dialog.getByRole('textbox', { name: 'Lý do phê duyệt' }).fill('Đã xác nhận yêu cầu thử nghiệm');
        assert.equal(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth), true);
        const proof = responseFor(page, 'POST', '/auth/step-up');
        const approved = responseFor(page, 'POST', path + '/privacy/requests/' + request.id + '/approve');
        await dialog.getByRole('button', { name: 'Phê duyệt yêu cầu', exact: true }).click();
        assert.equal((await proof).status(), 200);
        assert.equal((await approved).status(), 202);
        await dialog.waitFor({ state: 'hidden' });
        const jobLink = await table.getByRole('link', { name: 'Theo dõi công việc' }).getAttribute('href');
        const exported = await readDownload(page, jobLink);
        assert.match(exported.type, /application\/json/);
        assert.equal(JSON.parse(exported.body).customer.id, fixtureCustomer.data.id);
        assert.equal(await writer.auditEntry.count({ where: { shopId, action: 'stepUp', resourceId: request.id } }), 1);
        console.log('R35/R14: Firefox OIDC step-up, rotated session, exact approval route, 390 px dialog, audit and signed JSON export.');

        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(appOrigin + base + '/reports');
        await page.getByText('Mốc xem báo cáo', { exact: true }).waitFor();
        await page.getByText(/Hệ thống chưa hỗ trợ xuất theo mốc xem báo cáo/).waitFor();
        const exportRequest = responseFor(page, 'POST', path + '/exports');
        await page.getByRole('button', { name: 'Tạo tệp báo cáo CSV' }).click();
        const acceptedReport = await exportRequest;
        assert.equal(acceptedReport.status(), 202);
        const { data: report, meta: exportMeta } = await acceptedReport.json();
        assert.match(exportMeta.warnings.join(' '), /chưa hỗ trợ xuất theo mốc xem báo cáo/);
        const reportHref = await page.getByRole('link', { name: 'Theo dõi công việc ' + report.id }).getAttribute('href');
        const csv = await readDownload(page, reportHref);
        assert.match(csv.type, /text\/csv/);
        assert.match(csv.body, /snapshot_captured_at/);
        assert.ok(csv.body.includes(exportMeta.reportSnapshot.capturedAt));
        console.log('R31/R14: xuất CSV, worker hoàn tất và tải qua đường dẫn HTTPS có phiên.');

        const challengePath = path + '/customers/' + fixtureCustomer.data.id + '/consent-challenges';
        for (const withdraw of [false, true]) {
            await page.goto(appOrigin + base + '/settings/privacy');
            await page.getByRole('heading', { name: 'Quyền riêng tư & vòng đời dữ liệu' }).waitFor();
            const created = responseFor(page, 'POST', challengePath);
            try {
                await page.getByRole('button', { name: 'Tạo yêu cầu xác nhận lại' }).click();
            } catch (error) {
                const states = await page.getByRole('alert').allTextContents();
                const denied = states.some(text => text.includes('Không có kênh liên hệ'));
                throw new Error('Mở tạo challenge ở ' + new URL(page.url()).pathname + ', lần ' + (withdraw ? 'rút quyền' : 'cấp quyền') +
                    ', UI báo thiếu kênh=' + denied, { cause: error });
            }
            const challenge = await responseData(await created, 201);
            assert.equal(challenge.action, withdraw ? 'withdraw' : 'confirm');
            const context = page.context();
            const visitor = await context.newPage();
            await context.clearCookies({ name: '__Host-bs_session' });
            try {
                await visitor.goto(appOrigin + '/consent/confirm#token=' + encodeURIComponent(challenge.fixtureToken));
                const exchange = responseFor(visitor, 'POST', '/public/consent/challenges/exchange');
                await visitor.getByRole('button', { name: 'Xem nội dung yêu cầu' }).click();
                assert.equal((await exchange).status(), 200);
                const confirmation = responseFor(visitor, 'POST', '/public/consent/confirmations');
                await visitor.getByRole('button', { name: withdraw ? 'Xác nhận ngừng marketing' : 'Đồng ý nhận marketing', exact: true }).click();
                assert.equal((await responseData(await confirmation, 200)).consentStatus, withdraw ? 'withdrawn' : 'granted');
                await visitor.getByText(withdraw ? 'Đã ghi nhận không nhận tin marketing' : 'Đã ghi nhận lựa chọn của bạn.', { exact: false }).waitFor();
                assert.equal(new URL(visitor.url()).hash, '');
            } finally {
                await visitor.close();
                await context.addCookies([rotated]);
            }
        }
        console.log('R61: trình duyệt khách không có phiên staff đã xác nhận rồi rút quyền từ hai liên kết thử.');
    } finally {
        if (shopId && userId) await writer.membership.update({ where: { shopId_userId: { shopId, userId } },
            data: { status: 'revoked', permissionVersion: { increment: 1 } } });
        await writer.$disconnect();
    }
}
