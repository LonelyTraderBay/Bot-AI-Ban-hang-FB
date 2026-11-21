import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { OrderPaymentMethod, Prisma } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { sellableVariants } from '../catalog/index.js';
import { customerInShop, snapshotAddress, type AddressInput } from '../customers/index.js';
import { estimatedShipping } from '../fulfillment/index.js';
import { requireCustomerConversation } from '../inbox/index.js';
import { lockWarehouse, sellableAvailability } from '../inventory/index.js';

type RequestedLine = { variantId: string; quantity: number };
export type DraftOrder = {
    customerId: string; conversationId: string | null; warehouseId: string; lines: RequestedLine[];
    notes: string; paymentMethod: OrderPaymentMethod; shippingAddressId: string | null; promotionId?: string | null;
};
type PricedLine = {
    id: string; variantId: string; variantVersion: number; position: number; sku: string; name: string; quantity: number;
    unitPrice: Prisma.Decimal; discount: Prisma.Decimal; lineTotal: Prisma.Decimal;
};

export function orderMoney(amount: Prisma.Decimal, currency: string) {
    const exact = amount.toFixed();
    if (exact.length > 60) throw new UnprocessableEntityException();
    return { amount: exact, currency };
}

export function lineView(line: PricedLine, currency: string) {
    return {
        id: line.id, variantId: line.variantId, sku: line.sku, name: line.name, quantity: line.quantity,
        unitPrice: orderMoney(line.unitPrice, currency), discount: orderMoney(line.discount, currency), lineTotal: orderMoney(line.lineTotal, currency),
    };
}

export async function priceOrder(tx: Prisma.TransactionClient, shopId: string, draft: DraftOrder, lineIds: ReadonlyMap<string, string>) {
    if (draft.promotionId || draft.notes.includes(String.fromCharCode(0)) || !draft.lines.length) throw new UnprocessableEntityException();
    const ids = draft.lines.map(line => line.variantId);
    if (ids.some(id => !validUuid(id)) || new Set(ids).size !== ids.length) throw new UnprocessableEntityException();
    const customer = await customerInShop(tx, shopId, draft.customerId);
    const warehouse = await lockWarehouse(tx, shopId, draft.warehouseId);
    if (warehouse.status !== 'active') throw new ConflictException();
    if (draft.conversationId) await requireCustomerConversation(tx, shopId, draft.customerId, draft.conversationId);
    const address = draft.shippingAddressId ? await snapshotAddress(tx, shopId, draft.customerId, draft.shippingAddressId) : null;
    const { currency } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { currency: true } });
    const variants = new Map((await sellableVariants(tx, shopId, ids)).map(variant => [variant.id, variant]));
    const lines = draft.lines.map(({ variantId, quantity }, position): PricedLine => {
        const variant = variants.get(variantId);
        if (!variant || variant.priceCurrency !== currency || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000000) {
            throw new UnprocessableEntityException();
        }
        const unitPrice = new ExactDecimal(variant.priceAmount);
        return {
            id: lineIds.get(variantId) ?? randomUUID(), variantId, variantVersion: variant.version, position, sku: variant.sku,
            name: variant.name === variant.product.name ? variant.name : variant.product.name + ' · ' + variant.name,
            quantity, unitPrice, discount: new ExactDecimal(0), lineTotal: unitPrice.mul(quantity),
        };
    });
    const total = lines.reduce((sum, line) => sum.plus(line.lineTotal), new ExactDecimal(0));
    const { policyVersion, rate } = await estimatedShipping(tx, shopId, address?.data as AddressInput | null ?? null, currency);
    const publicLines = lines.map(line => lineView(line, currency));
    const terms = {
        customerId: draft.customerId, conversationId: draft.conversationId, warehouseId: draft.warehouseId, paymentMethod: draft.paymentMethod,
        rate, policyVersion, addressSnapshotId: address?.id ?? null,
        lines: publicLines.map((line, index) => ({ ...line, variantVersion: lines[index].variantVersion })),
        total: orderMoney(total, currency),
    };
    const termsHash = createHash('sha256').update(JSON.stringify(terms)).digest('hex');
    return { lines, publicLines, termsHash, customer, address, rate, currency, total };
}

export async function quoteWarnings(tx: Prisma.TransactionClient, shopId: string, warehouseId: string, lines: PricedLine[]) {
    const availability = await sellableAvailability(tx, shopId, warehouseId, lines.map(line => line.variantId));
    return lines.filter(line => (availability.get(line.variantId) ?? 0) < line.quantity)
        .map(line => 'Tồn khả dụng hiện tại chưa đủ cho SKU ' + line.sku + '.');
}

export function orderQuoteHash(orderId: string, orderVersion: number, termsHash: string) {
    return createHash('sha256').update(JSON.stringify([orderId, orderVersion, termsHash])).digest('hex');
}
