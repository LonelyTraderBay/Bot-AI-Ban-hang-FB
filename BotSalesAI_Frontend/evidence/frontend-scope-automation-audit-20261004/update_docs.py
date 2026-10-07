"""One-time, reviewable documentation reconciliation; no application/ledger writes."""
from pathlib import Path
import hashlib
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
PATHS = ["docs/FRONTEND_SCOPE.md", "docs/FRONTEND_UI_IMPROVEMENT_PLAN.md", "docs/PROJECT_CONTEXT.md",
         "docs/CONTINUE_FRONTEND.md", "docs/KNOWN_GAPS.md", "evidence/REPORT.md", "README.md",
         "STACK_LOCK.md", "DELIVERY.json", "botsales-kit/execution/FRONTEND_PLAN_GUIDE.md",
         "botsales-kit/execution/SESSION_HANDOFF.md"]


def read(p):
    return (ROOT / p).read_text(encoding="utf-8-sig")


def write(p, text):
    (ROOT / p).write_text(text.rstrip() + "\n", encoding="utf-8")


def section(text, start, end, replacement):
    assert text.count(start) == 1, start
    assert text.count(end) == 1, end
    a, b = text.index(start), text.index(end)
    assert a < b
    return text[:a] + replacement.rstrip() + "\n\n" + text[b:]


snapshot = OUT / "before-documents.json"
assert not snapshot.exists(), "Reconciliation is one-time; review instead of overwriting the historical snapshot."
snapshot.write_text(json.dumps({p: {"sha256": hashlib.sha256((ROOT / p).read_bytes()).hexdigest(),
                                   "content": read(p)} for p in PATHS}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

scope = """# Phạm vi và thực hiện tự động của dự án Frontend

Cập nhật 04/10/2026 theo yêu cầu trực tiếp của người dùng: **mọi công việc triển khai trong folder `BotSalesAI_Frontend` phục vụ Frontend React/TypeScript với API mock tổng hợp; AI tự thực hiện đến hồ sơ bàn giao, người dùng chỉ nghiệm thu cuối**. Áp dụng `AI_RULES.md` Universal 3.1 nguyên bản.

## 1. Phạm vi có hiệu lực

- Sản phẩm triển khai: `apps/web`; test, mock HTTP, generator, packages contracts/tokens và cấu hình phục vụ app Frontend. Kiểm tra hiện tại có `apps/web`; không có `apps/api`, `apps/worker` hoặc `infra` triển khai sản phẩm.
- Frontend dùng một MUI/theme, TanStack Query, Router, RHF/Zod và i18next. App ghép public entries; module không import module khác; shared không import app/modules/mocks. Không port prototype HTML.
- API chuẩn: `botsales-kit/contracts/openapi.json`, route/permission/event contracts và `design/tokens.json`. Generated output phải sinh bằng generator; không sửa tay để né contract. MSW chỉ demo/test, dữ liệu tổng hợp và có nhãn. Production artifact không chứa seed/worker/fallback demo.
- Kit vẫn chứa đặc tả toàn sản phẩm, Backend và lịch sử. Chúng mô tả giao tiếp, bất biến và UI cần hiển thị; **không giao việc xây server cho checkout này**. `execution/plan.json`, `progress.json`, `tasks/T*.md`, `PROGRESS.*` và full-product reports chỉ đọc. T-ID trong `sourceTaskIds` là truy vết, không là dependency Frontend.
- Ngoài phạm vi: Backend/DB/worker thật, migrations/restore/tải server, OIDC/Meta/AI/carrier/supplier/Push/Telegram thật, backend staging, hosting/deploy. `dev:live` là chế độ client để tích hợp sau này, không là task dựng Backend.

## 2. Một nguồn cho mỗi vai trò

| Vai trò | Nguồn có hiệu lực |
|---|---|
| Quy tắc chung | `AI_RULES.md` nguyên bản; giữ cả bản root/kit byte-identical |
| Phạm vi và chính sách tự thực hiện | File này; quyết định 04/10/2026 |
| Task FE001–FE028 / ledger | `botsales-kit/execution/frontend-plan.json` / `frontend-progress.json` |
| Quy trình và tiêu chí FE-G01..09 | `botsales-kit/execution/FRONTEND_PLAN_GUIDE.md` |
| Bản đọc sinh tự động | `botsales-kit/IMPLEMENTATION_PLAN.md`, `frontend-tasks/FE*.md`, `FRONTEND_PROGRESS.md`, `frontend-progress-report.json` |
| Backlog UI + kiến trúc bổ sung | `docs/FRONTEND_UI_IMPROVEMENT_PLAN.md`, bảng UI001–UI026; không tạo ledger chép tay |
| Bằng chứng thực / tiếp tục | `evidence/REPORT.md`, `docs/CONTINUE_FRONTEND.md`; luôn đối chiếu source/artifact hashes |
| Audit toàn bộ tài liệu | Mục 12 của kế hoạch UI và inventory từng file trong `evidence/frontend-scope-automation-audit-20261004/` |

## 3. AI tự làm đến bàn giao, không có bước chờ người dùng giữa chừng

1. Xác minh baseline/diff và nhận việc; tự tìm input trong repo. Không hỏi lại palette, browser matrix, FE017 mock permission hay ngoại lệ scanner đã được người dùng duyệt.
2. Sửa UI và ownership/invariant kiến trúc trong cùng ID. Chạy checks phù hợp, xử lý lỗi, thêm regression có ý nghĩa và cập nhật evidence đúng diff. Thiếu toolchain cục bộ được AI khắc phục trong scope; không biến thành việc người dùng phải cài/chạy thay.
3. UI012: hoàn thiện browser/keyboard/axe/zoom/contrast/semantic/visual coverage có thể kiểm chứng tự động. Screen-reader speech và human review chưa quan sát được phải ghi `NOT_RUN`/giới hạn; không yêu cầu người dùng thực hiện giữa chừng, không coi DOM là speech PASS.
4. UI022: hoàn thiện workflow và tái lập clean local checks. FE-G08 đã cho phép **CI hoặc clean local tương đương**. Hosted run, publish workflow và credentials GitHub không là prerequisite bàn giao Frontend. Chưa chạy hosted CI ghi `NOT_RUN`; cấu hình có lỗi phải sửa, không dùng thay đổi phạm vi để bỏ lỗi cấu hình.
5. UI023: AI chạy UAT kỹ thuật trên demo, lập case/result/issues/ngoại lệ, chuẩn bị hồ sơ để người dùng xem một lần cuối. Không chờ owner UAT trước khi nhận việc. AI không điền thay quyết định nghiệm thu của người dùng.
6. UI024: AI chốt fingerprint, artifact, gate matrix, hướng dẫn run/reset/thay API, báo cáo rủi ro và handoff; không chờ hosted CI hoặc owner ký trước khi chuẩn bị bàn giao. Bàn giao ở mức `READY_FOR_ACCEPTANCE`; nghiệm thu thật được ghi sau câu trả lời của người dùng.
7. Revalidate task FE `STALE` theo dependency bằng script canonical và bằng chứng nguyên task. Không cộng điểm từ số dòng tài liệu, UI DONE hoặc log không bao phủ acceptance FE. Không checkpoint toàn sản phẩm.

Không có dependency bắt buộc vào Backend, tài khoản provider, remote publication, người kiểm screen reader hay owner sign-off để AI **thực hiện và chuẩn bị bàn giao**. Dependency kỹ thuật giữa các task và kiểm tra tính đúng vẫn giữ nguyên.

## 4. Trạng thái và tính trung thực

Tại audit 04/10: **0 task FE BLOCKED và 0 hàng UI BLOCKED**. 28 task FE lưu DONE lịch sử nhưng effective status là 28 STALE, 0/140 VERIFIED; AI cần tái xác minh. Đây là nợ bằng chứng, không phải phát hiện toàn bộ code hỏng.

Không tạo trạng thái BLOCKED để chờ owner, Backend hoặc hosted CI. Lỗi kỹ thuật thực phải được ghi, sửa và kiểm lại; nếu bất khả thi trong quyền/công cụ hiện có thì báo đúng phần thiếu, tiếp tục phần độc lập. Không thể đảm bảo mọi lần chạy tương lai không lỗi, không giả PASS hay tắt gate để đáp ứng một con số.

Phân biệt ba mốc: **hoàn tất việc AI có thể tự kiểm chứng**; **hồ sơ sẵn sàng nghiệm thu**; **người dùng đã nghiệm thu**. `READY_FOR_ACCEPTANCE` không là owner acceptance hoặc production certification. FE-G05 manual và FE-G09 owner chưa có bằng chứng vẫn mở trong rubric 9 gate; chuyển thời điểm kiểm không tự làm readiness 7/9 thành 9/9. Không công bố Production-Ready/Enterprise-Grade trước khi các gate bắt buộc có bằng chứng hoặc ngoại lệ phạm vi được chấp nhận rõ.

## 5. Các quyết định đã có

Frontend-only/mock được duyệt 30/09; Backend/provider thật không chặn UI mock. FE017 được phép dùng `knowledge.publish` + lifecycle, không thêm `Knowledge.allowedActions` vào schema. UI020 desktop Chrome ≥154 / Firefox ≥155 đã được duyệt; Edge/Safari/physical mobile best effort, PWA install/OS push ngoài scope đã chọn. UI021 có accepted-review exception cho 13 findings; scanner exit 1 vẫn giữ đúng. Quyết định tự thực hiện 04/10 thay các prerequisite owner/manual/hosted của kế hoạch cũ; không sửa kết quả lịch sử.

Không có quyền mới để commit/push/merge/deploy, gửi tin thật, chi tiền, đổi canonical API/palette hoặc ghi owner approval. Việc này không cần những thao tác đó để hoàn tất hồ sơ Frontend local.
"""
write("docs/FRONTEND_SCOPE.md", scope)

common = """Bằng chứng runtime gần nhất đã chạy: [UI012/S39 verify](../evidence/frontend-ui-improvements/UI012/S39-current-frontend-verify-20261004.log), [S40 Chromium + Firefox](../evidence/frontend-ui-improvements/UI012/S40-full-e2e-20261004.log) **388/388** (194 mỗi engine), [UI020/S08 installed Chrome 154](../evidence/frontend-ui-improvements/UI020/S08-google-chrome-full-e2e-20261004.log) **194/194**. Đây là Windows local + React demo + synthetic MSW; không phải hosted CI, Backend hoặc owner acceptance. Audit tài liệu lần này không chạy lại build/E2E. Kiểm hash 161 input của [UI024/S08](../evidence/frontend-ui-improvements/UI024/S08-current-worktree-and-artifact-fingerprint.json) là căn cứ kiểm độ mới, không tự chứng minh hành vi."""
context = """# Hồ sơ dự án Frontend — hiện hành 04/10/2026

Mục tiêu được duyệt: Frontend React/TypeScript với mock API tổng hợp đủ nghiệm thu. AI tự hoàn thiện và kiểm chứng code/evidence/handoff; người dùng chỉ nghiệm thu cuối. Phạm vi/tự động hóa có hiệu lực tại [FRONTEND_SCOPE.md](FRONTEND_SCOPE.md); backlog UI + kiến trúc tại [kế hoạch](FRONTEND_UI_IMPROVEMENT_PLAN.md).

## Hiện trạng và nguồn bằng chứng

""" + common + """

- Cấu trúc: 54 route, 16 module, 65 TS/TSX files; 429 import edges, 0 boundary issue/cycle, 8/8 negative fixtures theo S39. Một MUI/theme, QueryClient và Router; MSW chỉ demo/test. Không có apps/api, apps/worker hoặc infra sản phẩm trong checkout.
- Verify S39: generator 11 outputs/283 schemas/210 operations/54 routes; source 65/220/54; domain/MSW 88/88; Vitest 85/85; lint/typecheck/build đạt. Production entry còn advisory 738.45 kB raw/186.93 kB gzip.
- S40/S08 gồm route-role 357/357, empty 11/11, route-error 51/51 và bốn FE022 journeys cho mỗi engine. Số case pass không thay phép thử speech, hosted run hoặc người dùng nghiệm thu.
- Kế hoạch UI: 22/26 DONE, 118/130 checkpoints; UI012 và UI022 IN_PROGRESS 4/5; UI023/UI024 TODO 0/5. Lượt đổi kế hoạch không tự tăng điểm. Cả bốn mục được AI nhận tiếp mà không chờ thao tác người dùng.
- Tracker FE: stored 28 DONE là lịch sử; `progress.mjs status` effective 0/140 VERIFIED, 28 STALE, blocked=[]; không được nói hiện tại 100%. Canonical FE plan/ledger giữ nguyên, revalidate bằng script khi đủ bằng chứng nguyên task.
- Rubric FE-G01..09: 7/9 đã PASS theo evidence scoped; FE-G05 manual và FE-G09 acceptance vẫn chưa đủ. Đây không phải phần trăm chất lượng kiến trúc React hoặc code hoàn thiện.

## Quyết định và ranh giới

Contract/route/token canonical tại botsales-kit; generated do generator tạo. FE017 dùng knowledge.publish + lifecycle; không có Knowledge.allowedActions mới. UI020 support matrix desktop đã duyệt; UI021 13 findings/exit 1 đã có review exception, không gọi scanner PASS. Không hỏi lại các quyết định này.

UI012 tiếp tục automation và hồ sơ giới hạn screen-reader; UI022 sửa/tái lập workflow bằng local clean gates, hosted CI ngoài điều kiện bàn giao local; UI023 AI-UAT kỹ thuật và hồ sơ nghiệm thu cuối; UI024 fingerprint/gates/handoff READY_FOR_ACCEPTANCE. Owner acceptance chỉ ghi sau xác nhận cuối thật. Chi tiết việc phải làm nằm trong mục 12 và phiếu của kế hoạch.

Backend/DB/worker/provider/staging/hosting không triển khai ở đây. Tài liệu full-product trong kit chỉ đọc; không tăng progress.json toàn sản phẩm. Git root nằm ở folder cha; workflow GitHub đúng vị trí .github tại Git root. Không tự commit/push/merge/deploy.

## Tiếp tục phiên

Đọc AGENTS, Universal, scope, [CONTINUE_FRONTEND](CONTINUE_FRONTEND.md), [REPORT](../evidence/REPORT.md) và task hiện hành; xác minh diff/hashes trước sửa. UI + ARCH được kiểm trong cùng ID; revalidate dependency FE riêng, không làm lại tính năng đã đúng chỉ vì ledger STALE. Bản context trước audit được lưu nguyên nội dung/hash tại before-documents.json trong hồ sơ audit, để tránh các snapshot cũ trở thành hướng dẫn tiếp tục.
"""
write("docs/PROJECT_CONTEXT.md", context)
write("docs/CONTINUE_FRONTEND.md", """# Tiếp tục Frontend tự động — 04/10/2026

Quyết định người dùng: AI làm toàn bộ phần Frontend trong scope, người dùng chờ nghiệm thu cuối. Đọc [scope](FRONTEND_SCOPE.md), [kế hoạch UI + kiến trúc](FRONTEND_UI_IMPROVEMENT_PLAN.md) và [REPORT](../evidence/REPORT.md). Không có bước yêu cầu owner/manual/hosted CI trước khi nhận và thực hiện việc.

## Trạng thái thật

UI 22/26 DONE, 118/130 checkpoints; UI012/UI022 4/5, UI023/UI024 0/5. FE status effective 0/140 VERIFIED, 28 STALE, blocked=[]; không sử dụng câu 100% của handoff 02/10. Bằng chứng gần nhất S39 verify, S40 Chromium/Firefox 388/388 và Chrome154 S08 194/194; lượt docs audit không chạy lại những suites này. FE-G05/manual và FE-G09/final acceptance chưa có đủ bằng chứng.

## Thứ tự AI tự thực hiện

1. Kiểm cwd/Git root/HEAD/status/diff, đọc Universal nguyên bản và nguồn contract. Giữ dirty work. Không hỏi lại phạm vi Frontend-only hoặc các quyết định FE017/UI020/UI021 đã được duyệt.
2. UI012.C04: đối chiếu matrix interaction/semantic/keyboard/zoom/contrast/visual, tự kiểm phần còn thiếu trong browser. Lưu coverage/giới hạn; speech chưa quan sát được ghi NOT_RUN để trình một lần cuối, không yêu cầu người dùng chạy Narrator giữa chừng.
3. UI022.C04: sửa mismatch workflow hiện chỉ cài Chromium trong khi Playwright có cả Firefox; đối chiếu với npx playwright install --with-deps chromium firefox. Tái lập clean local gates/evidence trước bàn giao. Hosted GitHub run ghi NOT_RUN, không cần push/credentials để làm phần này.
4. UI023: nhận việc ngay, tự chạy UAT kỹ thuật theo bốn journeys và triggers mới, lập kết quả/issue/ngoại lệ + artifact identity. Sheet quyết định người dùng vẫn để trạng thái chờ nghiệm thu cuối; không ghi AI là product owner.
5. UI024: chốt production/demo artifacts, source fingerprint, gate matrix, checks/risks/runbook/handoff; chuẩn bị READY_FOR_ACCEPTANCE. Không chờ owner ký để tạo gói bàn giao.
6. Revalidate FE001–FE028 theo dependency và nguyên acceptance bằng progress.mjs; cập nhật checkpoint chỉ khi evidence hợp lệ. Plan/ledger full-product chỉ đọc. Sau source/config đổi, kiểm lại phần bị tác động, không dùng log cũ để đóng diff mới.

## Lệnh đã có trong repo

Root Frontend trên Windows dùng npm.cmd: generate:check, test:source, boundaries, lint, typecheck, test:domain, test, verify, build, build:demo, test:e2e. Khi cần môi trường sạch: npm ci, setup, doctor; cài Chromium/Firefox cho suite hiện hành. Đọc script trước khi chạy vì setup/E2E ghi generated/artifacts/evidence.

Trong botsales-kit: node scripts/progress.mjs validate; status; next; start FE-ID Codex; checkpoint FE-ID S-ID evidence-path; report. Không chạy tất cả chỉ vì chúng có trong danh sách; chọn checks theo diff và giữ log/cwd/exit/environment/hash. Không chỉnh tay generated reports hoặc tracker.

Lỗi thật do AI chẩn đoán/sửa/rerun, tiếp tục phần độc lập; không đổi FAIL thành PASS hoặc giấu bằng DONE. Chỉ trình yêu cầu nghiệm thu khi gói reviewable đã sẵn sàng. Không tự commit/push/merge/deploy hoặc tác động dịch vụ thật.
""")

old_gaps = read("docs/KNOWN_GAPS.md")
historical_start = old_gaps.index("## Snapshot trước lần làm mới evidence")
write("docs/KNOWN_GAPS.md", """# Giới hạn và việc Frontend còn cần kiểm — 04/10/2026

Phạm vi/thời điểm nghiệm thu theo [FRONTEND_SCOPE](FRONTEND_SCOPE.md); task chi tiết và audit toàn tài liệu ở [kế hoạch](FRONTEND_UI_IMPROVEMENT_PLAN.md). AI tự thực hiện đến hồ sơ bàn giao; không chờ owner/manual/hosted CI giữa chừng.

## Hiện hành

""" + common + """

| Mục | Sự thật quan sát được | Xử lý trong phạm vi AI |
|---|---|---|
| UI012 / FE-G05 | Browser/keyboard/axe/zoom/contrast có evidence; speech transcript và human review rộng chưa có | Tự hoàn thiện browser coverage, lập giới hạn riêng; NOT_RUN cho speech, trình cùng hồ sơ cuối; không gọi full WCAG PASS |
| UI022 | Workflow ở Git root; public API snapshot S26 không có hosted run; install step chỉ Chromium trong khi config có Firefox | Sửa đồng bộ browser install/config và clean local replay; hosted NOT_RUN không ngăn bàn giao local |
| UI023 / FE-G09 | Automated journeys đạt; chưa có quyết định nghiệm thu cuối trên artifact mới | AI-UAT kỹ thuật/result sheet/issues; người dùng chỉ xác nhận cuối, không phải prerequisite để AI làm |
| UI024 | S08 có fingerprint; gói handoff cuối chưa hoàn tất | Tổng hợp gate/artifact/checksums/risks, READY_FOR_ACCEPTANCE; refresh sau thay đổi input |
| Tracker FE | Stored DONE, effective 28 STALE / 0 VERIFIED do hash/dependency | Tái xác minh nguyên task bằng script; không tự tăng điểm trong lượt docs |
| Performance | Byte budgets local đạt, raw chunk advisory còn; profile emulated median 3.887 s | Giữ số đo/rủi ro, không bịa physical-device SLA |
| UI021 | Scanner exit 1/13; crosswalk + accepted review exception S38 | Task DONE theo exception; scanner vẫn non-passing, không suppression |
| Live integration | Backend/provider/server auth/persistence chưa xác minh | Ngoài scope triển khai; giữ typed client và preview/giới hạn đúng contract |

UI020 scope desktop đã được duyệt và chạy đủ Chrome154/Chromium153/Firefox155; không còn việc chờ owner chọn matrix. Android soft keyboard có evidence AVD UI015/S07; không phải handset. Actual zoom không còn là mục hoàn toàn chưa chạy: S14/S17 kiểm 17 routes theo phạm vi cụ thể.

FE017 mock dùng knowledge.publish + lifecycle theo quyết định đã có; không thêm Knowledge.allowedActions. Missing live credentials không chặn frontend mock. Readiness rubric vẫn 7/9; đây không phải % code/architecture. Những snapshot dưới đây giữ để truy vết, không giao việc hoặc thay trạng thái hiện hành.

---

""" + old_gaps[historical_start:])

old_readme = read("README.md")
readme_body = old_readme[old_readme.index("## 1. Mở trong VS Code"):]
readme_body = readme_body.replace("npx playwright install chromium", "npx playwright install chromium firefox")
readme_body = readme_body.replace("Playwright Chromium đã kiểm tra tự động", "Playwright Chromium/Firefox và Chrome cài máy đã có bằng chứng tự động")
write("README.md", """# BotSales AI — Frontend 0.1.0

**Dự án trong folder này triển khai Frontend React/TypeScript với API mock tổng hợp.** Scope và thực hiện tự động được chốt ngày 04/10/2026 tại [FRONTEND_SCOPE](docs/FRONTEND_SCOPE.md). AI tự sửa/kiểm thử/bàn giao trong scope; bạn chỉ nghiệm thu cuối. Kit có đặc tả Backend/toàn sản phẩm để tham chiếu contract, không giao task xây server ở đây.

Trạng thái đọc tại [kế hoạch UI + kiến trúc](docs/FRONTEND_UI_IMPROVEMENT_PLAN.md): 22/26 DONE, 118/130 checkpoint; 0 hàng UI BLOCKED. Tracker FE effective 0/140 VERIFIED, 28 STALE, blocked=[]; cần tái xác minh, không phải 100% hiện hành. [REPORT](evidence/REPORT.md) ghi S39 verify, S40 Chromium/Firefox 388/388 và Chrome154 S08 194/194. Lượt audit docs không chạy lại build/E2E; scope local/mock không thay Backend, hosted CI hoặc owner acceptance.

UI012/022/023/024 có công việc AI thực hiện tiếp mà không chờ owner/manual/hosted CI. Hồ sơ cuối sẽ ghi rõ screen-reader NOT_RUN, hosted CI NOT_RUN và final acceptance pending nếu chưa có bằng chứng. Production-Ready/Enterprise-Grade chưa được tự chứng nhận. [CONTINUE_FRONTEND](docs/CONTINUE_FRONTEND.md) chỉ rõ thứ tự thực hiện.

`SHA256SUMS.json` là checksum gói giao ban đầu 29/09, không là checksum worktree hiện tại. Metadata và kết quả ban đầu được giữ làm snapshot; fingerprint hiện hành có scope tại UI024/S08 và hồ sơ bàn giao cuối. Không dùng checksum/lỗi missing dependency lịch sử để khóa công việc đang làm.

""" + readme_body)

write("STACK_LOCK.md", """# Toolchain và dependency lock — đối chiếu 04/10/2026

Nguồn chuẩn phiên bản khai báo: package.json root, apps/web/package.json; phiên bản resolved là package-lock.json thật hiện có. Không dùng tài liệu khai báo cũ để kết luận chưa có lockfile. packageManager npm@11.17.0; engine Node >=24 <25. Evidence S39/S40 dùng Windows Node24.19.0/npm11.17.0.

| Thành phần | Phiên bản khai báo hiện hành |
|---|---|
| React / ReactDOM | 19.1.1 |
| TypeScript / Vite | 5.9.2 / 7.3.6 |
| MUI Material / icons | 7.3.1 |
| TanStack Query / Router | 5.85.5 / 7.18.4 |
| RHF / Zod | 7.62.0 / 4.1.3 |
| i18next / react-i18next | 25.4.2 / 15.7.3 |
| MSW / Vitest / Playwright / axe-core playwright | 2.11.1 / 5.0.3 / 1.63.0 / 4.10.2 |
| Recharts / AJV | 3.1.2 / 8.20.0 |

Các khai báo này đã đọc từ manifests, không là kết quả dependency vulnerability scan mới. Không tự nâng stack, npm audit fix --force hoặc force-install trong task UI/docs. Khi tái lập dùng npm ci theo lock, setup/doctor và checks theo diff. Lượt audit tài liệu không cold-install/build/test lại; runtime logs S39/S40/S08 tại evidence/REPORT.md, fingerprint S08 định danh input đã kiểm.

Baseline khi giao gói 29/09 dùng Node22.16.0/TS5.8.3 và chưa cài dependency là lịch sử, không mô tả checkout hiện tại. Nội dung cũ/hash được giữ trong before-documents.json của hồ sơ audit. Kiến trúc một MUI/Query/Router, canonical contract và Graphite Gold token vẫn theo scope hiện hành.
""")

delivery = json.loads(read("DELIVERY.json"))
write("DELIVERY.json", json.dumps({"version": delivery["version"], "specVersion": delivery["specVersion"],
    "scope": "FRONTEND_WITH_SYNTHETIC_MOCK_API", "status": "AUTONOMOUS_FRONTEND_WORK_IN_PROGRESS",
    "date": "2026-10-04", "scopeAuthority": "docs/FRONTEND_SCOPE.md", "plan": "docs/FRONTEND_UI_IMPROVEMENT_PLAN.md",
    "verification": "evidence/REPORT.md", "frontendCompleteVerified": False, "productionReady": False,
    "currentEvidence": {"source": "UI012/S39; UI012/S40; UI020/S08", "verify": "PASS_ON_RECORDED_LOCAL_SCOPE",
                        "chromiumFirefoxPassed": 388, "installedChromePassed": 194, "runtimeRerunInDocumentationAudit": False},
    "pending": ["UI012 automatic coverage/limitations", "UI022 workflow browser-install consistency/local replay",
                "UI023 technical UAT result package", "UI024 final handoff", "FE checkpoint revalidation", "final user acceptance"],
    "hostedCI": "NOT_RUN", "screenReaderSpeech": "NOT_RUN", "ownerAcceptance": "PENDING_FINAL_ACCEPTANCE",
    "fullProductTracker": "botsales-kit/execution/progress.json (read-only, unchanged)",
    "initialDeliverySnapshot": delivery}, ensure_ascii=False, indent=2))

guide = read("botsales-kit/execution/FRONTEND_PLAN_GUIDE.md")
guide += """

## 7. Quyết định tự thực hiện Frontend — 04/10/2026

Nguồn quyết định là yêu cầu trực tiếp của người dùng; chính sách hiện hành tại [FRONTEND_SCOPE.md](../docs/FRONTEND_SCOPE.md), task UI bổ sung tại [FRONTEND_UI_IMPROVEMENT_PLAN.md](../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md). Tại checkout này chỉ triển khai Frontend; Backend/staging/full-product trong kit là tham chiếu.

AI tự làm code/tests/evidence/revalidation/handoff, không chờ owner/manual/hosted CI trước khi nhận việc. User acceptance chỉ ở cuối khi gói bàn giao đã reviewable; không giả người dùng ký trước. FE-G08 đã cho phép CI hoặc clean local tương đương: giữ NOT_RUN cho hosted run chưa có. FE-G05 speech/manual chưa quan sát được vẫn chưa xác minh trong gate matrix; không ngăn thực hiện browser coverage và bàn giao hồ sơ có giới hạn, cũng không thành PASS của WCAG. FE-G09 tách UAT kỹ thuật AI thực hiện với quyết định nghiệm thu cuối của người dùng. Chuyển thời điểm nghiệm thu không tự cấp nhãn Production-Ready/Enterprise-Grade hoặc bỏ tiêu chí correctness.

Số FE checkpoint chỉ tăng sau bằng chứng nguyên task đúng diff; stored DONE lịch sử phải đối chiếu effective status/hash. STALE do tài liệu/nguồn đổi cần AI tái xác minh theo dependency, không chờ owner mở khóa và không sửa ledger bằng tay. Không nhận task T, tự push/merge/deploy hoặc gọi local checks là hosted CI. Quy trình này không tự tạo scheduler hay bảo đảm phiên AI chạy khi đã đóng; tiếp tục tác vụ trong phiên được giao và lưu handoff rõ.
"""
write("botsales-kit/execution/FRONTEND_PLAN_GUIDE.md", guide)
write("botsales-kit/execution/SESSION_HANDOFF.md", """# Bàn giao Frontend — 04/10/2026

Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; người dùng chốt AI tự làm đến bàn giao và chỉ nghiệm thu cuối. Đọc [scope](../docs/FRONTEND_SCOPE.md), [kế hoạch UI](../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md), [CONTINUE_FRONTEND](../docs/CONTINUE_FRONTEND.md) và [REPORT](../evidence/REPORT.md). Đường dẫn trong file này tính từ kit khi render guide; bản file ở execution dùng đường dẫn đầy đủ theo hướng dẫn bên dưới.

Nguồn file từ vị trí execution: ../../docs/FRONTEND_SCOPE.md, ../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md, ../../docs/CONTINUE_FRONTEND.md, ../../evidence/REPORT.md.

Effective tracker: 0/140 VERIFIED, 28 STALE, blocked=[]; stored 28 DONE là kết quả lịch sử. Không tiếp tục tuyên bố 100% từ handoff 02/10. Frontend/full-product plan/ledgers không bị ghi tăng trong lượt audit.

Runtime evidence gần nhất: UI012/S39 verify PASS; UI012/S40 Chromium153 + Firefox155 388/388; UI020/S08 installed Chrome154 194/194. UI plan 22/26 DONE, 118/130; UI012/UI022 4/5, UI023/UI024 0/5. UI020 matrix và UI021 exception đã duyệt; strict scan vẫn exit1/13. FE-G05/manual và FE-G09/user acceptance chưa đủ; readiness scoped 7/9, không phải % code/architecture.

Tiếp theo AI tự làm: UI012 browser coverage/limits → UI022 đồng bộ workflow install Chromium+Firefox và local replay → UI023 technical UAT/result package → UI024 fingerprint/gates/handoff READY_FOR_ACCEPTANCE; FE task revalidation theo dependency. Không chờ Narrator/người dùng/hosted GitHub giữa chừng. Git root ở folder cha; không tự commit/push/merge/deploy hoặc gọi mock là Backend proof. Lượt audit này chỉ đổi tài liệu; checks docs/generator và bảo toàn hashes ghi ở hồ sơ audit.

Nội dung/hash handoff cũ 02/10 được giữ trong evidence/frontend-scope-automation-audit-20261004/before-documents.json tại root Frontend, chỉ dùng lịch sử.
""".replace("[scope](../docs/", "[scope](../../docs/").replace("[kế hoạch UI](../docs/", "[kế hoạch UI](../../docs/").replace("[CONTINUE_FRONTEND](../docs/", "[CONTINUE_FRONTEND](../../docs/").replace("[REPORT](../evidence/", "[REPORT](../../evidence/"))

plan = read("docs/FRONTEND_UI_IMPROVEMENT_PLAN.md")
plan = plan.replace("**Phiên bản:** 5.49", "**Phiên bản:** 6.0", 1)
intro_start, intro_end = plan.index("**Mục tiêu:**"), plan.index("## 1. Đọc nhanh")
version_history = plan[intro_start:intro_end]
plan = plan[:intro_start] + """**Mục tiêu đã chốt 04/10/2026:** hoàn thiện UI và kiến trúc React **Frontend-only**, kiểm chứng bằng mock API tổng hợp; AI tự sửa, kiểm thử, tái xác minh và chuẩn bị bàn giao. Người dùng chỉ nghiệm thu cuối. Chính sách scope/tự thực hiện: [FRONTEND_SCOPE.md](FRONTEND_SCOPE.md). Mục 12 ghi audit toàn bộ tài liệu, mâu thuẫn trước sửa và xử lý từng điểm.

Phiên bản 6.0 thay các prerequisite owner/manual/hosted CI giữa chừng bằng công việc AI thực hiện và hồ sơ nghiệm thu cuối. **Không tăng checkpoint, giả screen-reader/hosted PASS hoặc ghi owner acceptance từ việc sửa kế hoạch.** Lịch sử phiên bản cũ được chuyển xuống mục 11.78; không áp dụng lại quyết định chờ đã được thay thế.

""" + plan[intro_end:]
plan = section(plan, "## 1. Đọc nhanh tình trạng và việc tiếp theo", "## 2. Nguồn, phạm vi", """## 1. Đọc nhanh tình trạng và việc tiếp theo

| Chỉ số | Hiện hành 04/10/2026 |
|---|---|
| Phạm vi triển khai | Frontend React/TS + mock HTTP/tests/tooling; không Backend/DB/worker/staging |
| Bắt buộc / tối ưu / toàn backlog | 13/16 DONE (81,25%) / 9/10 DONE (90%) / **22/26 DONE (84,62%)** |
| Checkpoint | **118/130 (90,77%)**; đổi kế hoạch không tăng điểm |
| Công việc còn lại | UI012/UI022 IN_PROGRESS 4/5; UI023/UI024 TODO 0/5; **AI thực hiện tiếp, không chờ owner/manual/hosted** |
| BLOCKED thực tế | **0/28 task FE; 0/26 hàng UI**; không có dependency task T/backend |
| Tracker FE hiệu lực | **0/140 VERIFIED, 28 STALE**, dù stored ledger có 28 DONE lịch sử; revalidation là việc AI |
| Runtime evidence đã chạy | [S39 verify](../evidence/frontend-ui-improvements/UI012/S39-current-frontend-verify-20261004.log) PASS; [S40 Chromium/Firefox](../evidence/frontend-ui-improvements/UI012/S40-full-e2e-20261004.log) **388/388**; [Chrome154 S08](../evidence/frontend-ui-improvements/UI020/S08-google-chrome-full-e2e-20261004.log) **194/194** |
| Kiến trúc/static | 65 TS/TSX files, 16 modules, 54 routes, 429 import edges/0 issue/cycle, 8 negative fixtures; generator 11/283/210/54 |
| Quyết định đã chốt | UI020 desktop matrix S06; UI021 accepted review S38, strict scanner vẫn exit1/13; FE017 knowledge.publish + lifecycle |
| Readiness của rubric 9 gate | **7/9 = 77,8%** theo bằng chứng; FE-G05 speech/manual và FE-G09 acceptance chưa đủ. Không phải % code hoặc architecture-only |
| Mốc bàn giao | AI hoàn tất hồ sơ `READY_FOR_ACCEPTANCE`; người dùng xác nhận cuối. Chuẩn bị bàn giao không đòi ký trước |
| Kiểm trong lượt này | Audit docs/plans/config, tracker/generator và hashes; không chạy lại build/E2E; không sửa code hoặc cộng ledger |

**Việc tiếp theo:** UI012 coverage + giới hạn → UI022 workflow/install consistency + local clean evidence → UI023 UAT kỹ thuật → UI024 artifact/gates/handoff. Revalidate FE theo dependency bằng evidence nguyên task. Không dùng checklist UI DONE để cộng checkpoint FE và không nhận full-product task.

Các log run cũ FAIL/interrupted, scanner exit1 và giới hạn speech/hosted được giữ đúng; không gọi mọi thứ PASS chỉ để đạt 100%. Không có blocker chờ người dùng ở quy trình triển khai hiện hành; lỗi thật phải được AI xử lý và kiểm lại.
""")
plan = section(plan, "### 2.1. Readiness theo bằng chứng hiện hành", "### 2.3. Quy trình bắt buộc", """### 2.1. Readiness theo bằng chứng hiện hành

[REPORT.md](../evidence/REPORT.md) là nguồn kết quả gate; FE-G01/02/03/04/06/07/08 có scoped evidence, FE-G05 manual và FE-G09 owner chưa đủ. Theo rubric không tính partial: **7/9 = 77,8%**. Lượt điều chỉnh quy trình không tự nâng điểm hoặc chuyển missing thành N/A. Chỉ đề nghị nhãn Production-Ready/Enterprise-Grade khi đủ evidence/ngoại lệ được chấp nhận đúng phạm vi.

Mốc tự động hoàn tất và mốc người dùng nghiệm thu được tách ở §9.2. FE-G05 có browser coverage tự động, speech NOT_RUN phải công khai; FE-G09 có technical UAT và final owner decision riêng. Thiếu hai bằng chứng này không làm AI chờ giữa chừng khi xây gói reviewable, nhưng cũng không phải PASS của hai gate.

### 2.2. Hiện trạng kiến trúc và artifact có căn cứ

S39 đọc 65 TS/TSX files, 16 modules/24 module files, 54 routes; 220 API reference sites; boundary 429 edges/0 issue/cycle và 8/8 negative fixtures. Một QueryClient, Router và MUI theme. Generator 11 outputs/283 schemas/210 operations/54 routes; không phải % kiến trúc tổng thể.

S39 verify có lint/typecheck, domain/MSW 88/88, Vitest 85/85 và production build. S40 đạt 388/388 Chromium153/Firefox155; S08 Chrome154 đạt 194/194; từng engine bao gồm route-role 357/357, empty 11/11, errors 51/51 và bốn journeys. [S08 fingerprint](../evidence/frontend-ui-improvements/UI024/S08-current-worktree-and-artifact-fingerprint.json) định danh 161 input, 32 production và 37 demo files. Logs không thay owner acceptance hoặc live Backend proof.

Advisory production raw chunk còn 738.45 kB/186.93 kB gzip theo S39; byte budgets local và profile emulated UI019 phải được giữ đúng environment. Strict UI021 S36 còn exit1/13 với [S37 crosswalk](../evidence/frontend-ui-improvements/UI021/S37-current-source-crosswalk-20261004.md) và [S38 accepted review](../evidence/frontend-ui-improvements/UI021/S38-requester-review-acceptance-20261004.md). Scope desktop theo [UI020/S06](../evidence/frontend-ui-improvements/UI020/S06-requester-approved-browser-scope-20261004.md); không hỏi lại matrix.

Độ mới runtime được kiểm hash; nếu input đổi sau log thì chạy lại gate ảnh hưởng. Documentation-only không yêu cầu lặp suites runtime đã có cùng input và không nhận suite chưa chạy là PASS.
""")
plan = plan.replace("Nếu thiếu owner/manual/remote evidence, giữ `PENDING`/`PARTIAL` và tiếp tục việc độc lập kế tiếp theo mục 4.", "Owner acceptance chỉ ở mốc cuối; manual/hosted chưa có ghi NOT_RUN/giới hạn, tiếp tục công việc tự động và chuẩn bị hồ sơ theo FRONTEND_SCOPE.md. Không ghi evidence chưa có là PASS.")
plan = plan.replace("| UI012 | Screen-reader/zoom/contrast/workflow manual đạt | Kiểm composition sau diff cuối, semantic controls và focus order thực; auto test không thay manual evidence; không tạo overlay riêng để chữa a11y | G05 |", "| UI012 | Browser/keyboard/zoom/contrast/semantic coverage và hồ sơ speech limits | Kiểm composition/focus sau diff; speech chưa quan sát được giữ NOT_RUN, không dùng DOM thay speech hoặc chờ người kiểm giữa chừng | G05 |")
plan = plan.replace("| `VERIFYING` | Đã có kết quả sửa hoặc kết quả kiểm thủ công, còn kiểm chứng/nghiệm thu |", "| `VERIFYING` | Đã có kết quả sửa, đang chạy checks/đối chiếu bằng chứng; AI tiếp tục xử lý |\n| `READY_FOR_ACCEPTANCE` | Việc AI và hồ sơ reviewable hoàn tất; chỉ chờ người dùng nghiệm thu cuối, không đồng nghĩa gate manual/owner PASS |")
plan = plan.replace("Không dùng `BLOCKED` chỉ vì chưa bắt đầu, chưa có owner hoặc dự án không có Backend.", "Không dùng `BLOCKED` để chờ owner/manual/hosted CI, chưa bắt đầu hoặc dự án không có Backend. BLOCKED trong enum là khả năng ghi sự cố thật, không phải trạng thái task hiện tại; không xóa lịch sử để che lỗi.")

rows = {
"UI012": "| UI012 | P1 | BC | Accessibility tự động và hồ sơ giới hạn FE-G05 | UI001–UI011 (đã DONE) | IN_PROGRESS | 4/5 | AI nhận tiếp C04 browser/semantic/visual coverage; speech NOT_RUN được ghi ở hồ sơ cuối, không chờ người kiểm. C04 chưa tăng điểm trong lượt docs. |",
"UI022": "| UI022 | P2 | TU | Workflow và tái lập checks Frontend local | UI009 (đã DONE); môi trường local | IN_PROGRESS | 4/5 | AI sửa install Chromium/Firefox mismatch và local replay; hosted CI NOT_RUN ngoài prerequisite bàn giao. Không gọi local là hosted PASS. |",
"UI023": "| UI023 | P1 | BC | UAT kỹ thuật tự động và hồ sơ nghiệm thu cuối | UI fixes/evidence đã có; không chờ owner/manual/hosted | TODO | 0/5 | AI tự nhận/chạy journeys/case/result/issues; quyết định người dùng chỉ ở nghiệm thu cuối; chưa tự đóng checkpoint. |",
"UI024": "| UI024 | P1 | BC | Artifact, gate matrix và bàn giao reviewable | Kết quả UAT kỹ thuật UI023; checks đúng artifact | TODO | 0/5 | AI chốt fingerprint/gates/runbook/risks READY_FOR_ACCEPTANCE; không đòi user ký hoặc hosted run để chuẩn bị gói. |",
}
for task, replacement in rows.items():
    lines = plan.splitlines()
    matches = [i for i,l in enumerate(lines) if l.startswith(f"| {task} | P")]
    assert len(matches) == 1, task
    lines[matches[0]] = replacement
    plan = "\n".join(lines) + "\n"

plan = section(plan, "### UI012 — Accessibility thủ công FE-G05", "## 6. Phiếu chi tiết", """### UI012 — Accessibility tự động và hồ sơ giới hạn FE-G05

**P1 · BC · IN_PROGRESS 4/5; C01–C03/C05 có evidence, C04 chưa đóng trong lượt docs.** Quyết định 04/10 thay prerequisite người kiểm screen reader giữa chừng. Các kết quả/gaps S01–S40 và yêu cầu cũ được giữ trong nhật ký §11 và before-documents.json, không biến speech chưa chạy thành PASS.

AI tự thực hiện C04:

1. Đối chiếu S02 interaction matrix với routes/specs và source cuối: skip/nav, dialog/menu/select, file selection/discard, error summary/422, live states, table scroll và chart alternative; ghi phần dùng chung và composition riêng.
2. Kiểm browser keyboard/name/role/state/focus/error association, giữ draft, disabled/permission và return focus. Chạy regression mục tiêu theo gap thật; không tạo test chỉ khớp mã nguồn hoặc chụp DOM rồi gọi speech PASS.
3. Đối chiếu zoom thật S14/S17/S21, contrast S09/S11, targets S10/S12, 54-route visual tour S25 và các fix R18/R06/R53/R23. Với source không đổi dùng scoped hashes/evidence; với thay đổi mới chạy lại phần bị tác động.
4. Review ảnh/state có thể quan sát trong browser sau animation, ghi coverage hữu hạn và issue thật. Tự sửa defect + ARCH owner/invariant trong cùng ID; không ép refactor hoặc thêm accessibility overlay.
5. Lập acceptance technical report và limitations: Narrator/speech transcript **NOT_RUN**, human conformance review chưa có. Manual proof không là prerequisite để AI hoàn tất browser coverage/handoff; không bỏ giới hạn hoặc công bố WCAG conformance toàn diện.

**Điều kiện C04 kỹ thuật:** matrix browser/semantic/keyboard/zoom/contrast/visual có kết quả truy vết trên đúng source, các defect mandatory đã xử lý, giới hạn manual được công khai theo scope mới. C04 chỉ đổi sau hồ sơ đối chiếu thực tế, không từ thay câu chữ kế hoạch. FE-G05 manual vẫn chưa PASS nếu thiếu speech/ngoại lệ nghiệm thu thật.

Evidence gần nhất: S39 verify, S40 multi-engine 388/388 và UI020/S08 Chrome154 194/194; S35 bounded R04/R23 visual samples, S36 Narrator runbook không có speech. Không yêu cầu người dùng thao tác Narrator giữa chừng hoặc lấy accessibility tree thay transcript.
""")
plan = section(plan, "### UI022 — CI Frontend tái lập", "## 8. Lệnh kiểm tra", """### UI022 — Workflow và checks Frontend có thể tái lập local

**P2 · TU · IN_PROGRESS 4/5; C01–C03/C05 có evidence, C04 chưa đóng trong lượt docs.** FE-G08 cho phép CI hoặc clean local tương đương; hosted run không là prerequisite bàn giao local.

- AI đối chiếu workflow Git root với package scripts, lock/toolchain, working directory, path filters, action pins và artifact scope. Root workflow đang chỉ install Chromium nhưng playwright.config.ts có Chromium + Firefox: phải sửa bước install đầy đủ trước chạy, không né bằng bỏ Firefox.
- Tái lập clean local gates/E2E phù hợp, lưu command/cwd/exit/environment/source/artifact hashes và kết quả. Linux hosted behavior chưa chạy vẫn NOT_RUN; local Windows checks không là hosted CI.
- C04 chỉ đóng khi workflow/browser prerequisites thống nhất, local replay và hồ sơ giới hạn đúng source đạt theo scope được chốt. Không cần push/gh auth để làm phần này; không tự commit/publish workflow.
- S26 public API 0 workflows/0 runs và S39/S40/S08 local checks là evidence đã có. API snapshot không chứng minh mọi private state; không poll remote liên tục khi không có thay đổi đầu vào.

## 7. Phiếu chi tiết — UAT kỹ thuật và bàn giao cuối

### UI023 — AI-UAT kỹ thuật, chuẩn bị người dùng nghiệm thu một lần cuối

**P1 · BC · TODO 0/5. AI được nhận ngay; không chờ manual/hosted/owner session.** Các fix đã DONE và runtime evidence là input; mọi lỗi mới cần xử lý trong scope.

- C01: nhận task, đối chiếu route/feature/state/role và regression; xác định demo artifact, source fingerprint, dataset/clock/hai shops/role presets. Không dùng runbook chuẩn bị làm checkpoint đã chạy.
- C02: chuẩn bị technical UAT/result matrix cho bốn journeys catalog→stock→order→prep, procurement→approval→partial receipt, finance→reconciliation/debt, Inbox→knowledge/bot; thêm category >100, evaluations nhiều trang, secondary-query state, shop/role switch, draft/discard, accepted/unknown và timezone.
- C03: AI thực hiện case browser thật, ghi expected/observed/request/mock state/result, screenshots/traces phù hợp và ARCH invariants. Automation PASS chỉ là technical UAT, không phải product-owner session.
- C04: tái hiện/sửa defect, regression/rerun trên source cuối, đối chiếu results với source/artifact; phân loại resolved issue, giới hạn và exception đã có, không tự chấp nhận ngoại lệ mới quan trọng.
- C05: bàn giao technical results + hồ sơ quyết định cuối ở `READY_FOR_ACCEPTANCE`. Sheet owner ghi `PENDING_FINAL_ACCEPTANCE`; người dùng chỉ xác nhận khi gói đã sẵn sàng. Không chờ chữ ký trước khi chạy C01–C04 hay tạo hồ sơ C05; không ghi thay owner approval.

[S00 runbook](../evidence/frontend-ui-improvements/UI023/S00-owner-uat-runbook-draft.md) là draft chuẩn bị; AI cập nhật phiên bản mới theo quy trình này và source cuối. FE-G09 final user decision vẫn chưa PASS trước khi có thật.

### UI024 — Chốt artifact/gates/handoff reviewable

**P1 · BC · TODO 0/5. Dependency là kết quả UAT kỹ thuật UI023 và correctness của artifact, không phải chữ ký owner/hosted run.**

- C01: đọc results UAT kỹ thuật, source diff/fingerprint, scope và checklist giao nhận; kiểm các task đã DONE có evidence còn đúng.
- C02: tổng hợp production/demo artifacts, checksums, gate matrix, run/reset fixture/thay API, rủi ro và ngoại lệ; build lại khi source/config liên quan đổi, giữ MSW isolation.
- C03: kiểm links/hashes/commands, coverage route×state×role×feature và UI+ARCH trên bản cuối; local clean hoặc CI evidence đúng scope. Revalidate phần FE đã đủ nguyên acceptance bằng script, không cộng ledger từ tài liệu.
- C04: đối chiếu full regression cuối khi cần, runtime gaps và các log FAIL/exit1; FE-G05 speech/manual và FE-G09 owner chưa có ghi đúng. Không yêu cầu 9/9 giả để bàn giao hồ sơ reviewable.
- C05: giao source/diff/artifact/evidence/gate matrix/risks với trạng thái `READY_FOR_ACCEPTANCE`; đề nghị người dùng nghiệm thu một lần cuối. Sau xác nhận mới ghi accepted artifact/fingerprint/ngày/người/quyết định.

Giữ [S08 fingerprint/preflight](../evidence/frontend-ui-improvements/UI024/S08-current-preflight-summary-20261004.md) làm input, refresh sau thay đổi source/test/config/artifact. Production-Ready/Enterprise-Grade cần Production Claim Gate và evidence/ngoại lệ hợp lệ; technical delivery không tự là certification hoặc quyền deploy.
""")
plan = section(plan, "### 9.2. Khi nào được đóng đợt bắt buộc", "## 10. Nhật ký", """### 9.2. Hai mốc hoàn tất, không bắt người dùng nghiệm thu trước bàn giao

**Mốc A — AI hoàn tất công việc tự động, sẵn sàng nghiệm thu:** các fix UI/ARCH bắt buộc có evidence đúng source; UAT kỹ thuật, artifact isolation, checks/hash/gate matrix/hướng dẫn/giới hạn và handoff reviewable hoàn tất. UI012 speech và hosted CI chưa chạy được ghi riêng; không có P1 thực tế bị che bằng tổng suite PASS. Hồ sơ ghi `READY_FOR_ACCEPTANCE`; chỉ checkpoint kỹ thuật thực sự đủ mới có điểm. Tổng checklist, effective FE progress và gate readiness phải báo riêng.

**Mốc B — người dùng đã nghiệm thu:** người dùng xem đúng gói artifact/fingerprint và xác nhận cuối; ghi quyết định/ngoại lệ thực. Khi chưa có mốc B, không nhận owner acceptance hoặc FE-G09 PASS. FE-G05 manual/conformance chưa đủ vẫn chưa đạt nếu chưa có bằng chứng/ngoại lệ được chấp nhận. Nhãn Production-Ready/Enterprise-Grade không tự phát sinh từ 26/26 hoặc 140/140.

Không có dependency Backend/provider credentials/hosted publish/owner/manual giữa các task để đạt mốc A. Lỗi frontend, regression, source/hash không khớp và contract bắt buộc vẫn phải được AI xử lý đúng, không hạ gate hoặc đổi trạng thái để giấu.
""")
plan = section(plan, "### Blocker đang mở", "### Quyết định và thay đổi phạm vi", """### Công việc tự động còn mở — không có task BLOCKED

Audit 04/10 xác nhận blocked=[] trong FE status và 0 hàng UI BLOCKED. Những điều kiện chờ người dùng/remote của v5.49 được thay theo quyết định scope, không nhận chúng là evidence đã chạy.

| ID | AI tự làm tiếp | Bằng chứng ngoài automation cần ghi đúng | Không còn prerequisite |
|---|---|---|---|
| UI012.C04 | Browser/semantic/keyboard/zoom/contrast/visual matrix + technical acceptance/limits | Speech NOT_RUN, human conformance chưa có | Người dùng chạy Narrator giữa chừng |
| UI022.C04 | Sửa browser install/config mismatch, workflow/local clean replay | Hosted CI NOT_RUN | Push/credentials/hosted run trước bàn giao local |
| UI023 | Technical UAT/cases/results/issues + sheet nghiệm thu cuối | Owner decision PENDING_FINAL_ACCEPTANCE | Owner session/manual sign-off trước nhận task |
| UI024 | Artifact/fingerprint/gates/runbook/risks/handoff | Ghi đúng manual/owner/hosted unknown | Owner ký trước tạo hồ sơ bàn giao |
| FE001–FE028 | Revalidate evidence stale theo dependency | Stored DONE không phải effective PASS | Người dùng mở khóa ledger bằng tay |

Test hoặc toolchain fail thực phải được AI sửa/rerun; không cam kết mọi lần chạy đều thành công, không xóa khả năng ghi sự cố thực của tracker.
""")
plan = section(plan, "### Hướng dẫn bắt đầu / tiếp tục phiên cho AI", "## 11. Kiểm tra tính nhất quán", """### Hướng dẫn bắt đầu / tiếp tục phiên cho AI

Đọc AGENTS, Universal nguyên bản, FRONTEND_SCOPE, PROJECT_CONTEXT, CONTINUE_FRONTEND, REPORT và kit docs/02/06/18. Xác minh Git root/HEAD/diff và canonical inputs. Nhận UI012/022/023/024 theo §4–7; tự thực hiện checks/bugfix/evidence/handoff trong scope Frontend, không chờ người dùng/manual/hosted giữa chừng. Revalidate FE riêng theo nguyên task/dependency và script.

Hiện UI 22/26 và 118/130; FE 0/140 effective, 28 STALE, 0 BLOCKED; readiness 7/9. UI020/021 đã DONE theo scope/review, không hỏi lại support matrix hoặc scanner exception. S39 verify, S40 388/388 và Chrome154 S08 194/194 là logs gần nhất; đọc hashes trước dùng lại. UI và ARCH có verdict riêng; không port prototype, sửa canonical/generated bằng tay hoặc dựng Backend.

Tạo gói READY_FOR_ACCEPTANCE trước đề nghị người dùng nghiệm thu cuối. Giữ speech NOT_RUN/hosted NOT_RUN/owner pending đúng sự thật; không claim 9/9, production hoặc deployment. Lưu handoff khi phiên kết thúc; kế hoạch không tự khởi động AI ngoài phiên hoặc cài scheduler. Quyền tự làm trong scope không tự cấp commit/push/merge/deploy.
""")

audit = """

### 11.77. Audit scope/tự động hóa toàn tài liệu — 04/10/2026

Phiên bản 6.0 theo yêu cầu trực tiếp Frontend-only, AI tự làm đến bàn giao/người dùng chỉ nghiệm thu cuối. Audit full-content 1.361 file, 18.768.810 bytes trước sửa, UTF-8/JSON 0 lỗi, 28 FE/140 checkpoints, 26 UI rows, FE dependency ngoại scope 0, task BLOCKED 0. Chuẩn hóa current docs/handoff/metadata, hướng dẫn đọc kit và guide; sinh lại frontend reports đúng nguồn, giữ FE/full-product ledgers và Universal/contracts/tokens/premium audit. Không sửa runtime/code/test hoặc tăng checkpoint. Kết quả kiểm docs/generator/hash ở hồ sơ audit; chi tiết §12. Các mốc 22/26, 118/130 và readiness 7/9 không tăng vì đổi quy trình.

### 11.78. Lịch sử phiên bản trước 6.0 — chỉ truy vết

Các đoạn sau ghi tình trạng tại thời điểm phiên bản cũ. Prerequisite manual/owner/hosted được thay bằng quyết định 04/10; không dùng số liệu cũ làm trạng thái hiện hành.

""" + version_history + """
## 12. Audit toàn bộ tài liệu: chốt Frontend-only và AI tự thực hiện

### 12.1. Phạm vi kiểm và giới hạn của kết luận

Đã đọc/quét toàn bộ byte của **1.361 file UTF-8**, tổng **18.768.810 bytes** trước sửa: Markdown/TXT, JSON kế hoạch/tracker/contract/config/evidence, YAML và HTML tài liệu/prototype. Inventory ghi từng path/class/size/lines/SHA-256, tất cả keyword matches và task status có cấu trúc; parse JSON 0 lỗi. Cùng kiểm manifest, scripts generator/tracker/E2E, Playwright config và workflow thật tại Git root. Một ZIP baseline trong reference được giữ read-only, không giải nén để coi lịch sử thành task active. node_modules, .git, caches, dist, test-results/runtime reports không là tài liệu giao việc và được loại khỏi corpus.

Nguồn kiểm: [before inventory](../evidence/frontend-scope-automation-audit-20261004/before-inventory.json), [after inventory](../evidence/frontend-scope-automation-audit-20261004/after-inventory.json), [danh mục từng file](../evidence/frontend-scope-automation-audit-20261004/file-index.md), [snapshot nội dung trước sửa](../evidence/frontend-scope-automation-audit-20261004/before-documents.json), [script audit](../evidence/frontend-scope-automation-audit-20261004/audit_docs.py), [validation](../evidence/frontend-scope-automation-audit-20261004/validation.json). Đây là audit tài liệu/ownership/tracker, không chạy lại tất cả test sản phẩm hoặc chứng minh mọi code không lỗi.

| Nhóm tài liệu trước sửa | Số file | Vai trò trong checkout Frontend |
|---|---:|---|
| Docs Frontend active | 12 | Scope/context/continue/UI plan/design/UX/route matrices/readme/stack/root instructions |
| Kế hoạch/chỉ dẫn Frontend trong kit | 10 | FE source/ledger/map/guide/scope adoption/handoff/start/build prompt |
| Báo cáo/phiếu Frontend sinh | 31 | IMPLEMENTATION_PLAN, FRONTEND_PROGRESS, frontend-progress-report và 28 FE cards |
| Universal nguyên bản | 2 | Cùng SHA-256; không chỉnh cho riêng dự án |
| Cấu hình/metadata/dữ liệu Frontend | 14 | Manifest/VS Code/seed/premium/delivery/checksum; không là task Backend |
| Contracts/design/generated data | 18 | API/route/permission/events/token source và đầu ra, không dựng server |
| Đặc tả/nguồn tham chiếu kit | 53 | Bao gồm docs/00–27, governance/fixtures/templates/generator specs; áp dụng frontend portions |
| Kế hoạch/báo cáo toàn sản phẩm | 89 | T001–T084, 420 bước/ledger/reports; read-only ngoài phạm vi |
| Prototype review | 7 | Tham khảo UI, không port HTML thành production app |
| Reference lịch sử | 22 | Migration/version sources, không là baseline active |
| Evidence/snapshot lịch sử | 1.103 | Logs/results/acceptance/provenance; không tự cấp quyền hay đổi task status |
| **Tổng** | **1.361** | Không cộng số file thành % chất lượng |

### 12.2. Hai yêu cầu được chốt như thế nào

**1. Frontend-only:** tất cả công việc triển khai active là FE001–FE028 và UI001–UI026, apps/web + mock/tests/tooling. FE plan scope FRONTEND_WITH_SYNTHETIC_MOCK_API; 28 tasks/140 steps; 0 dependency T/Backend, 0 unknown dependency. Có apps/web; không có apps/api, apps/worker hoặc infra triển khai. Tài liệu Backend/full-product vẫn tồn tại trong kit vì contract/UI cần giao tiếp và bất biến; scope/root+kit instructions đã chỉ rõ read-only reference. Không tuyên bố mọi file trong folder chỉ chứa từ ngữ Frontend.

**2. Không có task BLOCKED hoặc bước chờ người dùng giữa chừng:** FE stored tasks BLOCKED=0; effective status blocked=[]; bảng UI BLOCKED=0. Bốn luồng chờ của v5.49 đã được thay bằng nhiệm vụ AI tự làm và final acceptance. Correctness checks/task dependency vẫn còn; lỗi runtime/tooling thật cần được sửa, không thể cam kết không bao giờ có failure. Từ BLOCKED trong schema, lịch sử FE017 hoặc work-item nghiệp vụ không phải việc Frontend hiện bị khóa.

AI làm đến mốc A READY_FOR_ACCEPTANCE theo §9.2, người dùng nghiệm thu cuối mốc B. Kế hoạch là chỉ dẫn, không tự chạy ngoài phiên, không là daemon/scheduler, không bảo đảm mọi execution tương lai đều PASS. Không cần tạo automation định kỳ cho yêu cầu này.

### 12.3. Phát hiện cụ thể và cách xử lý

| ID / mức | Phát hiện thực tế trước sửa | Xử lý / việc AI còn làm |
|---|---|---|
| D01 P0 | CONTINUE_FRONTEND và SESSION_HANDOFF nói 100%/140 VERIFIED; status thật 0/140, 28 STALE; FE001.S01 báo changed docs/PROJECT_CONTEXT.md | Sửa current docs, sinh lại reports; FE revalidation theo dependency là việc AI, không đánh dấu code 0% |
| D02 P0 | Scope triển khai Frontend đã có nhưng kit docs/02/05/07/08/12/21–27, governance, T plans mô tả Backend/worker/provider | Khóa vai trò read-only reference trong scope/root+kit AGENTS/start/build prompt; không nhận T hoặc xây apps/api |
| D03 P0 | UI012.C04 bắt speech/human review; tool không quan sát được Narrator output; task khác bị chờ | AI browser/semantic/visual coverage + limits; speech NOT_RUN chuyển hồ sơ cuối, không gọi WCAG PASS |
| D04 P0 | UI022.C04 bắt hosted run/publish/gh auth dù FE-G08 cho clean local tương đương | Tái lập local checks đúng scope; hosted NOT_RUN ngoài prerequisite; không tự push hoặc bịa run URL |
| D05 P0 | UI023 chỉ được nhận sau manual/prerequisites và cần owner session; owner result sheet trống | AI nhận/chạy technical UAT ngay, chuẩn bị owner decision sheet chỉ ở cuối |
| D06 P0 | UI024 chờ owner/manual/hosted trước tạo final artifact/gate/handoff | Dependency technical UAT/correctness; AI tạo gói reviewable trước nghiệm thu |
| D07 P1 | Workflow Git root chỉ playwright install Chromium; current config có Chromium và Firefox | Ghi task UI022 phải sửa browser install/config và replay; **lỗi cấu hình chưa sửa trong lượt docs**, không nói automation đã hoàn chỉnh |
| D08 P1 | README dùng E2E143; continue/handoff147; context/gaps194 một engine; plan quick start vẫn UI0201/5/UI021partial, 20/26 dù bảng22/26 | Đồng bộ trạng thái hiện hành S39/S40/S08, UI020/21 decisions, giữ lịch sử ở §11/snapshot riêng |
| D09 P1 | Root STACK_LOCK nói không có package-lock, Vite7.1.3/Router7.8.2; manifests/lock hiện khác | Đối chiếu manifests thật, cập nhật stack doc; không đổi package/lock hoặc tự nâng dependency |
| D10 P1 | DELIVERY.json build BLOCKED_MISSING_DEPENDENCIES/browser NOT_RUN ngày29/09 có thể bị đọc thành hiện trạng | Cập nhật metadata current scoped evidence, giữ initial snapshot riêng; productionReady=false/final owner pending |
| D11 P1 | SHA256SUMS là checksum gói giao ban đầu; dùng nó kiểm current worktree sẽ sai | README ghi rõ lịch sử; current fingerprint S08/final handoff là scope khác, không ghi đè checksum lịch sử |
| D12 P1 | Frontend generated plan/progress/cards có status cũ dù source hashes đổi; sửa tay sẽ lệch canonical | Sửa guide/policy đúng nguồn, chạy progress.mjs report frontend; giữ plan/ledger không cộng điểm |
| D13 P1 | SourceTaskIds T trong FE cards dễ bị hiểu là task phải triển khai; docs14/PLAN_GUIDE full-product mô tả dependencies riêng | FE source deps chỉ FE; reference T không là runtime dependency; scope map/file index chỉ rõ |
| D14 P1 | UI021 scanner exit1/13 có source crosswalk; current accepted review S38 đã đóng nhưng docs vẫn đòi reviewer | Giữ UI021 DONE theo exception đã có, scan non-passing; không hỏi lại hoặc sửa link/handler đúng để lách scanner |
| D15 P1 | UI020 matrix đã duyệt và Chrome154/Firefox155 có evidence; một số tài liệu vẫn chờ owner lựa chọn | Loại chờ dư; browser support scope giữ nguyên, không suy hỗ trợ Safari/Edge/handset/PWA |
| D16 P1 | Readiness7/9, UI22/26, FEeffective0/140 và boundary429/429 là các mẫu số khác nhau | Báo tách riêng; không dùng average hoặc một tỷ lệ khác làm enterprise architecture % |
| D17 P2 | Owner/legal/retention/hard-delete ở UX contract không có authority; provider specs cần live policy | Giữ giới hạn và current contract/preview; không tự viết policy/endpoint, không biến thành prerequisite backend |
| D18 P2 | Chữ BLOCKED trong seed, business filters, enums, lịch sử block/resume và baseline snapshots | Phân loại structured task status; giữ business/historical truth, không tìm-thay toàn repo |
| D19 P2 | VS Code dev:live và API_PROXY_TARGET có thể bị hiểu cần server để nghiệm thu | Chế độ client tích hợp sau này, không trong đường nghiệm thu demo; không đọc/lộ .env.local secrets |
| D20 P2 | Runbook/UI012 speech procedure và owner UAT draft chỉ là chuẩn bị; snapshot log FAIL/interrupted không là PASS | Giữ evidence cũ, tạo hồ sơ mới khi chạy; không điền transcript/owner/signature giả |
| D21 P2 | Git root ở folder cha; CI tại Frontend/.github trước đây không được GitHub discover | Vị trí root workflow đúng, hiện untracked/local; không gọi GitHub đã chạy, không tự publish |
| D22 P2 | Kế hoạch không phải executable scheduler và không bảo đảm tự chạy sau phiên | Ghi explicit quyền tự làm trong phiên + handoff; không tạo heartbeat/cron không được yêu cầu |

### 12.4. Bảng khả năng tự thực hiện theo từng nhóm FE

| Nhóm | Phạm vi AI tự kiểm chứng | Input/điểm cần giữ |
|---|---|---|
| FE001–003 | Intake, toolchain, lock/setup/doctor/test runners | Cwd/Git/diff và script thật; tự xử lý môi trường trong quyền, không bịa check |
| FE004–008 | Boundaries/contracts/transport/design/synthetic scenarios | Canonical JSON/generated pipeline, one stack, scope keys/MSW isolation |
| FE009–021 | Module routes/forms/commands/realtime/permissions/inbox/catalog/finance/etc. | Browser + synthetic HTTP; tiền/kho/provider là mock semantics, không chứng nhận server |
| FE022–024 | Cross-module journeys/unit/schema/security frontend | Triggers/negative cases và state changes thực; không surrogate prototype |
| FE025–026 | Dataset/performance budgets/build/artifact/clean replay | Profile environment, local hoặc CI đúng scope; hosted publication không bắt buộc |
| FE027–028 | Technical UAT/gap fix, architecture review/docs/artifact/handoff | Owner acceptance chỉ ở cuối; manual/speech gaps không giấu; claim gate giữ evidence limits |
| UI001–011/013–021/025–026 | Những fix/optimizations đã DONE | Không làm lại vì docs audit; đối chiếu evidence đúng source trước dùng lại |
| UI012/022/023/024 | Những bước hoàn tất tự động chưa xong | Theo phiếu cập nhật §5–7; không cộng điểm trong lần lập kế hoạch này |

### 12.5. Các việc tiếp theo có thể chạy tự động, không chờ bạn

1. Chốt UI012.C04 technical matrix/coverage + report manual limits; correctness defects sửa trong cùng ID UI+ARCH.
2. Sửa UI022 workflow install mismatch, revalidate local clean/generator/source/boundaries/lint/type/domain/unit/build/demo/E2E theo final diff; ghi hosted NOT_RUN.
3. Nhận UI023, chạy/đối chiếu technical UAT trên artifact cuối; tạo case/results/issues/accepted exceptions và final decision sheet.
4. Nhận UI024, chốt source/artifact hashes, gate matrix/risks/runbook/handoff READY_FOR_ACCEPTANCE.
5. Tái xác minh FE checkpoint theo dependency bằng script canonical sau khi nguồn docs/code ổn định. Không hash report tự sinh như input ổn định để tránh tự gây STALE vòng lặp.
6. Sau gói reviewable hoàn tất mới trình bạn nghiệm thu cuối. Ghi rõ phạm vi Frontend/mock, điều đã đo, NOT_RUN và nhãn không được claim; không bắt bạn xử lý từng prerequisite giữa chừng.

**Kết luận audit:** phạm vi thực thi Frontend-only và quy trình AI tự làm đã được thống nhất trong tài liệu active. **0 BLOCKED hiện tại** được kiểm từ trạng thái task thật; vẫn còn việc kỹ thuật/evidence phải làm trước bàn giao, đặc biệt workflow browser install mismatch và FE STALE. Không có căn cứ nói công việc đã hoàn tất 100% hoặc mọi gate Production-Ready đã PASS.
"""
write("docs/FRONTEND_UI_IMPROVEMENT_PLAN.md", plan + audit)

old_report = read("evidence/REPORT.md")
write("evidence/REPORT.md", """# Báo cáo Frontend hiện hành — đối chiếu 04/10/2026

Scope `FRONTEND_WITH_SYNTHETIC_MOCK_API`, chính sách AI tự thực hiện đến bàn giao/người dùng nghiệm thu cuối tại [FRONTEND_SCOPE](../docs/FRONTEND_SCOPE.md); kế hoạch và audit chi tiết tại [UI + architecture plan](../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md). Không chờ owner/manual/hosted CI giữa chừng; không ghi evidence chưa có là PASS.

Runtime evidence gần nhất đã chạy: [UI012/S39 verify](frontend-ui-improvements/UI012/S39-current-frontend-verify-20261004.log) PASS (generator11/283/210/54, source65/220/54, boundary429/0/8, lint/type, domain88/88, Vitest85/85, production build), [UI012/S40 Chromium/Firefox](frontend-ui-improvements/UI012/S40-full-e2e-20261004.log) **388/388**, [UI020/S08 installed Chrome154](frontend-ui-improvements/UI020/S08-google-chrome-full-e2e-20261004.log) **194/194**. Mỗi engine có route-role357/357, empty11/11, errors51/51 và bốn journeys. Đây là local/demo/synthetic MSW. Lượt audit docs không chạy lại runtime suites; [S08 fingerprint](frontend-ui-improvements/UI024/S08-current-worktree-and-artifact-fingerprint.json) và audit validation định danh độ mới input.

| Gate | Kết quả/giới hạn hiện hành |
|---|---|
| FE-G01 | PASS scoped, clean toolchain/install evidence trước đó; không cold install mới trong lượt docs |
| FE-G02 | PASS, source/generator/type/lint/boundary/negative fixtures S39 |
| FE-G03 | PASS scoped contract/mock/domain/component evidence; không live API proof |
| FE-G04 | PASS theo S39/S40/S08 coverage trên local React artifact |
| FE-G05 | PARTIAL_UNVERIFIED: browser/keyboard/axe/actual zoom/contrast có evidence; speech/human conformance chưa có; AI tiếp tục technical coverage và limits, không chờ người kiểm giữa chừng |
| FE-G06 | PASS trong frontend/synthetic scope; không server authorization proof |
| FE-G07 | PASS theo local byte budget/profile evidence; chunk raw advisory còn, không device/CDN/SLA claim |
| FE-G08 | PASS local build/isolation; clean local được guide cho phép. Hosted CI NOT_RUN; UI022 workflow install Chromium/Firefox mismatch phải sửa trước replay, không nhận hosted PASS |
| FE-G09 | PARTIAL_UNVERIFIED: technical journeys đã chạy, gói final UAT/handoff chưa xong và final owner decision chưa có; AI tự chuẩn bị gói trước người dùng nghiệm thu |

Rubric giữ **7/9 = 77,8%**, không phải % code hoặc architecture-only. UI **22/26 DONE**, **118/130**; UI012/UI0224/5, UI023/UI0240/5; không tăng checkpoint trong lượt docs. UI020/21 đã DONE theo scope/review được duyệt, strict scanner vẫn exit1/13. FE tracker effective **0/140 VERIFIED, 28 STALE, blocked=[]**, stored DONE lịch sử không đồng nghĩa source hiện tại đã revalidated.

AI tiếp tục theo CONTINUE_FRONTEND và kế hoạch §12, đến READY_FOR_ACCEPTANCE. Chưa nhận nhãn Production-Ready/Enterprise-Grade, owner acceptance, hosted CI, Backend/staging/persistence hoặc quyền deploy. Hashes/links/generator/tracker/doc validation của lượt audit ở `frontend-scope-automation-audit-20261004/validation.json`.

---

# Snapshot báo cáo trước audit scope 04/10/2026 — chỉ dùng lịch sử

Toàn bộ nội dung dưới đây được giữ theo thời điểm cũ; các đoạn mang nhãn current/hiện hành và yêu cầu chờ owner/manual/hosted trong snapshot **không thay phần hiện hành phía trên**. Failed/interrupted logs và số đo cũ không bị chuyển thành PASS. Không dùng hướng dẫn cũ để khóa công việc đang được giao.

""" + old_report)
print("Reconciled", len(PATHS), "documents; runtime, contracts and ledgers untouched.")
