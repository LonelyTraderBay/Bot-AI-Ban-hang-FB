import { createHash } from 'node:crypto';

export function erasedIdentityKey(shopId: string, channel: string, pageId: string, externalId: string) {
    return 'erased:' + createHash('sha256').update(JSON.stringify(['privacy-tombstone/v1', shopId, channel, pageId, externalId])).digest('hex');
}
