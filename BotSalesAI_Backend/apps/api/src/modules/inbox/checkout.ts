import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { BotInboundTask, ChannelConversation, ChannelMessage, Prisma } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract } from '../../http/contracts.js';
import { validUuid } from '../../http/query.js';
import { recordAudit } from '../../platform/audit/index.js';
import { recordCommand, type ResourceRef } from '../../platform/commands/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import type { BotAgentAuditContext } from '../ai/index.js';
import { checkedAddress, type AddressInput } from '../customers/index.js';
import { orderInShop, quoteDeliveryDraft, recordSalesQuoteEvidence } from '../orders/index.js';
import type { AuthConfig, ShopScope } from '../workspace/index.js';
import { inboundIntentKey } from './bot-drafts.js';

const addressSchema = validator.compile(schemaFromContract('CustomerAddressWrite'));
const detailPrompt = 'Để cung cấp thông tin giao đơn, gửi: GIAO ĐƠN | mã quốc gia 2 chữ | tỉnh/thành | địa chỉ đầy đủ | người nhận | số liên hệ | COD hoặc TRẢ TRƯỚC. Thông tin này dùng để xử lý đơn.';
const madeUnavailable = (code: string) => ({ code, text: '', sources: [] as ResourceRef[], draft: undefined });

type CheckoutTurn = {
    message: Pick<ChannelMessage, 'id' | 'text' | 'origin' | 'direction' | 'senderKind' | 'redactedAt' | 'createdAt'>;
    conversation: ChannelConversation;
    generations: Pick<BotInboundTask, 'botGeneration' | 'channelGeneration' | 'conversationGeneration'>;
    scope: ShopScope;
    auditContext: BotAgentAuditContext & { permissionVersion: number };
    maxToolSteps: number;
};

export function checkoutPrompt(permissions: readonly string[], maxToolSteps: number) {
    return maxToolSteps >= 2 && ['orders.write', 'customers.write'].every(permission => permissions.includes(permission))
        ? detailPrompt : '';
}

function parseDelivery(text: string) {
    const fields = text.split('|').map(value => value.trim());
    if (fields.length !== 7 || fields[0].toLocaleUpperCase('vi') !== 'GIAO ĐƠN' || fields.some(value => !value || /[\x00-\x1f\x7f]/u.test(value))) return null;
    const [, country, province, line1, recipient, phone, payment] = fields;
    const methods = { COD: 'cod', 'TRẢ TRƯỚC': 'prepay' } as const;
    const paymentKey = payment.toLocaleUpperCase('vi');
    if (!Object.hasOwn(methods, paymentKey)) return null;
    const address: AddressInput = { label: 'Giao đơn qua hội thoại', countryCode: country.toUpperCase(), province,
        line1, recipient, phone, ward: null, district: null, postalCode: null };
    if (!addressSchema(address)) return null;
    try { checkedAddress(address); } catch (error) {
        if (error instanceof UnprocessableEntityException) return null;
        throw error;
    }
    return { address, paymentMethod: methods[paymentKey as keyof typeof methods] };
}

function replyRef(source: Prisma.JsonValue | null, type: string) {
    if (!Array.isArray(source)) return;
    const refs = source.flatMap(value => value && typeof value === 'object' && !Array.isArray(value) &&
        value.type === type && typeof value.id === 'string' && validUuid(value.id) ? [value.id] : []);
    return refs.length === 1 ? refs[0] : undefined;
}

export async function checkoutReply(tx: Prisma.TransactionClient, config: AuthConfig, turn: CheckoutTurn) {
    const { message, conversation, generations, scope, auditContext, maxToolSteps } = turn;
    const { shopId, id: conversationId, customerId, customerIdentityId } = conversation;
    const text = message.text.trim();
    const delivery = /^GIAO ĐƠN(?:\s|\||$)/iu.test(text);
    const token = /^\[CONFIRM:([0-9a-f-]{36}):([0-9a-f]{64})\]$/u.exec(text);
    // This path starts from a signed fixture event. Provider input keeps its separate approval gate.
    if ((!delivery && !token) || message.origin !== 'fixture' || message.direction !== 'inbound' || message.senderKind !== 'customer') return null;
    const unavailable = madeUnavailable(delivery ? 'checkout_details_unavailable' : 'checkout_confirmation_unavailable');
    if (message.redactedAt || !checkoutPrompt(scope.permissions, maxToolSteps)) return unavailable;
    const prior = await tx.channelMessage.findFirst({
        where: { shopId, conversationId, direction: 'outbound', senderKind: 'bot', dispatch: {
            botGeneration: generations.botGeneration, channelGeneration: generations.channelGeneration,
            conversationGeneration: generations.conversationGeneration,
        } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { text: true, createdAt: true, status: true, redactedAt: true, sourceEvidence: true,
            dispatch: { select: { finishedAt: true } } },
    });
    if (!prior?.dispatch?.finishedAt || prior.dispatch.finishedAt > message.createdAt ||
        prior.redactedAt || !['sent', 'delivered', 'read'].includes(prior.status)) return unavailable;
    const orderId = replyRef(prior.sourceEvidence, 'order');
    if (!orderId) return unavailable;
    const order = await orderInShop(tx, shopId, orderId);
    if (order.customerId !== customerId || order.conversationId !== conversationId ||
        order.orderState !== 'draft' || order.updatedAt > prior.createdAt) return unavailable;
    const orderRef = { type: 'order', id: orderId };
    const record = (action: string, resource: ResourceRef, version?: number) => recordAudit(tx, {
        shopId, actorId: scope.userId, requestId: message.id, action, resourceType: resource.type, resourceId: resource.id,
        metadata: { ...auditContext, origin: 'bot_fixture', sourceMessageId: message.id, ...(version ? { resourceVersion: version } : {}) },
    });
    const command = (operationId: string, payload: Prisma.InputJsonValue, resource: ResourceRef) => recordCommand(tx, {
        shopId, actorId: scope.userId, operationId, idempotencyKey: inboundIntentKey(config, shopId, message.id, operationId),
    }, payload, async () => resource);

    if (delivery) {
        if (order.shippingAddressId || !prior.text.includes(detailPrompt)) return unavailable;
        const data = parseDelivery(text);
        if (!data) return { code: 'checkout_details_required', text: detailPrompt, sources: [orderRef], draft: undefined };
        const prepared = await quoteDeliveryDraft(tx, order, data.address, data.paymentMethod);
        if (!prepared) return unavailable;
        const { quote, rate, lines, address, order: updated } = prepared;
        const quoteRef = { type: 'order_quote', id: quote.id };
        await command('quoteOrder', { orderId, version: updated.version, sourceMessageId: message.id }, quoteRef);
        await record('createCustomerAddress', { type: 'customer_address', id: address.id }, address.version);
        await record('updateOrderDraft', orderRef, updated.version);
        await record('quoteOrder', quoteRef, updated.version);
        await enqueueResourceUpdate(tx, 'order.updated', updated);
        const terms = lines.map(line => line.sku + ' × ' + line.quantity).join(', ');
        const payment = data.paymentMethod === 'cod' ? 'COD' : 'Trả trước, chờ nhân viên kiểm tra thanh toán';
        const shipping = rate ? 'Phí giao dự kiến: ' + rate.fee.amount + ' ' + rate.fee.currency + '.'
            : 'Phí giao chưa có trong báo giá. Nhân viên sẽ kiểm tra.';
        return { code: 'checkout_quote', sources: [orderRef, quoteRef], draft: undefined,
            text: ['Bản tóm tắt đơn: ' + terms + '. Tiền hàng: ' + quote.total.toFixed() + ' ' + quote.currency + '.',
                'Giao đến địa chỉ vừa cung cấp. Thanh toán: ' + payment + '.', shipping,
                'Để xác nhận bản tóm tắt này, gửi nguyên mã trong 15 phút:',
                '[CONFIRM:' + quote.id + ':' + quote.quoteHash + ']'].join('\n') };
    }

    if (!token || token[1] !== replyRef(prior.sourceEvidence, 'order_quote') || !prior.text.endsWith(text)) return unavailable;
    let evidence: Awaited<ReturnType<typeof recordSalesQuoteEvidence>>;
    try {
        evidence = await recordSalesQuoteEvidence(tx, order, {
            quoteId: token[1], quoteHash: token[2], quoteVersion: order.version, customerIdentityId, sourceMessageId: message.id,
        }, config);
    } catch (error) {
        if (error instanceof ConflictException || error instanceof NotFoundException || error instanceof UnprocessableEntityException) return unavailable;
        throw error;
    }
    const evidenceRef = { type: 'customer_confirmation', id: evidence.id };
    await command('recordCustomerConfirmation', { orderId, quoteId: token[1], sourceMessageId: message.id }, evidenceRef);
    if (!('repeat' in evidence)) await record('recordCustomerConfirmation', evidenceRef, 1);
    return { code: 'checkout_evidence', text: 'Đã ghi nhận xác nhận của bạn. Nhân viên sẽ kiểm tra và chốt đơn.',
        sources: [orderRef, evidenceRef], draft: undefined };
}
