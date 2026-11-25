import {
    BadRequestException, ConflictException, ForbiddenException, ServiceUnavailableException, UnauthorizedException,
} from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import * as oidc from 'openid-client';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import { serializable } from '../../../platform/database/transactions.js';
import type { AuthConfig } from './config.js';
import { validIdempotencyKey } from '../../../http/contract-source.js';
import { validUuid } from '../../../http/query.js';
import { acceptInvitations } from '../members/invitations.js';
import { activeMembership, membershipDto, membershipFields, requireShopAccess } from '../policy/access.js';
import { OidcClient } from './oidc.js';
import { issueStepUp, renewConfirmedSession, revealStepUp, type StepUpRequest } from './step-up.js';
import {
    activeSession, cookieToken, csrfMatches, csrfToken, headerValue, loginCookie, loginLifetime, opaqueToken,
    requireMutationCsrf, requireSessionToken, sessionCookie, sessionLifetime, tokenHash,
} from './session-tokens.js';

const returnPaths = new Set(['/login', '/workspaces']);
const stepUpBrowserHash = (browser: string, session: string) => tokenHash('step-up/browser/v1:' + browser + ':' + session);

function loginReturnPath(returnTo: string): string {
    if (returnPaths.has(returnTo)) return returnTo;
    const path = /^\/s\/([a-f0-9-]{36})\/(?:notifications|orders\/([a-f0-9-]{36}))$/.exec(returnTo);
    if (path && path[0] === returnTo && validUuid(path[1]!) && (!path[2] || validUuid(path[2]))) return returnTo;
    return '/workspaces';
}

export class AuthService {
    private readonly oidcClient?: OidcClient;

    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {
        if (config) this.oidcClient = new OidcClient(config);
    }

    private setup() {
        if (!this.db || !this.config || !this.oidcClient) throw new ServiceUnavailableException();
        return { db: this.db, config: this.config, oidcClient: this.oidcClient };
    }

    async stepUp(headers: IncomingHttpHeaders, input: StepUpRequest) {
        const { db, config, oidcClient } = this.setup();
        if ('password' in input) return { data: await issueStepUp(db, config, headers, input.password) };
        if (input.action === 'complete') return { data: await revealStepUp(db, config, headers), clearConfirmation: true };
        const token = requireSessionToken(headers);
        requireMutationCsrf(config, headers, token);
        const browser = cookieToken(headers.cookie, loginCookie) ?? opaqueToken();
        const { shopId, privacyRequestId } = input;
        const returnTo = `/s/${shopId}/settings/privacy?approval=${privacyRequestId}`;
        const attempt = await serializable(db, async tx => {
            const now = new Date();
            const session = await tx.session.findFirst({ where: activeSession(token, now), select: { id: true, userId: true } });
            if (!session) throw new UnauthorizedException();
            await requireShopAccess(tx, session.userId, shopId, 'privacy.manage');
            await tx.authLoginAttempt.deleteMany({ where: { OR: [{ expiresAt: { lte: now } },
                { stepUpSessionId: session.id, consumedAt: null }] } });
            const state = oidc.randomState();
            const nonce = oidc.randomNonce();
            const verifier = oidc.randomPKCECodeVerifier();
            const expiresAt = new Date(now.getTime() + loginLifetime * 1000);
            await tx.authLoginAttempt.create({ data: { state, nonce, pkceVerifier: verifier, expiresAt,
                browserHash: stepUpBrowserHash(browser, token), idempotencyKeyHash: tokenHash(state), returnTo, returnToHash: tokenHash(returnTo),
                stepUpSessionId: session.id, stepUpShopId: shopId, stepUpResourceId: privacyRequestId } });
            return { state, nonce, verifier, expiresAt };
        }, true);
        const url = await oidcClient.authorize(attempt.state, attempt.nonce, attempt.verifier, true);
        return { browser, data: { authorizationUrl: url.href, expiresAt: attempt.expiresAt } };
    }

    async csrf(headers: IncomingHttpHeaders) {
        const { db, config } = this.setup();
        const browser = cookieToken(headers.cookie, loginCookie) ?? opaqueToken();
        const session = cookieToken(headers.cookie, sessionCookie);
        const current = session && await db.session.findFirst({ where: activeSession(session), select: { id: true } });
        const token = current ? csrfToken(config.signingKey, 'session', session) : csrfToken(config.signingKey, 'login', browser);
        return { token, browser };
    }

    async begin(headers: IncomingHttpHeaders, returnTo: string) {
        const { db, config, oidcClient } = this.setup();
        if (headers.origin !== config.appOrigin) throw new ForbiddenException();
        const browser = cookieToken(headers.cookie, loginCookie);
        if (!browser) throw new ForbiddenException();
        const { token } = await this.csrf(headers);
        if (!csrfMatches(token, headerValue(headers, 'x-csrf-token'))) throw new ForbiddenException();
        const idempotencyKey = headerValue(headers, 'idempotency-key');
        if (!validIdempotencyKey(idempotencyKey)) throw new BadRequestException();
        const now = new Date();
        const key = { browserHash: tokenHash(browser), idempotencyKeyHash: tokenHash(idempotencyKey) };
        const returnToHash = tokenHash(returnTo);
        const attempt = await db.$transaction(async tx => {
            await tx.authLoginAttempt.deleteMany({ where: { expiresAt: { lte: now } } });
            await tx.authLoginAttempt.createMany({
                data: {
                    ...key,
                    state: oidc.randomState(), nonce: oidc.randomNonce(), pkceVerifier: oidc.randomPKCECodeVerifier(),
                    returnToHash, returnTo: loginReturnPath(returnTo),
                    expiresAt: new Date(now.getTime() + loginLifetime * 1000),
                },
                skipDuplicates: true,
            });
            return tx.authLoginAttempt.findUniqueOrThrow({ where: { browserHash_idempotencyKeyHash: key } });
        });
        if (attempt.returnToHash !== returnToHash || attempt.consumedAt || !attempt.nonce || !attempt.pkceVerifier) {
            throw new ConflictException();
        }
        const url = await oidcClient.authorize(attempt.state, attempt.nonce, attempt.pkceVerifier);
        return { authorizationUrl: url.href, expiresAt: attempt.expiresAt.toISOString() };
    }

    async complete(headers: IncomingHttpHeaders, state: string, query: string, requestId: string) {
        const { db, oidcClient } = this.setup();
        const browser = cookieToken(headers.cookie, loginCookie);
        if (!browser) throw new BadRequestException();
        const previous = cookieToken(headers.cookie, sessionCookie);
        const where = { state, consumedAt: null, expiresAt: { gt: new Date() }, OR: [
            { browserHash: tokenHash(browser), stepUpSessionId: null },
            ...(previous ? [{ browserHash: stepUpBrowserHash(browser, previous), stepUpSessionId: { not: null } }] : []),
        ] };
        const attempt = await db.$transaction(async tx => {
            const pending = await tx.authLoginAttempt.findFirst({ where });
            if (!pending?.nonce || !pending.pkceVerifier) throw new BadRequestException();
            if (pending.stepUpSessionId && (!previous || !await tx.session.findFirst({
                where: { id: pending.stepUpSessionId, ...activeSession(previous) }, select: { id: true },
            }))) throw new UnauthorizedException();
            const claimed = await tx.authLoginAttempt.updateMany({
                where,
                data: { consumedAt: new Date(), nonce: null, pkceVerifier: null },
            });
            if (claimed.count !== 1) throw new BadRequestException();
            return { nonce: pending.nonce, verifier: pending.pkceVerifier, returnTo: pending.returnTo,
                stepUp: pending.stepUpSessionId && pending.stepUpShopId && pending.stepUpResourceId ? {
                    sessionId: pending.stepUpSessionId, scope: { shopId: pending.stepUpShopId, resourceId: pending.stepUpResourceId },
                    started: new Date(pending.expiresAt.getTime() - loginLifetime * 1000),
                } : undefined };
        });

        const identity = await oidcClient.redeem(query, state, attempt.nonce, attempt.verifier, attempt.stepUp?.started);
        if (attempt.stepUp) {
            if (!previous) throw new UnauthorizedException();
            return { returnTo: attempt.returnTo, ...await renewConfirmedSession(db, previous, attempt.stepUp.sessionId, attempt.stepUp.scope, identity, requestId) };
        }
        const token = opaqueToken();
        await serializable(db, async tx => {
            const user = await acceptInvitations(tx, identity, requestId);
            const now = new Date();
            if (previous) await tx.session.updateMany({ where: activeSession(previous, now), data: { revokedAt: now } });
            await tx.session.create({
                data: { userId: user.id, tokenHash: tokenHash(token), expiresAt: new Date(now.getTime() + sessionLifetime * 1000) },
            });
        }, true);
        return { token, sessionSeconds: sessionLifetime, returnTo: attempt.returnTo, confirmation: '', confirmationSeconds: 0 };
    }

    async session(headers: IncomingHttpHeaders) {
        const { db, config } = this.setup();
        const token = requireSessionToken(headers);
        const row = await db.session.findFirst({
            where: activeSession(token),
            select: {
                expiresAt: true,
                user: {
                    select: {
                        id: true, email: true, displayName: true,
                        memberships: { where: activeMembership, orderBy: { shopId: 'asc' }, select: membershipFields },
                    },
                },
            },
        });
        if (!row) throw new UnauthorizedException();
        const { memberships, ...user } = row.user;
        return {
            user,
            memberships: memberships.map(membershipDto),
            csrfToken: csrfToken(config.signingKey, 'session', token),
            expiresAt: row.expiresAt.toISOString(),
        };
    }

    async logout(headers: IncomingHttpHeaders): Promise<void> {
        const { db, config } = this.setup();
        const token = requireSessionToken(headers);
        requireMutationCsrf(config, headers, token);
        const now = new Date();
        const revoked = await db.session.updateMany({ where: activeSession(token, now), data: { revokedAt: now } });
        if (revoked.count !== 1) throw new UnauthorizedException();
    }

}
