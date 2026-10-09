import { all, db, ensure, find, id, insert, now, str, touch } from './database';
import type { Input, Row } from './database';

const digest = async (value: string) => {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
};
const addHours = (iso: string, hours: number) => new Date(Date.parse(iso) + hours * 60 * 60 * 1000).toISOString();
export const safeConsentChallenge = (challenge: Row) => {
    const { tokenHash: _tokenHash, sessionHash: _sessionHash, identityId: _identityId, ...view } = challenge;
    if (view.status === 'pending' && Date.parse(str(view.expiresAt)) <= Date.parse(now())) view.status = 'expired';
    return view;
};

function validateDestination(customer: Row, channel: string) {
    if (channel === 'messenger') {
        ensure(str(customer.externalIdentity), 'Khách chưa có danh tính Messenger đã liên kết.', 422, 'CONSENT_DESTINATION_UNAVAILABLE');
        return;
    }
    const field = channel === 'email' ? 'email' : 'phone';
    ensure(!Array.isArray(customer.redactedFields) || !customer.redactedFields.includes(field), 'Kênh liên hệ đã bị ẩn theo quyền dữ liệu.', 403, 'CONSENT_DESTINATION_REDACTED');
    ensure(str(customer[field]), 'Khách chưa có địa chỉ cho kênh đã chọn.', 422, 'CONSENT_DESTINATION_UNAVAILABLE');
}

function updateConsent(challenge: Row, status: 'granted' | 'withdrawn') {
    const shopId = str(challenge.shopId), customerId = str(challenge.customerId), channel = str(challenge.channel);
    const history = {
        id: id('consent-event'), occurredAt: now(), actorType: 'customer',
        action: status, channel, evidenceType: 'customer_challenge',
        evidenceReference: str(challenge.id), contentVersion: challenge.contentVersion,
    };
    let consent = all('consents', shopId).find(row => row.customerId === customerId && row.purpose === 'marketing' && row.channel === channel);
    if (!consent) {
        consent = insert('consents', 'CustomerConsent', shopId, {
            customerId, purpose: 'marketing', channel, status, version: 1, history: [history],
        });
        return consent;
    }
    consent.status = status;
    consent.history = [...(Array.isArray(consent.history) ? consent.history : []), history];
    touch(consent);
    return consent;
}

function getByTokenHash(tokenHash: string) {
    return (db.consentChallenges || []).find(row => row.tokenHash === tokenHash);
}

function getBySessionHash(sessionHash: string) {
    return (db.consentChallenges || []).find(row => row.sessionHash === sessionHash);
}

export async function privacy(op: string, input: Input): Promise<unknown> {
    if (op === 'createCustomerConsentChallenge') {
        ensure(input.permissions?.includes('privacy.manage'), 'Bạn không có quyền quản lý consent.', 403, 'FORBIDDEN');
        ensure(input.permissions?.includes('customers.read'), 'Không có quyền đọc danh tính khách hàng.', 403, 'SOURCE_PERMISSION_REQUIRED');
        const customer = find('customers', input.path.customerId || '', input.shopId);
        const channel = str(input.body.channel);
        validateDestination(customer, channel);
        const active = all('consentChallenges', input.shopId).find(row => row.customerId === customer.id && row.purpose === 'marketing' && row.channel === channel && ['pending', 'exchanged'].includes(str(row.status)) && Date.parse(str(row.expiresAt)) > Date.parse(now()));
        ensure(!active, 'Đã có yêu cầu consent đang chờ trên kênh này.', 409, 'CONSENT_CHALLENGE_PENDING');
        const token = `${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '')}`;
        const challenge = insert('consentChallenges', 'ConsentChallenge', input.shopId, {
            customerId: customer.id, purpose: 'marketing', channel, action: 'confirm', status: 'pending',
            message: str(input.body.message).trim(), contentVersion: input.body.contentVersion,
            expiresAt: addHours(now(), 24), tokenHash: await digest(token), sessionHash: null,
            identityId: customer.externalIdentity, usedAt: null,
        });
        return safeConsentChallenge(challenge);
    }

    if (op === 'exchangeConsentChallenge') {
        const token = str(input.body.token);
        const challenge = getByTokenHash(await digest(token));
        ensure(challenge && ['pending', 'exchanged'].includes(str(challenge.status)) && Date.parse(str(challenge.expiresAt)) > Date.parse(now()), 'Liên kết không hợp lệ hoặc đã hết hạn.', 404, 'CONSENT_CHALLENGE_INVALID');
        ensure(str(challenge.status) !== 'exchanged', 'Liên kết đã được mở trước đó; hãy tiếp tục phiên xác nhận hiện có.', 409, 'CONSENT_CHALLENGE_REPLAY');
        const customer = find('customers', str(challenge.customerId), str(challenge.shopId));
        ensure(str(customer.externalIdentity) === str(challenge.identityId), 'Danh tính khách đã đổi sau khi tạo liên kết.', 409, 'CONSENT_IDENTITY_CHANGED');
        const challengeSessionId = `${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '')}`;
        challenge.status = 'exchanged';
        challenge.sessionHash = await digest(challengeSessionId);
        touch(challenge);
        return {
            challengeId: challenge.id, challengeSessionId, purpose: challenge.purpose, channel: challenge.channel,
            action: challenge.action, message: challenge.message, contentVersion: challenge.contentVersion,
            expiresAt: challenge.expiresAt,
        };
    }

    if (op === 'confirmConsentChallenge') {
        const sessionId = str(input.body.challengeSessionId);
        const challenge = getBySessionHash(await digest(sessionId));
        ensure(challenge && str(challenge.status) === 'exchanged' && !challenge.usedAt, 'Phiên xác nhận không hợp lệ hoặc đã được dùng.', 409, 'CONSENT_CHALLENGE_REPLAY');
        ensure(Date.parse(str(challenge.expiresAt)) > Date.parse(now()), 'Phiên xác nhận đã hết hạn.', 410, 'CONSENT_CHALLENGE_EXPIRED');
        ensure(input.body.contentVersion === challenge.contentVersion, 'Nội dung đã đổi; cần tạo liên kết mới để khách xem lại.', 409, 'CONSENT_CONTENT_CHANGED');
        const customer = find('customers', str(challenge.customerId), str(challenge.shopId));
        ensure(str(customer.externalIdentity) === str(challenge.identityId), 'Danh tính khách đã đổi sau khi tạo liên kết.', 409, 'CONSENT_IDENTITY_CHANGED');
        const decision = str(input.body.decision);
        const apply = str(challenge.action) === 'withdraw' ? decision === 'accept' : true;
        const currentConsent = all('consents', str(challenge.shopId)).find(row => row.customerId === challenge.customerId && row.purpose === challenge.purpose && row.channel === challenge.channel);
        const consent = apply ? updateConsent(challenge, str(challenge.action) === 'withdraw' || decision === 'decline' ? 'withdrawn' : 'granted') : undefined;
        if (!apply) {
            if (currentConsent) {
                currentConsent.history = [...(Array.isArray(currentConsent.history) ? currentConsent.history : []), {
                    id: id('consent-event'), occurredAt: now(), actorType: 'customer', action: 'declined', channel: challenge.channel,
                    evidenceType: 'customer_challenge', evidenceReference: challenge.id, contentVersion: challenge.contentVersion,
                }];
                touch(currentConsent);
            }
        }
        challenge.status = decision === 'accept' ? 'confirmed' : 'declined';
        challenge.usedAt = now();
        touch(challenge);
        return {
            challengeId: challenge.id, status: decision === 'accept' ? 'confirmed' : 'declined', purpose: challenge.purpose,
            channel: challenge.channel, consentStatus: consent?.status ?? currentConsent?.status ?? null,
            consentVersion: consent?.version ?? currentConsent?.version ?? null, consentRecordId: consent?.id ?? currentConsent?.id ?? null,
        };
    }

    return undefined;
}

/** DEV/TEST ONLY: a worker decision must re-read the current consent at send time. */
export function processQueuedMessage(shopId: string, messageId: string) {
    const message = find('messageJobs', messageId, shopId);
    ensure(message.status === 'queued', 'Chỉ xử lý được message đang chờ.', 409, 'MESSAGE_NOT_QUEUED');
    if (message.purpose === 'marketing') {
        const consent = all('consents', shopId).find(row => row.customerId === message.customerId && row.purpose === 'marketing' && row.channel === message.channel);
        const allowed = consent?.status === 'granted' && consent.version === message.consentVersionAtQueue;
        message.status = allowed ? 'sent' : 'suppressed';
        message.reason = allowed ? null : 'consent_missing_withdrawn_or_changed';
    }
    else {
        message.status = 'sent';
        message.reason = null;
    }
    message.processedAt = now();
    return message;
}

/** DEV/TEST ONLY: issues a customer-originated withdrawal link for a local fixture. */
export async function issueMockWithdrawalChallenge(shopId: string, customerId: string, token: string) {
    const customer = find('customers', customerId, shopId);
    const consent = all('consents', shopId).find(row => row.customerId === customerId && row.purpose === 'marketing' && row.status === 'granted');
    ensure(consent, 'Chỉ khách đang đồng ý marketing mới cần liên kết ngừng nhận tin.', 409);
    return insert('consentChallenges', 'ConsentChallenge', shopId, {
        customerId, purpose: 'marketing', channel: consent.channel, action: 'withdraw', status: 'pending',
        message: 'Xác nhận để ngừng nhận tin marketing qua kênh đã chọn. Tin nhắn dịch vụ không thay đổi.',
        contentVersion: 1, expiresAt: addHours(now(), 24), tokenHash: await digest(token), sessionHash: null,
        identityId: customer.externalIdentity, usedAt: null,
    });
}
