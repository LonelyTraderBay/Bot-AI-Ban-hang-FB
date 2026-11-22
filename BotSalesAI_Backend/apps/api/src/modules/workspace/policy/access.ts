import { ForbiddenException, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import type { IncomingHttpHeaders } from 'node:http';
import type { Membership, Prisma, PrismaClient, Role } from '../../../generated/prisma/client.js';
import { activeSession, requireSessionToken } from '../auth/session-tokens.js';
import { contractDirectory } from '../../../http/contract-source.js';
import { validUuid } from '../../../http/query.js';

const { rolePresets }: { rolePresets: Record<Role, string[]> } = JSON.parse(
    readFileSync(new URL('permission-catalog.json', contractDirectory), 'utf8'),
);
export const activeMembership = { status: 'active' } as const;
export const membershipFields = {
    id: true, shopId: true, userId: true, status: true, roles: true, permissionVersion: true,
} satisfies Prisma.MembershipSelect;

export function permissionsFor(roles: readonly Role[]): string[] {
    return [...new Set(roles.flatMap(role => rolePresets[role]))];
}

export function membershipDto({ id, shopId, userId, status, roles, permissionVersion }: Pick<Membership, keyof typeof membershipFields>) {
    return { id, shopId, userId, status, roles, permissionVersion, permissions: status === 'active' ? permissionsFor(roles) : [] };
}

export async function sessionPrincipal(tx: Prisma.TransactionClient, token: string): Promise<string> {
    const current = await tx.session.findFirst({ where: activeSession(token), select: { userId: true } });
    if (!current) throw new UnauthorizedException();
    return current.userId;
}

export function readAsSession<T>(db: PrismaClient | undefined, headers: IncomingHttpHeaders,
    action: (tx: Prisma.TransactionClient, userId: string) => Promise<T>) {
    const token = requireSessionToken(headers);
    if (!db) throw new ServiceUnavailableException();
    return db.$transaction(async tx => action(tx, await sessionPrincipal(tx, token)), {
        isolationLevel: 'RepeatableRead',
    });
}

export async function requireShopAccess(tx: Prisma.TransactionClient, userId: string, shopId: string, permission?: string) {
    if (!validUuid(shopId)) throw new NotFoundException();
    const current = await tx.membership.findUnique({
        where: { shopId_userId: { shopId, userId } },
        select: membershipFields,
    });
    if (current?.status !== activeMembership.status) throw new NotFoundException();
    const permissions = permissionsFor(current.roles);
    if (permission && !permissions.includes(permission)) throw new ForbiddenException();
    return { ...current, permissions };
}

export async function canInShop(tx: Prisma.TransactionClient, userId: string, shopId: string, permission: string) {
    try {
        await requireShopAccess(tx, userId, shopId, permission);
        return true;
    } catch (error) {
        if (error instanceof ForbiddenException || error instanceof NotFoundException) return false;
        throw error;
    }
}

export function canRevokeMembership(actorId: string, member: { userId: string; status: string }): boolean {
    return member.userId !== actorId && member.status !== 'revoked';
}

export function canChangeMemberRoles(actorId: string, member: Membership, now = new Date()): boolean {
    return canRevokeMembership(actorId, member)
        && !permissionsFor(member.roles).includes('members.manage')
        && (!member.inviteExpiresAt || member.inviteExpiresAt > now);
}

export function requireAssignableRoles(roles: Role[], roleGrantPermissions: string[]): void {
    const requested = permissionsFor(roles);
    if (requested.includes('members.manage') || requested.some(permission => !roleGrantPermissions.includes(permission))) {
        throw new ForbiddenException();
    }
}
