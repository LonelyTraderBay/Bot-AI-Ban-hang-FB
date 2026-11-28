import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { Prisma, type ConversationOrderDraft, type PrismaClient } from '../../generated/prisma/client.js';
import { listQuery, paging, validUuid } from '../../http/query.js';
import { requireIfMatch, requireVersion } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { recordCommand, type ResourceRef } from '../../platform/commands/index.js';
import { clearDraftLease } from '../../platform/database/draft-lease.js';
import { requireOpenShop } from '../../platform/database/shop-lifecycle.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { sellableVariants } from '../catalog/index.js';
import { conversationInShop, updateConversation } from '../inbox/index.js';
import { readAsSession, requireIdempotencyKey, requireShopAccess, writeAsSession, type AuthConfig, type ShopScope } from '../workspace/index.js';
import { orderInShop, orderView } from './order-data.js';
import { createSalesDraft } from './orders-service.js';
import { estimateOrderPricing, type DraftOrder } from './pricing.js';

const leaseSeconds = 60;
type Tx = Prisma.TransactionClient;
type Conversation = Awaited<ReturnType<typeof conversationInShop>>;
export type DraftValues = Partial<Pick<DraftOrder, 'warehouseId' | 'notes' | 'shippingAddressId' | 'paymentMethod' | 'promotionId'>> & {
    lines?: { variantId?: string; quantity?: number }[];
    lastField?: 'product' | 'quantity' | 'warehouse' | 'shippingAddress' | 'paymentMethod' | 'promotion' | 'notes';
};
export type DraftAccess = { tabId: string; action: 'open' | 'resume' | 'renew'; draftId?: string; editEpoch?: number };
export type DraftEdit = { tabId: string; editEpoch: number };
export type DraftSave = DraftEdit & { values: DraftValues };

type Editor = { scope: ShopScope; sessionId: string; tabId: string; conversation: Conversation };
const key = (shopId: string, id: string) => ({ shopId_id: { shopId, id } });
const canWrite = (scope: ShopScope) => scope.permissions.includes('orders.write') && scope.permissions.includes('conversations.reply');

async function orderDraftScope(tx: Tx, shopId: string, userId: string, write = false) {
    const scope = await requireShopAccess(tx, userId, shopId, 'orders.read');
    if (!scope.permissions.includes('conversations.read') || (write && !canWrite(scope))) throw new ForbiddenException();
    return scope;
}

async function customerConversation(tx: Tx, shopId: string, id: string) {
    const conversation = await conversationInShop(tx, shopId, id);
    if (conversation.identity.customer.privacyErasedAt) throw new NotFoundException();
    return conversation;
}

function draftView(row: ConversationOrderDraft, includeNotes = true) {
    const { notes, ...fields } = (row.values ?? {}) as DraftValues;
    return {
        id: row.id, shopId: row.shopId, conversationId: row.conversationId, version: row.version, editEpoch: row.editEpoch,
        values: { ...fields, ...(includeNotes && notes !== undefined && { notes }) }, savedAt: row.savedAt?.toISOString() ?? null,
        editExpiresAt: row.editExpiresAt?.toISOString() ?? null,
    };
}

const activeDraft = (tx: Tx, conversation: Conversation) => tx.conversationOrderDraft.findFirst({
    where: { shopId: conversation.shopId, conversationId: conversation.id, state: 'active' },
});

async function draftById(tx: Tx, conversation: Conversation, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const row = await tx.conversationOrderDraft.findUnique({ where: key(conversation.shopId, id) });
    if (!row || row.conversationId !== conversation.id) throw new NotFoundException();
    return row;
}

function assigned(editor: Editor) {
    return editor.conversation.mode === 'human' && editor.conversation.assignedUserId === editor.scope.userId;
}

function leaseLive(editor: Editor, row: ConversationOrderDraft, now: Date) {
    return row.state === 'active' && editor.conversation.status === 'open' && assigned(editor)
        && row.editGeneration === editor.conversation.generation && row.editPermissionVersion === editor.scope.permissionVersion
        && row.editExpiresAt !== null && row.editExpiresAt > now;
}

function leaseOwned(editor: Editor, row: ConversationOrderDraft, now: Date) {
    return leaseLive(editor, row, now) && row.editSessionId === editor.sessionId && row.editTabId === editor.tabId;
}

function requireLease(editor: Editor, row: ConversationOrderDraft, version: string, epoch: number | undefined, now: Date) {
    if (row.editEpoch !== epoch || !leaseOwned(editor, row, now)) throw new ConflictException('Quyền sửa bản đang nhập đã chuyển hoặc hết hạn.');
    requireVersion(row.version, version);
}

function parseDraft(conversation: Conversation, values: DraftValues): DraftOrder {
    const { warehouseId, paymentMethod, lines, notes = '', shippingAddressId = null, promotionId = null } = values;
    const complete = lines?.map(({ variantId, quantity }) => {
        if (!variantId || !validUuid(variantId) || quantity === undefined) throw new UnprocessableEntityException('Chọn mặt hàng và số lượng cho mỗi dòng.');
        return { variantId, quantity };
    });
    if (!warehouseId || !validUuid(warehouseId) || !paymentMethod || !complete?.length ||
        [shippingAddressId, promotionId].some(value => value && !validUuid(value))) {
        throw new UnprocessableEntityException('Chọn kho, sản phẩm và cách thanh toán.');
    }
    return {
        customerId: conversation.customerId, conversationId: conversation.id, warehouseId, paymentMethod,
        lines: complete, notes, shippingAddressId, promotionId,
    };
}

export class ConversationDrafts {
    constructor(private readonly db?: PrismaClient, private readonly auth?: AuthConfig) {}

    get(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await orderDraftScope(tx, shopId, userId);
            const conversation = await customerConversation(tx, shopId, id);
            const row = await activeDraft(tx, conversation);
            const shop = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { closedAt: true } });
            const canOpen = !shop.closedAt && canWrite(scope) && conversation.status === 'open'
                && (conversation.assignedUserId === null ? scope.permissions.includes('conversations.assign')
                    : conversation.assignedUserId === userId && conversation.mode === 'human');
            const draft = row && draftView(row, scope.permissions.includes('orders.write'));
            const selected = (draft?.values.lines ?? []).flatMap(line => line.variantId ? [line.variantId] : []);
            const variants = selected.length && scope.permissions.includes('catalog.read') ? await sellableVariants(tx, shopId, selected) : [];
            return { draft, canOpen, selectedVariants: variants.map(variant => ({ id: variant.id, label: `${variant.product.name} · ${variant.sku}` })) };
        });
    }

    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await orderDraftScope(tx, shopId, userId);
            const filters = listQuery(raw, 'conversationDrafts');
            const page = paging(filters, ['conversation-drafts', shopId, userId, String(scope.permissionVersion)]);
            const customerNames = scope.permissions.includes('customers.read');
            const search: Prisma.ConversationOrderDraftWhereInput = page.keyword ? {
                OR: [
                    ...(customerNames ? [{ conversation: { identity: { customer: {
                        displayName: { contains: page.keyword, mode: 'insensitive' as const }, NOT: { redactedFields: { has: 'displayName' } },
                    } } } }] : []),
                    ...(filters.q && validUuid(filters.q.trim()) ? [{ conversationId: filters.q.trim() }] : []),
                ],
            } : {};
            const rows = page.result(await tx.conversationOrderDraft.findMany({
                where: { shopId, state: 'active', savedAt: { not: null }, conversation: { identity: { customer: { privacyErasedAt: null } } },
                    AND: [search, page.after ?? {}] },
                orderBy: page.orderBy, take: page.limit + 1,
                select: { id: true, conversationId: true, createdAt: true, savedAt: true, conversation: {
                    select: { assignedUserId: true, identity: { select: { customer: { select: { displayName: true, redactedFields: true } } } } },
                } },
            }));
            return { page: rows.page, data: rows.data.map(({ id, conversationId, savedAt, conversation }) => {
                const customer = conversation.identity.customer;
                return { id, conversationId, savedAt: savedAt!.toISOString(), assigneeId: conversation.assignedUserId,
                    customerName: customerNames && !customer.redactedFields.includes('displayName') ? customer.displayName : null };
            }) };
        });
    }

    estimate(headers: IncomingHttpHeaders, shopId: string, id: string, draftId: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            await orderDraftScope(tx, shopId, userId);
            const conversation = await customerConversation(tx, shopId, id);
            const row = await draftById(tx, conversation, draftId);
            if (row.state !== 'active') throw new NotFoundException();
            const draft = parseDraft(conversation, draftView(row).values);
            return { version: row.version, ...await estimateOrderPricing(tx, shopId, draft) };
        });
    }

    private edit<T>(headers: IncomingHttpHeaders, shopId: string, id: string, tabId: string, apply: (tx: Tx, editor: Editor, key: string) => Promise<T>) {
        if (!validUuid(tabId)) throw new BadRequestException();
        return writeAsSession(this.db, this.auth, headers, async (tx, userId, _config, _token, sessionId) => {
            const scope = await orderDraftScope(tx, shopId, userId, true);
            await requireOpenShop(tx, shopId);
            const conversation = await customerConversation(tx, shopId, id);
            return apply(tx, { scope, sessionId, tabId, conversation }, requireIdempotencyKey(headers));
        });
    }

    private command(tx: Tx, editor: Editor, idempotencyKey: string, operationId: string, input: Prisma.InputJsonObject,
        apply: () => Promise<ResourceRef>) {
        return recordCommand(tx, { shopId: editor.scope.shopId, actorId: editor.scope.userId, operationId, idempotencyKey },
            { ...input, conversationId: editor.conversation.id, tabId: editor.tabId, sessionId: editor.sessionId }, apply);
    }

    access(headers: IncomingHttpHeaders, shopId: string, id: string, input: DraftAccess, trace: string) {
        return this.edit(headers, shopId, id, input.tabId, async (tx, editor, idempotencyKey) => {
            const now = new Date();
            const row = await activeDraft(tx, editor.conversation);
            const expiresAt = new Date(now.getTime() + leaseSeconds * 1000);
            if (input.action === 'renew') {
                if (!row || row.id !== input.draftId) throw new ConflictException();
                requireLease(editor, row, requireIfMatch(headers), input.editEpoch, now);
                return draftView(await tx.conversationOrderDraft.update({ where: key(shopId, row.id), data: { editExpiresAt: expiresAt } }));
            }
            const { result, command } = await this.command(tx, editor, idempotencyKey, 'accessConversationOrderDraft', input, async () => {
                if (editor.conversation.status !== 'open') throw new ConflictException();
                if (input.action === 'resume' && (!row || row.id !== input.draftId || row.editEpoch !== input.editEpoch)) {
                    throw new ConflictException('Bản đang nhập đã thay đổi. Tải lại trạng thái trước khi chuyển quyền sửa.');
                }
                let claimed = false;
                if (editor.conversation.assignedUserId === null && input.action === 'open') {
                    if (!editor.scope.permissions.includes('conversations.assign')) throw new ForbiddenException();
                    const change = await updateConversation(tx, editor.conversation, {
                        mode: 'human', assignedUserId: editor.scope.userId, unreadCount: 0, generation: { increment: 1 },
                    });
                    editor.conversation = { ...editor.conversation, ...change };
                    claimed = true;
                    await recordAudit(tx, { shopId, actorId: editor.scope.userId, requestId: trace, action: 'takeoverConversation',
                        resourceType: 'conversation', resourceId: id, metadata: { version: change.version, mode: change.mode, source: 'order_draft' } });
                }
                if (!assigned(editor) || (row && leaseLive(editor, row, now) && !leaseOwned(editor, row, now) && input.action === 'open')) {
                    throw new ConflictException('Hội thoại hoặc bản đang nhập đang được người khác xử lý.');
                }
                const owner = {
                    editSessionId: editor.sessionId, editTabId: editor.tabId, editExpiresAt: expiresAt,
                    editGeneration: editor.conversation.generation, editPermissionVersion: editor.scope.permissionVersion,
                };
                const sameLease = row && leaseOwned(editor, row, now);
                const draft = row ? await tx.conversationOrderDraft.update({ where: key(shopId, row.id),
                    data: { ...owner, ...(sameLease ? {} : { editEpoch: { increment: 1 } }) },
                }) : await tx.conversationOrderDraft.create({ data: {
                    shopId, conversationId: id, customerId: editor.conversation.customerId, ...owner, editEpoch: 1,
                } });
                if (!claimed && !sameLease) await enqueueResourceUpdate(tx, 'conversation.updated', editor.conversation);
                return { type: 'conversation_order_draft', id: draft.id, scope: String(draft.editEpoch) };
            });
            const draft = await draftById(tx, editor.conversation, result.id);
            if (!leaseOwned(editor, draft, now) || String(draft.editEpoch) !== (command.result as ResourceRef | null)?.scope) throw new ConflictException();
            return draftView(draft);
        });
    }

    save(headers: IncomingHttpHeaders, shopId: string, id: string, draftId: string, input: DraftSave) {
        const version = requireIfMatch(headers);
        const { values } = input;
        if (values.notes?.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
        return this.edit(headers, shopId, id, input.tabId, async (tx, editor, idempotencyKey) => {
            const now = new Date();
            const { result } = await this.command(tx, editor, idempotencyKey, 'saveConversationOrderDraft', { draftId, version, ...input }, async () => {
                const row = await draftById(tx, editor.conversation, draftId);
                requireLease(editor, row, version, input.editEpoch, now);
                await tx.conversationOrderDraft.update({ where: key(shopId, row.id), data: { values, savedAt: now, version: { increment: 1 } } });
                await enqueueResourceUpdate(tx, 'conversation.updated', editor.conversation);
                return { type: 'conversation_order_draft', id: draftId };
            });
            const row = await draftById(tx, editor.conversation, result.id);
            if (row.editEpoch !== input.editEpoch || !leaseOwned(editor, row, now)) throw new ConflictException();
            return draftView(row);
        });
    }

    finish(headers: IncomingHttpHeaders, shopId: string, id: string, draftId: string, input: DraftEdit,
        operationId: 'discardConversationOrderDraft' | 'convertConversationOrderDraft', trace: string) {
        const version = requireIfMatch(headers);
        return this.edit(headers, shopId, id, input.tabId, async (tx, editor, idempotencyKey) => {
            const { result } = await this.command(tx, editor, idempotencyKey, operationId, { draftId, version, ...input }, async () => {
                const row = await draftById(tx, editor.conversation, draftId);
                requireLease(editor, row, version, input.editEpoch, new Date());
                const convert = operationId === 'convertConversationOrderDraft';
                const order = convert ? await createSalesDraft(tx, shopId, parseDraft(editor.conversation, draftView(row).values)) : null;
                await tx.conversationOrderDraft.update({ where: key(shopId, row.id), data: {
                    ...clearDraftLease, values: Prisma.DbNull, version: { increment: 1 }, editEpoch: { increment: 1 },
                    state: convert ? 'converted' : 'discarded',
                } });
                await enqueueResourceUpdate(tx, 'conversation.updated', editor.conversation);
                if (order) await enqueueResourceUpdate(tx, 'order.updated', order);
                const resource = order ? { type: 'order', id: order.id } : { type: 'conversation_order_draft', id: row.id };
                await recordAudit(tx, { shopId, actorId: editor.scope.userId, requestId: trace, action: operationId,
                    resourceType: resource.type, resourceId: resource.id, metadata: { conversationId: id } });
                return resource;
            });
            return result.type === 'order' ? orderView(await orderInShop(tx, shopId, result.id), editor.scope) : null;
        });
    }
}
