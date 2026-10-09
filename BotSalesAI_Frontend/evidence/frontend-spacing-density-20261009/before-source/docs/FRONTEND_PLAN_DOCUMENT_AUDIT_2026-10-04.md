# Audit toàn bộ kế hoạch và tài liệu — BotSalesAI Frontend

**HISTORICAL_AUDIT:** giữ nguyên kết luận/số đo bên dưới theo ngày audit. Nguồn current ở [plan §16.6](FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status) và [evidence report](../evidence/REPORT.md); không lấy status/đường dẫn cũ để tiếp tục triển khai.


**Ngày kiểm tra:** 04/10/2026 · **Checkout:** `BotSalesAI_Frontend` · **Kết luận phạm vi:** `FRONTEND_WITH_SYNTHETIC_MOCK_API` · **Người review:** Codex self-review, không phải peer review độc lập.

Tài liệu này chốt hai điều người dùng yêu cầu: (1) mọi việc triển khai trong folder này là Frontend-only, dùng API mock tổng hợp; (2) không để task Frontend/UI ở trạng thái `BLOCKED`, không dừng chờ người dùng giữa quá trình AI thực hiện. Người dùng chỉ nghiệm thu bộ bàn giao cuối. Kết luận dựa trên file kế hoạch chuẩn, graph, write scope, tracker hiệu lực, source tree, command logs và inventory theo SHA-256; không suy từ tên thư mục hoặc từ số phần trăm trong một snapshot lịch sử.

## Kết luận hiện hành

- Frontend tracker chuẩn: **28/28 task, 140/140 checkpoint VERIFIED, 100%, `blocked=[]`, `stale=[]`, `next=[]`** theo `node botsales-kit/scripts/progress.mjs status`; cấu trúc plan pass `validate`.
- Backlog UI/kiến trúc bổ sung là một tracker khác: **26/26 item, 130/130 checkpoint**. Không cộng số liệu UI vào FE tracker hoặc ngược lại.
- Task `BLOCKED` hiện hành trong FE graph: **0/28**. Hàng UI `BLOCKED`: **0/26**. `BLOCKED` xuất hiện trong lịch sử, contract/API error, test fixture hoặc điều kiện âm không có nghĩa một task hiện hành bị chặn.
- Runtime sản phẩm trong checkout: `apps/web` có; `apps/api`, `apps/worker`, `infra` không có. Full-product `plan.json`, `progress.json`, `tasks/T*.md` là reference read-only; chúng không phải kế hoạch nhận việc Frontend này.
- AI đã hoàn tất phần việc có thể chạy và xác minh trong phạm vi; hồ sơ ở `READY_FOR_ACCEPTANCE`. Nghiệm thu cuối thuộc người dùng và chưa tự ghi thay. Đây không phải xác nhận Backend, toàn sản phẩm hay production runtime.
- Readiness theo rubric gate Frontend: **7/9**, không phải tỷ lệ kiến trúc độc lập. FE-G05 còn speech/human conformance `NOT_RUN`; FE-G09 là chấp thuận cuối của người dùng. Cấu hình hosted CI tồn tại nhưng hosted run `NOT_RUN`; FE-G08 đạt theo clean local equivalent được kế hoạch cho phép.

## 1. Phạm vi được chứng minh từ source chuẩn

`botsales-kit/execution/frontend-plan.json` khai báo `FRONTEND_WITH_SYNTHETIC_MOCK_API`, chứa FE001–FE028 với 140 checkpoint và 50 dependency reference. Mọi dependency đều trỏ tới task `FE###` trong cùng graph; không có dependency ra task T của kế hoạch toàn sản phẩm. Kiểm tra `writeScope` không tìm thấy đường dẫn giao xây `apps/api`, `apps/worker`, `infra`, server hoặc database.

App cần hoàn thiện nằm tại `apps/web`. Test, MSW, generator, package contract/type và cấu hình là công cụ phục vụ Frontend; chúng không biến checkout thành dự án Backend. MSW chỉ cho demo/test và dữ liệu tổng hợp. Production artifact đã được kiểm có/không có worker đúng mục tiêu. Không port prototype HTML vào React.

Các tài liệu kit mô tả API, quyền, event, database/provider và kiến trúc toàn sản phẩm là reference để Frontend giữ contract/boundary. `sourceTaskIds` là truy vết requirement; chỉ `dependsOn` trong `frontend-plan.json` quyết định dependency của FE tracker. Kế hoạch và progress toàn sản phẩm được giữ nguyên, chỉ đọc. Hiện 84 task trong full-product tracker đều `NOT_STARTED`; con số đó không nói tiến độ Frontend và không tạo blocker trong FE scope.

## 2. Quyền lực của từng nhóm file

| File/nhóm | Vai trò | Kết luận khi đối chiếu | Cách dùng đúng |
|---|---|---|---|
| `AGENTS.md`, `botsales-kit/AGENTS.md` | Quy tắc ở checkout/kit | Frontend-only, canonical contracts, generated-source và full-product ledger boundaries rõ | Áp dụng trước mọi lần sửa; không dùng nội dung Backend của kit để nới write scope |
| `AI_RULES.md`, `botsales-kit/AI_RULES.md` | Universal rules | Hai bản được giữ nguyên và đối chiếu byte-identical trong audit evidence | Không sửa để bỏ gate/“mở khóa”; các ngoại lệ phải đến từ quyết định người dùng và nằm đúng scope |
| `docs/FRONTEND_SCOPE.md` | Quyết định phạm vi và thực hiện tự động | Frontend/mock, không chờ owner/manual/hosted CI giữa chặng; acceptance cuối vẫn do người dùng | Nguồn scope điều hành hiện hành |
| `docs/PROJECT_CONTEXT.md` | Snapshot dự án và quyết định | Tách tracker FE/UI, readiness và giới hạn live integration | Đọc cùng scope và report; không dùng thay evidence |
| `docs/FRONTEND_UI_IMPROVEMENT_PLAN.md` | Kế hoạch UI + kiến trúc React, thứ tự và lịch sử | 26 UI ID/130 checkpoint; phần đầu và §12.7–§12.8 là kết luận hiện hành, các mốc cũ bên dưới được phân loại history | Nguồn backlog UI; FE tracker vẫn lấy từ JSON chuẩn |
| `docs/CONTINUE_FRONTEND.md`, `botsales-kit/execution/SESSION_HANDOFF.md` | Hướng dẫn tiếp tục/bàn giao | Ghi lệnh local, mock reset, phạm vi và mốc nghiệm thu cuối | Chỉ dùng bản hiện hành đã link từ README/report; không chạy theo snapshot cũ |
| `docs/KNOWN_GAPS.md` | Contract/UI gaps và giới hạn integration | Gap Backend/provider được giữ làm giới hạn live API, không phải task xây Backend | Chỉ mở scope nếu có quyết định task mới |
| `botsales-kit/execution/frontend-plan.json` | Nguồn task FE001–FE028 | 28 task, 140 checkpoint, dependency graph hợp lệ | Không đổi denominator ngoài quy trình migration có authorization |
| `botsales-kit/execution/frontend-progress.json` | Evidence ledger Frontend | Final status chỉ có hiệu lực qua `progress.mjs`; file raw có history/block reason cũ nhưng current status được tính từ evidence | Không sửa tay; status/validate/report là authority |
| `botsales-kit/execution/FRONTEND_PLAN_GUIDE.md` | Verification ladder và FE-G01..09 | Xác định evidence, status vocabulary và cách giữ `NOT_RUN` | Đối chiếu khi kết luận gate; đủ 9 định nghĩa không đồng nghĩa 9 gate PASS |
| `botsales-kit/execution/frontend-command-map.json` | Lệnh kiểm và provenance | Lệnh chuẩn gắn package script/cwd | `VERIFIED_AVAILABLE` nói về command evidence, không cam kết mọi host/PATH |
| `botsales-kit/IMPLEMENTATION_PLAN.md`, `frontend-tasks/FE*.md`, `FRONTEND_PROGRESS.md`, `frontend-progress-report.json` | Báo cáo/phiếu generated | Bản đọc sinh từ FE plan/ledger | Cập nhật bằng `node botsales-kit/scripts/progress.mjs report`, không sửa tay |
| `botsales-kit/contracts/openapi.json`, `route-manifest.json`, permission/events/feature catalog; `design/tokens.json` | Contract và design source chuẩn | Frontend căn theo canonical schema/operation/route/permission/token | Đọc làm nguồn chuẩn; không tự thêm endpoint/DTO/policy hoặc sửa generated bằng tay |
| `packages/*/src/generated*` và generator outputs | Code generated | Freshness được gate kiểm | Không chỉnh tay; sửa input/generator nếu có bằng chứng và scope cho phép |
| `botsales-kit/docs/02_ARCHITECTURE.md`, `06_API_AND_REALTIME.md`, `18_CODING_STANDARDS.md` cùng docs kit khác | Đặc tả/reference sản phẩm | Có thể nói đến Backend/database/providers; không phải task Frontend tại checkout này | Dùng để giữ đúng UI contract và boundary, không chuyển backend task sang FE |
| `botsales-kit/execution/plan.json`, `progress.json`, `tasks/T*.md`, `PROGRESS.*` | Tracker toàn sản phẩm | Ngoài scope; chỉ đọc và không được chấm vào FE progress | Không chỉnh, không lấy làm gate của UI mock |
| `evidence/REPORT.md`, `botsales-kit/execution/frontend-evidence/FE*/` | Kết quả kiểm thực và hạn chế | Phải có command, source/artifact fingerprint và đúng checkout | Top của REPORT và log mới nhất là hiện hành; phần dưới gắn nhãn snapshot là lịch sử |
| `premium-audit.json`, UI evidence, screenshots/traces | Scanner và bằng chứng UI | Giá trị phụ thuộc revision, scope, ngày và công cụ | Đọc cùng kết quả, không biến snapshot cũ thành current |
| `botsales-kit/prototype/` | Prototype tham khảo | Không phải ứng dụng React hoặc nghiệm thu | Không port HTML, không dùng ảnh prototype làm bằng chứng runtime |
| `evidence/frontend-scope-automation-audit-20261004/` | Inventory/script/log audit tài liệu | Lưu inventory trước/sau và kiểm tra tái lập | Chỉ `final-current-20261004-inventory.json` là inventory sau cùng; các tên `before/after/followup/final-post-audit` là snapshot trước |

Inventory đầy đủ chứa tên file, loại, kích thước/hash, lỗi parse/link, nhóm nội dung và các hit từ khóa `BLOCKED`/Backend/human/hosted. Vì corpus có lịch sử, contract và test fixture, keyword hit chỉ giúp tìm file; nó không thay cho status từ tracker chuẩn.

Inventory `final-current-20261004` đã quét **1.537 file, 0 lỗi UTF-8/JSON**; tổng byte và SHA-256 hiện hành được ghi trong inventory linked bên trên.

| Phân loại | File |
|---|---:|
| Tài liệu Frontend active | 14 |
| Universal rules chỉ đọc | 2 |
| Config/delivery metadata | 14 |
| Frontend plan/instruction active | 10 |
| Kit specification/reference/tooling | 53 |
| Generated Frontend reports | 31 |
| Contract/design/generated data | 18 |
| Evidence và historical snapshots | 1.277 |
| Full-product plan read-only | 89 |
| Prototype reference | 7 |
| Historical reference | 22 |

Các số trên là phân loại của inventory script trên corpus khai báo, không phải số file source code hay số lỗi đang mở.

## 3. Kết quả kiểm kê và mâu thuẫn được xử lý

Audit đã đọc chỉ dẫn gốc ở root/kit, scope/context, architecture/API/coding standards, các kế hoạch FE/UI, ledger, command map, generated reports, canonical contract/design, report/gaps, README/handoff, full-product reference, prototype, evidence và inventory từng file. File inventory cuối là chỉ mục exhaustive để truy ngược từng file và SHA-256; bảng §2 nêu nguồn điều khiển cần ưu tiên.

Trước khi tái xác minh, `progress.mjs status` phát hiện 32 tham chiếu source hash lệch trên 12 file. Một số thay đổi thuộc tài liệu scope/report/handoff và một số file React/state matrix đã được cập nhật sau snapshot trước. Những mismatch làm các task phụ thuộc hiện `STALE`; **`blocked=[]` vẫn rỗng**. Evidence của FE001, FE003, FE005 và FE028 được thu lại theo thứ tự task/checkpoint, rồi chạy lại `validate`/`status`. Kết quả hiện tại là 140/140, không stale, không blocked. Không sửa ledger JSON bằng tay và không xóa lịch sử lỗi.

Một số tài liệu cũ từng nói FE005 tiếp theo, 20/140, npm có 9 high findings hoặc CI/browser chưa chạy. Đó là snapshot có ngày trong quá khứ. Chúng không được dùng làm trạng thái hiện tại sau khi có FE024 security refresh, FE008 browser rerun, FE027 UAT và FE028 final review. Tương tự, các historical `BLOCKED` như FE017 trước khi người dùng chốt mock permission, error state `blocked`, hay negative fixture là history/domain semantics, không phải blocker hiện nay.

`frontend-progress.json` còn có thể giữ chuỗi `blockedReason` giải thích một lần requeue cũ trên task hiện `DONE`. Tính trạng thái chuẩn chỉ dùng trường status hiệu lực sau khi xác minh SHA, thứ tự checkpoint và dependency; vì thế chuỗi giải thích cũ không biến thành task `BLOCKED`. Giữ history để audit.

## 4. “Không BLOCKED” khác với “mọi gate đều PASS”

Kết quả status cuối của canonical FE tracker là:

| Chỉ số | Đo được |
|---|---:|
| Task trong FE graph | 28 |
| Checkpoint trong FE graph | 140 |
| Dependency nội bộ | 50/50 |
| `BLOCKED` hiện hành | 0 |
| `STALE` sau tái xác minh | 0 |
| Task tiếp theo trong graph | 0 |
| UI backlog riêng | 26 item / 130 checkpoint, hoàn tất |

Các trạng thái có ý nghĩa khác nhau:

- `BLOCKED` là task chưa thể tiến triển do một prerequisite đang chặn. Hiện không có task Frontend/UI nào như vậy.
- `STALE` là evidence không còn khớp hash/thứ tự/dependency. Audit gặp và sửa loại drift này; status cuối hiện không còn.
- `NOT_RUN` là phép đo chưa chạy; giữ nguyên như vậy, không tự đổi thành PASS.
- `CHỜ_NGHIỆM_THU_NGƯỜI_DÙNG` là ranh giới của quyết định cuối; nó không nằm trong chuỗi phụ thuộc công việc AI.
- `stopConditions` giữ an toàn: không sửa Backend/full-product/generated/canonical source ngoài scope, không giả kết quả hoặc triển khai dịch vụ thật. Đây là giới hạn phạm vi, không phải tình trạng BLOCKED.

Phần công việc kỹ thuật trong phạm vi đã được chạy tự động và hồ sơ đã chuẩn bị xong. Human conformance thực tế không thể suy ra từ test DOM/axe, vì vậy FE-G05 vẫn có phần speech/human `NOT_RUN`. Người dùng chỉ cần xem/nêu quyết định nghiệm thu cuối; không có bước chờ họ ở giữa việc triển khai.

## 5. Bằng chứng kỹ thuật Frontend mới nhất

Các log và artifact được chốt tại [FE028 handoff](../botsales-kit/execution/frontend-evidence/FE028/handoff.md), [quality-gate matrix](../botsales-kit/execution/frontend-evidence/FE028/quality-gate-matrix-current-20261004.json), [architecture review](../botsales-kit/execution/frontend-evidence/FE028/architecture-review-current-20261004.md) và [evidence report](../evidence/REPORT.md).

| Đo lường | Kết quả trong scope |
|---|---|
| `npm run generate:check` | 11 generated outputs, 283 schema, 210 operation, 54 route |
| Source/route-operation check | 65 source files, 220 operation references, 54 routes |
| Architecture boundary | 430 import edges, 0 cycle/boundary issue, 10/10 negative fixtures |
| Domain/MSW | 88/88 |
| Vitest | 85/85 trên 10 file test |
| Playwright | 388/388 Chromium + Firefox |
| UAT matrix | 54 routes, 64 features, 65 feature-route interactions, 22 journeys |
| Permission/state | 357/357 route-role outcomes; 0 applicable state cells untested |
| Route composition | empty 11/11, API error 51/51; 320 CSS px reflow 54/54 |
| Dependency audit | 0 vulnerabilities trong 463 dependency được report |
| Production artifact | 30 file / 1,852,989 byte; không có MSW worker; tree SHA-256 `97c6ad5e5f8031b04d25fd9f73daf0ad3d6ea9c26b3cb3c8a8e0e93ccd19761a` |
| Demo artifact | 35 file / 2,300,344 byte; có worker và synthetic fixtures; tree SHA-256 `b9bb3138d27ff321836d99082f52c16678e4feb96dae33452ef9d7cc9fe58e8f` |

Clean install/setup/verify/demo build tái lập trong workspace cô lập. Tất cả số ở bảng là local frontend/mock evidence. Chúng không chứng minh response từ Backend/provider, persistence, server authorization, staging, GitHub-hosted workflow hoặc production traffic.

Sau lần đồng bộ tài liệu cuối, `npm.cmd --script-shell=cmd.exe run generate:check` chạy lại exit 0: 11 outputs / 283 schemas / 210 operations / 54 routes. Log lệnh/cwd/exit và kết quả: [generate-check-final-current-20261004.log](../evidence/frontend-scope-automation-audit-20261004/generate-check-final-current-20261004.log).

## 6. FE-G01..09 và claim được phép

| Gate | Kết quả | Cơ sở và giới hạn |
|---|---|---|
| FE-G01 — môi trường/artifact tái lập | Đạt trong scope | Clean `npm ci`, setup, verify/build demo và hashes tái lập; log vẫn có `allowScripts` notices cho esbuild/MSW, không tự duyệt lifecycle scripts. |
| FE-G02 — code/kiến trúc | Đạt | Freshness, mapping source, lint/typecheck/boundaries và 10/10 fixtures; self-review, không peer review độc lập. |
| FE-G03 — contract/mock | Đạt trong scope | Canonical contract, domain/MSW 88/88, Vitest 85/85; không phải live API. |
| FE-G04 — chức năng/route/state/role | Đạt trong scope | UAT/browsertests gắn route, feature, role, state, journey; quyền UI mock không phải server authorization. |
| FE-G05 — UI/UX/accessibility | Chưa đạt đầy đủ | Browser keyboard/axe/contrast/text-flow/400% zoom sample có số đo. Narrator speech/transcript và broad human conformance `NOT_RUN`; không claim WCAG đầy đủ. |
| FE-G06 — Frontend security | Đạt trong scope | Dependency audit 0 vulnerabilities, security cases/raw HTML scan và command recovery; không chứng nhận server/tenant enforcement. |
| FE-G07 — hiệu năng | Đạt với advisory | Local demo budget, pagination 1,000 dòng và reflow đạt; production chunk lớn nhất 738.39 kB raw / 186.88 kB gzip vẫn có Vite advisory >500 kB. Không phải device/CDN/backend SLO. |
| FE-G08 — artifact/CI | Đạt theo local equivalent | Production/demo isolation và build hashes kiểm lại; workflow có cấu hình nhưng hosted GitHub Actions `NOT_RUN`. Plan chấp nhận clean local equivalent. |
| FE-G09 — UAT/bàn giao | Chờ nghiệm thu người dùng | Kỹ thuật UAT, matrix, artifact hashes, run guide và handoff reviewable; owner acceptance chưa được ghi. |

Rubric bằng chứng là **7/9**. Handoff được đề nghị ở `READY_FOR_ACCEPTANCE` cho Frontend React/TypeScript với API mock. Không được suy ra 9/9, Production-Ready/Enterprise-Grade toàn sản phẩm, hoặc người dùng đã chấp thuận.

## 7. Những việc có thể tối ưu tiếp

Đây là các cải tiến sau nghiệm thu, không phải blocker của gói Frontend hiện tại:

| Ưu tiên | Việc có thể làm | Lý do/điều kiện đo |
|---|---|---|
| P1 | Giảm production chunk lớn nhất 738.39 kB raw | Kiểm vendor/locales/route splitting và đo route-ready/budget trên cùng môi trường; không tăng ngưỡng chỉ để build xanh. |
| P1 | Thực hiện Narrator speech/transcript và broad human conformance | Cần thiết nếu muốn FE-G05 thành PASS; hiện không có bằng chứng nói được. Không thay bằng DOM/axe. |
| P1 | Chạy hosted CI nếu cần external runner proof | Workflow đã có; hosted run không bắt buộc cho G08 vì local equivalent được chấp nhận. |
| P1 | Xem xét `allowScripts` policy của esbuild/MSW | Chỉ duyệt script theo source/reason cụ thể; hiện clean build/test thành công khi không tự bật scripts. |
| P2 | Giải quyết UI021 strict scanner exception 1/13 | Giữ accepted-review crosswalk hiện có hoặc cải thiện mapping/fixtures để không whitelist rộng; không báo scanner hiện tại clean. |
| P2 | Xin peer review kiến trúc độc lập | Số liệu hiện tại là self-review + checks tự động; peer review không có log. |
| P2 | Giữ inventory và history dễ tra cứu | Corpus chứa snapshot lặp nhiều ngày; tiếp tục đánh dấu latest/archive, không xóa log history hoặc contract text dựa trên keyword. |

Nếu chọn triển khai tối ưu sau, mở task Frontend mới có trigger/acceptance/owner rõ; không đổi hồi tố FE001–FE028, UI001–UI026 hoặc full-product tracker.

## 8. Checklist tái xác minh cuối

Các lệnh sau đã được dùng để chốt tracker và generator; không thay thế các log runtime ở trên:

```powershell
node botsales-kit/scripts/progress.mjs validate
node botsales-kit/scripts/progress.mjs status
node botsales-kit/scripts/progress.mjs report
npm.cmd --script-shell=cmd.exe run generate:check
python evidence/frontend-scope-automation-audit-20261004/audit_docs.py final-current-20261004
```

Status cuối chỉ được gọi là hoàn tất khi trả 140/140, `blocked=[]`, `stale=[]`, `next=[]`. `report` chỉ sinh báo cáo Frontend theo ledger chuẩn. Full-product `plan.json`/`progress.json`/task T không được ghi.
