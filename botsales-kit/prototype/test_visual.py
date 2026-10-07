"""Visual regression of the portable demo, using Chromium document injection (set_content).
Not a real phone/Push/API or full screen-reader/production test.
"""
from pathlib import Path
import os,json,hashlib,datetime
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent;out=R/'evidence';out.mkdir(exist_ok=True);checks=[];errors=[];external=[]
def rec(name,ok=True,**kw):checks.append(dict(name=name,status='PASS' if ok else 'FAIL',**kw))
routes=['overview','inbox','customers','orders','products','categories','imports','inventory','movements','knowledge','reviews','bot','playground','evaluations','finance','entries','profit','reports','channels','providers','settings','team','audit','privacy','jobs','review','login','workspaces','onboarding','preparation','shipping','phone','suppliers','replenishment','purchase','approvals','agents','workitems','cod','journals','debts','periods','returns2','marketing','progress2']
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1)
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:external.append(r.url) if r.url.startswith(('http://','https://')) else None)
 page.set_content((R/'index.html').read_text(),wait_until='load')
 def go(route):
  page.evaluate('(r)=>location.hash="/"+r',route);page.wait_for_timeout(45)
 for width in [390,768,1440]:
  page.set_viewport_size({'width':width,'height':1000})
  for route in routes:
   go(route)
   rec(f'{route}: render at {width}px',page.locator('h1').count()==1)
   rec(f'{route}: page reflow at {width}px',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
 for width in [320,1024]:
  page.set_viewport_size({'width':width,'height':900})
  for route in ['overview','inbox','phone','preparation','finance','orders','agents']:
   go(route);rec(f'{route}: page reflow at {width}px',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
 page.set_viewport_size({'width':1440,'height':1000});go('overview')
 for mode in ['light','dark','no-preference']:
  page.emulate_media(color_scheme=mode)
  rec(f'OS {mode} retains fixed graphite background',page.evaluate('getComputedStyle(document.body).backgroundColor')=='rgb(17, 19, 24)')
 page.emulate_media(color_scheme='dark',reduced_motion='reduce')
 rec('Reduced-motion transition disabled',page.locator('.btn.primary').first.evaluate('(e)=>getComputedStyle(e).transitionDuration')=='0s')
 page.emulate_media(reduced_motion='no-preference')
 primary=page.locator('.btn.primary').first;primary.hover();page.wait_for_timeout(220)
 rec('Gold hover token applied',primary.evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(255, 219, 140)')
 # Use real keyboard to reach the skip link, then force focus to the next visible action.
 page.close();page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:external.append(r.url) if r.url.startswith(('http://','https://')) else None);page.set_content((R/'index.html').read_text(),wait_until='load');page.keyboard.press('Tab');page.wait_for_timeout(30)
 focused=page.evaluate('({tag:document.activeElement.tagName,cls:document.activeElement.className,outline:getComputedStyle(document.activeElement).outlineWidth,top:document.activeElement.getBoundingClientRect().top})')
 rec('Keyboard skip link visible',focused['cls']=='skip' and focused['top']>=0,observed=focused)
 page.keyboard.press('Escape');page.locator('[data-action="demo-options"]').first.click();page.wait_for_timeout(50)
 rec('Modal opens with native dialog',page.locator('dialog[open]').count()==1)
 rec('Modal belongs to dark palette',page.locator('dialog').evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(28, 32, 40)')
 page.keyboard.press('Escape');rec('Escape closes dialog',page.locator('dialog[open]').count()==0)
 page.emulate_media(forced_colors='active');go('overview')
 rec('Forced-colors not disabled',page.evaluate('getComputedStyle(document.body).forcedColorAdjust')!='none')
 page.emulate_media(forced_colors='none')
 # Fresh screenshots, no transient notifications or previously created test data.
 page.close();page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:external.append(r.url) if r.url.startswith(('http://','https://')) else None);page.set_content((R/'index.html').read_text(),wait_until='load');page.mouse.move(0,0)
 for name in ['overview','inbox','finance','agents','phone','preparation','orders','purchase']:
  go(name);page.screenshot(path=str(out/(name+'-desktop-current.png')),full_page=True)
 go('products');page.locator('[data-action="product-form"]').first.click();page.wait_for_timeout(100)
 page.screenshot(path=str(out/'product-dialog-current.png'),full_page=True);page.keyboard.press('Escape')
 page.set_viewport_size({'width':390,'height':844})
 for name in ['overview','phone','inbox']:
  go(name);page.screenshot(path=str(out/(name+'-mobile-current.png')),full_page=True)
 # Boot with no JavaScript to verify the fixed background before application startup.
 nc=b.new_context(java_script_enabled=False,viewport={'width':390,'height':844});np=nc.new_page();np.set_content((R/'index.html').read_text(),wait_until='load')
 rec('No-JS fallback content exists',np.locator('noscript h1').count()==1)
 np.screenshot(path=str(out/'no-javascript-mobile-current.png'),full_page=True)
 # Locator evaluate works via the automation isolated context even when page JS is disabled.
 rec('No-JS graphite canvas',np.locator('body').evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(17, 19, 24)')
 nc.close();ctx.close();b.close()
rec('No JavaScript errors',not errors,errors=errors);rec('No external network requests',not external,requests=external)
report=dict(scope='LOCAL_CHROMIUM_INJECTED_DOCUMENT_NOT_REAL_DEVICE_OR_PRODUCTION',generatedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),htmlSha256=hashlib.sha256((R/'index.html').read_bytes()).hexdigest(),pageCount=len(routes),total=len(checks),passed=sum(x['status']=='PASS' for x in checks),checks=checks,limitations=['Checks inject the exact HTML bytes with set_content; no file:// or HTTPS navigation and no real device verification were performed in this suite.','Chromium only; no Safari, real phone lock screen, push delivery or screen-reader audit.','Contrast pairs audited separately; not full rendered-content automated conformance.'])
(out/'visual-browser-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='checks'},ensure_ascii=False,indent=2))
fail=[x for x in checks if x['status']=='FAIL']
if fail:print(json.dumps(fail,ensure_ascii=False,indent=2));raise SystemExit(1)
