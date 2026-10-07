# Review quy định và quy trình UI trước triển khai

**Ngày:** 06/10/2026. **Chế độ:** audit tài liệu/source chỉ đọc; file này là kết quả review, không là nguồn quy định mới. **Phạm vi:** BotSalesAI React Frontend, API mock tổng hợp. Không sửa runtime, token/contract/generated output, checker, CI hoặc ledger; không chạy build/full E2E.

Nguồn hiện hành đã đọc: `AGENTS.md`, original `AI_RULES.md` Universal 3.1 đủ 411 dòng, `docs/FRONTEND_SCOPE.md`, `docs/PROJECT_CONTEXT.md`, `botsales-kit/docs/02_ARCHITECTURE.md`, `06_API_AND_REALTIME.md`, `18_CODING_STANDARDS.md`, đủ `FRONTEND_SPACING_STANDARD.md` v1.24, shared catalog và toàn bộ plan §16 v15.0. Áp dụng Karpathy Guidelines đã đọc: hiểu trước; giải pháp nhỏ nhất; sửa đúng vùng; tiêu chí kiểm chứng cụ thể.

## Kết luận hiện tại

1. Standard có **75 rule definitions** SPC-001–075; API catalog mô tả 21 component +6 compositions. Đây là độ bao phủ tài liệu được quan sát, không phần trăm UI hoàn chỉnh.
2. Quy định đã đủ các nhóm chủ đạo: một nguồn token, units, semantic owner, responsive/profile, closed API, behavior/contract, impact/regression, browser/reflow/native200, provenance và honest closure. Không cần thêm một bộ ID/rule song song để thống nhất.
3. Vẫn có wording lịch sử chưa được gắn nhãn, lặp quy trình ở nhiều file và dependency gây nhập nhằng. Chỉ nối thêm footer “quy định bắt buộc hiện hành” chưa giải quyết những đoạn đang trái nghĩa trong body.
4. “Không bỏ sót code UI” phải đo bằng inventory mọi file/source entry được app sở hữu hoặc import và outcome phân loại; 27 shared exports hoặc 68 TS/TSX không tự là toàn bộ UI. File không có JSX vẫn có thể quyết định geometry/visual/state.
5. Lượt này chỉ nên sửa policy/workflow/catalog target contract và thứ tự kế hoạch. Runtime shared APIs hiện hành và target contracts phải ghi rõ riêng; không tuyên bố đã thay code hay đóng hardening.

## Findings cần sửa trong tài liệu

Line references dưới đây áp dụng snapshot đã đọc, trước chỉnh tài liệu lượt hiện hành.

| ID / ưu tiên | Nguồn | Vấn đề, điều kiện và tác động | Hướng xử lý nhỏ nhất |
|---|---|---|---|
| G01 / P0 | standard:284, SP-G09 | Gate đang ghi `planned W26–W27 and NOT_RUN until evidenced` mặc dù đầu file:5 và package `verify` đã có visual gate. Tác giả có thể hiểu visual scan chưa tồn tại và chỉ source review. | Giữ acceptance SP-G09, thay cột trạng thái bằng existing checker + limitations/hardening planned; kết quả run lấy REPORT theo hash, không gán PASS từ wording. |
| G02 / P0 | standard:315 | Mở đầu §13 nói strict checker đang chặn source debt tới khi migration hoàn tất, trái current scans0 ở đầu file. | Giữ policy hiện hành; tách sentence debt thành HISTORICAL_SNAPSHOT hoặc bỏ status khỏi normative section. |
| G03 / P0 | coding standards:183–185; standard:340/352 | CODE-025 cho giữ verdict task khi global debt đỏ mà không giới hạn thời kỳ; current SPC-039 và cuối SPC-045 yêu cầu strict toàn scope PASS sau W26. | CODE-025 route đến current DoR/DoD; migration-debt permission chỉ là lịch sử, không đường đóng runtime task mới. |
| G04 / P1 | standard:30–48,292–300 | Baseline65 TS/TSX và các migration targets “chưa phải source đã sửa” dùng current tense trong body trong khi top/§15 nói đã migration. | Đánh dấu cả §2 và §11 là baseline/targets lịch sử; giữ số/data để trace, không sửa bằng số mới hoặc xóa evidence. |
| G05 / P1 | standard:354, SPC-046 | Policy yêu cầu checker future W26–W27, và fallback “trong khi checker chưa có”; current checker tồn tại nhưng có bypass. | Giữ yêu cầu kỹ thuật đầy đủ; diễn đạt “gate hiện có phải gia cố phần còn thiếu”, bắt source review bổ sung cho unsupported path; không review thay strict FAIL. |
| G06 / P1 | standard:362,410 | SPC-050 và checklist ghi SPC-033–063 còn hiệu lực; file hiện hành là001–075. Không thực sự hủy064–075 nhưng range cũ tạo khả năng bỏ đọc. | Dùng range001–075 hoặc link section hiện hành; không thêm ID mới. |
| G07 / P1 | AGENTS:11–19; scope:3,7,25,57; coding:172–213; README:5,97,100; UX:30–33 | Nhiều chỗ chép UX contract/spacing/zoom/impact/process/numeric values dù SPC-074:495 yêu cầu source duy nhất. Khi thay rule, các bản rút gọn có thể lệch. | AGENTS giữ scope/canonical pointers + đường vào workflow/catalog; các docs khác chỉ ghi vai trò riêng và mapping CODE→SPC. UX giữ behavior intent, catalog giữ current typed API; token numbers normative ở standard/token source. |
| G08 / P1 | standard §12, §13.1, §13.2; plan §16.7; catalog steps1–5 | Ít nhất năm bản workflow/checklist cùng mục đích, độ dài khác nhau. Checklist chứa nhiều items lặp contract/baseline/mapping/impact; AI khó biết bản nào quyết định đóng. | Một workflow canonical + evidence field checklist ở standard; các nơi còn lại link vào workflow. Giữ các SPC rule nghĩa đầy đủ để reference, không tạo checklist thiếu điều kiện. |
| G09 / P1 | plan:2268–2275; AI_RULES:246–252 | SPECIFIED/IMPLEMENTED/VERIFIED_SCOPED và DELIVERED_WITH_EVIDENCE_LIMITS trộn mức tiến độ, kết quả kiểm và trạng thái bàn giao. Có nguy cơ dùng IMPLEMENTATION_COMPLETE_WITH_LIMITS để đóng mandatory check thiếu. | Tách task progress, check verdict và handoff disposition; acceptance vẫn bốn nhóm ĐẠT/CHƯA ĐẠT/CHƯA XÁC MINH/KHÔNG ÁP DỤNG của Universal. Mandatory NOT_RUN/UNKNOWN không DONE. |
| G10 / P1 | plan:2249,2255,2258 | S13 P2 gồm readability/lifecycle/offset review nhưng S19 phụ thuộc S11–18, biến cải tiến tùy chọn thành prerequisite đóng tất cả P0. | Tách quyết định audit mọi export bắt buộc khỏi runtime cleanup tùy chọn; nonessential readability chỉ làm vùng đang sửa. Mandatory defect được reprioritize theo bằng chứng, không bỏ task hoặc ép dummy consumer. |
| G11 / P0 | plan:2138–2143,2151–2185; standard:507 | 68 TS/TSX và27 exports là inventory cụ thể, chưa định nghĩa denominator tất cả style/entry. App UI và feature-local reusable wrappers nằm ngoài catalog. | Inventory discovery toàn boundary; mỗi file phân loại, hash, owner, route/use path, gate status; empty/missing/unsupported→UNKNOWN/FAIL. Audit phải xét shell/AuthCard/feedback/CommandRecovery/routes/charts/panes, CSS/HTML/generated/test tooling, không chỉ shared/ui folder. |
| G12 / P1 | catalog:18,45,66–72; standard:477–491 | Catalog phát biểu gate “từ chối prop ngoài API” và generic closure trong khi audit đã chứng minh aliases/wrappers/value paths còn hở. Footer có limitation nhưng body vẫn tuyệt đối. | Tách CURRENT_API typed contract và CURRENT_GUARD_WITH_LIMITS; target enforcement gắn plan task, không diễn đạt đã khóa mọi path. Không mở rộng props để tránh hardening. |

CODE-016 cho CSS/sx theo token và SPC-061 cấm dựng lại sáu standard composition **không phải mâu thuẫn** nếu dùng đúng scope: primitive/native/geometry nghiệp vụ được giữ local; quan hệ sáu role chuẩn phải đi qua semantic owner. Cần giải thích rõ distinction này, tránh buộc mọi Box/Stack thành shared wrapper. SPC-008 liệt kê radius8/12/16 là ví dụ geometry, không được biến thành closed radius scale: canonical tokens còn bubble20/large24/hero32/pill999.

## Một workflow canonical đề xuất

Ghi tại standard §13.1, các docs khác chỉ link. Không tạo workflow file/tracker riêng. Mỗi task dùng artifact/evidence hiện có; task nhỏ ghi ngắn, task shared có inventory/impact sâu tương xứng.

| Thứ tự | Đầu vào và việc bắt buộc | Đầu ra có thể kiểm |
|---|---|---|
| 1. Xác minh phạm vi/source | Mode docs-only/implement; dirty diff; original rules; current plan; canonical manifest/OpenAPI/tokens; import/style boundary và owner. | Phạm vi sửa/loại trừ, current inventory và hashes; conflict sources được xử lý đúng authority. |
| 2. Chốt UI contract/baseline | User role/job/outcome; action→observable result; route/profile/reference; state/variant áp dụng; geometry/spacing owner; before baseline trước source edit. | Một contract trong task evidence; N/A có lý do; baseline provenance hoặc declared missing paired proof. |
| 3. Chọn owner và impact | Reuse shared invariant; geometry/domain giữ đúng module; variant mới chỉ có consumer thật; token/type/catalog/checker dependency; routes/import closure. | Existing/target API khác nhau được ghi; consumer/route/state matrix và acceptance trước viết code. |
| 4. Sửa đúng nguyên nhân | Bug fixture→minimal source edit→fixtures; một writer shared foundation; explicit finite props; không generic overrides/dependency speculative; backward behavior/draft/query/permission giữ nguyên. | Diff trace về requirement; unresolved source/value không tự tin; prerequisite Frontend tự xử lý. |
| 5. Kiểm nguồn và API | Generator, source/boundaries/lint/type/unit/domain/build phù hợp; strict spacing/visual/composition, positive/negative/UNKNOWN/parse fixtures; policy/evidence gates khi đã triển khai. | Commands/cwd/exit và final hashes; expected scope bằng scanned scope; unauthorized finding/unknown→FAIL, không `--report` làm PASS. |
| 6. Kiểm render/hành vi | Đúng route/main heading/readiness/state/min observations; mọi affected route nhỏ/lớn; profile boundary widths; action/draft/focus/hit; native200 methods riêng theo impact. | Expected/observed theo contract; valid internal scroll; behavior không no-op; không zero-groups PASS. |
| 7. Đồng bộ và bàn giao | Catalog/mapping/fixtures/docs/pointers khớp owner; current hashes, UI/ARCH verdict riêng; task progress/handoff rõ; FE ledger chỉ cập nhật từ nguyên-task evidence. | READY_FOR_ACCEPTANCE khi mandatory AI proof đủ; DELIVERED_WITH_EVIDENCE_LIMITS giữ missing proof mở; owner acceptance không tự ghi. |

### Coverage index để giữ đủ75 IDs mà không chép thêm quy định

Các nhóm dưới là index, không bộ quy định thứ hai. Mỗi ID xuất hiện đúng một lần trong index này; normative text vẫn tại standard.

| Nhóm đọc | IDs |
|---|---|
| Nguồn/phạm vi/tính trung thực/closing | 001,002,009,032,040,047,050,054,064,074,075 |
| Contract/profile/baseline/UX | 033,041,044,048,049,051,052,060,070 |
| Token/units/geometry/visual | 003,004,006,008,010,025,027,043,046,069 |
| Ownership/component/workflow layout | 005,007,011,012,013,014,015,016,017,018,019,020,021,022,023,024,026,061,062,068 |
| Reuse/lifecycle/shared API/source provenance | 034,035,042,053,065,066,067,073 |
| Escape hatch/exception/gate amendments | 028,036,037,072 |
| Impact/verification/regression | 029,030,031,038,039,045,055,056,057,063,071 |
| Contract query/action behavior | 058,059 |

## Định nghĩa “không bỏ sót code UI” trước rollout

Phạm vi được inventory phải được tự phát hiện, không pin 54routes/68sources/27exports thành allowlist vĩnh viễn. Đối chiếu file discovery với import graph, route manifest/implementation mapping, TS config và style/assets imported.

| Category | Ví dụ/điều cần giữ | Verdict inventory |
|---|---|---|
| CANONICAL | tokens JSON, theme/layout/visual/shared implementations | Owner/unit/API consumer và source gate rõ |
| CONSUMER | app/module JSX, local wrappers/slots, chart/pane code, native forms, route fallbacks | Profile/role/route/state và gate verdict |
| STYLE_ENTRY | bootstrap.css, native/inline style, styled/GlobalStyles, imported CSS, index.html UI metadata/style | Source/style closure hoặc UNKNOWN fail; không dựa riêng extensionTSX |
| GENERATED | generated tokens/contracts/CSS, build/demo artifacts | Source→generator→outputs; freshness/isolation gate; không sửa tay |
| TEST_TOOLING | checker/fixtures, unit/component/browser tests, mock UI state datasets, runner/readiness/evidence collectors | Verification owner/scope riêng; không tính test-only như product consumer |
| REFERENCE_HISTORY | prototype HTML, old screenshots, dated logs/baselines, full-product kit docs/trackers | Không migrate như runtime source; giữ readonly/quyền riêng và historical label |
| THIRD_PARTY | node_modules/library internals, browser native controls | Không giả application-owned; version/behavior probes theo rủi ro, không blanket exemption application styles |
| UNCLASSIFIED | New extension/source outside known graph, unresolved dynamic styling/import | UNKNOWN; điều kiện inventory chưa đủ, không nhận “toàn bộ sạch” |

Mẫu số đúng là **tập file phát hiện = tập file đã phân loại**; **tập consumer ảnh hưởng = tập routes có verdict**; **tập branch áp dụng = tập branch có case hoặc N/A reason**. Generated/library/reference đã phân loại không bị xóa khỏi inventory, chỉ qua gate thích hợp. Đây là mục tiêu planned để tooling hiện hành thực thi; review này không nhận đã bao phủ chính xác mọi file trong repo.

## Thứ tự rollout khuyến nghị

1. P0: hợp nhất thẩm quyền/workflow/status/current-vs-history/catalog target contracts; kiểm75 IDs, anchors, rule mappings và inventory scope spec. Giữ runtime nguyên trạng.
2. P0: scope/parser fail-closed và resolver/provenance, canonical writes, style/value entry coverage; chuyển các bypass tái hiện thành permanent fixtures. Không viết interpreter hay framework gate lớn.
3. P0/P1: closed API/value/variant/geometry và boundary/indirect composition ownership; positive fixtures giữ valid `as const`/native/ref/ARIA và distinct nested surface.
4. P0: chụp baseline fresh rồi sửa Finance header–body owner; P1: QueryState geometry theo consumers thật và intrinsic control role; giữ các state/behavior/API.
5. P1: policy/evidence validators nhỏ, collector readiness/min observations/profile/state/variant, source/browser wiring với current scope matrix; local equivalent không cần hosted/owner prerequisite.
6. P0: all affected consumers source/render/action/draft/focus/native200 checks, build/demo isolation và full E2E theo impact nguồn cuối; failure/retest ghi riêng.
7. P0: closure/diff/hash/rule/catalog matrix và handoff. P2 cleanup chỉ khi có defect/rationale rõ hoặc thuộc owner đang sửa; mọi export được review, không tạo artificial consumer hoặc component chỉ đổi tên.

Thứ tự này giữ mục tiêu Karpathy: hiểu trước, giảm nguồn hướng dẫn trùng, sửa guard có proof, sửa owner thay vì symptom, test invariant thực, không KPI số dòng/component/rule hoặc hứa không lỗi.

## Kiểm tra thực hiện trong review này

- Đọc/số dòng/line references của nguồn hiện hành; original Universal giữ nguyên.
- Regex anchored rule definitions xác nhận75, không duplicate definitions quan sát được.
- Mapping index đã được đối chiếu 001–075; một ID045 được bổ sung khi bước kiểm ban đầu phát hiện thiếu. Không giấu audit feedback.
- Manifest/package scripts được đọc để phân biệt existing commands với policy/evidence validators mới đang planned.
- Không chạy generator/build/full E2E/native zoom; review không nhận các gate đó PASS. Không claim current UI full conformance/Enterprise100%, không ghi checkpoint hoặc acceptance.
