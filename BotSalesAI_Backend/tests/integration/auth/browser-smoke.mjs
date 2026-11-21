import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { copyFileSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { appOrigin, issuer, redirectUri } from '../../../infra/p0/oidc/tls.mjs';
import { verifyCatalogFlow, verifyImportFlow } from '../catalog/browser-cases.mjs';
import { verifyFinanceFlow } from '../finance/browser-cases.mjs';
import { verifyInventoryFlow } from '../inventory/browser-cases.mjs';
import { verifyOrdersFlow } from '../orders/browser-cases.mjs';
import { verifyCommandRecovery, verifyWorkspaceSelection } from '../workspace/browser-cases.mjs';

const require = createRequire(new URL('../../../../BotSalesAI_Frontend/package.json', import.meta.url));
const { firefox } = require('playwright');
const services = new Set();
const logs = [];
let browser;
let profile;
const workspace = process.argv.includes('--workspace');
const catalog = process.argv.includes('--catalog');
const imports = process.argv.includes('--imports');
const inventory = process.argv.includes('--inventory');
const orders = process.argv.includes('--orders');
const finance = process.argv.includes('--finance');

function start(script) {
    const child = spawn(process.execPath, [script], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    child.stdout.on('data', chunk => logs.push(String(chunk)));
    child.stderr.on('data', chunk => logs.push(String(chunk)));
    services.add(child);
    return child;
}

async function available(url) {
    for (let i = 0; i < 80; i++) {
        if ([...services].some(service => service.exitCode !== null)) throw new Error('A local service exited');
        const response = await fetch(url, { signal: AbortSignal.timeout(1000) }).catch(() => undefined);
        if (response?.ok) {
            await response.text();
            return;
        }
        await delay(250);
    }
    throw new Error('A local HTTPS flow dependency did not become ready');
}

async function closeService(service) {
    services.delete(service);
    if (service.exitCode !== null || service.signalCode !== null) return;
    const exited = once(service, 'exit');
    service.kill();
    await exited;
}

async function smoke() {
    assert.ok(process.env.P0_FIREFOX_TRUST_PROFILE, 'Use a Firefox fixture profile that trusts your local CA');
    assert.equal(process.env.APP_ORIGIN, appOrigin);
    process.env.API_BIND = '127.0.0.1';
    process.env.API_PORT = '3000';
    process.env.API_PROXY_TARGET = 'http://127.0.0.1:3000';
    const base = realpathSync(tmpdir());
    profile = mkdtempSync(join(base, 'botsales-be04-firefox-'));
    copyFileSync(join(process.env.P0_FIREFOX_TRUST_PROFILE, 'cert9.db'), join(profile, 'cert9.db'));

    start('infra/p0/oidc/idp.mjs');
    let api = start('apps/api/dist/main.js');
    start('infra/p0/oidc/dev-live.mjs');
    const liveEvents = (catalog || imports || inventory || orders || finance) && Boolean(process.env.REDIS_URL);
    if (liveEvents) start('apps/worker/src/main.mjs');
    await available(issuer + '/.well-known/openid-configuration');
    await available(appOrigin + '/api/v2/health/ready');
    browser = await firefox.launchPersistentContext(profile, { headless: true });
    const page = browser.pages()[0] ?? await browser.newPage();
    page.setDefaultTimeout(20000);
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
    const shopFlow = workspace || catalog || imports || inventory || orders || finance;
    const returnPath = shopFlow ? '/workspaces' : '/login';
    await page.goto(appOrigin + '/login?returnTo=' + encodeURIComponent(returnPath));
    const callbackEvent = page.waitForResponse(response => response.url().startsWith(redirectUri + '?') && response.status() === 302);
    const sessionEvent = page.waitForResponse(response => response.url() === appOrigin + '/api/v2/session' && response.status() === 200);
    await page.getByRole('button', { name: 'Đăng nhập bằng tài khoản công ty' }).click();
    const [callback, session] = await Promise.all([callbackEvent, sessionEvent]);
    assert.equal(await callback.headerValue('location'), returnPath);
    const landing = shopFlow ? page.getByRole('heading', { name: 'Chọn cửa hàng', exact: true })
        : page.getByRole('link', { name: 'Tiếp tục vào cửa hàng' });
    await landing.waitFor();
    assert.equal(new URL(page.url()).pathname, returnPath);
    const sessionBody = await session.json();
    assert.deepEqual(sessionBody.data.memberships.map(member => member.roles), [['owner']]);
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
    if (workspace) {
        await verifyWorkspaceSelection(browser, page, cookie);
        await verifyCommandRecovery(page);
        await page.goto(appOrigin + returnPath);
        await landing.waitFor();
    }
    if (catalog) {
        await verifyCatalogFlow(page, async () => {
            await closeService(api);
            api = start('apps/api/dist/main.js');
            await available(appOrigin + '/api/v2/health/ready');
        }, liveEvents);
    }
    if (imports) {
        assert.ok(liveEvents, 'Import browser flow requires a local Redis fixture');
        await verifyImportFlow(page, process.argv.includes('--before'));
    }
    if (inventory) await verifyInventoryFlow(page, sessionBody.data.user.id, sessionBody.data.csrfToken);
    if (orders) await verifyOrdersFlow(page, sessionBody.data.user.id, sessionBody.data.csrfToken);
    if (finance) await verifyFinanceFlow(page, sessionBody.data.csrfToken);
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
    const log = logs.join('');
    const callbackQuery = new URL(callback.url()).searchParams;
    for (const secret of [cookie.value, sessionBody.data.csrfToken, sessionBody.data.user.email,
        process.env.OIDC_CLIENT_SECRET, callbackQuery.get('code'), callbackQuery.get('state')]) {
        assert.ok(secret && !log.includes(secret), 'Sensitive authentication value appeared in process logs');
    }
    assert.doesNotMatch(log, /\b(access_token|id_token|refresh_token|code_verifier|client_secret)\b/i);
    console.log('Firefox dev:live on trusted HTTPS: callback 302, session 200 after reload, logout 204, session 401.');
    console.log('Cookie attributes, separate IdP hostname and process log redaction verified.');
}

try {
    await smoke();
} catch (error) {
    console.error('Firefox HTTPS smoke failed: ' + error.name + ' (check local TLS, browser and service ports)');
    process.exitCode = 1;
} finally {
    await browser?.close();
    await Promise.all([...services].map(closeService));
    if (profile && dirname(profile) === realpathSync(tmpdir())) rmSync(profile, { recursive: true, force: true });
}
