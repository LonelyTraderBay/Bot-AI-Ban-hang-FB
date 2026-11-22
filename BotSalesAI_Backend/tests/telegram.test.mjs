import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createApp } from '../apps/api/dist/app.js';
import { readTelegramConfig, sendTelegram } from '../apps/api/dist/modules/notifications/telegram.js';
import { telegramFixtureEnv } from './integration/notifications/telegram-fixture.mjs';

const approved = { shopId: randomUUID(), userId: randomUUID(), telegramUserId: '9234567000' };

test('Telegram configuration enables only explicit shop-user-chat bindings and leaves the default webhook off', async () => {
    assert.equal(readTelegramConfig({}), undefined);
    const env = telegramFixtureEnv([approved]);
    assert.ok(readTelegramConfig(env));
    for (const pairs of [[{ ...approved, telegramUserId: '-123' }], [approved, approved], [{ ...approved, shopId: 'alias' }],
        [approved, { ...approved, userId: randomUUID() }]]) {
        assert.throws(() => readTelegramConfig({ ...env, TELEGRAM_APPROVED_PAIRS: JSON.stringify(pairs) }),
            error => /TELEGRAM_APPROVED_PAIRS/.test(error.message) && !error.message.includes(env.TELEGRAM_BOT_TOKEN));
    }
    const app = await createApp({ quiet: true });
    try {
        await app.listen(0, '127.0.0.1');
        const response = await fetch(await app.getUrl() + '/api/v2/integrations/telegram/updates', { method: 'POST' });
        assert.equal(response.status, 404);
        await response.arrayBuffer();
    } finally { await app.close(); }
});

test('Telegram sends a private, read-only link and separates rejection from unknown', async () => {
    const config = readTelegramConfig(telegramFixtureEnv([approved]));
    const origin = 'https://stage.example.test';
    const payload = { eventId: randomUUID(), title: 'Đơn cần chuẩn bị', safeBody: 'Có công việc đang chờ nhận.',
        path: '/s/' + approved.shopId + '/orders/' + randomUUID() };
    let calls = 0;
    const send = (status, result) => sendTelegram(config, approved.telegramUserId, payload, origin, async (url, init) => {
        calls++;
        assert.equal(url, 'https://api.telegram.org/bot' + config.botToken + '/sendMessage');
        assert.equal(init.method, 'POST');
        assert.equal(init.redirect, 'error');
        assert.ok(init.signal);
        assert.deepEqual(JSON.parse(init.body), { chat_id: approved.telegramUserId, text: payload.title + '\n' + payload.safeBody,
            protect_content: true, reply_markup: { inline_keyboard: [[{ text: 'Mở BotSales AI', url: origin + payload.path }]] } });
        if (!status) throw new Error('Response not observed');
        return new globalThis.Response(JSON.stringify(result), { status });
    });
    assert.deepEqual(await send(200, { ok: true, result: { chat: { id: Number(approved.telegramUserId) }, message_id: 1 } }),
        { status: 'accepted_by_provider', expired: false });
    assert.deepEqual(await send(403, { ok: false, error_code: 403 }), { status: 'failed', expired: true });
    assert.deepEqual(await send(429, { ok: false, error_code: 429 }), { status: 'failed', expired: false });
    assert.deepEqual(await send(503, { ok: false, error_code: 503 }), { status: 'unknown', expired: false });
    assert.deepEqual(await send(), { status: 'unknown', expired: false });
    assert.deepEqual(await sendTelegram(config, approved.telegramUserId, { ...payload, path: 'https://wrong.example.test' }, origin,
        async () => { calls++; }), { status: 'failed', expired: false });
    assert.equal(calls, 5);
});
