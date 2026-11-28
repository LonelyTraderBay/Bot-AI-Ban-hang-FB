import { Prisma, type PrivacyRequest, type PrismaClient } from '../../generated/prisma/client.js';
import { recordAudit } from '../../platform/audit/index.js';
import { serializable } from '../../platform/database/transactions.js';
import { clearDraftLease } from '../../platform/database/draft-lease.js';
import type { JobHandler } from '../../platform/jobs/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { addressView, customerView } from '../customers/index.js';
import { storeGeneratedFile } from '../files/index.js';
import { canInShop, type AuthConfig } from '../workspace/index.js';
import { withdrawCustomerConsents, type WithdrawalEvidence } from './consent.js';
import { erasedIdentityKey } from './identity.js';
import { privacyFixtureEnabled, privacyKey } from './requests.js';

const maxExportRecords = 5000;
const redacted = 'Đã ẩn nội dung';
const day = 24 * 60 * 60 * 1000;

async function exportSubject(tx: Prisma.TransactionClient, request: PrivacyRequest) {
    const { shopId, customerId } = request;
    const customer = await tx.customer.findUniqueOrThrow({ where: privacyKey(shopId, customerId),
        include: { addresses: { take: maxExportRecords + 1 }, identities: { select: { channel: true, pageId: true, externalId: true, createdAt: true }, take: maxExportRecords + 1 },
            serviceCases: { take: maxExportRecords + 1 }, orders: { take: maxExportRecords + 1,
                select: { id: true, createdAt: true, orderState: true, fulfillmentState: true, total: true, currency: true } },
            consents: { include: { history: { take: maxExportRecords + 1 } } },
        },
    });
    const messages = await tx.channelMessage.findMany({
        where: { shopId, redactedAt: null, direction: { not: 'internal' }, conversation: { customerId } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: maxExportRecords + 1,
        select: { id: true, conversationId: true, createdAt: true, direction: true, text: true,
            attachments: { select: { file: { select: { id: true, name: true, mimeType: true, sizeBytes: true } } } } },
    });
    const { addresses, orders, identities, consents, serviceCases, ...profile } = customer;
    if ([addresses, orders, identities, messages, serviceCases, ...consents.map(record => record.history)].some(rows => rows.length > maxExportRecords)) return null;
    return Buffer.from(JSON.stringify({ exportedAt: new Date(), shopId, customer: customerView(profile), identities, orders, serviceCases,
        addresses: addresses.map(address => addressView(profile, address)), consents, messages }, null, 2));
}

export async function hasRetentionObligation(tx: Prisma.TransactionClient, shopId: string, customerId: string) {
    const key = { shopId, customerId };
    return Boolean(await tx.salesOrder.findFirst({ where: key, select: { id: true } }) ||
        await tx.serviceCase.findFirst({ where: key, select: { id: true } }) ||
        await tx.addressSnapshot.findFirst({ where: key, select: { id: true } }) ||
        await tx.conversationFeedback.findFirst({ where: { shopId, document: { isNot: null }, message: { conversation: { customerId } } }, select: { id: true } }));
}

async function redactMessages(tx: Prisma.TransactionClient, shopId: string, ids: string[], now: Date) {
    if (!ids.length) return;
    const updated = await tx.channelMessage.updateManyAndReturn({ where: { shopId, id: { in: ids }, redactedAt: null },
        data: { text: redacted, sourceEvidence: Prisma.DbNull, redactedAt: now, version: { increment: 1 } } });
    await tx.conversationFeedback.updateMany({
        where: { shopId, messageId: { in: ids }, document: { is: null } },
        data: { correction: redacted, reviewReason: null, redactedCorrection: null, version: { increment: 1 } },
    });
    await tx.fileObject.updateMany({ where: { shopId, purpose: 'conversation_media', channelAttachments: {
        some: { messageId: { in: ids } }, every: { message: { redactedAt: { not: null } } },
    } }, data: { status: 'rejected', expiresAt: now } });
    for (const message of updated) await enqueueResourceUpdate(tx, 'message.created', message);
}

export function erasedCustomer(now: Date) {
    return {
        displayName: 'Khách hàng đã ẩn', phone: null, email: null, notes: null, privacyErasedAt: now,
        redactedFields: ['displayName', 'phone', 'email', 'notes', 'addresses'],
    };
}

export async function eraseSubject(tx: Prisma.TransactionClient, shopId: string, customerId: string, now: Date, evidence: WithdrawalEvidence) {
    const key = { shopId, customerId };
    await tx.customer.update({ where: privacyKey(shopId, customerId), data: { ...erasedCustomer(now), version: { increment: 1 } } });
    await tx.conversationOrderDraft.updateMany({ where: { ...key, state: 'active' },
        data: { ...clearDraftLease, values: Prisma.DbNull, state: 'discarded', editEpoch: { increment: 1 }, version: { increment: 1 } } });
    await tx.customerAddress.updateMany({ where: key, data: { label: null, recipient: null, phone: null, line1: null, ward: null,
        district: null, province: null, postalCode: null, countryCode: null, status: 'archived', version: { increment: 1 } } });
    const identities = await tx.customerIdentity.findMany({ where: key });
    for (const row of identities) await tx.customerIdentity.update({ where: privacyKey(shopId, row.id),
        data: { externalId: erasedIdentityKey(shopId, row.channel, row.pageId, row.externalId) } });
    const conversations = await tx.channelConversation.findMany({ where: key, select: { id: true, externalId: true, channelId: true } });
    for (const conversation of conversations) {
        const externalId = erasedIdentityKey(shopId, 'conversation', conversation.channelId, conversation.externalId);
        const updated = await tx.channelConversation.update({ where: privacyKey(shopId, conversation.id),
            data: { externalId, mode: 'paused', status: 'resolved', unreadCount: 0, assignedUserId: null, generation: { increment: 1 }, version: { increment: 1 } } });
        await enqueueResourceUpdate(tx, 'conversation.updated', updated);
    }
    const conversation = { customerId };
    const messages = await tx.channelMessage.findMany({ where: { shopId, conversation, redactedAt: null }, select: { id: true } });
    await redactMessages(tx, shopId, messages.map(message => message.id), now);
    await tx.fileObject.updateMany({ where: { shopId, purpose: 'conversation_media', resourceId: { in: conversations.map(row => row.id) } },
        data: { status: 'rejected', expiresAt: now } });
    const orders = await tx.salesOrder.findMany({ where: key, select: { id: true } });
    await tx.fileObject.updateMany({ where: { shopId, purpose: 'payment_evidence_image', resourceId: { in: orders.map(row => row.id) } },
        data: { status: 'rejected', expiresAt: now } });
    const exports = await tx.privacyRequest.findMany({ where: { ...key, kind: 'export', jobId: { not: null } }, select: { jobId: true } });
    const jobIds = exports.flatMap(row => row.jobId ? [row.jobId] : []);
    await tx.fileObject.updateMany({ where: { shopId, purpose: 'privacy_export', resourceId: { in: jobIds } }, data: { status: 'rejected', expiresAt: now } });
    await tx.consentChallenge.updateMany({ where: key, data: { message: redacted } });
    await withdrawCustomerConsents(tx, shopId, customerId, evidence);
}

export function privacyRequestHandler(config?: AuthConfig): JobHandler {
    return async job => async tx => {
        const { shopId, actorId } = job;
        const { privacyRequestId, policyVersion } = job.input as { privacyRequestId: string; policyVersion: number };
        const where = privacyKey(shopId, privacyRequestId);
        const request = await tx.privacyRequest.findUniqueOrThrow({ where });
        if (request.jobId !== job.id || request.approvedBy !== actorId || request.policyVersion !== policyVersion ||
            request.status !== 'running') throw new Error('Privacy request does not match the pending job');
        const now = new Date();
        const policy = await tx.privacyPolicy.findUnique({ where: { shopId } });
        const eligible = privacyFixtureEnabled(config) && policy?.version === policyVersion && policy.approvedBy &&
            await canInShop(tx, policy.approvedBy, shopId, 'privacy.manage');
        const customer = await tx.customer.findUniqueOrThrow({ where: privacyKey(shopId, request.customerId), select: { privacyErasedAt: true } });
        let status: 'failed' | 'completed' | 'legal_hold' = 'failed';
        let fileId: string | undefined;
        if (eligible && !customer.privacyErasedAt && request.kind === 'export') {
            const bytes = await exportSubject(tx, request);
            if (bytes && bytes.length <= 5 * 1024 * 1024) {
                const file = await storeGeneratedFile(tx, { shopId, uploaderId: actorId, purpose: 'privacy_export', resourceId: job.id,
                    name: 'customer-privacy-export.json', mimeType: 'application/json', bytes, published: true });
                fileId = file.id;
                status = 'completed';
            }
        } else if (eligible && !customer.privacyErasedAt && request.kind === 'delete') {
            if (await hasRetentionObligation(tx, shopId, request.customerId)) status = 'legal_hold';
            else {
                await eraseSubject(tx, shopId, request.customerId, now, { privacyRequestId: request.id });
                status = 'completed';
            }
        }
        await tx.privacyRequest.update({ where, data: { status, version: { increment: 1 } } });
        await recordAudit(tx, { shopId, actorId, action: 'privacy.request.processed', resourceType: 'privacy_request', resourceId: request.id,
            requestId: job.id, metadata: { policyVersion, kind: request.kind, status, ...(fileId ? { fileId } : {}) } });
        const failed = status === 'failed';
        return { status: failed ? 'failed' : 'succeeded', completed: failed ? 0 : 1, total: 1, errorCount: failed ? 1 : 0,
            ...(failed ? { rowErrors: [{ row: 1, field: 'request', code: 'PRIVACY_SCOPE_CHANGED', message: 'Không thể xử lý trong phạm vi hoặc chính sách hiện hành.' }] }
                : { result: fileId ? { type: 'file', id: fileId } : { type: 'privacy_request', id: request.id } }) };
    };
}

export async function runPrivacyMaintenance(db: PrismaClient, config?: AuthConfig, now = new Date()) {
    await db.$queryRaw`SELECT public.purge_expired_private_blobs(100)`;
    if (!privacyFixtureEnabled(config)) return;
    const policies = await db.privacyPolicy.findMany({ where: { approvedBy: { not: null }, chatRetentionDays: { not: null } },
        orderBy: { shopId: 'asc' } });
    for (const policy of policies) await serializable(db, async tx => {
        const { shopId, approvedBy, chatRetentionDays } = policy;
        const current = await tx.privacyPolicy.findUnique({ where: { shopId }, select: { version: true } });
        if (!approvedBy || !chatRetentionDays || current?.version !== policy.version || !await canInShop(tx, approvedBy, shopId, 'privacy.manage')) return;
        const expired = await tx.channelMessage.findMany({ where: {
            shopId, createdAt: { lt: new Date(now.getTime() - chatRetentionDays * day) }, redactedAt: null,
            evidence: { is: null }, conversation: { orders: { none: {} } }, feedback: { none: { document: { isNot: null } } },
            AND: [{ OR: [{ dispatch: { is: null } }, { dispatch: { finishedAt: { not: null } } }] },
                { OR: [{ botTask: { is: null } }, { botTask: { finishedAt: { not: null } } }] }],
        }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true }, take: 100 });
        await redactMessages(tx, shopId, expired.map(row => row.id), now);
    }, false);
}
