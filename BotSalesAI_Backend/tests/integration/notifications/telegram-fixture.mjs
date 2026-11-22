import { randomBytes } from 'node:crypto';

export const telegramBotUsername = 'BotSalesStageFixtureBot';

export function telegramFixtureEnv(pairs) {
    return {
        TELEGRAM_BOT_TOKEN: (randomBytes(4).readUInt32BE() + 1_000_000) + ':' + randomBytes(32).toString('base64url'),
        TELEGRAM_BOT_USERNAME: telegramBotUsername,
        TELEGRAM_WEBHOOK_SECRET: randomBytes(32).toString('base64url'),
        TELEGRAM_ENCRYPTION_KEY: randomBytes(32).toString('base64url'),
        TELEGRAM_APPROVED_PAIRS: JSON.stringify(pairs),
    };
}

export function telegramStartUpdate(updateId, telegramUserId, code, type = 'private') {
    return { update_id: updateId, message: { chat: { id: Number(telegramUserId), type },
        from: { id: Number(telegramUserId), is_bot: false }, text: '/start ' + code } };
}
