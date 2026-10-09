import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '../src/mocks/database';
import { marketingSummary } from '../src/mocks/marketing-report';
import type { Input } from '../src/mocks/database';

function input(query: Record<string, string> = {}, shopId = 'shop-demo'): Input {
    return { shopId, id: 'getMarketingSummary', path: { shopId }, query: new URLSearchParams(query), body: {}, userId: 'user-demo', permissions: ['reports.read'] };
}

describe('Marketing report read model', () => {
    beforeEach(() => resetDb());

    it('defaults to 30 inclusive shop-local calendar days and returns API aggregates', () => {
        const summary = marketingSummary(input(), '2026-09-29T14:00:00.000Z');
        expect(summary.period).toEqual({ fromDate: '2026-08-31', toDate: '2026-09-29', bucket: 'day', timezone: 'Asia/Vientiane' });
        expect(summary.trend).toHaveLength(30);
        expect(summary.knownAttributedOrders).toBe(3);
        expect(summary.unknownAttributionOrders).toBe(5);
        expect(summary.estimatedSpend).toEqual({ amount: '750000', currency: 'VND' });
        expect(summary.actualSpend).toBeNull();
        expect(summary.trend?.reduce((sum, point) => sum + point.unknownAttributionOrders, 0)).toBe(summary.unknownAttributionOrders);
    });

    it('uses the shop-local current date when the UTC instant crosses midnight locally', () => {
        const summary = marketingSummary(input(), '2026-09-29T18:30:00.000Z');
        expect(summary.period).toMatchObject({ fromDate: '2026-09-01', toDate: '2026-09-30' });
    });

    it('filters inclusively on the API side and keeps unavailable spend null', () => {
        const summary = marketingSummary(input({ fromDate: '2026-09-18', toDate: '2026-09-24', bucket: 'day' }));
        expect(summary.knownAttributedOrders).toBe(2);
        expect(summary.unknownAttributionOrders).toBe(1);
        expect(summary.estimatedSpend).toEqual({ amount: '400000', currency: 'VND' });
        expect(summary.actualSpend).toBeNull();
        expect(summary.trend?.filter(point => point.knownAttributedOrders > 0)).toHaveLength(2);
    });

    it('groups days into calendar weeks clipped to the requested inclusive range', () => {
        const summary = marketingSummary(input({ fromDate: '2026-09-04', toDate: '2026-09-28', bucket: 'week' }));
        expect(summary.trend?.map(({ fromDate, toDate }) => [fromDate, toDate])).toEqual([
            ['2026-09-04', '2026-09-06'],
            ['2026-09-07', '2026-09-13'],
            ['2026-09-14', '2026-09-20'],
            ['2026-09-21', '2026-09-27'],
            ['2026-09-28', '2026-09-28'],
        ]);
        expect(summary.knownAttributedOrders).toBe(3);
        expect(summary.unknownAttributionOrders).toBe(5);
    });

    it('groups by calendar month and returns zero/null values for empty periods', () => {
        const summary = marketingSummary(input({ fromDate: '2026-09-15', toDate: '2026-10-05', bucket: 'month' }));
        expect(summary.trend?.map(({ fromDate, toDate }) => [fromDate, toDate])).toEqual([
            ['2026-09-15', '2026-09-30'], ['2026-10-01', '2026-10-05'],
        ]);
        expect(summary.trend?.[1]).toMatchObject({ knownAttributedOrders: 0, unknownAttributionOrders: 0, estimatedSpend: null, actualSpend: null });
        expect(summary.estimatedSpend).toEqual({ amount: '400000', currency: 'VND' });
    });

    it('does not borrow sample marketing data across shops', () => {
        const summary = marketingSummary(input({}, 'shop-second'));
        expect(summary.knownAttributedOrders).toBe(0);
        expect(summary.unknownAttributionOrders).toBe(0);
        expect(summary.topQuestions).toEqual([]);
        expect(summary.lostSaleReasons).toEqual([]);
        expect(summary.estimatedSpend).toBeNull();
        expect(summary.actualSpend).toBeNull();
    });

    it.each([
        [{ fromDate: '2026-09-01' }, 'MARKETING_RANGE_INCOMPLETE'],
        [{ fromDate: '2026-02-30', toDate: '2026-03-01' }, 'MARKETING_DATE_INVALID'],
        [{ fromDate: '2026-09-02', toDate: '2026-09-01' }, 'MARKETING_RANGE_REVERSED'],
        [{ fromDate: '2025-10-01', toDate: '2026-10-02' }, 'MARKETING_RANGE_TOO_LARGE'],
        [{ fromDate: '2026-09-01', toDate: '2026-09-10', bucket: 'quarter' }, 'MARKETING_BUCKET_INVALID'],
    ])('rejects invalid range or bucket %j', (query, code) => {
        try {
            marketingSummary(input(query));
            throw new Error('Expected the invalid marketing query to be rejected.');
        } catch (error) {
            expect(error).toMatchObject({ code });
        }
    });
});
