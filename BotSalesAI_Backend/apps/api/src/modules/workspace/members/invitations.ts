import { ConflictException } from '@nestjs/common';
import type { Prisma, Role } from '../../../generated/prisma/client.js';
import { tokenHash } from '../auth/session-tokens.js';
import { lockShopClosure } from '../../../platform/database/shop-lifecycle.js';
import { membershipAudit } from './activity.js';

const inviteLifetime = 7 * 24 * 60 * 60 * 1000;
export const clearInvitation = { inviteIssuer: null, inviteEmailHash: null, inviteExpiresAt: null };

export function invitationEmail(email: string): string {
    const at = email.lastIndexOf('@');
    return email.slice(0, at + 1) + email.slice(at + 1).toLowerCase();
}

export async function inviteMembership(tx: Prisma.TransactionClient, input: {
    shopId: string; actorId: string; requestId: string; issuer: string; email: string; roles: Role[];
}) {
    const { shopId, actorId, requestId, issuer, email, roles } = input;
    const now = new Date();
    const address = { inviteIssuer: issuer, inviteEmailHash: tokenHash(email) };
    const pending = await tx.membership.findFirst({ where: { shopId, ...address } });
    if (pending) {
        if (pending.inviteExpiresAt && pending.inviteExpiresAt > now) throw new ConflictException();
        const expired = await tx.membership.update({
            where: { shopId_id: { shopId, id: pending.id } },
            data: { ...clearInvitation, status: 'revoked', permissionVersion: { increment: 1 } },
        });
        await membershipAudit(tx, {
            shopId, actorId, requestId, memberId: expired.id, action: 'expireMembershipInvite',
            metadata: { permissionVersion: expired.permissionVersion },
        });
    }

    // Existing directory records are considered only within this shop. Authentication still uses issuer and subject.
    const local = (await tx.membership.findMany({
        where: { shopId, user: { oidcIssuer: issuer, email: { equals: email, mode: 'insensitive' } } },
        include: { user: { select: { email: true } } },
    })).filter(member => invitationEmail(member.user.email) === email);
    if (local.length > 1 || local.some(member => member.status !== 'revoked')) throw new ConflictException();

    const data = { ...address, inviteExpiresAt: new Date(now.getTime() + inviteLifetime), status: 'invited' as const, roles };
    if (local[0]) {
        return tx.membership.update({
            where: { shopId_id: { shopId, id: local[0].id } },
            data: { ...data, permissionVersion: { increment: 1 } },
        });
    }
    const provisional = await tx.user.create({ data: { displayName: 'Thành viên được mời', email }, select: { id: true } });
    return tx.membership.create({ data: { ...data, shopId, userId: provisional.id } });
}

interface VerifiedIdentity {
    oidcIssuer: string;
    oidcSubject: string;
    displayName: string;
    email: string;
}

export async function acceptInvitations(tx: Prisma.TransactionClient, identity: VerifiedIdentity, requestId: string) {
    const { oidcIssuer, oidcSubject, displayName, email } = identity;
    const key = { oidcIssuer_oidcSubject: { oidcIssuer, oidcSubject } };
    const activeInvites = await tx.membership.findMany({
        where: {
            status: 'invited', shop: { closedAt: null },
            inviteIssuer: oidcIssuer,
            inviteEmailHash: tokenHash(invitationEmail(email)),
            inviteExpiresAt: { gt: new Date() },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: { user: { select: { oidcIssuer: true } } },
    });
    const knownUser = await tx.user.findUnique({ where: key, select: { id: true } });
    const provisional = knownUser ? undefined : activeInvites.find(invited => invited.user.oidcIssuer === null);
    const user = provisional
        ? await tx.user.update({ where: { id: provisional.userId }, data: identity, select: { id: true } })
        : await tx.user.upsert({ where: key, create: identity, update: { email, displayName }, select: { id: true } });

    for (const invitation of activeInvites) {
        if (await lockShopClosure(tx, invitation.shopId)) continue;
        const isRebind = invitation.userId !== user.id;
        if (isRebind && invitation.user.oidcIssuer !== null) continue;
        const current = isRebind
            ? await tx.membership.findUnique({
                where: { shopId_userId: { shopId: invitation.shopId, userId: user.id } },
                select: { id: true, status: true },
            })
            : null;
        if (current && current.status !== 'revoked') continue;

        const member = await tx.membership.update({
            where: { shopId_id: { shopId: invitation.shopId, id: current?.id ?? invitation.id } },
            data: { ...clearInvitation, status: 'active', userId: user.id, roles: invitation.roles, permissionVersion: { increment: 1 } },
        });
        if (current) {
            // A changed IdP email can leave a provisional invite alongside a revoked membership for the same subject.
            const retired = await tx.membership.update({
                where: { shopId_id: { shopId: invitation.shopId, id: invitation.id } },
                data: { ...clearInvitation, status: 'revoked', permissionVersion: { increment: 1 } },
            });
            await membershipAudit(tx, {
                shopId: retired.shopId, actorId: user.id, requestId, memberId: retired.id, action: 'reconcileMembershipInvite',
                metadata: { acceptedMembershipId: member.id, permissionVersion: retired.permissionVersion },
            });
        }
        await membershipAudit(tx, {
            shopId: member.shopId, actorId: user.id, requestId, memberId: member.id, action: 'acceptMembershipInvite',
            metadata: { permissionVersion: member.permissionVersion },
        });
    }
    return user;
}
