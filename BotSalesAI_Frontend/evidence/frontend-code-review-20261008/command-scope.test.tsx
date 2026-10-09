import { afterEach, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import type { CommandResponse } from '@botsales/contracts';
import { ScopeContext } from '../../apps/web/src/shared/model/scope';
import type { Scope } from '../../apps/web/src/shared/model/scope';
import { cancelScopeRequests, setCsrfToken } from '../../apps/web/src/shared/api/client';
import { useCommand } from '../../apps/web/src/shared/api/hooks';

// This is a diagnostic assertion of the current defect, not a product acceptance test.
const membership: Scope['membership'] = { id: 'member-1', userId: 'user-1', shopId: 'shop-1', roles: ['owner'], permissions: [], permissionVersion: 1, status: 'active' };
const scope: Scope = {
  membership, online: true, refreshSession: async () => undefined,
  shop: { id: 'shop-1', name: 'Synthetic scope', currency: 'VND', timezone: 'Asia/Vientiane', locale: 'vi-VN', defaultWarehouseId: 'warehouse-1', version: 1, policyVersion: 'policy-1' },
  session: { user: { id: 'user-1', displayName: 'Synthetic user', email: 'review@example.test' }, memberships: [membership], csrfToken: 'csrf-review-123456', expiresAt: '2030-12-31T00:00:00Z' },
};
const cache = new QueryClient();
const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={cache}><ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider></QueryClientProvider>;
const envelope = (status: CommandResponse['data']['status']): CommandResponse => ({
  data: { id: 'command-1', shopId: 'shop-1', status, kind: 'confirm_order', createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z', result: null, problem: null },
  meta: { requestId: 'request-1', asOf: '2026-10-08T00:00:00Z' },
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); setCsrfToken(''); cancelScopeRequests(); cache.clear(); });
it('REPRODUCES old-scope command polling and success after unmount and scope cancellation', async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(JSON.stringify(envelope('accepted')), { status: 202, headers: { 'Content-Type': 'application/json' } }))
    .mockResolvedValueOnce(new Response(JSON.stringify(envelope('succeeded')), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', fetchMock);
  setCsrfToken(scope.session.csrfToken);
  const hook = renderHook(() => useCommand('confirmOrder', []), { wrapper });
  let execution!: ReturnType<typeof hook.result.current.execute>;
  await act(async () => {
    execution = hook.result.current.execute({ path: { orderId: 'order-1' }, body: { expectedVersion: 1, quoteId: 'quote-1', customerConfirmationId: 'evidence-1' } });
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  hook.unmount();
  cancelScopeRequests();
  await vi.advanceTimersByTimeAsync(400);
  await expect(execution).resolves.toMatchObject({ data: { status: 'succeeded' } });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v2/shops/shop-1/commands/command-1');
  console.log('R8-command-scope: REPRODUCED; old-shop GET sent and command resolves succeeded after unmount/cancelScopeRequests');
});
