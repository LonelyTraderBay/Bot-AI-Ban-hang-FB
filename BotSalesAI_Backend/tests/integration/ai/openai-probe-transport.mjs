import assert from 'node:assert/strict';

const [scope] = JSON.parse(process.env.BOTSALES_AI_OPENAI_SCOPES);
const secret = process.env.BOTSALES_P0_OPENAI_PROBE_SECRET;
assert.ok(secret?.startsWith('synthetic-probe-'));

globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://eu.api.openai.com/v1/models/' + scope.model);
    assert.equal(init.method, 'GET');
    assert.equal(init.redirect, 'error');
    assert.equal(init.body, undefined);
    assert.ok(init.headers.authorization === 'Bearer ' + secret && init.headers['openai-project'] === scope.projectId);
    assert.match(init.headers['x-client-request-id'], /^[0-9a-f-]{36}$/);
    console.log('OpenAI model fixture accepted one GET.');
    return new globalThis.Response(JSON.stringify({ id: scope.model, object: 'model' }));
};
