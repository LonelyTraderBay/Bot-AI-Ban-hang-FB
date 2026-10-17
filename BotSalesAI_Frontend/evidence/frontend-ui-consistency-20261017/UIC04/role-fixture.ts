import { http, HttpResponse } from 'msw';
import { worker } from '../../../apps/web/src/mocks/browser';
import { currentSession, setRole } from '../../../apps/web/src/mocks/service';
import { assertSchema } from '../../../apps/web/src/shared/api/validation';

export function installRoleFixture(role: 'owner' | 'viewer' | 'sales') {
    setRole(role);
    const envelope = {
        data: currentSession(),
        meta: { requestId: `uic04-role-${role}`, asOf: '2026-10-17T01:00:00Z' },
    };
    assertSchema('SessionResponse', envelope);
    worker.use(http.get('*/api/v2/session', () => HttpResponse.json(envelope)));
    return envelope.data.memberships.find(membership => membership.shopId === 'shop-demo')?.permissions || [];
}
