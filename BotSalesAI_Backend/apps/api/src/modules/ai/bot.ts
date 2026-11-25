import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { BotStatus, EvaluationStatus, type Command, type Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { DomainConflict } from '../../http/contracts.js';
import { listQuery, paging, validUuid } from '../../http/query.js';
import { requireIfMatch, requireVersion } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { commandDto, type ResourceRef } from '../../platform/commands/index.js';
import { scheduleJob, type JobHandler } from '../../platform/jobs/index.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { salesAutomationState } from '../operations/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig, type ShopScope } from '../workspace/index.js';
import { approvedRuntimeBot, type ApprovedEvaluationConfig } from './approved-evaluation.js';
import { activePublishedBot, appendBotRevision, botAuditContext, botRevisionAt, botRevisionInShop, botRevisionView, botShop, botState, botView, currentBotRevision, draftFields, initializeBot,
    type ConfigDraft } from './bot-data.js';
import { aiKey } from './connections.js';
import { budgetHandoff, hasAiBudget, playgroundResult, reserveAiUsage, runFixtureTools } from './engine.js';
import { datasetVersion, evaluationDetails, evaluationInShop, evaluationSnapshot, evaluationView, unavailableEvaluationJobStates,
    type EvaluationInput } from './evaluation.js';
import { aiFixtureEnabled } from './fixture-provider.js';

export type Reason = { expectedVersion: number; reason: string };
export type PublishBot = Reason & { draftRevision: number; evaluationRunId: string };
export type Playground = { configRevision: number; text: string; customerContextId: string | null };
const actions = {
    updateBotDraft: { permission: 'bot.configure', resourceType: 'bot_config' },
    restoreBotRevision: { permission: 'bot.configure', resourceType: 'bot_revision' },
    runPlayground: { permission: 'bot.configure', resourceType: 'playground_run' },
    createEvaluation: { permission: 'bot.configure', resourceType: 'evaluation' },
    publishBotConfig: { permission: 'bot.publish', resourceType: 'job' },
    pauseBot: { permission: 'bot.publish', resourceType: 'bot_config' },
} as const;
type Action = keyof typeof actions;
export const botCommands = (Object.keys(actions) as Action[]).map(operationId => ({ operationId, resourceType: actions[operationId].resourceType }));
const audit = (tx: Prisma.TransactionClient, scope: ShopScope, requestId: string, operationId: Action, id: string, metadata: Prisma.InputJsonObject) =>
    recordAudit(tx, { shopId: scope.shopId, actorId: scope.userId, requestId, action: operationId,
        resourceType: actions[operationId].resourceType, resourceId: id, metadata });

function reasonText(input: string, minimum: number) {
    const reason = input.trim();
    if (reason.length < minimum || reason.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
    return reason;
}

async function configView(tx: Prisma.TransactionClient, shopId: string) {
    const shop = await botShop(tx, shopId);
    const { profile, revision } = await botState(tx, shopId);
    const view = botView(shop, profile, revision);
    const { paused, automationVersion, automationPaused } = await salesAutomationState(tx, shopId);
    return { ...view, status: paused ? 'paused' : view.status, automationVersion, automationPaused };
}

async function publicationEvidence(tx: Prisma.TransactionClient, shopId: string, input: PublishBot, config?: AuthConfig,
    provider?: ApprovedEvaluationConfig) {
    const profile = await tx.botConfig.findUnique({ where: { shopId } });
    if (!profile) throw new ConflictException();
    requireVersion(profile.version, input.expectedVersion);
    if (profile.draftRevision !== input.draftRevision) throw new ConflictException();
    const evaluation = await evaluationInShop(tx, shopId, input.evaluationRunId);
    const budgetConflict = () => new DomainConflict('BUDGET_EXCEEDED', 'Ngân sách hiệu lực không đủ cho một lượt chạy AI. Kiểm tra giới hạn và mức đã dùng trong ngày.');
    if (!evaluation.fixture) {
        const revision = await botRevisionAt(tx, shopId, input.draftRevision);
        const shop = await botShop(tx, shopId);
        if (!shop.businessCountry) {
            throw new DomainConflict('BUSINESS_COUNTRY_REQUIRED', 'Cần khai báo quốc gia kinh doanh trước khi chạy thử bot trên Messenger.');
        }
        const approved = revision && !revision.publishedAt ? await approvedRuntimeBot(tx, shop, revision, evaluation, provider) : null;
        if (!revision || !approved) {
            throw new ConflictException('Cần phê duyệt chạy thử Messenger và đánh giá đúng bản nháp.');
        }
        if (!await hasAiBudget(tx, shop, revision.dailyBudget, new Date(), new ExactDecimal(approved.runtime.reservedAmount))) throw budgetConflict();
        return { profile, revision, evaluation };
    }
    const { shop, revision, context } = await currentBotRevision(tx, shopId, input.draftRevision, config);
    if (revision.publishedAt || evaluation.datasetVersion !== datasetVersion || evaluation.knowledgeRevisionId ||
        evaluation.status !== 'passed' || evaluation.totalCases < 1 || evaluation.passedCases !== evaluation.totalCases || evaluation.criticalFailures ||
        evaluation.configRevision !== revision.revision || evaluation.configHash !== context.contentHash || evaluation.policyVersion !== shop.policyVersion) {
        throw new ConflictException('Cần đánh giá đạt của cấu hình và chính sách hiện tại.');
    }
    if (!await hasAiBudget(tx, shop, revision.dailyBudget, new Date())) throw budgetConflict();
    return { profile, revision, evaluation };
}

export class BotService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig, private readonly provider?: ApprovedEvaluationConfig) {}

    configView(headers: IncomingHttpHeaders, shopId: string) {
        return this.read(headers, shopId, async tx => {
            const view = await configView(tx, shopId);
            const active = view.status === 'active' && this.provider?.approval?.shopId === shopId
                ? await activePublishedBot(tx, shopId, this.config, this.provider) : null;
            const runtime = active?.runtime?.runtime;
            return { ...view, providerPolicy: {
                failover: 'disabled',
                channelTokenBudget: runtime ? { channel: 'facebook_messenger', dailyLimit: runtime.maxDailyChannelTokens } : null,
            } };
        });
    }

    update(headers: IncomingHttpHeaders, shopId: string, patch: Partial<ConfigDraft>, requestId: string) {
        const version = requireIfMatch(headers);
        return this.change(headers, shopId, 'updateBotDraft', { patch, version }, async (tx, scope) => {
            const shop = await botShop(tx, shopId);
            const profile = await initializeBot(tx, shop);
            requireVersion(profile.version, version);
            const previous = await botRevisionAt(tx, shopId, profile.draftRevision);
            const revision = await appendBotRevision(tx, profile, shop, await draftFields(tx, shop, previous, patch));
            await audit(tx, scope, requestId, 'updateBotDraft', shopId, { revision: revision.revision, version: profile.version + 1 });
            await enqueueResourceUpdate(tx, 'bot.config.updated', { shopId, id: shopId, version: profile.version + 1 });
            return shopId;
        }, tx => configView(tx, shopId));
    }

    revisions(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (tx, scope) => {
            const query = listQuery(raw);
            if (query.status && !Object.hasOwn(BotStatus, query.status)) throw new UnprocessableEntityException();
            const page = paging(query, ['bot_revisions', shopId, scope.userId, String(scope.permissionVersion)]);
            const profile = await tx.botConfig.findUnique({ where: { shopId } });
            if (!profile) return page.result([]);
            const search = query.q?.trim();
            const number = search && /^#?[1-9][0-9]{0,9}$/.test(search) ? Number(search.replace('#', '')) : 0;
            const live = profile.liveRevision ?? 0;
            const result = page.result(await tx.botRevision.findMany({
                where: { shopId, ...(query.status === 'draft' ? { NOT: { revision: live } } :
                    query.status ? { revision: query.status === profile.status ? live : 0 } : {}),
                    AND: [page.keyword ? { OR: [{ instructions: { contains: page.keyword, mode: 'insensitive' } },
                        ...(search && validUuid(search) ? [{ id: search }] : []),
                        ...(number && number <= 2147483647 ? [{ revision: number }] : [])] } : {}, page.after ?? {}],
                },
                orderBy: page.orderBy, take: page.limit + 1,
            }));
            return { ...result, data: result.data.map(row => botRevisionView(profile, row)) };
        });
    }

    revision(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, async tx => {
            const source = await botRevisionInShop(tx, shopId, id);
            return botRevisionView(source.bot, source);
        });
    }

    restore(headers: IncomingHttpHeaders, shopId: string, id: string, input: Reason, requestId: string) {
        const reason = reasonText(input.reason, 3);
        return this.change(headers, shopId, 'restoreBotRevision', { id, expectedVersion: input.expectedVersion, reason }, async (tx, scope) => {
            const source = await botRevisionInShop(tx, shopId, id);
            requireVersion(source.bot.version, input.expectedVersion);
            const shop = await botShop(tx, shopId);
            const revision = await appendBotRevision(tx, source.bot, shop, await draftFields(tx, shop, source, {}));
            await audit(tx, scope, requestId, 'restoreBotRevision', revision.id, { sourceRevision: source.revision, revision: revision.revision, reason });
            await enqueueResourceUpdate(tx, 'bot.config.updated', { shopId, id: shopId, version: source.bot.version + 1 });
            return revision.id;
        }, async (tx, result) => {
            const row = await botRevisionInShop(tx, shopId, result.id);
            return botRevisionView(row.bot, row);
        });
    }

    playground(headers: IncomingHttpHeaders, shopId: string, input: Playground, requestId: string) {
        return this.change(headers, shopId, 'runPlayground', input, async (tx, scope, config) => {
            if (!aiFixtureEnabled(config)) throw new UnprocessableEntityException();
            const { profile } = await botState(tx, shopId);
            if (!profile || profile.draftRevision !== input.configRevision) throw new ConflictException('Phòng thử dùng bản nháp hiện tại.');
            const { shop, revision, context } = await currentBotRevision(tx, shopId, input.configRevision, config);
            const live = profile.status === 'active' && profile.liveRevision ? await botRevisionAt(tx, shopId, profile.liveRevision) : null;
            const budget = live?.dailyBudget && revision.dailyBudget?.gt(live.dailyBudget) ? live.dailyBudget : revision.dailyBudget;
            const charged = await reserveAiUsage(tx, shop, budget, new Date());
            const result = charged ? await runFixtureTools(tx, shop, revision, context.knowledge, scope.permissions, input) : budgetHandoff();
            const output = playgroundResult(shop, revision, context.contentHash, result, charged);
            const run = await tx.playgroundRun.create({ data: { shopId, revisionId: revision.id, output } });
            await audit(tx, scope, requestId, 'runPlayground', run.id, { revision: revision.revision, configHash: context.contentHash, charged, code: result.code });
            return run.id;
        }, async (tx, result) => (await tx.playgroundRun.findUniqueOrThrow({ where: aiKey(shopId, result.id) })).output);
    }

    evaluations(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (tx, scope) => {
            const query = listQuery(raw);
            if (query.status && !Object.hasOwn(EvaluationStatus, query.status)) throw new UnprocessableEntityException();
            const page = paging(query, ['evaluations', shopId, scope.userId, String(scope.permissionVersion)]);
            const id = query.q?.trim();
            const active = { status: 'queued', reportJob: { status: 'running' } } satisfies Prisma.EvaluationWhereInput;
            const failed = { status: 'queued', reportJob: { status: { in: unavailableEvaluationJobStates } } } satisfies Prisma.EvaluationWhereInput;
            const status: Prisma.EvaluationWhereInput = query.status === 'running' ? active : query.status === 'error'
                ? { OR: [{ status: 'error' }, failed] } : query.status === 'queued'
                    ? { status: 'queued', NOT: [active, failed] } : { status: query.status as EvaluationStatus | undefined };
            const result = page.result(await tx.evaluation.findMany({
                where: { shopId, AND: [status, page.after ?? {}, page.keyword ? { OR: [
                    { datasetVersion: { contains: page.keyword, mode: 'insensitive' } }, ...(id && validUuid(id) ? [{ id }] : []),
                ] } : {}] },
                orderBy: page.orderBy, take: page.limit + 1, include: evaluationDetails,
            }));
            return { ...result, data: result.data.map(evaluationView) };
        });
    }

    evaluation(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, async tx => evaluationView(await evaluationInShop(tx, shopId, id)));
    }

    evaluate(headers: IncomingHttpHeaders, shopId: string, input: EvaluationInput, requestId: string) {
        return this.change(headers, shopId, 'createEvaluation', input, async (tx, scope, config) => {
            const { approvalHash, ...snapshot } = await evaluationSnapshot(tx, shopId, input, config, this.provider);
            const row = await tx.evaluation.create({ data: { shopId, ...input, ...snapshot } });
            const job = await scheduleJob(tx, { shopId, actorId: scope.userId, sourceOperation: 'createEvaluation', kind: 'evaluation',
                input: { id: row.id, ...(approvalHash ? { approvalHash } : {}) } });
            await tx.evaluation.update({ where: aiKey(shopId, row.id), data: { reportJobId: job.id } });
            await audit(tx, scope, requestId, 'createEvaluation', row.id, { configRevision: row.configRevision, jobId: job.id, datasetVersion: row.datasetVersion,
                ...(approvalHash ? { approvalHash, approvalRunId: row.approvalRunId } : {}) });
            return row.id;
        }, async (tx, result) => evaluationView(await evaluationInShop(tx, shopId, result.id)));
    }

    publish(headers: IncomingHttpHeaders, shopId: string, input: PublishBot, requestId: string) {
        const reason = reasonText(input.reason, 5);
        return this.change(headers, shopId, 'publishBotConfig', { ...input, reason }, async (tx, scope, config, command) => {
            const { revision, evaluation } = await publicationEvidence(tx, shopId, input, config, this.provider);
            if (!evaluation.fixture) await requireShopAccess(tx, scope.userId, shopId, 'orders.write');
            const job = await scheduleJob(tx, { shopId, actorId: scope.userId, commandId: command.id,
                sourceOperation: 'publishBotConfig', kind: 'evaluation', input: { ...input, reason, requestId } });
            await audit(tx, scope, requestId, 'publishBotConfig', job.id, {
                ...botAuditContext(evaluation.policyVersion, revision, evaluation.configHash),
                revision: revision.revision, evaluationRunId: input.evaluationRunId, reason,
                actorKind: 'user', permissionVersion: scope.permissionVersion, result: 'accepted',
            });
            return job.id;
        }, (_tx, _result, command) => Promise.resolve(commandDto(command, 'job')), true);
    }

    pause(headers: IncomingHttpHeaders, shopId: string, input: Reason, requestId: string) {
        const reason = reasonText(input.reason, 5);
        return this.change(headers, shopId, 'pauseBot', { ...input, reason }, async (tx, scope) => {
            const previous = await initializeBot(tx, await botShop(tx, shopId));
            requireVersion(previous.version, input.expectedVersion);
            if (previous.status === 'paused') throw new ConflictException();
            const updated = await tx.botConfig.update({ where: { shopId }, data: { status: 'paused', generation: { increment: 1 }, version: { increment: 1 } } });
            await audit(tx, scope, requestId, 'pauseBot', shopId, { reason, generation: updated.generation, version: updated.version });
            await enqueueResourceUpdate(tx, 'bot.config.updated', { shopId, id: shopId, version: updated.version });
            return shopId;
        }, async (_tx, _result, command) => commandDto(command, 'bot_config'));
    }

    private read<T>(headers: IncomingHttpHeaders, shopId: string, collect: (tx: Prisma.TransactionClient, scope: ShopScope) => Promise<T>) {
        return readAsSession(this.db, headers, async (tx, userId) => collect(tx, await requireShopAccess(tx, userId, shopId, 'bot.read')));
    }

    private change<T>(headers: IncomingHttpHeaders, shopId: string, operationId: Action, payload: Prisma.InputJsonValue,
        apply: (tx: Prisma.TransactionClient, scope: ShopScope, config: AuthConfig, command: Pick<Command, 'id'>) => Promise<string>,
        result: (tx: Prisma.TransactionClient, ref: ResourceRef, command: Command) => Promise<T>, deferred = false) {
        const { permission, resourceType } = actions[operationId];
        return writeShopCommand(this.db, this.config, { headers, shopId, operationId, permission, payload, deferred },
            async (tx, scope, config, command) => ({ type: resourceType, id: await apply(tx, scope, config, command) }),
            (tx, _scope, ref, command) => {
                if (ref.type !== resourceType) throw new ConflictException();
                return result(tx, ref, command);
            });
    }
}

export function publishBotHandler(config?: AuthConfig, provider?: ApprovedEvaluationConfig): JobHandler {
    return async job => async tx => {
        const input = job.input as PublishBot & { requestId: string };
        let evidence: Awaited<ReturnType<typeof publicationEvidence>>;
        try {
            evidence = await publicationEvidence(tx, job.shopId, input, config, provider);
            if (!evidence.evaluation.fixture) await requireShopAccess(tx, job.actorId, job.shopId, 'orders.write');
        } catch (error) {
            const status = (error as { getStatus?: () => number }).getStatus?.();
            if (!status || ![403, 404, 409, 412, 422].includes(status)) throw error;
            return { status: 'failed', completed: 0, total: 1, errorCount: 1,
                rowErrors: [{ row: 1, field: 'evaluation', code: 'BOT_PUBLICATION_STALE', message: 'Cấu hình hoặc bằng chứng đã đổi.' }] };
        }
        const { profile, revision, evaluation } = evidence;
        const shopId = job.shopId;
        const publishedAt = new Date();
        await tx.botRevision.update({ where: aiKey(shopId, revision.id), data: {
            publishedAt, evaluationId: evaluation.id, approvedBy: job.actorId, version: { increment: 1 },
        } });
        await tx.botConfig.update({ where: { shopId }, data: { liveRevision: revision.revision, status: 'active',
            publishedAt, version: { increment: 1 }, generation: { increment: 1 } } });
        await enqueueResourceUpdate(tx, 'bot.config.updated', { shopId, id: shopId, version: profile.version + 1 });
        await recordAudit(tx, { shopId, actorId: job.actorId, requestId: input.requestId, action: 'botConfigPublished', resourceType: 'bot_config',
            resourceId: shopId, metadata: {
                ...botAuditContext(evaluation.policyVersion, revision, evaluation.configHash), actorKind: 'user',
                revision: revision.revision, evaluationRunId: evaluation.id, reason: input.reason,
                resourceVersion: profile.version + 1, result: 'published',
            } });
        return { status: 'succeeded', completed: 1, total: 1, errorCount: 0, result: { type: 'bot_config', id: shopId } };
    };
}
