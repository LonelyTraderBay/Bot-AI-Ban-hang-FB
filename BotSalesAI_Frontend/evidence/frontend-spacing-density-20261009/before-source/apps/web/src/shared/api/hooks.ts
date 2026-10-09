import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import type { CommandResponse, OperationId, ResponseOf } from '@botsales/contracts';
import { operations } from '@botsales/contracts';
import { request, subscribeScopeCancellation } from './client';
import type { ApiArguments, ApiOptions, MutationOperationId, QueryApiOptions, QueryOperationId } from './client';
import { ApiError, UnknownResultError } from './errors';
import { useScope } from '../model/scope';
import { rememberUnknown, hasUnknownIntent, subscribeIntents, intentSnapshot } from './intents';
export function useApi<K extends QueryOperationId>(op: K, options: Omit<QueryApiOptions<K>, 'signal'> = {}, enabled = true) {
    const scope = useScope();
    const { user } = scope.session;
    const path = { shopId: scope.shop.id, ...options.path };
    const query = options.query || {};
    return useQuery<ResponseOf<K>, Error>({
        queryKey: ['scope', user.id, scope.shop.id, scope.membership.permissionVersion, op, path, query],
        queryFn: ({ signal }) => request(op, { ...options, path, signal }),
        enabled, staleTime: 5000,
        retry: (count, error) => count < 1 && (!(error instanceof ApiError) || error.status >= 500),
    });
}

/** Loads lookup choices in bounded cursor pages and retains prior pages for selected values. */
export function usePagedApi<K extends QueryOperationId>(op: K, options: Omit<QueryApiOptions<K>, 'signal'> = {}, enabled = true) {
    const scope = useScope();
    const { user } = scope.session;
    const path = { shopId: scope.shop.id, ...options.path };
    const { cursor: _cursor, limit: requestedLimit, ...filters } = (options.query || {}) as Record<string, string | number | boolean | undefined>;
    const limit = typeof requestedLimit === 'number' && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 20;
    const query = useInfiniteQuery<ResponseOf<K>, Error, InfiniteData<ResponseOf<K>, string | undefined>, readonly unknown[], string | undefined>({
        queryKey: ['scope', user.id, scope.shop.id, scope.membership.permissionVersion, op, path, { ...filters, limit, paged: true }],
        initialPageParam: undefined,
        queryFn: ({ signal, pageParam }) => request(op, { ...options, path, query: { ...filters, limit, cursor: pageParam } as QueryApiOptions<K>['query'], signal }),
        getNextPageParam: lastPage => {
            const page = (lastPage as unknown as { page?: { hasMore: boolean; nextCursor: string | null } }).page;
            return page?.hasMore && page.nextCursor ? page.nextCursor : undefined;
        },
        enabled,
        staleTime: 5000,
        retry: (count, error) => count < 1 && (!(error instanceof ApiError) || error.status >= 500),
    });
    const pages = query.data?.pages || [];
    const lastPage = pages.at(-1);
    const data = lastPage ? {
        ...(lastPage as object),
        data: pages.flatMap(page => (page as unknown as { data: unknown[] }).data),
    } as ResponseOf<K> : undefined;
    return {
        ...query,
        data,
        loadedCount: data ? ((data as unknown as { data: unknown[] }).data.length) : 0,
        loadMore: () => query.hasNextPage ? query.fetchNextPage() : Promise.resolve(undefined),
        hasMore: Boolean(query.hasNextPage),
        isLoadingMore: query.isFetchingNextPage,
    };
}

export function useCommand<K extends MutationOperationId>(op: K, invalidate: readonly OperationId[]) {
    const scope = useScope();
    const cache = useQueryClient();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const inFlight = useRef(false);
    const intents = useSyncExternalStore(subscribeIntents, intentSnapshot, intentSnapshot);
    const unresolved = intents.some(intent => intent.shopId === scope.shop.id && intent.operation === op);
    const mounted = useRef(false);
    const controllers = useRef(new Set<AbortController>());
    const identity = `${scope.session.user.id}:${scope.shop.id}:${scope.membership.permissionVersion}:${op}`;
    const currentIdentity = useRef(identity);
    currentIdentity.current = identity;
    useEffect(() => {
        mounted.current = true;
        const active = controllers.current;
        return () => {
            mounted.current = false;
            for (const controller of active) controller.abort();
            active.clear();
        };
    }, [identity]);
    const execute = useCallback(async (...args: ApiArguments<K>): Promise<ResponseOf<K>> => {
        const options = (args[0] ?? {}) as ApiOptions<K>;
        if (!mounted.current || currentIdentity.current !== identity || options.signal?.aborted)
            throw new DOMException('Màn hình hoặc phạm vi đã đóng.', 'AbortError');
        if (inFlight.current || hasUnknownIntent(scope.shop.id, op))
            throw new ApiError(409, 'IN_FLIGHT', 'Thao tác đang xử lý hoặc chưa xác minh kết quả.');
        if (!scope.online)
            throw new ApiError(0, 'OFFLINE', 'Đang ngoại tuyến. Không gửi thay đổi.');
        inFlight.current = true;
        setPending(true);
        setError(null);
        const controller = new AbortController();
        controllers.current.add(controller);
        const cancel = () => controller.abort();
        const unsubscribe = subscribeScopeCancellation(cancel);
        options.signal?.addEventListener('abort', cancel, { once: true });
        const alive = () => mounted.current && currentIdentity.current === identity && !controller.signal.aborted;
        const assertAlive = () => { if (!alive()) throw new DOMException('Màn hình hoặc phạm vi đã đóng.', 'AbortError'); };
        const intentId = options.idempotencyKey || crypto.randomUUID();
        let commandId: string | undefined;
        let unsettled = false;
        try {
            assertAlive();
            const result = await request(op, { ...options, path: { shopId: scope.shop.id, ...options.path }, signal: controller.signal, idempotencyKey: intentId });
            let settledResult = result;
            if (operations[op].responseSchema === 'CommandResponse' && result && typeof result === 'object' && 'data' in result) {
                const command = result.data;
                if (command && typeof command === 'object' && 'id' in command && typeof command.id === 'string' && 'status' in command) {
                    let observed = command.status;
                    commandId = command.id;
                    unsettled = ['accepted', 'running', 'unknown'].includes(String(observed));
                    if (observed === 'failed')
                        throw new ApiError(409, 'COMMAND_FAILED', 'Lệnh bị từ chối; xem kết quả kiểm tra của backend.');
                    for (let attempt = 0; ['accepted', 'running'].includes(String(observed)) && attempt < 8; attempt++) {
                        assertAlive();
                        await waitForPoll(400 + attempt * 150, controller.signal);
                        assertAlive();
                        let current: CommandResponse;
                        try {
                            current = await request('getCommand', { path: { shopId: scope.shop.id, commandId: command.id }, signal: controller.signal });
                        }
                        catch {
                            throw new UnknownResultError(intentId, command.id);
                        }
                        observed = current.data.status;
                        unsettled = ['accepted', 'running', 'unknown'].includes(String(observed));
                        settledResult = current as ResponseOf<K>;
                        if (observed === 'failed')
                            throw new ApiError(409, current.data.problem?.code || 'COMMAND_FAILED', current.data.problem?.detail || 'Lệnh bị từ chối.');
                    }
                    if (['unknown', 'accepted', 'running'].includes(String(observed)))
                        throw new UnknownResultError(intentId, command.id);
                }
            }
            assertAlive();
            await Promise.all(invalidate.map(id => cache.invalidateQueries({ queryKey: ['scope', scope.session.user.id, scope.shop.id, scope.membership.permissionVersion, id] })));
            assertAlive();
            return settledResult;
        }
        catch (e) {
            const error = e instanceof Error ? e : new Error('Yêu cầu thất bại');
            if (alive()) setError(error);
            if (error instanceof UnknownResultError) {
                rememberUnknown({ intentId: error.intentId, commandId: error.commandId || null, shopId: scope.shop.id, operation: op });
            }
            else if (unsettled) {
                rememberUnknown({ intentId, commandId: commandId || null, shopId: scope.shop.id, operation: op });
            }
            if (!alive()) throw new DOMException('Màn hình hoặc phạm vi đã đóng; kết quả chưa rõ được giữ để đối chiếu.', 'AbortError');
            throw error;
        }
        finally {
            inFlight.current = false;
            if (mounted.current && currentIdentity.current === identity) setPending(false);
            unsubscribe();
            options.signal?.removeEventListener('abort', cancel);
            controllers.current.delete(controller);
        }
    }, [cache, invalidate, op, scope, identity]);
    return {
        execute, pending, unresolved, error, clearError: () => setError(null), resetAfterReconcile: () => setError(null)
    };
}

function waitForPoll(ms: number, signal: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        const cancel = () => { clearTimeout(timer); signal.removeEventListener('abort', cancel); reject(new DOMException('Đã hủy kiểm tra lệnh.', 'AbortError')); };
        const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, ms);
        signal.addEventListener('abort', cancel, { once: true });
        if (signal.aborted) cancel();
    });
}
