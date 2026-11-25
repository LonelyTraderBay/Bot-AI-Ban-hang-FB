import {
    ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import type { Membership, Prisma, PrismaClient, Role, Shop } from '../../../generated/prisma/client.js';
import { MembershipStatus } from '../../../generated/prisma/enums.js';
import { requireIfMatch, requireVersion } from '../../../http/response.js';
import { listQuery, paging, validUuid } from '../../../http/query.js';
import { recordAudit } from '../../../platform/audit/index.js';
import { IdempotencyMismatch, recordCommand } from '../../../platform/commands/index.js';
import { provisionFixtureShopAccounts } from '../../finance/index.js';
import { usesLocalOidcFixture, type AuthConfig } from '../auth/config.js';
import type { CommandSource } from '../activity/activity-service.js';
import { membershipAudit, type MemberOperation } from '../members/activity.js';
import { clearInvitation, invitationEmail, inviteMembership } from '../members/invitations.js';
import {
    activeMembership, canChangeMemberRoles, canRevokeMembership, membershipDto, requireAssignableRoles, requireShopAccess,
    readAsSession,
} from '../policy/access.js';
import { requireIdempotencyKey, writeAsSession, writeShopCommand } from '../policy/command-scope.js';

const membersManage = 'members.manage';
type MemberWrite = { member: Membership; audit?: Prisma.InputJsonObject };
export type ShopWrite = { name: string; timezone: string; locale: string; currency: string };
export type ShopPatch = Partial<Omit<ShopWrite, 'currency'>>;
export const shopCommands: CommandSource[] = [
    { operationId: 'createShop', resourceType: 'shop', scopePermissions: { onboarding: 'shop.manage' } },
    { operationId: 'updateShop', resourceType: 'shop' },
];
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

async function shopSettings(tx: Prisma.TransactionClient, { name, locale, timezone }: Omit<ShopWrite, 'currency'>) {
    const cleanName = name.trim();
    const cleanZone = timezone.trim();
    let cleanLocale: string;
    try {
        cleanLocale = new Intl.Locale(locale.trim()).toString();
        new Intl.DateTimeFormat('en', { timeZone: cleanZone });
    } catch {
        throw new UnprocessableEntityException('Cửa hàng cần ngôn ngữ và múi giờ hợp lệ.');
    }
    if (!cleanName || cleanName.includes(String.fromCharCode(0)) || cleanLocale.length > 64 || cleanZone.length > 100 ||
        !/^(?:UTC|[a-zA-Z][a-zA-Z0-9_+\/-]*)$/.test(cleanZone)) throw new UnprocessableEntityException();
    const [zone] = await tx.$queryRaw<{ valid: boolean }[]>`SELECT EXISTS (SELECT FROM pg_timezone_names WHERE name=${cleanZone}) AS valid`;
    if (!zone.valid) throw new UnprocessableEntityException('Múi giờ chưa có trong cơ sở dữ liệu.');
    return { name: cleanName, timezone: cleanZone, locale: cleanLocale };
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

    create(headers: IncomingHttpHeaders, body: ShopWrite, requestId: string) {
        return writeAsSession(this.db, this.config, headers, async (tx, userId, config) => {
            const idempotencyKey = requireIdempotencyKey(headers);
            const fields = { ...await shopSettings(tx, body), currency: body.currency };
            const requestHash = createHash('sha256').update(JSON.stringify(fields)).digest('hex');
            const stored = await tx.shopCreationIntent.findUnique({ where: { actorId_idempotencyKey: { actorId: userId, idempotencyKey } } });
            if (stored) {
                await requireShopAccess(tx, userId, stored.shopId, 'shop.manage');
                if (stored.requestHash !== requestHash) throw new IdempotencyMismatch();
                return shopDto(await tx.shop.findUniqueOrThrow({ where: { id: stored.shopId }, select: shopFields }));
            }
            const id = randomUUID();
            const defaultWarehouseId = randomUUID();
            await tx.$executeRaw`SET CONSTRAINTS "shops_default_warehouse_fkey" DEFERRED`;
            const shop = await tx.shop.create({ data: { ...fields, id, defaultWarehouseId } });
            await tx.warehouse.create({ data: { shopId: id, id: defaultWarehouseId, code: 'DEFAULT', name: 'Kho mặc định', addressLine: 'Chờ bổ sung địa chỉ kho' } });
            await tx.membership.create({ data: { shopId: id, userId, roles: ['owner'] } });
            if (usesLocalOidcFixture(config)) await provisionFixtureShopAccounts(tx, [id]);
            await tx.shopCreationIntent.create({ data: { actorId: userId, shopId: id, idempotencyKey, requestHash } });
            await recordCommand(tx, { shopId: id, actorId: userId, operationId: 'createShop', idempotencyKey }, fields, async () => {
                await recordAudit(tx, { shopId: id, actorId: userId, requestId, action: 'createShop', resourceType: 'shop', resourceId: id,
                    metadata: { currency: shop.currency, timezone: shop.timezone, defaultWarehouseId } });
                return { type: 'shop', id, scope: 'onboarding' };
            });
            return shopDto(shop);
        });
    }

    update(headers: IncomingHttpHeaders, shopId: string, patch: ShopPatch, requestId: string) {
        const version = requireIfMatch(headers);
        return writeShopCommand(this.db, this.config, { headers, shopId, permission: 'shop.manage', operationId: 'updateShop', payload: { patch, version } },
            async (tx, scope) => {
                const current = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: shopFields });
                requireVersion(current.version, version);
                const data = await shopSettings(tx, { ...current, ...patch });
                const zoneChanged = data.timezone !== current.timezone;
                const shop = await tx.shop.update({ where: { id: shopId }, data: { ...data, version: { increment: 1 },
                    ...(zoneChanged ? { policyVersion: randomUUID() } : {}) } });
                if (zoneChanged) await tx.notificationPolicy.updateMany({ where: { shopId },
                    data: { timezone: shop.timezone, version: { increment: 1 } } });
                await recordAudit(tx, { shopId, actorId: scope.userId, requestId, action: 'updateShop', resourceType: 'shop', resourceId: shopId,
                    metadata: { version: shop.version, fields: Object.keys(patch), policyVersion: shop.policyVersion } });
                return { type: 'shop', id: shopId };
            }, async tx => shopDto(await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: shopFields })));
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
