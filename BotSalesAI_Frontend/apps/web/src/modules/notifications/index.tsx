import { useEffect, useState } from 'react';
import { Alert, Box, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import NotificationsActiveRounded from '@mui/icons-material/NotificationsActiveRounded';
import SmartphoneRounded from '@mui/icons-material/SmartphoneRounded';
import type { DeviceSubscription, NotificationPolicyWrite, TelegramPairing } from '@botsales/contracts';
import { colors } from '@botsales/tokens';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useCan, useScope } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { dateTime } from '@/shared/model/format';
import { PageHeader, Panel, DataTable, QueryState, Toolbar, Pager, Status, MutationButton, ErrorNotice, ConfirmDialog, RouteLink } from '@/shared/ui/components';
import { assertPushCapability, assertPushPermissionGranted } from './push-capabilities';
export function NotificationsPage() {
    const { shop, session } = useScope();
    const list = useApi('listNotifications', { query: useListQuery() });
    const ack = useCommand('acknowledgeNotification', ['listNotifications', 'listWorkItems', 'listPrepJobs', 'getOperationsSummary']);
    return <><PageHeader title="Trung tâm thông báo" subtitle="Đã gửi không đồng nghĩa đã đọc. Nhận việc là một xác nhận riêng." actions={<RouteLink to={`/s/${shop.id}/notifications/devices`}>Điện thoại & lịch trực</RouteLink>}/><ErrorNotice error={ack.error}/><Panel><Toolbar /><QueryState query={list}><Stack gap={2} sx={{ p: 3 }}>{list.data?.data.map(n => <Box key={n.id} sx={{
        p: 2.5, border: 1, borderColor: n.acknowledgedAt ? 'divider' : colors.heroBorder, borderRadius: 3, bgcolor: n.acknowledgedAt ? 'transparent' : colors.selected
    }}><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}><Stack direction="row" gap={2}><NotificationsActiveRounded sx={{ color: 'primary.main', mt: .5 }}/><Box><Typography variant="h6">{n.title}</Typography><Typography color="text.secondary" sx={{ my: 1 }}>{n.safeBody}</Typography><Stack direction="row" gap={1} flexWrap="wrap"><Status value={n.deliveryStatus}/><Typography variant="caption" sx={{ alignSelf: 'center' }}>{n.channel} · {dateTime(n.createdAt, shop.timezone)}</Typography></Stack><Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{n.acknowledgedAt ? `Đã nhận việc lúc ${dateTime(n.acknowledgedAt, shop.timezone)}` : n.openedAt ? 'Có ghi nhận mở thông báo; chưa nhận việc.' : 'Chưa có bằng chứng đã mở hoặc nhận việc.'}</Typography></Box></Stack><Stack justifyContent="center" gap={1}><MutationButton permission="operations.claim" allowedActions={n.allowedActions} action="acknowledge" disabled={!n.workItemId || n.recipientUserId !== session.user.id} busy={ack.pending} variant="contained" onClick={() => void ack.execute({ path: { resourceId: n.id }, body: { expectedVersion: n.version } }).catch(() => undefined)}>Tôi nhận chuẩn bị đơn</MutationButton>{n.source.type === 'order' && <RouteLink to={`/s/${shop.id}/orders/${n.source.id}`}>Xem đơn</RouteLink>}</Stack></Stack></Box>)}{list.data?.data.length === 0 && <Alert severity="info" role="status">Chưa có thông báo. Thông báo chuẩn bị được tạo sau khi đơn đã xác nhận và giữ hàng thành công.</Alert>}<Pager page={list.data?.page}/></Stack></QueryState></Panel></>;
}
function base64Bytes(value: string) { const padded = (value + '='.repeat((4 - value.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'); const raw = atob(padded); const bytes = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++)
    bytes[i] = raw.charCodeAt(i); return bytes; }
function validatePolicy(input: { enabled: boolean; minutes: string; max: string; primary: string[]; quiet: boolean; quietStart: string; quietEnd: string; channel: 'none' | 'telegram'; telegramAvailable: boolean }) {
    const reminder = input.minutes.trim();
    const maximum = input.max.trim();
    if (maximum === '' || !Number.isSafeInteger(Number(maximum)) || Number(maximum) < 0)
        return 'Số lần nhắc tối đa phải là số nguyên từ 0 trở lên.';
    if (reminder && (!Number.isSafeInteger(Number(reminder)) || Number(reminder) < 1))
        return 'Thời gian nhắc phải là số nguyên từ 1 phút trở lên.';
    if (input.enabled && !reminder)
        return 'Cần nhập thời gian nhắc khi bật quy tắc.';
    if (input.enabled && !input.primary.length)
        return 'Cần chọn ít nhất một người nhận chính khi bật quy tắc.';
    if (input.quiet && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.quietStart) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.quietEnd)))
        return 'Giờ yên lặng cần có thời điểm bắt đầu và kết thúc hợp lệ.';
    if (input.channel === 'telegram' && !input.telegramAvailable)
        return 'Chưa có thiết bị Telegram active. Hoàn tất liên kết thật trước khi chọn kênh này.';
    return '';
}
export function DevicesPage() {
    const { shop, session } = useScope();
    const devices = useApi('listDevices', { query: { limit: 100 } });
    const policy = useApi('getNotificationPolicy');
    const members = useApi('listMembers', { query: { limit: 100 } }, useCan('members.manage'));
    const register = useCommand('createDevice', ['listDevices']);
    const test = useCommand('testDevice', ['listDevices', 'listNotifications']);
    const revoke = useCommand('revokeDevice', ['listDevices']);
    const save = useCommand('updateNotificationPolicy', ['getNotificationPolicy']);
    const pair = useCommand('beginTelegramPairing', []);
    const [deviceName, setDeviceName] = useState('Điện thoại của tôi'), [error, setError] = useState<Error | null>(null), [pending, setPending] = useState(false), [selected, setSelected] = useState<DeviceSubscription | null>(null), [pairing, setPairing] = useState<TelegramPairing | null>(null), [deviceTestMessage, setDeviceTestMessage] = useState('');
    const [enabled, setEnabled] = useState(false), [minutes, setMinutes] = useState(''), [max, setMax] = useState('2'), [quiet, setQuiet] = useState(false), [quietStart, setQuietStart] = useState('22:00'), [quietEnd, setQuietEnd] = useState('08:00'), [primary, setPrimary] = useState<string[]>([]), [fallback, setFallback] = useState<string[]>([]), [channel, setChannel] = useState<'none' | 'telegram'>('none'), [urgent, setUrgent] = useState(false);
    useEffect(() => { if (policy.data) {
        const p = policy.data.data;
        setEnabled(p.enabled);
        setMinutes(p.remindAfterMinutes?.toString() || '');
        setMax(String(p.maxReminders));
        setQuiet(!!p.quietHours);
        setQuietStart(p.quietHours?.start || '22:00');
        setQuietEnd(p.quietHours?.end || '08:00');
        setPrimary(p.primaryUserIds);
        setFallback(p.fallbackUserIds);
        setChannel(p.fallbackChannel);
        setUrgent(p.urgentMayBypassQuietHours);
    } }, [policy.data]);
    const deviceRegister = async () => {
        setError(null);
        setPending(true);
        try {
            if (__MOCK__) {
                await register.execute({ body: { deviceName: deviceName.trim(), endpoint: 'https://example.test/mock-push', p256dh: 'synthetic-device-public-key', auth: 'synthetic-device-auth' } });
                return;
            }
            assertPushCapability({ secureContext: window.isSecureContext, serviceWorker: 'serviceWorker' in navigator, pushManager: 'PushManager' in window, notification: 'Notification' in window });
            const key = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
            if (!key)
                throw new Error('Chưa có khóa VAPID công khai từ backend trong VITE_WEB_PUSH_PUBLIC_KEY.');
            assertPushPermissionGranted(await Notification.requestPermission());
            const service = await navigator.serviceWorker.register('/app-sw.js', { scope: '/' });
            await navigator.serviceWorker.ready;
            const subscription = await service.pushManager.getSubscription() || await service.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64Bytes(key) });
            const json = subscription.toJSON();
            if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth)
                throw new Error('Đăng ký Push không trả đủ dữ liệu.');
            await register.execute({ body: { deviceName: deviceName.trim(), endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth } });
        }
        catch (e) {
            setError(e instanceof Error ? e : new Error('Không đăng ký được thiết bị'));
        }
        finally {
            setPending(false);
        }
    };
    const telegramAvailable = !!devices.data?.data.some(d => d.channel === 'telegram' && d.status === 'active');
    const policyError = validatePolicy({ enabled, minutes, max, primary, quiet, quietStart, quietEnd, channel, telegramAvailable });
    const savePolicy = async () => { if (!policy.data || policyError)
        return; const body: NotificationPolicyWrite = {
        expectedVersion: policy.data.data.version, enabled, timezone: shop.timezone, quietHours: quiet ? { start: quietStart, end: quietEnd } : null, remindAfterMinutes: minutes.trim() ? Number(minutes) : null, maxReminders: Number(max), primaryUserIds: primary, fallbackUserIds: fallback, fallbackChannel: channel, urgentMayBypassQuietHours: urgent
    }; try {
        await save.execute({ body });
    }
    catch { /* visible */ } };
    const knownUsers = members.data?.data.filter(m => m.status === 'active').map(m => ({ id: m.userId, label: m.userId === session.user.id ? 'Bạn' : m.userId })) || [{ id: session.user.id, label: 'Bạn' }];
    return <><PageHeader title="Điện thoại & lịch trực" subtitle="Thiết bị, xác nhận nhận việc, giờ yên lặng và người dự phòng."/><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' }, gap: 3, minWidth: 0, '& > *': { minWidth: 0 } }}><Stack gap={3} sx={{ minWidth: 0, '& > *': { minWidth: 0 } }}><Panel title="Thiết bị nhận thông báo"><Stack sx={{ p: 3 }} gap={2}><ErrorNotice error={error || register.error || test.error || pair.error}/>{deviceTestMessage && <Alert severity="info">{deviceTestMessage}</Alert>}<Stack direction="row" gap={2} alignItems="center"><SmartphoneRounded sx={{ fontSize: 44, color: 'primary.main' }}/><Typography>Thông báo tối giản trên màn hình khóa; xem địa chỉ khách sau khi đăng nhập.</Typography></Stack><TextField label="Tên thiết bị" value={deviceName} onChange={e => setDeviceName(e.target.value)} inputProps={{ maxLength: 120 }}/><MutationButton permission="notifications.manage" variant="contained" busy={pending} disabled={!deviceName.trim()} onClick={() => void deviceRegister()}>{__MOCK__ ? 'Mô phỏng đăng ký thiết bị' : 'Bật thông báo trên thiết bị này'}</MutationButton>{__MOCK__ && <Alert severity="info">Mô phỏng không yêu cầu quyền hệ điều hành, không đăng ký Push thật và giữ thiết bị ở trạng thái chờ xác minh.</Alert>}</Stack><QueryState query={devices}>{devices.data && <DataTable rows={devices.data.data} rowKey={d => d.id} columns={[
        { key: 'name', label: 'Thiết bị', render: d => d.deviceName }, { key: 'state', label: 'Trạng thái', render: d => <Status value={d.status}/> },
        {
            key: 'actions', label: '', render: d => <Stack direction="row" flexWrap="wrap"><MutationButton permission="notifications.manage" disabled={d.status === 'revoked'} busy={test.pending} onClick={async () => { try { await test.execute({ path: { resourceId: d.id }, body: { expectedVersion: d.version } }); setDeviceTestMessage(__MOCK__ ? 'Mô phỏng: chưa gửi Push thật; thiết bị vẫn chờ xác minh.' : 'Yêu cầu kiểm tra đã được tiếp nhận; xem trạng thái backend trước khi kết luận đã gửi.'); } catch { setDeviceTestMessage(__MOCK__ ? 'Mô phỏng: không gửi Push thật; kiểm tra bị từ chối và trạng thái thiết bị không đổi.' : ''); } }}>{__MOCK__ ? 'Kiểm tra mô phỏng' : 'Gửi thử'}</MutationButton><MutationButton permission="notifications.manage" color="error" disabled={d.status === 'revoked'} onClick={() => setSelected(d)}>Thu hồi</MutationButton></Stack>
        }
    ]}/>}</QueryState></Panel><Panel title="Telegram dự phòng"><Stack gap={2} sx={{ p: 3 }}><Typography color="text.secondary">Chỉ liên kết qua mã một lần. Không dán bot token vào trình duyệt.</Typography><MutationButton permission="notifications.manage" variant="outlined" busy={pair.pending} onClick={async () => { try {
        const r = await pair.execute();
        setPairing(r.data);
    }
    catch { /* visible */ } }}>Tạo mã liên kết</MutationButton>{pairing && <Alert severity="info">{__MOCK__ ? 'Mã minh họa, không dùng để liên kết thật. ' : ''}Bot: {pairing.botUsername}<br />Mã: {pairing.pairingCode}<br />Hết hạn {dateTime(pairing.expiresAt, shop.timezone)}</Alert>}</Stack></Panel></Stack><Panel title="Quy tắc nhận và nhắc việc"><QueryState query={policy}><Stack gap={2} sx={{ p: 3 }}><ErrorNotice error={save.error}/><FormControlLabel label="Bật quy tắc thông báo" control={<Checkbox checked={enabled} onChange={e => setEnabled(e.target.checked)}/>}/><TextField label="Nhắc sau (phút), để trống nếu chưa chốt" value={minutes} onChange={e => setMinutes(e.target.value)} type="number" inputProps={{ min: 1 }}/><TextField label="Số lần nhắc tối đa" value={max} onChange={e => setMax(e.target.value)} type="number" inputProps={{ min: 0 }}/><TextField select label="Người nhận chính" value={primary} slotProps={{ select: { multiple: true } }} onChange={e => setPrimary(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}>{knownUsers.map(u => <MenuItem key={u.id} value={u.id}>{u.label}</MenuItem>)}</TextField><TextField select label="Người dự phòng" value={fallback} slotProps={{ select: { multiple: true } }} onChange={e => setFallback(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}>{knownUsers.map(u => <MenuItem key={u.id} value={u.id}>{u.label}</MenuItem>)}</TextField><TextField select label="Kênh dự phòng" value={channel} onChange={e => setChannel(e.target.value as typeof channel)}><MenuItem value="none">Chưa bật</MenuItem><MenuItem value="telegram" disabled={!telegramAvailable}>{telegramAvailable ? 'Telegram đã liên kết' : 'Telegram (chưa có thiết bị active)'}</MenuItem></TextField>{channel === 'telegram' && !telegramAvailable && <Alert severity="warning">Mã ghép đôi mô phỏng không liên kết Telegram. Chỉ chọn kênh này khi danh sách có thiết bị Telegram active.</Alert>}<FormControlLabel label="Có giờ yên lặng" control={<Checkbox checked={quiet} onChange={e => setQuiet(e.target.checked)}/>}/>{quiet && <Stack direction="row" gap={2}><TextField type="time" label="Từ" value={quietStart} onChange={e => setQuietStart(e.target.value)} fullWidth/><TextField type="time" label="Đến" value={quietEnd} onChange={e => setQuietEnd(e.target.value)} fullWidth/></Stack>}<Typography variant="caption">Theo múi giờ {shop.timezone}</Typography><FormControlLabel label="Cho phép thông báo khẩn vượt giờ yên lặng" control={<Checkbox checked={urgent} onChange={e => setUrgent(e.target.checked)}/>}/>{policyError && <Alert severity="error" role="alert">{policyError}</Alert>}<MutationButton permission="notifications.manage" variant="contained" busy={save.pending} disabled={!policy.data || !!policyError || save.pending} onClick={() => void savePolicy()}>Lưu quy tắc</MutationButton></Stack></QueryState></Panel><Alert severity="info" data-testid="notification-protection-note" sx={{ mt: 3 }}>Chống gửi lặp theo sự kiện, kiểm tra callback, thời hạn token và giới hạn tốc độ phải được bảo đảm bởi dịch vụ. Bản demo không phát thông báo thật và không xác minh các lớp bảo vệ phía máy chủ.</Alert></Box><ConfirmDialog open={!!selected} title="Thu hồi thiết bị" description="Máy chủ phải dừng mọi thông báo đến subscription này." onClose={() => setSelected(null)} busy={revoke.pending} error={revoke.error} onConfirm={() => revoke.execute({ path: { resourceId: selected?.id || '' }, body: { expectedVersion: selected?.version || 1 } })}/></>;
}
