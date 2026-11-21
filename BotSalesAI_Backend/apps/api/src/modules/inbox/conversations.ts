import { Controller, Get, Module, Param, Query, Req, Res, UnprocessableEntityException, type DynamicModule } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PrismaClient, ConversationStatus } from '../../generated/prisma/client.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery, paging, validUuid } from '../../http/query.js';
import { envelope, noStore } from '../../http/response.js';
import { customerView } from '../customers/index.js';
import { readAsSession, requireShopAccess } from '../workspace/index.js';

class ConversationsService {
    constructor(private readonly db?: PrismaClient) {}

    list(headers: IncomingMessage['headers'], shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'conversations.read');
            const filters = listQuery(raw, 'conversations');
            if (filters.status && !['open', 'resolved'].includes(filters.status)) throw new UnprocessableEntityException();
            const page = paging(filters, ['conversations', shopId, userId, String(scope.permissionVersion),
                filters.customerId ?? '', filters.channelId ?? '', filters.assignedUserId ?? '', filters.mode ?? '']);
            const canReadName = scope.permissions.includes('customers.read');
            const q = filters.q?.trim();
            const search = page.keyword ? { OR: [
                ...(canReadName ? [{ identity: { customer: {
                    displayName: { contains: page.keyword, mode: 'insensitive' as const }, NOT: { redactedFields: { has: 'displayName' } },
                } } }] : []),
                ...(q && validUuid(q) ? [{ id: q }] : []),
            ] } : {};
            const result = page.result(await tx.channelConversation.findMany({
                where: {
                    shopId, customerId: filters.customerId, channelId: filters.channelId, assignedUserId: filters.assignedUserId,
                    mode: filters.mode, status: filters.status as ConversationStatus | undefined, AND: [search, page.after ?? {}],
                },
                orderBy: page.orderBy, take: page.limit + 1, include: { identity: { include: { customer: true } } },
            }));
            return { ...result, data: result.data.map(item => ({
                id: item.id, shopId, version: item.version, createdAt: item.createdAt, updatedAt: item.updatedAt,
                channelId: item.channelId, customerId: item.customerId,
                displayName: canReadName ? customerView(item.identity.customer).displayName : 'Hội thoại ' + item.id,
                status: item.status, mode: item.mode, assignedUserId: item.assignedUserId,
                lastMessagePreview: null, unreadCount: item.unreadCount,
                sendEligibility: { state: 'blocked', reasonCode: 'CHANNEL_NOT_READY', expiresAt: null, policyVersion: null },
            })) };
        });
    }
}

@Controller('shops/:shopId/conversations')
class ConversationsController {
    constructor(private readonly conversations: ConversationsService) {}

    @Get()
    @ContractOperation('listConversations')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.conversations.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }
}

@Module({})
class InboxModule {}

export function inboxModule(db?: PrismaClient): DynamicModule {
    return {
        module: InboxModule, controllers: [ConversationsController],
        providers: [{ provide: ConversationsService, useFactory: () => new ConversationsService(db) }],
    };
}
