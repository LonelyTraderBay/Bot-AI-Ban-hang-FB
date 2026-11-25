import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { requireVersion } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { requireOpenShop } from '../../platform/database/shop-lifecycle.js';
import { serializable } from '../../platform/database/transactions.js';
import { requireShopAccess } from '../workspace/index.js';
import { accountingDate, financeShop, parseMoney, type Money } from './journal.js';

type EstimateAttestation = {
    shopId: string; reviewerId: string; date: string; expectedRevision: number; amount: Money; documentSha256: string;
};

export function recordAdvertisingEstimate(db: PrismaClient, input: EstimateAttestation, attestationHash: string) {
    const { shopId, reviewerId, date, expectedRevision, amount, documentSha256 } = input;
    if (![shopId, reviewerId].every(value => typeof value === 'string' && validUuid(value)) ||
        ![documentSha256, attestationHash].every(value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)) ||
        typeof date !== 'string' || date.startsWith('0000') || !Number.isInteger(expectedRevision) ||
        expectedRevision < 0 || expectedRevision >= 2147483647 || typeof amount?.amount !== 'string' || typeof amount.currency !== 'string') {
        throw new UnprocessableEntityException();
    }
    const accountingDay = accountingDate(date);
    if (!process.env.ADVERTISING_ESTIMATE_SHOPS?.split(',').some(entry => entry.trim().toLowerCase() === shopId.toLowerCase())) {
        throw new ForbiddenException();
    }
    return serializable(db, async tx => {
        const scope = await requireShopAccess(tx, reviewerId, shopId, 'finance.post');
        const prior = await tx.advertisingEstimate.findUnique({
            where: { shopId_attestationHash: { shopId, attestationHash } }, select: { id: true },
        });
        if (prior) return prior.id;
        await requireOpenShop(tx, shopId);
        const { currency } = await financeShop(tx, shopId);
        const value = parseMoney(amount, currency);
        const latest = await tx.advertisingEstimate.findFirst({ where: { shopId, accountingDate: accountingDay },
            orderBy: { revision: 'desc' }, select: { revision: true } });
        const revision = latest?.revision ?? 0;
        requireVersion(revision, expectedRevision);
        const estimate = await tx.advertisingEstimate.create({ data: {
            shopId, reviewerId, accountingDate: accountingDay, revision: revision + 1, amount: value, currency, attestationHash, documentSha256,
        } });
        await recordAudit(tx, {
            shopId, actorId: reviewerId, requestId: randomUUID(), action: 'recordAdvertisingEstimate',
            resourceType: 'advertising_estimate', resourceId: estimate.id,
            metadata: { date, revision: estimate.revision, attestationHash, documentSha256, permissionVersion: scope.permissionVersion },
        });
        return estimate.id;
    }, true);
}

export function latestAdvertisingEstimates(tx: Prisma.TransactionClient, shopId: string, currency: string, firstDay: string, lastDay: string, asOf: Date) {
    return tx.$queryRaw<{ day: string; total: Prisma.Decimal; recordedAt: Date }[]>`
        SELECT to_char(accounting_date, 'YYYY-MM-DD') AS day, amount AS total, recorded_at AS "recordedAt"
        FROM (
            SELECT DISTINCT ON (accounting_date) accounting_date, currency, amount, recorded_at
            FROM advertising_estimates
            WHERE shop_id=${shopId}::uuid AND accounting_date BETWEEN ${firstDay}::date AND ${lastDay}::date AND recorded_at <= ${asOf}
            ORDER BY accounting_date, revision DESC
        ) latest
        WHERE currency=${currency}
    `;
}
