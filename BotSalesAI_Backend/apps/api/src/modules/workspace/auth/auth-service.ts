import {
    BadRequestException, ConflictException, ForbiddenException, ServiceUnavailableException, UnauthorizedException,
} from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import * as oidc from 'openid-client';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import { serializable } from '../../../platform/database/transactions.js';
import type { AuthConfig } from './config.js';
import { validIdempotencyKey } from '../../../http/contract-source.js';
import { acceptInvitations } from '../members/invitations.js';
import { activeMembership, membershipDto, membershipFields } from '../policy/access.js';
import { OidcClient } from './oidc.js';
import {
    activeSession, cookieToken, csrfMatches, csrfToken, headerValue, loginCookie, loginLifetime, opaqueToken,
    requireMutationCsrf, requireSessionToken, sessionCookie, sessionLifetime, tokenHash,
} from './session-tokens.js';

const returnPaths = new Set(['/login', '/workspaces']);

export class AuthService {
    private readonly oidcClient?: OidcClient;

    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {
        if (config) this.oidcClient = new OidcClient(config);
    }

    private setup() {
        if (!this.db || !this.config || !this.oidcClient) throw new ServiceUnavailableException();
        return { db: this.db, config: this.config, oidcClient: this.oidcClient };
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
                    returnToHash, returnTo: returnPaths.has(returnTo) ? returnTo : '/workspaces',
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
        const where = { state, browserHash: tokenHash(browser), consumedAt: null, expiresAt: { gt: new Date() } };
        const attempt = await db.$transaction(async tx => {
            const pending = await tx.authLoginAttempt.findFirst({ where });
            if (!pending?.nonce || !pending.pkceVerifier) throw new BadRequestException();
            const claimed = await tx.authLoginAttempt.updateMany({
                where,
                data: { consumedAt: new Date(), nonce: null, pkceVerifier: null },
            });
            if (claimed.count !== 1) throw new BadRequestException();
            return { nonce: pending.nonce, verifier: pending.pkceVerifier, returnTo: pending.returnTo };
        });

        const identity = await oidcClient.redeem(query, state, attempt.nonce, attempt.verifier);
        const token = opaqueToken();
        const previous = cookieToken(headers.cookie, sessionCookie);
        await serializable(db, async tx => {
            const user = await acceptInvitations(tx, identity, requestId);
            const now = new Date();
            if (previous) await tx.session.updateMany({ where: activeSession(previous, now), data: { revokedAt: now } });
            await tx.session.create({
                data: { userId: user.id, tokenHash: tokenHash(token), expiresAt: new Date(now.getTime() + sessionLifetime * 1000) },
            });
        }, true);
        return { token, returnTo: attempt.returnTo };
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
