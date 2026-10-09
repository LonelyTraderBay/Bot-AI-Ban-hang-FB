import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScopeEvents } from '../src/app/ScopeEvents';
import { ScopeContext } from '../src/shared/model/scope';
import type { Scope } from '../src/shared/model/scope';

class Stream {
    static instances: Stream[] = [];
    onopen: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    close = vi.fn();
    constructor() { Stream.instances.push(this); }
    emit(payload: unknown) { this.onmessage?.({ data: JSON.stringify(payload) }); }
}
const refreshSession = vi.fn(async () => undefined);
const membership: Scope['membership'] = { id: 'member-1', userId: 'user-1', shopId: 'shop-1', roles: ['owner'], permissions: [], permissionVersion: 1, status: 'active' };
const scope: Scope = { membership, online: true, refreshSession,
    shop: { id: 'shop-1', name: 'Synthetic', currency: 'VND', timezone: 'Asia/Vientiane', locale: 'vi-VN', defaultWarehouseId: 'wh-1', version: 1, policyVersion: 'p-1' },
    session: { user: { id: 'user-1', displayName: 'Synthetic', email: 'user@example.test' }, memberships: [membership], csrfToken: 'synthetic-csrf-123', expiresAt: '2030-01-01T00:00:00Z' },
};
const cache = new QueryClient();
const invalidate = vi.fn<QueryClient['invalidateQueries']>();
const key = ['scope', 'user-1', 'shop-1', 1];
const event = (sequence: number, extra: object = {}) => ({ eventId: `event-${sequence}`, type: 'message.created', schemaVersion: 2, shopId: 'shop-1', resourceType: 'message', resourceId: 'message-1', resourceVersion: 1, occurredAt: '2026-10-08T00:00:00Z', sequence, ...extra });
const ui = (value = scope) => <QueryClientProvider client={cache}><ScopeContext.Provider value={value}><ScopeEvents/></ScopeContext.Provider></QueryClientProvider>;
beforeEach(() => { Stream.instances = []; invalidate.mockReset().mockResolvedValue(undefined); cache.invalidateQueries = invalidate; refreshSession.mockClear(); vi.stubGlobal('EventSource', Stream); });
afterEach(() => { cleanup(); cache.clear(); vi.unstubAllGlobals(); });

it('F09 narrows identified Inbox events and ignores duplicate/out-of-order/foreign-shop events', () => {
    render(ui()); const stream = Stream.instances[0];
    act(() => stream.emit(event(10)));
    const reads = invalidate.mock.calls.map(([options]) => options?.queryKey);
    expect(reads).toContainEqual([...key, 'listMessages']);
    expect(reads).toContainEqual([...key, 'getDashboard']);
    expect(reads).not.toContainEqual(key);
    expect(reads).not.toContainEqual([...key, 'listProducts']);
    const count = invalidate.mock.calls.length;
    act(() => { stream.emit(event(10)); stream.emit(event(9)); stream.emit(event(11, { shopId: 'shop-2' })); });
    expect(invalidate).toHaveBeenCalledTimes(count);
    act(() => stream.emit(event(11, { type: 'conversation.updated', resourceType: 'conversation' })));
    expect(invalidate).toHaveBeenCalledTimes(count * 2);
});

it.each(['gap', 'resync', 'unrecognized', 'invalid', 'open', 'reconnect'] as const)('F09 preserves full authoritative resync for %s', kind => {
    render(ui()); const stream = Stream.instances[0];
    act(() => stream.emit(event(10))); invalidate.mockClear();
    act(() => {
        if (kind === 'gap') stream.emit(event(12));
        if (kind === 'resync') stream.emit(event(11, { type: 'resync.required' }));
        if (kind === 'unrecognized') stream.emit(event(11, { type: 'customer.updated', resourceType: 'customer' }));
        if (kind === 'invalid') stream.onmessage?.({ data: 'malformed-json' });
        if (kind === 'open' || kind === 'reconnect') { if (kind === 'reconnect') stream.onerror?.(); stream.onopen?.(); }
    });
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: key });
});

it('F09 revocation closes the stream and refreshes the session even when its sequence is old', () => {
    render(ui()); const stream = Stream.instances[0];
    act(() => { stream.emit(event(10)); stream.emit(event(2, { type: 'session.revoked' })); });
    expect(stream.close).toHaveBeenCalledOnce(); expect(refreshSession).toHaveBeenCalledOnce();
});

it('F09 rejects callbacks from a disposed stream after shop/permission changes or unmount', () => {
    const view = render(ui()); const old = Stream.instances[0];
    view.rerender(ui({ ...scope, shop: { ...scope.shop, id: 'shop-2' }, membership: { ...membership, permissionVersion: 2 } }));
    act(() => { old.emit(event(10)); old.onopen?.(); old.onerror?.(); });
    expect(old.close).toHaveBeenCalledOnce(); expect(invalidate).not.toHaveBeenCalled();
    const next = Stream.instances[1]; view.unmount();
    act(() => next.emit(event(20, { shopId: 'shop-2' })));
    expect(next.close).toHaveBeenCalledOnce(); expect(invalidate).not.toHaveBeenCalled();
});
