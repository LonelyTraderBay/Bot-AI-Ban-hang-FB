import {useEffect,useRef} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Alert,TextField} from '@mui/material';
import {FormFields} from '@/shared/ui/composition';
import {dateOnlyInTimezone,dateOnlyStartOfDayToISOString,isValidDateOnly} from '@/shared/model/format';
function previousMonthRange(timezone: string) {
    const [yearText = '', monthText = ''] = dateOnlyInTimezone(new Date(), timezone).split('-');
    const year = Number(yearText), month = Number(monthText);
    const end = new Date(Date.UTC(year, month - 1, 1));
    const start = new Date(Date.UTC(year, month - 2, 1));
    const dateOnly = (value: Date) => value.toISOString().slice(0, 10);
    return { from: dateOnly(start), to: dateOnly(end) };
}
export function useReportRange(timezone: string) {
    const [params, setParams] = useSearchParams();
    const latestParams = useRef(new URLSearchParams(params));
    const pendingSearch = useRef<string | null>(null);
    useEffect(() => {
        const committedSearch = params.toString();
        if (pendingSearch.current !== null && pendingSearch.current !== committedSearch) return;
        latestParams.current = new URLSearchParams(params);
        pendingSearch.current = null;
    }, [params]);
    const defaults = previousMonthRange(timezone);
    const readDate = (key: 'fromDate' | 'toDate') => {
        if (!params.has(key)) return defaults[key === 'fromDate' ? 'from' : 'to'];
        const value = params.get(key);
        return value === '' ? '' : isValidDateOnly(value) ? value : defaults[key === 'fromDate' ? 'from' : 'to'];
    };
    const readDateFrom = (source: URLSearchParams, key: 'fromDate' | 'toDate') => {
        if (!source.has(key)) return defaults[key === 'fromDate' ? 'from' : 'to'];
        const value = source.get(key);
        return value === '' ? '' : isValidDateOnly(value) ? value : defaults[key === 'fromDate' ? 'from' : 'to'];
    };
    const range = { from: readDate('fromDate'), to: readDate('toDate') };
    const valid = isValidDateOnly(range.from) && isValidDateOnly(range.to) && range.from < range.to;
    const setDate = (key: 'fromDate' | 'toDate', value: string) => {
        const next = new URLSearchParams(latestParams.current);
        next.delete('cursor');
        const from = key === 'fromDate' ? (isValidDateOnly(value) ? value : '') : readDateFrom(next, 'fromDate');
        const to = key === 'toDate' ? (isValidDateOnly(value) ? value : '') : readDateFrom(next, 'toDate');
        next.set('fromDate', from);
        next.set('toDate', to);
        latestParams.current = next;
        pendingSearch.current = next.toString();
        setParams(next, { flushSync: true });
    };
    return {
        range,
        setFrom: (from: string) => setDate('fromDate', from),
        setTo: (to: string) => setDate('toDate', to),
        valid,
        query: {
            from: valid ? dateOnlyStartOfDayToISOString(range.from, timezone) : '',
            to: valid ? dateOnlyStartOfDayToISOString(range.to, timezone) : '',
            timezone,
        },
    };
}
export function ReportRangeFields({ range, timezone, setFrom, setTo }: { range: { from: string; to: string }; timezone: string; setFrom: (value: string) => void; setTo: (value: string) => void }) {
    return <FormFields direction={{ xs: 'column', sm: 'row' }} afterGap="section">
        <TextField type="date" label="Từ ngày" value={range.from} onChange={event => setFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }}/>
        <TextField type="date" label="Đến trước ngày" value={range.to} onChange={event => setTo(event.target.value)} slotProps={{ inputLabel: { shrink: true } }}/>
        <Alert severity="info" sx={{ alignItems: 'center' }}>Khoảng [Từ, Đến); múi giờ {timezone}.</Alert>
    </FormFields>;
}
