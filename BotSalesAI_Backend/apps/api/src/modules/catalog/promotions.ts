import { Controller, Get, Param, Query, Req, Res, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { PromotionStatus } from '../../generated/prisma/enums.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery, paging } from '../../http/query.js';
import { envelope, noStore } from '../../http/response.js';
import { readAsSession, requireShopAccess } from '../workspace/index.js';

function dateInShop(timeZone: string, instant = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
    const part = (name: string) => parts.find(entry => entry.type === name)?.value;
    return new Date(part('year') + '-' + part('month') + '-' + part('day') + 'T00:00:00.000Z');
}

export class PromotionsService {
    constructor(private readonly db?: PrismaClient) {}

    list(headers: IncomingMessage['headers'], shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'catalog.read');
            const query = listQuery(raw, 'promotions');
            if (query.status && !Object.hasOwn(PromotionStatus, query.status)) throw new UnprocessableEntityException();
            const page = paging(query, ['promotions', shopId, userId, String(scope.permissionVersion), query.effective ?? '']);
            const { timezone } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { timezone: true } });
            const today = dateInShop(timezone);
            const effective = query.effective === 'yes' ? { status: 'active' as const, startsOn: { lte: today }, endsOn: { gte: today } } : {};
            const result = page.result(await tx.promotion.findMany({
                where: {
                    shopId, status: query.status as PromotionStatus | undefined, name: { contains: page.keyword, mode: 'insensitive' },
                    AND: [effective, page.after ?? {}],
                },
                orderBy: page.orderBy, take: page.limit + 1,
                include: { lines: { orderBy: { position: 'asc' }, select: { variantId: true, quantity: true, sku: true, label: true } } },
            }));
            return { ...result, data: result.data.map(({ startsOn, endsOn, discountAmount, ...promotion }) => ({
                ...promotion, startsOn: startsOn.toISOString().slice(0, 10), endsOn: endsOn.toISOString().slice(0, 10), discountAmount: discountAmount.toFixed(),
            })) };
        });
    }
}

@Controller('shops/:shopId/promotions')
export class PromotionsController {
    constructor(private readonly promotions: PromotionsService) {}

    @Get()
    @ContractOperation('listPromotions')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.promotions.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }
}
