import { lockShopClosure } from '../../platform/database/shop-lifecycle.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { recordAudit } from '../../platform/audit/index.js';
import { serializable } from '../../platform/database/transactions.js';
import { enqueueCommandUpdate, enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { liveBotSnapshot } from '../ai/index.js';
import { messengerFixtureEnabled, type MetaInboundConfig } from '../channels/index.js';
import { requireShopAccess, type AuthConfig } from '../workspace/index.js';
import { authorizedAfterSales } from './after-sales.js';
import { inboxKey, metaReplyTarget, sendEligibility } from './message-data.js';
import { sendMetaReply, type MetaSendResult } from './meta-send.js';

type DispatchKey = { shopId: string; messageId: string };

const commandFields = { select: { id: true, actorId: true, status: true } } as const;
const pending = { finishedAt: null, command: { status: 'accepted', actor: { shop: { closedAt: null } } } } as const;
const oldestDispatch = [{ createdAt: 'asc' }, { messageId: 'asc' }] satisfies Prisma.MessageDispatchOrderByWithRelationInput[];
const metaAttemptGraceMs = 60_000;

async function finishDispatch(tx: Prisma.TransactionClient, key: DispatchKey, commandId: string, status: 'sent' | 'failed' | 'unknown', externalId?: string) {
    const { shopId, messageId } = key;
    const updated = await tx.channelMessage.update({ where: inboxKey(shopId, messageId),
        data: { status, externalId, version: { increment: 1 } } });
    await tx.messageDispatch.update({ where: { shopId_messageId: key }, data: { finishedAt: new Date() } });
    await tx.command.update({ where: inboxKey(shopId, commandId), data: { status: status === 'sent' ? 'succeeded' : status } });
    await enqueueResourceUpdate(tx, 'message.created', updated);
    await enqueueCommandUpdate(tx, { shopId, id: commandId });
}

async function executeFixtureDispatch(tx: Prisma.TransactionClient, config: AuthConfig | undefined, { shopId, messageId }: DispatchKey) {
    if (await lockShopClosure(tx, shopId)) return;
    const where = { shopId_messageId: { shopId, messageId } };
    const dispatch = await tx.messageDispatch.findUnique({ where, include: {
        command: commandFields,
        message: { include: { conversation: { include: { channel: true } } } },
    } });
    if (!dispatch || dispatch.finishedAt || dispatch.command.status !== 'accepted' || dispatch.message.origin !== 'fixture') return;
    const { command, message } = dispatch;
    const { conversation } = message;
    if (dispatch.afterSalesRequestId) {
        await tx.$queryRaw`SELECT id FROM customers WHERE shop_id=${shopId}::uuid AND id=${conversation.customerId}::uuid FOR SHARE`;
    }
    await tx.$queryRaw`SELECT id FROM channel_conversations WHERE shop_id=${shopId}::uuid AND id=${conversation.id}::uuid FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM channel_connections WHERE shop_id=${shopId}::uuid AND id=${conversation.channelId}::uuid FOR SHARE`;
    let enabled = false;
    try {
        const scope = await requireShopAccess(tx, command.actorId, shopId, 'conversations.reply');
        const actor = message.senderKind === 'bot' ? 'bot' : 'human';
        enabled = sendEligibility(conversation, scope, messengerFixtureEnabled(config), actor).state === 'allowed' &&
            conversation.generation === dispatch.conversationGeneration && conversation.channel.generation === dispatch.channelGeneration;
        if (enabled && actor === 'bot') {
            await tx.$queryRaw`SELECT shop_id FROM bot_configs WHERE shop_id=${shopId}::uuid FOR SHARE`;
            const bot = dispatch.botGeneration ? await liveBotSnapshot(tx, shopId, dispatch.botGeneration, config) : null;
            enabled = bot?.actorId === command.actorId && scope.permissions.includes('bot.publish');
            if (enabled && dispatch.afterSalesRequestId) {
                const current = await authorizedAfterSales(tx, { shopId, conversationId: conversation.id,
                    messageId: dispatch.afterSalesRequestId }, scope.permissions);
                enabled = !message.redactedAt && current?.text === message.text;
            }
        }
    } catch (error) {
        const status = (error as { getStatus?: () => number }).getStatus?.();
        if (status !== 403 && status !== 404) throw error;
    }
    await finishDispatch(tx, { shopId, messageId }, command.id, enabled ? 'sent' : 'failed');
}

async function submitMetaReply(tx: Prisma.TransactionClient, key: DispatchKey, actorId: string,
    meta: MetaInboundConfig | undefined, request: typeof fetch): Promise<MetaSendResult> {
    const { shopId, messageId } = key;
    const first = await tx.channelMessage.findUniqueOrThrow({ where: inboxKey(shopId, messageId),
        select: { conversation: { select: { id: true, customerId: true, channelId: true } } } });
    const { id, customerId, channelId } = first.conversation;
    // Serialize dispatch with erasure, handoff, disconnect and role changes.
    await tx.$queryRaw`SELECT id FROM customers WHERE shop_id=${shopId}::uuid AND id=${customerId}::uuid FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM channel_conversations WHERE shop_id=${shopId}::uuid AND id=${id}::uuid FOR UPDATE`;
    // A confirmed token rejection can expire this channel before another send proceeds.
    await tx.$queryRaw`SELECT id FROM channel_connections WHERE shop_id=${shopId}::uuid AND id=${channelId}::uuid FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM memberships WHERE shop_id=${shopId}::uuid AND user_id=${actorId}::uuid FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM channel_messages WHERE shop_id=${shopId}::uuid AND id=${messageId}::uuid FOR UPDATE`;
    const dispatch = await tx.messageDispatch.findUniqueOrThrow({ where: { shopId_messageId: key }, include: {
        message: { include: { conversation: { include: { channel: true, identity: { include: { customer: true } } } },
            _count: { select: { attachments: true } } } },
    } });
    const { message } = dispatch;
    const { conversation } = message;
    const target = metaReplyTarget(conversation, meta);
    const blocked = { status: 'failed', reason: 'send_ineligible' } as const;
    if (!target || message.direction !== 'outbound' || message.senderKind !== 'human' || message.redactedAt ||
        !message.text || message._count.attachments || conversation.generation !== dispatch.conversationGeneration ||
        conversation.channel.generation !== dispatch.channelGeneration) return blocked;
    try {
        const scope = await requireShopAccess(tx, actorId, shopId, 'conversations.reply');
        if (sendEligibility(conversation, scope, false, 'human', meta).state !== 'allowed') return blocked;
    } catch (error) {
        const status = (error as { getStatus?: () => number }).getStatus?.();
        if (status === 403 || status === 404) return blocked;
        throw error;
    }
    const result = await sendMetaReply(target, message.text, request);
    if (result.reason === 'token_rejected') {
        const channel = await tx.channelConnection.update({ where: inboxKey(shopId, channelId), data: {
            status: 'expired', generation: { increment: 1 }, version: { increment: 1 },
        } });
        await enqueueResourceUpdate(tx, 'health.updated', channel);
    }
    return result;
}

async function executeMetaDispatch(db: PrismaClient, key: DispatchKey, recover: boolean,
    meta: MetaInboundConfig | undefined, request: typeof fetch) {
    if (!recover) {
        // A committed claim prevents another HTTP call after losing the worker process.
        const claimed = await db.$transaction(async tx => {
            if (await lockShopClosure(tx, key.shopId)) return false;
            const claim = await tx.messageDispatch.updateMany({ where: { ...key, ...pending, startedAt: null }, data: { startedAt: new Date() } });
            return claim.count === 1;
        });
        if (!claimed) return;
    }
    const { shopId, messageId } = key;
    // Do not retry this transaction after it can contact Meta.
    await db.$transaction(async tx => {
        if (await lockShopClosure(tx, shopId)) return;
        await tx.$queryRaw`SELECT message_id FROM message_dispatches WHERE shop_id=${shopId}::uuid AND message_id=${messageId}::uuid FOR UPDATE`;
        const dispatch = await tx.messageDispatch.findUnique({ where: { shopId_messageId: key }, include: { command: commandFields } });
        if (!dispatch?.startedAt || dispatch.finishedAt || dispatch.command.status !== 'accepted') return;
        const { command } = dispatch;
        const result: MetaSendResult = recover ? { status: 'unknown', reason: 'attempt_interrupted' }
            : await submitMetaReply(tx, key, command.actorId, meta, request);
        await finishDispatch(tx, key, command.id, result.status, result.status === 'sent' ? result.externalId : undefined);
        await recordAudit(tx, { shopId, actorId: command.actorId, requestId: command.id, resourceType: 'message', resourceId: messageId,
            action: 'messenger.dispatch', metadata: { commandId: command.id, status: result.status, reason: result.reason } });
    }, { isolationLevel: 'ReadCommitted', timeout: 12_000 });
}

export async function dispatchMessengerMessages(db: PrismaClient, config?: AuthConfig, meta?: MetaInboundConfig, request = fetch) {
    const fixtures = await db.messageDispatch.findMany({ where: { ...pending, message: { origin: 'fixture' } },
        orderBy: oldestDispatch, take: 50, select: { shopId: true, messageId: true } });
    for (const key of fixtures) await serializable(db, tx => executeFixtureDispatch(tx, config, key), false);

    // Bound time spent waiting for external I/O on each outbox poll.
    const due = await db.messageDispatch.findFirst({ where: { ...pending, message: { origin: 'provider' }, OR: [{ startedAt: null },
        { startedAt: { lte: new Date(Date.now() - metaAttemptGraceMs) } }] },
        orderBy: oldestDispatch, select: { shopId: true, messageId: true, startedAt: true } });
    if (due) await executeMetaDispatch(db, { shopId: due.shopId, messageId: due.messageId }, Boolean(due.startedAt), meta, request);
}
