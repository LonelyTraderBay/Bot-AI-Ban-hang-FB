import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { readCleanReleaseManifestHash, readDatabaseUrl, readReleaseManifestHash } from '../apps/api/dist/config.js';
import { validUuid } from '../apps/api/dist/http/query.js';
import { describeAiEvaluationDraft } from '../apps/api/dist/modules/ai/approved-evaluation.js';
import { readOpenAiConnectionConfig } from '../apps/api/dist/modules/ai/index.js';
import { runStagingAi, StagingAiError, stagingAiDataset, stagingAiPlan } from '../apps/api/dist/modules/ai/staging-evaluation.js';
import { createDatabaseClient } from '../apps/api/dist/platform/database/client.js';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

async function describeDraft(shopId) {
    if (!shopId || !validUuid(shopId)) throw new StagingAiError('SHOP_REQUIRED_FOR_EVALUATION_DRAFT');
    const releaseManifestSha256 = readCleanReleaseManifestHash();
    if (!releaseManifestSha256) throw new StagingAiError('CLEAN_STAGING_RELEASE_REQUIRED');
    const openAi = readOpenAiConnectionConfig(process.env);
    const db = createDatabaseClient(readDatabaseUrl(process.env));
    try {
        const draft = await db.$transaction(async tx => {
            await tx.$executeRaw`SET TRANSACTION READ ONLY`;
            return describeAiEvaluationDraft(tx, shopId.toLowerCase(), openAi);
        });
        return { status: 'EVALUATION_DRAFT_DESCRIBED', releaseManifestSha256, ...stagingAiDataset(), ...draft };
    } catch {
        throw new StagingAiError('OPENAI_EVALUATION_DRAFT_UNAVAILABLE');
    } finally {
        await db.$disconnect();
    }
}

async function main() {
    const [mode, file, ...extra] = process.argv.slice(2);
    if (mode === '--describe-draft' && !extra.length) return describeDraft(file);
    if (!['--plan', '--execute'].includes(mode) || extra.length || (mode === '--execute' && !file)) {
        throw new StagingAiError('USAGE_PLAN_OR_EXECUTE_WITH_APPROVAL');
    }
    if (!file) return { status: 'SYNTHETIC_DATASET_REVIEW', ...stagingAiDataset() };
    const bytes = readFileSync(file);
    if (bytes.length > 8192) throw new StagingAiError('APPROVAL_FILE_INVALID');
    const approvalSha256 = sha256(bytes);
    const plan = stagingAiPlan(JSON.parse(bytes.toString('utf8')));
    if (mode === '--plan') {
        return { status: 'APPROVAL_PLAN_COMPUTED', approvalSha256, runId: plan.approval.runId,
            provider: plan.approval.provider, region: plan.approval.region, model: plan.approval.model, ...stagingAiDataset(),
            releaseManifestSha256: plan.approval.releaseManifestSha256, reservedUsd: plan.reservedUsd, maxUsd: plan.capUsd };
    }
    const { BOTSALES_STAGING_AI_APPROVAL_SHA256: approvedHash, BOTSALES_STAGING_AI_API_KEY: apiKey,
        BOTSALES_STAGING_AI_EVIDENCE_DIR: evidenceDir } = process.env;
    if (approvedHash !== approvalSha256 || !apiKey || !/^[!-~]{16,512}$/.test(apiKey) || !evidenceDir || !isAbsolute(evidenceDir) ||
        process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new StagingAiError('STAGING_APPROVAL_OR_SECRETS_MISSING');
    if (readReleaseManifestHash() !== plan.approval.releaseManifestSha256) throw new StagingAiError('RELEASE_MANIFEST_MISMATCH');
    if (readCleanReleaseManifestHash() !== plan.approval.releaseManifestSha256) {
        throw new StagingAiError('CLEAN_STAGING_RELEASE_REQUIRED');
    }
    const result = await runStagingAi(plan, apiKey, evidenceDir, approvalSha256);
    if (result.status !== 'STAGING_AI_CASES_PASSED') process.exitCode = 1;
    return result;
}

try {
    console.log(JSON.stringify(await main()));
} catch (error) {
    console.log(JSON.stringify({ status: 'STOPPED', code: error instanceof StagingAiError ? error.code : 'STAGING_AI_RUN_UNAVAILABLE' }));
    process.exitCode = 1;
}
