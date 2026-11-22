import { Body, ConflictException, Controller, Get, HttpCode, NotFoundException, Param, Post, Query, Req, Res,
    UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { Approval, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery, paging, validUuid } from '../../http/query.js';
import { envelope, noStore, requireVersion, versionedEnvelope } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { financeMoney } from '../finance/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig, type ShopScope } from '../workspace/index.js';

type Ref = { type: string; id: string };
type RequestApproval = { action: string; resource: Ref; resourceVersion: number; intentHash: string; reason: string };
type Decision = { expectedVersion: number; intentHash: string; decision: 'approve' | 'reject'; reason: string };
const createBody = new SchemaPipe(validator.compile(schemaFromContract('ApprovalCreate')));
const decisionBody = new SchemaPipe(validator.compile(schemaFromContract('ApprovalDecision')));
const key = (shopId: string, id: string) => ({ shopId_id: { shopId, id } });
export const approvalCommands = ['createApproval', 'decideApproval'].map(operationId => ({ operationId, resourceType: 'approval' }));

export type ApprovalResource = {
    action: string;
    resourceType: string;
    request(tx: Prisma.TransactionClient, scope: ShopScope, input: RequestApproval): Promise<Approval>;
    decide(tx: Prisma.TransactionClient, scope: ShopScope, approval: Approval, decision: Decision['decision']): Promise<number>;
};

export function approvalView(approval: Approval, now = new Date()) {
    const { resourceType, resourceId, amount, currency, ...safe } = approval;
    const expired = ['pending', 'approved'].includes(approval.status) && approval.expiresAt <= now;
    return {
        ...safe, status: expired ? 'expired' : approval.status, resource: { type: resourceType, id: resourceId },
        amount: amount && currency ? financeMoney(amount, currency) : null,
    };
}

export async function approvalInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const approval = await tx.approval.findUnique({ where: key(shopId, id) });
    if (!approval) throw new NotFoundException();
    return approval;
}

export async function recordApproval(tx: Prisma.TransactionClient, input: Pick<Prisma.ApprovalUncheckedCreateInput,
    'shopId' | 'action' | 'resourceType' | 'resourceId' | 'resourceVersion' | 'intentHash' | 'requestedBy' | 'amount' | 'currency'>) {
    const { policyVersion } = await tx.shop.findUniqueOrThrow({ where: { id: input.shopId }, select: { policyVersion: true } });
    const approval = await tx.approval.create({ data: { ...input, policyVersion, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
    await enqueueResourceUpdate(tx, 'approval.updated', approval);
    return approval;
}

export async function updateApprovalState(tx: Prisma.TransactionClient, approval: Approval, fields: Prisma.ApprovalUncheckedUpdateInput) {
    const updated = await tx.approval.update({
        where: key(approval.shopId, approval.id), data: { ...fields, version: { increment: 1 } },
    });
    await enqueueResourceUpdate(tx, 'approval.updated', updated);
    return updated;
}

export async function requireApprovalPolicy(tx: Prisma.TransactionClient, approval: Approval, status: 'approved' | 'pending' | 'consumed') {
    const { policyVersion } = await tx.shop.findUniqueOrThrow({ where: { id: approval.shopId }, select: { policyVersion: true } });
    if (approval.status !== status || approval.expiresAt <= new Date() || approval.policyVersion !== policyVersion) throw new ConflictException();
}

function reasonText(value: string) {
    const reason = value.trim();
    if (reason.length < 5 || reason.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
    return reason;
}

export class ApprovalService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig, private readonly resources: readonly ApprovalResource[] = []) {}

    list(headers: IncomingHttpHeaders, shopId: string, query: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'approvals.read');
            const page = paging(listQuery(query, 'page'), ['approvals', shopId, userId, String(scope.permissionVersion)]);
            const result = page.result(await tx.approval.findMany({
                where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1,
            }));
            return { ...result, data: result.data.map(approval => approvalView(approval)) };
        });
    }

    get(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            await requireShopAccess(tx, userId, shopId, 'approvals.read');
            return approvalView(await approvalInShop(tx, shopId, id));
        });
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: RequestApproval, requestId: string) {
        const reason = reasonText(input.reason);
        return this.change(headers, shopId, 'createApproval', input, requestId, reason, (tx, scope) =>
            this.resource(input.action, input.resource.type).request(tx, scope, input));
    }

    decide(headers: IncomingHttpHeaders, shopId: string, id: string, input: Decision, requestId: string) {
        const reason = reasonText(input.reason);
        return this.change(headers, shopId, 'decideApproval', { id, input }, requestId, reason, async (tx, scope) => {
            const current = await approvalInShop(tx, shopId, id);
            requireVersion(current.version, input.expectedVersion);
            if (current.intentHash !== input.intentHash) throw new ConflictException();
            await requireApprovalPolicy(tx, current, 'pending');
            const resourceVersion = await this.resource(current.action, current.resourceType).decide(tx, scope, current, input.decision);
            return updateApprovalState(tx, current, {
                status: input.decision === 'approve' ? 'approved' : 'rejected', resourceVersion, decidedBy: scope.userId, decisionReason: reason,
            });
        });
    }

    private resource(action: string, type: string) {
        const resource = this.resources.find(item => item.action === action && item.resourceType === type);
        if (!resource) throw new UnprocessableEntityException();
        return resource;
    }

    private change(headers: IncomingHttpHeaders, shopId: string, operationId: 'createApproval' | 'decideApproval',
        payload: Prisma.InputJsonValue, requestId: string, reason: string,
        apply: (tx: Prisma.TransactionClient, scope: ShopScope) => Promise<Approval>) {
        return writeShopCommand(this.db, this.config, {
            headers, shopId, operationId, permission: operationId === 'createApproval' ? 'approvals.request' : 'approvals.decide', payload,
        }, async (tx, scope) => {
            const approval = await apply(tx, scope);
            await recordAudit(tx, { shopId, actorId: scope.userId, action: operationId, requestId, resourceType: 'approval',
                resourceId: approval.id, metadata: { version: approval.version, resourceVersion: approval.resourceVersion, status: approval.status, reason } });
            return { type: 'approval', id: approval.id };
        }, async (tx, _scope, result) => approvalView(await approvalInShop(tx, shopId, result.id)));
    }
}

@Controller('shops/:shopId/approvals')
export class ApprovalController {
    constructor(private readonly approvals: ApprovalService) {}

    @Get()
    @ContractOperation('listApprovals')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.approvals.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get(':resourceId')
    @ContractOperation('getApproval')
    async get(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.approvals.get(request.headers, shopId, id));
    }

    @Post()
    @ContractOperation('createApproval')
    async create(@Param('shopId', idPipe) shopId: string, @Body(createBody) input: RequestApproval,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.approvals.create(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post(':resourceId/decision')
    @HttpCode(200)
    @ContractOperation('decideApproval')
    async decide(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(decisionBody) input: Decision,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.approvals.decide(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }
}
