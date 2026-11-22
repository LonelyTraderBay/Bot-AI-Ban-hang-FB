import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { appOrigin } from '../../../infra/p0/oidc/tls.mjs';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';

const [shop] = fixtureShops;
const app = appOrigin + '/s/' + shop.id;
const api = appOrigin + '/api/v2/shops/' + shop.id;

function next(page, method, path) {
    const pending = page.waitForResponse(response => response.request().method() === method && response.url() === api + path);
    void pending.catch(() => {});
    return pending;
}

async function body(pending, status = 200) {
    const response = await pending;
    assert.equal(response.status(), status, new URL(response.url()).pathname);
    return (await response.json()).data;
}

async function waitForState(page, path, target) {
    for (let attempt = 0; attempt < 40; attempt++) {
        const state = await body(page.request.get(api + path));
        if (state.status === target) return state;
        if (['failed', 'cancelled', 'error', 'unknown', 'awaiting_confirmation'].includes(state.status)) throw new Error(path + ' báo ' + state.status);
        await delay(300);
    }
    throw new Error('Chưa thấy trạng thái ' + target + ' tại ' + path);
}

async function verifyConnection(page, { marker, provider, model, secret }) {
    await page.goto(app + '/integrations/ai');
    await body(page.request.get(api + '/integrations/ai/catalog'));
    await page.getByRole('button', { name: 'Thêm kết nối AI', exact: true }).click();
    const create = page.getByRole('dialog', { name: 'Kết nối AI mới' });
    await create.getByRole('textbox', { name: 'Tên kết nối' }).fill(marker);
    await create.getByRole('combobox', { name: 'Provider đã có adapter' }).click();
    await page.getByRole('option', { name: provider, exact: true }).click();
    await create.getByRole('textbox', { name: 'Model ID được adapter hỗ trợ' }).fill(model);
    await create.getByLabel('Khóa API', { exact: true }).fill(secret);
    const registered = next(page, 'POST', '/integrations/ai');
    await create.getByRole('button', { name: 'Lưu cấu hình' }).click();
    const connection = await body(registered, 201);
    assert.ok(!JSON.stringify(connection).includes(secret));
    await page.getByText(marker, { exact: true }).waitFor();
    const check = next(page, 'POST', '/integrations/ai/' + connection.id + '/test');
    await page.getByRole('button', { name: 'Kiểm kết nối', exact: true }).first().click();
    const job = await body(check, 202);
    await page.getByRole('link', { name: 'Kết quả kiểm tra kết nối' }).waitFor();
    await waitForState(page, '/jobs/' + job.id, 'succeeded');
    return connection;
}

export function configureOpenAiBrowserFixture(env) {
    const scope = { shopId: shop.id, projectId: 'proj_browsersynthetic', region: 'eu', model: 'synthetic-model-3.1-2026-01-01',
        expiresAt: new Date(Date.now() + 600_000).toISOString() };
    const secret = 'synthetic-probe-' + randomUUID();
    const key = randomBytes(32).toString('base64url');
    env.BOTSALES_AI_OPENAI_SCOPES = JSON.stringify([scope]);
    env.BOTSALES_AI_OPENAI_CREDENTIAL_KEY = key;
    env.BOTSALES_P0_OPENAI_PROBE_SECRET = secret;
    return { model: scope.model, secret, key, projectId: scope.projectId };
}

export async function verifyOpenAiConnectionFlow(page, fixture) {
    const connection = await verifyConnection(page, { marker: 'OpenAI Firefox ' + randomUUID(), provider: 'OpenAI',
        model: fixture.model, secret: fixture.secret });
    const saved = await body(page.request.get(api + '/integrations/ai/' + connection.id));
    assert.equal(saved.status, 'connected');
    assert.ok(saved.lastCheckedAt);
    assert.equal(saved.capabilities.text, 'unknown');
    assert.ok(!JSON.stringify(saved).includes(fixture.secret));
    console.log('Firefox T069 R30: configured provider scope, masked key and one successful metadata job from the packaged worker.');
}

export async function verifyAiFlow(page) {
    const marker = 'Firefox AI ' + randomUUID().slice(0, 8);
    const connection = await verifyConnection(page, { marker, provider: 'Cổng AI thử nghiệm', model: 'synthetic-model', secret: 'fixture-' + randomUUID() });

    await page.goto(app + '/bot');
    await page.getByRole('button', { name: 'Sửa bản nháp', exact: true }).click();
    const edit = page.getByRole('dialog', { name: 'Cấu hình bản nháp' });
    await edit.getByRole('combobox', { name: 'Kết nối AI' }).click();
    await page.getByRole('option', { name: new RegExp(marker) }).click();
    await edit.getByRole('textbox', { name: 'Chỉ dẫn tư vấn đã duyệt' }).fill('Chỉ đọc dữ liệu được phép và chuyển nhân viên xác nhận.');
    await edit.getByRole('textbox', { name: 'Mã phiên bản kiến thức (mỗi dòng một mã)', exact: true }).fill('');
    await edit.getByRole('textbox', { name: 'Ngân sách ngày (VND)', exact: true }).fill('1000000000');
    await edit.getByRole('spinbutton', { name: 'Số bước công cụ tối đa' }).fill('2');
    const updated = next(page, 'PATCH', '/bot/config');
    await edit.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
    const config = await body(updated);
    assert.equal(config.connectionId, connection.id);
    assert.equal(config.requireHumanOrderConfirmation, true);

    await page.goto(app + '/bot/playground');
    await page.getByRole('textbox', { name: 'Nội dung khách hỏi' }).fill('XÁC NHẬN đơn ngay');
    const sample = next(page, 'POST', '/bot/playground');
    await page.getByRole('button', { name: 'Chạy thử', exact: true }).click();
    const result = await body(sample);
    assert.equal(result.externalMessageSent, false);
    assert.equal(result.configRevision, config.draftRevision);
    await page.getByText(result.text, { exact: true }).waitFor();

    await page.goto(app + '/bot/evaluations');
    await page.getByRole('button', { name: 'Chạy đánh giá', exact: true }).click();
    const form = page.getByRole('dialog', { name: 'Đánh giá cấu hình nháp' });
    await form.getByRole('textbox', { name: 'Phiên bản bộ kiểm thử đã đăng ký' }).fill('botsales-fixture-v1');
    const evaluation = next(page, 'POST', '/bot/evaluations');
    await form.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    const queued = await body(evaluation, 202);
    const passed = await waitForState(page, '/bot/evaluations/' + queued.id, 'passed');
    assert.equal(passed.passedCases, 5);
    const detail = page.getByRole('dialog', { name: 'Chi tiết đánh giá' });
    await detail.getByRole('button', { name: 'Cập nhật kết quả' }).click();
    await detail.getByText('5 / 5', { exact: true }).waitFor();

    await page.goto(app + '/bot');
    await page.getByRole('button', { name: 'Duyệt & xuất bản', exact: true }).click();
    const approval = page.getByRole('dialog', { name: 'Xuất bản cấu hình đã đánh giá' });
    await approval.getByRole('textbox', { name: 'Mã lần đánh giá đúng bản nháp' }).fill(passed.id);
    await approval.getByRole('textbox', { name: 'Lý do', exact: true }).fill('Đối chiếu đúng bộ thử trong Firefox');
    const publishing = next(page, 'POST', '/bot/config/publish');
    await approval.getByRole('button', { name: 'Xuất bản', exact: true }).click();
    const command = await body(publishing, 202);
    assert.equal(command.status, 'accepted');
    await waitForState(page, '/commands/' + command.id, 'succeeded');
    const live = await body(page.request.get(api + '/bot/config'));
    assert.equal(live.liveRevision, config.draftRevision);
    await page.reload();
    await page.getByRole('heading', { name: 'Điều khiển Admin AI', exact: true }).waitFor();
    const current = page.getByRole('row').filter({ hasText: '#' + live.liveRevision }).first();
    await current.getByRole('button', { name: 'Xem phiên bản' }).click();
    await page.getByRole('dialog', { name: 'Chi tiết phiên bản AI' }).getByText(connection.id, { exact: true }).waitFor();
    console.log('R30 key masked and adapter job succeeded, R27 no send, R28 exact fixture evaluation 5/5, R26 matched publication command and live revision.');
}
