import { label as businessLabel } from '@/shared/model/labels';
import { ActionGroup, FormFields, SectionGrid, SurfaceContent } from '../../shared/ui/composition';
import { useEffect, useRef, useState } from 'react';
import { visualSx } from '@/shared/ui/visual';
import type { ReactNode } from 'react';
import { Link as RouterLink, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Avatar, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import SmartToyRounded from '@mui/icons-material/SmartToyRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import type { Membership, Role } from '@botsales/contracts';
import { permissionCatalog } from '@botsales/contracts';
import { colors } from '@botsales/tokens';
import { request, setCsrfToken } from '@/shared/api/client';
import { useApi, useCommand } from '@/shared/api/hooks';
import { ApiError } from '@/shared/api/errors';
import { useCan, useScope } from '@/shared/model/scope';
import { limitCodePoints, dateTime, safeInternalPath, isValidTimeZone } from '@/shared/model/format';
import { authorizedDownloadHref } from '@/shared/model/download';
import { useListQuery } from '@/shared/model/filters';
import { markDraftClean, useDraftForm } from '@/shared/model/dirty-drafts';
import { layoutSx } from '@/shared/ui/layout';
import { PageHeader, Panel, QueryState, DataTable, Toolbar, Pager, Status, MutationButton, EditDialog, ErrorNotice, ConfirmDialog, RouteLink, DetailLine, Empty } from '@/shared/ui/components';
import { useSession } from '@/shared/model/auth';
import { ShopSettingsPage as ShopSettingsView } from './shop-settings';
import { PrivacyPage as PrivacyView, ConsentConfirmationPage as ConsentConfirmationView } from './privacy';
function AuthCard({ children }: {
    children: ReactNode;
}) { return <Box component="main" id="main-content" tabIndex={-1} sx={[layoutSx.shell.centeredFallback, { bgcolor: 'background.default', outline: 'none' }]}><Paper variant="outlined" sx={[layoutSx.auth.surfaceInset, { width: '100%', maxWidth: 520, borderRadius: visualSx.radius.hero }]}><Stack direction="row" alignItems="center" sx={layoutSx.auth.brandMarkGap}><Avatar sx={{ bgcolor: 'primary.main', color: colors.onAccent }}><SmartToyRounded /></Avatar><Typography variant="h5" fontWeight={visualSx.typography.fontWeight.semibold}>BotSales <Box component="span" color="primary.main">AI</Box></Typography></Stack>{children}</Paper></Box>; }
export function LoginPage() {
    const { session, loading } = useSession();
    const [params] = useSearchParams();
    const [pending, setPending] = useState(false), [error, setError] = useState<Error | null>(null);
    const login = async () => { setPending(true); setError(null); try {
        const csrf = await request('getCsrfToken');
        setCsrfToken(csrf.data.csrfToken);
        const auth = await request('beginLogin', { body: { returnTo: safeInternalPath(params.get('returnTo') || '/workspaces') } });
        const url = new URL(auth.data.authorizationUrl);
        if (url.protocol !== 'https:' && !(__MOCK__ && url.origin === location.origin))
            throw new Error('Địa chỉ đăng nhập không an toàn.');
        window.location.assign(url.href);
    }
    catch (e) {
        setError(e instanceof Error ? e : new Error('Không bắt đầu được đăng nhập'));
        setPending(false);
    } };
    return <AuthCard><Typography component="h1" variant="h4" sx={layoutSx.auth.brandTitleGap}>Đăng nhập BotSales AI</Typography><Typography color="text.secondary" sx={[layoutSx.pageHeader.titleDescriptionGap, layoutSx.pageHeader.afterGap]}>Một không gian cho bán hàng, kho, kế toán và đội ngũ AI của bạn.</Typography><ErrorNotice error={error}/>{__MOCK__ && <Alert severity="info" sx={layoutSx.pageHeader.afterGap}>Chế độ xem frontend: tài khoản giả lập, không có mật khẩu thật.</Alert>}{session ? <Button fullWidth component={RouterLink} to="/workspaces" variant="contained" endIcon={<ArrowForwardRounded />}>Tiếp tục vào cửa hàng</Button> : <Button fullWidth variant="contained" size="large" onClick={() => void login()} disabled={pending || loading}>{pending ? 'Đang chuyển đến đăng nhập…' : __MOCK__ ? 'Vào tài khoản mô phỏng' : 'Đăng nhập bằng tài khoản công ty'}</Button>}<Typography variant="caption" color="text.secondary" sx={[layoutSx.page.sectionBefore, { display: 'block' }]}>Phiên đăng nhập được quản lý ở máy chủ. Không lưu access token trong localStorage.</Typography></AuthCard>;
}
export function WorkspacesPage() {
    const { session, loading, error: sessionError } = useSession();
    const shops = useQuery({ queryKey: ['shops', session?.user.id], queryFn: ({ signal }) => request('listShops', { signal }), enabled: !!session, retry: false });
    const isEmpty = !shops.isError && shops.data?.data.length === 0;
    const createShopButton = <Button component={RouterLink} to="/onboarding" variant="contained">Tạo cửa hàng</Button>;
    if (!loading && !session && sessionError instanceof ApiError && sessionError.status === 401)
        return <Navigate to="/login" replace/>;
    return <Box component="main" id="main-content" tabIndex={-1} sx={[layoutSx.shell.pageFallbackInset, { maxWidth: 1100, mx: 'auto', outline: 'none' }]}><PageHeader title="Chọn cửa hàng" subtitle="Mỗi cửa hàng là một vùng dữ liệu và quyền độc lập." actions={!isEmpty && createShopButton}/><ErrorNotice error={sessionError}/><QueryState query={shops} pendingProfile="section">{isEmpty ? <Empty text="Chưa có cửa hàng." action={createShopButton}/> : <SectionGrid columns={{ xs: 'minmax(0, 1fr)', md: shops.data?.data.length === 1 ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))' }}>{shops.data?.data.map(s => <Paper variant="outlined" key={s.id} sx={[layoutSx.surface.inset, { borderRadius: visualSx.radius.card }]}><Avatar sx={{ bgcolor: colors.selected, color: 'primary.main' }}>{s.name[0]}</Avatar><SurfaceContent beforeGap="surface"><Typography component="h2" variant="h5">{s.name}</Typography><Typography color="text.secondary">{s.currency} · {s.timezone}</Typography><Typography variant="caption" color="text.secondary">Quyền: {session?.memberships.find(m => m.shopId === s.id)?.roles.map(role => businessLabel(role)).join(', ') || 'Chưa có quyền'}</Typography></SurfaceContent><Button component={RouterLink} to={`/s/${s.id}/overview`} fullWidth variant="outlined" endIcon={<ArrowForwardRounded />} sx={layoutSx.page.sectionBefore}>Mở cửa hàng</Button></Paper>)}</SectionGrid>}</QueryState></Box>;
}
export function OnboardingPage() {
    const navigate = useNavigate();
    const { refresh } = useSession();
    const cache = useQueryClient();
    const [name, setName] = useState(''), [currency, setCurrency] = useState('VND'), [timezone, setTimezone] = useState('Asia/Vientiane'), [pending, setPending] = useState(false), [error, setError] = useState<Error | null>(null), [timezoneTouched, setTimezoneTouched] = useState(false), [submitted, setSubmitted] = useState(false);
    const formElement = useRef<HTMLFormElement>(null);
    const baseline = useRef({name: '',currency: 'VND',timezone: 'Asia/Vientiane'});
    const mounted = useRef(true);
    useEffect(() => { mounted.current=true; return () => { mounted.current=false; }; },[]);
    const bindDraft = useDraftForm(name!==baseline.current.name || currency!==baseline.current.currency || timezone!==baseline.current.timezone);
    const timezoneError = !isValidTimeZone(timezone) ? 'Nhập múi giờ hợp lệ, ví dụ Asia/Vientiane.' : '';
    const save = async () => { setSubmitted(true); if (pending || !name.trim() || timezoneError) return; setPending(true); setError(null); try {
        const r = await request('createShop', { body: { name, currency, timezone, locale: 'vi-VN' } });
        await refresh();
        await cache.invalidateQueries({ queryKey: ['shops'] });
        if (!mounted.current) return;
        baseline.current={name,currency,timezone};
        if (formElement.current) markDraftClean(formElement.current);
        navigate(`/s/${r.data.id}/overview`);
    }
    catch (e) {
        if (mounted.current) setError(e instanceof Error ? e : new Error('Không tạo được cửa hàng'));
    }
    finally {
        if (mounted.current) setPending(false);
    } };
    return <AuthCard><Typography component="h1" variant="h4" sx={layoutSx.auth.brandTitleGap}>Tạo cửa hàng</Typography><Typography color="text.secondary" sx={[layoutSx.pageHeader.titleDescriptionGap, layoutSx.pageHeader.afterGap]}>Chọn tiền tệ cơ sở trước khi ghi nhận giao dịch.</Typography><ErrorNotice error={error}/><FormFields component="form" noValidate ref={element => {formElement.current=element;bindDraft(element);}} onSubmit={event => {event.preventDefault();void save();}}><TextField disabled={pending} label="Tên cửa hàng" value={name} onChange={e => setName(limitCodePoints(e.target.value, 160))} /><TextField disabled={pending} label="Tiền tệ cơ sở" select value={currency} onChange={e => setCurrency(e.target.value)}>{['VND', 'LAK', 'THB', 'USD'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField><TextField disabled={pending} label="Múi giờ" value={timezone} onBlur={() => setTimezoneTouched(true)} onChange={e => setTimezone(e.target.value)} error={(timezoneTouched || submitted) && !!timezoneError} helperText={(timezoneTouched || submitted) && timezoneError ? timezoneError : 'Ví dụ: Asia/Vientiane'}/><Alert severity="info">Giao diện Graphite Gold dark-only đã chốt. Những chính sách thật và kết nối ngoài chưa tự bật khi tạo shop.</Alert><Button type="submit" variant="contained" disabled={!name.trim() || pending}>Tạo cửa hàng</Button><Button component={RouterLink} to="/workspaces">Quay lại</Button></FormFields></AuthCard>;
}
export function ShopSettingsPage() { return <ShopSettingsView />; }

const roleLabels: Record<Role, string> = {
    owner: 'Chủ cửa hàng', manager: 'Quản lý', sales: 'Bán hàng', warehouse: 'Nhân viên kho', accountant: 'Kế toán', bot_admin: 'Quản trị AI', viewer: 'Chỉ xem'
};
export function TeamPage() {
    const { session, shop } = useScope();
    const list = useApi('listMembers', { query: useListQuery('listMembers') });
    const canReadConversations = useCan('conversations.read');
    const people = useApi('getInboxMetadata', {}, canReadConversations);
    const memberName = (id: string) => {
        if (id === session.user.id) return session.user.displayName;
        const name = canReadConversations && !people.isError ? people.data?.data.assignees.find(person => person.userId === id)?.displayName : undefined;
        return name && name !== id ? name : `Mã nhân sự: ${id}`;
    };
    const [memberId, setMemberId] = useState('');
    const detail = useApi('getMember', { path: { memberId } }, Boolean(memberId));
    const invite = useCommand('inviteMember', ['listMembers']);
    const update = useCommand('updateMemberRoles', ['listMembers', 'getMember']);
    const revoke = useCommand('revokeMembership', ['listMembers', 'getMember']);
    const [edit, setEdit] = useState<Membership | null | undefined>(), [email, setEmail] = useState(''), [roles, setRoles] = useState<Role[]>(['viewer']), [remove, setRemove] = useState<Membership | null>(null), [savedMessage, setSavedMessage] = useState('');
    const open = (m: Membership | null) => { setSavedMessage(''); setEdit(m); setEmail(''); setRoles(m?.roles || ['viewer']); };
    return <><PageHeader title="Nhân sự & phân quyền" subtitle="Vai trò là bộ quyền mặc định; API quyết định quyền hiệu lực ở từng thao tác." actions={<MutationButton permission="members.manage" variant="contained" onClick={() => open(null)}>Mời nhân viên</MutationButton>}/>{savedMessage && <Alert severity="success" role="status" sx={layoutSx.notice.afterGap}>{savedMessage}</Alert>}<Panel><Toolbar operation="listMembers" /><QueryState query={list} pendingProfile="section">{list.data && <><DataTable reflowOnMobile label="Nhân sự và quyền truy cập" rows={list.data.data} rowKey={m => m.id} columns={[
        { key: 'user', label: 'Nhân viên / vai trò', render: m => <Stack><Typography>{memberName(m.userId)}</Typography><Typography variant="caption" color="text.secondary">{m.roles.map(r => roleLabels[r]).join(', ')}</Typography></Stack> }, { key: 'status', label: 'Trạng thái', render: m => <Status value={m.status}/> }, { key: 'perms', label: 'Quyền hiệu lực', render: m => `${m.permissions.length} quyền · v${m.permissionVersion}` },
        {
            key: 'actions', label: 'Thao tác', render: m => <ActionGroup direction="row"><Button onClick={() => setMemberId(m.id)}>Chi tiết nhân sự</Button><MutationButton permission="members.manage" onClick={() => open(m)}>Sửa quyền</MutationButton><MutationButton permission="members.manage" color="error" disabled={m.userId === session.user.id || m.status === 'revoked'} onClick={() => setRemove(m)}>Thu hồi</MutationButton></ActionGroup>
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
 <EditDialog open={!!memberId} title="Chi tiết nhân sự" onClose={() => setMemberId('')} actions={<><Button onClick={() => setMemberId('')}>Đóng</Button>{detail.data && <Box sx={{ display: { xs: 'block', md: 'none' } }}><ActionGroup direction="row"><MutationButton permission="members.manage" onClick={() => { setMemberId(''); open(detail.data!.data); }}>Sửa quyền</MutationButton><MutationButton permission="members.manage" color="error" disabled={detail.data.data.userId === session.user.id || detail.data.data.status === 'revoked'} onClick={() => { setMemberId(''); setRemove(detail.data!.data); }}>Thu hồi</MutationButton></ActionGroup></Box>}</>}>
    <QueryState query={detail}>{detail.data && <SurfaceContent>
        <DetailLine label="Nhân viên">{memberName(detail.data.data.userId)}</DetailLine>
        <DetailLine label="Mã thành viên">{detail.data.data.id}</DetailLine><DetailLine label="Trạng thái"><Status value={detail.data.data.status}/></DetailLine>
        <DetailLine label="Vai trò">{detail.data.data.roles.map(role => roleLabels[role]).join(', ')}</DetailLine>
        <DetailLine label="Phiên bản quyền">{detail.data.data.permissionVersion}</DetailLine><DetailLine label="Quyền hiệu lực">{detail.data.data.permissions.join(', ') || 'Không có quyền'}</DetailLine>
    </SurfaceContent>}</QueryState>
 </EditDialog>
 <EditDialog open={edit !== undefined} title={edit ? 'Cập nhật quyền' : 'Mời nhân viên'} onClose={() => setEdit(undefined)} busy={invite.pending || update.pending} actions={<Button variant="contained" disabled={!roles.length || (!edit && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || invite.pending || update.pending} onClick={async () => { try {
        if (edit) {
            await update.execute({ path: { memberId: edit.id }, version: edit.permissionVersion, body: { roles } });
            setSavedMessage(`Đã cập nhật quyền truy cập của ${edit.userId}.`);
        } else {
            await invite.execute({ body: { email, roles } });
            setSavedMessage(`Đã gửi lời mời đến ${email.trim()}.`);
        }
        setEdit(undefined);
    }
    catch { /* visible */ } }}>Lưu</Button>}><ErrorNotice error={invite.error || update.error}/><FormFields >{!edit && <TextField label="Email nhân viên" type="email" value={email} onChange={e => setEmail(e.target.value)}/>}<Typography variant="subtitle2">Phân vai trò</Typography>{(Object.keys(roleLabels) as Role[]).map(role => <FormControlLabel key={role} label={`${roleLabels[role]} · ${permissionCatalog.rolePresets[role]?.length || 0} quyền`} control={<Checkbox checked={roles.includes(role)} onChange={e => setRoles(e.target.checked ? [...roles, role] : roles.filter(r => r !== role))}/>}/>)}<Alert severity="warning">Quyền mới phải được máy chủ kiểm lại. Thu hồi quyền làm mất hiệu lực cache và phiên truy cập liên quan.</Alert></FormFields></EditDialog><ConfirmDialog open={!!remove} title="Thu hồi quyền nhân viên" confirmLabel="Thu hồi quyền" description={`Nhân viên ${remove?.userId || ""} trong ${shop.name}: người này không được tiếp tục truy cập dữ liệu cửa hàng sau khi thu hồi. Lịch sử hoạt động được giữ.`} onClose={() => setRemove(null)} busy={revoke.pending} error={revoke.error} onConfirm={async () => {
        if (!remove) return;
        await revoke.execute({ path: { memberId: remove.id }, version: remove.permissionVersion });
    }}/></>;
}
export function AuditPage() { const { shop } = useScope(); const list = useApi('listAuditEvents', { query: useListQuery('listAuditEvents') }); return <><PageHeader title="Nhật ký hoạt động" subtitle="Ai thực hiện, thao tác nào, dữ liệu nào và mã truy vết. Không lưu API key hoặc suy luận riêng của AI."/><Alert severity="info" sx={layoutSx.notice.afterGap}>API hiện trả về người thực hiện, thao tác, đối tượng, thời gian, mã truy vết và tóm tắt. Loại actor, phiên bản policy/config và snapshot chi tiết chưa có trong DTO nên không được suy đoán.</Alert><Panel><Toolbar operation="listAuditEvents" /><QueryState query={list} pendingProfile="section">{list.data && <><DataTable label="Nhật ký hoạt động" rows={list.data.data} rowKey={a => a.id} columns={[
    { key: 'time', label: 'Thời gian', render: a => dateTime(a.occurredAt, shop.timezone) }, { key: 'actor', label: 'Người thực hiện', render: a => `Mã nhân sự: ${a.actorId}` }, { key: 'action', label: 'Thao tác', render: a => a.action }, { key: 'source', label: 'Đối tượng', render: a => `${a.resource.type} · Mã đối tượng: ${a.resource.id}` }, { key: 'summary', label: 'Kết quả', render: a => a.summary }, { key: 'trace', label: 'Mã truy vết', render: a => <Typography variant="caption">{a.requestId}</Typography> }
]}/><Pager page={list.data.page}/></>}</QueryState></Panel></>; }
export function PrivacyPage() { return <PrivacyView />; }
export function ConsentConfirmationPage() { return <ConsentConfirmationView />; }

export function JobPage() {
    const { jobId = '' } = useParams();
    const { shop } = useScope();
    const get = useApi('getJob', { path: { jobId } });
    const job = get.data?.data;
    const downloadHref = job?.downloadUrl ? authorizedDownloadHref(job.downloadUrl, location.origin, __MOCK__) : null;
    const jobStatus = job?.status;
    const { refetch } = get;
    useEffect(() => { if (!jobStatus || !['queued', 'running'].includes(jobStatus))
        return; const timer = setInterval(() => void refetch(), 3000); return () => clearInterval(timer); }, [jobStatus, refetch]);
    return <><PageHeader title={`Công việc ${jobId}`} subtitle="Theo dõi tiến độ từ API. Được tiếp nhận không có nghĩa đã hoàn tất."/><QueryState query={get} pendingProfile="section">{job && <Panel title="Kết quả xử lý" bodyMode="inset"><FormFields ><ActionGroup><Status value={job.status}/></ActionGroup><DetailLine label="Loại">{businessLabel(job.kind)}</DetailLine><DetailLine label="Tiến độ">{job.completed} / {job.total ?? 'Chưa biết'}</DetailLine><DetailLine label="Lỗi">{job.errorCount}</DetailLine><DetailLine label="Cập nhật">{dateTime(job.updatedAt, shop.timezone)}</DetailLine>{job.rowErrors.length > 0 && <DataTable label="Lỗi công việc nền" rows={job.rowErrors} rowKey={e => `${e.row}-${e.field}-${e.code}`} columns={[{ key: 'row', label: 'Dòng', render: e => e.row }, { key: 'field', label: 'Trường', render: e => e.field }, { key: 'message', label: 'Lỗi', render: e => e.message }]}/>}<Button onClick={() => void get.refetch()} variant="outlined">Kiểm tra lại</Button>{job.downloadUrl && ['succeeded', 'partial'].includes(job.status) && downloadHref && <Button variant="contained" onClick={() => window.open(downloadHref, '_blank', 'noopener,noreferrer')}>Mở kết quả xuất</Button>}{job.downloadUrl && ['succeeded', 'partial'].includes(job.status) && !downloadHref && <Alert severity="warning">URL tải không an toàn hoặc không hợp lệ nên đã bị chặn.</Alert>}{job.status === 'awaiting_confirmation' && <RouteLink to={`/s/${shop.id}/imports/${job.id}`}>Xem và xác nhận nhập</RouteLink>}</FormFields></Panel>}</QueryState></>;
}
