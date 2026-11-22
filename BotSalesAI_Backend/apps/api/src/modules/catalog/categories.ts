import { Body, ConflictException, Controller, Get, HttpCode, NotFoundException, Param, Patch, Post, Req, Res, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { Prisma, type Category, type Command, type PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, validUuid } from '../../http/query.js';
import { envelope, noStore, requireIfMatch, requireVersion, versionedEnvelope } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { commandDto, type ResourceRef } from '../../platform/commands/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig } from '../workspace/index.js';

type CategoryInput = { name: string; parentId: string | null };
type Archive = { expectedVersion: number; reason: string };
const categoryWrite = new SchemaPipe(validator.compile(schemaFromContract('CategoryWrite')));
const categoryPatch = new SchemaPipe(validator.compile(schemaFromContract('CategoryWritePatch')));
const archiveWrite = new SchemaPipe(validator.compile(schemaFromContract('VersionedReason')));
export const categoryCommands = ['createCategory', 'updateCategory', 'archiveCategory'].map(operationId => ({ operationId, resourceType: 'category' }));

export async function categoryInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const category = await tx.category.findUnique({ where: { shopId_id: { shopId, id } } });
    if (!category) throw new NotFoundException();
    return category;
}

export async function requireActiveCategory(tx: Prisma.TransactionClient, shopId: string, id: string | null) {
    if (id === null) return;
    if (!validUuid(id) || !await tx.category.findFirst({ where: { shopId, id, active: true }, select: { id: true } })) {
        throw new UnprocessableEntityException();
    }
}

function checkedName(name: string) {
    const normalized = name.trim();
    if (!normalized || normalized.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
    return normalized;
}

export class CategoryService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    get(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'catalog.read');
            return categoryInShop(tx, scope.shopId, id);
        });
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: CategoryInput, requestId: string) {
        return this.change(headers, shopId, 'createCategory', input, requestId, async tx => {
            await requireActiveCategory(tx, shopId, input.parentId);
            return tx.category.create({ data: { shopId, parentId: input.parentId, name: checkedName(input.name) } });
        }, (tx, result) => categoryInShop(tx, shopId, result.id));
    }

    update(headers: IncomingHttpHeaders, shopId: string, id: string, input: Partial<CategoryInput>, requestId: string) {
        const version = requireIfMatch(headers);
        return this.change(headers, shopId, 'updateCategory', { id, version, input }, requestId, async tx => {
            const current = await categoryInShop(tx, shopId, id);
            requireVersion(current.version, version);
            if (!current.active) throw new ConflictException();
            const parentId = input.parentId === undefined ? current.parentId : input.parentId;
            await requireActiveCategory(tx, shopId, parentId);
            if (parentId !== null && parentId !== current.parentId) {
                const [cycle] = await tx.$queryRaw<{ found: boolean }[]>(Prisma.sql`
                    WITH RECURSIVE chain AS (
                        SELECT id, parent_id FROM categories WHERE shop_id = ${shopId}::uuid AND id = ${parentId}::uuid
                        UNION
                        SELECT c.id, c.parent_id FROM categories c JOIN chain p ON c.id = p.parent_id
                        WHERE c.shop_id = ${shopId}::uuid
                    )
                    SELECT EXISTS (SELECT 1 FROM chain WHERE id = ${id}::uuid) AS found
                `);
                if (cycle.found) throw new ConflictException();
            }
            return tx.category.update({
                where: { shopId_id: { shopId, id } },
                data: { parentId, name: input.name === undefined ? current.name : checkedName(input.name), version: { increment: 1 } },
            });
        }, (tx, result) => categoryInShop(tx, shopId, result.id));
    }

    archive(headers: IncomingHttpHeaders, shopId: string, id: string, input: Archive, requestId: string) {
        return this.change(headers, shopId, 'archiveCategory', { id, input }, requestId, async tx => {
            const current = await categoryInShop(tx, shopId, id);
            requireVersion(current.version, input.expectedVersion);
            if (!current.active || await tx.category.findFirst({ where: { shopId, parentId: id, active: true }, select: { id: true } })
                || await tx.product.findFirst({ where: { shopId, categoryId: id, status: 'active' }, select: { id: true } })) {
                throw new ConflictException();
            }
            return tx.category.update({ where: { shopId_id: { shopId, id } }, data: { active: false, version: { increment: 1 } } });
        }, async (_tx, _result, command) => commandDto(command, 'category'), checkedName(input.reason));
    }

    private change<T>(headers: IncomingHttpHeaders, shopId: string, action: string, payload: Prisma.InputJsonValue, requestId: string,
        apply: (tx: Prisma.TransactionClient) => Promise<Category>,
        read: (tx: Prisma.TransactionClient, result: ResourceRef, command: Command) => Promise<T>, reason?: string) {
        return writeShopCommand(this.db, this.config, { headers, shopId, permission: 'catalog.write', operationId: action, payload },
            async (tx, scope) => {
                const category = await apply(tx);
                await tx.shop.update({ where: { id: scope.shopId }, data: { catalogVersion: { increment: 1 } } });
                await recordAudit(tx, {
                    shopId: scope.shopId, actorId: scope.userId, action, requestId,
                    resourceType: 'category', resourceId: category.id,
                    metadata: { version: category.version, ...(reason ? { reason } : {}) },
                });
                return { type: 'category', id: category.id };
            }, (tx, _scope, result, command) => {
                if (result.type !== 'category') throw new ConflictException();
                return read(tx, result, command);
            });
    }
}

@Controller('shops/:shopId/categories')
export class CategoryController {
    constructor(private readonly categories: CategoryService) {}

    @Get(':categoryId')
    @ContractOperation('getCategory')
    async get(@Param('shopId', idPipe) shopId: string, @Param('categoryId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.categories.get(request.headers, shopId, id));
    }

    @Post()
    @ContractOperation('createCategory')
    async create(@Param('shopId', idPipe) shopId: string, @Body(categoryWrite) input: CategoryInput,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.categories.create(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }

    @Patch(':categoryId')
    @ContractOperation('updateCategory')
    async update(@Param('shopId', idPipe) shopId: string, @Param('categoryId', idPipe) id: string, @Body(categoryPatch) input: Partial<CategoryInput>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.categories.update(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post(':categoryId/archive')
    @HttpCode(202)
    @ContractOperation('archiveCategory')
    async archive(@Param('shopId', idPipe) shopId: string, @Param('categoryId', idPipe) id: string, @Body(archiveWrite) input: Archive,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.categories.archive(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }
}
