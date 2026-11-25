import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { AddressSnapshot, Customer, CustomerAddress, Prisma } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';

export type CustomerInput = { displayName: string; phone: string | null; email: string | null; notes: string };
export type AddressInput = {
    label: string; recipient: string; phone: string | null; line1: string; province: string;
    ward: string | null; district: string | null; postalCode: string | null; countryCode: string;
};
const addressFields: (keyof AddressInput)[] = [
    'label', 'recipient', 'phone', 'line1', 'province', 'ward', 'district', 'postalCode', 'countryCode',
];

export function cleanText(value: string, required = true): string {
    const text = value.trim();
    if ((required && !text) || text.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
    return text;
}

function normalizePhone(value: string | null): string | null {
    if (value === null) return null;
    const phone = value.replace(/[\s().-]/g, '');
    if (!/^\+?\d{3,30}$/.test(phone)) throw new UnprocessableEntityException();
    return phone;
}

export function checkedCustomer(input: Partial<CustomerInput>): Partial<CustomerInput> {
    return {
        ...(input.displayName === undefined ? {} : { displayName: cleanText(input.displayName) }),
        ...(input.phone === undefined ? {} : { phone: normalizePhone(input.phone) }),
        ...(input.email === undefined ? {} : { email: input.email?.replace(/@(.+)$/, (_match, host: string) => '@' + host.toLowerCase()) ?? null }),
        ...(input.notes === undefined ? {} : { notes: cleanText(input.notes, false) }),
    };
}

export function checkedAddress(input: Partial<AddressInput>) {
    return Object.fromEntries(Object.entries(input).map(([field, value]) => [
        field, field === 'phone' ? normalizePhone(value) : value === null ? null : cleanText(value),
    ])) as Partial<AddressInput>;
}

export async function customerInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const customer = await tx.customer.findUnique({ where: { shopId_id: { shopId, id } } });
    if (!customer) throw new NotFoundException();
    return customer;
}

export async function createAddressForCustomer(tx: Prisma.TransactionClient, shopId: string, customerId: string, input: AddressInput) {
    if (addressRedactions(await customerInShop(tx, shopId, customerId)).length) throw new ForbiddenException();
    return tx.customerAddress.create({ data: { ...input, ...checkedAddress(input), shopId, customerId } });
}

export async function addressForCustomer(tx: Prisma.TransactionClient, shopId: string, customerId: string, id: string) {
    if (!validUuid(customerId) || !validUuid(id)) throw new NotFoundException();
    const address = await tx.customerAddress.findUnique({ where: { shopId_customerId_id: { shopId, customerId, id } } });
    if (!address) throw new NotFoundException();
    return address;
}

export function customerView(customer: Customer) {
    const { redactedFields } = customer;
    return {
        ...customer, externalIdentity: null,
        displayName: redactedFields.includes('displayName') ? 'Đã ẩn thông tin' : customer.displayName,
        phone: redactedFields.includes('phone') ? null : customer.phone,
        email: redactedFields.includes('email') ? null : customer.email,
        notes: redactedFields.includes('notes') ? null : customer.notes,
    };
}

export function addressRedactions(customer: Customer, address?: CustomerAddress) {
    const hidden = customer.redactedFields;
    return addressFields.filter(field => address?.redactedFields.includes(field)
        || hidden.includes('addresses') || hidden.includes('shippingAddress') || hidden.includes('address.' + field)
        || (field === 'phone' && hidden.includes('phone')));
}

export function addressView(customer: Customer, address: CustomerAddress) {
    const redactedFields = addressRedactions(customer, address);
    return { ...address, ...Object.fromEntries(redactedFields.map(field => [field, null])), redactedFields };
}

export async function snapshotAddress(tx: Prisma.TransactionClient, shopId: string, customerId: string, addressId: string) {
    const customer = await customerInShop(tx, shopId, customerId);
    const address = await addressForCustomer(tx, shopId, customerId, addressId);
    if (addressRedactions(customer, address).length) throw new ForbiddenException();
    if (address.status !== 'active' || !address.label || !address.recipient || !address.line1 || !address.province || !address.countryCode) {
        throw new UnprocessableEntityException();
    }
    const key = { shopId, customerId, addressId, addressVersion: address.version };
    const data = Object.fromEntries(addressFields.map(field => [field, address[field]]));
    await tx.addressSnapshot.createMany({ data: [{ ...key, data }], skipDuplicates: true });
    return tx.addressSnapshot.findUniqueOrThrow({ where: { shopId_customerId_addressId_addressVersion: key } });
}

export function addressSnapshotView(snapshot: AddressSnapshot & { address: CustomerAddress }, customer: Customer, canRead: boolean) {
    const values = snapshot.data as AddressInput;
    const redactedFields = canRead ? addressRedactions(customer, snapshot.address) : addressFields;
    return {
        addressId: snapshot.addressId, addressVersion: snapshot.addressVersion,
        ...values, ...Object.fromEntries(redactedFields.map(field => [field, null])), redactedFields,
    };
}

export async function customerForChannelIdentity(tx: Prisma.TransactionClient, shopId: string,
    identity: { channel: string; pageId: string; externalId: string; displayName: string }) {
    const key = { shopId, channel: cleanText(identity.channel), pageId: cleanText(identity.pageId), externalId: cleanText(identity.externalId) };
    if (Array.from(key.channel).length > 40 || [key.pageId, key.externalId].some(part => Array.from(part).length > 160)) {
        throw new UnprocessableEntityException();
    }
    const existing = await tx.customerIdentity.findUnique({ where: { shopId_channel_pageId_externalId: key } });
    if (existing) return existing.customerId;
    const customer = await tx.customer.create({ data: { shopId, displayName: cleanText(identity.displayName) }, select: { id: true } });
    await tx.customerIdentity.create({ data: { ...key, customerId: customer.id } });
    return customer.id;
}
