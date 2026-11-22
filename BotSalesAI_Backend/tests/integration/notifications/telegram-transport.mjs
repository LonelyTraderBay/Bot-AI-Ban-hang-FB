import assert from 'node:assert/strict';

const [pair] = JSON.parse(process.env.TELEGRAM_APPROVED_PAIRS);
globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN + '/sendMessage');
    assert.equal(init.method, 'POST');
    assert.equal(init.redirect, 'error');
    const body = JSON.parse(init.body);
    assert.equal(body.chat_id, pair.telegramUserId);
    assert.equal(body.protect_content, true);
    assert.deepEqual(body.reply_markup.inline_keyboard, [[{ text: 'Mở BotSales AI',
        url: process.env.APP_ORIGIN + '/s/' + pair.shopId + '/notifications' }]]);
    console.log('Telegram fixture accepted one private POST.');
    return new globalThis.Response(JSON.stringify({ ok: true, result: { chat: { id: Number(pair.telegramUserId) }, message_id: 1 } }));
};
