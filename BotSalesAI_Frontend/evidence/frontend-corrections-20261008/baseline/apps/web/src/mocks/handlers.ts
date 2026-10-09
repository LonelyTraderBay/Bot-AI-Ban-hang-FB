import { http, HttpResponse } from 'msw';
import { operations } from '@botsales/contracts';
import { assertSchema } from '../shared/api/validation';
import { handle, MockFailure, subscribeChanges, currentSession } from './service';
import { now } from './database';
const methods = { GET: http.get, POST: http.post, PUT: http.put, PATCH: http.patch, DELETE: http.delete };
function failure(status: number, code: string, message: string, requestId: string) { return HttpResponse.json({ type: 'about:blank', title: 'Yêu cầu chưa hoàn tất', status, code, detail: message, requestId }, { status }); }
export const handlers = Object.entries(operations).filter(([id]) => id !== 'subscribeEvents').sort((a, b) => (a[1].path.match(/\{/g) || []).length - (b[1].path.match(/\{/g) || []).length).map(([op, spec]) => {
    const method = methods[spec.method as keyof typeof methods];
    return method(`/api/v2${spec.path.replace(/\{([^}]+)\}/g, ':$1')}`, async ({ request, params }) => {
        const requestId = request.headers.get('X-Request-ID') || crypto.randomUUID();
        try {
            const url = new URL(request.url), path = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v || '']));
            let body: unknown;
            let form: FormData | undefined;
            if (spec.method !== 'GET') {
                if (request.headers.get('Content-Type')?.includes('multipart/form-data'))
                    form = await request.formData();
                else {
                    const text = await request.text();
                    body = text ? JSON.parse(text) : undefined;
                }
            }
            if (spec.requestSchema) {
                try {
                    assertSchema(spec.requestSchema, body);
                }
                catch (error) {
                    return failure(422, 'INVALID_REQUEST', error instanceof Error ? error.message : 'Dữ liệu không hợp lệ.', requestId);
                }
            }
            for (const header of spec.headers)
                if (header.required && !request.headers.get(header.name))
                    return failure(header.name.toLowerCase() === 'if-match' ? 428 : header.name.toLowerCase() === 'x-csrf-token' ? 403 : 400, header.name.toLowerCase() === 'x-csrf-token' ? 'CSRF_INVALID' : 'REQUIRED_HEADER', `Thiếu ${header.name}.`, requestId);
            const result = await handle({ op, path, body, form, query: url.searchParams, headers: Object.fromEntries(request.headers.entries()), origin: url.origin });
            if (result.status === 204)
                return new HttpResponse(null, { status: 204 });
            let data = result.data;
            let page: Record<string, unknown> | undefined;
            if (spec.responseSchema?.endsWith('ListResponse') && Array.isArray(data)) {
                const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
                const key = (item: unknown, index: number) => { if (item && typeof item === 'object')
                    return String('id' in item ? item.id : 'providerId' in item ? item.providerId : index); return String(index); };
                const cursor = url.searchParams.get('cursor');
                let offset = 0;
                if (cursor) {
                    const index = data.findIndex((item, i) => key(item, i) === cursor);
                    if (index < 0)
                        return failure(422, 'INVALID_CURSOR', 'Cursor không còn phù hợp. Mở lại đầu danh sách.', requestId);
                    offset = index + 1;
                }
                const count = data.length;
                const items = data.slice(offset, offset + limit);
                const hasMore = offset + items.length < count;
                page = { limit, total: count, hasMore, nextCursor: hasMore ? key(items[items.length - 1], offset + items.length - 1) : null };
                data = items;
            }
            const envelope = { data, meta: { requestId, asOf: now() }, ...(page ? { page } : {}) };
            if (spec.responseSchema)
                assertSchema(spec.responseSchema, envelope);
            return HttpResponse.json(envelope, { status: result.status });
        }
        catch (error) {
            if (error instanceof MockFailure)
                return failure(error.status, error.code, error.message, requestId);
            return failure(500, 'MOCK_CONTRACT_ERROR', error instanceof Error ? error.message : 'Lỗi mô phỏng.', requestId);
        }
    });
});
handlers.unshift(http.get('/api/v2/shops/:shopId/events', ({ params, request }) => {
    const shopId = String(params.shopId);
    try {
        const session = currentSession();
        const memberships = session.memberships;
        if (!Array.isArray(memberships) || !memberships.some(m => m && m.shopId === shopId && m.status === 'active'))
            return failure(403, 'FORBIDDEN', 'Không thuộc cửa hàng.', crypto.randomUUID());
    }
    catch {
        return failure(401, 'UNAUTHENTICATED', 'Phiên đã kết thúc.', crypto.randomUUID());
    }
    let unsubscribe = () => { };
    let closed = false;
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode(': mock-stream\n\n')); unsubscribe = subscribeChanges(event => { if (!closed && event.shopId === shopId)
            controller.enqueue(new TextEncoder().encode(`id: ${event.eventId}\ndata: ${JSON.stringify(event)}\n\n`)); }); request.signal.addEventListener('abort', () => { closed = true; unsubscribe(); try {
            controller.close();
        }
        catch { /* already closed */ } }, { once: true }); }, cancel() { closed = true; unsubscribe(); } });
    return new HttpResponse(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-store', 'Connection': 'keep-alive' } });
}));
