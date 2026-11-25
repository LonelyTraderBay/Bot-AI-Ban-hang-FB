import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { KnowledgeRevision, KnowledgeSourceKind, Prisma } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { requireShopAccess } from '../workspace/index.js';
import { readKnowledgeTemplate, templateContent } from './templates.js';
import { activeWindow, policyView, readPolicyWindow, shopCalendarDate, type PolicyInput, type PolicyWindow } from './policy.js';

type Source = { title: string; sourceKind: KnowledgeSourceKind; fileId: string | null; content: string | null; template?: Prisma.JsonValue };
export type KnowledgeWrite = Source & PolicyInput;
export type KnowledgeDraft = Source & Partial<PolicyWindow>;
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
    const { title, sourceKind, fileId, content, contentHash, publishedAt, approvedBy, warnings, template } = revision;
    const status = currentStatus(revision);
    return { title, sourceKind, fileId, content, contentHash, publishedAt, approvedBy,
        status, revision: revision.revision, publishedRevisionId: document.publishedRevisionId, draftRevisionId: document.draftRevisionId,
        ...(template ? { template } : {}), ...policyView(revision),
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
    const window = readPolicyWindow(input);
    const template = readKnowledgeTemplate(input.template);
    if (template) {
        if (input.sourceKind !== 'manual' || input.fileId !== null) throw new UnprocessableEntityException();
        if (template.kind === 'product_content') await requireShopAccess(tx, actorId, shopId, 'catalog.read');
        return { title, content: await templateContent(tx, shopId, template), sourceKind: input.sourceKind, fileId: null, template, ...window };
    }
    const content = input.content === null ? null : knowledgeText(input.content, 0) || null;
    if (input.sourceKind === 'file') {
        if (!input.fileId || !validUuid(input.fileId) || !await tx.fileObject.findFirst({
            where: { shopId, id: input.fileId, ...(existingFile === input.fileId ? {} : { uploaderId: actorId }),
                purpose: 'knowledge_source', status: 'ready' }, select: { id: true },
        })) throw new UnprocessableEntityException('Tệp tri thức chưa sẵn sàng trong phạm vi này.');
    } else if (input.fileId !== null || !content) {
        throw new UnprocessableEntityException();
    }
    return { title, content, sourceKind: input.sourceKind, fileId: input.fileId, ...window };
}

export async function initializeDocument(tx: Prisma.TransactionClient, shopId: string, data: KnowledgeDraft, feedbackId?: string) {
    const document = await tx.knowledgeDocument.create({ data: { shopId, feedbackId } });
    const draft = await tx.knowledgeRevision.create({ data: { shopId, documentId: document.id, revision: 1, ...data, template: data.template ?? undefined } });
    await tx.knowledgeDocument.update({ where: knowledgeKey(shopId, document.id), data: { draftRevisionId: draft.id } });
    return document;
}

export async function publishedKnowledge(tx: Prisma.TransactionClient, shopId: string, query: string, now = new Date()) {
    const value = query.trim().slice(0, 120);
    if (!value) return [];
    const term = { contains: value.replace(/[\\%_]/g, '\\$&'), mode: 'insensitive' as const };
    return activeKnowledge(tx, shopId, { OR: [{ title: term }, { indexedText: term }] }, 10, now);
}

export function assignedKnowledge(tx: Prisma.TransactionClient, shopId: string, ids: string[], now = new Date()) {
    return activeKnowledge(tx, shopId, { id: { in: ids } }, ids.length, now);
}

export async function assignedSalesScripts(tx: Prisma.TransactionClient, shopId: string, activeRevisionIds: string[]) {
    if (!activeRevisionIds.length) return [];
    const { policyVersion, timezone } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { policyVersion: true, timezone: true } });
    const sources = await tx.knowledgeRevision.findMany({
        where: { shopId, id: { in: activeRevisionIds }, status: 'published', publishedPolicy: policyVersion,
            publishedOf: { some: { shopId } }, AND: activeWindow(shopCalendarDate(timezone)) },
        select: { id: true, template: true },
    });
    return sources.flatMap(source => {
        const script = readKnowledgeTemplate(source.template);
        return script?.kind === 'sales_script' ? [{ id: source.id, script }] : [];
    });
}

export async function approvedPreparationImages(tx: Prisma.TransactionClient, shopId: string, productIds: string[]) {
    const products = [...new Set(productIds)];
    const { policyVersion, timezone } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { policyVersion: true, timezone: true } });
    const sources = await tx.knowledgeRevision.findMany({
        where: { shopId, status: 'published', publishedPolicy: policyVersion, publishedOf: { some: { shopId } },
            AND: activeWindow(shopCalendarDate(timezone)),
            OR: products.map(productId => ({ template: { path: ['productId'], equals: productId } })) },
        select: { id: true, template: true },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    });
    const selected = new Map<string, { fileId: string; knowledgeRevisionId: string }>();
    const conflicts = new Set<string>();
    for (const source of sources) {
        const template = readKnowledgeTemplate(source.template);
        if (template?.kind !== 'product_content' || !template.imageFileId) continue;
        const previous = selected.get(template.productId);
        if (!previous) selected.set(template.productId, { fileId: template.imageFileId, knowledgeRevisionId: source.id });
        else if (previous.fileId !== template.imageFileId) conflicts.add(template.productId);
    }
    for (const productId of conflicts) selected.delete(productId);
    if (selected.size === 0) return selected;
    const files = await tx.fileObject.findMany({ where: { shopId, purpose: 'product_image', status: 'ready',
        id: { in: [...selected.values()].map(image => image.fileId) } }, select: { id: true } });
    const ready = new Set(files.map(file => file.id));
    for (const [productId, image] of selected) if (!ready.has(image.fileId)) selected.delete(productId);
    return selected;
}

async function activeKnowledge(tx: Prisma.TransactionClient, shopId: string, selection: Prisma.KnowledgeRevisionWhereInput, limit: number, now: Date) {
    if (!limit) return [];
    const { policyVersion, timezone } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { policyVersion: true, timezone: true } });
    const found = await tx.knowledgeRevision.findMany({
        where: { shopId, status: 'published', publishedPolicy: policyVersion, publishedOf: { some: { shopId } },
            AND: [selection, ...activeWindow(shopCalendarDate(timezone, now)), { OR: [{ fileId: null }, { file: { status: 'ready' } }] }] },
        select: { id: true, documentId: true, revision: true, title: true, indexedText: true, contentHash: true, template: true },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }], take: limit,
    });
    const withSources = found.map(row => ({ row, template: readKnowledgeTemplate(row.template) }));
    const productIds = withSources.flatMap(({ template }) => template?.kind === 'product_content' ? [template.productId] : []);
    const active = new Set(productIds.length ? (await tx.product.findMany({
        where: { shopId, id: { in: productIds }, status: 'active' }, select: { id: true },
    })).map(row => row.id) : []);
    return withSources.filter(({ template }) => template?.kind !== 'product_content' || active.has(template.productId))
        .map(({ row: { template, ...row } }) => {
            void template;
            return row;
        });
}
