import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import type { OpeningBalance, Prisma } from '../../generated/prisma/client.js';
import { listQuery, paging, validUuid } from '../../http/query.js';
import { requireIfMatch, requireVersion } from '../../http/response.js';
import { commandDto } from '../../platform/commands/index.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { sellableVariants } from '../catalog/index.js';
import { lockWarehouse, recordStockMovement } from '../inventory/index.js';
import { FinanceAccess } from './access.js';
import type { Version } from './book.js';
import { accountingDate, cleanFinanceText, financeKey, financeShop, lockActiveAccounts, lockOpenPeriod,
    normalizedJournalLines, parseMoney, systemAccounts, writeJournal, type JournalLine, type Money } from './journal.js';

type OpeningStock = { variantId: string; warehouseId: string; quantity: number; unitCost: Money };
export type OpeningWrite = {
    effectiveDate: string; policyVersion: string; lines: JournalLine[]; inventory: OpeningStock[]; reason: string;
};

async function openingInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const opening = await tx.openingBalance.findUnique({ where: financeKey(shopId, id) });
    if (!opening) throw new NotFoundException();
    return opening;
}

function openingView(row: OpeningBalance) {
    return { ...row, effectiveDate: row.effectiveDate.toISOString().slice(0, 10) };
}

async function requireOpeningUnused(tx: Prisma.TransactionClient, shopId: string) {
    await tx.$queryRaw`SELECT id FROM shops WHERE id = ${shopId}::uuid FOR UPDATE`;
    if (await tx.openingBalance.findFirst({ where: { shopId, status: 'posted' }, select: { id: true } }) ||
        await tx.financeJournal.findFirst({ where: { shopId, status: { in: ['posted', 'reversed'] } }, select: { id: true } }) ||
        await tx.financeEntry.findFirst({ where: { shopId, status: { in: ['posted', 'reversed'] } }, select: { id: true } }) ||
        await tx.stockMovement.findFirst({ where: { shopId }, select: { id: true } })) throw new ConflictException();
}

async function validateOpening(tx: Prisma.TransactionClient, shopId: string, input: OpeningWrite) {
    const { currency, policyVersion } = await financeShop(tx, shopId);
    if (input.policyVersion !== policyVersion || input.inventory.length > 500) throw new UnprocessableEntityException();
    await lockOpenPeriod(tx, shopId, input.effectiveDate);
    const rows = input.lines.length ? normalizedJournalLines(input.lines, currency) : [];
    await lockActiveAccounts(tx, shopId, rows.map(line => line.accountId));
    const [inventoryAccount] = await systemAccounts(tx, shopId, 'inventory');
    const bookValue = rows.filter(item => item.accountId === inventoryAccount).reduce(
        (total, item) => total.plus(item.debit).minus(item.credit), new ExactDecimal(0),
    );
    const keys = new Set<string>();
    const active = new Set((await sellableVariants(tx, shopId, input.inventory.map(row => row.variantId).filter(validUuid))).map(row => row.id));
    const warehouses = [...new Set(input.inventory.map(row => row.warehouseId))].sort();
    for (const warehouseId of warehouses) {
        if ((await lockWarehouse(tx, shopId, warehouseId)).status !== 'active') throw new ConflictException();
    }
    let stockValue = new ExactDecimal(0);
    const inventory = input.inventory.map(line => {
        const key = line.warehouseId + ':' + line.variantId;
        if (!active.has(line.variantId) || keys.has(key) || !Number.isInteger(line.quantity) || line.quantity < 0 || line.quantity > 2147483647) {
            throw new UnprocessableEntityException();
        }
        keys.add(key);
        const value = parseMoney(line.unitCost, currency).mul(line.quantity);
        if (value.toFixed().length > 60) throw new UnprocessableEntityException();
        stockValue = stockValue.plus(value);
        return { ...line, value };
    });
    if (!bookValue.eq(stockValue)) throw new UnprocessableEntityException();
    return { inventory, reason: cleanFinanceText(input.reason) };
}

function openingWriteFrom(row: OpeningBalance): OpeningWrite {
    return {
        effectiveDate: row.effectiveDate.toISOString().slice(0, 10), policyVersion: row.policyVersion, reason: row.reason,
        lines: row.lines as JournalLine[], inventory: row.inventory as OpeningStock[],
    };
}

export class OpeningBalances extends FinanceAccess {
    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (tx, scope) => {
            const page = paging(listQuery(raw, 'page'), ['opening', shopId, scope.userId, String(scope.permissionVersion)]);
            const result = page.result(await tx.openingBalance.findMany({
                where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1,
            }));
            return { ...result, data: result.data.map(openingView) };
        });
    }

    get(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, async tx => openingView(await openingInShop(tx, shopId, id)));
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: OpeningWrite, requestId: string) {
        return this.write({ headers, shopId, action: 'createOpeningBalance', payload: input, requestId }, async tx => {
            await requireOpeningUnused(tx, shopId);
            const { reason } = await validateOpening(tx, shopId, input);
            return tx.openingBalance.create({ data: { ...input, shopId, effectiveDate: accountingDate(input.effectiveDate), reason } });
        }, async (tx, result) => openingView(await openingInShop(tx, shopId, result.id)));
    }

    update(headers: IncomingHttpHeaders, shopId: string, id: string, input: OpeningWrite, requestId: string) {
        const version = requireIfMatch(headers);
        return this.write({ headers, shopId, action: 'updateOpeningBalance', payload: { id, version, input }, requestId }, async tx => {
            const current = await openingInShop(tx, shopId, id);
            requireVersion(current.version, version);
            if (current.status !== 'draft') throw new ConflictException();
            await requireOpeningUnused(tx, shopId);
            const { reason } = await validateOpening(tx, shopId, input);
            return tx.openingBalance.update({ where: financeKey(shopId, id), data: {
                ...input, effectiveDate: accountingDate(input.effectiveDate), reason, version: { increment: 1 },
            } });
        }, async (tx, result) => openingView(await openingInShop(tx, shopId, result.id)));
    }

    post(headers: IncomingHttpHeaders, shopId: string, id: string, input: Version, requestId: string) {
        return this.write({ headers, shopId, action: 'postOpeningBalance', payload: { id, input }, requestId }, async (tx, scope) => {
            const opening = await openingInShop(tx, shopId, id);
            requireVersion(opening.version, input.expectedVersion);
            if (opening.status !== 'draft') throw new ConflictException();
            await requireOpeningUnused(tx, shopId);
            const expected = openingWriteFrom(opening);
            const { inventory } = await validateOpening(tx, shopId, expected);
            const journal = expected.lines.length ? (await writeJournal(tx, shopId, {
                sourceType: 'opening_balance', sourceId: id, eventType: 'open', sourceRevision: opening.version,
                effectiveDate: expected.effectiveDate, lines: expected.lines, reason: expected.reason,
            }, true)).journal : null;
            const ordered = inventory.sort((a, b) => (a.warehouseId + a.variantId).localeCompare(b.warehouseId + b.variantId));
            for (const row of ordered) {
                if (!row.quantity) continue;
                await recordStockMovement(tx, {
                    shopId, warehouseId: row.warehouseId, variantId: row.variantId, actorId: scope.userId, kind: 'receipt',
                    source: { type: 'opening_balance', id, lineId: randomUUID() }, reason: 'Ghi tồn đầu kỳ',
                    delta: { onHand: row.quantity }, receivedValue: row.value.toFixed(),
                });
            }
            return tx.openingBalance.update({
                where: financeKey(shopId, id), data: { status: 'posted', journalId: journal?.id ?? null, version: { increment: 1 } },
            });
        }, async (_tx, _result, command) => commandDto(command, 'opening_balance'));
    }
}
