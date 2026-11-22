import { ConflictException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient, ProcurementEvidenceKind } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { requireVersion } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { serializable } from '../../platform/database/transactions.js';
import { requireShopAccess } from '../workspace/index.js';
import { procurementText } from './access.js';
import { manualSupplierAllowed, purchaseInShop, receiving } from './purchase-data.js';

export async function procurementEvidence(tx: Prisma.TransactionClient, shopId: string, purchaseOrderId: string, id: string,
    kind: ProcurementEvidenceKind) {
    if (!validUuid(id)) throw new UnprocessableEntityException();
    const observed = await tx.procurementEvidence.findFirst({
        where: { shopId, purchaseOrderId, id, kind, occurredAt: { lte: new Date() } },
    });
    if (!observed) throw new UnprocessableEntityException();
    return observed;
}

type Attestation = {
    shopId: string; purchaseOrderId: string; supplierId: string; reviewerId: string; intentHash: string;
    expectedVersion: number; kind: ProcurementEvidenceKind; externalRef: string; occurredAt: string; documentSha256: string;
};

export function recordManualEvidence(db: PrismaClient, input: Attestation, attestationHash: string) {
    const { shopId, purchaseOrderId, kind, reviewerId, expectedVersion, supplierId, intentHash, documentSha256 } = input;
    if (typeof input.externalRef !== 'string' || typeof input.occurredAt !== 'string') throw new UnprocessableEntityException();
    const externalRef = procurementText(input.externalRef, 1);
    const occurredAt = new Date(input.occurredAt);
    const isConfirmation = kind === 'supplier_confirmation';
    if (![shopId, purchaseOrderId, supplierId, reviewerId].every(value => typeof value === 'string' && validUuid(value)) ||
        ![intentHash, documentSha256, attestationHash].every(value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)) ||
        (!isConfirmation && kind !== 'goods_receipt') || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1 ||
        [...externalRef].length > 200 || !Number.isFinite(occurredAt.valueOf()) || occurredAt.toISOString() !== input.occurredAt ||
        occurredAt > new Date()) throw new UnprocessableEntityException();
    if (!manualSupplierAllowed(shopId, supplierId)) throw new ForbiddenException();
    return serializable(db, async tx => {
        await requireShopAccess(tx, reviewerId, shopId, isConfirmation ? 'procurement.write' : 'procurement.receive');
        const order = await purchaseInShop(tx, shopId, purchaseOrderId);
        if (order.supplierId !== supplierId || order.intentHash !== intentHash) throw new ConflictException();
        const dispatch = await tx.purchaseDispatch.findUnique({ where: { shopId_purchaseOrderId: { shopId, purchaseOrderId } } });
        if (!dispatch?.manualHandoff) throw new ConflictException();

        const key = { shopId, purchaseOrderId, kind, externalRef };
        const prior = await tx.procurementEvidence.findUnique({
            where: { shopId_purchaseOrderId_kind_externalRef: key },
            select: { id: true, attestationHash: true },
        });
        if (prior) {
            if (prior.attestationHash !== attestationHash) throw new ConflictException();
            return prior.id;
        }
        requireVersion(order.version, expectedVersion);
        if (isConfirmation) {
            if (order.status !== 'unknown') throw new ConflictException();
            if (occurredAt < order.updatedAt) throw new UnprocessableEntityException();
        } else {
            if (!order.confirmationId || !receiving.some(status => status === order.status)) throw new ConflictException();
            const confirmation = await procurementEvidence(tx, shopId, purchaseOrderId, order.confirmationId, 'supplier_confirmation');
            if (occurredAt < confirmation.occurredAt) throw new UnprocessableEntityException();
        }
        const { id } = await tx.procurementEvidence.create({
            data: { ...key, occurredAt, attestationHash, attestedVersion: expectedVersion }, select: { id: true },
        });
        await recordAudit(tx, {
            shopId, actorId: reviewerId, requestId: randomUUID(), action: 'recordManualProcurementEvidence',
            resourceType: 'purchase_order', resourceId: purchaseOrderId,
            metadata: { evidenceId: id, kind, expectedVersion, attestationHash, documentSha256 },
        });
        return id;
    }, true);
}
