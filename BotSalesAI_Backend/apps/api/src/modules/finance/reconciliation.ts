import { Body, ConflictException, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, Res, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { Prisma } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery, paging, validUuid } from '../../http/query.js';
import { envelope, noStore, requireVersion, versionedEnvelope } from '../../http/response.js';
import { commandDto } from '../../platform/commands/index.js';
import { allocateAmountByValue, ExactDecimal } from '../../platform/money/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { FinanceAccess } from './access.js';
import { debtDisputed, debtInShop, debtView, findDebts } from './debts.js';
import { accountingDate, cleanFinanceText, financeKey, financeShop, localAccountingDate, parseMoney, type Money } from './journal.js';
import { bankDetails, bankInShop, bankView, caseDetails, caseInShop, codBalance, codDetails, codInShop, codView, postAllocation,
    reconciliationView, updateReconciliation, type BankView, type CaseView } from './reconciliation-data.js';
import { sumAmounts } from './report-data.js';
import { observedBankReceipt } from './statements.js';

type BankMatch = { expectedVersion: number; transactionId: string; allocations: { resource: { type: string; id: string }; amount: Money }[]; reason: string };
type CodMatch = { expectedVersion: number; bankTransactionId: string; feeEvidenceRef: string; actualFees: Money; reason: string };
type DebtTermsUpdate = { expectedVersion: number; dueDate: string | null; disputeHold: boolean; reason: string };
const termsInput = new SchemaPipe(validator.compile(schemaFromContract('DebtTermsUpdate')));
const bankInput = new SchemaPipe(validator.compile(schemaFromContract('MatchSettlement')));
const codInput = new SchemaPipe(validator.compile(schemaFromContract('CODMatch')));
const rulesDate = (bank: BankView, timezone: string) => localAccountingDate(bank.occurredAt, timezone);
const getPage = (raw: Record<string, unknown>, scope: { shopId: string; userId: string; permissionVersion: number }, resource: string) =>
    paging(listQuery(raw, 'page'), [resource, scope.shopId, scope.userId, String(scope.permissionVersion)]);

function suggestedSources(row: CaseView) {
    if (row.state === 'matched' || row.state === 'disputed') return [];
    return row.transaction.referenceText.match(/[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}/gi)?.map(id => id.toLowerCase()) ?? [];
}

async function reconciliationViews(tx: Prisma.TransactionClient, shopId: string, rows: CaseView[]) {
    if (!rows.length) return [];
    const sourceIds = [...new Set(rows.flatMap(suggestedSources))];
    const candidates = sourceIds.length ? await findDebts(tx, shopId, rows[0].transaction.currency, { sourceIds }) : [];
    return rows.map(row => {
        const sourceSet = new Set(suggestedSources(row));
        return reconciliationView(row, candidates.filter(debt => sourceSet.has(debt.sourceId) && debt.outstanding.gt(0) && !debtDisputed(debt) &&
            (debt.counterpartyType === 'carrier') === (row.transaction.direction === 'credit')).map(debt => debt.id));
    });
}

async function reserveBank(tx: Prisma.TransactionClient, shopId: string, transactionId: string, currency: string) {
    const bank = await bankInShop(tx, shopId, transactionId, true);
    const account = await tx.financeAccount.findUniqueOrThrow({ where: financeKey(shopId, bank.accountId) });
    if (bank.currency !== currency || account.systemKey !== 'bank' || account.status !== 'active' ||
        !bank.reconciliation || !['unmatched', 'suggested'].includes(bank.reconciliation.state)) throw new ConflictException();
    return { bank, review: bank.reconciliation };
}

export class Reconciliation extends FinanceAccess {
    banks(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (tx, scope) => {
            const page = getPage(raw, scope, 'bank_transactions');
            const result = page.result(await tx.bankTransaction.findMany({
                where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1, include: bankDetails,
            }));
            return { ...result, data: result.data.map(bankView) };
        });
    }

    bank(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, async tx => bankView(await bankInShop(tx, shopId, id)));
    }

    cases(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (tx, scope) => {
            const page = getPage(raw, scope, 'reconciliation');
            const result = page.result(await tx.reconciliationCase.findMany({
                where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1, include: caseDetails,
            }));
            return { ...result, data: await reconciliationViews(tx, shopId, result.data) };
        });
    }

    case(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, async tx => (await reconciliationViews(tx, shopId, [await caseInShop(tx, shopId, id)]))[0]);
    }

    settlements(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (tx, scope) => {
            const page = getPage(raw, scope, 'cod_settlements');
            const result = page.result(await tx.codSettlement.findMany({
                where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1, include: codDetails,
            }));
            return { ...result, data: result.data.map(codView) };
        });
    }

    settlement(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, async tx => codView(await codInShop(tx, shopId, id)));
    }

    debts(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (tx, scope) => {
            const { currency, timezone } = await financeShop(tx, shopId);
            const page = getPage(raw, scope, 'debts');
            const result = page.result(await findDebts(tx, shopId, currency, { before: page.position, limit: page.limit + 1 }));
            const asOf = new Date();
            return { ...result, data: result.data.map(debt => debtView(debt, timezone, asOf)) };
        });
    }

    debt(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, async tx => {
            const { currency, timezone } = await financeShop(tx, shopId);
            return debtView(await debtInShop(tx, shopId, currency, id), timezone);
        });
    }

    updateTerms(headers: IncomingHttpHeaders, shopId: string, id: string, input: DebtTermsUpdate, requestId: string) {
        const reason = cleanFinanceText(input.reason, 5);
        const dueDate = input.dueDate ? accountingDate(input.dueDate) : null;
        return this.write({ headers, shopId, action: 'updateDebtTerms', payload: { id, input }, requestId, reason }, async tx => {
            const { currency } = await financeShop(tx, shopId);
            const debt = await debtInShop(tx, shopId, currency, id);
            requireVersion(debt.version, input.expectedVersion);
            if (debt.outstanding.lte(0)) throw new ConflictException('Khoản nợ đã chốt hoặc cần đối chiếu số dư.');
            const where = { shopId_debtLineId: { shopId, debtLineId: id } };
            const terms = { dueDate, disputeHold: input.disputeHold };
            await tx.debtTerms.upsert({ where, create: { shopId, debtLineId: id, ...terms },
                update: { ...terms, version: { increment: 1 } } });
            return { id, version: debt.version + 1 };
        }, async tx => {
            const { currency, timezone } = await financeShop(tx, shopId);
            return debtView(await debtInShop(tx, shopId, currency, id), timezone);
        });
    }

    matchBank(headers: IncomingHttpHeaders, shopId: string, id: string, input: BankMatch, requestId: string) {
        const reason = cleanFinanceText(input.reason, 5);
        return this.write({ headers, shopId, action: 'matchSettlement', payload: { id, input }, requestId, reason }, async tx => {
            const { currency, timezone } = await financeShop(tx, shopId);
            const { bank, review } = await reserveBank(tx, shopId, input.transactionId, currency);
            if (review.id !== id) throw new ConflictException();
            requireVersion(review.version, input.expectedVersion);
            const ids = input.allocations.map(part => part.resource.id);
            if (!ids.length || ids.length > 100 || new Set(ids).size !== ids.length ||
                input.allocations.some(part => part.resource.type !== 'debt' || !validUuid(part.resource.id))) throw new UnprocessableEntityException();
            const debts = await findDebts(tx, shopId, currency, { ids });
            const byId = new Map(debts.map(debt => [debt.id, debt]));
            const parts = input.allocations.map(part => {
                const amount = parseMoney(part.amount, currency, true);
                const debt = byId.get(part.resource.id);
                if (debt?.disputeHold) throw new ConflictException('Khoản nợ đang tạm giữ do tranh chấp.');
                if (!debt || amount.gt(debt.outstanding) || (debt.counterpartyType === 'carrier') !== (bank.direction === 'credit')) {
                    throw new UnprocessableEntityException('Phân bổ vượt công nợ, sai phạm vi hoặc sai chiều tiền.');
                }
                return { debt, amount, bankAmount: amount };
            }).sort((a, b) => a.debt.id.localeCompare(b.debt.id));
            const total = sumAmounts(parts, part => part.amount);
            if (total.gt(review.difference)) throw new UnprocessableEntityException('Tổng phân bổ vượt số chưa khớp.');
            const observed = await observedBankReceipt(tx, bank);
            if (observed.existing) throw new ConflictException('Giao dịch đã có chứng từ ghi sổ theo cùng mã.');
            await postAllocation(tx, bank, parts, rulesDate(bank, timezone), review.version, reason);
            return updateReconciliation(tx, bank, new ExactDecimal(review.difference).minus(total), reason);
        }, async (_tx, _result, command) => commandDto(command, 'reconciliation'));
    }

    matchCod(headers: IncomingHttpHeaders, shopId: string, id: string, input: CodMatch, requestId: string) {
        const reason = cleanFinanceText(input.reason, 5);
        return this.write({ headers, shopId, action: 'matchCODSettlement', payload: { id, input }, requestId, reason }, async tx => {
            const { currency, timezone } = await financeShop(tx, shopId);
            const { bank, review } = await reserveBank(tx, shopId, input.bankTransactionId, currency);
            const cod = await codInShop(tx, shopId, id);
            requireVersion(cod.version, input.expectedVersion);
            if (cod.currency !== currency || bank.direction !== 'credit' || review.state !== 'unmatched' ||
                !review.difference.eq(bank.amount) || !['pending', 'part_settled'].includes(cod.status)) throw new ConflictException();
            if (!validUuid(input.feeEvidenceRef)) throw new UnprocessableEntityException();
            const fee = parseMoney(input.actualFees, currency);
            const evidence = await tx.codFeeEvidence.findFirst({ where: {
                shopId, id: input.feeEvidenceRef, transactionId: bank.id, settlementId: cod.id, currency, verifiedAt: { lte: new Date() },
            } });
            if (!evidence?.amount.eq(fee)) throw new UnprocessableEntityException('Chưa có chứng từ phí thực tế khớp đợt và giao dịch.');
            const gross = new ExactDecimal(bank.amount).plus(fee);
            const difference = codBalance(cod).minus(gross);
            if (difference.lt(0)) throw new UnprocessableEntityException('Tiền về và phí vượt phải thu COD của đợt.');
            const debtRows = await findDebts(tx, shopId, currency, { orderIds: cod.orders.map(order => order.orderId) });
            const debts = debtRows.sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime() || a.id.localeCompare(b.id));
            if (debts.length !== cod.orders.length || debts.some(debt => debt.counterpartyId !== cod.carrierId || debtDisputed(debt)) ||
                !sumAmounts(debts, debt => debt.outstanding).eq(codBalance(cod))) throw new ConflictException('Công nợ của đợt đổi sau khi nhập sao kê.');
            let remaining = gross;
            const allocated = [];
            for (const debt of debts) {
                if (remaining.isZero()) break;
                const amount = ExactDecimal.min(remaining, debt.outstanding);
                if (amount.isZero()) continue;
                allocated.push({ debt, amount });
                remaining = remaining.minus(amount);
            }
            // A single bank journal is bounded by its maximum line count.
            if (allocated.length > 498) throw new UnprocessableEntityException('Đợt cần chia thành các giao dịch quyết toán nhỏ hơn.');
            const fees = allocateAmountByValue(fee, allocated.map(part => part.amount));
            const parts = allocated.map((part, index) => ({ ...part, bankAmount: part.amount.minus(fees[index]) }));
            if ((await observedBankReceipt(tx, bank)).existing) throw new ConflictException('Giao dịch đã có phiếu ghi sổ.');
            await postAllocation(tx, bank, parts, rulesDate(bank, timezone), review.version, reason, fee, cod.id);
            const reconciled = await updateReconciliation(tx, bank, new ExactDecimal(0), reason);
            await enqueueResourceUpdate(tx, 'reconciliation.updated', reconciled);
            return tx.codSettlement.update({ where: financeKey(shopId, id), data: {
                status: difference.isZero() ? 'matched' : 'part_settled', bankTransactionId: bank.id, bankReceived: { increment: bank.amount },
                actualFees: { increment: fee }, version: { increment: 1 },
            } });
        }, async (_tx, _result, command) => commandDto(command, 'cod_settlement'));
    }
}

@Controller('shops/:shopId')
export class ReconciliationController {
    constructor(private readonly reconciliation: Reconciliation) {}

    @Get('bank-transactions')
    @ContractOperation('listBankTransactions')
    async banks(@Param('shopId', idPipe) shopId: string, @Query() raw: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.reconciliation.banks(request.headers, shopId, raw);
        return { ...envelope(response, data), page };
    }

    @Get('bank-transactions/:resourceId')
    @ContractOperation('getBankTransaction')
    async bank(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.reconciliation.bank(request.headers, shopId, id));
    }

    @Get('reconciliation-cases')
    @ContractOperation('listReconciliationCases')
    async cases(@Param('shopId', idPipe) shopId: string, @Query() raw: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.reconciliation.cases(request.headers, shopId, raw);
        return { ...envelope(response, data), page };
    }

    @Get('reconciliation-cases/:resourceId')
    @ContractOperation('getReconciliationCase')
    async case(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.reconciliation.case(request.headers, shopId, id));
    }

    @Get('cod-settlements')
    @ContractOperation('listCODSettlements')
    async settlements(@Param('shopId', idPipe) shopId: string, @Query() raw: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.reconciliation.settlements(request.headers, shopId, raw);
        return { ...envelope(response, data), page };
    }

    @Get('cod-settlements/:resourceId')
    @ContractOperation('getCODSettlement')
    async settlement(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.reconciliation.settlement(request.headers, shopId, id));
    }

    @Get('debts')
    @ContractOperation('listDebtItems')
    async debts(@Param('shopId', idPipe) shopId: string, @Query() raw: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.reconciliation.debts(request.headers, shopId, raw);
        return { ...envelope(response, data), page };
    }

    @Get('debts/:resourceId')
    @ContractOperation('getDebtItem')
    async debt(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.reconciliation.debt(request.headers, shopId, id));
    }

    @Patch('debts/:resourceId')
    @ContractOperation('updateDebtTerms')
    async updateTerms(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(termsInput) input: DebtTermsUpdate,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.reconciliation.updateTerms(request.headers, shopId, id, input,
            String(response.getHeader('X-Request-Id'))));
    }

    @Post('reconciliation-cases/:resourceId/match')
    @HttpCode(202)
    @ContractOperation('matchSettlement')
    async matchBank(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(bankInput) input: BankMatch,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.reconciliation.matchBank(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post('cod-settlements/:resourceId/match')
    @HttpCode(202)
    @ContractOperation('matchCODSettlement')
    async matchCod(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(codInput) input: CodMatch,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.reconciliation.matchCod(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }
}
