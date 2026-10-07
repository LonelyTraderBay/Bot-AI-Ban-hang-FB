# KẾ HOẠCH TRIỂN KHAI FRONTEND — BOTSALES AI

**Mục tiêu đã được người dùng xác nhận ngày 30/09/2026:** phát triển và nghiệm thu frontend React/TypeScript bằng dữ liệu mock tổng hợp. Frontend phải có kiến trúc thống nhất, đủ bằng chứng về chất lượng và khả năng bảo trì để đề nghị nghiệm thu **Production-Ready / Enterprise-Grade Frontend Architecture trong phạm vi frontend với mock API**. Các nhãn này là mục tiêu kiểm chứng, chưa phải kết quả hiện tại.

Nguồn task hiện hành: [frontend-plan.json](execution/frontend-plan.json); tiến độ: [frontend-progress.json](execution/frontend-progress.json); hướng dẫn sinh: [FRONTEND_PLAN_GUIDE.md](execution/FRONTEND_PLAN_GUIDE.md). File này và phiếu `execution/frontend-tasks/FE*.md` được sinh bằng `node scripts/progress.mjs report` tại `botsales-kit`. Đường dẫn trong phần hướng dẫn này tính từ kit; đường dẫn code trên phiếu tính từ `BotSalesAI_Frontend`. Không sửa tay đầu ra sinh.

## 1. Phạm vi và điểm bắt đầu

- Phát triển source hiện có trong `apps/web`, test frontend, mock API, generator và cấu hình frontend liên quan. Không port `prototype/` HTML hoặc dựng lại framework.
- Các gói contracts/design-tokens chỉ là đầu ra dùng chung; sửa generator khi có lỗi được xác minh, không sửa tay `packages/*/src/generated*`. API/route/quyền/token canonical giữ nguyên trừ một nhiệm vụ đổi contract được giao rõ ràng.
- Nghiệm thu luồng UI qua MSW trong chế độ demo/test: điều hướng, biểu mẫu, dữ liệu, hành động, trạng thái lỗi, quyền hiển thị, đổi shop, xử lý xung đột và kết quả chưa rõ. Chạy React app thật và browser test thật; mock JSON riêng hoặc ảnh prototype không đủ.
- Backend, database, worker, OIDC/Meta/LLM/Push/Telegram/carrier/supplier thật, tải backend, migration, restore, staging toàn hệ thống và production deployment nằm ngoài phạm vi. Không yêu cầu tài khoản dịch vụ thật để hoàn tất task frontend. Các kiểm tra backend không được ghi PASS từ simulator.
- Bản nghiệm thu `dist-demo` có mock API và nhãn dữ liệu mô phỏng. Bản `dist` phải build được, có giao tiếp HTTP theo contract và không chứa MSW/seed/nhánh fallback mock. Chưa có backend thật không chặn nghiệm thu frontend bằng mock; khả năng vận hành với API thật chưa được xác minh.
- `execution/plan.json`, `progress.json`, `tasks/T*.md` và `PROGRESS.*` giữ vai trò kế hoạch toàn sản phẩm ngoài scope hiện tại. Không nhận T001–T084 hoặc cộng điểm ledger đó trong nhiệm vụ frontend. 100% frontend không phải 100% hệ thống.

Bắt đầu FE001 để tiếp nhận source; tiếp tục FE002 sửa môi trường/dependencies và lỗi nền bằng bằng chứng. Root [CONTINUE_FRONTEND.md](../BotSalesAI_Frontend/docs/CONTINUE_FRONTEND.md), [KNOWN_GAPS.md](../BotSalesAI_Frontend/docs/KNOWN_GAPS.md), [route-implementation.json](../BotSalesAI_Frontend/docs/route-implementation.json) và [REPORT.md](../BotSalesAI_Frontend/evidence/REPORT.md) mô tả hiện trạng, không được suy source có component thành tính năng đã nghiệm thu.

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
