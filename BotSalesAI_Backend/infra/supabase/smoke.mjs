import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:https';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
import { createApp } from '../../apps/api/dist/app.js';
import { Database } from '../../apps/api/dist/platform/database/client.js';
import { readFileScannerTarget } from '../../apps/api/dist/modules/files/index.js';
import { readAuthConfig } from '../../apps/api/dist/modules/workspace/index.js';
import { fixtureShops, fixtureUsers } from '../../apps/api/prisma/p0-fixture.mjs';
import { startFixtureProvider } from '../p0/oidc/idp.mjs';
import { appOrigin, issuer, localTls, redirectUri } from '../p0/oidc/tls.mjs';

const frontendRequire = createRequire(new URL('../../../BotSalesAI_Frontend/package.json', import.meta.url));
const { request } = frontendRequire('playwright');
const api = appOrigin + '/api/v2';
const owners = fixtureUsers.filter(user => user.role === 'owner');
const verifyWorker = process.argv.includes('--worker');

function checkedTarget(env) {
    const ref = env.BOTSALES_SUPABASE_PROJECT_REF ?? '';
    assert.match(ref, /^[a-z0-9]{20}$/, 'Set the approved Supabase project reference');
    assert.equal(env.P0_LOCAL_PILOT, '1');
    assert.equal(env.OIDC_ISSUER, issuer);
    assert.equal(env.APP_ORIGIN, appOrigin);
    assert.notEqual(env.NODE_TLS_REJECT_UNAUTHORIZED, '0');
    const url = new URL(env.DATABASE_URL);
    assert.ok(url.hostname.endsWith('.pooler.supabase.com'));
    assert.equal(url.protocol, 'postgresql:');
    assert.equal(url.port, '5432');
    assert.equal(url.pathname, '/postgres');
    assert.equal(url.username === 'botsales_runtime.' + ref, true, 'Check the approved runtime role and project');
    assert.equal(url.searchParams.get('sslmode'), 'verify-full');
    assert.ok(url.searchParams.get('sslrootcert'));
    return url;
}

async function data(response, status = 200) {
    assert.equal(response.status(), status, new URL(response.url()).pathname);
    return (await response.json()).data;
}

async function login(session) {
    const { csrfToken } = await data(await session.get(api + '/auth/csrf'));
    const { authorizationUrl } = await data(await session.post(api + '/auth/start', {
        data: { returnTo: '/workspaces' },
        headers: { origin: appOrigin, 'x-csrf-token': csrfToken, 'idempotency-key': randomUUID() },
    }));
    let next = new URL(authorizationUrl);
    for (let step = 0; step < 12 && next.origin === issuer; step++) {
        const response = await session.get(next.href, { maxRedirects: 0 });
        assert.ok([302, 303].includes(response.status()), 'OIDC fixture must redirect');
        next = new URL(response.headers().location, next);
    }
    assert.equal(next.origin + next.pathname, redirectUri);
    const response = await session.get(next.href, { maxRedirects: 0 });
    assert.equal(response.status(), 302, 'OIDC callback');
    return data(await session.get(api + '/session'));
}

async function verifyExport(shop, session, csrfToken) {
    const endpoint = api + '/shops/' + shop.id;
    const now = new Date();
    const accepted = await session.post(endpoint + '/exports', {
        headers: { origin: appOrigin, 'x-csrf-token': csrfToken, 'idempotency-key': randomUUID() },
        data: { reportType: 'profit_loss', format: 'csv', timezone: shop.timezone,
            from: new Date(now.getTime() - 86400000).toISOString(), to: now.toISOString(), snapshotAsOf: now.toISOString() },
    });
    const queued = await data(accepted, 202);
    const deadline = Date.now() + 25000;
    while (Date.now() < deadline) {
        const job = await data(await session.get(endpoint + '/jobs/' + queued.id));
        if (job.status === 'succeeded') {
            assert.ok(job.downloadUrl?.startsWith('/api/v2/shops/' + shop.id + '/uploads/'));
            const download = await session.get(new URL(job.downloadUrl, appOrigin).href);
            assert.equal(download.status(), 200);
            assert.match(await download.text(), /snapshot_captured_at.*source_view_as_of/);
            return { accepted: 202, status: job.status, download: 200 };
        }
        assert.ok(['queued', 'running'].includes(job.status), 'Export unexpectedly failed');
        await delay(300);
    }
    throw new Error('The worker did not finish the fixture export');
}

async function verifyScope(owner, session) {
    const current = await login(session);
    try {
        assert.deepEqual(current.memberships.map(member => member.shopId), [owner.shopId]);
        const shops = await data(await session.get(api + '/shops'));
        assert.deepEqual(shops.map(shop => shop.id), [owner.shopId]);
        const own = fixtureShops.find(shop => shop.id === owner.shopId);
        const other = fixtureShops.find(shop => shop.id !== owner.shopId);
        const authorized = await session.get(api + '/shops/' + own.id);
        const details = await data(authorized);
        assert.equal(details.id, own.id);
        const denied = await session.get(api + '/shops/' + other.id);
        assert.equal(denied.status(), 404, 'The other shop must be hidden');
        const worker = verifyWorker ? await verifyExport(own, session, current.csrfToken) : undefined;
        return { shop: own.name, currency: own.currency, own: authorized.status(), crossShop: denied.status(), worker };
    } finally {
        const logout = await session.post(api + '/auth/logout', {
            headers: { origin: appOrigin, 'x-csrf-token': current.csrfToken },
        });
        assert.equal(logout.status(), 204);
        assert.equal((await session.get(api + '/session')).status(), 401);
    }
}

async function smoke() {
    const target = checkedTarget(process.env);
    const database = new Database(target.href);
    let idp, app, server;
    let subject;
    try {
        idp = await startFixtureProvider({
            chooseAccount: () => subject,
            accounts: Object.fromEntries(owners.map(({ subject }) => [subject, {
                email: subject + '@botsales.test', verified: true,
            }])),
        });
        const fileScanner = readFileScannerTarget(process.env);
        app = await createApp({ database, auth: readAuthConfig(process.env), fileScanner, quiet: true });
        await app.init();
        server = createServer(localTls(), app.getHttpAdapter().getInstance());
        const listening = once(server, 'listening');
        server.listen(new URL(appOrigin).port, 'localhost');
        await listening;
        const ready = await fetch(api + '/health/ready');
        assert.equal(ready.status, 200);
        assert.equal((await ready.json()).status, 'ready');
        const shops = [];
        for (const owner of owners) {
            subject = owner.subject;
            const session = await request.newContext();
            try {
                shops.push(await verifyScope(owner, session));
            } finally {
                await session.dispose();
            }
        }
        console.log(JSON.stringify({ status: 'SUPABASE_PILOT_SHOPS_PASSED', readiness: 200,
            callback: 302, logout: 204, afterLogout: 401, shops }));
    } finally {
        await Promise.all([server, idp].filter(Boolean).map(service => new Promise(resolve => {
            service.close(resolve);
            service.closeAllConnections();
        })));
        if (app) await app.close();
        else await database.onApplicationShutdown();
    }
}

try {
    await smoke();
} catch (error) {
    console.error('Supabase pilot smoke failed:', error.name,
        error.cause?.code ?? error.code ?? '',
        error.stack?.split('\n').find(line => /smoke\.mjs:\d+:\d+/.test(line)) ?? '');
    if (error.code === 'ERR_ASSERTION' && typeof error.actual === 'number') {
        console.error('Observed status', error.actual, 'expected', error.expected);
    }
    process.exitCode = 1;
}
