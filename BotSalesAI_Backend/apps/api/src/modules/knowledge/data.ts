import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { KnowledgeRevision, KnowledgeSourceKind, Prisma } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';

export type KnowledgeWrite = { title: string; sourceKind: KnowledgeSourceKind; fileId: string | null; content: string | null };
export const knowledgeKey = (shopId: string, id: string) => ({ shopId_id: { shopId, id } });
const indexJob = { select: { status: true } } satisfies Prisma.KnowledgeRevision$indexJobArgs;
const revisionDetails = { indexJob } satisfies Prisma.KnowledgeRevisionInclude;
export const documentDetails = {
    draft: { include: revisionDetails }, published: true,
    revisions: { take: 1, orderBy: { revision: 'desc' } },
} satisfies Prisma.KnowledgeDocumentInclude;
export type Document = Prisma.KnowledgeDocumentGetPayload<{ include: typeof documentDetails }>;
type Revision = KnowledgeRevision & { indexJob?: { status: string } | null };

export function knowledgeText(value: string, minLength = 1) {
    const trimmed = value.trim();
    if (trimmed.length < minLength || trimmed.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
    return trimmed;
}

export function currentStatus(revision: Revision) {
    return revision.status === 'processing' && ['cancelled', 'failed'].includes(revision.indexJob?.status ?? '') ? 'failed' : revision.status;
}

function revisionFields(revision: Revision, document: Pick<Document, 'publishedRevisionId' | 'draftRevisionId'>) {
    const { title, sourceKind, fileId, content, contentHash, publishedAt, approvedBy, warnings } = revision;
    const status = currentStatus(revision);
    return { title, sourceKind, fileId, content, contentHash, publishedAt, approvedBy,
        status, revision: revision.revision, publishedRevisionId: document.publishedRevisionId, draftRevisionId: document.draftRevisionId,
        warnings: status === 'failed' && !warnings.length ? ['Lần kiểm nguồn đã kết thúc. Có thể gửi kiểm lại.'] : warnings };
}

export function documentView(document: Document) {
    const revision = document.draft ?? document.published ?? document.revisions[0];
    if (!revision) throw new ConflictException();
    return { id: document.id, shopId: document.shopId, version: document.version, createdAt: document.createdAt, updatedAt: document.updatedAt,
        ...revisionFields(revision, document) };
}

export function revisionView(revision: Revision, document: Document) {
    return { id: revision.id, documentId: document.id, shopId: revision.shopId, version: revision.version,
        createdAt: revision.createdAt, updatedAt: revision.updatedAt, ...revisionFields(revision, document) };
}

export async function documentInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const document = await tx.knowledgeDocument.findUnique({ where: knowledgeKey(shopId, id), include: documentDetails });
    if (!document) throw new NotFoundException();
    return document;
}

export async function revisionInDocument(tx: Prisma.TransactionClient, shopId: string, documentId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const record = await tx.knowledgeRevision.findUnique({ where: { shopId_documentId_id: { shopId, documentId, id } }, include: revisionDetails });
    if (!record) throw new NotFoundException();
    return record;
}

export async function sourceInShop(tx: Prisma.TransactionClient, shopId: string, actorId: string, input: KnowledgeWrite, existingFile?: string | null) {
    const title = knowledgeText(input.title);
    const content = input.content === null ? null : knowledgeText(input.content, 0) || null;
    if (input.sourceKind === 'file') {
        if (!input.fileId || !validUuid(input.fileId) || !await tx.fileObject.findFirst({
            where: { shopId, id: input.fileId, ...(existingFile === input.fileId ? {} : { uploaderId: actorId }),
                purpose: 'knowledge_source', status: 'ready' }, select: { id: true },
        })) throw new UnprocessableEntityException('Tệp tri thức chưa sẵn sàng trong phạm vi này.');
    } else if (input.fileId !== null || !content) {
        throw new UnprocessableEntityException();
    }
    return { title, content, sourceKind: input.sourceKind, fileId: input.fileId };
}

export async function initializeDocument(tx: Prisma.TransactionClient, shopId: string, data: KnowledgeWrite, feedbackId?: string) {
    const document = await tx.knowledgeDocument.create({ data: { shopId, feedbackId } });
    const draft = await tx.knowledgeRevision.create({ data: { shopId, documentId: document.id, revision: 1, ...data } });
    await tx.knowledgeDocument.update({ where: knowledgeKey(shopId, document.id), data: { draftRevisionId: draft.id } });
    return document;
}

export async function publishedKnowledge(tx: Prisma.TransactionClient, shopId: string, query: string) {
    const value = query.trim().slice(0, 120);
    if (!value) return [];
    const term = { contains: value.replace(/[\\%_]/g, '\\$&'), mode: 'insensitive' as const };
    return activeKnowledge(tx, shopId, { OR: [{ title: term }, { indexedText: term }] }, 10);
}

export function assignedKnowledge(tx: Prisma.TransactionClient, shopId: string, ids: string[]) {
    return activeKnowledge(tx, shopId, { id: { in: ids } }, ids.length);
}

async function activeKnowledge(tx: Prisma.TransactionClient, shopId: string, selection: Prisma.KnowledgeRevisionWhereInput, limit: number) {
    if (!limit) return [];
    const { policyVersion } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { policyVersion: true } });
    return tx.knowledgeRevision.findMany({
        where: { shopId, status: 'published', publishedPolicy: policyVersion, publishedOf: { some: { shopId } },
            AND: [selection, { OR: [{ fileId: null }, { file: { status: 'ready' } }] }] },
        select: { id: true, documentId: true, revision: true, title: true, indexedText: true, contentHash: true },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }], take: limit,
    });
}
