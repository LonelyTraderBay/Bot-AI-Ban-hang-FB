import { createECDH, ECDH } from 'node:crypto';
import webPush from 'web-push';
import { openDeviceSecret, sealDeviceSecret, validBase64Key as validPushKey, type DeviceBinding } from './device-secrets.js';

export type SubscriptionWrite = { endpoint: string; p256dh: string; auth: string };
export type WebPushConfig = { vapid: { subject: string; publicKey: string; privateKey: string }; encryptionKey: Buffer };
export type SafeNotification = { eventId: string; title: string; safeBody: string; path: string };
export type ProviderObservation = { status: 'accepted_by_provider' | 'failed' | 'unknown'; expired: boolean };
export { validPushKey };

const providers = new Set(['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com']);
const providerAuth = new WeakMap<WebPushConfig, Map<string, { refreshAt: number; header: string }>>();

export function readWebPushConfig(env: NodeJS.ProcessEnv): WebPushConfig | undefined {
    const { WEB_PUSH_SUBJECT: subject, WEB_PUSH_PUBLIC_KEY: publicKey, WEB_PUSH_PRIVATE_KEY: privateKey,
        WEB_PUSH_ENCRYPTION_KEY: encryption } = env;
    if (!subject && !publicKey && !privateKey && !encryption) return undefined;
    const invalid = () => new Error('Set a matching WEB_PUSH_SUBJECT, WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY and WEB_PUSH_ENCRYPTION_KEY');
    if (!subject || !/^mailto:[^\s@?#]+@[^\s@?#]+\.[^\s@?#]+$/.test(subject) || !publicKey || !validPushKey(publicKey, 65) ||
        !privateKey || !validPushKey(privateKey, 32) || !encryption || !validPushKey(encryption, 32) || encryption === privateKey) throw invalid();
    try {
        const pair = createECDH('prime256v1');
        pair.setPrivateKey(privateKey, 'base64url');
        if (pair.getPublicKey('base64url', 'uncompressed') !== publicKey) throw invalid();
    } catch { throw invalid(); }
    return { vapid: { subject, publicKey, privateKey }, encryptionKey: Buffer.from(encryption, 'base64url') };
}

export function validWebPushSubscription(input: SubscriptionWrite) {
    const { endpoint, p256dh, auth } = input;
    const url = typeof endpoint === 'string' && URL.parse(endpoint);
    if (!url || url.protocol !== 'https:' || url.port || url.username || url.password || url.hash || url.pathname === '/' ||
        !providers.has(url.hostname) || !validPushKey(p256dh, 65) || !validPushKey(auth, 16)) return undefined;
    if ((url.hostname === 'fcm.googleapis.com' && !/^\/fcm\/send\/[^/]+$/.test(url.pathname)) ||
        (url.hostname === 'updates.push.services.mozilla.com' && !/^\/wpush\/v2\/[^/]+$/.test(url.pathname))) return undefined;
    try {
        if (ECDH.convertKey(p256dh, 'prime256v1', 'base64url', 'base64url', 'uncompressed') !== p256dh) return undefined;
    } catch { return undefined; }
    return { endpoint: url.href, p256dh, auth };
}

export function sealPushSubscription(config: WebPushConfig, binding: DeviceBinding, subscription: SubscriptionWrite) {
    return sealDeviceSecret(config.encryptionKey, 'web-push-subscription-v1', binding, subscription);
}

export function openPushSubscription(config: WebPushConfig, binding: DeviceBinding, sealed: string) {
    const secret = openDeviceSecret(config.encryptionKey, 'web-push-subscription-v1', binding, sealed);
    return secret && typeof secret === 'object' ? validWebPushSubscription(secret as SubscriptionWrite) : undefined;
}

function authorization(config: WebPushConfig, origin: string) {
    let cached = providerAuth.get(config);
    if (!cached) {
        cached = new Map();
        providerAuth.set(config, cached);
    }
    const now = Date.now();
    const prior = cached.get(origin);
    if (prior && prior.refreshAt > now) return prior.header;
    const { subject, publicKey, privateKey } = config.vapid;
    const header = webPush.getVapidHeaders(origin, subject, publicKey, privateKey, 'aes128gcm',
        Math.floor(now / 1000) + 43_200).Authorization;
    cached.set(origin, { refreshAt: now + 21_600_000, header });
    return header;
}

export async function sendWebPush(config: WebPushConfig, subscription: SubscriptionWrite, payload: SafeNotification, ttl: number,
    request = fetch): Promise<ProviderObservation> {
    const target = validWebPushSubscription(subscription);
    if (!target) return { status: 'failed', expired: false };
    try {
        const { endpoint, p256dh, auth } = target;
        const result = webPush.generateRequestDetails({ endpoint, keys: { p256dh, auth } }, JSON.stringify(payload),
            { TTL: ttl, contentEncoding: 'aes128gcm', urgency: 'normal' });
        const headers = { ...result.headers, Authorization: authorization(config, new URL(endpoint).origin) };
        const response = await request(endpoint, { method: 'POST', headers, body: new Uint8Array(result.body!),
            redirect: 'error', signal: AbortSignal.timeout(4000) });
        await response.body?.cancel().catch(() => undefined);
        if (response.status === 201 || response.status === 202) return { status: 'accepted_by_provider', expired: false };
        if (response.status === 404 || response.status === 410) return { status: 'failed', expired: true };
        if (response.status >= 400 && response.status < 500 && ![408, 409].includes(response.status)) return { status: 'failed', expired: false };
    } catch { /* An unwitnessed result may already have been accepted. */ }
    return { status: 'unknown', expired: false };
}
