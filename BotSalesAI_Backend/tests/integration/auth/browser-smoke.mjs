import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { copyFileSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createDatabaseClient } from '../../../apps/api/dist/platform/database/client.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { appOrigin, issuer, redirectUri } from '../../../infra/p0/oidc/tls.mjs';
import { postgresTargets, redisTarget } from '../../../scripts/staging-data-config.mjs';
import { configureOpenAiBrowserFixture, verifyAiFlow, verifyOpenAiConnectionFlow } from '../ai/browser-cases.mjs';
import { verifyCatalogFlow, verifyImportFlow } from '../catalog/browser-cases.mjs';
import { verifyFinanceFlow, verifyReconciliationFlow } from '../finance/browser-cases.mjs';
import { configureMetaInboundFixture, verifyInboxFlow, verifyMetaInboundFlow } from '../inbox/browser-cases.mjs';
import { verifyInventoryFlow } from '../inventory/browser-cases.mjs';
import { verifyOperationsFlow } from '../operations/browser-cases.mjs';
import { configureTelegramBrowserFixture, verifyOrdersFlow, verifyTelegramBrowserFlow, verifyWebPushFlow } from '../orders/browser-cases.mjs';
import { pushConfigEnv } from '../notifications/web-push-fixture.mjs';
import { verifyPrivacyFlow } from '../privacy/browser-cases.mjs';
import { provisionManualSupplier, verifyProcurementFlow } from '../procurement/browser-cases.mjs';
import { verifyCommandRecovery, verifyWorkspaceSelection } from '../workspace/browser-cases.mjs';
import { assertFixtureDatabase, fixtureSession } from '../workspace/session-fixture.mjs';
import { configureLocalPilot, verifyLocalPilot } from './pilot-cases.mjs';

const require = createRequire(new URL('../../../../BotSalesAI_Frontend/package.json', import.meta.url));
const { firefox } = require('playwright');
const services = new Map();
const logs = [];
const run = promisify(execFile);
let browser;
let profile;
const workspace = process.argv.includes('--workspace');
const pilot = process.argv.includes('--pilot');
const httpOnly = process.argv.includes('--http-only');
const measureBrowser = process.argv.includes('--performance');
const catalog = process.argv.includes('--catalog');
const imports = process.argv.includes('--imports');
const inventoryDocuments = process.argv.includes('--inventory-documents');
const inventory = inventoryDocuments || process.argv.includes('--inventory');
const orders = process.argv.includes('--orders');
const finance = process.argv.includes('--finance');
const reconciliation = process.argv.includes('--reconciliation');
const inbox = process.argv.includes('--inbox');
const metaReply = process.argv.includes('--meta-reply');
const metaInbound = metaReply || process.argv.includes('--meta-inbound');
const webPush = process.argv.includes('--web-push');
const telegram = process.argv.includes('--telegram');
const ai = process.argv.includes('--ai');
const openAiModelCheck = process.argv.includes('--openai-model-check');
const operations = process.argv.includes('--operations');
const fulfillment = process.argv.includes('--fulfillment');
const promotion = process.argv.includes('--promotions');
const manualProcurement = process.argv.includes('--procurement-manual');
const procurement = manualProcurement || process.argv.includes('--procurement');
const privacy = process.argv.includes('--privacy');

async function reportBrowserTiming(page, step) {
    const timing = await page.evaluate(() => {
        const { performance, location } = globalThis;
        const [navigation] = performance.getEntriesByType('navigation');
        const scripts = performance.getEntriesByType('resource').filter(entry => {
            const url = new URL(entry.name);
            return url.origin === location.origin && url.pathname.endsWith('.js');
        });
        return { mode: navigation.type, toVisibleMs: Math.round(performance.now() - navigation.startTime),
            responseStartMs: Math.round(navigation.responseStart), scriptRequests: scripts.length,
            transferredScriptBytes: scripts.reduce((sum, entry) => sum + entry.transferSize, 0) };
    });
    assert.ok(timing.toVisibleMs >= timing.responseStartMs && timing.responseStartMs > 0);
    console.log(JSON.stringify({ browserPerformance: step, ...timing }));
}

function startProcess(executable, args, label, options) {
    const child = spawn(executable, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, ...options });
    child.stdout.on('data', chunk => logs.push(String(chunk)));
    child.stderr.on('data', chunk => logs.push(String(chunk)));
    services.set(child, label);
    return child;
}

function start(script, args = [], options = {}) {
    return startProcess(process.execPath, [script, ...args], script, options);
}

function startEdge(executable, root) {
    const config = join(root, 'BotSalesAI_Backend', 'infra', 'edge', 'Caddyfile');
    const tlsPath = key => realpathSync(process.env[key]).replaceAll('\\', '/');
    startProcess(realpathSync(executable), ['run', '--config', config, '--adapter', 'caddyfile'], 'infra/edge/Caddyfile', {
        cwd: root,
        env: {
            SystemRoot: process.env.SystemRoot,
            XDG_DATA_HOME: profile,
            XDG_CONFIG_HOME: profile,
            APP_ORIGIN: appOrigin,
            API_PORT: process.env.API_PORT,
            BOTSALES_EDGE_BIND: '127.0.0.1',
            BOTSALES_EDGE_TLS_CERT: tlsPath('P0_TLS_CERT_FILE'),
            BOTSALES_EDGE_TLS_KEY: tlsPath('P0_TLS_KEY_FILE'),
        },
    });
}

async function verifyEdgeRoutes() {
    const get = path => fetch(appOrigin + path, { redirect: 'error', signal: AbortSignal.timeout(5000) });
    const web = await get('/workspaces');
    assert.equal(web.status, 200);
    assert.equal(web.headers.get('cache-control'), 'no-cache');
    assert.equal(web.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(web.headers.get('x-content-type-options'), 'nosniff');
    const policy = web.headers.get('content-security-policy');
    assert.match(policy, /frame-ancestors 'none'/);
    assert.match(policy, /(?:^|; )script-src 'self'(?:;|$)/);
    assert.match(policy, /(?:^|; )worker-src 'self'(?:;|$)/);
    const script = (await web.text()).match(/href="(\/assets\/schema-validation-[^\s"]+\.js)"/)?.[1];
    assert.ok(script, 'Expected the preloaded validator asset');
    const gzip = await fetch(appOrigin + script, { headers: { 'Accept-Encoding': 'gzip' }, signal: AbortSignal.timeout(5000) });
    assert.equal(gzip.status, 200);
    assert.equal(gzip.headers.get('content-encoding'), 'gzip');
    await gzip.arrayBuffer();
    for (const path of ['/assets/absent.js', '/assets/absent', '/absent.js', '/api/v2/absent', '/api/absent']) {
        const response = await get(path);
        assert.equal(response.status, 404, path);
        assert.doesNotMatch(response.headers.get('content-type') ?? '', /text\/html/i, path);
        await response.arrayBuffer();
    }
}

async function verifyScriptPolicy(page) {
    const url = appOrigin + '/csp-test-probe.js';
    await page.route(url, route => route.fulfill({ contentType: 'application/javascript', body: `
        const target = document.documentElement.dataset;
        target.cspExternalProbe = 'executed';
        try { new Function('return true')(); } catch (error) { target.cspEvalError = error.name; }
    ` }));
    try {
        const result = await page.evaluate(async src => {
            const { document, setTimeout } = globalThis;
            const violations = new Set();
            const record = event => violations.add(event.blockedURI);
            document.addEventListener('securitypolicyviolation', record);
            const inline = document.createElement('script');
            inline.textContent = 'document.documentElement.dataset.cspInlineProbe = "executed"';
            const external = document.createElement('script');
            external.src = src;
            document.head.append(inline, external);
            for (let i = 0; i < 50 && !(violations.has('inline') && violations.has('eval')); i++) {
                await new Promise(resolve => setTimeout(resolve, 20));
            }
            document.removeEventListener('securitypolicyviolation', record);
            inline.remove();
            external.remove();
            const { cspInlineProbe, cspExternalProbe, cspEvalError } = document.documentElement.dataset;
            return { inlineCodeBlocked: cspInlineProbe === undefined, externalLoaded: cspExternalProbe === 'executed',
                evalError: cspEvalError ?? null, inlineViolation: violations.has('inline'), evalViolation: violations.has('eval') };
        }, url);
        const expected = { inlineCodeBlocked: true, externalLoaded: true, evalError: 'EvalError', inlineViolation: true, evalViolation: true };
        if (JSON.stringify(result) !== JSON.stringify(expected)) console.error('Script policy probe: ' + JSON.stringify(result));
        assert.deepEqual(result, expected);
    } finally {
        await page.unroute(url);
    }
    console.log('Firefox enforced same-origin scripts, blocked inline and dynamic JavaScript, and completed the app flow without CSP violations.');
}

async function verifyEdgeErrorLog(api) {
    await closeService(api);
    const marker = randomUUID();
    const response = await fetch(redirectUri + '?code=' + marker + '&state=' + marker, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 502);
    await response.arrayBuffer();
    for (let i = 0; i < 20 && !logs.join('').includes('"status":502'); i++) await delay(50);
    const errorLog = logs.join('');
    assert.match(errorLog, /"status":502/);
    assert.ok(!errorLog.includes(marker), 'Edge error log exposed the synthetic callback value');
    console.log('Caddy kept web and API routing separate, returned 502 during upstream outage and redacted callback query values.');
}

async function available(url) {
    for (let i = 0; i < 80; i++) {
        const stopped = [...services].find(([service]) => service.exitCode !== null);
        if (stopped) throw new Error(stopped[1] + ' exited with status ' + stopped[0].exitCode);
        const response = await fetch(url, { signal: AbortSignal.timeout(1000) }).catch(() => undefined);
        if (response?.ok) {
            await response.text();
            return;
        }
        await delay(250);
    }
    throw new Error('Local HTTPS dependency unavailable at ' + new URL(url).pathname);
}

async function closeService(service) {
    services.delete(service);
    if (service.exitCode !== null || service.signalCode !== null) return;
    const exited = once(service, 'exit');
    service.kill();
    await exited;
}

async function installedRelease() {
    if (process.argv[2] !== '--release') return undefined;
    const [, , , directory, manifestHash] = process.argv;
    assert.ok(directory && /^[a-f0-9]{64}$/.test(manifestHash ?? ''), 'Provide an extracted release and its verified manifest checksum');
    const targets = postgresTargets(process.env, true);
    assertFixtureDatabase(targets.runtime);
    redisTarget(process.env, true);
    const root = resolve(directory);
    const { stdout } = await run(process.execPath, ['scripts/package-release.mjs', '--verify', root, '--installed']);
    assert.equal(JSON.parse(stdout).manifestSha256, manifestHash);
    return { root, manifestHash, runtime: join(root, 'BotSalesAI_Backend') };
}

function verifyWorkerManifest(release) {
    assert.ok(logs.join('').includes('"releaseManifestSha256":"' + release.manifestHash + '"'),
        'Started worker must report the verified release');
}

async function verifyReleaseExport() {
    const db = createDatabaseClient(readDatabaseUrl(process.env));
    const sessions = [];
    try {
        for (const actor of ['p0-editor', 'p0-editor-b']) sessions.push(await fixtureSession(db, actor));
        const [owner, foreign] = sessions;
        const request = (path, init = {}, actor = owner) => fetch(appOrigin + path, {
            ...init, headers: { ...init.headers, cookie: actor.cookie }, redirect: 'error', signal: AbortSignal.timeout(5000),
        });
        const session = await request('/api/v2/session');
        assert.equal(session.status, 200);
        const { data: { csrfToken } } = await session.json();
        const fixture = fixtureShops[0];
        const shop = '/api/v2/shops/' + fixture.id;
        const now = new Date();
        const payload = { reportType: 'profit_loss', format: 'csv', timezone: fixture.timezone,
            from: new Date(now.getTime() - 86400000).toISOString(), to: now.toISOString(), snapshotAsOf: now.toISOString() };
        const response = await request(shop + '/exports', {
            method: 'POST', body: JSON.stringify(payload), headers: { origin: appOrigin,
                'content-type': 'application/json', 'x-csrf-token': csrfToken, 'idempotency-key': randomUUID() },
        });
        assert.equal(response.status, 202);
        const { data: queued } = await response.json();
        assert.equal(queued.status, 'queued');
        const deadline = Date.now() + 20000;
        while (Date.now() < deadline) {
            const poll = await request(shop + '/jobs/' + queued.id);
            assert.equal(poll.status, 200);
            const { data: job } = await poll.json();
            if (job.status === 'succeeded') {
                assert.ok(job.downloadUrl?.startsWith(shop + '/uploads/'));
                const download = await request(job.downloadUrl);
                assert.equal(download.status, 200);
                assert.match(download.headers.get('content-type') ?? '', /text\/csv/);
                assert.match(await download.text(), /snapshot_captured_at.*source_view_as_of/);
                const denied = await request(job.downloadUrl, {}, foreign);
                assert.equal(denied.status, 404);
                await denied.body?.cancel();
                return { accepted: 202, status: job.status, authorizedDownload: 200, otherShopDownload: 404 };
            }
            assert.ok(['queued', 'running'].includes(job.status), 'Packaged worker did not complete the export');
            await delay(200);
        }
        throw new Error('Packaged worker export timed out');
    } finally {
        try {
            await db.session.updateMany({ where: { id: { in: sessions.map(session => session.id) } }, data: { revokedAt: new Date() } });
        } finally { await db.$disconnect(); }
    }
}

async function waitForStoredUploads(page) {
    const connection = readDatabaseUrl(process.env);
    assertFixtureDatabase(connection);
    await page.route(appOrigin + '/api/v2/shops/*/uploads', async route => {
        if (route.request().method() !== 'POST') return route.continue();
        const response = await route.fetch();
        if (response.status() !== 201) return route.fulfill({ response });
        const { data: file } = await response.json();
        if (file.status !== 'ready') return route.fulfill({ response });
        const db = createDatabaseClient(connection);
        try {
            const deadline = Date.now() + 8_000;
            while (Date.now() < deadline) {
                const state = await db.fileStorage.findUnique({
                    where: { shopId_fileId: { shopId: file.shopId, fileId: file.id } },
                    select: { state: true, file: { select: { blob: { select: { fileId: true } } } } },
                });
                if (state?.state === 'stored' && !state.file.blob) {
                    console.log('Fixture upload read path changed to private object storage: ' + file.purpose);
                    return await route.fulfill({ response });
                }
                await delay(100);
            }
            throw new Error('Fixture upload did not move to private object storage');
        } finally {
            await db.$disconnect();
        }
    });
}

async function smoke() {
    if (!httpOnly) assert.ok(process.env.P0_FIREFOX_TRUST_PROFILE, 'Use a Firefox fixture profile that trusts your local CA');
    assert.equal(process.env.APP_ORIGIN, appOrigin);
    if (pilot) {
        assert.deepEqual(process.argv.slice(2), ['--pilot']);
        configureLocalPilot(process.env);
    }
    const release = await installedRelease();
    if (httpOnly) assert.ok(release && process.argv.length === 6 && process.argv[5] === '--http-only',
        'Use --release <directory> <manifest-sha256> --http-only');
    const edge = process.env.BOTSALES_P0_CADDY_EXE;
    assert.ok(!edge || release, 'Caddy requires an installed release');
    assert.ok(!metaInbound || (release && edge), 'Meta ingress smoke requires an installed release behind Caddy');
    assert.ok(!openAiModelCheck || (release && edge), 'OpenAI model smoke requires an installed release behind Caddy');
    assert.ok(!(webPush || telegram) || (release && edge), 'Notification smoke requires an installed release behind Caddy');
    const meta = metaInbound ? configureMetaInboundFixture(process.env, metaReply) : undefined;
    const openAiFixture = openAiModelCheck ? configureOpenAiBrowserFixture(process.env) : undefined;
    const pushSettings = webPush ? pushConfigEnv() : undefined;
    if (pushSettings) Object.assign(process.env, pushSettings);
    const telegramFixture = telegram ? await configureTelegramBrowserFixture(process.env) : undefined;
    process.env.API_BIND = '127.0.0.1';
    process.env.API_PORT = '3000';
    process.env.API_PROXY_TARGET = 'http://127.0.0.1:3000';
    if (fulfillment) process.env.NOTIFICATION_FIXTURE_ADAPTER = '1';
    const manualSupplier = manualProcurement ? await provisionManualSupplier() : undefined;
    if (manualProcurement) delete process.env.PROCUREMENT_FIXTURE_ADAPTER;
    else if (procurement) process.env.PROCUREMENT_FIXTURE_ADAPTER = '1';
    if (inbox) process.env.MESSENGER_FIXTURE_ADAPTER = '1';
    if (ai || operations) process.env.AI_FIXTURE_ADAPTER = '1';
    if (privacy) {
        delete process.env.P0_STEP_UP_PASSWORD;
        process.env.PRIVACY_FIXTURE_ACTIONS = '1';
    }
    const base = realpathSync(tmpdir());
    profile = mkdtempSync(join(base, 'botsales-be04-firefox-'));
    if (!httpOnly) copyFileSync(join(process.env.P0_FIREFOX_TRUST_PROFILE, 'cert9.db'), join(profile, 'cert9.db'));

    const runtimeKeys = new Set(['SystemRoot', 'DATABASE_URL', 'REDIS_URL', 'APP_ORIGIN', 'OIDC_ISSUER', 'OIDC_CLIENT_ID', 'OIDC_CLIENT_SECRET',
        'OIDC_REDIRECT_URI', 'AUTH_SIGNING_KEY', 'API_BIND', 'API_PORT', 'NODE_EXTRA_CA_CERTS']);
    const runtimeEnv = httpOnly ? Object.fromEntries(Object.entries(process.env).filter(([key]) => runtimeKeys.has(key))) : process.env;
    const runtime = release ? { cwd: release.runtime, env: { ...runtimeEnv, NODE_ENV: 'production' } } : {};
    const startApi = () => start('apps/api/dist/main.js', [], runtime);
    if (!httpOnly) start('infra/p0/oidc/idp.mjs');
    let api = startApi();
    if (edge) startEdge(edge, release.root);
    else start('infra/p0/oidc/dev-live.mjs', release ? [release.root] : []);
    const liveEvents = Boolean(pilot || release || catalog || imports || inventory || orders || finance || fulfillment || promotion || procurement ||
        reconciliation || inbox || ai || operations || privacy) && Boolean(process.env.REDIS_URL);
    const transports = [metaReply && '../inbox/meta-reply-transport.mjs', openAiModelCheck && '../ai/openai-probe-transport.mjs', webPush && '../notifications/web-push-transport.mjs',
        telegram && '../notifications/telegram-transport.mjs'].filter(Boolean);
    assert.ok(transports.length <= 1, 'Run each external provider smoke separately');
    if (transports.length) {
        const transport = new URL(transports[0], import.meta.url).href;
        startProcess(process.execPath, ['--import', transport, 'apps/worker/src/main.mjs'], 'apps/worker/src/main.mjs', runtime);
    } else if (liveEvents) start('apps/worker/src/main.mjs', [], runtime);
    if (!httpOnly) await available(issuer + '/.well-known/openid-configuration');
    await available(appOrigin + '/api/v2/health/ready');
    if (edge) await verifyEdgeRoutes();
    if (release) {
        const { stdout } = await run(process.execPath,
            ['scripts/check-release-runtime.mjs', join(release.root, 'release-manifest.json'), release.manifestHash, '--fixture'], runtime);
        if (httpOnly) {
            const exportJob = await verifyReleaseExport();
            verifyWorkerManifest(release);
            console.log(JSON.stringify({ ...JSON.parse(stdout), status: 'LOCAL_CANDIDATE_SMOKE_PASSED',
                workerManifestSha256: release.manifestHash, exportJob }));
            return;
        }
        console.log(stdout.trim());
    }
    browser = await firefox.launchPersistentContext(profile, { headless: true });
    const outside = [];
    if (pilot) await browser.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin === appOrigin || url.origin === issuer) return route.continue();
        outside.push(url.origin);
        return route.abort();
    });
    const page = browser.pages()[0] ?? await browser.newPage();
    if (process.env.OBJECT_STORE_FIXTURE_ADAPTER === '1') await waitForStoredUploads(page);
    page.setDefaultTimeout(20000);
    const violations = [];
    if (edge) {
        await page.exposeFunction('recordAppPolicyViolation', (directive, blocked, source) => violations.push({ directive, blocked, source }));
        await page.addInitScript(origin => {
            if (globalThis.location.origin !== origin) return;
            globalThis.document.addEventListener('securitypolicyviolation', event => {
                const kind = /^(inline|eval|wasm-eval|data|blob)$/.test(event.blockedURI) ? event.blockedURI : 'resource';
                const source = event.sourceFile.startsWith(origin + '/assets/') ? event.sourceFile.match(/\/assets\/([\w.-]+\.js)$/)?.[1] : undefined;
                void globalThis.recordAppPolicyViolation(event.effectiveDirective, kind, source);
            });
        }, appOrigin);
    }
    if (liveEvents) await page.addInitScript(() => {
        globalThis.receivedCommandEvents = [];
        const NativeEventSource = globalThis.EventSource;
        globalThis.EventSource = class extends NativeEventSource {
            constructor(...args) {
                super(...args);
                this.addEventListener('message', event => {
                    const data = JSON.parse(event.data);
                    if (data.type === 'command.updated') globalThis.receivedCommandEvents.push(data.resourceId);
                });
            }
        };
    });
    const shopFlow = pilot || workspace || catalog || imports || inventory || orders || finance || fulfillment || promotion || procurement;
    const returnPath = shopFlow ? '/workspaces' : '/login';
    await page.goto(appOrigin + '/login?returnTo=' + encodeURIComponent(returnPath));
    const signIn = page.getByRole('button', { name: 'Đăng nhập bằng tài khoản công ty' });
    await signIn.waitFor();
    const [callback, session] = await Promise.all([
        page.waitForResponse(response => response.url().startsWith(redirectUri + '?') && response.status() === 302),
        page.waitForResponse(response => response.url() === appOrigin + '/api/v2/session' && response.status() === 200),
        signIn.click(),
    ]);
    assert.equal(await callback.headerValue('location'), returnPath);
    const landing = shopFlow ? page.getByRole('heading', { name: 'Chọn cửa hàng', exact: true })
        : page.getByRole('link', { name: 'Tiếp tục vào cửa hàng' });
    await landing.waitFor();
    if (measureBrowser) await reportBrowserTiming(page, 'authenticated-landing');
    assert.equal(new URL(page.url()).pathname, returnPath);
    const sessionBody = await session.json();
    assert.deepEqual(sessionBody.data.memberships.map(member => member.roles), pilot ? [['owner'], ['owner']] : [['owner']]);
    const cookie = (await browser.cookies(appOrigin)).find(item => item.name === '__Host-bs_session');
    assert.ok(cookie?.secure && cookie.httpOnly);
    assert.equal(cookie.domain, 'localhost');
    assert.equal(cookie.path, '/');
    assert.equal(cookie.sameSite, 'Lax');
    assert.equal((await browser.cookies(issuer)).some(item => item.name === '__Host-bs_session'), false);

    const nextSession = page.waitForResponse(response => response.url() === appOrigin + '/api/v2/session' && response.status() === 200);
    await page.reload();
    await nextSession;
    await landing.waitFor();
    if (measureBrowser) await reportBrowserTiming(page, 'authenticated-reload');
    const pilotShops = pilot ? await verifyLocalPilot(page, sessionBody.data) : undefined;
    if (workspace) {
        await verifyWorkspaceSelection(browser, page, cookie);
        await verifyCommandRecovery(page);
        await page.goto(appOrigin + returnPath);
        await landing.waitFor();
    }
    if (catalog) {
        await verifyCatalogFlow(page, async () => {
            await closeService(api);
            api = startApi();
            await available(appOrigin + '/api/v2/health/ready');
        }, liveEvents);
    }
    if (imports) {
        assert.ok(liveEvents, 'Import browser flow requires a local Redis fixture');
        await verifyImportFlow(page, process.argv.includes('--before'));
    }
    if (inventory) await verifyInventoryFlow(page, sessionBody.data.user.id, sessionBody.data.csrfToken, inventoryDocuments);
    if (fulfillment) assert.ok(liveEvents, 'Fulfillment browser flow requires a local Redis fixture');
    const messenger = meta ? { fixture: meta, conversation: await verifyMetaInboundFlow(page, meta, measureBrowser ? reportBrowserTiming : undefined) } : undefined;
    if (orders || fulfillment || promotion) await verifyOrdersFlow(page, sessionBody.data.user.id, sessionBody.data.csrfToken,
        { fulfillment, promotion, messenger, runtime: release?.runtime });
    if (webPush) await verifyWebPushFlow(page, sessionBody.data.csrfToken);
    if (telegramFixture) await verifyTelegramBrowserFlow(page, telegramFixture);
    if (finance) await verifyFinanceFlow(page, sessionBody.data.csrfToken);
    if (reconciliation) {
        assert.ok(liveEvents, 'Reconciliation browser flow requires a local Redis fixture');
        await verifyReconciliationFlow(page, sessionBody.data.csrfToken);
    }
    if (inbox) {
        assert.ok(liveEvents, 'Inbox browser flow requires a local Redis fixture');
        await verifyInboxFlow(page, sessionBody.data.csrfToken);
    }
    if (ai) {
        assert.ok(liveEvents, 'AI browser flow requires a local Redis fixture');
        await verifyAiFlow(page);
    }
    if (openAiFixture) await verifyOpenAiConnectionFlow(page, openAiFixture);
    if (operations) {
        assert.ok(liveEvents, 'Operations browser flow requires a local Redis fixture');
        await verifyOperationsFlow(page, process.argv.includes('--before'));
    }
    if (procurement) {
        assert.ok(liveEvents, 'Procurement browser flow requires a local Redis fixture');
        await verifyProcurementFlow(page, sessionBody.data, manualSupplier, release?.runtime);
    }
    if (privacy) {
        assert.ok(liveEvents, 'Privacy browser flow requires a local Redis fixture');
        await verifyPrivacyFlow(page, cookie);
    }
    const afterLogout = await page.evaluate(async () => {
        const current = await fetch('/api/v2/session').then(response => response.json());
        const logout = await fetch('/api/v2/auth/logout', {
            method: 'POST',
            headers: { 'X-CSRF-Token': current.data.csrfToken },
        });
        const denied = await fetch('/api/v2/session');
        return { logout: logout.status, session: denied.status };
    });
    assert.deepEqual(afterLogout, { logout: 204, session: 401 });
    if (edge) {
        if (violations.length) console.error('Unexpected application CSP violations: ' + JSON.stringify(violations));
        assert.deepEqual(violations, [], 'Application emitted unexpected CSP violations');
        await verifyScriptPolicy(page);
        await verifyEdgeErrorLog(api);
    }
    const log = logs.join('');
    if (release) verifyWorkerManifest(release);
    if (metaReply) assert.equal([...log.matchAll(/Meta reply fixture accepted one POST\./g)].length, 1);
    if (openAiFixture) assert.equal([...log.matchAll(/OpenAI model fixture accepted one GET\./g)].length, 1);
    if (webPush) assert.equal([...log.matchAll(/Web Push fixture accepted one encrypted POST\./g)].length, 1);
    if (telegram) assert.equal([...log.matchAll(/Telegram fixture accepted one private POST\./g)].length, 1);
    const callbackQuery = new URL(callback.url()).searchParams;
    for (const secret of [cookie.value, sessionBody.data.csrfToken, sessionBody.data.user.email,
        process.env.OIDC_CLIENT_SECRET, callbackQuery.get('code'), callbackQuery.get('state'),
        ...(meta ? [meta.appSecret, meta.verifyToken] : []), ...(meta?.accessToken ? [meta.accessToken] : []),
        ...(openAiFixture ? [openAiFixture.secret, openAiFixture.key, openAiFixture.projectId] : []),
        ...(pushSettings ? [pushSettings.WEB_PUSH_PRIVATE_KEY, pushSettings.WEB_PUSH_ENCRYPTION_KEY] : []),
        ...(telegramFixture ? [telegramFixture.settings.TELEGRAM_BOT_TOKEN, telegramFixture.settings.TELEGRAM_WEBHOOK_SECRET,
            telegramFixture.settings.TELEGRAM_ENCRYPTION_KEY] : [])]) {
        assert.ok(secret && !log.includes(secret), 'Sensitive authentication value appeared in process logs');
    }
    assert.doesNotMatch(log, /\b(access_token|id_token|refresh_token|code_verifier|client_secret)\b/i);
    console.log('Firefox ' + (edge ? 'packaged web via Caddy' : release ? 'packaged web' : 'dev:live') + ' on trusted HTTPS: callback 302, session 200 after reload, logout 204, session 401.');
    console.log('Cookie attributes, separate IdP hostname and process log redaction verified.');
    if (pilot) {
        assert.equal(outside.length, 0, 'The pilot browser attempted an external request');
        console.log(JSON.stringify({ status: 'LOCAL_PILOT_BROWSER_PASSED', scope: 'fixture',
            shops: pilotShops, callback: 302, reload: 200, ...afterLogout, externalBrowserRequests: outside.length }));
    }
}

try {
    await smoke();
} catch (error) {
    console.error(httpOnly ? 'Packaged HTTPS smoke failed: ' + error.name + ' (check local TLS and service ports)'
        : 'Firefox HTTPS smoke failed: ' + error.name + ' (check local TLS, browser and service ports)');
    if (/^(apps\/|infra\/|Local HTTPS dependency unavailable)/.test(error.message)) console.error(error.message);
    const browserCase = error.stack?.split('\n').find(line => /browser-(cases|smoke)\.mjs:\d+:\d+/.test(line));
    if (browserCase) console.error(browserCase.trim());
    if ((pilot || fulfillment || promotion || inventoryDocuments || procurement || reconciliation || inbox || metaInbound || ai || operations || privacy || webPush || telegram) && (browserCase?.includes('browser-cases.mjs') || pilot)) {
        console.error(error.message.split('\n')[0]);
    }
    process.exitCode = 1;
} finally {
    await browser?.close();
    await Promise.all([...services.keys()].map(closeService));
    if (profile && dirname(profile) === realpathSync(tmpdir())) rmSync(profile, { recursive: true, force: true });
}
