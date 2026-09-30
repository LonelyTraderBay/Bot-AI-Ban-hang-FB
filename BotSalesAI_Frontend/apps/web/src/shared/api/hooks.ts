import { useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { OperationId, ResponseOf } from '@botsales/contracts';
import { operations } from '@botsales/contracts';
import { request } from './client';
import type { ApiOptions } from './client';
import { ApiError, UnknownResultError } from './errors';
import { useScope } from '../model/scope';
import { rememberUnknown, hasUnknownIntent } from './intents';
export function useApi<K extends OperationId>(op: K, options: Omit<ApiOptions<K>, 'signal'> = {}, enabled = true) {
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
export function useCommand<K extends OperationId>(op: K, invalidate: readonly OperationId[]) {
    const scope = useScope();
    const cache = useQueryClient();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const inFlight = useRef(false);
    const unresolved = useRef(false);
    if (!hasUnknownIntent(scope.shop.id, op))
        unresolved.current = false;
    const execute = useCallback(async (options: ApiOptions<K> = {}): Promise<ResponseOf<K>> => {
        if (inFlight.current || unresolved.current || hasUnknownIntent(scope.shop.id, op))
            throw new ApiError(409, 'IN_FLIGHT', 'Thao tác đang xử lý hoặc chưa xác minh kết quả.');
        if (!scope.online)
            throw new ApiError(0, 'OFFLINE', 'Đang ngoại tuyến. Không gửi thay đổi.');
        inFlight.current = true;
        setPending(true);
        setError(null);
        try {
            const result = await request(op, { ...options, path: { shopId: scope.shop.id, ...options.path }, idempotencyKey: crypto.randomUUID() });
            if (operations[op].responseSchema === 'CommandResponse' && result && typeof result === 'object' && 'data' in result) {
                const command = result.data;
                if (command && typeof command === 'object' && 'id' in command && typeof command.id === 'string' && 'status' in command) {
                    let observed = command.status;
                    if (observed === 'failed')
                        throw new ApiError(409, 'COMMAND_FAILED', 'Lệnh bị từ chối; xem kết quả kiểm tra của backend.');
                    for (let attempt = 0; ['accepted', 'running'].includes(String(observed)) && attempt < 8; attempt++) {
                        await new Promise(resolve => setTimeout(resolve, 400 + attempt * 150));
                        const current = await request('getCommand', { path: { shopId: scope.shop.id, commandId: command.id } });
                        observed = current.data.status;
                        if (observed === 'failed')
                            throw new ApiError(409, current.data.problem?.code || 'COMMAND_FAILED', current.data.problem?.detail || 'Lệnh bị từ chối.');
                    }
                    if (['unknown', 'accepted', 'running'].includes(String(observed)))
                        throw new UnknownResultError(options.idempotencyKey || command.id, command.id);
                }
            }
            await Promise.all(invalidate.map(id => cache.invalidateQueries({ queryKey: ['scope', scope.session.user.id, scope.shop.id, scope.membership.permissionVersion, id] })));
            return result;
        }
        catch (e) {
            const error = e instanceof Error ? e : new Error('Yêu cầu thất bại');
            setError(error);
            if (error instanceof UnknownResultError) {
                unresolved.current = true;
                rememberUnknown({ intentId: error.intentId, commandId: error.commandId || null, shopId: scope.shop.id, operation: op });
            }
            throw error;
        }
        finally {
            inFlight.current = false;
            setPending(false);
        }
    }, [cache, invalidate, op, scope]);
    return {
        execute, pending, error, clearError: () => setError(null), resetAfterReconcile: () => { unresolved.current = false; setError(null); }
    };
}
