import { beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { assertSchema } from '../src/shared/api/validation';
import { db } from '../src/mocks/database';
import { CSRF, handle, resetService, setRole } from '../src/mocks/service';
import { issueMockWithdrawalChallenge, processQueuedMessage } from '../src/mocks/privacy';

let requestNumber = 0;
const headers = () => ({ 'x-csrf-token': CSRF, 'idempotency-key': `consent-test-${++requestNumber}` });
const request = (op: string, body: Record<string, unknown>, path: Record<string, string> = {}) => handle({ op, path, body, headers: headers() });
const get = (op: string, path: Record<string, string> = {}) => handle({ op, path, query: new URLSearchParams(), headers: {} });
const row = (value: unknown) => value as Record<string, unknown>;

beforeEach(() => {
    vi.stubGlobal('crypto', webcrypto);
    resetService();
});

describe('consent challenge ownership and lifecycle', () => {
    it('keeps a requested challenge pending and does not create consent until customer confirmation', async () => {
        const created = await request('createCustomerConsentChallenge', {
            purpose: 'marketing', channel: 'messenger',
            message: 'Bạn có đồng ý nhận nội dung tiếp thị qua Messenger không?', contentVersion: 1,
        }, { shopId: 'shop-demo', customerId: 'c4' });
        expect(row(created.data).status).toBe('pending');
        expect(db.consents.some(consent => consent.shopId === 'shop-demo' && consent.customerId === 'c4')).toBe(false);
        expect(row(created.data)).not.toHaveProperty('tokenHash');
        expect(row(created.data)).not.toHaveProperty('identityId');
        assertSchema('ConsentChallenge', created.data);
    });

    it('does not mutate challenge state on GET and refuses a client-supplied identity', async () => {
        const before = JSON.stringify(db.consentChallenges);
        await get('listCustomerConsentChallenges', { shopId: 'shop-demo' });
        expect(JSON.stringify(db.consentChallenges)).toBe(before);
        expect(() => assertSchema('ConsentChallengeExchangeRequest', { token: 'x'.repeat(40), customerId: 'c1' })).toThrow();
        setRole('manager');
        await expect(get('listCustomerConsents', { shopId: 'shop-demo' })).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    it('rejects expired, identity-changed, content-changed and replayed challenges', async () => {
        const expired = await issueMockWithdrawalChallenge('shop-demo', 'c2', 'expired-consent-challenge-token-20261009');
        expired.expiresAt = '2020-01-01T00:00:00Z';
        await expect(request('exchangeConsentChallenge', { token: 'expired-consent-challenge-token-20261009' })).rejects.toMatchObject({ status: 404, code: 'CONSENT_CHALLENGE_INVALID' });

        const changedIdentityToken = 'identity-bound-consent-challenge-token-20261009';
        await issueMockWithdrawalChallenge('shop-demo', 'c2', changedIdentityToken);
        const exchange = await request('exchangeConsentChallenge', { token: changedIdentityToken });
        assertSchema('PublicConsentChallengeView', exchange.data);
        const view = row(exchange.data);
        expect(view).not.toHaveProperty('customerId');
        expect(view).not.toHaveProperty('identityId');
        const target = db.customers.find(customer => customer.id === 'c2');
        if (!target) throw new Error('Missing consent fixture customer.');
        const identity = target.externalIdentity;
        target.externalIdentity = 'identity-changed-after-link';
        await expect(request('confirmConsentChallenge', {
            challengeSessionId: String(view.challengeSessionId), decision: 'accept', contentVersion: 1,
        })).rejects.toMatchObject({ status: 409, code: 'CONSENT_IDENTITY_CHANGED' });
        const restoredTarget = db.customers.find(customer => customer.id === 'c2');
        if (restoredTarget) restoredTarget.externalIdentity = identity;

        const contentToken = 'content-bound-consent-challenge-token-20261009';
        await issueMockWithdrawalChallenge('shop-demo', 'c2', contentToken);
        const contentView = row((await request('exchangeConsentChallenge', { token: contentToken })).data);
        await expect(request('confirmConsentChallenge', {
            challengeSessionId: String(contentView.challengeSessionId), decision: 'accept', contentVersion: 2,
        })).rejects.toMatchObject({ status: 409, code: 'CONSENT_CONTENT_CHANGED' });
        const confirmed = await request('confirmConsentChallenge', {
            challengeSessionId: String(contentView.challengeSessionId), decision: 'accept', contentVersion: 1,
        });
        expect(row(confirmed.data).consentStatus).toBe('withdrawn');
        await expect(request('confirmConsentChallenge', {
            challengeSessionId: String(contentView.challengeSessionId), decision: 'accept', contentVersion: 1,
        })).rejects.toMatchObject({ status: 409, code: 'CONSENT_CHALLENGE_REPLAY' });
    });

    it('suppresses a pre-opt-out marketing queue item at dispatch while preserving service delivery', async () => {
        const token = 'local-demo-optout-consent-challenge-20261009';
        const before = db.messageJobs.find(message => message.id === 'marketing-queued-c2-before-optout');
        expect(before?.status).toBe('queued');
        const challenge = row((await request('exchangeConsentChallenge', { token })).data);
        const confirmation = await request('confirmConsentChallenge', {
            challengeSessionId: String(challenge.challengeSessionId), decision: 'accept', contentVersion: 1,
        });
        expect(row(confirmation.data).consentStatus).toBe('withdrawn');
        const marketing = processQueuedMessage('shop-demo', 'marketing-queued-c2-before-optout');
        const service = processQueuedMessage('shop-demo', 'service-queued-c2-before-optout');
        expect(marketing.status).toBe('suppressed');
        expect(marketing.reason).toBe('consent_missing_withdrawn_or_changed');
        expect(service.status).toBe('sent');
        const consent = db.consents.find(record => record.customerId === 'c2');
        expect(consent?.version).toBe(2);
        expect((consent?.history as unknown[]).length).toBe(2);
    });

    it('keeps the actual consent record when a customer declines a withdrawal request', async () => {
        const token = 'customer-keeps-consent-after-withdrawal-request-20261009';
        const original = db.consents.find(consent => consent.shopId === 'shop-demo' && consent.customerId === 'c2' && consent.status === 'granted');
        if (!original) throw new Error('Missing granted consent fixture.');
        const before = { id: original.id, version: original.version, status: original.status, historyLength: (original.history as unknown[]).length };
        await issueMockWithdrawalChallenge('shop-demo', 'c2', token);
        const challenge = row((await request('exchangeConsentChallenge', { token })).data);
        const result = row((await request('confirmConsentChallenge', {
            challengeSessionId: String(challenge.challengeSessionId), decision: 'decline', contentVersion: 1,
        })).data);
        expect(result).toMatchObject({
            status: 'declined', consentStatus: before.status, consentVersion: before.version + 1, consentRecordId: before.id,
        });
        expect(original.status).toBe(before.status);
        expect(original.version).toBe(before.version + 1);
        expect((original.history as unknown[]).length).toBe(before.historyLength + 1);
    });

    it('requires the same idempotency key to replay a successful response', async () => {
        const requestKey = 'consent-stable-retry-key';
        const first = await handle({
            op: 'exchangeConsentChallenge', path: {}, body: { token: 'local-demo-reconfirm-consent-challenge-20261009' },
            headers: { 'x-csrf-token': CSRF, 'idempotency-key': requestKey },
        });
        const retry = await handle({
            op: 'exchangeConsentChallenge', path: {}, body: { token: 'local-demo-reconfirm-consent-challenge-20261009' },
            headers: { 'x-csrf-token': CSRF, 'idempotency-key': requestKey },
        });
        expect(retry.data).toEqual(first.data);
        await expect(handle({
            op: 'exchangeConsentChallenge', path: {}, body: { token: 'local-demo-reconfirm-consent-challenge-20261009' },
            headers: { 'x-csrf-token': CSRF, 'idempotency-key': 'different-consent-key' },
        })).rejects.toMatchObject({ status: 409, code: 'CONSENT_CHALLENGE_REPLAY' });
    });
});
