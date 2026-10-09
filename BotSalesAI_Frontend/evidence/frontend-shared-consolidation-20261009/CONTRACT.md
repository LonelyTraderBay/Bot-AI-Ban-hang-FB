# Contract trước triển khai hợp nhất Shared UI — 09/10/2026

Nguồn thứ tự/trạng thái: UI plan §16.6/§16.19. Workflow/DoR/DoD: FRONTEND_SPACING_STANDARD §0/§13.2, SPC-001–075. Phạm vi Frontend/mock local; giữ mọi thay đổi có sẵn, API/schema/dependencies và full-product ledger.

## Owners và invariant

- **P2 Inbox R05/R06:** Toolbar sở hữu inset/search/filter boundary; FieldGroup flush sở hữu nhịp controls. Chuyển status/mode/channel/assignee vào filters slot ngoài form search. Giữ updateFilter/detailHref, URL/cursor list versus messages, metadata/refetch, conversation/composer draft/scroll/permission/scope. Không thay Shared API. Đo320/390/768/1280/1440, pane300 ở desktop, keyboard/axe/native zoom/text.
- **P3 Dashboard R04:** chọn descriptor local canOps → canOrders → null, render một primary RouterLink với chrome hiện có. CTA create riêng theo orders.write. Kiểm tám tuple permission (ops/orders/create), href theo shop, đúng một primary CTA, focus/target/modifier semantics, responsive/native methods. Hero/KPI/query/pause owners giữ nguyên.
- **P3 docs:** discovery export là nguồn count hiện28 (22+6); SPC-067 áp dụng mọi public API/export mới, current wording/crosswalk khớp. Giữ historical counts, conditional notices và private helper/supporting type classification. Không pin count tương lai hoặc thay tokens.

## Baseline và regression

Baseline source/Git/protected paths và actual Chromium before renders phải lưu trước source edit. Đây là consolidation đã xác nhận từ source; chỉ gọi bug geometry khi số đo chứng minh. Structural invariant có thể đỏ trước sửa, ghi đúng phạm vi. Tests sở hữu: ui-toolbar-layout, fe016, ui-dashboard-layout, shared-ui-render-contract và ui-shared-api-contract. Giữ assertions trước, chỉ thêm behavior đúng; groups chạy kiểm liên quan tuần tự.

## Closure

Generate/verify/full Chromium+Firefox/build/demo/built-demo, affected keyboard/axe/reflow/native methods và all-route/consumer closure trên source cuối. Logs/exit/fingerprints mới, zero mandatory missing/stale/unknown. Browser wrappers giữ snapshots lịch sử và chạy tuần tự; produced artifacts được giữ trong namespace batch trước khi restore historical originals, current receipts publish từ execution thật. FE canonical revalidation giữ140 và dependency closure. User acceptance/speech/hosted CI chỉ ghi quan sát thật.

## Lỗi gate được xác nhận trước bổ sung source — 09/10/2026

Full attempt 01 bị dừng có kiểm soát sau case496 Firefox FAIL. Trace giữ nguyên ghi generated.ts được trả304 không có body, sau đó import API_BASE_PATH thất bại; request là GET Sec-Fetch-Dest: script. Source contract thực tế vẫn có export, hash không drift. Owner cần sửa: apps/web/vite.config.ts tại demo serve boundary; regression sở hữu tests/session/demo-worker-startup.spec.ts. Snapshot hai owner đã lưu trong before/ trước thay đổi. Bản sửa chỉ yêu cầu response đầy đủ cho GET script/style ở demo dev server, giữ conditional HTTP của request khác và live server, không sửa schema/vendor worker/dependency/build cache. Bổ sung deterministic conditional-ETag regression trước/sau trên cả engine; giữ raw full FAIL và chạy lại toàn bộ trên source mới.

## Native visual finding trước sửa owner — 09/10/2026

Ảnh Firefox native text-only200% ở1280 xác nhận floating labels của Toolbar search và mock-tools chồng nội dung; máy chỉ đo clip/overflow nên bỏ sót overlap. Native visual FAIL giữ riêng, full attempt02 bị dừng có kiểm soát trước source edit. Root cause: search row theo viewport dù pane300 hẹp, input co xuống trong khi button tăng theo chữ; mock-tools minWidths150/190/210px cố định không tăng theo chữ. Sửa geometry ở Shared Toolbar và layoutSx.shell.demoControl, bỏ consumer overrides; không sửa global label/theme, tokens, API hoặc form nghiệp vụ khác. Before3 owner snapshots có hash khớp original baseline. Bổ sung đo label/value rectangles, regression doubled-text và native probes trên đủ23 Toolbar routes + Shell private routes theo actual route discovery; mọi overlap FAIL. Rerun strict final gates/cold/full/compiled sau source cuối.

### Quyết định sau phép đo trước sửa (thay phương án geometry-only ở trên)

Native đo được overlap9.85px cả với Dataset label một dòng; chỉ nới width không xử lý transform translateY cố định của floating label. Doubled-text regression trước2FAIL và native4-case trước2FAIL/2PASS, raw ERROR collector thiếu ownedLabels giữ riêng. Chọn profile outlined label trong normal flow ở Shared theme, font meta12px (không scale), không notch; label dài/200% tự tăng chiều cao, không dựa vào dịch chuyển cố định hoặc đo DOM trong app. Thêm CSS role form.labelAfterGap4px từ token hiện có, một owner theme. Toolbar wrap theo chỗ trống và giữ minimum theo chữ; align controls bottom; demoControl sở hữu geometry co giãn theo chữ, bỏ minWidth consumer150/190/210. Đã snapshot thêm theme trước edit, tổng15 copies khớp baseline. Shared theme ảnh hưởng đủ54 route consumers: compiled/all-route full +54 native text probes small/desktop; deep keyboard/axe/native R04/5/6 giữ riêng. Không thêm API/dependency hoặc đổi contracts/tokens.

### CSS role gate bổ sung trước checker edit

Strict layout gate giữ FAIL vì constructor cssPixel(token) chưa nằm trong accepted syntax và CSS role checker chỉ có table.cellInset. Owner scripts/check-layout.mjs cần nhận direct cssPixel đúng private symbol/canonical token và map chính xác form.labelAfterGap→marginBottom; không cho arbitrary roles/properties/values. Snapshot checker và test trước edit, tổng17 copies. Thêm positive direct constructor và negative wrong property/raw token/wrong owner; không bỏ hoặc hạ fixture nào. UI bytes4px giữ nguyên. Source gate sẽ chạy lại toàn bộ.

### Hàng biến thể co về chiều rộng0 ở native text-only200%

Lượt108 phép đo giữ106PASS/2FAIL: R10/R11 ở1280 có ô tên biến thể width0. Hàng không wrap giữ chiều rộng nội tại của SKU/giá/checkbox/xóa, còn flex:1 cho phép ô tên co hết. Snapshot catalog editor và suite component-layout trước sửa, tổng19 copies. Dùng FieldGroup wrap hiện có và geometry tối thiểu theo chữ tại owner này; không đổi default chung, schema, trường nghiệp vụ, dependency hoặc spacing token. Regression create/edit ở320/390/1280/1440 kiểm chữ gấp đôi, control còn đọc được, không chồng nhãn/tràn trang, giữ nháp qua thêm/xóa biến thể. Giữ native FAIL và chạy lại108 phép đo cùng final gates.

### Click nhãn outlined của trường rỗng phải đưa focus vào control

Mouse probe Chromium thực tế trên products/new xác nhận pointerEvents:none ở nhãn trong flow khi chưa shrink; click không focus input liên kết. MUI vẫn giữ giả định nhãn nằm trên input. Sửa pointer events tại theme owner và kiểm input/textarea rỗng/có giá trị bằng click thật, focus thật và dữ liệu còn nguyên. Giữ snapshot theme/test từ baseline; thêm ca đỏ/xanh trong suite component-layout. Các lượt verify/cold/native trước sửa tương tác là lịch sử; mọi final gate phải chạy lại.

### Inbox: minimum của vùng lịch sử đẩy composer khỏi panel650px

Full attempt03 giữ FE016 FAIL: đáy composer998.39px vượt đáy thread989.84px. Vùng message flex:1 vẫn ép minHeight350px trong panel650px, trong khi header và composer tăng chiều cao nội tại sau normal-flow label; flex shrink không thể phân phối phần thiếu. Owner Inbox cần cho vùng lịch sử co ở desktop, giữ header/composer theo chiều cao nội dung; mobile giữ vùng lịch sử tối thiểu riêng. Không tăng panel để che lỗi hoặc giảm assertion. Snapshot conversation-components khớp original baseline, tổng20 owners. Giữ trace/log full FAIL; kiểm default, multiline và text tăng cùng geometry/scroll/draft trước final full run mới.

Composer default đã nằm trong thread trên cả hai engine. Tại chữ gấp đôi và9 dòng nháp, form có scroll riêng, nút phải còn trong viewport của form khi Tab từ textarea. Probe focus chương trình trên Chromium giữ scrollTop0; native Tab thực tế cuộn form tới nút. Regression dùng phím Tab thật, giữ assertion focus/bounds/draft; không dùng scrollIntoView hoặc ép scrollTop. Native text200 bổ sung desktop1600 (tổng8 deep +108 route probes).

### Collector/evidence sequencing và ellipsis của Select

Native desktop200 xác nhận composer không vượt thread, nhưng giá trị Thời trang trong Select ở context dùng ellipsis. Quy định SPC-051 cho phép khi đọc được toàn bộ: collector phải thực hiện Enter thật vào đúng MUI combobox, kiểm exact selected option và toàn bộ bounds chữ, rồi Escape giữ value/focus; không miễn clip theo class đơn thuần. Giữ native FAIL032330 và collector ERROR032657/032718 (Promise bị serialize sớm; helper đã await giá trị trước stringify). Mọi clip khác vẫn FAIL.

Verify lượt83604 giữ exit1: gate S17 phát hiện hash Inbox/test cũ. Wrapper browser đang đóng đã khôi phục bản evidence lịch sử sau refresh S17, runtime source không drift. Chốt lại theo thứ tự sau tất cả preserving browser wrappers: xác minh bytes lịch sử, refresh S17 từ actual40/86/11 current, rerun whole verify rồi publish exact domain result. Không nhận lượt83604 là đạt.

Native desktop text200 cuối kiểm9 dòng nháp nội bộ +Tab button trong composer, và108 route label probes đều đạt. Các lượt collector SyntaxError/timeout giữ nguyên: newline cần escape trong expression và guard bản nháp chặn ca chuyển hội thoại. Harness xóa đúng nháp tổng hợp qua input event trước ca recovery navigation riêng, chờ app đánh dấu clean rồi Enter; không mutate draft guard hoặc ép navigation. Chuỗi trước/sau vẫn kiểm9 dòng tại thời điểm native focus.

### Native visual: vùng lịch sử chỉ còn padding khi nháp dài

Ảnh native200 cuối033542 và geometry đo message height32px, padding16+16px xác nhận nội dung lịch sử có viewport0 khi9 dòng nháp. Ca trước chỉ kiểm bounds/focus nên chưa đủ tính dùng được; giữ PASS phạm vi đó như lịch sử, bổ sung invariant content viewport >=1 dòng thực tế, chạy đỏ trước source edit. Chọn desktop minHeight6em tại owner Inbox (mobile350px giữ nguyên): minimum tăng theo chữ, composer vẫn co và cuộn riêng trong khung650px. Không tăng khung hoặc bỏ bounds/Tab/draft assertions. Full attempt04 bị dừng có kiểm soát trước edit và không được tính là full PASS.

### Source cuối sau readability: thứ tự publication

Sau tất cả scoped browser wrappers đóng, refresh S17 từ current40/86/11 rồi chạy verify và cold độc lập; đợi cả hai đạt trước full, sau đó built-demo wrapper riêng. Khi full đã snapshot đúng S17 fresh thì không publish lại S17 sau browser: kiểm giữ byte trùng exact current publication rồi publish domain bytes của final verify. Helper chỉ chấp nhận hai thứ tự có hash/thời gian thật: S17→verify→full→built hoặc full→built→byte-check→S17→verify; không miễn drift ngoài S17. Các lượt source/evidence cũ giữ FAIL/stale lịch sử.

Imports legacy geometry contract correction: full attempt05 case186 measured label clearance24px and input clearance45.25px. Normal-flow labels now own their measured height plus4px internal gap. Preserve the strict24px field/label boundary, zero label offset,4px label/input gap, no transform, static position and806px reflow. Both-engine before2FAIL retained; final passing proof required. No runtime geometry changed for this test correction.

Composer footer root fix: actual Firefox focus did not guarantee the submit action was scrolled into its form viewport (123.10px overflow). Keep input/error/mode controls in their own flex scroll body and reserve non-shrinking action space outside that body. No sticky overlay or JavaScript scroll workaround. Preserve prior bounds/readability/draft assertions and additionally require action bounds before Tab, body one editable line, hit-testing and Shift+Tab draft retention. The240-case scoped preflight remains historical; its unchanged UI assertions must all execute in the final full run and bind current source, no summed retests.
