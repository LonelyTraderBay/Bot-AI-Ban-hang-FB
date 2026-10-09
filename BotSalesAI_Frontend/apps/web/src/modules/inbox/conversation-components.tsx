import {label as businessLabel} from '@/shared/model/labels';
import { useEffect, useRef, useState } from 'react';
import { visualSx } from '@/shared/ui/visual';
import type { ChangeEvent, ReactNode } from 'react';
import { Alert, Box, Button, Chip, Divider, FormControlLabel, Checkbox, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AttachFileRounded from '@mui/icons-material/AttachFileRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import SendRounded from '@mui/icons-material/SendRounded';
import type { Conversation, Message, MessageAttachment } from '@botsales/contracts';
import { colors } from '@botsales/tokens';
import { request } from '@/shared/api/client';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useCan, useScope } from '@/shared/model/scope';
import { limitCodePoints, dateTime } from '@/shared/model/format';
import { DetailLine, ErrorNotice, MutationButton, Panel, RouteLink, Status } from '@/shared/ui/components';
import { layoutSx } from '@/shared/ui/layout';

type DraftAttachment = {
    localId: string;
    file: File;
    previewUrl: string | null;
    uploadIntentId: string;
    fileId?: string;
    status: 'uploading' | 'ready' | 'not_ready' | 'error';
    error?: string;
};

function revokeObjectUrl(url: string | null | undefined) {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

export function ConversationComposer({ conversation }: {
    conversation: Conversation;
}) {
    const { session, online } = useScope();
    const canReply = useCan('conversations.reply');
    const send = useCommand('sendMessage', ['listMessages', 'getConversation', 'listConversations']);
    const note = useCommand('addInternalNote', ['listMessages']);
    const upload = useCommand('uploadFile', []);
    const metadata = useApi('getInboxMetadata');
    const [text, setText] = useState('');
    const [internal, setInternal] = useState(false);
    const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
    const [mediaError, setMediaError] = useState('');
    const revision = useRef(0);
    const currentConversation = useRef(conversation.id);
    const attachmentInput = useRef<HTMLInputElement>(null);
    const attachmentRef = useRef<DraftAttachment[]>([]);
    const alive = useRef(false);
    currentConversation.current = conversation.id;
    attachmentRef.current = attachments;
    const channel = metadata.data?.data.channels.find(item => item.id === conversation.channelId);
    const mediaPolicy = channel?.mediaPolicy;
    const mediaSupported = Boolean(mediaPolicy?.allowedMimeTypes.length && mediaPolicy.maxAttachmentCount > 0 && mediaPolicy.maxFileSizeBytes > 0);
    const canSend = canReply && online && (internal || (
        conversation.mode === 'human' &&
        conversation.assignedUserId === session.user.id &&
        conversation.sendEligibility.state === 'allowed'
    ));

    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
            for (const attachment of attachmentRef.current) revokeObjectUrl(attachment.previewUrl);
        };
    }, []);

    const updateAttachments = (update: (current: DraftAttachment[]) => DraftAttachment[]) => {
        const next = update(attachmentRef.current);
        attachmentRef.current = next;
        setAttachments(next);
    };

    const updateAttachment = (localId: string, patch: Partial<DraftAttachment>) => {
        updateAttachments(current => current.map(item => item.localId === localId ? { ...item, ...patch } : item));
    };

    const uploadAttachment = async (attachment: DraftAttachment) => {
        if (!mediaPolicy || !alive.current || currentConversation.current !== conversation.id) return;
        updateAttachment(attachment.localId, { status: 'uploading', error: undefined });
        const form = new FormData();
        form.append('file', attachment.file);
        form.append('purpose', 'conversation_media');
        form.append('resourceId', conversation.id);
        try {
            const result = await upload.execute({ form, idempotencyKey: attachment.uploadIntentId });
            if (!alive.current || currentConversation.current !== conversation.id) return;
            if (result.data.status !== 'ready') {
                updateAttachment(attachment.localId, { fileId: result.data.id, status: 'not_ready', error: 'Tệp chưa qua kiểm tra mô phỏng nên chưa thể gửi.' });
                return;
            }
            updateAttachment(attachment.localId, { fileId: result.data.id, status: 'ready' });
        } catch (error) {
            if (!alive.current || currentConversation.current !== conversation.id) return;
            updateAttachment(attachment.localId, { status: 'error', error: error instanceof Error ? error.message : 'Tải tệp chưa hoàn tất.' });
        }
    };

    const chooseFiles = async (event: ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(event.currentTarget.files || []);
        event.currentTarget.value = '';
        setMediaError('');
        if (!mediaPolicy || !mediaSupported) {
            setMediaError('Kênh này chưa công bố chính sách media; không thể đính kèm tệp.');
            return;
        }
        let remaining = Math.max(0, mediaPolicy.maxAttachmentCount - attachmentRef.current.length);
        const accepted: DraftAttachment[] = [];
        for (const file of selected) {
            if (remaining <= 0) {
                setMediaError(`Mỗi tin nhắn gửi tối đa ${mediaPolicy.maxAttachmentCount} tệp theo chính sách kênh.`);
                continue;
            }
            if (!mediaPolicy.allowedMimeTypes.includes(file.type)) {
                setMediaError(`Định dạng ${file.type || 'không xác định'} không được kênh hỗ trợ.`);
                continue;
            }
            if (file.size <= 0 || file.size > mediaPolicy.maxFileSizeBytes) {
                setMediaError(`Mỗi tệp phải lớn hơn 0 và không vượt ${Math.ceil(mediaPolicy.maxFileSizeBytes / 1048576)} MB.`);
                continue;
            }
            accepted.push({
                localId: crypto.randomUUID(), file,
                previewUrl: typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null,
                uploadIntentId: crypto.randomUUID(), status: 'uploading'
            });
            remaining -= 1;
        }
        if (accepted.length) {
            revision.current += accepted.length;
            updateAttachments(current => [...current, ...accepted]);
            for (const attachment of accepted) await uploadAttachment(attachment);
        }
    };

    const removeAttachment = (attachment: DraftAttachment) => {
        if (attachment.status === 'uploading') return;
        revokeObjectUrl(attachment.previewUrl);
        revision.current += 1;
        updateAttachments(current => current.filter(item => item.localId !== attachment.localId));
    };

    const submit = async () => {
        const submittedText = text.trim();
        const submittedAttachments = internal ? [] : attachmentRef.current.filter(item => item.status === 'ready' && item.fileId);
        const hasInvalidAttachment = !internal && attachmentRef.current.some(item => item.status !== 'ready');
        if (!canSend || send.pending || note.pending || send.unresolved || note.unresolved || (!internal && hasInvalidAttachment)) return;
        if (internal ? !submittedText : !submittedText && submittedAttachments.length === 0) return;
        const submittedRevision = revision.current;
        const submittedConversation = conversation.id;
        try {
            if (internal) {
                await note.execute({ path: { conversationId: conversation.id }, body: { text: submittedText } });
            } else {
                await send.execute({
                    path: { conversationId: conversation.id },
                    body: {
                        clientMessageId: crypto.randomUUID(),
                        ...(submittedText ? { text: submittedText } : {}),
                        ...(submittedAttachments.length ? { fileIds: submittedAttachments.map(item => item.fileId!) } : {}),
                        expectedConversationVersion: conversation.version,
                    },
                });
            }
            if (currentConversation.current !== submittedConversation) return;
            // `text` is the submit render's snapshot. Only clear when no newer
            // text, mode, or attachment edit has advanced the draft revision.
            if (revision.current === submittedRevision && text.trim() === submittedText) setText('');
            if (submittedAttachments.length) {
                const submittedIds = new Set(submittedAttachments.map(item => item.localId));
                for (const item of attachmentRef.current) if (submittedIds.has(item.localId)) revokeObjectUrl(item.previewUrl);
                updateAttachments(current => current.filter(item => !submittedIds.has(item.localId)));
            }
            if (revision.current === submittedRevision) setMediaError('');
        } catch {
            // Unknown sends preserve text and media; the command hook blocks a blind retry.
        }
    };

    const readyCount = attachments.filter(item => item.status === 'ready' && item.fileId).length;
    const sendingBlocked = internal
        ? !text.trim() || note.pending || note.unresolved
        : (!text.trim() && readyCount === 0) || send.pending || send.unresolved || attachments.some(item => item.status !== 'ready');

    return (
        <Box
            component="form"
            data-draft-clean={text.trim() || attachments.length ? undefined : 'true'}
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
            {!internal && mediaSupported && (
                <Stack sx={[layoutSx.inbox.messageContentGap, { minWidth: 0 }]}>
                    <input
                        ref={attachmentInput}
                        hidden
                        type="file"
                        multiple
                        accept={mediaPolicy?.allowedMimeTypes.join(',')}
                        aria-label="Chọn ảnh, tin thoại hoặc tệp"
                        data-testid="inbox-attachment-input"
                        disabled={!canSend || upload.pending}
                        onChange={event => void chooseFiles(event)}
                    />
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AttachFileRounded />}
                        disabled={!canSend || upload.pending || attachments.length >= (mediaPolicy?.maxAttachmentCount || 0)}
                        onClick={() => attachmentInput.current?.click()}
                    >
                        Đính kèm
                    </Button>
                    {mediaPolicy && <Typography variant="caption" color="text.secondary">Tối đa {mediaPolicy.maxAttachmentCount} tệp, mỗi tệp {Math.ceil(mediaPolicy.maxFileSizeBytes / 1048576)} MB; chỉ gửi sau khi kiểm tra mô phỏng đạt.</Typography>}
                    {mediaError && <Alert severity="warning" onClose={() => setMediaError('')}>{mediaError}</Alert>}
                    {attachments.map(attachment => (
                        <Stack key={attachment.localId} direction="row" alignItems="center" sx={[layoutSx.inbox.composerActionGap, layoutSx.surface.compactInset, { minWidth: 0, border: 1, borderColor: 'divider', borderRadius: visualSx.radius.control }]}>
                            {attachment.previewUrl && attachment.file.type.startsWith('image/')
                                ? <Box component="img" src={attachment.previewUrl} alt={`Xem trước ${attachment.file.name}`} sx={{ width: 56, height: 56, objectFit: 'cover', borderRadius: visualSx.radius.control, flexShrink: 0 }} />
                                : attachment.previewUrl && attachment.file.type.startsWith('audio/')
                                    ? <audio controls preload="metadata" src={attachment.previewUrl} aria-label={`Nghe thử ${attachment.file.name}`} style={{ maxWidth: 'min(260px, 52vw)' }} />
                                    : <AttachFileRounded aria-hidden="true" />}
                            <Stack sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{attachment.file.name}</Typography>
                                <Typography role="status" variant="caption" color={attachment.status === 'error' || attachment.status === 'not_ready' ? 'error.main' : 'text.secondary'}>
                                    {attachment.status === 'uploading' ? 'Đang tải và kiểm tra tệp…' : attachment.status === 'ready' ? 'Sẵn sàng gửi · kiểm tra mô phỏng đạt' : attachment.error || 'Chưa thể gửi tệp'}
                                </Typography>
                                {attachment.status === 'error' && <Button size="small" onClick={() => void uploadAttachment(attachment)}>Thử tải lại</Button>}
                            </Stack>
                            <IconButton aria-label={`Gỡ ${attachment.file.name}`} disabled={attachment.status === 'uploading'} onClick={() => removeAttachment(attachment)}>
                                <CloseRounded />
                            </IconButton>
                        </Stack>
                    ))}
                </Stack>
            )}
            {!internal && !mediaSupported && <Alert severity="info">Kênh này chưa khai báo loại tệp được hỗ trợ; bạn vẫn có thể gửi văn bản.</Alert>}
            </Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={[layoutSx.inbox.composerControlsBeforeGap, layoutSx.inbox.composerActionGap, { flexShrink: 0 }]}>
                <Typography variant="caption" color="text.secondary">
                    {!online ? 'Đang ngoại tuyến' : !canSend ? 'Cần tiếp quản hoặc quyền gửi hợp lệ' : 'Tin gửi qua API; trạng thái được xác nhận từ phản hồi lệnh'}
                </Typography>
                <Button
                    type="submit"
                    variant="contained"
                    endIcon={<SendRounded />}
                    disabled={!canSend || sendingBlocked}
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
        const messageText = (message.text || '').replace(/\s+/g, ' ').trim();
        const preview = Array.from(messageText).slice(0, 64).join('');
        const messagePreview = messageText ? preview === messageText ? messageText : `${preview.trimEnd()}…` : `${message.attachments?.length || 0} tệp đính kèm`;

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
                        {messageText && <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.text}</Typography>}
                        {message.attachments?.map(attachment => <MessageAttachmentView key={attachment.fileId} attachment={attachment} />)}
                    </Stack>
                    {message.sourceEvidence.length > 0 && (
                        <Stack direction="row" sx={[layoutSx.surface.compactContentGap, { flexWrap: 'wrap' }]} aria-label="Nguồn tham chiếu">
                            {message.sourceEvidence.map((reference, index) => (
                                <Chip key={`${reference.type}:${reference.id}:${index}`} size="small" variant="outlined" label={`${businessLabel(reference.type)} · ${reference.id}`} title={reference.type} />
                            ))}
                        </Stack>
                    )}
                    <Stack direction="row" alignItems="center" sx={[layoutSx.inbox.composerActionGap, { flexWrap: 'wrap' }]}>
                        <Typography variant="caption" color="text.secondary">{dateTime(message.createdAt, timezone)} · {businessLabel(message.status, 'message')}</Typography>
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

function MessageAttachmentView({ attachment }: { attachment: MessageAttachment }) {
    const { shop, membership } = useScope();
    const [readUrl, setReadUrl] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;
        let ownedUrl: string | null = null;
        setReadUrl(null);
        setFailed(false);
        void request('getFile', { path: { shopId: shop.id, fileId: attachment.fileId }, signal: controller.signal })
            .then(response => {
                const result = response.data;
                if (result.status !== 'ready' || !result.readUrl) throw new Error('FILE_NOT_READY');
                if (!active) {
                    revokeObjectUrl(result.readUrl);
                    return;
                }
                ownedUrl = result.readUrl;
                setReadUrl(result.readUrl);
            })
            .catch(() => {
                if (active && !controller.signal.aborted) setFailed(true);
            });
        return () => {
            active = false;
            controller.abort();
            revokeObjectUrl(ownedUrl);
        };
    }, [attachment.fileId, membership.permissionVersion, shop.id]);

    if (failed) return <Typography role="status" variant="caption" color="text.secondary">Không thể đọc tệp này theo quyền hoặc phạm vi hiện tại.</Typography>;
    if (!readUrl) return <Typography role="status" variant="caption" color="text.secondary">Đang tải tệp an toàn…</Typography>;
    if (attachment.mimeType.startsWith('image/')) return <Box component="img" src={readUrl} alt={attachment.name} sx={{ display: 'block', maxWidth: 'min(100%, 360px)', maxHeight: 280, objectFit: 'contain', borderRadius: visualSx.radius.control }} />;
    if (attachment.mimeType.startsWith('audio/')) return <audio controls preload="metadata" src={readUrl} aria-label={`Phát ${attachment.name}`} style={{ maxWidth: '100%' }} />;
    return <a href={readUrl} download={attachment.name}>{attachment.name} · tải tệp</a>;
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
                    {children}
                </Box>
            </Panel>
        </Box>
    );
}
