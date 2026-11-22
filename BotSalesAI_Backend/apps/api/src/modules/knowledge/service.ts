import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { KnowledgeStatus, type Command, type Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { listQuery, paging, validUuid } from '../../http/query.js';
import { requireIfMatch, requireVersion } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { commandDto, type ResourceRef } from '../../platform/commands/index.js';
import { scheduleJob, type JobHandler } from '../../platform/jobs/index.js';
import { jobDetails, jobDto } from '../../platform/jobs/view.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { extractKnowledgeText, fileContents, readReadyFileBytes } from '../files/index.js';
import { readAsSession, requireShopAccess, usesLocalOidcFixture, writeShopCommand, type AuthConfig, type ShopScope } from '../workspace/index.js';
import { currentStatus, documentDetails, documentInShop, documentView, initializeDocument, knowledgeKey, knowledgeText,
    revisionInDocument, revisionView, sourceInShop, type Document, type KnowledgeWrite } from './data.js';
import { readKnowledgeTemplate, requireTemplateReady } from './templates.js';

export type VersionReason = { expectedVersion: number; reason: string };
export type Publish = VersionReason & { revisionId: string; evaluationRunId: string };
const indexOperation = 'submitKnowledgeReview';
const operations = {
    createKnowledge: ['knowledge.write', 'knowledge'],
    updateKnowledge: ['knowledge.write', 'knowledge'],
    createKnowledgeRevision: ['knowledge.write', 'knowledge_revision'],
    restoreKnowledgeRevision: ['knowledge.write', 'knowledge_revision'],
    submitKnowledgeReview: ['knowledge.write', 'job'],
    publishKnowledge: ['knowledge.publish', 'knowledge'],
    retireKnowledge: ['knowledge.publish', 'knowledge'],
} as const;
export const knowledgeCommands = Object.entries(operations).map(([operationId, [, resourceType]]) => ({ operationId, resourceType }));
const readPermission = 'knowledge.read';

function listChecks(raw: Record<string, unknown>) {
    const query = listQuery(raw);
    if (query.status && !Object.hasOwn(KnowledgeStatus, query.status)) throw new UnprocessableEntityException();
    return query;
}

async function appendRevision(tx: Prisma.TransactionClient, document: Document, data: KnowledgeWrite, replace = false) {
    if (document.draft) {
        if (!replace || currentStatus(document.draft) === 'processing') throw new ConflictException();
        await tx.knowledgeRevision.update({ where: knowledgeKey(document.shopId, document.draft.id),
            data: { status: 'retired', version: { increment: 1 } } });
    }
    const revision = await tx.knowledgeRevision.create({ data: {
        shopId: document.shopId, documentId: document.id, revision: document.latestRevision + 1, ...data, template: data.template ?? undefined,
    } });
    await tx.knowledgeDocument.update({ where: knowledgeKey(document.shopId, document.id), data: {
        draftRevisionId: revision.id, status: 'draft', latestRevision: revision.revision, version: { increment: 1 },
    } });
    return revision;
}

export class KnowledgeService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (tx, scope) => {
            const query = listChecks(raw);
            const page = paging(query, ['knowledge', shopId, scope.userId, String(scope.permissionVersion)]);
            const status: Prisma.KnowledgeDocumentWhereInput = query.status === 'failed' ? {
                OR: [{ status: 'failed' }, { draft: { status: 'processing', indexJob: { status: { in: ['cancelled', 'failed'] } } } }],
            } : query.status === 'processing' ? {
                status: 'processing', draft: { indexJob: { status: { notIn: ['cancelled', 'failed'] } } },
            } : { status: query.status as KnowledgeStatus | undefined };
            const result = page.result(await tx.knowledgeDocument.findMany({
                where: { shopId, AND: [status, page.keyword ? { revisions: { some: { title: { contains: page.keyword, mode: 'insensitive' } } } } : {},
                    page.after ?? {}] }, orderBy: page.orderBy, take: page.limit + 1, include: documentDetails,
            }));
            return { ...result, data: result.data.map(documentView) };
        });
    }

    get(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, async tx => documentView(await documentInShop(tx, shopId, id)));
    }

    revisions(headers: IncomingHttpHeaders, shopId: string, id: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (tx, scope) => {
            const document = await documentInShop(tx, shopId, id);
            const query = listChecks(raw);
            const page = paging(query, ['knowledge_revisions', shopId, id, scope.userId, String(scope.permissionVersion)]);
            const result = page.result(await tx.knowledgeRevision.findMany({
                where: { shopId, documentId: id, status: query.status as KnowledgeStatus | undefined,
                    AND: [page.keyword ? { title: { contains: page.keyword, mode: 'insensitive' } } : {}, page.after ?? {}] },
                orderBy: page.orderBy, take: page.limit + 1, include: { indexJob: { select: { status: true } } },
            }));
            return { ...result, data: result.data.map(revision => revisionView(revision, document)) };
        });
    }

    revision(headers: IncomingHttpHeaders, shopId: string, id: string, revisionId: string) {
        return this.read(headers, shopId, async tx => revisionView(await revisionInDocument(tx, shopId, id, revisionId), await documentInShop(tx, shopId, id)));
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: KnowledgeWrite, requestId: string) {
        return this.change({ headers, shopId, operationId: 'createKnowledge', payload: input, requestId }, async (tx, scope) => {
            if (input.sourceKind === 'feedback') throw new UnprocessableEntityException();
            const data = await sourceInShop(tx, shopId, scope.userId, input);
            const document = await initializeDocument(tx, shopId, data);
            return { id: document.id };
        }, async (tx, result) => documentView(await documentInShop(tx, shopId, result.id)));
    }

    update(headers: IncomingHttpHeaders, shopId: string, id: string, patch: Partial<KnowledgeWrite>, requestId: string) {
        const version = requireIfMatch(headers);
        return this.change({ headers, shopId, operationId: 'updateKnowledge', payload: { id, patch, version }, requestId }, async (tx, scope) => {
            const document = await documentInShop(tx, shopId, id);
            requireVersion(document.version, version);
            const draft = document.draft;
            if (!draft || currentStatus(draft) === 'processing') throw new ConflictException();
            if (patch.template && readKnowledgeTemplate(draft.template)?.kind !== readKnowledgeTemplate(patch.template)?.kind) throw new UnprocessableEntityException();
            const data = await sourceInShop(tx, shopId, scope.userId, {
                title: patch.title ?? draft.title, content: patch.content === undefined ? draft.content : patch.content,
                sourceKind: patch.sourceKind ?? draft.sourceKind, fileId: patch.fileId === undefined ? draft.fileId : patch.fileId,
                template: patch.template ?? draft.template,
            }, draft.fileId);
            if (data.sourceKind === 'feedback' && !document.feedbackId) throw new UnprocessableEntityException();
            await tx.knowledgeRevision.update({ where: knowledgeKey(shopId, draft.id), data: {
                ...data, status: 'draft', indexedText: null, contentHash: null, indexJobId: null, warnings: [], version: { increment: 1 },
            } });
            const updated = await tx.knowledgeDocument.update({ where: knowledgeKey(shopId, id), data: { status: 'draft', version: { increment: 1 } } });
            return { id, metadata: { version: updated.version, revisionId: draft.id } };
        }, async (tx, result) => documentView(await documentInShop(tx, shopId, result.id)));
    }

    addRevision(headers: IncomingHttpHeaders, shopId: string, id: string, input: KnowledgeWrite, requestId: string) {
        return this.change({ headers, shopId, operationId: 'createKnowledgeRevision', payload: { id, input }, requestId }, async (tx, scope) => {
            const document = await documentInShop(tx, shopId, id);
            if (input.sourceKind === 'feedback' && !document.feedbackId) throw new UnprocessableEntityException();
            const previous = document.draft ?? document.published ?? document.revisions[0];
            if (input.template && readKnowledgeTemplate(previous?.template)?.kind !== readKnowledgeTemplate(input.template)?.kind) throw new UnprocessableEntityException();
            const data = await sourceInShop(tx, shopId, scope.userId, { ...input, template: input.template ?? previous?.template }, document.published?.fileId);
            const revision = await appendRevision(tx, document, data);
            return { id: revision.id, metadata: { documentId: id, revision: revision.revision } };
        }, async (tx, result) => revisionView(await revisionInDocument(tx, shopId, id, result.id), await documentInShop(tx, shopId, id)));
    }

    restore(headers: IncomingHttpHeaders, shopId: string, id: string, revisionId: string, input: VersionReason, requestId: string) {
        const reason = knowledgeText(input.reason, 5);
        return this.change({ headers, shopId, operationId: 'restoreKnowledgeRevision', payload: { id, revisionId, input }, requestId, reason }, async (tx, scope) => {
            const document = await documentInShop(tx, shopId, id);
            requireVersion(document.version, input.expectedVersion);
            const source = await revisionInDocument(tx, shopId, id, revisionId);
            const data = await sourceInShop(tx, shopId, scope.userId, source, source.fileId);
            const revision = await appendRevision(tx, document, data, true);
            return { id: revision.id, metadata: { documentId: id, revision: revision.revision, restoredFrom: revisionId } };
        }, async (tx, result) => revisionView(await revisionInDocument(tx, shopId, id, result.id), await documentInShop(tx, shopId, id)));
    }

    submit(headers: IncomingHttpHeaders, shopId: string, id: string, input: VersionReason, requestId: string) {
        const reason = knowledgeText(input.reason, 5);
        return this.change({ headers, shopId, operationId: indexOperation, payload: { id, input }, requestId, reason, deferred: true },
            async (tx, scope, commandId) => {
                const document = await documentInShop(tx, shopId, id);
                requireVersion(document.version, input.expectedVersion);
                const draft = document.draft;
                if (!draft || !['draft', 'failed', 'rejected'].includes(currentStatus(draft))) throw new ConflictException();
                await requireTemplateReady(tx, shopId, draft.template);
                const job = await scheduleJob(tx, { shopId, actorId: scope.userId, sourceOperation: indexOperation, kind: 'knowledge_index', commandId,
                    input: { documentId: id, revisionId: draft.id, version: draft.version + 1 } });
                await tx.knowledgeRevision.update({ where: knowledgeKey(shopId, draft.id), data: {
                    status: 'processing', indexJobId: job.id, warnings: [], indexedText: null, contentHash: null, version: { increment: 1 },
                } });
                await tx.knowledgeDocument.update({ where: knowledgeKey(shopId, id), data: { status: 'processing', version: { increment: 1 } } });
                return { id: job.id, metadata: { documentId: id, revisionId: draft.id } };
            }, async (tx, result) => jobDto(await tx.job.findUniqueOrThrow({ where: knowledgeKey(shopId, result.id), include: jobDetails })));
    }

    publish(headers: IncomingHttpHeaders, shopId: string, id: string, input: Publish, requestId: string) {
        const reason = knowledgeText(input.reason, 5);
        return this.change({ headers, shopId, operationId: 'publishKnowledge', payload: { id, input }, requestId, reason },
            async (tx, scope, _commandId, config) => {
                const document = await documentInShop(tx, shopId, id);
                requireVersion(document.version, input.expectedVersion);
                const draft = document.draft;
                if (!draft || draft.id !== input.revisionId || draft.status !== 'ready_for_review' || !draft.contentHash || !draft.indexedText ||
                    !validUuid(input.evaluationRunId)) throw new ConflictException();
                await requireTemplateReady(tx, shopId, draft.template);
                const evaluation = await tx.evaluation.findUnique({ where: knowledgeKey(shopId, input.evaluationRunId) });
                const { policyVersion } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { policyVersion: true } });
                if (evaluation?.status !== 'passed' || evaluation.knowledgeRevisionId !== draft.id || evaluation.knowledgeHash !== draft.contentHash ||
                    evaluation.policyVersion !== policyVersion || evaluation.criticalFailures !== 0 || evaluation.totalCases < 1 ||
                    (evaluation.fixture && !usesLocalOidcFixture(config))) throw new ConflictException('Cần kết quả đánh giá đạt của đúng phiên bản tri thức.');
                if (draft.fileId && !await tx.fileObject.findFirst({ where: { shopId, id: draft.fileId, status: 'ready', purpose: 'knowledge_source' }, select: { id: true } })) {
                    throw new ConflictException();
                }
                if (document.publishedRevisionId) await tx.knowledgeRevision.update({ where: knowledgeKey(shopId, document.publishedRevisionId),
                    data: { status: 'retired', version: { increment: 1 } } });
                await tx.knowledgeRevision.update({ where: knowledgeKey(shopId, draft.id), data: { status: 'published', evaluationId: evaluation.id,
                    publishedAt: new Date(), publishedPolicy: policyVersion, approvedBy: scope.userId, version: { increment: 1 } } });
                const updated = await tx.knowledgeDocument.update({ where: knowledgeKey(shopId, id), data: {
                    status: 'published', draftRevisionId: null, publishedRevisionId: draft.id, version: { increment: 1 },
                } });
                await enqueueResourceUpdate(tx, 'knowledge.published', updated);
                return { id, metadata: { revisionId: draft.id, evaluationId: evaluation.id, version: updated.version } };
            }, async (_tx, _result, command) => commandDto(command, 'knowledge'));
    }

    retire(headers: IncomingHttpHeaders, shopId: string, id: string, input: VersionReason, requestId: string) {
        const reason = knowledgeText(input.reason, 5);
        return this.change({ headers, shopId, operationId: 'retireKnowledge', payload: { id, input }, requestId, reason }, async tx => {
            const document = await documentInShop(tx, shopId, id);
            requireVersion(document.version, input.expectedVersion);
            if (!document.publishedRevisionId) throw new ConflictException();
            await tx.knowledgeRevision.update({ where: knowledgeKey(shopId, document.publishedRevisionId), data: { status: 'retired', version: { increment: 1 } } });
            const updated = await tx.knowledgeDocument.update({ where: knowledgeKey(shopId, id), data: {
                publishedRevisionId: null, status: document.draft ? currentStatus(document.draft) : 'retired', version: { increment: 1 },
            } });
            await enqueueResourceUpdate(tx, 'knowledge.published', updated);
            return { id, metadata: { retiredRevisionId: document.publishedRevisionId, version: updated.version } };
        }, async (_tx, _result, command) => commandDto(command, 'knowledge'));
    }

    private read<T>(headers: IncomingHttpHeaders, shopId: string, collect: (tx: Prisma.TransactionClient, scope: ShopScope) => Promise<T>) {
        return readAsSession(this.db, headers, async (tx, userId) => collect(tx, await requireShopAccess(tx, userId, shopId, readPermission)));
    }

    private change<T>(input: {
        headers: IncomingHttpHeaders; shopId: string; operationId: keyof typeof operations; payload: Prisma.InputJsonValue;
        requestId: string; reason?: string; deferred?: boolean;
    }, apply: (tx: Prisma.TransactionClient, scope: ShopScope, commandId: string, config: AuthConfig) => Promise<{ id: string; metadata?: Prisma.InputJsonObject }>,
        result: (tx: Prisma.TransactionClient, ref: ResourceRef, command: Command) => Promise<T>) {
        const { shopId, operationId, requestId, reason } = input;
        const [permission, resourceType] = operations[operationId];
        return writeShopCommand(this.db, this.config, { ...input, permission }, async (tx, scope, config, command) => {
            const record = await apply(tx, scope, command.id, config);
            await recordAudit(tx, { shopId, actorId: scope.userId, action: operationId, requestId, resourceType, resourceId: record.id,
                metadata: { ...(record.metadata ?? {}), ...(reason ? { reason } : {}) } });
            return { type: resourceType, id: record.id };
        }, (tx, _scope, ref, command) => {
            if (ref.type !== resourceType) throw new ConflictException();
            return result(tx, ref, command);
        });
    }
}

export function knowledgeIndexHandler(db: PrismaClient): JobHandler {
    return async job => {
        const { documentId, revisionId, version } = job.input as { documentId: string; revisionId: string; version: number };
        const source = await db.knowledgeRevision.findUnique({
            where: { shopId_documentId_id: { shopId: job.shopId, documentId, id: revisionId } },
            include: { file: { include: fileContents } },
        });
        if (!source || source.indexJobId !== job.id || source.status !== 'processing' || source.version !== version) throw new NotFoundException();
        const file = source.file;
        const eligibleFile = file?.status === 'ready' && file.purpose === 'knowledge_source';
        const bytes = eligibleFile ? await readReadyFileBytes(file) : null;
        let indexedText: string | null = null;
        try {
            if (source.sourceKind === 'file' && !bytes) throw new UnprocessableEntityException();
            const extracted = bytes && file ? await extractKnowledgeText(bytes, file.mimeType) : null;
            indexedText = [source.content, extracted].filter(Boolean).join('\n\n').trim();
            if (!indexedText || indexedText.length > 100000) indexedText = null;
        } catch {
            indexedText = null;
        }
        const contentHash = indexedText ? createHash('sha256').update(JSON.stringify([source.title, source.sourceKind, source.file?.sha256 ?? null, indexedText])).digest('hex') : null;
        const warnings = ['Nguồn cần được duyệt và đánh giá đúng phiên bản trước khi sử dụng.'];
        const rejected = ['Tệp hoặc nội dung chưa đủ điều kiện lập chỉ mục văn bản.'];
        return async tx => {
            const document = await documentInShop(tx, job.shopId, documentId);
            if (document.draftRevisionId !== revisionId || document.draft?.indexJobId !== job.id || document.draft.version !== version) throw new ConflictException();
            const status = indexedText ? 'ready_for_review' : 'failed';
            await tx.knowledgeRevision.update({ where: knowledgeKey(job.shopId, revisionId), data: {
                status, indexedText, contentHash, warnings: indexedText ? warnings : rejected, version: { increment: 1 },
            } });
            await tx.knowledgeDocument.update({ where: knowledgeKey(job.shopId, documentId), data: { status, version: { increment: 1 } } });
            return { status: indexedText ? 'succeeded' : 'failed', completed: indexedText ? 1 : 0, total: 1, errorCount: indexedText ? 0 : 1,
                rowErrors: indexedText ? [] : [{ row: 1, field: 'content', code: 'INVALID_KNOWLEDGE_SOURCE', message: rejected[0] }],
                ...(indexedText ? { result: { type: 'knowledge_revision', id: revisionId } } : {}) };
        };
    };
}
