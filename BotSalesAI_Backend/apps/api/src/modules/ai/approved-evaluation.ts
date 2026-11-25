import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { readCleanReleaseManifestHash } from '../../config.js';
import type { AiConnection, BotRevision, Evaluation, Prisma } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { metaNumericId, type MetaInboundConfig } from '../channels/index.js';
import { botContext, botShop, botState, type BotShop } from './bot-data.js';
import { openAiTarget, readOpenAiCredential, type OpenAiConnectionConfig } from './openai-connections.js';
import { jsonObject } from './openai-transport.js';
import { approvedUsd, stagingAiDataset, stagingAiPlan, stagingDraftMaxUsd } from './staging-evaluation.js';

export const approvedDatasetVersion = 'botsales-staging-ai-v1';
const digestPattern = /^[a-f0-9]{64}$/;
const invalidApproval = () => new Error('Invalid staging AI evaluation approval or release manifest');

function runtimeApproval(source: unknown, plan: ReturnType<typeof stagingAiPlan>) {
    const value = jsonObject(source);
    if (!value || Object.keys(value).length !== (Object.hasOwn(value, 'maxDailyChannelTokens') ? 7 : 6)) throw invalidApproval();
    const { runId, pageId, senderId, maxUsd, currency, reservedAmount } = value;
    const reservedTokens = plan.approval.maxInputTokens * 2 + plan.approval.maxOutputTokens;
    const maxDailyChannelTokens = Object.hasOwn(value, 'maxDailyChannelTokens') ? value.maxDailyChannelTokens : reservedTokens;
    if (typeof runId !== 'string' || !validUuid(runId) || runId.toLowerCase() === plan.approval.runId ||
        typeof pageId !== 'string' || !metaNumericId.test(pageId) || typeof senderId !== 'string' || !metaNumericId.test(senderId) ||
        pageId === senderId || !approvedUsd(maxUsd) || typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency) ||
        typeof reservedAmount !== 'string' || !/^(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,18})?$/.test(reservedAmount) ||
        !new ExactDecimal(reservedAmount).gt(0) || stagingDraftMaxUsd(plan).gt(maxUsd) ||
        typeof maxDailyChannelTokens !== 'number' || !Number.isSafeInteger(maxDailyChannelTokens) ||
        maxDailyChannelTokens < 1 || maxDailyChannelTokens > 2147483647) throw invalidApproval();
    return { runId: runId.toLowerCase(), pageId, senderId, maxUsd, currency, reservedAmount, reservedTokens, maxDailyChannelTokens };
}

export function parseAiEvaluationApproval(bytes: Buffer, approvedHash: string | undefined, releaseManifestHash: string | undefined) {
    if (bytes.length > 8192 || !approvedHash || createHash('sha256').update(bytes).digest('hex') !== approvedHash || !releaseManifestHash) {
        throw invalidApproval();
    }
    try {
        const value = jsonObject(JSON.parse(bytes.toString('utf8')));
        if (!value || Object.keys(value).length !== (Object.hasOwn(value, 'runtime') ? 6 : 5)) throw invalidApproval();
        const { shopId, configRevision, configHash, policyVersion } = value;
        if (typeof shopId !== 'string' || !validUuid(shopId) || typeof configRevision !== 'number' || !Number.isInteger(configRevision) || configRevision < 1 ||
            configRevision > 2147483647 || typeof configHash !== 'string' || !digestPattern.test(configHash) ||
            typeof policyVersion !== 'string' || !policyVersion || policyVersion.length > 100 || policyVersion.includes('\0')) throw invalidApproval();
        const plan = stagingAiPlan(value.run, Date.now(), true);
        if (plan.approval.releaseManifestSha256 !== releaseManifestHash) throw invalidApproval();
        return { shopId: shopId.toLowerCase(), configRevision, configHash, policyVersion, approvedHash, plan,
            runtime: Object.hasOwn(value, 'runtime') ? runtimeApproval(value.runtime, plan) : undefined };
    } catch {
        throw invalidApproval();
    }
}

export type AiEvaluationApproval = ReturnType<typeof parseAiEvaluationApproval>;
export type ApprovedEvaluationConfig = { openAi?: OpenAiConnectionConfig; approval?: AiEvaluationApproval; meta?: MetaInboundConfig };

export function readAiEvaluationApproval(env: NodeJS.ProcessEnv, manifestHash?: string) {
    const { BOTSALES_AI_EVALUATION_APPROVAL_FILE: file, BOTSALES_AI_EVALUATION_APPROVAL_SHA256: hash } = env;
    if (!file && !hash) return undefined;
    if (!file || !isAbsolute(file) || env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw invalidApproval();
    try { return parseAiEvaluationApproval(readFileSync(file), hash, manifestHash ?? readCleanReleaseManifestHash()); }
    catch { throw invalidApproval(); }
}

function checkedConnection(shopId: string, connection: AiConnection | null, openAi?: OpenAiConnectionConfig) {
    if (!openAi || !connection || connection.status !== 'connected' || !connection.lastCheckedAt || connection.deletedAt) return null;
    const grant = openAiTarget(openAi, shopId, connection);
    const key = grant && readOpenAiCredential(openAi, grant, connection);
    return grant && key ? { grant, key } : null;
}

async function checkedDraft(tx: Prisma.TransactionClient, shopId: string, openAi?: OpenAiConnectionConfig) {
    const { revision } = await botState(tx, shopId);
    if (!revision || revision.publishedAt) throw new ConflictException('Cần bản nháp có kết nối OpenAI đã kiểm.');
    const connection = checkedConnection(shopId, revision.connection, openAi);
    if (!connection) throw new ConflictException('Quyền OpenAI của bản nháp đã đổi.');
    const shop = await botShop(tx, shopId);
    const context = await botContext(tx, shop, revision);
    if (!context.current) throw new ConflictException('Cấu hình hoặc nguồn của bản nháp cần kiểm lại.');
    const binding = { shopId, configRevision: revision.revision, configHash: context.contentHash, policyVersion: shop.policyVersion };
    return { binding, ...connection };
}

export async function describeAiEvaluationDraft(tx: Prisma.TransactionClient, shopId: string, openAi?: OpenAiConnectionConfig) {
    const { binding, grant } = await checkedDraft(tx, shopId, openAi);
    const { projectId, region, model } = grant;
    return { ...binding, projectId, region, model, datasetVersion: approvedDatasetVersion };
}

export async function approvedEvaluationDraft(tx: Prisma.TransactionClient, shopId: string, configRevision: number,
    config: ApprovedEvaluationConfig | undefined) {
    const approval = config?.approval;
    if (!approval || approval.shopId !== shopId || approval.plan.expires <= Date.now()) {
        throw new UnprocessableEntityException('Thiếu phê duyệt đánh giá còn hiệu lực cho shop.');
    }
    const { binding, grant, key } = await checkedDraft(tx, shopId, config?.openAi);
    const { projectId, region, model, runId } = approval.plan.approval;
    if (configRevision !== binding.configRevision || approval.configRevision !== configRevision || approval.configHash !== binding.configHash ||
        approval.policyVersion !== binding.policyVersion || projectId !== grant.projectId || region !== grant.region || model !== grant.model) {
        throw new ConflictException('Phê duyệt không khớp bản nháp hoặc phạm vi OpenAI hiện tại.');
    }
    return { approval, binding, key, runId };
}

export async function approvedRuntimeBot(tx: Prisma.TransactionClient, shop: BotShop, revision: BotRevision & { connection: AiConnection | null },
    evaluation: Evaluation, config?: ApprovedEvaluationConfig) {
    const approval = config?.approval;
    const runtime = approval?.runtime;
    const page = runtime && config?.meta?.pages.get(runtime.pageId);
    if (!shop.businessCountry || !approval || !runtime || approval.shopId !== shop.id || approval.plan.expires <= Date.now() || runtime.currency !== shop.currency ||
        page?.shopId !== shop.id || !page.senderIds.has(runtime.senderId) ||
        approval.configRevision !== revision.revision || approval.policyVersion !== shop.policyVersion || revision.maxToolSteps < 2 ||
        evaluation.fixture || evaluation.knowledgeRevisionId || evaluation.datasetVersion !== approvedDatasetVersion ||
        evaluation.status !== 'passed' || evaluation.totalCases !== stagingAiDataset().cases.length + 5 || evaluation.passedCases !== evaluation.totalCases ||
        evaluation.criticalFailures || evaluation.configRevision !== revision.revision || evaluation.configHash !== approval.configHash ||
        evaluation.policyVersion !== shop.policyVersion || evaluation.approvalRunId !== approval.plan.approval.runId || !evaluation.reportJobId) return null;
    const connection = checkedConnection(shop.id, revision.connection, config?.openAi);
    const { projectId, model, region } = approval.plan.approval;
    if (!connection || connection.grant.projectId !== projectId || connection.grant.model !== model || connection.grant.region !== region) return null;
    const report = await tx.job.findUnique({ where: { shopId_id: { shopId: shop.id, id: evaluation.reportJobId } }, select: { status: true, input: true } });
    if (report?.status !== 'succeeded' || jsonObject(report.input)?.approvalHash !== approval.approvedHash) return null;
    const context = await botContext(tx, shop, revision);
    if (!context.current || context.contentHash !== approval.configHash) return null;
    return { context, runtime, plan: approval.plan, key: connection.key };
}
