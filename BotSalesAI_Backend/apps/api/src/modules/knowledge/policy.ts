import { UnprocessableEntityException } from '@nestjs/common';
import type { KnowledgeRevision, Prisma } from '../../generated/prisma/client.js';
import { DomainConflict } from '../../http/contracts.js';

export type PolicyInput = { policyKey?: string | null; validFrom?: string | null; validUntil?: string | null };
export type PolicyWindow = Pick<KnowledgeRevision, 'policyKey' | 'validFrom' | 'validUntil'>;

function asDate(value: string | null | undefined) {
    if (value == null) return null;
    const date = new Date(value + 'T00:00:00.000Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || date.getUTCFullYear() < 1) {
        throw new UnprocessableEntityException('Ngày hiệu lực không hợp lệ.');
    }
    return date;
}

export function policyView(row?: PolicyWindow | null): Required<PolicyInput> {
    return {
        policyKey: row?.policyKey ?? null,
        validFrom: row?.validFrom?.toISOString().slice(0, 10) ?? null,
        validUntil: row?.validUntil?.toISOString().slice(0, 10) ?? null,
    };
}

export function readPolicyWindow({ policyKey = null, validFrom, validUntil }: PolicyInput): PolicyWindow {
    const from = asDate(validFrom), until = asDate(validUntil);
    if ((policyKey && (!from || !until)) || (from && until && from > until)) {
        throw new UnprocessableEntityException('Chính sách cần khoảng ngày hiệu lực hợp lệ.');
    }
    return { policyKey, validFrom: from, validUntil: until };
}

export function shopCalendarDate(timeZone: string, now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const part = (type: string) => parts.find(value => value.type === type)?.value;
    return new Date(part('year') + '-' + part('month') + '-' + part('day') + 'T00:00:00.000Z');
}

export function activeWindow(day: Date): Prisma.KnowledgeRevisionWhereInput[] {
    return [
        { OR: [{ validFrom: null }, { validFrom: { lte: day } }] },
        { OR: [{ validUntil: null }, { validUntil: { gte: day } }] },
    ];
}

export async function requirePublishableWindow(tx: Prisma.TransactionClient, draft: KnowledgeRevision,
    prior: KnowledgeRevision | null, policyVersion: string, timezone: string) {
    const today = shopCalendarDate(timezone);
    if (draft.validUntil && draft.validUntil < today) {
        throw new DomainConflict('KNOWLEDGE_POLICY_EXPIRED', 'Bản này đã hết hiệu lực theo múi giờ cửa hàng.');
    }
    if (draft.validFrom && draft.validFrom > today && prior?.publishedPolicy === policyVersion &&
        (!prior.validFrom || prior.validFrom <= today) && (!prior.validUntil || prior.validUntil >= today)) {
        throw new DomainConflict('KNOWLEDGE_POLICY_FUTURE_REPLACEMENT',
            'Bản hiện tại còn hiệu lực. Dùng nguồn riêng với lịch không chồng lấn hoặc thay thế khi bản mới bắt đầu hiệu lực.');
    }
    if (!draft.policyKey || !draft.validFrom || !draft.validUntil) return;
    const conflict = await tx.knowledgeRevision.findFirst({
        where: {
            shopId: draft.shopId, documentId: { not: draft.documentId }, policyKey: draft.policyKey,
            status: 'published', publishedPolicy: policyVersion, publishedOf: { some: { shopId: draft.shopId } },
            validFrom: { lte: draft.validUntil }, validUntil: { gte: draft.validFrom },
        },
        select: { id: true },
    });
    if (conflict) {
        throw new DomainConflict('KNOWLEDGE_POLICY_OVERLAP', 'Đã có nguồn được duyệt trùng chủ đề và khoảng ngày hiệu lực.');
    }
}
