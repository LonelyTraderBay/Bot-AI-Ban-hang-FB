import { FormFields, PageSections, SectionGrid, SurfaceContent } from '../../shared/ui/composition';
import { useEffect, useState } from 'react';
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
import { useApi, usePagedApi, useCommand } from '@/shared/api/hooks';
import { ApiError } from '@/shared/api/errors';
import { useCan, useScope } from '@/shared/model/scope';
import { codePointLength, limitCodePoints, dateTime, safeInternalPath } from '@/shared/model/format';
import { authorizedDownloadHref } from '@/shared/model/download';
import { useListQuery } from '@/shared/model/filters';
import { useDraftForm } from '@/shared/model/dirty-drafts';
import { useVersionedDraft } from '@/shared/model/versioned-draft';
import { DraftConflict } from '@/shared/ui/draft-conflict';
import { layoutSx } from '@/shared/ui/layout';
import { PageHeader, Panel, QueryState, DataTable, Toolbar, Pager, Status, MutationButton, EditDialog, ErrorNotice, ConfirmDialog, RouteLink, DetailLine, LookupLoadMore } from '@/shared/ui/components';
import { useSession } from '@/shared/model/auth';
function AuthCard({ children }: {
    children: ReactNode;
}) { return <Box component="main" id="main-content" tabIndex={-1} sx={[layoutSx.shell.centeredFallback, { bgcolor: 'background.default', outline: 'none' }]}><Paper variant="outlined" sx={[layoutSx.auth.surfaceInset, { width: '100%', maxWidth: 520, borderRadius: visualSx.radius.hero }]}><Stack direction="row" alignItems="center" sx={layoutSx.auth.brandMarkGap}><Avatar sx={{ bgcolor: 'primary.main', color: colors.onAccent }}><SmartToyRounded /></Avatar><Typography variant="h5" fontWeight={visualSx.typography.fontWeight.extraBold}>BotSales <Box component="span" color="primary.main">AI</Box></Typography></Stack>{children}</Paper></Box>; }
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
    return <AuthCard><Typography component="h1" variant="h4" sx={layoutSx.auth.brandTitleGap}>Chào mừng trở lại</Typography><Typography color="text.secondary" sx={[layoutSx.pageHeader.titleDescriptionGap, layoutSx.pageHeader.afterGap]}>Một không gian cho bán hàng, kho, kế toán và đội ngũ AI của bạn.</Typography><ErrorNotice error={error}/>{__MOCK__ && <Alert severity="info" sx={layoutSx.pageHeader.afterGap}>Chế độ xem frontend: tài khoản giả lập, không có mật khẩu thật.</Alert>}{session ? <Button fullWidth component={RouterLink} to="/workspaces" variant="contained" endIcon={<ArrowForwardRounded />}>Tiếp tục vào cửa hàng</Button> : <Button fullWidth variant="contained" size="large" onClick={() => void login()} disabled={pending || loading}>{pending ? 'Đang chuyển đến đăng nhập…' : __MOCK__ ? 'Vào tài khoản mô phỏng' : 'Đăng nhập bằng tài khoản công ty'}</Button>}<Typography variant="caption" color="text.secondary" sx={[layoutSx.page.sectionBefore, { display: 'block' }]}>Phiên đăng nhập được quản lý ở máy chủ. Không lưu access token trong localStorage.</Typography></AuthCard>;
}
export function WorkspacesPage() {
    const { session, loading, error: sessionError } = useSession();
    const shops = useQuery({ queryKey: ['shops', session?.user.id], queryFn: ({ signal }) => request('listShops', { signal }), enabled: !!session, retry: false });
    if (!loading && !session && sessionError instanceof ApiError && sessionError.status === 401)
        return <Navigate to="/login" replace/>;
    return <Box component="main" id="main-content" tabIndex={-1} sx={[layoutSx.shell.pageFallbackInset, { maxWidth: 1100, mx: 'auto', outline: 'none' }]}><PageHeader title="Chọn cửa hàng" subtitle="Mỗi cửa hàng là một vùng dữ liệu và quyền độc lập." actions={<Button component={RouterLink} to="/onboarding" variant="contained">Tạo cửa hàng</Button>}/><ErrorNotice error={sessionError}/><QueryState query={shops} pendingProfile="section"><SectionGrid columns={{ xs: '1fr', md: 'repeat(2,1fr)' }}>{shops.data?.data.map(s => <Paper variant="outlined" key={s.id} sx={[layoutSx.surface.inset, { borderRadius: visualSx.radius.large }]}><Avatar sx={{ bgcolor: colors.selected, color: 'primary.main' }}>{s.name[0]}</Avatar><SurfaceContent beforeGap="surface"><Typography variant="h5">{s.name}</Typography><Typography color="text.secondary">{s.currency} · {s.timezone}</Typography><Typography variant="caption" color="text.secondary">Quyền: {session?.memberships.find(m => m.shopId === s.id)?.roles.join(', ') || 'Chưa có quyền'}</Typography></SurfaceContent><Button component={RouterLink} to={`/s/${s.id}/overview`} fullWidth variant="outlined" endIcon={<ArrowForwardRounded />} sx={layoutSx.page.sectionBefore}>Mở cửa hàng</Button></Paper>)}</SectionGrid></QueryState></Box>;
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
    return <AuthCard><Typography component="h1" variant="h4" sx={layoutSx.auth.brandTitleGap}>Tạo cửa hàng</Typography><Typography color="text.secondary" sx={[layoutSx.pageHeader.titleDescriptionGap, layoutSx.pageHeader.afterGap]}>Chọn tiền tệ cơ sở trước khi ghi nhận giao dịch.</Typography><ErrorNotice error={error}/><FormFields ><TextField label="Tên cửa hàng" value={name} onChange={e => setName(limitCodePoints(e.target.value, 160))} /><TextField label="Tiền tệ cơ sở" select value={currency} onChange={e => setCurrency(e.target.value)}>{['VND', 'LAK', 'THB', 'USD'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField><TextField label="Múi giờ" value={timezone} onChange={e => setTimezone(e.target.value)}/><Alert severity="info">Giao diện Graphite Gold dark-only đã chốt. Những chính sách thật và kết nối ngoài chưa tự bật khi tạo shop.</Alert><Button variant="contained" disabled={!name.trim() || !timezone || pending} onClick={() => void save()}>Tạo cửa hàng</Button><Button component={RouterLink} to="/workspaces">Quay lại</Button></FormFields></AuthCard>;
}
export function ShopSettingsPage() {
    const scope = useScope();
    const { shop } = scope;
    const cache = useQueryClient();
    const canManageShop = useCan('shop.manage');
    const update = useCommand('updateShop', ['getShop']);
    const [name, setName] = useState(shop.name), [timezone, setTimezone] = useState(shop.timezone), [locale, setLocale] = useState(shop.locale), [error, setError] = useState<Error | null>(null), [saved, setSaved] = useState(false);
    const latestShop = useApi('getShop');
    const currentShop = latestShop.data && latestShop.data.data.version >= shop.version ? latestShop.data.data : shop;
    const editor = useVersionedDraft({
        identity: `${shop.id}:settings`,
        source: { version: currentShop.version, values: { name: currentShop.name, timezone: currentShop.timezone, locale: currentShop.locale } },
        draft: { name, timezone, locale },
        apply: values => { setName(values.name); setTimezone(values.timezone); setLocale(values.locale); },
        refresh: () => latestShop.refetch({ throwOnError: true }),
    });
    const formRef = useDraftForm(editor.dirty);
    const save = async () => {
        setError(null); setSaved(false);
        const prepared = editor.prepare();
        if (!prepared) return;
        const submitted = { name, timezone, locale };
        try {
            new Intl.DateTimeFormat(locale, { timeZone: timezone });
            const result = await update.execute({ path: { shopId: shop.id }, version: prepared.version, body: prepared.patch });
            cache.setQueryData(['shop', scope.session.user.id, shop.id, scope.membership.permissionVersion], result);
            editor.committed({ version: result.data.version, values: { name: result.data.name, timezone: result.data.timezone, locale: result.data.locale } }, submitted);
            setSaved(true);
        }
        catch (error) { editor.failed(error); setError(error instanceof Error ? error : new Error('Không lưu được cấu hình')); }
    };
    return <>
        <PageHeader title="Thiết lập cửa hàng" subtitle="Cấu hình riêng của shop không thay đổi quy tắc AI lập trình hoặc màu đã duyệt." />
        <PageSections >
            <Panel title="Thông tin cơ sở" bodyMode="inset">
                <FormFields component="form" ref={formRef} noValidate onSubmit={event => { event.preventDefault(); void save(); }} geometry={{maxWidth: 760}}>
                    <ErrorNotice error={error || update.error} />
                    <DraftConflict editor={editor} labels={{ name: 'Tên cửa hàng', timezone: 'Múi giờ', locale: 'Ngôn ngữ' }} busy={update.pending}/>
                    {saved && <Alert severity="success" role="status">Đã lưu cấu hình cửa hàng.</Alert>}
                    <TextField label="Tên cửa hàng" value={name} disabled={!canManageShop} onChange={event => { setName(event.target.value); setSaved(false); }} />
                    <TextField label="Tiền tệ cơ sở" value={shop.currency} disabled helperText="Không đổi tiền tệ bằng sửa giao diện. Cần kế hoạch chuyển đổi dữ liệu." />
                    <TextField label="Múi giờ" value={timezone} disabled={!canManageShop} onChange={event => { setTimezone(event.target.value); setSaved(false); }} />
                    <TextField label="Ngôn ngữ" value={locale} disabled={!canManageShop} onChange={event => { setLocale(event.target.value); setSaved(false); }} />
                    <TextField label="Giao diện" value="Graphite Gold · Dark-only" disabled />
                    <MutationButton permission="shop.manage" type="submit" variant="contained" busy={update.pending} disabled={!name.trim() || !timezone}>Lưu cấu hình</MutationButton>
                </FormFields>
            </Panel>
            <Panel title="Checklist thiết lập vận hành" subtitle="Các mục không có trường API được giữ ở trạng thái chưa xác minh; không suy diễn đã sẵn sàng." bodyMode="inset">
                <Stack sx={layoutSx.surface.compactContentGap}>
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
        </PageSections>
    </>;
}
function SetupChecklistItem({ title, status, to, action }: { title: string; status: string; to?: string; action?: string }) {
    return <SurfaceContent bodyMode="compactControlOutlined" direction="row" alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" flexWrap="wrap">
        <Box><Typography fontWeight={visualSx.typography.fontWeight.strong}>{title}</Typography><Typography variant="body2" color="text.secondary">{status}</Typography></Box>
        {to && action && <RouteLink to={to}>{action}</RouteLink>}
    </SurfaceContent>;
}
const roleLabels: Record<Role, string> = {
    owner: 'Chủ cửa hàng', manager: 'Quản lý', sales: 'Bán hàng', warehouse: 'Nhân viên kho', accountant: 'Kế toán', bot_admin: 'Quản trị AI', viewer: 'Chỉ xem'
};
export function TeamPage() {
    const { session } = useScope();
    const list = useApi('listMembers', { query: useListQuery('listMembers') });
    const invite = useCommand('inviteMember', ['listMembers']);
    const update = useCommand('updateMemberRoles', ['listMembers']);
    const revoke = useCommand('revokeMembership', ['listMembers']);
    const [edit, setEdit] = useState<Membership | null | undefined>(), [email, setEmail] = useState(''), [roles, setRoles] = useState<Role[]>(['viewer']), [remove, setRemove] = useState<Membership | null>(null);
    const open = (m: Membership | null) => { setEdit(m); setEmail(''); setRoles(m?.roles || ['viewer']); };
    return <><PageHeader title="Nhân sự & phân quyền" subtitle="Vai trò là bộ quyền mặc định; API quyết định quyền hiệu lực ở từng thao tác." actions={<MutationButton permission="members.manage" variant="contained" onClick={() => open(null)}>Mời nhân viên</MutationButton>}/><Panel><Toolbar operation="listMembers" /><QueryState query={list} pendingProfile="section">{list.data && <><DataTable rows={list.data.data} rowKey={m => m.id} columns={[
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
    catch { /* visible */ } }}>Lưu</Button>}><ErrorNotice error={invite.error || update.error}/><FormFields >{!edit && <TextField label="Email nhân viên" type="email" value={email} onChange={e => setEmail(e.target.value)}/>}<Typography variant="subtitle2">Phân vai trò</Typography>{(Object.keys(roleLabels) as Role[]).map(role => <FormControlLabel key={role} label={`${roleLabels[role]} · ${permissionCatalog.rolePresets[role]?.length || 0} quyền`} control={<Checkbox checked={roles.includes(role)} onChange={e => setRoles(e.target.checked ? [...roles, role] : roles.filter(r => r !== role))}/>}/>)}<Alert severity="warning">Quyền mới phải được máy chủ kiểm lại. Thu hồi quyền làm mất hiệu lực cache và phiên truy cập liên quan.</Alert></FormFields></EditDialog><ConfirmDialog open={!!remove} title="Thu hồi quyền nhân viên" description="Người này không được tiếp tục dùng dữ liệu của shop sau khi quyền được thu hồi." onClose={() => setRemove(null)} busy={revoke.pending} error={revoke.error} onConfirm={async () => {
        if (!remove) return;
        await revoke.execute({ path: { memberId: remove.id }, version: remove.permissionVersion });
    }}/></>;
}
export function AuditPage() { const { shop } = useScope(); const list = useApi('listAuditEvents', { query: useListQuery('listAuditEvents') }); return <><PageHeader title="Nhật ký hoạt động" subtitle="Ai thực hiện, thao tác nào, dữ liệu nào và mã truy vết. Không lưu API key hoặc suy luận riêng của AI."/><Alert severity="info" sx={layoutSx.notice.afterGap}>API hiện trả về người thực hiện, thao tác, đối tượng, thời gian, mã truy vết và tóm tắt. Loại actor, phiên bản policy/config và snapshot chi tiết chưa có trong DTO nên không được suy đoán.</Alert><Panel><Toolbar operation="listAuditEvents" /><QueryState query={list} pendingProfile="section">{list.data && <><DataTable rows={list.data.data} rowKey={a => a.id} columns={[
    { key: 'time', label: 'Thời gian', render: a => dateTime(a.occurredAt, shop.timezone) }, { key: 'actor', label: 'Người thực hiện', render: a => a.actorId }, { key: 'action', label: 'Thao tác', render: a => a.action }, { key: 'source', label: 'Đối tượng', render: a => `${a.resource.type} · ${a.resource.id}` }, { key: 'summary', label: 'Kết quả', render: a => a.summary }, { key: 'trace', label: 'Mã truy vết', render: a => <Typography variant="caption">{a.requestId}</Typography> }
]}/><Pager page={list.data.page}/></>}</QueryState></Panel></>; }
export function PrivacyPage() {
    const { shop } = useScope();
    const policy = useApi('getPrivacyPolicy');
    const requests = useApi('listPrivacyRequests', { query: useListQuery('listPrivacyRequests') });
    const save = useCommand('updatePrivacyPolicy', ['getPrivacyPolicy']);
    const create = useCommand('createPrivacyRequest', ['listPrivacyRequests']);
    const [days, setDays] = useState(''), [note, setNote] = useState(''), [customerId, setCustomer] = useState(''), [kind, setKind] = useState<'export' | 'delete'>('export'), [reason, setReason] = useState(''), [open, setOpen] = useState(false);
    const canReadCustomers = useCan('customers.read');
    const [customerSearchInput, setCustomerSearchInput] = useState(''), [customerSearch, setCustomerSearch] = useState('');
    useEffect(() => {
        const timer = window.setTimeout(() => setCustomerSearch(customerSearchInput.trim()), 250);
        return () => window.clearTimeout(timer);
    }, [customerSearchInput]);
    const customers = usePagedApi('listCustomers', { query: { q: customerSearch || undefined } }, canReadCustomers);
    const selectedCustomerDetail = useApi('getCustomer', { path: { customerId } }, canReadCustomers && !!customerId);
    const selectedCustomer = customers.data?.data.find(customer => customer.id === customerId) || selectedCustomerDetail.data?.data;
    const editor = useVersionedDraft({
        identity: `${shop.id}:privacy`,
        source: policy.data ? { version: policy.data.data.version, values: { days: policy.data.data.chatRetentionDays?.toString() || '', note: policy.data.data.jurisdictionNote } } : undefined,
        draft: { days, note },
        apply: values => { setDays(values.days); setNote(values.note); },
        refresh: () => policy.refetch({ throwOnError: true }),
    });
    const policyForm = useDraftForm(editor.dirty);
    const daysError = !/^\d+$/.test(days) || Number(days) < 1 || Number(days) > 36500 ? 'Nhập số nguyên từ 1 đến 36.500 ngày.' : '';
    const noteError = codePointLength(note.trim()) < 5 || codePointLength(note) > 2000 ? 'Nhập căn cứ từ 5 đến 2.000 ký tự.' : '';
    const savePolicy = async () => {
        if (daysError || noteError || !editor.dirty) return;
        const prepared = editor.prepare(); if (!prepared) return;
        const submitted = { days, note };
        try {
            const result = await save.execute({ version: prepared.version, body: {
                ...(prepared.patch.days !== undefined ? { chatRetentionDays: Number(prepared.patch.days) } : {}),
                ...(prepared.patch.note !== undefined ? { jurisdictionNote: prepared.patch.note } : {}),
            } });
            editor.committed({ version: result.data.version, values: { days: result.data.chatRetentionDays?.toString() || '', note: result.data.jurisdictionNote } }, submitted);
        } catch (error) { editor.failed(error); }
    };
    return <><PageHeader title="Quyền riêng tư & vòng đời dữ liệu" subtitle="Tách cấu hình nháp với chính sách được duyệt; yêu cầu xóa không tự vượt điều kiện lưu chứng từ."/><SectionGrid columns={{ xs: '1fr', lg: '1fr 1.4fr' }}><Panel title="Chính sách lưu trữ" bodyMode="inset"><QueryState query={policy} pendingProfile="section"><FormFields component="form" ref={policyForm} onSubmit={event => { event.preventDefault(); void savePolicy(); }}><ErrorNotice error={save.error}/><DraftConflict editor={editor} labels={{ days: 'Số ngày lưu hội thoại', note: 'Căn cứ / thị trường áp dụng' }} busy={save.pending}/>{policy.data && <Status value={policy.data.data.status}/>}<TextField label="Số ngày lưu hội thoại" value={days} onChange={e => setDays(e.target.value)} type="number" inputProps={{ min: 1, max: 36500, step: 1 }} error={!!daysError} helperText={daysError}/><TextField label="Căn cứ / thị trường áp dụng" multiline minRows={4} value={note} onChange={e => setNote(e.target.value)} error={!!noteError} helperText={noteError}/><MutationButton permission="privacy.manage" variant="contained" busy={save.pending} disabled={!policy.data || !editor.dirty || !!daysError || !!noteError} onClick={() => void savePolicy()}>Lưu bản nháp chính sách</MutationButton><Alert severity="info">Không tự chứng nhận tuân thủ pháp luật. Phê duyệt yêu cầu xóa cần xác thực nâng cao của backend; luồng OIDC step-up chưa được xác minh trong frontend này.</Alert></FormFields></QueryState></Panel><Panel title="Yêu cầu của khách" action={<MutationButton permission="privacy.manage" onClick={() => setOpen(true)}>Tạo yêu cầu</MutationButton>}><QueryState query={requests} pendingProfile="section">{requests.data && <><DataTable rows={requests.data.data} rowKey={r => r.id} columns={[
        { key: 'customer', label: 'Khách', render: r => r.customerId }, { key: 'kind', label: 'Yêu cầu', render: r => <Status value={r.kind}/> }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.status}/> }, { key: 'reason', label: 'Lý do', render: r => r.reason }
    ]}/><Pager page={requests.data.page}/></>}</QueryState></Panel></SectionGrid><ContactConsentPreview customers={customers.data?.data || []} canReadCustomers={canReadCustomers} shopId={shop.id} />
 <EditDialog open={open} title="Yêu cầu dữ liệu cá nhân" onClose={() => setOpen(false)} busy={create.pending} actions={<Button variant="contained" disabled={!customerId || codePointLength(reason.trim()) < 5 || create.pending} onClick={async () => { try {
        await create.execute({ body: { kind, customerId, reason } });
        setOpen(false);
    }
    catch { /* visible */ } }}>Tạo yêu cầu chờ duyệt</Button>}><ErrorNotice error={create.error || customers.error || selectedCustomerDetail.error}/><FormFields ><TextField label="Tìm khách hàng" value={customerSearchInput} onChange={e => setCustomerSearchInput(e.target.value)} disabled={!canReadCustomers} helperText="Tìm theo mã hoặc tên khách; API hỗ trợ tìm kiếm và cursor."/><TextField label="Khách hàng" select value={customerId} onChange={e => setCustomer(e.target.value)} disabled={!canReadCustomers || (customers.isPending && !customers.data)}>{customerId && !customers.data?.data.some(customer => customer.id === customerId) && <MenuItem value={customerId}>{selectedCustomer?.displayName || (selectedCustomerDetail.isPending ? 'Đang tải khách đã chọn…' : customerId)}</MenuItem>}{customers.data?.data.map(c => <MenuItem key={c.id} value={c.id}>{c.displayName}</MenuItem>)}</TextField><LookupLoadMore label="khách hàng" loadedCount={customers.loadedCount} hasMore={customers.hasMore} busy={customers.isLoadingMore} onLoadMore={customers.loadMore}/>{customers.isError && <Button size="small" onClick={() => { void (customers.isFetchNextPageError ? customers.loadMore() : customers.refetch()); }}>Thử lại danh sách khách</Button>}<TextField label="Loại yêu cầu" select value={kind} onChange={e => setKind(e.target.value as typeof kind)}><MenuItem value="export">Xuất dữ liệu cá nhân</MenuItem><MenuItem value="delete">Xóa dữ liệu cá nhân</MenuItem></TextField><TextField label="Lý do / xác minh yêu cầu" multiline minRows={3} value={reason} onChange={e => setReason(e.target.value)}/></FormFields></EditDialog></>;
}
type ConsentPreviewCustomer = { id: string; displayName: string };
function ContactConsentPreview({ customers, canReadCustomers, shopId }: { customers: ConsentPreviewCustomer[]; canReadCustomers: boolean; shopId: string }) {
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [optOutIds, setOptOutIds] = useState<string[]>([]);
    const customerId = customers.some(customer => customer.id === selectedCustomerId) ? selectedCustomerId : customers[0]?.id || '';
    const customer = customers.find(candidate => candidate.id === customerId);
    const optedOut = optOutIds.includes(customerId);
    return <Panel title="Xem thử consent marketing" beforeGap={"section"} bodyMode="inset">
        <FormFields >
            <Alert severity="info">Dữ liệu tổng hợp chỉ dùng để xem tương tác UI. Danh sách này gồm tối đa {customers.length} khách đã tải, không phải toàn bộ khách của cửa hàng. Contract Customer chưa có trường consent và API chưa có thao tác opt-out; lựa chọn ở đây không gửi tới backend hoặc chặn chiến dịch thật.</Alert>
            {canReadCustomers && <Button component={RouterLink} to={`/s/${shopId}/customers`} size="small" sx={{ alignSelf: 'flex-start' }}>Mở danh sách khách đầy đủ</Button>}
            {canReadCustomers ? <>
                <TextField select label="Khách mẫu" value={customerId} onChange={event => setSelectedCustomerId(event.target.value)} disabled={!customer}>
                    {customers.map(item => <MenuItem key={item.id} value={item.id}>{item.displayName}</MenuItem>)}
                </TextField>
                <FormControlLabel label="Ngừng liên hệ marketing (chỉ bản xem trước)" control={<Checkbox checked={optedOut} disabled={!customer} onChange={event => setOptOutIds(current => event.target.checked ? [...new Set([...current, customerId])] : current.filter(id => id !== customerId))} />} />
                {customer && <Box role="status" data-testid="consent-preview-status">
                    <DetailLine label="Khách mẫu">{customer.displayName}</DetailLine>
                    <DetailLine label="Dịch vụ">Chưa có trường consent trong contract</DetailLine>
                    <DetailLine label="Marketing">{optedOut ? 'Opt-out mô phỏng; chưa ghi server' : 'Chưa xác minh từ API'}</DetailLine>
                    <Typography variant="body2" color="text.secondary" sx={layoutSx.notice.contentGap}>Số khách opt-out trong preview: {optOutIds.length}. Không khẳng định đã lọc job đang chờ hoặc dữ liệu khôi phục.</Typography>
                </Box>}
                {!customer && <Alert severity="info">Chưa có khách mẫu trong trang API hiện tại.</Alert>}
            </> : <Alert severity="warning">Vai trò hiện tại không có customers.read; khách mẫu và lựa chọn consent được ẩn.</Alert>}
        </FormFields>
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
    return <><PageHeader title={`Công việc ${jobId}`} subtitle="Theo dõi tiến độ từ API. Được tiếp nhận không có nghĩa đã hoàn tất."/><QueryState query={get} pendingProfile="section">{job && <Panel title="Kết quả xử lý" bodyMode="inset"><FormFields ><Status value={job.status}/><DetailLine label="Loại">{job.kind}</DetailLine><DetailLine label="Tiến độ">{job.completed} / {job.total ?? 'Chưa biết'}</DetailLine><DetailLine label="Lỗi">{job.errorCount}</DetailLine><DetailLine label="Cập nhật">{dateTime(job.updatedAt, shop.timezone)}</DetailLine>{job.rowErrors.length > 0 && <DataTable rows={job.rowErrors} rowKey={e => `${e.row}-${e.field}-${e.code}`} columns={[{ key: 'row', label: 'Dòng', render: e => e.row }, { key: 'field', label: 'Trường', render: e => e.field }, { key: 'message', label: 'Lỗi', render: e => e.message }]}/>}<Button onClick={() => void get.refetch()} variant="outlined">Kiểm tra lại</Button>{job.downloadUrl && ['succeeded', 'partial'].includes(job.status) && downloadHref && <Button variant="contained" onClick={() => window.open(downloadHref, '_blank', 'noopener,noreferrer')}>Mở kết quả xuất</Button>}{job.downloadUrl && ['succeeded', 'partial'].includes(job.status) && !downloadHref && <Alert severity="warning">URL tải không an toàn hoặc không hợp lệ nên đã bị chặn.</Alert>}{job.status === 'awaiting_confirmation' && <RouteLink to={`/s/${shop.id}/imports/${job.id}`}>Xem và xác nhận nhập</RouteLink>}</FormFields></Panel>}</QueryState></>;
}
