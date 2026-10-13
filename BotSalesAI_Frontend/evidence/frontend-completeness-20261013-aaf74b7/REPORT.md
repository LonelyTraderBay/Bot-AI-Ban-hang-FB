# Frontend/mock — kết quả đo trên source cuối 13/10/2026

**Hoàn tất phần việc Frontend/mock theo kế hoạch được duyệt: 140/140 checkpoint được CLI canonical tái xác minh (100%), 28 task; stale=[] và blocked=[]. Hồ sơ READY_FOR_ACCEPTANCE_LOCAL_SCOPE; người dùng chưa nghiệm thu.** Không dùng con số này để chứng nhận toàn sản phẩm, production, 100% enforcement hoặc mọi yêu cầu API đã được bật.

HEAD `aaf74b7787ef0f76228e533abe33d22a1b67459c` cộng diff working tree; Node 24.19.0/npm 11.17.0, Windows. Source/config/test/log được SHA256 trong từng execution record, 0 sourceDrift tại thời điểm từng lượt final. Sau full PASS, chỉ generator báo cáo sửa 4 tên test cũ; toàn bộ app/mock/test/config giữ hash, generator/map/static/cold được chạy lại. [Delta tool và checksum](proof-tool-delta.json); chưa commit/push/deploy. [Kết quả máy đọc](final-results.json), [canonical closeout](canonical-closeout.json), [quality gates](quality-gates-final.json), [đo source](source-measurements-final-r2.json). Backend là placeholder chưa có runtime.

## Tỷ lệ có mẫu số thực

| Thước đo | Trước | Source cuối | Ý nghĩa |
|---|---:|---:|---|
| Canonical FE checkpoint còn hiệu lực | 0/140 (stale) | 140/140, 100% | Tái kiểm từng criterion với source/test/log; không có nghĩa baseline 0% code |
| Route có owner runtime | 61/61 | 61/61, 100% | Màn hình được chạy trong full/built demo; không tự chứng minh mọi action |
| Module chuẩn | 16/16 | 16/16 | Owner source của routes |
| Feature có route trace | 64/64 | 64/64 | Traceability, không tính % correctness |
| API route/global có tham chiếu | 214/224, 95,54% | 222/224, 99,11% | AST, loại mocks/generated; SSE qua EventSource; không là tổng % code |
| API đọc của routes | 91/98 | 98/98, 100% | Bảy GET detail đã nối và có positive/negative runtime cases |
| API actions của routes | 121/123 | 121/123, 98,37% | Hai privacy operations vẫn unavailable theo policy |

### Source theo 16 module

| Module | Route | API references/required | Gap |
|---|---:|---:|---|
| bot | 4 | 18/18 | Không |
| catalog | 6 | 16/16 | Không |
| customers | 3 | 13/13 | Không |
| dashboard | 1 | 3/3 | Không |
| finance | 11 | 43/43 | Không |
| fulfillment | 2 | 9/9 | Không |
| inbox | 2 | 14/14 | Không |
| integrations | 2 | 14/14 | Không |
| inventory | 3 | 9/9 | Không |
| knowledge | 3 | 15/15 | Không |
| notifications | 2 | 10/10 | Không |
| operations | 3 | 13/13 | Không |
| orders | 4 | 18/18 | Không |
| procurement | 4 | 22/22 | Không |
| reports | 2 | 4/4 | Không |
| workspace | 9 | 21/23 | stepUp, approvePrivacyRequest |

Mẫu số 224 là tập operationId duy nhất từ readOperations/actions/globalOperations trong route manifest; giữ nguyên cả `stepUp` và `approvePrivacyRequest`. FE009.S03 cấm password step-up trái OIDC; privacy approval chưa có policy/ADR để bật. Không loại hai gap khỏi mẫu số, không tạo approval giả. Canonical API có 245 operations, không lấy toàn bộ server contract làm mẫu số FE. Tài liệu kế hoạch cũ ghi 54 routes; source/manifest hiện có 61, giữ task denominator 140 và review theo manifest hiện hành.

## Thay đổi đã kiểm chứng

- Bảy detail lấy dữ liệu qua GET riêng: bot revision, evaluation, channel, AI connection, member, notification và service case; pending/error/retry, 403/404/503, fields từ response và close/focus được kiểm. Không dùng row snapshot thay detail API.
- Command history R37 có cursor riêng và lọc quyền mutation gốc trong mock; ID ngoài shop/unknown kind bị từ chối. Chỉ đọc/refresh status, không tự resend/reconcile unknown intent.
- Pager giữ tối đa 100 cursor/filter và 100 filter LRU; negative trước sửa và regression đi 125 trang/quay lùi có số đo. Giữ filter và nút về đầu; không bịa cursor cũ.
- Dialog content cuộn được bằng keyboard, heading thông báo đúng cấp; warning kênh wrap sau khi đo clipping ở 320px/Text Only 200%. Parent/worker Playwright cùng run ID, built-demo có thư mục riêng; unsafe ID bị từ chối.
- Generator route report sửa đúng bốn title đã đổi trong owner tests (D06/G05/G07/G08); giữ nguyên guard yêu cầu title có trong source và full PASS log, rồi chạy generator và map cases lại.
- Test FE020 chỉ đếm bảng Công việc vận hành; FE010 chờ GET/detail/list readiness; bốn source-map tests đối chiếu canonical/owner hiện hành. Không bỏ assertion nghiệp vụ, retry hoặc suite để có PASS.

[Review kiến trúc](ARCHITECTURE_REVIEW.md), [contract trước sửa](COMPLETION-CONTRACT.md), [C10 owner executions](C10-scoped-result.json), [baseline audit](baseline-REPORT.md).

## Kiểm chứng source cuối

| Run thực | Kết quả | Thời gian |
|---|---:|---:|
| final-e2e-r8 | 878/878 | 80.62 phút |
| final-built-demo | 6/6 | 3.25 phút |
| final-generated-map-e2e | 2/2 | 0.04 phút |

Full supported matrix 878 cases: Chrome 155 cài trên máy và Playwright Firefox 155, mỗi engine 439; 0 skipped/flaky/unexpected, một execution mỗi case. Matrix giữ đủ 70 test files, assertions, 0 retries và một worker; chỉ project Chromium chọn channel chrome để kiểm đúng Chrome >=154 theo tài liệu. Config được fingerprint trong record. Lượt Chromium 153 trước đó vẫn FAIL, không đổi thành PASS. Installed Firefox 157 chỉ được kiểm inventory, không gọi đó là executed proof. Built-demo 6/6, 244 lượt route (61 × hai widths × hai engines), 0 page error/overflow theo actual observations trong [artifact manifest](runtime-artifacts-final.json). Generated map được sinh từ full PASS log bằng generator owner và tái kiểm 2/2. Probe fixture đo binary Chrome 155.0.8059.40; user-agent Chrome/153 trong artifact log là preset Desktop Chrome của Playwright, không phải phiên bản binary. [Đo binary](browser-binary-probe-e2e.log).

Full verify exit 0: generator 15 output/346 schemas/245 operations/61 routes; source 85 TS/TSX, 271 API calls; boundary 723 imports, 10/10 negative fixtures; lint/typecheck, domain 117/117 (86 simulator +31 HTTP), unit 242/242 trong 25 files; layout 86/86 và 93 sources/0 finding; visual-token 5/5 và 92 sources/0 finding; composition 41/41 và 91 sources/0 finding; provenance 11/11, S17 3 actual records/279 fingerprints. Additional source-map 16/16; kit 532/532. Hai boundary tests C10 bổ sung 2/2: API aggregate nhận đúng 366 ngày, từ chối 367 ngày liền kề; [log thực](final-marketing-boundaries.log), tách khỏi mẫu số unit 242. [Verify record](final-verify-r3.record.json).

Native affected-detail proof: Chromium browser zoom 200% 8/8; Firefox native Text Only 200% 16/16 ở 320/1440 CSS px; installed Chrome 155 native browser zoom 200% 8/8. Reported native zoom/settings, CSS viewport, DPR, actual text/geometry, keyboard focus, writes/errors và ảnh được giữ trong từng native JSON. Native Chrome record r6 có geometry PASS nhưng ảnh Playwright lệch khi zoom/scroll; không dùng làm proof final. [Chẩn đoán capture](native-capture-diagnostic.json) giữ hai ảnh và CSS/non-CSS metrics. Helper sửa sang CDP viewport, thêm vertical bounds; native Chrome r7 chạy lại 8/8, không thay app source. Đây là scope tám detail owners, không tái chứng nhận toàn bộ lịch sử native matrix.

Cold install thực chạy npm ci/npm ls --all/npm audit, exit 0, manifest/lock không đổi, zero vulnerabilities; 13/13 current cold checks. 287 source/config copies byte-identical. Production 35 file/demo 39 file byte-identical giữa root và cold build, 0 artifactDrift. [Cold artifact/hash](cold-artifacts-final.json), [cold install](cold-install-final.json). Npm ci vẫn có deprecation/install-script warnings trong raw log; không tự nâng dependency. Artifact preview đo gzip budget 500 KiB initial/200 KiB largest và dataset 1000 customers được API paginate; số đo cụ thể trong final-results.json, không SLO production.

## Lượt không đạt và giới hạn

Baseline full 812/814 không đạt; targeted retry 2/2 không thay baseline thành PASS. Các partial/cold/native trước sửa được giữ. Lượt r6 hai worker phát hiện FE020 locator scope và Chromium main.tsx `ERR_NO_BUFFER_SPACE`; r7 một worker vẫn FAIL ở W02 page.goto với ERR_NO_BUFFER_SPACE, response status=-1, lỗi document sau 1,5 ms trước response/app assertion. Snapshot sau lỗi: RAM khả dụng 17 GB, commit 77%, 305 TIME_WAIT; số liệu sau lỗi không chứng minh trạng thái ngay lúc lỗi hay nguyên nhân OS. Lượt final r8 dùng Chrome 155 được tài liệu hỗ trợ và Firefox 155, không bỏ case/retry hay thay business assertion. Chưa suy nguyên nhân cụ thể của Chromium 153 từ lỗi transport.

| Record failed/partial | Exit | Source drift | Bằng chứng |
|---|---:|---:|---|
| final-composition | 1 | 0 | [record](final-composition.record.json) |
| final-e2e-r2 | 4294967295 | 0 | [record](final-e2e-r2.record.json) |
| final-e2e-r3 | 4294967295 | 0 | [record](final-e2e-r3.record.json) |
| final-e2e-r4 | 4294967295 | 0 | [record](final-e2e-r4.record.json) |
| final-e2e-r5 | 4294967295 | 0 | [record](final-e2e-r5.record.json) |
| final-e2e-r6 | 4294967295 | 0 | [record](final-e2e-r6.record.json) |
| final-e2e-r7 | 1 | 0 | [record](final-e2e-r7.record.json) |
| final-e2e | 1 | 0 | [record](final-e2e.record.json) |
| final-native-browser-200 | 1 | 0 | [record](final-native-browser-200.record.json) |
| final-native-text-200-r2 | 1 | 0 | [record](final-native-text-200-r2.record.json) |
| final-native-text-200-r3 | 1 | 0 | [record](final-native-text-200-r3.record.json) |
| final-native-text-200 | 1 | 0 | [record](final-native-text-200.record.json) |
| final-source-maps | 1 | 0 | [record](final-source-maps.record.json) |
| final-ui-contract-r2 | 1 | 0 | [record](final-ui-contract-r2.record.json) |
| handoff-checkpoint-preflight | 1 | 0 | [record](handoff-checkpoint-preflight.record.json) |
| metadata-generator-before-fix | 1 | 0 | [record](metadata-generator-before-fix.record.json) |

Preflight checkpoint đầu tiên dừng ở FE013 vì dùng từ trong title để chia success/rejection thành hai nhóm loại trừ nhau; flow FE013 thật kiểm cả stale claim 412 và pick/pack/dispatch/delivery thành công. Sửa công cụ chọn named owner cases theo assertion; preflight r2 chạy đủ 140 criterion trước khi chạm ledger. [Source preflight trước sửa](revalidate-checkpoints-before-outcome-fix.mjs) có SHA256 khớp failed execution record; failed log và app source giữ nguyên.

Strict premium scanner vẫn raw **FAIL/14**, không ghi xanh. Parser coi MUI Button là literal HTML và không resolve component prop; AST review xác nhận 11 RouterLink/to, 2 file-label/input/onChange, 1 download anchor/href. Privacy link có browser permission/click cases. [Review semantic actions](premium-semantic-review.json), [raw scanner](premium-final-r2.json). Scope chỉ có 13 historical accepted-review exceptions; không giả owner duyệt exception thứ 14 hoặc thêm noop handlers để né scanner.

Rubric FE-G01/02/03/04/06/07/08 fully verified: **7/9**, đây không là % code. FE-G05 tự động đạt nhưng speech/human conformance NOT_RUN; FE-G09 technical UAT đạt, owner acceptance PENDING. Hosted CI NOT_RUN trên source này. Không chứng minh Backend/provider/auth enforcement server, DB, staging, production, physical devices hoặc mọi branch động. Full-product plan/progress/T-tasks giữ nguyên hash.

[Hướng dẫn chạy và nghiệm thu](ACCEPTANCE_GUIDE.md). Trạng thái triển khai duy nhất nằm ở UI plan §16.6; FE freshness đọc CLI canonical. Thay source/config/tests hoặc tài liệu trong receipt sau bàn giao phải tái kiểm fingerprint/criterion, không dùng snapshot 100% như bằng chứng mới.
