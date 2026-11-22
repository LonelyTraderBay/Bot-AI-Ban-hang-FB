import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { openPushSubscription, readWebPushConfig, sealPushSubscription, sendWebPush, validWebPushSubscription } from
    '../apps/api/dist/modules/notifications/web-push.js';
import { pushConfigEnv, pushReceiver } from './integration/notifications/web-push-fixture.mjs';

test('Web Push requires matching VAPID keys and rejects unsupported endpoints and invalid curve points', () => {
    const env = pushConfigEnv();
    assert.equal(readWebPushConfig({}), undefined);
    assert.ok(readWebPushConfig(env));
    assert.throws(() => readWebPushConfig({ ...env, WEB_PUSH_PRIVATE_KEY: pushConfigEnv().WEB_PUSH_PRIVATE_KEY }),
        error => !error.message.includes(env.WEB_PUSH_PRIVATE_KEY));
    assert.throws(() => readWebPushConfig({ ...env, WEB_PUSH_ENCRYPTION_KEY: env.WEB_PUSH_PRIVATE_KEY }), /WEB_PUSH_ENCRYPTION_KEY/);
    const { subscription } = pushReceiver();
    for (const endpoint of ['http://fcm.googleapis.com/fcm/send/example', 'https://fcm.googleapis.com:444/fcm/send/example',
        'https://fcm.googleapis.com@127.0.0.1/fcm/send/example', 'https://fcm.googleapis.com.evil.test/fcm/send/example',
        'https://fcm.googleapis.com/v1/projects/example', 'https://web.push.apple.com/example#fragment',
        'https://updates.push.services.mozilla.com/unknown/test']) {
        assert.equal(validWebPushSubscription({ ...subscription, endpoint }), undefined);
    }
    assert.equal(validWebPushSubscription({ ...subscription, p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString('base64url') }), undefined);
    for (const endpoint of [subscription.endpoint, 'https://web.push.apple.com/example', 'https://updates.push.services.mozilla.com/wpush/v2/example']) {
        assert.equal(validWebPushSubscription({ ...subscription, endpoint }).endpoint, endpoint);
    }
});

test('Web Push seals subscription secrets to their shop, owner and fingerprint', () => {
    const config = readWebPushConfig(pushConfigEnv());
    const { subscription } = pushReceiver();
    const binding = { shopId: randomUUID(), userId: randomUUID(), fingerprint: randomUUID() };
    const sealed = sealPushSubscription(config, binding, subscription);
    assert.equal(sealed.includes(subscription.endpoint), false);
    assert.deepEqual(openPushSubscription(config, binding, sealed), subscription);
    assert.equal(openPushSubscription(config, { ...binding, userId: randomUUID() }, sealed), undefined);
    assert.equal(openPushSubscription(config, { ...binding, shopId: randomUUID() }, sealed), undefined);
    assert.equal(openPushSubscription(config, binding, sealed + '.extra'), undefined);
});

test('Web Push signs and encrypts the bounded payload and preserves result uncertainty', async () => {
    const config = readWebPushConfig(pushConfigEnv());
    const { subscription, read } = pushReceiver();
    const payload = { eventId: randomUUID(), title: 'Thông báo thử', safeBody: 'Mở ứng dụng để kiểm tra.', path: '/workspaces' };
    let attempts = 0;
    let authorization;
    const call = (status) => sendWebPush(config, subscription, payload, 60, async (url, init) => {
        attempts++;
        assert.equal(url, subscription.endpoint);
        assert.deepEqual(read(init, config), payload);
        const header = new globalThis.Headers(init.headers).get('authorization');
        if (authorization) assert.equal(header, authorization);
        authorization = header;
        assert.ok(init.signal);
        if (!status) throw new Error('Response lost');
        return new globalThis.Response(null, { status });
    });
    assert.deepEqual(await call(201), { status: 'accepted_by_provider', expired: false });
    assert.deepEqual(await call(410), { status: 'failed', expired: true });
    assert.deepEqual(await call(429), { status: 'failed', expired: false });
    assert.deepEqual(await call(503), { status: 'unknown', expired: false });
    assert.deepEqual(await call(), { status: 'unknown', expired: false });
    assert.equal(attempts, 5);
});
