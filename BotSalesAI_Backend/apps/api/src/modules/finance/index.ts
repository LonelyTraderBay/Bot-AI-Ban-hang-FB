import { Body, Controller, Get, HttpCode, Module, Param, Patch, Post, Put, Query, Req, Res, type DynamicModule } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe } from '../../http/query.js';
import { envelope, noStore, versionedEnvelope } from '../../http/response.js';
import type { AuthConfig } from '../workspace/index.js';
import { FinanceBook, type AccountWrite, type ManualJournal, type PeriodReopen, type PeriodWrite, type Reason, type Version } from './book.js';
import { FinanceEntries, type EntryWrite } from './entries.js';
import { LedgerReader } from './ledger-view.js';
import { OpeningBalances, type OpeningWrite } from './opening.js';
import { PaymentReviews, PaymentReviewsController } from './payment-reviews.js';
import { Reconciliation, ReconciliationController } from './reconciliation.js';
import { FinanceReports, FinanceReportsController } from './reports.js';
import { ReportExports, ReportExportsController } from './exports.js';
import { MarketingController, MarketingService } from './marketing.js';
import { FinanceStatements, StatementsController } from './statements.js';
import { FinanceSettlement, type Adjustment, type Payment, type Refund } from './settlement.js';

export { financeCommands } from './access.js';
export { periodApprovalResource } from './period-data.js';
export { financeJobHandlers, statementCommands } from './statements.js';
export { accountingDate, writeJournal, systemAccounts, financeShop, financeMoney, parseMoney, localAccountingDate, lockOpenPeriod, type Money } from './journal.js';
export { pairedLines } from './entries.js';
export { bookBusinessPairs, bookDelivery, bookHandover, bookInspectedReturn } from './order-accounting.js';
export { allocationTotals } from './reconciliation-data.js';
export { provisionFixtureShopAccounts } from './account-policy.js';
export { reportExportCommand, reportExportHandler } from './exports.js';
export { dashboardMoney } from './report-data.js';
export { marketingProjection } from './marketing.js';

const bodySchema = (name: string) => new SchemaPipe(validator.compile(schemaFromContract(name)));
const requestId = (response: ServerResponse) => String(response.getHeader('X-Request-Id'));

@Controller('shops/:shopId')
class FinanceBookController {
    constructor(private readonly book: FinanceBook) {}

    @Get('finance/accounts')
    @ContractOperation('listAccounts')
    async listAccounts(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.book.accounts(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get('finance/accounts/:accountId')
    @ContractOperation('getAccount')
    async getAccount(@Param('shopId', idPipe) shopId: string, @Param('accountId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.book.getAccount(request.headers, shopId, id));
    }

    @Post('finance/accounts')
    @ContractOperation('createAccount')
    async createAccount(@Param('shopId', idPipe) shopId: string, @Body(bodySchema('AccountWrite')) input: AccountWrite,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.book.createAccount(request.headers, shopId, input, requestId(response)));
    }

    @Patch('finance/accounts/:accountId')
    @ContractOperation('updateAccount')
    async updateAccount(@Param('shopId', idPipe) shopId: string, @Param('accountId', idPipe) id: string, @Body(bodySchema('AccountWritePatch')) input: Partial<AccountWrite>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.book.updateAccount(request.headers, shopId, id, input, requestId(response)));
    }

    @Post('finance/accounts/:accountId/archive')
    @HttpCode(202)
    @ContractOperation('archiveAccount')
    async archiveAccount(@Param('shopId', idPipe) shopId: string, @Param('accountId', idPipe) id: string, @Body(bodySchema('VersionedReason')) input: Reason,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.book.archiveAccount(request.headers, shopId, id, input, requestId(response)));
    }

    @Get('periods')
    @ContractOperation('listAccountingPeriods')
    async listAccountingPeriods(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.book.periods(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get('periods/:resourceId')
    @ContractOperation('getAccountingPeriod')
    async getAccountingPeriod(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.book.getPeriod(request.headers, shopId, id));
    }

    @Post('periods')
    @ContractOperation('createAccountingPeriod')
    async createAccountingPeriod(@Param('shopId', idPipe) shopId: string, @Body(bodySchema('AccountingPeriodCreate')) input: PeriodWrite,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.book.createPeriod(request.headers, shopId, input, requestId(response)));
    }

    @Post('periods/:resourceId/close')
    @HttpCode(202)
    @ContractOperation('closeAccountingPeriod')
    async closePeriod(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(bodySchema('VersionRequest')) input: Version,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.book.closePeriod(request.headers, shopId, id, input, requestId(response)));
    }

    @Post('periods/:resourceId/reopen')
    @HttpCode(202)
    @ContractOperation('reopenAccountingPeriod')
    async reopenPeriod(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(bodySchema('PeriodReopen')) input: PeriodReopen,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.book.reopenPeriod(request.headers, shopId, id, input, requestId(response)));
    }

    @Get('journals')
    @ContractOperation('listJournals')
    async listJournals(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.book.journals(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get('journals/:resourceId')
    @ContractOperation('getJournal')
    async getJournal(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.book.getJournal(request.headers, shopId, id));
    }

    @Post('journals')
    @ContractOperation('createJournal')
    async createJournal(@Param('shopId', idPipe) shopId: string, @Body(bodySchema('JournalCreate')) input: ManualJournal,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.book.createJournal(request.headers, shopId, input, requestId(response)));
    }

    @Post('journals/:resourceId/post')
    @HttpCode(202)
    @ContractOperation('postJournal')
    async postJournal(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(bodySchema('VersionRequest')) input: Version,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.book.postJournal(request.headers, shopId, id, input, requestId(response)));
    }

    @Post('journals/:resourceId/reverse')
    @HttpCode(202)
    @ContractOperation('reverseJournal')
    async reverseJournal(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(bodySchema('VersionedReason')) input: Reason,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.book.reverseJournal(request.headers, shopId, id, input, requestId(response)));
    }
}

@Controller('shops/:shopId')
class LedgerController {
    constructor(private readonly reader: LedgerReader) {}

    @Get('finance/ledger')
    @ContractOperation('getLedger')
    async getLedger(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.reader.ledger(request.headers, shopId, query));
    }
}

@Controller('shops/:shopId')
class FinanceEntriesController {
    constructor(private readonly entries: FinanceEntries) {}

    @Get('finance/entries')
    @ContractOperation('listFinanceEntries')
    async listFinanceEntries(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.entries.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get('finance/entries/:entryId')
    @ContractOperation('getFinanceEntry')
    async getFinanceEntry(@Param('shopId', idPipe) shopId: string, @Param('entryId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.entries.get(request.headers, shopId, id));
    }

    @Post('finance/entries')
    @ContractOperation('createFinanceEntry')
    async createFinanceEntry(@Param('shopId', idPipe) shopId: string, @Body(bodySchema('FinanceEntryWrite')) input: EntryWrite,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.entries.create(request.headers, shopId, input, requestId(response)));
    }

    @Patch('finance/entries/:entryId')
    @ContractOperation('updateFinanceEntry')
    async updateFinanceEntry(@Param('shopId', idPipe) shopId: string, @Param('entryId', idPipe) id: string, @Body(bodySchema('FinanceEntryWritePatch')) input: Partial<EntryWrite>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.entries.update(request.headers, shopId, id, input, requestId(response)));
    }

    @Post('finance/entries/:entryId/post')
    @HttpCode(202)
    @ContractOperation('postFinanceEntry')
    async postFinanceEntry(@Param('shopId', idPipe) shopId: string, @Param('entryId', idPipe) id: string, @Body(bodySchema('VersionedReason')) input: Reason,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.entries.post(request.headers, shopId, id, input, requestId(response)));
    }

    @Post('finance/entries/:entryId/reverse')
    @HttpCode(202)
    @ContractOperation('reverseFinanceEntry')
    async reverseFinanceEntry(@Param('shopId', idPipe) shopId: string, @Param('entryId', idPipe) id: string, @Body(bodySchema('VersionedReason')) input: Reason,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.entries.reverse(request.headers, shopId, id, input, requestId(response)));
    }
}

@Controller('shops/:shopId')
class OpeningBalancesController {
    constructor(private readonly opening: OpeningBalances) {}

    @Get('finance/opening-balances')
    @ContractOperation('listOpeningBalances')
    async listOpeningBalances(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.opening.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get('finance/opening-balances/:openingId')
    @ContractOperation('getOpeningBalance')
    async getOpeningBalance(@Param('shopId', idPipe) shopId: string, @Param('openingId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.opening.get(request.headers, shopId, id));
    }

    @Post('finance/opening-balances')
    @ContractOperation('createOpeningBalance')
    async createOpeningBalance(@Param('shopId', idPipe) shopId: string, @Body(bodySchema('OpeningBalanceWrite')) input: OpeningWrite,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.opening.create(request.headers, shopId, input, requestId(response)));
    }

    @Put('finance/opening-balances/:openingId')
    @ContractOperation('updateOpeningBalance')
    async updateOpeningBalance(@Param('shopId', idPipe) shopId: string, @Param('openingId', idPipe) id: string, @Body(bodySchema('OpeningBalanceWrite')) input: OpeningWrite,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.opening.update(request.headers, shopId, id, input, requestId(response)));
    }

    @Post('finance/opening-balances/:openingId/post')
    @HttpCode(202)
    @ContractOperation('postOpeningBalance')
    async postOpeningBalance(@Param('shopId', idPipe) shopId: string, @Param('openingId', idPipe) id: string, @Body(bodySchema('VersionRequest')) input: Version,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.opening.post(request.headers, shopId, id, input, requestId(response)));
    }
}

@Controller('shops/:shopId')
class FinanceSettlementController {
    constructor(private readonly settlement: FinanceSettlement) {}

    @Post('orders/:orderId/pay')
    @HttpCode(202)
    @ContractOperation('payOrder')
    async payOrder(@Param('shopId', idPipe) shopId: string, @Param('orderId', idPipe) id: string, @Body(bodySchema('PaymentRequest')) input: Payment,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.settlement.pay(request.headers, shopId, id, input, requestId(response)));
    }

    @Post('orders/:orderId/refund')
    @HttpCode(202)
    @ContractOperation('refundOrder')
    async refundOrder(@Param('shopId', idPipe) shopId: string, @Param('orderId', idPipe) id: string, @Body(bodySchema('RefundRequest')) input: Refund,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.settlement.refund(request.headers, shopId, id, input, requestId(response)));
    }

    @Post('inventory/adjustments')
    @HttpCode(202)
    @ContractOperation('createInventoryAdjustment')
    async createInventoryAdjustment(@Param('shopId', idPipe) shopId: string, @Body(bodySchema('InventoryAdjustment')) input: Adjustment,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.settlement.adjust(request.headers, shopId, input, requestId(response)));
    }
}

@Module({})
class FinanceModule {}

export function financeModule(db?: PrismaClient, config?: AuthConfig): DynamicModule {
    return {
        module: FinanceModule,
        controllers: [FinanceBookController, LedgerController, FinanceEntriesController, OpeningBalancesController, FinanceSettlementController,
            FinanceReportsController, StatementsController, ReconciliationController, PaymentReviewsController, MarketingController, ReportExportsController],
        providers: [
            { provide: FinanceBook, useFactory: () => new FinanceBook(db, config) },
            { provide: LedgerReader, useFactory: () => new LedgerReader(db, config) },
            { provide: FinanceEntries, useFactory: () => new FinanceEntries(db, config) },
            { provide: OpeningBalances, useFactory: () => new OpeningBalances(db, config) },
            { provide: FinanceSettlement, useFactory: () => new FinanceSettlement(db, config) },
            { provide: FinanceReports, useFactory: () => new FinanceReports(db, config) },
            { provide: MarketingService, useFactory: () => new MarketingService(db) },
            { provide: ReportExports, useFactory: () => new ReportExports(db, config) },
            { provide: FinanceStatements, useFactory: () => new FinanceStatements(db, config) },
            { provide: Reconciliation, useFactory: () => new Reconciliation(db, config) },
            { provide: PaymentReviews, useFactory: () => new PaymentReviews(db, config) },
        ],
    };
}
