import { Controller, Get, Param, Query, Req, Res, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery } from '../../http/query.js';
import { envelope, noStore } from '../../http/response.js';
import { confirmedOrderMarketing } from '../orders/index.js';
import { readAsSession, requireShopAccess } from '../workspace/index.js';
import { accountingDate, financeMoney, financeShop, localAccountingDate } from './journal.js';

const dayMs = 86400000;
const asDate = (time: number) => new Date(time).toISOString().slice(0, 10);

function marketingWindow(raw: Record<string, unknown>, timezone: string, now: Date) {
    const { fromDate, toDate, bucket = 'day' } = listQuery(raw, 'marketing');
    if (Boolean(fromDate) !== Boolean(toDate)) throw new UnprocessableEntityException();
    if (fromDate?.startsWith('0000') || toDate?.startsWith('0000')) throw new UnprocessableEntityException();
    const end = accountingDate(toDate ?? localAccountingDate(now, timezone)).getTime();
    const start = fromDate ? accountingDate(fromDate).getTime() : end - 29 * dayMs;
    if (start > end || end - start >= 366 * dayMs) throw new UnprocessableEntityException();
    return { start, end, bucket, period: { fromDate: asDate(start), toDate: asDate(end), bucket, timezone } };
}

function trendFor(daily: { day: string; orders: number }[], { start, end, bucket }: ReturnType<typeof marketingWindow>) {
    const counts = new Map(daily.map(row => [row.day, row.orders]));
    const trend = [];
    for (let cursor = start; cursor <= end;) {
        const day = new Date(cursor);
        const daysToNext = bucket === 'week' ? 7 - (day.getUTCDay() + 6) % 7 : 1;
        day.setUTCDate(1);
        const next = bucket === 'month' ? day.setUTCMonth(day.getUTCMonth() + 1) : cursor + daysToNext * dayMs;
        const last = Math.min(next - dayMs, end);
        let unknownAttributionOrders = 0;
        for (let time = cursor; time <= last; time += dayMs) unknownAttributionOrders += counts.get(asDate(time)) ?? 0;
        trend.push({ fromDate: asDate(cursor), toDate: asDate(last), knownAttributedOrders: 0, unknownAttributionOrders, estimatedSpend: null, actualSpend: null });
        cursor = next;
    }
    return trend;
}

const reasons = { stock_insufficient: 'Tồn hiện tại chưa đủ', sku_unavailable: 'SKU không bán được', budget_limit: 'Đã đạt giới hạn AI' };

export async function marketingProjection(tx: Prisma.TransactionClient, shopId: string, raw: Record<string, unknown>, now = new Date()) {
    const { timezone, currency } = await financeShop(tx, shopId);
    const window = marketingWindow(raw, timezone, now);
    const { daily, promotions } = await confirmedOrderMarketing(tx, { shopId, currency, ...window.period });
    const { fromDate, toDate } = window.period;
    const outcomes = await tx.$queryRaw<{ outcome: string; count: number }[]>`
        SELECT outcome, count(*)::int AS count FROM bot_inbound_tasks
        WHERE shop_id=${shopId}::uuid AND outcome IS NOT NULL
          AND created_at >= (${fromDate}::date::timestamp AT TIME ZONE ${timezone})
          AND created_at < ((${toDate}::date + 1)::timestamp AT TIME ZONE ${timezone})
        GROUP BY outcome ORDER BY count DESC, outcome
    `;
    return {
        asOf: now, knownAttributedOrders: 0, unknownAttributionOrders: daily.reduce((sum, row) => sum + row.orders, 0),
        topQuestions: outcomes.some(row => row.outcome === 'knowledge') ? ['Câu hỏi tra cứu chính sách và tri thức đã duyệt'] : [],
        lostSaleReasons: outcomes.flatMap(({ outcome, count }) => Object.hasOwn(reasons, outcome) ? [{ reason: reasons[outcome as keyof typeof reasons], count }] : []),
        estimatedSpend: null, actualSpend: null, period: window.period, trend: trendFor(daily, window),
        promotionResults: promotions.map(({ discount, netSales, ...row }) => ({ ...row, discount: financeMoney(discount, currency), netSales: financeMoney(netSales, currency) })),
    };
}

export class MarketingService {
    constructor(private readonly db?: PrismaClient) {}

    get(headers: IncomingHttpHeaders, shopId: string, query: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            await requireShopAccess(tx, userId, shopId, 'reports.read');
            return marketingProjection(tx, shopId, query);
        });
    }
}

@Controller('shops/:shopId/marketing-summary')
export class MarketingController {
    constructor(private readonly marketing: MarketingService) {}

    @Get()
    @ContractOperation('getMarketingSummary')
    async get(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.marketing.get(request.headers, shopId, query));
    }
}
