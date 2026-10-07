"""Regenerate derived reference files only; never modifies source contracts, plan or progress."""
from pathlib import Path
import json,yaml
R=Path(__file__).resolve().parents[1];read=lambda f:json.loads((R/f).read_text())
release=read('release.json')
from release_common import document_banner
banner=document_banner(R)
a=read('contracts/openapi.json');(R/'contracts/openapi.yaml').write_text(yaml.safe_dump(a,allow_unicode=True,sort_keys=False))
ops=[{'operationId':o['operationId'],'method':method.upper(),'path':path,'permission':o.get('x-permission'),'module':o.get('tags',['unknown'])[0]}for path,ms in a['paths'].items()for method,o in ms.items()if isinstance(o,dict)and 'operationId'in o]
(R/'contracts/operation-index.json').write_text(json.dumps({'version':'2.0','operations':ops},ensure_ascii=False,indent=2)+'\n')
routes=read('contracts/route-manifest.json')['routes'];features=read('contracts/feature-catalog.json')['features']
lines=['# 04 — Màn hình và luồng hiện hành',banner,'\nNguồn chuẩn: contracts/route-manifest.json. File này sinh bởi scripts/generate-reference.py. 54 route là hợp đồng màn hình sản phẩm; prototype có phạm vi riêng tại prototype/PROTOTYPE_SCOPE.json.','\nMọi màn hình kế thừa Graphite Gold theo design/decision.json đã duyệt và design/tokens.json, dark-only, session/tenant/permission, lỗi/empty/stale/unknown và navigation keyboard ở docs/03,08,09. Actions phải có backend allowedActions, không chỉ đủ permission string.']
for r in routes:
 lines += [f'\n## {r["id"]} — {r["title"]}',f'\n**Route:** `{r["path"]}` · **Module:** `{r["module"]}` · **Đọc:** `{r.get("readPermission") or "session/bootstrap"}`',f'\n**Mục đích:** {r.get("purpose",r["title"])}',f'\n**Nội dung:** {r.get("content","")}',f'\n**Hành vi:** {r.get("behavior","")}',f'\n**Trường hợp cần xử lý:** {r.get("edgeCases","")}',f'\n**API đọc:** {", ".join(r.get("readOperations",[]))}', '\n| Hành động | operationId | Quyền |','|---|---|---|']
 for act in r.get('actions',[]):lines.append(f'| {act.get("label",act["operationId"])} | `{act["operationId"]}` | `{act.get("permission") or "authenticated/context"}` |')
 lines += ['\n**States:** '+', '.join(r.get('states',[])),'\n**Kịch bản:** '+', '.join(r.get('acceptanceScenarioIds',[]))+'. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.']
(R/'docs/04_SCREENS_AND_FLOWS.md').write_text('\n'.join(lines)+'\n')
lines=['# 17 — Truy vết yêu cầu → màn hình → kế hoạch → kiểm thử',banner,'\nSinh từ feature-catalog.json bằng scripts/generate-reference.py. Đây là liên kết đặc tả, không là bằng chứng đã chạy.','\n| Yêu cầu | Màn hình | Task | Kịch bản |','|---|---|---|']
for f in features:lines.append(f'| {f["id"]} — {f.get("title",f.get("name",""))} | {", ".join(f["routeIds"])} | {", ".join(f["taskIds"])} | SC2-{f["id"]} |')
(R/'docs/17_TRACEABILITY.md').write_text('\n'.join(lines)+'\n')
print('Updated OpenAPI YAML/index and docs/04,17 from canonical JSON only')
