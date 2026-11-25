import type { BotInboundTask, ChannelConnection, ChannelConversation, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { recordAudit } from '../../platform/audit/index.js';
import { recordCommand } from '../../platform/commands/index.js';
import { serializable } from '../../platform/database/transactions.js';
import { aiFixtureEnabled, budgetHandoff, liveBotSnapshot, reserveAiUsage, runFixtureTools, type ApprovedEvaluationConfig } from '../ai/index.js';
import { messengerFixtureEnabled } from '../channels/index.js';
import { requireShopAccess, type AuthConfig } from '../workspace/index.js';
import { afterSalesRequest, authorizedAfterSales, recordReturnIntake } from './after-sales.js';
import { inboundIntentKey, recordInboundDraft, workForHandoff } from './bot-drafts.js';
import { queueMessengerMessage, sendEligibility } from './message-data.js';
import { processStagedBotInbound } from './staged-bot-inbound.js';

type TaskKey = Pick<BotInboundTask, 'shopId' | 'messageId'>;

export async function queueBotInbound(tx: Prisma.TransactionClient, conversation: ChannelConversation, channel: ChannelConnection, messageId: string,
    config?: AuthConfig) {
    if (conversation.mode !== 'bot' || conversation.status !== 'open' || !aiFixtureEnabled(config)) return;
    const profile = await tx.botConfig.findUnique({ where: { shopId: conversation.shopId }, select: { status: true, generation: true } });
    if (profile?.status !== 'active') return;
    await tx.botInboundTask.create({ data: { shopId: conversation.shopId, messageId, conversationGeneration: conversation.generation,
        channelGeneration: channel.generation, botGeneration: profile.generation } });
}

async function executeTask(tx: Prisma.TransactionClient, config: AuthConfig, key: TaskKey) {
    const { shopId, messageId } = key;
    const where = { shopId_messageId: key };
    const row = await tx.botInboundTask.findUnique({ where, include: { message: { include: { conversation: { include: { channel: true } } } } } });
    if (!row || row.finishedAt || row.providerRunId) return;
    const { conversation } = row.message;
    const finish = (outcome: string) => tx.botInboundTask.update({ where, data: { finishedAt: new Date(), outcome } });
    const handoff = async (outcome: string) => {
        await workForHandoff(tx, conversation, true);
        await finish(outcome);
    };
    if (conversation.generation !== row.conversationGeneration || conversation.channel.generation !== row.channelGeneration ||
        conversation.mode !== 'bot' || conversation.status !== 'open' || conversation.lastInboundAt?.getTime() !== row.message.createdAt.getTime()) {
        return finish('stale_conversation');
    }
    const bot = await liveBotSnapshot(tx, shopId, row.botGeneration, config);
    if (!bot) return handoff('stale_configuration');
    let scope: Awaited<ReturnType<typeof requireShopAccess>>;
    try {
        scope = await requireShopAccess(tx, bot.actorId, shopId, 'bot.publish');
    } catch (error) {
        const status = (error as { getStatus?: () => number }).getStatus?.();
        if (status === 403 || status === 404) return handoff('permission_revoked');
        throw error;
    }
    if (sendEligibility(conversation, scope, messengerFixtureEnabled(config), 'bot').state !== 'allowed') return handoff('send_ineligible');
    const request = afterSalesRequest(row.message.text);
    const afterSales = request ? await authorizedAfterSales(tx, { shopId, conversationId: conversation.id, messageId }, scope.permissions) : null;
    if (request && !afterSales) return handoff('after_sales_handoff');
    if (afterSales && bot.revision.maxToolSteps < (afterSales.kind === 'tracking' ? 1 : 2)) return handoff('tool_limit');
    if (!await reserveAiUsage(tx, bot.shop, bot.revision.dailyBudget, new Date())) return handoff(budgetHandoff().code);
    const result = afterSales
        ? { ...afterSales, code: afterSales.kind === 'tracking' ? 'order_tracking' : 'return_intake', draft: undefined }
        : await runFixtureTools(tx, bot.shop, bot.revision, bot.context.knowledge, scope.permissions, { text: row.message.text, customerContextId: null });
    if (!afterSales && !['catalog', 'inventory', 'knowledge', 'draft_proposal'].includes(result.code)) return handoff(result.code);
    const sources = [...result.sources];
    const auditContext = { ...bot.auditContext, permissionVersion: scope.permissionVersion };
    if (afterSales?.kind === 'return_request') {
        const created = await recordReturnIntake(tx, config, { actorId: bot.actorId, messageId, conversation, orderId: afterSales.orderId, auditContext });
        if (!created) return handoff('after_sales_handoff');
        sources.push(created);
    }
    if (result.draft && bot.shop.defaultWarehouseId) {
        const order = await recordInboundDraft(tx, config, { actorId: bot.actorId, messageId, conversation, warehouseId: bot.shop.defaultWarehouseId,
            auditContext, proposal: result.draft });
        sources.push(order);
        await workForHandoff(tx, conversation, false);
    }
    await recordCommand(tx, { shopId, actorId: bot.actorId, operationId: 'sendMessage', idempotencyKey: inboundIntentKey(config, shopId, messageId, 'send') },
        { sourceMessageId: messageId, configHash: bot.context.contentHash, sources: sources.map(({ type, id }) => ({ type, id })) },
        async command => {
            const message = await queueMessengerMessage(tx, conversation, {
                commandId: command.id, clientMessageId: 'bot-' + messageId, text: result.text, botGeneration: row.botGeneration, sources,
                afterSalesRequestId: afterSales ? messageId : undefined,
            });
            await recordAudit(tx, { shopId, actorId: bot.actorId, requestId: messageId, action: 'sendMessage', resourceType: 'message', resourceId: message.id,
                metadata: { ...auditContext, origin: 'bot_fixture', sourceMessageId: messageId,
                    resourceVersion: message.version, result: 'queued' } });
            return { type: 'message', id: message.id };
        }, true);
    await finish(result.code);
}

export async function processBotInbound(db: PrismaClient, config?: AuthConfig, provider?: ApprovedEvaluationConfig, request = fetch) {
    if (config) await processStagedBotInbound(db, config, provider, request);
    if (!aiFixtureEnabled(config) || !messengerFixtureEnabled(config)) return;
    const due = await db.botInboundTask.findMany({ where: { finishedAt: null, providerRunId: null }, select: { shopId: true, messageId: true },
        orderBy: [{ createdAt: 'asc' }, { messageId: 'asc' }], take: 50 });
    for (const key of due) await serializable(db, tx => executeTask(tx, config, key), true);
}
