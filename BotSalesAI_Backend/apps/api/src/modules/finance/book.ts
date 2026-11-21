import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { Prisma, type AccountGroup, type AccountingPeriod, type AccountStatus } from '../../generated/prisma/client.js';
import { listQuery, paging, validUuid } from '../../http/query.js';
import { requireIfMatch, requireVersion } from '../../http/response.js';
import { commandDto } from '../../platform/commands/index.js';
import { FinanceAccess } from './access.js';
import { accountingDate, cleanFinanceText, financeKey, journalInShop, journalLines, journalView, postDraftJournal, reversePostedJournal, writeJournal,
    type JournalInput } from './journal.js';

export type AccountWrite = { code: string; name: string; group: AccountGroup };
export type PeriodWrite = { startDate: string; endDate: string; reason: string };
export type Version = { expectedVersion: number };
export type Reason = Version & { reason: string };
export type ManualJournal = Pick<JournalInput, 'sourceType' | 'sourceId' | 'effectiveDate' | 'lines' | 'reason' | 'replacesJournalId'>;

const usedLines = { lines: { where: { journal: { status: { in: ['posted', 'reversed'] } } } } } satisfies Prisma.FinanceAccountCountOutputTypeSelect;
const used = { _count: { select: usedLines } } satisfies Prisma.FinanceAccountInclude;
type Account = Prisma.FinanceAccountGetPayload<{ include: typeof used }>;

function accountView({ _count, systemKey: _systemKey, ...account }: Account) {
    return { ...account, used: _count.lines > 0 };
}

async function accountInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const account = await tx.financeAccount.findUnique({ where: financeKey(shopId, id), include: used });
    if (!account) throw new NotFoundException();
    return account;
}

function periodView(period: AccountingPeriod) {
    return {
        ...period, startDate: period.startDate.toISOString().slice(0, 10), endDate: period.endDate.toISOString().slice(0, 10),
        blockingIssues: [],
    };
}

async function periodInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const period = await tx.accountingPeriod.findUnique({ where: financeKey(shopId, id) });
    if (!period) throw new NotFoundException();
    return period;
}

export class FinanceBook extends FinanceAccess {
    accounts(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (tx, scope) => {
            const query = listQuery(raw);
            if (query.status && !['active', 'archived'].includes(query.status)) throw new UnprocessableEntityException();
            const page = paging(query, ['accounts', shopId, scope.userId, String(scope.permissionVersion)]);
            const contains = { contains: page.keyword, mode: 'insensitive' as const };
            const result = page.result(await tx.financeAccount.findMany({
                where: {
                    shopId, status: query.status as AccountStatus | undefined,
                    AND: [page.keyword ? { OR: [{ code: contains }, { name: contains }] } : {}, page.after ?? {}],
                },
                orderBy: page.orderBy, take: page.limit + 1, include: used,
            }));
            return { ...result, data: result.data.map(accountView) };
        });
    }

    getAccount(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, async tx => accountView(await accountInShop(tx, shopId, id)));
    }

    createAccount(headers: IncomingHttpHeaders, shopId: string, input: AccountWrite, requestId: string) {
        return this.write({ headers, shopId, action: 'createAccount', payload: input, requestId }, async tx => {
            const code = input.code.toUpperCase();
            if (await tx.financeAccount.findFirst({ where: { shopId, code: { equals: code, mode: 'insensitive' } }, select: { id: true } })) {
                throw new ConflictException();
            }
            return tx.financeAccount.create({ data: { shopId, code, group: input.group, name: cleanFinanceText(input.name) } });
        }, async (tx, result) => accountView(await accountInShop(tx, shopId, result.id)));
    }

    updateAccount(headers: IncomingHttpHeaders, shopId: string, id: string, patch: Partial<AccountWrite>, requestId: string) {
        const version = requireIfMatch(headers);
        return this.write({ headers, shopId, action: 'updateAccount', payload: { id, patch, version }, requestId }, async tx => {
            if (!validUuid(id)) throw new NotFoundException();
            await tx.$queryRaw`SELECT id FROM finance_accounts WHERE shop_id = ${shopId}::uuid AND id = ${id}::uuid FOR UPDATE`;
            const account = await accountInShop(tx, shopId, id);
            requireVersion(account.version, version);
            const code = patch.code?.toUpperCase() ?? account.code;
            const group = patch.group ?? account.group;
            if (account.status !== 'active' || ((account._count.lines > 0 || account.systemKey) && (code !== account.code || group !== account.group))) {
                throw new ConflictException();
            }
            if (code !== account.code && await tx.financeAccount.findFirst({
                where: { shopId, id: { not: id }, code: { equals: code, mode: 'insensitive' } }, select: { id: true },
            })) throw new ConflictException();
            return tx.financeAccount.update({
                where: financeKey(shopId, id),
                data: { code, group, name: cleanFinanceText(patch.name ?? account.name), version: { increment: 1 } },
            });
        }, async (tx, result) => accountView(await accountInShop(tx, shopId, result.id)));
    }

    archiveAccount(headers: IncomingHttpHeaders, shopId: string, id: string, input: Reason, requestId: string) {
        const reason = cleanFinanceText(input.reason, 3);
        return this.write({ headers, shopId, action: 'archiveAccount', payload: { id, input }, requestId, reason }, async tx => {
            const account = await accountInShop(tx, shopId, id);
            requireVersion(account.version, input.expectedVersion);
            if (account.status !== 'active' || account.systemKey) throw new ConflictException();
            return tx.financeAccount.update({
                where: financeKey(shopId, id), data: { status: 'archived', version: { increment: 1 } },
            });
        }, async (_tx, _result, command) => commandDto(command, 'account'));
    }

    periods(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (tx, scope) => {
            const page = paging(listQuery(raw, 'page'), ['periods', shopId, scope.userId, String(scope.permissionVersion)]);
            const result = page.result(await tx.accountingPeriod.findMany({
                where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1,
            }));
            return { ...result, data: result.data.map(periodView) };
        });
    }

    getPeriod(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, async tx => periodView(await periodInShop(tx, shopId, id)));
    }

    createPeriod(headers: IncomingHttpHeaders, shopId: string, input: PeriodWrite, requestId: string) {
        const reason = cleanFinanceText(input.reason);
        return this.write({ headers, shopId, action: 'createAccountingPeriod', payload: input, requestId, reason }, async tx => {
            const startDate = accountingDate(input.startDate);
            const endDate = accountingDate(input.endDate);
            if (endDate < startDate) throw new UnprocessableEntityException();
            await tx.$queryRaw`SELECT id FROM shops WHERE id = ${shopId}::uuid FOR UPDATE`;
            if (await tx.accountingPeriod.findFirst({
                where: { shopId, startDate: { lte: endDate }, endDate: { gte: startDate } }, select: { id: true },
            })) throw new ConflictException();
            return tx.accountingPeriod.create({ data: { shopId, startDate, endDate } });
        }, async (tx, result) => periodView(await periodInShop(tx, shopId, result.id)));
    }

    journals(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (tx, scope) => {
            const page = paging(listQuery(raw, 'page'), ['journals', shopId, scope.userId, String(scope.permissionVersion)]);
            const result = page.result(await tx.financeJournal.findMany({
                where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1, include: { lines: journalLines },
            }));
            return { ...result, data: result.data.map(journalView) };
        });
    }

    getJournal(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, async tx => journalView(await journalInShop(tx, shopId, id)));
    }

    createJournal(headers: IncomingHttpHeaders, shopId: string, input: ManualJournal, requestId: string) {
        const reason = cleanFinanceText(input.reason, 5);
        return this.write({ headers, shopId, action: 'createJournal', payload: input, requestId, reason }, async tx => {
            if (!/^manual(?:_[a-z0-9_]{1,90})?$/.test(input.sourceType)) throw new UnprocessableEntityException();
            let sourceRevision = 0;
            if (input.replacesJournalId) {
                const previous = await journalInShop(tx, shopId, input.replacesJournalId);
                if (previous.status !== 'reversed' || previous.sourceType !== input.sourceType || previous.sourceId !== input.sourceId ||
                    previous.eventType !== 'manual') throw new ConflictException();
                sourceRevision = previous.sourceRevision + 1;
            }
            const result = await writeJournal(tx, shopId, { ...input, eventType: 'manual', sourceRevision }, false);
            return { ...result.journal, repeat: result.repeat };
        }, async (tx, result) => journalView(await journalInShop(tx, shopId, result.id)));
    }

    postJournal(headers: IncomingHttpHeaders, shopId: string, id: string, input: Version, requestId: string) {
        return this.write({ headers, shopId, action: 'postJournal', payload: { id, input }, requestId },
            tx => postDraftJournal(tx, shopId, id, input.expectedVersion),
            async (_tx, _result, command) => commandDto(command, 'journal'));
    }

    reverseJournal(headers: IncomingHttpHeaders, shopId: string, id: string, input: Reason, requestId: string) {
        const reason = cleanFinanceText(input.reason, 5);
        return this.write({ headers, shopId, action: 'reverseJournal', payload: { id, input }, requestId, reason }, async tx => {
            const original = await journalInShop(tx, shopId, id);
            requireVersion(original.version, input.expectedVersion);
            if (original.eventType !== 'manual') throw new ConflictException();
            return reversePostedJournal(tx, original, reason);
        }, async (_tx, _result, command) => commandDto(command, 'journal'));
    }
}
