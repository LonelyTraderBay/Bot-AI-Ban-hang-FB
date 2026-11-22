import { readDatabaseUrl } from '../apps/api/dist/config.js';
import { readRedisConnection } from '../apps/worker/src/redis-config.mjs';
import { matchesProbeScope } from './probe-target.mjs';

const overrides = new Set(['host', 'port', 'user', 'password', 'database', 'dbname']);

export function postgresTargets(env, fixture = false) {
    const runtime = new URL(readDatabaseUrl(env));
    const migrator = new URL(readDatabaseUrl({ DATABASE_URL: env.MIGRATION_DATABASE_URL }));
    if ([runtime, migrator].some(url => [...url.searchParams].some(([key, value]) =>
        overrides.has(key) || (key === 'schema' && value !== 'public'))) ||
        runtime.username !== 'botsales_runtime' || migrator.username !== 'botsales_migrator' ||
        runtime.hostname !== migrator.hostname || (runtime.port || '5432') !== (migrator.port || '5432') ||
        runtime.pathname !== migrator.pathname || !matchesProbeScope(runtime.hostname, fixture) ||
        (!fixture && runtime.pathname === '/botsales_be_dev')) {
        throw new Error('Expected separate PostgreSQL roles for the same direct database');
    }
    return { runtime: runtime.href, migrator: migrator.href };
}

export function redisTarget(env, fixture = false) {
    const target = readRedisConnection(env);
    if (!matchesProbeScope(target.host, fixture)) throw new Error('Redis endpoint does not match the probe scope');
    return target;
}
