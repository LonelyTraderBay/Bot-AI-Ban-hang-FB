import { http, HttpResponse } from 'msw';
import { worker } from '../../apps/web/src/mocks/browser';
import { assertSchema } from '../../apps/web/src/shared/api/validation';
import { currentSession } from '../../apps/web/src/mocks/service';
import type { SessionResponse } from '@botsales/contracts';

type MetadataMode = 'normal' | 'pending' | 'error' | 'empty';
let metadataMode: MetadataMode = 'normal';
let metadataReads = 0;
let releaseMetadata: (() => void) | undefined;
export function installMetadataBranches() {
    worker.use(http.get('*/api/v2/shops/shop-demo/conversations/metadata', async () => {
        metadataReads++;
        if (metadataMode === 'pending') await new Promise<void>(resolve => { releaseMetadata = resolve; });
        if (metadataMode === 'error') return HttpResponse.json({ type: 'about:blank', title: 'Metadata unavailable', status: 422, code: 'VALIDATION_ERROR', detail: 'Lỗi metadata kiểm thử.', requestId: 'shared-metadata-error' }, { status: 422 });
        if (metadataMode === 'empty') {
            const envelope = { data: { channels: [], assignees: [] }, meta: { requestId: 'shared-metadata-empty', asOf: '2026-10-09T00:00:00Z' } };
            assertSchema('InboxMetadataResponse', envelope);
            return HttpResponse.json(envelope);
        }
        return undefined;
    }));
}
export function metadataState() { return { mode: metadataMode, reads: metadataReads, pending: !!releaseMetadata }; }
export function setMetadataMode(mode: MetadataMode) { metadataMode = mode; }
export function finishMetadata() {
    if (!releaseMetadata) throw new Error('No pending metadata request');
    metadataMode = 'normal'; releaseMetadata(); releaseMetadata = undefined;
}

let sessionVersion = 20_000;
/** Only the validated session read is overridden; real role/permission contracts stay intact. */
export function installDashboardPermissions(tuple: { ops: boolean; orders: boolean; create: boolean }) {
    const data = structuredClone(currentSession()) as SessionResponse['data'];
    const overrides = { 'operations.read': tuple.ops, 'orders.read': tuple.orders, 'orders.write': tuple.create };
    data.memberships = data.memberships.map(membership => membership.shopId !== 'shop-demo' ? membership : {
        ...membership, permissionVersion: ++sessionVersion,
        permissions: membership.permissions.filter(permission => !(permission in overrides) || overrides[permission as keyof typeof overrides]),
    });
    const envelope = { data, meta: { requestId: `shared-dashboard-${sessionVersion}`, asOf: '2026-10-09T00:00:00Z' } };
    assertSchema('SessionResponse', envelope);
    worker.use(http.get('*/api/v2/session', () => HttpResponse.json(envelope)));
}
