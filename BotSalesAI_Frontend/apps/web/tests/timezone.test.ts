import { describe, expect, it } from 'vitest';
import { dateOnlyInTimezone, dateOnlyStartOfDayToISOString, dateTimeLocalInput, dateTimeLocalToISOString, isValidDateOnly, isValidTimeZone } from '../src/shared/model/format';

describe('shop-timezone date and time fields', () => {
    const monthBoundary = new Date('2026-09-30T17:30:00.000Z');

    it('derives a calendar date and datetime-local value from the shop timezone', () => {
        expect(dateOnlyInTimezone(monthBoundary, 'Asia/Vientiane')).toBe('2026-10-01');
        expect(dateTimeLocalInput(monthBoundary, 'Asia/Vientiane')).toBe('2026-10-01T00:30');
    });

    it('converts shop-local wall time to the matching UTC instant', () => {
        expect(dateTimeLocalToISOString('2026-10-01T12:00', 'Asia/Vientiane')).toBe('2026-10-01T05:00:00.000Z');
    });

    it('converts a date-only boundary using the selected calendar date and timezone', () => {
        expect(dateOnlyStartOfDayToISOString('2026-09-30', 'UTC')).toBe('2026-09-30T00:00:00.000Z');
        expect(dateOnlyStartOfDayToISOString('2026-09-30', 'Asia/Vientiane')).toBe('2026-09-29T17:00:00.000Z');
        expect(dateOnlyStartOfDayToISOString('2026-09-30', 'America/Los_Angeles')).toBe('2026-09-30T07:00:00.000Z');
        expect(dateOnlyStartOfDayToISOString('2026-10-01', 'Asia/Vientiane')).toBe('2026-09-30T17:00:00.000Z');
        expect(dateOnlyStartOfDayToISOString('0000-01-01', 'UTC')).toBe('0000-01-01T00:00:00.000Z');
    });

    it('keeps the start of a daylight-saving day at local midnight', () => {
        expect(dateOnlyStartOfDayToISOString('2026-03-08', 'America/New_York')).toBe('2026-03-08T05:00:00.000Z');
    });

    it('uses the first valid instant when a DST transition skips local midnight', () => {
        expect(dateOnlyStartOfDayToISOString('2018-11-04', 'America/Sao_Paulo')).toBe('2018-11-04T03:00:00.000Z');
    });

    it('rejects malformed dates, skipped whole dates and invalid timezones for day boundaries', () => {
        expect(() => dateOnlyStartOfDayToISOString('2026-02-29', 'UTC')).toThrow(RangeError);
        expect(() => dateOnlyStartOfDayToISOString('2011-12-30', 'Pacific/Apia')).toThrow(RangeError);
        expect(() => dateOnlyStartOfDayToISOString('2026-09-30', 'Mars/OlympusMons')).toThrow(RangeError);
    });

    it('rejects malformed dates and local times skipped by a daylight-saving transition', () => {
        expect(dateTimeLocalToISOString('2026-02-31T12:00', 'Asia/Vientiane')).toBeNull();
        expect(dateTimeLocalToISOString('2026-03-08T02:30', 'America/Los_Angeles')).toBeNull();
    });

    it('chooses the earlier instant when a fall-back transition repeats a local time', () => {
        expect(dateTimeLocalToISOString('2026-11-01T01:30', 'America/Los_Angeles')).toBe('2026-11-01T08:30:00.000Z');
    });

    it('accepts only real calendar dates from URL state', () => {
        expect(isValidDateOnly('2024-02-29')).toBe(true);
        expect(isValidDateOnly('2026-02-29')).toBe(false);
        expect(isValidDateOnly('2026-13-01')).toBe(false);
        expect(isValidDateOnly('not-a-date')).toBe(false);
        expect(isValidDateOnly('')).toBe(false);
    });

    it('validates shop timezones without exposing Intl exceptions to form state', () => {
        expect(isValidTimeZone('Asia/Vientiane')).toBe(true);
        expect(isValidTimeZone('Mars/OlympusMons')).toBe(false);
        expect(isValidTimeZone(' Asia/Vientiane ')).toBe(false);
        expect(isValidTimeZone('')).toBe(false);
    });
});
