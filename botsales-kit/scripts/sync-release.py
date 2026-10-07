"""Synchronize document metadata, navigation and the read-only compiled blueprint.
No network or dependencies; --check reports drift without writing.
Does not modify Universal, contracts, plan, progress, or historical references.
"""
from pathlib import Path
import argparse, json, posixpath, re
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
          '| Kế hoạch frontend | [execution/frontend-plan.json](execution/frontend-plan.json) | FE001–FE028; task, dependency và trọng số canonical |',
          '| Bản kế hoạch frontend để đọc | [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Sinh từ frontend-plan, frontend-progress và FRONTEND_PLAN_GUIDE |',
          '| Tiến độ frontend hiệu lực | [execution/frontend-progress.json](execution/frontend-progress.json) | Tính bằng tracker; STALE không đồng nghĩa code chưa viết |',
          '| Xem tiến độ frontend | [execution/FRONTEND_PROGRESS.md](execution/FRONTEND_PROGRESS.md) | Sinh bằng node scripts/progress.mjs report |',
          '| Full-product ngoài scope | [execution/plan.json](execution/plan.json), [execution/progress.json](execution/progress.json) | 84 task/420 bước gốc chỉ đọc; không thay tiến độ frontend |',
          '| Màu đã duyệt | [design/decision.json](design/decision.json) | ADR-VIS-021; không mở lại quyết định |',
          '| Giá trị màu | [design/tokens.json](design/tokens.json) | Nguồn HEX/semantic token duy nhất |',
          '| Bảng màu đọc được | [design/PALETTE.md](design/PALETTE.md) | Sinh từ token, không sửa tay |',
          '| MUI mapping | [design/IMPLEMENTATION_NOTES.md](design/IMPLEMENTATION_NOTES.md) | Đọc tại FE005; T010/T011 là tham chiếu full-product |',
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
             '`execution/frontend-plan.json` + frontend-progress + FRONTEND_PLAN_GUIDE → `node scripts/progress.mjs report` → IMPLEMENTATION_PLAN, phiếu FE và FRONTEND_PROGRESS.',
             '`execution/plan.json` + progress + PLAN_GUIDE → `node scripts/progress.mjs --full-product report` → FULL_PRODUCT_PLAN và PROGRESS (ngoài scope frontend; giữ read-only trong lượt frontend).',
             '`prototype/src/*` + release/token → `prototype/build.py` → prototype/index.html.', '',
             'Lịch sử nằm trong reference/ và CHANGELOG; mã phiên bản cũ ở đó không có hiệu lực thay thế nguồn hiện hành. Các phiên bản API/token/Universal khác nhau là chủ ý và được khai báo tại release.json.','']
    result['DOCUMENT_INDEX.md']='\n'.join(rows)
    parts=[f"# BotSales AI — Bộ đặc tả tổng hợp {release['version']}", '', banner, '',
           '**Bản đọc tổng hợp được sinh.** Nguồn triển khai là từng file docs/ và contracts/ trong cùng kit. Không sửa bản này thay nguồn.',
           'Kế hoạch frontend FE001–FE028/140 bước nằm ở IMPLEMENTATION_PLAN.md. Kế hoạch full-product 84 task/420 bước là tham chiếu read-only tại execution/plan.json và execution/tasks/T*.md. Nguồn màu duy nhất ở design/tokens.json; đọc DOCUMENT_INDEX.md để tìm đúng file.', '']
    for p in docs:
        rel=p.relative_to(R).as_posix()
        def compiled_link(match):
            target=match.group(1)
            if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:',target) or target.startswith('/'):
                return match.group(0)
            destination,separator,anchor=target.partition('#')
            destination=posixpath.normpath(posixpath.join(posixpath.dirname(rel),destination)) if destination else rel
            return ']('+destination+(separator+anchor if separator else '')+')'
        compiled=re.sub(r'\]\(([^\s)]+)\)',compiled_link,result[rel])
        def compiled_literal(match):
            target=match.group(1)
            source=R/posixpath.dirname(rel)/target
            if not source.is_file():
                return match.group(0)
            return '`'+posixpath.normpath(posixpath.join(posixpath.dirname(rel),target))+'`'
        compiled=re.sub(r'(?<!`)`(\.\./[^`\s]+)`(?!`)',compiled_literal,compiled)
        parts += ['---',f'<!-- SOURCE: {rel} -->',compiled]
    result['ARCHITECTURE_BLUEPRINT.md']='\n\n'.join(parts)+'\n'
    return result

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--check',action='store_true');args=ap.parse_args();drift=[]
    for name,text in outputs().items():
        p=R/name
        if args.check:
            if not p.exists() or p.read_text(encoding='utf-8')!=text:drift.append(name)
        else:p.write_bytes(text.encode('utf-8'))
    if drift:raise SystemExit('RELEASE_DOC_DRIFT: '+', '.join(drift))
    print('Release documents are synchronized' if args.check else 'Synchronized 28 document headers, index and compiled blueprint')
