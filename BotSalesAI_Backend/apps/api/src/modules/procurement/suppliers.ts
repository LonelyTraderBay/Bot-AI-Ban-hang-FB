import { Body, ConflictException, Controller, Get, HttpCode, NotFoundException, Param, Patch, Post, Query, Req, Res, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { Prisma, SupplierOffer, SupplierSendMethod, SupplierStatus } from '../../generated/prisma/client.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, validUuid } from '../../http/query.js';
import { envelope, noStore, requireVersion, versionedEnvelope } from '../../http/response.js';
import { financeMoney, parseMoney, type Money } from '../finance/index.js';
import { ProcurementAccess, procurementInput, procurementKey, procurementText, quantity, requireResourceId } from './access.js';

type SupplierWrite = { name: string; contactLabel: string; currency: string; leadTimeDays: number; paymentTerms: string;
    sendMethod: SupplierSendMethod; approvedAdapterId: string | null };
type SupplierPatch = Partial<SupplierWrite> & { expectedVersion: number };
type StatusChange = { expectedVersion: number; status: Exclude<SupplierStatus, 'draft'>; reason: string };
type OfferWrite = { supplierId: string; variantId: string; unitCost: Money; minimumQuantity: number; packSize: number;
    leadTimeDays: number; validUntil: string | null };

export async function supplierInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    requireResourceId(id);
    const result = await tx.supplier.findUnique({ where: procurementKey(shopId, id) });
    if (!result) throw new NotFoundException();
    return result;
}

export async function offerInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    requireResourceId(id);
    const result = await tx.supplierOffer.findUnique({ where: procurementKey(shopId, id) });
    if (!result) throw new NotFoundException();
    return result;
}

function offerView({ unitCost, currency, ...offer }: SupplierOffer) {
    return { ...offer, unitCost: financeMoney(unitCost, currency) };
}

async function cleanSupplier(tx: Prisma.TransactionClient, shopId: string, input: SupplierWrite) {
    const { sendMethod, approvedAdapterId } = input;
    if (sendMethod === 'approved_adapter') {
        if (!approvedAdapterId || !validUuid(approvedAdapterId) ||
            !await tx.supplierDispatchRoute.findFirst({ where: { shopId, id: approvedAdapterId, enabled: true }, select: { id: true } })) {
            throw new UnprocessableEntityException();
        }
    } else if (approvedAdapterId !== null) throw new UnprocessableEntityException();
    return {
        name: procurementText(input.name, 1), contactLabel: procurementText(input.contactLabel), currency: input.currency,
        leadTimeDays: quantity(input.leadTimeDays), paymentTerms: procurementText(input.paymentTerms), sendMethod, approvedAdapterId,
    };
}

export class SupplierService extends ProcurementAccess {
    suppliers(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.listPage(headers, shopId, raw, 'suppliers', (tx, page) => tx.supplier.findMany({
            where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1,
        }));
    }

    supplier(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, tx => supplierInShop(tx, shopId, id));
    }

    offers(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.listPage(headers, shopId, raw, 'supplier-offers', async (tx, page) => (await tx.supplierOffer.findMany({
            where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1,
        })).map(offerView));
    }

    offer(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, async tx => offerView(await offerInShop(tx, shopId, id)));
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: SupplierWrite, requestId: string) {
        return this.write({ headers, shopId, operationId: 'createSupplier', payload: input, requestId }, async tx =>
            tx.supplier.create({ data: { shopId, ...await cleanSupplier(tx, shopId, input) } }), (tx, id) => supplierInShop(tx, shopId, id));
    }

    update(headers: IncomingHttpHeaders, shopId: string, id: string, input: SupplierPatch, requestId: string) {
        return this.write({ headers, shopId, operationId: 'updateSupplier', payload: { id, input }, requestId }, async tx => {
            const current = await supplierInShop(tx, shopId, id);
            requireVersion(current.version, input.expectedVersion);
            if (current.status === 'archived') throw new ConflictException();
            const clean = await cleanSupplier(tx, shopId, { ...current, ...input });
            return tx.supplier.update({ where: procurementKey(shopId, id), data: { ...clean, version: { increment: 1 } } });
        }, tx => supplierInShop(tx, shopId, id));
    }

    status(headers: IncomingHttpHeaders, shopId: string, id: string, input: StatusChange, requestId: string) {
        const reason = procurementText(input.reason, 5);
        return this.write({ headers, shopId, operationId: 'setSupplierStatus', payload: { id, input }, requestId, reason }, async tx => {
            const current = await supplierInShop(tx, shopId, id);
            requireVersion(current.version, input.expectedVersion);
            if (current.status === 'archived' || input.status === current.status) throw new ConflictException();
            if (input.status === 'approved') await cleanSupplier(tx, shopId, current);
            return tx.supplier.update({ where: procurementKey(shopId, id), data: { status: input.status, version: { increment: 1 } } });
        }, tx => supplierInShop(tx, shopId, id));
    }

    createOffer(headers: IncomingHttpHeaders, shopId: string, input: OfferWrite, requestId: string) {
        return this.write({ headers, shopId, operationId: 'createSupplierOffer', payload: input, requestId }, async tx => {
            const supplier = await supplierInShop(tx, shopId, input.supplierId);
            if (supplier.status === 'archived') throw new ConflictException();
            const { variantId, supplierId } = input;
            if (!validUuid(variantId) || !await tx.variant.findFirst({
                where: { shopId, id: variantId, archivedAt: null, product: { status: { not: 'archived' } } }, select: { id: true },
            })) throw new UnprocessableEntityException();
            const unitCost = parseMoney(input.unitCost, supplier.currency, true);
            const minimumQuantity = quantity(input.minimumQuantity, 1);
            const packSize = quantity(input.packSize, 1);
            const leadTimeDays = quantity(input.leadTimeDays);
            const validUntil = input.validUntil === null ? null : new Date(input.validUntil);
            return tx.supplierOffer.create({ data: {
                shopId, variantId, supplierId, unitCost, currency: supplier.currency, minimumQuantity, packSize, leadTimeDays, validUntil,
            } });
        }, async (tx, id) => offerView(await offerInShop(tx, shopId, id)));
    }
}

@Controller('shops/:shopId')
export class SupplierController {
    constructor(private readonly suppliers: SupplierService) {}

    @Get('suppliers')
    @ContractOperation('listSuppliers')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.suppliers.suppliers(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get('suppliers/:resourceId')
    @ContractOperation('getSupplier')
    async get(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.suppliers.supplier(request.headers, shopId, id));
    }

    @Post('suppliers')
    @ContractOperation('createSupplier')
    async create(@Param('shopId', idPipe) shopId: string, @Body(procurementInput('SupplierWrite')) input: SupplierWrite,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.suppliers.create(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }

    @Patch('suppliers/:resourceId')
    @ContractOperation('updateSupplier')
    async update(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(procurementInput('SupplierPatch')) input: SupplierPatch,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.suppliers.update(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post('suppliers/:resourceId/status')
    @HttpCode(200)
    @ContractOperation('setSupplierStatus')
    async change(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(procurementInput('SupplierStatusRequest')) input: StatusChange,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.suppliers.status(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }

    @Get('supplier-offers')
    @ContractOperation('listSupplierOffers')
    async listOffers(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.suppliers.offers(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get('supplier-offers/:resourceId')
    @ContractOperation('getSupplierOffer')
    async getOffer(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.suppliers.offer(request.headers, shopId, id));
    }

    @Post('supplier-offers')
    @ContractOperation('createSupplierOffer')
    async createOffer(@Param('shopId', idPipe) shopId: string, @Body(procurementInput('SupplierOfferWrite')) input: OfferWrite,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.suppliers.createOffer(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }
}
