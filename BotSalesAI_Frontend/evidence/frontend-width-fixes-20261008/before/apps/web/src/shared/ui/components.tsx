import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { visualSx } from './visual';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, AlertTitle, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, IconButton, InputAdornment, LinearProgress, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import { operations } from '@botsales/contracts';
import type { Page, Money } from '@botsales/contracts';
import type { QueryOperationId } from '../api/client';
import { colors, tokens } from '@botsales/tokens';
import { layoutSx } from './layout';
import { ApiError, UnknownResultError, errorMessage } from '../api/errors';
import { codePointLength, formatMoney } from '../model/format';
import { label } from '../model/labels';
import { useScope, useCan } from '../model/scope';
export function PageHeader({ title, subtitle, actions, eyebrow }: {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    eyebrow?: string;
}) {
    return <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} sx={[layoutSx.pageHeader.columnsGap, layoutSx.pageHeader.afterGap]}>
        <Box sx={{ minWidth: 0 }}>{eyebrow && <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: visualSx.typography.letterSpacing.overline }}>{eyebrow}</Typography>}<Typography component="h1" variant="h4">{title}</Typography>{subtitle && <Typography color="text.secondary" sx={[layoutSx.pageHeader.titleDescriptionGap, { maxWidth: 760 }]}>{subtitle}</Typography>}</Box>
        <Stack direction="row" sx={layoutSx.pageHeader.actionsGap}>{actions}</Stack>
    </Stack>;
}
type LayoutBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type ResponsiveGeometry<T> = T | Partial<Record<LayoutBreakpoint, T>>;
type PanelGeometry = {
    display?: ResponsiveGeometry<CSSProperties['display']>;
    flexDirection?: ResponsiveGeometry<CSSProperties['flexDirection']>;
    height?: CSSProperties['height'];
    gridColumn?: ResponsiveGeometry<CSSProperties['gridColumn']>;
};
export function Panel({ title, subtitle, children, action, bodyMode = 'flush', beforeGap, afterGap, geometry }: {
    title?: string;
    subtitle?: string;
    children: ReactNode;
    action?: ReactNode;
    bodyMode?: 'inset' | 'flush';
    beforeGap?: 'section' | 'surface';
    afterGap?: 'section';
    geometry?: PanelGeometry;
}) {
    const body = bodyMode === 'inset'
        ? <Box sx={title ? layoutSx.surface.bodyInsetAfterHeader : layoutSx.surface.inset}>{children}</Box>
        : children;
    return <Paper variant="outlined" sx={[
        { borderRadius: `${tokens.radius.card}px`, overflow: 'hidden' },
        beforeGap === 'section' && layoutSx.page.sectionBefore,
        beforeGap === 'surface' && layoutSx.surface.sectionBefore,
        afterGap === 'section' && layoutSx.page.sectionAfter,
        {
            display: geometry?.display,
            flexDirection: geometry?.flexDirection,
            height: geometry?.height,
            gridColumn: geometry?.gridColumn,
        },
    ]}>
        {title && <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={[layoutSx.surface.headerInset, layoutSx.surface.headerFlowGap]}><Box sx={{ minWidth: 0 }}><Typography component="h2" variant="h6">{title}</Typography>{subtitle && <Typography variant="body2" color="text.secondary" sx={layoutSx.surface.titleDescriptionGap}>{subtitle}</Typography>}</Box>{action}</Stack>}
        {body}
    </Paper>;
}
export function Stat({ title, value, note, accent = false, icon }: {
    title: string;
    value: ReactNode;
    note?: string;
    accent?: boolean;
    icon?: ReactNode;
}) {
    return <Paper variant="outlined" sx={[layoutSx.surface.inset, { borderRadius: `${tokens.radius.card}px`, minWidth: 0 }]}><Stack direction="row" justifyContent="space-between" sx={layoutSx.stats.titleGap}><Typography color="text.secondary" variant="body2">{title}</Typography><Box sx={{ color: accent ? 'primary.main' : 'text.secondary' }}>{icon}</Box></Stack><Typography component="div" variant="h4" sx={[layoutSx.stats.valueGap, { fontVariantNumeric: 'tabular-nums', color: accent ? 'primary.main' : undefined, overflowWrap: 'anywhere' }]}>{value}</Typography>{note && <Typography variant="caption" color="text.secondary" sx={[layoutSx.stats.noteGap, { display: 'block' }]}>{note}</Typography>}</Paper>;
}
export function Stats({ children }: {
    children: ReactNode;
}) { return <Box sx={[layoutSx.stats.gutter, layoutSx.stats.afterGap, { display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' } }]}>{children}</Box>; }
export function Amount({ value, wrap = false }: {
    value: Money | null | undefined;
    wrap?: boolean;
}) { return <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: wrap ? 'normal' : 'nowrap', overflowWrap: wrap ? 'anywhere' : undefined }}>{formatMoney(value)}</Box>; }
export function CopyableCode({ value, label: codeLabel = 'mã' }: {
    value: string;
    label?: string;
}) {
    const [feedback, setFeedback] = useState<'copied' | 'failed' | null>(null);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setFeedback('copied');
        }
        catch {
            setFeedback('failed');
        }
    };
    return <Stack direction="row" alignItems="center" flexWrap="wrap" sx={[layoutSx.code.inlineGap, { minWidth: 0 }]}>
        <Typography component="code" variant="caption" sx={{ overflowWrap: 'anywhere' }}>{value}</Typography>
        <IconButton size="small" aria-label={`Sao chép ${codeLabel}`} onClick={() => { void copy(); }}><ContentCopyRounded fontSize="small" /></IconButton>
        {feedback && <Typography role="status" aria-live="polite" variant="caption" color={feedback === 'copied' ? 'success.main' : 'text.secondary'}>
            {feedback === 'copied' ? `Đã sao chép ${codeLabel}.` : `Không thể sao chép ${codeLabel}; hãy chọn mã để sao chép.`}
        </Typography>}
    </Stack>;
}
const positive = new Set(['active', 'completed', 'succeeded', 'connected', 'published', 'approved', 'received', 'settled', 'verified', 'posted', 'delivered', 'passed', 'healthy']);
const danger = new Set(['failed', 'rejected', 'cancelled', 'revoked', 'denied', 'error']);
const warn = new Set(['unknown', 'blocked', 'degraded', 'pending_approval', 'partial', 'part_received', 'unconfigured', 'provisional', 'incomplete', 'paused', 'expired']);
export function Status({ value }: {
    value: string;
}) {
    const palette = positive.has(value) ? [colors.success, colors.successSurface] : danger.has(value) ? [colors.danger, colors.dangerSurface] : warn.has(value) ? [colors.warning, colors.warningSurface] : [colors.info, colors.infoSurface];
    return <Chip label={label(value)} sx={{ color: palette[0], background: palette[1], maxWidth: '100%', height: 'fit-content', minHeight: 32, '& .MuiChip-label': { whiteSpace: 'normal', overflowWrap: 'anywhere' } }}/>;
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
    return <>
        <Typography variant="caption" color="text.secondary" sx={[layoutSx.table.mobileHintInset, { display: { xs: 'block', md: 'none' } }]}>Cuộn ngang để xem đủ cột.</Typography>
        <TableContainer sx={{ maxWidth: '100%' }} tabIndex={0} role="region" aria-label={tableLabel} onKeyDown={event => {
            if ((event.key === 'ArrowRight' || event.key === 'ArrowLeft') && event.currentTarget.scrollWidth > event.currentTarget.clientWidth) {
                event.preventDefault();
                event.currentTarget.scrollBy({ left: event.key === 'ArrowRight' ? 40 : -40 });
            }
        }}><Table size="small" aria-label={tableLabel} sx={{ minWidth: { xs: 600, md: 'auto' } }}><TableHead><TableRow>{columns.map(c => <TableCell key={c.key} align={c.align}>{c.label}</TableCell>)}</TableRow></TableHead><TableBody>{rows.map(row => <TableRow key={rowKey(row)} hover>{columns.map(c => <TableCell key={c.key} align={c.align}>{c.render(row)}</TableCell>)}</TableRow>)}{rows.length === 0 && <TableRow><TableCell colSpan={columns.length}><Empty text={empty}/></TableCell></TableRow>}</TableBody></Table></TableContainer>
    </>;
}
export function Empty({ text, action }: {
    text: string;
    action?: ReactNode;
}) { return <Stack role="status" aria-live="polite" alignItems="center" sx={[layoutSx.empty.contentGap, layoutSx.empty.insetBlock, layoutSx.empty.insetInline, { minWidth: 0 }]}><Box aria-hidden="true" sx={{ width: tokens.layout.touchTarget, height: tokens.layout.touchTarget, borderRadius: `${tokens.radius.control}px`, bgcolor: colors.raised, display: 'grid', placeItems: 'center', color: 'text.secondary' }}>—</Box><Typography color="text.secondary" textAlign="center" sx={{ maxWidth: '100%', overflowWrap: 'anywhere' }}>{text}</Typography>{action}</Stack>; }
export function QueryState({ query, children, pendingProfile = 'inline' }: {
    query: {
        isPending: boolean;
        isError: boolean;
        error: Error | null;
        refetch: () => unknown;
        data?: unknown;
        isFetching?: boolean;
    };
    children: ReactNode;
    pendingProfile?: 'inline' | 'section';
}) {
    const { t } = useTranslation();
    const hasData = query.data !== undefined && query.data !== null;
    if (query.isPending)
        return <Stack role="status" aria-live="polite" alignItems="center" justifyContent="center" sx={[layoutSx.query.stateGap, pendingProfile === 'section' ? layoutSx.query.sectionPending : {}, { color: 'text.secondary' }]}><CircularProgress size={28} aria-label={t('app.loading')}/><Typography>{t('app.loading')}</Typography></Stack>;
    if (query.isError && !hasData) {
        const status = query.error instanceof ApiError ? query.error.status : 0;
        const title = status === 403 ? t('state.forbiddenTitle') : status === 404 ? t('state.notFoundTitle') : t('state.requestErrorTitle');
        return <Alert severity={status === 403 ? 'warning' : 'error'} role="alert" action={status === 403 || status === 404 ? undefined : <Button onClick={() => { void query.refetch(); }} color="inherit">{t('app.retry')}</Button>}><AlertTitle>{title}</AlertTitle>{errorMessage(query.error)}</Alert>;
    }
    return <>
        {query.isError && hasData && <Alert severity="warning" role="status" action={<Button onClick={() => { void query.refetch(); }} color="inherit">{t('app.retry')}</Button>} sx={layoutSx.notice.afterGap}><AlertTitle>{t('state.stale')}</AlertTitle>{errorMessage(query.error)}</Alert>}
        {!query.isError && query.isFetching && hasData && <Alert severity="info" role="status" sx={layoutSx.notice.afterGap}><LinearProgress aria-label={t('app.loading')} sx={layoutSx.notice.contentGap}/>{t('state.updating')}</Alert>}
        {children}
    </>;
}
export function ErrorNotice({ error, fieldLabels }: {
    error: unknown;
    fieldLabels?: Readonly<Record<string, string>>;
}) {
    const { t } = useTranslation();
    const alertRef = useRef<HTMLDivElement>(null);
    const validationFields = error instanceof ApiError && error.status === 422 ? error.problem?.errors : undefined;
    useEffect(() => {
        if (!validationFields?.length || !alertRef.current)
            return;
        const scope = alertRef.current.closest('[role="dialog"]') || alertRef.current.closest('form') || alertRef.current.closest('main') || document;
        const names = validationFields.flatMap(field => {
            const normalized = field.path.replace(/^\//, '').replace(/~1/g, '/').replace(/~0/g, '~');
            const lastSegment = normalized.split(/[./]/).flatMap(segment => segment.split('[').flatMap(part => part.split(']'))).filter(Boolean).at(-1) || normalized;
            return [normalized, lastSegment];
        });
        const firstInvalid = Array.from(scope.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[name]'))
            .find(control => names.includes(control.name));
        if (firstInvalid) {
            firstInvalid.setAttribute('aria-invalid', 'true');
            firstInvalid.focus();
        }
    }, [error, validationFields]);
    if (!error)
        return null;
    const status = error instanceof ApiError ? error.status : 0;
    const title = error instanceof UnknownResultError ? t('state.unknownTitle') : status === 403 ? t('state.forbiddenTitle') : status === 404 ? t('state.notFoundTitle') : status === 409 || status === 412 ? t('state.conflictTitle') : status === 422 ? t('state.validationTitle') : status === 428 ? t('state.versionRequiredTitle') : t('state.requestErrorTitle');
    const guidance = status === 409 || status === 412 ? t('state.conflictHelp') : status === 422 ? t('state.validationHelp') : status === 428 ? t('state.versionRequiredHelp') : undefined;
    return <Alert ref={alertRef} severity={error instanceof UnknownResultError || status === 403 || status === 409 || status === 412 || status === 428 ? 'warning' : 'error'} sx={layoutSx.notice.afterGap} role="alert"><AlertTitle>{title}</AlertTitle>{errorMessage(error)}{guidance && <Typography component="div" variant="body2" sx={layoutSx.notice.contentGap}>{guidance}</Typography>}{validationFields?.map(field => {
        const normalized = field.path.replace(/^\//, '').replace(/~1/g, '/').replace(/~0/g, '~');
        const lastSegment = normalized.split(/[./]/).flatMap(segment => segment.split('[').flatMap(part => part.split(']'))).filter(Boolean).at(-1) || normalized;
        const label = fieldLabels?.[normalized] || fieldLabels?.[lastSegment] || field.path;
        return <div key={field.path}><strong>{t('state.field')} {label}:</strong> {field.message}</div>;
    })}{error instanceof UnknownResultError && error.commandId && <Typography component="div" variant="body2" sx={layoutSx.notice.contentGap}>{t('state.command')}: <Box component="code" sx={{ overflowWrap: 'anywhere' }}>{error.commandId}</Box></Typography>}</Alert>;
}
export function Toolbar({ operation, placeholder = 'Tìm kiếm...', extra, filters, cursorParam = 'cursor' }: {
    operation: QueryOperationId;
    placeholder?: string;
    extra?: ReactNode;
    filters?: ReactNode;
    cursorParam?: string;
}) {
    const [params, setParams] = useSearchParams();
    const [draft, setDraft] = useState(params.get('q') || '');
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { setDraft(params.get('q') || ''); }, [params]);
    const updateSearch = (value: string) => {
        const next = new URLSearchParams(params);
        const query = value.trim();
        if (query)
            next.set('q', query);
        else
            next.delete('q');
        next.delete(cursorParam);
        setParams(next);
    };
    const clearSearch = () => {
        setDraft('');
        updateSearch('');
        inputRef.current?.focus();
    };
    const supportsSearch = operations[operation].queryParameters.some(parameter => parameter.name === 'q');
    if (!supportsSearch)
        return extra || filters ? <>{extra}{filters}</> : null;
    return <Stack sx={[layoutSx.toolbar.inset, layoutSx.toolbar.controlGap]}>
 <Stack component="form" onSubmit={e => { e.preventDefault(); updateSearch(draft); }} direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} sx={layoutSx.toolbar.controlGap}>
 <TextField inputRef={inputRef} label="Tìm kiếm" placeholder={placeholder} size="small" value={draft} onChange={e => setDraft(e.target.value)} slotProps={{
     htmlInput: { onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); } },
     input: { startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small"/></InputAdornment>, endAdornment: draft ? <InputAdornment position="end"><IconButton aria-label="Xóa tìm kiếm" edge="end" onMouseDown={event => event.preventDefault()} onClick={clearSearch}><CloseRounded fontSize="small"/></IconButton></InputAdornment> : undefined }
 }} sx={{ width: '100%', minWidth: 0, flex: 1 }}/><Button type="submit" variant="outlined">Tìm kiếm</Button>{extra}</Stack>
 {filters}</Stack>;
}
export function Pager({ page, cursorParam = 'cursor' }: {
    page?: Page;
    cursorParam?: string;
}) {
    const [params, setParams] = useSearchParams();
    if (!page)
        return null;
    return <Stack direction="row" justifyContent="space-between" alignItems="center" sx={layoutSx.pager.inset}><Typography variant="caption" color="text.secondary">{typeof page.total === 'number' ? `${page.total} kết quả` : `Tối đa ${page.limit} dòng / trang`}</Typography><Stack direction="row" sx={layoutSx.pager.actionsGap}><Button size="small" disabled={!params.has(cursorParam)} onClick={() => { const next = new URLSearchParams(params); next.delete(cursorParam); setParams(next); }}>Đầu danh sách</Button><Button size="small" disabled={!page.hasMore || !page.nextCursor} onClick={() => { const next = new URLSearchParams(params); if (page.nextCursor)
        next.set(cursorParam, page.nextCursor); setParams(next); }}>Trang tiếp</Button></Stack></Stack>;
}
export function LookupLoadMore({ label, loadedCount, hasMore, busy = false, onLoadMore }: {
    label: string;
    loadedCount: number;
    hasMore: boolean;
    busy?: boolean;
    onLoadMore: () => unknown;
}) {
    if (loadedCount === 0 && !hasMore)
        return null;
    return <Stack direction="row" alignItems="center" justifyContent="space-between" sx={layoutSx.lookup.loadMoreRow}>
        <Typography variant="caption" color="text.secondary">Đã tải {loadedCount} lựa chọn</Typography>
        {hasMore && <Button size="small" disabled={busy} onClick={() => { void onLoadMore(); }} aria-label={`Tải thêm ${label}`}>{busy ? 'Đang tải…' : 'Tải thêm'}</Button>}
    </Stack>;
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
    return <Button onClick={props.onClick} variant={props.variant} color={props.color} type={props.type} disabled={props.disabled || busy || !online} startIcon={busy ? <CircularProgress size={16}/> : undefined}>{children}</Button>;
}
function draftControlValue(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
    if (control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio'))
        return `checked:${control.checked}`;
    if (control instanceof HTMLInputElement && control.type === 'file')
        return `files:${Array.from(control.files || []).map(file => `${file.name}:${file.size}`).join('|')}`;
    if (control instanceof HTMLSelectElement)
        return `selected:${Array.from(control.selectedOptions).map(option => option.value).join('|')}`;
    return control.value;
}
export function EditDialog({ open, title, description, onClose, children, actions, busy = false, dirtyGuard = true, draftCommit, allowEditsWhileBusy = false }: {
    open: boolean;
    title: string;
    description?: string;
    onClose: () => void;
    children: ReactNode;
    actions: ReactNode | ((controls: { requestClose: () => void; busy: boolean }) => ReactNode);
    busy?: boolean;
    dirtyGuard?: boolean;
    /** Enable only when the editor preserves changes made after its submitted snapshot. */
    allowEditsWhileBusy?: boolean;
    /** Mark controls within one persisted draft scope clean after its mutation succeeds. */
    draftCommit?: { scope: string | null; sequence: number };
}) {
    const { t } = useTranslation();
    const titleId = `edit-dialog-title-${useId()}`;
    const descriptionId = description ? `${titleId}-description` : undefined;
    const contentRef = useRef<HTMLDivElement>(null);
    const baselineRef = useRef<Map<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, string>>(new Map());
    const baselineReadyRef = useRef(false);
    const interactionRef = useRef(false);
    const [discardOpen, setDiscardOpen] = useState(false);
    const discardConfirmedRef = useRef(false);
    const [dialogDirty, setDialogDirty] = useState(false);
    const establishBaseline = useCallback(() => {
        if (baselineReadyRef.current || !contentRef.current)
            return;
        const root = contentRef.current;
        const controls = Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea'));
        if (!controls.length)
            return;
        baselineRef.current = new Map(controls.map(control => [control, draftControlValue(control)]));
        baselineReadyRef.current = true;
    }, []);
    const updateDirtyState = useCallback(() => {
        establishBaseline();
        if (!contentRef.current)
            return;
        const currentControls = Array.from(contentRef.current.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea'));
        const dirty = baselineReadyRef.current && (currentControls.length !== baselineRef.current.size || currentControls.some(control => !baselineRef.current.has(control) || draftControlValue(control) !== baselineRef.current.get(control)));
        setDialogDirty(dirty);
        const dialog = contentRef.current.closest<HTMLElement>('[role="dialog"]');
        if (dialog) {
            if (dirty)
                dialog.dataset.draftDirty = 'true';
            else
                delete dialog.dataset.draftDirty;
        }
    }, [establishBaseline]);
    const updateAfterInteraction = useCallback(() => {
        interactionRef.current = true;
        updateDirtyState();
    }, [updateDirtyState]);
    const refreshBaseline = useCallback((scope?: string) => {
        const root = contentRef.current;
        if (!root)
            return;
        let target: ParentNode = root;
        if (scope !== undefined) {
            const scopedElement = Array.from(root.querySelectorAll<HTMLElement>('[data-draft-scope]'))
                .find(element => element.dataset.draftScope === scope);
            if (!scopedElement)
                return;
            target = scopedElement;
        }
        const controls = Array.from(target.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea'));
        for (const control of controls)
            baselineRef.current.set(control, draftControlValue(control));
        baselineReadyRef.current = baselineRef.current.size > 0;
        if (scope === undefined)
            interactionRef.current = false;
        updateDirtyState();
    }, [updateDirtyState]);
    useEffect(() => {
        if (!open || !contentRef.current)
            return;
        const root = contentRef.current;
        setDialogDirty(false);
        baselineRef.current.clear();
        baselineReadyRef.current = false;
        interactionRef.current = false;
        const dialog = root.closest<HTMLElement>('[role="dialog"]');
        establishBaseline();
        const observer = new MutationObserver(establishBaseline);
        const handleFieldFocus = (event: FocusEvent) => {
            establishBaseline();
            if (event.target instanceof Element && event.target.matches('input, select, textarea, [role="combobox"]'))
                interactionRef.current = true;
        };
        const baselineFrame = window.requestAnimationFrame(() => {
            if (!interactionRef.current)
                refreshBaseline();
        });
        observer.observe(root, { childList: true, subtree: true });
        root.addEventListener('focusin', handleFieldFocus, true);
        root.addEventListener('beforeinput', establishBaseline, true);
        root.addEventListener('input', updateAfterInteraction, true);
        root.addEventListener('change', updateAfterInteraction, true);
        return () => {
            window.cancelAnimationFrame(baselineFrame);
            observer.disconnect();
            root.removeEventListener('focusin', handleFieldFocus, true);
            root.removeEventListener('beforeinput', establishBaseline, true);
            root.removeEventListener('input', updateAfterInteraction, true);
            root.removeEventListener('change', updateAfterInteraction, true);
            baselineReadyRef.current = false;
            if (dialog)
                delete dialog.dataset.draftDirty;
        };
    }, [open, establishBaseline, refreshBaseline, updateAfterInteraction]);
    useEffect(() => {
        if (draftCommit)
            refreshBaseline(draftCommit.scope ?? undefined);
    }, [draftCommit, refreshBaseline]);
    useEffect(() => {
        if (!open)
            setDiscardOpen(false);
    }, [open]);
    const requestClose = () => {
        if (busy)
            return;
        const currentControls = contentRef.current ? Array.from(contentRef.current.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')) : [];
        const changedSinceOpen = baselineReadyRef.current && (currentControls.length !== baselineRef.current.size || currentControls.some(control => !baselineRef.current.has(control) || draftControlValue(control) !== baselineRef.current.get(control)));
        if (dirtyGuard && (dialogDirty || changedSinceOpen)) {
            setDiscardOpen(true);
            return;
        }
        onClose();
    };
    const discardChanges = () => {
        discardConfirmedRef.current = true;
        setDiscardOpen(false);
    };
    return <>
        <Dialog open={open} onClose={requestClose} fullWidth maxWidth="sm" aria-labelledby={titleId} aria-describedby={descriptionId} slotProps={{ paper: { sx: layoutSx.dialog.viewportMargin }, transition: { onEntered: () => { if (!interactionRef.current) refreshBaseline(); } } }}><DialogTitle id={`${titleId}-heading`} sx={{ display: 'flex', alignItems: 'flex-start' }}><Box component="span" id={titleId} sx={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>{title}</Box><IconButton aria-label={t('app.close')} disabled={busy} onClick={requestClose} sx={{ flexShrink: 0 }}><CloseRounded /></IconButton></DialogTitle>{busy && <LinearProgress aria-label="Đang lưu"/>}<DialogContent ref={contentRef} inert={busy && !allowEditsWhileBusy} dividers sx={layoutSx.dialog.inset} onFocusCapture={event => { establishBaseline(); if (event.target instanceof Element && event.target.matches('input, select, textarea, [role="combobox"]')) interactionRef.current = true; }} onBeforeInputCapture={establishBaseline} onChangeCapture={updateAfterInteraction} onClickCapture={updateAfterInteraction}>{description && <Typography id={descriptionId} color="text.secondary" sx={layoutSx.dialog.descriptionAfterGap}>{description}</Typography>}{children}</DialogContent><DialogActions disableSpacing sx={[layoutSx.dialog.actionsInset, layoutSx.dialog.actionsGap]}><Button onClick={requestClose} disabled={busy}>{t('app.cancel')}</Button>{typeof actions === 'function' ? actions({ requestClose, busy }) : actions}</DialogActions></Dialog>
        <Dialog open={open && discardOpen} onClose={() => setDiscardOpen(false)} aria-labelledby={`${titleId}-draft-warning`} aria-describedby={`${titleId}-draft-description`} slotProps={{ paper: { sx: layoutSx.dialog.viewportMargin }, transition: { onExited: () => {
            if (!discardConfirmedRef.current)
                return;
            discardConfirmedRef.current = false;
            onClose();
        } } }}>
            <DialogTitle id={`${titleId}-draft-warning`}>{t('draft.closeTitle')}</DialogTitle>
            <DialogContent sx={layoutSx.dialog.inset}><DialogContentText id={`${titleId}-draft-description`}>{t('draft.closeDescription')}</DialogContentText></DialogContent>
            <DialogActions disableSpacing sx={[layoutSx.dialog.actionsInset, layoutSx.dialog.actionsGap]}><Button onClick={() => setDiscardOpen(false)}>{t('draft.continueEditing')}</Button><Button color="warning" variant="contained" onClick={discardChanges}>{t('draft.discard')}</Button></DialogActions>
        </Dialog>
    </>;
}

export function PartialDataNotice({ children = 'Một số phần của màn hình chưa có dữ liệu đầy đủ.' }: { children?: ReactNode }) {
    return <Alert severity="info" role="status" sx={layoutSx.notice.afterGap}>{children}</Alert>;
}

export function CapabilityUnavailable({ children }: { children?: ReactNode }) {
    const { t } = useTranslation();
    return <Alert severity="info" role="status">{children || t('state.capabilityUnavailable')}</Alert>;
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
    useEffect(() => {
        if (!open)
            setReason('');
    }, [open]);
    return <EditDialog open={open} title={title} description={description} onClose={onClose} busy={busy} actions={<Button variant="contained" disabled={busy || (requireReason && codePointLength(reason.trim()) < 5)} onClick={() => { void onConfirm(reason).then(() => { setReason(''); onClose(); }).catch(() => undefined); }}>Xác nhận</Button>}><ErrorNotice error={error}/>{requireReason && <TextField label="Lý do (ít nhất 5 ký tự)" value={reason} onChange={e => setReason(e.target.value)} fullWidth multiline minRows={2}/>}</EditDialog>;
}
export function DetailLine({ label: caption, children }: {
    label: string;
    children: ReactNode;
}) { return <><Stack direction="row" justifyContent="space-between" sx={[layoutSx.detail.valueGap, layoutSx.detail.rowInsetBlock]}><Typography color="text.secondary">{caption}</Typography><Box sx={{ textAlign: 'right', overflowWrap: 'anywhere', minWidth: 0 }}>{children}</Box></Stack><Divider /></>; }
