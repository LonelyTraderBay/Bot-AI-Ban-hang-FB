import { lazy, Suspense, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { visualSx } from './visual';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { Link as RouterLink, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, AlertTitle, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, IconButton, InputAdornment, LinearProgress, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, useMediaQuery } from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import { operations } from '@botsales/contracts';
import type { Page, Money } from '@botsales/contracts';
import type { QueryOperationId } from '../api/client';
import { currentSearchParams } from '../model/filters';
import type { ToolbarFilterGroup } from './internal/compact-toolbar';
import { colors, tokens } from '@botsales/tokens';
import { layoutSx } from './layout';
import { ApiError, UnknownResultError, errorMessage } from '../api/errors';
import { codePointLength, formatMoney } from '../model/format';
import { label, type LabelDomain } from '../model/labels';
import { listReturnState } from '../model/list-return';
import { permitsClosedShopWrite } from '../model/shop-lifecycle';
import { useScope, useCan } from '../model/scope';
import type { MobileCards, TableColumn } from './internal/table-cards';
import { tabletAndUpQuery } from './theme';
export function PageHeader({ title, subtitle, primaryAction, actions, eyebrow }: {
    title: string;
    subtitle?: string;
    primaryAction?: ReactNode;
    actions?: ReactNode;
    eyebrow?: string;
}) {
    return <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} sx={[layoutSx.pageHeader.columnsGap, layoutSx.pageHeader.afterGap]}>
        <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
            {eyebrow && <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: visualSx.typography.letterSpacing.overline }}>{eyebrow}</Typography>}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={layoutSx.pageHeader.actionsGap}>
                <Typography component="h1" variant="h4" data-ui-page-title sx={{ fontSize: visualSx.typography.screenTitle, minWidth: 0, overflowWrap: 'anywhere' }}>{title}</Typography>
                {primaryAction}
            </Stack>
            {subtitle && <Typography color="text.secondary" sx={[layoutSx.pageHeader.titleDescriptionGap, { maxWidth: 760 }]}>{subtitle}</Typography>}
        </Box>
        {actions && <Stack direction="row" sx={layoutSx.pageHeader.actionsGap}>{actions}</Stack>}
    </Stack>;
}
type LayoutBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type ResponsiveGeometry<T> = T | Partial<Record<LayoutBreakpoint, T>>;
type PanelGeometry = {
    display?: ResponsiveGeometry<CSSProperties['display']>;
    flexDirection?: ResponsiveGeometry<CSSProperties['flexDirection']>;
    height?: CSSProperties['height'];
    overflowY?: 'auto';
    gridColumn?: ResponsiveGeometry<CSSProperties['gridColumn']>;
};
export function Panel({ title, subtitle, children, action, bodyMode = 'flush', density = 'compact', beforeGap, afterGap, geometry }: {
    title?: string;
    subtitle?: string;
    children: ReactNode;
    action?: ReactNode;
    bodyMode?: 'inset' | 'flush';
    density?: 'compact' | 'comfortable';
    beforeGap?: 'section' | 'surface';
    afterGap?: 'section';
    geometry?: PanelGeometry;
}) {
    const body = bodyMode === 'inset'
        ? <Box sx={title ? (density === 'comfortable' ? layoutSx.surface.comfortableBodyInsetAfterHeader : layoutSx.surface.bodyInsetAfterHeader) : (density === 'comfortable' ? layoutSx.surface.comfortableInset : layoutSx.surface.compactInset)}>{children}</Box>
        : children;
    return <Paper variant="outlined" data-ui-density={density} sx={[
        { borderRadius: `${tokens.radius.card}px`, overflow: 'hidden' },
        beforeGap === 'section' && layoutSx.page.sectionBefore,
        beforeGap === 'surface' && layoutSx.surface.sectionBefore,
        afterGap === 'section' && layoutSx.page.sectionAfter,
        {
            display: geometry?.display,
            flexDirection: geometry?.flexDirection,
            height: geometry?.height,
            overflowY: geometry?.overflowY,
            gridColumn: geometry?.gridColumn,
        },
    ]}>
        {title && <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={[density === 'comfortable' ? layoutSx.surface.comfortableHeaderInset : layoutSx.surface.headerInset, layoutSx.surface.headerFlowGap]}><Box sx={{ minWidth: 0 }}><Typography component="h2" variant="h6" sx={{ fontSize: visualSx.typography.panelTitle }}>{title}</Typography>{subtitle && <Typography variant="body2" color="text.secondary" sx={layoutSx.surface.titleDescriptionGap}>{subtitle}</Typography>}</Box>{action}</Stack>}
        {body}
    </Paper>;
}
export function Stat({ title, value, note, accent = false, icon, valueRole = 'metric' }: {
    title: string;
    value: ReactNode;
    note?: string;
    accent?: boolean;
    icon?: ReactNode;
    valueRole?: 'metric' | 'primary' | 'text';
}) {
    return <Paper variant="outlined" data-ui-stat={valueRole} sx={[layoutSx.surface.inset, { borderRadius: visualSx.radius.card, minWidth: 0 }]}>
        <Stack direction="row" justifyContent="space-between" sx={layoutSx.stats.titleGap}>
            <Typography color="text.secondary" variant="body2" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>{title}</Typography>
            {icon && <Box sx={{ color: accent ? 'primary.main' : 'text.secondary' }}>{icon}</Box>}
        </Stack>
        <Typography component="div" variant={valueRole === 'primary' ? 'h4' : 'body2'} data-ui-stat-value sx={[
            layoutSx.stats.valueGap,
            valueRole === 'metric' && {
                fontSize: visualSx.typography.metricValue.fontSize,
                fontWeight: visualSx.typography.metricValue.fontWeight,
                lineHeight: visualSx.typography.metricValue.lineHeight,
            },
            { fontVariantNumeric: 'tabular-nums', color: accent ? 'primary.main' : undefined, overflowWrap: 'anywhere' },
        ]}>{value}</Typography>
        {note && <Typography variant="caption" color="text.secondary" data-ui-stat-note sx={[layoutSx.stats.noteGap, { display: 'block', overflowWrap: 'anywhere' }]}>{note}</Typography>}
    </Paper>;
}
export function Stats({ children, afterGap = 'section', density = 'standard', appearance = 'cards' }: {
    children: ReactNode;
    afterGap?: 'section' | 'none';
    density?: 'standard' | 'compact';
    appearance?: 'cards' | 'strip';
}) {
    const strip = appearance === 'strip';
    const grid = <Box data-ui-stats={density} data-ui-stats-appearance={strip ? appearance : undefined} sx={[
        strip ? layoutSx.stats.strip : density === 'compact' ? layoutSx.stats.compactGutter : layoutSx.stats.gutter,
        afterGap === 'section' && layoutSx.stats.afterGap,
        { display: 'grid', '&:empty': { display: 'none' } },
        strip ? {
            border: '1px solid', borderColor: colors.borderDecorative, borderRadius: visualSx.radius.card, overflow: 'clip',
            gridTemplateColumns: 'minmax(0, 1fr)',
            '& > [data-ui-stat]': { border: 0, borderRadius: '0px', borderBlockEnd: '1px solid', borderColor: colors.borderDecorative },
            '& > [data-ui-stat]:last-child': { borderBlockEnd: 0 },
            '@container (min-width: 20em)': {
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                '& > [data-ui-stat]:nth-child(odd):not(:last-child)': { borderInlineEnd: '1px solid', borderColor: colors.borderDecorative },
                '& > [data-ui-stat]:nth-child(odd):nth-last-child(2)': { borderBlockEnd: 0 },
            },
            '@container (min-width: 55em)': {
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                '& > [data-ui-stat]:not(:nth-child(4n)):not(:last-child)': { borderInlineEnd: '1px solid', borderColor: colors.borderDecorative },
                '& > [data-ui-stat]:nth-child(4n + 1):nth-last-child(-n + 4), & > [data-ui-stat]:nth-child(4n + 1):nth-last-child(-n + 4) ~ [data-ui-stat]': { borderBlockEnd: 0 },
            },
        } : { gridTemplateColumns: {
            xs: density === 'compact' ? 'repeat(auto-fit, minmax(min(100%, 10em), 1fr))' : 'minmax(0, 1fr)',
            md: `repeat(auto-fit, minmax(min(100%, max(10em, calc((100% - ${tokens.space.lg}px) / 2))), 1fr))`,
            lg: `repeat(auto-fit, minmax(min(100%, max(10em, calc((100% - ${3 * tokens.space.lg}px) / 4))), 1fr))`,
        } },
    ]}>{children}</Box>;
    return strip ? <Box sx={{ containerType: 'inline-size' }}>{grid}</Box> : grid;
}
const amountWrap = { whiteSpace: 'normal', overflowWrap: 'anywhere' } as const;

export function Amount({ value, wrap = false }: {
    value: Money | null | undefined;
    wrap?: boolean;
}) {
    return <Box component="span" sx={[{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', '[data-ui-table-layout="cards"] &': amountWrap }, wrap && amountWrap]}>{formatMoney(value)}</Box>;
}
export function CopyableCode({ value, label: codeLabel = 'mã', showValue = true }: {
    value: string;
    label?: string;
    showValue?: boolean;
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
        {showValue && <Typography component="code" variant="caption" sx={{ overflowWrap: 'anywhere' }}>{value}</Typography>}
        <IconButton size="small" aria-label={showValue ? `Sao chép ${codeLabel}` : `Sao chép ${codeLabel} ${value}`} onClick={() => { void copy(); }}><ContentCopyRounded fontSize="small" /></IconButton>
        {feedback && <Typography role="status" aria-live="polite" variant="caption" color={feedback === 'copied' ? 'success.main' : 'text.secondary'}>
            {feedback === 'copied' ? `Đã sao chép ${codeLabel}.` : `Không thể sao chép ${codeLabel}; hãy chọn mã để sao chép.`}
        </Typography>}
    </Stack>;
}
const positive = new Set(['active', 'completed', 'succeeded', 'connected', 'published', 'approved', 'received', 'settled', 'verified', 'posted', 'delivered', 'passed', 'healthy', 'in_stock']);
const danger = new Set(['failed', 'rejected', 'cancelled', 'revoked', 'denied', 'error']);
const warn = new Set(['unknown', 'blocked', 'degraded', 'pending_approval', 'partial', 'part_received', 'unconfigured', 'provisional', 'incomplete', 'paused', 'expired', 'low_stock', 'out_of_stock', 'closed_short', 'needs_check', 'cod_pending', 'refund_due']);
export function Status({ value, domain, labelText, density = 'standard' }: {
    value: string;
    domain?: LabelDomain;
    labelText?: string;
    density?: 'standard' | 'compact';
}) {
    const palette = positive.has(value) ? [colors.success, colors.successSurface] : danger.has(value) ? [colors.danger, colors.dangerSurface] : warn.has(value) ? [colors.warning, colors.warningSurface] : [colors.info, colors.infoSurface];
    return <Chip label={labelText ?? label(value, domain)} title={value} sx={{ color: palette[0], background: palette[1], maxWidth: '100%', height: density === 'compact' ? 21 : 'fit-content', minHeight: density === 'compact' ? 21 : 32, verticalAlign: density === 'compact' ? 'top' : undefined, '& .MuiChip-label': { whiteSpace: 'normal', overflowWrap: 'normal' } }}/>;
}
export type Column<T> = TableColumn<T>;
const TableCards = lazy(() => import('./internal/table-cards')) as typeof import('./internal/table-cards').default;

type MobileTable<T> = MobileCards<T> | { layout: 'comparison'; actionKey?: string; appearance?: 'grid'; pinnedKey?: string };

export function DataTable<T>({ rows, columns, rowKey, empty = 'Chưa có dữ liệu phù hợp.', emptyAction, mobile, label: tableLabel = 'Dữ liệu', density }: {
    rows: readonly T[];
    columns: readonly Column<T>[];
    rowKey: (row: T) => string;
    empty?: string;
    emptyAction?: ReactNode;
    mobile: MobileTable<T>;
    label?: string;
    density?: 'standard' | 'compact';
}) {
    const regionId = useId();
    const narrow = !useMediaQuery(tabletAndUpQuery);
    const cards = narrow && mobile.layout === 'cards';
    const grid = mobile.layout === 'comparison' && mobile.appearance === 'grid';
    const compactRows = (density ?? (mobile.layout === 'cards' ? 'compact' : 'standard')) === 'compact';
    const region = useRef<HTMLDivElement>(null);
    const [overflows, setOverflows] = useState(false);
    useLayoutEffect(() => {
        const element = region.current;
        const table = element?.querySelector('table');
        if (!grid || !element || !table) return;
        const measure = () => setOverflows(element.scrollWidth > element.clientWidth + 1);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        observer.observe(table);
        return () => observer.disconnect();
    }, [grid, cards, columns.length, rows.length]);
    if (cards && mobile.layout === 'cards') {
        return <Box component="section" id={regionId} aria-label={tableLabel} tabIndex={0} data-ui-table-layout="cards">
            {rows.length > 0 ? <Suspense fallback={<Typography role="status" color="text.secondary" sx={layoutSx.surface.inset}>Đang tải dữ liệu</Typography>}>
                <TableCards rows={rows} columns={columns} rowKey={rowKey} mobile={mobile} />
            </Suspense>
                : <Empty text={empty} action={emptyAction}/>}
        </Box>;
    }
    const pinnedAction = { position: { xs: 'sticky', md: 'static' }, right: 0, backgroundColor: 'background.paper' } as const;
    const actionKey = mobile.layout === 'comparison' ? mobile.actionKey : undefined;
    const stickyColumn = actionKey !== undefined && columns.at(-1)?.key === actionKey ? actionKey : undefined;
    const pinned = mobile.layout === 'comparison' && columns[0]?.key === mobile.pinnedKey ? mobile.pinnedKey : undefined;
    const widths = columns.map(column => column.width ?? 104);
    const gridWidth = `${widths.reduce((sum, width) => sum + width, 0) / 16}rem`;
    const tableMinWidth = grid ? gridWidth : Math.max(600, Math.min(760, columns.length * tokens.layout.touchTarget * 3));
    const gridCell = { borderInlineEnd: 1, borderColor: 'divider', overflowWrap: 'anywhere', fontVariantNumeric: 'tabular-nums',
        '&:last-child': { borderInlineEnd: 0 } } as const;
    const pinnedStart = { position: 'sticky', insetInlineStart: 0, zIndex: tokens.zIndex.sticky, backgroundColor: 'background.paper' } as const;
    return <>
        {(!grid || (overflows && rows.length > 0)) && <Typography variant="caption" color="text.secondary"
            sx={[layoutSx.table.mobileHintInset, { display: grid ? 'block' : { xs: 'block', md: 'none' } }]}>Cuộn ngang để xem đủ cột.</Typography>}
        <TableContainer id={regionId} ref={region} sx={{ maxWidth: '100%', isolation: grid ? 'isolate' : undefined }} tabIndex={0} role="region" aria-label={tableLabel} data-ui-table-layout="table" onKeyDown={event => {
            if ((event.key === 'ArrowRight' || event.key === 'ArrowLeft') && event.target === event.currentTarget
                && event.currentTarget.scrollWidth > event.currentTarget.clientWidth) {
                event.preventDefault();
                event.currentTarget.scrollBy({ left: event.key === 'ArrowRight' ? 40 : -40 });
            }
        }}>
            <Table size="small" aria-label={tableLabel} sx={{ minWidth: tableMinWidth, tableLayout: grid ? 'fixed' : undefined }}>
                {grid && <colgroup>{columns.map(column => <col key={column.key} style={{ width: `${(column.width ?? 104) / 16}rem` }} />)}</colgroup>}
                <TableHead><TableRow>
                    {columns.map(column => <TableCell key={column.key} align={column.align}
                        sx={[grid && layoutSx.table.reconciliationCell, grid && gridCell, column.key === stickyColumn && pinnedAction, column.key === pinned && pinnedStart]}>{column.label}</TableCell>)}
                </TableRow></TableHead>
                <TableBody>
                    {rows.map(row => <TableRow key={rowKey(row)} hover>
                        {columns.map(column => <TableCell key={column.key} align={column.align}
                            sx={[grid && layoutSx.table.reconciliationCell, grid && column.gridAction === true && layoutSx.table.reconciliationActionCell, compactRows && layoutSx.table.compactDataCell, grid && gridCell, column.key === stickyColumn && pinnedAction, column.key === pinned && pinnedStart]}>
                            {column.render(row)}
                        </TableCell>)}
                    </TableRow>)}
                </TableBody>
            </Table>
        </TableContainer>
        {rows.length === 0 && <Empty text={empty} action={emptyAction}/>}
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
        if (error instanceof ApiError && error.code === 'SHOP_CLOSE_BLOCKED') alertRef.current?.focus();
        if (!validationFields?.length || !alertRef.current)
            return;
        const scope = alertRef.current.closest('[role="dialog"]') || alertRef.current.closest('form') || alertRef.current.closest('main') || document;
        const controls = Array.from(scope.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input[name], textarea[name], select[name]'));
        for (const field of validationFields) {
            const parts = field.path.replace(/^\//, '').replace(/~1/g, '/').replace(/~0/g, '~').split(/[./[\]]+/).filter(Boolean);
            const names = [parts.join('.'), parts.at(-1)];
            for (const name of names) {
                const control = controls.find(candidate => candidate.name === name && !candidate.disabled);
                if (!control) continue;
                const target = control.getAttribute('aria-hidden') === 'true'
                    ? control.parentElement?.querySelector<HTMLElement>('[role="combobox"]') : control;
                if (!target) continue;
                const previous = target.getAttribute('aria-invalid');
                const restore = () => {
                    if (previous === null) target.removeAttribute('aria-invalid');
                    else target.setAttribute('aria-invalid', previous);
                };
                target.setAttribute('aria-invalid', 'true');
                target.focus();
                if (target.ownerDocument.activeElement === target) return restore;
                restore();
            }
        }
        alertRef.current.focus();
    }, [error, validationFields]);
    if (!error)
        return null;
    if (error instanceof ApiError && ['CAPABILITY_UNAVAILABLE', 'BUDGET_EXCEEDED', 'TOOL_NOT_ALLOWED'].includes(error.code))
        return <CapabilityUnavailable>{error.message}</CapabilityUnavailable>;
    const status = error instanceof ApiError ? error.status : 0;
    const versionConflict = status === 412 || status === 428 || (status === 409 && error instanceof ApiError && ['STALE_VERSION', 'VERSION_CONFLICT', 'VERSION_MISMATCH'].includes(error.code));
    const title = error instanceof UnknownResultError ? t('state.unknownTitle') : status === 403 ? t('state.forbiddenTitle') : status === 404 ? t('state.notFoundTitle') : versionConflict ? (status === 428 ? t('state.versionRequiredTitle') : t('state.conflictTitle')) : status === 422 ? t('state.validationTitle') : t('state.requestErrorTitle');
    const guidance = versionConflict ? (status === 428 ? t('state.versionRequiredHelp') : t('state.conflictHelp')) : status === 422 ? t('state.validationHelp') : undefined;
    return <Alert ref={alertRef} tabIndex={-1} severity={error instanceof UnknownResultError || status === 403 || versionConflict ? 'warning' : 'error'} sx={layoutSx.notice.afterGap} role="alert"><AlertTitle>{title}</AlertTitle>{errorMessage(error)}{error instanceof ApiError && error.code === 'SHOP_CLOSE_BLOCKED' && error.problem?.errors?.map(group => <div key={group.code}>{group.message}</div>)}{guidance && <Typography component="div" variant="body2" sx={layoutSx.notice.contentGap}>{guidance}</Typography>}{validationFields?.map(field => {
        const normalized = field.path.replace(/^\//, '').replace(/~1/g, '/').replace(/~0/g, '~');
        const lastSegment = normalized.split(/[./]/).flatMap(segment => segment.split('[').flatMap(part => part.split(']'))).filter(Boolean).at(-1) || normalized;
        const label = fieldLabels?.[normalized] || fieldLabels?.[lastSegment] || field.path;
        return <div key={field.path}><strong>{t('state.field')} {label}:</strong> {field.message}</div>;
    })}{error instanceof UnknownResultError && error.commandId && <Typography component="div" variant="body2" sx={layoutSx.notice.contentGap}>{t('state.command')}: <Box component="code" sx={{ overflowWrap: 'anywhere' }}>{error.commandId}</Box></Typography>}</Alert>;
}
const CompactToolbar = lazy(() => import('./internal/compact-toolbar'));

export function Toolbar({ operation, placeholder = 'Tìm kiếm...', extra, filters, filterGroup, cursorParam = 'cursor' }: {
    operation: QueryOperationId;
    placeholder?: string;
    extra?: ReactNode;
    cursorParam?: string;
} & ({ filters?: ReactNode; filterGroup?: never } | { filters?: never; filterGroup: ToolbarFilterGroup })) {
    const [params, setParams] = useSearchParams();
    const location = useLocation();
    const query = params.get('q') || '';
    const [draft, setDraft] = useState(query);
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { setDraft(query); }, [query]);
    const updateSearch = (value: string) => {
        const next = currentSearchParams(params, location.pathname);
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
    const search = supportsSearch && <Stack component="form" onSubmit={e => { e.preventDefault(); updateSearch(draft); }}
        direction={filterGroup ? 'row' : { xs: 'column', md: 'row' }} alignItems={filterGroup ? 'flex-end' : { xs: 'stretch', md: 'flex-end' }}
        sx={[layoutSx.toolbar.controlGap, filterGroup ? { flex: '1 1 13em', minWidth: 'min(100%, 13em)' } : { flexWrap: 'wrap' }]}>
 <TextField inputRef={inputRef} label="Tìm kiếm" placeholder={placeholder} size="small" value={draft} onChange={e => setDraft(e.target.value)} slotProps={{
     htmlInput: { onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); } },
     input: { startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small"/></InputAdornment>, endAdornment: draft ? <InputAdornment position="end"><IconButton aria-label="Xóa tìm kiếm" edge="end" onMouseDown={event => event.preventDefault()} onClick={clearSearch}><CloseRounded fontSize="small"/></IconButton></InputAdornment> : undefined }
 }} sx={filterGroup ? { flex: 1, minWidth: 0 } : { width: '100%', minWidth: 'min(100%, 12em)', flex: { xs: '1 1 auto', md: '1 1 12em' } }}/><Button type="submit" variant="outlined">Tìm kiếm</Button>{extra}</Stack>;
    if (filterGroup) return <Suspense fallback={<Stack sx={layoutSx.toolbar.inset}>{search}</Stack>}>
        <CompactToolbar operation={operation} group={filterGroup} cursorParam={cursorParam} search={search} Dialog={EditDialog} />
    </Suspense>;
    if (!supportsSearch) return extra || filters ? <>{extra}{filters}</> : null;
    return <Stack sx={[layoutSx.toolbar.inset, layoutSx.toolbar.controlGap]}>{search}{filters}</Stack>;
}
const cursorHistoryByList = new Map<string, Array<string | null>>();
const MAX_CURSOR_HISTORY_LISTS = 100;
const MAX_CURSORS_PER_LIST = 100;

function cursorHistoryKey(pathname: string, params: URLSearchParams, cursorParam: string) {
    const filters = new URLSearchParams(params);
    filters.delete(cursorParam);
    filters.sort();
    return `${pathname}?${filters.toString()}`;
}

function rememberCursorHistory(key: string, cursors: Array<string | null>) {
    cursorHistoryByList.delete(key);
    cursorHistoryByList.set(key, cursors.slice(-MAX_CURSORS_PER_LIST));
    while (cursorHistoryByList.size > MAX_CURSOR_HISTORY_LISTS) {
        const oldest = cursorHistoryByList.keys().next().value;
        if (oldest === undefined) break;
        cursorHistoryByList.delete(oldest);
    }
}

export function Pager({ page, cursorParam = 'cursor' }: {
    page?: Page;
    cursorParam?: string;
}) {
    const [params, setParams] = useSearchParams();
    const location = useLocation();
    if (!page)
        return null;
    const key = cursorHistoryKey(location.pathname, params, cursorParam);
    const currentCursor = params.get(cursorParam);
    const history = cursorHistoryByList.get(key) || [];
    const currentIndex = history.lastIndexOf(currentCursor);
    const previousCursor = currentIndex > 0 ? history[currentIndex - 1] : null;
    return <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={[layoutSx.pager.inset, layoutSx.pager.actionsGap]}>
        <Typography variant="caption" color="text.secondary">{typeof page.total === 'number' ? `${page.total} kết quả` : `Tối đa ${page.limit} dòng / trang`}</Typography>
        <Stack direction="row" sx={[layoutSx.pager.actionsGap, { '& > .MuiButton-root': { flex: { xs: '1 1 0', sm: '0 1 auto' }, minWidth: 0 } }]}>
            <Button size="small" disabled={!currentCursor} onClick={() => { rememberCursorHistory(key, [null]); const next = new URLSearchParams(params); next.delete(cursorParam); setParams(next); }}>Đầu danh sách</Button>
            <Button size="small" disabled={currentIndex <= 0} title={currentIndex < 0 && currentCursor ? 'Liên kết trực tiếp chưa có lịch sử; dùng Đầu danh sách để quay về đầu.' : undefined} onClick={() => {
                if (currentIndex <= 0) return;
                rememberCursorHistory(key, history.slice(0, currentIndex));
                const next = new URLSearchParams(params);
                if (previousCursor) next.set(cursorParam, previousCursor); else next.delete(cursorParam);
                setParams(next);
            }}>Trang trước</Button>
            <Button size="small" disabled={!page.hasMore || !page.nextCursor} onClick={() => {
                if (!page.nextCursor) return;
                const visited = cursorHistoryByList.get(key) || (currentCursor ? [currentCursor] : [null]);
                const index = visited.lastIndexOf(currentCursor);
                const base = index >= 0 ? visited.slice(0, index + 1) : [...visited, currentCursor];
                if (base.at(-1) !== page.nextCursor) base.push(page.nextCursor);
                rememberCursorHistory(key, base);
                const next = new URLSearchParams(params);
                next.set(cursorParam, page.nextCursor);
                setParams(next);
            }}>Trang tiếp</Button>
        </Stack>
    </Stack>;
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
}) { const location=useLocation(); return <Button component={RouterLink} to={to} state={listReturnState(location.pathname,location.search,to)} size="small" endIcon={<ArrowForwardRounded fontSize="small"/>}>{children}</Button>; }
export function MutationButton({ permission, allowedActions, action, busy, children, appearance, ...props }: {
    permission: string | null;
    allowedActions?: string[];
    action?: string;
    busy?: boolean;
    appearance?: 'compactFace';
    children: ReactNode;
    onClick?: () => void;
    variant?: 'contained' | 'outlined' | 'text';
    color?: 'primary' | 'error' | 'inherit';
    disabled?: boolean;
    type?: 'button' | 'submit';
}) {
    const can = useCan(permission, allowedActions, action);
    const { online, shop } = useScope();
    const readOnly = shop.status === 'closed' && !permitsClosedShopWrite(action);
    if (!can)
        return null;
    return <Button onClick={props.onClick} variant={props.variant} color={props.color} type={props.type} disabled={props.disabled || busy || !online || readOnly}
        sx={[appearance === 'compactFace' && props.variant === 'contained' && layoutSx.actions.compactFace]} startIcon={busy ? <CircularProgress size={16}/> : undefined}>{children}</Button>;
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
export function EditDialog({ open, title, description, onClose, children, actions, busy = false, dirtyGuard = true, draftCommit, allowEditsWhileBusy = false, density = 'compact', width = 'standard' }: {
    open: boolean;
    title: string;
    description?: string;
    onClose: () => void;
    children: ReactNode;
    actions: ReactNode | ((controls: { requestClose: () => void; busy: boolean }) => ReactNode);
    busy?: boolean;
    dirtyGuard?: boolean;
    density?: 'compact' | 'comfortable';
    width?: 'compact' | 'standard';
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
    const tableOpenerRef = useRef<{ opener: Element; regionId: string } | null>(null);
    const restoreTableFocus = useCallback(() => {
        const previous = tableOpenerRef.current;
        if (!previous || previous.opener.isConnected) return;
        window.requestAnimationFrame(() => {
            // MUI restores the original control when it still exists.
            if (document.activeElement === document.body) document.getElementById(previous.regionId)?.focus();
        });
    }, []);
    useLayoutEffect(() => {
        if (!open) return;
        const opener = document.activeElement;
        const regionId = opener?.closest('[data-ui-table-layout]')?.id;
        tableOpenerRef.current = opener && regionId ? { opener, regionId } : null;
        return restoreTableFocus;
    }, [open, restoreTableFocus]);
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
        for (const control of baselineRef.current.keys())
            if (target.contains(control)) baselineRef.current.delete(control);
        if (scope === undefined) baselineRef.current.clear();
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
        <Dialog open={open} onClose={requestClose} onTransitionExited={restoreTableFocus} fullWidth maxWidth="sm" aria-labelledby={titleId} aria-describedby={descriptionId} slotProps={{ paper: { sx: [layoutSx.dialog.viewportMargin, width === 'compact' && layoutSx.dialog.compactWidth] }, transition: { onEntered: () => { if (!interactionRef.current) refreshBaseline(); } } }}><DialogTitle id={`${titleId}-heading`} aria-labelledby={titleId} sx={[density === 'comfortable' ? layoutSx.dialog.inset : layoutSx.dialog.compactInset, { display: 'flex', alignItems: 'center' }]}><Box component="span" id={titleId} sx={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>{title}</Box><IconButton aria-label={t('app.close')} disabled={busy} onClick={requestClose} sx={{ flexShrink: 0 }}><CloseRounded /></IconButton></DialogTitle>{busy && <LinearProgress aria-label="Đang lưu"/>}<DialogContent ref={contentRef} tabIndex={0} role="region" aria-labelledby={titleId} inert={busy && !allowEditsWhileBusy} dividers sx={density === 'comfortable' ? layoutSx.dialog.inset : layoutSx.dialog.compactInset} onFocusCapture={event => { establishBaseline(); if (event.target instanceof Element && event.target.matches('input, select, textarea, [role="combobox"]')) interactionRef.current = true; }} onBeforeInputCapture={establishBaseline} onChangeCapture={updateAfterInteraction} onClickCapture={updateAfterInteraction}>{description && <Typography id={descriptionId} color="text.secondary" sx={layoutSx.dialog.descriptionAfterGap}>{description}</Typography>}{children}</DialogContent><DialogActions disableSpacing sx={[layoutSx.dialog.actionsInset, layoutSx.dialog.actionsGap]}><Button onClick={requestClose} disabled={busy}>{t('app.cancel')}</Button>{typeof actions === 'function' ? actions({ requestClose, busy }) : actions}</DialogActions></Dialog>
        <Dialog open={open && discardOpen} onClose={() => setDiscardOpen(false)} aria-labelledby={`${titleId}-draft-warning`} aria-describedby={`${titleId}-draft-description`} slotProps={{ paper: { sx: layoutSx.dialog.viewportMargin }, transition: { onExited: () => {
            if (!discardConfirmedRef.current)
                return;
            discardConfirmedRef.current = false;
            onClose();
        } } }}>
            <DialogTitle id={`${titleId}-draft-warning`} sx={layoutSx.dialog.inset}>{t('draft.closeTitle')}</DialogTitle>
            <DialogContent tabIndex={0} role="region" aria-labelledby={`${titleId}-draft-warning`} sx={layoutSx.dialog.inset}><DialogContentText id={`${titleId}-draft-description`}>{t('draft.closeDescription')}</DialogContentText></DialogContent>
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
export function ConfirmDialog({ open, title, description, summary, onClose, onConfirm, confirmLabel = 'Xác nhận', busy, error, requireReason = false, width = 'standard' }: {
    open: boolean;
    title: string;
    description: string;
    summary?: ReactNode;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<unknown>;
    confirmLabel?: string;
    busy?: boolean;
    error?: unknown;
    requireReason?: boolean;
    width?: 'standard' | 'compact';
}) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [failure, setFailure] = useState<Error | null>(null);
    const inFlight = useRef(false);
    const generation = useRef({ active: false });
    useEffect(() => {
        const lifetime = { active: true };
        generation.current = lifetime;
        if (!open) {
            setReason('');
            setFailure(null);
            setSubmitting(false);
        }
        return () => { lifetime.active = false; };
    }, [open, title]);
    const submit = async () => {
        if (inFlight.current || busy || (requireReason && codePointLength(reason.trim()) < 5)) return;
        const started = generation.current;
        inFlight.current = true;
        setSubmitting(true);
        setFailure(null);
        try {
            await onConfirm(reason);
            if (started.active && generation.current === started) { setReason(''); onClose(); }
        }
        catch (cause) {
            if (started.active && generation.current === started) setFailure(cause instanceof Error ? cause : new Error('Không hoàn tất được thao tác. Kiểm tra kết quả trước khi gửi lại.'));
        }
        finally {
            inFlight.current = false;
            if (started.active && generation.current === started) setSubmitting(false);
        }
    };
    return <EditDialog density={width === 'compact' ? 'compact' : 'comfortable'} width={width} open={open} title={title} description={description} onClose={onClose} busy={busy || submitting} actions={<Button variant="contained" disabled={busy || submitting || (requireReason && codePointLength(reason.trim()) < 5)} onClick={() => void submit()}>{confirmLabel}</Button>}><ErrorNotice error={error || failure}/>{summary}{requireReason && <TextField label="Lý do (ít nhất 5 ký tự)" value={reason} onChange={e => setReason(e.target.value)} fullWidth multiline minRows={2}/>}</EditDialog>;
}
export function DetailLine({ label: caption, children }: {
    label: string;
    children: ReactNode;
}) { return <Box data-ui-detail-line sx={{ minWidth: 0, containerType: 'inline-size' }}><Box sx={[layoutSx.detail.valueGap, layoutSx.detail.rowInsetBlock, { display: 'grid', gridTemplateColumns: 'minmax(8ch, 35%) minmax(0, 1fr)', alignItems: 'start', '@container (max-width: 20rem)': { gridTemplateColumns: 'minmax(0, 1fr)' } }]}><Typography color="text.secondary" sx={{ minWidth: 0, overflowWrap: 'break-word' }}>{caption}</Typography><Box sx={{ textAlign: 'right', overflowWrap: 'anywhere', minWidth: 0, '@container (max-width: 20rem)': { textAlign: 'left' } }}>{children}</Box></Box><Divider /></Box>; }
