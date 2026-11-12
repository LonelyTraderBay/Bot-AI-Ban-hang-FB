import { label as businessLabel } from '@/shared/model/labels';
import { ActionGroup, FieldGroup, FormFields, SectionGrid } from '../../shared/ui/composition';
import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import type { ConsentConfirmation, Customer, PublicConsentChallengeView } from '@botsales/contracts';
import { request, setCsrfToken } from '@/shared/api/client';
import { useApi, usePagedApi, useCommand } from '@/shared/api/hooks';
import { assertSchema } from '@/shared/api/validation';
import { useCan, useScope } from '@/shared/model/scope';
import { codePointLength, dateTime } from '@/shared/model/format';
import { useListQuery } from '@/shared/model/filters';
import { useDraftForm } from '@/shared/model/dirty-drafts';
import { useVersionedDraft } from '@/shared/model/versioned-draft';
import { DraftConflict } from '@/shared/ui/draft-conflict';
import { layoutSx } from '@/shared/ui/layout';
import { PageHeader, Panel, QueryState, DataTable, Pager, Status, MutationButton, EditDialog, ErrorNotice, DetailLine, LookupLoadMore } from '@/shared/ui/components';

export function PrivacyPage() {
    const { shop } = useScope();
    const policy = useApi('getPrivacyPolicy');
    const requests = useApi('listPrivacyRequests', { query: useListQuery('listPrivacyRequests') });
    const save = useCommand('updatePrivacyPolicy', ['getPrivacyPolicy']);
    const create = useCommand('createPrivacyRequest', ['listPrivacyRequests']);
    const [days, setDays] = useState(''), [note, setNote] = useState(''), [customerId, setCustomer] = useState(''), [kind, setKind] = useState<'export' | 'delete'>('export'), [reason, setReason] = useState(''), [open, setOpen] = useState(false), [daysTouched, setDaysTouched] = useState(false), [noteTouched, setNoteTouched] = useState(false), [policySubmitted, setPolicySubmitted] = useState(false), [policySaved, setPolicySaved] = useState('');
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
    const showDaysError = (daysTouched || policySubmitted) && !!daysError;
    const showNoteError = (noteTouched || policySubmitted) && !!noteError;
    const savePolicy = async () => {
        setPolicySubmitted(true);
        if (daysError || noteError || !editor.dirty) return;
        const prepared = editor.prepare(); if (!prepared) return;
        const submitted = { days, note };
        setPolicySaved('');
        try {
            const result = await save.execute({ version: prepared.version, body: {
                ...(prepared.patch.days !== undefined ? { chatRetentionDays: Number(prepared.patch.days) } : {}),
                ...(prepared.patch.note !== undefined ? { jurisdictionNote: prepared.patch.note } : {}),
            } });
            const clean = editor.committed({ version: result.data.version, values: { days: result.data.chatRetentionDays?.toString() || '', note: result.data.jurisdictionNote } }, submitted);
            setPolicySaved(clean ? 'Đã lưu bản nháp chính sách lưu trữ.' : 'Đã lưu phần thay đổi đã gửi; chỉnh sửa mới vẫn chưa được lưu.');
        } catch (error) { editor.failed(error); }
    };
    return <><PageHeader title="Quyền riêng tư & vòng đời dữ liệu" subtitle="Tách cấu hình nháp với chính sách được duyệt; yêu cầu xóa không tự vượt điều kiện lưu chứng từ."/><SectionGrid columns={{ xs: '1fr', lg: '1fr 1.4fr' }}><Panel title="Chính sách lưu trữ" bodyMode="inset"><QueryState query={policy} pendingProfile="section"><FormFields component="form" ref={policyForm} onSubmit={event => { event.preventDefault(); void savePolicy(); }}><ErrorNotice error={save.error}/><DraftConflict editor={editor} labels={{ days: 'Số ngày lưu hội thoại', note: 'Căn cứ / thị trường áp dụng' }} busy={save.pending}/>{policySaved && <Alert severity="success" role="status">{policySaved}</Alert>}{policy.data && <ActionGroup><Status value={policy.data.data.status}/></ActionGroup>}<TextField label="Số ngày lưu hội thoại" value={days} onBlur={() => setDaysTouched(true)} onChange={e => { setDays(e.target.value); setDaysTouched(true); setPolicySaved(''); }} type="number" inputProps={{ min: 1, max: 36500, step: 1 }} error={showDaysError} helperText={showDaysError ? daysError : 'Nhập số nguyên từ 1 đến 36.500 ngày.'}/><TextField label="Căn cứ / thị trường áp dụng" multiline minRows={4} value={note} onBlur={() => setNoteTouched(true)} onChange={e => { setNote(e.target.value); setNoteTouched(true); setPolicySaved(''); }} error={showNoteError} helperText={showNoteError ? noteError : 'Tối thiểu 5 và tối đa 2.000 ký tự.'}/><MutationButton permission="privacy.manage" type="submit" variant="contained" busy={save.pending} disabled={!policy.data || !editor.dirty || save.pending || !!daysError || !!noteError}>Lưu bản nháp chính sách</MutationButton><Alert severity="info">Không tự chứng nhận tuân thủ pháp luật. Phê duyệt yêu cầu xóa cần xác thực nâng cao của backend; luồng OIDC step-up chưa được xác minh trong frontend này.</Alert></FormFields></QueryState></Panel><Panel title="Yêu cầu của khách" action={<MutationButton permission="privacy.manage" onClick={() => setOpen(true)}>Tạo yêu cầu</MutationButton>}><QueryState query={requests} pendingProfile="section">{requests.data && <><DataTable label="Yêu cầu quyền riêng tư" rows={requests.data.data} rowKey={r => r.id} columns={[
        { key: 'customer', label: 'Khách', render: r => `Mã khách hàng: ${r.customerId}` }, { key: 'kind', label: 'Yêu cầu', render: r => <Status value={r.kind}/> }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.status}/> }, { key: 'reason', label: 'Lý do', render: r => r.reason }
    ]}/><Pager page={requests.data.page}/></>}</QueryState></Panel></SectionGrid><ConsentManagement customers={customers.data?.data || []} canReadCustomers={canReadCustomers} shopId={shop.id} />
 <EditDialog open={open} title="Yêu cầu dữ liệu cá nhân" onClose={() => setOpen(false)} busy={create.pending} actions={<Button variant="contained" disabled={!customerId || codePointLength(reason.trim()) < 5 || create.pending} onClick={async () => { try {
        await create.execute({ body: { kind, customerId, reason } });
        setOpen(false);
    }
    catch { /* visible */ } }}>Tạo yêu cầu chờ duyệt</Button>}><ErrorNotice error={create.error || customers.error || selectedCustomerDetail.error}/><FormFields ><TextField label="Tìm khách hàng" value={customerSearchInput} onChange={e => setCustomerSearchInput(e.target.value)} disabled={!canReadCustomers} helperText="Tìm theo mã hoặc tên khách; API hỗ trợ tìm kiếm và cursor."/><TextField label="Khách hàng" select value={customerId} onChange={e => setCustomer(e.target.value)} disabled={!canReadCustomers || (customers.isPending && !customers.data)}>{customerId && !customers.data?.data.some(customer => customer.id === customerId) && <MenuItem value={customerId}>{selectedCustomer?.displayName || (selectedCustomerDetail.isPending ? 'Đang tải khách đã chọn…' : customerId)}</MenuItem>}{customers.data?.data.map(c => <MenuItem key={c.id} value={c.id}>{c.displayName}</MenuItem>)}</TextField><LookupLoadMore label="khách hàng" loadedCount={customers.loadedCount} hasMore={customers.hasMore} busy={customers.isLoadingMore} onLoadMore={customers.loadMore}/>{customers.isError && <Button size="small" onClick={() => { void (customers.isFetchNextPageError ? customers.loadMore() : customers.refetch()); }}>Thử lại danh sách khách</Button>}<TextField label="Loại yêu cầu" select value={kind} onChange={e => setKind(e.target.value as typeof kind)}><MenuItem value="export">Xuất dữ liệu cá nhân</MenuItem><MenuItem value="delete">Xóa dữ liệu cá nhân</MenuItem></TextField><TextField label="Lý do / xác minh yêu cầu" multiline minRows={3} value={reason} onChange={e => setReason(e.target.value)}/></FormFields></EditDialog></>;
}
type ConsentCustomer = Pick<Customer, 'id' | 'displayName' | 'email' | 'phone' | 'externalIdentity' | 'redactedFields'>;
const consentCopyVersion = 1;
const consentReconfirmCopy = 'Bạn có đồng ý nhận nội dung tiếp thị từ cửa hàng qua kênh đã chọn không? Bạn có thể rút lại đồng ý bất cứ lúc nào. Tin nhắn phục vụ đơn hàng không thay đổi.';
function ConsentManagement({ customers, canReadCustomers, shopId }: { customers: ConsentCustomer[]; canReadCustomers: boolean; shopId: string }) {
    const consentList = usePagedApi('listCustomerConsents', { query: useListQuery('listCustomerConsents') });
    const challengeList = usePagedApi('listCustomerConsentChallenges', { query: useListQuery('listCustomerConsentChallenges') });
    const createChallenge = useCommand('createCustomerConsentChallenge', ['listCustomerConsentChallenges']);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [channel, setChannel] = useState<'messenger' | 'email' | 'sms'>('messenger');
    const [created, setCreated] = useState(false);
    const customerId = customers.some(customer => customer.id === selectedCustomerId) ? selectedCustomerId : customers[0]?.id || '';
    const customer = customers.find(candidate => candidate.id === customerId);
    const redacted = customer?.redactedFields || [];
    const availableChannels = [
        { value: 'messenger' as const, label: 'Messenger', available: Boolean(customer?.externalIdentity) },
        { value: 'sms' as const, label: 'SMS', available: Boolean(customer?.phone && !redacted.includes('phone')) },
        { value: 'email' as const, label: 'Email', available: Boolean(customer?.email && !redacted.includes('email')) },
    ].filter(item => item.available);
    const selectedChannel = availableChannels.find(item => item.value === channel)?.value || availableChannels[0]?.value || channel;
    const channelIsAvailable = availableChannels.some(item => item.value === selectedChannel);
    const requestReconfirmation = async () => {
        if (!customerId || !canReadCustomers || !channelIsAvailable) return;
        try {
            await createChallenge.execute({ path: { customerId }, body: { purpose: 'marketing', channel: selectedChannel, message: consentReconfirmCopy, contentVersion: consentCopyVersion } });
            setCreated(true);
            await Promise.all([challengeList.refetch(), consentList.refetch()]);
        }
        catch { /* ErrorNotice keeps the API result visible. */ }
    };
    return <Panel title="Consent marketing và xác nhận lại" beforeGap="section" bodyMode="inset">
        <FormFields>
            <Alert severity="info">Consent được lưu theo khách, mục đích, kênh, phiên bản và lịch sử. Tạo yêu cầu chỉ tạo challenge đang chờ; không bật consent. Môi trường local không có nhà cung cấp gửi email/SMS/Meta nên không khẳng định đã gửi link thật.</Alert>
            {canReadCustomers ? <>
                <TextField select label="Khách hàng" value={customerId} onChange={event => { setSelectedCustomerId(event.target.value); setCreated(false); }} disabled={!customer}>
                    {customers.map(item => <MenuItem key={item.id} value={item.id}>{item.displayName}</MenuItem>)}
                </TextField>
                <TextField select label="Kênh cần xác nhận" value={selectedChannel} onChange={event => { setChannel(event.target.value as typeof channel); setCreated(false); }} disabled={!availableChannels.length}>
                    {availableChannels.map(item => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
                </TextField>
                <DetailLine label={`Nội dung v${consentCopyVersion}`}>{consentReconfirmCopy}</DetailLine>
                {!availableChannels.length && <Alert severity="warning">Không có kênh liên hệ còn quyền xem cho khách đã chọn.</Alert>}
                <MutationButton permission="privacy.manage" variant="contained" busy={createChallenge.pending} disabled={!customerId || !channelIsAvailable || !canReadCustomers} onClick={() => void requestReconfirmation()}>Tạo yêu cầu xác nhận lại</MutationButton>
                <ErrorNotice error={createChallenge.error || consentList.error || challengeList.error}/>
                {created && <Alert severity="success" role="status">Đã tạo challenge chờ khách xác nhận. Trạng thái này chưa phải consent được cấp.</Alert>}
            </> : <Alert severity="warning">Cần quyền customers.read để chọn khách. Danh sách và thông tin nhận dạng được ẩn.</Alert>}
            <FieldGroup role="group" aria-label="Bản ghi consent hiện tại">
                <Typography component="h2" variant="h6">Bản ghi consent hiện tại</Typography>
                <QueryState query={consentList} pendingProfile="section">{consentList.data && <>
                    <DataTable label="Lịch sử consent khách hàng" rows={consentList.data.data} rowKey={record => record.id} columns={[
                        { key: 'customer', label: 'Khách', render: record => `Mã khách hàng: ${record.customerId}` },
                        { key: 'purpose', label: 'Mục đích', render: record => businessLabel(record.purpose) },
                        { key: 'channel', label: 'Kênh', render: record => businessLabel(record.channel) },
                        { key: 'status', label: 'Trạng thái', render: record => <Status value={record.status} domain="consent"/> },
                        { key: 'version', label: 'Phiên bản', render: record => record.version },
                        { key: 'evidence', label: 'Bằng chứng gần nhất', render: record => { const latest = record.history.at(-1); return latest ? `${businessLabel(latest.action, 'consent')} · ${latest.evidenceType} · ${latest.evidenceReference || '—'}` : 'Chưa có'; } },
                    ]}/>
                    <Pager page={consentList.data.page}/>
                </>}</QueryState>
            </FieldGroup>
            <FieldGroup role="group" aria-label="Yêu cầu xác nhận đang chờ">
                <Typography component="h2" variant="h6">Yêu cầu xác nhận đang chờ</Typography>
                <QueryState query={challengeList} pendingProfile="section">{challengeList.data && <>
                    <DataTable label="Yêu cầu xác nhận đang chờ" rows={challengeList.data.data} rowKey={challenge => challenge.id} columns={[
                        { key: 'customer', label: 'Khách', render: challenge => `Mã khách hàng: ${challenge.customerId}` },
                        { key: 'purpose', label: 'Mục đích', render: challenge => businessLabel(challenge.purpose) },
                        { key: 'channel', label: 'Kênh', render: challenge => businessLabel(challenge.channel) },
                        { key: 'action', label: 'Yêu cầu', render: challenge => challenge.action === 'withdraw' ? 'Ngừng marketing' : 'Xác nhận marketing' },
                        { key: 'status', label: 'Trạng thái', render: challenge => <Status value={challenge.status} domain="consent"/> },
                        { key: 'expires', label: 'Hết hạn', render: challenge => dateTime(challenge.expiresAt, 'Asia/Ho_Chi_Minh') },
                    ]}/>
                    <Pager page={challengeList.data.page}/>
                </>}</QueryState>
            </FieldGroup>
            {canReadCustomers && <Button component={RouterLink} to={`/s/${shopId}/customers`} size="small" sx={{ alignSelf: 'flex-start' }}>Mở danh sách khách</Button>}
        </FormFields>
    </Panel>;
}
function savedConsentChallenge(value: unknown): PublicConsentChallengeView | null {
    try { assertSchema<PublicConsentChallengeView>('PublicConsentChallengeView', value); return value; }
    catch { return null; }
}
export function ConsentConfirmationPage() {
    const [params] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const token = params.get('token') || '';
    const [challenge, setChallenge] = useState<PublicConsentChallengeView | null>(() => savedConsentChallenge((location.state as { consentChallenge?: unknown } | null)?.consentChallenge));
    const [confirmation, setConfirmation] = useState<ConsentConfirmation | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [pending, setPending] = useState(false);
    const [submittedDecision, setSubmittedDecision] = useState<'accept' | 'decline' | null>(null);
    const exchangeId = useRef(crypto.randomUUID());
    const confirmationId = useRef<{ decision: 'accept' | 'decline'; key: string } | null>(null);
    const exchange = async () => {
        if (!token || pending) return;
        setPending(true); setError(null);
        try {
            const csrf = await request('getCsrfToken');
            setCsrfToken(csrf.data.csrfToken);
            const result = await request('exchangeConsentChallenge', { body: { token }, idempotencyKey: exchangeId.current });
            setChallenge(result.data);
            navigate('/consent/confirm', { replace: true, state: { consentChallenge: result.data } });
        }
        catch (reason) { setError(reason instanceof Error ? reason : new Error('Không xác minh được liên kết.')); }
        finally { setPending(false); }
    };
    const confirm = async (decision: 'accept' | 'decline') => {
        if (!challenge || pending || confirmation || (submittedDecision && submittedDecision !== decision)) return;
        const intent = confirmationId.current?.decision === decision ? confirmationId.current : { decision, key: crypto.randomUUID() };
        confirmationId.current = intent;
        setSubmittedDecision(decision); setPending(true); setError(null);
        try {
            const result = await request('confirmConsentChallenge', { body: { challengeSessionId: challenge.challengeSessionId, decision, contentVersion: challenge.contentVersion }, idempotencyKey: intent.key });
            setConfirmation(result.data);
        }
        catch (reason) { setError(reason instanceof Error ? reason : new Error('Chưa xác minh được kết quả. Hãy thử lại cùng lựa chọn.')); }
        finally { setPending(false); }
    };
    const withdrawal = challenge?.action === 'withdraw';
    const confirmationMessage = confirmation
        ? confirmation.consentStatus === 'withdrawn'
            ? 'Đã ghi nhận không nhận tin marketing qua kênh này. Tin nhắn phục vụ đơn hàng không bị ảnh hưởng.'
            : confirmation.status === 'declined'
                ? 'Lựa chọn hiện tại được giữ nguyên; không có quyền marketing mới nào được cấp.'
                : 'Đã ghi nhận lựa chọn của bạn.'
        : '';
    return <Box component="main" id="main-content" tabIndex={-1} sx={[layoutSx.shell.pageFallbackInset, { maxWidth: 900, mx: 'auto', outline: 'none' }]}>
        <PageHeader title="Xác nhận lựa chọn marketing" subtitle="Liên kết ngắn hạn gắn với đúng khách, kênh và nội dung đã gửi."/>
        <Panel title={challenge ? withdrawal ? 'Ngừng nhận tin marketing' : 'Xác nhận nhận tin marketing' : 'Kiểm tra liên kết'} bodyMode="inset">
            <FormFields>
                <Alert severity="info">Lựa chọn này chỉ áp dụng cho nội dung marketing. Trao đổi phục vụ đơn hàng vẫn được xử lý riêng.</Alert>
                {error && <ErrorNotice error={error}/>}
                {!challenge && token && <>
                    <Typography color="text.secondary">Liên kết không chứa thông tin cá nhân. Tiếp tục để kiểm tra mục đích, kênh và nội dung trước khi gửi lựa chọn.</Typography>
                    <Button variant="contained" onClick={() => void exchange()} disabled={pending}>{pending ? 'Đang kiểm tra…' : error ? 'Thử xác minh lại' : 'Xem nội dung yêu cầu'}</Button>
                </>}
                {!challenge && !token && <Alert severity="warning">Thiếu liên kết challenge. Hãy mở liên kết đầy đủ do cửa hàng gửi cho bạn.</Alert>}
                {challenge && <>
                    <DetailLine label="Mục đích">Marketing</DetailLine>
                    <DetailLine label="Kênh">{businessLabel(challenge.channel)}</DetailLine>
                    <DetailLine label="Nội dung đã xem"><Typography align="left">{challenge.message}</Typography></DetailLine>
                    <DetailLine label="Phiên bản nội dung">v{challenge.contentVersion}</DetailLine>
                    <DetailLine label="Hết hạn">{dateTime(challenge.expiresAt, 'Asia/Ho_Chi_Minh')}</DetailLine>
                    {confirmation ? <Alert severity="success" role="status">{confirmationMessage}</Alert> : <ActionGroup>
                        <Button variant="contained" onClick={() => void confirm('accept')} disabled={pending || submittedDecision === 'decline'}>{pending && submittedDecision === 'accept' ? 'Đang ghi nhận…' : submittedDecision === 'accept' ? 'Thử lại cùng lựa chọn' : withdrawal ? 'Xác nhận ngừng marketing' : 'Đồng ý nhận marketing'}</Button>
                        <Button variant="outlined" onClick={() => void confirm('decline')} disabled={pending || submittedDecision === 'accept'}>{pending && submittedDecision === 'decline' ? 'Đang ghi nhận…' : submittedDecision === 'decline' ? 'Thử lại cùng lựa chọn' : withdrawal ? 'Giữ nguyên lựa chọn' : 'Không đồng ý marketing'}</Button>
                    </ActionGroup>}
                </>}
                {__MOCK__ && <Typography variant="caption" color="text.secondary">Môi trường local chỉ mô phỏng hợp đồng và dữ liệu; không gửi email/SMS/Meta và không chứng nhận Backend hoặc nhà cung cấp thật.</Typography>}
            </FormFields>
        </Panel>
    </Box>;
}
