import { operations } from '@botsales/contracts';
import type { OperationId, RequestOf, ResponseOf, Problem } from '@botsales/contracts';
import { ApiError, UnknownResultError } from './errors';
import { assertSchema } from './validation';
import { rememberUnknown } from './intents';
let csrfToken = '';
let scopeEpoch = 0;
const activeRequests = new Set<AbortController>();
export function setCsrfToken(token: string) { csrfToken = token; }
export function cancelScopeRequests() {
    scopeEpoch += 1;
    for (const controller of activeRequests)
        controller.abort();
    activeRequests.clear();
}
export interface ApiOptions<K extends OperationId> {
    path?: Record<string, string>;
    query?: Record<string, string | number | boolean | null | undefined>;
    body?: RequestOf<K>;
    form?: FormData;
    signal?: AbortSignal;
    version?: number;
    idempotencyKey?: string;
}
export function operationUrl(op: OperationId, path: Record<string, string> = {}, query: ApiOptions<OperationId>['query'] = {}) {
    const resolved = operations[op].path.replace(/\{([^}]+)\}/g, (_, key: string) => {
        if (!path[key])
            throw new Error(`Thiếu tham số ${key} cho ${op}`);
        return encodeURIComponent(path[key]);
    });
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query))
        if (v !== undefined && v !== null && v !== '')
            qs.set(k, String(v));
    return '/api/v2' + resolved + (qs.size ? '?' + qs : '');
}
export async function request<K extends OperationId>(op: K, options: ApiOptions<K> = {}): Promise<ResponseOf<K>> {
    const spec = operations[op];
    const mutation = spec.method !== 'GET';
    const epoch = scopeEpoch;
    const controller = new AbortController();
    activeRequests.add(controller);
    const cancel = () => controller.abort();
    options.signal?.addEventListener('abort', cancel, { once: true });
    if (options.signal?.aborted)
        controller.abort();
    const timeout = setTimeout(() => controller.abort('timeout'), 25000);
    const intent = options.idempotencyKey || crypto.randomUUID();
    const headers: Record<string, string> = { Accept: 'application/json', 'X-Request-ID': crypto.randomUUID() };
    if (mutation) {
        headers['X-CSRF-Token'] = csrfToken;
        headers['Idempotency-Key'] = intent;
    }
    if (options.version !== undefined)
        headers['If-Match'] = '"' + options.version + '"';
    let sent = false;
    try {
        let body: BodyInit | undefined;
        if (options.form)
            body = options.form;
        else if (options.body instanceof FormData)
            body = options.body;
        else if (options.body !== undefined) {
            if (spec.requestSchema)
                assertSchema<RequestOf<K>>(spec.requestSchema, options.body);
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(options.body);
        }
        const url = operationUrl(op, options.path, options.query);
        sent = true;
        const response = await fetch(url, { method: spec.method, credentials: 'same-origin', cache: 'no-store', headers, body, signal: controller.signal });
        if (epoch !== scopeEpoch)
            throw new DOMException('Đã chuyển cửa hàng hoặc phiên', 'AbortError');
        if (response.status === 204)
            return undefined as ResponseOf<K>;
        const raw: unknown = await response.json();
        if (!response.ok) {
            let problem: Problem | undefined;
            try {
                assertSchema<Problem>('Problem', raw);
                problem = raw;
            }
            catch { /* Unknown server payload stays untrusted. */ }
            throw new ApiError(response.status, problem?.code || 'HTTP_ERROR', problem?.detail || problem?.title || `Yêu cầu thất bại (${response.status})`, problem);
        }
        if (spec.responseSchema)
            assertSchema<ResponseOf<K>>(spec.responseSchema, raw);
        return raw as ResponseOf<K>; // sole decoded boundary; runtime schema validated immediately above
    }
    catch (error) {
        if (mutation && sent && (!(error instanceof ApiError) || error.status >= 500)) {
            rememberUnknown({ intentId: intent, shopId: options.path?.shopId || '', operation: op, commandId: null });
            throw new UnknownResultError(intent);
        }
        if (error instanceof ApiError)
            throw error;
        if (epoch !== scopeEpoch || options.signal?.aborted)
            throw new DOMException('Yêu cầu đã hủy theo phạm vi', 'AbortError');
        throw error;
    }
    finally {
        clearTimeout(timeout);
        options.signal?.removeEventListener('abort', cancel);
        activeRequests.delete(controller);
    }
}
