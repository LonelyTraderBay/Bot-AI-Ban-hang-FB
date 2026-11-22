import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ChannelConnection, Prisma } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import type { ResourceRef } from '../../platform/commands/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { channelMediaPolicy, metaReplyPage, type MetaInboundConfig } from '../channels/index.js';
import { customerView } from '../customers/index.js';
import type { ShopScope } from '../workspace/index.js';

export const inboxKey = (shopId: string, id: string) => ({ shopId_id: { shopId, id } });
export const messageDetails = { attachments: { orderBy: { position: 'asc' }, include: { file: {
    select: { id: true, name: true, mimeType: true, sizeBytes: true },
} } } } satisfies Prisma.ChannelMessageInclude;
export const conversationDetails = {
    channel: true, identity: { include: { customer: true } },
    messages: { where: { direction: { not: 'internal' } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 1, select: { text: true } },
} satisfies Prisma.ChannelConversationInclude;
export type Conversation = Prisma.ChannelConversationGetPayload<{ include: typeof conversationDetails }>;
type Message = Prisma.ChannelMessageGetPayload<{ include: typeof messageDetails }>;

const evidencePermissions: Readonly<Record<string, string>> = {
    variant: 'catalog.read', knowledge_revision: 'knowledge.read', order: 'orders.read',
};

export function messageView(message: Message, permissions: readonly string[]) {
    const { id, shopId, conversationId, direction, senderKind, text, status, createdAt, clientMessageId, attachments } = message;
    const sourceEvidence = Array.isArray(message.sourceEvidence) ? message.sourceEvidence.flatMap(ref =>
        ref && typeof ref === 'object' && !Array.isArray(ref) && typeof ref.type === 'string' && typeof ref.id === 'string' &&
        Object.hasOwn(evidencePermissions, ref.type) && permissions.includes(evidencePermissions[ref.type]) ? [{ type: ref.type, id: ref.id }] : []) : [];
    return {
        id, shopId, conversationId, direction, senderKind: senderKind ?? (direction === 'inbound' ? 'customer' : 'human'), text, status,
        createdAt, clientMessageId, sourceEvidence,
        attachments: message.redactedAt ? [] : attachments.map(({ file }) => ({ fileId: file.id, name: file.name, mimeType: file.mimeType, sizeBytes: file.sizeBytes })),
    };
}

type ReplyConversation = Pick<Conversation, 'mode' | 'status' | 'lastInboundAt' | 'assignedUserId' | 'channel'> &
    Partial<Pick<Conversation, 'externalId' | 'identity'>>;

export function metaReplyTarget(conversation: ReplyConversation, meta?: MetaInboundConfig) {
    const { channel, externalId, identity } = conversation;
    const page = metaReplyPage(meta, channel);
    if (!page || !externalId || !identity || identity.channel !== channel.provider || identity.pageId !== channel.pageId ||
        identity.externalId !== externalId || !page.senderIds.has(externalId) || identity.customer.privacyErasedAt) return undefined;
    return { accessToken: page.accessToken, version: page.version, pageId: channel.pageId, recipient: externalId };
}

export function sendEligibility(conversation: ReplyConversation, scope: Pick<ShopScope, 'userId' | 'permissions'>,
    fixtureActive: boolean, lane: 'human' | 'bot' = 'human', meta?: MetaInboundConfig) {
    const { channel, lastInboundAt, assignedUserId } = conversation;
    const policyVersion = channel.policyVersion;
    const expiresAt = lastInboundAt ? new Date(lastInboundAt.getTime() + 24 * 60 * 60 * 1000) : null;
    let reasonCode: string | null = null;
    if (!scope.permissions.includes('conversations.reply')) reasonCode = 'PERMISSION_REQUIRED';
    else if (!channel.policyVerifiedAt || (!(fixtureActive && channelMediaPolicy(channel)) &&
        !(lane === 'human' && metaReplyTarget(conversation, meta)))) reasonCode = 'CHANNEL_NOT_READY';
    else if (conversation.status !== 'open') reasonCode = 'CONVERSATION_RESOLVED';
    else if (conversation.mode !== lane || (lane === 'human' && assignedUserId && assignedUserId !== scope.userId)) reasonCode = 'HANDOFF_REQUIRED';
    else if (!expiresAt || expiresAt <= new Date()) reasonCode = 'SEND_WINDOW_CLOSED';
    return { state: reasonCode ? 'blocked' : 'allowed', reasonCode, expiresAt, policyVersion };
}

export function conversationView(conversation: Conversation, scope: ShopScope, fixtureActive: boolean, meta?: MetaInboundConfig) {
    const { id, shopId, version, createdAt, updatedAt, channelId, customerId, status, mode, assignedUserId, unreadCount } = conversation;
    const preview = conversation.messages[0]?.text;
    return {
        id, shopId, version, createdAt, updatedAt, channelId, customerId, status, mode, assignedUserId, unreadCount,
        displayName: scope.permissions.includes('customers.read') ? customerView(conversation.identity.customer).displayName : 'Hội thoại ' + id,
        lastMessagePreview: preview ? Array.from(preview).slice(0, 160).join('') : null,
        sendEligibility: sendEligibility(conversation, scope, fixtureActive, 'human', meta),
    };
}

export async function conversationInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const record = await tx.channelConversation.findUnique({ where: inboxKey(shopId, id), include: conversationDetails });
    if (!record) throw new NotFoundException();
    return record;
}

export async function updateConversation(tx: Prisma.TransactionClient, conversation: { shopId: string; id: string },
    data: Prisma.ChannelConversationUncheckedUpdateInput) {
    const record = await tx.channelConversation.update({
        where: inboxKey(conversation.shopId, conversation.id), data: { ...data, version: { increment: 1 } },
    });
    await enqueueResourceUpdate(tx, 'conversation.updated', record);
    return record;
}

export async function queueMessengerMessage(tx: Prisma.TransactionClient, conversation: Pick<Conversation, 'shopId' | 'id' | 'generation' | 'channel'>,
    input: { commandId: string; clientMessageId: string; text: string; fileIds?: string[]; botGeneration?: number; sources?: ResourceRef[];
        origin?: 'fixture' | 'provider' }) {
    const { shopId, id: conversationId } = conversation;
    const { commandId, clientMessageId, text, fileIds = [], botGeneration, sources, origin = 'fixture' } = input;
    const message = await tx.channelMessage.create({ data: { shopId, conversationId, text, direction: 'outbound', origin,
        senderKind: botGeneration ? 'bot' : 'human', status: 'queued', externalId: randomUUID(), clientMessageId,
        sourceEvidence: sources?.map(({ type, id }) => ({ type, id })),
    } });
    if (fileIds.length) await tx.channelAttachment.createMany({ data: fileIds.map((fileId, position) => ({ shopId, messageId: message.id, fileId, position })) });
    await tx.messageDispatch.create({ data: { shopId, messageId: message.id, commandId, botGeneration,
        conversationGeneration: conversation.generation, channelGeneration: conversation.channel.generation } });
    await updateConversation(tx, conversation, {});
    await enqueueResourceUpdate(tx, 'message.created', message);
    return message;
}

export function normalizedMessage(value: string, minLength = 1) {
    const clean = value.trim();
    if (clean.length < minLength || clean.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
    return clean;
}

export async function verifyMedia(tx: Prisma.TransactionClient, shopId: string, conversationId: string,
    uploaderId: string, channel: ChannelConnection, fileIds: string[]) {
    if (!fileIds.length) return;
    const limits = channelMediaPolicy(channel);
    if (!limits || fileIds.length > limits.maxAttachmentCount || new Set(fileIds).size !== fileIds.length ||
        !fileIds.every(validUuid)) throw new UnprocessableEntityException();
    const files = await tx.fileObject.findMany({ where: { shopId, id: { in: fileIds }, uploaderId,
        resourceId: conversationId, status: 'ready', purpose: 'conversation_media' },
        select: { mimeType: true, sizeBytes: true } });
    if (files.length !== fileIds.length || files.some(file => file.sizeBytes > limits.maxFileSizeBytes || !limits.allowedMimeTypes.includes(file.mimeType))) {
        throw new ConflictException('Tệp đính kèm chưa được xác minh trong hội thoại.');
    }
}
