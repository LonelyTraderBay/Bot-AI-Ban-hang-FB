import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { createApp } from '../apps/api/dist/app.js';
import { readHttpConfig } from '../apps/api/dist/config.js';
import { createContractValidator, schemaFromContract } from '../apps/api/dist/http/contracts.js';

const spec = JSON.parse(readFileSync(new URL('../../botsales-kit/contracts/openapi.json', import.meta.url)));
const validator = createContractValidator(spec.components.schemas);
const validateProblem = validator.compile(schemaFromContract('Problem'));
const validateAuthStart = validator.compile(schemaFromContract('AuthStart'));
let blocked = false;
let app;
let base;
before(async () => {
    app = await createApp({ quiet: true, readiness: () => {
        if (blocked) throw new Error('private dependency details');
        return true;
    } });
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
});
after(async () => { await app?.close(); });

async function readProblem(path, status, code) {
    const response = await fetch(base + path);
    assert.equal(response.status, status);
    assert.match(response.headers.get('content-type'), /^application\/problem\+json\b/);
    const problem = await response.json();
    assert.equal(validateProblem(problem), true, JSON.stringify(validateProblem.errors));
    assert.equal(problem.status, status);
    assert.equal(problem.code, code);
    assert.equal(problem.requestId, response.headers.get('x-request-id'));
    assert.match(problem.requestId, /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
    return problem;
}

test('operational endpoints respond 200 under /api/v2 and have distinct trace IDs', async () => {
    const live = await fetch(base + '/api/v2/health/live');
    const ready = await fetch(base + '/api/v2/health/ready');
    assert.equal(live.status, 200);
    assert.equal(ready.status, 200);
    assert.deepEqual(await live.json(), { status: 'ok' });
    assert.deepEqual(await ready.json(), { status: 'ready' });
    assert.ok(live.headers.get('x-request-id'));
    assert.ok(ready.headers.get('x-request-id'));
    assert.notEqual(live.headers.get('x-request-id'), ready.headers.get('x-request-id'));
});

test('schema rejects unknown query input in HTTP and matches the canonical Problem envelope', async () => {
    const problem = await readProblem('/api/v2/health/ready?unknown=value', 400, 'VALIDATION_FAILED');
    assert.deepEqual(problem.errors.map(item => item.code), ['additionalProperties']);
    assert.doesNotMatch(JSON.stringify(problem), /unknown=value/);
});

test('liveness remains healthy when readiness fails and readiness can recover', async () => {
    blocked = true;
    try {
        const problem = await readProblem('/api/v2/health/ready', 503, 'SERVICE_UNAVAILABLE');
        assert.doesNotMatch(JSON.stringify(problem), /private dependency details/);
        assert.equal((await fetch(base + '/api/v2/health/live')).status, 200);
    } finally {
        blocked = false;
    }
    assert.equal((await fetch(base + '/api/v2/health/ready')).status, 200);
});

test('route outside the API prefix and product routes return canonical 404', async () => {
    await readProblem('/health/live', 404, 'NOT_FOUND');
    await readProblem('/api/v2/shops', 404, 'NOT_FOUND');
});

test('shared validator uses the canonical schema without data coercion', () => {
    const payload = { returnTo: '/workspaces' };
    assert.equal(validateAuthStart(payload), true);
    assert.equal(validateAuthStart({ returnTo: 123 }), false);
    assert.deepEqual(payload, { returnTo: '/workspaces' });
});

test('HTTP configuration validates required bind and port without printing values', () => {
    assert.deepEqual(readHttpConfig({ API_BIND: '127.0.0.1', API_PORT: '3000' }), { bind: '127.0.0.1', port: 3000 });
    assert.throws(() => readHttpConfig({}), /Missing required configuration: API_BIND, API_PORT/);
    assert.throws(() => readHttpConfig({ API_BIND: 'not-an-ip', API_PORT: '3000' }), /API_BIND must be/);
    assert.throws(() => readHttpConfig({ API_BIND: '127.0.0.1', API_PORT: '65536' }), /API_PORT must be/);
});

test('production process fails before listening if required configuration is absent', () => {
    const env = { ...process.env };
    delete env.API_BIND;
    delete env.API_PORT;
    const result = spawnSync(process.execPath, ['apps/api/dist/main.js'], { env, encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Missing required configuration: API_BIND, API_PORT/);
});
