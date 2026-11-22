import { Controller, Get, Param, Query, Req, Res, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { Prisma } from '../../generated/prisma/client.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery } from '../../http/query.js';
import { envelope, noStore } from '../../http/response.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { readAsSession, requireShopAccess } from '../workspace/index.js';
import { reportSourcePermissions } from '../files/index.js';
import { FinanceAccess } from './access.js';
import { accountingDate, financeMoney, financeShop } from './journal.js';
import { accountTotals, journalScope, netDebit, reportJournalIds, reportWindow, sumAmounts } from './report-data.js';

const reportMetadata = (shopId: string, policyVersion: string) => ({
    shopId, policyVersion, asOf: new Date().toISOString(), completeness: 'provisional',
    warnings: ['Số liệu tổng hợp từ bút toán đã ghi trong sổ quản trị.'],
});

export async function cashflowProjection(tx: Prisma.TransactionClient, shopId: string, raw: Record<string, unknown>) {
    const { currency, timezone, policyVersion } = await financeShop(tx, shopId);
    const { firstDay, lastDay, ...window } = reportWindow(listQuery(raw, 'report'), timezone);
    const result = await tx.$queryRaw<{ receipts: Prisma.Decimal; disbursements: Prisma.Decimal; ids: string[] }[]>(Prisma.sql`
        WITH flows AS (
            SELECT j.id, j.effective_date, sum(l.debit-l.credit) AS amount
            FROM finance_journals j JOIN finance_journal_lines l ON l.shop_id=j.shop_id AND l.journal_id=j.id
            JOIN finance_accounts a ON a.shop_id=l.shop_id AND a.id=l.account_id
            WHERE ${journalScope(shopId, currency)} AND j.effective_date BETWEEN ${firstDay}::date AND ${lastDay}::date
              AND a.system_key IN ('cash','bank') AND j.source_type <> 'opening_balance'
            GROUP BY j.id, j.effective_date
        )
        SELECT coalesce(sum(amount) FILTER (WHERE amount > 0), 0) AS receipts,
               coalesce(-sum(amount) FILTER (WHERE amount < 0), 0) AS disbursements,
               coalesce(array_agg(id ORDER BY effective_date, id) FILTER (WHERE amount <> 0), ARRAY[]::uuid[]) AS ids
        FROM flows
    `);
    const [{ receipts, disbursements, ids }] = result;
    const money = (amount: Prisma.Decimal) => financeMoney(amount, currency);
    return { ...reportMetadata(shopId, policyVersion), ...window, receipts: money(receipts), disbursements: money(disbursements),
        netCashMovement: money(new ExactDecimal(receipts).minus(disbursements)), sourceJournalIds: ids };
}

export async function profitLossProjection(tx: Prisma.TransactionClient, shopId: string, raw: Record<string, unknown>) {
    const { currency, timezone, policyVersion } = await financeShop(tx, shopId);
    const { firstDay, lastDay, ...window } = reportWindow(listQuery(raw, 'report'), timezone);
    const range = { shopId, currency, firstDay, lastDay };
    const accounts = await accountTotals(tx, range, false);
    const amount = (key: string) => sumAmounts(accounts.filter(row => row.systemKey === key), netDebit);
    const charges = await tx.$queryRaw<{ category: string; total: Prisma.Decimal }[]>(Prisma.sql`
        SELECT coalesce(e.classification, origin.classification)::text AS category, sum(l.debit-l.credit) AS total
        FROM finance_journals j JOIN finance_journal_lines l ON l.shop_id=j.shop_id AND l.journal_id=j.id
        JOIN finance_accounts a ON a.shop_id=l.shop_id AND a.id=l.account_id
        LEFT JOIN finance_entries e ON e.shop_id=j.shop_id AND e.journal_id=j.id
        LEFT JOIN finance_entries origin ON origin.shop_id=j.shop_id AND origin.journal_id=j.reversal_of
        WHERE ${journalScope(shopId, currency)} AND j.effective_date BETWEEN ${firstDay}::date AND ${lastDay}::date
          AND a.system_key='operating_expense' AND coalesce(e.classification, origin.classification) IN ('platform_fee','payment_fee','ai_expense')
        GROUP BY 1
    `);
    const [{ discount }] = await tx.$queryRaw<{ discount: Prisma.Decimal }[]>(Prisma.sql`
        SELECT coalesce(sum(ol.discount), 0) AS discount
        FROM finance_journals j JOIN shipments s ON s.shop_id=j.shop_id AND s.id::text=j.source_id
        JOIN order_lines ol ON ol.shop_id=s.shop_id AND ol.order_id=s.order_id AND ol.retired_at IS NULL
        WHERE ${journalScope(shopId, currency)} AND j.source_type='shipment' AND j.event_type='delivery'
          AND j.effective_date BETWEEN ${firstDay}::date AND ${lastDay}::date
    `);
    const charge = (key: string) => new ExactDecimal(charges.find(row => row.category === key)?.total ?? 0);
    const shippingExpense = amount('carrier_fees');
    const platformFees = charge('platform_fee');
    const paymentFees = charge('payment_fee');
    const aiExpense = charge('ai_expense');
    const sales = amount('sales').neg();
    const returns = amount('sales_returns');
    const netSales = sales.minus(returns);
    const cogs = amount('cost_of_goods');
    const income = sumAmounts(accounts.filter(row => row.group === 'income'), row => netDebit(row).neg());
    const expenses = sumAmounts(accounts.filter(row => row.group === 'expense'), netDebit);
    const money = (value: Prisma.Decimal) => financeMoney(value, currency);
    return {
        ...reportMetadata(shopId, policyVersion), ...window, grossSales: money(sales.plus(discount)), discounts: money(discount),
        salesReturns: money(returns), netSales: money(netSales), cogs: money(cogs), grossProfit: money(netSales.minus(cogs)),
        operatingProfit: money(income.minus(expenses)), shippingIncome: null, shippingExpense: money(shippingExpense),
        platformFees: money(platformFees), paymentFees: money(paymentFees), aiExpense: money(aiExpense),
        otherOperatingExpenses: money(expenses.minus(cogs).minus(shippingExpense).minus(platformFees).minus(paymentFees).minus(aiExpense)),
        sourceJournalIds: await reportJournalIds(tx, range),
    };
}

export class FinanceReports extends FinanceAccess {
    cashflow(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, tx => cashflowProjection(tx, shopId, raw));
    }

    profitLoss(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, tx => profitLossProjection(tx, shopId, raw));
    }

    trialBalance(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async tx => {
            const { currency, timezone, policyVersion } = await financeShop(tx, shopId);
            const { firstDay, lastDay, ...window } = reportWindow(listQuery(raw, 'report'), timezone);
            const accounts = await accountTotals(tx, { shopId, currency, firstDay, lastDay }, true);
            const money = (amount: Prisma.Decimal) => financeMoney(amount, currency);
            const positive = (value: Prisma.Decimal) => ExactDecimal.max(value, 0);
            const rows = accounts.map(({ opening, debit, credit, systemKey: _systemKey, ...row }) => {
                const initial = new ExactDecimal(opening);
                const closing = initial.plus(debit).minus(credit);
                return { ...row, debit, credit, openingDebit: positive(initial), openingCredit: positive(initial.neg()),
                    closingDebit: positive(closing), closingCredit: positive(closing.neg()) };
            });
            const totalDebit = sumAmounts(rows, row => row.debit);
            const totalCredit = sumAmounts(rows, row => row.credit);
            const closingDebit = sumAmounts(rows, row => row.closingDebit);
            const closingCredit = sumAmounts(rows, row => row.closingCredit);
            const difference = closingDebit.minus(closingCredit);
            return {
                ...reportMetadata(shopId, policyVersion), ...window,
                rows: rows.map(({ debit, credit, openingDebit, openingCredit, closingDebit, closingCredit, ...row }) => ({
                    ...row, debit: money(debit), credit: money(credit), openingDebit: money(openingDebit), openingCredit: money(openingCredit),
                    closingDebit: money(closingDebit), closingCredit: money(closingCredit),
                })),
                totalDebit: money(totalDebit), totalCredit: money(totalCredit), closingDebit: money(closingDebit), closingCredit: money(closingCredit),
                difference: money(difference), balanced: totalDebit.eq(totalCredit) && difference.isZero(),
            };
        });
    }

    balanceSheet(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async tx => {
            const { atDate } = raw;
            if (typeof atDate !== 'string' || Object.keys(raw).length !== 1) throw new UnprocessableEntityException();
            accountingDate(atDate);
            const { currency, policyVersion } = await financeShop(tx, shopId);
            const range = { shopId, currency, firstDay: '0001-01-01', lastDay: atDate };
            const accounts = await accountTotals(tx, range, false);
            const assetOrExpense = (group: string) => group === 'asset' || group === 'expense';
            const balance = (row: (typeof accounts)[number]) => assetOrExpense(row.group) ? netDebit(row) : netDebit(row).neg();
            const groupTotal = (group: string) => sumAmounts(accounts.filter(row => row.group === group), balance);
            const assets = groupTotal('asset');
            const liabilities = groupTotal('liability');
            const equity = groupTotal('equity');
            const retainedProfit = groupTotal('income').minus(groupTotal('expense'));
            const difference = assets.minus(liabilities).minus(equity).minus(retainedProfit);
            const money = (amount: Prisma.Decimal) => financeMoney(amount, currency);
            return { ...reportMetadata(shopId, policyVersion), atDate, assets: money(assets), liabilities: money(liabilities),
                equity: money(equity), retainedProfit: money(retainedProfit), difference: money(difference), balanced: difference.isZero(),
                rows: accounts.map(row => ({ accountId: row.accountId, code: row.code, name: row.name, group: row.group, balance: money(balance(row)) })),
                sourceJournalIds: await reportJournalIds(tx, range),
            };
        });
    }

    summary(headers: IncomingHttpHeaders, shopId: string) {
        return readAsSession(this.db, headers, async (tx, actor) => {
            const { permissions } = await requireShopAccess(tx, actor, shopId, 'reports.read');
            return { shopId, asOf: new Date().toISOString(), warnings: [],
                availableReports: Object.entries(reportSourcePermissions).flatMap(([report, permission]) => permissions.includes(permission) ? [report] : []) };
        });
    }
}

@Controller('shops/:shopId')
export class FinanceReportsController {
    constructor(private readonly reports: FinanceReports) {}

    @Get('finance/cashflow')
    @ContractOperation('getCashflow')
    async cashflow(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.reports.cashflow(request.headers, shopId, query));
    }

    @Get('finance/profit-loss')
    @ContractOperation('getProfitLoss')
    async profitLoss(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.reports.profitLoss(request.headers, shopId, query));
    }

    @Get('finance/trial-balance')
    @ContractOperation('getTrialBalance')
    async trialBalance(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.reports.trialBalance(request.headers, shopId, query));
    }

    @Get('finance/balance-sheet')
    @ContractOperation('getBalanceSheet')
    async balanceSheet(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.reports.balanceSheet(request.headers, shopId, query));
    }

    @Get('reports')
    @ContractOperation('getReportSummary')
    async summary(@Param('shopId', idPipe) shopId: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.reports.summary(request.headers, shopId));
    }
}
