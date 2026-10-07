"""Build the portable UI prototype. Python 3.10+, no external packages.
The token CSS is generated from design/tokens.json; no alternate themes.
"""
from pathlib import Path
import argparse, hashlib
import json
import subprocess, sys

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
release = json.loads((ROOT.parent/'release.json').read_text(encoding='utf-8'))
subprocess.run([sys.executable, str(ROOT.parent/'scripts/generate-theme.py'), *(['--check'] if args.check else [])], check=True)
css = '\n'.join((ROOT/'src'/f).read_text(encoding='utf-8') for f in ['tokens.css', 'app.css'])
js = '\n'.join((ROOT/'src'/f).read_text(encoding='utf-8') for f in ['seed.js','permissions.js','domain.js','domain-v2.js','app.js'])
js = js.replace('__BOTSALES_RELEASE_VERSION__', release['version'])
# No remote script, asset, font, API call, or credentials. Inline for file:// portability.
html = '''<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><meta name="description" content="BotSales AI — bản demo tương tác dark-only. Dữ liệu mô phỏng, không kết nối dịch vụ thật."><title>BotSales AI RELEASE_VERSION — Graphite Gold</title><style>CSS_HERE</style></head>
<body><div id="root"><div style="padding:32px">Đang mở bản demo BotSales AI…</div></div>
<noscript><div style="padding:32px"><h1>BotSales AI RELEASE_VERSION — Graphite Gold</h1><p>Hãy bật JavaScript để bấm thử. Đây là demo cục bộ, không kết nối AI hoặc Facebook.</p></div></noscript>
<dialog id="modal" class="modal" aria-labelledby="modal-title"></dialog><div id="toast-zone" class="toast-zone" role="status" aria-live="polite" aria-atomic="false"></div>
<script>JS_HERE</script></body></html>'''.replace('RELEASE_VERSION',release['version']).replace('CSS_HERE',css).replace('JS_HERE',js.replace('</script','<\\/script'))
payload = html.encode('utf-8')
if args.check:
    if not (ROOT/'index.html').is_file() or (ROOT/'index.html').read_bytes() != payload:
        raise SystemExit('PROTOTYPE_DRIFT: index.html')
else:
    (ROOT/'index.html').write_bytes(payload)
print(json.dumps({'artifact':'index.html','bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest()},indent=2))
