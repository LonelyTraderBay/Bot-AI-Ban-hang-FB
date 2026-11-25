import { Controller, Get, Param, Query, Req, Res, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery } from '../../http/query.js';
import { envelope, noStore } from '../../http/response.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { marketingConversationSignals } from '../inbox/index.js';
import { sellableAvailability } from '../inventory/index.js';
import { confirmedOrderMarketing } from '../orders/index.js';
import { readAsSession, requireShopAccess } from '../workspace/index.js';
import { accountingDate, financeMoney, financeShop, localAccountingDate } from './journal.js';
import { advertisingEvidence, classifiedExpenses, sumAmounts } from './report-data.js';
import { latestAdvertisingEstimates } from './advertising-estimates.js';

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

type OrderMarketing = Awaited<ReturnType<typeof confirmedOrderMarketing>>;

function trendFor(daily: OrderMarketing['daily'], { start, end, bucket }: ReturnType<typeof marketingWindow>,
    expenses: ReadonlyMap<string, Prisma.Decimal>, estimates: ReadonlyMap<string, Prisma.Decimal>, currency: string) {
    const counts = new Map(daily.map(row => [row.day, row]));
    const trend = [];
    for (let cursor = start; cursor <= end;) {
        const day = new Date(cursor);
        const daysToNext = bucket === 'week' ? 7 - (day.getUTCDay() + 6) % 7 : 1;
        day.setUTCDate(1);
        const next = bucket === 'month' ? day.setUTCMonth(day.getUTCMonth() + 1) : cursor + daysToNext * dayMs;
        const last = Math.min(next - dayMs, end);
        let knownAttributedOrders = 0;
        let estimatedAttributedOrders = 0;
        let unknownAttributionOrders = 0;
        let actualSpend: Prisma.Decimal | null = null;
        let estimatedSpend: Prisma.Decimal | null = null;
        for (let time = cursor; time <= last; time += dayMs) {
            const date = asDate(time);
            const count = counts.get(date);
            knownAttributedOrders += count?.known ?? 0;
            estimatedAttributedOrders += count?.estimated ?? 0;
            unknownAttributionOrders += count?.unknown ?? 0;
            const amount = expenses.get(date);
            if (amount) actualSpend = (actualSpend ?? new ExactDecimal(0)).plus(amount);
            const estimate = estimates.get(date);
            if (estimate) estimatedSpend = (estimatedSpend ?? new ExactDecimal(0)).plus(estimate);
        }
        trend.push({ fromDate: asDate(cursor), toDate: asDate(last), knownAttributedOrders, estimatedAttributedOrders, unknownAttributionOrders,
            estimatedSpend: estimatedSpend === null ? null : financeMoney(estimatedSpend, currency),
            actualSpend: actualSpend === null ? null : financeMoney(actualSpend, currency) });
        cursor = next;
    }
    return trend;
}

type CampaignTotals = {
    channel: string; campaignId: string; knownOrders: number; estimatedOrders: number;
    orderId: string | null; attributionSourceId: string | null;
    actualSpend: ReturnType<typeof financeMoney> | null; spendJournalId: string | null;
};

function campaignResults(orders: OrderMarketing['campaigns'], expenses: Awaited<ReturnType<typeof advertisingEvidence>>,
    currency: string, canReadOrders: boolean) {
    const key = (channel: string, campaignId: string) => channel + '/' + campaignId;
    const groups = new Map<string, CampaignTotals>(orders.map(row => [key(row.channel, row.campaignId), {
        ...row, orderId: canReadOrders ? row.orderId : null, attributionSourceId: canReadOrders ? row.attributionSourceId : null,
        actualSpend: null, spendJournalId: null,
    }]));
    for (const { channel, campaignId, total, journalId } of expenses) {
        if (!channel || !campaignId) continue;
        const id = key(channel, campaignId);
        const current = groups.get(id) ?? { channel, campaignId, knownOrders: 0, estimatedOrders: 0, orderId: null, attributionSourceId: null };
        groups.set(id, { ...current, actualSpend: financeMoney(total, currency), spendJournalId: journalId });
    }
    return [...groups.values()].slice(0, 50);
}

export async function marketingProjection(tx: Prisma.TransactionClient, shopId: string, raw: Record<string, unknown>,
    permissions: readonly string[], now = new Date()) {
    const { timezone, currency } = await financeShop(tx, shopId);
    const window = marketingWindow(raw, timezone, now);
    const canReadOrders = permissions.includes('orders.read');
    const { daily, promotions, demand, campaigns } = await confirmedOrderMarketing(tx, { shopId, currency, ...window.period }, now,
        canReadOrders && permissions.includes('inventory.read'));
    const { fromDate, toDate } = window.period;
    const canReadFinance = permissions.includes('finance.read');
    const range = { shopId, currency, firstDay: fromDate, lastDay: toDate };
    const advertising = canReadFinance ? await classifiedExpenses(tx, range, ['advertising_expense']) : [];
    const spend = canReadFinance ? await advertisingEvidence(tx, range, now) : [];
    const estimates = canReadFinance ? await latestAdvertisingEstimates(tx, shopId, currency, fromDate, toDate, now) : [];
    const signals = permissions.includes('conversations.read')
        ? await marketingConversationSignals(tx, shopId, window.period, now, permissions.includes('knowledge.read')) : undefined;
    let demandStock;
    if (demand) {
        const shop = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { defaultWarehouseId: true } });
        const available = await sellableAvailability(tx, shopId, shop.defaultWarehouseId, demand.map(row => row.variantId));
        demandStock = demand.map(row => ({ ...row, availableUnits: available.get(row.variantId) ?? null }));
    }
    const total = (kind: 'known' | 'estimated' | 'unknown') => daily.reduce((sum, row) => sum + row[kind], 0);
    return {
        asOf: now, knownAttributedOrders: total('known'), estimatedAttributedOrders: total('estimated'), unknownAttributionOrders: total('unknown'),
        topQuestions: signals?.questionTopics?.map(row => row.title) ?? [],
        lostSaleReasons: signals?.blockers.map(({ reason, count }) => ({ reason, count })) ?? [],
        lostSaleEvidence: signals?.blockers,
        questionTopics: signals?.questionTopics,
        demandStock,
        estimatedSpend: estimates.length ? financeMoney(sumAmounts(estimates, row => row.total), currency) : null,
        estimateCoverage: estimates.length ? {
            lastRecordedAt: new Date(Math.max(...estimates.map(row => row.recordedAt.getTime()))).toISOString(),
            daysWithEstimate: estimates.length, daysInPeriod: (window.end - window.start) / dayMs + 1,
        } : undefined,
        actualSpend: advertising.length ? financeMoney(sumAmounts(advertising, row => row.total), currency) : null,
        actualSpendSources: canReadFinance ? spend.slice(0, 25).map(({ channel, campaignId, journalId, sourceId }) =>
            ({ channel, campaignId, journalId, sourceId })) : undefined,
        campaignResults: campaignResults(campaigns, spend, currency, canReadOrders),
        period: window.period, trend: trendFor(daily, window,
            new Map(advertising.map(row => [row.day, row.total])), new Map(estimates.map(row => [row.day, row.total])), currency),
        promotionResults: promotions.map(({ discount, netSales, orderId, ...row }) =>
            ({ ...row, orderId: canReadOrders ? orderId : undefined, discount: financeMoney(discount, currency), netSales: financeMoney(netSales, currency) })),
    };
}

export class MarketingService {
    constructor(private readonly db?: PrismaClient) {}

    get(headers: IncomingHttpHeaders, shopId: string, query: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'reports.read');
            return marketingProjection(tx, shopId, query, scope.permissions);
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
