import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createDatabaseClient } from '../../../apps/api/dist/platform/database/client.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { appOrigin } from '../../../infra/p0/oidc/tls.mjs';
import { dropCreateResponse } from '../helpers/lost-response.mjs';
import { assertFixtureDatabase, fixtureSession, fixtureSessionCookie, restoreReader } from './session-fixture.mjs';

const [shopA, shopB] = fixtureShops;
const overview = id => appOrigin + '/s/' + id + '/overview';
const title = 'Bạn không có quyền truy cập cửa hàng này.';

async function verifyMemberWrites(page) {
    const endpoint = appOrigin + '/api/v2/shops/' + shopA.id + '/members';
    const address = 'r32-' + randomUUID().slice(0, 8) + '@botsales.test';
    await page.getByRole('button', { name: 'Mời nhân viên', exact: true }).click();
    const invite = page.getByRole('dialog', { name: 'Mời nhân viên', exact: true });
    await invite.getByRole('textbox', { name: 'Email nhân viên', exact: true }).fill(address);
    const created = page.waitForResponse(response => response.request().method() === 'POST' && response.url() === endpoint);
    await invite.getByRole('button', { name: 'Lưu', exact: true }).click();
    const response = await created;
    assert.equal(response.status(), 201);
    const { data: member } = await response.json();
    assert.equal(member.status, 'invited');
    const notice = page.getByRole('status').filter({ hasText: address });
    await notice.waitFor();
    assert.match(await notice.textContent(), /^Đã tạo lời mời/);
    const row = page.getByRole('row').filter({ hasText: member.userId });
    await row.getByRole('button', { name: 'Sửa quyền', exact: true }).click();
    const edit = page.getByRole('dialog', { name: 'Cập nhật quyền', exact: true });
    assert.equal(await edit.getByRole('checkbox', { name: /^Chủ cửa hàng/ }).isDisabled(), true);
    await edit.getByRole('checkbox', { name: /^Bán hàng/ }).check();
    const patched = page.waitForResponse(result => result.request().method() === 'PATCH' && result.url() === endpoint + '/' + member.id);
    await edit.getByRole('button', { name: 'Lưu', exact: true }).click();
    const updated = await patched;
    assert.equal(updated.status(), 200);
    const { data } = await updated.json();
    assert.deepEqual(data.roles, ['sales', 'viewer']);
    assert.equal(data.permissionVersion, member.permissionVersion + 1);
    await row.getByText(/Bán hàng/).waitFor();

    const desktop = page.viewportSize();
    await page.setViewportSize({ width: 390, height: 844 });
    try {
        await row.getByRole('button', { name: 'Chi tiết nhân sự', exact: true }).click();
        const details = page.getByRole('dialog', { name: 'Chi tiết nhân sự', exact: true });
        await details.getByText('Hết hạn lời mời', { exact: true }).waitFor();
        await details.getByRole('button', { name: 'Sửa quyền', exact: true }).waitFor();
        await details.getByRole('button', { name: 'Thu hồi', exact: true }).waitFor();
        await page.keyboard.press('Escape');
        await details.waitFor({ state: 'hidden' });
    } finally {
        await page.setViewportSize(desktop);
    }
    console.log('Firefox dev:live R32: invite 201 and role update 200 on desktop. At 390px the detail shows expiry and permitted actions.');
}

export async function verifyWorkspaceSelection(browser, page, ownerCookie) {
    const connection = readDatabaseUrl(process.env);
    assertFixtureDatabase(connection);
    const db = createDatabaseClient(connection);
    let reader;
    try {
        await page.getByRole('heading', { name: 'Chọn cửa hàng', exact: true }).waitFor();
        await page.getByText(shopA.name, { exact: true }).waitFor();
        assert.equal(await page.getByText(shopB.name, { exact: true }).count(), 0);
        const detail = page.waitForResponse(response => response.url() === appOrigin + '/api/v2/shops/' + shopA.id);
        await page.getByRole('link', { name: 'Mở cửa hàng', exact: true }).click();
        assert.equal((await detail).status(), 200);
        await page.waitForURL(overview(shopA.id));
        await page.getByRole('link', { name: shopA.name, exact: true }).waitFor();

        await page.goto(overview(shopB.id));
        await page.getByText(title, { exact: true }).waitFor();

        reader = await fixtureSession(db, 'p0-reader');
        const membership = await db.membership.findUniqueOrThrow({ where: { shopId_userId: { shopId: shopA.id, userId: reader.userId } } });
        const getWithReader = route => fetch(appOrigin + '/api/v2' + route, { headers: { cookie: reader.cookie } });
        const before = await getWithReader('/shops/' + shopA.id);
        assert.equal(before.status, 200);
        await before.text();

        const teamUrl = appOrigin + '/s/' + shopA.id + '/settings/team';
        await page.goto(teamUrl);
        await verifyMemberWrites(page);
        await page.goto(teamUrl + '?q=p0-reader');
        const row = page.getByRole('row').filter({ hasText: reader.userId });
        await row.getByRole('button', { name: 'Thu hồi', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Thu hồi quyền nhân viên' });
        const revoked = page.waitForResponse(response => response.request().method() === 'DELETE' &&
            response.url() === appOrigin + '/api/v2/shops/' + shopA.id + '/members/' + membership.id);
        await dialog.getByRole('button', { name: 'Thu hồi quyền', exact: true }).click();
        assert.equal((await revoked).status(), 204);
        await row.getByText('Đã thu hồi', { exact: true }).waitFor();

        const after = await getWithReader('/shops/' + shopA.id);
        assert.equal(after.status, 404);
        await after.text();
        const unchangedSession = await getWithReader('/session');
        assert.equal(unchangedSession.status, 200);
        assert.deepEqual((await unchangedSession.json()).data.memberships, []);

        await browser.addCookies([{
            name: fixtureSessionCookie, value: reader.token, domain: ownerCookie.domain,
            path: '/', secure: true, httpOnly: true, sameSite: 'Lax',
        }]);
        await page.goto(appOrigin + '/workspaces');
        await page.getByText('Chưa có cửa hàng.', { exact: true }).waitFor();
        assert.equal(await page.getByText(shopA.name, { exact: true }).count(), 0);
        await page.goto(overview(shopA.id));
        await page.getByText(title, { exact: true }).waitFor();

        console.log('Firefox dev:live R02: shop A visible and selectable, direct shop B navigation denied.');
        console.log('Firefox dev:live R32: revoke 204, reader session still valid, shop A removed and the old URL denied.');
    } finally {
        await browser.addCookies([ownerCookie]);
        if (reader) {
            await restoreReader(db, shopA.id, reader.userId);
            await db.session.update({ where: { id: reader.id }, data: { revokedAt: new Date() } });
        }
        await db.$disconnect();
    }
}

export async function verifyCommandRecovery(page) {
    const base = appOrigin + '/s/' + shopA.id + '/settings/';
    const api = appOrigin + '/api/v2/shops/' + shopA.id;
    const endpoint = api + '/members';
    const address = 'be06-lost-' + randomUUID() + '@botsales.test';
    await page.goto(base + 'team');
    const attempt = await dropCreateResponse(page, endpoint);

    await page.getByRole('button', { name: 'Mời nhân viên', exact: true }).click();
    const form = page.getByRole('dialog', { name: 'Mời nhân viên', exact: true });
    await form.getByRole('textbox', { name: 'Email nhân viên', exact: true }).fill(address);
    await form.getByRole('button', { name: 'Lưu', exact: true }).click();
    const { status, resourceId: memberId, key } = await attempt.received;
    assert.equal(status, 201);
    assert.ok(memberId && key);
    const unresolved = page.getByText('Có 1 thao tác chưa xác minh kết quả', { exact: true });
    await unresolved.waitFor();
    const evidence = process.env.BE06_CAPTURE_DIR;
    if (evidence) await page.screenshot({ path: join(evidence, 'before-reload.png') });
    page.once('dialog', dialog => dialog.accept());
    await page.reload();
    await page.getByRole('heading', { name: 'Nhân sự & phân quyền' }).waitFor();
    if (evidence) await page.screenshot({ path: join(evidence, 'after-reload.png') });
    await unresolved.waitFor();

    const lookup = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.origin + url.pathname === api + '/commands';
    });
    await page.setViewportSize({ width: 390, height: 844 });
    if (evidence) await page.screenshot({ path: join(evidence, 'recovery-390.png') });
    await page.getByRole('button', { name: 'Kiểm tra trạng thái lệnh', exact: true }).click();
    const result = await lookup;
    assert.equal(result.status(), 200);
    const url = new URL(result.url());
    assert.equal(url.searchParams.get('kind'), 'inviteMember');
    assert.equal(url.searchParams.get('q'), createHash('sha256').update(key).digest('hex'));
    assert.ok(!url.href.includes(key));
    const { data: [command] } = await result.json();
    assert.deepEqual([command.status, command.result], ['succeeded', { type: 'membership', id: memberId }]);
    await unresolved.waitFor({ state: 'hidden' });
    assert.equal(attempt.writes(), 1);
    const detail = await page.request.get(api + '/commands/' + command.id);
    assert.equal(detail.status(), 200);
    assert.deepEqual((await detail.json()).data, command);
    await page.goto(base + 'audit?q=' + memberId);
    const audit = page.getByRole('row').filter({ hasText: memberId });
    await audit.getByText('inviteMember', { exact: true }).waitFor();
    assert.equal(await audit.count(), 1);
    assert.equal(attempt.writes(), 1);
    const connection = readDatabaseUrl(process.env);
    assertFixtureDatabase(connection);
    const db = createDatabaseClient(connection);
    try {
        assert.equal(await db.membership.count({ where: { shopId: shopA.id, user: { email: address } } }), 1);
        assert.equal(await db.command.count({ where: { shopId: shopA.id, operationId: 'inviteMember', idempotencyKey: key } }), 1);
        assert.equal(await db.outboxEvent.count({ where: { shopId: shopA.id, commandId: command.id } }), 1);
        assert.equal(await db.auditEntry.count({ where: { shopId: shopA.id, resourceId: memberId, action: 'inviteMember' } }), 1);
    } finally {
        await db.$disconnect();
    }
    console.log('Firefox dev:live P0-07: response dropped after DB commit, reload recovered by intent at 390px. One POST, membership, command, outbox and audit.');
}
