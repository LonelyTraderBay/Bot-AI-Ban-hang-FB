"""Validate theme generation and declared color pairs, NOT full WCAG conformance.
Python 3.10+. No third-party dependencies. May write evidence/visual-validation.json.
"""
from pathlib import Path
import json,math,subprocess,sys,re,hashlib,datetime
R=Path(__file__).resolve().parents[1];T=json.loads((R/'design/tokens.json').read_text());C=T['colors'];checks=[]
def add(name,ok,**details):checks.append(dict(name=name,status='PASS' if ok else 'FAIL',**details))
def luminance(h):
 a=[int(h[i:i+2],16)/255 for i in (1,3,5)]
 a=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in a]
 return sum(x*y for x,y in zip(a,[.2126,.7152,.0722]))
def ratio(fg,bg):
 a,b=sorted([luminance(fg),luminance(bg)]);return (b+.05)/(a+.05)
run=subprocess.run([sys.executable,str(R/'scripts/generate-theme.py'),'--check'],capture_output=True,text=True)
add('Canonical outputs contain no drift',run.returncode==0,detail=run.stdout+run.stderr)
add('Fixed dark-only identity',T['theme']=='dark-only' and T['visualIdentity']=='Graphite Gold')
surfaces=['canvas','surface','raised','elevated','hover','selected','input','heroStart','heroEnd','sidebar']
for fg in ['textPrimary','textSecondary','textMuted','accent','success','warning','danger','info','violet']:
 for bg in surfaces:
  value=ratio(C[fg],C[bg]);add(f'Text {fg} on {bg}',value>=4.5,ratio=round(value,3),minimum=4.5)
for bg in ['accent','accentHover','accentPressed']:
 value=ratio(C['onAccent'],C[bg]);add(f'CTA ink on {bg}',value>=4.5,ratio=round(value,3),minimum=4.5)
for key in ['success','warning','danger','info','violet']:
 value=ratio(C[key],C[key+'Surface']);add(f'{key} badge',value>=4.5,ratio=round(value,3),minimum=4.5)
for bg in surfaces:
 value=ratio(C['borderControl'],C[bg]);add(f'Control boundary on {bg}',value>=3,ratio=round(value,3),minimum=3)
css=(R/'prototype/src/app.css').read_text();js=(R/'prototype/src/app.js').read_text()
add('App CSS contains no hex palette outside canonical tokens',not re.search(r'#[0-9a-fA-F]{3,8}\b',css))
add('No app-owned OS color-scheme branch or theme switch',not re.search(r'prefers-color-scheme|matchMedia\([^)]*color-scheme|light-dark\(|useColorScheme|ThemeModeContext',css+js))
add('Primary action hover uses explicit semantic token','background:var(--color-accent-hover)' in css)
add('Informational badges no longer inherit action gold','.badge.blue{background:var(--color-info-surface);color:var(--color-info)}' in css)
add('Reduced motion preserved','prefers-reduced-motion:reduce' in css)
add('Forced-colors preserved','@media(forced-colors:active)' in css and 'forced-color-adjust:none' not in css)
add('Focus visible retained','focus-visible' in css)
# CSS custom properties referenced by prototype must be declared (apart from script/chart dynamic properties).
allcss=(R/'design/tokens.css').read_text()+css
variables=set(re.findall(r'(--[\w-]+)\s*:',allcss))
refs=set(re.findall(r'var\((--[\w-]+)',allcss+js))
add('Every CSS variable reference has a declaration',refs<=variables,missing=sorted(refs-variables))
report=dict(scope='FIXED_THEME_STATIC_AND_DECLARED_COLOR_PAIRS_ONLY',generatedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),tokensSha256=hashlib.sha256((R/'design/tokens.json').read_bytes()).hexdigest(),total=len(checks),passed=sum(x['status']=='PASS' for x in checks),checks=checks,limitations=['Decorative separators are not asserted to reach 3:1.','Disabled controls/alpha/photo overlays/full assistive-technology usage need runtime review.','Not a full WCAG certification, not production verification.'])
(R/'evidence').mkdir(exist_ok=True);(R/'evidence/visual-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='checks'},ensure_ascii=False,indent=2))
if report['passed']!=report['total']:
 print(json.dumps([x for x in checks if x['status']=='FAIL'],ensure_ascii=False,indent=2));raise SystemExit(1)
