import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe } from '../../http/query.js';
import { envelope, noStore, versionedEnvelope } from '../../http/response.js';
import { CatalogService, type ProductArchive, type ProductWrite } from './catalog-service.js';

const productWrite = new SchemaPipe(validator.compile(schemaFromContract('ProductWrite')));
const productPatch = new SchemaPipe(validator.compile(schemaFromContract('ProductWritePatch')));
const productArchive = new SchemaPipe(validator.compile(schemaFromContract('VersionedReason')));

@Controller('shops/:shopId')
export class CatalogController {
    constructor(private readonly catalog: CatalogService) {}

    @Get('categories')
    @ContractOperation('listCategories')
    async categories(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const result = await this.catalog.listCategories(request.headers, shopId, query);
        return { ...envelope(response, result.data), page: result.page };
    }

    @Get('products')
    @ContractOperation('listProducts')
    async products(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const result = await this.catalog.listProducts(request.headers, shopId, query);
        return { ...envelope(response, result.data), page: result.page };
    }

    @Get('products/:productId')
    @ContractOperation('getProduct')
    async product(@Param('shopId', idPipe) shopId: string, @Param('productId', idPipe) productId: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const result = await this.catalog.getProduct(request.headers, shopId, productId);
        return versionedEnvelope(response, result);
    }

    @Post('products')
    @ContractOperation('createProduct')
    async create(@Param('shopId', idPipe) shopId: string, @Body(productWrite) body: ProductWrite,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const result = await this.catalog.createProduct(request.headers, shopId, body, String(response.getHeader('X-Request-Id')));
        return versionedEnvelope(response, result);
    }

    @Patch('products/:productId')
    @ContractOperation('updateProduct')
    async update(@Param('shopId', idPipe) shopId: string, @Param('productId', idPipe) id: string, @Body(productPatch) body: Partial<ProductWrite>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const result = await this.catalog.updateProduct(request.headers, shopId, id, body, String(response.getHeader('X-Request-Id')));
        return versionedEnvelope(response, result);
    }

    @Post('products/:productId/archive')
    @HttpCode(202)
    @ContractOperation('archiveProduct')
    async archive(@Param('shopId', idPipe) shopId: string, @Param('productId', idPipe) id: string, @Body(productArchive) body: ProductArchive,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const result = await this.catalog.archiveProduct(request.headers, shopId, id, body, String(response.getHeader('X-Request-Id')));
        return envelope(response, result);
    }
}
