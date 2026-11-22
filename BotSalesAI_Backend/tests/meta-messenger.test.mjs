import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createApp } from '../apps/api/dist/app.js';
import { metaReplyPage, readMetaInboundConfig } from '../apps/api/dist/modules/channels/index.js';

test('Meta settings require approved Page and sender bindings without reporting secret values', () => {
    assert.equal(readMetaInboundConfig({}), undefined);
    const secret = randomUUID();
    assert.throws(() => readMetaInboundConfig({ META_MESSENGER_APP_SECRET: secret }), error => !error.message.includes(secret));
    const page = { pageId: '1234567', shopId: randomUUID(), senderIds: ['7654321'] };
    const load = pages => readMetaInboundConfig({ META_MESSENGER_APP_SECRET: secret, META_MESSENGER_VERIFY_TOKEN: randomUUID(),
        META_MESSENGER_PAGES: JSON.stringify(pages) });
    assert.equal(load([page]).pages.get(page.pageId).shopId, page.shopId);
    for (const invalid of [[page, page], [{ ...page, senderIds: [] }], [{ ...page, senderIds: ['7654321', '7654321'] }],
        [{ ...page, senderIds: [page.pageId] }], [{ ...page, shopId: 'not-a-shop' }]]) assert.throws(() => load(invalid), /META_MESSENGER_PAGES/);
});

test('Meta callback does not listen on the default API', async () => {
    const app = await createApp({ quiet: true });
    try {
        await app.listen(0, '127.0.0.1');
        const root = await app.getUrl();
        const response = await fetch(root + '/api/v2/integrations/meta/messenger/webhook');
        assert.equal(response.status, 404);
        await response.arrayBuffer();
    } finally {
        await app.close();
    }
});

test('Meta text replies require a pinned Graph version and token belonging to the configured Page', () => {
    const page = { pageId: '123', shopId: randomUUID(), senderIds: ['987'] };
    const second = { ...page, pageId: '456' };
    const channel = { ...page, status: 'connected', policyVersion: 'meta-messenger-inbound-v1' };
    const token = randomUUID();
    const env = { META_MESSENGER_APP_SECRET: randomUUID(), META_MESSENGER_VERIFY_TOKEN: randomUUID(),
        META_MESSENGER_PAGES: JSON.stringify([page, second]) };
    assert.equal(metaReplyPage(readMetaInboundConfig(env), channel), undefined);
    const valid = { META_MESSENGER_GRAPH_VERSION: 'v27.0', META_MESSENGER_PAGE_TOKENS: JSON.stringify({ 123: token }) };
    const config = readMetaInboundConfig({ ...env, ...valid });
    assert.equal(metaReplyPage(config, channel).accessToken, token);
    assert.equal(metaReplyPage(config, { ...channel, shopId: randomUUID() }), undefined);
    assert.equal(metaReplyPage(config, { ...channel, pageId: second.pageId }), undefined);
    assert.equal(metaReplyPage(config, { ...channel, status: 'disabled' }), undefined);
    for (const settings of [{ META_MESSENGER_GRAPH_VERSION: 'v27.0' }, { ...valid, META_MESSENGER_GRAPH_VERSION: 'https://elsewhere' },
        { ...valid, META_MESSENGER_PAGE_TOKENS: JSON.stringify({ 789: token }) },
        { ...valid, META_MESSENGER_PAGE_TOKENS: JSON.stringify({ 123: token, 456: token }) }]) {
        assert.throws(() => readMetaInboundConfig({ ...env, ...settings }), error =>
            error.message.includes('META_MESSENGER_PAGE_TOKENS') && !error.message.includes(token));
    }
});
