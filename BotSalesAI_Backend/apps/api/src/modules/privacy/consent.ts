import { ConflictException, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { ConsentChallengeState, ConsentState, type ConsentChallenge, type ConsentChannel, type ConsentEvidence, type CustomerConsent, type Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { listQuery, paging, validUuid } from '../../http/query.js';
import { recordAudit } from '../../platform/audit/index.js';
import { requireOpenShop } from '../../platform/database/shop-lifecycle.js';
import { serializable } from '../../platform/database/transactions.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { readAsSession, requireIdempotencyKey, requirePublicBrowserCsrf, requireShopAccess, usesLocalOidcFixture, writeShopCommand, type AuthConfig } from '../workspace/index.js';

export const consentCommand = { operationId: 'createCustomerConsentChallenge', resourceType: 'consent_challenge' };
export type ConsentRequest = { purpose: 'marketing'; channel: ConsentChannel; message: string; contentVersion: number };
export type Confirmation = { challengeSessionId: string; decision: 'accept' | 'decline'; contentVersion: number };
const challengeMs = 24 * 60 * 60 * 1000;
const active = ['pending', 'exchanged'] satisfies ConsentChallengeState[];
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const scopedKey = (shopId: string, id: string) => ({ shopId_id: { shopId, id } });
const consentKey = (shopId: string, customerId: string, channel: ConsentChannel) => ({ shopId_customerId_channel: { shopId, customerId, channel } });
const purpose = 'marketing' as const;
const action = (row: ConsentChallenge) => row.withdraw ? 'withdraw' : 'confirm';
const withdrawalText = 'Bạn có muốn ngừng nhận nội dung tiếp thị qua kênh này? Tin nhắn phục vụ đơn hàng vẫn được xử lý riêng.';

function sign(config: AuthConfig, row: ConsentChallenge, kind: 'link' | 'session') {
    const key = createHmac('sha256', config.signingKey);
    return key.update(JSON.stringify(['consent/v1', kind, row.shopId, row.id, row.customerId, row.channel, row.withdraw, row.expiresAt.toISOString(),
        row.contentVersion, row.policyVersion, row.priorConsentVersion, hash(row.message), kind === 'session' ? row.exchangeHash : null])).digest('base64url');
}

function signedToken(config: AuthConfig, row: ConsentChallenge, kind: 'link' | 'session') {
    return [row.shopId, row.id, sign(config, row, kind)].join('.');
}

async function tokenChallenge(tx: Prisma.TransactionClient, config: AuthConfig, token: string, kind: 'link' | 'session') {
    const parts = token.split('.');
    const [shopId, id, signature] = parts;
    if (parts.length !== 3 || !validUuid(shopId) || !validUuid(id) || !/^[A-Za-z0-9_-]{43}$/.test(signature)) throw new NotFoundException();
    const row = await tx.consentChallenge.findUnique({ where: scopedKey(shopId, id), include: {
        customer: { select: { privacyErasedAt: true } },
    } });
    if (!row || !timingSafeEqual(Buffer.from(signature), Buffer.from(sign(config, row, kind))) || row.customer.privacyErasedAt) throw new NotFoundException();
    if (row.expiresAt <= new Date() || row.status === 'expired') throw new ConflictException('Liên kết xác nhận đã hết hiệu lực.');
    const shop = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { policyVersion: true } });
    if (row.policyVersion !== shop.policyVersion) throw new ConflictException('Nội dung xác nhận cần kiểm lại theo chính sách hiện hành.');
    return row;
}

function challengeView(row: ConsentChallenge) {
    const { id, shopId, customerId, channel, message, contentVersion, expiresAt, version, createdAt, updatedAt } = row;
    const status = (row.status === 'pending' || row.status === 'exchanged') && row.expiresAt <= new Date() ? 'expired' : row.status;
    return { id, shopId, customerId, channel, message, contentVersion, expiresAt, version, createdAt, updatedAt, status, purpose, action: action(row) };
}

function historyView(row: ConsentEvidence, channel: ConsentChannel) {
    const { id, occurredAt, contentVersion, challengeId, privacyRequestId, recoveryAuditId, action } = row;
    const systemReference = recoveryAuditId ?? privacyRequestId;
    return { id, occurredAt, contentVersion, channel, action, actorType: systemReference ? 'system' : action === 'requested' ? 'staff' : 'customer',
        evidenceType: systemReference ? 'verified_opt_out' : 'customer_challenge', evidenceReference: systemReference ?? challengeId };
}

function consentView(row: CustomerConsent & { history: ConsentEvidence[] }) {
    const { id, shopId, customerId, channel, status, version, createdAt, updatedAt } = row;
    return { id, shopId, customerId, channel, status, version, createdAt, updatedAt, purpose, history: row.history.map(entry => historyView(entry, channel)) };
}

function confirmationView(row: ConsentChallenge) {
    return { challengeId: row.id, purpose, channel: row.channel, status: row.status, consentStatus: row.resultStatus,
        consentVersion: row.resultVersion, consentRecordId: row.consentId };
}

export async function currentMarketingConsent(tx: Prisma.TransactionClient, shopId: string, customerId: string, channel: ConsentChannel, version: number) {
    const row = await tx.customerConsent.findUnique({ where: consentKey(shopId, customerId, channel),
        include: { customer: { select: { privacyErasedAt: true, shop: { select: { policyVersion: true } } } } } });
    return row?.status === 'granted' && row.version === version && !row.customer.privacyErasedAt && row.policyVersion === row.customer.shop.policyVersion;
}

export type WithdrawalEvidence = { privacyRequestId: string } | { recoveryAuditId: string };

export async function withdrawCustomerConsents(tx: Prisma.TransactionClient, shopId: string, customerId: string, evidence: WithdrawalEvidence) {
    const records = await tx.customerConsent.updateManyAndReturn({ where: { shopId, customerId, status: 'granted' },
        data: { status: 'withdrawn', version: { increment: 1 } } });
    for (const record of records) {
        await tx.consentEvidence.create({ data: { shopId, consentId: record.id, ...evidence, action: 'withdrawn' } });
        await enqueueResourceUpdate(tx, 'customer_consent.updated', record);
    }
    await expireConsentChallenges(tx, shopId, customerId);
}

export async function expireConsentChallenges(tx: Prisma.TransactionClient, shopId: string, customerId: string, channel?: ConsentChannel) {
    const voided = await tx.consentChallenge.updateManyAndReturn({ where: { shopId, customerId, channel, status: { in: active } },
        data: { status: 'expired', version: { increment: 1 } } });
    for (const row of voided) await enqueueResourceUpdate(tx, 'consent_challenge.updated', row);
}

export class ConsentService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'privacy.manage');
            const query = listQuery(raw, 'orders');
            if (query.status && !Object.hasOwn(ConsentState, query.status)) throw new UnprocessableEntityException();
            const page = paging(query, ['customer_consents', shopId, userId, String(scope.permissionVersion), query.customerId ?? '']);
            const needle = query.q?.trim();
            const result = page.result(await tx.customerConsent.findMany({
                where: { shopId, customerId: query.customerId, status: query.status as ConsentState | undefined, AND: [page.after ?? {},
                    ...(needle ? [validUuid(needle) ? { OR: [{ id: needle }, { customerId: needle }] } : { customer: { displayName: { contains: page.keyword, mode: 'insensitive' as const } } }] : [])] },
                orderBy: page.orderBy, take: page.limit + 1, include: { history: { orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] } },
            }));
            return { ...result, data: result.data.map(consentView) };
        });
    }

    challenges(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'privacy.manage');
            const query = listQuery(raw, 'orders');
            if (query.status && !Object.hasOwn(ConsentChallengeState, query.status)) throw new UnprocessableEntityException();
            const page = paging(query, ['consent_challenges', shopId, userId, String(scope.permissionVersion), query.customerId ?? '']);
            const needle = query.q?.trim();
            const now = new Date();
            const status: Prisma.ConsentChallengeWhereInput = query.status === 'expired' ? {
                OR: [{ status: 'expired' }, { status: { in: active }, expiresAt: { lte: now } }],
            } : { status: query.status as ConsentChallengeState | undefined,
                ...(query.status === 'pending' || query.status === 'exchanged' ? { expiresAt: { gt: now } } : {}) };
            const result = page.result(await tx.consentChallenge.findMany({
                where: { shopId, customerId: query.customerId, AND: [status, page.after ?? {},
                    ...(needle ? [validUuid(needle) ? { OR: [{ id: needle }, { customerId: needle }] } : { message: { contains: page.keyword, mode: 'insensitive' as const } }] : [])] },
                orderBy: page.orderBy, take: page.limit + 1,
            }));
            return { ...result, data: result.data.map(challengeView) };
        });
    }

    create(headers: IncomingHttpHeaders, shopId: string, customerId: string, input: ConsentRequest, requestId: string) {
        const { operationId, resourceType } = consentCommand;
        const message = input.message.trim();
        if (message.length < 20 || message.includes(String.fromCharCode(0)) || input.contentVersion > 2147483647) throw new UnprocessableEntityException();
        return writeShopCommand(this.db, this.config, { headers, shopId, permission: 'privacy.manage', operationId, payload: { customerId, ...input, message } },
            async (tx, scope) => {
                await requireShopAccess(tx, scope.userId, shopId, 'customers.read');
                if (!validUuid(customerId)) throw new NotFoundException();
                const customer = await tx.customer.findUnique({ where: scopedKey(shopId, customerId), include: { identities: { select: { channel: true } },
                    shop: { select: { policyVersion: true } } } });
                if (!customer || customer.privacyErasedAt) throw new NotFoundException();
                const { channel } = input;
                const contactReady = channel === 'sms' ? customer.phone && !customer.redactedFields.includes('phone')
                    : channel === 'email' ? customer.email && !customer.redactedFields.includes('email') : customer.identities.some(row => row.channel === 'messenger');
                if (!contactReady) throw new UnprocessableEntityException('Khách chưa có kênh liên hệ phù hợp.');
                const current = await tx.customerConsent.findUnique({ where: consentKey(shopId, customerId, channel) });
                const prior = await tx.consentChallenge.updateManyAndReturn({ where: { shopId, customerId, channel, status: { in: active } },
                    data: { status: 'expired', version: { increment: 1 } } });
                for (const row of prior) await enqueueResourceUpdate(tx, 'consent_challenge.updated', row);
                const expiresAt = new Date(Date.now() + challengeMs);
                const withdraw = current?.status === 'granted';
                const row = await tx.consentChallenge.create({ data: { shopId, customerId, channel, actorId: scope.userId, message: withdraw ? withdrawalText : message,
                    contentVersion: input.contentVersion, withdraw, priorConsentVersion: current?.version ?? 0,
                    policyVersion: customer.shop.policyVersion, expiresAt } });
                if (current) await tx.consentEvidence.create({ data: { shopId, consentId: current.id, challengeId: row.id,
                    action: 'requested', contentVersion: row.contentVersion } });
                await enqueueResourceUpdate(tx, 'consent_challenge.updated', row);
                await recordAudit(tx, { shopId, actorId: scope.userId, requestId, action: operationId, resourceType, resourceId: row.id,
                    metadata: { customerId, channel, contentVersion: row.contentVersion, withdraw: row.withdraw } });
                return { id: row.id, type: resourceType };
            }, async (tx, scope, result) => {
                const row = await tx.consentChallenge.findUniqueOrThrow({ where: scopedKey(shopId, result.id) });
                const view = challengeView(row);
                const config = this.config;
                const token = config && usesLocalOidcFixture(config) && scope.userId === row.actorId && view.status === 'pending'
                    ? signedToken(config, row, 'link') : null;
                return { ...view, ...(token ? { fixtureToken: token } : {}) };
            });
    }

    exchange(headers: IncomingHttpHeaders, token: string) {
        return this.publicCommand(headers, async (tx, config, key) => {
            const row = await tokenChallenge(tx, config, token, 'link');
            const exchangeHash = hash(key);
            let current = row;
            if (row.status === 'pending') {
                if (!row.withdraw) {
                    await requireShopAccess(tx, row.actorId, row.shopId, 'privacy.manage');
                    await requireOpenShop(tx, row.shopId);
                }
                current = { ...row, ...await tx.consentChallenge.update({ where: scopedKey(row.shopId, row.id),
                    data: { exchangeHash, status: 'exchanged', version: { increment: 1 } } }) };
                await enqueueResourceUpdate(tx, 'consent_challenge.updated', current);
            } else if (row.status !== 'exchanged' || row.exchangeHash !== exchangeHash) throw new ConflictException();
            return { challengeId: row.id, challengeSessionId: signedToken(config, current, 'session'), action: action(row), purpose,
                channel: row.channel, message: row.message, contentVersion: row.contentVersion, expiresAt: row.expiresAt };
        });
    }

    confirm(headers: IncomingHttpHeaders, input: Confirmation, requestId: string) {
        return this.publicCommand(headers, async (tx, config, key) => {
            const row = await tokenChallenge(tx, config, input.challengeSessionId, 'session');
            const confirmationHash = hash(JSON.stringify([key, input.decision, input.contentVersion]));
            if (row.confirmationHash === confirmationHash && (row.status === 'confirmed' || row.status === 'declined')) return confirmationView(row);
            if (row.status !== 'exchanged' || !row.exchangeHash || row.contentVersion !== input.contentVersion) throw new ConflictException();
            if (!row.withdraw) {
                await requireShopAccess(tx, row.actorId, row.shopId, 'privacy.manage');
                await requireOpenShop(tx, row.shopId);
            }
            const where = consentKey(row.shopId, row.customerId, row.channel);
            const current = await tx.customerConsent.findUnique({ where });
            if ((current?.version ?? 0) !== row.priorConsentVersion) throw new ConflictException('Bản ghi quyền tiếp thị đã thay đổi.');
            const accepted = input.decision === 'accept';
            const status = row.withdraw ? 'withdrawn' : 'granted';
            const consent = accepted ? await tx.customerConsent.upsert({ where,
                create: { shopId: row.shopId, customerId: row.customerId, channel: row.channel, status, policyVersion: row.policyVersion },
                update: { status, policyVersion: row.policyVersion, version: { increment: 1 } },
            }) : current;
            if (consent) {
                await tx.consentEvidence.create({ data: { shopId: row.shopId, consentId: consent.id, challengeId: row.id,
                    contentVersion: row.contentVersion, action: accepted ? status : 'declined' } });
                if (accepted) await enqueueResourceUpdate(tx, 'customer_consent.updated', consent);
            }
            const updated = await tx.consentChallenge.update({ where: scopedKey(row.shopId, row.id), data: {
                status: accepted ? 'confirmed' : 'declined', confirmationHash, consentId: consent?.id, resultVersion: consent?.version,
                resultStatus: consent?.status, version: { increment: 1 },
            } });
            await enqueueResourceUpdate(tx, 'consent_challenge.updated', updated);
            await recordAudit(tx, { shopId: row.shopId, actorId: null, requestId, action: 'confirmConsentChallenge',
                resourceType: 'consent_challenge', resourceId: row.id, metadata: { decision: input.decision, action: action(row), contentVersion: row.contentVersion } });
            return confirmationView(updated);
        });
    }

    private publicCommand<T>(headers: IncomingHttpHeaders,
        run: (tx: Prisma.TransactionClient, config: AuthConfig, idempotencyKey: string) => Promise<T>) {
        const config = this.config;
        if (!this.db || !config) throw new ServiceUnavailableException();
        return serializable(this.db, async tx => {
            await requirePublicBrowserCsrf(tx, config, headers);
            return run(tx, config, requireIdempotencyKey(headers));
        }, true);
    }
}
