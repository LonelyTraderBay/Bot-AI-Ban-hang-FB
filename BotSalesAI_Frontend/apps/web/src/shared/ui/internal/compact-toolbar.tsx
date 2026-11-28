import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useId, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import type { QueryOperationId } from '../../api/client';
import { currentSearchParams, listFilterValue, supportedListFilters, type ListFilter } from '../../model/filters';
import { layoutSx } from '../layout';

export type ToolbarFilterGroup = { label: string; filters: readonly ListFilter[]; presentation?: 'dialog'; lookupState?: ReactNode };

const filterOptionLabel = (filter: ListFilter, value: string) =>
    value === 'all' ? 'Tất cả' : filter.options.find(option => option.value === value)?.label || value;

function FilterSelect({ filter, value, onChange, quick }: {
    filter: ListFilter;
    value: string;
    onChange: (value: string) => void;
    quick?: boolean;
}) {
    const id = useId();
    return <TextField select id={id} size="small" label={quick ? undefined : filter.label} value={value}
        data-ui-filter-item onChange={event => onChange(event.target.value)}
        slotProps={{ select: {
            SelectDisplayProps: { 'aria-label': quick ? filter.label : undefined, 'aria-labelledby': quick ? undefined : `${id}-label` },
            MenuProps: quick ? { slotProps: { list: { 'aria-label': filter.label } } } : undefined,
            renderValue: quick ? selected => selected === 'all' ? filter.label : `${filter.label} · ${filterOptionLabel(filter, String(selected))}` : undefined,
        } }} sx={quick ? { maxWidth: 'min(15em, 100%)' } : { minWidth: 0 }}>
        <MenuItem value="all">Tất cả</MenuItem>
        {value !== 'all' && !filter.options.some(option => option.value === value) && <MenuItem value={value}>{value}</MenuItem>}
        {filter.options.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
    </TextField>;
}

export default function CompactToolbar({ operation, group, cursorParam, search, Dialog }: {
    operation: QueryOperationId;
    group: ToolbarFilterGroup;
    cursorParam: string;
    search: ReactNode;
    Dialog: ComponentType<{ open: boolean; title: string; onClose: () => void; width: 'compact'; dirtyGuard: boolean; actions: ReactNode; children: ReactNode }>;
}) {
    const [params, setParams] = useSearchParams();
    const { pathname } = useLocation();
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<Record<string, string>>({});
    const [wide, setWide] = useState(false);
    const id = useId();
    const bar = useRef<HTMLDivElement>(null);
    const disclosure = useRef<HTMLButtonElement>(null);
    const filters = supportedListFilters(operation, group.filters);
    const applied = filters.filter(filter => listFilterValue(params, filter) !== 'all');
    const summary = wide ? applied.filter(filter => !filter.pinned) : applied;
    const canReset = filters.some(filter => listFilterValue(params, filter) !== (filter.defaultValue ?? 'all'));
    const popup = group.presentation === 'dialog';

    useLayoutEffect(() => {
        const element = bar.current;
        if (!element) return;
        let previous = false;
        const update = () => {
            const next = element.clientWidth >= 745;
            if (next === previous) return;
            const active = document.activeElement?.closest('[data-ui-filter-item]');
            if (active && element.parentElement?.contains(active)) disclosure.current?.focus();
            previous = next;
            setWide(next);
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const changeFilters = (filter?: ListFilter, value?: string) => {
        const next = currentSearchParams(params, pathname);
        if (!filter || value === undefined) filters.forEach(item => next.delete(item.name));
        else if (value === (filter.defaultValue ?? 'all')) next.delete(filter.name);
        else next.set(filter.name, value);
        next.delete(cursorParam);
        setParams(next);
    };
    const renderFilter = (filter: ListFilter, quick?: boolean) => <FilterSelect key={filter.name} filter={filter}
        value={listFilterValue(params, filter)} quick={quick} onChange={value => changeFilters(filter, value)} />;
    const close = () => {
        setOpen(false);
        disclosure.current?.focus();
    };
    const openFilters = () => {
        if (popup) setDraft(Object.fromEntries(filters.map(filter => [filter.name, listFilterValue(params, filter)])));
        setOpen(value => !value);
    };
    const apply = () => {
        const next = currentSearchParams(params, pathname);
        for (const filter of filters) {
            const value = draft[filter.name] ?? filter.defaultValue ?? 'all';
            if (value === (filter.defaultValue ?? 'all')) next.delete(filter.name);
            else next.set(filter.name, value);
        }
        next.delete(cursorParam);
        setParams(next);
        close();
    };
    return <Stack data-ui-toolbar sx={[layoutSx.toolbar.inset, layoutSx.toolbar.controlGap]}>
        <Stack ref={bar} direction="row" flexWrap="wrap" alignItems="flex-end" sx={layoutSx.toolbar.controlGap}>
            {search}
            {wide && filters.filter(filter => filter.pinned).map(filter => renderFilter(filter, true))}
            {!!filters.length && <Button ref={disclosure} variant="outlined" type="button" aria-expanded={open}
                aria-controls={id} aria-haspopup={popup ? 'dialog' : undefined} onClick={openFilters}>
                {applied.length ? `Bộ lọc (${applied.length})` : 'Bộ lọc'}
            </Button>}
        </Stack>
        {popup ? <Dialog open={open} title={group.label} onClose={close} width="compact" dirtyGuard={false}
            actions={<>
                <Button disabled={!canReset} onClick={() => { changeFilters(); close(); }}>Đặt lại bộ lọc</Button>
                <Button variant="contained" onClick={apply}>Áp dụng bộ lọc</Button>
            </>}>
            <Box id={id} role="group" aria-label={group.label} sx={[layoutSx.toolbar.controlGap, { display: 'grid' }]}>
                {filters.map(filter => <FilterSelect key={filter.name} filter={filter} value={draft[filter.name] ?? filter.defaultValue ?? 'all'}
                    onChange={value => setDraft(previous => ({ ...previous, [filter.name]: value }))} />)}
                {group.lookupState}
            </Box>
        </Dialog> : <Box id={id} hidden={!open} role="group" aria-label={group.label} onKeyDown={event => {
            if (event.key === 'Escape' && event.currentTarget.contains(event.target as Node)) {
                event.preventDefault();
                close();
            }
        }}>
            <Box sx={[layoutSx.toolbar.controlGap, { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', maxWidth: '34rem' }]}>
                {filters.filter(filter => !wide || !filter.pinned).map(filter => renderFilter(filter))}
                {group.lookupState}
            </Box>
            {canReset && <Button type="button" onClick={() => { changeFilters(); disclosure.current?.focus(); }}>
                Đặt lại bộ lọc
            </Button>}
        </Box>}
        {!!summary.length && <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
            {summary.map(filter => `${filter.label}: ${filterOptionLabel(filter, listFilterValue(params, filter))}`).join(' · ')}
        </Typography>}
    </Stack>;
}
