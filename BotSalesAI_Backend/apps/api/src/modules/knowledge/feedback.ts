import { Body, ConflictException, Controller, Get, HttpCode, NotFoundException, Param, Post, Query, Req, Res,
    UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { FeedbackStatus, type ConversationFeedback, type FeedbackRating, type PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe, UnprocessableInput } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery, paging, validUuid } from '../../http/query.js';
import { envelope, noStore, requireVersion, versionedEnvelope } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig } from '../workspace/index.js';
import { initializeDocument, knowledgeKey, knowledgeText } from './data.js';

type Write = { conversationId: string; messageId: string; rating: FeedbackRating; correction: string };
type Review = { expectedVersion: number; decision: 'approve' | 'reject'; reason: string; redactedCorrection: string };
const writePipe = new SchemaPipe(validator.compile(schemaFromContract('FeedbackWrite')));
const reviewPipe = new SchemaPipe(validator.compile(schemaFromContract('FeedbackReview')));
export const feedbackCommands = ['createFeedback', 'reviewFeedback'].map(operationId => ({ operationId, resourceType: 'feedback' }));

const contactEmail = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/u;
const contactPhone = /(?<![\p{L}\p{N}_])(?:\+(?:[.() -]{0,3}\d){8,15}|0(?:[. -]?\d){8,10}|\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4})(?![\p{L}\p{N}_])/u;

function feedbackView(feedback: ConversationFeedback, moderator: boolean) {
    const { id, shopId, conversationId, messageId, version, rating, status, reviewReason, createdAt, updatedAt, correction, redactedCorrection } = feedback;
    return { id, shopId, conversationId, messageId, version, rating, status, reviewReason, createdAt, updatedAt,
        correction: moderator && status === 'pending' ? correction : redactedCorrection ?? '' };
}

export class FeedbackService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, actorId) => {
            const scope = await requireShopAccess(tx, actorId, shopId, 'knowledge.read');
            const moderator = scope.permissions.includes('knowledge.write');
            const query = listQuery(raw);
            if (query.status && !Object.hasOwn(FeedbackStatus, query.status)) throw new UnprocessableEntityException();
            const page = paging(query, ['feedback', shopId, actorId, String(scope.permissionVersion)]);
            const filter = { contains: page.keyword, mode: 'insensitive' as const };
            const result = page.result(await tx.conversationFeedback.findMany({
                where: { shopId, status: query.status as FeedbackStatus | undefined,
                    AND: [page.keyword ? { OR: [{ redactedCorrection: filter }, ...(moderator ? [{ status: 'pending' as const, correction: filter }] : [])] } : {},
                        page.after ?? {}] },
                orderBy: page.orderBy, take: page.limit + 1,
            }));
            return { ...result, data: result.data.map(item => feedbackView(item, moderator)) };
        });
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: Write, requestId: string) {
        const operationId = 'createFeedback';
        const correction = knowledgeText(input.correction, input.rating === 'negative' ? 1 : 0);
        return writeShopCommand(this.db, this.config, { headers, shopId, operationId, permission: 'conversations.read', payload: input },
            async (tx, scope) => {
                const { conversationId, messageId, rating } = input;
                if (![conversationId, messageId].every(validUuid) || !await tx.channelMessage.findUnique({
                    where: { shopId_conversationId_id: { shopId, conversationId, id: messageId } }, select: { id: true },
                })) throw new NotFoundException();
                if (await tx.conversationFeedback.findUnique({ where: { shopId_messageId_actorId: { shopId, messageId, actorId: scope.userId } } })) {
                    throw new ConflictException();
                }
                const record = await tx.conversationFeedback.create({ data: { shopId, conversationId, messageId, actorId: scope.userId, rating, correction } });
                await recordAudit(tx, { shopId, actorId: scope.userId, action: operationId, requestId, resourceType: 'feedback', resourceId: record.id,
                    metadata: { conversationId, messageId, rating } });
                return { type: 'feedback', id: record.id };
            }, async (tx, _scope, ref) => feedbackView(await tx.conversationFeedback.findUniqueOrThrow({ where: knowledgeKey(shopId, ref.id) }), true));
    }

    review(headers: IncomingHttpHeaders, shopId: string, id: string, input: Review, requestId: string) {
        const operationId = 'reviewFeedback';
        const reason = knowledgeText(input.reason, 5);
        const approve = input.decision === 'approve';
        const redactedCorrection = approve ? knowledgeText(input.redactedCorrection) : null;
        return writeShopCommand(this.db, this.config, { headers, shopId, operationId, permission: 'knowledge.write', payload: { id, input } },
            async (tx, scope) => {
                if (!validUuid(id)) throw new NotFoundException();
                const record = await tx.conversationFeedback.findUnique({ where: knowledgeKey(shopId, id) });
                if (!record) throw new NotFoundException();
                requireVersion(record.version, input.expectedVersion);
                if (record.status !== 'pending') throw new ConflictException();
                if (redactedCorrection) {
                    const candidate = redactedCorrection.normalize('NFKC');
                    if (contactEmail.test(candidate) || contactPhone.test(candidate)) {
                        throw new UnprocessableInput([{
                            path: '/redactedCorrection', code: 'PRIVATE_CONTACT_DETAILS', message: 'Loại số điện thoại hoặc email trước khi duyệt nội dung.',
                        }]);
                    }
                }
                const changed = await tx.conversationFeedback.update({ where: knowledgeKey(shopId, id), data: {
                    status: approve ? 'approved' : 'rejected', reviewReason: reason, reviewedBy: scope.userId, redactedCorrection, version: { increment: 1 },
                } });
                const document = redactedCorrection ? await initializeDocument(tx, shopId,
                    { title: 'Đề xuất từ phản hồi', sourceKind: 'feedback', fileId: null, content: redactedCorrection }, id) : null;
                await recordAudit(tx, { shopId, actorId: scope.userId, action: operationId, requestId, resourceType: 'feedback', resourceId: changed.id,
                    metadata: { reason, decision: input.decision, version: changed.version, documentId: document?.id ?? null } });
                return { type: 'feedback', id };
            }, async (tx, _scope, ref) => feedbackView(await tx.conversationFeedback.findUniqueOrThrow({ where: knowledgeKey(shopId, ref.id) }), true));
    }
}

@Controller('shops/:shopId/feedback')
export class FeedbackController {
    constructor(private readonly feedback: FeedbackService) {}

    @Get()
    @ContractOperation('listFeedback')
    async list(@Param('shopId', idPipe) shopId: string, @Query() raw: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.feedback.list(request.headers, shopId, raw);
        return { ...envelope(response, data), page };
    }

    @Post()
    @ContractOperation('createFeedback')
    async create(@Param('shopId', idPipe) shopId: string, @Body(writePipe) input: Write,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.feedback.create(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post(':feedbackId/review')
    @HttpCode(200)
    @ContractOperation('reviewFeedback')
    async review(@Param('shopId', idPipe) shopId: string, @Param('feedbackId', idPipe) id: string, @Body(reviewPipe) input: Review,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.feedback.review(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }
}
