import { Body, Controller, Get, HttpCode, Module, Param, Patch, Post, Query, Req, Res, type DynamicModule } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe } from '../../http/query.js';
import { envelope, noStore, versionedEnvelope } from '../../http/response.js';
import type { MetaInboundConfig } from '../channels/index.js';
import type { AuthConfig } from '../workspace/index.js';
import { OrdersService, type CancelOrder, type ConfirmOrder, type CustomerEvidence, type DraftPatch } from './orders-service.js';
import type { DraftOrder } from './pricing.js';
import { ConversationDrafts } from './conversation-drafts.js';
import { ConversationDraftsController } from './conversation-drafts-controller.js';

export { orderInShop } from './order-data.js';
export { orderMoney } from './pricing.js';
export { createSalesDraft, orderCommands, quoteDeliveryDraft, recordSalesQuoteEvidence, requireCurrentPaymentPrice } from './orders-service.js';
export { returnCommands } from './returns.js';
import { ReturnsController, ReturnsService } from './returns.js';
export { expireOrdersWithReservations } from './order-expiry.js';
export { confirmedOrderMarketing } from './marketing.js';
const draftInput = new SchemaPipe(validator.compile(schemaFromContract('OrderDraft')));
const patchInput = new SchemaPipe(validator.compile(schemaFromContract('OrderDraftPatch')));
const evidenceInput = new SchemaPipe(validator.compile(schemaFromContract('CustomerConfirmationRequest')));
const confirmInput = new SchemaPipe(validator.compile(schemaFromContract('ConfirmOrder')));
const cancelInput = new SchemaPipe(validator.compile(schemaFromContract('VersionedReason')));
const requestId = (response: ServerResponse) => String(response.getHeader('X-Request-Id'));

@Controller('shops/:shopId/orders')
class OrdersController {
    constructor(private readonly orders: OrdersService) {}

    @Get()
    @ContractOperation('listOrders')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.orders.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get(':orderId')
    @ContractOperation('getOrder')
    async get(@Param('shopId', idPipe) shopId: string, @Param('orderId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.orders.get(request.headers, shopId, id));
    }

    @Post()
    @ContractOperation('createOrder')
    async create(@Param('shopId', idPipe) shopId: string, @Body(draftInput) draft: DraftOrder,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.orders.create(request.headers, shopId, draft, requestId(response)));
    }

    @Post('estimate')
    @HttpCode(200)
    @ContractOperation('estimateOrderDraft')
    async estimate(@Param('shopId', idPipe) shopId: string, @Body(draftInput) draft: DraftOrder,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.orders.estimate(request.headers, shopId, draft));
    }

    @Patch(':orderId')
    @ContractOperation('updateOrderDraft')
    async update(@Param('shopId', idPipe) shopId: string, @Param('orderId', idPipe) id: string, @Body(patchInput) patch: DraftPatch,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.orders.patch(request.headers, shopId, id, patch, requestId(response)));
    }

    @Post(':orderId/quote')
    @HttpCode(200)
    @ContractOperation('quoteOrder')
    async quote(@Param('shopId', idPipe) shopId: string, @Param('orderId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.orders.quote(request.headers, shopId, id, requestId(response)));
    }

    @Post(':orderId/customer-confirmations')
    @HttpCode(200)
    @ContractOperation('recordCustomerConfirmation')
    async evidence(@Param('shopId', idPipe) shopId: string, @Param('orderId', idPipe) id: string, @Body(evidenceInput) input: CustomerEvidence,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.orders.evidence(request.headers, shopId, id, input, requestId(response)));
    }

    @Post(':orderId/confirm')
    @HttpCode(202)
    @ContractOperation('confirmOrder')
    async confirm(@Param('shopId', idPipe) shopId: string, @Param('orderId', idPipe) id: string, @Body(confirmInput) input: ConfirmOrder,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.orders.confirm(request.headers, shopId, id, input, requestId(response)));
    }

    @Post(':orderId/cancel')
    @HttpCode(202)
    @ContractOperation('cancelOrder')
    async cancel(@Param('shopId', idPipe) shopId: string, @Param('orderId', idPipe) id: string, @Body(cancelInput) input: CancelOrder,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.orders.cancel(request.headers, shopId, id, input, requestId(response)));
    }
}

@Module({})
class OrdersModule {}

export function ordersModule(db?: PrismaClient, config?: AuthConfig, meta?: MetaInboundConfig): DynamicModule {
    return {
        module: OrdersModule, controllers: [OrdersController, ReturnsController, ConversationDraftsController],
        providers: [
            { provide: ConversationDrafts, useFactory: () => new ConversationDrafts(db, config) },
            { provide: OrdersService, useFactory: () => new OrdersService(db, config, meta) },
            { provide: ReturnsService, useFactory: () => new ReturnsService(db, config) },
        ],
    };
}
