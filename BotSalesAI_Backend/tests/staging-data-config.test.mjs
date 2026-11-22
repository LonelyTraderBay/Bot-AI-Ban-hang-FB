import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { matchesProbeScope } from '../scripts/probe-target.mjs';
import { postgresTargets, redisTarget } from '../scripts/staging-data-config.mjs';

const database = '127.0.0.1:55432/botsales_be_dev';
const env = {
    DATABASE_URL: 'postgresql://botsales_runtime@' + database,
    MIGRATION_DATABASE_URL: 'postgresql://botsales_migrator@' + database,
    REDIS_URL: 'redis://127.0.0.1:56379/3',
};

test('probe scopes agree on declared loopback, wildcard and staging endpoints', () => {
    for (const host of ['localhost', 'oidc.LocalHost.', '127.0.0.9', '127.1', '[::1]', '::ffff:127.0.0.2']) {
        assert.equal(matchesProbeScope(host, true), true, host);
        assert.equal(matchesProbeScope(host), false, host);
    }
    for (const host of ['0.0.0.0', '[::]', '::ffff:0.0.0.0']) {
        assert.equal(matchesProbeScope(host, true), false, host);
        assert.equal(matchesProbeScope(host), false, host);
    }
    for (const host of ['oidc.staging.example.test', '10.0.0.20', '[fd00::2]']) {
        assert.equal(matchesProbeScope(host, true), false, host);
        assert.equal(matchesProbeScope(host), true, host);
    }
});

test('data probe requires a matching PostgreSQL target with distinct roles in the requested scope', () => {
    assert.deepEqual(postgresTargets(env, true), { runtime: env.DATABASE_URL, migrator: env.MIGRATION_DATABASE_URL });
    assert.throws(() => postgresTargets(env), /separate PostgreSQL roles/);
    for (const url of [env.DATABASE_URL, env.MIGRATION_DATABASE_URL + '_different', env.MIGRATION_DATABASE_URL + '?host=another.test',
        env.MIGRATION_DATABASE_URL + '?schema=elsewhere']) {
        assert.throws(() => postgresTargets({ ...env, MIGRATION_DATABASE_URL: url }, true), /separate PostgreSQL roles/);
    }
    const mappedDatabase = url => url.replace('127.0.0.1', '[::ffff:127.0.0.2]').replace('botsales_be_dev', 'staging');
    assert.throws(() => postgresTargets({ DATABASE_URL: mappedDatabase(env.DATABASE_URL),
        MIGRATION_DATABASE_URL: mappedDatabase(env.MIGRATION_DATABASE_URL) }), /separate PostgreSQL roles/);
});

test('data probe uses the same Redis DB index and TLS server name as the worker configuration', () => {
    assert.deepEqual(redisTarget(env, true), { host: '127.0.0.1', port: 56379, db: 3, username: undefined, password: undefined });
    assert.throws(() => redisTarget(env), /probe scope/);
    const tls = redisTarget({ REDIS_URL: 'rediss://worker:fixture%21@redis.example.test:6380/2' });
    assert.deepEqual(tls, { host: 'redis.example.test', port: 6380, db: 2, username: 'worker', password: 'fixture!', tls: { servername: 'redis.example.test' } });
    assert.throws(() => redisTarget({ REDIS_URL: 'redis://[::1]:0/0' }, true), /Redis port/);
    assert.throws(() => redisTarget({ REDIS_URL: env.REDIS_URL + '?db=5' }, true), /direct Redis endpoint/);
    assert.throws(() => redisTarget({ REDIS_URL: 'redis://[::ffff:127.0.0.2]:56379/3' }), /probe scope/);
});

test('staging OIDC and HTTPS runtime commands reject loopback aliases before checking the service', () => {
    const origin = 'https://staging.example.test';
    const configuration = { ...process.env, APP_ORIGIN: origin, OIDC_REDIRECT_URI: origin + '/api/v2/auth/callback',
        OIDC_CLIENT_ID: 'staging-scope-fixture', OIDC_CLIENT_SECRET: 'fixture', AUTH_SIGNING_KEY: '1'.repeat(64),
        NODE_TLS_REJECT_UNAUTHORIZED: '1' };
    for (const host of ['idp.localhost.', '127.0.0.2', '[::ffff:7f00:2]', '[::]']) {
        const result = spawnSync(process.execPath, ['scripts/check-oidc-provider.mjs'], {
            env: { ...configuration, OIDC_ISSUER: 'https://' + host }, encoding: 'utf8', timeout: 8000,
        });
        assert.ifError(result.error);
        assert.equal(result.status, 1);
        assert.deepEqual(JSON.parse(result.stdout), { scope: 'staging', status: 'BLOCKED', failedCheck: 'OIDC_CONFIG_OR_SCOPE' });
        const runtime = spawnSync(process.execPath, ['scripts/check-release-runtime.mjs', 'unused-manifest.json', '0'.repeat(64)], {
            env: { ...configuration, APP_ORIGIN: 'https://' + host }, encoding: 'utf8', timeout: 8000,
        });
        assert.ifError(runtime.error);
        assert.equal(runtime.status, 1);
        assert.match(runtime.stderr, /selected staging or loopback fixture scope/);
    }
});
