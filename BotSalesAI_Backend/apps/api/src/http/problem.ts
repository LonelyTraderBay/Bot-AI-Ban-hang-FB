import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { STATUS_CODES, type IncomingMessage, type ServerResponse } from 'node:http';
import { InvalidInput } from './contracts.js';

type TracedRequest = IncomingMessage & { requestId?: string };
const errorCodes: Readonly<Record<number, string>> = {
    400: 'BAD_REQUEST', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND',
    405: 'METHOD_NOT_ALLOWED', 413: 'PAYLOAD_TOO_LARGE', 415: 'UNSUPPORTED_MEDIA_TYPE',
    422: 'UNPROCESSABLE_CONTENT', 429: 'TOO_MANY_REQUESTS', 500: 'INTERNAL_ERROR',
    503: 'SERVICE_UNAVAILABLE',
};

export function requestTrace(request: TracedRequest, response: ServerResponse, next: () => void): void {
    request.requestId = randomUUID();
    response.setHeader('X-Request-Id', request.requestId);
    next();
}

@Catch()
export class ProblemFilter implements ExceptionFilter {
    private readonly logger = new Logger(ProblemFilter.name);

    catch(error: unknown, host: ArgumentsHost): void {
        const http = host.switchToHttp();
        const request = http.getRequest<TracedRequest>();
        const response = http.getResponse<ServerResponse>();
        const status = error instanceof HttpException ? error.getStatus() : 500;
        const requestId = request.requestId ?? randomUUID();
        const code = error instanceof InvalidInput ? 'VALIDATION_FAILED' : (errorCodes[status] ?? 'HTTP_ERROR');
        if (status === 500) this.logger.error({ requestId, code });
        if (response.headersSent) {
            response.end();
            return;
        }
        response.statusCode = status;
        response.setHeader('X-Request-Id', requestId);
        response.setHeader('Content-Type', 'application/problem+json');
        response.end(JSON.stringify({
            type: 'about:blank',
            title: STATUS_CODES[status] ?? 'HTTP Error',
            status,
            code,
            requestId,
            ...(error instanceof InvalidInput ? { errors: error.errors } : {}),
        }));
    }
}
