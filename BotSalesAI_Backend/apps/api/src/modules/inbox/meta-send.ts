import { createHash } from 'node:crypto';
import type { metaReplyTarget } from './message-data.js';

type MetaTarget = NonNullable<ReturnType<typeof metaReplyTarget>>;
export type MetaSendResult =
    | { status: 'sent'; reason: 'accepted'; externalId: string }
    | { status: 'failed'; reason: 'token_rejected' | 'rate_limited' | 'provider_rejected' | 'send_ineligible' }
    | { status: 'unknown'; reason: 'outcome_unconfirmed' | 'attempt_interrupted' };

export async function sendMetaReply(target: MetaTarget, text: string, request: typeof fetch): Promise<MetaSendResult> {
    const { version, pageId, recipient, accessToken } = target;
    try {
        const response = await request(`https://graph.facebook.com/${version}/${pageId}/messages`, {
            method: 'POST', redirect: 'error', signal: AbortSignal.timeout(4000),
            headers: { authorization: 'Bearer ' + accessToken, 'content-type': 'application/json' },
            body: JSON.stringify({ messaging_type: 'RESPONSE', recipient: { id: recipient }, message: { text } }),
        });
        const data = await response.json();
        if (response.ok && !data?.error && data?.recipient_id === recipient &&
            typeof data.message_id === 'string' && data.message_id.length > 0 && data.message_id.length <= 512) {
            return { status: 'sent', reason: 'accepted', externalId: 'meta-out:' + createHash('sha256').update(data.message_id).digest('hex') };
        }
        const code = data?.error?.code;
        if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 409 && Number.isInteger(code)) {
            const reason = code === 190 ? 'token_rejected'
                : response.status === 429 || [4, 17, 32, 613].includes(code) ? 'rate_limited' : 'provider_rejected';
            return { status: 'failed', reason };
        }
    } catch {
        // A transport error can follow a successful send.
    }
    return { status: 'unknown', reason: 'outcome_unconfirmed' };
}
