import 'reflect-metadata';
import { Module, type INestApplication } from '@nestjs/common';
import { DiscoveryModule, NestFactory } from '@nestjs/core';
import { HealthController, READINESS_CHECK, type ReadinessCheck } from './health.js';
import { API_PREFIX } from './http/operations.js';
import { ProblemFilter, requestTrace } from './http/problem.js';
import { aiConnectionCommands, aiModule, botCommands, type AiEvaluationApproval, type OpenAiConnectionConfig } from './modules/ai/index.js';
import { catalogModule, categoryCommands, productCommands, promotionCommands } from './modules/catalog/index.js';
import { channelCommands, channelsModule, type MetaInboundConfig } from './modules/channels/index.js';
import { customerCommands, customersModule } from './modules/customers/index.js';
import { dashboardModule } from './modules/dashboard/index.js';
import { fileCommand, filesModule, UploadScanner, type FileScannerTarget } from './modules/files/index.js';
import { financeCommands, financeModule, periodApprovalResource, reportExportCommand, statementCommands } from './modules/finance/index.js';
import { fulfillmentModule, preparationCommands, shipmentCommands, shippingPolicyCommand } from './modules/fulfillment/index.js';
import { inboxCommands, inboxModule } from './modules/inbox/index.js';
import { inventoryModule, stockCommands, warehouseCommands } from './modules/inventory/index.js';
import { feedbackCommands, knowledgeCommands, knowledgeModule } from './modules/knowledge/index.js';
import { acknowledgeCommand, deviceCommands, notificationPolicyCommand, notificationsModule, type TelegramConfig,
    type WebPushConfig } from './modules/notifications/index.js';
import { approvalCommands, budgetCommand, claimCommand, controlCommand, operationsModule, roleCommand, updateWorkCommand } from './modules/operations/index.js';
import { orderCommands, ordersModule, returnCommands } from './modules/orders/index.js';
import { privacyCommands, privacyModule } from './modules/privacy/index.js';
import { procurementCommands, procurementModule, purchaseApprovalResource } from './modules/procurement/index.js';
import { usesLocalOidcFixture, workspaceModule, type AuthConfig } from './modules/workspace/index.js';
import { Database } from './platform/database/client.js';

export async function createApp(options: {
    database?: Database; auth?: AuthConfig; meta?: MetaInboundConfig; webPush?: WebPushConfig; telegram?: TelegramConfig;
    openAi?: OpenAiConnectionConfig; aiEvaluationApproval?: AiEvaluationApproval; readiness?: ReadinessCheck; quiet?: boolean;
    fileScanner?: FileScannerTarget;
} = {}): Promise<INestApplication> {
    const { database, meta } = options;
    const scanner = options.fileScanner && new UploadScanner(options.fileScanner);
    const scannerRequired = Boolean(options.auth && !usesLocalOidcFixture(options.auth));
    const ready = async () => Boolean(await database?.ready()) && (scanner ? await scanner.ready() : !scannerRequired);
    const aiProvider = { openAi: options.openAi, approval: options.aiEvaluationApproval, meta };
    @Module({
        imports: [
            DiscoveryModule, workspaceModule(database?.client, options.auth,
                [...productCommands, ...categoryCommands, ...promotionCommands, ...customerCommands, fileCommand, ...warehouseCommands, shippingPolicyCommand,
                    ...orderCommands, ...financeCommands, ...preparationCommands, ...shipmentCommands, ...returnCommands,
                    ...deviceCommands, ...stockCommands, ...procurementCommands, ...approvalCommands, ...statementCommands, reportExportCommand,
                    ...channelCommands, ...inboxCommands, ...knowledgeCommands, ...feedbackCommands, ...aiConnectionCommands, ...botCommands,
                    notificationPolicyCommand, acknowledgeCommand, claimCommand, updateWorkCommand, controlCommand, roleCommand, budgetCommand, ...privacyCommands]),
            aiModule(database?.client, options.auth, aiProvider),
            catalogModule(database?.client, options.auth), customersModule(database?.client, options.auth),
            channelsModule(database?.client, options.auth, meta),
            dashboardModule(database?.client, options.auth, aiProvider), filesModule(database?.client, options.auth, scanner),
            inventoryModule(database?.client, options.auth),
            fulfillmentModule(database?.client, options.auth), ordersModule(database?.client, options.auth, meta), inboxModule(database?.client, options.auth, meta, aiProvider),
            financeModule(database?.client, options.auth), knowledgeModule(database?.client, options.auth),
            operationsModule(database?.client, options.auth, [purchaseApprovalResource, periodApprovalResource], aiProvider),
            notificationsModule(database?.client, options.auth, options.webPush, options.telegram),
            procurementModule(database?.client, options.auth), privacyModule(database?.client, options.auth),
        ],
        controllers: [HealthController],
        providers: [
            ...(database ? [{ provide: Database, useValue: database }] : []),
            { provide: READINESS_CHECK, useValue: options.readiness ?? ready },
        ],
    })
    class AppModule {}

    const app = await NestFactory.create(AppModule, { abortOnError: false, logger: options.quiet ? false : undefined, rawBody: Boolean(meta) });
    app.setGlobalPrefix(API_PREFIX.slice(1));
    app.use(requestTrace);
    app.useGlobalFilters(new ProblemFilter());
    return app;
}
