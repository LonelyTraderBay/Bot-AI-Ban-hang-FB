import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert } from '@mui/material';
import type { EventEnvelope } from '@botsales/contracts';
import { useScope } from '@/shared/model/scope';
import { operationUrl } from '@/shared/api/client';
import { assertSchema } from '@/shared/api/validation';
import { eventInvalidations } from '@/shared/api/event-invalidation';
import { layoutSx } from '@/shared/ui/layout';
export function ScopeEvents() {
    const scope = useScope();
    const cache = useQueryClient();
    const [disconnected, setDisconnected] = useState(false);
    const { shop, membership, session, refreshSession } = scope;
    useEffect(() => {
        let live = true, lastSequence: number | null = null;
        const seen = new Set<string>();
        const stream = new EventSource(operationUrl('subscribeEvents', { shopId: shop.id }), { withCredentials: true });
        const key = ['scope', session.user.id, shop.id, membership.permissionVersion];
        stream.onopen = () => { if (live) {
            setDisconnected(false);
            void cache.invalidateQueries({ queryKey: key });
        } };
        stream.onerror = () => { if (live)
            setDisconnected(true); };
        stream.onmessage = event => {
            if (!live)
                return;
            try {
                const payload: unknown = JSON.parse(event.data);
                assertSchema<EventEnvelope>('EventEnvelope', payload);
                if (payload.shopId !== shop.id || seen.has(payload.eventId))
                    return;
                seen.add(payload.eventId);
                if (seen.size > 500)
                    seen.delete(seen.values().next().value!);
                if (payload.type === 'session.revoked') {
                    stream.close();
                    void refreshSession();
                    return;
                }
                if (lastSequence !== null && payload.sequence <= lastSequence)
                    return;
                const gap = lastSequence !== null && payload.sequence !== lastSequence + 1;
                lastSequence = payload.sequence;
                const affected = gap ? null : eventInvalidations(payload);
                if (affected) {
                    for (const operation of affected) void cache.invalidateQueries({ queryKey: [...key, operation] });
                } else void cache.invalidateQueries({ queryKey: key });
            }
            catch {
                void cache.invalidateQueries({ queryKey: key });
            }
        };
        return () => { live = false; stream.close(); };
    }, [cache, shop.id, membership.permissionVersion, session.user.id, refreshSession]);
    return disconnected ? <Alert severity="warning" sx={layoutSx.shell.statusBanner}>Mất cập nhật trực tiếp. Dữ liệu có thể cũ; tải lại để đối chiếu trước thao tác.</Alert> : null;
}
