import { Controller, Get, Module, Param, Req, Res, type DynamicModule } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe } from '../../http/query.js';
import { envelope, noStore } from '../../http/response.js';
import { liveBotSnapshot, type ApprovedEvaluationConfig } from '../ai/index.js';
import { dashboardMoney } from '../finance/index.js';
import { salesAutomationState } from '../operations/index.js';
import { readAsSession, requireShopAccess, type AuthConfig, type ShopScope } from '../workspace/index.js';

async function dashboardProjection(tx: Prisma.TransactionClient, scope: ShopScope, config?: AuthConfig, provider?: ApprovedEvaluationConfig) {
    const { shopId, permissions } = scope;
    const asOf = new Date().toISOString();
    const warnings: string[] = [];
    const openConversations = await tx.channelConversation.count({ where: { shopId, status: 'open' } });
    const pendingOrders = await tx.salesOrder.count({ where: { shopId, orderState: { in: ['draft', 'confirmed'] } } });
    const [{ lowStockVariants }] = await tx.$queryRaw<{ lowStockVariants: number }[]>`
        SELECT count(DISTINCT v.id)::int AS "lowStockVariants" FROM stock_positions sp
        JOIN warehouses w ON w.shop_id=sp.shop_id AND w.id=sp.warehouse_id AND w.status='active'
        JOIN variants v ON v.shop_id=sp.shop_id AND v.id=sp.variant_id AND v.active AND v.archived_at IS NULL
        JOIN products p ON p.shop_id=v.shop_id AND p.id=v.product_id AND p.status='active'
        WHERE sp.shop_id=${shopId}::uuid AND sp.low_stock_threshold>0 AND sp.on_hand-sp.reserved <= sp.low_stock_threshold
    `;
    const profile = await tx.botConfig.findUnique({ where: { shopId }, select: { status: true, generation: true } });
    const automation = await salesAutomationState(tx, shopId);
    const status = automation.paused ? 'paused' : profile?.status ?? 'draft';
    const botStatus = status === 'active' && !await liveBotSnapshot(tx, shopId, profile?.generation ?? 0, config, provider) ? 'degraded'
        : status === 'draft' ? 'unconfigured' : status;
    let money: Awaited<ReturnType<typeof dashboardMoney>> = { recognizedRevenue: null, cashReceived: null };
    if (permissions.includes('finance.read')) {
        const { currency } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { currency: true } });
        money = await dashboardMoney(tx, shopId, currency);
        if (!money.recognizedRevenue || !money.cashReceived) warnings.push('Sổ chưa có đủ chứng từ cho các chỉ số tài chính.');
    }
    return {
        shopId, asOf, openConversations, pendingOrders, lowStockVariants, botStatus, ...money, warnings,
    };
}

class DashboardService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig, private readonly provider?: ApprovedEvaluationConfig) {}

    get(headers: IncomingHttpHeaders, shopId: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'dashboard.read');
            return dashboardProjection(tx, scope, this.config, this.provider);
        });
    }
}

@Controller('shops/:shopId/dashboard')
class DashboardController {
    constructor(private readonly dashboard: DashboardService) {}

    @Get()
    @ContractOperation('getDashboard')
    async get(@Param('shopId', idPipe) shopId: string, @Req() request: IncomingMessage,
        @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.dashboard.get(request.headers, shopId));
    }
}

@Module({})
class DashboardModule {}

export function dashboardModule(db?: PrismaClient, config?: AuthConfig, provider?: ApprovedEvaluationConfig): DynamicModule {
    return {
        module: DashboardModule, controllers: [DashboardController],
        providers: [{ provide: DashboardService, useFactory: () => new DashboardService(db, config, provider) }],
    };
}
