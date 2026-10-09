import { ActionGroup, FieldGroup, FormFields, SectionGrid, SurfaceContent } from '../../shared/ui/composition';
import { useEffect, useRef, useState } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Avatar, Box, Button, List, ListItem, ListItemButton, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import type { Message, Product, StockSnapshot } from '@botsales/contracts';
import { colors, tokens } from '@botsales/tokens';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { dateTime } from '@/shared/model/format';
import { PageHeader, Panel, QueryState, Toolbar, Pager, Status, MutationButton, EditDialog, ErrorNotice, ConfirmDialog, RouteLink, Empty, DataTable, Amount } from '@/shared/ui/components';
import { layoutSx } from '@/shared/ui/layout';
import { ConversationComposer, ConversationContextPanel, ConversationMessageList } from './conversation-components';
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
    const listCursorParam = conversationId ? 'listCursor' : 'cursor';
    const cursor = params.get(listCursorParam) || undefined;
    const metadata = useApi('getInboxMetadata');
    const list = useApi('listConversations', { query: { q: q || undefined, status, mode, channelId, assignedUserId, cursor, limit: 40 } });
    const updateFilter = (key: string, value: string) => {
        const next = new URLSearchParams(params);
        if (value)
            next.set(key, value);
        else
            next.delete(key);
        next.delete(listCursorParam);
        setParams(next);
    };
    const detailHref = (id: string) => {
        const next = new URLSearchParams(params);
        const listCursor = next.get(listCursorParam);
        next.delete('cursor');
        next.delete('listCursor');
        if (listCursor)
            next.set('listCursor', listCursor);
        const query = next.toString();
        return `/s/${shop.id}/inbox/${id}${query ? `?${query}` : ''}`;
    };
    return <>
        <PageHeader title="Hộp thư khách hàng" subtitle="AI và nhân viên tiếp quản rõ ràng; chỉ gửi khi chính sách kênh cho phép." />
        <SectionGrid columns={{ xs: '1fr', lg: '300px minmax(0,1fr)' }} geometry={{minHeight: 650}}>
            <Panel geometry={{ display: { xs: conversationId ? 'none' : 'block', lg: 'block' } }}>
                <Toolbar operation="listConversations" placeholder="Tìm hội thoại…" cursorParam={listCursorParam} filters={
                <FieldGroup direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap" role="group" aria-label="Bộ lọc hội thoại">
                    <TextField select size="small" label="Trạng thái" value={status || ''} onChange={event => updateFilter('status', event.target.value)} sx={{ flex: 1, minWidth: 140 }}>
                        <MenuItem value="">Tất cả trạng thái</MenuItem><MenuItem value="open">Đang mở</MenuItem><MenuItem value="resolved">Đã giải quyết</MenuItem>
                    </TextField>
                    <TextField select size="small" label="Chế độ" value={mode || ''} onChange={event => updateFilter('mode', event.target.value)} sx={{ flex: 1, minWidth: 140 }}>
                        <MenuItem value="">Tất cả chế độ</MenuItem><MenuItem value="bot">Bot</MenuItem><MenuItem value="human">Nhân viên</MenuItem><MenuItem value="paused">Tạm dừng</MenuItem>
                    </TextField>
                    <TextField select size="small" label="Kênh" value={channelId || ''} onChange={event => updateFilter('channelId', event.target.value)} sx={{ flex: 1, minWidth: 160 }}>
                        <MenuItem value="">Tất cả kênh</MenuItem>{metadata.data?.data.channels.map(channel => <MenuItem key={channel.id} value={channel.id}>{channel.displayName}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Nhân viên" value={assignedUserId || ''} onChange={event => updateFilter('assignedUserId', event.target.value)} sx={{ flex: 1, minWidth: 160 }}>
                        <MenuItem value="">Tất cả nhân viên</MenuItem>{metadata.data?.data.assignees.map(assignee => <MenuItem key={assignee.userId} value={assignee.userId}>{assignee.displayName}</MenuItem>)}
                    </TextField>
                </FieldGroup>} />
                <QueryState query={list}>
                    <List disablePadding>
                        {list.data?.data.map(c => <ListItem key={c.id} disablePadding>
                            <ListItemButton selected={c.id === conversationId} component={RouterLink} to={detailHref(c.id)} sx={[layoutSx.inbox.listInset, layoutSx.inbox.listContentGap, { alignItems: 'start', borderBottom: 1, borderColor: 'divider' }]}>
                                <Avatar sx={{ bgcolor: colors.raised, color: 'text.primary', width: 38, height: 38 }}>{c.displayName.slice(0, 1)}</Avatar>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Stack direction="row" justifyContent="space-between" sx={[layoutSx.surface.compactContentGap, { alignItems: 'center' }]}>
                                        <Typography fontWeight={visualSx.typography.fontWeight.strong} noWrap>{c.displayName}</Typography>
                                        {c.unreadCount > 0 && <Box data-testid="inbox-unread-count" sx={[layoutSx.inbox.unreadCountInset, { bgcolor: 'primary.main', color: colors.onAccent, borderRadius: visualSx.radius.large, fontSize: tokens.fontSizes.meta }]}>{c.unreadCount}</Box>}
                                    </Stack>
                                    <Typography variant="body2" noWrap color="text.secondary" sx={[layoutSx.surface.titleDescriptionGap, { display: 'block' }]}>{c.lastMessagePreview || 'Chưa có tin nhắn'}</Typography>
                                    <Box sx={layoutSx.inbox.listStatusBeforeGap}><Status value={c.mode} /></Box>
                                </Box>
                            </ListItemButton>
                        </ListItem>)}
                    </List>
                    {!list.data?.data.length && <Empty text="Chưa có hội thoại phù hợp." />}
                    <Pager page={list.data?.page} cursorParam={listCursorParam} />
                </QueryState>
            </Panel>
            {conversationId ? <ConversationPanel key={conversationId} conversationId={conversationId} /> : <Panel><Empty text="Chọn một cuộc trò chuyện để xem lịch sử, tiếp quản và tạo đơn." /></Panel>}
        </SectionGrid>
    </>;
}
function ConversationPanel({ conversationId }: {
    conversationId: string;
}) {
    const { shop } = useScope();
    const [params] = useSearchParams();
    const c = useApi('getConversation', { path: { conversationId } });
    const messageCursor = params.get('cursor') || undefined;
    const messages = useApi('listMessages', { path: { conversationId }, query: { cursor: messageCursor, limit: 100 } });
    const takeover = useCommand('takeoverConversation', ['getConversation', 'listConversations']);
    const release = useCommand('releaseConversation', ['getConversation', 'listConversations']);
    const resolve = useCommand('resolveConversation', ['getConversation', 'listConversations']);
    const feedback = useCommand('createFeedback', ['listFeedback']);
    const [action, setAction] = useState<'takeover' | 'release' | 'resolve' | null>(null);
    const [ratingMessage, setRatingMessage] = useState<Message | null>(null);
    const [correction, setCorrection] = useState('');
    const [rating, setRating] = useState<'positive' | 'negative'>('negative');
    const end = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!messageCursor) end.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }, [messages.data, messageCursor]);

    const inboxHref = () => {
        const next = new URLSearchParams(params);
        const listCursor = next.get('listCursor');
        next.delete('listCursor');
        next.delete('cursor');
        if (listCursor) next.set('cursor', listCursor);
        const query = next.toString();
        return `/s/${shop.id}/inbox${query ? `?${query}` : ''}`;
    };

    const conversation = c.data?.data;
    return (
        <QueryState query={c} pendingProfile="section">
            {conversation && (
                <SectionGrid data-testid="inbox-conversation-layout" columns={{ xs: '1fr', xl: 'minmax(0,1fr) 260px' }} geometry={{minWidth: 0}}>
                    <Box data-testid="inbox-thread" component="section" aria-label="Nội dung hội thoại" sx={{ minWidth: 0, height: { xl: 650 } }}>
                        <Panel geometry={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <ActionGroup direction="row" alignItems="center" justifyContent="space-between" bodyMode="header" geometry={{ flex: '0 0 auto' }}>
                                <Stack direction="row" alignItems="center" sx={[layoutSx.surface.compactContentGap, { flexWrap: 'wrap' }]}>
                                    <Button component={RouterLink} to={inboxHref()} sx={{ display: { lg: 'none' }, minWidth: 44 }} aria-label="Danh sách hội thoại">
                                        <ArrowBackRounded />
                                    </Button>
                                    <Avatar sx={{ bgcolor: colors.selected, color: 'primary.main' }}>{conversation.displayName.slice(0, 1)}</Avatar>
                                    <Box>
                                        <Typography component="h2" variant="h6">{conversation.displayName}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {conversation.mode === 'human' ? 'Nhân viên đang tiếp quản' : 'Trợ lý tự động'} · {conversation.id}
                                        </Typography>
                                    </Box>
                                </Stack>
                                <ActionGroup direction="row" >
                                    <MutationButton permission="conversations.assign" variant="outlined" onClick={() => setAction(conversation.mode === 'human' ? 'release' : 'takeover')}>
                                        {conversation.mode === 'human' ? 'Trả lại bot' : 'Tiếp quản'}
                                    </MutationButton>
                                    <MutationButton permission="conversations.assign" disabled={conversation.status === 'resolved'} onClick={() => setAction('resolve')}>
                                        Giải quyết
                                    </MutationButton>
                                </ActionGroup>
                            </ActionGroup>
                            {conversation.sendEligibility.state !== 'allowed' && (
                                <Box sx={layoutSx.inbox.paneInset}>
                                    <Alert severity="warning">
                                        Không được gửi tin: {conversation.sendEligibility.reasonCode || 'Chưa xác minh quyền gửi'}. Không tự vượt cửa sổ/chính sách kênh.
                                    </Alert>
                                </Box>
                            )}
                            <Box data-testid="inbox-message-list" sx={[layoutSx.inbox.paneInset, { flex: 1, minHeight: { xs: 350, xl: '6em' }, maxHeight: 550, overflowY: 'auto', background: colors.canvas }]}>
                                <QueryState query={messages}>
                                    <Stack data-testid="inbox-message-groups" sx={layoutSx.inbox.messageGroupGap}>
                                        <ConversationMessageList
                                            messages={messages.data?.data || []}
                                            timezone={shop.timezone}
                                            onRate={message => {
                                                setRatingMessage(message);
                                                setCorrection('');
                                            }}
                                        />
                                        <div ref={end} />
                                    </Stack>
                                    {!messages.data?.data.length && <Empty text="Chưa có tin nhắn." />}
                                    <Pager page={messages.data?.page} />
                                </QueryState>
                            </Box>
                            <ConversationComposer conversation={conversation} />
                        </Panel>
                    </Box>
                    <ConversationContextPanel conversation={conversation}>
                        {__MOCK__ && <MockSalesFlowPreview customerId={conversation.customerId} conversationId={conversation.id} />}
                        {__MOCK__ && <MockUpsellPreview />}
                    </ConversationContextPanel>
                    <ConfirmDialog
                        open={!!action}
                        title={action === 'takeover' ? 'Tiếp quản cuộc trò chuyện' : action === 'release' ? 'Trả cuộc trò chuyện về bot' : 'Đánh dấu đã giải quyết'}
                        confirmLabel={action === 'takeover' ? 'Tiếp quản' : action === 'release' ? 'Trả về AI' : 'Đánh dấu đã giải quyết'}
                        description={`${conversation.displayName} (${conversationId}): ${action === 'takeover' ? 'chuyển trách nhiệm trả lời sang nhân viên và chặn câu trả lời AI đang chờ trước khi gửi.' : action === 'release' ? 'trả trách nhiệm trả lời về AI sau khi kiểm quyền và điều kiện gửi hiện tại.' : 'đánh dấu hội thoại đã giải quyết; lịch sử tin nhắn được giữ.'}`}
                        requireReason
                        onClose={() => setAction(null)}
                        busy={takeover.pending || release.pending || resolve.pending}
                        error={takeover.error || release.error || resolve.error}
                        onConfirm={reason => {
                            const operation = action === 'takeover' ? takeover : action === 'release' ? release : resolve;
                            return operation.execute({
                                path: { conversationId },
                                version: conversation.version,
                                body: { expectedVersion: conversation.version, reason },
                            });
                        }}
                    />
                    <EditDialog
                        open={!!ratingMessage}
                        title="Đánh giá câu trả lời"
                        onClose={() => setRatingMessage(null)}
                        busy={feedback.pending}
                        actions={(
                            <Button
                                variant="contained"
                                disabled={feedback.pending}
                                onClick={async () => {
                                    if (!ratingMessage) return;
                                    try {
                                        await feedback.execute({ body: { conversationId, messageId: ratingMessage.id, rating, correction } });
                                        setRatingMessage(null);
                                    } catch {
                                        // The visible error remains available for retry.
                                    }
                                }}
                            >
                                Lưu phản hồi
                            </Button>
                        )}
                    >
                        <ErrorNotice error={feedback.error} />
                        <FormFields >
                            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{ratingMessage?.text}</Typography>
                            <TextField label="Đánh giá" select value={rating} onChange={event => setRating(event.target.value as typeof rating)} autoFocus>
                                <MenuItem value="positive">Hữu ích</MenuItem>
                                <MenuItem value="negative">Cần sửa</MenuItem>
                            </TextField>
                            <TextField label="Nội dung đề xuất sửa" multiline minRows={4} value={correction} onChange={event => setCorrection(event.target.value)} />
                            <Alert severity="info">Phản hồi không tự trở thành kiến thức đã xuất bản. Cần người duyệt và kiểm thử.</Alert>
                        </FormFields>
                    </EditDialog>
                </SectionGrid>
            )}
        </QueryState>
    );
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

    return <Panel title="Luồng tư vấn bán hàng · bản xem trước" subtitle="Mẫu tương tác cục bộ; không gọi AI và không gửi tin cho khách." beforeGap="surface" bodyMode="inset">
        <SurfaceContent >
            <Alert severity="info">Nội dung dưới đây chỉ minh họa giao diện. Bản demo không tự tạo câu trả lời AI hoặc lưu kịch bản lên máy chủ.</Alert>
            <Tabs value={tab} onChange={(_, value: SalesPreviewTab) => setTab(value)} variant="scrollable" scrollButtons="auto" aria-label="Các bước tư vấn bán hàng mẫu">
                <Tab value="script" label="Kịch bản" />
                <Tab value="sources" label="Giá & tồn" />
                <Tab value="order" label="Tạo đơn" />
                <Tab value="confirmation" label="Xác nhận" />
            </Tabs>
            {tab === 'script' && <SurfaceContent  role="tabpanel" aria-label="Kịch bản tư vấn mẫu">
                <TextField select label="Ngành hàng mẫu" value={industry} onChange={event => setIndustry(event.target.value as keyof typeof sampleSalesScripts)}>
                    {Object.entries(sampleSalesScripts).map(([key, value]) => <MenuItem key={key} value={key}>{value.label}</MenuItem>)}
                </TextField>
                <Typography component="h3" variant="subtitle2">Câu hỏi gợi ý</Typography>
                {script.questions.map((question, index) => <Typography key={question} variant="body2">{index + 1}. {question}</Typography>)}
                <Alert severity="warning">Ranh giới mẫu: {script.boundary}</Alert>
                <Typography variant="caption" color="text.secondary">Bản nháp mẫu riêng với cấu hình bot đang dùng; không có thao tác xuất bản ở đây.</Typography>
            </SurfaceContent>}
            {tab === 'sources' && <SurfaceContent  role="tabpanel" aria-label="Nguồn giá và tồn trong hộp thư">
                <Alert severity="info">Giá lấy từ catalog và tồn từ snapshot có thời điểm. Dữ liệu chỉ là mock; cần truy vấn lại trước khi xác nhận đơn.</Alert>
                {!canReadCatalog || !canReadInventory
                    ? <Alert severity="warning">Cần quyền xem sản phẩm và tồn kho để đối chiếu nguồn.</Alert>
                    : <QueryState query={products} pendingProfile="section">{products.data && <QueryState query={stock} pendingProfile="section">{stock.data && <>
                    <DataTable label="Nguồn giá và tồn trong hộp thư" rows={sourceRows} rowKey={row => row.key} empty="Chưa có sản phẩm đủ dữ liệu để đối chiếu." columns={[
                        { key: 'product', label: 'Sản phẩm', render: row => row.product.name },
                        { key: 'sku', label: 'SKU', render: row => row.variant.sku },
                        { key: 'price', label: 'Giá', align: 'right', render: row => <Amount value={row.variant.price} /> },
                        { key: 'available', label: 'Có thể bán', align: 'right', render: row => row.snapshot.available },
                        { key: 'asOf', label: 'Snapshot lúc', render: row => dateTime(row.snapshot.asOf, shop.timezone) },
                    ]} />
                    <Typography variant="caption" color="text.secondary">Preview giới hạn ở 100 sản phẩm và 100 snapshot đầu tiên; không phải danh sách đầy đủ.</Typography>
                    <ActionGroup direction="row" density="comfortable"><RouteLink to={`/s/${shop.id}/products`}>Mở danh sách sản phẩm</RouteLink><RouteLink to={`/s/${shop.id}/inventory`}>Mở danh sách tồn kho</RouteLink></ActionGroup>
                    </>}</QueryState>}</QueryState>}
            </SurfaceContent>}
            {tab === 'order' && <SurfaceContent  role="tabpanel" aria-label="Tạo đơn từ hội thoại">
                <Typography variant="body2">Chuyển sang biểu mẫu đơn để nhân viên kiểm tra khách, sản phẩm, số lượng và báo giá.</Typography>
                <RouteLink to={`/s/${shop.id}/orders/new?customerId=${customerId}&conversationId=${conversationId}`}>Mở biểu mẫu tạo đơn từ hội thoại</RouteLink>
                <Alert severity="info">Đơn trong demo được lưu vào MSW cục bộ của tab; đây không phải đơn trên máy chủ.</Alert>
            </SurfaceContent>}
            {tab === 'confirmation' && <SurfaceContent  role="tabpanel" aria-label="Điều kiện xác nhận đơn">
                <Alert severity="warning">Không tự chốt đơn trong giao diện này. Bằng chứng xác nhận của khách, báo giá hiện hành và điều kiện giao nhận phải được kiểm tra trước khi nhân viên xác nhận.</Alert>
                <Button variant="outlined" disabled>Tự động xác nhận đơn chưa được hỗ trợ</Button>
                <Typography variant="caption" color="text.secondary">Cần bổ sung capability và policy trong contract trước khi bật tự động xác nhận.</Typography>
            </SurfaceContent>}
        </SurfaceContent>
    </Panel>;
}

function MockUpsellPreview() {
    const [open, setOpen] = useState(false);
    return <SurfaceContent beforeGap="surface">
        <Typography component="h3" variant="subtitle2">Gợi ý bán kèm mẫu · DEMO-PROMO-01</Typography>
        <Alert severity="info">Combo áo thun + túi tote chỉ minh họa giao diện. Không có API khuyến mại; giá, lợi nhuận, SKU và tồn kho chưa được xác thực.</Alert>
        <Button size="small" variant="outlined" onClick={() => setOpen(value => !value)}>{open ? 'Ẩn điều kiện mẫu' : 'Xem điều kiện combo mẫu'}</Button>
        {open && <Stack role="status" data-testid="mock-promotion-preview" sx={[layoutSx.surface.compactContentGap, layoutSx.surface.compactInset, { border: 1, borderColor: 'divider', borderRadius: visualSx.radius.control }]}>
            <Typography component="h3" variant="subtitle2">Combo mẫu · DEMO-PROMO-01</Typography>
            <Typography variant="body2">Điều kiện minh họa: có ít nhất một áo và một phụ kiện trong đơn nháp.</Typography>
            <Typography variant="caption" color="text.secondary">Không áp dụng giảm giá, không sửa đơn và không khẳng định đạt biên lợi nhuận.</Typography>
        </Stack>}
    </SurfaceContent>;
}
