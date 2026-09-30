"""Synchronize document metadata, navigation and the read-only compiled blueprint.
No network or dependencies; --check reports drift without writing.
Does not modify Universal, contracts, plan, progress, or historical references.
"""
from pathlib import Path
import argparse, json, re
from release_common import metadata, document_banner
R=Path(__file__).resolve().parents[1]

def outputs():
    release=metadata(R); banner=document_banner(R); result={}
    docs=sorted((R/'docs').glob('*.md'))
    for p in docs:
        raw=p.read_text(encoding='utf-8')
        raw=re.sub(r'\n*<!-- BEGIN RELEASE META -->.*?<!-- END RELEASE META -->\n*','\n\n',raw,flags=re.S)
        title,body=raw.split('\n',1)
        result[p.relative_to(R).as_posix()]=title+'\n\n'+banner+'\n\n'+body.lstrip('\n')
    rows=[('# Bản đồ tài liệu chuẩn '+release['version']), '', banner, '',
          'Đường dẫn ở đây tính từ gốc kit. Đọc nguồn đúng vai trò; bản tổng hợp, CSS, YAML và báo cáo là đầu ra sinh, không sửa tay thay nguồn.', '',
          '| Mục đích | Nguồn hiện hành | Cách sử dụng |','|---|---|---|',
          '| Bắt đầu | [START_HERE.md](START_HERE.md) | Cách đặt kit và giao việc |',
          '| Giao AI code | [PROJECT_BUILD_PROMPT_VI.txt](PROJECT_BUILD_PROMPT_VI.txt) | Thực hiện trong repo/công cụ có quyền |',
          '| Kế hoạch | [execution/plan.json](execution/plan.json) | Task, phụ thuộc, trọng số; không sửa để tăng % |',
          '| Bản kế hoạch để đọc | [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Sinh từ plan, progress và PLAN_GUIDE |',
          '| Tiến độ thực | [execution/progress.json](execution/progress.json) | Chỉ bằng chứng ứng dụng có hiệu lực mới có điểm |',
          '| Xem tiến độ | [execution/PROGRESS.html](execution/PROGRESS.html) | Sinh bằng tracker report |',
          '| Màu đã duyệt | [design/decision.json](design/decision.json) | ADR-VIS-021; không mở lại quyết định |',
          '| Giá trị màu | [design/tokens.json](design/tokens.json) | Nguồn HEX/semantic token duy nhất |',
          '| Bảng màu đọc được | [design/PALETTE.md](design/PALETTE.md) | Sinh từ token, không sửa tay |',
          '| MUI mapping | [design/IMPLEMENTATION_NOTES.md](design/IMPLEMENTATION_NOTES.md) | Làm tại T010 trước T011 |',
          '| Chuẩn AI dùng chung | [AI_RULES.md](AI_RULES.md) | Universal 3.1 nguyên bản |',
          '| Chuẩn dự án | [AI_RULES_PROJECT.md](AI_RULES_PROJECT.md) | Không ghi đè quy tắc gốc repo |',
          '| API hiện hành | [contracts/openapi.json](contracts/openapi.json) | JSON nguồn, YAML/index là output |',
          '| Demo | [prototype/index.html](prototype/index.html) | Chỉ review UI, không phải app production |',
          '| Tiếp nhận bản mới | [UPGRADE.md](UPGRADE.md) | Bảo toàn tiến độ repo đang chạy |',
          '| Kết quả gói | [evidence/DELIVERY_REPORT_VI.md](evidence/DELIVERY_REPORT_VI.md) | Phạm vi kiểm chứng và giới hạn |', '',
          '## 28 đặc tả nguồn','', '| File | Nội dung |','|---|---|']
    for p in docs:
        rel=p.relative_to(R).as_posix(); title=result[rel].splitlines()[0].lstrip('# ')
        rows.append(f'| [{p.name}]({rel}) | {title} |')
    rows += ['', '## Một lộ trình sinh, không nhiều nguồn cạnh tranh', '',
             '`design/tokens.json` → `scripts/generate-theme.py` → CSS, PALETTE và bảng màu trong docs/03. ',
             '`contracts/*.json` → `scripts/generate-reference.py` → YAML/index, docs/04 và docs/17. ',
             '`release.json` + docs nguồn → `scripts/sync-release.py` → metadata, DOCUMENT_INDEX, ARCHITECTURE_BLUEPRINT. ',
             '`execution/plan.json` + progress + PLAN_GUIDE → `node scripts/progress.mjs report` → kế hoạch/phiếu việc/tiến độ. ',
             '`prototype/src/*` + release/token → `prototype/build.py` → prototype/index.html.', '',
             'Lịch sử nằm trong reference/ và CHANGELOG; mã phiên bản cũ ở đó không có hiệu lực thay thế nguồn hiện hành. Các phiên bản API/token/Universal khác nhau là chủ ý và được khai báo tại release.json.','']
    result['DOCUMENT_INDEX.md']='\n'.join(rows)
    parts=[f"# BotSales AI — Bộ đặc tả tổng hợp {release['version']}", '', banner, '',
           '**Bản đọc tổng hợp được sinh.** Nguồn triển khai là từng file docs/ và contracts/ trong cùng kit. Không sửa bản này thay nguồn.',
           'Kế hoạch 84 task/420 bước nằm ở IMPLEMENTATION_PLAN.md; nguồn màu duy nhất ở design/tokens.json; đọc DOCUMENT_INDEX.md để tìm đúng file.', '']
    for p in docs:
        rel=p.relative_to(R).as_posix()
        parts += ['---',f'<!-- SOURCE: {rel} -->',result[rel]]
    result['ARCHITECTURE_BLUEPRINT.md']='\n\n'.join(parts)+'\n'
    return result

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--check',action='store_true');args=ap.parse_args();drift=[]
    for name,text in outputs().items():
        p=R/name
        if args.check:
            if not p.exists() or p.read_text(encoding='utf-8')!=text:drift.append(name)
        else:p.write_text(text,encoding='utf-8')
    if drift:raise SystemExit('RELEASE_DOC_DRIFT: '+', '.join(drift))
    print('Release documents are synchronized' if args.check else 'Synchronized 28 document headers, index and compiled blueprint')
