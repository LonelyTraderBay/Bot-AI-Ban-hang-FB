import type { ChannelConversation, OrderFulfillmentState, Prisma, ShipmentState } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { recordAudit } from '../../platform/audit/index.js';
import { recordCommand, type ResourceRef } from '../../platform/commands/index.js';
import type { BotAgentAuditContext } from '../ai/index.js';
import { createServiceCaseRecord } from '../customers/index.js';
import type { AuthConfig } from '../workspace/index.js';
import { inboundIntentKey, workForHandoff } from './bot-drafts.js';

const orderStatus: Record<OrderFulfillmentState, string> = {
    unfulfilled: 'đang chờ chuẩn bị', reserved: 'đã giữ hàng', picking: 'đang lấy hàng', packed: 'đã đóng gói',
    dispatched: 'đã bàn giao vận chuyển', part_delivered: 'đã giao một phần', delivered: 'đã giao',
    part_returned: 'đã ghi nhận trả một phần', returned: 'đã ghi nhận trả toàn bộ',
};
const shipmentStatus: Record<ShipmentState, string> = {
    planned: 'đang chuẩn bị', handed_over: 'đã bàn giao', in_transit: 'đang vận chuyển', delivered: 'đã giao',
    failed: 'giao chưa thành công', returning: 'đang chuyển hoàn', returned: 'đã chuyển hoàn', cancelled: 'đã hủy',
};
const intakeReply = 'Cửa hàng đã ghi nhận yêu cầu đổi hoặc trả hàng. Nhân viên sẽ kiểm tra và phản hồi qua hội thoại này.';

export function afterSalesRequest(text: string) {
    const match = /^(TRA ĐƠN|YÊU CẦU TRẢ) ([a-f0-9-]{36})$/iu.exec(text.trim());
    if (!match || !validUuid(match[2])) return null;
    return { orderId: match[2], kind: match[1].toUpperCase() === 'TRA ĐƠN' ? 'tracking' as const : 'return_request' as const };
}

export async function authorizedAfterSales(tx: Prisma.TransactionClient,
    { shopId, conversationId, messageId }: { shopId: string; conversationId: string; messageId: string }, permissions: readonly string[]) {
    const message = await tx.channelMessage.findFirst({ where: {
        shopId, id: messageId, conversationId, direction: 'inbound', origin: 'fixture', senderKind: 'customer', redactedAt: null,
        createdAt: { lte: new Date() }, conversation: { identity: { customer: { privacyErasedAt: null } } },
    }, select: { text: true, createdAt: true, conversation: { select: {
        customerId: true, customerIdentityId: true, channelId: true, lastInboundAt: true,
        channel: { select: { provider: true, pageId: true } }, identity: { select: { channel: true, pageId: true } },
    } } } });
    const request = message && afterSalesRequest(message.text);
    if (!message || !request) return null;
    const { customerId, customerIdentityId, channelId, lastInboundAt, channel, identity } = message.conversation;
    const required = request.kind === 'tracking' ? 'fulfillment.read' : 'customers.write';
    if (channel.provider !== 'messenger' || identity.channel !== channel.provider || identity.pageId !== channel.pageId ||
        lastInboundAt?.getTime() !== message.createdAt.getTime() || !['customers.read', 'orders.read', required].every(p => permissions.includes(p))) return null;
    const order = await tx.salesOrder.findUnique({ where: {
        shopId_customerId_id: { shopId, customerId, id: request.orderId }, orderState: { in: ['confirmed', 'completed'] },
        confirmation: { is: { customerIdentityId, quote: { orderId: request.orderId }, message: {
            origin: 'fixture', direction: 'inbound', senderKind: 'customer', redactedAt: null,
            conversation: { channelId, customerIdentityId },
        } } },
    }, select: { id: true, fulfillmentState: true } });
    if (!order) return null;
    const sources: ResourceRef[] = [{ type: 'order', id: order.id }];
    if (request.kind === 'return_request') return { kind: request.kind, orderId: order.id, text: intakeReply, sources };
    const shipment = await tx.shipment.findFirst({ where: { shopId, orderId: order.id, state: { not: 'cancelled' } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, state: true } });
    const text = 'Đơn hàng của bạn ' + orderStatus[order.fulfillmentState] + '.';
    if (!shipment) return { kind: request.kind, orderId: order.id, text, sources };
    sources.push({ type: 'shipment', id: shipment.id });
    return { kind: request.kind, orderId: order.id, text: text + ' Vận đơn gần nhất ' + shipmentStatus[shipment.state] + '.', sources };
}

export async function recordReturnIntake(tx: Prisma.TransactionClient, config: AuthConfig, input: {
    conversation: ChannelConversation; actorId: string; messageId: string; orderId: string;
    auditContext: BotAgentAuditContext & { permissionVersion: number };
}) {
    const { conversation, actorId, messageId, orderId, auditContext } = input;
    const { shopId, customerId } = conversation;
    const operationId = 'createServiceCase';
    const command = await recordCommand(tx, { shopId, actorId, operationId, idempotencyKey: inboundIntentKey(config, shopId, messageId, 'return-intake') },
        { orderId, sourceMessageId: messageId, configHash: auditContext.configHash }, async () => {
            const work = await workForHandoff(tx, conversation, false);
            const existing = await tx.serviceCase.findFirst({ where: { shopId, customerId, orderId, kind: 'return_request',
                state: { in: ['open', 'assigned'] } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
            const record = existing ?? await createServiceCaseRecord(tx, shopId, {
                customerId, orderId, kind: 'return_request', summary: 'Khách đã gửi yêu cầu đổi hoặc trả hàng trong hội thoại đã xác minh.',
            }, work.id);
            await recordAudit(tx, { shopId, actorId, requestId: messageId, action: operationId, resourceType: 'service_case', resourceId: record.id,
                metadata: { ...auditContext, origin: 'bot_fixture', sourceMessageId: messageId, resourceVersion: record.version,
                    result: existing ? 'existing_case' : 'case_created' } });
            return { type: 'service_case', id: record.id };
        });
    return command.result;
}
