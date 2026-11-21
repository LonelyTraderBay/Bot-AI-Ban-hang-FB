import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { fixtureIssuer } from '../../../apps/api/prisma/p0-fixture.mjs';

export const fixtureSessionCookie = '__Host-bs_session';

export function assertFixtureDatabase(connectionString) {
    const target = new URL(connectionString);
    assert.equal(target.hostname, '127.0.0.1');
    assert.equal(target.pathname, '/botsales_be_dev');
    assert.equal(target.username, 'botsales_runtime');
}

export async function fixtureSession(db, subject) {
    const user = await db.user.findUniqueOrThrow({
        where: { oidcIssuer_oidcSubject: { oidcIssuer: fixtureIssuer, oidcSubject: subject } },
        select: { id: true },
    });
    const token = randomBytes(32).toString('base64url');
    const session = await db.session.create({
        data: {
            userId: user.id,
            tokenHash: createHash('sha256').update(token).digest('hex'),
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
        select: { id: true },
    });
    return { id: session.id, userId: user.id, token, cookie: fixtureSessionCookie + '=' + token };
}

export async function restoreReader(db, shopId, userId) {
    await db.membership.updateMany({
        where: { shopId, userId, status: 'revoked' },
        data: { status: 'active', permissionVersion: { increment: 1 } },
    });
}
