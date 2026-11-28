import assert from 'node:assert/strict';
import { test } from 'node:test';
import pg from 'pg';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';

test('the shop closure migration preserves both fixture shops as active', async () => {
    const target = new URL(process.env.DATABASE_URL);
    assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname), 'Use a local fixture database');
    assert.equal(target.pathname, '/botsales_be_dev');
    assert.equal(target.username, 'botsales_runtime');
    const client = new pg.Client({ connectionString: target.href });
    await client.connect();
    try {
        const { rows } = await client.query(`
            SELECT id, name, default_warehouse_id AS "defaultWarehouseId", version,
                to_jsonb(shops) ? 'closed_at' AS "hasClosedAt", to_jsonb(shops)->'closed_at' AS "closedAt"
            FROM shops WHERE id = ANY($1::uuid[]) ORDER BY id
        `, [fixtureShops.map(({ id }) => id)]);
        assert.deepEqual(rows, fixtureShops.map(({ id, name, defaultWarehouseId }) => ({
            id, name, defaultWarehouseId, version: 1, hasClosedAt: true, closedAt: null,
        })));
    } finally {
        await client.end();
    }
});
