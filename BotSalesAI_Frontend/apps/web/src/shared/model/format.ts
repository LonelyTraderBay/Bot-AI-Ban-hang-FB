import type { Money } from '@botsales/contracts';

/** JSON Schema counts Unicode code points, including combining marks, rather than UTF-16 units. */
export function codePointLength(value: string): number {
    return Array.from(value).length;
}

export function limitCodePoints(value: string, maximum: number): string {
    return Array.from(value).slice(0, maximum).join('');
}

type LocalDateTimeParts = { year: number; month: number; day: number; hour: number; minute: number; second?: number };

function localDateTimeParts(instant: Date, timezone: string): LocalDateTimeParts {
    const formatted = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        calendar: 'gregory',
        numberingSystem: 'latn',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(instant);
    const part = (name: Intl.DateTimeFormatPartTypes) => {
        const value = formatted.find(item => item.type === name)?.value;
        if (value === undefined)
            throw new RangeError(`Missing local date-time part: ${name}`);
        return Number(value);
    };
    return { year: part('year'), month: part('month'), day: part('day'), hour: part('hour'), minute: part('minute') };
}

function utcMilliseconds(parts: LocalDateTimeParts): number {
    const value = new Date(0);
    value.setUTCFullYear(parts.year, parts.month - 1, parts.day);
    value.setUTCHours(parts.hour, parts.minute, parts.second || 0, 0);
    return value.getTime();
}

function localDateTimeText(parts: LocalDateTimeParts): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${String(parts.year).padStart(4, '0')}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function dateOnlyInTimezone(instant: Date, timezone: string): string {
    return localDateTimeText(localDateTimeParts(instant, timezone)).slice(0, 10);
}

export function isValidDateOnly(value: string | null | undefined): value is string {
    if (!value)
        return false;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match)
        return false;
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.getUTCFullYear() === Number(match[1])
        && date.getUTCMonth() === Number(match[2]) - 1
        && date.getUTCDate() === Number(match[3]);
}

/** Validate an IANA timezone before it reaches API input or a formatter. */
export function isValidTimeZone(value: string | null | undefined): boolean {
    if (!value || value !== value.trim())
        return false;
    try {
        new Intl.DateTimeFormat('vi-VN', { timeZone: value }).format(new Date(0));
        return true;
    }
    catch {
        return false;
    }
}

/** Format a calendar date without treating it as an instant or shifting it by timezone. */
export function formatDateOnly(value: string | null | undefined): string {
    if (!isValidDateOnly(value))
        return value ? 'Ngày không hợp lệ' : 'Chưa ghi nhận';
    const [year = 0, month = 1, day = 1] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** Convert a date-only value to the first instant in that local calendar day. */
export function dateOnlyStartOfDayToISOString(value: string, timezone: string): string {
    if (!isValidDateOnly(value))
        throw new RangeError('Ngày phải là ngày lịch hợp lệ theo định dạng YYYY-MM-DD.');

    const [year = 0, month = 0, day = 0] = value.split('-').map(Number);
    const target = utcMilliseconds({ year, month, day, hour: 0, minute: 0 });
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        calendar: 'gregory',
        numberingSystem: 'latn',
        year: 'numeric',
        era: 'short',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    });
    const localPartsAt = (instant: number): LocalDateTimeParts => {
        const parts = formatter.formatToParts(new Date(instant));
        const part = (name: Intl.DateTimeFormatPartTypes) => {
            const partValue = parts.find(item => item.type === name)?.value;
            if (partValue === undefined)
                throw new RangeError(`Missing local date-time part: ${name}`);
            return Number(partValue);
        };
        const displayYear = part('year');
        const era = parts.find(item => item.type === 'era')?.value;
        return { year: era === 'BC' ? 1 - displayYear : displayYear, month: part('month'), day: part('day'), hour: part('hour'), minute: part('minute'), second: part('second') };
    };

    // Sample both sides of nearby offset changes, including midnight DST gaps/folds.
    const offsets = new Set<number>();
    for (let sampleStep = -3; sampleStep <= 3; sampleStep++) {
        const sample = target + sampleStep * 12 * 60 * 60 * 1000;
        offsets.add(utcMilliseconds(localPartsAt(sample)) - sample);
    }

    const exactMidnights: number[] = [];
    const firstRepresentableTimes: { wallTime: number; instant: number }[] = [];
    for (const offset of offsets) {
        const instant = target - offset;
        const local = localPartsAt(instant);
        const wallTime = utcMilliseconds(local);
        if (wallTime === target) {
            exactMidnights.push(instant);
        }
        else if (local.year === year && local.month === month && local.day === day && wallTime > target) {
            firstRepresentableTimes.push({ wallTime, instant });
        }
    }

    if (exactMidnights.length > 0)
        return new Date(Math.min(...exactMidnights)).toISOString();

    firstRepresentableTimes.sort((left, right) => left.wallTime - right.wallTime || left.instant - right.instant);
    if (firstRepresentableTimes[0])
        return new Date(firstRepresentableTimes[0].instant).toISOString();

    throw new RangeError('Ngày này không tồn tại trong múi giờ đã chọn.');
}

export function dateTimeLocalInput(instant: Date, timezone: string): string {
    return localDateTimeText(localDateTimeParts(instant, timezone));
}

/** Returns null for malformed dates and wall times that do not exist in the requested timezone. */
export function dateTimeLocalToISOString(value: string, timezone: string): string | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
    if (!match)
        return null;
    const [, yearText, monthText, dayText, hourText, minuteText] = match;
    const parts = { year: Number(yearText), month: Number(monthText), day: Number(dayText), hour: Number(hourText), minute: Number(minuteText) };
    if (parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.hour > 23 || parts.minute > 59)
        return null;
    const target = utcMilliseconds(parts);
    const normalized = new Date(target);
    if (normalized.getUTCFullYear() !== parts.year || normalized.getUTCMonth() + 1 !== parts.month || normalized.getUTCDate() !== parts.day)
        return null;

    let candidate = target;
    for (let attempt = 0; attempt < 5; attempt++) {
        const observed = localDateTimeParts(new Date(candidate), timezone);
        const delta = target - utcMilliseconds(observed);
        if (delta === 0)
            return localDateTimeText(observed) === value ? new Date(candidate).toISOString() : null;
        candidate += delta;
    }
    return null;
}

export function formatMoney(value: Money | null | undefined): string {
    if (!value)
        return 'Chưa có dữ liệu';
    const negative = value.amount.startsWith('-');
    const [integer, frac = ''] = value.amount.replace(/^-/, '').split('.');
    const grouped = (integer || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const decimal = frac.replace(/0+$/, '');
    const symbol: Record<string, string> = { VND: '₫', LAK: '₭', THB: '฿', USD: 'USD' };
    return `${negative ? '−' : ''}${grouped}${decimal ? ',' + decimal : ''} ${symbol[value.currency] || value.currency}`;
}
export function dateTime(value: string | null | undefined, timezone: string): string {
    if (!value)
        return 'Chưa ghi nhận';
    const d = new Date(value);
    if (Number.isNaN(d.getTime()))
        return 'Thời gian không hợp lệ';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: timezone }).format(d);
}
export function safeInternalPath(input: string | null, fallback = '/workspaces'): string {
    if (!input || !input.startsWith('/') || input.startsWith('//') || /[\\\r\n]/.test(input) || input.includes('\0'))
        return fallback;
    const u = new URL(input, 'https://botsales.invalid');
    return u.origin === 'https://botsales.invalid' ? u.pathname + u.search + u.hash : fallback;
}
export function csvCell(value: unknown): string {
    let text = String(value ?? '');
    if (/^[\s]*[=+\-@\t\r]/.test(text))
        text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
}
export function downloadText(filename: string, text: string, mime = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
