import { API_BASE_PATH, operations } from '@botsales/contracts';
import type { OperationId, Operations, RequestOf, ResponseOf, Problem } from '@botsales/contracts';
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
export type QueryOperationId = { [K in OperationId]: Operations[K]['method'] extends 'GET' ? K : never }[OperationId];
export type MutationOperationId = Exclude<OperationId, QueryOperationId>;
type RequestBodyOptionsFor<Request> = Request extends FormData
        ? { body?: never; form: FormData }
        : Request extends undefined
            ? { body?: never; form?: never }
            : { body: Request; form?: never };
type RequestBodyOptions<K extends OperationId> = RequestBodyOptionsFor<RequestOf<K>>;

export type ApiOptionsBase<K extends OperationId> = RequestBodyOptions<K> & {
    path?: Partial<Operations[K]['path']>;
    query?: Partial<Operations[K]['query']>;
    signal?: AbortSignal;
    idempotencyKey?: string;
};
export type QueryApiOptions<K extends QueryOperationId> = {
    path?: Partial<Operations[K]['path']>;
    query?: Partial<Operations[K]['query']>;
    signal?: AbortSignal;
};
type RuntimeApiOptions = {
    path?: Record<string, string>;
    query?: Record<string, string | number | boolean | null | undefined>;
    body?: unknown;
    form?: FormData;
    signal?: AbortSignal;
    version?: number;
    idempotencyKey?: string;
};

type VersionOption<K extends OperationId> = Operations[K]['versionRequired'] extends true
    ? { version: number }
    : { version?: number };

export type ApiOptions<K extends OperationId> = ApiOptionsBase<K> & VersionOption<K>;
export type ApiArguments<K extends MutationOperationId> = Operations[K]['versionRequired'] extends true
    ? [options: ApiOptions<K>]
    : Operations[K]['request'] extends undefined
        ? [options?: ApiOptions<K>]
        : [options: ApiOptions<K>];
export function operationUrl(op: OperationId, path: object = {}, query: object = {}) {
    const pathValues = path as Record<string, string>;
    const queryValues = query as Record<string, string | number | boolean | null | undefined>;
    const resolved = operations[op].path.replace(/\{([^}]+)\}/g, (_, key: string) => {
        if (!pathValues[key])
            throw new Error(`Thiếu tham số ${key} cho ${op}`);
        return encodeURIComponent(pathValues[key]);
    });
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(queryValues))
        if (v !== undefined && v !== null && v !== '')
            qs.set(k, String(v));
    return API_BASE_PATH + resolved + (qs.size ? '?' + qs : '');
}
export function request<K extends QueryOperationId>(op: K, options?: QueryApiOptions<K>): Promise<ResponseOf<K>>;
export function request<K extends MutationOperationId>(op: K, ...args: ApiArguments<K>): Promise<ResponseOf<K>>;
export async function request<K extends OperationId>(op: K, rawOptions?: RuntimeApiOptions): Promise<ResponseOf<K>> {
    const options = rawOptions ?? {};
    const spec = operations[op];
    const mutation = spec.method !== 'GET';
    if (options.signal?.aborted)
        throw new DOMException('Yêu cầu đã bị hủy trước khi gửi.', 'AbortError');
    for (const parameter of spec.queryParameters) {
        const value = options.query?.[parameter.name];
        if (parameter.required && (value === undefined || value === null || value === ''))
            throw new ApiError(400, 'QUERY_PARAMETER_REQUIRED', `Thiếu tham số ${parameter.name} cho ${op}.`);
    }
    if (spec.requestSchema && options.body === undefined)
        throw new ApiError(400, 'REQUEST_BODY_REQUIRED', 'Thao tác này cần dữ liệu theo hợp đồng API.');
    if (spec.bodyType === 'multipart' && !options.form && !(options.body instanceof FormData))
        throw new ApiError(400, 'REQUEST_BODY_REQUIRED', 'Thao tác tải tệp cần biểu mẫu multipart.');
    if (spec.bodyType !== 'multipart' && (options.form || options.body instanceof FormData))
        throw new ApiError(400, 'REQUEST_BODY_INVALID', 'Biểu mẫu multipart không được hỗ trợ cho thao tác này.');
    if (spec.headers.some(header => header.name === 'If-Match' && header.required) && options.version === undefined)
        throw new ApiError(428, 'VERSION_REQUIRED', 'Thao tác này cần phiên bản hiện tại của dữ liệu.');
    if (mutation && !csrfToken)
        throw new ApiError(0, 'CSRF_TOKEN_MISSING', 'Phiên chưa sẵn sàng để gửi thay đổi. Hãy tải lại phiên rồi thử lại.');
    const epoch = scopeEpoch;
    const controller = new AbortController();
    activeRequests.add(controller);
    const cancel = () => controller.abort();
    options.signal?.addEventListener('abort', cancel, { once: true });
    if (options.signal?.aborted)
        controller.abort();
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort('timeout'); }, 25000);
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
        if (controller.signal.aborted)
            throw new DOMException('Yêu cầu đã bị hủy trước khi gửi.', 'AbortError');
        sent = true;
        const response = await fetch(url, { method: spec.method, credentials: 'same-origin', cache: 'no-store', headers, body, signal: controller.signal });
        if (epoch !== scopeEpoch)
            throw new DOMException('Đã chuyển cửa hàng hoặc phiên', 'AbortError');
        if (response.status === 204 && response.ok)
            return undefined as ResponseOf<K>;
        let raw: unknown;
        try {
            raw = await response.json();
        }
        catch {
            if (!response.ok)
                throw new ApiError(response.status, 'HTTP_ERROR', `Yêu cầu thất bại (${response.status}).`);
            throw new ApiError(response.status, 'INVALID_RESPONSE', 'API trả về dữ liệu không hợp lệ.');
        }
        if (epoch !== scopeEpoch)
            throw new DOMException('Đã chuyển cửa hàng hoặc phiên', 'AbortError');
        if (!response.ok) {
            let problem: Problem | undefined;
            try {
                assertSchema<Problem>('Problem', raw);
                problem = raw;
            }
            catch { /* Unknown server payload stays untrusted. */ }
            throw new ApiError(response.status, problem?.code || 'HTTP_ERROR', problem?.detail || problem?.title || `Yêu cầu thất bại (${response.status})`, problem);
        }
        const contentType = response.headers?.get('content-type');
        if (contentType && !/^(application\/json|[\w.+-]+\/[\w.+-]+\+json)(?:\s*;|$)/i.test(contentType))
            throw new ApiError(response.status, 'UNEXPECTED_CONTENT_TYPE', 'Kiểu dữ liệu phản hồi không đúng hợp đồng.');
        if (spec.responseSchema)
            assertSchema<ResponseOf<K>>(spec.responseSchema, raw);
        return raw as ResponseOf<K>; // sole decoded boundary; runtime schema validated immediately above
    }
    catch (error) {
        if (mutation && sent && (!(error instanceof ApiError) || error.status >= 500 || error.status < 300)) {
            const commandId = error instanceof ApiError ? error.problem?.commandId : undefined;
            rememberUnknown({ intentId: intent, shopId: options.path?.shopId || '', operation: op, commandId: commandId || null });
            throw new UnknownResultError(intent, commandId);
        }
        if (error instanceof ApiError)
            throw error;
        if (epoch !== scopeEpoch || options.signal?.aborted)
            throw new DOMException('Yêu cầu đã hủy theo phạm vi', 'AbortError');
        if (timedOut)
            throw new ApiError(0, 'REQUEST_TIMEOUT', 'Yêu cầu đã quá thời gian chờ. Hãy kiểm tra trạng thái trước khi gửi lại.');
        throw error;
    }
    finally {
        clearTimeout(timeout);
        options.signal?.removeEventListener('abort', cancel);
        activeRequests.delete(controller);
    }
}
