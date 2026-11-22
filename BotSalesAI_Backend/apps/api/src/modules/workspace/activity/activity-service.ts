import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import type { IncomingHttpHeaders } from 'node:http';
import type { AuditEntry, Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import { JobKind, JobStatus } from '../../../generated/prisma/enums.js';
import { commandDto } from '../../../platform/commands/index.js';
import { visibleJobSources } from '../../../platform/jobs/sources.js';
import { jobDetails, jobDto } from '../../../platform/jobs/view.js';
import { accessibleResourceEvents } from '../../../platform/outbox/index.js';
import { contractDirectory, openapi } from '../../../http/contract-source.js';
import { generatedFileUrl } from '../../files/index.js';
import type { AuthConfig } from '../auth/config.js';
import { membershipCommandKinds } from '../members/activity.js';
import type { ShopScope } from '../policy/command-scope.js';
import { readAsSession, requireShopAccess } from '../policy/access.js';
import { listQuery, paging, validUuid } from '../../../http/query.js';

const { operations } = JSON.parse(readFileSync(new URL('operation-index.json', contractDirectory), 'utf8')) as {
    operations: { operationId: string; permission?: string }[];
};
const commandStatuses: string[] = openapi.components.schemas.Command.properties.status.enum;
const replayWindowMs = 24 * 60 * 60 * 1000;
const pageSize = 100;

export function visibleUnknownCommandCount(tx: Prisma.TransactionClient, scope: ShopScope) {
    if (!scope.permissions.includes('jobs.read')) return Promise.resolve(0);
    const operationsAllowed = operations.flatMap(({ operationId, permission }) => permission && scope.permissions.includes(permission) ? [operationId] : []);
    return tx.command.count({ where: { shopId: scope.shopId, actorId: scope.userId, status: 'unknown', OR: [
        { operationId: { in: operationsAllowed } },
        { jobs: { some: { actorId: scope.userId, OR: visibleJobSources(scope.permissions) } } },
    ] } });
}
// A command kind becomes readable when its owner has established the source resource policy.
export type CommandSource = { operationId: string; resourceType: string; scopePermissions?: Readonly<Record<string, string>> };
const auditSummaries = new Map([
    ['inviteMember', 'Đã tạo lời mời thành viên'],
    ['acceptMembershipInvite', 'Thành viên đã nhận lời mời'],
    ['expireMembershipInvite', 'Đã kết thúc lời mời hết hạn'],
    ['reconcileMembershipInvite', 'Đã nối lời mời với thành viên hiện có'],
    ['updateMemberRoles', 'Đã cập nhật vai trò thành viên'],
    ['revokeMembership', 'Đã thu hồi quyền thành viên'],
    ['createProduct', 'Đã tạo sản phẩm'],
]);

function auditDto(entry: AuditEntry) {
    return {
        id: entry.id, shopId: entry.shopId, actorId: entry.actorId ?? 'system', action: entry.action,
        resource: { type: entry.resourceType, id: entry.resourceId }, requestId: entry.requestId,
        occurredAt: entry.createdAt.toISOString(), summary: auditSummaries.get(entry.action) ?? 'Đã ghi nhận thao tác',
    };
}

export class ActivityService {
    private readonly sources: ReadonlyMap<string, string>;
    private readonly scopedSources: readonly CommandSource[];

    constructor(private readonly db?: PrismaClient, sources: readonly CommandSource[] = [], private readonly auth?: AuthConfig) {
        this.sources = new Map([
            ...membershipCommandKinds.map(kind => [kind, 'membership'] as const),
            ...sources.map(source => [source.operationId, source.resourceType] as const),
        ]);
        this.scopedSources = sources.filter(source => source.scopePermissions);
    }

    private async jobView(tx: Prisma.TransactionClient, scope: ShopScope, job: Parameters<typeof jobDto>[0]) {
        const view = jobDto(job);
        if (view.status !== 'succeeded' || view.result?.type !== 'file') return view;
        const downloadUrl = await generatedFileUrl(tx, scope, view.result.id, this.auth);
        return { ...view, downloadUrl };
    }

    private visibleKinds(permissions: readonly string[]) {
        return operations.filter(operation => this.sources.has(operation.operationId)
            && operation.permission && permissions.includes(operation.permission)).map(operation => operation.operationId);
    }

    private visibleCommands(userId: string, permissions: readonly string[]): Prisma.CommandWhereInput {
        return {
            actorId: userId,
            OR: [
                { operationId: { in: this.visibleKinds(permissions) } },
                ...this.scopedSources.flatMap(source => Object.entries(source.scopePermissions ?? {}).flatMap(([scope, permission]) =>
                    permissions.includes(permission) ? [{ operationId: source.operationId, result: { path: ['scope'], equals: scope } }] : [])),
                { jobs: { some: { actorId: userId, OR: visibleJobSources(permissions) } } },
            ],
        };
    }

    private visibleEvents(shopId: string, userId: string, permissions: readonly string[]): Prisma.OutboxEventWhereInput {
        const sourcePermissions = permissions.includes('jobs.read') ? permissions : [];
        return {
            shopId, sequence: { not: null }, publishedAt: { gte: new Date(Date.now() - replayWindowMs) },
            OR: [
                { eventType: 'command.updated', command: { is: this.visibleCommands(userId, sourcePermissions) } },
                { eventType: 'job.updated', job: { is: {
                    actorId: userId, OR: visibleJobSources(sourcePermissions),
                } } },
                { eventType: { in: accessibleResourceEvents(permissions) } },
                ...(permissions.includes('notifications.read') ? [{
                    eventType: 'notification.updated', payload: { path: ['recipientUserId'], equals: userId },
                }] : []),
            ],
        };
    }

    openEvents(headers: IncomingHttpHeaders, shopId: string, lastEventId?: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId);
            const shop = await tx.shop.findUniqueOrThrow({ where: { id: scope.shopId }, select: { eventSequence: true } });
            const anchor = lastEventId && validUuid(lastEventId)
                ? await tx.outboxEvent.findFirst({
                    where: { ...this.visibleEvents(scope.shopId, userId, scope.permissions), id: lastEventId },
                    select: { sequence: true },
                })
                : undefined;
            return { permissionVersion: scope.permissionVersion, after: anchor?.sequence ?? shop.eventSequence, resync: !!lastEventId && !anchor };
        });
    }

    nextEvents(headers: IncomingHttpHeaders, shopId: string, after: bigint, permissionVersion: number) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId);
            if (scope.permissionVersion !== permissionVersion) return null;
            const shop = await tx.shop.findUniqueOrThrow({ where: { id: scope.shopId }, select: { eventSequence: true } });
            const rows = await tx.outboxEvent.findMany({
                where: { ...this.visibleEvents(scope.shopId, userId, scope.permissions), sequence: { gt: after } },
                orderBy: { sequence: 'asc' }, take: pageSize,
                select: { id: true, commandId: true, jobId: true, eventType: true, sequence: true, createdAt: true, payload: true },
            });
            return { rows, after: rows.length === pageSize ? rows.at(-1)?.sequence ?? after : shop.eventSequence };
        });
    }

    listCommands(headers: IncomingHttpHeaders, shopId: string, rawQuery: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'jobs.read');
            const query = listQuery(rawQuery, 'listCommands');
            if (query.status !== undefined && !commandStatuses.includes(query.status)) throw new UnprocessableEntityException();
            const page = paging(query, ['commands', scope.shopId, userId, String(scope.permissionVersion), query.kind ?? '']);
            const contains = { contains: page.keyword, mode: 'insensitive' as const };
            const digest = query.q?.trim();
            const search = digest && /^[a-f0-9]{64}$/.test(digest) && query.kind
                ? { intentHash: digest }
                : page.keyword ? { OR: [{ operationId: contains }, ...(digest && validUuid(digest) ? [{ id: digest }] : [])] } : {};
            const rows = await tx.command.findMany({
                where: {
                    shopId: scope.shopId, operationId: query.kind, ...this.visibleCommands(userId, scope.permissions),
                    status: { in: query.status ? [query.status] : commandStatuses },
                    AND: [search, page.after ?? {}],
                },
                orderBy: page.orderBy, take: page.limit + 1,
            });
            const result = page.result(rows);
            return { ...result, data: result.data.map(command => commandDto(command, this.sources.get(command.operationId) ?? 'job')) };
        });
    }

    getCommand(headers: IncomingHttpHeaders, shopId: string, commandId: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'jobs.read');
            if (!validUuid(commandId)) throw new NotFoundException();
            const command = await tx.command.findFirst({
                where: {
                    shopId: scope.shopId, id: commandId, ...this.visibleCommands(userId, scope.permissions), status: { in: commandStatuses },
                },
            });
            if (!command) throw new NotFoundException();
            return commandDto(command, this.sources.get(command.operationId) ?? 'job');
        });
    }

    listJobs(headers: IncomingHttpHeaders, shopId: string, rawQuery: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'jobs.read');
            const query = listQuery(rawQuery, 'listJobs');
            if ((query.status !== undefined && !Object.hasOwn(JobStatus, query.status))
                || (query.kind !== undefined && !Object.hasOwn(JobKind, query.kind))) throw new UnprocessableEntityException();
            const page = paging(query, ['jobs', scope.shopId, userId, String(scope.permissionVersion), query.kind ?? '']);
            const needle = query.q?.trim();
            const search = page.keyword ? { OR: [
                { sourceOperation: { contains: page.keyword, mode: 'insensitive' as const } },
                ...(needle && validUuid(needle) ? [{ id: needle }] : []),
            ] } : {};
            const rows = await tx.job.findMany({
                where: {
                    shopId: scope.shopId, actorId: userId, kind: query.kind as JobKind | undefined,
                    OR: visibleJobSources(scope.permissions), AND: [search, page.after ?? {}, query.status ? {
                        OR: [
                            { status: query.status as JobStatus, OR: [{ importPreview: null }, { importPreview: { commitJobId: null } }] },
                            { importPreview: { commitJob: { status: query.status as JobStatus } } },
                        ],
                    } : {}],
                },
                orderBy: page.orderBy, take: page.limit + 1, include: jobDetails,
            });
            const result = page.result(rows);
            const data = [];
            for (const job of result.data) data.push(await this.jobView(tx, scope, job));
            return { ...result, data };
        });
    }

    getJob(headers: IncomingHttpHeaders, shopId: string, jobId: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'jobs.read');
            if (!validUuid(jobId)) throw new NotFoundException();
            const job = await tx.job.findFirst({
                where: { shopId: scope.shopId, id: jobId, actorId: userId, OR: visibleJobSources(scope.permissions) },
                include: jobDetails,
            });
            if (!job) throw new NotFoundException();
            return this.jobView(tx, scope, job);
        });
    }

    listAudit(headers: IncomingHttpHeaders, shopId: string, rawQuery: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'audit.read');
            const query = listQuery(rawQuery);
            if (query.status !== undefined) throw new UnprocessableEntityException();
            const page = paging(query, ['audit', scope.shopId, userId, String(scope.permissionVersion)]);
            const contains = { contains: page.keyword, mode: 'insensitive' as const };
            const search = page.keyword ? { OR: [
                { action: contains }, { resourceId: contains }, { requestId: contains },
                ...(query.q && validUuid(query.q.trim()) ? [{ actorId: query.q.trim() }] : []),
            ] } : {};
            const rows = await tx.auditEntry.findMany({
                where: { shopId: scope.shopId, AND: [search, page.after ?? {}] },
                orderBy: page.orderBy, take: page.limit + 1,
            });
            const result = page.result(rows);
            return { ...result, data: result.data.map(auditDto) };
        });
    }
}
