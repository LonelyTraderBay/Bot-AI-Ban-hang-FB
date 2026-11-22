import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Role } from '../../../generated/prisma/client.js';
import { schemaFromContract, SchemaPipe } from '../../../http/contracts.js';
import { ContractOperation } from '../../../http/operations.js';
import { envelope, noStore, versionETag, versionedEnvelope } from '../../../http/response.js';
import { validator } from '../../../http/contract-source.js';
import { idPipe } from '../../../http/query.js';
import { ShopsService, type ShopPatch, type ShopWrite } from './shops-service.js';

const memberInvite = new SchemaPipe(validator.compile(schemaFromContract('MemberInvite')));
const memberRolePatch = new SchemaPipe(validator.compile(schemaFromContract('MemberRolePatch')));
const shopCreate = new SchemaPipe(validator.compile(schemaFromContract('ShopWrite')));
const shopUpdate = new SchemaPipe(validator.compile(schemaFromContract('ShopPatch')));

@Controller('shops')
export class ShopsController {
    constructor(private readonly shops: ShopsService) {}

    @Get()
    @ContractOperation('listShops')
    async list(@Query() query: Record<string, unknown>, @Req() request: IncomingMessage,
        @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const result = await this.shops.list(request.headers, query);
        return { ...envelope(response, result.data), page: result.page };
    }

    @Get(':shopId')
    @ContractOperation('getShop')
    async get(@Param('shopId', idPipe) shopId: string, @Req() request: IncomingMessage,
        @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const shop = await this.shops.get(request.headers, shopId);
        response.setHeader('ETag', versionETag(shop.version));
        return envelope(response, shop);
    }

    @Post()
    @ContractOperation('createShop')
    async create(@Body(shopCreate) body: ShopWrite, @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.shops.create(request.headers, body, String(response.getHeader('X-Request-Id'))));
    }

    @Patch(':shopId')
    @ContractOperation('updateShop')
    async update(@Param('shopId', idPipe) shopId: string, @Body(shopUpdate) patch: ShopPatch,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.shops.update(request.headers, shopId, patch, String(response.getHeader('X-Request-Id'))));
    }

    @Get(':shopId/members')
    @ContractOperation('listMembers')
    async listMembers(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const result = await this.shops.listMembers(request.headers, shopId, query);
        return { ...envelope(response, result.data), page: result.page };
    }

    @Post(':shopId/members')
    @ContractOperation('inviteMember')
    async invite(@Param('shopId', idPipe) shopId: string, @Body(memberInvite) body: { email: string; roles: Role[] },
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const member = await this.shops.invite(request.headers, shopId, body, String(response.getHeader('X-Request-Id')));
        response.setHeader('ETag', versionETag(member.permissionVersion));
        return envelope(response, member);
    }

    @Get(':shopId/members/:memberId')
    @ContractOperation('getMember')
    async member(@Param('shopId', idPipe) shopId: string, @Param('memberId', idPipe) memberId: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const member = await this.shops.getMember(request.headers, shopId, memberId);
        response.setHeader('ETag', versionETag(member.permissionVersion));
        return envelope(response, member);
    }

    @Patch(':shopId/members/:memberId')
    @ContractOperation('updateMemberRoles')
    async updateRoles(@Param('shopId', idPipe) shopId: string, @Param('memberId', idPipe) memberId: string,
        @Body(memberRolePatch) body: { roles: Role[] }, @Req() request: IncomingMessage,
        @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const updated = await this.shops.updateRoles(request.headers, shopId, memberId, body, String(response.getHeader('X-Request-Id')));
        response.setHeader('ETag', versionETag(updated.permissionVersion));
        return envelope(response, updated);
    }

    @Delete(':shopId/members/:memberId')
    @HttpCode(204)
    @ContractOperation('revokeMembership')
    async revoke(@Param('shopId', idPipe) shopId: string, @Param('memberId', idPipe) memberId: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse): Promise<void> {
        noStore(response);
        await this.shops.revoke(request.headers, shopId, memberId, String(response.getHeader('X-Request-Id')));
    }
}
