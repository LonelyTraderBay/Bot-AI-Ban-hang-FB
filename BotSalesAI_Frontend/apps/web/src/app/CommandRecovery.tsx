import { ActionGroup } from '../shared/ui/composition';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { request } from '@/shared/api/client';
import { intentInScope, intentSnapshot, subscribeIntents, resolveObservedIntent } from '@/shared/api/intents';
import { useScope } from '@/shared/model/scope';
import { CopyableCode } from '@/shared/ui/components';
import { layoutSx } from '@/shared/ui/layout';
export function CommandRecovery() {
    const { shop, session, membership } = useScope();
    const cache = useQueryClient();
    const intents = useSyncExternalStore(subscribeIntents, intentSnapshot, intentSnapshot)
        .filter(intent => intentInScope(intent, shop.id, session.user.id));
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => { if (!intents.length)
        return; const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [intents.length]);
    if (!intents.length)
        return null;
    async function check() { setBusy(true); setMessage(''); try {
        for (const intent of intents) {
            if (!intent.commandId && !intent.actorId)
                continue;
            const command = intent.commandId
                ? (await request('getCommand', { path: { shopId: shop.id, commandId: intent.commandId } })).data
                : (await request('listCommands', { path: { shopId: shop.id }, query: { kind: intent.operation, q: intent.intentId, limit: 1 } })).data[0];
            if (command?.status === 'succeeded' || command?.status === 'failed') {
                resolveObservedIntent(intent);
                await cache.invalidateQueries({ queryKey: ['scope', session.user.id, shop.id, membership.permissionVersion] });
                if (intent.operation === 'closeShop' || intent.operation === 'reopenShop') {
                    await Promise.all([
                        cache.invalidateQueries({ queryKey: ['shop', session.user.id, shop.id] }),
                        cache.invalidateQueries({ queryKey: ['shops', session.user.id] }),
                    ]);
                }
            }
            else
                setMessage('Backend chưa xác minh kết quả. Thao tác tương ứng tiếp tục bị khóa.');
        }
    }
    catch (e) {
        setMessage(e instanceof Error ? e.message : 'Chưa kiểm tra được lệnh.');
    }
    finally {
        setBusy(false);
    } }
    return <Box sx={layoutSx.shell.statusBanner}><Alert severity="warning"><Typography fontWeight={visualSx.typography.fontWeight.bold}>Có {intents.length} thao tác chưa xác minh kết quả</Typography><Typography variant="body2">Kiểm tra trạng thái trước khi gửi lại. Thao tác được mở khóa khi backend xác nhận lệnh đã kết thúc.</Typography><Stack sx={layoutSx.query.stateGap}>{intents.map(x => <ActionGroup key={x.operation + ':' + x.intentId} direction="row" alignItems="center" flexWrap="wrap" ><Typography variant="caption" sx={{ overflowWrap: 'anywhere' }}>{x.operation} · mã đối chiếu {x.intentId} ·</Typography>{x.commandId ? <CopyableCode value={x.commandId} label="mã lệnh" /> : <Typography variant="caption">{x.actorId ? 'chưa nhận được mã lệnh' : 'chưa nhận được mã lệnh; cần người vận hành đối chiếu mã intent với backend'}</Typography>}</ActionGroup>)}</Stack><Button disabled={busy || intents.every(x => !x.commandId && !x.actorId)} onClick={() => void check()}>Kiểm tra trạng thái lệnh</Button>{message && <Typography variant="body2">{message}</Typography>}</Alert></Box>;
}
