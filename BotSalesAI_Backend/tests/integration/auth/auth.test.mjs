import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash, randomUUID, sign } from 'node:crypto';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:https';
import { after, before, test } from 'node:test';
import { promisify } from 'node:util';
import { createApp } from '../../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createContractValidator, schemaFromContract } from '../../../apps/api/dist/http/contracts.js';
import { OidcClient, consumeStepUp, readAuthConfig } from '../../../apps/api/dist/modules/workspace/index.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { Database } from '../../../apps/api/dist/platform/database/client.js';
import { startFixtureProvider } from '../../../infra/p0/oidc/idp.mjs';
import { appOrigin, issuer, localTls, redirectUri } from '../../../infra/p0/oidc/tls.mjs';

const startPath = '/api/v2/auth/start';
const sessionPath = '/api/v2/session';
const logoutPath = '/api/v2/auth/logout';
const csrfPath = '/api/v2/auth/csrf';
const stepUpPath = '/api/v2/auth/step-up';
const sessionCookie = '__Host-bs_session';
const loginCookie = '__Host-bs_login';
const { components } = JSON.parse(readFileSync(new URL('../../../../botsales-kit/contracts/openapi.json', import.meta.url)));
const validator = createContractValidator(components.schemas);
let db, app, server, idp;
let tokenCase;
let fixtureSubject = 'p0-editor';
const [shopA] = fixtureShops;
const memberPath = '/api/v2/shops/' + shopA.id + '/members';
const uniqueRun = randomUUID().slice(0, 8);
const subjects = Object.fromEntries(['recipient', 'other', 'unverified', 'expired', 'cancelled', 'other-issuer', 'returning', 'same-address']
    .map(name => [name, 'be05-' + name + '-' + uniqueRun]));
const profiles = Object.fromEntries(Object.entries(subjects).map(([name, subject]) => [subject, {
    email: (name === 'unverified' ? subjects.recipient : subject) + '@botsales.test',
    verified: name !== 'unverified',
}]));

before(async () => {
    const url = readDatabaseUrl(process.env);
    assert.equal(new URL(url).pathname, '/botsales_be_dev');
    assert.equal(new URL(url).username, 'botsales_runtime');
    const configuration = readAuthConfig(process.env);
    assert.equal(configuration.appOrigin, appOrigin);
    const database = new Database(url);
    db = database.client;
    idp = await startFixtureProvider({
        chooseAccount: () => fixtureSubject,
        accounts: profiles,
        checkTokenResponse: (jwt, key) => {
            if (!tokenCase) return jwt;
            const [header, content] = jwt.split('.');
            const claims = JSON.parse(Buffer.from(content, 'base64url'));
            const cases = {
                issuer: { iss: 'https://issuer-invalid.test' },
                audience: { aud: 'audience-invalid' },
                expiry: { exp: Math.floor(Date.now() / 1000) - 120 },
                stale: { auth_time: Math.floor(Date.now() / 1000) - 120 },
                subject: { sub: subjects.other, email: profiles[subjects.other].email, email_verified: true },
            };
            if (tokenCase === 'missing-auth-time') delete claims.auth_time;
            const payload = Buffer.from(JSON.stringify({ ...claims, ...cases[tokenCase] })).toString('base64url');
            const data = header + '.' + payload;
            const signature = tokenCase === 'signature' ? Buffer.alloc(256) : sign('RSA-SHA256', Buffer.from(data), key);
            return data + '.' + signature.toString('base64url');
        },
    });
    app = await createApp({ database, auth: configuration, quiet: true });
    await app.init();
    server = createServer(localTls(), app.getHttpAdapter().getInstance());
    const ready = once(server, 'listening');
    server.listen(5173, 'localhost');
    await ready;
});
after(async () => {
    await Promise.all([server, idp].filter(Boolean).map(service => new Promise(resolve => {
        service.close(resolve);
        service.closeAllConnections();
    })));
    await app?.close();
});

test('T068: read-only provider check uses trusted HTTPS and reports only the check outcome', async () => {
    const run = promisify(execFile);
    const script = 'scripts/check-oidc-provider.mjs';
    const { stdout } = await run(process.execPath, [script, '--fixture']);
    assert.deepEqual(JSON.parse(stdout), {
        scope: 'fixture', status: 'OIDC_METADATA_VERIFIED', signingKeys: 1, pkce: 'S256', tokenAuth: 'client_secret_basic',
    });
    assert.ok(!stdout.includes(process.env.OIDC_CLIENT_SECRET));
    await assert.rejects(run(process.execPath, [script]), error => {
        assert.deepEqual(JSON.parse(error.stdout), { scope: 'staging', status: 'BLOCKED', failedCheck: 'OIDC_CONFIG_OR_SCOPE' });
        return error.code === 1;
    });
    const untrusted = { ...process.env, NODE_OPTIONS: '--use-bundled-ca' };
    delete untrusted.NODE_EXTRA_CA_CERTS;
    delete untrusted.NODE_USE_SYSTEM_CA;
    await assert.rejects(run(process.execPath, [script, '--fixture'], { env: untrusted }), error => {
        assert.deepEqual(JSON.parse(error.stdout), { scope: 'fixture', status: 'BLOCKED', failedCheck: 'OIDC_DISCOVERY_OR_METADATA' });
        return error.code === 1;
    });
});

test('T068: mismatched metadata, unsupported client settings and unusable signing keys fail closed', async () => {
    let endpoint, mode;
    const reads = [];
    const metadataServer = createServer(localTls(), (req, res) => {
        reads.push({ method: req.method, path: req.url, authorized: req.headers.authorization !== undefined });
        res.setHeader('content-type', 'application/json');
        if (req.url === '/.well-known/openid-configuration') {
            res.end(JSON.stringify({
                issuer: mode === 'issuer' ? endpoint + '/different' : endpoint,
                authorization_endpoint: endpoint + '/authorize',
                token_endpoint: mode === 'http' ? 'http://127.0.0.1/token' : endpoint + '/token',
                jwks_uri: endpoint + '/keys',
                response_types_supported: ['code'],
                id_token_signing_alg_values_supported: ['RS256'],
                code_challenge_methods_supported: mode === 'pkce' ? ['plain'] : ['S256'],
                token_endpoint_auth_methods_supported: mode === 'client-auth' ? ['client_secret_post'] : ['client_secret_basic'],
            }));
        } else if (req.url === '/keys' && mode === 'redirect') {
            res.writeHead(302, { location: endpoint + '/wrong' }).end();
        } else {
            res.end(JSON.stringify({ keys: [{ kty: 'RSA', use: 'enc' }, { kty: 'RSA', use: 'sig' }] }));
        }
    });
    const listening = once(metadataServer, 'listening');
    metadataServer.listen(0, '127.0.0.1');
    await listening;
    endpoint = 'https://127.0.0.1:' + metadataServer.address().port;
    const configuration = { ...readAuthConfig(process.env), issuer: endpoint };
    try {
        for (const defect of ['issuer', 'http', 'pkce', 'client-auth', 'redirect', 'keys']) {
            mode = defect;
            const from = reads.length;
            const jwks = ['redirect', 'keys'].includes(defect);
            assert.deepEqual(await new OidcClient(configuration).checkProvider(), {
                status: 'BLOCKED', failedCheck: jwks ? 'OIDC_JWKS' : 'OIDC_DISCOVERY_OR_METADATA',
            });
            assert.deepEqual(reads.slice(from), [
                { method: 'GET', path: '/.well-known/openid-configuration', authorized: false },
                ...(jwks ? [{ method: 'GET', path: '/keys', authorized: false }] : []),
            ]);
        }
        mode = 'http';
        await assert.rejects(new OidcClient(configuration).authorize('state', 'nonce', 'verifier'), { status: 503 });
    } finally {
        metadataServer.closeAllConnections();
        await new Promise(resolve => metadataServer.close(resolve));
    }
});

class HttpsClient {
    cookies = new Map();

    async request(path, options = {}) {
        const url = new URL(path, appOrigin);
        const cookies = [...this.cookies.values()].filter(item => item.host === url.hostname && url.pathname.startsWith(item.path));
        const cookie = cookies.map(item => item.pair).join('; ');
        const response = await fetch(url, {
            ...options, redirect: 'manual',
            headers: { ...(cookie ? { cookie } : {}), ...options.headers },
        });
        for (const header of response.headers.getSetCookie()) {
            const [pair, ...attributes] = header.split(';').map(part => part.trim());
            const name = pair.split('=')[0];
            const path = attributes.find(part => /^path=/i.test(part))?.slice(5) ?? '/';
            const key = url.hostname + '|' + name + '|' + path;
            if (attributes.some(part => /^max-age=0$/i.test(part)) || pair.endsWith('=')) this.cookies.delete(key);
            else this.cookies.set(key, { pair, path, host: url.hostname });
        }
        return response;
    }

    async followAuthorization(authorizationUrl) {
        let url = new URL(authorizationUrl);
        for (let step = 0; step < 12 && url.origin === issuer; step++) {
            const response = await this.request(url.href);
            assert.ok([302, 303].includes(response.status), 'IdP fixture expected a redirect');
            url = new URL(response.headers.get('location'), url);
            await response.text();
        }
        assert.equal(url.origin + url.pathname, redirectUri);
        return url;
    }

    get sessionPair() {
        return this.cookies.get('localhost|' + sessionCookie + '|/')?.pair;
    }
}

async function json(response, expected, schema) {
    assert.equal(response.status, expected);
    const body = await response.json();
    const validate = validator.compile(schemaFromContract(schema));
    assert.equal(validate(body), true, JSON.stringify(validate.errors));
    assert.equal(body.meta?.requestId ?? body.requestId, response.headers.get('x-request-id'));
    return body.data ?? body;
}

async function csrf(browser) {
    const response = await browser.request(csrfPath);
    assert.match(response.headers.get('set-cookie'), new RegExp('^' + loginCookie + '='));
    return (await json(response, 200, 'CsrfResponse')).csrfToken;
}

function startRequest(browser, csrfToken, returnTo, key = randomUUID(), origin = appOrigin) {
    return browser.request(startPath, {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json', 'x-csrf-token': csrfToken, 'idempotency-key': key },
        body: JSON.stringify({ returnTo }),
    });
}

async function begin(browser, returnTo = '/login') {
    return json(await startRequest(browser, await csrf(browser), returnTo), 200, 'AuthRedirectResponse');
}

function assertSessionCookie(response) {
    const header = response.headers.getSetCookie().find(value => value.startsWith(sessionCookie + '='));
    assert.ok(header);
    assert.match(header, /; Path=\//i);
    assert.match(header, /; Secure/i);
    assert.match(header, /; HttpOnly/i);
    assert.match(header, /; SameSite=Lax/i);
    assert.doesNotMatch(header, /; Domain=/i);
    assert.equal(response.headers.get('cache-control'), 'no-store');
}

function logout(browser, csrfToken, origin = appOrigin) {
    return browser.request(logoutPath, { method: 'POST', headers: { origin, 'x-csrf-token': csrfToken } });
}

async function loginAs(subject) {
    fixtureSubject = subject;
    try {
        const browser = new HttpsClient();
        const start = await begin(browser);
        const callback = await browser.followAuthorization(start.authorizationUrl);
        return { browser, response: await browser.request(callback.href) };
    } finally {
        fixtureSubject = 'p0-editor';
    }
}

function memberWrite(browser, session, path, method, body, key = randomUUID(), version) {
    return browser.request(path, {
        method,
        headers: {
            origin: appOrigin, 'x-csrf-token': session.csrfToken, 'idempotency-key': key,
            ...(body ? { 'content-type': 'application/json' } : {}),
            ...(version === undefined ? {} : { 'if-match': '"' + version + '"' }),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
}

function confirm(browser, session, body, headers = {}) {
    return browser.request(stepUpPath, { method: 'POST',
        headers: { origin: appOrigin, 'content-type': 'application/json', 'x-csrf-token': session.csrfToken, ...headers },
        body: JSON.stringify(body),
    });
}

test('T068 step-up: current-account OIDC confirmation rotates the session and reveals one scoped grant', async () => {
    const { browser } = await loginAs('p0-editor');
    const prior = browser.sessionPair;
    const current = await json(await browser.request(sessionPath), 200, 'SessionResponse');
    const resourceId = randomUUID();
    const scope = { shopId: shopA.id, resourceId };
    const input = { action: 'begin', shopId: scope.shopId, privacyRequestId: resourceId };
    await json(await confirm(browser, current, input, { origin: issuer }), 403, 'Problem');
    await json(await confirm(browser, current, { ...input, shopId: randomUUID() }), 404, 'Problem');
    await json(await confirm(browser, current, { action: 'complete' }), 403, 'Problem');
    const initiated = await confirm(browser, current, input);
    const binding = initiated.headers.getSetCookie().find(header => header.startsWith(loginCookie + '='))?.split(';')[0];
    assert.ok(binding);
    const start = await json(initiated, 200, 'StepUpResultResponse');
    const authorization = new URL(start.authorizationUrl);
    assert.equal(authorization.searchParams.get('prompt'), 'login');
    assert.equal(authorization.searchParams.get('max_age'), '0');
    assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
    const state = authorization.searchParams.get('state');
    const legacyHash = createHash('sha256').update(binding.slice(loginCookie.length + 1)).digest('hex');
    assert.equal(await db.authLoginAttempt.count({ where: { state, browserHash: legacyHash, consumedAt: null } }), 0);
    const callback = await browser.followAuthorization(authorization.href);
    const { browser: otherSession } = await loginAs('p0-editor');
    await json(await browser.request(callback.href, { headers: { cookie: otherSession.sessionPair + '; ' + binding } }), 400, 'Problem');
    const complete = await browser.request(callback.href);
    assert.equal(complete.status, 302);
    assertSessionCookie(complete);
    assert.equal(complete.headers.get('location'), `/s/${scope.shopId}/settings/privacy?approval=${resourceId}`);
    const confirmation = complete.headers.getSetCookie().find(header => header.startsWith('__Host-bs_step_up='));
    assert.ok(confirmation && /; Secure; HttpOnly; SameSite=Lax/.test(confirmation));
    assert.ok(browser.sessionPair !== prior, 'Session cookie was not rotated');
    await json(await browser.request(sessionPath, { headers: { cookie: prior } }), 401, 'Problem');
    await json(await browser.request(callback.href), 400, 'Problem');
    const rotated = await json(await browser.request(sessionPath), 200, 'SessionResponse');
    assert.equal(rotated.user.id, current.user.id);
    assert.equal(rotated.expiresAt, current.expiresAt);
    await json(await confirm(browser, current, { action: 'complete' }), 403, 'Problem');
    const { reauthToken } = await json(await confirm(browser, rotated, { action: 'complete' }), 200, 'StepUpResultResponse');
    const explicitCookie = browser.sessionPair + '; ' + confirmation.split(';')[0];
    await json(await confirm(browser, rotated, { action: 'complete' }, { cookie: explicitCookie }), 403, 'Problem');
    const config = readAuthConfig(process.env);
    const consume = (target, cookie = browser.sessionPair) => db.$transaction(tx =>
        consumeStepUp(tx, { cookie }, rotated.user.id, reauthToken, target, config));
    await assert.rejects(consume({ ...scope, resourceId: randomUUID() }), { status: 403 });
    await assert.rejects(consume({ ...scope, shopId: randomUUID() }), { status: 403 });
    await assert.rejects(consume(scope, prior), { status: 403 });
    await consume(scope);
    await assert.rejects(consume(scope), { status: 403 });
    assert.equal(await db.auditEntry.count({ where: { shopId: scope.shopId, actorId: rotated.user.id, action: 'stepUp', resourceId } }), 1);
});

test('T068 step-up: a different subject or missing or old authentication time cannot issue a grant', async () => {
    for (const defect of ['subject', 'missing-auth-time', 'stale']) {
        const { browser } = await loginAs('p0-editor');
        const session = await json(await browser.request(sessionPath), 200, 'SessionResponse');
        const prior = browser.sessionPair;
        const resourceId = randomUUID();
        const start = await json(await confirm(browser, session, { action: 'begin', shopId: shopA.id, privacyRequestId: resourceId }), 200, 'StepUpResultResponse');
        try {
            tokenCase = defect;
            const callback = await browser.followAuthorization(start.authorizationUrl);
            await json(await browser.request(callback.href), defect === 'subject' ? 403 : 400, 'Problem');
        } finally {
            tokenCase = undefined;
        }
        assert.ok(browser.sessionPair === prior, 'Rejected confirmation must leave the existing session valid');
        await json(await confirm(browser, session, { action: 'complete' }), 403, 'Problem');
        assert.equal(await db.stepUpGrant.count({ where: { resourceId } }), 0);
        assert.equal(await db.auditEntry.count({ where: { shopId: shopA.id, action: 'stepUp', resourceId } }), 0);
    }
});

test('P0-03: HTTPS authorization, idempotent begin, cookie and live membership response', async () => {
    const browser = new HttpsClient();
    await json(await browser.request(sessionPath), 401, 'Problem');
    const token = await csrf(browser);
    const key = randomUUID();
    const result = await Promise.all([
        startRequest(browser, token, '/login', key), startRequest(browser, token, '/login', key),
    ]);
    const [first, repeat] = await Promise.all(result.map(response => json(response, 200, 'AuthRedirectResponse')));
    assert.deepEqual(first, repeat);
    const authorize = new URL(first.authorizationUrl);
    assert.equal(authorize.origin, issuer);
    assert.equal(authorize.searchParams.get('code_challenge_method'), 'S256');
    assert.ok(authorize.searchParams.get('nonce'));
    assert.ok(authorize.searchParams.get('state'));
    const response = await browser.request((await browser.followAuthorization(authorize.href)).href);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/login');
    assertSessionCookie(response);
    const session = await json(await browser.request(sessionPath), 200, 'SessionResponse');
    assert.equal(session.user.email, 'p0-editor@botsales.test');
    assert.deepEqual(session.memberships.map(member => member.roles), [['owner']]);
    assert.ok(session.memberships[0].permissions.includes('dashboard.read'));
    assert.deepEqual(await json(await browser.request(sessionPath), 200, 'SessionResponse'), session);
    assert.equal(await csrf(browser), session.csrfToken);
    assert.equal((await logout(browser, session.csrfToken)).status, 204);
});

test('P0-04: mutation CSRF, exact origin, key conflict and safe return path', async () => {
    const browser = new HttpsClient();
    const token = await csrf(browser);
    const key = randomUUID();
    await json(await startRequest(browser, '', '/login', key), 403, 'Problem');
    await json(await startRequest(browser, token, '/login', key, issuer), 403, 'Problem');
    await json(await startRequest(browser, token, '/login', ''), 400, 'Problem');
    const start = await json(await startRequest(browser, token, 'https://outside.invalid', key), 200, 'AuthRedirectResponse');
    await json(await startRequest(browser, token, '/login', key), 409, 'Problem');
    const response = await browser.request((await browser.followAuthorization(start.authorizationUrl)).href);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/workspaces');
    const session = await json(await browser.request(sessionPath), 200, 'SessionResponse');
    await json(await logout(browser, ''), 403, 'Problem');
    await json(await logout(browser, session.csrfToken, issuer), 403, 'Problem');
    assert.equal((await logout(browser, session.csrfToken)).status, 204);
});

test('P0-04: one callback claim and one session despite concurrent retry', async () => {
    const browser = new HttpsClient();
    const start = await begin(browser);
    const callback = await browser.followAuthorization(start.authorizationUrl);
    await json(await new HttpsClient().request(callback.href), 400, 'Problem');
    const beforeCount = await db.session.count();
    const duplicates = await Promise.all([browser.request(callback.href), browser.request(callback.href)]);
    assert.deepEqual(duplicates.map(response => response.status).sort(), [302, 400]);
    assert.equal(await db.session.count(), beforeCount + 1);
    const stored = await db.authLoginAttempt.findUniqueOrThrow({ where: { state: callback.searchParams.get('state') } });
    assert.ok(stored.consumedAt);
    assert.equal(stored.pkceVerifier, null);
    assert.equal(stored.nonce, null);
    const session = await json(await browser.request(sessionPath), 200, 'SessionResponse');
    assert.equal((await logout(browser, session.csrfToken)).status, 204);
});

test('P0-04: wrong state, issuer, code, PKCE, nonce, and expired attempts create no session', async () => {
    const beforeCount = await db.session.count();
    for (const scenario of ['state', 'iss', 'code', 'pkce', 'nonce', 'expired']) {
        const browser = new HttpsClient();
        const start = await begin(browser);
        const callback = await browser.followAuthorization(start.authorizationUrl);
        const state = callback.searchParams.get('state');
        const changes = {
            pkce: { pkceVerifier: 'V'.repeat(43) },
            nonce: { nonce: 'N'.repeat(43) },
            expired: { expiresAt: new Date(Date.now() - 1000) },
        };
        if (changes[scenario]) await db.authLoginAttempt.update({ where: { state }, data: changes[scenario] });
        else callback.searchParams.set(scenario, 'synthetic-invalid');
        const response = await browser.request(callback.href);
        assert.equal(response.headers.getSetCookie().length, 0, scenario);
        await json(response, 400, 'Problem');
        await json(await browser.request(sessionPath), 401, 'Problem');
    }
    assert.equal(await db.session.count(), beforeCount);
});

test('P0-04: invalid ID token issuer, audience, expiry and signature create no session', async () => {
    const beforeCount = await db.session.count();
    try {
        for (const scenario of ['issuer', 'audience', 'expiry', 'signature']) {
            const browser = new HttpsClient();
            const start = await begin(browser);
            const callback = await browser.followAuthorization(start.authorizationUrl);
            tokenCase = scenario;
            const response = await browser.request(callback.href);
            assert.equal(response.status, 400, scenario);
            assert.equal(response.headers.getSetCookie().length, 0, scenario);
            await json(response, 400, 'Problem');
        }
    } finally {
        tokenCase = undefined;
    }
    assert.equal(await db.session.count(), beforeCount);
});

test('P0-04: reauthentication replaces the old cookie, expiry and logout revoke server access', async () => {
    const browser = new HttpsClient();
    const signIn = async () => {
        const start = await begin(browser);
        const response = await browser.request((await browser.followAuthorization(start.authorizationUrl)).href);
        assert.equal(response.status, 302);
        assertSessionCookie(response);
    };
    const assertRevoked = async cookie => json(await new HttpsClient().request(sessionPath, { headers: { cookie } }), 401, 'Problem');
    await signIn();
    const oldCookie = browser.sessionPair;
    await signIn();
    assert.notEqual(browser.sessionPair, oldCookie);
    await assertRevoked(oldCookie);

    const current = browser.sessionPair;
    const tokenHash = createHash('sha256').update(current.slice(current.indexOf('=') + 1)).digest('hex');
    const now = Date.now();
    await db.session.update({ where: { tokenHash }, data: { createdAt: new Date(now - 2000), expiresAt: new Date(now - 1000) } });
    await assertRevoked(current);

    await signIn();
    const loggedOut = browser.sessionPair;
    const session = await json(await browser.request(sessionPath), 200, 'SessionResponse');
    const response = await logout(browser, session.csrfToken);
    assert.equal(response.status, 204);
    assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
    await assertRevoked(loggedOut);
});

test('P0-05: invite is idempotent and grants scope only after the verified OIDC recipient signs in', async () => {
    const owner = await loginAs('p0-editor');
    assert.equal(owner.response.status, 302);
    const ownerSession = await json(await owner.browser.request(sessionPath), 200, 'SessionResponse');
    const key = randomUUID();
    const email = profiles[subjects.recipient].email;
    const payload = { email, roles: ['viewer'] };
    const makeInvite = (body, idempotency = key) => memberWrite(owner.browser, ownerSession, memberPath, 'POST', body, idempotency);
    const [initial, repeat] = await Promise.all([makeInvite(payload), makeInvite({ ...payload, email: email.replace('botsales.test', 'BOTSALES.TEST') })]);
    const [pending, replay] = await Promise.all([json(initial, 201, 'MembershipResponse'), json(repeat, 201, 'MembershipResponse')]);
    assert.deepEqual(pending, replay);
    assert.equal(pending.status, 'invited');
    assert.deepEqual(pending.permissions, []);
    assert.ok(Date.parse(pending.invitationExpiresAt) > Date.now());
    assert.doesNotMatch(JSON.stringify(pending), /@|inviteEmailHash/);
    await json(await makeInvite(payload, randomUUID()), 409, 'Problem');
    await json(await makeInvite({ ...payload, roles: ['sales'] }), 409, 'Problem');
    await json(await makeInvite({ ...payload, roles: ['owner'] }, randomUUID()), 403, 'Problem');

    const other = await loginAs(subjects.other);
    assert.equal(other.response.status, 302);
    assert.deepEqual((await json(await other.browser.request(sessionPath), 200, 'SessionResponse')).memberships, []);
    const unverified = await loginAs(subjects.unverified);
    await json(unverified.response, 400, 'Problem');
    assert.equal((await db.membership.findUniqueOrThrow({ where: { shopId_id: { shopId: shopA.id, id: pending.id } } })).status, 'invited');

    const change = await json(await memberWrite(
        owner.browser, ownerSession, memberPath + '/' + pending.id, 'PATCH', { roles: ['sales'] }, randomUUID(), pending.permissionVersion,
    ), 200, 'MembershipResponse');
    assert.equal(change.status, 'invited');
    assert.equal(change.permissionVersion, pending.permissionVersion + 1);
    const recipient = await loginAs(subjects.recipient);
    assert.equal(recipient.response.status, 302);
    const accepted = await json(await recipient.browser.request(sessionPath), 200, 'SessionResponse');
    assert.equal(accepted.user.id, pending.userId);
    const [member] = accepted.memberships;
    assert.equal(member.id, pending.id);
    assert.equal(member.status, 'active');
    assert.deepEqual(member.roles, ['sales']);
    assert.equal(member.permissionVersion, change.permissionVersion + 1);
    const shops = await json(await recipient.browser.request('/api/v2/shops'), 200, 'ShopListResponse');
    assert.deepEqual(shops.map(shop => shop.id), [shopA.id]);
    const audit = await db.auditEntry.findMany({ where: { shopId: shopA.id, resourceId: pending.id }, orderBy: { createdAt: 'asc' } });
    assert.deepEqual(audit.map(row => row.action), ['inviteMember', 'updateMemberRoles', 'acceptMembershipInvite']);
    assert.deepEqual(audit.map(row => row.actorId), [ownerSession.user.id, ownerSession.user.id, accepted.user.id]);
    assert.equal(audit[2].requestId, recipient.response.headers.get('x-request-id'));
    assert.doesNotMatch(JSON.stringify(audit), /@|inviteEmailHash/);
});

test('P0-05: expired, revoked and differently bound invites grant no access and expired invites can be reissued', async () => {
    const owner = await loginAs('p0-editor');
    const ownerSession = await json(await owner.browser.request(sessionPath), 200, 'SessionResponse');
    for (const name of ['expired', 'cancelled', 'other-issuer']) {
        const subject = subjects[name];
        const payload = { email: profiles[subject].email, roles: ['viewer'] };
        const pending = await json(await memberWrite(owner.browser, ownerSession, memberPath, 'POST', payload), 201, 'MembershipResponse');
        const where = { shopId_id: { shopId: shopA.id, id: pending.id } };
        if (name === 'cancelled') {
            const revoked = await memberWrite(owner.browser, ownerSession, memberPath + '/' + pending.id, 'DELETE',
                undefined, randomUUID(), pending.permissionVersion);
            assert.equal(revoked.status, 204);
        } else {
            await db.membership.update({ where, data: name === 'expired'
                ? { inviteExpiresAt: new Date(Date.now() - 1000) }
                : { inviteIssuer: 'https://synthetic-unselected-idp.invalid' } });
        }
        const recipient = await loginAs(subject);
        assert.equal(recipient.response.status, 302);
        assert.deepEqual((await json(await recipient.browser.request(sessionPath), 200, 'SessionResponse')).memberships, []);
        assert.equal(await db.auditEntry.count({ where: { resourceId: pending.id, action: 'acceptMembershipInvite' } }), 0);
        if (name === 'expired') {
            const reissued = await json(await memberWrite(owner.browser, ownerSession, memberPath, 'POST', payload), 201, 'MembershipResponse');
            assert.notEqual(reissued.id, pending.id);
            assert.equal((await db.membership.findUniqueOrThrow({ where })).status, 'revoked');
            assert.equal(await db.auditEntry.count({ where: { resourceId: pending.id, action: 'expireMembershipInvite' } }), 1);
            const relogin = await loginAs(subject);
            assert.equal(relogin.response.status, 302);
            const activated = await json(await relogin.browser.request(sessionPath), 200, 'SessionResponse');
            assert.equal(activated.memberships[0].id, reissued.id);
            assert.notEqual(activated.user.id, reissued.userId);
        }
    }
});

test('P0-05: a returning member keeps the bound subject and membership history when the IdP email changes', async () => {
    const owner = await loginAs('p0-editor');
    const ownerSession = await json(await owner.browser.request(sessionPath), 200, 'SessionResponse');
    const subject = subjects.returning;
    const invite = email => memberWrite(owner.browser, ownerSession, memberPath, 'POST', { email, roles: ['viewer'] });
    const revoke = member => memberWrite(owner.browser, ownerSession, memberPath + '/' + member.id, 'DELETE',
        undefined, randomUUID(), member.permissionVersion);
    const readSession = async portal => json(await portal.browser.request(sessionPath), 200, 'SessionResponse');

    const first = await json(await invite(profiles[subject].email), 201, 'MembershipResponse');
    const initial = await loginAs(subject);
    const { user, memberships: [active] } = await readSession(initial);
    assert.equal(active.id, first.id);
    assert.equal((await revoke(active)).status, 204);
    const rebound = await json(await invite(profiles[subject].email), 201, 'MembershipResponse');
    assert.equal(rebound.id, first.id);
    profiles[subjects['same-address']].email = profiles[subject].email;
    const differentSubject = await loginAs(subjects['same-address']);
    assert.deepEqual((await readSession(differentSubject)).memberships, []);
    assert.equal((await revoke(rebound)).status, 204);

    profiles[subject].email = 'changed-' + uniqueRun + '@botsales.test';
    const provisional = await json(await invite(profiles[subject].email), 201, 'MembershipResponse');
    assert.notEqual(provisional.id, first.id);
    const returning = await loginAs(subject);
    const granted = await readSession(returning);
    assert.equal(granted.user.id, user.id);
    assert.deepEqual(granted.memberships.map(member => member.id), [first.id]);
    assert.equal(granted.memberships[0].permissionVersion, rebound.permissionVersion + 2);

    const retired = await db.membership.findUniqueOrThrow({ where: { shopId_id: { shopId: shopA.id, id: provisional.id } } });
    assert.equal(retired.status, 'revoked');
    assert.equal(retired.inviteEmailHash, null);
    const audit = await db.auditEntry.findFirstOrThrow({
        where: { shopId: shopA.id, resourceId: retired.id, action: 'reconcileMembershipInvite' },
    });
    assert.equal(audit.actorId, user.id);
    assert.equal(audit.metadata.acceptedMembershipId, first.id);
});
