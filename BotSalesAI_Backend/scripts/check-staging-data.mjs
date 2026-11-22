import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import Redis from 'ioredis';
import { Database } from '../apps/api/dist/platform/database/client.js';
import { postgresTargets, redisTarget } from './staging-data-config.mjs';

const migrationsDirectory = new URL('../apps/api/prisma/migrations/', import.meta.url);
const sha = value => createHash('sha256').update(value).digest('hex');
const failure = failedCheck => ({ status: 'BLOCKED', failedCheck });

function expectedMigrations() {
    return new Map(readdirSync(migrationsDirectory, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(({ name }) => {
        const sql = readFileSync(new URL(name + '/migration.sql', migrationsDirectory), 'utf8');
        const lf = sql.replaceAll('\r\n', '\n');
        return [name, new Set([sha(sql), sha(lf), sha(lf.replaceAll('\n', '\r\n'))])];
    }));
}

async function role(db) {
    const [connection] = await db.client.$queryRaw`
        SELECT current_user::text AS username, current_user = session_user AS authenticated_role,
               current_database() AS database_name, inet_server_addr()::text AS server_address,
               inet_server_port() AS server_port, pg_postmaster_start_time()::text AS server_started_at,
               current_setting('server_version_num')::integer AS version,
               EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid = pg_backend_pid() AND ssl) AS tls,
               (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls) AS elevated,
               has_database_privilege(current_database(), 'CREATE') AS can_create_schema,
               has_schema_privilege('public', 'CREATE') AS can_create_objects,
               pg_has_role('botsales_migrator', 'MEMBER') AS migration_member
        FROM pg_catalog.pg_roles WHERE rolname = current_user
    `;
    return connection;
}

async function postgres(targets) {
    const runtime = new Database(targets.runtime);
    const migrator = new Database(targets.migrator);
    let failedCheck = 'PG_RUNTIME_NOT_READY';
    try {
        if (!await runtime.ready()) return failure(failedCheck);
        failedCheck = 'PG_RUNTIME_PRIVILEGES';
        const api = await role(runtime);
        if (!api.authenticated_role || api.username !== 'botsales_runtime' || api.elevated || api.can_create_schema ||
            api.can_create_objects || api.migration_member) return failure(failedCheck);
        const [grants] = await runtime.client.$queryRaw`
            SELECT has_table_privilege('public._prisma_migrations', 'SELECT') AS can_read_history,
                   has_table_privilege('public.audit_entries', 'INSERT') AS can_append_audit,
                   has_table_privilege('public.audit_entries', 'UPDATE, DELETE, TRUNCATE') AS can_change_audit,
                   has_table_privilege('public.stock_movements', 'UPDATE, DELETE, TRUNCATE') AS can_change_stock_history,
                   has_table_privilege('public.jobs', 'INSERT') AND has_table_privilege('public.jobs', 'UPDATE') AS can_manage_jobs
        `;
        if (grants.can_read_history || !grants.can_append_audit || grants.can_change_audit || grants.can_change_stock_history ||
            !grants.can_manage_jobs) return failure(failedCheck);
        failedCheck = 'PG_MIGRATION_PRIVILEGES';
        const ddl = await role(migrator);
        if (!ddl.authenticated_role || ddl.username !== 'botsales_migrator' || ddl.elevated || !ddl.can_create_objects) return failure(failedCheck);
        failedCheck = 'PG_TARGET_MISMATCH';
        if (['database_name', 'server_address', 'server_port', 'server_started_at'].some(key => api[key] !== ddl[key])) return failure(failedCheck);

        failedCheck = 'PG_MIGRATION_HISTORY';
        const expected = expectedMigrations();
        const rows = await migrator.client.$queryRaw`
            SELECT migration_name, checksum, finished_at IS NOT NULL AS finished
            FROM public._prisma_migrations WHERE rolled_back_at IS NULL
        `;
        const observed = new Set(rows.filter(row => row.finished).map(row => row.migration_name));
        const migrations = {
            expected: expected.size,
            finished: observed.size,
            incomplete: rows.filter(row => !row.finished).length,
            missing: [...expected.keys()].filter(name => !observed.has(name)).length,
            unexpected: [...observed].filter(name => !expected.has(name)).length,
            differentChecksum: rows.filter(row => row.finished && expected.has(row.migration_name) &&
                !expected.get(row.migration_name).has(row.checksum)).length,
            duplicate: rows.filter(row => row.finished).length - observed.size,
        };
        const details = { version: api.version, tls: { runtime: api.tls, migration: ddl.tls }, migrations };
        if (!expected.size || migrations.incomplete || migrations.missing || migrations.unexpected || migrations.differentChecksum || migrations.duplicate) {
            return { ...failure(failedCheck), ...details };
        }
        return { status: 'OK', ...details };
    } catch {
        return failure(failedCheck);
    } finally {
        await Promise.allSettled([runtime.onApplicationShutdown(), migrator.onApplicationShutdown()]);
    }
}

async function queueStore(target) {
    const redis = new Redis({ ...target, lazyConnect: true, enableOfflineQueue: false, retryStrategy: () => null,
        connectTimeout: 2500, commandTimeout: 2500, maxRetriesPerRequest: 0 });
    redis.on('error', () => {});
    let failedCheck = 'REDIS_CONNECTION';
    try {
        await redis.connect();
        if (await redis.ping() !== 'PONG') return failure(failedCheck);
        failedCheck = 'REDIS_QUEUE_SETTINGS';
        const settings = new Map((await redis.info()).split(/\r?\n/).filter(line => /^[a-z0-9_]+:/i.test(line)).map(line => {
            const split = line.indexOf(':');
            return [line.slice(0, split), line.slice(split + 1)];
        }));
        const version = settings.get('redis_version');
        const details = {
            version: /^\d+(\.\d+)+$/.test(version ?? '') ? version : null,
            tlsConfigured: Boolean(target.tls),
            noEviction: settings.get('maxmemory_policy') === 'noeviction',
            primary: settings.get('role') === 'master',
            standalone: settings.get('cluster_enabled') === '0',
            aofEnabled: settings.has('aof_enabled') ? settings.get('aof_enabled') === '1' : null,
        };
        if (!details.noEviction || !details.primary || !details.standalone) return { ...failure(failedCheck), ...details };
        return { status: 'OK', ...details };
    } catch {
        return failure(failedCheck);
    } finally {
        redis.disconnect();
    }
}

const fixture = process.argv[2] === '--fixture';
const scope = fixture ? 'fixture' : 'staging';

try {
    if (process.argv.length !== (fixture ? 3 : 2) || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new Error('Invalid probe scope');
    const pg = postgresTargets(process.env, fixture);
    const redis = redisTarget(process.env, fixture);
    const [database, queue] = await Promise.all([postgres(pg), queueStore(redis)]);
    const ok = database.status === 'OK' && queue.status === 'OK';
    console.log(JSON.stringify({ scope, status: ok ? 'DATA_SERVICES_VERIFIED' : 'BLOCKED', postgres: database, redis: queue }));
    if (!ok) process.exitCode = 1;
} catch {
    console.log(JSON.stringify({ scope, ...failure('DATA_CONFIG_OR_SCOPE') }));
    process.exitCode = 1;
}
