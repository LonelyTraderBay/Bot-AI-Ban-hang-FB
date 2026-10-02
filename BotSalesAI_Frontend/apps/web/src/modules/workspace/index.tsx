import { useEffect, useRef, useState } from 'react';
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
import { dateTime, safeInternalPath } from '@/shared/model/format';
import { authorizedDownloadHref } from '@/shared/model/download';
import { useListQuery } from '@/shared/model/filters';
import { markDraftClean, setDraftDirty } from '@/shared/model/dirty-drafts';
import { PageHeader, Panel, QueryState, DataTable, Toolbar, Pager, Status, MutationButton, EditDialog, ErrorNotice, ConfirmDialog, RouteLink, DetailLine } from '@/shared/ui/components';
import { useSession } from '@/shared/model/auth';
function AuthCard({ children }: {
    children: ReactNode;
}) { return <Box component="main" id="main-content" tabIndex={-1} sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3, bgcolor: 'background.default', outline: 'none' }}><Paper variant="outlined" sx={{ width: '100%', maxWidth: 520, p: { xs: 3, sm: 5 }, borderRadius: 4 }}><Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 4 }}><Avatar sx={{ bgcolor: 'primary.main', color: colors.onAccent }}><SmartToyRounded /></Avatar><Typography variant="h5" fontWeight={800}>BotSales <Box component="span" color="primary.main">AI</Box></Typography></Stack>{children}</Paper></Box>; }
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
    return <AuthCard><Typography component="h1" variant="h4" sx={{ mb: 1 }}>Chào mừng trở lại</Typography><Typography color="text.secondary" sx={{ mb: 4 }}>Một không gian cho bán hàng, kho, kế toán và đội ngũ AI của bạn.</Typography><ErrorNotice error={error}/>{__MOCK__ && <Alert severity="info" sx={{ mb: 3 }}>Chế độ xem frontend: tài khoản giả lập, không có mật khẩu thật.</Alert>}{session ? <Button fullWidth component={RouterLink} to="/workspaces" variant="contained" endIcon={<ArrowForwardRounded />}>Tiếp tục vào cửa hàng</Button> : <Button fullWidth variant="contained" size="large" onClick={() => void login()} disabled={pending || loading}>{pending ? 'Đang chuyển đến đăng nhập…' : __MOCK__ ? 'Vào tài khoản mô phỏng' : 'Đăng nhập bằng tài khoản công ty'}</Button>}<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>Phiên đăng nhập được quản lý ở máy chủ. Không lưu access token trong localStorage.</Typography></AuthCard>;
}
export function WorkspacesPage() {
    const { session, loading, error: sessionError } = useSession();
    const shops = useQuery({ queryKey: ['shops', session?.user.id], queryFn: ({ signal }) => request('listShops', { signal }), enabled: !!session, retry: false });
    if (!loading && !session && sessionError instanceof ApiError && sessionError.status === 401)
        return <Navigate to="/login" replace/>;
    return <Box component="main" id="main-content" tabIndex={-1} sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 3, md: 6 }, outline: 'none' }}><PageHeader title="Chọn cửa hàng" subtitle="Mỗi cửa hàng là một vùng dữ liệu và quyền độc lập." actions={<Button component={RouterLink} to="/onboarding" variant="contained">Tạo cửa hàng</Button>}/><ErrorNotice error={sessionError}/><QueryState query={shops}><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)' }, gap: 3 }}>{shops.data?.data.map(s => <Paper variant="outlined" key={s.id} sx={{ p: 3, borderRadius: 3 }}><Avatar sx={{ mb: 2, bgcolor: colors.selected, color: 'primary.main' }}>{s.name[0]}</Avatar><Typography variant="h5">{s.name}</Typography><Typography color="text.secondary" sx={{ my: 1.5 }}>{s.currency} · {s.timezone}</Typography><Typography variant="caption" color="text.secondary">Quyền: {session?.memberships.find(m => m.shopId === s.id)?.roles.join(', ') || 'Chưa có quyền'}</Typography><Button component={RouterLink} to={`/s/${s.id}/overview`} fullWidth variant="outlined" endIcon={<ArrowForwardRounded />} sx={{ mt: 3 }}>Mở cửa hàng</Button></Paper>)}</Box></QueryState></Box>;
}
export function OnboardingPage() {
    const navigate = useNavigate();
    const { refresh } = useSession();
    const cache = useQueryClient();
    const [name, setName] = useState(''), [currency, setCurrency] = useState('VND'), [timezone, setTimezone] = useState('Asia/Vientiane'), [pending, setPending] = useState(false), [error, setError] = useState<Error | null>(null);
    const save = async () => { setPending(true); setError(null); try {
        new Intl.DateTimeFormat('vi', { timeZone: timezone });
        const r = await request('createShop', { body: { name, currency, timezone, locale: 'vi-VN' } });
        await refresh();
        await cache.invalidateQueries({ queryKey: ['shops'] });
        navigate(`/s/${r.data.id}/overview`);
    }
    catch (e) {
        setError(e instanceof Error ? e : new Error('Không tạo được cửa hàng'));
    }
    finally {
        setPending(false);
    } };
    return <AuthCard><Typography component="h1" variant="h4" sx={{ mb: 1 }}>Tạo cửa hàng</Typography><Typography color="text.secondary" sx={{ mb: 3 }}>Chọn tiền tệ cơ sở trước khi ghi nhận giao dịch.</Typography><ErrorNotice error={error}/><Stack gap={2.5}><TextField label="Tên cửa hàng" value={name} onChange={e => setName(e.target.value)} inputProps={{ maxLength: 160 }}/><TextField label="Tiền tệ cơ sở" select value={currency} onChange={e => setCurrency(e.target.value)}>{['VND', 'LAK', 'THB', 'USD'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField><TextField label="Múi giờ" value={timezone} onChange={e => setTimezone(e.target.value)}/><Alert severity="info">Giao diện Graphite Gold dark-only đã chốt. Những chính sách thật và kết nối ngoài chưa tự bật khi tạo shop.</Alert><Button variant="contained" disabled={!name.trim() || !timezone || pending} onClick={() => void save()}>Tạo cửa hàng</Button><Button component={RouterLink} to="/workspaces">Quay lại</Button></Stack></AuthCard>;
}
export function ShopSettingsPage() {
    const scope = useScope();
    const { shop } = scope;
    const cache = useQueryClient();
    const canManageShop = useCan('shop.manage');
    const update = useCommand('updateShop', ['getShop']);
    const [name, setName] = useState(shop.name), [timezone, setTimezone] = useState(shop.timezone), [locale, setLocale] = useState(shop.locale), [error, setError] = useState<Error | null>(null), [saved, setSaved] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const baseline = useRef({ shopId: shop.id, name: shop.name, timezone: shop.timezone, locale: shop.locale });
    const draft = useRef(baseline.current);
    useEffect(() => {
        if (baseline.current.shopId === shop.id)
            return;
        const next = { shopId: shop.id, name: shop.name, timezone: shop.timezone, locale: shop.locale };
        baseline.current = next;
        draft.current = next;
        setName(next.name);
        setTimezone(next.timezone);
        setLocale(next.locale);
        setError(null);
        setSaved(false);
        if (formRef.current)
            markDraftClean(formRef.current);
    }, [shop.id, shop.locale, shop.name, shop.timezone]);
    const updateField = (field: 'name' | 'timezone' | 'locale', value: string) => {
        const next = { ...draft.current, [field]: value };
        draft.current = next;
        setDraftDirty(formRef.current, next.shopId !== baseline.current.shopId || next.name !== baseline.current.name || next.timezone !== baseline.current.timezone || next.locale !== baseline.current.locale);
        setSaved(false);
    };
    const save = async (form: HTMLFormElement) => {
        setError(null);
        setSaved(false);
        try {
            new Intl.DateTimeFormat(locale, { timeZone: timezone });
            const result = await update.execute({ path: { shopId: shop.id }, version: shop.version, body: { name, timezone, locale } });
            cache.setQueryData(['shop', scope.session.user.id, shop.id, scope.membership.permissionVersion], result);
            const persisted = { shopId: result.data.id, name: result.data.name, timezone: result.data.timezone, locale: result.data.locale };
            baseline.current = persisted;
            draft.current = persisted;
            setName(persisted.name);
            setTimezone(persisted.timezone);
            setLocale(persisted.locale);
            markDraftClean(form);
            setSaved(true);
        }
        catch (e) {
            setError(e instanceof Error ? e : new Error('Không lưu được cấu hình'));
        }
    };
    return <>
        <PageHeader title="Thiết lập cửa hàng" subtitle="Cấu hình riêng của shop không thay đổi quy tắc AI lập trình hoặc màu đã duyệt." />
        <Stack gap={3}>
            <Panel title="Thông tin cơ sở">
                <Stack component="form" ref={formRef} noValidate onSubmit={event => { event.preventDefault(); void save(event.currentTarget); }} gap={2.5} sx={{ p: 3, maxWidth: 760 }}>
                    <ErrorNotice error={error || update.error} />
                    {saved && <Alert severity="success" role="status">Đã lưu cấu hình cửa hàng.</Alert>}
                    <TextField label="Tên cửa hàng" value={name} disabled={!canManageShop} onChange={event => { setName(event.target.value); updateField('name', event.target.value); }} />
                    <TextField label="Tiền tệ cơ sở" value={shop.currency} disabled helperText="Không đổi tiền tệ bằng sửa giao diện. Cần kế hoạch chuyển đổi dữ liệu." />
                    <TextField label="Múi giờ" value={timezone} disabled={!canManageShop} onChange={event => { setTimezone(event.target.value); updateField('timezone', event.target.value); }} />
                    <TextField label="Ngôn ngữ" value={locale} disabled={!canManageShop} onChange={event => { setLocale(event.target.value); updateField('locale', event.target.value); }} />
                    <TextField label="Giao diện" value="Graphite Gold · Dark-only" disabled />
                    <MutationButton permission="shop.manage" type="submit" variant="contained" busy={update.pending} disabled={!name.trim() || !timezone}>Lưu cấu hình</MutationButton>
                </Stack>
            </Panel>
            <Panel title="Checklist thiết lập vận hành" subtitle="Các mục không có trường API được giữ ở trạng thái chưa xác minh; không suy diễn đã sẵn sàng.">
                <Stack gap={1} sx={{ p: 3 }}>
                    <Alert severity="info">{__MOCK__ ? 'Bản xem trước mô phỏng. Chỉ tên, tiền tệ, múi giờ và ngôn ngữ được lưu qua API hiện tại.' : 'API hiện chỉ cho phép sửa thông tin cơ sở được hỗ trợ.'} Quốc gia kinh doanh không được suy ra từ múi giờ.</Alert>
                    <SetupChecklistItem title="Quốc gia và giờ kinh doanh" status="Chưa có trường cấu hình trong contract" />
                    <SetupChecklistItem title="Địa chỉ, vùng giao và phí vận chuyển" status={__MOCK__ ? 'Có preview mô phỏng, chưa lưu cấu hình' : 'Chưa có operation cấu hình vùng giao'} to={`/s/${shop.id}/shipments`} action="Xem preview phí giao" />
                    <SetupChecklistItem title="Người duyệt và thành viên" status="Quyền lấy từ membership; chưa có API gán chính sách duyệt" to={`/s/${shop.id}/settings/team`} action="Quản lý thành viên" />
                    <SetupChecklistItem title="Kết nối kênh bán hàng" status={__MOCK__ ? 'Kết nối mô phỏng; không có quyền provider thật' : 'Kiểm tra trạng thái kết nối'} to={`/s/${shop.id}/integrations/channels`} action="Mở kết nối" />
                    <SetupChecklistItem title="Kết nối AI" status={__MOCK__ ? 'Catalog nhà cung cấp mô phỏng' : 'Kiểm tra catalog nhà cung cấp'} to={`/s/${shop.id}/integrations/ai`} action="Mở nhà cung cấp AI" />
                    <SetupChecklistItem title="Nội dung sản phẩm và phiên bản kiến thức" status="Nguồn nội dung, lịch sử phiên bản và duyệt nằm trong khu vực kiến thức." to={`/s/${shop.id}/knowledge`} action="Quản lý nội dung" />
                    <SetupChecklistItem title="Vòng góp ý có duyệt" status="Góp ý tạo bản nháp; không tự huấn luyện hoặc xuất bản." to={`/s/${shop.id}/knowledge/feedback`} action="Duyệt góp ý" />
                    <SetupChecklistItem title="Consent và ngừng liên hệ marketing" status="Có preview tương tác; contract chưa có trường consent hoặc thao tác opt-out." to={`/s/${shop.id}/settings/privacy`} action="Xem thử consent" />
                </Stack>
            </Panel>
        </Stack>
    </>;
}
function SetupChecklistItem({ title, status, to, action }: { title: string; status: string; to?: string; action?: string }) {
    return <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, flexWrap: 'wrap' }}>
        <Box><Typography fontWeight={650}>{title}</Typography><Typography variant="body2" color="text.secondary">{status}</Typography></Box>
        {to && action && <RouteLink to={to}>{action}</RouteLink>}
    </Box>;
}
const roleLabels: Record<Role, string> = {
    owner: 'Chủ cửa hàng', manager: 'Quản lý', sales: 'Bán hàng', warehouse: 'Nhân viên kho', accountant: 'Kế toán', bot_admin: 'Quản trị AI', viewer: 'Chỉ xem'
};
export function TeamPage() {
    const { session } = useScope();
    const list = useApi('listMembers', { query: useListQuery() });
    const invite = useCommand('inviteMember', ['listMembers']);
    const update = useCommand('updateMemberRoles', ['listMembers']);
    const revoke = useCommand('revokeMembership', ['listMembers']);
    const [edit, setEdit] = useState<Membership | null | undefined>(), [email, setEmail] = useState(''), [roles, setRoles] = useState<Role[]>(['viewer']), [remove, setRemove] = useState<Membership | null>(null);
    const open = (m: Membership | null) => { setEdit(m); setEmail(''); setRoles(m?.roles || ['viewer']); };
    return <><PageHeader title="Nhân sự & phân quyền" subtitle="Vai trò là bộ quyền mặc định; API quyết định quyền hiệu lực ở từng thao tác." actions={<MutationButton permission="members.manage" variant="contained" onClick={() => open(null)}>Mời nhân viên</MutationButton>}/><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={m => m.id} columns={[
        { key: 'user', label: 'Nhân viên', render: m => m.userId === session.user.id ? session.user.displayName : m.userId }, { key: 'roles', label: 'Vai trò', render: m => m.roles.map(r => roleLabels[r]).join(', ') }, { key: 'status', label: 'Trạng thái', render: m => <Status value={m.status}/> }, { key: 'perms', label: 'Quyền hiệu lực', render: m => `${m.permissions.length} quyền · v${m.permissionVersion}` },
        {
            key: 'actions', label: '', render: m => <Stack direction="row"><MutationButton permission="members.manage" onClick={() => open(m)}>Sửa quyền</MutationButton><MutationButton permission="members.manage" color="error" disabled={m.userId === session.user.id || m.status === 'revoked'} onClick={() => setRemove(m)}>Thu hồi</MutationButton></Stack>
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
 <EditDialog open={edit !== undefined} title={edit ? 'Cập nhật quyền' : 'Mời nhân viên'} onClose={() => setEdit(undefined)} busy={invite.pending || update.pending} actions={<Button variant="contained" disabled={!roles.length || (!edit && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || invite.pending || update.pending} onClick={async () => { try {
        if (edit)
            await update.execute({ path: { memberId: edit.id }, version: edit.permissionVersion, body: { roles } });
        else
            await invite.execute({ body: { email, roles } });
        setEdit(undefined);
    }
    catch { /* visible */ } }}>Lưu</Button>}><ErrorNotice error={invite.error || update.error}/><Stack gap={1.5}>{!edit && <TextField label="Email nhân viên" type="email" value={email} onChange={e => setEmail(e.target.value)}/>}<Typography variant="subtitle2">Phân vai trò</Typography>{(Object.keys(roleLabels) as Role[]).map(role => <FormControlLabel key={role} label={`${roleLabels[role]} · ${permissionCatalog.rolePresets[role]?.length || 0} quyền`} control={<Checkbox checked={roles.includes(role)} onChange={e => setRoles(e.target.checked ? [...roles, role] : roles.filter(r => r !== role))}/>}/>)}<Alert severity="warning">Quyền mới phải được máy chủ kiểm lại. Thu hồi quyền làm mất hiệu lực cache và phiên truy cập liên quan.</Alert></Stack></EditDialog><ConfirmDialog open={!!remove} title="Thu hồi quyền nhân viên" description="Người này không được tiếp tục dùng dữ liệu của shop sau khi quyền được thu hồi." onClose={() => setRemove(null)} busy={revoke.pending} error={revoke.error} onConfirm={async () => {
        if (!remove) return;
        await revoke.execute({ path: { memberId: remove.id }, version: remove.permissionVersion });
    }}/></>;
}
export function AuditPage() { const { shop } = useScope(); const list = useApi('listAuditEvents', { query: useListQuery() }); return <><PageHeader title="Nhật ký hoạt động" subtitle="Ai thực hiện, thao tác nào, dữ liệu nào và mã truy vết. Không lưu API key hoặc suy luận riêng của AI."/><Alert severity="info" sx={{ mb: 2 }}>API hiện trả về người thực hiện, thao tác, đối tượng, thời gian, mã truy vết và tóm tắt. Loại actor, phiên bản policy/config và snapshot chi tiết chưa có trong DTO nên không được suy đoán.</Alert><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={a => a.id} columns={[
    { key: 'time', label: 'Thời gian', render: a => dateTime(a.occurredAt, shop.timezone) }, { key: 'actor', label: 'Người thực hiện', render: a => a.actorId }, { key: 'action', label: 'Thao tác', render: a => a.action }, { key: 'source', label: 'Đối tượng', render: a => `${a.resource.type} · ${a.resource.id}` }, { key: 'summary', label: 'Kết quả', render: a => a.summary }, { key: 'trace', label: 'Mã truy vết', render: a => <Typography variant="caption">{a.requestId}</Typography> }
]}/><Pager page={list.data.page}/></>}</QueryState></Panel></>; }
export function PrivacyPage() {
    const policy = useApi('getPrivacyPolicy');
    const requests = useApi('listPrivacyRequests', { query: useListQuery() });
    const save = useCommand('updatePrivacyPolicy', ['getPrivacyPolicy']);
    const create = useCommand('createPrivacyRequest', ['listPrivacyRequests']);
    const [days, setDays] = useState(''), [note, setNote] = useState(''), [customerId, setCustomer] = useState(''), [kind, setKind] = useState<'export' | 'delete'>('export'), [reason, setReason] = useState(''), [open, setOpen] = useState(false);
    const canReadCustomers = useCan('customers.read');
    const customers = useApi('listCustomers', { query: { limit: 100 } }, canReadCustomers);
    useEffect(() => { if (policy.data) {
        setDays(policy.data.data.chatRetentionDays?.toString() || '');
        setNote(policy.data.data.jurisdictionNote);
    } }, [policy.data]);
    return <><PageHeader title="Quyền riêng tư & vòng đời dữ liệu" subtitle="Tách cấu hình nháp với chính sách được duyệt; yêu cầu xóa không tự vượt điều kiện lưu chứng từ."/><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.4fr' }, gap: 3 }}><Panel title="Chính sách lưu trữ"><QueryState query={policy}><Stack gap={2} sx={{ p: 3 }}><ErrorNotice error={save.error}/>{policy.data && <Status value={policy.data.data.status}/>}<TextField label="Số ngày lưu hội thoại" value={days} onChange={e => setDays(e.target.value)} type="number" inputProps={{ min: 1, max: 36500 }}/><TextField label="Căn cứ / thị trường áp dụng" multiline minRows={4} value={note} onChange={e => setNote(e.target.value)}/><MutationButton permission="privacy.manage" variant="contained" busy={save.pending} disabled={!policy.data || !days || Number(days) < 1 || note.trim().length < 5} onClick={() => {
        const current = policy.data?.data;
        if (!current) return;
        void save.execute({ version: current.version, body: { chatRetentionDays: Number(days), jurisdictionNote: note } }).catch(() => undefined);
    }}>Lưu bản nháp chính sách</MutationButton><Alert severity="info">Không tự chứng nhận tuân thủ pháp luật. Phê duyệt yêu cầu xóa cần xác thực nâng cao của backend; luồng OIDC step-up chưa được xác minh trong frontend này.</Alert></Stack></QueryState></Panel><Panel title="Yêu cầu của khách" action={<MutationButton permission="privacy.manage" onClick={() => setOpen(true)}>Tạo yêu cầu</MutationButton>}><QueryState query={requests}>{requests.data && <><DataTable rows={requests.data.data} rowKey={r => r.id} columns={[
        { key: 'customer', label: 'Khách', render: r => r.customerId }, { key: 'kind', label: 'Yêu cầu', render: r => <Status value={r.kind}/> }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.status}/> }, { key: 'reason', label: 'Lý do', render: r => r.reason }
    ]}/><Pager page={requests.data.page}/></>}</QueryState></Panel></Box><ContactConsentPreview customers={customers.data?.data || []} canReadCustomers={canReadCustomers} />
 <EditDialog open={open} title="Yêu cầu dữ liệu cá nhân" onClose={() => setOpen(false)} busy={create.pending} actions={<Button variant="contained" disabled={!customerId || reason.trim().length < 5 || create.pending} onClick={async () => { try {
        await create.execute({ body: { kind, customerId, reason } });
        setOpen(false);
    }
    catch { /* visible */ } }}>Tạo yêu cầu chờ duyệt</Button>}><ErrorNotice error={create.error}/><Stack gap={2}><TextField label="Khách hàng" select value={customerId} onChange={e => setCustomer(e.target.value)}>{customers.data?.data.map(c => <MenuItem key={c.id} value={c.id}>{c.displayName}</MenuItem>)}</TextField><TextField label="Loại yêu cầu" select value={kind} onChange={e => setKind(e.target.value as typeof kind)}><MenuItem value="export">Xuất dữ liệu cá nhân</MenuItem><MenuItem value="delete">Xóa dữ liệu cá nhân</MenuItem></TextField><TextField label="Lý do / xác minh yêu cầu" multiline minRows={3} value={reason} onChange={e => setReason(e.target.value)}/></Stack></EditDialog></>;
}
type ConsentPreviewCustomer = { id: string; displayName: string };
function ContactConsentPreview({ customers, canReadCustomers }: { customers: ConsentPreviewCustomer[]; canReadCustomers: boolean }) {
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [optOutIds, setOptOutIds] = useState<string[]>([]);
    const customerId = customers.some(customer => customer.id === selectedCustomerId) ? selectedCustomerId : customers[0]?.id || '';
    const customer = customers.find(candidate => candidate.id === customerId);
    const optedOut = optOutIds.includes(customerId);
    return <Panel title="Xem thử consent marketing" sx={{ mt: 3 }}>
        <Stack gap={2} sx={{ p: 3 }}>
            <Alert severity="info">Dữ liệu tổng hợp chỉ dùng để xem tương tác UI. Contract Customer chưa có trường consent và API chưa có thao tác opt-out; lựa chọn ở đây không gửi tới backend hoặc chặn chiến dịch thật.</Alert>
            {canReadCustomers ? <>
                <TextField select label="Khách mẫu" value={customerId} onChange={event => setSelectedCustomerId(event.target.value)} disabled={!customer}>
                    {customers.map(item => <MenuItem key={item.id} value={item.id}>{item.displayName}</MenuItem>)}
                </TextField>
                <FormControlLabel label="Ngừng liên hệ marketing (chỉ bản xem trước)" control={<Checkbox checked={optedOut} disabled={!customer} onChange={event => setOptOutIds(current => event.target.checked ? [...new Set([...current, customerId])] : current.filter(id => id !== customerId))} />} />
                {customer && <Box role="status" data-testid="consent-preview-status">
                    <DetailLine label="Khách mẫu">{customer.displayName}</DetailLine>
                    <DetailLine label="Dịch vụ">Chưa có trường consent trong contract</DetailLine>
                    <DetailLine label="Marketing">{optedOut ? 'Opt-out mô phỏng; chưa ghi server' : 'Chưa xác minh từ API'}</DetailLine>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Số khách opt-out trong preview: {optOutIds.length}. Không khẳng định đã lọc job đang chờ hoặc dữ liệu khôi phục.</Typography>
                </Box>}
                {!customer && <Alert severity="info">Chưa có khách mẫu trong trang API hiện tại.</Alert>}
            </> : <Alert severity="warning">Vai trò hiện tại không có customers.read; khách mẫu và lựa chọn consent được ẩn.</Alert>}
        </Stack>
    </Panel>;
}
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
    return <><PageHeader title={`Công việc ${jobId}`} subtitle="Theo dõi tiến độ từ API. Được tiếp nhận không có nghĩa đã hoàn tất."/><QueryState query={get}>{job && <Panel title="Kết quả xử lý"><Stack gap={2} sx={{ p: 3 }}><Status value={job.status}/><DetailLine label="Loại">{job.kind}</DetailLine><DetailLine label="Tiến độ">{job.completed} / {job.total ?? 'Chưa biết'}</DetailLine><DetailLine label="Lỗi">{job.errorCount}</DetailLine><DetailLine label="Cập nhật">{dateTime(job.updatedAt, shop.timezone)}</DetailLine>{job.rowErrors.length > 0 && <DataTable rows={job.rowErrors} rowKey={e => `${e.row}-${e.field}-${e.code}`} columns={[{ key: 'row', label: 'Dòng', render: e => e.row }, { key: 'field', label: 'Trường', render: e => e.field }, { key: 'message', label: 'Lỗi', render: e => e.message }]}/>}<Button onClick={() => void get.refetch()} variant="outlined">Kiểm tra lại</Button>{job.downloadUrl && ['succeeded', 'partial'].includes(job.status) && downloadHref && <Button variant="contained" onClick={() => window.open(downloadHref, '_blank', 'noopener,noreferrer')}>Mở kết quả xuất</Button>}{job.downloadUrl && ['succeeded', 'partial'].includes(job.status) && !downloadHref && <Alert severity="warning">URL tải không an toàn hoặc không hợp lệ nên đã bị chặn.</Alert>}{job.status === 'awaiting_confirmation' && <RouteLink to={`/s/${shop.id}/imports/${job.id}`}>Xem và xác nhận nhập</RouteLink>}</Stack></Panel>}</QueryState></>;
}
