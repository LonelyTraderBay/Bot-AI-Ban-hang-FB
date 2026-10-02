import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import type { CommandResponse, CustomerResponse, CustomerWrite, Meta, Membership, Session, Shop, User } from '@botsales/contracts';
import { ScopeContext } from '../src/shared/model/scope';
import type { Scope } from '../src/shared/model/scope';
import { operationUrl, request, setCsrfToken } from '../src/shared/api/client';
import { useCommand } from '../src/shared/api/hooks';
import { ApiError, UnknownResultError } from '../src/shared/api/errors';
import { resolveObservedIntent } from '../src/shared/api/intents';

const fetchMock = vi.fn<typeof fetch>();
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
let uuid = 0;

const meta: Meta = { requestId: 'request-1', asOf: '2026-09-30T08:00:00.000Z' };
const customerBody: CustomerWrite = { displayName: 'Khách thử', phone: null, email: null, notes: '' };
const user: User = { id: 'user-1', displayName: 'Người thử', email: 'demo@example.test' };
const membership: Membership = {
    id: 'membership-1', userId: user.id, shopId: 'shop-1', roles: ['owner'], permissions: [], permissionVersion: 4, status: 'active',
};
const session: Session = { user, memberships: [membership], csrfToken: 'csrf-fixture', expiresAt: '2026-10-01T00:00:00.000Z' };
const shop: Shop = {
    id: 'shop-1', name: 'Shop thử', currency: 'VND', timezone: 'Asia/Vientiane', locale: 'vi-VN',
    defaultWarehouseId: 'warehouse-1', version: 3, policyVersion: 'policy-1',
};
const scope: Scope = { session, shop, membership, online: true, refreshSession: async () => undefined };
const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
        <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>
    </QueryClientProvider>
);

function jsonResponse(status: number, body: unknown, contentType = 'application/json'): Response {
    return {
        status,
        ok: status >= 200 && status < 300,
        headers: { get: (name: string) => name.toLowerCase() === 'content-type' ? contentType : null },
        json: vi.fn().mockResolvedValue(body),
    } as unknown as Response;
}

function customerResponse(): CustomerResponse {
    const now = '2026-09-30T08:00:00.000Z';
    return {
        data: {
            id: 'customer-1', shopId: shop.id, version: 1, createdAt: now, updatedAt: now,
            displayName: customerBody.displayName, phone: null, email: null, notes: null,
            redactedFields: [], externalIdentity: null,
        },
        meta,
    };
}

function commandResponse(status: CommandResponse['data']['status']): CommandResponse {
    const now = '2026-09-30T08:00:00.000Z';
    return {
        data: { id: 'command-1', shopId: shop.id, status, kind: 'confirm_order', createdAt: now, updatedAt: now, result: null, problem: null },
        meta,
    };
}

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('crypto', { randomUUID: () => `fixture-${++uuid}` });
    setCsrfToken('csrf-fixture');
});

afterEach(() => {
    vi.useRealTimers();
    setCsrfToken('');
    queryClient.clear();
    vi.unstubAllGlobals();
});

describe('typed HTTP boundary', () => {
    it('serializes product status and category filters from the canonical operation contract', () => {
        const url=operationUrl('listProducts',{shopId:shop.id},{limit:20,status:'active',categoryId:'cat-0'});
        expect(url.split('?')[0]).toBe('/api/v2/shops/shop-1/products');
        expect(Object.fromEntries(new URLSearchParams(url.split('?')[1]))).toEqual({limit:'20',status:'active',categoryId:'cat-0'});
    });

    it('uses the generated same-origin base path and validates a successful response', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: { csrfToken: 'csrf-token-fixture-next' }, meta }));

        const result = await request('getCsrfToken');

        expect(result.data.csrfToken).toBe('csrf-token-fixture-next');
        const [url, init] = fetchMock.mock.calls[0] || [];
        expect(url).toBe('/api/v2/auth/csrf');
        expect(init).toMatchObject({ method: 'GET', credentials: 'same-origin', cache: 'no-store' });
        expect(init?.headers).toMatchObject({ Accept: 'application/json' });
    });

    it('preserves contract nulls, adds CSRF and idempotency headers, and validates the response DTO', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(201, customerResponse()));

        const result = await request('createCustomer', {
            path: { shopId: shop.id }, body: customerBody, idempotencyKey: 'intent-create-1',
        });

        expect(result.data.phone).toBeNull();
        expect(result.data.email).toBeNull();
        const [url, init] = fetchMock.mock.calls[0] || [];
        expect(url).toBe('/api/v2/shops/shop-1/customers');
        expect(init?.method).toBe('POST');
        expect(init?.credentials).toBe('same-origin');
        expect(init?.headers).toMatchObject({
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-Token': 'csrf-fixture',
            'Idempotency-Key': 'intent-create-1',
        });
        expect(JSON.parse(String(init?.body))).toEqual(customerBody);
    });

    it('sets If-Match from the required typed version option', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(200, customerResponse()));

        await request('updateCustomer', {
            path: { shopId: shop.id, customerId: 'customer-1' }, version: 7,
            body: { displayName: 'Tên mới' },
        });

        expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ 'If-Match': '"7"' });
    });

    it('fails closed when a contract-required version or CSRF token is missing', async () => {
        const missingVersion = Reflect.apply(request, undefined, [
            'updateCustomer', { path: { shopId: shop.id, customerId: 'customer-1' }, body: { displayName: 'Tên mới' } },
        ]) as Promise<unknown>;
        await expect(missingVersion).rejects.toMatchObject({ status: 428, code: 'VERSION_REQUIRED' });
        expect(fetchMock).not.toHaveBeenCalled();

        setCsrfToken('');
        await expect(request('createCustomer', { path: { shopId: shop.id }, body: customerBody })).rejects.toMatchObject({ code: 'CSRF_TOKEN_MISSING' });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects a missing contract-required request body before sending', async () => {
        const missingBody = Reflect.apply(request, undefined, [
            'createCustomer', { path: { shopId: shop.id } },
        ]) as Promise<unknown>;

        await expect(missingBody).rejects.toMatchObject({ status: 400, code: 'REQUEST_BODY_REQUIRED' });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects a request body that violates its canonical schema before sending', async () => {
        const invalidBody = Reflect.apply(request, undefined, [
            'createCustomer', { path: { shopId: shop.id }, body: { ...customerBody, displayName: '' } },
        ]) as Promise<unknown>;

        await expect(invalidBody).rejects.toThrow('Dữ liệu không đúng hợp đồng CustomerWrite');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects missing required query parameters before sending', async () => {
        await expect(request('getCashflow', { path: { shopId: shop.id }, query: { from: '2026-09-01T00:00:00Z', timezone: shop.timezone } }))
            .rejects.toMatchObject({ status: 400, code: 'QUERY_PARAMETER_REQUIRED' });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([409, 412, 422, 428, 429])('preserves structured Problem data for HTTP %i', async status => {
        fetchMock.mockResolvedValueOnce(jsonResponse(status, {
            type: 'about:blank', title: 'Yêu cầu không thể áp dụng', status,
            detail: 'Giữ nguyên dữ liệu đã nhập.', code: 'CONTRACT_ERROR', requestId: 'request-error',
            errors: [{ path: '/displayName', code: 'INVALID', message: 'Tên không hợp lệ.' }],
            retryAfterSeconds: status === 429 ? 12 : undefined,
        }, 'application/problem+json'));

        const pending = request('createCustomer', { path: { shopId: shop.id }, body: customerBody });

        await expect(pending).rejects.toMatchObject({
            status, code: 'CONTRACT_ERROR', problem: { status, errors: [{ path: '/displayName', message: 'Tên không hợp lệ.' }] },
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not send a caller-aborted request', async () => {
        const controller = new AbortController();
        controller.abort();

        await expect(request('getCsrfToken', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('classifies a mutation timeout as an unknown result and a read timeout as retryable transport failure', async () => {
        vi.useFakeTimers();
        const fetchUntilAbort = (_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
        });
        fetchMock.mockImplementation(fetchUntilAbort);

        const mutation = request('createCustomer', { path: { shopId: shop.id }, body: customerBody, idempotencyKey: 'intent-timeout-1' });
        const mutationFailure = expect(mutation).rejects.toBeInstanceOf(UnknownResultError);
        await vi.advanceTimersByTimeAsync(25_000);
        await mutationFailure;
        resolveObservedIntent('intent-timeout-1');

        const read = request('getCsrfToken');
        const readFailure = expect(read).rejects.toMatchObject({ status: 0, code: 'REQUEST_TIMEOUT' });
        await vi.advanceTimersByTimeAsync(25_000);
        await readFailure;
    });

    it('marks a successful HTTP response with an invalid DTO as unknown for mutations', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(201, { data: { id: 'incomplete' }, meta }));

        await expect(request('createCustomer', { path: { shopId: shop.id }, body: customerBody, idempotencyKey: 'intent-invalid-1' }))
            .rejects.toBeInstanceOf(UnknownResultError);
        resolveObservedIntent('intent-invalid-1');
    });

    it('rejects an unsupported command status instead of treating it as successful', async () => {
        const succeeded = commandResponse('succeeded');
        fetchMock.mockResolvedValueOnce(jsonResponse(200, {
            ...succeeded,
            data: { ...succeeded.data, status: 'finished' },
        }));

        await expect(request('getCommand', { path: { shopId: shop.id, commandId: 'command-1' } }))
            .rejects.toThrow('Dữ liệu không đúng hợp đồng CommandResponse');
    });

    it('waits for command completion after HTTP 202 before resolving useCommand', async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse(202, commandResponse('accepted')))
            .mockResolvedValueOnce(jsonResponse(200, commandResponse('succeeded')));
        const { result } = renderHook(() => useCommand('confirmOrder', []), { wrapper });
        let settled = false;

        await act(async () => {
            const execution = result.current.execute({
                path: { orderId: 'order-1' },
                body: { expectedVersion: 5, quoteId: 'quote-1', customerConfirmationId: 'confirmation-1' },
            }).then(value => { settled = true; return value; });
            await Promise.resolve();
            expect(settled).toBe(false);
            await expect(execution).resolves.toMatchObject({ data: { status: 'succeeded' } });
        });

        expect(settled).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v2/shops/shop-1/commands/command-1');
    });

    it('keeps an accepted command unresolved when command status polling fails', async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse(202, commandResponse('accepted')))
            .mockResolvedValueOnce(jsonResponse(503, {
                type: 'about:blank', title: 'Tạm thời không đọc được trạng thái', status: 503,
                code: 'STATUS_UNAVAILABLE', requestId: 'request-status-unavailable',
            }, 'application/problem+json'));
        const { result } = renderHook(() => useCommand('confirmOrder', []), { wrapper });
        const options = {
            path: { orderId: 'order-1' },
            body: { expectedVersion: 5, quoteId: 'quote-1', customerConfirmationId: 'confirmation-1' },
            idempotencyKey: 'intent-poll-failure',
        };

        await act(async () => {
            await expect(result.current.execute(options)).rejects.toBeInstanceOf(UnknownResultError);
        });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        await expect(result.current.execute(options)).rejects.toMatchObject({ code: 'IN_FLIGHT' });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        resolveObservedIntent('intent-poll-failure');
    });
});
