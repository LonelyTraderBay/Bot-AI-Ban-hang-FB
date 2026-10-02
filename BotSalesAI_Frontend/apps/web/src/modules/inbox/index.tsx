import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Chip, Divider, FormControlLabel, Checkbox, List, ListItem, ListItemButton, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import SendRounded from '@mui/icons-material/SendRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import type { Message, Product, StockSnapshot } from '@botsales/contracts';
import { colors } from '@botsales/tokens';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { dateTime } from '@/shared/model/format';
import { PageHeader, Panel, QueryState, Toolbar, Pager, Status, MutationButton, EditDialog, ErrorNotice, ConfirmDialog, RouteLink, Empty, DetailLine, DataTable, Amount } from '@/shared/ui/components';
export function InboxPage() {
    const { conversationId } = useParams();
    const { shop } = useScope();
    const [params, setParams] = useSearchParams();
    const q = params.get('q') || '';
    const rawMode = params.get('mode');
    const mode = (['bot', 'human', 'paused'] as const).find(value => value === rawMode);
    const status = (['open', 'resolved'] as const).find(value => value === params.get('status'));
    const channelId = params.get('channelId') || undefined;
    const assignedUserId = params.get('assignedUserId') || undefined;
    const cursor = params.get('cursor') || undefined;
    const metadata = useApi('getInboxMetadata');
    const list = useApi('listConversations', { query: { q: q || undefined, status, mode, channelId, assignedUserId, cursor, limit: 40 } });
    const updateFilter = (key: string, value: string) => {
        const next = new URLSearchParams(params);
        if (value)
            next.set(key, value);
        else
            next.delete(key);
        next.delete('cursor');
        setParams(next);
    };
    const detailHref = (id: string) => {
        const next = new URLSearchParams(params);
        const listCursor = next.get('cursor');
        next.delete('cursor');
        if (listCursor)
            next.set('listCursor', listCursor);
        const query = next.toString();
        return `/s/${shop.id}/inbox/${id}${query ? `?${query}` : ''}`;
    };
    return <><PageHeader title="Hộp thư khách hàng" subtitle="AI và nhân viên tiếp quản rõ ràng; chỉ gửi khi chính sách kênh cho phép."/><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '300px minmax(0,1fr)' }, gap: 2, minHeight: 650 }}><Panel sx={{ display: { xs: conversationId ? 'none' : 'block', lg: 'block' } }}><Toolbar placeholder="Tìm hội thoại…"/><Stack direction={{ xs: 'column', sm: 'row' }} gap={1} sx={{ px: 2, pb: 2, flexWrap: 'wrap' }} aria-label="Bộ lọc hội thoại">
        <TextField select size="small" label="Trạng thái" value={status || ''} onChange={event => updateFilter('status', event.target.value)} sx={{ flex: 1, minWidth: 140 }}><MenuItem value="">Tất cả trạng thái</MenuItem><MenuItem value="open">Đang mở</MenuItem><MenuItem value="resolved">Đã giải quyết</MenuItem></TextField>
        <TextField select size="small" label="Chế độ" value={mode || ''} onChange={event => updateFilter('mode', event.target.value)} sx={{ flex: 1, minWidth: 140 }}><MenuItem value="">Tất cả chế độ</MenuItem><MenuItem value="bot">Bot</MenuItem><MenuItem value="human">Nhân viên</MenuItem><MenuItem value="paused">Tạm dừng</MenuItem></TextField>
        <TextField select size="small" label="Kênh" value={channelId || ''} onChange={event => updateFilter('channelId', event.target.value)} sx={{ flex: 1, minWidth: 160 }}><MenuItem value="">Tất cả kênh</MenuItem>{metadata.data?.data.channels.map(channel => <MenuItem key={channel.id} value={channel.id}>{channel.displayName}</MenuItem>)}</TextField>
        <TextField select size="small" label="Nhân viên" value={assignedUserId || ''} onChange={event => updateFilter('assignedUserId', event.target.value)} sx={{ flex: 1, minWidth: 160 }}><MenuItem value="">Tất cả nhân viên</MenuItem>{metadata.data?.data.assignees.map(assignee => <MenuItem key={assignee.userId} value={assignee.userId}>{assignee.displayName}</MenuItem>)}</TextField>
    </Stack><QueryState query={list}><List disablePadding>{list.data?.data.map(c => <ListItem key={c.id} disablePadding><ListItemButton selected={c.id === conversationId} component={RouterLink} to={detailHref(c.id)} sx={{ py: 2, px: 2, gap: 1.5, alignItems: 'start', borderBottom: 1, borderColor: 'divider' }}><Avatar sx={{ bgcolor: colors.raised, color: 'text.primary', width: 38, height: 38 }}>{c.displayName.slice(0, 1)}</Avatar><Box sx={{ minWidth: 0, flex: 1 }}><Stack direction="row" justifyContent="space-between" gap={1}><Typography fontWeight={650} noWrap>{c.displayName}</Typography>{c.unreadCount > 0 && <Box sx={{ bgcolor: 'primary.main', color: colors.onAccent, borderRadius: 3, px: 1, fontSize: 12 }}>{c.unreadCount}</Box>}</Stack><Typography variant="body2" noWrap color="text.secondary" sx={{ mt: .6 }}>{c.lastMessagePreview || 'Chưa có tin nhắn'}</Typography><Box sx={{ mt: 1 }}><Status value={c.mode}/></Box></Box></ListItemButton></ListItem>)}</List>{!list.data?.data.length && <Empty text="Chưa có hội thoại phù hợp."/>}<Pager page={list.data?.page}/></QueryState></Panel>{conversationId ? <ConversationPanel key={conversationId} conversationId={conversationId}/> : <Panel><Empty text="Chọn một cuộc trò chuyện để xem lịch sử, tiếp quản và tạo đơn."/></Panel>}</Box></>;
}
function ConversationPanel({ conversationId }: {
    conversationId: string;
}) {
    const { shop, session, online } = useScope();
    const [params] = useSearchParams();
    const c = useApi('getConversation', { path: { conversationId } });
    const messageCursor = params.get('cursor') || undefined;
    const messages = useApi('listMessages', { path: { conversationId }, query: { cursor: messageCursor, limit: 100 } });
    const metadata = useApi('getInboxMetadata');
    const send = useCommand('sendMessage', ['listMessages', 'getConversation', 'listConversations']);
    const note = useCommand('addInternalNote', ['listMessages']);
    const takeover = useCommand('takeoverConversation', ['getConversation', 'listConversations']);
    const release = useCommand('releaseConversation', ['getConversation', 'listConversations']);
    const resolve = useCommand('resolveConversation', ['getConversation', 'listConversations']);
    const assign = useCommand('assignConversation', ['getConversation', 'listConversations']);
    const feedback = useCommand('createFeedback', ['listFeedback']);
    const canReply = useCan('conversations.reply');
    const canReadCustomers = useCan('customers.read');
    const canCreateOrders = useCan('orders.write');
    const [text, setText] = useState(''), [internal, setInternal] = useState(false), [action, setAction] = useState<'takeover' | 'release' | 'resolve' | null>(null), [assignee, setAssignee] = useState('');
    const [ratingMessage, setRatingMessage] = useState<Message | null>(null), [correction, setCorrection] = useState(''), [rating, setRating] = useState<'positive' | 'negative'>('negative');
    const end = useRef<HTMLDivElement>(null);
    useEffect(() => { if (!messageCursor) end.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' }); }, [messages.data, messageCursor]);
    const inboxHref = () => {
        const next = new URLSearchParams(params);
        const listCursor = next.get('listCursor');
        next.delete('listCursor');
        next.delete('cursor');
        if (listCursor)
            next.set('cursor', listCursor);
        const query = next.toString();
        return `/s/${shop.id}/inbox${query ? `?${query}` : ''}`;
    };
    const conversation = c.data?.data;
    const canSend = canReply && online && (internal || (conversation?.mode === 'human' && conversation.assignedUserId === session.user.id && conversation.sendEligibility.state === 'allowed'));
    const submit = async () => { if (!conversation || !canSend || !text.trim())
        return; try {
        if (internal)
            await note.execute({ path: { conversationId }, body: { text: text.trim() } });
        else
            await send.execute({ path: { conversationId }, body: { clientMessageId: crypto.randomUUID(), text: text.trim(), expectedConversationVersion: conversation.version } });
        setText('');
    }
    catch { /* Unknown sends preserve text and disable retries in command hook. */ } };
    return <QueryState query={c}>{conversation && <Box data-testid="inbox-conversation-layout" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0,1fr) 260px' }, gap: 2, minWidth: 0 }}><Box data-testid="inbox-thread" component="section" aria-label="Nội dung hội thoại" sx={{ minWidth: 0, height: { xl: 650 } }}><Panel sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}><Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap' }}><Stack direction="row" alignItems="center" gap={1}><Button component={RouterLink} to={inboxHref()} sx={{ display: { lg: 'none' }, minWidth: 44 }} aria-label="Danh sách hội thoại"><ArrowBackRounded /></Button><Avatar sx={{ bgcolor: colors.selected, color: 'primary.main' }}>{conversation.displayName.slice(0, 1)}</Avatar><Box><Typography variant="h6">{conversation.displayName}</Typography><Typography variant="caption" color="text.secondary">{conversation.mode === 'human' ? 'Nhân viên đang tiếp quản' : 'Trợ lý tự động'} · {conversation.id}</Typography></Box></Stack><Stack direction="row" gap={1}><MutationButton permission="conversations.assign" variant="outlined" onClick={() => setAction(conversation.mode === 'human' ? 'release' : 'takeover')}>{conversation.mode === 'human' ? 'Trả lại bot' : 'Tiếp quản'}</MutationButton><MutationButton permission="conversations.assign" disabled={conversation.status === 'resolved'} onClick={() => setAction('resolve')}>Giải quyết</MutationButton></Stack></Stack>
 {conversation.sendEligibility.state !== 'allowed' && <Alert severity="warning" sx={{ m: 2 }}>Không được gửi tin: {conversation.sendEligibility.reasonCode || 'Chưa xác minh quyền gửi'}. Không tự vượt cửa sổ/chính sách kênh.</Alert>}
  <Box data-testid="inbox-message-list" sx={{ flex: 1, minHeight: 350, maxHeight: 550, overflowY: 'auto', p: 2.5, background: colors.canvas }}><QueryState query={messages}><Stack gap={2}>{messages.data?.data.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(m => <Stack key={m.id} alignItems={m.direction === 'inbound' ? 'flex-start' : 'flex-end'}><Box sx={{
            maxWidth: '88%', p: 1.8, borderRadius: 2.5, bgcolor: m.direction === 'internal' ? colors.selected : m.direction === 'inbound' ? colors.surface : colors.raised, border: m.direction === 'internal' ? '1px solid' : 'none', borderColor: colors.heroBorder
        }}><Typography variant="caption" color="text.secondary">{m.direction === 'internal' ? 'Ghi chú nội bộ' : m.senderKind === 'customer' ? 'Khách' : m.senderKind === 'bot' ? 'Trợ lý AI' : 'Nhân viên'}</Typography><Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', mt: .6 }}>{m.text}</Typography>{m.sourceEvidence.length > 0 && <Stack direction="row" gap={.75} flexWrap="wrap" aria-label="Nguồn tham chiếu" sx={{ mt: 1 }}>{m.sourceEvidence.map((reference, index) => <Chip key={`${reference.type}:${reference.id}:${index}`} size="small" variant="outlined" label={`${reference.type} · ${reference.id}`}/>)}</Stack>}<Stack direction="row" gap={1} alignItems="center" sx={{ mt: .8, flexWrap: 'wrap' }}><Typography variant="caption" color="text.secondary">{dateTime(m.createdAt, shop.timezone)} · {m.status}</Typography><Button size="small" onClick={() => { setRatingMessage(m); setCorrection(''); }}>Đánh giá</Button></Stack></Box></Stack>)}<div ref={end}/></Stack>{!messages.data?.data.length && <Empty text="Chưa có tin nhắn."/>}<Pager page={messages.data?.page}/></QueryState></Box>
  <Box component="form" data-draft-clean={text ? undefined : 'true'} onSubmit={e => { e.preventDefault(); void submit(); }} sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}><ErrorNotice error={send.error || note.error}/><FormControlLabel label="Ghi chú nội bộ (không gửi khách)" control={<Checkbox checked={internal} onChange={e => setInternal(e.target.checked)} disabled={!canReply}/>}/><TextField fullWidth multiline minRows={2} maxRows={7} label={internal ? 'Ghi chú cho nhóm' : 'Nội dung trả lời khách'} value={text} onChange={e => setText(e.target.value)} disabled={!canReply} inputProps={{ maxLength: internal ? 10000 : 20000 }}/><Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.5 }}><Typography variant="caption" color="text.secondary">{!online ? 'Đang ngoại tuyến' : !canSend ? 'Cần tiếp quản hoặc quyền gửi hợp lệ' : 'Tin gửi qua API, không dùng HTML từ AI'}</Typography><Button type="submit" variant="contained" endIcon={<SendRounded />} disabled={!canSend || !text.trim() || send.pending || note.pending}>{internal ? 'Lưu ghi chú' : 'Gửi trả lời'}</Button></Stack></Box></Panel></Box>
  <Box data-testid="inbox-context-panel" component="aside" aria-label="Bối cảnh khách hàng" tabIndex={0} sx={{ minWidth: 0, minHeight: 0, maxHeight: { xl: 650 }, overflowY: { xl: 'auto' } }}><Panel title="Bối cảnh khách hàng"><Box sx={{ p: 2 }}><DetailLine label="Trạng thái"><Status value={conversation.status}/></DetailLine><DetailLine label="Kênh">{metadata.data?.data.channels.find(ch => ch.id === conversation.channelId)?.displayName || conversation.channelId}</DetailLine>{canReadCustomers ? <RouteLink to={`/s/${shop.id}/customers/${conversation.customerId}`}>Hồ sơ khách</RouteLink> : <Typography variant="caption" color="text.secondary">Thông tin khách bị ẩn theo quyền hiện tại.</Typography>}{canCreateOrders && <RouteLink to={`/s/${shop.id}/orders/new?customerId=${conversation.customerId}&conversationId=${conversation.id}`}>Tạo đơn từ hội thoại</RouteLink>}<Divider sx={{ my: 2 }}/><TextField label="Giao cho nhân viên" select fullWidth size="small" value={assignee} onChange={e => setAssignee(e.target.value)}><MenuItem value="">Chọn nhân viên</MenuItem>{metadata.data?.data.assignees.map(u => <MenuItem key={u.userId} value={u.userId}>{u.displayName}</MenuItem>)}</TextField><MutationButton permission="conversations.assign" disabled={!assignee} busy={assign.pending} onClick={() => { void assign.execute({ path: { conversationId }, body: { userId: assignee, expectedVersion: conversation.version } }).catch(() => undefined); }}>Phân công</MutationButton><ErrorNotice error={assign.error}/><Alert severity="info" sx={{ mt: 2 }}>Ảnh/tin thoại chỉ bật khi hợp đồng kênh xác nhận hỗ trợ. Phiên bản API hiện tại của ô soạn chỉ gửi văn bản.</Alert>{__MOCK__ && <MockSalesFlowPreview customerId={conversation.customerId} conversationId={conversation.id}/ >}{__MOCK__ && <MockMediaPreview/>}{__MOCK__ && <MockUpsellPreview/>}</Box></Panel></Box>
 <ConfirmDialog open={!!action} title={action === 'takeover' ? 'Tiếp quản cuộc trò chuyện' : action === 'release' ? 'Trả cuộc trò chuyện về bot' : 'Đánh dấu đã giải quyết'} description={action === 'takeover' ? 'Các câu trả lời AI đang chờ phải bị chặn trước khi gửi.' : 'Hệ thống kiểm lại quyền và phiên bản hội thoại.'} requireReason onClose={() => setAction(null)} busy={takeover.pending || release.pending || resolve.pending} error={takeover.error || release.error || resolve.error} onConfirm={reason => { const op = action === 'takeover' ? takeover : action === 'release' ? release : resolve; return op.execute({ path: { conversationId }, version: conversation.version, body: { expectedVersion: conversation.version, reason } }); }}/>
 <EditDialog open={!!ratingMessage} title="Đánh giá câu trả lời" onClose={() => setRatingMessage(null)} busy={feedback.pending} actions={<Button variant="contained" disabled={feedback.pending} onClick={async () => { if (!ratingMessage)
            return; try {
            await feedback.execute({ body: { conversationId, messageId: ratingMessage.id, rating, correction } });
            setRatingMessage(null);
        }
        catch { /* visible */ } }}>Lưu phản hồi</Button>}><ErrorNotice error={feedback.error}/><Stack gap={2}><Typography sx={{ whiteSpace: 'pre-wrap' }}>{ratingMessage?.text}</Typography><TextField label="Đánh giá" select value={rating} onChange={e => setRating(e.target.value as typeof rating)}><MenuItem value="positive">Hữu ích</MenuItem><MenuItem value="negative">Cần sửa</MenuItem></TextField><TextField label="Nội dung đề xuất sửa" multiline minRows={4} value={correction} onChange={e => setCorrection(e.target.value)}/><Alert severity="info">Phản hồi không tự trở thành kiến thức đã xuất bản. Cần người duyệt và kiểm thử.</Alert></Stack></EditDialog></Box>}</QueryState>;
}
function MockMediaPreview() {
    const [open, setOpen] = useState(false);
    return <Stack gap={1.5} sx={{ mt: 2 }}>
        <Alert severity="info" action={<Button size="small" onClick={() => setOpen(value => !value)}>{open ? 'Ẩn mẫu media' : 'Xem mẫu ảnh và tin thoại'}</Button>}>
            Preview chỉ dùng dữ liệu tổng hợp. Message contract chưa có media; nội dung mẫu không được gửi, phát hoặc gắn vào hội thoại.
        </Alert>
        {open && <Stack gap={1} role="status" data-testid="mock-media-preview" sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Box role="img" aria-label="Ảnh sản phẩm mẫu, không phải tệp khách gửi" sx={{ minHeight: 80, display: 'grid', placeItems: 'center', borderRadius: 1, bgcolor: 'action.hover' }}>
                <Typography variant="body2">Ảnh sản phẩm mẫu · DEMO-MEDIA-IMAGE-01</Typography>
            </Box>
            <Typography variant="body2" fontWeight={650}>Tin thoại mẫu · 00:08 · chưa phát âm thanh</Typography>
            <Typography variant="caption" color="text.secondary">Bản chép thử: “Shop còn màu xanh không ạ?” · chưa được người dùng xác nhận.</Typography>
        </Stack>}
    </Stack>;
}

type SalesPreviewTab = 'script' | 'sources' | 'order' | 'confirmation';
type SalesSourceRow = {
    key: string;
    product: Product;
    variant: Product['variants'][number];
    snapshot: StockSnapshot;
};
const sampleSalesScripts = {
    fashion: {
        label: 'Thời trang',
        questions: ['Bạn đang tìm kiểu dáng và dịp sử dụng nào?', 'Bạn muốn xem màu và kích cỡ nào?', 'Cho mình xin khu vực giao hàng để kiểm tra phí.'],
        boundary: 'Chỉ tư vấn chất liệu, kích cỡ và chính sách đã có nguồn; thiếu thông tin thì hỏi lại hoặc chuyển nhân viên.',
    },
    beauty: {
        label: 'Mỹ phẩm',
        questions: ['Bạn đang tìm sản phẩm cho nhu cầu nào?', 'Bạn có dị ứng hoặc thành phần cần tránh không?', 'Bạn muốn nhân viên tư vấn thêm trước khi chọn?'],
        boundary: 'Không chẩn đoán, hứa hiệu quả điều trị hoặc khẳng định phù hợp khi chưa có thông tin nguồn.',
    },
    home: {
        label: 'Gia dụng',
        questions: ['Bạn cần dùng sản phẩm trong không gian nào?', 'Kích thước hoặc công suất mong muốn là bao nhiêu?', 'Bạn cần kiểm tra bảo hành hay cách lắp đặt?'],
        boundary: 'Thiếu kích thước, bảo hành hoặc hướng dẫn có nguồn thì không tự suy diễn; chuyển nhân viên xác minh.',
    },
} as const;

function MockSalesFlowPreview({ customerId, conversationId }: { customerId: string; conversationId: string }) {
    const { shop } = useScope();
    const canReadCatalog = useCan('catalog.read');
    const canReadInventory = useCan('inventory.read');
    const products = useApi('listProducts', { query: { limit: 100 } }, canReadCatalog);
    const stock = useApi('listStockSnapshots', { query: { limit: 100 } }, canReadInventory);
    const [tab, setTab] = useState<SalesPreviewTab>('script');
    const [industry, setIndustry] = useState<keyof typeof sampleSalesScripts>('fashion');
    const script = sampleSalesScripts[industry];
    const sourceRows = (products.data?.data || []).filter(product => product.status === 'active')
        .flatMap<SalesSourceRow>(product => product.variants.filter(variant => variant.active && variant.price)
            .flatMap(variant => (stock.data?.data || []).filter(snapshot => snapshot.variantId === variant.id)
                .map(snapshot => ({ key: `${variant.id}:${snapshot.warehouseId}`, product, variant, snapshot }))));

    return <Panel title="Luồng tư vấn bán hàng · bản xem trước" subtitle="Mẫu tương tác cục bộ; không gọi AI và không gửi tin cho khách." sx={{ mt: 2 }}>
        <Stack gap={2} sx={{ p: 2 }}>
            <Alert severity="info">Nội dung dưới đây chỉ minh họa giao diện. Bản demo không tự tạo câu trả lời AI hoặc lưu kịch bản lên máy chủ.</Alert>
            <Tabs value={tab} onChange={(_, value: SalesPreviewTab) => setTab(value)} variant="scrollable" scrollButtons="auto" aria-label="Các bước tư vấn bán hàng mẫu">
                <Tab value="script" label="Kịch bản" />
                <Tab value="sources" label="Giá & tồn" />
                <Tab value="order" label="Tạo đơn" />
                <Tab value="confirmation" label="Xác nhận" />
            </Tabs>
            {tab === 'script' && <Stack gap={1.5} role="tabpanel" aria-label="Kịch bản tư vấn mẫu">
                <TextField select label="Ngành hàng mẫu" value={industry} onChange={event => setIndustry(event.target.value as keyof typeof sampleSalesScripts)}>
                    {Object.entries(sampleSalesScripts).map(([key, value]) => <MenuItem key={key} value={key}>{value.label}</MenuItem>)}
                </TextField>
                <Typography variant="subtitle2">Câu hỏi gợi ý</Typography>
                {script.questions.map((question, index) => <Typography key={question} variant="body2">{index + 1}. {question}</Typography>)}
                <Alert severity="warning">Ranh giới mẫu: {script.boundary}</Alert>
                <Typography variant="caption" color="text.secondary">Bản nháp mẫu riêng với cấu hình bot đang dùng; không có thao tác xuất bản ở đây.</Typography>
            </Stack>}
            {tab === 'sources' && <Stack gap={1.5} role="tabpanel" aria-label="Nguồn giá và tồn trong hộp thư">
                <Alert severity="info">Giá lấy từ catalog và tồn từ snapshot có thời điểm. Dữ liệu chỉ là mock; cần truy vấn lại trước khi xác nhận đơn.</Alert>
                {!canReadCatalog || !canReadInventory
                    ? <Alert severity="warning">Cần quyền xem sản phẩm và tồn kho để đối chiếu nguồn.</Alert>
                    : <QueryState query={products}>{products.data && <QueryState query={stock}>{stock.data && <DataTable label="Nguồn giá và tồn trong hộp thư" rows={sourceRows} rowKey={row => row.key} empty="Chưa có sản phẩm đủ dữ liệu để đối chiếu." columns={[
                        { key: 'product', label: 'Sản phẩm', render: row => row.product.name },
                        { key: 'sku', label: 'SKU', render: row => row.variant.sku },
                        { key: 'price', label: 'Giá', align: 'right', render: row => <Amount value={row.variant.price} /> },
                        { key: 'available', label: 'Có thể bán', align: 'right', render: row => row.snapshot.available },
                        { key: 'asOf', label: 'Snapshot lúc', render: row => dateTime(row.snapshot.asOf, shop.timezone) },
                    ]} />}</QueryState>}</QueryState>}
            </Stack>}
            {tab === 'order' && <Stack gap={1.5} role="tabpanel" aria-label="Tạo đơn từ hội thoại">
                <Typography variant="body2">Chuyển sang biểu mẫu đơn để nhân viên kiểm tra khách, sản phẩm, số lượng và báo giá.</Typography>
                <RouteLink to={`/s/${shop.id}/orders/new?customerId=${customerId}&conversationId=${conversationId}`}>Mở biểu mẫu tạo đơn từ hội thoại</RouteLink>
                <Alert severity="info">Đơn trong demo được lưu vào MSW cục bộ của tab; đây không phải đơn trên máy chủ.</Alert>
            </Stack>}
            {tab === 'confirmation' && <Stack gap={1.5} role="tabpanel" aria-label="Điều kiện xác nhận đơn">
                <Alert severity="warning">Không tự chốt đơn trong giao diện này. Bằng chứng xác nhận của khách, báo giá hiện hành và điều kiện giao nhận phải được kiểm tra trước khi nhân viên xác nhận.</Alert>
                <Button variant="outlined" disabled>Tự động xác nhận đơn chưa được hỗ trợ</Button>
                <Typography variant="caption" color="text.secondary">Cần bổ sung capability và policy trong contract trước khi bật tự động xác nhận.</Typography>
            </Stack>}
        </Stack>
    </Panel>;
}

function MockUpsellPreview() {
    const [open, setOpen] = useState(false);
    return <Stack gap={1.5} sx={{ mt: 2 }}>
        <Typography variant="subtitle2">Gợi ý bán kèm mẫu · DEMO-PROMO-01</Typography>
        <Alert severity="info">Combo áo thun + túi tote chỉ minh họa giao diện. Không có API khuyến mại; giá, lợi nhuận, SKU và tồn kho chưa được xác thực.</Alert>
        <Button size="small" variant="outlined" onClick={() => setOpen(value => !value)}>{open ? 'Ẩn điều kiện mẫu' : 'Xem điều kiện combo mẫu'}</Button>
        {open && <Stack role="status" data-testid="mock-promotion-preview" gap={.5} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="subtitle2">Combo mẫu · DEMO-PROMO-01</Typography>
            <Typography variant="body2">Điều kiện minh họa: có ít nhất một áo và một phụ kiện trong đơn nháp.</Typography>
            <Typography variant="caption" color="text.secondary">Không áp dụng giảm giá, không sửa đơn và không khẳng định đạt biên lợi nhuận.</Typography>
        </Stack>}
    </Stack>;
}
