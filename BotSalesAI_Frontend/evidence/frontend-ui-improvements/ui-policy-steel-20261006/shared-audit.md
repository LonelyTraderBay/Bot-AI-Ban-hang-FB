# Audit shared UI và ownership khoảng cách — 06/10/2026

Phạm vi: đọc toàn bộ `apps/web/src/shared/ui` và các consumer React/TypeScript trong `apps/web/src`, sau đó chạy read-only Chromium diagnostic trên demo5173 hiện có; không sửa sản phẩm, không chạy build/full E2E ở audit này. Áp dụng Karpathy Guidelines: xác minh trước, giải pháp nhỏ nhất, thay đổi đúng vùng, tiêu chí kiểm chứng cụ thể. Số liệu dưới đây là source hiện hành và diagnostic có phạm vi rõ, không dùng snapshot cũ để chứng nhận Enterprise readiness.

## Cách đo và kết quả

- AST từ TypeScript 5.9.2 qua `auditComposition(process.cwd())`: **68 TS/TSX, 28 TSX, 16 module**, current composition checker **PASS, 0 finding**. Đây là source-check verdict, không phải browser verdict.
- Đọc tất cả declaration/export trong `components.tsx`, `composition.tsx`, `layout.ts`, `theme.ts`, `visual.ts`; đọc import/JSX consumers, catalog, standard, fixtures và browser guard.
- Có **27 exported shared UI functions**: 21 component và 6 composition. **25/27 có JSX consumer trong source sản phẩm**; hai component chỉ có test consumers. Không quy đổi 25/27 thành tỷ lệ chất lượng.
- **176 JSX uses của sáu composition**; tổng 27 tên shared UI có 1.108 JSX uses theo collector hiện hành, bao gồm use nội bộ shared. Đây không phải DOM instance hoặc số màn.
- `layoutSx` có **112 named roles / 25 groups**. Tất cả 112 có reference trong source, gồm shared owner; một số role chứa geometry/shape, không phải 112 giá trị khoảng cách khác nhau. `layoutCss.table.cellInset` là bridge CSS khác đơn vị.
- Tất cả 19 tổ hợp variant được ghi rõ ở JSX hiện có ít nhất một consumer; không phát hiện variant explicit hoàn toàn không dùng. Các default bỏ qua prop vẫn là consumer thật.
- SHA-256 snapshot: components `37bf476acb7a9f63fd34ea7125b71478c74bef553997cc5bc2feaca8fe240d11`; composition `691ded7d29ab7c0584c7f50bb5edd0be72ecf3b47474eaf448a104cab933fd2b`; layout `1a0126cb58ae7ff086070289307659e1868b3a071bc7a583b3c8d017509ccb11`; theme `dfb131b7987db08c66df78d349e93175663bcc55e3e633e151c59dfaa1d67532`; visual `ed147658a55cdd9c011a81aba50870ecce3ae1c7e81e92c2b712740ea112c89d`.

## Inventory đủ 27 component, API và invariant

Số use là JSX trong `apps/web/src`, có thể gồm consumer nội bộ shared; đường dẫn/line tại snapshot này. Tất cả dòng của 21 component đầu thuộc `apps/web/src/shared/ui/components.tsx`; sáu dòng cuối thuộc `composition.tsx`.

| Component | Line | Uses | API/ownership và invariant cần giữ |
|---|---:|---:|---|
| PageHeader | 20 | 49 | title/subtitle/actions/eyebrow; một h1; title-description8, columns16, after24, action8; responsive tự nở |
| Panel | 39 | 91 | title/subtitle/action, bodyMode flush/inset, semantic before/after, finite geometry; h2; header pb16, body sau header không thêm pt |
| Stat | 68 | 20 | title/value/note/accent/icon; KPI là p, không heading; inset16/24, value12/note8 |
| Stats | 77 | 5 | children; grid 1/2/4 cột, gap16, standalone after24; parent flow sở hữu boundary nếu được nested |
| Amount | 80 | 48 | Money/null/undefined; locale/unknown semantics, numeric alignment; không state/network |
| CopyableCode | 83 | 3 | value/label; copy có feedback copied/failed, accessible icon44; wrap mã và gap4 |
| Status | 108 | 68 | value; mapping trạng thái/palette tập trung, label vẫn đọc được, text dài wrap |
| DataTable | 120 | 47 | typed columns/rows/rowKey/empty/label; named/focusable region, keyboard horizontal scroll; cell12×16; nghiệp vụ columns ở module |
| Empty | 137 | 7 | text/action; status polite, inset32/48 dọc và16 ngang, gap16; tránh nested inset trùng |
| QueryState | 141 | 86 | pending/error/data/fetch/refetch; không biến error thành empty; stale giữ data; loading geometry phải đúng profile |
| ErrorNotice | 167 | 88 | error/fieldLabels; status/error semantics, unknown/conflict/422 guidance; focus invalid control, không mất draft |
| Toolbar | 202 | 22 | operation/placeholder/extra/cursorParam; search chỉ hiện khi OpenAPI có q; Enter/IME/clear/cursor semantics; inset16/gap12 |
| Pager | 236 | 36 | Page/cursorParam; cursor/Back/deep-link; disable đúng trạng thái; inset16/action8 |
| LookupLoadMore | 246 | 22 | count/hasMore/busy/handler/label; không báo đã tải đủ khi còn trang; row gap8/inset8/top4 |
| RouteLink | 260 | 64 | to/children; RouterLink native navigation semantics qua MUI; target theo theme |
| MutationButton | 264 | 107 | permission/allowedActions/action/busy/type/color/variant/disabled/handler; pending/offline/capability gate; không fake success |
| EditDialog | 291 | 48 | open/title/description/children/actions/busy/dirtyGuard/draftCommit; focus/return/close/scroll, draft scope, discard confirmation; viewport16/32, content16/24/action8 |
| PartialDataNotice | 437 | 0 | status info, named notice boundary16; có test consumers, chưa có production consumer |
| CapabilityUnavailable | 441 | 0 | status info/i18n; có test consumer, chưa có production consumer |
| ConfirmDialog | 445 | 23 | promise confirm/error/busy/reason; tối thiểu5 ký tự khi bắt reason; success mới close, rejection giữ error |
| DetailLine | 462 | 98 | label/children; row inset12, gap16, value wrap/right, divider; không tự thành schema engine |
| FormFields | 29 | 72 | gap16; flush/inset/outlined; native form/ref/submit/noValidate/draft; before surface16/after section24 |
| FieldGroup | 36 | 28 | gap8; flush/toolbar; direction/align/wrap responsive, geometry đóng |
| SurfaceContent | 41 | 28 | gap12; flush/inset/insetDivider/compactOutlined/compactControlOutlined; radius12/8 variant có consumer |
| ActionGroup | 50 | 25 | gap8, row default/wrap; header/flush, named boundary variants; DOM order/busy target phải giữ |
| PageSections | 59 | 9 | gap24; responsive direction, before section/shrinkChildren; inset của Panel không bị thay |
| SectionGrid | 71 | 14 | gutter24, content rhythm12; columns/geometry theo workflow, shrinkChildren; không prop gutter generic |

## Điểm mạnh cần giữ

1. Một token/theme/bridge, factor nội bộ sinh từ base8; route chọn semantic owner. Type và scanner kiểm đơn vị, canonical source và raw literals.
2. Sáu composition có API đóng; spacing không nhận generic sx/style/className. Explicit forwarding bảo vệ ref, form submit, draft và aria đã khai báo; React19 ref API đúng version hiện hành.
3. Role cho inbox/reports/dashboard thể hiện mật độ khác nhau bằng semantics. Đồng nhất không có nghĩa ép mọi workflow thành cùng gap.
4. Module giữ schema/quyền/mutation/columns, shared không import module. Không universal form/table engine, không primitive wrapper chỉ đổi tên.
5. Existing tests có native form/ref, heading semantics, dialog/focus/draft, query/clipboard/cursor và source negative fixtures. Browser guard thực sự đọc main h1 và chờ loading xong; không lấy sidebar heading làm nội dung route.

## Findings và hướng sửa nhỏ nhất

### SH-01 / P1 — Có code và tài liệu chưa khớp header–body16

**Nguồn:** SPC-014 trong standard; Panel tại components:49–64; layout:68–72. Panel title header có pb16; `bodyMode=inset` đúng vì body dùng px/pb, không pt. Nhưng finance:105 (`Kỳ báo cáo`) và finance:153 (`Chi tiết kết quả kinh doanh`) để Panel mặc định flush rồi thêm Box surface.inset làm body đầu tiên. Finance:155–156 (`Hỏi đáp có nguồn`) có FormFields bodyMode=inset sau header.

**Đã kiểm browser:** [diagnostic](shared-panel-browser-diagnostic.json) gồm R20/R22/R13 tại390/806/1440 px (9 route observations), đợi main h1 và query loading kết thúc, expected finance title visible và fonts.ready. Cả ba first-body case có mép từ last visible header child đến first body child **32px ở390 và40px ở806/1440**, expected16; body padding-top16/24 và header padding-bottom16. Source hash trước/sau không đổi; page error0/API write0. Đây là **CONFIRMED_SPC014_MISMATCH** trên ba case đã đo, không tự suy toàn bộ Panel91 uses đều sai. Khi mobile header action xếp dòng, title-cluster gap lớn hơn vì có action ở giữa; không dùng riêng số đó để kết luận duplicate inset. Orders:176 có Box inset sau DataTable làm totals slot; không quy cùng lỗi vì nó không phải body đầu tiên sau header. Explanation box finance:162 có border/nhóm riêng; không tự gọi mọi nested inset là lỗi.

**Sửa:** chốt canonical Panel inset/body-slot rule cho first content; migrate ba consumer đúng owner và giữ bordered sub-surface/collection slot hợp lệ. Đồng bộ SPC-062/catalog đang cho phép composition inset trong titled Panel flush để không mâu thuẫn SPC-014. Fixture + browser đo mép header/body ở có/không subtitle, mobile/desktop; giữ draft/report behavior.

### SH-02 / P1 — Query loading geometry chưa tuân SPC-024

**Nguồn:** QueryState components:155 hardcode minHeight240 cho pending branch; 86 JSX uses. SPC-024 nói không dùng một min-height240 chung cho mọi query nhỏ. Existing unit tests chứng minh loading state render; không đo layout shift/độ phù hợp từng consumer.

**Sửa:** kiểm các real query slot trước, chọn số ít named loading profile/variant đủ dùng và đặt geometry ở đúng owner; default chỉ khi có rationale rõ. Đo loading→loaded trong full-page/panel/inline/dialog consumers. Không kết luận CLS lỗi khi chưa đo; không tạo skeleton framework hoặc config engine.

### SH-03 / P1 — Quy tắc sáu owner có phạm vi cưỡng chế chưa đủ

**Nguồn:** check-ui-composition:102–106 chỉ bắt raw Stack/Box dùng sáu role. JSX Link dashboard:59–61 vẫn dùng actions.inlineGap, trong khi SPC-061 viết role này đi qua ActionGroup. Đây là intrinsic icon/text content của link, không phải nhóm nhiều action; wrap cứng thành ActionGroup có thể làm sai navigation semantics.

**Sửa:** phân biệt group-gap với intrinsic-control content-gap tại canonical owner/theme, migrate hoặc ghi scope owner hợp lệ cùng fixture; cấm đổi tag Paper/div/custom wrapper để né quy tắc. Không thêm exemption rộng theo module. Prototype in-memory `inspectComposition` nhận raw div role và nested wrapper cases với0 issue; các gate khác có thể bắt đơn vị/style nên không tuyên bố tất cả pipeline đều bypass từ một checker.

### SH-04 / P1 — Double-inset gate chỉ hiểu một phần source shape

**Nguồn:** check-ui-composition:92–98/:133–142. `Panel bodyMode="inset"` + direct FormFields inset được bắt; fragment và conditional child vẫn được bắt khi parent literal. Probe `bodyMode={true ? 'inset' : 'flush'}` + FormFields inset trả0 issue. Wrapper có inset rồi nested FormFields inset cũng0; vấn đề ownership phụ thuộc ý nghĩa biên/nền nên không thể cấm mọi nested inset.

**Sửa:** resolver hẹp cho static literal/const/conditional; unknown ownership ở boundary cần verdict UNKNOWN và render evidence. Phân biệt neutral wrapper và bordered surface có mục đích; thêm fixture đúng mẫu và kiểm route impacted. Không xây symbolic execution cho toàn React.

### SH-05 / P2 — Geometry/flow API chưa đồng nghĩa finite value validation

**Nguồn:** composition:7–18/:63–68 dùng Responsive/CSSProperties/MUI StackProps; geometry keys đóng. Checker:119–128 chỉ kiểm top-level geometry keys, không kiểm breakpoint nested keys hay values. Probe width `{foo:'100%'}` có0 composition issue; TypeScript thường bắt literal này, nên đây là khoảng trống checker, không chứng minh source hiện hành đang sai. `justifyContent=space-between` có consumer thật và tạo distributed space ngoài CSS gap.

**Sửa:** fixture/type-contract cho breakpoint key/unit/value shape và prop values thật cần dùng; bỏ unknown function/spread/any casts. Ghi contract tách minimum gap khỏi alignment/distribution; browser đọc actual edge distance khi profile cần, không lấy computed gap làm khoảng trống thị giác duy nhất. Giữ responsive direction/alignment cần workflow, không khóa mọi group cùng hướng.

### SH-06 / P2 — Browser guard chưa chứng minh mọi component/variant/state

**Nguồn:** ui-composition-layout.spec.ts:16–58 lặp54 canonical paths×390/1440; chỉ chọn `[data-ui-composition]` trong main; đọc gap, vertical child margins, main padding/overflow. Dialog portal và state chỉ có sau tương tác không nằm trong capture mặc định. Final observedOwners assertion chứng minh sáu tên xuất hiện ít nhất một lần trong toàn bộ run; không chứng minh mỗi variant/state/route action đã chạy. Pairs không-ready baseline phải tiếp tục giữ giới hạn.

**Sửa:** consumer/state matrix từ import graph + manifest; thêm targeted real dialog/loading/error/permission/long-text/expanded state, native form/ref/draft, focus/hit testing, zoom/text resize trên đúng impacted consumers. Không cần một Storybook hay thêm toolchain chỉ để đủ checklist; reuse browser harness/test hiện có.

### SH-07 / P2 — Component lifecycle chưa có production-use disposition

**Nguồn:** PartialDataNotice:437 và CapabilityUnavailable:441 không import/JSX trong source sản phẩm; có unit/state tests (`components.test.tsx`:199 và `states/fe023-state.test.tsx`:96), có catalog.

**Sửa:** quyết định có nhu cầu production thực thì tái dùng đúng state; nếu không, ghi loại bỏ/thu hẹp theo task. Không tạo consumer giả để làm counts xanh, không tự xóa test đang đóng vai trò bằng chứng. Gate lifecycle phải phân biệt production consumer, test consumer và internal shared consumer; không gộp chúng.

### SH-08 / P2 — Độ dễ đọc cần cải thiện có giới hạn

**Nguồn:** composition hiện có8 lines dài hơn300 ký tự; dài nhất1.318. Lặp explicit metadata/geometry forwarding giúp scanner hiểu source, không tự thành lỗi kiến trúc. Existing components file466lines gồm behavior/draft logic thật; số dòng không chứng minh phải chia file.

**Sửa:** khi chạm owner, trình bày JSX/array rõ nhiều dòng và giữ explicit forwarding; type tên rõ. Chỉ extract helper nếu gates vẫn kiểm nó và giảm bề mặt lỗi thật. Không refactor hàng loạt adjacent modules vì style sở thích, không làm library nội bộ với nhiều tầng.

### SH-09 / P2 — Các offset và reset cần scope minh bạch

**Nguồn:** EditDialog:423 close IconButton có right12/top12 literal; layout childBoundaries:59 reset dọc tất cả direct children; exceptions registry còn skip-link padding12px có lý do/triggers hẹp. Theme cũng có numeric geometry native MUI (InputLabel calc28, stroke/focus/border), khác spacing giữa nội dung.

**Sửa:** quy định rõ semantic content inset/boundary vs geometry hit-target/plot/native-control offset, không làm tròn mọi tọa độ. Nếu offset12 là inset chuẩn thì chuyển đúng token/role và kiểm title dài/focus/zoom; exception skip-link chỉ đóng khi canonical CSS role + visible≥44/focus/activation được regression. Reset margin là ownership hỗ trợ, không bằng chứng child không còn khai báo spacing sai.

### SH-10 / OBSERVED — Boundary imports được đo, không tái phát lỗi dính label ở trạng thái này

[Diagnostic](shared-panel-browser-diagnostic.json) R13 tại806/1440 đo banner-bottom→visible floating label-top15px, banner→control border24px.390 collapsed đo banner→demo toggle24px; role selects tồn tại trong DOM nhưng display-none nên không tính negative gap của hidden rect. Probe đầu ghi hidden label -184; được giữ dưới rawHiddenDomProbe với disposition INVALID_MEASUREMENT_HIDDEN_NODE và thay bằng phép đo có visibility guard. Khi mở local demo disclosure390, label85/control border94 tính từ banner vì toggle và caption nằm giữa; không gọi khoảng này là gap24 của hai nhóm kề nhau.

Kết quả chứng minh boundary cụ thể ở viewport/state đã chạy. Không thay native zoom/text resize/focus-hit testing hoặc mọi route/state. Invariant cần giữ trong rule: browser collector phải đợi route content thật và loại hidden/loading node trước khi đo; finding metadata phải chỉ rõ mép nào được so, không suy spacing từ số CSS gap đơn lẻ.

### SH-11 / P2 / NEEDS_REGRESSION — Imperative validation metadata cần kiểm cleanup

ErrorNotice components:174–189 đặt `aria-invalid=true` và focus input khi có422. Khi error không còn, effect trả về sớm; không có cleanup cho metadata vừa được shared notice thêm. Existing state tests:41–51 kiểm field được marked/focused và draft giữ nguyên nhưng chưa thấy case422→clear/success→field valid. React/MUI/RHF có thể tiếp tục sở hữu attribute nên **chưa xác nhận mọi workflow giữ stale aria-invalid** chỉ từ source.

Thêm regression transition trên consumer thật trước. Nếu tái hiện, quản lý ownership/cleanup của imperative attribute tại ErrorNotice hoặc field validation owner, giữ giá trị invalid thuộc validation khác; không reset toàn bộ form DOM và không tạo form state thứ hai. Điều này là lifecycle/invariant của shared behavior, không spacing source finding.

## Đề nghị kế hoạch và tiêu chí đóng

1. Chốt source→role→owner→consumer hierarchy, typed API và phân loại geometry/spacing; sửa mâu thuẫn SH-01/02/03 trong tài liệu trước JSX migration. Kết quả: một nguồn hiệu lực, không policy song song.
2. Khóa gate với fixture hẹp SH-03/04/05 và lifecycle SH-07; đo deliberate-invalid cases phải FAIL, positive workflow phải PASS. Nối vào verify và CI check đã có; có config không chứng minh remote branch protection/hosted run.
3. Sửa ba first-body inset consumer và query profiles sau intake/browser baseline hợp lệ. Giữ contract/mutations/cursor/draft/permissions; không đổi Backend/API chuẩn.
4. Lập shared import/route/state matrix, kiểm impacted rendered states theo SH-06; actual geometry, readable text, focus/hit-testing, reflow, native zoom/text resize là phép thử riêng. Route chưa chạy NOT_RUN; không claim toàn hệ thống từ mẫu.
5. Regenerate/check hashes/evidence trên source cuối; đóng task khi tất cả acceptance áp dụng có bằng chứng. Không sửa FE/full-product ledger từ docs/source-count, không tự owner acceptance hoặc readiness label.

“Tuân thủ100%” có thể là yêu cầu bắt buộc cho mọi thay đổi và phạm vi acceptance đã định nghĩa. Source hiện hành và một finite test suite không chứng minh mọi AI/branch/state tương lai đều không thể sai hoặc bỏ qua lệnh. Quy định thép phải là policy rõ + gates fail closed + runtime evidence + delivery constraints thực sự được xác minh.
