import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import type { PropsWithChildren } from 'react';
import type { CommandResponse } from '@botsales/contracts';
import { ScopeContext } from '../src/shared/model/scope';
import type { Scope } from '../src/shared/model/scope';
import { cancelScopeRequests, setCsrfToken } from '../src/shared/api/client';
import { useCommand } from '../src/shared/api/hooks';
import { intentSnapshot, resolveObservedIntent } from '../src/shared/api/intents';

const membership: Scope['membership'] = { id: 'member-1', userId: 'user-1', shopId: 'shop-1', roles: ['owner'], permissions: [], permissionVersion: 1, status: 'active' };
const initial: Scope = {
    membership, online: true, refreshSession: async () => undefined,
    shop: { id: 'shop-1', name: 'Synthetic scope', currency: 'VND', timezone: 'Asia/Vientiane', locale: 'vi-VN', defaultWarehouseId: 'warehouse-1', version: 1, policyVersion: 'policy-1' },
    session: { user: { id: 'user-1', displayName: 'Synthetic user', email: 'test@example.test' }, memberships: [membership], csrfToken: 'csrf-fixture-123456', expiresAt: '2030-12-31T00:00:00Z' },
};
let scope = initial;
const cache = new QueryClient();
const wrapper = ({ children }: PropsWithChildren) => <StrictMode><QueryClientProvider client={cache}><ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider></QueryClientProvider></StrictMode>;
const envelope = (status: CommandResponse['data']['status']): CommandResponse => ({
    data: { id: 'command-1', shopId: 'shop-1', status, kind: 'confirm_order', createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z', result: null, problem: null },
    meta: { requestId: 'request-1', asOf: '2026-10-08T00:00:00Z' },
});
const response = (status: number, state: CommandResponse['data']['status']) => new Response(JSON.stringify(envelope(state)), { status, headers: { 'Content-Type': 'application/json' } });
const options = { path: { orderId: 'order-1' }, body: { expectedVersion: 1, quoteId: 'quote-1', customerConfirmationId: 'evidence-1' }, idempotencyKey: 'intent-lifetime-123456' };
beforeEach(() => { scope = initial; vi.useFakeTimers(); setCsrfToken(initial.session.csrfToken); });
afterEach(() => { cleanup(); cancelScopeRequests(); for (const intent of intentSnapshot()) resolveObservedIntent(intent.intentId); vi.useRealTimers(); vi.unstubAllGlobals(); cache.clear(); });

it.each(['unmount', 'scope-cancel', 'permission-change', 'shop-change', 'logout'] as const)('F04 stops polling and keeps exact recovery metadata after %s', async kind => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(response(202, 'accepted'));
    vi.stubGlobal('fetch', fetchMock);
    const hook = renderHook(() => useCommand('confirmOrder', []), { wrapper });
    let execution!: Promise<unknown>;
    await act(async () => { execution = hook.result.current.execute(options).catch(error => error); for (let i = 0; i < 10; i++) await Promise.resolve(); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    if (kind === 'unmount') hook.unmount();
    if (kind === 'scope-cancel') cancelScopeRequests();
    if (kind === 'permission-change') { scope = { ...scope, membership: { ...membership, permissionVersion: 2 } }; hook.rerender(); }
    if (kind === 'shop-change') { scope = { ...scope, shop: { ...scope.shop, id: 'shop-2' } }; hook.rerender(); }
    if (kind === 'logout') { cancelScopeRequests(); hook.unmount(); }
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(await execution).toMatchObject({ name: 'AbortError' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(intentSnapshot()).toContainEqual({ intentId: options.idempotencyKey, commandId: 'command-1', shopId: 'shop-1', operation: 'confirmOrder' });
});

it.each(['mutation', 'poll'] as const)('F04 aborts an active %s request and never starts another poll', async stage => {
    let signal: AbortSignal | undefined;
    const waiting = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
        signal = init?.signal as AbortSignal;
        signal.addEventListener('abort', () => reject(new DOMException('Canceled', 'AbortError')), { once: true });
    }));
    const fetchMock = stage === 'mutation' ? waiting : vi.fn<typeof fetch>().mockResolvedValueOnce(response(202, 'accepted')).mockImplementation(waiting);
    vi.stubGlobal('fetch', fetchMock);
    const hook = renderHook(() => useCommand('confirmOrder', []), { wrapper });
    let execution!: Promise<unknown>;
    await act(async () => { execution = hook.result.current.execute(options).catch(error => error); for (let i = 0; i < 10; i++) await Promise.resolve(); if (stage === 'poll') await vi.advanceTimersByTimeAsync(400); });
    expect(signal?.aborted).toBe(false);
    await act(async () => { cancelScopeRequests(); await vi.advanceTimersByTimeAsync(10000); });
    expect(signal?.aborted).toBe(true);
    expect(await execution).toMatchObject({ name: 'AbortError' });
    expect(fetchMock).toHaveBeenCalledTimes(stage === 'mutation' ? 1 : 2);
    expect(intentSnapshot()).toContainEqual({ intentId: options.idempotencyKey, commandId: stage === 'poll' ? 'command-1' : null, shopId: 'shop-1', operation: 'confirmOrder' });
    expect(hook.result.current.unresolved).toBe(true);
    await expect(hook.result.current.execute(options)).rejects.toMatchObject({ code: 'IN_FLIGHT' });
    await act(async () => resolveObservedIntent(options.idempotencyKey));
    expect(hook.result.current.unresolved).toBe(false);
});

it('F04 rejects a retained execute function from a previous scope before HTTP', async () => {
    const fetchMock = vi.fn<typeof fetch>(); vi.stubGlobal('fetch', fetchMock);
    const hook = renderHook(() => useCommand('confirmOrder', []), { wrapper });
    const stale = hook.result.current.execute;
    scope = { ...scope, shop: { ...scope.shop, id: 'shop-2' } }; hook.rerender();
    await expect(stale(options)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled(); expect(intentSnapshot()).toHaveLength(0);
});

it('F04 does not report success when the scope closes while authoritative cache refresh is pending', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(response(202, 'succeeded')); vi.stubGlobal('fetch', fetchMock);
    let finish!: () => void;
    const refresh = vi.spyOn(cache, 'invalidateQueries').mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    const hook = renderHook(() => useCommand('confirmOrder', ['getOrder']), { wrapper });
    let execution!: Promise<unknown>;
    await act(async () => { execution = hook.result.current.execute(options).catch(error => error); for (let i = 0; i < 10; i++) await Promise.resolve(); });
    expect(refresh).toHaveBeenCalledOnce();
    await act(async () => { hook.unmount(); finish(); });
    expect(await execution).toMatchObject({ name: 'AbortError' });
    expect(intentSnapshot()).toHaveLength(0); expect(fetchMock).toHaveBeenCalledOnce(); refresh.mockRestore();
});

it('F04 rejects a pre-aborted execution without sending or recording an unknown mutation', async () => {
    const fetchMock = vi.fn<typeof fetch>(); vi.stubGlobal('fetch', fetchMock);
    const hook = renderHook(() => useCommand('confirmOrder', []), { wrapper });
    const controller = new AbortController(); controller.abort();
    await expect(hook.result.current.execute({ ...options, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled(); expect(intentSnapshot()).toHaveLength(0);
});

it('F04 only completes after authoritative success while the StrictMode scope remains alive', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(response(202, 'accepted')).mockResolvedValueOnce(response(200, 'succeeded'));
    vi.stubGlobal('fetch', fetchMock);
    const hook = renderHook(() => useCommand('confirmOrder', []), { wrapper });
    let execution!: ReturnType<typeof hook.result.current.execute>;
    await act(async () => { execution = hook.result.current.execute(options); for (let i = 0; i < 10; i++) await Promise.resolve(); await vi.advanceTimersByTimeAsync(400); });
    await expect(execution).resolves.toMatchObject({ data: { status: 'succeeded' } });
    expect(fetchMock).toHaveBeenCalledTimes(2); expect(intentSnapshot()).toHaveLength(0);
});
