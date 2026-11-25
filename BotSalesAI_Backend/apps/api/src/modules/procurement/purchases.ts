import { lockShopClosure } from '../../platform/database/shop-lifecycle.js';
import { Body, ConflictException, Controller, Get, HttpCode, HttpException, NotFoundException, Param, Post, Query, Req, Res,
    ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, validUuid } from '../../http/query.js';
import { envelope, noStore, requireVersion, versionedEnvelope } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { commandDto } from '../../platform/commands/index.js';
import { serializable } from '../../platform/database/transactions.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { enqueueCommandUpdate, enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { financeMoney, financeShop } from '../finance/index.js';
import { recordStockMovement } from '../inventory/index.js';
import { approvalInShop, approvalView, findOrCreateWorkItem, requireApprovalPolicy, setWorkState, updateApprovalState } from '../operations/index.js';
import { requireShopAccess, usesLocalOidcFixture, type AuthConfig } from '../workspace/index.js';
import { ProcurementAccess, procurementInput, procurementKey, procurementText, quantity } from './access.js';
import { recordReservationStatus, requireDispatchDelegation } from './delegations.js';
import { procurementEvidence } from './evidence.js';
import { canCancelPurchase, hashPurchaseIntent, manualPurchaseEnabled, offerIsValid, openPurchases, purchaseDetails, purchaseInShop, purchaseView,
    requestPurchaseApproval, requireCurrentPurchaseTerms, requirePurchaseWarehouse, startPurchaseDispatch, updatePurchase } from './purchase-data.js';
import { offerInShop, supplierInShop } from './suppliers.js';

type Draft = { supplierId: string; warehouseId: string; suggestionId: string | null;
    lines: { variantId: string; supplierOfferId: string; quantity: number }[] };
type Version = { expectedVersion: number };
type Send = Version & { approvalId: string; intentHash: string };
type Confirm = Version & { externalReference: string; supplierConfirmationRef: string };
type Cancel = Version & { reason: string };
const resultType = 'purchase_order';
export const purchaseFixtureEnabled = (auth?: AuthConfig) => process.env.PROCUREMENT_FIXTURE_ADAPTER === '1' && Boolean(auth && usesLocalOidcFixture(auth));

async function settlePurchaseRecovery(tx: Prisma.TransactionClient, shopId: string, sourceId: string, state: 'completed' | 'cancelled') {
    const work = await tx.workItem.findUnique({ where: { shopId_kind_sourceType_sourceId: {
        shopId, kind: 'recovery', sourceType: resultType, sourceId,
    } } });
    if (work && work.state !== 'completed' && work.state !== 'cancelled') await setWorkState(tx, shopId, work.id, state);
}

export async function createPurchaseDraft(tx: Prisma.TransactionClient, shopId: string, input: Draft) {
    const { supplierId, warehouseId, suggestionId } = input;
    const supplier = await supplierInShop(tx, shopId, supplierId);
    const { currency } = await financeShop(tx, shopId);
    if (supplier.status !== 'approved' || supplier.currency !== currency) throw new ConflictException();
    await requirePurchaseWarehouse(tx, shopId, warehouseId);
    const variants = input.lines.map(line => line.variantId);
    if (variants.length === 0 || variants.length > 100 || new Set(variants).size !== variants.length ||
        variants.some(id => !validUuid(id))) throw new UnprocessableEntityException();
    const known = await tx.variant.count({
        where: { shopId, id: { in: variants }, archivedAt: null, product: { status: { not: 'archived' } } },
    });
    if (known !== variants.length) throw new UnprocessableEntityException();
    if (suggestionId !== null) {
        if (!validUuid(suggestionId)) throw new UnprocessableEntityException();
        const suggestion = await tx.purchaseSuggestion.findUnique({ where: procurementKey(shopId, suggestionId), include: { rule: true } });
        if (!suggestion) throw new NotFoundException();
        if (!suggestion.rule.enabled || suggestion.ruleVersion !== suggestion.rule.version || suggestion.suggestedQuantity === 0 ||
            warehouseId !== suggestion.warehouseId || input.lines.length !== 1 || input.lines[0].supplierOfferId !== suggestion.supplierOfferId ||
            input.lines[0].variantId !== suggestion.variantId) throw new ConflictException();
        if (await tx.purchaseOrder.findFirst({ where: { shopId, suggestionId, status: { in: [...openPurchases] } }, select: { id: true } })) {
            throw new ConflictException();
        }
    }
    const now = new Date();
    const lines = [];
    let total = new ExactDecimal(0);
    for (const [position, item] of input.lines.entries()) {
        const offer = await offerInShop(tx, shopId, item.supplierOfferId);
        const count = quantity(item.quantity, 1);
        if (!offerIsValid(offer, supplierId, item.variantId, currency, count, now)) throw new UnprocessableEntityException();
        lines.push({ position, variantId: item.variantId, supplierOfferId: offer.id, offerVersion: offer.version,
            quantity: count, unitCost: offer.unitCost });
        total = total.plus(new ExactDecimal(offer.unitCost).mul(count));
    }
    const intentHash = hashPurchaseIntent({
        supplierId, supplierVersion: supplier.version, warehouseId, total: financeMoney(total, currency),
        lines: lines.map(({ variantId, supplierOfferId, offerVersion, quantity, unitCost }) =>
            ({ variantId, supplierOfferId, offerVersion, quantity, unitCost: financeMoney(unitCost, currency) })),
    });
    const result = await tx.purchaseOrder.create({ data: {
        shopId, supplierId, supplierVersion: supplier.version, warehouseId, suggestionId, intentHash, total, currency,
        lines: { createMany: { data: lines } },
    } });
    await enqueueResourceUpdate(tx, 'purchase.updated', result);
    if (suggestionId) {
        const updated = await tx.purchaseSuggestion.update({
            where: procurementKey(shopId, suggestionId), data: { suggestedQuantity: 0, version: { increment: 1 } },
        });
        await enqueueResourceUpdate(tx, 'purchase_suggestion.updated', updated);
    }
    return result;
}

export async function dispatchPurchases(db: PrismaClient, auth?: AuthConfig) {
    const due = await db.purchaseDispatch.findMany({
        where: { dueAt: { lte: new Date() }, command: { actor: { shop: { closedAt: null } } } }, orderBy: [{ dueAt: 'asc' }, { purchaseOrderId: 'asc' }], take: 50,
        select: { shopId: true, purchaseOrderId: true },
    });
    for (const key of due) {
        await serializable(db, async tx => {
            if (await lockShopClosure(tx, key.shopId)) return;
            const where = { shopId_purchaseOrderId: key };
            const job = await tx.purchaseDispatch.findUnique({ where, include: { command: { include: { purchaseBudgetReservation: true } } } });
            if (!job?.dueAt || job.dueAt > new Date()) return;
            const purchase = await purchaseInShop(tx, job.shopId, job.purchaseOrderId);
            const reservation = job.command.purchaseBudgetReservation;
            let failed = false;
            try {
                if (!purchaseFixtureEnabled(auth) || purchase.status !== 'sending' || job.command.status !== 'accepted') throw new ConflictException();
                await requireShopAccess(tx, job.command.actorId, job.shopId, 'procurement.send');
                if (reservation) await requireDispatchDelegation(tx, purchase, reservation, auth);
                else {
                    if (!purchase.approval) throw new ConflictException();
                    await requireApprovalPolicy(tx, purchase.approval, 'consumed');
                    await requireCurrentPurchaseTerms(tx, purchase);
                }
            } catch (error) {
                if (!(error instanceof HttpException) || ![403, 404, 409].includes(error.getStatus())) throw error;
                failed = true;
            }
            const unknown = !failed && purchase.supplier.dispatchRoute?.outcome === 'unknown';
            const status = failed ? 'failed' : unknown ? 'unknown' : 'succeeded';
            const changed = await updatePurchase(tx, purchase, failed ? { status: 'draft', approvalId: null } : {
                status: unknown ? 'unknown' : 'sent', externalReference: unknown ? null : 'FIXTURE-PO-' + purchase.id,
            });
            if (reservation) {
                await recordReservationStatus(tx, reservation, failed ? 'released' : unknown ? 'unknown' : 'consumed');
                if (purchase.suggestionId) {
                    const suggestion = await tx.purchaseSuggestion.update({ where: procurementKey(job.shopId, purchase.suggestionId), data: {
                        autoSendReason: failed ? 'Thẩm quyền, số tồn hoặc điều khoản đã đổi trước lúc gửi.' : null, version: { increment: 1 },
                    } });
                    await enqueueResourceUpdate(tx, 'purchase_suggestion.updated', suggestion);
                }
            }
            if (unknown || (failed && reservation)) await findOrCreateWorkItem(tx, {
                shopId: purchase.shopId, sourceType: 'purchase_order', sourceId: purchase.id, kind: 'recovery', dueAt: new Date(),
            });
            await tx.purchaseDispatch.update({ where, data: { dueAt: null } });
            await tx.command.update({ where: procurementKey(job.shopId, job.commandId), data: { status } });
            await enqueueCommandUpdate(tx, { id: job.commandId, shopId: job.shopId });
            await recordAudit(tx, {
                shopId: job.shopId, actorId: job.command.actorId, requestId: job.commandId, action: 'dispatchPurchaseFixture',
                resourceType: resultType, resourceId: purchase.id, metadata: {
                    actorKind: 'system', version: changed.version, status,
                    ...(reservation ? { origin: 'delegation', delegationId: reservation.delegationId, reservationId: reservation.id } : {}),
                },
            });
        }, true);
    }
}

export class PurchaseService extends ProcurementAccess {
    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.listPage(headers, shopId, raw, 'purchases', async (tx, page, scope) =>
            (await tx.purchaseOrder.findMany({
                where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1, include: purchaseDetails,
            })).map(order => purchaseView(order, scope, purchaseFixtureEnabled(this.config))));
    }

    get(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, async (tx, scope) =>
            purchaseView(await purchaseInShop(tx, shopId, id), scope, purchaseFixtureEnabled(this.config)));
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: Draft, requestId: string) {
        return this.write({ headers, shopId, operationId: 'createPurchaseOrder', payload: input, requestId },
            tx => createPurchaseDraft(tx, shopId, input), async (tx, id, scope) =>
                purchaseView(await purchaseInShop(tx, shopId, id), scope, purchaseFixtureEnabled(this.config)));
    }

    requestApproval(headers: IncomingHttpHeaders, shopId: string, id: string, input: Version, requestId: string) {
        return this.write({ headers, shopId, operationId: 'requestPurchaseApproval', payload: { id, input }, requestId },
            (tx, scope) => requestPurchaseApproval(tx, scope, id, input.expectedVersion),
            async (tx, approvalId) => approvalView(await approvalInShop(tx, shopId, approvalId)));
    }

    send(headers: IncomingHttpHeaders, shopId: string, id: string, input: Send, requestId: string) {
        return this.write({ headers, shopId, operationId: 'sendPurchaseOrder', payload: { id, input }, requestId, deferred: true },
            async (tx, _scope, auth, command) => {
                const order = await purchaseInShop(tx, shopId, id);
                const manual = manualPurchaseEnabled(order);
                if (!manual && !purchaseFixtureEnabled(auth)) throw new ServiceUnavailableException();
                requireVersion(order.version, input.expectedVersion);
                const approval = order.approval;
                if (order.status !== 'approved' || !approval || approval.id !== input.approvalId || approval.action !== 'purchase.send' ||
                    approval.resourceType !== resultType || approval.resourceId !== id || approval.resourceVersion !== order.version ||
                    approval.intentHash !== input.intentHash || order.intentHash !== input.intentHash || !approval.amount?.eq(order.total) ||
                    approval.currency !== order.currency) throw new ConflictException();
                await requireApprovalPolicy(tx, approval, 'approved');
                await requireCurrentPurchaseTerms(tx, order);
                await updateApprovalState(tx, approval, { status: 'consumed' });
                const started = await startPurchaseDispatch(tx, order, command.id, manual);
                if (manual) await findOrCreateWorkItem(tx, {
                    shopId, sourceType: 'purchase_order', sourceId: id, kind: 'recovery', dueAt: new Date(),
                });
                return started;
            }, async (_tx, _result, _scope, command) => commandDto(command, resultType));
    }

    confirm(headers: IncomingHttpHeaders, shopId: string, id: string, input: Confirm, requestId: string) {
        const reference = procurementText(input.externalReference, 1);
        return this.write({ headers, shopId, operationId: 'confirmPurchaseOrder', payload: { id, input }, requestId }, async (tx, scope) => {
            const order = await purchaseInShop(tx, shopId, id);
            requireVersion(order.version, input.expectedVersion);
            if (!['sent', 'unknown'].includes(order.status) || (order.externalReference && order.externalReference !== reference)) {
                throw new ConflictException();
            }
            const proof = await procurementEvidence(tx, shopId, id, input.supplierConfirmationRef, 'supplier_confirmation');
            if (proof.externalRef !== reference || proof.occurredAt < order.updatedAt) throw new UnprocessableEntityException();
            const dispatch = order.status === 'unknown' ? await tx.purchaseDispatch.findUniqueOrThrow({
                where: { shopId_purchaseOrderId: { shopId, purchaseOrderId: id } },
            }) : undefined;
            if (dispatch?.manualHandoff && proof.attestedVersion !== order.version) throw new UnprocessableEntityException();
            await requirePurchaseWarehouse(tx, shopId, order.warehouseId);
            for (const line of [...order.lines].sort((a, b) => a.variantId.localeCompare(b.variantId))) {
                await recordStockMovement(tx, {
                    shopId, warehouseId: order.warehouseId, variantId: line.variantId, actorId: scope.userId, kind: 'receipt',
                    source: { type: 'purchase_confirmation', id, lineId: line.id }, reason: 'Đơn mua có bằng chứng xác nhận',
                    delta: { inbound: line.quantity },
                });
            }
            if (dispatch) {
                const settled = await tx.command.updateMany({
                    where: { shopId, id: dispatch.commandId, status: dispatch.manualHandoff ? 'accepted' : 'unknown' },
                    data: { status: 'succeeded' },
                });
                if (!settled.count && dispatch.manualHandoff) throw new ConflictException();
                if (settled.count) await enqueueCommandUpdate(tx, { shopId, id: dispatch.commandId });
                const reservation = await tx.purchaseDelegationReservation.findUnique({ where: { shopId_commandId: { shopId, commandId: dispatch.commandId } } });
                if (reservation?.status === 'unknown') await recordReservationStatus(tx, reservation, 'consumed');
            }
            await settlePurchaseRecovery(tx, shopId, id, 'completed');
            return updatePurchase(tx, order, { status: 'confirmed', externalReference: reference, confirmationId: proof.id });
        }, async (tx, id, scope) => purchaseView(await purchaseInShop(tx, shopId, id), scope, purchaseFixtureEnabled(this.config)));
    }

    cancel(headers: IncomingHttpHeaders, shopId: string, id: string, input: Cancel, requestId: string) {
        const reason = procurementText(input.reason, 5);
        return this.write({ headers, shopId, operationId: 'cancelPurchaseOrder', payload: { id, input }, requestId, reason }, async tx => {
            const order = await purchaseInShop(tx, shopId, id);
            requireVersion(order.version, input.expectedVersion);
            if (!canCancelPurchase(order.status)) throw new ConflictException();
            if (order.approval && ['pending', 'approved'].includes(order.approval.status)) await updateApprovalState(tx, order.approval, { status: 'revoked' });
            await settlePurchaseRecovery(tx, shopId, id, 'cancelled');
            return updatePurchase(tx, order, { status: 'cancelled' });
        }, async (_tx, _result, _scope, command) => commandDto(command, resultType));
    }
}

@Controller('shops/:shopId/purchase-orders')
export class PurchaseController {
    constructor(private readonly purchases: PurchaseService) {}

    @Get()
    @ContractOperation('listPurchaseOrders')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.purchases.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get(':resourceId')
    @ContractOperation('getPurchaseOrder')
    async get(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.purchases.get(request.headers, shopId, id));
    }

    @Post()
    @ContractOperation('createPurchaseOrder')
    async create(@Param('shopId', idPipe) shopId: string, @Body(procurementInput('PurchaseCreate')) input: Draft,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.purchases.create(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post(':resourceId/request-approval')
    @HttpCode(200)
    @ContractOperation('requestPurchaseApproval')
    async approval(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(procurementInput('VersionRequest')) input: Version,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.purchases.requestApproval(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post(':resourceId/send')
    @HttpCode(202)
    @ContractOperation('sendPurchaseOrder')
    async send(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(procurementInput('PurchaseSend')) input: Send,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.purchases.send(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post(':resourceId/confirm')
    @HttpCode(200)
    @ContractOperation('confirmPurchaseOrder')
    async confirm(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(procurementInput('PurchaseConfirm')) input: Confirm,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.purchases.confirm(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post(':resourceId/cancel')
    @HttpCode(202)
    @ContractOperation('cancelPurchaseOrder')
    async cancel(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(procurementInput('VersionedReason')) input: Cancel,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.purchases.cancel(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }
}
