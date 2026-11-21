import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { promisify } from 'node:util';
import pg from 'pg';
import { fixtureCategory, fixtureIssuer, fixtureShops, fixtureUsers } from '../../../apps/api/prisma/p0-fixture.mjs';
import { createApp } from '../../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createDatabaseClient, Database } from '../../../apps/api/dist/platform/database/client.js';

const runFile = promisify(execFile);
const openapi = JSON.parse(readFileSync(new URL('../../../../botsales-kit/contracts/openapi.json', import.meta.url)));
const [shopA, shopB] = fixtureShops;
let db;
let connectionString;

before(async () => {
    connectionString = readDatabaseUrl(process.env);
    const target = new URL(connectionString);
    assert.equal(target.pathname, '/botsales_be_dev', 'Use an isolated fixture database');
    assert.equal(target.username, 'botsales_runtime');
    db = createDatabaseClient(connectionString);
    await db.$connect();
});

after(async () => { await db?.$disconnect(); });

function snapshot() {
    return db.$transaction([
        db.shop.findMany({ orderBy: { id: 'asc' }, include: { defaultWarehouse: true } }),
        db.user.findMany({ orderBy: { oidcSubject: 'asc' } }),
        db.membership.findMany({ orderBy: [{ shopId: 'asc' }, { userId: 'asc' }] }),
        db.category.findMany({ orderBy: [{ shopId: 'asc' }, { id: 'asc' }] }),
    ]);
}

test('P0 seed replay preserves the two shops, warehouse IDs, memberships and roles', async () => {
    const beforeSeed = await snapshot();
    const [shops, users, memberships, categories] = beforeSeed;
    assert.deepEqual(shops.map(({ id }) => id), fixtureShops.map(({ id }) => id));
    for (const [index, shop] of shops.entries()) {
        const expected = fixtureShops[index];
        assert.deepEqual(
            [shop.currency, shop.timezone, shop.locale, shop.version, shop.policyVersion],
            [expected.currency, expected.timezone, expected.locale, 1, '1'],
        );
        assert.equal(shop.defaultWarehouse.shopId, shop.id);
        assert.equal(shop.defaultWarehouse.id, expected.defaultWarehouseId);
        assert.equal(shop.defaultWarehouse.code, 'P0-DEFAULT');
    }
    assert.equal(await db.warehouse.count(), 2);
    assert.equal(users.length, 3);
    assert.equal(memberships.length, 3);
    assert.equal(categories.length, 1);
    assert.deepEqual([categories[0].shopId, categories[0].id, categories[0].name, categories[0].active],
        [fixtureCategory.shopId, fixtureCategory.id, fixtureCategory.name, true]);
    for (const { subject, shopId, role } of fixtureUsers) {
        const user = users.find(row => row.oidcIssuer === fixtureIssuer && row.oidcSubject === subject);
        assert.ok(user, subject);
        const assigned = memberships.filter(row => row.userId === user.id);
        assert.equal(assigned.length, 1);
        assert.equal(assigned[0].shopId, shopId);
        assert.equal(assigned[0].status, 'active');
        assert.deepEqual(assigned[0].roles, [role]);
    }

    const replay = () => runFile(process.execPath, ['apps/api/prisma/seed.mjs'], { timeout: 15000 });
    await Promise.all([replay(), replay()]);
    assert.deepEqual(await snapshot(), beforeSeed);
    assert.equal(await db.warehouse.count(), 2);
    assert.equal(await db.session.count(), 0);
});

test('tenant-scoped reads and keys permit a shared warehouse code and reject cross-shop references', async () => {
    await db.$transaction(async tx => {
        assert.equal((await tx.warehouse.findUniqueOrThrow({
            where: { shopId_id: { shopId: shopA.id, id: shopA.defaultWarehouseId } },
        })).shopId, shopA.id);
        assert.equal(await tx.warehouse.findUnique({
            where: { shopId_id: { shopId: shopB.id, id: shopA.defaultWarehouseId } },
        }), null);
        assert.deepEqual((await tx.warehouse.findMany({ where: { shopId: shopB.id } })).map(row => row.id),
            [shopB.defaultWarehouseId]);
    });

    await assert.rejects(db.shop.update({
        where: { id: shopA.id },
        data: { defaultWarehouseId: shopB.defaultWarehouseId },
    }), { code: 'P2003' });
    await assert.rejects(db.warehouse.create({ data: {
        shopId: shopA.id, code: 'P0-DEFAULT', name: 'Duplicate', addressLine: 'Synthetic',
    } }), { code: 'P2002' });
    const ownerA = await db.user.findUniqueOrThrow({
        where: { oidcIssuer_oidcSubject: { oidcIssuer: fixtureIssuer, oidcSubject: 'p0-editor' } },
    });
    const commandData = {
        actorId: ownerA.id, operationId: 'test.p0', idempotencyKey: randomUUID(),
        requestHash: 'a'.repeat(64), status: 'test',
    };
    await assert.rejects(db.command.create({ data: { ...commandData, shopId: shopB.id } }), { code: 'P2003' });
    await assert.rejects(db.$transaction(async tx => {
        const command = await tx.command.create({ data: { ...commandData, shopId: shopA.id } });
        await tx.outboxEvent.create({
            data: { shopId: shopB.id, commandId: command.id, eventType: 'p0.synthetic', payload: {} },
        });
    }), { code: 'P2003' });
    await assert.rejects(db.$transaction(async tx => {
        const data = { ...commandData, shopId: shopA.id };
        await tx.command.create({ data });
        await tx.command.create({ data });
    }), { code: 'P2002' });
    assert.equal(await db.command.count({ where: { idempotencyKey: commandData.idempotencyKey } }), 0);
});

test('sessions persist a unique hash and UTC expiry and reject raw tokens', async () => {
    const rollback = new Error('P0 session rollback');
    const user = await db.user.findFirstOrThrow({ where: { oidcIssuer: fixtureIssuer } });
    const expiresAt = new Date('2035-01-01T07:00:00.123+07:00');
    const data = { userId: user.id, tokenHash: '1'.repeat(64), expiresAt };
    await assert.rejects(db.$transaction(async tx => {
        const session = await tx.session.create({ data });
        assert.equal(session.expiresAt.toISOString(), '2035-01-01T00:00:00.123Z');
        throw rollback;
    }), error => error === rollback);
    await assert.rejects(db.$transaction(async tx => {
        await tx.session.create({ data });
        await tx.session.create({ data });
    }), { code: 'P2002' });

    await assert.rejects(db.session.create({
        data: { userId: user.id, tokenHash: 'synthetic-unhashed-value', expiresAt },
    }), /sessions_token_hash_format/);
    assert.equal(await db.session.count(), 0);
});

test('command, audit and outbox roll back together when the transaction fails', async () => {
    const rollback = new Error('P0 rollback');
    const id = randomUUID();
    const owner = await db.user.findUniqueOrThrow({
        where: { oidcIssuer_oidcSubject: { oidcIssuer: fixtureIssuer, oidcSubject: 'p0-editor' } },
    });
    await assert.rejects(db.$transaction(async tx => {
        await tx.command.create({ data: {
            shopId: shopA.id, id, actorId: owner.id, operationId: 'test.p0',
            idempotencyKey: id, requestHash: 'b'.repeat(64), status: 'test',
        } });
        await tx.auditEntry.create({ data: {
            shopId: shopA.id, id, actorId: owner.id, action: 'test', resourceType: 'command',
            resourceId: id, requestId: id,
        } });
        await tx.outboxEvent.create({ data: {
            shopId: shopA.id, id, commandId: id, eventType: 'p0.synthetic', payload: {},
        } });
        assert.equal(await tx.outboxEvent.count({ where: { shopId: shopA.id, id } }), 1);
        throw rollback;
    }), error => error === rollback);
    const where = { shopId: shopA.id, id };
    assert.deepEqual(await db.$transaction([
        db.command.count({ where }), db.auditEntry.count({ where }), db.outboxEvent.count({ where }),
    ]), [0, 0, 0]);
});

test('runtime role can read application data and PostgreSQL denies DDL and audit edits', async () => {
    const runtime = new pg.Client({ connectionString });
    await runtime.connect();
    try {
        const metadata = await runtime.query(`
            SELECT current_user AS role, current_setting('TimeZone') AS zone,
                (0.1::numeric + 0.2::numeric)::text AS amount,
                enum_range(NULL::membership_role)::text[] AS roles,
                has_table_privilege(current_user, 'public._prisma_migrations', 'SELECT') AS can_read_migrations
        `);
        assert.deepEqual(metadata.rows, [{
            role: 'botsales_runtime', zone: 'UTC', amount: '0.3',
            roles: openapi.components.schemas.Role.enum, can_read_migrations: false,
        }]);
        await runtime.query('BEGIN');
        try {
            await assert.rejects(runtime.query('CREATE TABLE public.p0_ddl_probe (id integer)'), { code: '42501' });
        } finally {
            await runtime.query('ROLLBACK');
        }
        await assert.rejects(runtime.query('UPDATE audit_entries SET action = action WHERE false'), { code: '42501' });
    } finally {
        await runtime.end();
    }
});

test('HTTP readiness queries PostgreSQL through the application database provider', async () => {
    const app = await createApp({ database: new Database(connectionString), quiet: true });
    try {
        await app.listen(0, '127.0.0.1');
        const response = await fetch(await app.getUrl() + '/api/v2/health/ready');
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { status: 'ready' });
    } finally {
        await app.close();
    }
    const restarted = createDatabaseClient(connectionString);
    try {
        assert.equal(await restarted.shop.count(), 2);
    } finally {
        await restarted.$disconnect();
    }
});
