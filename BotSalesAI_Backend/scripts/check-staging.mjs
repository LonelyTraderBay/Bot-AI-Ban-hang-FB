import { readFileSync } from 'node:fs';
import { cleanReleaseManifestHash, readHttpConfig } from '../apps/api/dist/config.js';
import { readAiEvaluationApproval, readOpenAiConnectionConfig } from '../apps/api/dist/modules/ai/index.js';
import { readMetaInboundConfig } from '../apps/api/dist/modules/channels/index.js';
import { readFileScannerTarget, readObjectStorageConfig } from '../apps/api/dist/modules/files/index.js';
import { readTelegramConfig, readWebPushConfig } from '../apps/api/dist/modules/notifications/index.js';
import { readAuthConfig } from '../apps/api/dist/modules/workspace/index.js';
import { matchesProbeScope } from './probe-target.mjs';
import { postgresTargets, redisTarget } from './staging-data-config.mjs';

const { inputs } = JSON.parse(readFileSync(new URL('../../botsales-kit/execution/owner-inputs.json', import.meta.url), 'utf8'));
const tasks = new Set(['T067', 'T068', 'T069', 'T070', 'T071', 'T072']);
const ownerInputs = inputs.filter(input => input.blockingTasks.some(task => tasks.has(task)))
    .filter(input => input.value === null || input.status === 'NOT_PROVIDED').map(input => input.id);
const issues = [];
const [flag, manifestPath, expectedHash, ...extra] = process.argv.slice(2);

function valid(check, action) {
    try { if (!action()) issues.push(check); }
    catch { issues.push(check); }
}

let manifestHash;
if (flag !== undefined) valid('RELEASE_MANIFEST', () => {
    if (flag !== '--manifest' || !manifestPath || !/^[a-f0-9]{64}$/.test(expectedHash ?? '') || extra.length) return false;
    const observed = cleanReleaseManifestHash(readFileSync(manifestPath));
    if (observed !== expectedHash) return false;
    manifestHash = observed;
    return true;
});

valid('NODE_TLS_REJECT_UNAUTHORIZED', () => process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0');
valid('API_BIND/API_PORT', () => readHttpConfig(process.env));
valid('APP_ORIGIN/OIDC_*/AUTH_SIGNING_KEY', () => {
    const auth = readAuthConfig(process.env);
    return auth && matchesProbeScope(new URL(auth.appOrigin).hostname) && matchesProbeScope(new URL(auth.issuer).hostname);
});
valid('DATABASE_URL/MIGRATION_DATABASE_URL', () => postgresTargets(process.env));
valid('REDIS_URL', () => redisTarget(process.env));
valid('FILE_SCAN_SOCKET/FILE_SCAN_PORT', () => readFileScannerTarget(process.env));
valid('FILE_OBJECT_STORE_*', () => readObjectStorageConfig(process.env));
let openAiModelCheck = 'UNCONFIGURED';
let openAi;
valid('BOTSALES_AI_OPENAI_*', () => {
    openAiModelCheck = 'INVALID';
    openAi = readOpenAiConnectionConfig(process.env);
    openAiModelCheck = !openAi ? 'UNCONFIGURED' : [...openAi.grants.values()].some(grant => grant.expiresAt > Date.now()) ? 'CONFIGURED' : 'EXPIRED';
    return openAiModelCheck !== 'EXPIRED';
});
let openAiEvaluation = 'UNCONFIGURED';
let approval;
valid('BOTSALES_AI_EVALUATION_APPROVAL_*', () => {
    openAiEvaluation = 'INVALID';
    if (flag !== undefined && !manifestHash) return false;
    approval = readAiEvaluationApproval(process.env, manifestHash);
    openAiEvaluation = !approval ? 'UNCONFIGURED' : approval.plan.expires > Date.now() ? 'CONFIGURED' : 'EXPIRED';
    return openAiEvaluation !== 'EXPIRED';
});
let webPush = 'UNCONFIGURED';
let telegram = 'UNCONFIGURED';
valid('TELEGRAM_*', () => {
    telegram = 'INVALID';
    telegram = readTelegramConfig(process.env) ? 'CONFIGURED' : 'UNCONFIGURED';
    return true;
});
valid('WEB_PUSH_*', () => {
    webPush = 'INVALID';
    webPush = readWebPushConfig(process.env) ? 'CONFIGURED' : 'UNCONFIGURED';
    return true;
});
let metaMessengerInbound = 'UNCONFIGURED';
let metaMessengerOutbound = 'UNCONFIGURED';
let meta;
valid('META_MESSENGER_*', () => {
    metaMessengerInbound = 'INVALID';
    metaMessengerOutbound = 'INVALID';
    meta = readMetaInboundConfig(process.env);
    metaMessengerInbound = meta ? 'CONFIGURED' : 'UNCONFIGURED';
    metaMessengerOutbound = meta?.graphVersion ? 'CONFIGURED' : 'UNCONFIGURED';
    return true;
});
let aiMessengerSmoke = 'UNCONFIGURED';
valid('T072_AI_MESSENGER_SCOPE', () => {
    if (!approval?.runtime) return true;
    const { runtime, shopId, plan } = approval;
    const grant = openAi?.grants.get(shopId);
    const page = meta?.pages.get(runtime.pageId);
    const { projectId, region, model } = plan.approval;
    const matches = openAiEvaluation === 'CONFIGURED' && grant && grant.expiresAt > Date.now() && grant.projectId === projectId &&
        grant.region === region && grant.model === model && page?.shopId === shopId && page.senderIds.has(runtime.senderId);
    aiMessengerSmoke = matches ? 'CONFIGURED' : 'SCOPE_MISMATCH';
    return matches;
});
valid('FIXTURE_MODE_DISABLED', () => !Object.entries(process.env).some(([key, value]) =>
    value && (key === 'P0_STEP_UP_PASSWORD' || (value === '1' && (key.endsWith('_FIXTURE_ADAPTER') || key === 'PRIVACY_FIXTURE_ACTIONS')))));

console.log(JSON.stringify({ status: issues.length || ownerInputs.length ? 'BLOCKED' : 'CONFIG_REVIEW_PASSED',
    missingOwnerInputs: ownerInputs, configChecksNeedingAttention: issues, metaMessengerInbound, metaMessengerOutbound, webPush, telegram, openAiModelCheck,
    openAiEvaluation, aiMessengerSmoke }, null, 2));
if (issues.length || ownerInputs.length) process.exitCode = 1;
