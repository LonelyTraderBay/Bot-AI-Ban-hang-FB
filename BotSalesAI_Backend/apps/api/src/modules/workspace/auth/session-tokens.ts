import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import type { Prisma } from '../../../generated/prisma/client.js';
import type { AuthConfig } from './config.js';

export const loginCookie = '__Host-bs_login';
export const sessionCookie = '__Host-bs_session';
export const stepUpCookie = '__Host-bs_step_up';
export const loginLifetime = 10 * 60;
export const sessionLifetime = 8 * 60 * 60;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function opaqueToken(): string {
    return randomBytes(32).toString('base64url');
}

export function tokenHash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

export function cookieToken(header: string | undefined, name: string): string | undefined {
    const prefix = name + '=';
    const cookies = (header ?? '').split(';').map(part => part.trim()).filter(part => part.startsWith(prefix));
    const token = cookies.length === 1 ? cookies[0].slice(prefix.length) : undefined;
    return token && tokenPattern.test(token) ? token : undefined;
}

export function secureCookie(name: string, token: string, seconds: number): string {
    return `${name}=${token}; Max-Age=${seconds}; Path=/; Secure; HttpOnly; SameSite=Lax`;
}

export function csrfToken(key: Buffer, kind: 'login' | 'session', token: string): string {
    return createHmac('sha256', key).update(kind + ':' + token).digest('base64url');
}

export function csrfMatches(expected: string, received: string | undefined): boolean {
    return Boolean(received && tokenPattern.test(received) && timingSafeEqual(Buffer.from(expected), Buffer.from(received)));
}

export function headerValue(headers: IncomingHttpHeaders, name: string): string | undefined {
    const value = headers[name];
    return typeof value === 'string' ? value : undefined;
}

export function requireSessionToken(headers: IncomingHttpHeaders): string {
    const token = cookieToken(headers.cookie, sessionCookie);
    if (!token) throw new UnauthorizedException();
    return token;
}

export const activeSession = (token: string, now = new Date()) => ({
    tokenHash: tokenHash(token), revokedAt: null, expiresAt: { gt: now },
});

export function requireMutationCsrf(config: AuthConfig, headers: IncomingHttpHeaders, token: string): void {
    if (headers.origin !== config.appOrigin ||
        !csrfMatches(csrfToken(config.signingKey, 'session', token), headerValue(headers, 'x-csrf-token'))) {
        throw new ForbiddenException();
    }
}

export async function requirePublicBrowserCsrf(tx: Prisma.TransactionClient, config: AuthConfig, headers: IncomingHttpHeaders) {
    const browser = cookieToken(headers.cookie, loginCookie);
    if (!browser || headers.origin !== config.appOrigin) throw new ForbiddenException();
    const session = cookieToken(headers.cookie, sessionCookie);
    const active = session && await tx.session.findFirst({ where: activeSession(session), select: { id: true } });
    const token = active && session ? csrfToken(config.signingKey, 'session', session) : csrfToken(config.signingKey, 'login', browser);
    if (!csrfMatches(token, headerValue(headers, 'x-csrf-token'))) throw new ForbiddenException();
}
