import { useEffect, useState, useSyncExternalStore } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { request } from '@/shared/api/client';
import { intentSnapshot, subscribeIntents, resolveObservedIntent } from '@/shared/api/intents';
import { useScope } from '@/shared/model/scope';
export function CommandRecovery() {
    const { shop, session, membership } = useScope();
    const cache = useQueryClient();
    const intents = useSyncExternalStore(subscribeIntents, intentSnapshot, intentSnapshot).filter(x => x.shopId === shop.id);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => { if (!intents.length)
        return; const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [intents.length]);
    if (!intents.length)
        return null;
    async function check() { setBusy(true); setMessage(''); try {
        for (const intent of intents) {
            if (!intent.commandId)
                continue;
            const result = await request('getCommand', { path: { shopId: shop.id, commandId: intent.commandId } });
            if (result.data.status === 'succeeded' || result.data.status === 'failed') {
                resolveObservedIntent(intent.intentId);
                await cache.invalidateQueries({ queryKey: ['scope', session.user.id, shop.id, membership.permissionVersion] });
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
    return <Box sx={{ mx: { xs: 2, md: 4 }, mt: 2 }}><Alert severity="warning"><Typography fontWeight={700}>Có {intents.length} thao tác chưa xác minh kết quả</Typography><Typography variant="body2">Không gửi lại hoặc đóng trang để bỏ qua cảnh báo. Lệnh chỉ được mở khóa sau khi backend trả trạng thái đã kết thúc.</Typography><Stack spacing={.5} sx={{ my: 1 }}>{intents.map(x => <Typography key={x.intentId} variant="caption" sx={{ overflowWrap: 'anywhere' }}>{x.operation} · intent {x.intentId} · {x.commandId ? `lệnh ${x.commandId}` : 'chưa nhận được mã lệnh; cần người vận hành đối chiếu intent trên backend'}</Typography>)}</Stack><Button disabled={busy || intents.every(x => !x.commandId)} onClick={() => void check()}>Kiểm tra trạng thái lệnh</Button>{message && <Typography variant="body2">{message}</Typography>}</Alert></Box>;
}
