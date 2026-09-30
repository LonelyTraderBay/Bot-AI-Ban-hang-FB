import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Divider, FormControlLabel, Checkbox, List, ListItemButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import SendRounded from '@mui/icons-material/SendRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import type { Message } from '@botsales/contracts';
import { colors } from '@botsales/tokens';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { dateTime } from '@/shared/model/format';
import { PageHeader, Panel, QueryState, Toolbar, Pager, Status, MutationButton, EditDialog, ErrorNotice, ConfirmDialog, RouteLink, Empty, DetailLine } from '@/shared/ui/components';
export function InboxPage() {
    const { conversationId } = useParams();
    const { shop } = useScope();
    const [params] = useSearchParams();
    const q = params.get('q') || '';
    const list = useApi('listConversations', { query: { q, limit: 40 } });
    return <><PageHeader title="Hộp thư khách hàng" subtitle="AI và nhân viên tiếp quản rõ ràng; chỉ gửi khi chính sách kênh cho phép."/><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '300px minmax(0,1fr)' }, gap: 2, minHeight: 650 }}><Panel sx={{ display: { xs: conversationId ? 'none' : 'block', lg: 'block' } }}><Toolbar placeholder="Tìm hội thoại…"/><QueryState query={list}><List disablePadding>{list.data?.data.map(c => <ListItemButton key={c.id} selected={c.id === conversationId} component={RouterLink} to={`/s/${shop.id}/inbox/${c.id}${q ? `?q=${encodeURIComponent(q)}` : ''}`} sx={{ py: 2, px: 2, gap: 1.5, alignItems: 'start', borderBottom: 1, borderColor: 'divider' }}><Avatar sx={{ bgcolor: colors.raised, color: 'text.primary', width: 38, height: 38 }}>{c.displayName.slice(0, 1)}</Avatar><Box sx={{ minWidth: 0, flex: 1 }}><Stack direction="row" justifyContent="space-between" gap={1}><Typography fontWeight={650} noWrap>{c.displayName}</Typography>{c.unreadCount > 0 && <Box sx={{ bgcolor: 'primary.main', color: colors.onAccent, borderRadius: 3, px: 1, fontSize: 12 }}>{c.unreadCount}</Box>}</Stack><Typography variant="body2" noWrap color="text.secondary" sx={{ mt: .6 }}>{c.lastMessagePreview || 'Chưa có tin nhắn'}</Typography><Box sx={{ mt: 1 }}><Status value={c.mode}/></Box></Box></ListItemButton>)}</List>{!list.data?.data.length && <Empty text="Chưa có hội thoại phù hợp."/>}</QueryState></Panel>{conversationId ? <ConversationPanel key={conversationId} conversationId={conversationId}/> : <Panel><Empty text="Chọn một cuộc trò chuyện để xem lịch sử, tiếp quản và tạo đơn."/></Panel>}</Box></>;
}
function ConversationPanel({ conversationId }: {
    conversationId: string;
}) {
    const { shop, session, online } = useScope();
    const c = useApi('getConversation', { path: { conversationId } });
    const messages = useApi('listMessages', { path: { conversationId }, query: { limit: 100 } });
    const metadata = useApi('getInboxMetadata');
    const send = useCommand('sendMessage', ['listMessages', 'getConversation', 'listConversations']);
    const note = useCommand('addInternalNote', ['listMessages']);
    const takeover = useCommand('takeoverConversation', ['getConversation', 'listConversations']);
    const release = useCommand('releaseConversation', ['getConversation', 'listConversations']);
    const resolve = useCommand('resolveConversation', ['getConversation', 'listConversations']);
    const assign = useCommand('assignConversation', ['getConversation', 'listConversations']);
    const feedback = useCommand('createFeedback', ['listFeedback']);
    const canReply = useCan('conversations.reply');
    const [text, setText] = useState(''), [internal, setInternal] = useState(false), [action, setAction] = useState<'takeover' | 'release' | 'resolve' | null>(null), [assignee, setAssignee] = useState('');
    const [ratingMessage, setRatingMessage] = useState<Message | null>(null), [correction, setCorrection] = useState(''), [rating, setRating] = useState<'positive' | 'negative'>('negative');
    const end = useRef<HTMLDivElement>(null);
    useEffect(() => { end.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' }); }, [messages.data]);
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
    return <QueryState query={c}>{conversation && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0,1fr) 260px' }, gap: 2, minWidth: 0 }}><Panel sx={{ display: 'flex', flexDirection: 'column' }}><Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap' }}><Stack direction="row" alignItems="center" gap={1}><Button component={RouterLink} to={`/s/${shop.id}/inbox`} sx={{ display: { lg: 'none' }, minWidth: 44 }} aria-label="Danh sách hội thoại"><ArrowBackRounded /></Button><Avatar sx={{ bgcolor: colors.selected, color: 'primary.main' }}>{conversation.displayName.slice(0, 1)}</Avatar><Box><Typography variant="h6">{conversation.displayName}</Typography><Typography variant="caption" color="text.secondary">{conversation.mode === 'human' ? 'Nhân viên đang tiếp quản' : 'Trợ lý tự động'} · {conversation.id}</Typography></Box></Stack><Stack direction="row" gap={1}><MutationButton permission="conversations.assign" variant="outlined" onClick={() => setAction(conversation.mode === 'human' ? 'release' : 'takeover')}>{conversation.mode === 'human' ? 'Trả lại bot' : 'Tiếp quản'}</MutationButton><MutationButton permission="conversations.assign" disabled={conversation.status === 'resolved'} onClick={() => setAction('resolve')}>Giải quyết</MutationButton></Stack></Stack>
 {conversation.sendEligibility.state !== 'allowed' && <Alert severity="warning" sx={{ m: 2 }}>Không được gửi tin: {conversation.sendEligibility.reasonCode || 'Chưa xác minh quyền gửi'}. Không tự vượt cửa sổ/chính sách kênh.</Alert>}
 <Box sx={{ flex: 1, minHeight: 350, maxHeight: 550, overflowY: 'auto', p: 2.5, background: colors.canvas }}><QueryState query={messages}><Stack gap={2}>{messages.data?.data.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(m => <Stack key={m.id} alignItems={m.direction === 'inbound' ? 'flex-start' : 'flex-end'}><Box sx={{
            maxWidth: '88%', p: 1.8, borderRadius: 2.5, bgcolor: m.direction === 'internal' ? colors.selected : m.direction === 'inbound' ? colors.surface : colors.raised, border: m.direction === 'internal' ? '1px solid' : 'none', borderColor: colors.heroBorder
        }}><Typography variant="caption" color="text.secondary">{m.direction === 'internal' ? 'Ghi chú nội bộ' : m.senderKind === 'customer' ? 'Khách' : m.senderKind === 'bot' ? 'Trợ lý AI' : 'Nhân viên'}</Typography><Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', mt: .6 }}>{m.text}</Typography><Stack direction="row" gap={1} alignItems="center" sx={{ mt: .8, flexWrap: 'wrap' }}><Typography variant="caption" color="text.secondary">{dateTime(m.createdAt, shop.timezone)} · {m.status}</Typography><Button size="small" onClick={() => { setRatingMessage(m); setCorrection(''); }}>Đánh giá</Button></Stack></Box></Stack>)}<div ref={end}/></Stack>{!messages.data?.data.length && <Empty text="Chưa có tin nhắn."/>}<Pager page={messages.data?.page}/></QueryState></Box>
 <Box component="form" onSubmit={e => { e.preventDefault(); void submit(); }} sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}><ErrorNotice error={send.error || note.error}/><FormControlLabel label="Ghi chú nội bộ (không gửi khách)" control={<Checkbox checked={internal} onChange={e => setInternal(e.target.checked)} disabled={!canReply}/>}/><TextField fullWidth multiline minRows={2} maxRows={7} label={internal ? 'Ghi chú cho nhóm' : 'Nội dung trả lời khách'} value={text} onChange={e => setText(e.target.value)} disabled={!canReply} inputProps={{ maxLength: internal ? 10000 : 20000 }}/><Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.5 }}><Typography variant="caption" color="text.secondary">{!online ? 'Đang ngoại tuyến' : !canSend ? 'Cần tiếp quản hoặc quyền gửi hợp lệ' : 'Tin gửi qua API, không dùng HTML từ AI'}</Typography><Button type="submit" variant="contained" endIcon={<SendRounded />} disabled={!canSend || !text.trim() || send.pending || note.pending}>{internal ? 'Lưu ghi chú' : 'Gửi trả lời'}</Button></Stack></Box></Panel>
 <Panel title="Bối cảnh khách hàng"><Box sx={{ p: 2 }}><DetailLine label="Trạng thái"><Status value={conversation.status}/></DetailLine><DetailLine label="Kênh">{metadata.data?.data.channels.find(ch => ch.id === conversation.channelId)?.displayName || conversation.channelId}</DetailLine><RouteLink to={`/s/${shop.id}/customers/${conversation.customerId}`}>Hồ sơ khách</RouteLink><RouteLink to={`/s/${shop.id}/orders/new?customerId=${conversation.customerId}&conversationId=${conversation.id}`}>Tạo đơn từ hội thoại</RouteLink><Divider sx={{ my: 2 }}/><TextField label="Giao cho nhân viên" select fullWidth size="small" value={assignee} onChange={e => setAssignee(e.target.value)}><MenuItem value="">Chọn nhân viên</MenuItem>{metadata.data?.data.assignees.map(u => <MenuItem key={u.userId} value={u.userId}>{u.displayName}</MenuItem>)}</TextField><MutationButton permission="conversations.assign" disabled={!assignee} busy={assign.pending} onClick={() => { void assign.execute({ path: { conversationId }, body: { userId: assignee, expectedVersion: conversation.version } }).catch(() => undefined); }}>Phân công</MutationButton><ErrorNotice error={assign.error}/><Alert severity="info" sx={{ mt: 2 }}>Ảnh/tin thoại chỉ bật khi hợp đồng kênh xác nhận hỗ trợ. Phiên bản API hiện tại của ô soạn chỉ gửi văn bản.</Alert></Box></Panel>
 <ConfirmDialog open={!!action} title={action === 'takeover' ? 'Tiếp quản cuộc trò chuyện' : action === 'release' ? 'Trả cuộc trò chuyện về bot' : 'Đánh dấu đã giải quyết'} description={action === 'takeover' ? 'Các câu trả lời AI đang chờ phải bị chặn trước khi gửi.' : 'Hệ thống kiểm lại quyền và phiên bản hội thoại.'} requireReason onClose={() => setAction(null)} busy={takeover.pending || release.pending || resolve.pending} error={takeover.error || release.error || resolve.error} onConfirm={reason => { const op = action === 'takeover' ? takeover : action === 'release' ? release : resolve; return op.execute({ path: { conversationId }, version: conversation.version, body: { expectedVersion: conversation.version, reason } }); }}/>
 <EditDialog open={!!ratingMessage} title="Đánh giá câu trả lời" onClose={() => setRatingMessage(null)} busy={feedback.pending} actions={<Button variant="contained" disabled={feedback.pending} onClick={async () => { if (!ratingMessage)
            return; try {
            await feedback.execute({ body: { conversationId, messageId: ratingMessage.id, rating, correction } });
            setRatingMessage(null);
        }
        catch { /* visible */ } }}>Lưu phản hồi</Button>}><ErrorNotice error={feedback.error}/><Stack gap={2}><Typography sx={{ whiteSpace: 'pre-wrap' }}>{ratingMessage?.text}</Typography><TextField label="Đánh giá" select value={rating} onChange={e => setRating(e.target.value as typeof rating)}><MenuItem value="positive">Hữu ích</MenuItem><MenuItem value="negative">Cần sửa</MenuItem></TextField><TextField label="Nội dung đề xuất sửa" multiline minRows={4} value={correction} onChange={e => setCorrection(e.target.value)}/><Alert severity="info">Phản hồi không tự trở thành kiến thức đã xuất bản. Cần người duyệt và kiểm thử.</Alert></Stack></EditDialog></Box>}</QueryState>;
}
