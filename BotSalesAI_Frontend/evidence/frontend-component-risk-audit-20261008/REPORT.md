# Audit nguy cơ component gặp lỗi bố cục tương tự Toolbar — 08/10/2026

## 1. Kết luận và phạm vi

**Vẫn có vị trí gặp cùng cơ chế stretch và lệch alignment.** Việc sửa Toolbar không tự bảo vệ các FormFields/FieldGroup/SurfaceContent khác. Đã đo trên source thực tế và Chromium/Firefox; nhận định dưới đây phân biệt lỗi rõ trong UI mặc định, cơ chế có nguy cơ và lỗi chỉ tái hiện với props tổng hợp.

Đây là **DIAGNOSTIC_ONLY**, không phải tracker mới hoặc hồ sơ đóng nghiệm thu. Thứ tự/trạng thái UI vẫn thuộc [kế hoạch hiện hành](../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status). Không sửa source ứng dụng trong đợt audit này; các finding cần được xử lý trong batch implementation tiếp theo. Không suy tỷ lệ hoàn thiện từ số component hoặc số probe.

Baseline: `HEAD 53c0ba8f413b1f1e0fa16a747ed27f728b861dd6` cộng working tree có sẵn. [Inventory](inventory.json) giữ SHA-256 của 76 file runtime; [assessment](component-assessment.json) ghi source drift bằng 0. Cả 76 fingerprint khớp source của verify gần nhất trước audit. Preview 4173 được đối chiếu byte với index và JS trong `dist-demo`; hashes nằm trong hai báo cáo route.

| Phạm vi | Kiểm tra thực tế |
|---|---|
| Source | 76 file, 71 TypeScript, 16 module; 116 hàm render JSX; đọc owner shared, theme/layout/CSS, module sử dụng và tests liên quan |
| Shared UI | Đủ 28 export và 1.137 call site có binding tới owner; [bảng nhận định từng API](SHARED_COMPONENTS.md) |
| Candidate bố cục | 100 candidate flex/action, 18 grid và 18 truncation/height; [rationale từng vị trí](component-assessment.json). Candidate có cả column/intentional stretch, không phải 100 lỗi |
| Route mặc định | 54 route × 4 viewport (320/390/768/1440) × 2 browser = 432 quan sát; không page overflow, không page error, không source drift |
| Dialog/form state | 30 trường hợp mở dialog + 4 trạng thái form × 3 viewport (320/768/1440) × 2 browser = 204 quan sát; 204 OBSERVED, không page error và không request ghi API nghiệp vụ |
| Select | 4 trường hợp × 2 viewport × 2 browser = 16 quan sát; đo popup sau khi Grow kết thúc, không request ghi API nghiệp vụ |
| Shared stress | 15 fixture × 2 viewport × 2 browser = 60 quan sát; có lỗi được giữ lại, không gọi toàn bộ là PASS |

432/204/16/60 là các tập quan sát riêng; không cộng chúng thành full E2E PASS. R14/R36 dùng `missing-job`, không phải nhánh job đã xử lý thành công. Ma trận route dùng role owner và dữ liệu mock mặc định. Kiểm tra source rộng hơn nhánh đã render; không tuyên bố đã chạy mọi tổ hợp permission/pending/error của 1.137 call site.

## 2. Các vị trí cần xử lý theo ưu tiên

### A01 — P2: hàng sản phẩm trong đơn mới và dialog sửa đơn

- Owner: [DraftForm](../../apps/web/src/modules/orders/index.tsx#L123), dùng [FormFields](../../apps/web/src/shared/ui/composition.tsx#L29).
- Đã tái hiện ở R18 và dialog R19, tại 768/1440 trên cả hai browser; cả dữ liệu sạch và số lượng `0`.
- Nút icon “Bỏ dòng 1” có chiều cao **92,125 px Chromium / 92,133 px Firefox**, trong khi chiều cao tự nhiên với cùng width là **44 px**.
- FormFields đổi sang row tại sm nhưng không có alignItems. TextField số lượng gồm input và helper hai dòng; root field cao khoảng 92 px, kéo sibling IconButton cao theo. Mặt input chỉ khoảng 53 px, nên icon nằm thấp hơn tâm input.
- Ở 320 px, hướng column không tái hiện lỗi kéo cao này; đây không phải bằng chứng branch mobile và text resize hoàn toàn an toàn.
- Sửa phù hợp: chốt alignment của mixed row tại owner DraftForm, giữ helper ở field của nó và để action giữ hình dạng tự nhiên. Cùng owner được tái dùng trong editor nên xử lý một lần cho cả create/edit. Kiểm cả trục ngang của icon khi chuyển sang column; không khóa height bằng số 44.

Chứng cứ: [ảnh đơn mới 768](chromium-order-line-clean-768.png), [ảnh dialog sửa đơn](chromium-order-edit-1440.png), [state Chromium](states-chromium.json), [state Firefox](states-firefox.json).

### A02 — P2: editor sản phẩm căn giữa sai cấp wrapper

- Owner: [ProductEditorPage](../../apps/web/src/modules/catalog/index.tsx#L143), dùng FieldGroup với `sm: center`.
- R10/R11 có cả lookup danh mục nhiều dòng và field Trạng thái đơn. Lookup gồm search, helper, select, loaded count và các branch retry/loading; chiều cao baseline **146,25 px**. Field trạng thái khoảng **53,125 px**.
- Tại 1440, mặt input “Tìm danh mục” ở y=582,016 và Trạng thái ở y=628,578: lệch **46,563 px**. Firefox đo **46,567 px**. Tại 768 cũng cùng độ lệch; 320 chuyển column.
- Đây là lỗi hierarchy/alignment đã đo, dù không có button stretch: `center` căn toàn wrapper, không căn các mặt input. Lỗi/refetch/load-more làm chiều cao wrapper thay đổi và có thể tiếp tục dời field đơn.
- Sửa phù hợp: bố trí search lookup ở hàng riêng; category select và status cùng hàng control chính, với helper/count/retry thuộc field tương ứng. Tận dụng FormFields/FieldGroup hiện hành; giữ URL/draft/pagination/selected retention. Không bù bằng margin hoặc spacer.

Chứng cứ: [ảnh editor](chromium-product-editor-1440.png), `fieldFaces` trong hai báo cáo state, các frame R10/R11 trong hai báo cáo route.

### A03 — P2: ánh xạ import còn cơ chế stretch không được khai báo

- Owner: [ImportsPage mapping row](../../apps/web/src/modules/catalog/imports.tsx#L55), dùng FieldGroup row không có alignment.
- Cả 5 nút “Bỏ” ở 768/1440 có chiều cao **53,125 / 53,133 px**, thay vì chiều cao tự nhiên 44 px. Hiện field chưa có helper/error riêng nên mức kéo giãn nhỏ.
- Số đo 53 px tự nó không chứng minh mọi thiết kế nút bằng field là sai. Điểm rủi ro là chiều cao action đang phụ thuộc ngầm vào root field. Fixture dùng chính FieldGroup với helper dài kéo action lên **200 px** ở 320 và **92 px** ở desktop.
- Cần chốt intent tại mapping row: nếu action phải giữ hình dạng tự nhiên, khai báo alignment phù hợp. Nếu muốn equal-height, phải có contract minh bạch và kiểm khi field sinh helper/error, không để CSS default quyết định.
- Bổ sung regression tại consumer import; test Toolbar chỉ kiểm search submit, không kiểm các nút này.

Chứng cứ: [ảnh import 768](chromium-import-mapping-768.png), các R13 frame trong [route Chromium](routes-chromium.json) và [Firefox](routes-firefox.json), `field-group-mixed` trong [stress](stress-fixtures.json).

### A04 — P2: Amount dài ở ngoài table có thể tràn hoặc bị cắt

- Owner: [Amount](../../apps/web/src/shared/ui/components.tsx#L80), [Stat](../../apps/web/src/shared/ui/components.tsx#L68), [DetailLine](../../apps/web/src/shared/ui/components.tsx#L468), Panel.
- Decimal canonical cho phép chuỗi tối đa 60 ký tự. Fixture dùng Money hợp lệ gồm 60 chữ số và VND; không sửa schema/formatter hoặc dùng Number.
- Tại 320, Amount trong Stat rộng **1.087,77 px Chromium / 1.154,22 px Firefox**, parent 254 px; document tăng lên **1.121 / 1.187 px**.
- Amount trong DetailLine rộng khoảng **522,6 px**, box value khoảng 214,6 px và ancestor Panel có `overflow:hidden`. Document vẫn 320 nhưng phần giá trị bị cắt.
- Đây là lỗi đã tái hiện trong **shared render với dữ liệu tổng hợp hợp lệ**; không phải số tiền của demo mặc định. Các source consumer ngoài table thật tồn tại ở Dashboard, Order summary/quote, Finance metrics và các DetailLine.
- Sửa phù hợp: phân biệt presentation trong table (cuộn ngang hợp lệ) với value ngoài table (wrap hoặc vùng xem/copy đầy đủ có tên rõ). Giữ toàn bộ chữ số, dấu, currency; không dùng ellipsis, thu nhỏ font hoặc đổi precision để che lỗi.

Chứng cứ: [Stat tại 320](chromium-fixture-stat-money-320.png), [DetailLine tại 320](chromium-fixture-detail-money-320.png), `amount` trong [stress](stress-fixtures.json).

### A05 — P2 khi có mixed row thật: Status có thể cao theo nội dung bên cạnh

- Owner: [Status](../../apps/web/src/shared/ui/components.tsx#L108) và [SurfaceContent](../../apps/web/src/shared/ui/composition.tsx#L41).
- Fixture SurfaceContent row chứa đoạn văn dài + Status `draft` kéo chip lên **168 px** ở 320; desktop **42 px**. Hai browser cùng kết quả.
- Current source có Status trong các row ở Notifications/Digests/Order/Customer/Dashboard; không phải mọi chỗ đều lỗi. Nhiều consumer đã `alignItems=center`, hoặc dòng peer ngắn, hoặc chip cần wrap nhãn.
- Chọn alignment tại đúng mixed row. Không đặt mọi chip `height:32px`, vì sẽ làm cắt nhãn nhiều dòng/text resize.
- Đây là rủi ro shared đã chứng minh; chưa ghi thành incident 168 px ở route mặc định.

Chứng cứ: [fixture chip](chromium-fixture-status-with-content-320.png), các source row và rationale trong assessment.

### A06 — P3: nội dung động không có điểm ngắt ở Empty

- Owner: [Empty](../../apps/web/src/shared/ui/components.tsx#L137).
- Fixture “Mã tham chiếu” kèm 120 ký tự không có khoảng trắng làm document rộng **702 px** ở viewport 320, trên cả hai browser. CopyableCode với cùng độ dài không tràn vì đã wrap anywhere và wrap flow.
- Bảy consumer Empty hiện tại dùng thông báo hữu hạn; chưa tìm thấy đường đang đưa mã dài này vào Empty của app. Đây là điểm cần bảo vệ khi mở rộng API/consumer, mức ưu tiên thấp hơn lỗi hiện hữu.
- QueryState/ErrorNotice với mã dài được probe riêng: không page overflow trong cases đã chạy; vùng message của Alert có thể cuộn. Không suy mọi payload lỗi server đã được bao phủ.

### A07 — P3: ellipsis của select khi control bị disabled

- Có **64 TextField select** trong source. Một số value dài bị rút gọn tại 320, nhưng popup của các select đang enabled đã cho xem đầy đủ các option được kiểm.
- Trong dialog sửa đơn, địa chỉ demo bị disabled theo nghiệp vụ và value khoảng 345 px nằm trong box 188 px ở 320; tại 768 box 294 px vẫn không đủ. Không có title/description riêng để xem lại toàn bộ nhãn đó trong field.
- Order detail vẫn trình bày `shippingAddressId`; phần nhãn dài ở đây là nhãn tổng hợp của demo, không phải bằng chứng mất địa chỉ thật. Không đổi permission hoặc bật lại field chỉ để xem text.
- Nếu nhãn cần được xem đầy đủ ngay trong dialog, cung cấp text read-only có wrap hoặc phương thức xem/copy được focus. Các select enabled không được đánh đồng với case disabled này.

Chứng cứ: [select-overflow](select-overflow.json), ảnh popup lưu trong artifact; collector cuối đợi opacity=1 và transform scale=1. Probe này không chứng minh mọi nhãn option tương lai vừa menu.

## 3. Nguyên nhân gốc ở toàn bộ hệ thống UI

1. **Gap và alignment là hai invariant khác nhau.** Token 8/12/16/24 px vẫn đúng khi flex row kéo action cao theo helper. Static spacing checks không đo chiều cao nội dung thật.
2. **FormFields/FieldGroup/SurfaceContent là composition tổng quát.** Chúng forward alignItems nếu caller cấp. Default column stretch hợp lệ cho form/surface; caller đổi direction sang row nhưng không chốt cross-axis có thể tái tạo lỗi Toolbar cũ.
3. **Control bị nhầm với wrapper của control.** TextField root gồm input + helper/error. Lookup group còn chứa nhiều field và trạng thái async. Center wrapper không đồng nghĩa center mặt input.
4. **Width của dữ liệu con không được bảo vệ chỉ bằng minWidth:0.** Amount nowrap không bị overflowWrap của ancestor thắng; Panel overflow:hidden có thể giấu mất dữ liệu mà document không tràn.
5. **Các phép thử hiện có chưa khóa invariant cho các owner này.** Toolbar suite đã có naturalHeight của search submit; Orders/Catalog/composition suites chủ yếu giữ gutter, inset, gap, viewport và hành vi. Unit render trong DOM giả lập kiểm metadata/props không thay browser geometry.

Những điểm có thể giữ: SectionGrid/Stats cùng chiều cao card, DataTable cuộn ngang, Inbox preview ellipsis và responsive column stretch có mục đích. Không sửa đồng loạt mọi `normal`, mọi `height`, mọi `overflow:hidden` hay toàn bộ composition default thành center.

## 4. Đối chiếu đủ 16 module

Các cột “đã đo” là case thật trong đợt này, không phải toàn bộ workflow của module.

| Module | Hàm render JSX | Điểm đã đo ngoài route baseline | Nhận định |
|---|---:|---|---|
| workspace | 11 | invite, privacy request | Không thêm stretch action trong cases đã đo; setup/settings form/helper vẫn cần coverage khi payload/permission đổi |
| dashboard | 1 | feedback; Amount source + shared money fixture | Summary Money ngoài table cần A04; card equal-height có chủ đích |
| inbox | 7 | R05/R06 default pane/filter/composer/context | Row composer có center; preview ellipsis và tab scroller có mục đích; không lặp lại mọi message type/pending/role |
| customers | 3 | customer create, service case create | Dialog default không thêm stretch action; DetailLine/Amount liên quan A04 |
| catalog | 5 | category create, editor, import mapping | A02/A03; variant row đã align start, làm reference tốt để tránh kéo icon theo helper |
| inventory | 4 | hai route/filter default | Filters đã nằm ngoài Toolbar form; field-only row không bị coi là action-height bug |
| orders | 5 | create, quantity invalid, edit, return create | A01; summary/quote Money A04; disabled demo select A07 |
| finance | 9 | entry create/detail, journal create, statement import | Field pairs/date rows được đối chiếu; table scroll hợp lệ; KPI/value ngoài table A04 |
| knowledge | 5 | create và k3 draft editor | Không thêm stretch action trong cases đã đo; revision/publish/feedback states không được gọi là đã chạy mới đầy đủ |
| bot | 4 | draft config, evaluation, role assignment, budget | Select dài enabled có popup; chưa thấy thêm action stretch trong dialog cases |
| integrations | 2 | channel disconnect, AI provider create | Popup select đã xem được option hiện hành; rotation/test-provider pending chưa được lặp lại trong audit này |
| reports | 3 | Reports/Marketing baseline | Report grid align start; chart có bảng thay thế. Generated download/lastExport branch dài cần giữ gate sở hữu |
| operations | 3 | default work/approvals/digests, role confirm | Mixed Status row liên quan A05; delegation preview action column có chủ đích |
| notifications | 2 | device revoke, notifications baseline | Mixed content/Status và readonly/quiet-hours cần chốt alignment theo state; không auto thay mọi SurfaceContent |
| fulfillment | 4 | prep, shipment create/detail | ActionGroup wrap; table scroll. Event/handover/pending branch chưa được lặp lại hết trong đợt này |
| procurement | 5 | supplier/offer/rule/purchase/receipt create | Lookup/field-only rows được đọc và đo; hidden selected/offer-error mới cần giữ behavior regression; Money trong detail A04 |

Các app owner ngoài module (Shell, router fallback, CommandRecovery, ScopeEvents, feedback, bootstrap/CSS) cũng nằm trong source inventory. Recovery/revoke/fatal-error không được tuyên bố đã kích hoạt runtime mới chỉ từ việc đọc source.

## 5. Hướng xử lý để giảm tái phát

- Trước thay default shared API, quyết định intent của từng mixed row: field-face alignment, independent action target, helper/error flow và hướng column. Ưu tiên các props hữu hạn đã có và owner thực.
- Xử lý A01, A02 rồi chốt A03; tiếp theo A04 cho giá trị ngoài table. A05 áp dụng tại mixed consumer có bằng chứng; A06/A07 theo nhu cầu dữ liệu/nội dung hiện hành.
- Bổ sung regression tại suite sở hữu cho create/edit order, product editor và import mapping. Phải kiểm natural action geometry và vị trí mặt input, không chỉ `scrollWidth <= viewport`.
- Khóa shared mixed-row invariant bằng fixture có helper nhiều dòng/error/tall group; kiểm resize/refetch/busy/retry và hidden action, hai browser, responsive branch. Không thay bằng snapshot CSS hoặc bắt mọi button đúng 44 px.
- Với Amount: kiểm số hợp lệ dài trong table, metric, summary, DetailLine/dialog. Phân biệt page overflow, local scroll hợp lệ và content bị ancestor cắt; giữ chữ số và precision.
- Khi implementation, chạy các gate và native keyboard/reflow/text resize/browser zoom phù hợp trên source cuối, cập nhật **kế hoạch UI duy nhất** và evidence của batch đó. Các probe tại đây là diagnostic, chưa được nối vào CI hoặc thay suite sở hữu.

## 6. Bằng chứng, tái lập và giới hạn

Raw JSON: [route Chromium](routes-chromium.json), [route Firefox](routes-firefox.json), [state Chromium](states-chromium.json), [state Firefox](states-firefox.json), [select](select-overflow.json), [stress](stress-fixtures.json), [source assessment](component-assessment.json), [metadata cuối](audit-final.json).

Chạy từ Frontend root bằng Node hiện có; preview build demo cần phục vụ tại 127.0.0.1:4173. Các browser context của probe độc lập với tab người dùng. Trên máy này dùng bounded PATH như ghi trong metadata, không thay execution policy/dependency.

```powershell
& 'C:\Program Files\nodejs\node.exe' evidence/frontend-component-risk-audit-20261008/inventory.mjs
& 'C:\Program Files\nodejs\node.exe' evidence/frontend-component-risk-audit-20261008/browser-probe.mjs chromium
& 'C:\Program Files\nodejs\node.exe' evidence/frontend-component-risk-audit-20261008/browser-probe.mjs firefox
& 'C:\Program Files\nodejs\node.exe' evidence/frontend-component-risk-audit-20261008/state-probe.mjs chromium
& 'C:\Program Files\nodejs\node.exe' evidence/frontend-component-risk-audit-20261008/state-probe.mjs firefox
& 'C:\Program Files\nodejs\node.exe' evidence/frontend-component-risk-audit-20261008/select-overflow-probe.mjs
& 'C:\Program Files\nodejs\node.exe' evidence/frontend-component-risk-audit-20261008/stress-probe.mjs
& 'C:\Program Files\nodejs\node.exe' evidence/frontend-component-risk-audit-20261008/assessment.mjs
```

Các attempt collector ban đầu giữ ở `attempt1`, `attempt2`, `stress-initial`, `stress-portal-attempt`: route shorthand sai, exact accessible name, Grow chưa kết thúc và portal-only readiness đã được sửa tại collector. Không chuyển chúng thành PASS hoặc gộp retest vào full run. Các report ở parent là tập cuối đủ expected count.

Đợt này không chạy lại full `npm run verify`, full E2E/build hoặc canonical FE checkpoint. Full verify trước audit exit 0 trên cùng 76 runtime fingerprints là chứng cứ scoped cũ, không phải full run mới và không chứng minh các finding tại đây an toàn. Không sửa tracker/generated plan hoặc hạ assertion.

Browser/native zoom 200%, text-only 200%, speech, hosted CI, Backend/provider thật và nghiệm thu người dùng **không được thực hiện mới** trong đợt audit này. Không ghi PASS cho chúng. Các source và thay đổi có sẵn được giữ; chỉ thêm artifact audit.
