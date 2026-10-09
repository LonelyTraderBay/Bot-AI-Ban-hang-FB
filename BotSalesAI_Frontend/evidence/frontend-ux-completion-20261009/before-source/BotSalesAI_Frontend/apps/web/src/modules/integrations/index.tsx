import { ActionGroup, FormFields, PageSections, SectionGrid, SurfaceContent } from '../../shared/ui/composition';
import { useState } from 'react';
import { layoutSx } from '../../shared/ui/layout';
import { Alert, Box, Button, Chip, MenuItem, TextField } from '@mui/material';
import type { AIConnection, Channel } from '@botsales/contracts';
import { useApi, useCommand } from '../../shared/api/hooks';
import { useScope } from '../../shared/model/scope';
import { limitCodePoints, dateTime } from '@/shared/model/format';
import { ConfirmDialog, DetailLine, EditDialog, Empty, ErrorNotice, MutationButton, PageHeader, Panel, QueryState, RouteLink, Status } from '../../shared/ui/components';
/** The backend supplies the provider URL; the browser still refuses unsafe schemes. */
function authorize(url: string) { const target = new URL(url, location.origin); if (target.protocol !== 'https:' && !(__MOCK__ && target.origin === location.origin))
    throw new Error('Đường dẫn xác thực không dùng HTTPS.'); location.assign(target.href); }
export function ChannelsPage() {
    const { shop } = useScope();
    const list = useApi('listChannels');
    const connect = useCommand('beginChannelConnect', []), reconnect = useCommand('reconnectChannel', []), disconnect = useCommand('disconnectChannel', ['listChannels']), check = useCommand('checkChannelHealth', ['listChannels']);
    const [selected, setSelected] = useState<Channel | null>(null), [jobId, setJob] = useState(''), [error, setError] = useState<Error | null>(null);
    const isEmpty = !list.isError && list.data?.data.length === 0;
    const connectButton = <MutationButton permission="integrations.manage" variant="contained" busy={connect.pending} onClick={() => void start()}>Kết nối Page</MutationButton>;
    const start = async (channelId?: string) => { setError(null); try {
        const body = { returnPath: `/s/${shop.id}/integrations/channels`, channelKind: 'facebook_messenger' as const };
        const r = channelId ? await reconnect.execute({ path: { channelId }, body }) : await connect.execute({ body });
        authorize(r.data.authorizationUrl);
    }
    catch (e) {
        setError(e instanceof Error ? e : new Error('Không thể bắt đầu xác thực.'));
    } };
    return <><PageHeader title="Kết nối Facebook" subtitle="Kết nối bằng luồng cấp quyền. Page token chỉ được giữ ở backend." actions={!isEmpty && connectButton}/><ErrorNotice error={error || connect.error || reconnect.error || check.error}/>{__MOCK__ && <Alert severity="info" sx={layoutSx.notice.afterGap}>Đây là mô phỏng. Không đăng nhập Facebook và không gửi tin thật.</Alert>}<QueryState query={list} pendingProfile="section">{list.data?.data.length === 0 && !list.isError ? <Empty text="Chưa có Page kết nối. Dùng nút bên dưới để bắt đầu." action={connectButton}/> : <PageSections >{list.data?.data.map(c => <Panel key={c.id} title={c.name} bodyMode="inset" action={__MOCK__ ? <Chip label="Mô phỏng, chưa liên kết thật" color="warning" variant="outlined"/> : <Status value={c.status}/>}><Box><DetailLine label="Page ID">{c.externalPageId}</DetailLine><DetailLine label="Webhook gần nhất">{dateTime(c.lastWebhookAt, shop.timezone)}</DetailLine><DetailLine label="Chính sách">{c.policyVersion || 'Chưa xác minh'}</DetailLine><DetailLine label="Kiểm chính sách lúc">{dateTime(c.policyVerifiedAt, shop.timezone)}</DetailLine><ActionGroup direction="row" beforeGap="surface" afterGap="notice">{c.capabilities.map(cap => <Chip label={cap} key={cap}/>)}</ActionGroup>{c.warnings.map(w => <Alert severity="warning" key={w} sx={layoutSx.notice.afterGap}>{w}</Alert>)}<ActionGroup direction="row" ><MutationButton permission="integrations.manage" busy={check.pending} onClick={async () => { try {
        setJob((await check.execute({ path: { channelId: c.id } })).data.id);
    }
    catch { /* visible */ } }}>Kiểm kết nối</MutationButton><MutationButton permission="integrations.manage" busy={reconnect.pending} onClick={() => void start(c.id)}>Kết nối lại</MutationButton><MutationButton permission="integrations.manage" color="error" onClick={() => setSelected(c)}>Ngắt kết nối</MutationButton></ActionGroup></Box></Panel>)}</PageSections>}</QueryState>{jobId && <RouteLink to={`/s/${shop.id}/jobs/${jobId}`}>Xem kết quả kiểm tra</RouteLink>}<ConfirmDialog open={!!selected} title="Ngắt kết nối Page" description="Dừng gửi mới và thu hồi kết nối ở backend. Không xóa lịch sử đơn hàng/hội thoại." requireReason onClose={() => setSelected(null)} busy={disconnect.pending} error={disconnect.error} onConfirm={reason => disconnect.execute({ path: { channelId: selected?.id || '' }, body: { expectedVersion: selected?.version || 1, reason } })}/></>;
}
export function AIProvidersPage() {
    const { shop } = useScope();
    const list = useApi('listAIConnections'), catalog = useApi('getProviderCatalog');
    const create = useCommand('createAIConnection', ['listAIConnections']), update = useCommand('updateAIConnection', ['listAIConnections']), remove = useCommand('deleteAIConnection', ['listAIConnections']), test = useCommand('testAIConnection', ['listAIConnections']);
    const [open, setOpen] = useState(false), [editing, setEditing] = useState<AIConnection | null>(null), [name, setName] = useState(''), [provider, setProvider] = useState(''), [model, setModel] = useState(''), [endpoint, setEndpoint] = useState(''), [key, setKey] = useState(''), [formError, setFormError] = useState<Error | null>(null), [deleting, setDeleting] = useState<AIConnection | null>(null), [jobId, setJob] = useState('');
    const descriptor = catalog.data?.data.find(p => p.providerId === provider);
    const isEmpty = !list.isError && list.data?.data.length === 0;
    const addConnectionButton = <MutationButton permission="integrations.manage" variant="contained" onClick={() => start(null)}>Thêm kết nối AI</MutationButton>;
    const start = (connection: AIConnection | null) => { setEditing(connection); setName(connection?.name || ''); setProvider(connection?.providerId || catalog.data?.data[0]?.providerId || ''); setModel(connection?.modelId || ''); setEndpoint(connection?.endpointUrl || ''); setKey(''); setFormError(null); setOpen(true); };
    return <><PageHeader title="Nhà cung cấp AI" subtitle="Mỗi adapter công bố khả năng; không giả định mọi API key có thể thay thế nhau." actions={!isEmpty && addConnectionButton}/><ErrorNotice error={test.error}/><QueryState query={list} pendingProfile="section">{list.data?.data.length === 0 && !list.isError ? <Empty text="Chưa có kết nối AI. Thêm một kết nối để cấu hình nhà cung cấp." action={addConnectionButton}/> : <SectionGrid columns={{ xs: 'minmax(0, 1fr)', lg: list.data?.data.length === 1 ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))' }}>{list.data?.data.map(c => <Panel key={c.id} title={c.name} bodyMode="inset" action={<Status value={c.status}/>}><Box><DetailLine label="Provider / adapter">{c.providerId} / {c.adapterId}</DetailLine><DetailLine label="Model">{c.modelId}</DetailLine><DetailLine label="Khóa">{c.hasCredential ? `•••• ${c.keyLast4 || ''}` : 'Chưa có'}</DetailLine><DetailLine label="Lần kiểm gần nhất">{dateTime(c.lastCheckedAt, shop.timezone)}</DetailLine><SurfaceContent rhythm="dividedRows" beforeGap="surface" afterGap="notice">{Object.entries(c.capabilities).filter(([k]) => k !== 'lastVerifiedAt').map(([k, v]) => <DetailLine key={k} label={k}>{typeof v === 'string' ? v : 'Chưa rõ'}</DetailLine>)}</SurfaceContent><ActionGroup direction="row" ><MutationButton permission="integrations.manage" onClick={() => start(c)}>Sửa / xoay khóa</MutationButton><MutationButton permission="integrations.manage" busy={test.pending} onClick={async () => { try {
        setJob((await test.execute({ path: { connectionId: c.id } })).data.id);
    }
    catch { /* visible */ } }}>Kiểm kết nối</MutationButton><MutationButton permission="integrations.manage" color="error" onClick={() => setDeleting(c)}>Xóa</MutationButton></ActionGroup></Box></Panel>)}</SectionGrid>}</QueryState>{jobId && <RouteLink to={`/s/${shop.id}/jobs/${jobId}`}>Kết quả kiểm tra kết nối</RouteLink>}
 <EditDialog open={open} title={editing ? 'Sửa kết nối / xoay khóa' : 'Kết nối AI mới'} onClose={() => { setKey(''); setFormError(null); setOpen(false); }} busy={create.pending || update.pending} actions={<Button variant="contained" disabled={!name.trim() || !model.trim() || (!editing && (!descriptor || !key)) || create.pending || update.pending} onClick={async () => {
        setFormError(null);
        const submittedCredential = key;
        try {
            if (__MOCK__ && submittedCredential && !submittedCredential.startsWith('demo-'))
                throw new Error('Chỉ nhập khóa giả bắt đầu bằng demo- trong bản mô phỏng.');
            if (editing)
                await update.execute({ path: { connectionId: editing.id }, version: editing.version, body: { name: name.trim(), modelId: model.trim(), ...(submittedCredential ? { credential: submittedCredential } : {}) } });
            else
                await create.execute({ body: { name: name.trim(), providerId: provider, adapterId: descriptor?.adapterId || '', modelId: model.trim(), endpointUrl: endpoint || null, credential: submittedCredential } });
            setOpen(false);
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Không lưu được cấu hình kết nối.';
            setFormError(new Error(submittedCredential && message.includes(submittedCredential) ? message.replaceAll(submittedCredential, '[đã ẩn]') : message));
        }
        finally {
            setKey('');
        }
    }}>Lưu cấu hình</Button>}><ErrorNotice error={formError || create.error || update.error}/><FormFields >{__MOCK__ && <Alert severity="warning">Không nhập khóa thật. Dùng demo-key; request mô phỏng chỉ kiểm tra giao diện, không giữ khóa và không kết nối AI thật.</Alert>}<TextField label="Tên kết nối" value={name} onChange={e => setName(e.target.value)}/><TextField select label="Provider đã có adapter" value={provider} disabled={!!editing} onChange={e => { setProvider(e.target.value); setModel(''); }}>{catalog.data?.data.map(p => <MenuItem value={p.providerId} key={p.providerId}>{p.label}</MenuItem>)}</TextField><TextField label="Model ID được adapter hỗ trợ" value={model} onChange={e => setModel(e.target.value)} helperText={descriptor?.models.map(m => m.modelId).join(', ') || 'Xem catalog từ backend'}/>{!editing && descriptor?.endpointEditable && <TextField label="Endpoint HTTPS được backend cho phép" value={endpoint} onChange={e => setEndpoint(e.target.value)}/>}<TextField label={editing ? 'Khóa mới (để trống để giữ nguyên)' : 'Khóa API'} type="password" autoComplete="new-password" value={key} onChange={e => setKey(limitCodePoints(e.target.value, 16384))} /><Alert severity="info">Secret chỉ được gửi theo trường writeOnly của contract. Response và danh sách không trả secret gốc.</Alert></FormFields></EditDialog>
 <ConfirmDialog open={!!deleting} title="Xóa kết nối AI" description="Backend kiểm các cấu hình đang sử dụng trước khi xóa; không tự chuyển dữ liệu sang provider khác." requireReason onClose={() => setDeleting(null)} error={remove.error} busy={remove.pending} onConfirm={async () => {
        if (!deleting) return;
        await remove.execute({ path: { connectionId: deleting.id }, version: deleting.version });
    }}/></>;
}
