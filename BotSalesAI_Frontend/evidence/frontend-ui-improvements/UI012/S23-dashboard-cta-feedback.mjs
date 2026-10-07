import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {startDemoServer} from '../../../tests/session/demo-server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const waitForMain = async page => {
  await page.locator('main#main-content h1').waitFor({state:'visible', timeout:20000});
  await page.locator('main#main-content .MuiLinearProgress-root').waitFor({state:'detached', timeout:20000}).catch(()=>{});
};
const contrastRatio = (foreground, background) => {
  const luminance = cssColor => {
    const channels = cssColor.match(/\d+(?:\.\d+)?/g)?.slice(0,3).map(Number);
    if (!channels || channels.length !== 3) throw new Error(`Unexpected computed color: ${cssColor}`);
    const [red, green, blue] = channels.map(value => {
      const channel = value / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    });
    return .2126 * red + .7152 * green + .0722 * blue;
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
};
const demo = await startDemoServer({cacheIsolationKey:'ui012-active-feedback-s23'});
let browser;

try {
  browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:1440,height:1000}, deviceScaleFactor:1});
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const screenshots = [];
  const save = async (name, state) => {
    const output = path.join(here, name);
    await page.screenshot({path:output, fullPage:false});
    screenshots.push({name, state, bytes:(await fs.stat(output)).size});
  };
  const captureStyles = async action => action.evaluate(element => {
    const style = getComputedStyle(element);
    return {backgroundColor:style.backgroundColor, color:style.color};
  });

  await page.goto(new URL('/s/shop-demo/overview', demo.url).toString(), {waitUntil:'domcontentloaded'});
  await waitForMain(page);
  const action = page.getByRole('link', {name:'Xem việc cần làm', exact:true});
  await action.waitFor({state:'visible'});
  const defaultStyle = await captureStyles(action);
  await action.hover();
  const hoverStyle = await captureStyles(action);
  const hoverContrast = contrastRatio(hoverStyle.color, hoverStyle.backgroundColor);
  await save('S23-overview-hover.png', 'hover');
  const bounds = await action.boundingBox();
  if (!bounds) throw new Error('Dashboard CTA has no visible bounds.');
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  const pressedStyle = await captureStyles(action);
  const pressedContrast = contrastRatio(pressedStyle.color, pressedStyle.backgroundColor);
  await save('S23-overview-pressed.png', 'pointer down');
  await page.mouse.up();

  await page.goto(new URL('/s/shop-demo/overview', demo.url).toString(), {waitUntil:'domcontentloaded'});
  await waitForMain(page);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  for (let index=0; index<100 && !(await action.evaluate(element => element === document.activeElement)); index++) {
    await page.keyboard.press('Tab');
  }
  const focus = await action.evaluate(element => ({
    focused:element === document.activeElement,
    focusVisible:element.matches(':focus-visible'),
    outline:getComputedStyle(element).outline,
    backgroundColor:getComputedStyle(element).backgroundColor,
  }));
  if (!focus.focused || !focus.focusVisible) throw new Error('Dashboard CTA lost visible keyboard focus.');
  await save('S23-overview-keyboard-focus.png', 'keyboard focus-visible');

  const report = {
    date:'2026-10-03',
    scope:'local React demo + synthetic MSW; dashboard visual interaction review',
    viewport:'1440x1000 CSS px; Chromium 153; deviceScaleFactor 1',
    route:'R04',
    accessibleName:'Xem việc cần làm',
    styles:{default:defaultStyle, hover:hoverStyle, pressed:pressedStyle},
    contrastRatio:{hover:Math.round(hoverContrast*100)/100, pressed:Math.round(pressedContrast*100)/100, requiredMinimum:4.5},
    keyboardFocus:focus,
    screenshots,
    pageErrors,
    architecture:'PRESERVED — dashboard module remains the owner; colors come from canonical theme tokens; no API/contract/route/permission/generated source changed.',
    limits:[
      'This probe covers one dashboard link at a desktop viewport; it does not close screen-reader or broad manual accessibility review.',
      'Demo interactions use the local React application and synthetic MSW; no backend/provider request or persistent mutation was made.',
    ],
  };
  await fs.writeFile(path.join(here,'S23-dashboard-cta-feedback.json'), `${JSON.stringify(report,null,2)}\n`, 'utf8');
  console.log(JSON.stringify(report,null,2));
} finally {
  await browser?.close();
  await demo.close();
}
