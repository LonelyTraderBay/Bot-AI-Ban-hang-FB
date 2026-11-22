import { ForbiddenException, HttpException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import { serializable } from '../../../platform/database/transactions.js';
import { recordAudit } from '../../../platform/audit/index.js';
import { requireShopAccess } from '../policy/access.js';
import { usesLocalOidcFixture, type AuthConfig } from './config.js';
import { activeSession, cookieToken, opaqueToken, requireMutationCsrf, requireSessionToken, stepUpCookie, tokenHash } from './session-tokens.js';

const grantLifetimeMs = 5 * 60 * 1000;
const failureWindowMs = 15 * 60 * 1000;
const maxFailures = 5;
const grantHash = (token: string, oidc = false) => tokenHash((oidc ? 'step-up/oidc/v1:' : 'step-up/v1:') + token);
export type StepUpScope = { shopId: string; resourceId: string };
export type StepUpRequest = { action: 'begin'; shopId: string; privacyRequestId: string } | { action: 'complete' } | { password: string };

async function createGrant(tx: Prisma.TransactionClient, session: { id: string; expiresAt: Date }, now: Date, scope?: StepUpScope) {
    await tx.stepUpGrant.updateMany({ where: { sessionId: session.id, consumedAt: null }, data: { consumedAt: now } });
    const reauthToken = opaqueToken();
    const expiresAt = new Date(Math.min(session.expiresAt.getTime(), now.getTime() + grantLifetimeMs));
    await tx.stepUpGrant.create({ data: { tokenHash: grantHash(reauthToken, Boolean(scope)), sessionId: session.id, expiresAt, ...scope } });
    return { reauthToken, expiresAt };
}

export async function issueStepUp(db: PrismaClient, config: AuthConfig, headers: IncomingHttpHeaders, password: string) {
    const cookie = requireSessionToken(headers);
    requireMutationCsrf(config, headers, cookie);
    const expected = process.env.P0_STEP_UP_PASSWORD;
    if (!usesLocalOidcFixture(config) || !expected || expected.length < 16) throw new ServiceUnavailableException('Xác minh lại phiên chưa được cấu hình.');
    const fingerprint = (value: string) => createHmac('sha256', config.signingKey).update('step-up-fixture-password\n').update(value).digest();
    const matches = timingSafeEqual(fingerprint(password), fingerprint(expected));
    const result = await serializable(db, async tx => {
        const now = new Date();
        const session = await tx.session.findFirst({ where: activeSession(cookie, now) });
        if (!session) throw new UnauthorizedException();
        const failedAttempts = session.stepUpWindowUntil && session.stepUpWindowUntil > now ? session.stepUpFailures : 0;
        if (failedAttempts >= maxFailures) return { failure: 'limited' } as const;
        if (!matches) {
            await tx.session.update({ where: { id: session.id }, data: {
                stepUpFailures: failedAttempts + 1,
                stepUpWindowUntil: failedAttempts ? session.stepUpWindowUntil : new Date(now.getTime() + failureWindowMs),
            } });
            return { failure: 'incorrect' } as const;
        }
        await tx.session.update({ where: { id: session.id }, data: { stepUpFailures: 0, stepUpWindowUntil: null } });
        return createGrant(tx, session, now);
    }, true);
    if (!('failure' in result)) return result;
    if (result.failure === 'limited') throw new HttpException('Thử xác minh quá nhiều lần.', 429);
    throw new ForbiddenException();
}

export function renewConfirmedSession(db: PrismaClient, prior: string, sessionId: string, scope: StepUpScope,
    identity: { oidcIssuer: string; oidcSubject: string }, requestId: string) {
    return serializable(db, async tx => {
        const now = new Date();
        const where = { id: sessionId, ...activeSession(prior, now) };
        const session = await tx.session.findFirst({ where, include: { user: { select: { oidcIssuer: true, oidcSubject: true } } } });
        if (!session) throw new UnauthorizedException();
        if (identity.oidcIssuer !== session.user.oidcIssuer || identity.oidcSubject !== session.user.oidcSubject) throw new ForbiddenException();
        await requireShopAccess(tx, session.userId, scope.shopId, 'privacy.manage');
        const sessionSeconds = Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000);
        if (sessionSeconds < 1) throw new UnauthorizedException();
        const token = opaqueToken();
        const rotated = await tx.session.updateMany({ where, data: { tokenHash: tokenHash(token) } });
        if (rotated.count !== 1) throw new UnauthorizedException();
        const { reauthToken, expiresAt } = await createGrant(tx, session, now, scope);
        await recordAudit(tx, { shopId: scope.shopId, actorId: session.userId, requestId, action: 'stepUp',
            resourceType: 'privacy_request', resourceId: scope.resourceId, metadata: { method: 'oidc' } });
        return { token, sessionSeconds, confirmation: reauthToken, confirmationSeconds: Math.floor((expiresAt.getTime() - now.getTime()) / 1000) };
    }, true);
}

export function revealStepUp(db: PrismaClient, config: AuthConfig, headers: IncomingHttpHeaders) {
    const prior = requireSessionToken(headers);
    requireMutationCsrf(config, headers, prior);
    const token = cookieToken(headers.cookie, stepUpCookie);
    if (!token) throw new ForbiddenException('Cần xác minh lại phiên cho thao tác này.');
    return serializable(db, async tx => {
        const now = new Date();
        const session = await tx.session.findFirst({ where: activeSession(prior, now), select: { id: true, userId: true } });
        if (!session) throw new UnauthorizedException();
        const where = { tokenHash: grantHash(token, true), sessionId: session.id, consumedAt: null, revealedAt: null, expiresAt: { gt: now } };
        const proof = await tx.stepUpGrant.findFirst({ where, select: { shopId: true, resourceId: true, expiresAt: true } });
        if (!proof?.shopId || !proof.resourceId) throw new ForbiddenException();
        await requireShopAccess(tx, session.userId, proof.shopId, 'privacy.manage');
        const revealed = await tx.stepUpGrant.updateMany({ where, data: { revealedAt: now } });
        if (revealed.count !== 1) throw new ForbiddenException();
        return { reauthToken: token, expiresAt: proof.expiresAt };
    }, true);
}

export async function consumeStepUp(tx: Prisma.TransactionClient, headers: IncomingHttpHeaders, userId: string, reauthToken: string,
    scope: StepUpScope, config: AuthConfig) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(reauthToken)) throw new ForbiddenException();
    const now = new Date();
    const session = await tx.session.findFirst({ where: { ...activeSession(requireSessionToken(headers), now), userId }, select: { id: true } });
    const updated = session && await tx.stepUpGrant.updateMany({
        where: { sessionId: session.id, consumedAt: null, expiresAt: { gt: now }, OR: [
            { tokenHash: grantHash(reauthToken, true), ...scope, revealedAt: { not: null } },
            ...(usesLocalOidcFixture(config) ? [{ tokenHash: grantHash(reauthToken), shopId: null, resourceId: null }] : []),
        ] },
        data: { consumedAt: now },
    });
    if (!updated || updated.count !== 1) throw new ForbiddenException('Cần xác minh lại phiên cho thao tác này.');
}
