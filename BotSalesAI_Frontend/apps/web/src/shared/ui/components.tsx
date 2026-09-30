import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, InputAdornment, LinearProgress, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import type { Page, Money } from '@botsales/contracts';
import { colors } from '@botsales/tokens';
import { ApiError, UnknownResultError, errorMessage } from '../api/errors';
import { formatMoney } from '../model/format';
import { label } from '../model/labels';
import { useScope, useCan } from '../model/scope';
export function PageHeader({ title, subtitle, actions, eyebrow }: {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    eyebrow?: string;
}) {
    return <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} gap={2} sx={{ mb: 3 }}>
  <Box>{eyebrow && <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: 1.3 }}>{eyebrow}</Typography>}<Typography component="h1" variant="h4">{title}</Typography>{subtitle && <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>{subtitle}</Typography>}</Box>
  <Stack direction="row" gap={1} flexWrap="wrap">{actions}</Stack>
 </Stack>;
}
export function Panel({ title, subtitle, children, action, sx }: {
    title?: string;
    subtitle?: string;
    children: ReactNode;
    action?: ReactNode;
    sx?: object;
}) {
    return <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', ...sx }}>{title && <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2.5 }}><Box><Typography variant="h6">{title}</Typography>{subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>{subtitle}</Typography>}</Box>{action}</Stack>}{children}</Paper>;
}
export function Stat({ title, value, note, accent = false, icon }: {
    title: string;
    value: ReactNode;
    note?: string;
    accent?: boolean;
    icon?: ReactNode;
}) {
    return <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, minWidth: 0 }}><Stack direction="row" justifyContent="space-between" gap={1}><Typography color="text.secondary" variant="body2">{title}</Typography><Box sx={{ color: accent ? 'primary.main' : 'text.secondary' }}>{icon}</Box></Stack><Typography variant="h4" sx={{ mt: 1.3, fontVariantNumeric: 'tabular-nums', color: accent ? 'primary.main' : undefined, overflowWrap: 'anywhere' }}>{value}</Typography><Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{note}</Typography></Paper>;
}
export function Stats({ children }: {
    children: ReactNode;
}) { return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 2, mb: 3 }}>{children}</Box>; }
export function Amount({ value }: {
    value: Money | null | undefined;
}) { return <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatMoney(value)}</Box>; }
const positive = new Set(['active', 'completed', 'succeeded', 'connected', 'published', 'approved', 'received', 'settled', 'verified', 'posted', 'delivered', 'passed', 'healthy']);
const danger = new Set(['failed', 'rejected', 'cancelled', 'revoked', 'denied', 'error']);
const warn = new Set(['unknown', 'blocked', 'degraded', 'pending_approval', 'partial', 'part_received', 'unconfigured', 'provisional', 'incomplete', 'paused', 'expired']);
export function Status({ value }: {
    value: string;
}) {
    const palette = positive.has(value) ? [colors.success, colors.successSurface] : danger.has(value) ? [colors.danger, colors.dangerSurface] : warn.has(value) ? [colors.warning, colors.warningSurface] : [colors.info, colors.infoSurface];
    return <Chip label={label(value)} sx={{ color: palette[0], background: palette[1], maxWidth: '100%' }}/>;
}
export interface Column<T> {
    key: string;
    label: string;
    render: (row: T) => ReactNode;
    align?: 'left' | 'right' | 'center';
}
export function DataTable<T>({ rows, columns, rowKey, empty = 'Chưa có dữ liệu phù hợp.', label: tableLabel = 'Dữ liệu' }: {
    rows: readonly T[];
    columns: readonly Column<T>[];
    rowKey: (row: T) => string;
    empty?: string;
    label?: string;
}) {
    return <TableContainer sx={{ maxWidth: '100%' }} tabIndex={0} aria-label={tableLabel}><Table size="small"><TableHead><TableRow>{columns.map(c => <TableCell key={c.key} align={c.align}>{c.label}</TableCell>)}</TableRow></TableHead><TableBody>{rows.map(row => <TableRow key={rowKey(row)} hover>{columns.map(c => <TableCell key={c.key} align={c.align}>{c.render(row)}</TableCell>)}</TableRow>)}{rows.length === 0 && <TableRow><TableCell colSpan={columns.length}><Empty text={empty}/></TableCell></TableRow>}</TableBody></Table></TableContainer>;
}
export function Empty({ text, action }: {
    text: string;
    action?: ReactNode;
}) { return <Stack alignItems="center" gap={2} sx={{ py: 6, px: 2 }}><Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: colors.raised, display: 'grid', placeItems: 'center', color: 'text.secondary' }}>—</Box><Typography color="text.secondary" textAlign="center">{text}</Typography>{action}</Stack>; }
export function QueryState({ query, children }: {
    query: {
        isPending: boolean;
        isError: boolean;
        error: Error | null;
        refetch: () => unknown;
    };
    children: ReactNode;
}) {
    if (query.isPending)
        return <Stack gap={2} aria-label="Đang tải"><Skeleton height={60}/><Skeleton variant="rounded" height={260}/></Stack>;
    if (query.isError)
        return <Alert severity={query.error instanceof ApiError && query.error.status === 403 ? 'warning' : 'error'} action={<Button onClick={() => query.refetch()} color="inherit">Thử lại</Button>}>{errorMessage(query.error)}</Alert>;
    return <>{children}</>;
}
export function ErrorNotice({ error }: {
    error: unknown;
}) {
    if (!error)
        return null;
    return <Alert severity={error instanceof UnknownResultError ? 'warning' : 'error'} sx={{ mb: 2 }} role="alert">{errorMessage(error)}{error instanceof ApiError && error.problem?.errors?.map(e => <div key={e.path}>{e.path}: {e.message}</div>)}{error instanceof UnknownResultError && error.commandId && <div>Mã lệnh cần kiểm tra: {error.commandId}</div>}</Alert>;
}
export function Toolbar({ placeholder = 'Tìm kiếm...', extra }: {
    placeholder?: string;
    extra?: ReactNode;
}) {
    const [params, setParams] = useSearchParams();
    const [draft, setDraft] = useState(params.get('q') || '');
    useEffect(() => { setDraft(params.get('q') || ''); }, [params]);
    return <Stack component="form" onSubmit={e => { e.preventDefault(); const next = new URLSearchParams(params); if (draft)
        next.set('q', draft);
    else
        next.delete('q'); next.delete('cursor'); setParams(next); }} direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ p: 2 }}>
 <TextField size="small" value={draft} onChange={e => setDraft(e.target.value)} placeholder={placeholder} inputProps={{ 'aria-label': placeholder }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small"/></InputAdornment> } }} sx={{ minWidth: 240, flex: 1 }}/><Button type="submit" variant="outlined">Tìm kiếm</Button>{extra}</Stack>;
}
export function Pager({ page }: {
    page?: Page;
}) {
    const [params, setParams] = useSearchParams();
    if (!page)
        return null;
    return <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2 }}><Typography variant="caption" color="text.secondary">{typeof page.total === 'number' ? `${page.total} kết quả` : `Tối đa ${page.limit} dòng / trang`}</Typography><Stack direction="row" gap={1}><Button size="small" disabled={!params.has('cursor')} onClick={() => { const next = new URLSearchParams(params); next.delete('cursor'); setParams(next); }}>Đầu danh sách</Button><Button size="small" disabled={!page.hasMore} onClick={() => { const next = new URLSearchParams(params); if (page.nextCursor)
        next.set('cursor', page.nextCursor); setParams(next); }}>Trang tiếp</Button></Stack></Stack>;
}
export function RouteLink({ to, children }: {
    to: string;
    children: ReactNode;
}) { return <Button component={RouterLink} to={to} size="small" endIcon={<ArrowForwardRounded fontSize="small"/>}>{children}</Button>; }
export function MutationButton({ permission, allowedActions, action, busy, children, ...props }: {
    permission: string | null;
    allowedActions?: string[];
    action?: string;
    busy?: boolean;
    children: ReactNode;
    onClick?: () => void;
    variant?: 'contained' | 'outlined' | 'text';
    color?: 'primary' | 'error' | 'inherit';
    disabled?: boolean;
    type?: 'button' | 'submit';
}) {
    const can = useCan(permission, allowedActions, action);
    const { online } = useScope();
    if (!can)
        return null;
    return <Button {...props} disabled={props.disabled || busy || !online} startIcon={busy ? <CircularProgress size={16}/> : undefined}>{children}</Button>;
}
export function EditDialog({ open, title, onClose, children, actions, busy = false }: {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
    actions: ReactNode;
    busy?: boolean;
}) {
    return <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="edit-dialog-title"><DialogTitle id="edit-dialog-title">{title}<IconButton aria-label="Đóng" disabled={busy} onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}><CloseRounded /></IconButton></DialogTitle>{busy && <LinearProgress />}<DialogContent dividers>{children}</DialogContent><DialogActions sx={{ p: 2 }}><Button onClick={onClose} disabled={busy}>Hủy</Button>{actions}</DialogActions></Dialog>;
}
export function ConfirmDialog({ open, title, description, onClose, onConfirm, busy, error, requireReason = false }: {
    open: boolean;
    title: string;
    description: string;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<unknown>;
    busy?: boolean;
    error?: unknown;
    requireReason?: boolean;
}) {
    const [reason, setReason] = useState('');
    return <EditDialog open={open} title={title} onClose={onClose} busy={busy} actions={<Button variant="contained" disabled={busy || (requireReason && reason.trim().length < 5)} onClick={() => { void onConfirm(reason).then(() => { setReason(''); onClose(); }).catch(() => undefined); }}>Xác nhận</Button>}><ErrorNotice error={error}/><Typography sx={{ mb: 2 }}>{description}</Typography>{requireReason && <TextField label="Lý do (ít nhất 5 ký tự)" value={reason} onChange={e => setReason(e.target.value)} fullWidth multiline minRows={2}/>}</EditDialog>;
}
export function DetailLine({ label: caption, children }: {
    label: string;
    children: ReactNode;
}) { return <><Stack direction="row" justifyContent="space-between" gap={2} sx={{ py: 1.6 }}><Typography color="text.secondary">{caption}</Typography><Box sx={{ textAlign: 'right', overflowWrap: 'anywhere' }}>{children}</Box></Stack><Divider /></>; }
