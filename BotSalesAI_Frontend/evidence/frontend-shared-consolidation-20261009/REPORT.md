# Hoàn thiện hợp nhất Shared UI — 09/10/2026

**READY_FOR_ACCEPTANCE_LOCAL_SCOPE.** Ba công việc kỹ thuật thuộc UI plan §16.19 được thực hiện theo thứ tự P2 Inbox → P3 Dashboard → P3 tài liệu. [UI plan §16.6](../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status) là nơi duy nhất quản lý trạng thái.

## Thay đổi và nguyên nhân

| Ưu tiên | Điểm hợp nhất | Kết quả |
|---|---|---|
| P2 — R05/R06 | Inbox có Stack riêng sở hữu inset/filter rhythm ngoài Toolbar | Toolbar.filters + FieldGroup hiện có sở hữu đúng boundary, bốn bộ lọc ngoài form tìm kiếm; handlers/URL/cursor/query/draft được giữ. |
| P3 — R04 | Hai primary CTA cùng chrome chỉ khác quyền/label/đích | Descriptor local chọn operations.read → orders.read → null, một RouterLink; orders.write cho tạo đơn độc lập. |
| P3 — tài liệu | SPC-067/current wording còn count27 trong khi export thực28 | Quy định mọi public API/export mới, catalog/discovery sở hữu count; snapshot27 lịch sử được gắn nhãn, contract không pin số lượng mãi mãi. |
| Bổ sung — khởi động demo | Firefox/MSW nhận conditional304 không body cho module | Demo serve trả đầy đủ GET script/style; giữ live/non-asset/HEAD caching, regression đỏ/xanh hai engine. |
| Bổ sung — Shared outlined fields | Floating transform làm nhãn chồng giá trị ở text-only200%; label trong flow còn giữ pointer-events:none khi rỗng | Theme sở hữu normal-flow label/meta12px/gap4px/no-notch và click-label focus; Toolbar/demo selectors co giãn theo chữ. Regression geometry/focus và native54-route probes đạt. |
| Bổ sung — Inbox composer | Minimum lịch sử350px ép tổng header/message/composer vượt thread650px | Desktop giữ minimum6em theo cỡ chữ để lịch sử còn đọc được; phần nhập liệu cuộn riêng, action giữ vùng riêng ngoài scroll body, Tab tới nút vẫn thấy được; giữ nháp9 dòng/chữ200%, native desktop1600. |
| Bổ sung — Imports spacing test | Test cũ đo control24px/label12–18px theo floating label | Giữ boundary field và label24px, gap label→control4px, không transform; kiểm lại cả hai engine, không hạ ngưỡng. |
| Bổ sung — R10/R11 | Hàng biến thể không wrap, ô tên flex:1 co về width0 ở1280/text-only200% | Owner dùng FieldGroup wrap và minimum theo chữ cho SKU/tên/giá; regression giữ nháp qua thêm/xóa, native create/edit đạt. |

Axe mới bắt tiêu đề mặc định h6 bỏ cấp tại hội thoại: đã dùng component h2/h3 và giữ typography. Full attempt01 còn phát hiện Firefox nhận304 rỗng cho module contract qua MSW. Vite demo serve chỉ bỏ conditional headers của GET script/style để trả đầy đủ body; live, non-asset, HEAD và build giữ behavior. Regression trước2FAIL, sau2PASS và full suite cuối kiểm lại. Native visual review còn bắt nhãn chồng giá trị ở200%; Shared theme dùng outlined labels trong normal flow/meta12px, CSS role labelAfterGap4px từ token hiện có, không transform/notch; pointer-events:auto giữ click-label focus khi ô rỗng hoặc có giá trị. Toolbar wrap/min-width theo chữ và demoControl sở hữu geometry; consumer widths được bỏ. Doubled-text before2FAIL, final2PASS; native label/value/intrinsic-height/notch kiểm đủ54 routes ở390/1280. Không thêm Shared API, dependency, schema, spacing scale hoặc generic CTA engine. [Contract](CONTRACT.md), [before snapshot](baseline.json), [EDIT/KEEP](ANALOGOUS_PATTERNS.md), [diff so với dirty baseline](final-scope-review.json).

## Kiểm chứng trên source cuối

| Gate | Kết quả quan sát |
|---|---|
| generate:check | 11 outputs / 283 schemas / 210 operations / 54 routes. |
| Toàn bộ verify | Đạt lint/typecheck/source/boundaries/negative fixtures/build/UI gates; 175 unit và75 simulator+13 network. |
| Full E2E | Một full run 614/614, 307 mỗi Chromium/Firefox; không cộng targeted retest. |
| UI trong source cuối | 240/240 assertions UI không đổi được chạy trong một full614-case run; scoped240 trước footer fix là lịch sử và không cộng vào full. [Binding](ui-final-full-coverage.json). |
| UI contracts/layout | 40/40 contracts;86/86 layout fixtures,79 files0 findings1 declared exception;11/11 evidence fixtures;16/16 source maps. |
| Composer stability | 6/6, ba lần mỗi engine; body cuộn riêng/action giữ vùng riêng, bounds trước Tab/hit-testing/Shift+Tab giữ nháp. |
| Regression sở hữu | Inbox+Toolbar58/58 trước chuyển nhóm; Dashboard4/4; các test mới cũng đạt trong full source cuối; conditional module2/2 kiểm script/style, non-asset/HEAD/live cache và startup qua Service Worker. |
| Branches | Metadata pending/422/empty/recovery giữ filters/URL/composer;8 tuples quyền cho CTA; modifier mở tab thật, hover/focus; built review kiểm mouse active ở cả engines/5 widths. |
| Built demo | 6/6 artifact cases;216 observations=54 routes×320/1920×2 engines;30 focused geometry/axe/keyboard cases=R04/R05/R06×5 widths×2 engines. |
| Native | 3 browser zoom200%,5 deep Firefox text-only200% và108 label probes trên54 routes×390/1280 bằng native text-only200% bằng WebExtension native API;21 list-ellipsis recoveries kiểm Enter tới exact full text trong detail và1 Select recovery bằng Enter/Escape giữ exact full option/value/focus theo SPC-051. |
| Cài sạch/build | 239 source inputs có byte hash khớp bản copy trước cleanup;10 actual stages trong workspace tạm, npm ci cùng lock/audit/setup/verify/contracts/build lặp; production không chứa mock, demo có worker; temporary workspace được xóa sau PASS. |
| Toàn source | 76 source files/71 TS,54 routes/16 modules/28 Shared APIs; mọi route có Shared owner, runtime imports không unresolved. Các import động test-only có finite mapping và execution proof riêng. |
| FE tracker | Canonical CLI140/140,0 stale/blocked tại lần tái xác minh. Đọc [receipt hiện hành](canonical-revalidation-latest.json) và CLI để biết freshness sau thay đổi; giữ mẫu số140. |

Source full E2E: HEAD 53c0ba8f413b1f1e0fa16a747ed27f728b861dd6 + SHA-256 0adf78797f61f135e9a03a21c4d9adbbd60a430a10db6110159db15336f353b8 của 239 runtime/test/tool inputs. HEAD riêng không định danh dirty tree. Các logs/exit/hashes nằm trong stage-latest pointers và S19 manifest sau chốt. [Compiled measurements](built-shared-review.json), [native provenance](native-current.json), [adoption](adoption-current.json), [inventory](inventory-current.json).

## Lịch sử attempt và giới hạn

Scoped UI240/240 đạt trước footer fix, giữ [record lịch sử](ui-preflight-before-composer-footer.json); drift chỉ composer owner và test FE016. Sau đó regression hẹp bắt Firefox đã focus action nhưng action tràn form123.10px. [Raw failure](composer-footer-before.json) và [trace](composer-footer-before-trace/original-trace.zip) giữ nguyên. Owner tách phần nhập liệu cuộn và action không shrink nằm ngoài vùng cuộn. Test giữ mọi assertion cũ, thêm readable body, action bounds trước Tab, hit-testing và Shift+Tab/draft; toàn bộ240 UI assertions không đổi được chạy lại trong full source cuối, không lấy scoped preflight cũ làm PASS hiện hành.

Full attempt05 dừng có kiểm soát sau case186 FAIL vì test clearance theo nhãn floating cũ; trace ghi field/label24px, control45.25px. [Before2FAIL](imports-clearance-before.json) và [after2PASS](imports-clearance-regression-latest.json) giữ riêng; test mới kiểm boundary24px + label height + gap4px và normal-flow invariants, không tăng tolerance hoặc bỏ kiểm reflow. [Full raw record](full-attempt-05-latest.json).

Native visual FAIL và native before2FAIL/2PASS được giữ; collector ERROR thiếu ownedLabels giữ riêng. Full attempt02 bị dừng có kiểm soát trước label fix; không nhận là full completed PASS. [Label regression trước](label-before.json), [sau](label-regression-latest.json). Native108 route probes còn phát hiện R10/R11 width0: đã sửa wrap/minimum theo chữ tại editor; click nhãn rỗng còn được kiểm và sửa tại Shared theme; [regression trước](variant-before.json) và [sau](variant-regression-latest.json) trên cả hai engine.

Full attempt01 giữ FAIL case496 Firefox cùng [trace](full-attempt-01-composition-trace/original-trace.zip), [record](full-attempt-01-latest.json) và [controlled stop](full-attempt-01-interruption.json); không gọi lượt bị dừng là một full completed run. [Conditional regression trước](startup-cache-before.json) ghi2FAIL, [sau](startup-cache-regression-latest.json) ghi2PASS. Sau sửa boundary demo, full suite được chạy lại độc lập trên source cuối.

Before structural test đỏ vì thiếu Shared marker; geometry baseline không được mô tả là bug. Sau move, axe phát hiện skipped headings rồi regression đạt sau sửa semantic owner. Attempt metadata đầu dùng exact combobox label không tính selected value nên timeout; đã giữ raw interrupted run, sửa selector/đợi response thực rồi chạy lại cả nhóm và full suite. Raw text-only FAIL do intentional list ellipsis được giữ; collector chỉ phân loại link đúng pattern và chứng minh native keyboard recovery từng giá trị, mọi clip chưa recovery vẫn FAIL. Built-review attempt đầu loại bỏ hidden R06 list khỏi role query nên timeout: giữ record/screenshots, chuyển sang owner marker và assert hidden đúng breakpoint; không hạ geometry/axe/keyboard assertions.

Full-product tracker/contracts/Universal/workflow/dependencies và mọi dirty path có sẵn được bảo toàn theo baseline; FE views/receipts chỉ sinh bằng owner canonical. [Scope review](final-scope-review.json), browser byte preservation và domain publication có hồ sơ riêng. Không commit/push hoặc công bố hosted CI trong batch này.

## Nghiệm thu

[Hướng dẫn](ACCEPTANCE_GUIDE.md), [ảnh demo/HTML thực](handoff-demo-current.json), demo http://127.0.0.1:4173. Dashboard/Inbox list/detail ở desktop và mobile có case cụ thể; tất cả 16 module/54 routes có regression/compiled observations, không đồng nghĩa mọi business branch được test.

Phạm vi React/TypeScript + HTTP/SSE MSW tổng hợp local. Backend/provider/staging/production hosting OUTSIDE_SCOPE; screen-reader speech/broad human conformance và hosted CI NOT_RUN; quyết định nghiệm thu người dùng PENDING. Regression bảo vệ invariant đã kiểm, không bảo đảm loại bỏ mọi lỗi tương lai. Các gate count mô tả suites riêng, không cộng thành phần trăm code.
