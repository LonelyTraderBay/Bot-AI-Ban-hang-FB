import { ActionGroup, FormFields, SectionGrid, SurfaceContent } from '../../shared/ui/composition';
import { Suspense, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { Link as RouterLink, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Drawer, LinearProgress, List, ListItem, ListItemButton, MenuItem, Stack, Tab, Tabs, TextField, Typography, useMediaQuery } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import type { Conversation, Message, Product, StockSnapshot } from '@botsales/contracts';
import { colors, tokens } from '@botsales/tokens';
import { useApi, useCommand, usePagedApi } from '@/shared/api/hooks';
import { useScope, useCan, useCanWrite } from '@/shared/model/scope';
import { dateTime } from '@/shared/model/format';
import { PageHeader, Panel, QueryState, Toolbar, Pager, Status, MutationButton, EditDialog, ErrorNotice, ConfirmDialog, RouteLink, Empty, DataTable, Amount } from '@/shared/ui/components';
import { layoutSx } from '@/shared/ui/layout';
import { desktopAndUpQuery } from '@/shared/ui/theme';
import { ConversationComposer, ConversationContextPanel, ConversationMessageList } from './conversation-components';
type DraftAccess = 'open' | 'resume';
type DraftAccessRequest = { action: DraftAccess };
type OrderDraftSlot = ComponentType<{
    conversationId: string; customerId: string; customerName: string;
    openRequest?: DraftAccessRequest; onPreviewAccess?: (action: DraftAccess) => void; fromPreview?: boolean;
}>;
const minimumSideBySideWidth = 900;
export function InboxPage({ orderDraft }: { orderDraft?: OrderDraftSlot } = {}) {
    const { conversationId } = useParams();
    const { shop } = useScope();
    const [params, setParams] = useSearchParams();
    const desktop = useMediaQuery(desktopAndUpQuery);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [preview, setPreview] = useState<{ listKey: string; id: string }>();
    const filterId = useId();
    useEffect(() => {
        if (!conversationId) setFiltersOpen(false);
    }, [conversationId]);
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
    const listKey = JSON.stringify([q, status, mode, channelId, assignedUserId, cursor]);
    const pinnedId = preview?.listKey === listKey ? preview.id : undefined;
    const settledRows = desktop && list.isSuccess && !list.isFetching ? list.data.data : undefined;
    const firstId = settledRows?.[0]?.id;
    // A settled result may remove the current thread. Pending, failed and reordered results keep it.
    const stillListed = !settledRows || settledRows.some(row => row.id === pinnedId);
    const previewId = conversationId ? undefined : (stillListed && pinnedId) || firstId;
    if (preview?.id !== previewId || (previewId && preview?.listKey !== listKey)) {
        setPreview(previewId ? { listKey, id: previewId } : undefined);
    }
    const displayedId = conversationId ?? (desktop ? previewId : undefined);
    const discloseFilters = Boolean(conversationId) || !desktop;
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
    const appliedFilters = [
        status && (status === 'open' ? 'Đang mở' : 'Đã giải quyết'),
        mode && ({ bot: 'Bot', human: 'Nhân viên', paused: 'Tạm dừng' })[mode],
        channelId && (metadata.data?.data.channels.find(channel => channel.id === channelId)?.displayName || 'Kênh đã chọn'),
        assignedUserId && (metadata.data?.data.assignees.find(user => user.userId === assignedUserId)?.displayName || 'Nhân viên đã chọn'),
    ].filter(Boolean).join(' · ');
    const filterFields = <SectionGrid columns={{ xs: 'repeat(2, minmax(0, 1fr))' }} rhythm="content" shrinkChildren role="group" aria-label="Bộ lọc hội thoại">
        <TextField id="inbox-status" select size="small" label="Trạng thái" SelectProps={{ displayEmpty: true, SelectDisplayProps: { 'aria-labelledby': 'inbox-status-label' } }} value={status || ''} onChange={event => updateFilter('status', event.target.value)}>
            <MenuItem value="">Tất cả</MenuItem><MenuItem value="open">Đang mở</MenuItem><MenuItem value="resolved">Đã giải quyết</MenuItem>
        </TextField>
        <TextField id="inbox-mode" select size="small" label="Chế độ" SelectProps={{ displayEmpty: true, SelectDisplayProps: { 'aria-labelledby': 'inbox-mode-label' } }} value={mode || ''} onChange={event => updateFilter('mode', event.target.value)}>
            <MenuItem value="">Tất cả</MenuItem><MenuItem value="bot">Bot</MenuItem><MenuItem value="human">Nhân viên</MenuItem><MenuItem value="paused">Tạm dừng</MenuItem>
        </TextField>
        <TextField id="inbox-channel" select size="small" label="Kênh" SelectProps={{ displayEmpty: true, SelectDisplayProps: { 'aria-labelledby': 'inbox-channel-label' } }} value={channelId || ''} onChange={event => updateFilter('channelId', event.target.value)}>
            <MenuItem value="">Tất cả</MenuItem>{metadata.data?.data.channels.map(channel => <MenuItem key={channel.id} value={channel.id}>{channel.displayName}</MenuItem>)}
        </TextField>
        <TextField id="inbox-assignee" select size="small" label="Nhân viên" SelectProps={{ displayEmpty: true, SelectDisplayProps: { 'aria-labelledby': 'inbox-assignee-label' } }} value={assignedUserId || ''} onChange={event => updateFilter('assignedUserId', event.target.value)}>
            <MenuItem value="">Tất cả</MenuItem>{metadata.data?.data.assignees.map(assignee => <MenuItem key={assignee.userId} value={assignee.userId}>{assignee.displayName}</MenuItem>)}
        </TextField>
    </SectionGrid>;
    // On desktop the workspace grows with the shell. On short windows its minimum remains scrollable.
    return <>
        <PageHeader title="Hộp thư khách hàng" />
        <SectionGrid columns={{ xs: 'minmax(0, 1fr)', lg: '208px minmax(0, 1fr)' }}
            rhythm="content" geometry={{ flex: '1 0 min(100%, 30rem)', minHeight: 0 }}>
            <Box data-testid="inbox-list-pane" sx={{ display: { xs: conversationId ? 'none' : 'block', lg: 'block' }, minWidth: 0, minHeight: 0, contain: displayedId ? { lg: 'size' } : undefined }}>
                <Panel geometry={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Toolbar operation="listConversations" placeholder="Tìm hội thoại…" cursorParam={listCursorParam} filters={
                        discloseFilters ? <>
                            {appliedFilters && <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                                Đang lọc · {appliedFilters}
                            </Typography>}
                            <Box id={filterId} hidden={!filtersOpen}>{filterFields}</Box>
                        </> : filterFields
                    } extra={discloseFilters ? <Button type="button" disableRipple aria-controls={filterId} aria-expanded={filtersOpen}
                        onClick={() => setFiltersOpen(open => !open)}>Bộ lọc</Button> : undefined} />
                    <Box sx={{ minHeight: 0, flex: '1 1 auto', overflowY: 'auto' }}>
                        <QueryState query={list}>
                            <List disablePadding>
                                {list.data?.data.map(c => <ListItem key={c.id} disablePadding>
                                    <ListItemButton selected={c.id === displayedId} aria-current={c.id === displayedId ? (conversationId ? 'page' : 'true') : undefined}
                                        component={RouterLink} to={detailHref(c.id)} sx={[layoutSx.inbox.listInset, layoutSx.inbox.listContentGap, { alignItems: 'start', borderBottom: 1, borderColor: 'divider' }]}>
                                        <Avatar sx={{ bgcolor: colors.raised, color: 'text.primary', width: 38, height: 38 }}>{c.displayName.slice(0, 1)}</Avatar>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Stack direction="row" justifyContent="space-between" sx={[layoutSx.surface.compactContentGap, { alignItems: 'center' }]}>
                                                <Typography fontWeight={visualSx.typography.fontWeight.strong} sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>{c.displayName}</Typography>
                                                {c.unreadCount > 0 && <Box data-testid="inbox-unread-count" sx={[layoutSx.inbox.unreadCountInset, { bgcolor: 'primary.main', color: colors.onAccent, borderRadius: visualSx.radius.large, fontSize: tokens.fontSizes.meta, flexShrink: 0 }]}>{c.unreadCount}</Box>}
                                            </Stack>
                                            <Typography variant="body2" color="text.secondary" sx={[layoutSx.surface.titleDescriptionGap, { display: 'block', overflowWrap: 'anywhere' }]}>{c.lastMessagePreview || 'Chưa có tin nhắn'}</Typography>
                                            <Box sx={layoutSx.inbox.listStatusBeforeGap}><Status value={c.mode} /></Box>
                                        </Box>
                                    </ListItemButton>
                                </ListItem>)}
                            </List>
                            {!list.data?.data.length && <Empty text="Chưa có hội thoại phù hợp." />}
                            {(cursor || list.data?.page.hasMore) && <Pager page={list.data?.page} cursorParam={listCursorParam} />}
                        </QueryState>
                    </Box>
                </Panel>
            </Box>
            {displayedId && <ConversationPanel key={`${conversationId ? 'detail' : 'preview'}:${displayedId}`} conversationId={displayedId}
                previewHref={conversationId ? undefined : detailHref(displayedId)} OrderDraft={orderDraft} />}
        </SectionGrid>
    </>;
}
function ConversationPanel({ conversationId, previewHref, OrderDraft }: {
    conversationId: string;
    previewHref?: string;
    OrderDraft?: OrderDraftSlot;
}) {
    const { shop, session } = useScope();
    const [params] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const previewAction = previewHref ? undefined : location.state?.inboxDraftAccess;
    const arrivedFromPreview = previewAction === 'open' || previewAction === 'resume';
    const [fromPreview] = useState(arrivedFromPreview);
    const [activePane, setActivePane] = useState(arrivedFromPreview || (!previewHref && params.get('view') === 'order-draft') ? 'draft' : 'chat');
    const [openRequest, setOpenRequest] = useState<DraftAccessRequest | undefined>(arrivedFromPreview ? { action: previewAction } : undefined);
    useEffect(() => {
        if (!arrivedFromPreview) return;
        // Consume the click intent so reopening this history entry only opens the detail.
        void navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true, state: null });
    }, [arrivedFromPreview, location.pathname, location.search, location.hash, navigate]);
    const paneId = useId();
    const draftTab = useRef<HTMLDivElement>(null);
    const readOrders = useCan('orders.read');
    const writeOrders = useCanWrite('orders.write');
    const canAssign = useCan('conversations.assign');
    const canReply = useCan('conversations.reply');
    const hasOrderPane = !!OrderDraft && readOrders;
    const workspace = useRef<HTMLDivElement>(null);
    const [wideWorkspace, setWideWorkspace] = useState(false);
    const showOrderTabs = hasOrderPane && !wideWorkspace;
    const c = useApi('getConversation', { path: { conversationId } });
    const messageCursor = previewHref ? undefined : params.get('cursor') || undefined;
    const history = usePagedApi('listMessages', { path: { conversationId }, query: { limit: 100 } }, !messageCursor);
    const bookmarked = useApi('listMessages', { path: { conversationId }, query: { cursor: messageCursor, limit: 100 } }, Boolean(messageCursor));
    const messages = messageCursor ? bookmarked : history;
    const takeover = useCommand('takeoverConversation', ['getConversation', 'listConversations']);
    const release = useCommand('releaseConversation', ['getConversation', 'listConversations']);
    const resolve = useCommand('resolveConversation', ['getConversation', 'listConversations', 'getDashboard']);
    const feedback = useCommand('createFeedback', ['listFeedback']);
    const [action, setAction] = useState<'takeover' | 'release' | 'resolve' | null>(null);
    const [ratingMessage, setRatingMessage] = useState<Message | null>(null);
    const [correction, setCorrection] = useState('');
    const [rating, setRating] = useState<'positive' | 'negative'>('negative');
    const messageList = useRef<HTMLDivElement>(null);
    const latestMessageIds = useRef<Set<string> | null>(null);
    const followingLatest = useRef(true);
    const previousScrollTop = useRef(0);
    const prependAnchor = useRef<{ bubble: HTMLElement; top: number } | null>(null);
    const [jumpAvailable, setJumpAvailable] = useState(false);
    const [announcementId, setAnnouncementId] = useState<string>();
    const conversationReady = Boolean(c.data);

    useLayoutEffect(() => {
        const element = workspace.current;
        if (!element || !hasOrderPane) return;
        setWideWorkspace(element.clientWidth >= minimumSideBySideWidth);
        const observer = new ResizeObserver(([entry]) => {
            if (entry) setWideWorkspace(entry.contentRect.width >= minimumSideBySideWidth);
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [conversationReady, hasOrderPane]);

    useLayoutEffect(() => {
        if (messageCursor) {
            prependAnchor.current = null;
            latestMessageIds.current = null;
            followingLatest.current = true;
            setJumpAvailable(false);
            setAnnouncementId(undefined);
            return;
        }
        const list = messageList.current;
        if (!list || !history.firstPage) return;
        const current = history.firstPage.data;
        const previous = latestMessageIds.current;
        latestMessageIds.current = new Set(current.map(message => message.id));
        const arrived = previous && current.find(message => message.direction === 'inbound' && !previous.has(message.id));
        if (arrived) {
            setAnnouncementId(arrived.id);
            if (!followingLatest.current) setJumpAvailable(true);
        }
        if (followingLatest.current) {
            list.scrollTop = list.scrollHeight;
            previousScrollTop.current = list.scrollTop;
        }
    }, [history.firstPage, messageCursor, conversationReady]);

    useLayoutEffect(() => {
        if (history.isLoadingMore) return;
        const anchor = prependAnchor.current;
        prependAnchor.current = null;
        const list = messageList.current;
        if (!list || !anchor || !list.contains(anchor.bubble)) return;
        list.scrollTop += anchor.bubble.getBoundingClientRect().top - list.getBoundingClientRect().top - anchor.top;
        previousScrollTop.current = list.scrollTop;
    }, [history.isLoadingMore, history.loadedCount]);

    const rememberReadingPosition = (list: HTMLDivElement) => {
        const viewportTop = list.getBoundingClientRect().top;
        const bubble = Array.from(list.querySelectorAll<HTMLElement>('[data-testid="inbox-message-bubble"]'))
            .find(element => element.getBoundingClientRect().bottom > viewportTop);
        prependAnchor.current = bubble ? { bubble, top: bubble.getBoundingClientRect().top - viewportTop } : null;
    };

    const loadOlderMessages = () => {
        const list = messageList.current;
        if (!list || history.isFetching) return;
        rememberReadingPosition(list);
        followingLatest.current = false;
        list.focus({ preventScroll: true });
        void history.loadMore();
    };

    const jumpToLatest = () => {
        const list = messageList.current;
        if (!list) return;
        list.focus({ preventScroll: true });
        list.scrollTop = list.scrollHeight;
        previousScrollTop.current = list.scrollTop;
        followingLatest.current = true;
        setJumpAvailable(false);
    };

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
    const requestDraftAccess = (draftAction: DraftAccess) => {
        if (previewHref) {
            void navigate(previewHref, { state: { inboxDraftAccess: draftAction } });
            return;
        }
        setActivePane('draft');
        setOpenRequest({ action: draftAction });
    };
    const openDraft = (focusTab = false) => {
        requestDraftAccess('open');
        if (focusTab && !previewHref) draftTab.current?.focus();
    };
    const canOpenFromChat = hasOrderPane && writeOrders && canReply && conversation?.status === 'open'
        && (conversation.assignedUserId === null ? canAssign : conversation.assignedUserId === session.user.id && conversation.mode === 'human');
    return (
        <QueryState query={c} pendingProfile="section">
            {conversation && (
                <Box ref={workspace} sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
                {showOrderTabs && <Tabs value={activePane} onChange={(_, pane: string) => setActivePane(pane)} aria-label="Không gian hội thoại"
                    variant="fullWidth" sx={{ flexShrink: 0 }}>
                    <Tab id={`${paneId}-chat-tab`} aria-controls={`${paneId}-chat`} value="chat" label="Tin nhắn" />
                    <Tab ref={draftTab} id={`${paneId}-draft-tab`} aria-controls={`${paneId}-draft`} value="draft" label="Đơn đang nhập" />
                </Tabs>}
                <SectionGrid data-testid="inbox-conversation-layout" columns={{ xs: hasOrderPane && wideWorkspace ? 'minmax(0, 1fr) minmax(19rem, 25rem)' : 'minmax(0, 1fr)' }}
                    rhythm="content" geometry={{ minWidth: 0, minHeight: 0, flex: '1 1 auto' }}>
                    <Box id={`${paneId}-chat`} role={showOrderTabs ? 'tabpanel' : undefined}
                        aria-labelledby={showOrderTabs ? `${paneId}-chat-tab` : undefined}
                        sx={{ display: showOrderTabs && activePane !== 'chat' ? 'none' : 'block', minWidth: 0, minHeight: 0, contain: 'size' }}>
                        <Box data-testid="inbox-thread" component="section" aria-label="Nội dung hội thoại" sx={{ height: '100%' }}>
                        <Panel geometry={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
                            <ActionGroup direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" bodyMode="header" geometry={{ flex: '0 0 auto' }}>
                                <Stack direction="row" alignItems="center" sx={[layoutSx.surface.compactContentGap, { minWidth: 0 }]}>
                                    <Button component={RouterLink} to={inboxHref()} sx={{ display: { lg: 'none' }, minWidth: 44 }} aria-label="Danh sách hội thoại">
                                        <ArrowBackRounded />
                                    </Button>
                                    <Avatar sx={{ bgcolor: colors.selected, color: 'primary.main', width: 32, height: 32 }}>{conversation.displayName.slice(0, 1)}</Avatar>
                                    <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                                        <Typography component="h2" variant="h6">{conversation.displayName}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {conversation.mode === 'human' ? 'Nhân viên đang tiếp quản' : conversation.mode === 'paused' ? 'Đang tạm dừng' : 'Trợ lý tự động'}
                                        </Typography>
                                    </Box>
                                </Stack>
                                <ActionGroup direction="row" flexWrap="wrap">
                                    {previewHref ? <Button component={RouterLink} to={previewHref} variant="outlined">Mở hội thoại</Button> : <>
                                        <ConversationDetails conversation={conversation} onCreateOrder={canOpenFromChat ? () => openDraft() : undefined} />
                                        <MutationButton permission="conversations.assign" variant="outlined" onClick={() => setAction(conversation.mode === 'human' ? 'release' : 'takeover')}>
                                            {conversation.mode === 'human' ? 'Trả lại bot' : 'Tiếp quản'}
                                        </MutationButton>
                                        <MutationButton permission="conversations.assign" disabled={conversation.status === 'resolved'} onClick={() => setAction('resolve')}>
                                            Giải quyết
                                        </MutationButton>
                                    </>}
                                    {canOpenFromChat && showOrderTabs && <Button size="small" variant="outlined" onClick={event => openDraft(event.detail === 0)}>Tạo đơn</Button>}
                                </ActionGroup>
                            </ActionGroup>
                            {conversation.sendEligibility.state !== 'allowed' && (
                                <Alert severity="warning">{sendRestrictionText(conversation.sendEligibility.reasonCode)}</Alert>
                            )}
                            <Box ref={messageList} data-testid="inbox-message-list" role="region" aria-label="Lịch sử tin nhắn" tabIndex={0}
                                onScroll={({ currentTarget }) => {
                                    if (messageCursor) return;
                                    const { scrollTop, scrollHeight, clientHeight } = currentTarget;
                                    if (history.isLoadingMore && scrollTop !== previousScrollTop.current)
                                        rememberReadingPosition(currentTarget);
                                    if (scrollHeight - scrollTop - clientHeight <= 2) {
                                        followingLatest.current = true;
                                        setJumpAvailable(false);
                                    } else if (scrollTop < previousScrollTop.current) {
                                        followingLatest.current = false;
                                    }
                                    previousScrollTop.current = scrollTop;
                                }}
                                sx={[layoutSx.inbox.paneInset, { flex: 1, minHeight: '3lh', overflowY: 'auto', background: colors.canvas }]}>
                                <QueryState query={messages}>
                                    <Stack data-testid="inbox-message-groups" sx={layoutSx.inbox.messageGroupGap}>
                                        {!messageCursor && history.hasMore && <Button size="small" sx={{ alignSelf: 'start' }}
                                            disabled={history.isFetching} onClick={loadOlderMessages}>Tải tin cũ hơn</Button>}
                                        <ConversationMessageList
                                            key={conversation.id}
                                            messages={messages.data?.data || []}
                                            timezone={shop.timezone}
                                            onRate={previewHref ? undefined : message => {
                                                setRatingMessage(message);
                                                setCorrection('');
                                            }}
                                        />
                                    </Stack>
                                    {!messages.data?.data.length && <Empty text="Chưa có tin nhắn." />}
                                    {!previewHref && (messageCursor || history.firstPage?.page.hasMore) && <Pager page={messageCursor ? bookmarked.data?.page : history.firstPage?.page} />}
                                </QueryState>
                            </Box>
                            <Box role="status" aria-live="polite" aria-atomic="true"
                                sx={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clipPath: 'inset(50%)' }}>
                                {announcementId && <span key={announcementId}>Có tin nhắn mới.</span>}
                            </Box>
                            {jumpAvailable && <Button size="small" onClick={jumpToLatest}>Có tin nhắn mới</Button>}
                            {!previewHref && <ConversationComposer conversation={conversation} />}
                        </Panel>
                        </Box>
                    </Box>
                    {hasOrderPane && OrderDraft && <Box id={`${paneId}-draft`} role={showOrderTabs ? 'tabpanel' : undefined}
                        aria-labelledby={showOrderTabs ? `${paneId}-draft-tab` : undefined}
                        sx={{ display: wideWorkspace || activePane === 'draft' ? 'block' : 'none', minWidth: 0, minHeight: 0, contain: 'size' }}>
                        <Box component="aside" aria-label="Đơn đang nhập" sx={{ height: '100%' }}>
                            <Suspense fallback={<LinearProgress aria-label="Đang tải bản đang nhập" />}>
                                <OrderDraft conversationId={conversationId} customerId={conversation.customerId} customerName={conversation.displayName}
                                    openRequest={openRequest} fromPreview={fromPreview}
                                    onPreviewAccess={previewHref ? requestDraftAccess : undefined} />
                            </Suspense>
                        </Box>
                    </Box>}
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
                </Box>
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
function sendRestrictionText(reasonCode: string | null) {
    switch (reasonCode) {
    case 'WINDOW_EXPIRED':
    case 'SEND_WINDOW_CLOSED': return 'Đã hết thời hạn trả lời trên kênh này.';
    case 'PERMISSION_REQUIRED': return 'Bạn chưa có quyền trả lời hội thoại.';
    case 'HANDOFF_REQUIRED': return 'Hội thoại cần được tiếp quản hoặc phân công cho bạn để trả lời.';
    case 'CHANNEL_NOT_READY': return 'Kênh chưa sẵn sàng để gửi tin.';
    case 'CONVERSATION_RESOLVED': return 'Hội thoại đã được giải quyết.';
    default: return 'Chưa xác minh được quyền gửi trên kênh này.';
    }
}

function ConversationDetails({ conversation, onCreateOrder }: { conversation: Conversation; onCreateOrder?: () => void }) {
    const [drawer, setDrawer] = useState<{ open: boolean; view: 'customer' | 'sales' }>();
    const title = useRef<HTMLHeadingElement>(null);
    const salesButton = useRef<HTMLButtonElement>(null);
    const returnToSalesButton = useRef(false);
    const open = drawer?.open ?? false;
    const showSales = drawer?.view === 'sales';

    useEffect(() => {
        if (!open) return;
        if (returnToSalesButton.current) {
            returnToSalesButton.current = false;
            salesButton.current?.focus();
        } else if (showSales) {
            title.current?.focus();
        }
    }, [open, showSales]);

    return <>
        <Button type="button" size="small" aria-haspopup="dialog" aria-expanded={open}
            onClick={() => setDrawer({ open: true, view: 'customer' })}>Thông tin khách</Button>
        {drawer && <Drawer anchor="right" open={open} onClose={() => setDrawer({ ...drawer, open: false })}
            ModalProps={{ keepMounted: true }} slotProps={{
                paper: {
                    role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'inbox-drawer-title',
                    sx: { width: { xs: '100%', md: showSales ? 640 : 420 }, maxWidth: '100%', overflow: 'hidden' },
                },
                transition: { onEntered: () => {
                    const heading = title.current;
                    if (heading && heading.closest('[role="dialog"]') === document.activeElement) heading.focus();
                } },
            }}>
            <ActionGroup bodyMode="header" alignItems="center" justifyContent="space-between" flexWrap="wrap" geometry={{ flex: '0 0 auto' }}>
                <Typography ref={title} tabIndex={-1} id="inbox-drawer-title" variant="h6" component="h2">
                    {showSales ? 'Luồng tư vấn mẫu' : 'Thông tin khách'}
                </Typography>
                <ActionGroup flexWrap="wrap">
                    {showSales && <Button type="button" onClick={() => {
                        returnToSalesButton.current = true;
                        setDrawer({ open: true, view: 'customer' });
                    }}>Về thông tin khách</Button>}
                    <Button type="button" onClick={() => setDrawer({ ...drawer, open: false })}>Đóng</Button>
                </ActionGroup>
            </ActionGroup>
            <ConversationContextPanel conversation={conversation} hidden={showSales} onCreateOrder={onCreateOrder ? () => { setDrawer({ ...drawer, open: false }); onCreateOrder(); } : undefined}>
                <ActionGroup density="comfortable" flexWrap="wrap">
                    <KnowledgeScriptLink />
                    {__MOCK__ && <Button ref={salesButton} type="button"
                        onClick={() => setDrawer({ open: true, view: 'sales' })}>Luồng tư vấn mẫu</Button>}
                </ActionGroup>
                <ConversationPromotions customerId={conversation.customerId} conversationId={conversation.id} />
            </ConversationContextPanel>
            {__MOCK__ && showSales && <Box sx={[layoutSx.inbox.contextInset, { flex: 1, minHeight: 0, overflowY: 'auto' }]}>
                <MockSalesFlowPreview customerId={conversation.customerId} conversationId={conversation.id} />
            </Box>}
        </Drawer>}
    </>;
}

function KnowledgeScriptLink() {
    const { shop } = useScope();
    const canWrite = useCanWrite('knowledge.write');
    return canWrite ? <RouteLink to={`/s/${shop.id}/knowledge?template=sales_script`}>Soạn kịch bản tư vấn</RouteLink> : null;
}

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
    const canCreateOrder = useCanWrite('orders.write');
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
            <Tabs value={tab} onChange={(_, value: SalesPreviewTab) => setTab(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile aria-label="Các bước tư vấn bán hàng mẫu">
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
                    <DataTable mobile={{ layout: 'cards', titleKey: 'product', summaryKeys: ['sku', 'price', 'available'] }} label="Nguồn giá và tồn trong hộp thư" rows={sourceRows} rowKey={row => row.key} empty="Chưa có sản phẩm đủ dữ liệu để đối chiếu." columns={[
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
                {canCreateOrder && <RouteLink to={`/s/${shop.id}/orders/new?customerId=${customerId}&conversationId=${conversationId}`}>Mở biểu mẫu tạo đơn từ hội thoại</RouteLink>}
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

function ConversationPromotions({ customerId, conversationId }: { customerId: string; conversationId: string }) {
    const { shop } = useScope();
    const canRead = useCan('catalog.read');
    const canWrite = useCanWrite('orders.write');
    const result = useApi('listPromotions', { query: { effective: 'yes', limit: 3 } }, canRead);
    if (!canRead) return null;
    const items = result.data?.data ?? [];
    return <SurfaceContent beforeGap="surface">
        <Typography component="h3" variant="subtitle2">Ưu đãi đang hiệu lực</Typography>
        <QueryState query={result}>{items.length ? items.map(item => <SurfaceContent key={item.id} bodyMode="compactOutlined">
            <Typography variant="body2">{item.name} · giảm <Amount wrap value={{ amount: item.discountAmount, currency: shop.currency }} /></Typography>
            <Typography variant="caption">{item.lines.map(line => `${line.sku} × ${line.quantity}`).join(' · ')}</Typography>
            {canWrite && <RouteLink to={`/s/${shop.id}/orders/new?` + new URLSearchParams({ customerId, conversationId, promotionId: item.id })}>Kiểm tra trên đơn nháp</RouteLink>}
        </SurfaceContent>) : <Typography color="text.secondary">Chưa có ưu đãi đang hiệu lực.</Typography>}</QueryState>
        {result.data?.page.hasMore && <RouteLink to={`/s/${shop.id}/products/promotions?effective=yes`}>Xem đủ chương trình</RouteLink>}
    </SurfaceContent>;
}
