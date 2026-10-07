"""Shared read-only metadata helpers for documentation generators."""
from pathlib import Path
import json

def metadata(root: Path) -> dict:
    return json.loads((root / 'release.json').read_text(encoding='utf-8'))

def document_banner(root: Path) -> str:
    r = metadata(root)
    v = r['versions']
    return ('<!-- BEGIN RELEASE META -->\n'
            f"**Bộ chuẩn {r['version']} · {r['releasedOn']} · Graphite Gold: ĐÃ DUYỆT · "
            f"Token {v['palette']} · API {v['api']} · Baseline nghiệp vụ {v['businessPlan']}.**\n"
            'Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. '
            'Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.\n'
            '<!-- END RELEASE META -->')
