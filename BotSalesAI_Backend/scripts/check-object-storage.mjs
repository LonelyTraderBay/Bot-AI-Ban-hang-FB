import { createHash, randomUUID } from 'node:crypto';
import { readDatabaseUrl } from '../apps/api/dist/config.js';
import { configuredFileStore, configuredFixtureFileStore } from '../apps/api/dist/modules/files/index.js';
import { createDatabaseClient } from '../apps/api/dist/platform/database/client.js';

async function check() {
    const store = configuredFileStore();
    if (!store) throw new Error();
    await store.checkBucket();
    const db = createDatabaseClient(readDatabaseUrl(process.env));
    const fingerprint = createHash('sha256');
    let cursor;
    let checked = 0;
    let mismatches = 0;
    try {
        for (;;) {
            const rows = await db.fileStorage.findMany({
                where: { state: 'stored' }, include: { file: true }, orderBy: [{ shopId: 'asc' }, { fileId: 'asc' }],
                cursor, ...(cursor ? { skip: 1 } : {}), take: 40,
            });
            if (!rows.length) break;
            for (const row of rows) {
                checked++;
                try {
                    if (row.targetId !== store.id) throw new Error();
                    await store.read(row.file);
                    fingerprint.update(JSON.stringify([row.shopId, row.fileId, row.file.sizeBytes, row.file.sha256]) + '\n');
                } catch {
                    mismatches++;
                }
            }
            const { shopId, fileId } = rows.at(-1);
            cursor = { shopId_fileId: { shopId, fileId } };
        }
        console.log(JSON.stringify({ status: mismatches ? 'ATTENTION' : 'CHECKED', checked, mismatches, digest: fingerprint.digest('hex') }));
        if (mismatches) process.exitCode = 2;
    } finally {
        await db.$disconnect();
    }
}

async function probeWrite(id, resolve = false) {
    const store = configuredFixtureFileStore(process.env);
    await store.checkBucket();
    const bytes = Buffer.from('BotSales AI restore fixture ' + id);
    const file = { shopId: '00000000-0000-0000-0000-000000000000', id,
        sha256: createHash('sha256').update(bytes).digest('hex'), sizeBytes: bytes.length };
    let writeVerified = false;
    let absentWhenChecked = false;
    try {
        if (resolve) await store.read(file);
        else {
            console.error(JSON.stringify({ status: 'PROBE_STARTED', probeId: id }));
            await store.write(file, bytes);
        }
        writeVerified = true;
        await store.remove(file);
        absentWhenChecked = true;
    } catch {
        // A write without a confirmed response can still have created the object.
    }
    const passed = writeVerified && absentWhenChecked;
    const status = !passed ? 'ATTENTION' : resolve ? 'RESOLVED' : 'WRITABLE';
    console.log(JSON.stringify({ status, probeId: id, writeVerified, absentWhenChecked }));
    if (!passed) process.exitCode = 2;
}

try {
    const [option, id, ...extra] = process.argv.slice(2);
    if (process.argv.length === 2) await check();
    else if (option === '--probe-write' && id === undefined) await probeWrite(randomUUID());
    else if (option === '--resolve-write' && !extra.length && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id ?? '')) {
        await probeWrite(id, true);
    } else throw new Error();
} catch {
    const reason = process.argv.length === 2 ? 'Verify the configured private object store and PostgreSQL connection.'
        : 'Verify the fixture object store configuration and command arguments.';
    console.log(JSON.stringify({ status: 'UNAVAILABLE', reason }));
    process.exitCode = 1;
}
