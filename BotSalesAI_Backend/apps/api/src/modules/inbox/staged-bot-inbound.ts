import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { BotInboundTask, ChannelConnection, ChannelConversation, ChannelMessage, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { recordAudit } from '../../platform/audit/index.js';
import { serializable } from '../../platform/database/transactions.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { evaluateStagingDraft, liveBotSnapshot, proposeSalesDraft, reserveAiUsage, stagingDraftCase, stagingDraftIntent, StagingAiError,
    type ApprovedEvaluationConfig } from '../ai/index.js';
import { metaInboundPage } from '../channels/index.js';
import { localAccountingDate } from '../finance/index.js';
import { requireShopAccess, type AuthConfig } from '../workspace/index.js';
import { recordInboundDraft, workForHandoff } from './bot-drafts.js';

const freshnessMs = 5 * 60_000;
// The token count and generation each have a 20-second transport deadline.
const recoveryMs = 60_000;
const fresh = (message: Pick<ChannelMessage, 'createdAt'>, now = Date.now()) =>
    message.createdAt.getTime() <= now && message.createdAt.getTime() >= now - freshnessMs;

export async function queueStagedBotInbound(tx: Prisma.TransactionClient, conversation: ChannelConversation, channel: ChannelConnection,
    message: ChannelMessage, senderId: string, provider?: ApprovedEvaluationConfig) {
    const approval = provider?.approval;
    const runtime = approval?.runtime;
    if (conversation.mode !== 'bot' || conversation.status !== 'open' || !approval || !runtime || approval.plan.expires <= Date.now() ||
        approval.shopId !== channel.shopId || channel.pageId !== runtime.pageId || runtime.senderId !== senderId ||
        !metaInboundPage(provider?.meta, channel)?.senderIds.has(senderId) || !fresh(message)) return;
    const profile = await tx.botConfig.findUnique({ where: { shopId: channel.shopId }, select: { status: true, generation: true, liveRevision: true } });
    if (profile?.status !== 'active' || profile.liveRevision !== approval.configRevision) return;
    if (message.text === stagingDraftCase.input) {
        const queued = await tx.botInboundTask.createMany({ data: { shopId: channel.shopId, messageId: message.id, providerRunId: runtime.runId,
            conversationGeneration: conversation.generation, channelGeneration: channel.generation, botGeneration: profile.generation }, skipDuplicates: true });
        if (queued.count === 1) return;
    }
    await workForHandoff(tx, conversation, true);
}

type TaskKey = Pick<BotInboundTask, 'shopId' | 'messageId'>;
const taskWhere = ({ shopId, messageId }: TaskKey) => ({ shopId_messageId: { shopId, messageId } });

function readTask(tx: Prisma.TransactionClient, key: TaskKey) {
    return tx.botInboundTask.findUnique({ where: taskWhere(key), include: { message: { include: { conversation: {
        include: { channel: true, identity: { include: { customer: { select: { privacyErasedAt: true } } } } },
    } } } } });
}

type Task = NonNullable<Awaited<ReturnType<typeof readTask>>>;

function sameConversation(row: Task) {
    const { message, conversationGeneration, channelGeneration } = row;
    const { conversation } = message;
    return conversation.generation === conversationGeneration && conversation.channel.generation === channelGeneration &&
        conversation.status === 'open' && conversation.mode === 'bot' && conversation.lastInboundAt?.getTime() === message.createdAt.getTime() &&
        message.origin === 'provider' && message.direction === 'inbound' && message.senderKind === 'customer' &&
        !message.redactedAt && !conversation.identity.customer.privacyErasedAt;
}

async function eligible(tx: Prisma.TransactionClient, row: Task, auth: AuthConfig, provider?: ApprovedEvaluationConfig) {
    const { message, shopId } = row;
    if (!sameConversation(row) || !fresh(message) || message.text !== stagingDraftCase.input) return null;
    const { channel, identity } = message.conversation;
    const bot = await liveBotSnapshot(tx, shopId, row.botGeneration, auth, provider);
    const runtime = bot?.runtime;
    if (!bot || !runtime || !bot.shop.defaultWarehouseId || runtime.runtime.runId !== row.providerRunId || channel.provider !== 'messenger' ||
        channel.pageId !== runtime.runtime.pageId || identity.channel !== channel.provider || identity.pageId !== channel.pageId ||
        identity.externalId !== runtime.runtime.senderId || !metaInboundPage(provider?.meta, channel)?.senderIds.has(identity.externalId)) return null;
    try {
        const scope = await requireShopAccess(tx, bot.actorId, shopId, 'bot.publish');
        if (!['orders.write', 'catalog.read', 'inventory.read'].every(permission => scope.permissions.includes(permission))) return null;
        return { bot, runtime, scope, warehouseId: bot.shop.defaultWarehouseId };
    } catch (error) {
        if (error instanceof ForbiddenException || error instanceof NotFoundException) return null;
        throw error;
    }
}

async function finish(tx: Prisma.TransactionClient, row: Task, outcome: string) {
    if (sameConversation(row)) await workForHandoff(tx, row.message.conversation, true);
    await tx.botInboundTask.update({ where: taskWhere(row), data: { finishedAt: new Date(), outcome } });
}

async function channelTokensAvailable(tx: Prisma.TransactionClient, shopId: string, channelId: string, now: Date,
    timezone: string, reservedTokens: number, limit: number) {
    const day = localAccountingDate(now, timezone);
    const [usage] = await tx.$queryRaw<{ tokens: bigint; includesUnmeteredRun: boolean }[]>`
        SELECT COALESCE(SUM(t.reserved_tokens), 0) AS tokens,
               COUNT(*) FILTER (WHERE t.reserved_tokens IS NULL) > 0 AS "includesUnmeteredRun"
        FROM bot_inbound_tasks t
        JOIN channel_messages m ON m.shop_id = t.shop_id AND m.id = t.message_id
        JOIN channel_conversations c ON c.shop_id = m.shop_id AND c.id = m.conversation_id
        WHERE t.shop_id = ${shopId}::uuid AND c.channel_id = ${channelId}::uuid
          AND t.external_started_at >= (${day}::date::timestamp AT TIME ZONE ${timezone})
          AND t.external_started_at < ((${day}::date + 1)::timestamp AT TIME ZONE ${timezone})
    `;
    // An attempt started before the migration still counts against today's approved cap.
    return !usage.includesUnmeteredRun && usage.tokens + BigInt(reservedTokens) <= BigInt(limit);
}

export async function processStagedBotInbound(db: PrismaClient, auth: AuthConfig, provider?: ApprovedEvaluationConfig, request = fetch) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - recoveryMs);
    const key = await db.botInboundTask.findFirst({ where: { finishedAt: null, providerRunId: { not: null },
        OR: [{ externalStartedAt: null }, { externalStartedAt: { lte: cutoff } }] },
    select: { shopId: true, messageId: true }, orderBy: [{ createdAt: 'asc' }, { messageId: 'asc' }] });
    if (!key) return;

    const prepared = await serializable(db, async tx => {
        const row = await readTask(tx, key);
        if (!row?.providerRunId || row.finishedAt) return null;
        if (row.externalStartedAt) {
            if (row.externalStartedAt <= cutoff) await finish(tx, row, 'provider_unknown');
            return null;
        }
        const ready = await eligible(tx, row, auth, provider);
        if (!ready) { await finish(tx, row, 'stale_staging_scope'); return null; }
        const { bot, runtime, scope } = ready;
        const { reservedTokens, maxDailyChannelTokens } = runtime.runtime;
        if (!await channelTokensAvailable(tx, row.shopId, row.message.conversation.channelId, now,
            bot.shop.timezone, reservedTokens, maxDailyChannelTokens)) {
            await finish(tx, row, 'channel_token_limit');
            return null;
        }
        if (!await reserveAiUsage(tx, bot.shop, bot.revision.dailyBudget, now, new ExactDecimal(runtime.runtime.reservedAmount))) {
            await finish(tx, row, 'budget_limit');
            return null;
        }
        await tx.botInboundTask.update({ where: taskWhere(row), data: { externalStartedAt: now, reservedTokens } });
        await recordAudit(tx, { shopId: row.shopId, actorId: bot.actorId, requestId: row.messageId, action: 'startStagingAi', resourceType: 'message',
            resourceId: row.messageId, metadata: { ...bot.auditContext, permissionVersion: scope.permissionVersion,
                runId: row.providerRunId, capUsd: runtime.runtime.maxUsd, currency: runtime.runtime.currency,
                reservedAmount: runtime.runtime.reservedAmount, reservedTokens, maxDailyChannelTokens,
                resourceVersion: row.message.version, result: 'started' } });
        return { runId: row.providerRunId, plan: runtime.plan, key: runtime.key };
    }, true);
    if (!prepared) return;

    let outcome = 'provider_failed';
    try {
        const result = await evaluateStagingDraft(prepared.plan, prepared.key, prepared.runId, entry => serializable(db, async tx => {
            const row = await readTask(tx, key);
            if (!row || row.finishedAt) throw new StagingAiError('STAGING_SCOPE_CHANGED');
            const current = await eligible(tx, row, auth, provider);
            if (!current) throw new StagingAiError('STAGING_SCOPE_CHANGED');
            await recordAudit(tx, { shopId: row.shopId, actorId: current.bot.actorId, requestId: row.messageId,
                action: 'observeStagingAi', resourceType: 'message', resourceId: row.messageId,
                metadata: { runId: prepared.runId, ...entry, ...current.bot.auditContext, permissionVersion: current.scope.permissionVersion,
                    resourceVersion: row.message.version, result: entry.phase } });
        }, true), request);
        if (result.passed) outcome = 'draft_proposal';
    } catch (error) {
        if (!(error instanceof StagingAiError)) throw error;
        if (error.code === 'STAGING_SCOPE_CHANGED') outcome = 'stale_staging_scope';
        if (error.code === 'PROVIDER_RESULT_UNKNOWN') outcome = 'provider_unknown';
    }

    await serializable(db, async tx => {
        const row = await readTask(tx, key);
        if (!row || row.finishedAt) return;
        if (outcome !== 'draft_proposal') return finish(tx, row, outcome);
        const current = await eligible(tx, row, auth, provider);
        if (!current) return finish(tx, row, 'stale_staging_scope');
        const { bot, warehouseId, scope } = current;
        const result = await proposeSalesDraft(tx, bot.shop, bot.revision.maxToolSteps, scope.permissions, stagingDraftIntent);
        if (!result.draft) return finish(tx, row, result.code);
        await recordInboundDraft(tx, auth, { actorId: bot.actorId, messageId: row.messageId, conversation: row.message.conversation, warehouseId,
            auditContext: { ...bot.auditContext, permissionVersion: scope.permissionVersion }, proposal: result.draft, providerRunId: prepared.runId });
        return finish(tx, row, outcome);
    }, true);
}
