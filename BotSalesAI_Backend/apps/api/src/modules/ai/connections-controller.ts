import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe } from '../../http/query.js';
import { envelope, noStore, versionedEnvelope } from '../../http/response.js';
import { AiConnections, type ConnectionPatch, type ConnectionWrite } from './connections.js';

const body = (schema: string) => new SchemaPipe(validator.compile(schemaFromContract(schema)));
const requestId = (response: ServerResponse) => String(response.getHeader('X-Request-Id'));

@Controller('shops/:shopId/integrations/ai')
export class AiConnectionsController {
    constructor(private readonly connections: AiConnections) {}

    @Get('catalog')
    @ContractOperation('getProviderCatalog')
    async catalog(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.connections.catalog(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get()
    @ContractOperation('listAIConnections')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.connections.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get(':connectionId')
    @ContractOperation('getAIConnection')
    async get(@Param('shopId', idPipe) shopId: string, @Param('connectionId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.connections.get(request.headers, shopId, id));
    }

    @Post()
    @ContractOperation('createAIConnection')
    async create(@Param('shopId', idPipe) shopId: string, @Body(body('AIConnectionWrite')) input: ConnectionWrite,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.connections.create(request.headers, shopId, input, requestId(response)));
    }

    @Patch(':connectionId')
    @ContractOperation('updateAIConnection')
    async update(@Param('shopId', idPipe) shopId: string, @Param('connectionId', idPipe) id: string, @Body(body('AIConnectionPatch')) patch: ConnectionPatch,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.connections.update(request.headers, shopId, id, patch, requestId(response)));
    }

    @Delete(':connectionId')
    @HttpCode(204)
    @ContractOperation('deleteAIConnection')
    async remove(@Param('shopId', idPipe) shopId: string, @Param('connectionId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        await this.connections.delete(request.headers, shopId, id, requestId(response));
    }

    @Post(':connectionId/test')
    @HttpCode(202)
    @ContractOperation('testAIConnection')
    async check(@Param('shopId', idPipe) shopId: string, @Param('connectionId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.connections.check(request.headers, shopId, id, requestId(response)));
    }
}
