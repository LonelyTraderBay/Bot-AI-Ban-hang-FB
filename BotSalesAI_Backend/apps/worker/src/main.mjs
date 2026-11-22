import { runWorker } from './runner.mjs';
import { aiJobHandlers, readAiEvaluationApproval, readOpenAiConnectionConfig } from '../../api/dist/modules/ai/index.js';
import { catalogJobHandlers } from '../../api/dist/modules/catalog/index.js';
import { financeJobHandlers, reportExportHandler } from '../../api/dist/modules/finance/index.js';
import { configuredFileStore, transferFileObjects } from '../../api/dist/modules/files/index.js';
import { channelTestHandler, readMetaInboundConfig } from '../../api/dist/modules/channels/index.js';
import { dispatchMessengerMessages, processBotInbound } from '../../api/dist/modules/inbox/index.js';
import { knowledgeIndexHandler } from '../../api/dist/modules/knowledge/index.js';
import { deviceTestHandler, dispatchExternalNotifications, dispatchPreparationNotifications, readTelegramConfig,
    readWebPushConfig } from '../../api/dist/modules/notifications/index.js';
import { publishOwnerDigests } from '../../api/dist/modules/operations/index.js';
import { expireOrdersWithReservations } from '../../api/dist/modules/orders/index.js';
import { privacyRequestHandler, runPrivacyMaintenance } from '../../api/dist/modules/privacy/index.js';
import { dispatchPurchases, evaluateAutomaticReorder } from '../../api/dist/modules/procurement/index.js';
import { readAuthConfig } from '../../api/dist/modules/workspace/index.js';

async function main() {
    const auth = readAuthConfig(process.env);
    const meta = readMetaInboundConfig(process.env);
    const openAi = readOpenAiConnectionConfig(process.env);
    const approval = readAiEvaluationApproval(process.env);
    const aiProvider = { openAi, approval, meta };
    const webPush = readWebPushConfig(process.env);
    const telegram = readTelegramConfig(process.env);
    const notifications = { webPush, telegram, appOrigin: auth?.appOrigin };
    const fileStore = configuredFileStore();
    await runWorker(db => new Map([...catalogJobHandlers(db), ...financeJobHandlers(), ...aiJobHandlers(auth, { db, ...aiProvider }),
        ['testDevice', deviceTestHandler(auth, webPush || telegram ? { db, ...notifications } : undefined)],
        ['checkChannelHealth', channelTestHandler(auth)], ['submitKnowledgeReview', knowledgeIndexHandler(db)],
        ['createExport', reportExportHandler], ['approvePrivacyRequest', privacyRequestHandler(auth)]]), undefined, async db => {
        await expireOrdersWithReservations(db);
        await dispatchPreparationNotifications(db, auth, new Date(), notifications);
        await publishOwnerDigests(db);
        await evaluateAutomaticReorder(db, auth);
        await runPrivacyMaintenance(db, auth);
    }, [
        db => dispatchPurchases(db, auth),
        db => processBotInbound(db, auth, aiProvider),
        db => dispatchMessengerMessages(db, auth, meta),
        db => dispatchExternalNotifications(db, notifications),
        ...(fileStore ? [db => transferFileObjects(db, fileStore)] : []),
    ]);
}

main().catch(() => {
    console.error('Worker could not start. Check DATABASE_URL and REDIS_URL.');
    process.exitCode = 1;
});
