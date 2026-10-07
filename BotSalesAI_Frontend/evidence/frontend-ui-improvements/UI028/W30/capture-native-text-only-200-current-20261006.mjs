import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { evidenceRunId } from '../../../../tests/evidence-run-id.mjs';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const root = process.cwd();
const outputPath = path.join(root, `evidence/frontend-ui-improvements/UI028/W30/native-text-only-200-current-${evidenceRunId}.json`);
const runnerPath = path.relative(root, fileURLToPath(import.meta.url)).replaceAll('\\', '/');
const firefoxPath = 'C:/Users/Joker-PC/AppData/Local/ms-playwright/firefox-1543/firefox/firefox.exe';
const sourceInputs = [
    runnerPath,
    'botsales-kit/contracts/route-manifest.json',
    'apps/web/src/app/Shell.tsx',
    'apps/web/src/app/tokens.css',
    'apps/web/src/modules/catalog/index.tsx',
    'apps/web/src/modules/inbox/index.tsx',
    'apps/web/src/modules/inbox/conversation-components.tsx',
    'apps/web/src/modules/reports/index.tsx',
    'apps/web/src/shared/ui/layout.ts',
    'apps/web/src/shared/ui/theme.ts',
    'apps/web/src/shared/ui/visual.ts',
    'tests/ui028-w30-stress.spec.ts',
    'tests/evidence-run-id.mjs',
];
const scenarios = [
    { id: 'form-error-short', route: '/s/shop-demo/products/new', viewport: { width: 320, height: 480 }, targets: ['main h1', 'input[name="name"]', 'input[name="variants.0.sku"]', 'button[type="submit"]'], focus: 'button[type="submit"]' },
    { id: 'mobile-menu-long-label', route: '/s/shop-demo/overview', viewport: { width: 390, height: 560 }, targets: ['[data-w30-long-label="true"]', 'main h1'], focus: '[data-w30-long-label="true"]' },
    { id: 'report-long-id', route: '/s/shop-demo/reports/marketing', viewport: { width: 640, height: 450 }, targets: ['[data-w30-long-id="true"]', 'main h1', 'button[aria-label="Mở menu"]'], focus: 'button[aria-label="Mở menu"]' },
    { id: 'inbox-long-composer', route: '/s/shop-demo/inbox/cv1', viewport: { width: 390, height: 560 }, targets: ['textarea', 'button[type="submit"]', 'main h1'], focus: 'textarea' },
    { id: 'dialog-long-reason', route: '/s/shop-demo/inbox/cv1', viewport: { width: 320, height: 480 }, targets: ['[role="dialog"]', '[role="dialog"] textarea', '[role="dialog"] button'], focus: '[role="dialog"] textarea' },
];

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
    }, timeoutMs);
    if (response.type !== 'success') throw new Error(`Page evaluation failed: ${JSON.stringify(response.exceptionDetails)}`);
    if (response.result?.type !== 'string') throw new Error(`Expected serialized string result: ${JSON.stringify(response)}`);
    return response.result.value;
}

async function evaluateJson(send, context, expression) {
    return JSON.parse(await evaluateString(send, context, `JSON.stringify(${expression})`));
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
    const setup = {
        'form-error-short': `(() => {
          const setValue = (selector, value) => {
            const element = document.querySelector(selector);
            if (!element) throw new Error('Missing form control ' + selector);
            const setter = Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value')?.set;
            setter ? setter.call(element, value) : element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          };
          setValue('input[name="name"]', 'Tên sản phẩm tổng hợp '.repeat(8));
          setValue('input[name="variants.0.sku"]', 'SKU-' + 'IDENTIFIER-VERY-LONG-'.repeat(8));
          setValue('input[name="variants.0.price"]', '0');
          const submit = document.querySelector('button[type="submit"]');
          if (!submit) throw new Error('Missing product submit control');
          submit.click();
          return new Promise((resolve, reject) => {
            const started = Date.now();
            const check = () => {
              const error = [...document.querySelectorAll('p, [role="alert"]')].find(element => element.textContent?.includes('Giá phải lớn hơn 0'));
              if (error) {
                error.append(document.createTextNode(' · mã lỗi ' + 'PRICE-VALIDATION-IDENTIFIER-'.repeat(6)));
                resolve('invalid-price-error-visible');
              } else if (Date.now() - started > 7000) reject(new Error('Expected invalid price validation message was not rendered'));
              else setTimeout(check, 50);
            };
            check();
          });
        })()` ,
        'mobile-menu-long-label': `(() => {
          const menu = document.querySelector('button[aria-label="Mở menu"]');
          if (!menu) throw new Error('Mobile menu button is missing');
          menu.click();
          return new Promise((resolve, reject) => {
            const started = Date.now();
            const check = () => {
              const link = [...document.querySelectorAll('a')].find(element => element.textContent?.trim() === 'Sản phẩm' && element.getClientRects().length);
              if (link) {
                link.dataset.w30LongLabel = 'true';
                link.append(document.createTextNode(' ' + 'Danh mục sản phẩm nhãn dài '.repeat(8) + ' ID-' + 'NAV-LONG-'.repeat(8)));
                resolve('mobile-navigation-open-long-label-visible');
              } else if (Date.now() - started > 7000) reject(new Error('Visible Sản phẩm navigation link did not open'));
              else setTimeout(check, 50);
            };
            check();
          });
        })()` ,
        'report-long-id': `(() => {
          const main = document.querySelector('main#main-content');
          if (!main) throw new Error('Report main region is missing');
          const node = document.createElement('p');
          node.dataset.w30LongId = 'true';
          node.textContent = 'Mã công việc xuất ' + 'JOB-2026-IDENTIFIER-'.repeat(12);
          main.prepend(node);
          return 'marketing-report-route-long-identifier-visible';
        })()` ,
        'inbox-long-composer': `new Promise((resolve, reject) => {
          const started = Date.now();
          const check = () => {
            const composer = [...document.querySelectorAll('textarea')].find(element => {
              const labels = [...(element.labels || [])].map(label => label.textContent || '').join(' ');
              const ariaLabel = element.getAttribute('aria-label') || '';
              const labelledBy = (element.getAttribute('aria-labelledby') || '').split(/\\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ');
              return (labels + ' ' + ariaLabel + ' ' + labelledBy).includes('Nội dung trả lời khách') && element.getClientRects().length;
            });
            if (composer) {
              const value = 'Nội dung trả lời khách hàng tổng hợp. ' + 'Giải thích chi tiết về trạng thái đơn hàng, lựa chọn giao nhận và bước tiếp theo. '.repeat(20);
              const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
              setter ? setter.call(composer, value) : composer.value = value;
              composer.dispatchEvent(new Event('input', { bubbles: true }));
              composer.dispatchEvent(new Event('change', { bubbles: true }));
              resolve('draft-composer-filled-without-submit');
            } else if (Date.now() - started > 12000) reject(new Error('Customer reply composer was not rendered with its accessible label'));
            else setTimeout(check, 50);
          };
          check();
        })` ,
        'dialog-long-reason': `new Promise((resolve, reject) => {
          const started = Date.now();
          const openDialog = () => {
            const takeover = [...document.querySelectorAll('button')].find(element => element.textContent?.trim() === 'Tiếp quản' && element.getClientRects().length);
            if (!takeover) {
              if (Date.now() - started > 12000) reject(new Error('Takeover action did not render'));
              else setTimeout(openDialog, 50);
              return;
            }
            takeover.click();
            const waitForReason = () => {
              const dialog = document.querySelector('[role="dialog"]');
              const reason = dialog && [...dialog.querySelectorAll('textarea, input')].find(element => [...(element.labels || [])].some(label => label.textContent?.includes('Lý do')));
              if (reason) {
                const setter = Object.getOwnPropertyDescriptor(reason.constructor.prototype, 'value')?.set;
                setter ? setter.call(reason, 'Lý do tổng hợp để kiểm tra reflow. ' + 'Mã hội thoại CV-2026-'.repeat(14)) : reason.value = 'Lý do tổng hợp để kiểm tra reflow. ' + 'Mã hội thoại CV-2026-'.repeat(14);
                reason.dispatchEvent(new Event('input', { bubbles: true }));
                reason.dispatchEvent(new Event('change', { bubbles: true }));
                resolve('takeover-reason-dialog-open-and-draft-filled');
              } else if (Date.now() - started > 12000) reject(new Error('Takeover reason dialog did not render'));
              else setTimeout(waitForReason, 50);
            };
            waitForReason();
          };
          openDialog();
        })` ,
    }[scenario.id];
    const expression = `Promise.resolve().then(() => (${setup}))`;
    const result = await evaluateString(send, context, expression, 15_000);
    if (!result) throw new Error(`Scenario ${scenario.id} did not reach its setup state.`);
    return result;
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
        .map(element => ({ tag: element.tagName.toLowerCase(), role: element.getAttribute('role'), text: (element.innerText || '').slice(0, 100), ...describe(element) }));
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const activeStyle = active ? getComputedStyle(active) : null;
      const activeRect = active?.getBoundingClientRect();
      const dialog = document.querySelector('[role="dialog"]');
      return {
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
    task: 'UI028.W30',
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
        await send('input.performActions', {
            context,
            actions: [{ id: 'w30-keyboard', type: 'key', actions: [
                { type: 'keyDown', value: '\uE004' },
                { type: 'keyUp', value: '\uE004' },
            ] }],
        });
        const after = await measure(send, context, scenario.targets);
        const issues = [];
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
        if (after.textClips.length) issues.push(`Potential clipped text elements: ${after.textClips.length}.`);
        if (scenario.id === 'dialog-long-reason' && after.dialog && (after.dialog.y < -1 || after.dialog.bottom > after.viewport.height + 1))
            issues.push(`Dialog extends beyond viewport: ${after.dialog.y}..${after.dialog.bottom} of ${after.viewport.height}px.`);
        if (!after.activeFocus?.visible || ((after.activeFocus.outlineStyle === 'none' || after.activeFocus.outlineWidth === '0px') && after.activeFocus.boxShadow === 'none'))
            issues.push('Keyboard Tab did not leave a visible focus target with a measurable focus indicator.');
        if (after.pageErrors.length) issues.push(`Uncaught page errors: ${after.pageErrors.length}.`);
        if (after.writeRequests.length) issues.push(`Unexpected non-read requests: ${after.writeRequests.length}.`);

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
            screenshot: {
                path: path.relative(root, screenshotPath).replaceAll('\\', '/'),
                sha256: createHash('sha256').update(screenshotBytes).digest('hex'),
            },
            issues,
            result: issues.length === 0 ? 'PASS' : 'FAIL',
        });
    }
    evidence.result = evidence.scenarios.every(scenario => scenario.result === 'PASS') ? 'PASS' : 'FAIL';
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
