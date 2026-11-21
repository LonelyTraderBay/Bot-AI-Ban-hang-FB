import {
    ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { Membership, Prisma, PrismaClient, Role, Shop } from '../../../generated/prisma/client.js';
import { MembershipStatus } from '../../../generated/prisma/enums.js';
import { requireIfMatch, requireVersion } from '../../../http/response.js';
import { listQuery, paging, validUuid } from '../../../http/query.js';
import type { AuthConfig } from '../auth/config.js';
import { membershipAudit, type MemberOperation } from '../members/activity.js';
import { clearInvitation, invitationEmail, inviteMembership } from '../members/invitations.js';
import {
    activeMembership, canChangeMemberRoles, canRevokeMembership, membershipDto, requireAssignableRoles, requireShopAccess,
    readAsSession,
} from '../policy/access.js';
import { writeShopCommand } from '../policy/command-scope.js';

const membersManage = 'members.manage';
type MemberWrite = { member: Membership; audit?: Prisma.InputJsonObject };
const shopFields = {
    id: true, name: true, currency: true, timezone: true, locale: true, defaultWarehouseId: true,
    version: true, policyVersion: true, createdAt: true,
} satisfies Prisma.ShopSelect;

const visibleShops = (userId: string): Prisma.ShopWhereInput => ({
    memberships: { some: { userId, ...activeMembership } },
});

function membershipView(member: Membership, actorId: string) {
    return {
        ...membershipDto(member),
        ...(member.inviteExpiresAt ? { invitationExpiresAt: member.inviteExpiresAt.toISOString() } : {}),
        allowedActions: [
            ...(canChangeMemberRoles(actorId, member) ? ['updateMemberRoles'] : []),
            ...(canRevokeMembership(actorId, member) ? ['revokeMembership'] : []),
        ],
    };
}

function shopDto({ id, name, currency, timezone, locale, defaultWarehouseId, version, policyVersion }: Pick<Shop, keyof typeof shopFields>) {
    return { id, name, currency, timezone, locale, defaultWarehouseId, version, policyVersion };
}

async function memberInShop(tx: Prisma.TransactionClient, shopId: string, memberId: string) {
    if (!validUuid(memberId)) throw new NotFoundException();
    const member = await tx.membership.findUnique({ where: { shopId_id: { shopId, id: memberId } } });
    if (!member) throw new NotFoundException();
    return member;
}

function canonicalRoles(roles: Role[]): Role[] {
    if (!roles.length || new Set(roles).size !== roles.length) throw new UnprocessableEntityException();
    return [...roles].sort();
}

export class ShopsService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    private read<T>(headers: IncomingHttpHeaders, action: (tx: Prisma.TransactionClient, userId: string) => Promise<T>) {
        return readAsSession(this.db, headers, action);
    }

    list(headers: IncomingHttpHeaders, rawQuery: Record<string, unknown>) {
        return this.read(headers, async (tx, userId) => {
            const query = listQuery(rawQuery);
            if (query.status !== undefined && query.status !== activeMembership.status) throw new UnprocessableEntityException();
            const page = paging(query, ['shops', userId]);
            const rows = await tx.shop.findMany({
                where: { ...visibleShops(userId), name: { contains: page.keyword, mode: 'insensitive' }, ...page.after },
                orderBy: page.orderBy,
                take: page.limit + 1,
                select: shopFields,
            });
            const result = page.result(rows);
            return { ...result, data: result.data.map(shopDto) };
        });
    }

    get(headers: IncomingHttpHeaders, shopId: string) {
        return this.read(headers, async (tx, userId) => {
            if (!validUuid(shopId)) throw new NotFoundException();
            const row = await tx.shop.findFirst({ where: { id: shopId, ...visibleShops(userId) }, select: shopFields });
            if (!row) throw new NotFoundException();
            return shopDto(row);
        });
    }

    listMembers(headers: IncomingHttpHeaders, shopId: string, rawQuery: Record<string, unknown>) {
        return this.read(headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, membersManage);
            const query = listQuery(rawQuery);
            const status = query.status === undefined ? undefined : MembershipStatus[query.status as MembershipStatus];
            if (query.status !== undefined && !Object.hasOwn(MembershipStatus, query.status)) throw new UnprocessableEntityException();
            const page = paging(query, ['members', scope.userId, scope.shopId]);
            const rows = await tx.membership.findMany({
                where: {
                    shopId: scope.shopId,
                    status,
                    ...(page.keyword ? { user: { displayName: { contains: page.keyword, mode: 'insensitive' } } } : {}),
                    ...page.after,
                },
                orderBy: page.orderBy,
                take: page.limit + 1,
            });
            const result = page.result(rows);
            return { ...result, data: result.data.map(member => membershipView(member, scope.userId)) };
        });
    }

    getMember(headers: IncomingHttpHeaders, shopId: string, memberId: string) {
        return this.read(headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, membersManage);
            return membershipView(await memberInShop(tx, scope.shopId, memberId), scope.userId);
        });
    }

    invite(headers: IncomingHttpHeaders, shopId: string, body: { email: string; roles: Role[] }, requestId: string) {
        const email = invitationEmail(body.email);
        return this.writeMember(headers, shopId, requestId, 'inviteMember', [email, [...body.roles].sort()], async (tx, scope, config) => {
            const roles = canonicalRoles(body.roles);
            requireAssignableRoles(roles, scope.permissions);
            const member = await inviteMembership(tx, {
                shopId: scope.shopId, actorId: scope.userId, requestId, issuer: config.issuer, email, roles,
            });
            return { member, audit: { status: member.status, roles, permissionVersion: member.permissionVersion } };
        });
    }

    updateRoles(headers: IncomingHttpHeaders, shopId: string, memberId: string, body: { roles: Role[] }, requestId: string) {
        const version = requireIfMatch(headers);
        return this.writeMember(headers, shopId, requestId, 'updateMemberRoles', [memberId, version, [...body.roles].sort()], async (tx, scope) => {
            const member = await memberInShop(tx, scope.shopId, memberId);
            requireVersion(member.permissionVersion, version);
            if (!canChangeMemberRoles(scope.userId, member)) throw new ForbiddenException();
            const roles = canonicalRoles(body.roles);
            requireAssignableRoles(roles, scope.permissions);
            if (roles.length === member.roles.length && roles.every(role => member.roles.includes(role))) return { member };
            const updated = await tx.membership.update({
                where: { shopId_id: { shopId: scope.shopId, id: member.id } },
                data: { roles, permissionVersion: { increment: 1 } },
            });
            return { member: updated, audit: { previousRoles: member.roles, roles, permissionVersion: updated.permissionVersion } };
        });
    }

    async revoke(headers: IncomingHttpHeaders, shopId: string, memberId: string, requestId: string): Promise<void> {
        const version = requireIfMatch(headers);
        await this.writeMember(headers, shopId, requestId, 'revokeMembership', [memberId, version], async (tx, scope) => {
            const member = await memberInShop(tx, scope.shopId, memberId);
            requireVersion(member.permissionVersion, version);
            if (!canRevokeMembership(scope.userId, member)) throw new ForbiddenException();
            const updated = await tx.membership.update({
                where: { shopId_id: { shopId: scope.shopId, id: member.id } },
                data: { ...clearInvitation, status: 'revoked', permissionVersion: { increment: 1 } },
            });
            return { member: updated, audit: { previousStatus: member.status, permissionVersion: updated.permissionVersion } };
        });
    }

    private async writeMember(headers: IncomingHttpHeaders, shopId: string, requestId: string, operationId: MemberOperation,
        payload: Prisma.InputJsonArray, apply: (
            tx: Prisma.TransactionClient, scope: Awaited<ReturnType<typeof requireShopAccess>>, config: AuthConfig,
        ) => Promise<MemberWrite>) {
        return writeShopCommand(this.db, this.config, { headers, shopId, permission: membersManage, operationId, payload },
            async (tx, scope, config) => {
                const { member, audit } = await apply(tx, scope, config);
                if (audit) {
                    await membershipAudit(tx, {
                        shopId: scope.shopId, actorId: scope.userId, requestId, action: operationId, memberId: member.id, metadata: audit,
                    });
                }
                return { type: 'membership', id: member.id };
            },
            async (tx, scope, result) => {
                if (result.type !== 'membership') throw new ConflictException();
                return membershipView(await memberInShop(tx, scope.shopId, result.id), scope.userId);
            });
    }
}
