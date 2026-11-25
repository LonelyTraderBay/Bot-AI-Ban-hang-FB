import { Body, ConflictException, Controller, ForbiddenException, Get, HttpCode, NotFoundException, Param, Post, Query, Req, Res,
    UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { Prisma, type PreparationState, type PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery, paging, validUuid } from '../../http/query.js';
import { envelope, noStore, requireVersion, versionedEnvelope } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { approvedPreparationImages } from '../knowledge/index.js';
import { cancelPreparationReminders, notifyPreparation } from '../notifications/index.js';
import { createWorkItem, setWorkState } from '../operations/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig, type ShopScope } from '../workspace/index.js';

type PickInput = { expectedVersion: number; orderLineId: string; scannedSku: string; pickedQuantity: number;
    issueReason: string | null; issueEvidenceFileId?: string | null };
const pickBody = new SchemaPipe(validator.compile(schemaFromContract('PickLineRequest')));
const versionBody = new SchemaPipe(validator.compile(schemaFromContract('VersionRequest')));
export const preparationCommands = ['pickPrepLine', 'packPrepJob'].map(operationId => ({ operationId, resourceType: 'prep_job' }));
const key = (shopId: string, id: string) => ({ shopId_id: { shopId, id } });

export async function provisionPreparation(tx: Prisma.TransactionClient, order: {
    shopId: string; id: string;
}, lines: { id: string; variantId: string; sku: string; quantity: number }[], recipientUserId: string, dueAt: Date) {
    const { id: orderId, shopId } = order;
    const task = await createWorkItem(tx, { shopId, kind: 'prepare_order', sourceType: 'order', sourceId: orderId, dueAt });
    const prep = await tx.prepJob.create({ data: { shopId, orderId, workItemId: task.id } });
    const variants = await tx.variant.findMany({ where: { shopId, id: { in: lines.map(line => line.variantId) } },
        select: { id: true, productId: true } });
    const products = new Map(variants.map(variant => [variant.id, variant.productId]));
    const images = await approvedPreparationImages(tx, shopId, variants.map(variant => variant.productId));
    await tx.preparationLine.createMany({
        data: lines.map(line => {
            const image = images.get(products.get(line.variantId) ?? '');
            return { shopId, prepJobId: prep.id, orderLineId: line.id, sku: line.sku, requiredQuantity: line.quantity,
                productImageFileId: image?.fileId, productImageRevisionId: image?.knowledgeRevisionId };
        }),
    });
    await notifyPreparation(tx, task, recipientUserId);
    return prep;
}

export async function cancelPreparation(tx: Prisma.TransactionClient, shopId: string, orderId: string) {
    const current = await tx.prepJob.findUnique({ where: { shopId_orderId: { shopId, orderId } } });
    if (!current || current.state === 'cancelled') return;
    if (current.state === 'handed_over') throw new ConflictException();
    await tx.prepJob.update({ where: key(shopId, current.id), data: { state: 'cancelled', version: { increment: 1 } } });
    await setWorkState(tx, shopId, current.workItemId, 'cancelled');
    await cancelPreparationReminders(tx, shopId, current.workItemId);
}

const prepDetails = {
    lines: { orderBy: { orderLine: { position: 'asc' } } }, workItem: { select: { assigneeUserId: true, state: true, dueAt: true } },
    order: { select: { orderState: true, fulfillmentState: true, reservation: { select: { status: true, expiresAt: true } } } },
} satisfies Prisma.PrepJobInclude;
type Prep = Prisma.PrepJobGetPayload<{ include: typeof prepDetails }>;

async function preparationInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const prep = await tx.prepJob.findUnique({ where: key(shopId, id), include: prepDetails });
    if (!prep) throw new NotFoundException();
    return prep;
}

function preparationView(prep: Prep, asOf = new Date()) {
    const { dueAt, state: workState } = prep.workItem;
    const elapsed = dueAt ? asOf.getTime() - dueAt.getTime() : 0;
    return {
        id: prep.id, shopId: prep.shopId, version: prep.version, createdAt: prep.createdAt, updatedAt: prep.updatedAt,
        orderId: prep.orderId, workItemId: prep.workItemId, assigneeUserId: prep.workItem.assigneeUserId,
        state: prep.state === 'queued' && prep.workItem.state === 'claimed' ? 'claimed' : prep.state,
        dueAt, overdueMinutes: elapsed > 0 && !['completed', 'cancelled'].includes(workState) ? Math.ceil(elapsed / 60_000) : null,
        lines: prep.lines.map(({ orderLineId, sku, requiredQuantity, pickedQuantity, hasIssue, productImageFileId, productImageRevisionId, issueEvidenceFileId }) => ({
            orderLineId, sku, requiredQuantity, pickedQuantity, hasIssue, issueEvidenceFileId,
            productImageSnapshot: productImageFileId && productImageRevisionId
                ? { fileId: productImageFileId, knowledgeRevisionId: productImageRevisionId } : null,
        })),
    };
}

function preparationState(state: PreparationState | undefined): Prisma.PrepJobWhereInput {
    if (state === 'queued') return { state, workItem: { state: { not: 'claimed' } } };
    if (state === 'claimed') return { OR: [{ state }, { state: 'queued', workItem: { state } }] };
    return { state };
}

function verifyPreparedWork(prep: Prep, actorId: string, expectedVersion: number) {
    if (prep.workItem.assigneeUserId !== actorId) throw new ForbiddenException();
    requireVersion(prep.version, expectedVersion);
    if (!['queued', 'claimed', 'picking'].includes(prep.state) || prep.order.orderState !== 'confirmed' ||
        prep.order.reservation?.status !== 'active' || prep.order.reservation.expiresAt <= new Date()) throw new ConflictException();
}

export class PreparationService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'fulfillment.read');
            const query = listQuery(raw, 'prepJobs');
            const state = query.state as PreparationState | undefined;
            const assigneeUserId = query.assignee === 'me' ? userId : query.assignee === 'unassigned' ? null : undefined;
            const page = paging(query, ['prep', shopId, userId, String(scope.permissionVersion), state ?? '', query.assignee ?? '']);
            const asOf = new Date();
            const result = page.result(await tx.prepJob.findMany({
                where: { shopId, AND: [preparationState(state), { workItem: { assigneeUserId } }, page.after ?? {}] },
                orderBy: page.orderBy, take: page.limit + 1, include: prepDetails,
            }));
            return { ...result, data: result.data.map(prep => preparationView(prep, asOf)) };
        });
    }

    get(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            await requireShopAccess(tx, userId, shopId, 'fulfillment.read');
            return preparationView(await preparationInShop(tx, shopId, id));
        });
    }

    pick(headers: IncomingHttpHeaders, shopId: string, id: string, input: PickInput, requestId: string) {
        const issue = input.issueReason?.trim() ?? null;
        const evidenceId = input.issueEvidenceFileId;
        if ((issue !== null && (issue.length < 3 || issue.includes(String.fromCharCode(0)))) ||
            (evidenceId && (issue === null || !validUuid(evidenceId)))) throw new UnprocessableEntityException();
        return this.change(headers, shopId, id, 'pickPrepLine', input, requestId, async (tx, scope, current) => {
            verifyPreparedWork(current, scope.userId, input.expectedVersion);
            const line = current.lines.find(row => row.orderLineId === input.orderLineId);
            if (!line || line.sku !== input.scannedSku.trim() || !Number.isInteger(input.pickedQuantity) ||
                input.pickedQuantity > line.requiredQuantity || input.pickedQuantity < 0) throw new UnprocessableEntityException();
            if (evidenceId) {
                const evidence = await tx.fileObject.findFirst({ where: { shopId, id: evidenceId, resourceId: id,
                    purpose: 'preparation_issue_image', status: 'ready', uploaderId: scope.userId },
                    select: { preparationIssueEvidence: { select: { orderLineId: true } } } });
                if (!evidence || evidence.preparationIssueEvidence.some(link => link.orderLineId !== line.orderLineId))
                    throw new UnprocessableEntityException();
            }
            await tx.preparationLine.update({
                where: { shopId_prepJobId_orderLineId: { shopId, prepJobId: id, orderLineId: line.orderLineId } },
                data: { pickedQuantity: input.pickedQuantity, hasIssue: issue !== null, ...(evidenceId ? { issueEvidenceFileId: evidenceId } : {}) },
            });
            const unresolved = issue !== null || current.lines.some(row => row.orderLineId !== line.orderLineId && row.hasIssue);
            await setWorkState(tx, shopId, current.workItemId, unresolved ? 'blocked' : 'working',
                issue ?? (unresolved ? 'Còn dòng hàng cần kiểm tra' : null));
            return 'picking';
        }, issue);
    }

    pack(headers: IncomingHttpHeaders, shopId: string, id: string, input: { expectedVersion: number }, requestId: string) {
        return this.change(headers, shopId, id, 'packPrepJob', input, requestId, async (tx, scope, current) => {
            verifyPreparedWork(current, scope.userId, input.expectedVersion);
            if (current.state !== 'picking' || current.lines.some(line => line.hasIssue || line.pickedQuantity !== line.requiredQuantity)) {
                throw new ConflictException();
            }
            await setWorkState(tx, shopId, current.workItemId, 'working');
            return 'packed';
        });
    }

    private change(headers: IncomingHttpHeaders, shopId: string, id: string, operationId: 'pickPrepLine' | 'packPrepJob',
        input: Prisma.InputJsonValue, requestId: string,
        apply: (tx: Prisma.TransactionClient, scope: ShopScope, current: Prep) => Promise<'picking' | 'packed'>,
        reason?: string | null) {
        return writeShopCommand(this.db, this.config, {
            headers, shopId, permission: 'fulfillment.write', operationId, payload: { id, input },
        }, async (tx, scope) => {
            const current = await preparationInShop(tx, shopId, id);
            const state = await apply(tx, scope, current);
            const prep = await tx.prepJob.update({ where: key(shopId, id), data: { state, version: { increment: 1 } } });
            const order = await tx.salesOrder.update({
                where: key(shopId, prep.orderId), data: { fulfillmentState: state, version: { increment: 1 } },
            });
            await recordAudit(tx, {
                shopId, actorId: scope.userId, action: operationId, requestId, resourceType: 'prep_job', resourceId: id,
                metadata: { version: prep.version, ...(reason ? { reason } : {}) },
            });
            await enqueueResourceUpdate(tx, 'order.updated', order);
            return { type: 'prep_job', id };
        }, async (tx, _scope, result) => preparationView(await preparationInShop(tx, shopId, result.id)));
    }
}

@Controller('shops/:shopId/prep-jobs')
export class PreparationController {
    constructor(private readonly preparation: PreparationService) {}

    @Get()
    @ContractOperation('listPrepJobs')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.preparation.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get(':resourceId')
    @ContractOperation('getPrepJob')
    async get(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.preparation.get(request.headers, shopId, id));
    }

    @Post(':resourceId/pick')
    @HttpCode(200)
    @ContractOperation('pickPrepLine')
    async pick(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(pickBody) input: PickInput,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.preparation.pick(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post(':resourceId/pack')
    @HttpCode(200)
    @ContractOperation('packPrepJob')
    async pack(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(versionBody) input: { expectedVersion: number },
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.preparation.pack(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }
}
