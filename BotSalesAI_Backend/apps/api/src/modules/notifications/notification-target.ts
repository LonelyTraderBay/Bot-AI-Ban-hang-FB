import type { NotificationDevice } from '../../generated/prisma/client.js';
import { openTelegramChat, sendTelegram, type TelegramConfig } from './telegram.js';
import { openPushSubscription, sendWebPush, type SafeNotification, type WebPushConfig } from './web-push.js';

export type NotificationProviders = { webPush?: WebPushConfig; telegram?: TelegramConfig; appOrigin?: string };

export function notificationTarget(device: NotificationDevice, { webPush, telegram, appOrigin }: NotificationProviders) {
    if (device.channel === 'web_push' && webPush && device.pushSubscriptionCiphertext) {
        const subscription = openPushSubscription(webPush, device, device.pushSubscriptionCiphertext);
        if (subscription) return (payload: SafeNotification, ttl: number, request?: typeof fetch) =>
            sendWebPush(webPush, subscription, payload, ttl, request);
    }
    if (device.channel === 'telegram' && telegram && appOrigin) {
        const chat = openTelegramChat(telegram, device);
        if (chat) return (payload: SafeNotification, _ttl: number, request?: typeof fetch) =>
            sendTelegram(telegram, chat, payload, appOrigin, request);
    }
    return undefined;
}
