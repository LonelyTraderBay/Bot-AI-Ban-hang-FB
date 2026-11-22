import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma, type AccountingPeriod } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { requireVersion } from '../../http/response.js';
import { approvalInShop, recordApproval, requireApprovalPolicy, updateApprovalState, type ApprovalResource } from '../operations/index.js';
import { financeKey, financeShop, localAccountingDate } from './journal.js';

const action = 'finance.period.reopen';
const resourceType = 'accounting_period';
const day = (date: Date) => date.toISOString().slice(0, 10);

export async function periodInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const period = await tx.accountingPeriod.findUnique({ where: financeKey(shopId, id) });
    if (!period) throw new NotFoundException();
    return period;
}

export function periodIntent(period: AccountingPeriod) {
    return createHash('sha256').update(JSON.stringify([action, period.shopId, period.id, period.version, day(period.startDate), day(period.endDate)])).digest('hex');
}

export async function periodViews(tx: Prisma.TransactionClient, shopId: string, periods: AccountingPeriod[]) {
    const open = periods.filter(period => period.state === 'open');
    const blocking = new Map<string, string[]>();
    if (open.length > 0) {
        const { timezone } = await financeShop(tx, shopId);
        const today = localAccountingDate(new Date(), timezone);
        const conditions = await tx.$queryRaw<{ id: string; journal: boolean; entry: boolean; opening: boolean; bank: boolean; cod: boolean; mismatch: boolean }[]>(Prisma.sql`
            SELECT p.id,
              EXISTS (SELECT 1 FROM finance_journals j WHERE j.shop_id=p.shop_id AND j.period_id=p.id AND j.status='draft') AS journal,
              EXISTS (SELECT 1 FROM finance_entries e WHERE e.shop_id=p.shop_id AND e.status='draft'
                      AND (e.occurred_at AT TIME ZONE ${timezone})::date BETWEEN p.start_date AND p.end_date) AS entry,
              EXISTS (SELECT 1 FROM opening_balances o WHERE o.shop_id=p.shop_id AND o.status='draft'
                      AND o.effective_date BETWEEN p.start_date AND p.end_date) AS opening,
              EXISTS (SELECT 1 FROM bank_transactions t JOIN reconciliation_cases c ON c.shop_id=t.shop_id AND c.transaction_id=t.id
                      WHERE t.shop_id=p.shop_id AND c.state <> 'matched'
                        AND (t.occurred_at AT TIME ZONE ${timezone})::date BETWEEN p.start_date AND p.end_date) AS bank,
              EXISTS (SELECT 1 FROM cod_settlements c JOIN cod_settlement_orders co ON co.shop_id=c.shop_id AND co.settlement_id=c.id
                      JOIN shipments s ON s.shop_id=co.shop_id AND s.order_id=co.order_id
                      WHERE c.shop_id=p.shop_id AND c.status <> 'matched'
                        AND (s.delivered_at AT TIME ZONE ${timezone})::date BETWEEN p.start_date AND p.end_date) AS cod,
              EXISTS (SELECT 1 FROM work_items w WHERE w.shop_id=p.shop_id AND w.kind='payment_mismatch'
                        AND w.state NOT IN ('completed','cancelled')
                        AND (w.created_at AT TIME ZONE ${timezone})::date BETWEEN p.start_date AND p.end_date) AS mismatch
            FROM accounting_periods p WHERE p.shop_id=${shopId}::uuid AND p.id IN (${Prisma.join(open.map(period => Prisma.sql`${period.id}::uuid`))})
        `);
        for (const row of conditions) {
            const end = open.find(period => period.id === row.id)!.endDate;
            blocking.set(row.id, [
                ...(day(end) > today ? ['Kỳ còn ngày kế toán trong tương lai.'] : []),
                ...(row.journal ? ['Còn bút toán nháp.'] : []),
                ...(row.entry ? ['Còn phiếu thu chi nháp trong kỳ.'] : []),
                ...(row.opening ? ['Còn hồ sơ mở sổ nháp trong kỳ.'] : []),
                ...(row.bank ? ['Còn giao dịch ngân hàng chưa đối soát trong kỳ.'] : []),
                ...(row.cod ? ['Còn quyết toán COD chưa khớp trong kỳ.'] : []),
                ...(row.mismatch ? ['Còn khoản thu hoặc hoàn có chênh lệch cần kiểm trong kỳ.'] : []),
            ]);
        }
    }
    return periods.map(period => ({ ...period, startDate: day(period.startDate), endDate: day(period.endDate),
        blockingIssues: blocking.get(period.id) ?? [] }));
}

export async function lockedPeriod(tx: Prisma.TransactionClient, shopId: string, id: string, version: number) {
    if (!validUuid(id)) throw new NotFoundException();
    await tx.$queryRaw`SELECT id FROM accounting_periods WHERE shop_id=${shopId}::uuid AND id=${id}::uuid FOR UPDATE`;
    const current = await periodInShop(tx, shopId, id);
    requireVersion(current.version, version);
    return current;
}

export async function consumePeriodApproval(tx: Prisma.TransactionClient, period: AccountingPeriod, approvalId: string) {
    const approval = await approvalInShop(tx, period.shopId, approvalId);
    await requireApprovalPolicy(tx, approval, 'approved');
    if (approval.action !== action || approval.resourceType !== resourceType || approval.resourceId !== period.id ||
        approval.resourceVersion !== period.version || approval.intentHash !== periodIntent(period)) throw new ConflictException();
    await updateApprovalState(tx, approval, { status: 'consumed' });
}

export const periodApprovalResource: ApprovalResource = {
    action, resourceType,
    async request(tx, scope, input) {
        if (!scope.permissions.includes('finance.close')) throw new ForbiddenException();
        const period = await lockedPeriod(tx, scope.shopId, input.resource.id, input.resourceVersion);
        if (period.state !== 'closed' || input.intentHash !== periodIntent(period)) throw new ConflictException();
        if (await tx.approval.findFirst({ where: { shopId: period.shopId, action, resourceType, resourceId: period.id,
            resourceVersion: period.version, status: { in: ['pending', 'approved'] }, expiresAt: { gt: new Date() } } })) throw new ConflictException();
        return recordApproval(tx, { shopId: period.shopId, action, resourceType, resourceId: period.id, resourceVersion: period.version,
            intentHash: input.intentHash, requestedBy: scope.userId, amount: null, currency: null });
    },
    async decide(tx, _scope, approval) {
        const period = await lockedPeriod(tx, approval.shopId, approval.resourceId, approval.resourceVersion);
        if (period.state !== 'closed' || approval.intentHash !== periodIntent(period)) throw new ConflictException();
        return period.version;
    },
};
