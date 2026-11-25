import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { AiConnection, BotConfig, BotRevision, Prisma } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { DomainConflict } from '../../http/contracts.js';
import { financeMoney, parseMoney, type Money } from '../finance/index.js';
import { assignedKnowledge } from '../knowledge/index.js';
import { salesAutomationAllowed } from '../operations/index.js';
import type { AuthConfig } from '../workspace/index.js';
import { approvedRuntimeBot, type ApprovedEvaluationConfig } from './approved-evaluation.js';
import { aiConnectionInShop, aiConnectionReady, aiKey, connectionCapabilities } from './connections.js';

export type ConfigDraft = {
    connectionId: string; instructions: string; knowledgeRevisionIds: string[]; maxToolSteps: number; dailyBudget: Money;
    requireHumanOrderConfirmation: true;
};
const initial = { connectionId: null, instructions: '', knowledgeRevisionIds: [] as string[], maxToolSteps: 0, dailyBudget: null };
export const botSelect = { id: true, currency: true, timezone: true, policyVersion: true, createdAt: true, defaultWarehouseId: true } satisfies Prisma.ShopSelect;
export type BotShop = Prisma.ShopGetPayload<{ select: typeof botSelect }>;
type DraftFields = Pick<BotRevision, 'connectionId' | 'instructions' | 'knowledgeRevisionIds' | 'maxToolSteps' | 'dailyBudget'>;

export async function botShop(tx: Prisma.TransactionClient, shopId: string) {
    return tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: botSelect });
}

export async function botRevisionAt(tx: Prisma.TransactionClient, shopId: string, revision: number) {
    if (!Number.isInteger(revision) || revision < 1 || revision > 2147483647) return null;
    return tx.botRevision.findUnique({ where: { shopId_revision: { shopId, revision } }, include: { connection: true } });
}

export async function botState(tx: Prisma.TransactionClient, shopId: string) {
    const profile = await tx.botConfig.findUnique({ where: { shopId } });
    const revision = profile ? await botRevisionAt(tx, shopId, profile.draftRevision) : null;
    return { profile, revision };
}

export async function initializeBot(tx: Prisma.TransactionClient, shop: BotShop) {
    const existing = await tx.botConfig.findUnique({ where: { shopId: shop.id } });
    if (existing) return existing;
    const profile = await tx.botConfig.create({ data: { shopId: shop.id, createdAt: shop.createdAt } });
    await tx.botRevision.create({ data: { shopId: shop.id, revision: 1, instructions: '', currency: shop.currency } });
    return profile;
}

function draftView(revision: DraftFields | null, currency: string) {
    const { dailyBudget, ...fields } = revision ? {
        connectionId: revision.connectionId, instructions: revision.instructions, knowledgeRevisionIds: revision.knowledgeRevisionIds,
        maxToolSteps: revision.maxToolSteps, dailyBudget: revision.dailyBudget,
    } : initial;
    return { ...fields, dailyBudget: dailyBudget ? financeMoney(dailyBudget, currency) : null, requireHumanOrderConfirmation: true };
}

export function botView(shop: BotShop, profile: BotConfig | null, revision: BotRevision | null) {
    return {
        id: shop.id, shopId: shop.id, version: profile?.version ?? 1, createdAt: profile?.createdAt ?? shop.createdAt,
        updatedAt: profile?.updatedAt ?? shop.createdAt, status: profile?.status ?? 'draft', draftRevision: profile?.draftRevision ?? 1,
        liveRevision: profile?.liveRevision ?? null, publishedAt: profile?.publishedAt ?? null, ...draftView(revision, shop.currency),
    };
}

export function botRevisionView(profile: BotConfig, revision: BotRevision) {
    return {
        id: revision.id, shopId: revision.shopId, version: revision.version, createdAt: revision.createdAt, updatedAt: revision.updatedAt,
        status: profile.liveRevision === revision.revision ? profile.status : 'draft', draftRevision: profile.draftRevision, liveRevision: profile.liveRevision,
        publishedAt: revision.publishedAt, revision: revision.revision, ...draftView(revision, revision.currency),
    };
}

export async function botRevisionInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    const index = /^[1-9][0-9]{0,9}$/.test(id) ? Number(id) : 0;
    if (!validUuid(id) && (!index || index > 2147483647)) throw new NotFoundException();
    const row = await tx.botRevision.findUnique({
        where: index ? { shopId_revision: { shopId, revision: index } } : aiKey(shopId, id), include: { bot: true },
    });
    if (!row) throw new NotFoundException();
    return row;
}

export async function draftFields(tx: Prisma.TransactionClient, shop: BotShop, previous: DraftFields | null, patch: Partial<ConfigDraft>) {
    const base = previous ?? initial;
    const connectionId = patch.connectionId ?? base.connectionId;
    const instructions = patch.instructions === undefined ? base.instructions : patch.instructions.trim();
    const knowledgeRevisionIds = patch.knowledgeRevisionIds ?? base.knowledgeRevisionIds;
    if ((patch.instructions !== undefined && !instructions) || instructions.includes(String.fromCharCode(0)) ||
        knowledgeRevisionIds.length > 50 || new Set(knowledgeRevisionIds).size !== knowledgeRevisionIds.length ||
        !knowledgeRevisionIds.every(validUuid)) throw new UnprocessableEntityException();
    if (connectionId) await aiConnectionInShop(tx, shop.id, connectionId);
    if ((await assignedKnowledge(tx, shop.id, knowledgeRevisionIds)).length !== knowledgeRevisionIds.length) {
        throw new UnprocessableEntityException('Cần chọn đúng phiên bản tri thức đang xuất bản trong shop.');
    }
    const dailyBudget = patch.dailyBudget === undefined ? base.dailyBudget : parseMoney(patch.dailyBudget, shop.currency, true);
    return { connectionId, instructions, knowledgeRevisionIds, maxToolSteps: patch.maxToolSteps ?? base.maxToolSteps, dailyBudget };
}

export async function appendBotRevision(tx: Prisma.TransactionClient, profile: BotConfig, shop: BotShop, fields: DraftFields) {
    const revision = await tx.botRevision.create({ data: {
        ...fields, shopId: shop.id, revision: profile.draftRevision + 1, currency: shop.currency,
    } });
    await tx.botConfig.update({ where: { shopId: shop.id }, data: { draftRevision: revision.revision, version: { increment: 1 } } });
    return revision;
}

function requiresUnsupportedTools(revision: BotRevision & { connection: AiConnection | null }) {
    return revision.maxToolSteps > 0 && revision.connection !== null && connectionCapabilities(revision.connection).toolCalling === 'unsupported';
}

export async function botContext(tx: Prisma.TransactionClient, shop: BotShop, revision: BotRevision & { connection: AiConnection | null }) {
    const knowledge = await assignedKnowledge(tx, shop.id, revision.knowledgeRevisionIds);
    const current = knowledge.length === revision.knowledgeRevisionIds.length && revision.currency === shop.currency &&
        Boolean(revision.instructions && revision.dailyBudget?.gt(0)) && !requiresUnsupportedTools(revision);
    const contentHash = createHash('sha256').update(JSON.stringify([
        shop.policyVersion, revision.id, revision.connection?.id, revision.connection?.version,
        revision.instructions, revision.maxToolSteps, revision.dailyBudget?.toFixed(), revision.currency,
        knowledge.map(row => [row.id, row.contentHash]),
    ])).digest('hex');
    return { current, contentHash, knowledge };
}

export async function modelContext(tx: Prisma.TransactionClient, shop: BotShop, revision: BotRevision & { connection: AiConnection | null }, auth?: AuthConfig) {
    const context = await botContext(tx, shop, revision);
    return { ...context, current: context.current && aiConnectionReady(revision.connection, auth) };
}

export async function currentBotRevision(tx: Prisma.TransactionClient, shopId: string, index: number, auth?: AuthConfig) {
    const revision = await botRevisionAt(tx, shopId, index);
    if (!revision) throw new NotFoundException();
    if (requiresUnsupportedTools(revision)) {
        throw new DomainConflict('AI_TOOL_CALLING_UNSUPPORTED', 'Kết nối đang chọn không hỗ trợ gọi công cụ cho cấu hình này.');
    }
    const shop = await botShop(tx, shopId);
    const context = await modelContext(tx, shop, revision, auth);
    if (!context.current) throw new ConflictException('Cấu hình, chính sách, kết nối hoặc tri thức cần được kiểm lại.');
    return { shop, revision, context };
}

export function botAuditContext(policyVersion: string, revision: BotRevision & { connection: AiConnection | null }, configHash: string | null) {
    return {
        policyVersion, configRevision: revision.revision, configHash, knowledgeRevisionIds: revision.knowledgeRevisionIds,
        connectionId: revision.connectionId, connectionVersion: revision.connection?.version ?? null,
    };
}

export type BotAgentAuditContext = ReturnType<typeof botAuditContext> & { actorKind: 'agent'; agentKind: 'sales_admin' };

export async function liveBotSnapshot(tx: Prisma.TransactionClient, shopId: string, generation: number, auth?: AuthConfig,
    provider?: ApprovedEvaluationConfig) {
    const profile = await tx.botConfig.findUnique({ where: { shopId } });
    if (profile?.status !== 'active' || profile.generation !== generation || !profile.liveRevision) return null;
    const revision = await botRevisionAt(tx, shopId, profile.liveRevision);
    if (!revision?.publishedAt || !revision.approvedBy || !revision.evaluationId) return null;
    const shop = await botShop(tx, shopId);
    const evaluation = await tx.evaluation.findUnique({ where: aiKey(shopId, revision.evaluationId) });
    if (!evaluation) return null;
    const runtime = evaluation.fixture ? undefined : await approvedRuntimeBot(tx, shop, revision, evaluation, provider);
    if (!evaluation.fixture && !runtime) return null;
    const context = runtime?.context ?? await modelContext(tx, shop, revision, auth);
    if (!context.current) return null;
    if (evaluation?.status !== 'passed' || evaluation.configHash !== context.contentHash || evaluation.policyVersion !== shop.policyVersion) return null;
    if (!await salesAutomationAllowed(tx, shopId, revision.approvedBy, revision.connectionId, shop.policyVersion, auth, Boolean(runtime))) return null;
    const auditContext: BotAgentAuditContext = {
        ...botAuditContext(shop.policyVersion, revision, context.contentHash), actorKind: 'agent', agentKind: 'sales_admin',
    };
    return { shop, revision, context, actorId: revision.approvedBy, runtime, auditContext };
}

export async function activePublishedBot(tx: Prisma.TransactionClient, shopId: string, auth?: AuthConfig, provider?: ApprovedEvaluationConfig) {
    const profile = await tx.botConfig.findUnique({ where: { shopId } });
    return profile?.status === 'active' ? liveBotSnapshot(tx, shopId, profile.generation, auth, provider) : null;
}
