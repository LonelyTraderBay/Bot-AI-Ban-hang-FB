import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { BudgetPeriod, Prisma, type BudgetPolicy, type PrismaClient } from '../../generated/prisma/client.js';
import { listQuery, paging, validUuid } from '../../http/query.js';
import { requireVersion } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { accountingDate, financeMoney, localAccountingDate, parseMoney, type Money } from '../finance/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig } from '../workspace/index.js';
import { approvalInShop, recordApproval, requireApprovalPolicy, updateApprovalState, type ApprovalResource } from './approvals.js';

export type BudgetWrite = { expectedVersion: number; limitAmount: Money; period: BudgetPeriod; approvalId: string };
export const budgetCommand = { operationId: 'updateBudgetPolicy', resourceType: 'budget_policy' };
const budgetAction = (period: BudgetPeriod) => 'budget.change.' + period;

export async function budgetInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const row = await tx.budgetPolicy.findUnique({ where: { shopId_id: { shopId, id } } });
    if (!row) throw new NotFoundException();
    return row;
}

export function budgetPeriodKey(period: BudgetPeriod, date: Date, timezone: string, orderId?: string) {
    const localDay = localAccountingDate(date, timezone);
    if (period === 'per_order') return orderId ?? 'per_order';
    return period === 'monthly' ? localDay.slice(0, 7) : localDay;
}

function intentHash(row: BudgetPolicy, amount: Prisma.Decimal, period: BudgetPeriod) {
    return createHash('sha256').update(JSON.stringify([budgetAction(period), row.shopId, row.id, row.version, amount.toFixed(), row.currency])).digest('hex');
}

function checkPeriod(row: BudgetPolicy, period: BudgetPeriod) {
    if (row.kind !== 'procurement' && period !== 'daily') throw new UnprocessableEntityException('Hạn mức cho loại này áp dụng theo ngày.');
}

export const budgetApprovalResources: ApprovalResource[] = Object.values(BudgetPeriod).map(period => ({
    action: budgetAction(period), resourceType: 'budget_policy',
    async request(tx, scope, input) {
        await requireShopAccess(tx, scope.userId, scope.shopId, 'operations.manage');
        const row = await budgetInShop(tx, scope.shopId, input.resource.id);
        requireVersion(row.version, input.resourceVersion);
        checkPeriod(row, period);
        // ApprovalCreate already carries the intent hash, resource version and reason.
        // Its first reason line records the exact amount a human will see in the approval.
        const proposal = /^LIMIT ([0-9]+(?:\.[0-9]+)?) ([A-Z]{3})\r?\n([\s\S]+)$/.exec(input.reason.trim());
        if (!proposal || proposal[3].trim().length < 5) throw new UnprocessableEntityException('Dòng đầu lý do cần có LIMIT <số tiền> <tiền tệ>.');
        const amount = parseMoney({ amount: proposal[1], currency: proposal[2] }, row.currency, true);
        const intent = intentHash(row, amount, period);
        if (intent !== input.intentHash) throw new ConflictException();
        if (await tx.approval.findFirst({ where: { shopId: scope.shopId, action: input.action, intentHash: intent,
            resourceId: row.id, status: { in: ['pending', 'approved'] }, expiresAt: { gt: new Date() } }, select: { id: true } })) {
            throw new ConflictException('Đã có yêu cầu phê duyệt cùng nội dung.');
        }
        return recordApproval(tx, { shopId: row.shopId, action: input.action, resourceType: 'budget_policy',
            resourceId: row.id, resourceVersion: row.version, intentHash: intent, requestedBy: scope.userId, amount, currency: row.currency });
    },
    async decide(tx, scope, approval) {
        const row = await budgetInShop(tx, scope.shopId, approval.resourceId);
        requireVersion(row.version, approval.resourceVersion);
        if (scope.userId === approval.requestedBy || !approval.amount || approval.currency !== row.currency ||
            intentHash(row, approval.amount, period) !== approval.intentHash) {
            throw new ConflictException('Phê duyệt giới hạn cần người kiểm độc lập và đúng nội dung.');
        }
        return row.version;
    },
}));

export async function applicableAiBudget(tx: Prisma.TransactionClient, shopId: string, currency: string, configured: Prisma.Decimal | null) {
    const policy = await tx.budgetPolicy.findUniqueOrThrow({ where: { shopId_kind: { shopId, kind: 'ai_usage' } } });
    if (policy.currency !== currency) return null;
    return policy.limitAmount && configured?.gt(policy.limitAmount) ? policy.limitAmount : configured;
}

async function notificationAttempts(tx: Prisma.TransactionClient, shopId: string, timezone: string, now: Date) {
    const day = localAccountingDate(now, timezone);
    const [row] = await tx.$queryRaw<{ attempts: number }[]>`
        SELECT count(*)::int AS attempts FROM app_notifications
        WHERE shop_id=${shopId}::uuid AND channel <> 'in_app'
          AND created_at >= (${day}::date::timestamp AT TIME ZONE ${timezone})
          AND created_at < ((${day}::date + 1)::timestamp AT TIME ZONE ${timezone})
    `;
    return row.attempts;
}

export async function notificationBudgetAvailable(tx: Prisma.TransactionClient, shopId: string, timezone: string, now: Date) {
    const row = await tx.budgetPolicy.findUniqueOrThrow({ where: { shopId_kind: { shopId, kind: 'notification' } } });
    return !row.limitAmount || row.limitAmount.gte(new ExactDecimal(await notificationAttempts(tx, shopId, timezone, now)).plus(1));
}

export async function budgetAmounts(tx: Prisma.TransactionClient, row: BudgetPolicy, timezone: string, now: Date) {
    const { shopId, id: budgetPolicyId, kind, currency, period } = row;
    const zero = new ExactDecimal(0);
    if (kind === 'ai_usage') {
        const accountingDay = accountingDate(localAccountingDate(now, timezone));
        const usage = await tx.botDailyUsage.findUnique({ where: { shopId_accountingDate: { shopId, accountingDate: accountingDay } } });
        return { consumed: financeMoney(usage?.currency === currency ? usage.spent : zero, currency), reserved: financeMoney(zero, currency) };
    }
    if (kind === 'notification') return { consumed: financeMoney(new ExactDecimal(await notificationAttempts(tx, shopId, timezone, now)), currency), reserved: financeMoney(zero, currency) };
    const periodKey = budgetPeriodKey(period, now, timezone);
    const range = period === 'per_order' ? Prisma.sql`status IN ('reserved','unknown')` :
        Prisma.sql`left((created_at AT TIME ZONE ${timezone})::date::text, ${periodKey.length}) = ${periodKey}`;
    const rollup = await tx.$queryRaw<{ status: string; amount: Prisma.Decimal }[]>(Prisma.sql`
        SELECT status::text, sum(amount) AS amount FROM purchase_delegation_reservations
        WHERE shop_id=${shopId}::uuid AND budget_policy_id=${budgetPolicyId}::uuid AND currency=${currency} AND ${range}
        GROUP BY status
    `);
    const amount = (status: string) => rollup.find(line => line.status === status)?.amount ?? zero;
    return { consumed: financeMoney(amount('consumed'), currency), reserved: financeMoney(new ExactDecimal(amount('reserved')).plus(amount('unknown')), currency) };
}

async function view(tx: Prisma.TransactionClient, row: BudgetPolicy, timezone: string) {
    const { id, shopId, version, createdAt, updatedAt, kind, limitAmount, currency, period, approvalId } = row;
    return { id, shopId, version, createdAt, updatedAt, kind, limitAmount: limitAmount ? financeMoney(limitAmount, currency) : null,
        period, enabled: Boolean(limitAmount && approvalId), approvalId, ...await budgetAmounts(tx, row, timezone, new Date()) };
}

export class BudgetService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'operations.read');
            const page = paging(listQuery(raw, 'page'), ['budgets', shopId, userId, String(scope.permissionVersion)]);
            const { timezone } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { timezone: true } });
            const result = page.result(await tx.budgetPolicy.findMany({ where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1 }));
            const data = [];
            for (const row of result.data) data.push(await view(tx, row, timezone));
            return { ...result, data };
        });
    }

    get(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            await requireShopAccess(tx, userId, shopId, 'operations.read');
            const { timezone } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { timezone: true } });
            return view(tx, await budgetInShop(tx, shopId, id), timezone);
        });
    }

    update(headers: IncomingHttpHeaders, shopId: string, id: string, input: BudgetWrite, requestId: string) {
        const { operationId, resourceType } = budgetCommand;
        return writeShopCommand(this.db, this.config, { headers, shopId, operationId, permission: 'operations.manage', payload: { id, ...input } },
            async (tx, scope) => {
                const row = await budgetInShop(tx, shopId, id);
                requireVersion(row.version, input.expectedVersion);
                checkPeriod(row, input.period);
                const amount = parseMoney(input.limitAmount, row.currency, true);
                const approval = await approvalInShop(tx, shopId, input.approvalId);
                await requireApprovalPolicy(tx, approval, 'approved');
                if (approval.action !== budgetAction(input.period) || approval.resourceType !== resourceType || approval.resourceId !== id ||
                    approval.resourceVersion !== row.version || approval.intentHash !== intentHash(row, amount, input.period) ||
                    !approval.amount?.eq(amount) || approval.currency !== row.currency || !approval.decidedBy || approval.requestedBy === approval.decidedBy) {
                    throw new ConflictException();
                }
                await requireShopAccess(tx, approval.decidedBy, shopId, 'approvals.decide');
                const next = await tx.budgetPolicy.update({ where: { shopId_id: { shopId, id } }, data: {
                    limitAmount: amount, period: input.period, version: { increment: 1 }, approvalId: approval.id,
                } });
                await updateApprovalState(tx, approval, { status: 'consumed' });
                await enqueueResourceUpdate(tx, 'budget.updated', next);
                await recordAudit(tx, { shopId, actorId: scope.userId, requestId, action: operationId, resourceType, resourceId: id,
                    metadata: { approvalId: approval.id, version: next.version, period: next.period, amount: amount.toFixed(), currency: row.currency } });
                return { id, type: resourceType };
            }, async (tx, _scope, result) => {
                const { timezone } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { timezone: true } });
                return view(tx, await budgetInShop(tx, shopId, result.id), timezone);
            });
    }
}
