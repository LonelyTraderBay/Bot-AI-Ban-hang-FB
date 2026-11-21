import { createApp } from './app.js';
import { readHttpConfig } from './config.js';

async function start(): Promise<void> {
    const { bind, port } = readHttpConfig(process.env);
    const app = await createApp();
    try {
        app.enableShutdownHooks();
        await app.listen(port, bind);
    } catch (error) {
        await app.close();
        throw error;
    }
}

start().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Backend startup failed');
    process.exitCode = 1;
});
