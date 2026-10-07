"""Build the portable UI prototype. Python 3.10+, no external packages.
The token CSS is generated from design/tokens.json; no alternate themes.
"""
from pathlib import Path
import hashlib
import json
import subprocess, sys

ROOT = Path(__file__).resolve().parent
release = json.loads((ROOT.parent/'release.json').read_text(encoding='utf-8'))
subprocess.run([sys.executable, str(ROOT.parent/'scripts/generate-theme.py')], check=True)
css = '\n'.join((ROOT/'src'/f).read_text() for f in ['tokens.css', 'app.css'])
js = '\n'.join((ROOT/'src'/f).read_text() for f in ['seed.js','permissions.js','domain.js','domain-v2.js','app.js'])
js = js.replace('__BOTSALES_RELEASE_VERSION__', release['version'])
# No remote script, asset, font, API call, or credentials. Inline for file:// portability.
html = '''<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><meta name="description" content="BotSales AI — bản demo tương tác dark-only. Dữ liệu mô phỏng, không kết nối dịch vụ thật."><title>BotSales AI RELEASE_VERSION — Graphite Gold</title><style>CSS_HERE</style></head>
<body><div id="root"><div style="padding:32px">Đang mở bản demo BotSales AI…</div></div>
<noscript><div style="padding:32px"><h1>BotSales AI RELEASE_VERSION — Graphite Gold</h1><p>Hãy bật JavaScript để bấm thử. Đây là demo cục bộ, không kết nối AI hoặc Facebook.</p></div></noscript>
<dialog id="modal" class="modal" aria-labelledby="modal-title"></dialog><div id="toast-zone" class="toast-zone" role="status" aria-live="polite" aria-atomic="false"></div>
<script>JS_HERE</script></body></html>'''.replace('RELEASE_VERSION',release['version']).replace('CSS_HERE',css).replace('JS_HERE',js.replace('</script','<\\/script'))
(ROOT/'index.html').write_text(html,encoding='utf-8')
print(json.dumps({'artifact':'index.html','bytes':len(html.encode()),'sha256':hashlib.sha256(html.encode()).hexdigest()},indent=2))
