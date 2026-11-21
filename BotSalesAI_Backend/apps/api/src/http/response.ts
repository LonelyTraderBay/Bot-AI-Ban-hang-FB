import { HttpException, PreconditionFailedException } from '@nestjs/common';
import type { IncomingHttpHeaders, ServerResponse } from 'node:http';

export function noStore(response: ServerResponse): void {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
}

export function envelope<T>(response: ServerResponse, data: T) {
    return { data, meta: { requestId: String(response.getHeader('X-Request-Id')), asOf: new Date().toISOString() } };
}

export function versionETag(version: number): string {
    return '"' + version + '"';
}

export function requireIfMatch(headers: IncomingHttpHeaders): string {
    const version = headers['if-match'];
    if (typeof version !== 'string' || !version) throw new HttpException('If-Match required', 428);
    return version;
}

export function requireVersion(actual: number, expected: string | number): void {
    if (typeof expected === 'number' ? expected !== actual : expected !== versionETag(actual)) {
        throw new PreconditionFailedException();
    }
}

export function versionedEnvelope<T extends { version: number }>(response: ServerResponse, data: T) {
    response.setHeader('ETag', versionETag(data.version));
    return envelope(response, data);
}
