import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe } from '../../http/query.js';
import { envelope, noStore, versionedEnvelope } from '../../http/response.js';
import { ConversationDrafts, type DraftAccess, type DraftEdit, type DraftSave } from './conversation-drafts.js';

const input = (schema: string) => new SchemaPipe(validator.compile(schemaFromContract(schema)));
const requestId = (response: ServerResponse) => String(response.getHeader('X-Request-Id'));

@Controller('shops/:shopId')
export class ConversationDraftsController {
    constructor(private readonly drafts: ConversationDrafts) {}

    @Get('conversation-order-drafts')
    @ContractOperation('listConversationOrderDrafts')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.drafts.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get('conversations/:conversationId/order-draft')
    @ContractOperation('getConversationOrderDraft')
    async get(@Param('shopId', idPipe) shopId: string, @Param('conversationId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.drafts.get(request.headers, shopId, id));
    }

    @Post('conversations/:conversationId/order-draft/access')
    @HttpCode(200)
    @ContractOperation('accessConversationOrderDraft')
    async access(@Param('shopId', idPipe) shopId: string, @Param('conversationId', idPipe) id: string,
        @Body(input('ConversationOrderDraftAccess')) body: DraftAccess, @Req() request: IncomingMessage,
        @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.drafts.access(request.headers, shopId, id, body, requestId(response)));
    }

    @Patch('conversations/:conversationId/order-draft/:draftId')
    @ContractOperation('saveConversationOrderDraft')
    async save(@Param('shopId', idPipe) shopId: string, @Param('conversationId', idPipe) id: string, @Param('draftId', idPipe) draftId: string,
        @Body(input('ConversationOrderDraftSave')) body: DraftSave, @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.drafts.save(request.headers, shopId, id, draftId, body));
    }

    @Get('conversations/:conversationId/order-draft/:draftId/estimate')
    @ContractOperation('estimateConversationOrderDraft')
    async estimate(@Param('shopId', idPipe) shopId: string, @Param('conversationId', idPipe) id: string, @Param('draftId', idPipe) draftId: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.drafts.estimate(request.headers, shopId, id, draftId));
    }

    @Post('conversations/:conversationId/order-draft/:draftId/discard')
    @HttpCode(200)
    @ContractOperation('discardConversationOrderDraft')
    async discard(@Param('shopId', idPipe) shopId: string, @Param('conversationId', idPipe) id: string, @Param('draftId', idPipe) draftId: string,
        @Body(input('ConversationOrderDraftEdit')) body: DraftEdit, @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        await this.drafts.finish(request.headers, shopId, id, draftId, body, 'discardConversationOrderDraft', requestId(response));
        return envelope(response, null);
    }

    @Post('conversations/:conversationId/order-draft/:draftId/convert')
    @HttpCode(201)
    @ContractOperation('convertConversationOrderDraft')
    async convert(@Param('shopId', idPipe) shopId: string, @Param('conversationId', idPipe) id: string, @Param('draftId', idPipe) draftId: string,
        @Body(input('ConversationOrderDraftEdit')) body: DraftEdit, @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const order = await this.drafts.finish(request.headers, shopId, id, draftId, body, 'convertConversationOrderDraft', requestId(response));
        return versionedEnvelope(response, order!);
    }
}
