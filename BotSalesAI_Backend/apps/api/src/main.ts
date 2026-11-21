import type { INestApplication } from '@nestjs/common';
import { createApp } from './app.js';
import { readDatabaseUrl, readHttpConfig } from './config.js';
import { readAuthConfig } from './modules/workspace/index.js';
import { Database } from './platform/database/client.js';

async function start(): Promise<void> {
    const { bind, port } = readHttpConfig(process.env);
    const auth = readAuthConfig(process.env);
    const database = new Database(readDatabaseUrl(process.env));
    let app: INestApplication | undefined;
    try {
        app = await createApp({ database, auth });
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
