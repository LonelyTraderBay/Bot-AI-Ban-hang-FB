const origins = {
    global: 'https://api.openai.com', us: 'https://us.api.openai.com', eu: 'https://eu.api.openai.com',
    au: 'https://au.api.openai.com', ca: 'https://ca.api.openai.com', jp: 'https://jp.api.openai.com',
    in: 'https://in.api.openai.com', sg: 'https://sg.api.openai.com', kr: 'https://kr.api.openai.com',
    gb: 'https://gb.api.openai.com', ae: 'https://ae.api.openai.com',
} as const;

export type OpenAiRegion = keyof typeof origins;
export type OpenAiScope = { region: OpenAiRegion; projectId: string; model: string };

export const isOpenAiRegion = (value: unknown): value is OpenAiRegion => typeof value === 'string' && Object.hasOwn(origins, value);
export const isOpenAiProject = (value: unknown): value is string => typeof value === 'string' && /^proj_[A-Za-z0-9]{8,100}$/.test(value);
export const isOpenAiSnapshot = (value: unknown): value is string => typeof value === 'string' && /^[a-z][a-z0-9.-]{1,105}-\d{4}-\d{2}-\d{2}$/.test(value);

export function jsonObject(value: unknown): Record<string, unknown> | undefined {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

export class OpenAiError extends Error {
    constructor(readonly code: string) { super(code); }
}

async function boundedJson(response: Response) {
    if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        const code = response.status === 401 || response.status === 403 ? 'PROVIDER_AUTH_REJECTED'
            : response.status === 429 ? 'PROVIDER_RATE_LIMITED'
                : response.status >= 400 && response.status < 500 && ![408, 409].includes(response.status)
                    ? 'PROVIDER_REQUEST_REJECTED' : 'PROVIDER_RESULT_UNKNOWN';
        throw new OpenAiError(code);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new OpenAiError('PROVIDER_RESPONSE_INVALID');
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 65_536) {
            await reader.cancel().catch(() => undefined);
            throw new OpenAiError('PROVIDER_RESPONSE_INVALID');
        }
        chunks.push(value);
    }
    return jsonObject(JSON.parse(Buffer.concat(chunks, size).toString('utf8')));
}

export async function requestOpenAi(scope: OpenAiScope, key: string, clientRequestId: string,
    operation: { kind: 'model' } | { kind: 'count' | 'generate'; body: object }, request = fetch) {
    const path = operation.kind === 'model' ? '/v1/models/' + encodeURIComponent(scope.model)
        : operation.kind === 'count' ? '/v1/responses/input_tokens' : '/v1/responses';
    try {
        const response = await request(origins[scope.region] + path, {
            method: operation.kind === 'model' ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(20_000),
            headers: { authorization: 'Bearer ' + key, 'openai-project': scope.projectId, 'content-type': 'application/json',
                'x-client-request-id': clientRequestId },
            ...(operation.kind === 'model' ? {} : { body: JSON.stringify(operation.body) }),
        });
        return await boundedJson(response);
    } catch (error) {
        if (error instanceof OpenAiError) throw error;
        throw new OpenAiError('PROVIDER_RESULT_UNKNOWN');
    }
}
