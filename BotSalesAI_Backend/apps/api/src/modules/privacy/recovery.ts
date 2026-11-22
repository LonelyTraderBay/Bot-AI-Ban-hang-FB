import type { ConsentChannel, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { recordAudit } from '../../platform/audit/index.js';
import { serializable } from '../../platform/database/transactions.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { expireConsentChallenges } from './consent.js';
import { erasedCustomer, eraseSubject, hasRetentionObligation } from './data.js';
import { privacyKey } from './requests.js';

type Withdrawn = { id: string; customerId: string; channel: ConsentChannel; version: number; occurredAt: string };
type ErasedIdentity = { channel: string; pageId: string; externalId: string };
type Erased = { customerId: string; erasedAt: string; identities: ErasedIdentity[] };
type RecoveryBundle = { format: 1; shopId: string; shopCreatedAt: string; capturedAt: string; withdrawals: Withdrawn[]; erasures: Erased[] };

const withdrawalAction = 'privacy.recovery.withdraw';
const erasureAction = 'privacy.recovery.erase';
const maxVersion = 2147483647;
const uuid = { type: 'string', format: 'uuid' };
const datetime = { type: 'string', format: 'date-time' };
const objectSchema = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const identitySchema = objectSchema({
    channel: { type: 'string', minLength: 1, maxLength: 40 }, pageId: { type: 'string', minLength: 1, maxLength: 160 },
    externalId: { type: 'string', pattern: '^erased:[a-f0-9]{64}$' },
});
const bundleSchema = validator.compile<RecoveryBundle>(objectSchema({
    format: { const: 1 }, shopId: uuid, shopCreatedAt: datetime, capturedAt: datetime,
    withdrawals: { type: 'array', items: objectSchema({ id: uuid, customerId: uuid, channel: { enum: ['email', 'sms', 'messenger'] },
        version: { type: 'integer', minimum: 1, maximum: maxVersion }, occurredAt: datetime }) },
    erasures: { type: 'array', items: objectSchema({ customerId: uuid, erasedAt: datetime, identities: { type: 'array', items: identitySchema } }) },
}));

function checkedBundle(data: unknown): RecoveryBundle {
    if (!bundleSchema(data)) throw new Error('Invalid privacy recovery manifest');
    const unique = (keys: string[]) => new Set(keys).size === keys.length;
    const identities = data.erasures.flatMap(row => row.identities.map(identity => JSON.stringify(identity)));
    const erasedCustomers = new Set(data.erasures.map(row => row.customerId));
    if (!unique(data.withdrawals.map(row => row.id)) || !unique(data.withdrawals.map(row => row.customerId + ':' + row.channel)) ||
        erasedCustomers.size !== data.erasures.length || !unique(identities) || data.withdrawals.some(row => erasedCustomers.has(row.customerId))) {
        throw new Error('Duplicate or overlapping privacy recovery facts');
    }
    return data;
}

export async function capturePrivacyRecovery(db: PrismaClient, shopId: string) {
    return db.$transaction(async tx => {
        const shop = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { createdAt: true } });
        const latestWithdrawal = { action: 'withdrawn', OR: [
            { challengeId: { not: null }, challenge: { resultStatus: 'withdrawn', status: 'confirmed' } },
            { recoveryAudit: { action: withdrawalAction } },
        ] } satisfies Prisma.ConsentEvidenceWhereInput;
        const consents = await tx.customerConsent.findMany({ where: { shopId, customer: { privacyErasedAt: null }, history: { some: latestWithdrawal } },
            orderBy: [{ customerId: 'asc' }, { channel: 'asc' }],
            select: { customerId: true, channel: true, version: true,
                history: { where: latestWithdrawal, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], take: 1, select: { id: true, occurredAt: true } },
            } });
        const customers = await tx.customer.findMany({ where: { shopId, privacyErasedAt: { not: null } }, orderBy: { id: 'asc' },
            select: { id: true, privacyErasedAt: true, identities: { orderBy: [{ channel: 'asc' }, { pageId: 'asc' }, { externalId: 'asc' }],
                select: { channel: true, pageId: true, externalId: true } } } });
        return checkedBundle({ format: 1, shopId, shopCreatedAt: shop.createdAt.toISOString(), capturedAt: new Date().toISOString(),
            withdrawals: consents.map(({ history: [proof], ...row }) => ({ ...row, id: proof.id, occurredAt: proof.occurredAt.toISOString() })),
            erasures: customers.map(row => ({ customerId: row.id, erasedAt: row.privacyErasedAt?.toISOString(), identities: row.identities })),
        });
    }, { isolationLevel: 'RepeatableRead' });
}

async function applyErasure(tx: Prisma.TransactionClient, shopId: string, row: Erased, digest: string) {
    const { customerId } = row;
    const customer = await tx.customer.findUnique({ where: privacyKey(shopId, customerId), select: { privacyErasedAt: true } });
    if (customer && !customer.privacyErasedAt && await hasRetentionObligation(tx, shopId, customerId)) {
        throw new Error('A recovered customer has retained evidence. Leave the restore isolated for review.');
    }
    const now = new Date(row.erasedAt);
    const audit = () => recordAudit(tx, { shopId, actorId: null, requestId: digest, action: erasureAction,
        resourceType: 'customer', resourceId: customerId, metadata: { sourceErasedAt: row.erasedAt } });
    if (!customer) {
        await tx.customer.create({ data: { shopId, id: customerId, ...erasedCustomer(now) } });
    } else if (!customer.privacyErasedAt) {
        const { id } = await audit();
        await eraseSubject(tx, shopId, customerId, now, { recoveryAuditId: id });
    }
    let aliases = 0;
    for (const identity of row.identities) {
        const existing = await tx.customerIdentity.findUnique({ where: { shopId_channel_pageId_externalId: { shopId, ...identity } },
            select: { customerId: true } });
        if (existing && existing.customerId !== customerId) throw new Error('A recovered identity belongs to a different customer');
        if (!existing) {
            await tx.customerIdentity.create({ data: { shopId, customerId, ...identity } });
            aliases++;
        }
    }
    if (!customer || (customer.privacyErasedAt && aliases)) await audit();
    return { applied: Number(!customer?.privacyErasedAt), aliases };
}

async function applyWithdrawal(tx: Prisma.TransactionClient, shopId: string, policyVersion: string, row: Withdrawn, digest: string) {
    const { customerId, channel } = row;
    const prior = await tx.consentEvidence.findUnique({ where: privacyKey(shopId, row.id), include: { consent: true } });
    if (prior) {
        if (prior.action !== 'withdrawn' || prior.consent.customerId !== customerId || prior.consent.channel !== channel) {
            throw new Error('A recovery evidence ID belongs to a different consent decision');
        }
        return 'known';
    }
    const customer = await tx.customer.findUnique({ where: privacyKey(shopId, customerId), select: { privacyErasedAt: true } });
    if (!customer || customer.privacyErasedAt) return 'suppressed';
    const where = { shopId_customerId_channel: { shopId, customerId, channel } };
    const existing = await tx.customerConsent.findUnique({ where });
    if (existing?.version === maxVersion) throw new Error('Cannot advance the consent version on the restored copy');
    const version = Math.max(row.version, (existing?.version ?? 0) + 1);
    const audit = await recordAudit(tx, { shopId, actorId: null, requestId: digest, action: withdrawalAction,
        resourceType: 'customer', resourceId: customerId, metadata: { channel, sourceEvidenceId: row.id, sourceVersion: row.version } });
    const updated = await tx.customerConsent.upsert({ where,
        create: { shopId, customerId, channel, policyVersion, status: 'withdrawn', version },
        update: { status: 'withdrawn', version },
    });
    await tx.consentEvidence.create({ data: { shopId, id: row.id, consentId: updated.id, recoveryAuditId: audit.id,
        action: 'withdrawn', occurredAt: new Date(row.occurredAt) } });
    await expireConsentChallenges(tx, shopId, customerId, channel);
    await enqueueResourceUpdate(tx, 'customer_consent.updated', updated);
    return 'applied';
}

export async function applyPrivacyRecovery(db: PrismaClient, shopId: string, payload: unknown, digest: string) {
    const bundle = checkedBundle(payload);
    if (bundle.shopId !== shopId || !/^[a-f0-9]{64}$/.test(digest)) throw new Error('Privacy recovery manifest scope does not match');
    return serializable(db, async tx => {
        const shop = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { createdAt: true, policyVersion: true } });
        if (shop.createdAt.toISOString() !== bundle.shopCreatedAt) throw new Error('The shop does not share the manifest lineage');
        const result = { withdrawalsApplied: 0, knownWithdrawals: 0, suppressedWithdrawals: 0, erasuresApplied: 0, aliasesAdded: 0 };
        for (const row of bundle.withdrawals) {
            const change = await applyWithdrawal(tx, shopId, shop.policyVersion, row, digest);
            if (change === 'applied') result.withdrawalsApplied++;
            else if (change === 'known') result.knownWithdrawals++;
            else result.suppressedWithdrawals++;
        }
        for (const row of bundle.erasures) {
            const change = await applyErasure(tx, shopId, row, digest);
            result.erasuresApplied += change.applied;
            result.aliasesAdded += change.aliases;
        }
        return result;
    }, true, 30000);
}
