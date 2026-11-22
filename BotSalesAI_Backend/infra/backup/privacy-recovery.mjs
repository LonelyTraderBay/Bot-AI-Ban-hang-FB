import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { configuredFixtureFileStore, purgeRecoveredFiles } from '../../apps/api/dist/modules/files/index.js';
import { applyPrivacyRecovery, capturePrivacyRecovery } from '../../apps/api/dist/modules/privacy/index.js';
import { Database } from '../../apps/api/dist/platform/database/client.js';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fixtureTarget = /^\/botsales_be_recovery_[a-z0-9_]+$/;

async function main() {
    const [mode, shopId, file, expectedDigest, option, ...extra] = process.argv.slice(2);
    const apply = mode === 'apply';
    const purge = option === '--purge-files';
    if ((!apply && mode !== 'capture') || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(shopId ?? '') || !file || extra.length ||
        (apply ? (!/^[a-f0-9]{64}$/.test(expectedDigest ?? '') || (option !== undefined && !purge)) : expectedDigest !== undefined)) {
        throw new Error('Usage: capture <shop-id> <new-file> or apply <shop-id> <manifest-file> <trusted-sha256> [--purge-files]');
    }
    const url = URL.parse(process.env.PRIVACY_RECOVERY_DATABASE_URL ?? '');
    if (!url || !['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== '127.0.0.1' || !url.port || url.port === '55432' ||
        url.hash || [...url.searchParams].some(([key, value]) => !(key === 'schema' && value === 'public') && !(key === 'sslmode' && value === 'disable')) ||
        url.username !== 'botsales_runtime' || (!fixtureTarget.test(url.pathname) && (apply || url.pathname !== '/botsales_be_dev'))) {
        throw new Error('Use a dedicated loopback fixture database. Apply requires a botsales_be_recovery_* restore copy.');
    }
    const bytes = apply ? readFileSync(file) : undefined;
    if (apply && sha256(bytes) !== expectedDigest) throw new Error('Privacy recovery manifest digest mismatch');
    const store = purge ? configuredFixtureFileStore(process.env) : undefined;
    const database = new Database(url.href);
    try {
        if (apply) {
            if (!await database.ready()) throw new Error('The isolated copy must be writable before applying recovery evidence');
            const result = await applyPrivacyRecovery(database.client, shopId, JSON.parse(bytes.toString('utf8')), expectedDigest);
            let files;
            if (store) {
                try {
                    files = await purgeRecoveredFiles(database.client, store, shopId);
                } catch {
                    throw new Error('Privacy evidence applied. File purge failed; leave the copy isolated and retry the same manifest.');
                }
                if (files.pending) process.exitCode = 2;
            }
            console.log(JSON.stringify({ mode, digest: expectedDigest, ...result, files }));
        } else {
            const bundle = await capturePrivacyRecovery(database.client, shopId);
            const data = Buffer.from(JSON.stringify(bundle) + '\n');
            writeFileSync(file, data, { flag: 'wx', mode: 0o600 });
            console.log(JSON.stringify({ mode, digest: sha256(data), withdrawals: bundle.withdrawals.length, erasures: bundle.erasures.length }));
        }
    } finally {
        await database.onApplicationShutdown();
    }
}

try {
    await main();
} catch (error) {
    const safe = error.name === 'Error' && !error.code ? error.message : 'Privacy recovery operation failed';
    console.error(safe);
    process.exitCode = 1;
}
