import { Body, ConflictException, Controller, Get, HttpCode, NotFoundException, Param, Post, Query, Req, Res, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { Prisma } from '../../generated/prisma/client.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, validUuid } from '../../http/query.js';
import { envelope, noStore, requireVersion, versionedEnvelope } from '../../http/response.js';
import { commandDto } from '../../platform/commands/index.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { bookBusinessPairs, financeShop, localAccountingDate, lockOpenPeriod } from '../finance/index.js';
import { recordStockMovement } from '../inventory/index.js';
import { ProcurementAccess, procurementInput, procurementKey, procurementText, quantity, requireResourceId } from './access.js';
import { procurementEvidence } from './evidence.js';
import { purchaseInShop, receiving, remainingToReceive, requirePurchaseWarehouse, updatePurchase } from './purchase-data.js';

type ReceivedLine = { purchaseLineId: string; acceptedQuantity: number; rejectedQuantity: number; reason: string };
type Draft = { purchaseOrderId: string; expectedPurchaseVersion: number; sourceDocumentRef: string; lines: ReceivedLine[] };
type Version = { expectedVersion: number };
const details = { lines: { orderBy: { purchaseLine: { position: 'asc' } } }, document: { select: { occurredAt: true } } } satisfies Prisma.GoodsReceiptInclude;
type Receipt = Prisma.GoodsReceiptGetPayload<{ include: typeof details }>;

function receiptView(receipt: Receipt) {
    const { id, shopId, version, createdAt, updatedAt, purchaseOrderId, warehouseId, status, sourceDocumentRef } = receipt;
    return { id, shopId, version, createdAt, updatedAt, purchaseOrderId, warehouseId, status, sourceDocumentRef,
        lines: receipt.lines.map(({ purchaseLineId, acceptedQuantity, rejectedQuantity, reason }) =>
            ({ purchaseLineId, acceptedQuantity, rejectedQuantity, reason })) };
}

async function receiptInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    requireResourceId(id);
    const record = await tx.goodsReceipt.findUnique({ where: procurementKey(shopId, id), include: details });
    if (!record) throw new NotFoundException();
    return record;
}

export class ReceiptService extends ProcurementAccess {
    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.listPage(headers, shopId, raw, 'receipts', async (tx, page) =>
            (await tx.goodsReceipt.findMany({ where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1, include: details }))
                .map(receiptView));
    }

    get(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, async tx => receiptView(await receiptInShop(tx, shopId, id)));
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: Draft, requestId: string) {
        return this.write({ headers, shopId, operationId: 'createGoodsReceipt', payload: input, requestId }, async tx => {
            const order = await purchaseInShop(tx, shopId, input.purchaseOrderId);
            requireVersion(order.version, input.expectedPurchaseVersion);
            if (order.status !== 'confirmed' && order.status !== 'part_received') throw new ConflictException();
            await requirePurchaseWarehouse(tx, shopId, order.warehouseId);
            const evidence = await procurementEvidence(tx, shopId, order.id, input.sourceDocumentRef, 'goods_receipt');
            if (!order.confirmationId) throw new ConflictException();
            const confirmation = await procurementEvidence(tx, shopId, order.id, order.confirmationId, 'supplier_confirmation');
            if (evidence.occurredAt < confirmation.occurredAt ||
                (confirmation.attestationHash && !evidence.attestationHash)) throw new UnprocessableEntityException();
            if (await tx.goodsReceipt.findFirst({ where: { shopId, sourceDocumentRef: evidence.id }, select: { id: true } })) throw new ConflictException();
            const ids = input.lines.map(line => line.purchaseLineId);
            if (!ids.length || ids.length > 100 || new Set(ids).size !== ids.length || ids.some(id => !validUuid(id))) {
                throw new UnprocessableEntityException();
            }
            const purchased = new Map(order.lines.map(line => [line.id, line]));
            const lines = input.lines.map(item => {
                const original = purchased.get(item.purchaseLineId);
                const acceptedQuantity = quantity(item.acceptedQuantity);
                const rejectedQuantity = quantity(item.rejectedQuantity);
                const count = acceptedQuantity + rejectedQuantity;
                if (!original || count === 0 || count > remainingToReceive(original)) throw new UnprocessableEntityException();
                return { purchaseLineId: item.purchaseLineId, acceptedQuantity, rejectedQuantity,
                    reason: procurementText(item.reason, rejectedQuantity ? 5 : 0) };
            });
            const receipt = await tx.goodsReceipt.create({
                data: { shopId, purchaseOrderId: order.id, warehouseId: order.warehouseId, sourceDocumentRef: evidence.id,
                    lines: { createMany: { data: lines } } },
            });
            await enqueueResourceUpdate(tx, 'receipt.updated', receipt);
            return receipt;
        }, async (tx, id) => receiptView(await receiptInShop(tx, shopId, id)));
    }

    post(headers: IncomingHttpHeaders, shopId: string, id: string, input: Version, requestId: string) {
        return this.write({ headers, shopId, operationId: 'postGoodsReceipt', payload: { id, input }, requestId }, async (tx, scope) => {
            const receipt = await receiptInShop(tx, shopId, id);
            requireVersion(receipt.version, input.expectedVersion);
            if (receipt.status !== 'draft') throw new ConflictException();
            const order = await purchaseInShop(tx, shopId, receipt.purchaseOrderId);
            const accepting = new Set<string>(receiving);
            if (!accepting.has(order.status) || receipt.warehouseId !== order.warehouseId) throw new ConflictException();
            await requirePurchaseWarehouse(tx, shopId, receipt.warehouseId);
            const at = receipt.document.occurredAt;
            const { currency, timezone } = await financeShop(tx, shopId);
            if (currency !== order.currency) throw new ConflictException();
            await lockOpenPeriod(tx, shopId, localAccountingDate(at, timezone));
            const purchased = new Map(order.lines.map(line => [line.id, line]));
            let invoice = new ExactDecimal(0);
            const lines = [...receipt.lines].sort((left, right) =>
                (purchased.get(left.purchaseLineId)?.variantId ?? '').localeCompare(purchased.get(right.purchaseLineId)?.variantId ?? ''));
            for (const item of lines) {
                const line = purchased.get(item.purchaseLineId);
                const { acceptedQuantity, rejectedQuantity } = item;
                const count = acceptedQuantity + rejectedQuantity;
                if (!line || count > remainingToReceive(line)) throw new ConflictException();
                const cost = new ExactDecimal(line.unitCost).mul(acceptedQuantity);
                await recordStockMovement(tx, {
                    shopId, warehouseId: receipt.warehouseId, variantId: line.variantId, actorId: scope.userId, kind: 'receipt',
                    source: { type: 'goods_receipt', id, lineId: line.id }, reason: 'Ghi số lượng đã kiểm nhận',
                    delta: { onHand: acceptedQuantity, quarantine: rejectedQuantity, inbound: -count },
                    ...(acceptedQuantity > 0 ? { receivedValue: cost.toFixed() } : {}),
                });
                line.receivedQuantity += acceptedQuantity;
                line.rejectedQuantity += rejectedQuantity;
                await tx.purchaseOrderLine.update({
                    where: procurementKey(shopId, line.id), data: { receivedQuantity: line.receivedQuantity, rejectedQuantity: line.rejectedQuantity },
                });
                invoice = invoice.plus(cost);
            }
            await bookBusinessPairs(tx, { shopId, sourceId: id, at, currency }, 'goods_receipt', 'post', [
                { debit: 'inventory', credit: 'supplier_payable', amount: invoice, description: 'Tăng kho và phải trả theo hàng đạt' },
            ]);
            const posted = await tx.goodsReceipt.update({
                where: procurementKey(shopId, id), data: { status: 'posted', postedAt: new Date(), version: { increment: 1 } },
            });
            await updatePurchase(tx, order, { status: order.lines.every(line => remainingToReceive(line) === 0) ? 'received' : 'part_received' });
            await enqueueResourceUpdate(tx, 'receipt.updated', posted);
            return posted;
        }, async (_tx, _id, _scope, command) => commandDto(command, 'goods_receipt'));
    }
}

@Controller('shops/:shopId/goods-receipts')
export class ReceiptController {
    constructor(private readonly receipts: ReceiptService) {}

    @Get()
    @ContractOperation('listGoodsReceipts')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.receipts.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get(':resourceId')
    @ContractOperation('getGoodsReceipt')
    async get(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.receipts.get(request.headers, shopId, id));
    }

    @Post()
    @ContractOperation('createGoodsReceipt')
    async create(@Param('shopId', idPipe) shopId: string, @Body(procurementInput('GoodsReceiptCreate')) input: Draft,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.receipts.create(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post(':resourceId/post')
    @HttpCode(202)
    @ContractOperation('postGoodsReceipt')
    async post(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(procurementInput('VersionRequest')) input: Version,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.receipts.post(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }
}
