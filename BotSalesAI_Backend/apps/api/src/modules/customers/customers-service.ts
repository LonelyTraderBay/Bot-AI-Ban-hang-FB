import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { Command, Prisma, PrismaClient, ServiceCaseKind, ServiceCaseState } from '../../generated/prisma/client.js';
import { listQuery, paging, validUuid } from '../../http/query.js';
import { requireIfMatch, requireVersion } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { commandDto, type ResourceRef } from '../../platform/commands/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig } from '../workspace/index.js';
import {
    addressForCustomer, addressRedactions, addressView, checkedAddress, checkedCustomer, cleanText, customerInShop, customerView,
    createAddressForCustomer, type AddressInput, type CustomerInput,
} from './customer-data.js';

type Versioned = { id: string; version: number };
type AuditResource = 'customer' | 'customer_address' | 'service_case';
type Archived = { expectedVersion: number; reason: string };
export type CaseInput = { customerId: string; orderId: string | null; kind: ServiceCaseKind; summary: string };
export type CaseChange = { expectedVersion: number; state: Exclude<ServiceCaseState, 'open'>; reason: string };
export const customerCommands = [
    ['createCustomer', 'customer'], ['updateCustomer', 'customer'],
    ['createCustomerAddress', 'customer_address'], ['updateCustomerAddress', 'customer_address'], ['archiveCustomerAddress', 'customer_address'],
    ['createServiceCase', 'service_case'], ['setServiceCaseStatus', 'service_case'],
].map(([operationId, resourceType]) => ({ operationId, resourceType }));

async function caseInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const result = await tx.serviceCase.findUnique({ where: { shopId_id: { shopId, id } } });
    if (!result) throw new NotFoundException();
    return result;
}

const caseTransitions: Record<ServiceCaseState, readonly ServiceCaseState[]> = {
    open: ['assigned', 'resolved', 'closed'], assigned: ['resolved', 'closed'], resolved: ['closed'], closed: [],
};

export async function createServiceCaseRecord(tx: Prisma.TransactionClient, shopId: string, input: CaseInput, workItemId?: string) {
    const customer = await customerInShop(tx, shopId, input.customerId);
    if (customer.privacyErasedAt) throw new ConflictException();
    if (input.orderId !== null && (!validUuid(input.orderId) || !await tx.salesOrder.findUnique({
        where: {
            shopId_customerId_id: { shopId, customerId: input.customerId, id: input.orderId },
            orderState: { in: ['confirmed', 'completed'] },
        }, select: { id: true },
    }))) throw new UnprocessableEntityException();
    return tx.serviceCase.create({ data: { ...input, shopId, workItemId, summary: cleanText(input.summary) } });
}

export class CustomersService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    private read<T>(headers: IncomingHttpHeaders, shopId: string, action: (tx: Prisma.TransactionClient, userId: string, permissionVersion: number) => Promise<T>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'customers.read');
            return action(tx, userId, scope.permissionVersion);
        });
    }

    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (tx, userId, permissionVersion) => {
            const query = listQuery(raw);
            if (query.status !== undefined && query.status !== 'active') throw new UnprocessableEntityException();
            const page = paging(query, ['customers', shopId, userId, String(permissionVersion)]);
            const contains = { contains: page.keyword, mode: 'insensitive' as const };
            const search = page.keyword ? { OR: [
                { displayName: contains, NOT: { redactedFields: { has: 'displayName' } } },
                { phone: contains, NOT: { redactedFields: { has: 'phone' } } },
                { email: contains, NOT: { redactedFields: { has: 'email' } } },
            ] } : {};
            const result = page.result(await tx.customer.findMany({
                where: { shopId, AND: [search, page.after ?? {}] },
                orderBy: page.orderBy, take: page.limit + 1,
            }));
            return { ...result, data: result.data.map(customerView) };
        });
    }

    get(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, async tx => customerView(await customerInShop(tx, shopId, id)));
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: CustomerInput, requestId: string) {
        return this.change(headers, shopId, 'createCustomer', 'customer', input, requestId,
            tx => tx.customer.create({ data: { ...input, ...checkedCustomer(input), shopId } }),
            async (tx, result) => customerView(await customerInShop(tx, shopId, result.id)));
    }

    update(headers: IncomingHttpHeaders, shopId: string, id: string, input: Partial<CustomerInput>, requestId: string) {
        const version = requireIfMatch(headers);
        return this.change(headers, shopId, 'updateCustomer', 'customer', { id, input, version }, requestId, async tx => {
            const current = await customerInShop(tx, shopId, id);
            requireVersion(current.version, version);
            if (Object.keys(input).some(field => current.redactedFields.includes(field))) throw new ForbiddenException();
            return tx.customer.update({
                where: { shopId_id: { shopId, id } }, data: { ...checkedCustomer(input), version: { increment: 1 } },
            });
        }, async (tx, result) => customerView(await customerInShop(tx, shopId, result.id)));
    }

    listAddresses(headers: IncomingHttpHeaders, shopId: string, customerId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (tx, userId, permissionVersion) => {
            const customer = await customerInShop(tx, shopId, customerId);
            const query = listQuery(raw);
            if (query.status !== undefined && query.status !== 'active' && query.status !== 'archived') {
                throw new UnprocessableEntityException();
            }
            const page = paging(query, ['addresses', shopId, customerId, userId, String(permissionVersion)]);
            const hidden = addressRedactions(customer);
            const where: Prisma.CustomerAddressWhereInput = {
                shopId, customerId, status: query.status, ...page.after,
                ...(page.keyword && {
                    AND: hidden.includes('label') ? [{ id: { in: [] } }] : [
                        { label: { contains: page.keyword, mode: 'insensitive' as const }, NOT: { redactedFields: { has: 'label' } } },
                    ],
                }),
            };
            const result = page.result(await tx.customerAddress.findMany({ where, orderBy: page.orderBy, take: page.limit + 1 }));
            return { ...result, data: result.data.map(address => addressView(customer, address)) };
        });
    }

    getAddress(headers: IncomingHttpHeaders, shopId: string, customerId: string, id: string) {
        return this.read(headers, shopId, tx => this.address(tx, shopId, customerId, id));
    }

    private async address(tx: Prisma.TransactionClient, shopId: string, customerId: string, id: string) {
        const customer = await customerInShop(tx, shopId, customerId);
        return addressView(customer, await addressForCustomer(tx, shopId, customerId, id));
    }

    createAddress(headers: IncomingHttpHeaders, shopId: string, customerId: string, input: AddressInput, requestId: string) {
        return this.change(headers, shopId, 'createCustomerAddress', 'customer_address', { customerId, input }, requestId, tx =>
            createAddressForCustomer(tx, shopId, customerId, input), (tx, result) => this.address(tx, shopId, customerId, result.id));
    }

    updateAddress(headers: IncomingHttpHeaders, shopId: string, customerId: string, id: string, input: Partial<AddressInput>, requestId: string) {
        const version = requireIfMatch(headers);
        return this.change(headers, shopId, 'updateCustomerAddress', 'customer_address', { customerId, id, input, version }, requestId, async tx => {
            const customer = await customerInShop(tx, shopId, customerId);
            const address = await addressForCustomer(tx, shopId, customerId, id);
            requireVersion(address.version, version);
            if (address.status === 'archived') throw new ConflictException();
            if (addressRedactions(customer, address).some(field => Object.hasOwn(input, field))) throw new ForbiddenException();
            return tx.customerAddress.update({
                where: { shopId_customerId_id: { shopId, customerId, id } },
                data: { ...checkedAddress(input), version: { increment: 1 } },
            });
        }, (tx, result) => this.address(tx, shopId, customerId, result.id));
    }

    archiveAddress(headers: IncomingHttpHeaders, shopId: string, customerId: string, id: string, input: Archived, requestId: string) {
        return this.change(headers, shopId, 'archiveCustomerAddress', 'customer_address', { customerId, id, input }, requestId, async tx => {
            const address = await addressForCustomer(tx, shopId, customerId, id);
            requireVersion(address.version, input.expectedVersion);
            if (address.status === 'archived') throw new ConflictException();
            return tx.customerAddress.update({
                where: { shopId_customerId_id: { shopId, customerId, id } }, data: { status: 'archived', version: { increment: 1 } },
            });
        }, async (_tx, _result, command) => commandDto(command, 'customer_address'), cleanText(input.reason));
    }

    listCases(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (tx, userId, permissionVersion) => {
            const query = listQuery(raw);
            if (query.q !== undefined || query.status !== undefined || query.sort !== undefined) throw new UnprocessableEntityException();
            const page = paging(query, ['service-cases', shopId, userId, String(permissionVersion)]);
            return page.result(await tx.serviceCase.findMany({
                where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1,
            }));
        });
    }

    getCase(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, tx => caseInShop(tx, shopId, id));
    }

    createCase(headers: IncomingHttpHeaders, shopId: string, input: CaseInput, requestId: string) {
        return this.change(headers, shopId, 'createServiceCase', 'service_case', input, requestId,
            tx => createServiceCaseRecord(tx, shopId, input), (tx, result) => caseInShop(tx, shopId, result.id));
    }

    changeCase(headers: IncomingHttpHeaders, shopId: string, id: string, input: CaseChange, requestId: string) {
        return this.change(headers, shopId, 'setServiceCaseStatus', 'service_case', { id, input }, requestId, async tx => {
            const current = await caseInShop(tx, shopId, id);
            requireVersion(current.version, input.expectedVersion);
            if (!caseTransitions[current.state].includes(input.state)) throw new ConflictException();
            return tx.serviceCase.update({
                where: { shopId_id: { shopId, id } }, data: { state: input.state, version: { increment: 1 } },
            });
        }, (tx, result) => caseInShop(tx, shopId, result.id), cleanText(input.reason, false));
    }

    private change<T>(headers: IncomingHttpHeaders, shopId: string, action: string, resourceType: AuditResource,
        payload: Prisma.InputJsonValue, requestId: string, apply: (tx: Prisma.TransactionClient) => Promise<Versioned>,
        read: (tx: Prisma.TransactionClient, result: ResourceRef, command: Command) => Promise<T>, reason?: string) {
        return writeShopCommand(this.db, this.config, { headers, shopId, permission: 'customers.write', operationId: action, payload },
            async (tx, scope) => {
                const entity = await apply(tx);
                await recordAudit(tx, {
                    shopId: scope.shopId, actorId: scope.userId, action, requestId, resourceType, resourceId: entity.id,
                    metadata: { version: entity.version, ...(reason ? { reason } : {}) },
                });
                return { type: resourceType, id: entity.id };
            }, (tx, _scope, result, command) => {
                if (result.type !== resourceType) throw new ConflictException();
                return read(tx, result, command);
            });
    }
}
