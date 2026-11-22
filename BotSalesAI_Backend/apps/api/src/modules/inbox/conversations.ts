import { Body, ConflictException, Controller, Get, HttpCode, Module, NotFoundException, Param, Post, Query, Req, Res,
    UnprocessableEntityException, type DynamicModule } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { MessageDeliveryStatus, type Prisma, type PrismaClient, type ConversationStatus } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery, paging, validUuid } from '../../http/query.js';
import { envelope, noStore, requireVersion, versionedEnvelope } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { commandDto } from '../../platform/commands/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import type { ApprovedEvaluationConfig } from '../ai/index.js';
import { channelMediaPolicy, channelName, messengerFixtureEnabled, type MetaInboundConfig } from '../channels/index.js';
import { permissionsFor, readAsSession, requireShopAccess, writeShopCommand, type AuthConfig } from '../workspace/index.js';
import { conversationDetails, conversationInShop, conversationView, inboxKey, messageDetails, messageView, metaReplyTarget, normalizedMessage, queueMessengerMessage, sendEligibility,
    updateConversation, verifyMedia } from './message-data.js';
import { MessengerFixture, MessengerFixtureController } from './messenger-fixture.js';
import { MetaMessenger, MetaMessengerController } from './meta-messenger.js';

const body = (schema: string) => new SchemaPipe(validator.compile(schemaFromContract(schema)));
const requestId = (response: ServerResponse) => String(response.getHeader('X-Request-Id'));
type MessageWrite = { clientMessageId: string; expectedConversationVersion: number; text?: string; fileIds?: string[] };
type NoteWrite = { text: string; transcriptSource?: { messageId: string; fileId: string } };
type VersionedReason = { expectedVersion: number; reason: string };
type Assignment = { expectedVersion: number; userId: string | null };
const modeOperations = ['takeoverConversation', 'releaseConversation', 'resolveConversation', 'assignConversation'] as const;
type ModeOperation = (typeof modeOperations)[number];
export const inboxCommands = [
    { operationId: 'sendMessage', resourceType: 'message' }, { operationId: 'addInternalNote', resourceType: 'message' },
    ...modeOperations.map(operationId => ({ operationId, resourceType: 'conversation' })),
];

class ConversationsService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig, private readonly meta?: MetaInboundConfig) {}

    list(headers: IncomingMessage['headers'], shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'conversations.read');
            const filters = listQuery(raw, 'conversations');
            if (filters.status && !['open', 'resolved'].includes(filters.status)) throw new UnprocessableEntityException();
            const page = paging(filters, ['conversations', shopId, userId, String(scope.permissionVersion),
                filters.customerId ?? '', filters.channelId ?? '', filters.assignedUserId ?? '', filters.mode ?? '']);
            const canReadName = scope.permissions.includes('customers.read');
            const q = filters.q?.trim();
            const search = page.keyword ? { OR: [
                ...(canReadName ? [{ identity: { customer: {
                    displayName: { contains: page.keyword, mode: 'insensitive' as const }, NOT: { redactedFields: { has: 'displayName' } },
                } } }] : []),
                ...(q && validUuid(q) ? [{ id: q }] : []),
            ] } : {};
            const result = page.result(await tx.channelConversation.findMany({
                where: {
                    shopId, customerId: filters.customerId, channelId: filters.channelId, assignedUserId: filters.assignedUserId,
                    mode: filters.mode, status: filters.status as ConversationStatus | undefined, AND: [search, page.after ?? {}],
                },
                orderBy: page.orderBy, take: page.limit + 1, include: conversationDetails,
            }));
            return { ...result, data: result.data.map(item => conversationView(item, scope, messengerFixtureEnabled(this.config), this.meta)) };
        });
    }

    get(headers: IncomingMessage['headers'], shopId: string, id: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'conversations.read');
            return conversationView(await conversationInShop(tx, shopId, id), scope, messengerFixtureEnabled(this.config), this.meta);
        });
    }

    messages(headers: IncomingMessage['headers'], shopId: string, conversationId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'conversations.read');
            await conversationInShop(tx, shopId, conversationId);
            const filters = listQuery(raw);
            if (filters.status && !Object.hasOwn(MessageDeliveryStatus, filters.status)) throw new UnprocessableEntityException();
            const page = paging(filters, ['messages', shopId, conversationId, userId, String(scope.permissionVersion)]);
            const result = page.result(await tx.channelMessage.findMany({
                where: { shopId, conversationId, status: filters.status as MessageDeliveryStatus | undefined,
                    AND: [page.keyword ? { text: { contains: page.keyword, mode: 'insensitive' } } : {}, page.after ?? {}] },
                orderBy: page.orderBy, take: page.limit + 1, include: messageDetails,
            }));
            return { ...result, data: result.data.map(message => messageView(message, scope.permissions)) };
        });
    }

    metadata(headers: IncomingMessage['headers'], shopId: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            await requireShopAccess(tx, userId, shopId, 'conversations.read');
            const channels = await tx.channelConnection.findMany({ where: { shopId }, orderBy: [{ name: 'asc' }, { id: 'asc' }] });
            const memberships = await tx.membership.findMany({ where: { shopId, status: 'active' },
                select: { userId: true, roles: true, user: { select: { displayName: true } } }, orderBy: [{ userId: 'asc' }] });
            return {
                channels: channels.map(channel => ({ id: channel.id, displayName: channelName(channel),
                    mediaPolicy: messengerFixtureEnabled(this.config) ? channelMediaPolicy(channel) : null })),
                assignees: memberships.filter(item => permissionsFor(item.roles).includes('conversations.reply'))
                    .map(item => ({ userId: item.userId, displayName: item.user.displayName })),
            };
        });
    }

    send(headers: IncomingMessage['headers'], shopId: string, conversationId: string, input: MessageWrite, trace: string) {
        const operationId = 'sendMessage';
        const text = input.text === undefined ? '' : normalizedMessage(input.text);
        const fileIds = input.fileIds ?? [];
        return writeShopCommand(this.db, this.config, { headers, shopId, operationId, permission: 'conversations.reply',
            payload: { conversationId, input }, deferred: true }, async (tx, scope, config, command) => {
            const conversation = await conversationInShop(tx, shopId, conversationId);
            requireVersion(conversation.version, input.expectedConversationVersion);
            const eligible = sendEligibility(conversation, scope, messengerFixtureEnabled(config), 'human', this.meta);
            if (eligible.state !== 'allowed') throw new ConflictException(eligible.reasonCode ?? 'CONVERSATION_NOT_READY');
            const provider = Boolean(metaReplyTarget(conversation, this.meta));
            if (provider && !text) throw new UnprocessableEntityException('Messenger yêu cầu nội dung văn bản.');
            await verifyMedia(tx, shopId, conversationId, scope.userId, conversation.channel, fileIds);
            if (await tx.channelMessage.findUnique({ where: { shopId_conversationId_clientMessageId: {
                shopId, conversationId, clientMessageId: input.clientMessageId,
            } }, select: { id: true } })) throw new ConflictException();
            const message = await queueMessengerMessage(tx, conversation, { text, commandId: command.id, clientMessageId: input.clientMessageId, fileIds,
                origin: provider ? 'provider' : 'fixture' });
            await recordAudit(tx, { shopId, actorId: scope.userId, action: operationId, requestId: trace, resourceType: 'message', resourceId: message.id,
                metadata: { conversationId, attachmentCount: fileIds.length } });
            return { type: 'message', id: message.id };
        }, async (_tx, _scope, _result, command) => commandDto(command, 'message'));
    }

    note(headers: IncomingMessage['headers'], shopId: string, conversationId: string, input: NoteWrite, trace: string) {
        const operationId = 'addInternalNote';
        const text = normalizedMessage(input.text);
        return writeShopCommand(this.db, this.config, { headers, shopId, operationId, permission: 'conversations.reply', payload: { conversationId, input } },
            async (tx, scope) => {
                const conversation = await conversationInShop(tx, shopId, conversationId);
                if (conversation.identity.customer.privacyErasedAt) throw new ConflictException();
                const source = input.transcriptSource;
                if (source) {
                    await requireShopAccess(tx, scope.userId, shopId, 'conversations.read');
                    if (!validUuid(source.messageId) || !validUuid(source.fileId) || !await tx.channelAttachment.findFirst({
                        where: { shopId, messageId: source.messageId, fileId: source.fileId,
                            message: { conversationId, redactedAt: null, direction: { not: 'internal' } },
                            file: { resourceId: conversationId, purpose: 'conversation_media', status: 'ready',
                                mimeType: { startsWith: 'audio/' } } },
                        select: { fileId: true },
                    })) throw new UnprocessableEntityException('Chọn tệp âm thanh sẵn sàng của đúng hội thoại.');
                }
                const note = await tx.channelMessage.create({ data: { shopId, conversationId, text, externalId: randomUUID(),
                    direction: 'internal', origin: 'fixture', senderKind: 'human', ...(source ? { sourceEvidence: [
                        { type: 'voice_transcript_file', id: source.fileId }, { type: 'voice_transcript_message', id: source.messageId },
                    ] } : {}) } });
                await enqueueResourceUpdate(tx, 'message.created', note);
                await recordAudit(tx, { shopId, actorId: scope.userId, action: operationId, requestId: trace, resourceType: 'message',
                    resourceId: note.id, metadata: { conversationId, ...(source ? { transcriptSource: source } : {}) } });
                return { type: 'message', id: note.id };
            }, async (tx, scope, result) => messageView(await tx.channelMessage.findUniqueOrThrow({ where: inboxKey(shopId, result.id), include: messageDetails }), scope.permissions));
    }

    mode(headers: IncomingMessage['headers'], shopId: string, id: string, operationId: ModeOperation, input: VersionedReason | Assignment, trace: string) {
        const reason = 'reason' in input ? normalizedMessage(input.reason, 5) : undefined;
        return writeShopCommand(this.db, this.config, { headers, shopId, operationId, permission: 'conversations.assign', payload: { id, input } },
            async (tx, scope) => {
                const conversation = await conversationInShop(tx, shopId, id);
                requireVersion(conversation.version, input.expectedVersion);
                if (conversation.status !== 'open' || (conversation.assignedUserId && conversation.assignedUserId !== scope.userId &&
                    !scope.roles.some(role => role === 'owner' || role === 'manager'))) throw new ConflictException();
                let data: Prisma.ChannelConversationUncheckedUpdateInput = {};
                if (operationId === 'takeoverConversation') {
                    await requireShopAccess(tx, scope.userId, shopId, 'conversations.reply');
                    data = { mode: 'human', assignedUserId: scope.userId, unreadCount: 0 };
                } else if (operationId === 'releaseConversation') {
                    if (conversation.mode !== 'human') throw new ConflictException();
                    data = { mode: 'bot', assignedUserId: null };
                } else if (operationId === 'resolveConversation') {
                    data = { status: 'resolved', mode: 'paused', unreadCount: 0 };
                } else if ('userId' in input) {
                    if (input.userId) {
                        if (!validUuid(input.userId)) throw new UnprocessableEntityException();
                        const member = await tx.membership.findUnique({ where: { shopId_userId: { shopId, userId: input.userId } } });
                        if (!member || member.status !== 'active' || !permissionsFor(member.roles).includes('conversations.reply')) throw new NotFoundException();
                    }
                    data = { assignedUserId: input.userId, mode: input.userId ? 'human' : 'paused' };
                }
                const updated = await updateConversation(tx, conversation, { ...data, generation: { increment: 1 } });
                await recordAudit(tx, { shopId, actorId: scope.userId, action: operationId, requestId: trace, resourceType: 'conversation', resourceId: id,
                    metadata: { version: updated.version, mode: updated.mode, ...(reason ? { reason } : {}) } });
                return { type: 'conversation', id };
            }, async (_tx, _scope, _result, command) => commandDto(command, 'conversation'));
    }
}

@Controller('shops/:shopId/conversations')
class ConversationsController {
    constructor(private readonly conversations: ConversationsService) {}

    @Get()
    @ContractOperation('listConversations')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.conversations.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get('metadata')
    @ContractOperation('getInboxMetadata')
    async metadata(@Param('shopId', idPipe) shopId: string, @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.conversations.metadata(request.headers, shopId));
    }

    @Get(':conversationId')
    @ContractOperation('getConversation')
    async get(@Param('shopId', idPipe) shopId: string, @Param('conversationId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.conversations.get(request.headers, shopId, id));
    }

    @Get(':conversationId/messages')
    @ContractOperation('listMessages')
    async messages(@Param('shopId', idPipe) shopId: string, @Param('conversationId', idPipe) id: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.conversations.messages(request.headers, shopId, id, query);
        return { ...envelope(response, data), page };
    }

    @Post(':conversationId/messages')
    @HttpCode(202)
    @ContractOperation('sendMessage')
    async send(@Param('shopId', idPipe) shopId: string, @Param('conversationId', idPipe) id: string, @Body(body('MessageWrite')) input: MessageWrite,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.conversations.send(request.headers, shopId, id, input, requestId(response)));
    }

    @Post(':conversationId/notes')
    @ContractOperation('addInternalNote')
    async note(@Param('shopId', idPipe) shopId: string, @Param('conversationId', idPipe) id: string, @Body(body('NoteWrite')) input: NoteWrite,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.conversations.note(request.headers, shopId, id, input, requestId(response)));
    }

    @Post(':conversationId/takeover')
    @HttpCode(202)
    @ContractOperation('takeoverConversation')
    async takeover(@Param('shopId', idPipe) shopId: string, @Param('conversationId', idPipe) id: string, @Body(body('VersionedReason')) input: VersionedReason,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.conversations.mode(request.headers, shopId, id, 'takeoverConversation', input, requestId(response)));
    }

    @Post(':conversationId/release')
    @HttpCode(202)
    @ContractOperation('releaseConversation')
    async release(@Param('shopId', idPipe) shopId: string, @Param('conversationId', idPipe) id: string, @Body(body('VersionedReason')) input: VersionedReason,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.conversations.mode(request.headers, shopId, id, 'releaseConversation', input, requestId(response)));
    }

    @Post(':conversationId/resolve')
    @HttpCode(202)
    @ContractOperation('resolveConversation')
    async resolve(@Param('shopId', idPipe) shopId: string, @Param('conversationId', idPipe) id: string, @Body(body('VersionedReason')) input: VersionedReason,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.conversations.mode(request.headers, shopId, id, 'resolveConversation', input, requestId(response)));
    }

    @Post(':conversationId/assign')
    @HttpCode(202)
    @ContractOperation('assignConversation')
    async assign(@Param('shopId', idPipe) shopId: string, @Param('conversationId', idPipe) id: string, @Body(body('Assignment')) input: Assignment,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.conversations.mode(request.headers, shopId, id, 'assignConversation', input, requestId(response)));
    }
}

@Module({})
class InboxModule {}

export function inboxModule(db?: PrismaClient, config?: AuthConfig, meta?: MetaInboundConfig, provider?: ApprovedEvaluationConfig): DynamicModule {
    return {
        module: InboxModule, controllers: [ConversationsController, ...(messengerFixtureEnabled(config) ? [MessengerFixtureController] : []),
            ...(meta ? [MetaMessengerController] : [])],
        providers: [{ provide: ConversationsService, useFactory: () => new ConversationsService(db, config, meta) },
            { provide: MessengerFixture, useFactory: () => new MessengerFixture(db, config) },
            ...(meta ? [{ provide: MetaMessenger, useFactory: () => new MetaMessenger(db, meta, provider) }] : [])],
    };
}
