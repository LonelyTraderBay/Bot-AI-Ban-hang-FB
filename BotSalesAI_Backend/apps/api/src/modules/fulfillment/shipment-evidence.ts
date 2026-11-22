import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PrismaClient, ShipmentState } from '../../generated/prisma/client.js';
import { openapi } from '../../http/contract-source.js';
import { validUuid } from '../../http/query.js';
import { requireVersion } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { serializable } from '../../platform/database/transactions.js';
import { requireShopAccess } from '../workspace/index.js';

type Attestation = {
    shopId: string; shipmentId: string; orderId: string; reviewerId: string; expectedVersion: number;
    eventType: ShipmentState; externalEventId: string; occurredAt: string; documentSha256: string;
};

const eventTypes: readonly ShipmentState[] = openapi.components.schemas.ShipmentEventWrite.properties.eventType.enum;

export function recordManualShipmentEvidence(db: PrismaClient, input: Attestation, attestationHash: string) {
    const { shopId, shipmentId, orderId, reviewerId, expectedVersion, eventType, documentSha256 } = input;
    if (typeof input.externalEventId !== 'string' || typeof input.occurredAt !== 'string') throw new UnprocessableEntityException();
    const externalEventId = input.externalEventId.trim();
    const occurredAt = new Date(input.occurredAt);
    if (![shopId, shipmentId, orderId, reviewerId].every(value => typeof value === 'string' && validUuid(value)) ||
        ![documentSha256, attestationHash].every(value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)) ||
        !eventTypes.includes(eventType) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1 ||
        !externalEventId || [...externalEventId].length > 160 || externalEventId.includes(String.fromCharCode(0)) ||
        externalEventId.startsWith('handover:') || !Number.isFinite(occurredAt.valueOf()) ||
        occurredAt.toISOString() !== input.occurredAt || occurredAt > new Date()) throw new UnprocessableEntityException();
    if (!process.env.SHIPMENT_MANUAL_SHOPS?.split(',').some(entry => entry.trim().toLowerCase() === shopId.toLowerCase())) {
        throw new ForbiddenException();
    }

    return serializable(db, async tx => {
        await requireShopAccess(tx, reviewerId, shopId, 'fulfillment.write');
        const shipment = await tx.shipment.findUnique({ where: { shopId_id: { shopId, id: shipmentId } },
            select: { orderId: true, carrierId: true, handedOverAt: true, version: true } });
        if (!shipment) throw new NotFoundException();
        if (shipment.orderId !== orderId || shipment.carrierId !== null) throw new ConflictException();
        const key = { shopId, shipmentId, externalEventId };
        const prior = await tx.shipmentObservation.findUnique({
            where: { shopId_shipmentId_externalEventId: key }, select: { id: true, attestationHash: true },
        });
        if (prior) {
            if (prior.attestationHash !== attestationHash) throw new ConflictException();
            return prior.id;
        }
        requireVersion(shipment.version, expectedVersion);
        if (!shipment.handedOverAt) throw new ConflictException();
        if (occurredAt < shipment.handedOverAt) throw new UnprocessableEntityException();
        const { id } = await tx.shipmentObservation.create({
            data: { ...key, state: eventType, occurredAt, observedAt: new Date(), attestationHash }, select: { id: true },
        });
        await recordAudit(tx, {
            shopId, actorId: reviewerId, requestId: randomUUID(), action: 'recordManualShipmentEvidence',
            resourceType: 'shipment', resourceId: shipmentId,
            metadata: { evidenceId: id, eventType, expectedVersion, attestationHash, documentSha256 },
        });
        return id;
    }, true);
}
