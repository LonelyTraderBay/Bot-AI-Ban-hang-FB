import { Body, Controller, Headers, HttpCode, NotFoundException, Post, ServiceUnavailableException } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { NotificationDevice, PrismaClient, TelegramPairing } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { recordAudit } from '../../platform/audit/index.js';
import { serializable } from '../../platform/database/transactions.js';
import { canInShop, type AuthConfig } from '../workspace/index.js';
import { fingerprint } from './deliveries.js';
import { openDeviceSecret, sealDeviceSecret, validBase64Key } from './device-secrets.js';
import type { ProviderObservation, SafeNotification } from './web-push.js';

type ApprovedPair = { shopId: string; userId: string; telegramUserId: string };
export type TelegramConfig = { botId: string; botUsername: string; botToken: string; webhookSecret: string;
    encryptionKey: Buffer; approved: ReadonlyMap<string, ApprovedPair> };
const scope = (shopId: string, userId: string) => shopId + ':' + userId;
const chatIdValid = (value: unknown): value is string =>
    typeof value === 'string' && /^[1-9][0-9]{0,15}$/.test(value) && Number(value) < 2 ** 52;
const asRecord = (value: unknown): Record<string, unknown> | undefined =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;

export function readTelegramConfig(env: NodeJS.ProcessEnv): TelegramConfig | undefined {
    const { TELEGRAM_BOT_TOKEN: botToken, TELEGRAM_BOT_USERNAME: botUsername, TELEGRAM_WEBHOOK_SECRET: webhookSecret,
        TELEGRAM_ENCRYPTION_KEY: encryption, TELEGRAM_APPROVED_PAIRS: pairs } = env;
    if (!botToken && !botUsername && !webhookSecret && !encryption && !pairs) return undefined;
    const invalid = () => new Error('Set TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_ENCRYPTION_KEY and TELEGRAM_APPROVED_PAIRS');
    const match = botToken && /^([1-9][0-9]{5,15}):[A-Za-z0-9_-]{30,100}$/.exec(botToken);
    if (!match || !botToken || !botUsername || !/^[A-Za-z][A-Za-z0-9_]{1,28}bot$/i.test(botUsername) ||
        !webhookSecret || !/^[A-Za-z0-9_-]{32,256}$/.test(webhookSecret) ||
        !validBase64Key(encryption, 32) || encryption === webhookSecret || !pairs) throw invalid();
    let entries: unknown;
    try { entries = JSON.parse(pairs); } catch { throw invalid(); }
    if (!Array.isArray(entries) || entries.length < 1 || entries.length > 500) throw invalid();
    const approved = new Map<string, ApprovedPair>();
    const chats = new Set<string>();
    for (const entry of entries) {
        const row = asRecord(entry);
        if (!row || Object.keys(row).length !== 3 || typeof row.shopId !== 'string' || !validUuid(row.shopId) ||
            typeof row.userId !== 'string' || !validUuid(row.userId) || !chatIdValid(row.telegramUserId)) throw invalid();
        const shopId = row.shopId.toLowerCase();
        const userId = row.userId.toLowerCase();
        const chatScope = scope(shopId, row.telegramUserId);
        if (approved.has(scope(shopId, userId)) || chats.has(chatScope)) throw invalid();
        approved.set(scope(shopId, userId), { shopId, userId, telegramUserId: row.telegramUserId });
        chats.add(chatScope);
    }
    return { botId: match[1], botToken, botUsername, webhookSecret, encryptionKey: Buffer.from(encryption, 'base64url'), approved };
}

export const telegramApproved = (config: TelegramConfig, shopId: string, userId: string) => config.approved.get(scope(shopId, userId));

export function telegramPairingCode(config: AuthConfig, pairing: TelegramPairing) {
    const domain = pairing.telegramBotId ? 'telegram-pairing-v1:' + pairing.telegramBotId : 'telegram-fixture-v1';
    const signature = createHmac('sha256', config.signingKey)
        .update(JSON.stringify([domain, pairing.shopId, pairing.id, pairing.userId, pairing.expiresAt.toISOString()]))
        .digest().subarray(0, 16).toString('base64url');
    return pairing.id + '_' + signature;
}

function equalSecret(a: string, b: string) {
    const digest = (value: string) => createHash('sha256').update(value).digest();
    return timingSafeEqual(digest(a), digest(b));
}

function telegramStart(body: unknown) {
    const update = asRecord(body);
    const message = asRecord(update?.message);
    const from = asRecord(message?.from);
    const chat = asRecord(message?.chat);
    const id = update?.update_id;
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 0 ||
        chat?.type !== 'private' || from?.is_bot !== false || from.id !== chat.id || typeof from.id !== 'number' ||
        !Number.isSafeInteger(from.id) || !chatIdValid(String(from.id)) || typeof message?.text !== 'string') return undefined;
    const code = /^\/start ([A-Za-z0-9_-]{59})$/.exec(message.text)?.[1];
    return code && validUuid(code.slice(0, 36)) ? { updateId: BigInt(id), chatId: String(from.id), code } : undefined;
}

export class TelegramWebhook {
    constructor(private readonly db: PrismaClient | undefined, private readonly auth: AuthConfig | undefined, private readonly config: TelegramConfig) {}

    async receive(body: unknown, secret: unknown, now = new Date()) {
        if (typeof secret !== 'string' || !equalSecret(secret, this.config.webhookSecret)) throw new NotFoundException();
        const start = telegramStart(body);
        if (!start) return;
        const { chatId, code, updateId } = start;
        const allowed = [...this.config.approved.values()].filter(pair => pair.telegramUserId === chatId);
        if (!allowed.length) return;
        if (!this.db || !this.auth) throw new ServiceUnavailableException();
        const { botId, encryptionKey } = this.config;
        const auth = this.auth;
        await serializable(this.db, async tx => {
            const pair = await tx.telegramPairing.findFirst({ where: { telegramBotId: botId, id: code.slice(0, 36),
                OR: allowed.map(({ shopId, userId }) => ({ shopId, userId })) } });
            if (!pair || pair.usedAt || pair.expiresAt <= now || !equalSecret(code, telegramPairingCode(auth, pair))) return;
            if (await tx.telegramPairing.findUnique({ where: { telegramBotId_telegramUpdateId: { telegramBotId: botId, telegramUpdateId: updateId } } })) return;
            const { shopId, userId } = pair;
            if (!await canInShop(tx, userId, shopId, 'notifications.manage')) return;
            const binding = { shopId, userId, fingerprint: fingerprint('telegram:' + botId + ':' + chatId) };
            const where = { shopId_fingerprint: { shopId, fingerprint: binding.fingerprint } };
            const existing = await tx.notificationDevice.findUnique({ where });
            if (existing && (existing.userId !== userId || existing.channel !== 'telegram')) return;
            const encrypted = sealDeviceSecret(encryptionKey, 'telegram-chat-v1:' + botId, binding, chatId);
            const fields = { status: 'active', lastVerifiedAt: now, lastTestAt: null, telegramChatCiphertext: encrypted } as const;
            const device = await tx.notificationDevice.upsert({ where, update: { ...fields, version: { increment: 1 } },
                create: { ...binding, ...fields, channel: 'telegram', deviceName: 'Telegram đã liên kết', fixtureOutcome: 'unknown' } });
            await tx.telegramPairing.update({ where: { shopId_id: { shopId, id: pair.id } }, data: { usedAt: now, telegramUpdateId: updateId } });
            await recordAudit(tx, { shopId, actorId: userId, action: 'confirmTelegramPairing', requestId: pair.id,
                resourceType: 'device', resourceId: device.id, metadata: { version: device.version } });
        }, true);
    }
}

@Controller('integrations/telegram')
export class TelegramWebhookController {
    constructor(private readonly webhook: TelegramWebhook) {}

    @Post('updates')
    @HttpCode(200)
    async update(@Body() body: unknown, @Headers('x-telegram-bot-api-secret-token') secret: unknown) {
        await this.webhook.receive(body, secret);
        return { ok: true };
    }
}

export function openTelegramChat(config: TelegramConfig, device: NotificationDevice) {
    if (device.channel !== 'telegram' || !device.telegramChatCiphertext) return undefined;
    const chat = openDeviceSecret(config.encryptionKey, 'telegram-chat-v1:' + config.botId, device, device.telegramChatCiphertext);
    return chatIdValid(chat) && telegramApproved(config, device.shopId, device.userId)?.telegramUserId === chat ? chat : undefined;
}

export async function sendTelegram(config: TelegramConfig, chatId: string, payload: SafeNotification, origin: string, request = fetch):
    Promise<ProviderObservation> {
    const target = new URL(payload.path, origin);
    if (target.origin !== origin || target.protocol !== 'https:' || !chatIdValid(chatId)) return { status: 'failed', expired: false };
    try {
        const response = await request('https://api.telegram.org/bot' + config.botToken + '/sendMessage', {
            method: 'POST', headers: { 'content-type': 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(4000),
            body: JSON.stringify({ chat_id: chatId, text: payload.title + '\n' + payload.safeBody, protect_content: true,
                reply_markup: { inline_keyboard: [[{ text: 'Mở BotSales AI', url: target.href }]] } }),
        });
        const body = await response.json();
        if (response.ok && body?.ok === true && String(body.result?.chat?.id) === chatId && Number.isSafeInteger(body.result.message_id) &&
            body.result.message_id > 0) return { status: 'accepted_by_provider', expired: false };
        if (body?.ok === false && body.error_code === response.status && response.status >= 400 && response.status < 500 &&
            ![408, 409].includes(response.status)) return { status: 'failed', expired: response.status === 403 };
    } catch { /* A missing response is ambiguous. */ }
    return { status: 'unknown', expired: false };
}
