import { ConflictException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { requireVersion } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { requireOpenShop } from '../../platform/database/shop-lifecycle.js';
import { serializable } from '../../platform/database/transactions.js';
import { requireShopAccess } from '../workspace/index.js';
import { accountingDate, financeShop, localAccountingDate } from './journal.js';

type Attestation = {
    shopId: string; reviewerId: string; date: string; expectedRevision: number;
    orderId?: string; entryId?: string; confidence: 'known' | 'estimated';
    channel: string; campaignId: string; sourceId: string; documentSha256: string;
};

export function recordMarketingEvidence(db: PrismaClient, input: Attestation, attestationHash: string) {
    const { shopId, reviewerId, date, expectedRevision, orderId, entryId, confidence, channel, campaignId, sourceId, documentSha256 } = input;
    const target = typeof orderId === 'string' && entryId === undefined ? { orderId }
        : typeof entryId === 'string' && orderId === undefined ? { entryId } : null;
    const matches = (value: unknown, pattern: RegExp) => typeof value === 'string' && pattern.test(value);
    if (!target || ![shopId, reviewerId, target.orderId ?? target.entryId].every(value => typeof value === 'string' && validUuid(value)) ||
        ![documentSha256, attestationHash].every(value => matches(value, /^[a-f0-9]{64}$/)) ||
        !matches(channel, /^[a-z0-9][a-z0-9._-]{0,49}$/) || !matches(campaignId, /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/) ||
        !matches(sourceId, /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,159}$/) ||
        (confidence !== 'known' && (confidence !== 'estimated' || !orderId)) ||
        typeof date !== 'string' || date.startsWith('0000') || !Number.isInteger(expectedRevision) ||
        expectedRevision < 0 || expectedRevision >= 2147483647) throw new UnprocessableEntityException();
    const accountingDay = accountingDate(date);
    if (!process.env.MARKETING_EVIDENCE_SHOPS?.split(',').some(entry => entry.trim().toLowerCase() === shopId.toLowerCase())) {
        throw new ForbiddenException();
    }
    return serializable(db, async tx => {
        const scope = await requireShopAccess(tx, reviewerId, shopId, 'shop.manage');
        if (!scope.permissions.includes(orderId ? 'orders.read' : 'finance.post')) throw new ForbiddenException();
        const prior = await tx.marketingEvidence.findUnique({ where: { shopId_attestationHash: { shopId, attestationHash } }, select: { id: true } });
        if (prior) return prior.id;
        await requireOpenShop(tx, shopId);
        const { currency, timezone } = await financeShop(tx, shopId);
        if (orderId) {
            const order = await tx.salesOrder.findFirst({ where: { shopId, id: orderId, currency, orderState: { in: ['confirmed', 'completed'] } },
                select: { reservation: { select: { createdAt: true } } } });
            if (!order?.reservation || localAccountingDate(order.reservation.createdAt, timezone) !== date) throw new UnprocessableEntityException();
        } else {
            const entry = await tx.financeEntry.findFirst({ where: { shopId, id: entryId, currency, classification: 'advertising_expense',
                status: { in: ['posted', 'reversed'] }, reversalOf: null, sourceId: { not: null } },
            select: { journal: { select: { effectiveDate: true } } } });
            if (entry?.journal?.effectiveDate.getTime() !== accountingDay.getTime()) throw new UnprocessableEntityException();
        }
        const latest = await tx.marketingEvidence.findFirst({ where: { shopId, ...target }, select: { revision: true }, orderBy: { revision: 'desc' } });
        const revision = latest?.revision ?? 0;
        requireVersion(revision, expectedRevision);
        if (await tx.marketingEvidence.findUnique({ where: { shopId_sourceId: { shopId, sourceId } }, select: { id: true } })) throw new ConflictException();
        const row = await tx.marketingEvidence.create({ data: { shopId, ...target, confidence, channel, campaignId, sourceId, reviewerId,
            revision: revision + 1, accountingDate: accountingDay, attestationHash, documentSha256 } });
        await recordAudit(tx, {
            shopId, actorId: reviewerId, requestId: randomUUID(), action: 'recordMarketingEvidence', resourceType: 'marketing_evidence',
            resourceId: row.id, metadata: { ...target, date, confidence, sourceId, revision: row.revision, documentSha256, attestationHash,
                permissionVersion: scope.permissionVersion },
        });
        return row.id;
    }, true);
}
