import { execFile as execFileCallback, spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startDemoServer } from '../../../tests/session/demo-server.mjs';

const execFile = promisify(execFileCallback);
const here = path.dirname(fileURLToPath(import.meta.url));
const adb = 'C:/Users/Joker-PC/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const root = path.resolve(here, '../../..');
const temporaryParent = path.resolve(os.tmpdir());
const temporaryRoot = await mkdtemp(path.join(temporaryParent, 'botsales-ui015-s07-'));
const outputPath = path.join(here, 'S07-android-soft-keyboard-probe-20261003.json');
const server = await startDemoServer({ cacheIsolationKey: 'ui015-android-soft-keyboard' });
let browser;
let adbReverse = false;
let adbForward = false;
const pageErrors = [];
const result = {
  recordedAt: '2026-10-03',
  scope: 'Physical Android emulator viewport and system soft-keyboard behavior using the local React demo and synthetic MSW. No reply is sent.',
  status: 'FAILED',
  device: {},
  route: '/s/shop-demo/inbox/cv1',
  phases: {},
  pageErrors,
  limitations: ['Android emulator evidence is not a physical handset test.', 'The keyboard text remains a local demo draft and is not submitted.'],
};

async function adbExec(args, options = {}) {
  const { stdout = '', stderr = '' } = await execFile(adb, ['-s', 'emulator-5554', ...args], {
    encoding: 'utf8', timeout: options.timeout ?? 30000, maxBuffer: 8 * 1024 * 1024,
  });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

async function screenshot(name) {
  const child = spawn(adb, ['-s', 'emulator-5554', 'exec-out', 'screencap', '-p'], { windowsHide: true });
  const chunks = [];
  const errors = [];
  child.stdout.on('data', chunk => chunks.push(chunk));
  child.stderr.on('data', chunk => errors.push(chunk));
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  if (code !== 0) throw new Error(`adb screencap exited ${code}: ${Buffer.concat(errors).toString('utf8')}`);
  const bytes = Buffer.concat(chunks);
  const file = path.join(here, name);
  await writeFile(file, bytes);
  return { name, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes: bytes.length };
}

async function browserMetrics(page) {
  return page.evaluate(() => {
    const textbox = document.querySelector('textarea');
    const send = [...document.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Gửi trả lời');
    const rect = element => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
    };
    return {
      url: location.href,
      title: document.title,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      visualViewport: window.visualViewport ? {
        width: window.visualViewport.width,
        height: window.visualViewport.height,
        offsetTop: window.visualViewport.offsetTop,
        scale: window.visualViewport.scale,
      } : null,
      documentClient: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
      documentScroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      textbox: textbox ? { rect: rect(textbox), value: textbox.value, disabled: textbox.disabled } : null,
      sendButton: send ? { rect: rect(send), disabled: send.disabled } : null,
    };
  });
}

try {
  const deviceList = await execFile(adb, ['devices', '-l'], { encoding: 'utf8', timeout: 10000 });
  if (!/emulator-5554\s+device\b/.test(deviceList.stdout)) throw new Error(`Expected active emulator-5554. adb devices: ${deviceList.stdout}`);
  const boot = (await adbExec(['shell', 'getprop', 'sys.boot_completed'])).stdout;
  if (boot !== '1') throw new Error(`Android did not report boot_complete=1 (observed ${JSON.stringify(boot)}).`);
  const version = (await adbExec(['shell', 'getprop', 'ro.build.version.release'])).stdout;
  const api = (await adbExec(['shell', 'getprop', 'ro.build.version.sdk'])).stdout;
  const size = (await adbExec(['shell', 'wm', 'size'])).stdout;
  const density = (await adbExec(['shell', 'wm', 'density'])).stdout;
  const chrome = await adbExec(['shell', 'pm', 'path', 'com.android.chrome']);
  if (!chrome.stdout.includes('package:')) throw new Error('Android Chrome package is not installed.');
  result.device = { serial: 'emulator-5554', androidRelease: version, apiLevel: api, displaySize: size, density, chromeInstalled: true };

  const hostPort = new URL(server.url).port;
  result.demo = { url: server.url, hostPort, scope: 'isolated local demo Vite server with synthetic MSW' };
  await adbExec(['reverse', `tcp:${hostPort}`, `tcp:${hostPort}`]);
  adbReverse = true;
  const target = new URL(result.route, server.url).toString();
  await adbExec(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', target, 'com.android.chrome'], { timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 8000));
  await adbExec(['forward', 'tcp:9222', 'localabstract:chrome_devtools_remote']);
  adbForward = true;

  const versionResponse = await fetch('http://127.0.0.1:9222/json/version');
  if (!versionResponse.ok) throw new Error(`Chrome remote debugging endpoint returned HTTP ${versionResponse.status}.`);
  result.device.chromeDebugVersion = await versionResponse.json();
  browser = await chromium.connectOverCDP('http://127.0.0.1:9222', { timeout: 30000 });
  const pages = browser.contexts().flatMap(context => context.pages());
  const page = pages.find(candidate => candidate.url().includes('/s/shop-demo/inbox/cv1'));
  if (!page) throw new Error(`Chrome remote session did not expose the target route. Open pages: ${pages.map(candidate => candidate.url()).join(', ')}`);
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.getByRole('textbox', { name: 'Nội dung trả lời khách' }).waitFor({ state: 'visible', timeout: 30000 });
  const composer = page.getByRole('textbox', { name: 'Nội dung trả lời khách' });
  result.phases.keyboardClosedBefore = await browserMetrics(page);
  result.phases.screenshotBefore = await screenshot('S07-android-inbox-before-keyboard-20261003.png');

  await composer.click();
  await page.waitForTimeout(2500);
  result.phases.keyboardOpen = await browserMetrics(page);
  result.phases.inputMethodWhileOpen = (await adbExec(['shell', 'dumpsys', 'input_method'])).stdout
    .split('\n').filter(line => /mInputShown|mShowRequested|showRequested|isInputViewShown|mCurMethod|mImeWindowVis/i.test(line)).slice(0, 24);
  result.phases.screenshotKeyboardOpen = await screenshot('S07-android-inbox-keyboard-open-20261003.png');

  await composer.fill('UI015 draft: Android keyboard check');
  await page.getByRole('button', { name: 'Gửi trả lời', exact: true }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  result.phases.draftWithKeyboard = await browserMetrics(page);
  await adbExec(['shell', 'input', 'keyevent', '4']);
  await page.waitForTimeout(2000);
  result.phases.keyboardClosedAfterBack = await browserMetrics(page);
  result.phases.inputMethodAfterBack = (await adbExec(['shell', 'dumpsys', 'input_method'])).stdout
    .split('\n').filter(line => /mInputShown|mShowRequested|showRequested|isInputViewShown|mCurMethod|mImeWindowVis/i.test(line)).slice(0, 24);
  result.phases.screenshotAfterBack = await screenshot('S07-android-inbox-after-back-20261003.png');

  const opened = result.phases.keyboardOpen;
  const returned = result.phases.keyboardClosedAfterBack;
  const heightReduced = opened.innerHeight < result.phases.keyboardClosedBefore.innerHeight - 100
    || (opened.visualViewport?.height ?? 0) < (result.phases.keyboardClosedBefore.visualViewport?.height ?? 0) - 100;
  const draftPreserved = returned.textbox?.value === 'UI015 draft: Android keyboard check';
  const remainedOnRoute = returned.url.includes('/s/shop-demo/inbox/cv1');
  const keyboardVisibleInImeDump = result.phases.inputMethodWhileOpen.some(line =>
    /mInputShown=true|mShowRequested=true|showRequested=true|mImeWindowVis=0x[1-9a-f]/i.test(line));
  const sendBox = result.phases.draftWithKeyboard.sendButton?.rect;
  const visibleHeight = result.phases.draftWithKeyboard.visualViewport?.height ?? result.phases.draftWithKeyboard.innerHeight;
  result.assertions = {
    visibleAndroidKeyboardEvidence: heightReduced || keyboardVisibleInImeDump,
    keyboardReducedVisualViewport: heightReduced,
    composerVisibleAndEnabled: Boolean(opened.textbox && !opened.textbox.disabled
      && opened.textbox.rect.top >= 0 && opened.textbox.rect.bottom <= (opened.visualViewport?.height ?? opened.innerHeight) + 1),
    sendButtonReachableWithKeyboardOpen: Boolean(sendBox && sendBox.top >= 0 && sendBox.bottom <= visibleHeight + 1),
    noHorizontalDocumentOverflowWhileOpen: result.phases.draftWithKeyboard.documentScroll.width
      <= result.phases.draftWithKeyboard.documentClient.width,
    draftSurvivesKeyboardBack: draftPreserved,
    backKeepsConversationRoute: remainedOnRoute,
    noPageErrors: pageErrors.length === 0,
  };
  result.status = Object.values(result.assertions).every(Boolean) ? 'PROBE_COMPLETE' : 'PROBE_REVIEW';
} catch (error) {
  result.error = error instanceof Error ? error.stack ?? error.message : String(error);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (adbForward) await execFile(adb, ['-s', 'emulator-5554', 'forward', '--remove', 'tcp:9222'], { encoding: 'utf8', timeout: 10000 }).catch(() => {});
  if (adbReverse) await execFile(adb, ['-s', 'emulator-5554', 'reverse', '--remove', `tcp:${new URL(server.url).port}`], { encoding: 'utf8', timeout: 10000 }).catch(() => {});
  await server.close().catch(() => {});
  const resolvedTemp = path.resolve(temporaryRoot);
  if (path.dirname(resolvedTemp) !== temporaryParent || !path.basename(resolvedTemp).startsWith('botsales-ui015-s07-')) {
    throw new Error(`Refusing to remove unexpected temporary path: ${resolvedTemp}`);
  }
  await rm(resolvedTemp, { recursive: true, force: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PROBE_COMPLETE') process.exitCode = 1;
