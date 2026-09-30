"""Local prototype interactions. Not backend, real phone push, or production E2E proof."""
from pathlib import Path
import json,os,hashlib
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent;out=R/'evidence';out.mkdir(exist_ok=True)
errors=[];requests=[];checks=[]
def record(name,condition=True):
 checks.append({'name':name,'status':'PASS' if condition else 'FAIL'})
 assert condition,name
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 page.set_content((R/'index.html').read_text(),wait_until='load')
 def go(route):
  page.evaluate('(r)=>location.hash="/"+r',route);page.wait_for_timeout(35)
 def click(action,id=None):
  page.locator('[data-action="'+action+'"]'+('[data-id="'+id+'"]' if id else '')).first.click(timeout=2500);page.wait_for_timeout(25)
 def submit(form):page.locator('button[type="submit"][form="'+form+'"]').click();page.wait_for_timeout(40)
 def state():return page.evaluate('BSDemo.inspect().state')
 def shop():
  s=state();return s['shops'][s['activeShop']]
 routes=['overview','inbox','customers','orders','products','categories','imports','inventory','movements','knowledge','reviews','bot','playground','evaluations','finance','entries','profit','reports','channels','providers','settings','team','audit','privacy','jobs','review','login','workspaces','onboarding','preparation','shipping','phone','suppliers','replenishment','purchase','approvals','agents','workitems','cod','journals','debts','periods','returns2','marketing','progress2']
 for r in routes:
  go(r);record('Render '+r,page.locator('h1').count()==1)
 go('overview');page.screenshot(path=str(out/'overview-desktop.png'),full_page=True)
 click('v2-new-order');record('Create confirmed order + notification',len(shop()['ops']['notifications'])==2)
 go('phone');page.screenshot(path=str(out/'phone-desktop.png'),full_page=True)
 click('v2-fallback','NOTIF-DH-1008');record('Fallback increments bounded attempt',next(n for n in shop()['ops']['notifications'] if n['orderId']=='DH-1008')['attempts']==2)
 click('v2-claim','DH-1008');record('Phone claim acknowledged',next(n for n in shop()['ops']['notifications'] if n['orderId']=='DH-1008')['ack'])
 go('preparation');click('v2-pick','DH-1008');page.locator('input[name="confirmed"]').check();submit('v2-prep');record('Pick checklist moves state',next(x for x in shop()['ops']['prep'] if x['orderId']=='DH-1008')['state']=='picked')
 click('v2-pack','DH-1008');page.locator('input[name="confirmed"]').check();submit('v2-prep')
 page.screenshot(path=str(out/'preparation-desktop.png'),full_page=True)
 click('v2-handover','DH-1008');page.locator('input[name="confirmed"]').check();submit('v2-prep');record('Handover distinct from delivery',shop()['ops']['shipments'][0]['state']=='in_transit')
 go('shipping');click('v2-delivered','DH-1008');record('Delivery creates COD pending',next(o for o in shop()['orders'] if o['id']=='DH-1008')['payment']=='cod_collected')
 go('cod');click('v2-cod-form','DH-1008');page.locator('input[name="fee"]').fill('15000');page.locator('input[name="verified"]').check();submit('v2-cod');record('COD reconciliation actual net',next(o for o in shop()['orders'] if o['id']=='DH-1008')['settledNet']=='234000')
 go('replenishment');click('v2-po-form','p3');page.locator('input[name="quantity"]').fill('4');submit('v2-po');po=shop()['ops']['pos'][0]['id'];record('Reorder is awaiting approval',shop()['ops']['pos'][0]['state']=='pending_approval')
 go('approvals');click('v2-approve-po','APR-'+po);record('Owner approval persists',shop()['ops']['pos'][0]['state']=='approved')
 go('purchase');click('v2-send-po',po);click('v2-confirm-po',po);click('v2-receive-form',po);page.locator('input[name="quantity"]').fill('2');page.locator('input[name="confirmed"]').check();submit('v2-receive');record('Partial goods receipt',shop()['ops']['pos'][0]['received']==2 and shop()['ops']['pos'][0]['state']=='part_received')
 page.screenshot(path=str(out/'purchase-desktop.png'),full_page=True)
 go('journals');record('Balanced journals visible',page.locator('tbody tr').count()>=4);page.screenshot(path=str(out/'journals-desktop.png'),full_page=True)
 go('periods');click('v2-close-period');record('Period cannot close with unfinished PO',shop()['ops']['period']=='open')
 go('returns2');click('v2-return-form');page.locator('select[name="order"]').select_option('DH-1001');submit('v2-return');ret=shop()['ops']['returns'][0]['id'];click('v2-inspect-return',ret);record('Return held quarantined',shop()['ops']['returns'][0]['state']=='quarantined')
 go('agents');click('v2-toggle-agent','sales');go('overview');before=len(shop()['orders']);click('v2-new-order');record('Paused sales refuses simulated auto order',len(shop()['orders'])==before)
 # Role and offline state via actual options form.
 click('demo-options');page.locator('select[name="role"]').select_option('viewer');page.locator('select[name="scene"]').select_option('normal');submit('form-options');go('preparation');record('Viewer cannot claim in UI',page.locator('[data-action="v2-claim"]').count()==0)
 click('demo-options');page.locator('select[name="role"]').select_option('owner');page.locator('select[name="scene"]').select_option('offline');submit('form-options');go('preparation');before=shop()['ops']['prep'];page.locator('[data-action="v2-claim"]').first.click();record('Offline write blocked',shop()['ops']['prep']==before)
 click('demo-options');page.locator('select[name="scene"]').select_option('normal');submit('form-options')
 click('feedback');page.locator('textarea[name="text"]').fill('Bổ sung kiểm tra điện thoại tại màn hình chuẩn bị.');submit('form-feedback');record('Feedback captured with route',len(page.evaluate('BSDemo.inspect().ui.feedback'))==1)
 page.set_viewport_size({'width':390,'height':844})
 for r in ['overview','phone','preparation','inbox','purchase','approvals']:
  go(r);record('Mobile no page overflow '+r,not page.evaluate('document.documentElement.scrollWidth>innerWidth'))
  if r in ['overview','phone']:page.screenshot(path=str(out/(r+'-mobile.png')),full_page=True)
 record('No JavaScript page errors',not errors);record('No external network',not requests)
 b.close()
report={'scope':'LOCAL_CHROMIUM_DOCUMENT_PROTOTYPE_ONLY','environment':'Chromium headless, 1440x1000 and 390x844. Document injected with set_content; no HTTPS/server/real phone push verification.','htmlSha256':hashlib.sha256((R/'index.html').read_bytes()).hexdigest(),'checks':checks,'errors':errors,'requests':requests,'total':len(checks),'passed':sum(x['status']=='PASS' for x in checks)}
(out/'browser-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))
