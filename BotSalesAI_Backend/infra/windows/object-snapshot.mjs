import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readDatabaseUrl } from '../../apps/api/dist/config.js';
import { configuredFixtureFileStore, transferFileObjects } from '../../apps/api/dist/modules/files/index.js';
import { createDatabaseClient } from '../../apps/api/dist/platform/database/client.js';
import { assertFixtureDatabase } from '../../tests/integration/workspace/session-fixture.mjs';

const [phase, directory, ...extra] = process.argv.slice(2);
assert.ok(phase === 'transfer' ? !directory : ['backup', 'restore'].includes(phase) && directory && !extra.length);
const databaseUrl = readDatabaseUrl(process.env);
assertFixtureDatabase(databaseUrl);
const store = configuredFixtureFileStore(process.env);
await store.checkBucket();
const db = createDatabaseClient(databaseUrl);
try {
    if (phase === 'transfer') {
        let total = 0;
        for (let batch = 0; batch < 100; batch++) {
            const count = await transferFileObjects(db, store);
            if (!count) break;
            total += count;
            assert.ok(batch < 99, 'Fixture has more than 100 transfer batches');
        }
        console.log(JSON.stringify({ status: 'FIXTURE_TRANSFERS_COMPLETE', processed: total }));
    } else {
        const rows = await db.fileStorage.findMany({
            where: { state: 'stored' }, include: { file: true }, orderBy: [{ shopId: 'asc' }, { fileId: 'asc' }],
        });
        const shops = new Set(rows.map(row => row.shopId)).size;
        assert.ok(shops >= 2, 'Prepare stored files for both fixture shops');
        assert.ok(rows.every(row => row.targetId === store.id), 'Use the same logical fixture bucket');
        if (phase === 'backup') await mkdir(directory);
        for (const { file } of rows) {
            const path = join(directory, file.shopId + '-' + file.id + '.bin');
            if (phase === 'backup') await writeFile(path, await store.read(file), { flag: 'wx' });
            else await store.write(file, await readFile(path));
        }
        console.log(JSON.stringify({ status: 'OBJECT_SNAPSHOT_VERIFIED', phase, objects: rows.length, shops }));
    }
} finally {
    await db.$disconnect();
}
