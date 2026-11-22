import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, readdir, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { runStagingAi, stagingAiDataset, stagingAiPlan } from '../apps/api/dist/modules/ai/staging-evaluation.js';

const dataset = stagingAiDataset();
const apiKey = 'synthetic-only-' + randomUUID();
const approvedHash = 'a'.repeat(64);
const digest = value => createHash('sha256').update(value).digest('hex');

function approval(changes = {}) {
    return {
        runId: randomUUID(), provider: 'openai', region: 'eu', projectId: 'proj_syntheticvalidation',
        model: 'synthetic-model-2026-01-01', datasetSha256: dataset.datasetSha256, releaseManifestSha256: 'b'.repeat(64),
        pricingAsOf: '2026-01-01', expiresAt: new Date(Date.now() + 60_000).toISOString(),
        inputUsdPerMillion: '2.5', outputUsdPerMillion: '8', maxUsd: '0.028672', maxInputTokens: 512, maxOutputTokens: 128,
        ...changes,
    };
}

async function ledgerFixture(t) {
    const directory = await mkdtemp(join(tmpdir(), 'botsales-staging-ai-'));
    t.after(async () => {
        for (const file of await readdir(directory)) await unlink(join(directory, file));
        await rmdir(directory);
    });
    return directory;
}

const json = (value, status = 200) => new globalThis.Response(JSON.stringify(value), { status });
const count = (tokens = 400) => json({ object: 'response.input_tokens', input_tokens: tokens });
function generation(plan, label, fields = {}) {
    return json({
        object: 'response', status: 'completed', model: plan.approval.model, service_tier: 'default',
        usage: { input_tokens: 400, output_tokens: 16, total_tokens: 416 },
        output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify({ decision: label }) }] }],
        ...fields,
    });
}

async function journal(directory, plan) {
    return (await readFile(join(directory, plan.approval.runId + '.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
}

test('approved AI plan pins dataset, artifact, model, region and exact worst-case USD', () => {
    const plan = stagingAiPlan(approval());
    assert.equal(plan.reservedUsd, '0.028672');
    assert.equal(plan.capUsd, plan.reservedUsd);
    assert.equal(stagingAiPlan(approval({ model: 'gpt-4.1-2025-04-14' })).approval.model, 'gpt-4.1-2025-04-14');
    assert.throws(() => stagingAiPlan(approval({ maxUsd: '0.02867199' })), /APPROVED_COST_CAP_EXCEEDED/);
    assert.throws(() => stagingAiPlan(approval({ datasetSha256: 'f'.repeat(64) })), /DATASET_DIGEST_MISMATCH/);
    for (const changes of [{ expiresAt: '2020-01-01T00:00:00.000Z' }, { pricingAsOf: '2026-02-30' },
        { region: 'https://arbitrary.example' }, { region: '__proto__' }, { outputUsdPerMillion: null },
        { model: 'synthetic-latest' }, { releaseManifestSha256: 'unknown' }, { maxOutputTokens: 4097 }]) {
        assert.throws(() => stagingAiPlan(approval(changes)), /APPROVAL_SCOPE_INVALID/);
    }
    assert.throws(() => stagingAiPlan(approval({ prompt: 'arbitrary data' })), /APPROVAL_FIELDS_INVALID/);
});

test('staging preflight checks the reviewed artifact, approved Meta sender and OpenAI grant', async t => {
    const directory = await ledgerFixture(t);
    const manifestPath = join(directory, 'release-manifest.json');
    const manifest = JSON.stringify({ format: 1, sourceBase: 'a'.repeat(40), dirtyWorktree: false });
    await writeFile(manifestPath, manifest);
    const run = approval({ releaseManifestSha256: digest(manifest) });
    const shopId = randomUUID();
    const runtime = { runId: randomUUID(), pageId: '1234567', senderId: '7654321', maxUsd: '0.003584', currency: 'VND', reservedAmount: '100' };
    const scope = JSON.stringify({ shopId, configRevision: 1, configHash: 'a'.repeat(64), policyVersion: 'synthetic', run, runtime });
    const path = join(directory, 'approval.json');
    await writeFile(path, scope);
    const pages = senderIds => JSON.stringify([{ pageId: runtime.pageId, shopId, senderIds }]);
    const env = { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '1', BOTSALES_AI_EVALUATION_APPROVAL_FILE: path,
        BOTSALES_AI_EVALUATION_APPROVAL_SHA256: digest(scope), BOTSALES_AI_OPENAI_CREDENTIAL_KEY: randomBytes(32).toString('base64url'),
        BOTSALES_AI_OPENAI_SCOPES: JSON.stringify([{ shopId, projectId: run.projectId, region: run.region, model: run.model, expiresAt: run.expiresAt }]),
        META_MESSENGER_APP_SECRET: randomUUID(), META_MESSENGER_VERIFY_TOKEN: randomUUID(), META_MESSENGER_GRAPH_VERSION: '', META_MESSENGER_PAGE_TOKENS: '',
    };
    const check = (senderIds, hash = digest(manifest), overrides = {}) => {
        const result = spawnSync(process.execPath, ['scripts/check-staging.mjs', '--manifest', manifestPath, hash], {
            env: { ...env, META_MESSENGER_PAGES: pages(senderIds), ...overrides }, encoding: 'utf8', timeout: 15_000,
        });
        assert.ifError(result.error);
        assert.equal(result.stderr, '');
        return JSON.parse(result.stdout);
    };
    const valid = check([runtime.senderId]);
    assert.ok(!valid.configChecksNeedingAttention.includes('NODE_TLS_REJECT_UNAUTHORIZED'));
    assert.equal(valid.aiMessengerSmoke, 'CONFIGURED');
    assert.equal(valid.openAiEvaluation, 'CONFIGURED');
    const outOfScope = check(['1234568']);
    assert.equal(outOfScope.aiMessengerSmoke, 'SCOPE_MISMATCH');
    assert.ok(outOfScope.configChecksNeedingAttention.includes('T072_AI_MESSENGER_SCOPE'));
    const incorrectDigest = check([runtime.senderId], 'f'.repeat(64));
    assert.equal(incorrectDigest.openAiEvaluation, 'INVALID');
    assert.ok(incorrectDigest.configChecksNeedingAttention.includes('RELEASE_MANIFEST'));
    const unverifiedTls = check([runtime.senderId], digest(manifest), { NODE_TLS_REJECT_UNAUTHORIZED: '0',
        BOTSALES_AI_EVALUATION_APPROVAL_FILE: '', BOTSALES_AI_EVALUATION_APPROVAL_SHA256: '' });
    assert.equal(unverifiedTls.status, 'BLOCKED');
    assert.equal(unverifiedTls.openAiEvaluation, 'UNCONFIGURED');
    assert.ok(unverifiedTls.configChecksNeedingAttention.includes('NODE_TLS_REJECT_UNAUTHORIZED'));
});

test('AI staging sends only the pinned synthetic cases and logs bounded tokens and safe labels', async t => {
    const plan = stagingAiPlan(approval());
    const directory = await ledgerFixture(t);
    let calls = 0;
    let counted;
    const request = async (url, init) => {
        const before = await journal(directory, plan);
        assert.equal(before[0].phase, 'reserved');
        assert.equal(before[0].reservedUsd, plan.reservedUsd);
        assert.equal(init.method, 'POST');
        assert.equal(init.redirect, 'error');
        assert.ok(init.signal);
        assert.equal(init.headers.authorization, 'Bearer ' + apiKey);
        assert.equal(init.headers['openai-project'], plan.approval.projectId);
        const payload = JSON.parse(init.body);
        assert.equal(payload.model, plan.approval.model);
        assert.equal(payload.tools, undefined);
        assert.equal(payload.previous_response_id, undefined);
        assert.equal(payload.text.format.strict, true);
        const index = Math.floor(calls / 2);
        const tokenCount = calls++ % 2 === 0;
        assert.equal(url, 'https://eu.api.openai.com/v1/responses' + (tokenCount ? '/input_tokens' : ''));
        assert.equal(before.at(-1).phase, tokenCount ? 'count_started' : 'generation_started');
        assert.equal(before.at(-1).caseId, dataset.cases[index].id);
        assert.equal(init.headers['x-client-request-id'], before.at(-1).clientRequestId);
        assert.equal(init.headers['x-client-request-id'],
            plan.approval.runId + '-' + dataset.cases[index].id + (tokenCount ? '-count' : '-generate'));
        if (tokenCount) {
            counted = payload;
            return count();
        }
        const { store, service_tier: tier, max_output_tokens: maxOutput, ...input } = payload;
        assert.equal(store, false);
        assert.equal(tier, 'default');
        assert.equal(maxOutput, plan.approval.maxOutputTokens);
        assert.deepEqual(input, counted);
        return generation(plan, dataset.cases[index].expected);
    };
    const result = await runStagingAi(plan, apiKey, directory, approvedHash, request);
    assert.equal(calls, dataset.cases.length * 2);
    assert.equal(result.status, 'STAGING_AI_CASES_PASSED');
    assert.equal(result.passed, dataset.cases.length);
    assert.equal(result.conservativeObservedUsd, '0.017024');
    const entries = await journal(directory, plan);
    assert.equal(entries.at(-1).phase, 'finished');
    assert.equal(entries.filter(row => row.phase === 'case_observed').length, dataset.cases.length);
    assert.doesNotMatch(JSON.stringify(entries), /synthetic-only-|proj_syntheticvalidation|TEST-SKU|chốt đơn/);
});

test('a reserved AI run cannot be started concurrently or repeated after an uncertain response', async t => {
    const plan = stagingAiPlan(approval());
    const directory = await ledgerFixture(t);
    let calls = 0;
    const request = async () => {
        calls++;
        if (calls === 1) return count();
        throw new Error('Response lost after provider observation: ' + apiKey);
    };
    const results = await Promise.allSettled([
        runStagingAi(plan, apiKey, directory, approvedHash, request),
        runStagingAi(plan, apiKey, directory, approvedHash, request),
    ]);
    assert.deepEqual(results.map(result => result.reason.code).sort(), ['PROVIDER_RESULT_UNKNOWN', 'RUN_ALREADY_RESERVED']);
    await assert.rejects(() => runStagingAi(plan, apiKey, directory, approvedHash, request), /RUN_ALREADY_RESERVED/);
    assert.equal(calls, 2);
    const entries = await journal(directory, plan);
    assert.deepEqual(entries.map(row => row.phase), ['reserved', 'count_started', 'generation_started', 'stopped']);
    assert.equal(entries.at(-1).code, 'PROVIDER_RESULT_UNKNOWN');
    assert.ok(!JSON.stringify(entries).includes(apiKey));
});

test('AI execution stops before generation for excessive count, revoked credentials or quota response', async t => {
    const directory = await ledgerFixture(t);
    for (const [reply, expected] of [[count(513), 'INPUT_TOKEN_BOUND_EXCEEDED_OR_UNVERIFIED'],
        [json({ secret: apiKey }, 401), 'PROVIDER_AUTH_REJECTED'], [json({ secret: apiKey }, 429), 'PROVIDER_RATE_LIMITED']]) {
        const plan = stagingAiPlan(approval());
        let calls = 0;
        await assert.rejects(() => runStagingAi(plan, apiKey, directory, approvedHash, async () => { calls++; return reply; }),
            error => error.code === expected);
        assert.equal(calls, 1);
        const entries = await journal(directory, plan);
        assert.deepEqual(entries.map(row => row.phase), ['reserved', 'count_started', 'stopped']);
        assert.ok(!JSON.stringify(entries).includes(apiKey));
    }
});

test('AI result mismatch fails the run and unverified usage stops further requests', async t => {
    const directory = await ledgerFixture(t);
    const plan = stagingAiPlan(approval());
    let calls = 0;
    const unsafe = generation(plan, null, { output: [{ type: 'function_call', name: 'writeOrder', arguments: 'untrusted' }] });
    const result = await runStagingAi(plan, apiKey, directory, approvedHash, async () => {
        const index = Math.floor(calls / 2);
        return calls++ % 2 === 0 ? count() : index === 0 ? unsafe : generation(plan, dataset.cases[index].expected);
    });
    assert.equal(result.status, 'STAGING_AI_CASES_FAILED');
    assert.equal(result.passed, dataset.cases.length - 1);
    assert.doesNotMatch(JSON.stringify(await journal(directory, plan)), /writeOrder|untrusted"/);

    const unverified = stagingAiPlan(approval());
    calls = 0;
    await assert.rejects(() => runStagingAi(unverified, apiKey, directory, approvedHash, async () =>
        calls++ === 0 ? count() : generation(unverified, 'catalog_lookup', { usage: null })), /PROVIDER_USAGE_UNVERIFIED/);
    assert.equal(calls, 2);
});
