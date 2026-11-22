import { Body, ConflictException, Controller, Get, HttpCode, Module, NotFoundException, Param, Post, Query, Req, Res,
    UnprocessableEntityException, type DynamicModule } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { type Prisma, type PrismaClient, type WorkItem, type WorkItemState } from '../../generated/prisma/client.js';
import { WorkItemKind } from '../../generated/prisma/enums.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery, paging, validUuid } from '../../http/query.js';
import { envelope, noStore, requireVersion, versionedEnvelope } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import type { ApprovedEvaluationConfig } from '../ai/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig, type ShopScope } from '../workspace/index.js';
import { ApprovalController, ApprovalService, type ApprovalResource } from './approvals.js';
import { AutomationService } from './automation.js';
import { BudgetService, budgetApprovalResources } from './budgets.js';
import { GovernanceController } from './governance-controller.js';
import { OperationsOverview } from './overview.js';

export { approvalCommands, approvalInShop, approvalView, recordApproval, requireApprovalPolicy, updateApprovalState, type ApprovalResource } from './approvals.js';
export { controlCommand, lockAutomationFence, readAutomationFence, roleCommand, roleInShop, roleIsReady, salesAutomationAllowed, salesAutomationState } from './automation.js';
export { applicableAiBudget, budgetCommand, budgetInShop, budgetPeriodKey, notificationBudgetAvailable } from './budgets.js';
export { publishOwnerDigests } from './overview.js';

const claimBody = new SchemaPipe(validator.compile(schemaFromContract('ClaimWorkRequest')));
const updateBody = new SchemaPipe(validator.compile(schemaFromContract('UpdateWorkRequest')));
const active: WorkItemState[] = ['queued', 'claimed', 'working', 'blocked'];
export const claimCommand = { operationId: 'claimWorkItem', resourceType: 'work_item' };
export const updateWorkCommand = { operationId: 'updateWorkItem', resourceType: 'work_item' };
type WorkUpdate = Pick<Prisma.WorkItemUncheckedCreateInput, 'shopId' | 'kind' | 'sourceType' | 'sourceId' | 'dueAt'>;
type WorkAction = 'begin' | 'complete' | 'block' | 'reassign';
type WorkRequest = { expectedVersion: number; action: WorkAction; assigneeUserId?: string | null; reason: string };

export async function createWorkItem(tx: Prisma.TransactionClient, data: WorkUpdate) {
    const created = await tx.workItem.create({ data });
    await enqueueResourceUpdate(tx, 'work_item.updated', created);
    return created;
}

export async function findOrCreateWorkItem(tx: Prisma.TransactionClient, data: WorkUpdate) {
    const { shopId, kind, sourceType, sourceId } = data;
    return await tx.workItem.findUnique({ where: { shopId_kind_sourceType_sourceId: { shopId, kind, sourceType, sourceId } } }) ??
        createWorkItem(tx, data);
}

export async function setWorkState(tx: Prisma.TransactionClient, shopId: string, id: string, state: WorkItemState, blockedReason: string | null = null) {
    const updated = await tx.workItem.update({
        where: { shopId_id: { shopId, id } }, data: { state, blockedReason, version: { increment: 1 } },
    });
    await enqueueResourceUpdate(tx, 'work_item.updated', updated);
    return updated;
}

export async function workInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const part = await tx.workItem.findUnique({ where: { shopId_id: { shopId, id } } });
    if (!part) throw new NotFoundException();
    return part;
}

function workActions(work: WorkItem, scope: ShopScope) {
    const { kind, state, assigneeUserId } = work;
    const actions: Array<WorkAction | 'claim'> = [];
    if (state === 'queued' && assigneeUserId === null && scope.permissions.includes('operations.claim')) actions.push('claim');
    if (!active.includes(state) || kind === 'prepare_order' || !scope.permissions.includes('operations.manage')) return actions;
    actions.push('reassign');
    if (assigneeUserId && (state === 'claimed' || state === 'blocked')) actions.push('begin');
    if (state !== 'blocked') actions.push('block');
    if (kind !== 'payment_mismatch' && state === 'working') actions.push('complete');
    return actions;
}

function workView(work: WorkItem, scope: ShopScope) {
    const { id, shopId, kind, state, sourceType, sourceId, assigneeUserId, dueAt, blockedReason, createdAt, updatedAt, version } = work;
    return {
        id, shopId, kind, state, source: { type: sourceType, id: sourceId }, assigneeUserId, dueAt, blockedReason, createdAt, updatedAt, version,
        allowedActions: workActions(work, scope),
    };
}

async function workCompletionAllowed(tx: Prisma.TransactionClient, work: WorkItem) {
    const { shopId, kind, sourceType, sourceId } = work;
    if (kind === 'customer_handoff' && sourceType === 'conversation') {
        return (await tx.channelConversation.findUnique({ where: { shopId_id: { shopId, id: sourceId } }, select: { status: true } }))?.status === 'resolved';
    }
    if (kind === 'purchase_review' && sourceType === 'approval') {
        const approval = await tx.approval.findUnique({ where: { shopId_id: { shopId, id: sourceId } }, select: { status: true, expiresAt: true } });
        return Boolean(approval && (approval.expiresAt <= new Date() || approval.status !== 'pending'));
    }
    if (kind === 'late_shipment' && sourceType === 'shipment') {
        const shipment = await tx.shipment.findUnique({ where: { shopId_id: { shopId, id: sourceId } }, select: { state: true } });
        return Boolean(shipment && ['delivered', 'returned', 'cancelled'].includes(shipment.state));
    }
    if (kind === 'recovery' && sourceType === 'purchase_order') {
        const purchase = await tx.purchaseOrder.findUnique({ where: { shopId_id: { shopId, id: sourceId } }, select: { status: true } });
        return Boolean(purchase && !['unknown', 'sending'].includes(purchase.status));
    }
    return kind === 'recovery';
}

class OperationsService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    list(headers: IncomingHttpHeaders, shopId: string, input: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'operations.read');
            const query = listQuery(input, 'work');
            if (query.kind && !Object.hasOwn(WorkItemKind, query.kind)) throw new UnprocessableEntityException();
            const page = paging(query, ['work', shopId, userId, String(scope.permissionVersion), query.kind ?? '',
                query.state ?? '', query.assignee ?? '', query.exception ?? '', query.due ?? '']);
            const now = new Date();
            const due = query.due === 'overdue' ? { dueAt: { lt: now }, state: { in: active } } : query.due === 'unscheduled' ? { dueAt: null } : {};
            const exceptions = query.exception === 'active' ? {
                state: { in: active },
                OR: [{ state: 'blocked' as const }, { assigneeUserId: null }, { dueAt: { lt: now } },
                    { kind: { in: ['payment_mismatch', 'late_shipment', 'recovery'] satisfies WorkItemKind[] } }],
            } : {};
            const q = query.q?.trim();
            const keyword = q ? { OR: [
                { sourceType: { contains: page.keyword, mode: 'insensitive' as const } },
                ...(validUuid(q) ? [{ id: q }, { sourceId: q }] : []),
            ] } : {};
            const result = page.result(await tx.workItem.findMany({
                where: { shopId, kind: query.kind as WorkItemKind | undefined, state: query.state as WorkItemState | undefined,
                    assigneeUserId: query.assignee === 'me' ? userId : query.assignee === 'unassigned' ? null : undefined,
                    AND: [page.after ?? {}, due, exceptions, keyword] },
                orderBy: page.orderBy, take: page.limit + 1,
            }));
            return { ...result, data: result.data.map(work => workView(work, scope)) };
        });
    }

    get(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'operations.read');
            return workView(await workInShop(tx, shopId, id), scope);
        });
    }

    claim(headers: IncomingHttpHeaders, shopId: string, id: string, input: { expectedVersion: number }, requestId: string) {
        const { operationId, resourceType } = claimCommand;
        return writeShopCommand(this.db, this.config, {
            headers, shopId, permission: 'operations.claim', operationId, payload: { id, input },
        }, async (tx, scope) => {
            const current = await workInShop(tx, shopId, id);
            requireVersion(current.version, input.expectedVersion);
            if (current.assigneeUserId !== null || current.state !== 'queued') throw new ConflictException();
            if (current.kind === 'prepare_order') {
                await requireShopAccess(tx, scope.userId, shopId, 'fulfillment.write');
                const associated = await tx.prepJob.findUnique({
                    where: { shopId_workItemId: { shopId, workItemId: id } }, select: { order: { select: { orderState: true } } },
                });
                if (associated?.order.orderState !== 'confirmed') throw new ConflictException();
            }
            const item = await tx.workItem.update({
                where: { shopId_id: { shopId, id } }, data: { assigneeUserId: scope.userId, state: 'claimed', version: { increment: 1 } },
            });
            await recordAudit(tx, {
                shopId, actorId: scope.userId, action: operationId, requestId, resourceType, resourceId: id, metadata: { version: item.version },
            });
            await enqueueResourceUpdate(tx, 'work_item.updated', item);
            return { type: resourceType, id };
        }, async (tx, scope, result) => {
            if (result.type !== resourceType) throw new ConflictException();
            return workView(await workInShop(tx, shopId, result.id), scope);
        });
    }

    update(headers: IncomingHttpHeaders, shopId: string, id: string, input: WorkRequest, requestId: string) {
        const { operationId, resourceType } = updateWorkCommand;
        const reason = input.reason.trim();
        if (reason.length < 5 || reason.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
        if ((input.action === 'reassign') !== (input.assigneeUserId !== undefined)) throw new UnprocessableEntityException();
        return writeShopCommand(this.db, this.config, { headers, shopId, permission: 'operations.manage', operationId, payload: { id, ...input, reason } },
            async (tx, scope) => {
                const current = await workInShop(tx, shopId, id);
                requireVersion(current.version, input.expectedVersion);
                if (!workActions(current, scope).includes(input.action)) throw new ConflictException();
                if (input.assigneeUserId) await requireShopAccess(tx, input.assigneeUserId, shopId, 'operations.claim');
                if (input.action === 'complete' && !await workCompletionAllowed(tx, current)) throw new ConflictException('Cần hoàn tất hồ sơ nguồn trước.');
                const state = { begin: 'working', complete: 'completed', block: 'blocked',
                    reassign: input.assigneeUserId ? 'claimed' : 'queued' } as const;
                const updated = await tx.workItem.update({
                    where: { shopId_id: { shopId, id } }, data: { state: state[input.action], assigneeUserId: input.assigneeUserId,
                        blockedReason: input.action === 'block' ? reason : null, version: { increment: 1 } },
                });
                await enqueueResourceUpdate(tx, 'work_item.updated', updated);
                await recordAudit(tx, { shopId, actorId: scope.userId, action: operationId, requestId, resourceType, resourceId: id,
                    metadata: { reason, state: updated.state, version: updated.version, assigneeUserId: updated.assigneeUserId } });
                return { id, type: resourceType };
            }, async (tx, scope, result) => workView(await workInShop(tx, shopId, result.id), scope));
    }
}

@Controller('shops/:shopId/work-items')
class OperationsController {
    constructor(private readonly operations: OperationsService) {}

    @Get()
    @ContractOperation('listWorkItems')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.operations.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get(':resourceId')
    @ContractOperation('getWorkItem')
    async get(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.operations.get(request.headers, shopId, id));
    }

    @Post(':resourceId/claim')
    @HttpCode(200)
    @ContractOperation('claimWorkItem')
    async claim(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(claimBody) input: { expectedVersion: number },
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.operations.claim(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post(':resourceId/actions')
    @HttpCode(200)
    @ContractOperation('updateWorkItem')
    async update(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(updateBody) input: WorkRequest,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.operations.update(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }
}

@Module({})
class OperationsModule {}

export function operationsModule(db?: PrismaClient, config?: AuthConfig, approvalResources: readonly ApprovalResource[] = [],
    provider?: ApprovedEvaluationConfig): DynamicModule {
    return {
        module: OperationsModule, controllers: [OperationsController, ApprovalController, GovernanceController],
        providers: [
            { provide: OperationsService, useFactory: () => new OperationsService(db, config) },
            { provide: ApprovalService, useFactory: () => new ApprovalService(db, config, [...approvalResources, ...budgetApprovalResources]) },
            { provide: AutomationService, useFactory: () => new AutomationService(db, config, provider) },
            { provide: BudgetService, useFactory: () => new BudgetService(db, config) },
            { provide: OperationsOverview, useFactory: () => new OperationsOverview(db, config) },
        ],
    };
}
