import { useRef, useState } from 'react';
import { visualSx } from '@/shared/ui/visual';
import type { ReactNode } from 'react';
import { Alert, Box, Button, Chip, Divider, FormControlLabel, Checkbox, MenuItem, Stack, TextField, Typography } from '@mui/material';
import SendRounded from '@mui/icons-material/SendRounded';
import type { Conversation, Message } from '@botsales/contracts';
import { colors } from '@botsales/tokens';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useCan, useScope } from '@/shared/model/scope';
import { limitCodePoints, dateTime } from '@/shared/model/format';
import { DetailLine, ErrorNotice, MutationButton, Panel, RouteLink, Status } from '@/shared/ui/components';
import { layoutSx } from '@/shared/ui/layout';

export function ConversationComposer({ conversation }: {
    conversation: Conversation;
}) {
    const { session, online } = useScope();
    const canReply = useCan('conversations.reply');
    const send = useCommand('sendMessage', ['listMessages', 'getConversation', 'listConversations']);
    const note = useCommand('addInternalNote', ['listMessages']);
    const [text, setText] = useState('');
    const [internal, setInternal] = useState(false);
    const revision = useRef(0);
    const currentConversation = useRef(conversation.id);
    currentConversation.current = conversation.id;
    const canSend = canReply && online && (internal || (
        conversation.mode === 'human' &&
        conversation.assignedUserId === session.user.id &&
        conversation.sendEligibility.state === 'allowed'
    ));

    const submit = async () => {
        if (!canSend || !text.trim() || send.pending || note.pending || send.unresolved || note.unresolved) return;
        const submittedRevision = revision.current;
        const submittedConversation = conversation.id;
        try {
            if (internal) {
                await note.execute({ path: { conversationId: conversation.id }, body: { text: text.trim() } });
            } else {
                await send.execute({
                    path: { conversationId: conversation.id },
                    body: {
                        clientMessageId: crypto.randomUUID(),
                        text: text.trim(),
                        expectedConversationVersion: conversation.version,
                    },
                });
            }
            if (revision.current === submittedRevision && currentConversation.current === submittedConversation) setText('');
        } catch {
            // Unknown sends preserve text and disable retries in the command hook.
        }
    };

    return (
        <Box
            component="form"
            data-draft-clean={text ? undefined : 'true'}
            onSubmit={event => {
                event.preventDefault();
                void submit();
            }}
            sx={[layoutSx.inbox.composerInset, { borderTop: 1, borderColor: 'divider', minHeight: 0, display: 'flex', flexDirection: 'column' }]}
        >
            <Box data-testid="inbox-composer-body" sx={{ minHeight: 0, minWidth: 0, flex: { xl: '1 1 auto' }, overflowY: { xl: 'auto' } }}>
            <ErrorNotice error={send.error || note.error} />
            <FormControlLabel
                label="Ghi chú nội bộ (không gửi khách)"
                control={<Checkbox checked={internal} onChange={event => { revision.current += 1; setInternal(event.target.checked); }} disabled={!canReply} />}
            />
            <TextField
                fullWidth
                multiline
                minRows={2}
                maxRows={7}
                label={internal ? 'Ghi chú cho nhóm' : 'Nội dung trả lời khách'}
                value={text}
                onChange={event => { revision.current += 1; setText(limitCodePoints(event.target.value, internal ? 10000 : 20000)); }}
                disabled={!canReply}
            />
            </Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={[layoutSx.inbox.composerControlsBeforeGap, layoutSx.inbox.composerActionGap, { flexShrink: 0 }]}>
                <Typography variant="caption" color="text.secondary">
                    {!online ? 'Đang ngoại tuyến' : !canSend ? 'Cần tiếp quản hoặc quyền gửi hợp lệ' : 'Tin gửi qua API, không dùng HTML từ AI'}
                </Typography>
                <Button
                    type="submit"
                    variant="contained"
                    endIcon={<SendRounded />}
                    disabled={!canSend || !text.trim() || send.pending || note.pending || send.unresolved || note.unresolved}
                >
                    {internal ? 'Lưu ghi chú' : 'Gửi trả lời'}
                </Button>
            </Stack>
        </Box>
    );
}

export function ConversationMessageList({ messages, timezone, onRate }: {
    messages: Message[];
    timezone: string;
    onRate: (message: Message) => void;
}) {
    return messages.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(message => {
        const senderLabel = message.direction === 'internal' ? 'Ghi chú nội bộ' : message.senderKind === 'customer' ? 'Khách' : message.senderKind === 'bot' ? 'Trợ lý AI' : 'Nhân viên';
        const messageText = message.text.replace(/\s+/g, ' ').trim();
        const preview = Array.from(messageText).slice(0, 64).join('');
        const messagePreview = preview === messageText ? messageText : `${preview.trimEnd()}…`;

        return <Stack key={message.id} alignItems={message.direction === 'inbound' ? 'flex-start' : 'flex-end'}>
            <Box data-testid="inbox-message-bubble" sx={[layoutSx.inbox.bubbleInset, {
                maxWidth: '88%',
                borderRadius: visualSx.radius.bubble,
                bgcolor: message.direction === 'internal' ? colors.selected : message.direction === 'inbound' ? colors.surface : colors.raised,
                border: message.direction === 'internal' ? '1px solid' : 'none',
                borderColor: colors.heroBorder,
            }]}>
                <Stack data-testid="inbox-message-meta-flow" sx={layoutSx.inbox.messageMetaGap}>
                    <Stack data-testid="inbox-message-content-flow" sx={layoutSx.inbox.messageContentGap}>
                        <Typography variant="caption" color="text.secondary">
                            {senderLabel}
                        </Typography>
                        <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.text}</Typography>
                    </Stack>
                    {message.sourceEvidence.length > 0 && (
                        <Stack direction="row" sx={[layoutSx.surface.compactContentGap, { flexWrap: 'wrap' }]} aria-label="Nguồn tham chiếu">
                            {message.sourceEvidence.map((reference, index) => (
                                <Chip key={`${reference.type}:${reference.id}:${index}`} size="small" variant="outlined" label={`${reference.type} · ${reference.id}`} />
                            ))}
                        </Stack>
                    )}
                    <Stack direction="row" alignItems="center" sx={[layoutSx.inbox.composerActionGap, { flexWrap: 'wrap' }]}>
                        <Typography variant="caption" color="text.secondary">{dateTime(message.createdAt, timezone)} · {message.status}</Typography>
                        <Button
                            size="small"
                            aria-label={`Đánh giá tin nhắn của ${senderLabel} lúc ${dateTime(message.createdAt, timezone)}: ${messagePreview}`}
                            onClick={() => onRate(message)}
                        >
                            Đánh giá
                        </Button>
                    </Stack>
                </Stack>
            </Box>
        </Stack>;
    });
}

export function ConversationContextPanel({ conversation, children }: {
    conversation: Conversation;
    children?: ReactNode;
}) {
    const { shop } = useScope();
    const canReadCustomers = useCan('customers.read');
    const canCreateOrders = useCan('orders.write');
    const metadata = useApi('getInboxMetadata');
    const assign = useCommand('assignConversation', ['getConversation', 'listConversations']);
    const [assignee, setAssignee] = useState('');

    return (
        <Box
            data-testid="inbox-context-panel"
            component="aside"
            aria-label="Bối cảnh khách hàng"
            tabIndex={0}
            sx={{ minWidth: 0, minHeight: 0, maxHeight: { xl: 650 }, overflowY: { xl: 'auto' } }}
        >
            <Panel title="Bối cảnh khách hàng">
                <Box data-testid="inbox-context-content" sx={layoutSx.inbox.contextInset}>
                    <DetailLine label="Trạng thái"><Status value={conversation.status} /></DetailLine>
                    <DetailLine label="Kênh">
                        {metadata.data?.data.channels.find(channel => channel.id === conversation.channelId)?.displayName || conversation.channelId}
                    </DetailLine>
                    {canReadCustomers
                        ? <RouteLink to={`/s/${shop.id}/customers/${conversation.customerId}`}>Hồ sơ khách</RouteLink>
                        : <Typography variant="caption" color="text.secondary">Thông tin khách bị ẩn theo quyền hiện tại.</Typography>}
                    {canCreateOrders && (
                        <RouteLink to={`/s/${shop.id}/orders/new?customerId=${conversation.customerId}&conversationId=${conversation.id}`}>
                            Tạo đơn từ hội thoại
                        </RouteLink>
                    )}
                    <Divider sx={[layoutSx.surface.sectionBefore, layoutSx.notice.afterGap]} />
                    <TextField label="Giao cho nhân viên" select fullWidth size="small" value={assignee} onChange={event => setAssignee(event.target.value)}>
                        <MenuItem value="">Chọn nhân viên</MenuItem>
                        {metadata.data?.data.assignees.map(user => <MenuItem key={user.userId} value={user.userId}>{user.displayName}</MenuItem>)}
                    </TextField>
                    <MutationButton
                        permission="conversations.assign"
                        disabled={!assignee}
                        busy={assign.pending}
                        onClick={() => {
                            void assign.execute({
                                path: { conversationId: conversation.id },
                                body: { userId: assignee, expectedVersion: conversation.version },
                            }).catch(() => undefined);
                        }}
                    >
                        Phân công
                    </MutationButton>
                    <ErrorNotice error={assign.error} />
                    <Alert severity="info" sx={layoutSx.surface.sectionBefore}>
                        Ảnh/tin thoại chỉ bật khi hợp đồng kênh xác nhận hỗ trợ. Phiên bản API hiện tại của ô soạn chỉ gửi văn bản.
                    </Alert>
                    {children}
                </Box>
            </Panel>
        </Box>
    );
}
