import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { ProductStatus } from '../../generated/prisma/enums.js';
import { listQuery, paging, validUuid } from '../../http/query.js';
import { requireIfMatch, requireVersion } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { commandDto } from '../../platform/commands/index.js';
import { replaceProductImages } from '../files/index.js';
import { createDefaultStockPositions, requireVariantsClear } from '../inventory/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig, type ShopScope } from '../workspace/index.js';
import { requireActiveCategory } from './categories.js';

export const productCommands = ['createProduct', 'updateProduct', 'archiveProduct'].map(operationId => ({ operationId, resourceType: 'product' }));

export type ProductWrite = {
    name: string;
    description: string;
    categoryId: string | null;
    status: 'draft' | 'active';
    imageFileIds: string[];
    variants: {
        id?: string;
        sku: string;
        name: string;
        options: Record<string, string>;
        price: { amount: string; currency: string };
        active: boolean;
    }[];
};

type ProductScope = Pick<ShopScope, 'shopId' | 'userId'>;
export type ProductArchive = { expectedVersion: number; reason: string };
const productDetails = {
    variants: { where: { archivedAt: null }, orderBy: [{ position: 'asc' }, { id: 'asc' }] },
    images: { orderBy: { position: 'asc' }, select: { fileId: true } },
} satisfies Prisma.ProductInclude;
type ProductDetails = Prisma.ProductGetPayload<{ include: typeof productDetails }>;

function productView({ images, variants, ...product }: ProductDetails) {
    return {
        ...product,
        imageFileIds: images.map(image => image.fileId),
        variants: variants.map(variant => ({
            id: variant.id, shopId: variant.shopId, productId: variant.productId, version: variant.version,
            createdAt: variant.createdAt, updatedAt: variant.updatedAt,
            sku: variant.sku, name: variant.name, options: variant.options, active: variant.active,
            price: { amount: variant.priceAmount.toFixed(), currency: variant.priceCurrency },
        })),
    };
}

async function productInShop(tx: Prisma.TransactionClient, shopId: string, productId: string) {
    if (!validUuid(productId)) throw new NotFoundException();
    const product = await tx.product.findUnique({ where: { shopId_id: { shopId, id: productId } }, include: productDetails });
    if (!product) throw new NotFoundException();
    return product;
}

export const skuKey = (value: string) => value.trim().normalize('NFC').toLowerCase();

export function sellableVariants(tx: Prisma.TransactionClient, shopId: string, ids: string[]) {
    return tx.variant.findMany({
        where: { shopId, id: { in: ids }, active: true, archivedAt: null, product: { status: 'active' } },
        select: { id: true, version: true, sku: true, name: true, priceAmount: true, priceCurrency: true, product: { select: { name: true } } },
    });
}

export async function writeProduct(tx: Prisma.TransactionClient, scope: ProductScope, body: ProductWrite, current?: ProductDetails) {
    const { shopId } = scope;
    const { currency } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { currency: true } });
    const invalidText = (value: string) => value.includes(String.fromCharCode(0));
    if (!body.name.trim() || invalidText(body.name) || invalidText(body.description) || current?.status === 'archived') {
        throw new UnprocessableEntityException();
    }
    await requireActiveCategory(tx, shopId, body.categoryId);

    const keys = new Set<string>();
    const configurations = new Set<string>();
    const existing = new Map(current?.variants.map(variant => [variant.id, variant]));
    const kept = new Set<string>();
    const variants = body.variants.map((variant, position) => {
        const key = skuKey(variant.sku);
        const optionNames = Object.keys(variant.options).sort();
        const configuration = JSON.stringify(optionNames.map(name => [name, variant.options[name]]));
        if ((variant.id && (!existing.has(variant.id) || kept.has(variant.id))) || !key || !variant.name.trim() || variant.price.currency !== currency ||
            !/[1-9]/.test(variant.price.amount) ||
            [variant.sku, variant.name, ...optionNames, ...Object.values(variant.options)].some(invalidText) ||
            (optionNames.length > 0 && configurations.has(configuration))) throw new UnprocessableEntityException();
        if (keys.has(key)) throw new ConflictException();
        keys.add(key);
        if (variant.id) kept.add(variant.id);
        if (optionNames.length > 0) configurations.add(configuration);
        return {
            id: variant.id, position, sku: variant.sku.trim(), skuKey: key, name: variant.name.trim(),
            options: variant.options, priceAmount: variant.price.amount, priceCurrency: currency, active: variant.active,
        };
    });
    if (await tx.variant.findFirst({ where: { shopId, skuKey: { in: [...keys] }, id: { notIn: [...kept] } }, select: { id: true } })) {
        throw new ConflictException();
    }
    const data = { name: body.name.trim(), description: body.description, categoryId: body.categoryId, status: body.status };
    const product = current
        ? await tx.product.update({ where: { shopId_id: { shopId, id: current.id } }, data: { ...data, version: { increment: 1 } } })
        : await tx.product.create({ data: { ...data, shopId } });

    const removed = current?.variants.filter(variant => !kept.has(variant.id)).map(variant => variant.id) ?? [];
    await requireVariantsClear(tx, shopId, removed);
    if (removed.length) await tx.variant.updateMany({
        where: { shopId, productId: product.id, id: { in: removed } },
        data: { archivedAt: new Date(), active: false, version: { increment: 1 } },
    });
    // Release changed keys inside the transaction before applying an in-product SKU swap.
    for (const variant of variants) {
        if (variant.id && existing.get(variant.id)?.skuKey !== variant.skuKey) {
            await tx.variant.update({ where: { shopId_id: { shopId, id: variant.id } }, data: { skuKey: '\n' + variant.id } });
        }
    }
    for (const { id, ...variant } of variants) {
        const before = id && existing.get(id);
        if (!id || !before) continue;
        const unchanged = before.position === variant.position && before.sku === variant.sku && before.name === variant.name &&
            before.priceAmount.eq(variant.priceAmount) && before.active === variant.active &&
            JSON.stringify(before.options) === JSON.stringify(variant.options);
        if (!unchanged) await tx.variant.update({
            where: { shopId_id: { shopId, id } }, data: { ...variant, version: { increment: 1 } },
        });
    }
    const added = variants.filter(variant => !variant.id);
    if (added.length) {
        const created = await tx.variant.createManyAndReturn({
            data: added.map(variant => ({ ...variant, shopId, productId: product.id })), select: { id: true },
        });
        await createDefaultStockPositions(tx, shopId, created.map(variant => variant.id));
    }
    const images = current?.images.map(image => image.fileId) ?? [];
    if (JSON.stringify(images) !== JSON.stringify(body.imageFileIds)) await replaceProductImages(tx, scope, product.id, body.imageFileIds);
    return product;
}

export function advanceCatalog(tx: Prisma.TransactionClient, shopId: string) {
    return tx.shop.update({ where: { id: shopId }, data: { catalogVersion: { increment: 1 } }, select: { id: true } });
}

export function productWriteFromView(product: ProductDetails): ProductWrite {
    if (product.status === 'archived') throw new ConflictException();
    const view = productView(product);
    return {
        name: view.name, description: view.description, categoryId: view.categoryId,
        status: product.status, variants: view.variants.map(variant => ({
            id: variant.id, sku: variant.sku, name: variant.name, active: variant.active,
            options: variant.options as Record<string, string>, price: variant.price,
        })),
        imageFileIds: view.imageFileIds,
    };
}

export { productInShop };

export class CatalogService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    listCategories(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'catalog.read');
            const query = listQuery(raw);
            if (query.status !== undefined && query.status !== 'active' && query.status !== 'archived') {
                throw new UnprocessableEntityException();
            }
            const page = paging(query, ['categories', scope.shopId, userId, String(scope.permissionVersion)]);
            return page.result(await tx.category.findMany({
                where: {
                    shopId: scope.shopId, ...page.after,
                    ...(query.status === undefined ? {} : { active: query.status === 'active' }),
                    name: { contains: page.keyword, mode: 'insensitive' },
                },
                orderBy: page.orderBy, take: page.limit + 1,
            }));
        });
    }

    listProducts(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'catalog.read');
            const query = listQuery(raw, 'listProducts');
            if (query.status !== undefined && !Object.hasOwn(ProductStatus, query.status)) throw new UnprocessableEntityException();
            if (query.categoryId !== undefined && !validUuid(query.categoryId)) throw new UnprocessableEntityException();
            const page = paging(query, ['products', scope.shopId, userId, String(scope.permissionVersion), query.categoryId ?? '']);
            const contains = { contains: page.keyword, mode: 'insensitive' as const };
            const search = page.keyword ? { OR: [{ name: contains }, { variants: { some: { sku: contains, archivedAt: null } } }] } : {};
            const result = page.result(await tx.product.findMany({
                where: {
                    shopId: scope.shopId, categoryId: query.categoryId, status: query.status as ProductStatus | undefined,
                    AND: [search, page.after ?? {}],
                },
                orderBy: page.orderBy, take: page.limit + 1, include: productDetails,
            }));
            return { ...result, data: result.data.map(productView) };
        });
    }

    getProduct(headers: IncomingHttpHeaders, shopId: string, productId: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'catalog.read');
            return productView(await productInShop(tx, scope.shopId, productId));
        });
    }

    createProduct(headers: IncomingHttpHeaders, shopId: string, body: ProductWrite, requestId: string) {
        return this.change(headers, shopId, 'createProduct', body, requestId,
            (tx, scope) => writeProduct(tx, scope, body), async (tx, id) => productView(await productInShop(tx, shopId, id)));
    }

    updateProduct(headers: IncomingHttpHeaders, shopId: string, id: string, patch: Partial<ProductWrite>, requestId: string) {
        const version = requireIfMatch(headers);
        return this.change(headers, shopId, 'updateProduct', { id, version, patch }, requestId, async (tx, scope) => {
            const current = await productInShop(tx, shopId, id);
            requireVersion(current.version, version);
            return writeProduct(tx, scope, { ...productWriteFromView(current), ...patch }, current);
        }, async (tx, resultId) => productView(await productInShop(tx, shopId, resultId)));
    }

    archiveProduct(headers: IncomingHttpHeaders, shopId: string, id: string, body: ProductArchive, requestId: string) {
        const reason = body.reason.trim();
        if (reason.length < 3 || reason.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
        return this.change(headers, shopId, 'archiveProduct', { id, body }, requestId, async tx => {
            const current = await productInShop(tx, shopId, id);
            requireVersion(current.version, body.expectedVersion);
            if (current.status === 'archived') throw new ConflictException();
            const archived = await tx.product.update({
                where: { shopId_id: { shopId, id } }, data: { status: 'archived', version: { increment: 1 } },
            });
            await requireVariantsClear(tx, shopId, current.variants.map(variant => variant.id));
            return archived;
        }, async (_tx, _id, command) => commandDto(command, 'product'), reason);
    }

    private change<T>(
        headers: IncomingHttpHeaders, shopId: string, operationId: string, payload: Prisma.InputJsonValue, requestId: string,
        apply: (tx: Prisma.TransactionClient, scope: ShopScope) => Promise<{ id: string; version: number }>,
        read: (tx: Prisma.TransactionClient, id: string, command: Parameters<typeof commandDto>[0]) => Promise<T>, reason?: string,
    ) {
        return writeShopCommand(this.db, this.config, { headers, shopId, permission: 'catalog.write', operationId, payload },
            async (tx, scope) => {
                const product = await apply(tx, scope);
                await advanceCatalog(tx, shopId);
                await recordAudit(tx, {
                    shopId, actorId: scope.userId, action: operationId, requestId, resourceType: 'product', resourceId: product.id,
                    metadata: { version: product.version, ...(reason ? { reason } : {}) },
                });
                return { type: 'product', id: product.id };
            }, (tx, _scope, result, command) => {
                if (result.type !== 'product') throw new ConflictException();
                return read(tx, result.id, command);
            });
    }
}
