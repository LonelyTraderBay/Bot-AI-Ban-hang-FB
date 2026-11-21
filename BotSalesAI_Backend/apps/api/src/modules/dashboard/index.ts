import { Controller, Get, Module, Param, Req, Res, type DynamicModule } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe } from '../../http/query.js';
import { envelope, noStore } from '../../http/response.js';
import { readAsSession, requireShopAccess } from '../workspace/index.js';

function dashboardProjection(shopId: string, asOf: string) {
    return {
        shopId, asOf, openConversations: 0, pendingOrders: 0, lowStockVariants: 0,
        botStatus: 'unconfigured', recognizedRevenue: null, cashReceived: null,
        warnings: ['Số hội thoại, đơn hàng và tồn kho chưa có nguồn tổng hợp. Tài chính và trợ lý chưa được cấu hình.'],
    };
}

class DashboardService {
    constructor(private readonly db?: PrismaClient) {}

    get(headers: IncomingHttpHeaders, shopId: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'dashboard.read');
            return dashboardProjection(scope.shopId, new Date().toISOString());
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

export function dashboardModule(db?: PrismaClient): DynamicModule {
    return {
        module: DashboardModule, controllers: [DashboardController],
        providers: [{ provide: DashboardService, useFactory: () => new DashboardService(db) }],
    };
}
