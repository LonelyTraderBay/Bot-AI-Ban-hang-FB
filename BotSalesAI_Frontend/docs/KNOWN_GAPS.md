# Giới hạn còn lại sau UI027 Frontend update — 05/10/2026

**Current navigation:** trạng thái UI ở [plan §16.6](FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status), evidence tại [REPORT](../evidence/REPORT.md). Nội dung bên dưới là **HISTORICAL_SNAPSHOT** tại ngày ghi trong heading; không thay tracker/status hiện hành.


Phạm vi/thời điểm nghiệm thu theo [FRONTEND_SCOPE](FRONTEND_SCOPE.md); task chi tiết và audit toàn tài liệu ở [kế hoạch](FRONTEND_UI_IMPROVEMENT_PLAN.md). AI tự thực hiện đến hồ sơ bàn giao; không chờ owner/manual/hosted CI giữa chừng.

## HISTORICAL_SNAPSHOT — giới hạn tại 05/10/2026

Backlog UI đạt **27/27 item, 135/135 checkpoint** sau UI027. FE tracker có 28 task/140 checkpoint; trạng thái hiện hành lấy từ `node ../botsales-kit/scripts/progress.mjs status` và không được thay bằng snapshot trong tài liệu. Bằng chứng UI027: [verify/build](../evidence/frontend-ui-improvements/UI027/S04-verify-20261005.log), [browser suite](../evidence/frontend-ui-improvements/UI027/S04-e2e-full-20261005.log) 388/388, [performance comparison](../evidence/frontend-ui-improvements/UI027/S05-paired-performance-20261005.md). Kết quả local là React + synthetic MSW, không phải hosted CI, Backend hoặc owner acceptance.

| Mục | Sự thật quan sát được | Xử lý trong phạm vi AI |
|---|---|---|
| FE-G05 / UI012 | Keyboard 18/18, contrast 2,158/2,158, browser zoom 400% trên 17/17 route, target geometry 54 route và text-flow evidence có. Narrator speech/transcript và broad human conformance chưa chạy | Giữ `PARTIAL/NOT_RUN`; không gọi full WCAG conformance PASS |
| FE-G08 / CI | Production và demo isolation/build/hash-reproduction đạt; built demo preview test/trace chạy hai engine | Local clean equivalent đủ gate; hosted CI `NOT_RUN`, không yêu cầu push/credentials giữa chừng |
| FE-G09 / nghiệm thu | Technical UAT 54 route, 64 feature, 65 interaction rows và 22 journey đã có; handoff hoàn tất | Chỉ chờ người dùng nghiệm thu cuối; không ghi thay quyết định |
| Tracker FE | 28 task/140 checkpoint; current `VERIFIED/STALE/BLOCKED/next` values are the canonical CLI output | Preserve current-source truth; revalidate stale evidence by dependency, do not edit ledger manually |
| Performance | UI027 reduced largest production chunk from 738.39 to 328.33 kB raw; no chunk exceeds Vite's 500 kB warning threshold | Paired local synthetic profile is directional only; device/CDN/user-field performance remains unmeasured |
| Dependency scripts | `npm audit` 0 vulnerabilities; clean install/build/test đạt; npm vẫn cảnh báo esbuild/MSW chưa có allowScripts approval | Giữ warning; chỉ thay allowlist sau khi review lý do và hành vi script cụ thể |
| UI021 scanner | Strict scanner exit 1/13; source crosswalk cho 13 semantics và accepted-review exception được giữ | Không gọi scanner xanh và không suppression để ép pass |
| Live integration | Backend/provider/server auth/persistence/staging/production chưa xác minh | Ngoài scope folder Frontend; không đòi credentials hoặc bịa kết quả |

Tại snapshot 05/10/2026: UI backlog 27/27 item, 135/135 checkpoint. UI020 support matrix desktop đã được duyệt; Android soft-keyboard probe là AVD, không phải handset. Actual zoom S42 đo 400% trên 17 route; S46 ghi rõ bảng cần scroll ngang ở viewport hẹp. Các giới hạn này mô tả phạm vi bằng chứng, không phải task chờ Backend.

FE017 mock dùng knowledge.publish + lifecycle theo quyết định đã có; không thêm Knowledge.allowedActions. Missing live credentials không chặn frontend mock. Readiness rubric còn **7/9 gate đạt**; đây không phải % code/architecture. Các snapshot dưới đây giữ để truy vết, không giao việc hoặc thay trạng thái hiện hành.

---

## Snapshot trước lần làm mới evidence — 02/10/2026 (đã supersede bởi trạng thái hiện hành phía trên)

Windows Node 24.19.0/npm 11.17.0: `npm run verify` PASS — generator 11 outputs/283 schemas/210 operations/54 routes; source 62 files/227 operation refs/54 routes; boundaries 410 imports, negative fixtures 8/8; ESLint/TypeScript; domain/MSW 88/88; Vitest 71/71; production build. Sau đó `npm run test:e2e` PASS 147/147 Chromium trên React demo build, gồm production mock isolation, 1.004 khách phân trang, 54 route success, axe/keyboard, 357 quyền đọc route-role checks, FE009–FE021, state tests và bốn luồng xuyên module. Log đạt cuối: [`verify-inbox-layout-explicit-shell-current-20261002.log`](../../botsales-kit/execution/frontend-evidence/FE026/verify-inbox-layout-explicit-shell-current-20261002.log) và [`e2e-inbox-state-accessibility-current-20261002.log`](../../botsales-kit/execution/frontend-evidence/FE027/e2e-inbox-state-accessibility-current-20261002.log).

Ma trận `docs/route-implementation.json` ghi 54 route, 64 feature ID và 65/65 feature-route interactions có browser test cụ thể trong log mới. Mỗi entry giữ giới hạn ở trường `gap`; bằng chứng xác nhận UI/mock theo contract, không xác nhận server/provider thật. Bốn luồng xuyên module qua catalog→stock→order, procurement→receipt, finance→reconciliation và inbox→knowledge/bot cùng có test browser trong lượt 147/147.

Ma trận `docs/route-state-role-matrix.json` sinh từ log hiện hành có 54 route × 7 role và 432 ô route-state: 163 ô có browser evidence riêng theo route, 204 ô có shared-state test, 65 ô không áp dụng theo contract; không còn ô `NOT_TESTED`. Browser kiểm quyền đọc trên 51 route cửa hàng × 7 role đạt 357/357. Success được kiểm trên 54/54 route; empty states trên 9 route (8 bảng và danh sách notification dạng card); error composition trên 50 route có read API riêng. R33 được đánh dấu `NOT_APPLICABLE` vì dùng snapshot shop đã nạp và cache bởi Shell. Phủ tự động route/state/role của FE-G04 hiện đủ trong phạm vi frontend mock; backend authorization vẫn ngoài kết luận.

Reflow 320 CSS px đạt 54/54 route, không tràn ngang hoặc page error; đây là proxy nội dung cho zoom 400%, không thay thao tác zoom thật. Whole-page axe WCAG 2.1 A/AA và skip-link keyboard audit qua 54 route không có violation; axe color-contrast vẫn incomplete. Full screen-reader, browser zoom thật, GitHub CI, staging và owner UAT chưa được xác nhận. `npm audit` có bằng chứng 0 lỗ hổng trên 478 dependency; mock JSON Schema 356/356. Production build phát advisory chunk >500 kB raw (730.75 kB raw/184.41 KiB gzip); metric demo gần nhất được lưu là 446,909 gzip bytes cho initial route và 185,403 gzip bytes cho chunk lớn nhất (`../botsales-kit/execution/frontend-evidence/FE025/demo-preview-metrics.json`); chưa đo lại metric sau lượt build hiện tại.

FE017 được mở theo yêu cầu scope mới nhất: demo publish dùng quyền `knowledge.publish` và lifecycle state làm substitute UI. Canonical OpenAPI vẫn không có `Knowledge.allowedActions`; không thêm field vào OpenAPI/DTO/generated code. Dòng status 0/140 bên dưới là snapshot lịch sử từ thời điểm fingerprint cũ hết hiệu lực; trạng thái hiện hành nằm ở bảng trên và do `node ../botsales-kit/scripts/progress.mjs status` tính từ evidence hiện tại. Không sửa ledger toàn sản phẩm 84 task.

Lượt sửa UI mới bổ sung lỗi danh mục có retry ở R10; lịch sử tác vụ gần đây ở R13, có cập nhật cache sau preview/commit import; trạng thái tải/lỗi/retry cấu hình bot ở R27; lựa chọn địa chỉ/tài khoản synthetic có nhãn rõ; persistent empty-state mode; danh sách notification thông báo rỗng đúng semantics; và cột bối cảnh Inbox cuộn độc lập để composer luôn trong khung. Regression browser hiện đạt trong E2E 147/147.

Các giới hạn contract bên dưới mô tả chỗ UI chỉ preview hoặc cần bổ sung contract trước tích hợp API thật; chúng không chặn các tương tác UI mock đã có. Lưu ý thêm: role authorization phía server, provider delivery, persistence sau reload và hành vi đa thiết bị không được chứng minh bởi MSW.

## Chặn kiểm chứng tại môi trường bàn giao ngày29/09/2026

1. Không truy cập npm registry; chưa cài React/MUI/Vite/Query/RHF/MSW và các thư viện test. Không có package-lock thật. Node môi trường22/TS5.8 khác target24/TS5.9.2.
2. Full React typecheck, ESLint, build, kiểm thử component/browser/accessibility/performance chưa đạt bằng chứng. Có thể tồn tại lỗi mà parser và mock tests không phát hiện.
3. Không có ảnh chụp React app mới. Ảnh trong ../botsales-kit/prototype chỉ là tài liệu tham khảo cũ, không bằng chứng của repo này.

## Đặc tả/hợp đồng cần giải quyết khi nối backend

- `FileUpload.purpose` hiện chỉ khai báo `product_image`, `product_import`, `knowledge_source`, chưa có mục đích cho sao kê ngân hàng/COD. MSW demo hỗ trợ purpose tổng hợp `bank_statement`/`cod_statement` và kiểm `finance.reconcile`; màn nhập đối soát bị khóa ngoài demo cho tới khi chủ hợp đồng bổ sung và duyệt mục đích tương ứng. Không thêm các giá trị demo này vào OpenAPI/generated DTO.
- Quote đặt hàng cần addressId nhưng hợp đồng hiện chưa có đầy đủ CRUD địa chỉ giao hàng. Demo có danh sách địa chỉ synthetic; live mode vẫn dùng ID theo contract. Không tự bịa endpoint hoặc tuyên bố địa chỉ được lưu ở backend.
- Tạo bút toán cần accountId; chưa có API danh mục hệ thống tài khoản tương ứng. Demo có lựa chọn tài khoản synthetic; live mode vẫn dùng ID theo contract và không tự đoán hệ thống tài khoản pháp nhân.
- Bản tin trưởng nhóm có danh sách/lịch sử nhưng chưa có đầy đủ API chỉnh lịch riêng; UI không bật lịch nền giả.
- Chưa có contract tạo/in nhãn vận đơn cụ thể hoặc capability của hãng được chọn; UI vận chuyển không tự nhận đã mua/in nhãn thật.
- Legacy BotConfigWritePatch còn hằng requireHumanOrderConfirmation=true, trong khi chính sách tự chốt v2 tách riêng. Giữ nguyên hợp đồng, không dùng cờ đó để bật tự chốt vượt quyền.
- Giao thức step-up cũ dùng password không được đồng nhất ngầm với OIDC. Tác vụ privacy phá hủy dữ liệu cần backend xác nhận/ADR trước; UI không có đường tắt mật khẩu mẫu.
- Quốc gia, base currency, kế toán và phân quyền cấp cao vẫn là policy backend/owner inputs; không lấy mẫuVND thành cấu hình pháp định của shop.

## Giới hạn triển khai frontend phải kiểm tiếp (snapshot 29/09/2026; lịch sử)

- UI tiếng Việt. i18next đã khởi tạo nhưng chưa chuyển toàn bộ văn bản trong các màn hình vào từ điển; chưa có bản dịch/nghiệm thu đa ngôn ngữ.
- Các bảng đọc có cursor/limit. Một số dropdown danh mục lấy100bản ghi để thử; cần lookup phân trang/tìm kiếm phù hợp cho dữ liệu lớn, không coi giới hạn đó là hỗ trợ mọiquymô.
- Một số form mua hàng/đối soát có đường nhập đơn giản một dòng; cần UAT và bổ sung trình biên tập nhiều dòng tương ứng toàn bộ contract.
- Không có proof cho navigation blocker bảo toàn mọi form chưa lưu. Form danh mục/khách đã tránh ghi đè do refetch; cần kiểm chuyểnroute/chuyểnshop/đóngdialog toàn bộ.
- Browser đã có kiểm thử chọn lọc cho các lỗi validation/version, keyboard focus, viewport hẹp và một số luồng upload/demo. Các ca này không thay thế kiểm thử thủ công toàn bộ biểu mẫu, screen-reader, zoom 400%, mọi menu/avatar state hoặc owner UAT.
- Lệnh chưa rõ kết quả được giữ trong bộ nhớ qua điều hướng, có cảnh báo trước đóng tab; không có cơ chế phục hồi metadata này xuyên reload. Backend phải truy vết command/intent; API hiện chỉ đọc command theoID, không có endpoint tìm theoIdempotencyKey. Không tự mở khóa nếu chưa xác minh.
- Khóa readonly/missingpermission ở UI không là bảo mật máy chủ. JWT/secret/PII không lưu localStorage; APIkey chỉ gửi trườngwrite-only. Cần securitytest với backend thật.
- PWAmanifest/serviceworkerPush được cung cấp. Chưa kiểm installability trên Android/iOS/Safari, icon/iconmaskable, consent/Push thật hoặc Telegram thật.
- `VITE_APP_NAME` được khai báo nhưng tên ở shell/manifest vẫn theo BotSalesAI của bản chuẩn; thay thương hiệu cần đồng bộ đúng generator/shell, không coi biến đó đã điều khiển toàn bộ branding.

## Giới hạn của mocks (không phải code sản phẩm)

Dữ liệu nằm trong tab và reset khi reload; ngày cố định29/09/2026; một kho/tiềnVND mỗi shopmẫu; serialized simulator không chứng minh race trên DB. Không có actual scan, AI, ngân hàng, nhà cung cấp, vận chuyển hay thông báo nền. Kiểm thửAI là kết quả mô phỏng có nhãn, không số đo LLM. CSVmẫu tối đa1000dòng, không hỗ trợ XLSXparser. Báo cáo mock là mô hình hữu hạn, chưa triển khai đủ nguyên tắc hạch toán/migration/kỳ kế toán cho production. Chưa nghiệm thu các lọc ngày tài chính theo múi giờ trong mọi màn hình.

Không có backend từ việc gọi build:live. Các cổng toàn sản phẩm ở kit vẫn nguyên trạng. Phần frontend có source sẽ tiếp tục được kiểm/sửa theo chính source và các yêu cầu này; không đổi trạng thái thiếu thành PASS hoặc N/A.

## Cách áp dụng cho nghiệm thu mock frontend — 30/09/2026

Người dùng chấp nhận dữ liệu mock làm nguồn nghiệm thu frontend. Các giới hạn backend/provider thật không chặn task FE; không đổi kết quả lịch sử hoặc nhận tích hợp thật PASS. Fixture được dùng cho ID/capability hợp lệ mà contract hỗ trợ, có nhãn synthetic và test HTTP/browser. Endpoint/protocol còn thiếu không được bịa; trải nghiệm hạn chế hoặc ngoại lệ UAT cần ghi rõ, mandatory UI gap chưa giải quyết vẫn chặn phần đó.

Node/registry trong báo cáo29/09 là môi trường lịch sử. Lượt đọc30/09 thấy Node24 có sẵn nhưng chưa có dependencies/lockfile. Cần kiểm môi trường và chạy gates frontend thực trước claim. Các gap forms/i18n/dirty drafts/states/browser/PWA tiếp tục là việc phải làm trong FE009–FE028, không tự loại khỏi scope vì dùng mocks.
## Cập nhật trạng thái sau FE005 — 30/09/2026

Ghi chú môi trường ở đoạn ngay trên phản ánh lần đọc trước khi workspace được cài dependency. Lượt FE005 hiện chạy bằng Windows Node 24.19.0/npm 11.17.0 trên dependency/lockfile của repo. `generate:check` PASS (11 outputs/283 schemas/210 operations/54 routes), generator contract tests PASS 6/6, React typecheck PASS, Vitest PASS 43/43 (trong đó API client 19/19), source mapping PASS (53 files/207 API calls/54 routes/0 issue), boundaries PASS (53 files/378 imports/negative fixtures 8/8), và `git diff --check` exit 0. Chẩn đoán bổ sung với `--noUncheckedIndexedAccess` còn 11 lỗi ở mock files; tùy chọn này chưa bật trong tsconfig và không được tính là gate bắt buộc đã qua.

FE005 vẫn ghi nhận query tài chính `from`, `to`, `timezone` là bắt buộc theo OpenAPI; `listServiceCases` chưa có filter `customerId`. Không tự thêm endpoint hoặc giả dữ liệu backend để lấp hai giới hạn contract này. Handoff và log chi tiết: [FE005 handoff](../../botsales-kit/execution/frontend-evidence/FE005/handoff.md). Kết quả này không chứng minh production/demo build, CI, backend/provider thật, UAT hoặc staging.

## CI Frontend — 03/10/2026

GitHub Actions did not discover the previous workflow because it was stored under `BotSalesAI_Frontend/.github/workflows` rather than repository-root `.github/workflows`. The local change moves it to repository root with Frontend-only path filters, locked npm install/audit/verify/E2E steps, and revision-scoped artifacts. YAML/structure and current local verify evidence pass, but no GitHub run exists for the uncommitted change; do not report local logs as CI. The remaining action is an authorized commit/PR/push followed by recording the actual run and artifacts. No Backend or staging verification is included.
