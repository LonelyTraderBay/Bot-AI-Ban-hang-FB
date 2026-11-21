import 'reflect-metadata';
import { Module, type INestApplication } from '@nestjs/common';
import { DiscoveryModule, NestFactory } from '@nestjs/core';
import { HealthController, READINESS_CHECK, type ReadinessCheck } from './health.js';
import { API_PREFIX } from './http/operations.js';
import { ProblemFilter, requestTrace } from './http/problem.js';
import { catalogModule, categoryCommands, productCommands } from './modules/catalog/index.js';
import { customerCommands, customersModule } from './modules/customers/index.js';
import { dashboardModule } from './modules/dashboard/index.js';
import { fileCommand, filesModule } from './modules/files/index.js';
import { financeCommands, financeModule } from './modules/finance/index.js';
import { fulfillmentModule, shippingPolicyCommand } from './modules/fulfillment/index.js';
import { inboxModule } from './modules/inbox/index.js';
import { inventoryModule, warehouseCommands } from './modules/inventory/index.js';
import { orderCommands, ordersModule } from './modules/orders/index.js';
import { workspaceModule, type AuthConfig } from './modules/workspace/index.js';
import { Database } from './platform/database/client.js';

export async function createApp(options: { database?: Database; auth?: AuthConfig; readiness?: ReadinessCheck; quiet?: boolean } = {}): Promise<INestApplication> {
    const { database } = options;
    @Module({
        imports: [
            DiscoveryModule, workspaceModule(database?.client, options.auth,
                [...productCommands, ...categoryCommands, ...customerCommands, fileCommand, ...warehouseCommands, shippingPolicyCommand,
                    ...orderCommands, ...financeCommands]),
            catalogModule(database?.client, options.auth), customersModule(database?.client, options.auth),
            dashboardModule(database?.client), filesModule(database?.client, options.auth), inventoryModule(database?.client, options.auth),
            fulfillmentModule(database?.client, options.auth), ordersModule(database?.client, options.auth), inboxModule(database?.client),
            financeModule(database?.client, options.auth),
        ],
        controllers: [HealthController],
        providers: [
            ...(database ? [{ provide: Database, useValue: database }] : []),
            { provide: READINESS_CHECK, useValue: options.readiness ?? (() => database?.ready() ?? false) },
        ],
    })
    class AppModule {}

    const app = await NestFactory.create(AppModule, { abortOnError: false, logger: options.quiet ? false : undefined });
    app.setGlobalPrefix(API_PREFIX.slice(1));
    app.use(requestTrace);
    app.useGlobalFilters(new ProblemFilter());
    return app;
}
