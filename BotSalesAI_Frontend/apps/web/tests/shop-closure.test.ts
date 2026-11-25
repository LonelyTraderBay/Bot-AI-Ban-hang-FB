import { webcrypto } from 'node:crypto';
import { beforeEach, expect, it, vi } from 'vitest';
import { CSRF, handle, resetService, setRole } from '../src/mocks/service';
import { db, record } from '../src/mocks/database';

beforeEach(() => { vi.stubGlobal('crypto', webcrypto); resetService(); });
const headers = (version: number, key: string) => ({ 'x-csrf-token': CSRF, 'if-match': '"' + version + '"', 'idempotency-key': key });
const list = (status?: string) => handle({ op: 'listShops', path: {}, query: new URLSearchParams(status ? { status } : {}) });
it('preserves the owner’s shop, moves it between filtered lists and replays a transition once', async () => {
    const shop = record((await handle({ op: 'createShop', path: {}, headers: headers(1, 'new'), body: { name: 'Lịch sử', currency: 'VND', locale: 'vi-VN', timezone: 'Asia/Vientiane' } })).data);
    const path = { shopId: String(shop.id) };
    expect(shop).toMatchObject({ status: 'active', closedAt: null });
    const close = () => handle({ op: 'closeShop', path, headers: headers(1, 'close-once') });
    setRole('manager');
    await expect(close()).rejects.toMatchObject({ status: 403 });
    setRole('owner');
    const closed = record((await close()).data);
    expect(closed).toMatchObject({ id: shop.id, status: 'closed', version: 2 });
    expect((await close()).data).toEqual(closed);
    expect(db.audit.filter(row => row.shopId === shop.id && row.action === 'closeShop')).toHaveLength(1);
    expect((await list()).data).not.toContainEqual(closed);
    expect((await list('closed')).data).toEqual([closed]);
    await expect(handle({ op: 'updateShop', path, body: { name: 'Đổi tên' }, headers: headers(2, 'edit') })).rejects.toMatchObject({ code: 'SHOP_CLOSED' });
    await expect(handle({ op: 'reopenShop', path, headers: headers(1, 'stale') })).rejects.toMatchObject({ status: 412 });
    await handle({ op: 'reopenShop', path, headers: headers(2, 'reopen') });
    expect((await list('closed')).data).toEqual([]);
    expect((await list()).data).toContainEqual(expect.objectContaining({ id: shop.id, name: 'Lịch sử', version: 3, closedAt: null }));
});
it('returns actionable blocker groups and keeps the seeded shop active', async () => {
    await expect(handle({ op: 'closeShop', path: { shopId: 'shop-demo' }, headers: headers(1, 'blocked') }))
        .rejects.toMatchObject({ status: 409, code: 'SHOP_CLOSE_BLOCKED', errors: expect.arrayContaining([expect.objectContaining({ path: '/status', code: 'RECONCILIATION' })]) });
    expect((await list()).data).toHaveLength(2);
});

it('allows privacy requests and membership revocation while closed, then removes the revoked shop from discovery', async () => {
    const path = { shopId: 'shop-demo' };
    const shop = db.shops.find(s => s.id === path.shopId)!;
    Object.assign(shop, { status: 'closed', closedAt: '2026-11-25T12:00:00Z' });
    const request = await handle({ op: 'createPrivacyRequest', path, body: { kind: 'export', customerId: 'c1', reason: 'Xuất dữ liệu theo yêu cầu' }, headers: headers(1, 'privacy') });
    expect(request.data).toMatchObject({ status: 'pending_approval', shopId: shop.id });
    const revoke = await handle({ op: 'revokeMembership', path: { ...path, memberId: 'member-warehouse' }, headers: headers(1, 'revoke') });
    expect(revoke.status).toBe(204);
    const viewer = db.members.find(m => m.shopId === shop.id && m.userId === 'user-demo')!;
    viewer.status = 'revoked';
    expect((await list('closed')).data).toEqual([]);
    await expect(handle({ op: 'getShop', path })).rejects.toMatchObject({ status: 404 });
    expect((await list()).data).toHaveLength(1);
});
