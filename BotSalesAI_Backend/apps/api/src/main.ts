import type { INestApplication } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from './app.js';
import { readDatabaseUrl, readHttpConfig, readReleaseManifestHash } from './config.js';
import { API_PREFIX } from './http/operations.js';
import { noStore } from './http/response.js';
import { readAiEvaluationApproval, readOpenAiConnectionConfig } from './modules/ai/index.js';
import { readMetaInboundConfig } from './modules/channels/index.js';
import { configuredFileStore, readFileScannerTarget } from './modules/files/index.js';
import { readTelegramConfig, readWebPushConfig } from './modules/notifications/index.js';
import { readAuthConfig } from './modules/workspace/index.js';
import { Database } from './platform/database/client.js';

async function start(): Promise<void> {
    const { bind, port } = readHttpConfig(process.env);
    const auth = readAuthConfig(process.env);
    const meta = readMetaInboundConfig(process.env);
    const openAi = readOpenAiConnectionConfig(process.env);
    const aiEvaluationApproval = readAiEvaluationApproval(process.env);
    const webPush = readWebPushConfig(process.env);
    const telegram = readTelegramConfig(process.env);
    const fileScanner = readFileScannerTarget(process.env);
    configuredFileStore();
    const manifest = readReleaseManifestHash();
    const database = new Database(readDatabaseUrl(process.env));
    let app: INestApplication | undefined;
    try {
        app = await createApp({ database, auth, meta, openAi, aiEvaluationApproval, webPush, telegram, fileScanner });
        if (manifest) app.use(API_PREFIX + '/health', (_request: IncomingMessage, response: ServerResponse, next: () => void) => {
            noStore(response);
            response.setHeader('X-BotSales-Release-Manifest', manifest);
            next();
        });
        app.enableShutdownHooks();
        await app.listen(port, bind);
    } catch (error) {
        if (app) await app.close();
        else await database.onApplicationShutdown();
        throw error;
    }
}

start().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Backend startup failed');
    process.exitCode = 1;
});
