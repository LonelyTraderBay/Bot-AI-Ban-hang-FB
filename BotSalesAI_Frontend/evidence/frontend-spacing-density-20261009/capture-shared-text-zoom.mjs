import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { evidenceRunId } from '../../tests/evidence-run-id.mjs';
import { ownedLabelGeometry } from '../../tests/design/owned-label-geometry.mjs';
import { captureNativeLabelRoutes } from './native-label-route-probes.mjs';
import { startDemoServer } from '../../tests/session/demo-server.mjs';

const root = process.cwd();
const outputPath = path.join(root, `evidence/frontend-spacing-density-20261009/native-text-only-200-current-${evidenceRunId}.json`);
const runnerPath = path.relative(root, fileURLToPath(import.meta.url)).replaceAll('\\', '/');
const firefoxPath = 'C:/Users/Joker-PC/AppData/Local/ms-playwright/firefox-1543/firefox/firefox.exe';
const sourceInputs = ["apps/web/src/modules/inbox/conversation-components.tsx","tests/fe016.spec.ts","packages/contracts/src/routes.json","apps/web/src/mocks/seed.json","evidence/frontend-spacing-density-20261009/native-label-route-probes.mjs","tests/design/owned-label-geometry.mjs","apps/web/vite.config.ts","tests/session/demo-worker-startup.spec.ts","apps/web/src/shared/ui/components.tsx","apps/web/src/shared/ui/composition.tsx","apps/web/src/shared/ui/theme.ts","apps/web/src/shared/ui/layout.ts","apps/web/src/app/Shell.tsx","apps/web/src/app/tokens.css","apps/web/src/modules/catalog/index.tsx","tests/ui-component-layout.spec.ts","apps/web/src/modules/inbox/index.tsx","apps/web/src/modules/dashboard/index.tsx","../botsales-kit/contracts/route-manifest.json","tests/ui-toolbar-layout.spec.ts","tests/ui-dashboard-layout.spec.ts","evidence/frontend-spacing-density-20261009/capture-shared-text-zoom.mjs","apps/web/src/modules/integrations/index.tsx","apps/web/src/modules/knowledge/index.tsx","tests/ui-density-layout.spec.ts"];
const scenarios = [{"id":"inbox-detail-desktop","route":"/s/shop-demo/inbox/cv1","targets":["[data-testid=\"inbox-thread\"]"],"focus":"main textarea","viewport":{"width":1600,"height":900}},{"id":"inbox-list","route":"/s/shop-demo/inbox","targets":["main form button[type=\"submit\"]","[aria-label=\"Bộ lọc hội thoại\"]"],"focus":"main input[placeholder]","viewport":{"width":390,"height":800}},{"id":"inbox-detail","route":"/s/shop-demo/inbox/cv1","targets":["[data-testid=\"inbox-thread\"]"],"focus":"main textarea","viewport":{"width":390,"height":800}},{"id":"dashboard","route":"/s/shop-demo/overview","targets":["main a[href=\"/s/shop-demo/operations\"]","main a[href=\"/s/shop-demo/orders/new\"]"],"focus":"main a[href=\"/s/shop-demo/operations\"]","viewport":{"width":390,"height":800}},{"id":"inbox-list-desktop","route":"/s/shop-demo/inbox","targets":["main form button[type=\"submit\"]","[aria-label=\"Bộ lọc hội thoại\"]"],"focus":"main input[placeholder]","viewport":{"width":1280,"height":800}},{"id":"products","route":"/s/shop-demo/products","targets":["main form button[type=\"submit\"]"],"focus":"main input[placeholder]","viewport":{"width":390,"height":800}},{"id":"ai","route":"/s/shop-demo/integrations/ai","targets":["main [data-ui-detail-line]"],"focus":"main button","viewport":{"width":390,"height":800}},{"id":"category-dialog","route":"/s/shop-demo/categories","targets":["[role=\"dialog\"] .MuiDialogContent-root"],"focus":"[role=\"dialog\"] input","open":"Thêm danh mục","viewport":{"width":390,"height":800}},{"id":"reading","route":"/s/shop-demo/knowledge/k1","targets":["main [data-ui-density=\"comfortable\"]"],"focus":"main [data-ui-density=\"comfortable\"] button","viewport":{"width":390,"height":800}}];

function sha256(file) {
    return createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
}

function createExtension(extensionPath) {
    fs.mkdirSync(extensionPath, { recursive: true });
    fs.writeFileSync(path.join(extensionPath, 'manifest.json'), JSON.stringify({
        manifest_version: 2,
        name: 'UI028 W30 native text-only measurement',
        version: '1.0.0',
        browser_specific_settings: { gecko: { id: 'ui028-w30-text-only@example.invalid' } },
        permissions: ['tabs', 'browserSettings'],
        content_scripts: [{ matches: ['http://127.0.0.1/*'], js: ['bridge.js'], run_at: 'document_start' }],
        background: { scripts: ['background.js'] },
    }, null, 2));
    fs.writeFileSync(path.join(extensionPath, 'background.js'), `
browser.runtime.onMessage.addListener(async (request, sender) => {
  if (request.action !== 'setNativeTextZoom' || !sender.tab?.id) return undefined;
  const fullPageSet = await browser.browserSettings.zoomFullPage.set({ value: false });
  const siteSpecificSet = await browser.browserSettings.zoomSiteSpecific.set({ value: false });
  await browser.tabs.setZoom(sender.tab.id, request.factor);
  return {
    zoomFullPage: await browser.browserSettings.zoomFullPage.get({}),
    zoomSiteSpecific: await browser.browserSettings.zoomSiteSpecific.get({}),
    zoomFactor: await browser.tabs.getZoom(sender.tab.id),
    fullPageSet,
    siteSpecificSet,
  };
});
`);
    fs.writeFileSync(path.join(extensionPath, 'bridge.js'), `
window.addEventListener('message', async event => {
  const request = event.data;
  if (event.source !== window || request?.source !== 'w30-native-text-only' || request.action !== 'set') return;
  try {
    const result = await browser.runtime.sendMessage({ action: 'setNativeTextZoom', factor: request.factor });
    window.postMessage({ source: 'w30-native-text-only-result', id: request.id, result }, '*');
  } catch (error) {
    window.postMessage({ source: 'w30-native-text-only-result', id: request.id, error: String(error) }, '*');
  }
});
`);
}

function createBidiClient(socket) {
    let nextId = 0;
    const pending = new Map();
    socket.addEventListener('message', event => {
        const message = JSON.parse(String(event.data));
        if (!message.id || !pending.has(message.id)) return;
        const entry = pending.get(message.id);
        pending.delete(message.id);
        clearTimeout(entry.timer);
        if (message.type === 'error') entry.reject(new Error(`${entry.method}: ${message.error}: ${message.message}`));
        else entry.resolve(message.result);
    });
    return (method, params = {}, timeoutMs = 15_000) => new Promise((resolve, reject) => {
        const id = ++nextId;
        const timer = setTimeout(() => {
            pending.delete(id);
            reject(new Error(`Timed out waiting for BiDi command ${method}.`));
        }, timeoutMs);
        pending.set(id, { method, resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
    });
}

async function waitForWebSocketUrl(process, readOutput) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 30_000) {
        if (process.exitCode !== null) throw new Error(`Firefox exited during startup (${process.exitCode}):\n${readOutput()}`);
        const match = readOutput().match(/WebDriver BiDi listening on (ws:\/\/127\.0\.0\.1:\d+)/);
        if (match) return `${match[1]}/session`;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Firefox BiDi endpoint did not appear within 30 seconds:\n${readOutput()}`);
}

async function evaluateString(send, context, expression, timeoutMs = 15_000) {
    const response = await send('script.evaluate', {
        expression,
        target: { context },
        awaitPromise: true,
        resultOwnership: 'none',
    }, timeoutMs).catch(error => { throw new Error(`${error.message}; evaluation: ${expression.slice(0, 260)}`); });
    if (response.type !== 'success') throw new Error(`Page evaluation failed: ${JSON.stringify(response.exceptionDetails)}`);
    if (response.result?.type !== 'string') throw new Error(`Expected serialized string result: ${JSON.stringify(response)}`);
    return response.result.value;
}

async function evaluateJson(send, context, expression) {
    return JSON.parse(await evaluateString(send, context, `Promise.resolve(${expression}).then(value => JSON.stringify(value))`));
}

async function setNativeZoom(send, context, factor) {
    const id = `w30-${factor}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const expression = `new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for native text zoom extension acknowledgement.')), 10000);
      const listener = event => {
        if (event.data?.source !== 'w30-native-text-only-result' || event.data.id !== ${JSON.stringify(id)}) return;
        clearTimeout(timer);
        removeEventListener('message', listener);
        resolve(JSON.stringify(event.data));
      };
      addEventListener('message', listener);
      postMessage({ source: 'w30-native-text-only', action: 'set', id: ${JSON.stringify(id)}, factor: ${factor} }, '*');
    })`;
    const result = JSON.parse(await evaluateString(send, context, expression, 12_000));
    if (result.error) throw new Error(`Firefox native zoom extension failed: ${result.error}`);
    return result.result;
}

async function prepareScenario(send, context, scenario) {
    if(scenario.open) await evaluateString(send, context, `new Promise((resolve,reject)=>{const start=Date.now();const check=()=>{const button=[...document.querySelectorAll('main button')].find(e=>e.textContent.trim()===${JSON.stringify(scenario.open)});if(button){button.click();resolve('opened-real-dialog');}else if(Date.now()-start>15000)reject(Error('Dialog trigger missing'));else setTimeout(check,50);};check();})`);

    const ready = await evaluateString(send, context, `new Promise((resolve, reject) => {
      const started = Date.now(); const check = () => {
        const target = document.querySelector(${JSON.stringify(scenario.focus)});
        if (target?.getClientRects().length && !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root')) resolve('loaded-real-toolbar');
        else if (Date.now() - started > 15000) reject(new Error('Toolbar did not become ready'));
        else setTimeout(check, 50);
      }; check();
    })`);
    if (scenario.id === 'inbox-detail-desktop') {
        await evaluateString(send, context, `(() => {
          const form=document.querySelector('[data-testid="inbox-thread"] form');
          const checkbox=form.querySelector('input[type="checkbox"]'); if(!checkbox.checked) checkbox.click();
          const textarea=form.querySelector('textarea:not([aria-hidden="true"])');
          const value=Array.from({length:9},(_,index)=>'Dòng nháp native '+(index+1)).join('\\n');
          Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(textarea,value);
          textarea.dispatchEvent(new Event('input',{bubbles:true})); return 'native-text-composer-nine-line-draft';
        })()`);
        await evaluateString(send, context, `new Promise((resolve,reject)=>{const start=Date.now();const check=()=>{
          const button=document.querySelector('[data-testid="inbox-thread"] form button[type="submit"]');
          if(button?.textContent.includes('Lưu ghi chú')&&!button.disabled) resolve('internal-draft-ready');
          else if(Date.now()-start>5000)reject(new Error('Native composer draft is not ready'));else setTimeout(check,50);
        };check();})`);
    }
    return ready;
}

async function measure(send, context, selectors) {
    return evaluateJson(send, context, `(() => {
      const describe = element => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          x: Math.round(rect.x * 100) / 100,
          y: Math.round(rect.y * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
          right: Math.round(rect.right * 100) / 100,
          bottom: Math.round(rect.bottom * 100) / 100,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          scrollHeight: element.scrollHeight,
          clientHeight: element.clientHeight,
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          fontSize: style.fontSize,
          textLength: element.innerText?.length || element.value?.length || 0,
        };
      };
      const targetGeometry = ${JSON.stringify(selectors)}.map(selector => {
        const element = document.querySelector(selector);
        return { selector, found: Boolean(element), ...(element ? describe(element) : {}) };
      });
      const navigationLabelLayout = (() => {
        const link = document.querySelector('[data-w30-long-label="true"]');
        const label = link?.querySelector('.MuiListItemText-primary');
        const item = link?.closest('li');
        const nextItem = item?.nextElementSibling;
        if (!link || !label || !nextItem) return null;
        const linkRect = link.getBoundingClientRect();
        const labelRect = label.getBoundingClientRect();
        const nextRect = nextItem.getBoundingClientRect();
        return {
          labelContainedByLink: labelRect.top >= linkRect.top - 1 && labelRect.bottom <= linkRect.bottom + 1,
          directTextChild: [...link.childNodes].some(node => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())),
          labelFollowingOverlap: Math.max(0, Math.min(labelRect.bottom, nextRect.bottom) - Math.max(labelRect.top, nextRect.top)),
          linkFollowingOverlap: Math.max(0, Math.min(linkRect.bottom, nextRect.bottom) - Math.max(linkRect.top, nextRect.top)),
        };
      })();
      const viewportWidth = document.documentElement.clientWidth;
      const documentWidth = document.documentElement.scrollWidth;
      const textClips = [...document.querySelectorAll('main *, nav *, [role="dialog"] *')]
        .filter(element => {
          if (element.tagName === 'LEGEND') return false;
          const rect = element.getBoundingClientRect();
          if (!rect.width || !rect.height || !element.innerText?.trim()) return false;
          const style = getComputedStyle(element);
          return (['hidden', 'clip'].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 2)
            || (['hidden', 'clip'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 2);
        })
        .slice(0, 30)
        .map(element => ({ tag: element.tagName.toLowerCase(), role: element.getAttribute('role'), text: element.innerText || '', ...describe(element),
          recoveryHref: element.closest('main .MuiList-root a.MuiListItemButton-root')?.getAttribute('href') || null,
          selectId: element.matches('.MuiSelect-select[role="combobox"][aria-haspopup="listbox"]') ? element.id : null,
          textOverflow: getComputedStyle(element).textOverflow, whiteSpace: getComputedStyle(element).whiteSpace }));
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const activeStyle = active ? getComputedStyle(active) : null;
      const activeRect = active?.getBoundingClientRect();
      const dialog = document.querySelector('[role="dialog"]');
      return {
        composerGeometry: (() => {
          const thread = document.querySelector('[data-testid="inbox-thread"]');
          const form = thread?.querySelector('form');
          const messages = document.querySelector('[data-testid="inbox-message-list"]');
          if (!thread || !form || !messages) return null;
          const t=thread.getBoundingClientRect(), f=form.getBoundingClientRect(), m=messages.getBoundingClientRect();
          const button=form.querySelector('button[type="submit"]'), b=button.getBoundingClientRect();
          const body=form.querySelector('[data-testid="inbox-composer-body"]'), bodyRect=body.getBoundingClientRect();
          const textarea=form.querySelector('textarea:not([aria-hidden="true"])');
          const message=messages.querySelector('[data-testid="inbox-message-bubble"] p'), style=getComputedStyle(messages);
          return { threadBottom:t.bottom, composerBottom:f.bottom, messageBottom:m.bottom, composerTop:f.top, scrollHeight:form.scrollHeight, clientHeight:form.clientHeight,
            messageContentHeight:messages.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom), messageLineHeight:message ? parseFloat(getComputedStyle(message).lineHeight) : null,
            bodyBottom:bodyRect.bottom, bodyClientHeight:body.clientHeight, bodyScrollHeight:body.scrollHeight, bodyOverflow:getComputedStyle(body).overflowY,
            textareaLineHeight:parseFloat(getComputedStyle(textarea).lineHeight), buttonHit:document.elementFromPoint(b.left+b.width/2,b.top+b.height/2)?.closest('button')===button,
            draft:textarea.value, buttonFocused:document.activeElement===button, buttonTop:b.top, buttonBottom:b.bottom };
        })(),
        toolbarGeometry: (() => {
    const button = document.querySelector('main form button[type="submit"]');
    if (!button) return null;
    const rect = button.getBoundingClientRect(), style = getComputedStyle(button), range = document.createRange();
    range.selectNodeContents(button);
    const naturalHeight = Math.max(parseFloat(style.minHeight), range.getBoundingClientRect().height + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth));
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return { buttonHeight: rect.height, naturalHeight, centerHitsButton: !!hit && button.contains(hit) };
})(),
        viewport: {
          width: innerWidth,
          height: innerHeight,
          clientWidth: viewportWidth,
          documentWidth,
          pageOverflow: documentWidth - innerWidth,
          scrollHeight: document.documentElement.scrollHeight,
          scrollY,
          devicePixelRatio,
          visualViewportScale: visualViewport.scale,
        },
        targets: targetGeometry,
        navigationLabelLayout,
        ownedLabels: (${ownedLabelGeometry.toString()})(),
        textClips,
        dialog: dialog ? describe(dialog) : null,
        activeFocus: active && activeStyle && activeRect ? {
          tag: active.tagName.toLowerCase(),
          role: active.getAttribute('role'),
          label: active.getAttribute('aria-label') || active.innerText?.slice(0, 80) || '',
          outlineStyle: activeStyle.outlineStyle,
          outlineWidth: activeStyle.outlineWidth,
          outlineColor: activeStyle.outlineColor,
          boxShadow: activeStyle.boxShadow,
          bounds: { x: activeRect.x, right: activeRect.right, y: activeRect.y, bottom: activeRect.bottom },
          visible: Boolean(active.getClientRects().length),
        } : null,
        pageErrors: window.__w30PageErrors || [],
        writeRequests: (window.__w30Requests || []).filter(request => !['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())),
      };
    })()`);
}

const evidence = {
    schemaVersion: 1,
    task: 'S16.SharedConsolidation',
    recordedAt: new Date().toISOString(),
    scope: 'Isolated Firefox with local React demo and synthetic MSW; no backend, user profile, persistent app writes, or system preference changes',
    result: 'INCOMPLETE',
    temporaryProfileCleanup: 'PENDING',
    method: {
        browser: 'Playwright-bundled Firefox 155.0, headless, fresh temporary profile, direct WebDriver BiDi session over loopback',
        mechanism: 'Temporary unsigned Firefox WebExtension sets browser.browserSettings.zoomFullPage=false and browser.tabs.setZoom(tabId, 2); extension reads both settings back. This is Firefox native Zoom Text Only, not CSS/font-size/viewport/device-scale emulation.',
        source: 'Mozilla documents Zoom Text Only and browserSettings.zoomFullPage=false as applying zoom to text only.',
        reference: 'https://support.mozilla.org/en-US/kb/font-size-and-zoom-increase-size-of-web-pages; https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserSettings/zoomFullPage',
        browserProfile: 'Fresh profile under OS temporary directory; browser.zoom.full and browser.zoom.siteSpecific are controlled only by the temporary extension and discarded on close.',
        expected: 'At fixed CSS viewport and DPR, representative computed text sizes reach 2x; text wraps without clipping/overlap, page does not overflow horizontally, target controls remain visible/focusable, no frontend write request or uncaught page error occurs.',
        baseZoomFactor: 1,
        targetZoomFactor: 2,
        scenarios: scenarios.map(({ id, route, viewport }) => ({ id, route, viewport })),
    },
    sourceSha256: Object.fromEntries(sourceInputs.map(relative => [relative, sha256(relative)])),
    scenarios: [],
    noProgressLedgerWrites: true,
};

let server;
let firefox;
let socket;
let temporaryRoot;
let sendBidi;
let socketClose;
try {
    server = await startDemoServer({ cacheIsolationKey: 'w30-native-text-only-200' });
    temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ui028-w30-native-text-only-'));
    const profile = path.join(temporaryRoot, 'profile');
    const extensionPath = path.join(temporaryRoot, 'extension');
    fs.mkdirSync(profile, { recursive: true });
    fs.writeFileSync(path.join(profile, 'user.js'), [
        'user_pref("browser.shell.checkDefaultBrowser", false);',
        'user_pref("browser.startup.homepage", "about:blank");',
        'user_pref("browser.startup.page", 0);',
    ].join('\n'));
    createExtension(extensionPath);

    let firefoxOutput = '';
    firefox = spawn(firefoxPath, ['--headless', '--no-remote', '--profile', profile, '--remote-debugging-port', '0'], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    for (const stream of [firefox.stdout, firefox.stderr]) stream?.on('data', chunk => {
        firefoxOutput = (firefoxOutput + chunk.toString()).slice(-12000);
    });
    const webSocketUrl = await waitForWebSocketUrl(firefox, () => firefoxOutput);
    socket = new WebSocket(webSocketUrl);
    await new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true });
        socket.addEventListener('error', reject, { once: true });
    });
    socketClose = new Promise(resolve => socket.addEventListener('close', resolve, { once: true }));
    const send = createBidiClient(socket);
    sendBidi = send;
    const session = await send('session.new', { capabilities: {} });
    evidence.method.browserVersion = session.capabilities.browserVersion;
    evidence.method.webdriverBuildId = session.capabilities['moz:buildID'];
    await send('webExtension.install', { extensionData: { type: 'path', path: extensionPath } });

    const tree = await send('browsingContext.getTree', {});
    let context = tree.contexts?.[0]?.context;
    if (!context) throw new Error('Firefox WebDriver BiDi did not expose the isolated tab context.');
    await send('script.addPreloadScript', {
        functionDeclaration: `() => {
          window.__w30PageErrors = [];
          window.__w30Requests = [];
          addEventListener('error', event => window.__w30PageErrors.push(event.message || 'window error'));
          addEventListener('unhandledrejection', event => window.__w30PageErrors.push(String(event.reason)));
          const nativeFetch = window.fetch.bind(window);
          window.fetch = (input, init) => {
            const request = input instanceof Request ? input : null;
            window.__w30Requests.push({ method: String(init?.method || request?.method || 'GET').toUpperCase(), url: String(request?.url || input) });
            return nativeFetch(input, init);
          };
          const originalOpen = XMLHttpRequest.prototype.open;
          const originalSend = XMLHttpRequest.prototype.send;
          const requestMeta = new WeakMap();
          XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            requestMeta.set(this, { method: String(method || 'GET').toUpperCase(), url: String(url) });
            return originalOpen.call(this, method, url, ...rest);
          };
          XMLHttpRequest.prototype.send = function(...args) {
            const request = requestMeta.get(this);
            if (request) window.__w30Requests.push(request);
            return originalSend.apply(this, args);
          };
        }`,
    });

    for (const scenario of scenarios) {
        const routeUrl = new URL(scenario.route, server.url).toString();
        await send('browsingContext.setViewport', { context, viewport: scenario.viewport, devicePixelRatio: 1 });
        await send('browsingContext.navigate', { context, url: routeUrl, wait: 'complete' }, 30_000);
        await evaluateString(send, context, `new Promise((resolve, reject) => {
          const started = Date.now();
          const check = () => {
            const heading = document.querySelector('main h1');
            if (heading?.getClientRects().length) resolve('ready');
            else if (Date.now() - started > 15000) reject(new Error('React route did not render main heading'));
            else setTimeout(check, 50);
          };
          check();
        })`, 18_000);
        const baselineZoom = await setNativeZoom(send, context, 1);
        const setup = await prepareScenario(send, context, scenario);
        await evaluateString(send, context, `document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve('painted')))))`);
        const before = await measure(send, context, scenario.targets);

        const zoom = await setNativeZoom(send, context, 2);
        await evaluateString(send, context, `document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => resolve('painted'), 150)))))`);

        const focus = await evaluateJson(send, context, `(() => {
          const element = document.querySelector(${JSON.stringify(scenario.focus)});
          if (!element || !element.getClientRects().length) return { found: false };
          element.focus();
          return { found: true, tag: element.tagName.toLowerCase(), label: element.getAttribute('aria-label') || element.innerText?.slice(0, 80) || '' };
        })()`);
        if (!focus.found) throw new Error(`${scenario.id}: keyboard focus target not found or not visible.`);
        const focusedScreenshotPath = path.join(path.dirname(outputPath), `native-text-only-200-${scenario.id}-focused-${evidenceRunId}.png`);
        const focusedScreenshot = await send('browsingContext.captureScreenshot', { context, origin: 'viewport' }, 20_000);
        const focusedScreenshotBytes = Buffer.from(focusedScreenshot.data, 'base64');
        fs.writeFileSync(focusedScreenshotPath, focusedScreenshotBytes);
        await send('input.performActions', {
            context,
            actions: [{ id: 'w30-keyboard', type: 'key', actions: [
                { type: 'keyDown', value: '\uE004' },
                { type: 'keyUp', value: '\uE004' },
            ] }],
        });
        const after = await measure(send, context, scenario.targets);
        const recoverableEllipsis = [];
        for (const clip of after.textClips) {
            if (!clip.selectId || clip.textOverflow !== 'ellipsis' || clip.whiteSpace !== 'nowrap' || clip.scrollHeight > clip.clientHeight + 2) continue;
            await evaluateString(send, context, `document.getElementById(${JSON.stringify(clip.selectId)}).focus(); 'focused-select'`);
            await send('input.performActions', { context, actions: [{ id: 'select-recovery-keyboard', type: 'key', actions: [{ type: 'keyDown', value: '\uE007' }, { type: 'keyUp', value: '\uE007' }] }] });
            const fullValue = await evaluateJson(send, context, `new Promise((resolve, reject) => {
              const start = Date.now(); const check = () => {
                const option = [...document.querySelectorAll('[role="listbox"] [role="option"]')].find(item => item.textContent.trim() === ${JSON.stringify(clip.text.trim())});
                if (option?.getClientRects().length) {
                  const rect=option.getBoundingClientRect(), style=getComputedStyle(option), range=document.createRange(); range.selectNodeContents(option);
                  const text=range.getBoundingClientRect();
                  resolve({ text:option.textContent.trim(), clipped:text.left < rect.left - 1 || text.right > rect.right + 1 || text.top < rect.top - 1 || text.bottom > rect.bottom + 1 || rect.left < -1 || rect.right > innerWidth + 1,
                    selected:option.getAttribute('aria-selected'), fontSize:style.fontSize, bounds:{x:rect.x,right:rect.right,height:rect.height}, textBounds:{x:text.x,right:text.right,height:text.height} });
                } else if(Date.now()-start>5000) reject(new Error('Exact full selected value is unavailable by Enter')); else setTimeout(check,50);
              }; check();
            })`);
            if (fullValue.clipped || fullValue.selected !== 'true') throw new Error('Selected full value is clipped or does not match: ' + JSON.stringify(fullValue));
            await send('input.performActions', { context, actions: [{ id: 'select-recovery-close', type: 'key', actions: [{ type: 'keyDown', value: '\uE00C' }, { type: 'keyUp', value: '\uE00C' }] }] });
            const retained = await evaluateJson(send, context, `(() => { const element=document.getElementById(${JSON.stringify(clip.selectId)}); return { text:element.textContent.trim(), focused:document.activeElement===element, expanded:element.getAttribute('aria-expanded') }; })()`);
            if (retained.text !== clip.text.trim() || !retained.focused || retained.expanded !== 'false') throw new Error('Select recovery changed value or lost keyboard focus');
            recoverableEllipsis.push({ ...clip, rule:'SPC-051', method:'Native Enter on MUI select; exact selected full value in listbox; Escape preserves value and focus', fullValue, retained });
        }
        for (const clip of after.textClips) {
            if (clip.textOverflow !== 'ellipsis' || clip.whiteSpace !== 'nowrap' || clip.scrollHeight > clip.clientHeight + 2
                || !/^\/s\/shop-demo\/inbox\/[^/?]+(?:\?.*)?$/.test(clip.recoveryHref || '')) continue;
            if (scenario.id === 'inbox-detail-desktop') {
                await evaluateString(send, context, `(() => {
                  const textarea=document.querySelector('[data-testid="inbox-thread"] form textarea:not([aria-hidden="true"])');
                  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(textarea,'');
                  textarea.dispatchEvent(new Event('input',{bubbles:true})); return 'clear-owned-synthetic-draft-before-separate-navigation-recovery';
                })()`);
                await evaluateString(send, context, `new Promise((resolve,reject)=>{const start=Date.now();const check=()=>{
                  if(document.querySelector('[data-testid="inbox-thread"] form')?.getAttribute('data-draft-clean')==='true') resolve('owned-draft-clean');
                  else if(Date.now()-start>5000)reject(new Error('Owned synthetic draft did not clear'));else setTimeout(check,50);
                };check();})`);
            }
            await evaluateString(send, context, `(() => {
              const link = [...document.querySelectorAll('main .MuiList-root a.MuiListItemButton-root')].find(item => item.getAttribute('href') === ${JSON.stringify(clip.recoveryHref)});
              if (!link) throw new Error('Ellipsis detail link missing'); link.focus(); return 'focused-detail-link';
            })()`);
            await send('input.performActions', { context, actions: [{ id: 'ellipsis-keyboard', type: 'key', actions: [{ type: 'keyDown', value: '\uE007' }, { type: 'keyUp', value: '\uE007' }] }] });
            await evaluateString(send, context, `new Promise((resolve, reject) => {
              const start = Date.now(); const check = () => {
                const thread = document.querySelector('[data-testid="inbox-thread"]');
                const value = thread && [...thread.querySelectorAll('h2, p')].find(item => item.textContent?.trim() === ${JSON.stringify(clip.text.trim())});
                if (location.pathname === ${JSON.stringify(clip.recoveryHref.split('?')[0])} && value?.getClientRects().length) { value.scrollIntoView({ block: 'center' }); resolve('full-value-rendered'); }
                else if (Date.now() - start > 15000) reject(new Error('Full ellipsis value unavailable in detail'));
                else setTimeout(check, 50);
              }; check();
            })`);
            const fullValue = await evaluateJson(send, context, `(() => {
              const value = [...document.querySelectorAll('[data-testid="inbox-thread"] h2, [data-testid="inbox-thread"] p')].find(item => item.textContent?.trim() === ${JSON.stringify(clip.text.trim())});
              const style = getComputedStyle(value), rect = value.getBoundingClientRect();
              return { text: value.textContent.trim(), fontSize: style.fontSize, width: rect.width, right: rect.right, height: rect.height, viewport: innerWidth, clipped: (['hidden','clip'].includes(style.overflowX) && value.scrollWidth > value.clientWidth + 2) || (['hidden','clip'].includes(style.overflowY) && value.scrollHeight > value.clientHeight + 2) };
            })()`);
            if (fullValue.clipped || fullValue.right > fullValue.viewport + 1 || !fullValue.height) throw new Error('Recovered ellipsis value is clipped');
            recoverableEllipsis.push({ ...clip, rule: 'SPC-051', method: 'Native Enter on list link; exact full value rendered in conversation detail', fullValue });
            await send('browsingContext.navigate', { context, url: routeUrl, wait: 'complete' }, 30_000);
            await prepareScenario(send, context, scenario);
            await setNativeZoom(send, context, 2);
        }
        after.recoverableEllipsis = recoverableEllipsis;
        after.unrecoveredTextClips = after.textClips.filter(clip => !recoverableEllipsis.some(value => value.recoveryHref === clip.recoveryHref && value.selectId === clip.selectId && value.text === clip.text));
        if (recoverableEllipsis.length) {
            await evaluateString(send, context, `document.querySelector(${JSON.stringify(scenario.focus)}).focus(); 'restored-focus'`);
            await send('input.performActions', { context, actions: [{ id: 'restored-keyboard', type: 'key', actions: [{ type: 'keyDown', value: '\uE004' }, { type: 'keyUp', value: '\uE004' }] }] });
        }
        const issues = [];
        if (scenario.id === 'inbox-detail-desktop' && (!after.composerGeometry || after.composerGeometry.composerBottom > after.composerGeometry.threadBottom + 1 || after.composerGeometry.messageBottom > after.composerGeometry.composerTop + 1)) issues.push('Composer escapes desktop thread or overlaps message history');
        if (scenario.id === 'inbox-detail-desktop' && (!after.composerGeometry?.buttonFocused || after.composerGeometry.buttonBottom > after.composerGeometry.composerBottom + 1 || after.composerGeometry.buttonTop < after.composerGeometry.composerTop - 1
            || after.composerGeometry.draft !== Array.from({length:9},(_,index)=>'Dòng nháp native '+(index+1)).join('\n'))) issues.push('Native Tab cannot expose composer action or preserve the nine-line draft');
        if (scenario.id === 'inbox-detail-desktop' && (!after.composerGeometry?.messageLineHeight || after.composerGeometry.messageContentHeight < after.composerGeometry.messageLineHeight)) issues.push('Message history cannot display one whole line at native text200');
        if (scenario.id === 'inbox-detail-desktop' && (!after.composerGeometry?.buttonHit || after.composerGeometry.bodyOverflow !== 'auto'
            || after.composerGeometry.bodyBottom > after.composerGeometry.buttonTop + 1 || after.composerGeometry.bodyClientHeight < after.composerGeometry.textareaLineHeight)) issues.push('Composer body cannot expose one editable line or obscures its fixed action');
        for (const label of after.ownedLabels) if (label.overlaps || label.outsideField || label.labelPosition !== 'static' || label.labelTransform !== 'none' || label.fieldBounds.height > label.naturalHeight + 1 || label.legends.some(width => width > 1)) issues.push(`Owned floating label overlap or clipping: ${label.owner}: ${label.label}`);
        if (scenario.id.startsWith('inbox-list') && (!after.toolbarGeometry || after.toolbarGeometry.buttonHeight > after.toolbarGeometry.naturalHeight + 1)) issues.push('Toolbar action stretched beyond its intrinsic height');
        if (scenario.id.startsWith('inbox-list') && !after.toolbarGeometry?.centerHitsButton) issues.push('Search action center is not hit-testable');
        if (baselineZoom.zoomFullPage?.value !== false || baselineZoom.zoomFactor !== 1)
            issues.push(`Baseline must be native text-only zoom at 100%; observed ${JSON.stringify(baselineZoom)}.`);
        if (zoom.zoomFullPage?.value !== false || zoom.zoomFactor !== 2)
            issues.push(`Firefox did not confirm native text-only 200%; observed ${JSON.stringify(zoom)}.`);
        if (before.viewport.width !== scenario.viewport.width || before.viewport.height !== scenario.viewport.height)
            issues.push(`Unexpected baseline viewport ${before.viewport.width}x${before.viewport.height}; expected ${scenario.viewport.width}x${scenario.viewport.height}.`);
        if (after.viewport.width !== before.viewport.width || after.viewport.height !== before.viewport.height || after.viewport.devicePixelRatio !== before.viewport.devicePixelRatio)
            issues.push('Text-only resizing changed CSS viewport or devicePixelRatio; expected both to stay fixed.');
        for (const baselineTarget of before.targets) {
            const finalTarget = after.targets.find(item => item.selector === baselineTarget.selector);
            if (!baselineTarget.found || !finalTarget?.found) {
                issues.push(`Target missing at baseline or 200%: ${baselineTarget.selector}.`);
                continue;
            }
            const ratio = Number.parseFloat(finalTarget.fontSize) / Number.parseFloat(baselineTarget.fontSize);
            finalTarget.nativeTextScaleRatio = Math.round(ratio * 100) / 100;
            if (!Number.isFinite(ratio) || Math.abs(ratio - 2) > 0.06)
                issues.push(`Native text size for ${baselineTarget.selector} scaled by ${finalTarget.nativeTextScaleRatio}x; expected 2x.`);
            if (finalTarget.x < -1 || finalTarget.right > after.viewport.width + 1)
                issues.push(`Text target extends beyond viewport: ${baselineTarget.selector} (${finalTarget.x}..${finalTarget.right}).`);
        }
        if (after.viewport.pageOverflow > 1) issues.push(`Document horizontal overflow: ${after.viewport.pageOverflow}px.`);
        if (after.unrecoveredTextClips.length) issues.push(`Unrecoverable clipped text elements: ${after.unrecoveredTextClips.length}.`);
        if (after.navigationLabelLayout && (!after.navigationLabelLayout.labelContainedByLink
            || after.navigationLabelLayout.directTextChild
            || after.navigationLabelLayout.labelFollowingOverlap > 1
            || after.navigationLabelLayout.linkFollowingOverlap > 1))
            issues.push(`Long navigation label geometry is invalid: ${JSON.stringify(after.navigationLabelLayout)}.`);
        if (['dialog-long-reason', 'draft-comparison'].includes(scenario.id) && after.dialog && (after.dialog.y < -1 || after.dialog.bottom > after.viewport.height + 1))
            issues.push(`Dialog extends beyond viewport: ${after.dialog.y}..${after.dialog.bottom} of ${after.viewport.height}px.`);
        if (!after.activeFocus?.visible || ((after.activeFocus.outlineStyle === 'none' || after.activeFocus.outlineWidth === '0px') && after.activeFocus.boxShadow === 'none'))
            issues.push('Keyboard Tab did not leave a visible focus target with a measurable focus indicator.');
        if (after.pageErrors.length) issues.push(`Uncaught page errors: ${after.pageErrors.length}.`);
        if (after.writeRequests.length !== 0) issues.push(`Unexpected non-read requests: ${after.writeRequests.length}.`);

        const screenshotPath = path.join(path.dirname(outputPath), `native-text-only-200-${scenario.id}-current-${evidenceRunId}.png`);
        const screenshot = await send('browsingContext.captureScreenshot', { context, origin: 'viewport' }, 20_000);
        const screenshotBytes = Buffer.from(screenshot.data, 'base64');
        fs.writeFileSync(screenshotPath, screenshotBytes);
        evidence.scenarios.push({
            id: scenario.id,
            route: scenario.route,
            routeUrl,
            viewport: scenario.viewport,
            setup,
            nativeSettings: {
                baseline: baselineZoom,
                after: zoom,
                fixedViewport: before.viewport.width === after.viewport.width && before.viewport.height === after.viewport.height,
                fixedDevicePixelRatio: before.viewport.devicePixelRatio === after.viewport.devicePixelRatio,
            },
            baseline: before,
            textOnly200: after,
            focusedScreenshot: {
                path: path.relative(root, focusedScreenshotPath).replaceAll('\\', '/'),
                sha256: createHash('sha256').update(focusedScreenshotBytes).digest('hex'),
            },
            screenshot: {
                path: path.relative(root, screenshotPath).replaceAll('\\', '/'),
                sha256: createHash('sha256').update(screenshotBytes).digest('hex'),
            },
            issues,
            result: issues.length === 0 ? 'PASS' : 'FAIL',
        });
    }
    evidence.routeLabelProbes = await captureNativeLabelRoutes({ root, outputPath, evidenceRunId, server, send, context, evaluateJson, evaluateString, setNativeZoom });
    evidence.result = evidence.scenarios.every(scenario => scenario.result === 'PASS') && evidence.routeLabelProbes.length === 108 && evidence.routeLabelProbes.every(row=>row.result==='PASS') ? 'PASS' : 'FAIL';
} catch (error) {
    evidence.result = 'ERROR';
    evidence.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
} finally {
    try {
        if (sendBidi) await sendBidi('session.end', {}, 3000);
    } catch { /* Closing the isolated browser below remains the cleanup authority. */ }
    try {
        if (socket?.readyState === WebSocket.OPEN) socket.close();
        if (socketClose) await Promise.race([socketClose, new Promise(resolve => setTimeout(resolve, 1500))]);
    } catch { /* Firefox shutdown below still closes the isolated session. */ }
    if (firefox && firefox.exitCode === null) {
        const closed = new Promise(resolve => firefox.once('close', resolve));
        firefox.kill();
        await Promise.race([closed, new Promise(resolve => setTimeout(resolve, 8000))]);
    }
    if (server) await server.close();
    if (temporaryRoot) {
        const tempBase = path.resolve(os.tmpdir());
        const tempTarget = path.resolve(temporaryRoot);
        if (path.dirname(tempTarget) !== tempBase || !path.basename(tempTarget).startsWith('ui028-w30-native-text-only-'))
            throw new Error(`Refusing to remove unexpected temporary Firefox profile path: ${tempTarget}`);
        let cleanupError;
        for (let attempt = 0; attempt < 6; attempt += 1) {
            try {
                fs.rmSync(tempTarget, { recursive: true, force: true });
                cleanupError = undefined;
                break;
            } catch (error) {
                cleanupError = error;
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        evidence.temporaryProfileCleanup = cleanupError ? `RETAINED_AFTER_RETRIES: ${cleanupError.code || cleanupError.message}` : 'REMOVED';
    }
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
    result: evidence.result,
    browser: evidence.method.browserVersion,
    temporaryProfileCleanup: evidence.temporaryProfileCleanup,
    scenarios: evidence.scenarios.map(({ id, result, viewport, nativeSettings, issues, screenshot }) => ({ id, result, viewport, nativeSettings, issues, screenshot })),
    error: evidence.error,
    evidence: path.relative(root, outputPath).replaceAll('\\', '/'),
}, null, 2));
if (evidence.result !== 'PASS') process.exitCode = 1;
