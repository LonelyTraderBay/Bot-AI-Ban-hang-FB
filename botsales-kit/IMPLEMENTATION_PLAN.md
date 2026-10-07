# KẾ HOẠCH TRIỂN KHAI FRONTEND — BOTSALES AI

**Mục tiêu đã được người dùng xác nhận ngày 30/09/2026:** phát triển và nghiệm thu frontend React/TypeScript bằng dữ liệu mock tổng hợp. Frontend phải có kiến trúc thống nhất, đủ bằng chứng về chất lượng và khả năng bảo trì để đề nghị nghiệm thu **Production-Ready / Enterprise-Grade Frontend Architecture trong phạm vi frontend với mock API**. Các nhãn này là mục tiêu kiểm chứng, chưa phải kết quả hiện tại.

Nguồn task hiện hành: [frontend-plan.json](execution/frontend-plan.json); tiến độ: [frontend-progress.json](execution/frontend-progress.json). File này là nguồn hướng dẫn; `IMPLEMENTATION_PLAN.md` và phiếu `execution/frontend-tasks/FE*.md` được sinh bằng `node scripts/progress.mjs report` tại `botsales-kit`. Markdown links trong file nguồn tính từ thư mục chứa file và được generator rebase khi nhúng vào kế hoạch ở kit root; đường dẫn code trên phiếu tính từ `BotSalesAI_Frontend`. Không sửa tay đầu ra sinh.

### Đối chiếu tên artifact dự kiến với layout đã triển khai

Các tên thư mục trong task plan ghi intent của đợt lập kế hoạch, không tự chứng minh một thư mục hoặc tính năng đã tồn tại. Kiểm source và command map thực trước revalidation; dùng các owner hiện hành dưới đây để tìm bằng chứng. Bảng này giải thích layout thực tế, không ghi checkpoint hoặc thay writeScope của task.

| Task / đường dẫn dự kiến ban đầu | Artifact thực tế để đối chiếu | Phạm vi |
|---|---|---|
| FE024 — `tests/security/` | [tests/security.spec.ts](../BotSalesAI_Frontend/tests/security.spec.ts) | Synthetic browser security cases; không server security proof |
| FE025 — `tests/performance/` | [tests/artifacts/demo-preview.spec.ts](../BotSalesAI_Frontend/tests/artifacts/demo-preview.spec.ts) | Built-demo asset budgets và large-data measurements |
| FE026 — `.github/workflows/` dưới Frontend | [workflow ở repo cha](../.github/workflows/frontend.yml) | Workflow source ở repo root; local checks không hosted CI PASS |
| FE027 — `tests/uat/` | [route smoke](../BotSalesAI_Frontend/tests/frontend.spec.ts), [cross-module journeys](../BotSalesAI_Frontend/tests/vertical-slices/fe022-flows.spec.ts) và các FE browser specs tại `tests/` | Technical cases chạy qua runner hiện hành; UAT snapshots giữ date/source scope, không owner acceptance |

## 1. Phạm vi và điểm bắt đầu

- Phát triển source hiện có trong `apps/web`, test frontend, mock API, generator và cấu hình frontend liên quan. Không port `prototype/` HTML hoặc dựng lại framework.
- Các gói contracts/design-tokens chỉ là đầu ra dùng chung; sửa generator khi có lỗi được xác minh, không sửa tay `packages/*/src/generated*`. API/route/quyền/token canonical giữ nguyên trừ một nhiệm vụ đổi contract được giao rõ ràng.
- Nghiệm thu luồng UI qua MSW trong chế độ demo/test: điều hướng, biểu mẫu, dữ liệu, hành động, trạng thái lỗi, quyền hiển thị, đổi shop, xử lý xung đột và kết quả chưa rõ. Chạy React app thật và browser test thật; mock JSON riêng hoặc ảnh prototype không đủ.
- Backend, database, worker, OIDC/Meta/LLM/Push/Telegram/carrier/supplier thật, tải backend, migration, restore, staging toàn hệ thống và production deployment nằm ngoài phạm vi. Không yêu cầu tài khoản dịch vụ thật để hoàn tất task frontend. Các kiểm tra backend không được ghi PASS từ simulator.
- Bản nghiệm thu `dist-demo` có mock API và nhãn dữ liệu mô phỏng. Bản `dist` phải build được, có giao tiếp HTTP theo contract và không chứa MSW/seed/nhánh fallback mock. Chưa có backend thật không chặn nghiệm thu frontend bằng mock; khả năng vận hành với API thật chưa được xác minh.
- `execution/plan.json`, `progress.json`, `tasks/T*.md` và `PROGRESS.*` giữ vai trò kế hoạch toàn sản phẩm ngoài scope hiện tại. Không nhận T001–T084 hoặc cộng điểm ledger đó trong nhiệm vụ frontend. 100% frontend không phải 100% hệ thống.

Bắt đầu FE001 để tiếp nhận source; tiếp tục FE002 sửa môi trường/dependencies và lỗi nền bằng bằng chứng. Frontend [CONTINUE_FRONTEND.md](../BotSalesAI_Frontend/docs/CONTINUE_FRONTEND.md), [KNOWN_GAPS.md](../BotSalesAI_Frontend/docs/KNOWN_GAPS.md), [route-implementation.json](../BotSalesAI_Frontend/docs/route-implementation.json) và [REPORT.md](../BotSalesAI_Frontend/evidence/REPORT.md) mô tả hiện trạng, không được suy source có component thành tính năng đã nghiệm thu.

## 2. Áp dụng AI_RULES.md nguyên bản vào mỗi thay đổi

Đọc root AGENTS.md, AI_RULES.md Universal 3.1, docs/FRONTEND_SCOPE.md và docs/PROJECT_CONTEXT.md; sau đó docs/02,06,18 của kit cùng nguồn đúng task. Giữ nguyên cả hai bản AI_RULES.md. Quy trình chung được cụ thể hóa ở đây, không tạo một bộ quy tắc cạnh tranh.

1. **V0 — Tiếp nhận:** xác minh cwd/Git root/revision/diff, bàn giao, task và nguồn chuẩn. Ghi hiện trạng ĐÃ QUAN SÁT, yêu cầu ĐÃ DUYỆT, đề xuất và điều CHƯA XÁC ĐỊNH riêng biệt. Không ghi đè thay đổi người khác.
2. **Definition of Ready:** ghi mục tiêu, file/vùng sửa thực, owner khi nhận việc, API operationId/routeId/case liên quan, phạm vi loại trừ và tiêu chí kiểm. AI tự tìm dữ kiện có trong repo; chỉ hỏi quyết định nghiệp vụ chưa thể xác minh.
3. **Change Budget — mục 10:** một thay đổi phục vụ một mục tiêu; không ghép nâng stack/refactor toàn repo. File shared/router/contracts/token/lockfile/CI có một writer. Mặc định làm tuần tự.
4. **Complexity Gate — mục 9.1:** trước thêm dependency/abstraction/state dùng chung, ghi nhu cầu có nguồn, cách nhỏ hơn đã xét, chi phí/ownership/tương thích, kiểm chứng và khôi phục trong handoff/task hiện có. Khả năng mở rộng không là lý do tạo generic CRUD engine hoặc microfrontend.
5. **Thiết kế và sửa:** sửa tăng dần theo source thật; dùng contract/type của phiên bản thư viện thật. Khi sửa bug, có test tái hiện nếu khả thi. Không any, tắt strict/lint/test, bịa module declaration, return thành công giả hoặc hardcode dữ liệu demo trong JSX.
6. **Verification Ladder — mục 11.1:** chọn V1 lint/type/test phần sửa; V2 contract/import/scope/transport; V3 build và luồng trên React/browser thật với mock API; V4 kiểm rủi ro frontend như XSS, rò dữ liệu giữa shop, bundle secrets, stale response và gửi lặp. Backend V4 nằm ngoài phạm vi đã xác định.
7. **Definition of Done — mục 17–18,23:** chạy kiểm tra trên đúng diff, đồng bộ tài liệu ảnh hưởng, ghi command/cwd/exit code/environment/log/source hashes, giới hạn và bước tiếp. Chỉ review tự thân thì ghi đúng như vậy; không bịa peer review.
8. **Production Claim Gate — mục 19.6:** chỉ đề nghị nghiệm thu frontend khi các tiêu chí bắt buộc dưới đây đã ĐẠT. Tách kết quả kiểm chứng khỏi quyền merge/deploy. Không tự phát hành.

## 3. Kiến trúc frontend thống nhất và mở rộng có kiểm soát

| Phần | Quy định áp dụng |
|---|---|
| Stack | Node 24, React/TypeScript strict/Vite; một MUI, Router, TanStack Query, RHF/Zod, i18next theo package.json và lockfile thật. Không tự đổi major hoặc cài stack song song. |
| app | Bootstrap, providers, router, session/scope và composition giữa public entry của module. Một theme/provider/cache/router cho app. |
| modules | Nghiệp vụ riêng; tách api/model/ui theo trách nhiệm khi sửa phần đó. Module X chỉ import X/shared/contracts/tokens; không import module Y. Giữ public entry rõ ràng. |
| shared | Cơ chế không phụ thuộc nghiệp vụ: transport, validation, scope, formatting, UI nền. Không gọi provider SDK hoặc import app/modules/mocks. |
| contracts | OpenAPI 3.1 API2.0.0, route-manifest, permission-catalog và events schema là nguồn. OperationId/types sinh tự động; không tạo DTO/API song song. |
| state | Query giữ server state; RHF giữ form; Router giữ trạng thái URL phù hợp; UI state cục bộ. Query key có principal/shop/permissionVersion và filters. |
| network | UI → module api/hooks → shared HTTP client → live HTTP hoặc MSW do bootstrap chọn rõ. Đổi transport không đổi component/nghiệp vụ UI. Không fallback mock khi live lỗi. |
| command | 202 chỉ accepted; 409/412/422/428/429 và timeout có UI phù hợp. Giữ form/key/commandId; unknown phải reconcile trước gửi lại. Không optimistic cho tác động tiền/kho/quyền/AI. |
| dữ liệu | Money decimal string + currency; ID opaque; thời gian UTC hiển thị theo timezone shop. Mock service mô phỏng server authority; frontend không tự nhận là chủ tiền/tồn kho. |
| design | Graphite Gold dark-only từ design/tokens.json; một MUI bridge; focus/keyboard/contrast/responsive/i18n thống nhất. Không màu hardcode/theme thứ hai. |
| mở rộng | Thêm module theo route/operation/public entry và test đã có. Chỉ tạo abstraction chung khi có nhu cầu cụ thể qua Complexity Gate; không viết lại module chưa liên quan. |

## 4. Hợp đồng mock data để đủ nghiệm thu

- Dữ liệu tổng hợp, seed/clock/scenario có định danh và tái lập; reset giữa tests. Có ít nhất hai shop và role presets từ permission-catalog, membership revoked, read-only và quyền thiếu. Không dữ liệu/secret khách thật.
- Dữ liệu phủ toàn bộ route và feature UI trong phạm vi: danh mục, biến thể, khách, tồn, đơn, prep, mua/nhận hàng, finance/COD, inbox, knowledge/bot, operations, integrations, notifications và reports. Phủ pagination, lọc, nhiều dòng, quan hệ ID và case empty/partial.
- MSW chặn ở lớp HTTP theo operationId; validate request/response theo canonical schema. Fixture tạo mới phải được kiểm schema. Không dùng mock trực tiếp trong component hoặc thay production transport.
- Scenario gồm success, loading, empty, network/offline, 401/403/404, 409/412/422/428/429, delayed/late response, timeout/unknown, accepted→succeeded/failed, lỗi từng phần, SSE duplicate/out-of-order/resync khi liên quan. Không bắt mọi trạng thái vô nghĩa trên mọi màn hình.
- UAT chạy trên React build demo thật, theo luồng catalog→stock→order→prep; procurement→approval→receipt; finance→reconciliation; inbox→knowledge/bot. Mỗi thao tác có thay đổi dữ liệu mô phỏng quan sát được, không chỉ toast.
- Gap contract được ghi trong KNOWN_GAPS: không bịa CRUD địa chỉ, danh mục tài khoản hoặc capability chưa có. Fixture được dùng cho ID/capability đã được contract hỗ trợ. Phần không hỗ trợ phải hiện giới hạn rõ và thống nhất ngoại lệ UAT; tiêu chí UI bắt buộc chưa giải quyết vẫn chặn nghiệm thu tương ứng.
- Việc có fixture, source hoặc test đã viết không có điểm tự động. Mock đủ nghiệm thu frontend chỉ sau khi luồng/schema/browser tests thực sự đạt; simulator không chứng minh business transaction hoặc provider thật.

## 5. Các gate bắt buộc của frontend

| ID | Tiêu chí | Bằng chứng để ĐẠT |
|---|---|---|
| FE-G01 | Môi trường tái lập | Node/dependency đúng baseline; npm install tạo lockfile thật; npm ci/build clean hoạt động. |
| FE-G02 | Code và kiến trúc | Full typecheck/lint, generated freshness, import boundaries/cycles trên source thật; negative test chứng minh luật chặn vi phạm. |
| FE-G03 | Contract và mocks | Schema checks request/response/fixtures; domain simulator tests, transport/component tests với negative cases. |
| FE-G04 | Phủ chức năng | Ma trận route×states×roles gắn test/result; 54 route có luồng phù hợp; các feature UI A01–H08 và gap được truy vết, không tick tay thay test. |
| FE-G05 | UI/UX | Browser trên viewport theo docs/03; keyboard/focus/form errors/dirty drafts/i18n/a11y; kiểm thủ công phần axe không chứng minh. |
| FE-G06 | An toàn frontend | Không secret/raw HTML nguy hiểm/cross-shop stale data; command unknown không resend mù; UI permission tests chỉ chứng minh hành vi UI. |
| FE-G07 | Hiệu năng frontend | Đo bundle và luồng browser với dataset mock đã định danh; ngưỡng theo baseline/review FE025, không tự nhận SLO backend hoặc bịa tải sản phẩm. |
| FE-G08 | Artifact | Build production và demo thành công; production bundle/network smoke không có mock/seed/fallback; demo có nhãn mô phỏng. CI hoặc clean local tương đương có log, chưa có CI run thì ghi chưa chạy CI. |
| FE-G09 | UAT và bàn giao | Luồng mock UAT thực, báo cáo thiếu/đạt, giới hạn, cách chạy/build/thay API; acceptance của người dùng được ghi khi thực sự có. |

Tất cả gate áp dụng dùng ĐẠT / CHƯA ĐẠT / CHƯA XÁC MINH / KHÔNG ÁP DỤNG với lý do đúng phạm vi. Missing dependency hoặc test chưa chạy là CHƯA XÁC MINH. Nhãn nghiệm thu được phép đề nghị: **"Frontend đã kiểm chứng với API mock tổng hợp; đáp ứng các gate kiến trúc/chất lượng frontend được liệt kê trên artifact/revision này."** Nhận sự chấp thuận UAT khi có thật; không tự nhận hệ thống bán hàng đã chạy production.

## 6. Lệnh, bằng chứng và tiếp tục phiên

Lệnh app chạy tại root `BotSalesAI_Frontend`; trên PowerShell dùng `npm.cmd`/`npx.cmd` nếu execution policy chặn npm.ps1. Đọc script trước lệnh setup/generate để biết file ghi. `npm ci` chỉ dùng sau khi có lockfile thật.

```text
npm install
npm run setup
npm run doctor
npm run generate:check
npm run test:source
npm run boundaries
npm run typecheck
npm run lint
npm run test:domain
npm test
npm run build
npm run build:demo
npm run dev
npx playwright install chromium
npm run test:e2e
```

Không suy tất cả lệnh trên đã chạy. Command map frontend nằm ở `execution/frontend-command-map.json`; chỉ đổi VERIFIED_AVAILABLE sau khi chạy thành công đúng script/cwd/môi trường và có log. Schema kiểm bằng `scripts/validate-mock-schemas.py` cần Python/jsonschema thực; kiểm trước khi dùng, không giả PASS khi thiếu dependency.

Tại thư mục `botsales-kit`:

```text
node scripts/progress.mjs validate
node scripts/progress.mjs status
node scripts/progress.mjs next
node scripts/progress.mjs start FE001 <owner-thực>
node scripts/progress.mjs checkpoint FE001 S01 execution/frontend-evidence/FE001/S01.json
node scripts/progress.mjs report
```

Tracker mặc định chọn frontend khi có frontend-plan.json. `--full-product validate|status|next` chỉ đọc ledger gốc; không nhận/checkpoint task toàn sản phẩm trong scope frontend. Evidence frontend cần `verificationScope=FRONTEND_WITH_SYNTHETIC_MOCK_API`; environment.dataSource là `source-only` cho kiểm tra tĩnh hoặc `synthetic-msw` cho app/mock tests; kèm expected/observed, command/cwd, log/hash, source snapshot, checks thực và reviewer thực. Tracker kiểm cấu trúc/hash, không tự chứng minh một log đã bao phủ hết acceptance; người review đối chiếu test và hành vi.

28 việc / 140 bước frontend bắt đầu 0%. Mỗi bước S01–S05 có trọng số 1+3+2+2+2; phase weights 10/25/40/20/5 là tỷ trọng nghiệm thu kế hoạch, không thời gian hoặc tỷ lệ chất lượng. Chỉ checkpoint có evidence đúng diff mới có điểm; source đổi làm STALE. Viết kế hoạch lần này không hoàn thành task sản phẩm. Scope adoption được ghi ở [FRONTEND_SCOPE_ADOPTION.md](execution/FRONTEND_SCOPE_ADOPTION.md).

Thiếu toolchain/test hoặc contract bắt buộc: chặn đúng phần và tiếp tục việc độc lập đủ dependency. Không chặn frontend chỉ vì chưa có credentials backend thật. Bàn giao phiên tại execution/SESSION_HANDOFF.md và evidence root; giữ bằng chứng cũ kèm thời điểm/môi trường, không viết lại kết quả lịch sử.


## 7. Quyết định tự thực hiện Frontend — 04/10/2026

Nguồn quyết định là yêu cầu trực tiếp của người dùng; chính sách hiện hành tại [FRONTEND_SCOPE.md](../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md), task UI bổ sung tại [FRONTEND_UI_IMPROVEMENT_PLAN.md](../BotSalesAI_Frontend/docs/FRONTEND_UI_IMPROVEMENT_PLAN.md). Tại checkout này chỉ triển khai Frontend; Backend/staging/full-product trong kit là tham chiếu.

AI tự làm code/tests/evidence/revalidation/handoff, không chờ owner/manual/hosted CI trước khi nhận việc. User acceptance chỉ ở cuối khi gói bàn giao đã reviewable; không giả người dùng ký trước. FE-G08 đã cho phép CI hoặc clean local tương đương: giữ NOT_RUN cho hosted run chưa có. FE-G05 speech/manual chưa quan sát được vẫn chưa xác minh trong gate matrix; không ngăn thực hiện browser coverage và bàn giao hồ sơ có giới hạn, cũng không thành PASS của WCAG. FE-G09 tách UAT kỹ thuật AI thực hiện với quyết định nghiệm thu cuối của người dùng. Chuyển thời điểm nghiệm thu không tự cấp nhãn Production-Ready/Enterprise-Grade hoặc bỏ tiêu chí correctness.

Số FE checkpoint chỉ tăng sau bằng chứng nguyên task đúng diff; stored DONE lịch sử phải đối chiếu effective status/hash. STALE do tài liệu/nguồn đổi cần AI tái xác minh theo dependency, không chờ owner mở khóa và không sửa ledger bằng tay. Không nhận task T, tự push/merge/deploy hoặc gọi local checks là hosted CI. Quy trình này không tự tạo scheduler hay bảo đảm phiên AI chạy khi đã đóng; tiếp tục tác vụ trong phiên được giao và lưu handoff rõ.


## Tiến độ tại lần sinh này

**0% — 0/140 bước — 0/28 việc.** Đây là tỷ lệ bằng chứng FE còn hiệu lực theo dependency và source hashes, không phải phần trăm code đã viết. STALE làm mất điểm kiểm chứng dù source vẫn tồn tại; không cộng checkpoint từ suite chung. Scope Frontend + API mock, không phải backend/toàn hệ thống.

| Giai đoạn | Trọng số | Đã xác minh | Đầu việc |
|---|---:|---:|---|
| F00 Tiếp nhận và môi trường | 10% | 0.00% | FE001–FE002–FE003 |
| F01 Kiến trúc, contract và mock foundation | 25% | 0.00% | FE004–FE005–FE006–FE007–FE008 |
| F02 Luồng và module frontend | 40% | 0.00% | FE009–FE010–FE011–FE012–FE013–FE014–FE015–FE016–FE017–FE018–FE019–FE020–FE021–FE022 |
| F03 Chất lượng, an toàn và artifact | 20% | 0.00% | FE023–FE024–FE025–FE026 |
| F04 Nghiệm thu mock và bàn giao | 5% | 0.00% | FE027–FE028 |

## Mục lục đầu việc

- [FE001 — Tiếp nhận source và khóa phạm vi frontend](execution/frontend-tasks/FE001.md) · STALE · 0%
- [FE002 — Toolchain và dependencies tái lập](execution/frontend-tasks/FE002.md) · STALE · 0%
- [FE003 — Lệnh kiểm tra và hợp đồng bằng chứng](execution/frontend-tasks/FE003.md) · STALE · 0%
- [FE004 — TypeScript và ranh giới module](execution/frontend-tasks/FE004.md) · STALE · 0%
- [FE005 — Contracts và HTTP transport có kiểu](execution/frontend-tasks/FE005.md) · STALE · 0%
- [FE006 — Design system Graphite Gold và UI nền](execution/frontend-tasks/FE006.md) · STALE · 0%
- [FE007 — Shell, phiên và scope dữ liệu](execution/frontend-tasks/FE007.md) · STALE · 0%
- [FE008 — Mock API và bộ dữ liệu nghiệm thu](execution/frontend-tasks/FE008.md) · STALE · 0%
- [FE009 — Workspace, membership và khách hàng](execution/frontend-tasks/FE009.md) · STALE · 0%
- [FE010 — Catalog, biến thể và import](execution/frontend-tasks/FE010.md) · STALE · 0%
- [FE011 — Tồn kho và biến động](execution/frontend-tasks/FE011.md) · STALE · 0%
- [FE012 — Báo giá, xác nhận và đơn hàng](execution/frontend-tasks/FE012.md) · STALE · 0%
- [FE013 — Chuẩn bị, giao và trả hàng](execution/frontend-tasks/FE013.md) · STALE · 0%
- [FE014 — Mua hàng, phê duyệt và nhận hàng](execution/frontend-tasks/FE014.md) · STALE · 0%
- [FE015 — Finance, COD và đối soát](execution/frontend-tasks/FE015.md) · STALE · 0%
- [FE016 — Inbox và takeover](execution/frontend-tasks/FE016.md) · STALE · 0%
- [FE017 — Tri thức và vòng duyệt](execution/frontend-tasks/FE017.md) · STALE · 0%
- [FE018 — Cấu hình bot, phòng thử và evals](execution/frontend-tasks/FE018.md) · STALE · 0%
- [FE019 — Kết nối và thông báo mô phỏng](execution/frontend-tasks/FE019.md) · STALE · 0%
- [FE020 — Operations, phê duyệt và điều phối](execution/frontend-tasks/FE020.md) · STALE · 0%
- [FE021 — Dashboard, báo cáo và xuất dữ liệu](execution/frontend-tasks/FE021.md) · STALE · 0%
- [FE022 — Luồng xuyên module qua app composition](execution/frontend-tasks/FE022.md) · STALE · 0%
- [FE023 — States, forms, i18n và khôi phục UI](execution/frontend-tasks/FE023.md) · STALE · 0%
- [FE024 — An toàn và phân quyền frontend](execution/frontend-tasks/FE024.md) · STALE · 0%
- [FE025 — Responsive, accessibility và hiệu năng frontend](execution/frontend-tasks/FE025.md) · STALE · 0%
- [FE026 — Artifact demo/production và kiểm tái lập](execution/frontend-tasks/FE026.md) · STALE · 0%
- [FE027 — Nghiệm thu frontend với mock data](execution/frontend-tasks/FE027.md) · STALE · 0%
- [FE028 — Cổng chất lượng frontend và bàn giao mở rộng](execution/frontend-tasks/FE028.md) · STALE · 0%

---

## FE001 — Tiếp nhận source và khóa phạm vi frontend
**Giai đoạn:** F00 · **Ưu tiên:** 1 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** Không. **Chủ nhiệm:** Codex.

**Yêu cầu:** H07, H08.

**Route IDs:** Task nền tảng/xuyên ứng dụng. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T001, T002, T004, T006 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `../BotSalesAI_Frontend/evidence/REPORT.md`
- `../BotSalesAI_Frontend/docs/KNOWN_GAPS.md`
- `../BotSalesAI_Frontend/docs/route-implementation.json`

### Vùng được sửa / đầu ra bắt buộc
- `docs/PROJECT_CONTEXT.md`
- `docs/FRONTEND_SCOPE.md`
- `docs/KNOWN_GAPS.md`
- `execution/SESSION_HANDOFF.md`

### Thực hiện tuần tự

#### FE001.S01 · 1/10 điểm · STALE

Đọc hướng dẫn có hiệu lực, xác minh cwd/Git root/revision/diff và quyền docs/implement của lượt hiện tại.

**Bằng chứng:** artifact_review. Có baseline thực và thay đổi sẵn có; không nhận việc code chỉ vì mở kế hoạch. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE001.S02 · 3/10 điểm · STALE

Map 54 route và 16 module hiện có qua route-implementation.json; phân biệt source có sẵn với browser chưa xác minh.

**Bằng chứng:** artifact_review. Mỗi route trỏ file/component thực hoặc gap rõ; không dựng lại scaffold. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source docs/route-implementation.json

#### FE001.S03 · 2/10 điểm · STALE

Đối chiếu REPORT/KNOWN_GAPS/package.json; ghi kiểm đã chạy, chưa chạy và lỗi nền theo môi trường.

**Bằng chứng:** artifact_review. Kết quả lịch sử không biến thành PASS hiện tại; không suy DNS cũ vẫn bị chặn hôm nay. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source evidence/REPORT.md

#### FE001.S04 · 2/10 điểm · STALE

Chọn mục tiêu frontend đầu tiên, scope file, API/route và các mức V0–V4 cần chạy; ghi Change Budget.

**Bằng chứng:** artifact_review. Task có Definition of Ready rõ và không phụ thuộc gate backend thật. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Missing evidence/source file: botsales-kit/execution/frontend-plan.json

#### FE001.S05 · 2/10 điểm · STALE

Bàn giao hiện trạng và xác nhận ledger frontend riêng; đọc validate/status/next, không nhận task toàn sản phẩm.

**Bằng chứng:** artifact_review. 28 task frontend bắt đầu 0%; ledger 84 task giữ nguyên trạng. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Missing evidence/source file: botsales-kit/execution/frontend-plan.json

### Kiểm tra nghiệm thu của đầu việc
- FE001.AC01 — Scope nghiệm thu mock frontend được ghi nhất quán.
- FE001.AC02 — Baseline và ma trận source đúng repo/diff.
- FE001.AC03 — Không xóa/ghi đè source có sẵn hoặc nhận backend DONE.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE001/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE002 — Toolchain và dependencies tái lập
**Giai đoạn:** F00 · **Ưu tiên:** 2 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE001. **Chủ nhiệm:** Codex.

**Yêu cầu:** H07, H08.

**Route IDs:** Task nền tảng/xuyên ứng dụng. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T003, T007 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `package.json`
- `apps/web/package.json`
- `package-lock.json`
- `.node-version`
- `scripts/setup.mjs`
- `scripts/doctor.mjs`
- `docs/PROJECT_CONTEXT.md`

### Thực hiện tuần tự

#### FE002.S01 · 1/10 điểm · STALE

Kiểm Node24/npm và exact package versions/peer requirements; giữ stack đang được chọn, ghi patch/nguồn thực.

**Bằng chứng:** artifact_review. Không đổi major/stack ngoài lỗi tương thích được chứng minh; không ghi latest. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source package.json

#### FE002.S02 · 3/10 điểm · STALE

Khảo sát setup/doctor/install scripts và quyền ghi/cache/network; ghi baseline lỗi PATH hay registry nếu xảy ra thực.

**Bằng chứng:** artifact_review. Cwd/điều kiện/tác động lệnh xác định; không giả lỗi môi trường thành lỗi code. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source package.json

#### FE002.S03 · 2/10 điểm · STALE

Cài dependencies bằng npm install để tạo lockfile thật; xử lý peer issue có căn cứ và ghi quyết định.

**Bằng chứng:** test_run. Install thành công, manifest/lock khớp; không lockfile tự viết hoặc stub thư viện. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source package.json

#### FE002.S04 · 2/10 điểm · STALE

Chạy npm setup và doctor với target thực; dùng worker MSW từ package, không tự viết worker giả.

**Bằng chứng:** test_run. Node/dependencies/lock/worker được kiểm trên máy thực; setup không ghi đè env đã có. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source package.json

#### FE002.S05 · 2/10 điểm · STALE

Kiểm npm ci trên thư mục thử sạch chứa đúng manifest/lock, giữ workspace đang làm; ghi toolchain hashes.

**Bằng chứng:** test_run. Cold install tái lập; không đè user changes hoặc nhận React build PASS chỉ vì install. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source package.json

### Kiểm tra nghiệm thu của đầu việc
- FE002.AC01 — Có lockfile thật và clean install tái lập.
- FE002.AC02 — Doctor đáp ứng target hoặc task giữ BLOCKED đúng nguyên nhân.
- FE002.AC03 — Không secret trong env/template/log.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE002/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE003 — Lệnh kiểm tra và hợp đồng bằng chứng
**Giai đoạn:** F00 · **Ưu tiên:** 3 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE002. **Chủ nhiệm:** Codex.

**Yêu cầu:** H07, H08.

**Route IDs:** Task nền tảng/xuyên ứng dụng. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T005, T012 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `package.json`
- `playwright.config.ts`
- `apps/web/vitest.config.ts`
- `execution/frontend-command-map.json`
- `docs/CONTINUE_FRONTEND.md`
- `evidence/REPORT.md`

### Thực hiện tuần tự

#### FE003.S01 · 1/10 điểm · STALE

Ánh xạ npm scripts hiện có: generate/source/boundaries/types/lint/domain/unit/build/demo/e2e; không dùng pnpm giả.

**Bằng chứng:** artifact_review. Tên/cwd/script khớp package.json; lệnh dự kiến vẫn DECLARED_NOT_RUN. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source package.json

#### FE003.S02 · 3/10 điểm · STALE

Chọn gate FE-G01..09, môi trường, fixture/scenario và bằng chứng cần cho từng task theo Verification Ladder.

**Bằng chứng:** artifact_review. Ma trận kiểm có phạm vi frontend; không yêu cầu DB/Meta/staging thật. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE003.S03 · 2/10 điểm · STALE

Kiểm cấu hình Vitest/RTL/MSW/Playwright/axe thực; thu baseline có lỗi mà không tắt suite.

**Bằng chứng:** artifact_review. Test runner và config được nạp; testfail ghi CHƯA ĐẠT, không nhận gate PASS. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE003.S04 · 2/10 điểm · STALE

Kiểm tracker frontend validate/status/next và mẫu evidence; đăng ký lệnh đã chạy đúng có log.

**Bằng chứng:** artifact_review. Evidence sai scope/thiếu log/hash bị từ chối; cấu trúc đúng không thay review coverage. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Missing evidence/source file: botsales-kit/execution/frontend-command-map.json

#### FE003.S05 · 2/10 điểm · STALE

Đồng bộ hướng dẫn chạy lại Windows/CI; ghi revision/environment và đường dẫn log, phân biệt lịch sử với lượt mới.

**Bằng chứng:** artifact_review. Có handoff tái hiện checks; không ghi CI PASS khi chưa có run. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Missing evidence/source file: botsales-kit/scripts/progress.mjs

### Kiểm tra nghiệm thu của đầu việc
- FE003.AC01 — Lệnh/checkpoint dùng nguồn hiện có và ledger frontend.
- FE003.AC02 — Không no-op hoặc test chưa chạy được đăng ký PASS.
- FE003.AC03 — Giữ báo cáo lịch sử có ngày/môi trường.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE003/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE004 — TypeScript và ranh giới module
**Giai đoạn:** F01 · **Ưu tiên:** 4 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE003. **Chủ nhiệm:** Codex.

**Yêu cầu:** H07, H08.

**Route IDs:** Task nền tảng/xuyên ứng dụng. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T008 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/09_STATE_AND_DATA_ACCESS.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/tsconfig.json`
- `eslint.config.mjs`
- `scripts/check-boundaries.mjs`
- `apps/web/src/app/`
- `apps/web/src/shared/`
- `apps/web/src/modules/`
- `tests/architecture/`

### Thực hiện tuần tự

#### FE004.S01 · 1/10 điểm · STALE

Đọc graph/import và full typecheck hiện tại; chọn lỗi cần sửa, map module/api/model/ui/public entry.

**Bằng chứng:** test_run. Có lỗi/quan hệ thật và scope hẹp; không chia mọi file theo mẫu một cách máy móc. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source apps/web/src/app/CommandRecovery.tsx

#### FE004.S02 · 3/10 điểm · STALE

Sửa type/lint/boundary theo schema thư viện thật, giữ strict/noUncheckedIndexedAccess và config đã chọn.

**Bằng chứng:** test_run. Không any, type suppression, exclude module lỗi hoặc declaration giả. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source package.json

#### FE004.S03 · 2/10 điểm · STALE

Tách trách nhiệm phần đang sửa: app composition, module local logic và shared không nghiệp vụ.

**Bằng chứng:** test_run. Không module X import Y, shared import app/modules/mocks hoặc cycle/SDK lọt vào web. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source package.json

#### FE004.S04 · 2/10 điểm · STALE

Kiểm negative fixtures alias/relative/type-only/dynamic imports và file không parse; sửa checker nếu có lỗi thực.

**Bằng chứng:** test_run. Vi phạm bị phát hiện; checker không bỏ qua nguồn không parse hoặc cycle. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source package.json

#### FE004.S05 · 2/10 điểm · STALE

Chạy full typecheck/lint/boundaries và source checker; review diff theo Change Budget.

**Bằng chứng:** test_run. Các cổng chạy trên full source; refactor chỉ phần liên quan, public behavior giữ đúng. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source package.json

### Kiểm tra nghiệm thu của đầu việc
- FE004.AC01 — Full TypeScript/lint đạt trên source thật.
- FE004.AC02 — Boundary checker chặn imports/cycles sai qua test có ý nghĩa.
- FE004.AC03 — Một nguồn MUI/Query/Router và public entry rõ.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE004/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE005 — Contracts và HTTP transport có kiểu
**Giai đoạn:** F01 · **Ưu tiên:** 5 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE004. **Chủ nhiệm:** Codex.

**Yêu cầu:** H07, H08.

**Route IDs:** Task nền tảng/xuyên ứng dụng. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T009 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `contracts/openapi.json`
- `contracts/route-manifest.json`
- `contracts/permission-catalog.json`
- `contracts/events.schema.json`
- `../BotSalesAI_Frontend/docs/KNOWN_GAPS.md`

### Vùng được sửa / đầu ra bắt buộc
- `scripts/generate.mjs`
- `apps/web/src/shared/api/`
- `apps/web/src/shared/model/`
- `apps/web/src/modules/bot/index.tsx`
- `apps/web/src/modules/catalog/index.tsx`
- `apps/web/src/modules/customers/index.tsx`
- `apps/web/src/modules/integrations/index.tsx`
- `apps/web/src/modules/knowledge/index.tsx`
- `apps/web/src/modules/workspace/index.tsx`
- `tests/contracts/`
- `apps/web/tests/`

### Thực hiện tuần tự

#### FE005.S01 · 1/10 điểm · STALE

Đọc OpenAPI/routes/permissions/events; map operationId và DTO dùng thật, ghi gaps không tự sửa canonical.

**Bằng chứng:** test_run. Tất cả refs/operation đang dùng tồn tại; Money/id/optional/null khớp source. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source apps/web/src/app/CommandRecovery.tsx

#### FE005.S02 · 3/10 điểm · STALE

Kiểm generator từ kit sang packages/CSS/manifest và sửa lỗi generator có bằng chứng, không edit output bằng tay.

**Bằng chứng:** test_run. npm generate:check đồng nhất; contract YAML/index/generated DTO không thành nguồn song song. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Missing evidence/source file: botsales-kit/contracts/events.schema.json

#### FE005.S03 · 2/10 điểm · STALE

Hoàn thiện client credential/CSRF/version/idempotency/AbortSignal/Problem; validate request/response.

**Bằng chứng:** test_run. Không fetch riêng trong JSX, hardcode endpoint/DTO hoặc retry mutation mù. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source apps/web/src/app/CommandRecovery.tsx

#### FE005.S04 · 2/10 điểm · STALE

Test transport với fixture HTTP success/202/409/412/422/428/429/timeout/schema-invalid và optional/null.

**Bằng chứng:** test_run. Field errors giữ form; 202 chưa success; unsupported enum không map thành trạng thái tốt. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Missing evidence/source file: botsales-kit/contracts/openapi.json

#### FE005.S05 · 2/10 điểm · STALE

Chạy generator/contract/helper tests/typecheck; ghi negative case missing schema/version và drift.

**Bằng chứng:** test_run. Schema sai bị từ chối; output fresh; phạm vi chỉ frontend transport, không chứng minh server. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Missing evidence/source file: botsales-kit/contracts/events.schema.json

### Kiểm tra nghiệm thu của đầu việc
- FE005.AC01 — Generated freshness và schema validation có positive/negative cases.
- FE005.AC02 — Một client, operationId chuẩn; lỗi có UI intent đúng.
- FE005.AC03 — Không backend CRUD/address/account API tự bịa.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE005/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE006 — Design system Graphite Gold và UI nền
**Giai đoạn:** F01 · **Ưu tiên:** 6 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE004. **Chủ nhiệm:** Codex.

**Yêu cầu:** H07, H08.

**Route IDs:** Task nền tảng/xuyên ứng dụng. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T010, T061 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/decision.json`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/shared/ui/`
- `apps/web/src/app/bootstrap.css`
- `apps/web/index.html`
- `apps/web/tests/components.test.tsx`
- `tests/design/`

### Thực hiện tuần tự

#### FE006.S01 · 1/10 điểm · STALE

Đối chiếu decision/tokens và MUI bridge hiện có; map typography/spacing/breakpoint/semantic colors.

**Bằng chứng:** test_run. Một Graphite Gold dark-only từ tokens nguyên bản, không thêm bảng màu/theme. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE006.S02 · 3/10 điểm · STALE

Hoàn thiện primitive/shared behavior cần dùng: form/error/table/dialog/loading/status và pre-JS background.

**Bằng chứng:** test_run. Các trạng thái/layout dùng theme/token; không wrapper từng primitive vô nghĩa hoặc flash nền trắng. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE006.S03 · 2/10 điểm · STALE

Hoàn thiện label/error association/focus return/touch target/reduced-motion/forced-colors phù hợp docs/03.

**Bằng chứng:** test_run. Keyboard/zoom hỗ trợ thật; trạng thái không chỉ phân biệt bằng màu. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE006.S04 · 2/10 điểm · STALE

Kiểm component và gallery trên viewport docs/03, contrast thực với axe + kiểm thủ công phù hợp.

**Bằng chứng:** test_run. Focus/order/contrast/error label đạt; ảnh React app thật, không ảnh prototype. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE006.S05 · 2/10 điểm · STALE

Chạy token drift/component/type checks và negative palette/copy HEX test; review API shared component.

**Bằng chứng:** test_run. Bridge và tokens đồng nhất; public props rõ, không generic form/table engine. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE006.AC01 — Một theme/provider và nguồn token.
- FE006.AC02 — Shared UI có keyboard/focus/labels và trạng thái đầy đủ.
- FE006.AC03 — Không palette cũ/light/system selector hoặc hardcode màu.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE006/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE007 — Shell, phiên và scope dữ liệu
**Giai đoạn:** F01 · **Ưu tiên:** 7 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE005, FE006, FE008. **Chủ nhiệm:** Codex.

**Yêu cầu:** H07, H08.

**Route IDs:** Task nền tảng/xuyên ứng dụng. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T011, T018 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/09_STATE_AND_DATA_ACCESS.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/app/`
- `apps/web/src/shared/model/`
- `apps/web/src/shared/api/hooks.ts`
- `tests/session/`
- `tests/frontend.spec.ts`

### Thực hiện tuần tự

#### FE007.S01 · 1/10 điểm · STALE

Đọc route manifest và scope/session/query/SSE hiện có; map auth/forbidden/loading và deep links.

**Bằng chứng:** test_run. Router ghép public module entries; không route trống hoặc cache tenant-free. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE007.S02 · 3/10 điểm · STALE

Hoàn thiện shell/navigation/query keys principal/shop/permissionVersion/filter; auth flow dùng mock protocol theo contract.

**Bằng chứng:** test_run. Một Router/QueryClient/theme provider; 401/403 không giả empty success. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE007.S03 · 2/10 điểm · STALE

Đổi shop/logout/revoke hủy queries/stream, loại response cũ và xử lý dirty draft trước rời route/dialog.

**Bằng chứng:** test_run. Không data shop trước hiện ở scope mới; form không mất âm thầm; token không localStorage. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE007.S04 · 2/10 điểm · STALE

Test switch-shop race/late response/revoke/deep-link refresh/chunk-error/mobile menu với mock network.

**Bằng chứng:** test_run. Late response bị loại; route guard/stream cleanup và error boundary hoạt động. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE007.S05 · 2/10 điểm · STALE

Chạy shell E2E + helpers/component checks; kiểm nhãn demo và lỗi startup khi chọn transport sai.

**Bằng chứng:** test_run. React app thật chạy đúng; live missing backend hiện unavailable, không tự bật mock. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE007.AC01 — Query/cache/stream scope không rò giữa user/shop.
- FE007.AC02 — Deep links/mobile navigation và dirty drafts được bảo toàn.
- FE007.AC03 — Auth giả có nhãn; không nhận OIDC/server authorization đã kiểm thật.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE007/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE008 — Mock API và bộ dữ liệu nghiệm thu
**Giai đoạn:** F01 · **Ưu tiên:** 8 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE005, FE006. **Chủ nhiệm:** Codex.

**Yêu cầu:** A01, A02, A03, A04, A05, A06, A07, A08, B01, B02, B03, B04, B05, B06, B07, B08, C01, C02, C03, C04, C05, C06, C07, C08, D01, D02, D03, D04, D05, D06, D07, D08, E01, E02, E03, E04, E05, E06, E07, E08, F01, F02, F03, F04, F05, F06, F07, F08, G01, G02, G03, G04, G05, G06, G07, G08, H01, H02, H03, H04, H05, H06, H07, H08.

**Route IDs:** R01, R02, R03, R04, R05, R06, R07, R08, R09, R10, R11, R12, R13, R14, R15, R16, R17, R18, R19, R20, R21, R22, R23, R24, R25, R26, R27, R28, R29, R30, R31, R32, R33, R34, R35, R36, R37, R38, R39, R40, R41, R42, R43, R44, R45, R46, R47, R48, R49, R50, R51, R52, R53, R54. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T012 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `contracts/feature-catalog.json`
- `contracts/events.schema.json`
- `docs/10_TESTING_ACCEPTANCE.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/mocks/`
- `apps/web/src/main.tsx`
- `tests/fixtures/`
- `tests/domain-scenarios.cjs`
- `scripts/test-domain.mjs`
- `scripts/validate-mock-schemas.py`
- `samples/`

### Thực hiện tuần tự

#### FE008.S01 · 1/10 điểm · STALE

Lập dataset/scenario theo 54 routes/feature-catalog và canonical schema; dùng hai shops và role presets thật.

**Bằng chứng:** test_run. Quan hệ ID/tiền/trạng thái hợp lệ, dữ liệu tổng hợp và seed/clock/reset tái lập. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE008.S02 · 3/10 điểm · STALE

Hoàn thiện MSW HTTP handlers và mock service theo operationId, cursor/filter/version/allowedActions/command lifecycle.

**Bằng chứng:** test_run. UI dùng cùng transport; không fixture trong JSX hoặc mock fallback live. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE008.S03 · 2/10 điểm · STALE

Bổ sung nhiều dòng/dữ liệu lớn, empty/partial, permission denied, stale/422/unknown, delayed/late response và SSE cases.

**Bằng chứng:** test_run. Có ca happy/unhappy định danh; không toast thành công trong failure; không gọi dịch vụ thật. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE008.S04 · 2/10 điểm · STALE

Chạy simulator/schema checks và network tests; kiểm request/response/seed/collections mới cùng fixture quan hệ.

**Bằng chứng:** test_run. Các payload đúng schema; mock-invalid/schema-error và wrong-shop được phát hiện trong test. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE008.S05 · 2/10 điểm · STALE

Test reset/isolation và activation demo/test-only; ghi nhãn synthetic, limitations và nguồn fixture.

**Bằng chứng:** test_run. Hai test/shops không rò trạng thái; production không kích hoạt mock; không nhận simulator là backend. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE008.AC01 — Dữ liệu phủ đủ luồng UAT và state/role quan trọng.
- FE008.AC02 — Request/response/fixture schema được kiểm thực.
- FE008.AC03 — MSW chỉ demo/test, reset/seed có tính tái lập.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE008/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE009 — Workspace, membership và khách hàng
**Giai đoạn:** F02 · **Ưu tiên:** 9 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE007, FE008. **Chủ nhiệm:** Codex.

**Yêu cầu:** B06, G01, G02, G03, G04, G05, G06, H05, H06, H07.

**Route IDs:** R01, R02, R03, R07, R08, R32, R33, R34, R35, R36, R54. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T018, T021, T063 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `../BotSalesAI_Frontend/docs/KNOWN_GAPS.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/modules/workspace/`
- `apps/web/src/modules/customers/`
- `apps/web/src/mocks/`
- `apps/web/tests/`
- `tests/`

### Thực hiện tuần tự

#### FE009.S01 · 1/10 điểm · STALE

Map routeId/operationId/permissions/feature scenarios bên dưới với source hiện có; chọn public api/model/ui cần sửa và ghi gap.

**Bằng chứng:** test_run. Mọi action có operation/capability rõ, DTO dùng source chuẩn; không sửa module ngoài mục tiêu. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE009.S02 · 3/10 điểm · STALE

Hoàn thiện shop/membership/onboarding/customer list-detail/forms/jobs/privacy UI theo contract; lookup/search/pagination, field visibility và draft lifecycle.

**Bằng chứng:** test_run. Luồng happy path có payload/request và thay đổi state mock quan sát được; dữ liệu trả đúng schema và totals từ API. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE009.S03 · 2/10 điểm · STALE

Kiểm role/read-only/revoke/422/412/not-found, shop switch và privacy capability unavailable; không tạo password step-up trái OIDC contract.

**Bằng chứng:** test_run. Luồng âm giữ dữ liệu người dùng và hiện lý do phù hợp; không hành động vượt allowedActions hoặc báo thành công giả. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE009.S04 · 2/10 điểm · STALE

Viết/chạy component + network/contract regression cho acceptance của task; dùng seed/reset/clock để tái hiện ca lỗi.

**Bằng chứng:** test_run. Ca hợp lệ/không hợp lệ kiểm behavior thực, không chỉ snapshots; action gửi đúng operation/body/version và scope. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE009.S05 · 2/10 điểm · STALE

Chạy browser luồng task trên React demo với mock HTTP; ghi route/state/role/scenario test IDs, kết quả và log của diff.

**Bằng chứng:** test_run. Acceptance dưới đây có bằng chứng browser phù hợp; labels/keyboard/responsive áp dụng; không đòi backend thật. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE009.AC01 — Hai shops/roles có dữ liệu tách biệt; membership bị thu hồi không fallback shop khác.
- FE009.AC02 — Form khách giữ input sau 422/412 và refetch; danh sách/tìm kiếm/phân trang đúng.
- FE009.AC03 — Privacy destruction không có đường tắt; thao tác chưa có protocol được giải thích rõ.
- FE009.AC04 — Mock HTTP có nhãn synthetic; API/permissions/token không bị bịa hoặc sửa ngầm.
- FE009.AC05 — Source/type/lint/boundaries và tests liên quan chạy thật, không nhận feature hoàn chỉnh chỉ vì route có component.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE009/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE010 — Catalog, biến thể và import
**Giai đoạn:** F02 · **Ưu tiên:** 10 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE009. **Chủ nhiệm:** Codex.

**Yêu cầu:** H07, H08.

**Route IDs:** R09, R10, R11, R12, R13, R14. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T019, T020 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/05_DOMAIN_AND_INVARIANTS.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/modules/catalog/`
- `apps/web/src/mocks/`
- `apps/web/tests/`
- `tests/`

### Thực hiện tuần tự

#### FE010.S01 · 1/10 điểm · STALE

Map routeId/operationId/permissions/feature scenarios bên dưới với source hiện có; chọn public api/model/ui cần sửa và ghi gap.

**Bằng chứng:** test_run. Mọi action có operation/capability rõ, DTO dùng source chuẩn; không sửa module ngoài mục tiêu. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE010.S02 · 3/10 điểm · STALE

Hoàn thiện product/category/variant/editor/image/import UI, nhiều dòng/SKU và tìm kiếm/phân trang theo operation đã có; export mẫu tổng hợp.

**Bằng chứng:** test_run. Luồng happy path có payload/request và thay đổi state mock quan sát được; dữ liệu trả đúng schema và totals từ API. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE010.S03 · 2/10 điểm · STALE

Kiểm duplicate SKU/invalid fields/upload/import partial/412 và permission cost; dirty input không bị refetch hoặc navigation ghi đè.

**Bằng chứng:** test_run. Luồng âm giữ dữ liệu người dùng và hiện lý do phù hợp; không hành động vượt allowedActions hoặc báo thành công giả. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE010.S04 · 2/10 điểm · STALE

Viết/chạy component + network/contract regression cho acceptance của task; dùng seed/reset/clock để tái hiện ca lỗi.

**Bằng chứng:** test_run. Ca hợp lệ/không hợp lệ kiểm behavior thực, không chỉ snapshots; action gửi đúng operation/body/version và scope. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE010.S05 · 2/10 điểm · STALE

Chạy browser luồng task trên React demo với mock HTTP; ghi route/state/role/scenario test IDs, kết quả và log của diff.

**Bằng chứng:** test_run. Acceptance dưới đây có bằng chứng browser phù hợp; labels/keyboard/responsive áp dụng; không đòi backend thật. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE010.AC01 — Tạo/sửa/list/detail/variant có payload và kết quả mock đúng quan hệ.
- FE010.AC02 — Import có valid/invalid/partial rows và báo lỗi từng dòng, giới hạn/capability rõ.
- FE010.AC03 — Giá/cost thiếu không biến thành 0; sửa xung đột giữ dữ liệu nhập.
- FE010.AC04 — Mock HTTP có nhãn synthetic; API/permissions/token không bị bịa hoặc sửa ngầm.
- FE010.AC05 — Source/type/lint/boundaries và tests liên quan chạy thật, không nhận feature hoàn chỉnh chỉ vì route có component.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE010/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE011 — Tồn kho và biến động
**Giai đoạn:** F02 · **Ưu tiên:** 11 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE010. **Chủ nhiệm:** Codex.

**Yêu cầu:** H07, H08.

**Route IDs:** R15, R16. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T022, T023, T024 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/05_DOMAIN_AND_INVARIANTS.md`
- `docs/09_STATE_AND_DATA_ACCESS.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/modules/inventory/`
- `apps/web/src/mocks/`
- `apps/web/tests/`
- `tests/`

### Thực hiện tuần tự

#### FE011.S01 · 1/10 điểm · STALE

Map routeId/operationId/permissions/feature scenarios bên dưới với source hiện có; chọn public api/model/ui cần sửa và ghi gap.

**Bằng chứng:** test_run. Mọi action có operation/capability rõ, DTO dùng source chuẩn; không sửa module ngoài mục tiêu. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE011.S02 · 3/10 điểm · STALE

Hoàn thiện stock positions/reservations/movements/adjustment UI và liên kết catalog bằng app/public props; filter/lookup có cursor.

**Bằng chứng:** test_run. Luồng happy path có payload/request và thay đổi state mock quan sát được; dữ liệu trả đúng schema và totals từ API. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE011.S03 · 2/10 điểm · STALE

Kiểm stock unavailable/version conflict/permission denied/negative quantity/unknown command; không trừ kho optimistic hoặc áp stale SSE delta.

**Bằng chứng:** test_run. Luồng âm giữ dữ liệu người dùng và hiện lý do phù hợp; không hành động vượt allowedActions hoặc báo thành công giả. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE011.S04 · 2/10 điểm · STALE

Viết/chạy component + network/contract regression cho acceptance của task; dùng seed/reset/clock để tái hiện ca lỗi.

**Bằng chứng:** test_run. Ca hợp lệ/không hợp lệ kiểm behavior thực, không chỉ snapshots; action gửi đúng operation/body/version và scope. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE011.S05 · 2/10 điểm · STALE

Chạy browser luồng task trên React demo với mock HTTP; ghi route/state/role/scenario test IDs, kết quả và log của diff.

**Bằng chứng:** test_run. Acceptance dưới đây có bằng chứng browser phù hợp; labels/keyboard/responsive áp dụng; không đòi backend thật. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE011.AC01 — Stock/reserved/available hiển thị theo snapshot mock, không tính lại quyền quyết định.
- FE011.AC02 — Adjustment và movement có ID/history; double click không tạo request mới unsafe.
- FE011.AC03 — Sai shop/late response bị loại; conflict/unknown giữ trạng thái chờ reconcile.
- FE011.AC04 — Mock HTTP có nhãn synthetic; API/permissions/token không bị bịa hoặc sửa ngầm.
- FE011.AC05 — Source/type/lint/boundaries và tests liên quan chạy thật, không nhận feature hoàn chỉnh chỉ vì route có component.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE011/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE012 — Báo giá, xác nhận và đơn hàng
**Giai đoạn:** F02 · **Ưu tiên:** 12 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE009, FE010, FE011. **Chủ nhiệm:** Codex.

**Yêu cầu:** C07, C08.

**Route IDs:** R17, R18, R19, R43. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T025, T026, T027, T029, T030 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/05_DOMAIN_AND_INVARIANTS.md`
- `docs/22_FULFILLMENT.md`
- `../BotSalesAI_Frontend/docs/KNOWN_GAPS.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/modules/orders/`
- `apps/web/src/mocks/`
- `apps/web/tests/`
- `tests/`

### Thực hiện tuần tự

#### FE012.S01 · 1/10 điểm · STALE

Map routeId/operationId/permissions/feature scenarios bên dưới với source hiện có; chọn public api/model/ui cần sửa và ghi gap.

**Bằng chứng:** test_run. Mọi action có operation/capability rõ, DTO dùng source chuẩn; không sửa module ngoài mục tiêu. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE012.S02 · 3/10 điểm · STALE

Hoàn thiện order list/detail/editor nhiều dòng, quote/confirmation/cancel/return và nguồn customer/inbox refs qua app composition; totals từ API.

**Bằng chứng:** test_run. Luồng happy path có payload/request và thay đổi state mock quan sát được; dữ liệu trả đúng schema và totals từ API. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE012.S03 · 2/10 điểm · STALE

Kiểm quote expired/address ID thiếu/422/412/428/202/unknown/double click/offline và allowedActions; draft không mất hoặc tự resend.

**Bằng chứng:** test_run. Luồng âm giữ dữ liệu người dùng và hiện lý do phù hợp; không hành động vượt allowedActions hoặc báo thành công giả. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE012.S04 · 2/10 điểm · STALE

Viết/chạy component + network/contract regression cho acceptance của task; dùng seed/reset/clock để tái hiện ca lỗi.

**Bằng chứng:** test_run. Ca hợp lệ/không hợp lệ kiểm behavior thực, không chỉ snapshots; action gửi đúng operation/body/version và scope. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE012.S05 · 2/10 điểm · STALE

Chạy browser luồng task trên React demo với mock HTTP; ghi route/state/role/scenario test IDs, kết quả và log của diff.

**Bằng chứng:** test_run. Acceptance dưới đây có bằng chứng browser phù hợp; labels/keyboard/responsive áp dụng; không đòi backend thật. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE012.AC01 — Đổi giá/hàng yêu cầu quote/xác nhận mới theo mock contract.
- FE012.AC02 — Confirm tạo order ID/reservation mock; 202 chưa báo hoàn tất.
- FE012.AC03 — Timeout giữ key/commandId; reconcile trước action mới; cancel không dùng cho handed_over.
- FE012.AC04 — Thiếu CRUD địa chỉ được nêu rõ; không bịa endpoint hoặc đổi policy.
- FE012.AC05 — Mock HTTP có nhãn synthetic; API/permissions/token không bị bịa hoặc sửa ngầm.
- FE012.AC06 — Source/type/lint/boundaries và tests liên quan chạy thật, không nhận feature hoàn chỉnh chỉ vì route có component.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE012/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE013 — Chuẩn bị, giao và trả hàng
**Giai đoạn:** F02 · **Ưu tiên:** 13 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE012. **Chủ nhiệm:** Codex.

**Yêu cầu:** C01, C02, C03, C04, C05, C06.

**Route IDs:** R41, R42. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T031, T032, T035, T036 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/22_FULFILLMENT.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/modules/fulfillment/`
- `apps/web/src/mocks/`
- `apps/web/tests/`
- `tests/`

### Thực hiện tuần tự

#### FE013.S01 · 1/10 điểm · STALE

Map routeId/operationId/permissions/feature scenarios bên dưới với source hiện có; chọn public api/model/ui cần sửa và ghi gap.

**Bằng chứng:** test_run. Mọi action có operation/capability rõ, DTO dùng source chuẩn; không sửa module ngoài mục tiêu. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE013.S02 · 3/10 điểm · STALE

Hoàn thiện work-item claim/pick/pack/dispatch/delivery/return UI theo states và allowedActions; dữ liệu mock nối order/reservation/history.

**Bằng chứng:** test_run. Luồng happy path có payload/request và thay đổi state mock quan sát được; dữ liệu trả đúng schema và totals từ API. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE013.S03 · 2/10 điểm · STALE

Kiểm claim stale/already-assigned, partial stock, pack validation, dispatch unknown, không gộp packed/delivered hoặc tự giải phóng reservation.

**Bằng chứng:** test_run. Luồng âm giữ dữ liệu người dùng và hiện lý do phù hợp; không hành động vượt allowedActions hoặc báo thành công giả. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE013.S04 · 2/10 điểm · STALE

Viết/chạy component + network/contract regression cho acceptance của task; dùng seed/reset/clock để tái hiện ca lỗi.

**Bằng chứng:** test_run. Ca hợp lệ/không hợp lệ kiểm behavior thực, không chỉ snapshots; action gửi đúng operation/body/version và scope. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE013.S05 · 2/10 điểm · STALE

Chạy browser luồng task trên React demo với mock HTTP; ghi route/state/role/scenario test IDs, kết quả và log của diff.

**Bằng chứng:** test_run. Acceptance dưới đây có bằng chứng browser phù hợp; labels/keyboard/responsive áp dụng; không đòi backend thật. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE013.AC01 — Claim đúng role/version; cạnh tranh mô phỏng hiện conflict rõ.
- FE013.AC02 — Pick/pack/handed_over/delivered phân biệt, filter giữ việc chưa nhận.
- FE013.AC03 — Replay/unknown không tạo giao hàng lại; return/refund obligation hiển thị từ mock API.
- FE013.AC04 — Mock HTTP có nhãn synthetic; API/permissions/token không bị bịa hoặc sửa ngầm.
- FE013.AC05 — Source/type/lint/boundaries và tests liên quan chạy thật, không nhận feature hoàn chỉnh chỉ vì route có component.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE013/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE014 — Mua hàng, phê duyệt và nhận hàng
**Giai đoạn:** F02 · **Ưu tiên:** 14 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE010, FE011. **Chủ nhiệm:** Codex.

**Yêu cầu:** D01, D02, D03, D04, D05, D06, D07, D08.

**Route IDs:** R44, R45, R46, R47. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T043, T044, T045, T046, T047, T048 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/23_PROCUREMENT.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/modules/procurement/`
- `apps/web/src/mocks/`
- `apps/web/tests/`
- `tests/`

### Thực hiện tuần tự

#### FE014.S01 · 1/10 điểm · STALE

Map routeId/operationId/permissions/feature scenarios bên dưới với source hiện có; chọn public api/model/ui cần sửa và ghi gap.

**Bằng chứng:** test_run. Mọi action có operation/capability rõ, DTO dùng source chuẩn; không sửa module ngoài mục tiêu. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE014.S02 · 3/10 điểm · STALE

Hoàn thiện supplier/reorder/proposal/approval/purchase/receipt nhiều dòng và nhận một phần; dữ liệu fake về MOQ/packSize/budget/history.

**Bằng chứng:** test_run. Luồng happy path có payload/request và thay đổi state mock quan sát được; dữ liệu trả đúng schema và totals từ API. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE014.S03 · 2/10 điểm · STALE

Kiểm supplier khác shop/chưa duyệt, thay giá/qty làm approval stale, thiếu budget, send unknown, receipt replay và permission.

**Bằng chứng:** test_run. Luồng âm giữ dữ liệu người dùng và hiện lý do phù hợp; không hành động vượt allowedActions hoặc báo thành công giả. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE014.S04 · 2/10 điểm · STALE

Viết/chạy component + network/contract regression cho acceptance của task; dùng seed/reset/clock để tái hiện ca lỗi.

**Bằng chứng:** test_run. Ca hợp lệ/không hợp lệ kiểm behavior thực, không chỉ snapshots; action gửi đúng operation/body/version và scope. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE014.S05 · 2/10 điểm · STALE

Chạy browser luồng task trên React demo với mock HTTP; ghi route/state/role/scenario test IDs, kết quả và log của diff.

**Bằng chứng:** test_run. Acceptance dưới đây có bằng chứng browser phù hợp; labels/keyboard/responsive áp dụng; không đòi backend thật. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE014.AC01 — Editor nhiều dòng, quantities/MOQ/packSize và remaining receipts đúng schema.
- FE014.AC02 — Approval gắn version; send timeout phải reconcile, không gửi PO mới mù.
- FE014.AC03 — Receipt mô phỏng cập nhật tồn/công nợ một lần trong scenario, không nhận DB race đã kiểm.
- FE014.AC04 — Không forecast confidence giả hoặc quyền mua đồng nghĩa quyền thanh toán.
- FE014.AC05 — Mock HTTP có nhãn synthetic; API/permissions/token không bị bịa hoặc sửa ngầm.
- FE014.AC06 — Source/type/lint/boundaries và tests liên quan chạy thật, không nhận feature hoàn chỉnh chỉ vì route có component.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE014/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE015 — Finance, COD và đối soát
**Giai đoạn:** F02 · **Ưu tiên:** 15 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE012, FE013, FE014. **Chủ nhiệm:** Codex.

**Yêu cầu:** E01, E02, E03, E04, E05, E06, E07, E08.

**Route IDs:** R20, R21, R22, R48, R49, R50. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T028, T049, T050, T051, T052, T054 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/24_FINANCE.md`
- `../BotSalesAI_Frontend/docs/KNOWN_GAPS.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/modules/finance/`
- `apps/web/src/mocks/`
- `apps/web/tests/`
- `tests/`

### Thực hiện tuần tự

#### FE015.S01 · 1/10 điểm · STALE

Map routeId/operationId/permissions/feature scenarios bên dưới với source hiện có; chọn public api/model/ui cần sửa và ghi gap.

**Bằng chứng:** test_run. Mọi action có operation/capability rõ, DTO dùng source chuẩn; không sửa module ngoài mục tiêu. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE015.S02 · 3/10 điểm · STALE

Hoàn thiện cashflow/journal nhiều dòng/COD/statements/matching/receivables/period UI; amount decimal string/currency, dữ liệu snapshot từ mock.

**Bằng chứng:** test_run. Luồng happy path có payload/request và thay đổi state mock quan sát được; dữ liệu trả đúng schema và totals từ API. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE015.S03 · 2/10 điểm · STALE

Kiểm unbalanced journal/duplicate source/locked period/partial match/unknown posting/422/permission field và timezone filters.

**Bằng chứng:** test_run. Luồng âm giữ dữ liệu người dùng và hiện lý do phù hợp; không hành động vượt allowedActions hoặc báo thành công giả. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE015.S04 · 2/10 điểm · STALE

Viết/chạy component + network/contract regression cho acceptance của task; dùng seed/reset/clock để tái hiện ca lỗi.

**Bằng chứng:** test_run. Ca hợp lệ/không hợp lệ kiểm behavior thực, không chỉ snapshots; action gửi đúng operation/body/version và scope. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE015.S05 · 2/10 điểm · STALE

Chạy browser luồng task trên React demo với mock HTTP; ghi route/state/role/scenario test IDs, kết quả và log của diff.

**Bằng chứng:** test_run. Acceptance dưới đây có bằng chứng browser phù hợp; labels/keyboard/responsive áp dụng; không đòi backend thật. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE015.AC01 — Totals/report lấy từ API mock, không tổng trang hiện tại hoặc Number(amount) cho quyết định tiền.
- FE015.AC02 — Journal nhiều dòng, debit/credit errors và locked period có UI đúng.
- FE015.AC03 — COD/statement/import/reconcile có valid/invalid/partial cases và no-resend-unknown.
- FE015.AC04 — Chưa có account catalog API hiện hạn chế ID rõ, không bịa kế toán pháp định.
- FE015.AC05 — Mock HTTP có nhãn synthetic; API/permissions/token không bị bịa hoặc sửa ngầm.
- FE015.AC06 — Source/type/lint/boundaries và tests liên quan chạy thật, không nhận feature hoàn chỉnh chỉ vì route có component.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE015/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE016 — Inbox và takeover
**Giai đoạn:** F02 · **Ưu tiên:** 16 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE009, FE012. **Chủ nhiệm:** Codex.

**Yêu cầu:** B01, B02, B03, B04, B05, B07, B08.

**Route IDs:** R05, R06. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T037, T038 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/07_AI_AND_CHANNELS.md`
- `docs/09_STATE_AND_DATA_ACCESS.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/modules/inbox/`
- `apps/web/src/mocks/`
- `apps/web/tests/`
- `tests/`

### Thực hiện tuần tự

#### FE016.S01 · 1/10 điểm · STALE

Map routeId/operationId/permissions/feature scenarios bên dưới với source hiện có; chọn public api/model/ui cần sửa và ghi gap.

**Bằng chứng:** test_run. Mọi action có operation/capability rõ, DTO dùng source chuẩn; không sửa module ngoài mục tiêu. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE016.S02 · 3/10 điểm · STALE

Hoàn thiện conversation/message/media/contact refs/takeover/handoff UI; compose create-order tại app layer; delivery/command status từ mock.

**Bằng chứng:** test_run. Luồng happy path có payload/request và thay đổi state mock quan sát được; dữ liệu trả đúng schema và totals từ API. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE016.S03 · 2/10 điểm · STALE

Kiểm takeover version/revoke/late event/untrusted message HTML/send timeout/capability unavailable; không gửi Meta hoặc nhận delivered giả.

**Bằng chứng:** test_run. Luồng âm giữ dữ liệu người dùng và hiện lý do phù hợp; không hành động vượt allowedActions hoặc báo thành công giả. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE016.S04 · 2/10 điểm · STALE

Viết/chạy component + network/contract regression cho acceptance của task; dùng seed/reset/clock để tái hiện ca lỗi.

**Bằng chứng:** test_run. Ca hợp lệ/không hợp lệ kiểm behavior thực, không chỉ snapshots; action gửi đúng operation/body/version và scope. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE016.S05 · 2/10 điểm · STALE

Chạy browser luồng task trên React demo với mock HTTP; ghi route/state/role/scenario test IDs, kết quả và log của diff.

**Bằng chứng:** test_run. Acceptance dưới đây có bằng chứng browser phù hợp; labels/keyboard/responsive áp dụng; không đòi backend thật. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE016.AC01 — Takeover/handoff/allowedActions từ API mock, không hai luồng gửi cùng lúc unsafe.
- FE016.AC02 — Nội dung khách/media xử lý an toàn và dữ liệu không tự thành knowledge published.
- FE016.AC03 — Message send 202/unknown có status rõ; reconnect/resync fetch snapshot.
- FE016.AC04 — Mock HTTP có nhãn synthetic; API/permissions/token không bị bịa hoặc sửa ngầm.
- FE016.AC05 — Source/type/lint/boundaries và tests liên quan chạy thật, không nhận feature hoàn chỉnh chỉ vì route có component.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE016/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE017 — Tri thức và vòng duyệt
**Giai đoạn:** F02 · **Ưu tiên:** 17 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE016. **Chủ nhiệm:** Codex.

**Yêu cầu:** H07, H08.

**Route IDs:** R23, R24, R25. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T039 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/07_AI_AND_CHANNELS.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/modules/knowledge/`
- `apps/web/src/mocks/`
- `apps/web/tests/`
- `tests/`

### Thực hiện tuần tự

#### FE017.S01 · 1/10 điểm · STALE

Map routeId/operationId/permissions/feature scenarios bên dưới với source hiện có; chọn public api/model/ui cần sửa và ghi gap.

**Bằng chứng:** test_run. Mọi action có operation/capability rõ, DTO dùng source chuẩn; không sửa module ngoài mục tiêu. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE017.S02 · 3/10 điểm · STALE

Hoàn thiện source/document/version/review/publish/feedback UI với dữ liệu tổng hợp; state/capability/visibility từ API mock.

**Bằng chứng:** test_run. Luồng happy path có payload/request và thay đổi state mock quan sát được; dữ liệu trả đúng schema và totals từ API. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE017.S03 · 2/10 điểm · STALE

Kiểm thiếu dữ liệu bắt buộc/upload invalid/review stale/publish denied/422 và tài liệu không tin cậy; không tự đổi chat thành tri thức.

**Bằng chứng:** test_run. Luồng âm giữ dữ liệu người dùng và hiện lý do phù hợp; không hành động vượt allowedActions hoặc báo thành công giả. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE017.S04 · 2/10 điểm · STALE

Viết/chạy component + network/contract regression cho acceptance của task; dùng seed/reset/clock để tái hiện ca lỗi.

**Bằng chứng:** test_run. Ca hợp lệ/không hợp lệ kiểm behavior thực, không chỉ snapshots; action gửi đúng operation/body/version và scope. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE017.S05 · 2/10 điểm · STALE

Chạy browser luồng task trên React demo với mock HTTP; ghi route/state/role/scenario test IDs, kết quả và log của diff.

**Bằng chứng:** test_run. Acceptance dưới đây có bằng chứng browser phù hợp; labels/keyboard/responsive áp dụng; không đòi backend thật. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE017.AC01 — Draft/review/published/version history phân biệt; dùng allowedActions khi contract có khai báo. Knowledge hiện chưa có field này trong OpenAPI, nên luồng mock kiểm quyền bằng permission chuẩn knowledge.publish cùng lifecycle ready_for_review; không thêm field vào DTO/API/generated.
- FE017.AC02 — Giá/tồn dùng snapshot/live-tool mock phù hợp, không embedding cache làm authority.
- FE017.AC03 — Upload/feedback/errors có labels và giữ input; không render raw HTML.
- FE017.AC04 — Mock HTTP có nhãn synthetic; API/permissions/token không bị bịa hoặc sửa ngầm.
- FE017.AC05 — Source/type/lint/boundaries và tests liên quan chạy thật, không nhận feature hoàn chỉnh chỉ vì route có component.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE017/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE018 — Cấu hình bot, phòng thử và evals
**Giai đoạn:** F02 · **Ưu tiên:** 18 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE017. **Chủ nhiệm:** Codex.

**Yêu cầu:** F01, H02, H03.

**Route IDs:** R26, R27, R28, R51. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T040, T041, T042, T057 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/07_AI_AND_CHANNELS.md`
- `docs/27_RUNTIME_POLICY.md`
- `../BotSalesAI_Frontend/docs/KNOWN_GAPS.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/modules/bot/`
- `apps/web/src/mocks/`
- `apps/web/tests/`
- `tests/`

### Thực hiện tuần tự

#### FE018.S01 · 1/10 điểm · STALE

Map routeId/operationId/permissions/feature scenarios bên dưới với source hiện có; chọn public api/model/ui cần sửa và ghi gap.

**Bằng chứng:** test_run. Mọi action có operation/capability rõ, DTO dùng source chuẩn; không sửa module ngoài mục tiêu. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE018.S02 · 3/10 điểm · STALE

Hoàn thiện bot/team/tool-permission/budget/kill-switch/sandbox/eval UI; model capability từ API; câu trả lời/evals tổng hợp có nhãn.

**Bằng chứng:** test_run. Luồng happy path có payload/request và thay đổi state mock quan sát được; dữ liệu trả đúng schema và totals từ API. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE018.S03 · 2/10 điểm · STALE

Kiểm expired approval/limit exceeded/tool denied/kill switch/unknown/config conflict và requireHumanOrderConfirmation legacy gap.

**Bằng chứng:** test_run. Luồng âm giữ dữ liệu người dùng và hiện lý do phù hợp; không hành động vượt allowedActions hoặc báo thành công giả. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE018.S04 · 2/10 điểm · STALE

Viết/chạy component + network/contract regression cho acceptance của task; dùng seed/reset/clock để tái hiện ca lỗi.

**Bằng chứng:** test_run. Ca hợp lệ/không hợp lệ kiểm behavior thực, không chỉ snapshots; action gửi đúng operation/body/version và scope. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE018.S05 · 2/10 điểm · STALE

Chạy browser luồng task trên React demo với mock HTTP; ghi route/state/role/scenario test IDs, kết quả và log của diff.

**Bằng chứng:** test_run. Acceptance dưới đây có bằng chứng browser phù hợp; labels/keyboard/responsive áp dụng; không đòi backend thật. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE018.AC01 — Cấu hình theo capabilities/allowedActions, không branch tên provider SDK.
- FE018.AC02 — Kill switch/tool permissions không tự mở quyền bán hàng hoặc tiền.
- FE018.AC03 — Eval là synthetic scenario, không nhận chất lượng LLM thật.
- FE018.AC04 — Hằng legacy xung đột giữ gap, không dùng để bật auto-confirm vượt contract.
- FE018.AC05 — Mock HTTP có nhãn synthetic; API/permissions/token không bị bịa hoặc sửa ngầm.
- FE018.AC06 — Source/type/lint/boundaries và tests liên quan chạy thật, không nhận feature hoàn chỉnh chỉ vì route có component.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE018/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE019 — Kết nối và thông báo mô phỏng
**Giai đoạn:** F02 · **Ưu tiên:** 19 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE007, FE008. **Chủ nhiệm:** Codex.

**Yêu cầu:** A01, A02, A03, A04, A05, A06, A07, A08.

**Route IDs:** R29, R30, R39, R40. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T033, T034, T070, T071 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/21_NOTIFICATIONS.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/modules/integrations/`
- `apps/web/src/modules/notifications/`
- `apps/web/src/mocks/`
- `apps/web/tests/`
- `tests/`

### Thực hiện tuần tự

#### FE019.S01 · 1/10 điểm · STALE

Map routeId/operationId/permissions/feature scenarios bên dưới với source hiện có; chọn public api/model/ui cần sửa và ghi gap.

**Bằng chứng:** test_run. Mọi action có operation/capability rõ, DTO dùng source chuẩn; không sửa module ngoài mục tiêu. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE019.S02 · 3/10 điểm · STALE

Hoàn thiện integrations/credentials write-only/capability status, notification history/preferences/device screens và Push/Telegram pairing mock theo contract.

**Bằng chứng:** test_run. Luồng happy path có payload/request và thay đổi state mock quan sát được; dữ liệu trả đúng schema và totals từ API. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE019.S03 · 2/10 điểm · STALE

Kiểm consent denied/revoked subscription/unavailable browser/device/error reconnect/secret lifecycle; không gửi mạng provider thật hoặc nhận connected giả.

**Bằng chứng:** test_run. Luồng âm giữ dữ liệu người dùng và hiện lý do phù hợp; không hành động vượt allowedActions hoặc báo thành công giả. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE019.S04 · 2/10 điểm · STALE

Viết/chạy component + network/contract regression cho acceptance của task; dùng seed/reset/clock để tái hiện ca lỗi.

**Bằng chứng:** test_run. Ca hợp lệ/không hợp lệ kiểm behavior thực, không chỉ snapshots; action gửi đúng operation/body/version và scope. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE019.S05 · 2/10 điểm · STALE

Chạy browser luồng task trên React demo với mock HTTP; ghi route/state/role/scenario test IDs, kết quả và log của diff.

**Bằng chứng:** test_run. Acceptance dưới đây có bằng chứng browser phù hợp; labels/keyboard/responsive áp dụng; không đòi backend thật. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE019.AC01 — Secret fields giữ tạm trong form và clear; không secret trong bundle/log/storage.
- FE019.AC02 — Từ chối consent/thiếu capability không hiện connected hoặc thông báo thành công.
- FE019.AC03 — Push/Telegram/device events có nhãn synthetic; hardware/provider delivery ngoài UAT.
- FE019.AC04 — PWA manifest/icons có kiểm frontend phù hợp; không bắt quyền push thật để xong UI.
- FE019.AC05 — Mock HTTP có nhãn synthetic; API/permissions/token không bị bịa hoặc sửa ngầm.
- FE019.AC06 — Source/type/lint/boundaries và tests liên quan chạy thật, không nhận feature hoàn chỉnh chỉ vì route có component.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE019/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE020 — Operations, phê duyệt và điều phối
**Giai đoạn:** F02 · **Ưu tiên:** 20 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE014, FE015, FE018. **Chủ nhiệm:** Codex.

**Yêu cầu:** F02, F03, F04, F05, F06, F07, F08, H01, H04, H08.

**Route IDs:** R37, R38, R52. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T055, T056, T059, T060 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/25_OPERATIONS_AI.md`
- `docs/27_RUNTIME_POLICY.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/modules/operations/`
- `apps/web/src/mocks/`
- `apps/web/tests/`
- `tests/`

### Thực hiện tuần tự

#### FE020.S01 · 1/10 điểm · STALE

Map routeId/operationId/permissions/feature scenarios bên dưới với source hiện có; chọn public api/model/ui cần sửa và ghi gap.

**Bằng chứng:** test_run. Mọi action có operation/capability rõ, DTO dùng source chuẩn; không sửa module ngoài mục tiêu. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE020.S02 · 3/10 điểm · STALE

Hoàn thiện approval queue/tasks/briefing/team-policy/runtime readiness UI; các quyết định/bản tin mock có ID/version/source/timestamps.

**Bằng chứng:** test_run. Luồng happy path có payload/request và thay đổi state mock quan sát được; dữ liệu trả đúng schema và totals từ API. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE020.S03 · 2/10 điểm · STALE

Kiểm stale approval/role denied/partial data/kill switch/budget unavailable và command unknown; không tạo scheduler/worker nền trong frontend.

**Bằng chứng:** test_run. Luồng âm giữ dữ liệu người dùng và hiện lý do phù hợp; không hành động vượt allowedActions hoặc báo thành công giả. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE020.S04 · 2/10 điểm · STALE

Viết/chạy component + network/contract regression cho acceptance của task; dùng seed/reset/clock để tái hiện ca lỗi.

**Bằng chứng:** test_run. Ca hợp lệ/không hợp lệ kiểm behavior thực, không chỉ snapshots; action gửi đúng operation/body/version và scope. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE020.S05 · 2/10 điểm · STALE

Chạy browser luồng task trên React demo với mock HTTP; ghi route/state/role/scenario test IDs, kết quả và log của diff.

**Bằng chứng:** test_run. Acceptance dưới đây có bằng chứng browser phù hợp; labels/keyboard/responsive áp dụng; không đòi backend thật. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE020.AC01 — Approval sau đổi payload yêu cầu cấp lại theo API mock.
- FE020.AC02 — Briefing/task history có dữ liệu và capability rõ; thiếu API lịch riêng giữ gap.
- FE020.AC03 — Ready indicators phản ánh fixture simulated, không báo staging/backend đã sẵn sàng.
- FE020.AC04 — Mock HTTP có nhãn synthetic; API/permissions/token không bị bịa hoặc sửa ngầm.
- FE020.AC05 — Source/type/lint/boundaries và tests liên quan chạy thật, không nhận feature hoàn chỉnh chỉ vì route có component.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE020/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE021 — Dashboard, báo cáo và xuất dữ liệu
**Giai đoạn:** F02 · **Ưu tiên:** 21 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE015, FE020. **Chủ nhiệm:** Codex.

**Yêu cầu:** G07, G08.

**Route IDs:** R04, R31, R53. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T053, T058, T059, T064 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/24_FINANCE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/modules/dashboard/`
- `apps/web/src/modules/reports/`
- `apps/web/src/mocks/`
- `apps/web/tests/`
- `tests/`

### Thực hiện tuần tự

#### FE021.S01 · 1/10 điểm · STALE

Map routeId/operationId/permissions/feature scenarios bên dưới với source hiện có; chọn public api/model/ui cần sửa và ghi gap.

**Bằng chứng:** test_run. Mọi action có operation/capability rõ, DTO dùng source chuẩn; không sửa module ngoài mục tiêu. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE021.S02 · 3/10 điểm · STALE

Hoàn thiện dashboard/report/marketing filters/charts/data table/export UI; KPI và explanation từ fixture API định danh, timezone/money format nhất quán.

**Bằng chứng:** test_run. Luồng happy path có payload/request và thay đổi state mock quan sát được; dữ liệu trả đúng schema và totals từ API. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE021.S03 · 2/10 điểm · STALE

Kiểm empty/partial/redacted/stale/large pagination/export denied/error và missing cost; không KPI random hoặc suy toàn bộ từ một trang.

**Bằng chứng:** test_run. Luồng âm giữ dữ liệu người dùng và hiện lý do phù hợp; không hành động vượt allowedActions hoặc báo thành công giả. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE021.S04 · 2/10 điểm · STALE

Viết/chạy component + network/contract regression cho acceptance của task; dùng seed/reset/clock để tái hiện ca lỗi.

**Bằng chứng:** test_run. Ca hợp lệ/không hợp lệ kiểm behavior thực, không chỉ snapshots; action gửi đúng operation/body/version và scope. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE021.S05 · 2/10 điểm · STALE

Chạy browser luồng task trên React demo với mock HTTP; ghi route/state/role/scenario test IDs, kết quả và log của diff.

**Bằng chứng:** test_run. Acceptance dưới đây có bằng chứng browser phù hợp; labels/keyboard/responsive áp dụng; không đòi backend thật. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE021.AC01 — Chart kèm bảng dữ liệu; filters/date/timezone/pagination và các số thống nhất với mock API.
- FE021.AC02 — Missing cost hiển thị thiếu dữ liệu; giải thích AI không tự đổi ledger/report.
- FE021.AC03 — Export dữ liệu tổng hợp đúng loại/permission/filename safe; remote/raw HTML không bypass.
- FE021.AC04 — Mock HTTP có nhãn synthetic; API/permissions/token không bị bịa hoặc sửa ngầm.
- FE021.AC05 — Source/type/lint/boundaries và tests liên quan chạy thật, không nhận feature hoàn chỉnh chỉ vì route có component.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE021/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE022 — Luồng xuyên module qua app composition
**Giai đoạn:** F02 · **Ưu tiên:** 22 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE013, FE014, FE015, FE016, FE017, FE018, FE019, FE020, FE021. **Chủ nhiệm:** Codex.

**Yêu cầu:** A01, A02, A03, A04, A05, A06, A07, A08, B01, B02, B03, B04, B05, B06, B07, B08, C01, C02, C03, C04, C05, C06, C07, C08, D01, D02, D03, D04, D05, D06, D07, D08, E01, E02, E03, E04, E05, E06, E07, E08, F01, F02, F03, F04, F05, F06, F07, F08, G01, G02, G03, G04, G05, G06, G07, G08, H01, H02, H03, H04, H05, H06, H07, H08.

**Route IDs:** R01, R02, R03, R04, R05, R06, R07, R08, R09, R10, R11, R12, R13, R14, R15, R16, R17, R18, R19, R20, R21, R22, R23, R24, R25, R26, R27, R28, R29, R30, R31, R32, R33, R34, R35, R36, R37, R38, R39, R40, R41, R42, R43, R44, R45, R46, R47, R48, R49, R50, R51, R52, R53, R54. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T024, T030, T036, T048, T060, T066 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `contracts/feature-catalog.json`
- `docs/17_TRACEABILITY.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/app/`
- `apps/web/src/mocks/`
- `tests/vertical-slices/`
- `docs/route-implementation.json`

### Thực hiện tuần tự

#### FE022.S01 · 1/10 điểm · STALE

Map feature-catalog/routes vào các luồng catalog→stock→order→prep, procurement→approval→receipt, finance→reconcile và inbox→knowledge/bot.

**Bằng chứng:** test_run. Không thiếu feature UI; mỗi route/feature có test/case hoặc gap đã giải thích. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE022.S02 · 3/10 điểm · STALE

Ghép public entries qua app props/router/intents; bổ sung scenario quan hệ dữ liệu xuyên module trong mock service.

**Bằng chứng:** test_run. Module không import module khác; shared không chứa logic điều phối nghiệp vụ. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE022.S03 · 2/10 điểm · STALE

Kiểm dữ liệu sau mutation/refetch/SSE và source refs; giữ unknown/draft/permission state khi điều hướng giữa luồng.

**Bằng chứng:** test_run. Luồng mock có ID/history đúng, không chỉ toast/ảnh; late data và permission không rò. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE022.S04 · 2/10 điểm · STALE

Chạy E2E các luồng happy/unhappy, edit/replay/partial/forbidden/version/timeout theo scenario định danh.

**Bằng chứng:** test_run. Các bước/expected state hợp lệ được chứng minh bằng browser và requests thật tới MSW. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE022.S05 · 2/10 điểm · STALE

Sinh ma trận route/feature/scenario từ kết quả test; ghi scope/gaps và regressions.

**Bằng chứng:** test_run. 54 route và 64 feature UI được truy vết; khả năng backend thật không bị tick PASS. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE022.AC01 — Luồng xuyên module chạy với mock HTTP đủ quan hệ dữ liệu.
- FE022.AC02 — Public entry/boundaries/typecheck vẫn đạt.
- FE022.AC03 — Coverage có test/result thực, không checklist tick tay.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE022/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE023 — States, forms, i18n và khôi phục UI
**Giai đoạn:** F03 · **Ưu tiên:** 23 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE022. **Chủ nhiệm:** Codex.

**Yêu cầu:** A01, A02, A03, A04, A05, A06, A07, A08, B01, B02, B03, B04, B05, B06, B07, B08, C01, C02, C03, C04, C05, C06, C07, C08, D01, D02, D03, D04, D05, D06, D07, D08, E01, E02, E03, E04, E05, E06, E07, E08, F01, F02, F03, F04, F05, F06, F07, F08, G01, G02, G03, G04, G05, G06, G07, G08, H01, H02, H03, H04, H05, H06, H07, H08.

**Route IDs:** R01, R02, R03, R04, R05, R06, R07, R08, R09, R10, R11, R12, R13, R14, R15, R16, R17, R18, R19, R20, R21, R22, R23, R24, R25, R26, R27, R28, R29, R30, R31, R32, R33, R34, R35, R36, R37, R38, R39, R40, R41, R42, R43, R44, R45, R46, R47, R48, R49, R50, R51, R52, R53, R54. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T061, T065 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/04_SCREENS_AND_FLOWS.md`
- `docs/09_STATE_AND_DATA_ACCESS.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/modules/`
- `apps/web/src/app/i18n.ts`
- `apps/web/src/shared/ui/`
- `apps/web/src/shared/model/`
- `tests/states/`

### Thực hiện tuần tự

#### FE023.S01 · 1/10 điểm · STALE

Lập route×states×roles theo state có ý nghĩa, inventory text/i18n keys và forms cần dirty-draft protection.

**Bằng chứng:** test_run. Không ép trạng thái vô nghĩa; thiếu case/translation được định danh. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE023.S02 · 3/10 điểm · STALE

Hoàn thiện loading/empty/partial/error/forbidden/not-found/offline/stale/submitting/conflict/unknown/capability-unavailable.

**Bằng chứng:** test_run. Không spinner vô hạn, error thành empty success hoặc action rỗng. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE023.S03 · 2/10 điểm · STALE

Hoàn thiện 422 field mapping/412 conflict/428 missing version, URL filters, lookup phân trang và navigation/dialog/shop dirty guards.

**Bằng chứng:** test_run. Giữ input, focus error và lựa chọn xử lý; không chỉ lookup 100 dòng cho mọi dữ liệu. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE023.S04 · 2/10 điểm · STALE

Chạy browser/component tests state/focus/refetch/dirty forms với fixtures delayed/error và i18n không missing keys.

**Bằng chứng:** test_run. Route/shop/dialog transitions không mất input âm thầm; text/labels nhất quán tiếng Việt. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE023.S05 · 2/10 điểm · STALE

Sinh coverage từ test results, review exception/gap và kiểm public API component phù hợp.

**Bằng chứng:** test_run. Không text chưa dịch được coi đạt i18n hoàn chỉnh; test chưa chạy vẫn NOT_RUN. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE023.AC01 — Trạng thái phù hợp/field errors/dirty drafts có kiểm thực.
- FE023.AC02 — i18n keys và nhãn tiếng Việt thống nhất; ngôn ngữ bổ sung chỉ khi được giao.
- FE023.AC03 — Coverage theo route/role/state lấy từ test results.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE023/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE024 — An toàn và phân quyền frontend
**Giai đoạn:** F03 · **Ưu tiên:** 24 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE023. **Chủ nhiệm:** Codex.

**Yêu cầu:** A01, A02, A03, A04, A05, A06, A07, A08, B01, B02, B03, B04, B05, B06, B07, B08, C01, C02, C03, C04, C05, C06, C07, C08, D01, D02, D03, D04, D05, D06, D07, D08, E01, E02, E03, E04, E05, E06, E07, E08, F01, F02, F03, F04, F05, F06, F07, F08, G01, G02, G03, G04, G05, G06, G07, G08, H01, H02, H03, H04, H05, H06, H07, H08.

**Route IDs:** R01, R02, R03, R04, R05, R06, R07, R08, R09, R10, R11, R12, R13, R14, R15, R16, R17, R18, R19, R20, R21, R22, R23, R24, R25, R26, R27, R28, R29, R30, R31, R32, R33, R34, R35, R36, R37, R38, R39, R40, R41, R42, R43, R44, R45, R46, R47, R48, R49, R50, R51, R52, R53, R54. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T073 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/shared/`
- `apps/web/src/app/`
- `apps/web/src/modules/`
- `tests/security/`
- `docs/KNOWN_GAPS.md`

### Thực hiện tuần tự

#### FE024.S01 · 1/10 điểm · STALE

Đọc trust boundaries UI/transport/upload/export/PII và permission catalog; chọn threat cases có căn cứ, không nhận backend auth proof.

**Bằng chứng:** test_run. Scope XSS/secret/tenant cache/client actions rõ; server enforcement ngoài phạm vi. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source apps/web/src/app/CommandRecovery.tsx

#### FE024.S02 · 3/10 điểm · STALE

Sửa raw HTML/URL/file/secret lifecycle/cached sensitive data trong phần có lỗi thật; giữ validation và least privilege UI.

**Bằng chứng:** test_run. Không SDK/key/token/PII trong bundle/URL/localStorage/log; untrusted content không thực thi. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source apps/web/src/app/CommandRecovery.tsx

#### FE024.S03 · 2/10 điểm · STALE

Kiểm stale response/revoke/shop switch/hidden fields và mutation idempotency/unknown recovery qua mock HTTP.

**Bằng chứng:** test_run. Data/action UI không vượt fixture allowedActions; unknown không sinh duplicate intent. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source apps/web/src/app/CommandRecovery.tsx

#### FE024.S04 · 2/10 điểm · STALE

Chạy negative browser/transport tests với XSS payload, unsafe URL/export, unauthorized/redacted/late-response scenarios.

**Bằng chứng:** test_run. Payload bị xử lý an toàn; field visibility/permissions/scope cleanup hoạt động trên browser thật. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source apps/web/src/app/CommandRecovery.tsx

#### FE024.S05 · 2/10 điểm · STALE

Review dependency advisory trên lockfile và diff/bundle; ghi phát hiện/lý do hoặc remediation có bằng chứng.

**Bằng chứng:** test_run. Không tự nâng cả repo hoặc hạ rule; chưa kiểm advisory ghi CHƯA XÁC MINH. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source apps/web/src/app/CommandRecovery.tsx

### Kiểm tra nghiệm thu của đầu việc
- FE024.AC01 — Frontend security negative cases đạt trên mock/browser.
- FE024.AC02 — Không secret/mock fallback hoặc cross-shop sensitive data leak.
- FE024.AC03 — Dependency findings được xử lý/ghi disposition, không nhận server RBAC đã bảo vệ.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE024/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE025 — Responsive, accessibility và hiệu năng frontend
**Giai đoạn:** F03 · **Ưu tiên:** 25 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE023, FE024. **Chủ nhiệm:** Codex.

**Yêu cầu:** A01, A02, A03, A04, A05, A06, A07, A08, B01, B02, B03, B04, B05, B06, B07, B08, C01, C02, C03, C04, C05, C06, C07, C08, D01, D02, D03, D04, D05, D06, D07, D08, E01, E02, E03, E04, E05, E06, E07, E08, F01, F02, F03, F04, F05, F06, F07, F08, G01, G02, G03, G04, G05, G06, G07, G08, H01, H02, H03, H04, H05, H06, H07, H08.

**Route IDs:** R01, R02, R03, R04, R05, R06, R07, R08, R09, R10, R11, R12, R13, R14, R15, R16, R17, R18, R19, R20, R21, R22, R23, R24, R25, R26, R27, R28, R29, R30, R31, R32, R33, R34, R35, R36, R37, R38, R39, R40, R41, R42, R43, R44, R45, R46, R47, R48, R49, R50, R51, R52, R53, R54. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T061, T074, T078 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/10_TESTING_ACCEPTANCE.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/shared/ui/`
- `apps/web/src/modules/`
- `apps/web/src/app/`
- `tests/accessibility/`
- `tests/performance/`
- `playwright.config.ts`
- `docs/KNOWN_GAPS.md`

### Thực hiện tuần tự

#### FE025.S01 · 1/10 điểm · STALE

Chọn viewport/browser matrix theo docs/03, dataset lớn có ID và baseline bundle/render; ghi budget có nguồn hoặc đề xuất cần review.

**Bằng chứng:** test_run. Không bịa RPS/SLO/hardware; tiêu chí performance frontend được xác định trước khi kết luận. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source apps/web/src/app/CommandRecovery.tsx

#### FE025.S02 · 3/10 điểm · STALE

Sửa overflow/touch/keyboard/focus/zoom/reduced-motion/forced-colors và semantics trong source bị ảnh hưởng.

**Bằng chứng:** test_run. Màn 320px/desktop theo docs dùng được; responsive không làm mất action/data bắt buộc. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source apps/web/src/app/CommandRecovery.tsx

#### FE025.S03 · 2/10 điểm · STALE

Đo route loading/chunk/bundle/table-large-data; tối ưu theo bottleneck thật và Complexity Gate.

**Bằng chứng:** test_run. Không cache/global state/virtualization mới nếu chưa chứng minh nhu cầu; ngưỡng đã chọn không bị hạ để pass. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source apps/web/src/app/CommandRecovery.tsx

#### FE025.S04 · 2/10 điểm · STALE

Chạy Playwright/axe và kiểm thủ công keyboard/focus/screenreader phù hợp, ghi browser/platform thật.

**Bằng chứng:** test_run. Critical violations trong scope được xử lý; mock data không thay kiểm hành vi browser. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source apps/web/src/app/CommandRecovery.tsx

#### FE025.S05 · 2/10 điểm · STALE

Kiểm lại artifact sau sửa và bàn giao số đo/budget/scope supported browsers cùng phần chưa kiểm.

**Bằng chứng:** test_run. Không gọi mọi thiết bị/browser PASS từ Chromium desktop; ngoại lệ được giải thích. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source apps/web/src/app/CommandRecovery.tsx

### Kiểm tra nghiệm thu của đầu việc
- FE025.AC01 — UI theo viewport/docs và keyboard/focus/a11y có evidence.
- FE025.AC02 — Bundle/performance đo trên dataset/môi trường xác định.
- FE025.AC03 — Browser support và phần chưa kiểm ghi trung thực.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE025/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE026 — Artifact demo/production và kiểm tái lập
**Giai đoạn:** F03 · **Ưu tiên:** 26 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE025. **Chủ nhiệm:** Codex.

**Yêu cầu:** H07, H08.

**Route IDs:** Task nền tảng/xuyên ứng dụng. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T077, T078 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/10_TESTING_ACCEPTANCE.md`
- `../BotSalesAI_Frontend/README.md`

### Vùng được sửa / đầu ra bắt buộc
- `package.json`
- `apps/web/vite.config.ts`
- `playwright.config.ts`
- `tests/artifacts/`
- `.github/workflows/`
- `README.md`
- `scripts/`

### Thực hiện tuần tự

#### FE026.S01 · 1/10 điểm · STALE

Map build/build:demo/preview/dev modes và biến môi trường; phân biệt mock artifact với transport production.

**Bằng chứng:** test_run. Artifact target/cấu hình/cwd xác định; không deployment hoặc dữ liệu thật. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Missing evidence/source file: botsales-kit/contracts/openapi.json

#### FE026.S02 · 3/10 điểm · STALE

Hoàn thiện build isolation để production không chứa MSW/seed/mockServiceWorker/fallback; demo có nhãn mô phỏng và fixtures đúng.

**Bằng chứng:** test_run. Build thiếu API thật vẫn hoàn thành artifact frontend; runtime unavailable rõ, không tự fallback. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Missing evidence/source file: botsales-kit/contracts/openapi.json

#### FE026.S03 · 2/10 điểm · STALE

Chạy clean install/type/lint/unit/contract/build và demo build trên target/lock; kiểm bundle và network smoke.

**Bằng chứng:** test_run. Production không request MSW hoặc nhúng mocks/secret; demo chạy React thật với MSW. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Missing evidence/source file: botsales-kit/contracts/openapi.json

#### FE026.S04 · 2/10 điểm · STALE

Nối gate frontend vào CI phù hợp repo và chạy E2E trên artifact preview, không chỉ dev server.

**Bằng chứng:** test_run. Config CI phân biệt với run CI; browser test đúng artifact/hash được bàn giao. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Missing evidence/source file: botsales-kit/contracts/openapi.json

#### FE026.S05 · 2/10 điểm · STALE

Ghi manifest/checksums/cách chạy/cấu hình API/rollback artifact frontend và báo cáo scope.

**Bằng chứng:** test_run. Tái lập bản build theo lock; không nhận hosting/staging deployment đã xảy ra. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Missing evidence/source file: botsales-kit/contracts/openapi.json

### Kiểm tra nghiệm thu của đầu việc
- FE026.AC01 — Cả dist và dist-demo build đúng chế độ; mock isolation được kiểm thực.
- FE026.AC02 — UAT/browser test chạy được trên artifact demo preview.
- FE026.AC03 — Có log clean gate hoặc CI run thật; cấu hình CI không được báo đã chạy.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE026/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE027 — Nghiệm thu frontend với mock data
**Giai đoạn:** F04 · **Ưu tiên:** 27 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE026. **Chủ nhiệm:** Codex.

**Yêu cầu:** A01, A02, A03, A04, A05, A06, A07, A08, B01, B02, B03, B04, B05, B06, B07, B08, C01, C02, C03, C04, C05, C06, C07, C08, D01, D02, D03, D04, D05, D06, D07, D08, E01, E02, E03, E04, E05, E06, E07, E08, F01, F02, F03, F04, F05, F06, F07, F08, G01, G02, G03, G04, G05, G06, G07, G08, H01, H02, H03, H04, H05, H06, H07, H08.

**Route IDs:** R01, R02, R03, R04, R05, R06, R07, R08, R09, R10, R11, R12, R13, R14, R15, R16, R17, R18, R19, R20, R21, R22, R23, R24, R25, R26, R27, R28, R29, R30, R31, R32, R33, R34, R35, R36, R37, R38, R39, R40, R41, R42, R43, R44, R45, R46, R47, R48, R49, R50, R51, R52, R53, R54. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T066, T080 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/10_TESTING_ACCEPTANCE.md`
- `contracts/feature-catalog.json`
- `../BotSalesAI_Frontend/docs/KNOWN_GAPS.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `tests/uat/`
- `docs/route-implementation.json`
- `docs/KNOWN_GAPS.md`
- `evidence/REPORT.md`
- `execution/frontend-evidence/FE027/`

### Thực hiện tuần tự

#### FE027.S01 · 1/10 điểm · STALE

Lập UAT matrix route/feature/state/role từ nguồn canonical và coverage FE022/23, xác định artifact demo/revision/hash.

**Bằng chứng:** test_run. Mỗi yêu cầu UI có case/test/evidence hoặc gap rõ; không thiếu các luồng nhiều dòng/partial. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE027.S02 · 3/10 điểm · STALE

Chạy 54 routes và các luồng chính với dataset đủ, hai shops/roles và mock HTTP lỗi/quyền/version/unknown.

**Bằng chứng:** test_run. Browser app có hành động và dữ liệu thay đổi đúng, không acceptance từ JSON/ảnh prototype. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE027.S03 · 2/10 điểm · STALE

Thu screenshot/trace/request evidence từ React artifact thật và review scenarios/gaps/giới hạn integrations.

**Bằng chứng:** test_run. Ảnh/log không lộ secret/PII; tất cả provider/data có nhãn simulated, không đòi tài khoản thật. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE027.S04 · 2/10 điểm · STALE

Sửa lỗi UAT trong scope, viết regression phù hợp và chạy lại gate ảnh hưởng trên cùng artifact mới.

**Bằng chứng:** test_run. Acceptance tương ứng đạt trên đúng diff; failed hoặc mandatory gap chưa giải quyết vẫn chặn phần đó. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE027.S05 · 2/10 điểm · STALE

Bàn giao kết quả UAT cho người dùng; ghi người chấp thuận khi có thật, không tự giả owner approval.

**Bằng chứng:** test_run. Báo cáo UAT phân biệt executed tests với owner acceptance pending; frontend mock đủ là phạm vi đã duyệt. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE027.AC01 — 54 routes/feature UI và luồng mock UAT có evidence đúng artifact.
- FE027.AC02 — Không còn mandatory UI gap chưa xử lý/ngoại lệ chưa được chấp nhận.
- FE027.AC03 — User acceptance chỉ ghi khi có thật; không dùng mock UAT để tăng ledger toàn hệ thống.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE027/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## FE028 — Cổng chất lượng frontend và bàn giao mở rộng
**Giai đoạn:** F04 · **Ưu tiên:** 28 · **Trạng thái:** STALE · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** FE027. **Chủ nhiệm:** Codex.

**Yêu cầu:** A01, A02, A03, A04, A05, A06, A07, A08, B01, B02, B03, B04, B05, B06, B07, B08, C01, C02, C03, C04, C05, C06, C07, C08, D01, D02, D03, D04, D05, D06, D07, D08, E01, E02, E03, E04, E05, E06, E07, E08, F01, F02, F03, F04, F05, F06, F07, F08, G01, G02, G03, G04, G05, G06, G07, G08, H01, H02, H03, H04, H05, H06, H07, H08.

**Route IDs:** R01, R02, R03, R04, R05, R06, R07, R08, R09, R10, R11, R12, R13, R14, R15, R16, R17, R18, R19, R20, R21, R22, R23, R24, R25, R26, R27, R28, R29, R30, R31, R32, R33, R34, R35, R36, R37, R38, R39, R40, R41, R42, R43, R44, R45, R46, R47, R48, R49, R50, R51, R52, R53, R54. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.

**Mức kiểm:** V0–V3; V4 theo rủi ro frontend; API synthetic. Task T tham chiếu T081, T084 chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.

### Đọc trước khi sửa
- `../BotSalesAI_Frontend/AGENTS.md`
- `../BotSalesAI_Frontend/AI_RULES.md`
- `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md`
- `../BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md`
- `docs/02_ARCHITECTURE.md`
- `docs/06_API_AND_REALTIME.md`
- `docs/18_CODING_STANDARDS.md`
- `../BotSalesAI_Frontend/evidence/REPORT.md`
- `docs/13_EXTENSION_AND_MIGRATION.md`
- `contracts/route-manifest.json`
- `contracts/openapi.json`
- `contracts/permission-catalog.json`

### Vùng được sửa / đầu ra bắt buộc
- `README.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/CONTINUE_FRONTEND.md`
- `docs/KNOWN_GAPS.md`
- `evidence/REPORT.md`
- `execution/SESSION_HANDOFF.md`
- `execution/frontend-evidence/FE028/`

### Thực hiện tuần tự

#### FE028.S01 · 1/10 điểm · STALE

Đối chiếu FE-G01..09 và Definition of Done với log/artifact/source diff thực; ghi ĐẠT/CHƯA ĐẠT/CHƯA XÁC MINH/N/A có lý do.

**Bằng chứng:** artifact_review. Tất cả mandatory frontend gates có evidence; missing không tự chuyển N/A. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE028.S02 · 3/10 điểm · STALE

Review kiến trúc app/module/shared/transport/mock/public entry và cách thêm module/operation; ghi review thực.

**Bằng chứng:** artifact_review. Không cycle/duplicate state/provider hoặc abstraction vô căn cứ; tự review không giả peer review. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE028.S03 · 2/10 điểm · STALE

Đồng bộ tài liệu cách run/build/reset fixture/thay base API, gaps và giới hạn backend integration.

**Bằng chứng:** artifact_review. Người tiếp quản tái lập được; tương lai nối API qua transport mà không import mocks vào UI. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE028.S04 · 2/10 điểm · STALE

Áp dụng Production Claim Gate 19.6: artifact/revision/environment/criteria/evidence/exceptions/quyền, đề nghị nghiệm thu đúng frontend mock scope.

**Bằng chứng:** artifact_review. Không tự chứng nhận hệ thống production hoặc tự nhận owner acceptance; thiếu gate thì kết luận chưa đủ. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

#### FE028.S05 · 2/10 điểm · STALE

Bàn giao source/diff/artifact/checksums/test summary/risks/next và cập nhật ledger frontend chỉ bằng evidence.

**Bằng chứng:** artifact_review. Progress FE không tự tăng từ tài liệu; full-product ledger giữ nguyên; không tự push/merge/deploy. Ghi command/cwd/exit code, expected/observed, log/hash và source snapshot thực. Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; không dùng kết quả prototype hoặc backend chưa chạy.

**Cần kiểm lại:** Changed source AGENTS.md

### Kiểm tra nghiệm thu của đầu việc
- FE028.AC01 — Đủ bằng chứng về frontend quality/architecture cho scope mock đã nêu.
- FE028.AC02 — Handoff mở rộng theo module/contract/transport thống nhất, không speculate framework.
- FE028.AC03 — Claim và user acceptance đúng quyền/phạm vi, backend/staging không được chứng nhận.

### Điều kiện dừng đúng phạm vi
- Chặn phần thiếu contract hoặc quyết định nghiệp vụ bắt buộc; ghi gap cụ thể, không tự tạo endpoint/quyền.
- Thiếu toolchain/test frontend hoặc evidence đúng diff: CHƯA XÁC MINH; tiếp tục task độc lập đủ dependency.
- Backend/provider thật nằm ngoài phạm vi; không đòi credentials thật để nghiệm thu mock frontend, không đánh dấu tích hợp thật PASS.

**Bàn giao:** `execution/frontend-evidence/FE028/handoff.md`. Lệnh app tại root frontend, từ package.json và frontend-command-map.json; chỉ đăng ký VERIFIED_AVAILABLE sau khi chạy thành công có log. Ghi evidence và snapshot của source/test/fixture/config liên quan. Không checkpoint ledger toàn sản phẩm.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

