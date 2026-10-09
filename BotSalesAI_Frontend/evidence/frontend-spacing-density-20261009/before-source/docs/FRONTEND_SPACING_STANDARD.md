# Quy định khoảng cách và bố cục Frontend

**Normative policy:** workflow §0 and SPC-001–075 in this file are the single UI rules source. This document does not store rollout status; current step status and evidence live only in [plan §16.6](FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status). A scoped gate pass is not whole-app UI acceptance.

**Nguồn chuẩn:** workflow §0 và SPC-001–075 là normative UI policy duy nhất. `REPORT`/evidence giữ kết quả có hash; plan §16.6 giữ tiến độ. Gate PASS không tự chứng minh toàn bộ giao diện đạt chuẩn.

**Phiên bản:** 1.28 · **Ngày:** 07/10/2026 · **Phạm vi:** toàn bộ mã/cấu hình/đầu vào phục vụ React UI trong checkout Frontend và import closure của nó. SPC-001–075 giữ ID ổn định. [Quy trình thống nhất](#unified-workflow) là đường thực hiện duy nhất; [shared catalog](../apps/web/src/shared/ui/README.md) mô tả CURRENT/TARGET contracts; [plan §16](FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan) quy định thứ tự và trạng thái; [§16.17](FRONTEND_UI_IMPROVEMENT_PLAN.md#preimplementation-review-20261007) giữ rationale của review trước source.

<a id="unified-workflow"></a>

## 0. Hợp đồng và quy trình UI thống nhất

### 0.1. Một nguồn cho mỗi quyết định

| Quyết định | Nguồn có hiệu lực | Các nguồn khác làm gì |
|---|---|---|
| Quyền và scope | Người dùng, AGENTS hiện hành, FRONTEND_SCOPE, original AI_RULES | Không tài liệu tự sinh nào mở thêm quyền Backend/deploy hoặc giả approval |
| Route/data/action/permission/state | Canonical contracts/manifest và UX-CONTRACT | Mock/UI thể hiện trung thực; không tự bịa API hoặc persistence |
| Giá trị thị giác nguyên tử | ../botsales-kit/design/tokens.json | Generator sinh output; consumer không tạo bảng số mới |
| Runtime mapping và ownership | theme/layout/visual và component owner | Module chọn API/role; không mutate/override owner |
| Quy định và quy trình UI | File này, SPC-001–075 | AGENTS/DESIGN/UX/coding standards đặt pointer, không workflow cạnh tranh |
| Shared API hiện có và target migration | shared/ui/README.md +source/types thực | Catalog đánh dấu CURRENT/TARGET; không mô tả target như đã code |
| Công việc/dependency/status | FRONTEND_UI_IMPROVEMENT_PLAN §16 | Không tạo FE ledger thứ hai hoặc task mới chỉ để chia module |
| Kết quả đo/test | REPORT và artifact có hash/command/exit | Snapshot không chứng minh source/policy mới; plan không là PASS |

Quy định áp dụng thống nhất theo **vai trò**, không buộc mọi profile giống hình học. Cùng loại field/action/surface dùng cùng owner; hội thoại, bảng, biểu đồ, auth và dialog có profile riêng được truy về cùng token/theme. Primitive MUI được giữ nếu theme đã đáp ứng, không wrapper chỉ đổi tên.

### 0.2. Quy trình duy nhất, thực hiện theo thứ tự

| Bước | AI phải làm | Đầu ra/điều kiện chuyển bước | Rules chính |
|---|---|---|---|
| 1. Xác minh phạm vi | Đọc instruction/scope/contract/source/tests/config; giữ dirty work | Có yêu cầu, giả định, quyền ghi và nguồn đang dùng | SPC-033/047/054/064 |
| 2. Kiểm inventory | So disk +Git +tsconfig/Vite/HTML/CSS/assets/import closure +manifest | Mỗi file có category/owner/treatment/step; missing/UNKNOWN chưa qua intake | SPC-066/074 |
| 3. Chốt intent và contract | User job, route/slot/state/profile, hierarchy/actions; inset/gap/geometry/unit owners; chọn existing shared API | Expected invariants và affected routes/states/variants rõ; không speculative component | SPC-041/048/052/060/073 |
| 4. Freeze baseline | Hash sources/inputs/tests/checkers/config; đợi render đúng route/state, chụp trước source edit | Source baseline +loaded render baseline có provenance; không lấy after làm before | SPC-044/049/070 |
| 5. Tái hiện và chọn sửa nhỏ | Negative fixture/assertion cho lỗi; positive giữ behavior; kiểm cách nhỏ hơn | Root cause/acceptance rõ, không waiver/threshold workaround | SPC-055/072/073 |
| 6. Sửa owner trước consumer | Scope/resolver/gate rồi shared/theme/slots; migrate từng wave/module trong plan | API tương thích khi cần, không business state vào layout, generated chạy generator | SPC-001/005/006/031/061–069 |
| 7. Kiểm source và units | Strict source/type/generator/boundary/lint/tests theo impact | Expected inventory đầy đủ; no unauthorized finding/UNKNOWN; command/exit thật | SPC-029/039/063/065–067/072 |
| 8. Kiểm rendered behavior | Mọi affected route nhỏ/lớn; slot/state/variant/portal/zoom/text/occlusion theo impact | Expected/observed có đủ observations, UI và ARCH verdict riêng | SPC-030/038/051/056/057/070/071 |
| 9. Đối chiếu và bàn giao | Reconcile mọi file/route/component/mandatory condition; hash cuối; docs/catalog/REPORT | Không file/consumer bị mất khỏi mẫu số; phần thiếu rõ; không owner acceptance giả | SPC-032/074/075 |

Bước 3 định nghĩa contract, bước 4 ghi baseline của **lần source edit thực tế**. Đợt review trước source ở §16.17 chỉ hoàn tất specification/inventory/plan; không tạo paired runtime baseline cho những sửa đổi phát hiện sau đó. Source rollout đang được kiểm theo từng bước ở §16.6; nếu baseline đúng của một lượt sửa bị bỏ lỡ, giữ paired acceptance `NOT_VERIFIED` theo SPC-070 dù current render/source checks đạt.

### 0.3. Không bỏ sót file không có nghĩa phải sửa mọi file

[Inventory của rollout gần nhất](../evidence/frontend-ui-improvements/ui-governance-rollout-20261006/inventory.json) phân loại từng file; [inventory specification ban đầu](../evidence/frontend-ui-improvements/ui-governance-unified-20261006/inventory.json) giữ lịch sử. Trong mỗi đợt triển khai, refresh current inventory và đối chiếu diff/import closure; số file không pin theo ngày. Mỗi row có đúng một treatment:

| Treatment | Dùng khi | Bằng chứng cần có |
|---|---|---|
| EDIT_VERIFY | Có finding/contract migration thực trong phạm vi | Root cause, diff nhỏ, before/after, tests và consumer impact |
| KEEP_VERIFY | Source hiện có đáp ứng contract, không cần edit | Owner/profile/role/consumer đã rà và checks áp dụng; không dùng chỉ vì file không đổi |
| GENERATE_VERIFY | DTO/routes/tokens/generated CSS/reports/vendor worker do generator/CLI sở hữu | Input/version/integrity/generator freshness; không sửa output bằng tay |
| ASSET_VERIFY | HTML/manifest/SVG/icons/font/CSV/PWA/worker first-party ảnh hưởng UI | Import/link/runtime boundary/size/accessible hoặc synthetic semantics phù hợp |
| TOOLING_VERIFY | Test/fixture/config/scripts/workflow kiểm hoặc build UI | Command/scope/negative-positive-UNKNOWN fixtures, không mask FAIL |
| REFERENCE_READONLY | Kit full-product/prototype/lịch sử hoặc artifact không được app import | Lý do loại và cross-reference; không port prototype hoặc sửa full-product tracker |
| THIRD_PARTY_VERIFY | Library/vendor dependencies và output bên thứ ba | Pin/version/integrity/isolation; không sửa node_modules để hợp thức hóa UI |
| RETIRED_VALIDATE | File đã xóa/đổi tên trong diff nhưng còn trong Git baseline | Không active import/link/route/build dependency bị mất; giữ thay đổi người dùng |

Category/owner hoặc treatment chưa xác định là UNKNOWN, AI phải xử lý trước khi nhận scope coverage hoàn chỉnh. EXCLUDED có count/reason riêng cho node_modules/dist/evidence/historical families; không gọi “scan toàn repo” nếu chỉ quét apps/web/src. ReactNode slots, native controls, ARIA/ref/RHF spreads, imported CSS/HTML và package aliases cũng thuộc closure. Generated/third-party không chịu cùng quyền edit với first-party source.

### 0.4. Bộ điều kiện chung và trạng thái

| Điều kiện | Nguồn kiểm tra | Không được thay bằng |
|---|---|---|
| Scope không thiếu | Inventory/import closure/manifest +diff reconciliation | Một glob68 files hoặc component-name count |
| Token/visual/unit đúng | Generator +layout/visual gates +theme/profile inspection | Đúng px nhưng chép literal vào route |
| Shared API/owner đúng | Resolved source/finite values +composition gates +slot inspection | Closed top-level props trong khi children/slot style chưa được kiểm |
| UI dùng được | Ready render +geometry/focus/hit/actions/draft/navigation | Screenshot đơn lẻ, zero groups hoặc loader còn chạy |
| Không regression | Negative/positive tests, mọi affected route, states/variants theo impact | Chỉ một module sample hoặc fixture mirror implementation |
| Evidence còn hiệu lực | Actual exit/hash/artifact/coverage, UI/ARCH verdict | Config/discovery/diagnostic mode/stale report |

**Tiến độ** gồm SPECIFIED/IMPLEMENTED/VERIFIED_SCOPED và trạng thái S trong plan. **Acceptance verdict** chỉ ĐẠT, CHƯA ĐẠT, CHƯA XÁC MINH, KHÔNG ÁP DỤNG có lý do. DELIVERED_WITH_EVIDENCE_LIMITS là tình trạng bàn giao, không verdict PASS cho mandatory proof còn thiếu. Screen-reader/hosted CI/owner acceptance không tự nhận đạt và không tạo bước chờ giữa chừng trong Frontend scope.

Karpathy áp dụng tại mọi bước: hiểu trước, root cause trước symptom, tái dùng trước abstraction mới, thay đúng vùng, kiểm đúng invariant. Không generic engine, wrapper cho mọi primitive hoặc số dòng/KPI component. Các quy tắc chi tiết dưới đây giữ ID để traceability; mọi checklist phụ phải trỏ quy trình §0 này.

**Bằng chứng enforcement:** trạng thái và dependency chỉ lấy từ [plan §16.6](FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status); kết quả trên source cụ thể ở [evidence report](../evidence/REPORT.md). Các số đo S08/Wxx bên dưới là snapshot theo log/fingerprint của lượt đó, không phải trạng thái hiện hành hoặc chứng nhận toàn bộ UI. Source gates, browser checks, native resize/zoom, hosted CI và human acceptance có phạm vi bằng chứng riêng.

**HISTORICAL_SNAPSHOT — lượt shared composition trước audit:** 6 component mới đã có 176 occurrences trên 21 file/16 module; source có 68 TS/TSX. Verify-handoff PASS:96 unit/component tests,9 composition fixtures; spacing/visual scans69 files 0 finding và composition68 files 0 finding. Collector ở lượt đó đo đủ216/216 current renders,0 issues theo assertions khi đó. Paired comparison114 comparable;102 baseline desktop ghi0 groups lúc route còn tải được giữ nguyên, PARTIAL_BASELINE. Permanent browser guard2/2; native Chromium zoom200%5/5 và Firefox text-only200%5/5. Full E2E lượt đầu485/486 (exit1, Windows metrics write UNKNOWN); artifact retest6/6 giữ nguyên assertions, không gọi lượt đầu full-suite PASS. Kết quả cuối tại [report mới](../evidence/frontend-ui-improvements/shared-composition-20261006/REPORT.md); snapshot Wxx/FE và runner readiness lỗi không chứng minh source hiện hành.

**Snapshot lịch sử trước lượt shared composition:** SPC-001–063 đang có hiệu lực cho mọi UI mới/sửa. Strict spacing và visual-token scans đã tích hợp vào `npm run verify`, hiện bao phủ 68 source files/0 findings. W01–W32 DONE; W30 đạt DOM stress 10/10, Chromium browser zoom 200% 5/5 và Firefox native text-only resize 200% 5/5; năm capture đã được review trực quan. W33 M01–M07 PASS, M08 FE evidence freshness còn mở; SPC-060 bổ sung cổng chọn profile và tái dùng semantic spacing trước khi code, nhưng không tự chứng minh implementation/conformance mới. Evidence freshness/final diff review sau các thay đổi mới vẫn cần được xác minh theo dependency W33/W35, không tự suy ra W34/W35 đã DONE. W32 built-demo artifact `apps/web/dist-demo` có SHA-256 `6f4120d693536fd4f9ca8d417604c9d4cc16cfc2bcc46ccddbbec25405d978f2`; artifact smoke 2/2 và route matrix 216/216 đạt trên Chromium/Firefox. Default regression ghi đúng 480/484 lần đầu; bốn lỗi selector cũ được retest riêng trên source mới và đạt 4/4. W28 mobile 54/54 route mỗi browser và W29 18/18 breakpoint-browser cases đạt. Chi tiết và giới hạn ở [W30 summary](../evidence/frontend-ui-improvements/UI028/W30/summary-current-20261006.json), [W33 metric register](../evidence/frontend-ui-improvements/UI028/W33/metric-register-current-20261006.json), [W32 summary](../evidence/frontend-ui-improvements/UI028/W32/summary-current-20261006.json) và kế hoạch UI. Snapshot lịch sử không thay evidence hiện hành; không chờ Backend, hosted CI hoặc owner giữa chừng. Các con số là snapshot tại thời điểm được ghi và không chứng minh các sửa đổi source/e2e mới nhất.

### 0.5. Quyết định bắt buộc trước khi thiết kế hoặc mở rộng shared API

Phần này cụ thể hóa SPC-001/005/061/073–075, không tạo workflow hoặc thang token thứ hai. Áp dụng cho code mới và code được sửa; code hiện hữu được đánh giá hết theo các waves trong plan, không mặc nhiên được miễn.

| Quan hệ UI | Owner phải quyết định | Consumer được quyết định |
|---|---|---|
| Mép trang và các section ngang cấp | Shell/page profile và PageSections/SectionGrid | Thứ tự nội dung, số cột có căn cứ từ công việc người dùng |
| Mép surface, title → body, toolbar/body/pager | Panel hoặc surface owner có profile đã ghi | Nội dung slot; không thêm inset trên cùng mép owner đã giữ |
| Nhịp form, nhóm field, nhóm nội dung, nhóm action | FormFields, FieldGroup, SurfaceContent, ActionGroup | Field/action nghiệp vụ, điều kiện xuất hiện, native form semantics |
| Font, màu, radius, target control | Token → theme/visual owner → component | Semantic variant đã hỗ trợ, nội dung và accessibility name |
| Pane/chart/table/auth hoặc native fallback đặc thù | Owner hiện có trong app/module, truy về canonical tokens | Geometry nghiệp vụ và behavior riêng; không tạo scale riêng |
| Query/loading/error/empty/partial states | Shared state owner và vị trí sử dụng đã kiểm | Query/permission/draft nghiệp vụ; không dựng lại notice hoặc loader chỉ để đổi khoảng cách |

**Một ranh giới có một owner.** Parent giữ gap giữa các siblings; child giữ inset bên trong surface của chính nó. Khi Panel đã giữ title-to-body thì child đầu không cộng padding/margin trên cùng ranh giới. Surface có border và mục đích riêng có thể giữ inset riêng; fragment/wrapper/portal không tự tạo một owner mới. Kiểm các nhánh loading/error/stale/permission-hidden và phần tử nhìn thấy thực, không chỉ JSX direct children.

**Không tạo shared component theo số lần copy đơn thuần.** Trích shared khi có invariant chung và consumers thật, hoặc cần một owner công khai bảo vệ invariant đã xác nhận. Contract phải nêu nội dung/slots, ownership, props hữu hạn, native/ref/ARIA, states và impact. Nếu MUI + theme đã giải quyết đúng hoặc các phần giống markup nhưng khác semantics, giữ primitive/local. Columns/schema/permission/payload/query keys và hành vi riêng của module không chuyển vào generic shared engine.

**Không được mở đường style vòng tránh owner.** Consumer không tự thêm gap/padding/margin/font scale hoặc generic sx/style/className/slot override để tái tạo quan hệ chuẩn. Giá trị hợp lệ nhưng khai báo sai owner vẫn là lỗi. Geometry hợp lệ phải phân biệt với spacing; một native ref/event/name/ARIA hợp lệ không phải style escape hatch. Khi API hiện có thiếu nhu cầu thật, mở rộng nhỏ tại owner và cập nhật type, forwarding, catalog, fixtures và affected consumers cùng batch; không thêm cấu hình dự phòng.

**Tuân thủ bắt buộc không đồng nghĩa tooling hiện đã cưỡng chế đầy đủ.** AI không tự bỏ gate hoặc hạ threshold để đóng việc. Checker chưa hiểu một đường source phải ghi UNKNOWN/unsupported và xử lý theo plan; không đổi tên biến hoặc chuyển style sang wrapper để lấy PASS. Thay đổi quy định phải sửa đúng nguồn này, chỉ rõ lý do/impact và giữ bằng chứng tương đương hoặc mạnh hơn theo SPC-072; không tự tạo ngoại lệ cục bộ trong module, skill hay comment.

### 0.6. Hợp đồng thiết kế được chốt lại trước migration

Phần này làm rõ cách áp dụng SPC hiện có, không tạo scale, workflow hoặc ID song song. Mọi AI sửa UI phải đi qua §0.2 và quyết định owner tại §0.5; không được tự bỏ vì thay đổi nhỏ, dùng skill khác hoặc checker đang PASS. Mục tiêu tuân thủ toàn bộ scope là điều kiện nghiệm thu, chưa là kết quả đo hiện tại.

**Ba lớp thống nhất:** token/theme/layout/visual giữ giá trị; shared owner giữ quan hệ và API; feature consumer giữ nội dung/behavior nghiệp vụ. Shared không tự fetch API, quyết định permission hoặc nhận schema để dựng toàn bộ trang. Theme đã giải quyết primitive thì dùng primitive; extract component khi cần một owner chung có invariant và consumers thật. Không bắt mọi màn hình dùng cùng density.

**Quy tắc chọn spacing:** xác định hai mép/nội dung cần phân chia → xác định một owner → chọn role có sẵn → kiểm mọi state/responsive branch của quan hệ đó. Parent giữ khoảng siblings; surface giữ inset; control giữ icon–label. Before/after chỉ dùng khi parent chưa giữ cùng boundary. Chữ nổi của outlined input, helper/error, action wrap, hidden state và wrapper vẫn phải được tính bằng mép nhìn thấy; CSS gap đúng không tự chứng minh khoảng nhìn thấy đúng.

**Đường sửa hợp lệ:** thiếu role/variant thật thì sửa owner, type, mapping, catalog và fixtures cùng batch, sau đó migrate toàn bộ consumer bị ảnh hưởng. Không thêm sx/style/className/slotProps tổng quát, copy literal, selector override hoặc negative margin ở route để bù lỗi owner. Geometry chỉ chứa chiều rộng/cột/flex hợp lệ theo profile; không dùng geometry để chứa gap, inset hoặc typography trá hình. Native form/ref/name/events/ARIA/RHF hợp lệ phải được giữ.

**Cưỡng chế và kiểm chứng:** kiểm scope/binding/value/slot/owner bằng source/type gates; kiểm quan hệ thực bằng rendered geometry và hành vi; kiểm độ mới/đủ bằng evidence. Thiếu một lớp giữ acceptance mở. UNKNOWN/unsupported phải hiện rõ và strict FAIL tại gate liên quan, không đổi tên/alias/cast để bypass. Capability đã có fixtures có thể dùng để sửa source debt, nhưng actual source FAIL không được đổi thành DONE.

**Thêm UI về sau:** reuse catalog trước; ghi intent/profile/owner/consumer impact; thêm branch/API mới vào inventory và checks áp dụng; chạy workflow §0.2 trước bàn giao. Không tự sửa hoặc bỏ rules để một patch được PASS. Khi thay chuẩn có lý do thật, sửa tại nguồn này theo SPC-072, cập nhật impact/tests và tài liệu phụ thuộc; không miễn trừ cục bộ.

## 1. Mục tiêu, thẩm quyền và giới hạn

Khoảng cách phải giúp người dùng nhận ra quan hệ giữa các phần, thao tác chính, ranh giới nhóm và nhịp đọc. Đồng bộ nghĩa là **cùng vai trò dùng cùng quy tắc**; bảng dữ liệu, hội thoại và form không bắt buộc có cùng mật độ.

Các kích thước 4/8/12/16/24/32/48 px là quyết định thiết kế của BotSales, không phải một chứng nhận Enterprise hoặc các giá trị padding do WCAG bắt buộc. Production-Ready/Enterprise-Grade Frontend trong dự án vẫn phụ thuộc FE-G01..09 và bằng chứng hành vi, kiến trúc, accessibility, build và bàn giao theo [FRONTEND_SCOPE](FRONTEND_SCOPE.md). Viết tài liệu hoặc thống nhất token không tự chứng minh các gate đó.

| Vai trò | Nguồn có hiệu lực |
|---|---|
| Giá trị token nguyên tử, màu, kích thước shell | `../botsales-kit/design/tokens.json` |
| Đầu ra token | `scripts/generate.mjs` → `packages/design-tokens/src/*`, CSS sinh; không sửa tay |
| Mapping runtime | `apps/web/src/shared/ui/theme.ts`, `layout.ts`, `visual.ts`, `components.tsx`, `composition.tsx` |
| Cách dùng khoảng cách/ownership/ngoại lệ | File này; bổ sung chi tiết cho `DESIGN.md` và `UX-CONTRACT.md` |
| Task và tiến độ UI/shared enforcement | Bảng UI trong `FRONTEND_UI_IMPROVEMENT_PLAN.md`; không có ledger spacing thứ hai |
| Baseline lịch sử 05/10/2026 | [source-inventory.json](../evidence/frontend-spacing-audit-20261005/source-inventory.json), [script thu thập](../evidence/frontend-spacing-audit-20261005/capture-spacing.mjs), [báo cáo baseline](../evidence/frontend-spacing-audit-20261005/REPORT.md) |

**SPC-001 — Một nguồn giá trị.** Không chép một bảng số px độc lập vào từng module. Preset semantic chỉ ánh xạ các token hiện hữu. Không đổi palette, API, module boundary, generated output hoặc các tracker toàn sản phẩm để thực hiện spacing.

**SPC-002 — Phân biệt trạng thái.** `SPECIFIED`, `IMPLEMENTED`, `VERIFIED` là ba mốc khác nhau. Các phép đo/source count không là điểm readiness. Task UI028 không được DONE chỉ vì file quy định đã có.

## 2. HISTORICAL_SNAPSHOT — baseline trước migration 05/10/2026

Collector tại baseline 05/10/2026 phân tích 65 TS/TSX, 2 CSS, 16 module và đối chiếu đủ 54 route với file/component khi đó; parser có 0 diagnostic. Các số/declaration/conflict ở §2 được giữ để trace migration, không là debt/source hiện hành. Đây là **source coverage**, không phải browser tour 54 route; inventory hiện hành ở §0.3.

| Chỉ số | Kết quả |
|---|---:|
| Property spacing được thu thập | 501 candidate declarations |
| Khai báo số trực tiếp | 488 |
| Mức số dương trực tiếp quy đổi bằng MUI base 8 px | 18 |
| Khai báo trực tiếp ngoài scale | 23, gồm 11 giá trị khác nhau |
| Candidate ngoài scale nếu tính thêm nhánh responsive | 24; thêm một nhánh `sm: 5` tương đương 40 px |
| Property hình học/bố cục cần phân loại riêng | 109 candidate declarations |
| CSS margin/padding/gap thu thập | 3 declarations |

Giá trị ngoài scale: **2,4; 4,8; 5,6; 6; 6,4; 8,8; 9,6; 10; 14,4; 20; 40 px**. Không gọi mọi candidate là lỗi: list indent 40 px có thể là tổng inset 24 + indent 16; MUI internal padding cũng không chịu cùng quy tắc literal của ứng dụng. Nhánh điều kiện không cùng xuất hiện trên một màn hình.

Đo CSS trực tiếp trên R13 `/s/shop-demo/imports`, viewport 793×884: main padding 32; body card padding 24; khoảng giữa các phần form 16; khoảng trong dòng ánh xạ 8; từ chân tiêu đề card đến alert đầu tiên **48 px**; body `max-width:850px`; body text 14/21 px. [live-imports.json](../evidence/frontend-spacing-audit-20261005/live-imports.json) ghi phạm vi đo hẹp này; không thay build, E2E hoặc accessibility conformance.

Các nguồn chưa thống nhất: tài liệu design-system chọn desktop gutter 24 px, Shell dùng 32 px từ 768; mobile header token 56 px, Shell dùng min-height 64; `DESIGN.md` ghi panel padding cơ sở 16 px, Panel/form hiện dùng 24; footer luôn px=4 kể cả mobile. UI028 phải đưa code về quyết định chi tiết bên dưới, không sửa tài liệu để giả rằng code hiện đã đạt.

## 3. Thang nguyên tử và cách dùng MUI

**SPC-003 — Giữ MUI base 8 px.** Không đổi toàn cục sang 4 px hoặc spacing array: các factor hiện tại sẽ đổi nghĩa. MUI giải thích số được nhân theo theme; spacing array còn hạn chế phân số/âm/auto. [MUI spacing](https://mui.com/material-ui/customization/spacing/), [MUI System spacing](https://mui.com/system/spacing/).

| Token | px | Factor MUI tại base 8 | Vai trò |
|---|---:|---:|---|
| `space.xs` | 4 | 0.5 | Nhãn/hint, khoảng phụ nhỏ |
| `space.sm` | 8 | 1 | Inline action, icon–text, phần tử cùng hàng |
| `space.md` | 12 | 1.5 | Insets nhỏ, ô bảng dọc |
| `space.lg` | 16 | 2 | Field gap, nội dung mobile |
| `space.xl` | 24 | 3 | Section gap, inset tablet/desktop |
| `space.xxl` | 32 | 4 | Nhóm lớn/khối auth được đặt tên |
| `space.xxxl` | 48 | 6 | Empty state rộng, không là gap mặc định |

**SPC-004 — Closed scale và một nơi khai báo.** Trong bridge/preset chuẩn, numeric `p/m/gap/spacing` thông thường chỉ dùng `{0, 0.5, 1, 1.5, 2, 3, 4, 6}` quy từ token. App/module/shared consumers chọn semantic preset/reference; không tự viết lại `p:3`, `gap:2`, `spacing={1}` hoặc chuỗi `16px` dù đúng scale. Không lập bảng spacing riêng trong feature. CSS px/string/helper phải quy về token/role tương ứng; raw CSS dùng biến token đã sinh khi cùng nghĩa. Reset0, auto, intrinsic layout, safe-area và geometry composite theo mục9 được phân loại riêng. Không tự thêm20/40/64px vào spacing scale để xóa findings.

```tsx
// Chỉ minh họa phép quy đổi tại bridge shared; không chép vào module:
const formFields = { gap: tokens.space.lg / tokens.space.sm }; // 16px → factor2
const surfaceInset = { p: { xs: tokens.space.lg / tokens.space.sm, md: tokens.space.xl / tokens.space.sm } };
const insetCss = `${tokens.space.lg}px`; // dùng ở raw CSS override, không phải MUI factor

// Consumer dùng semantic component đã export từ shared:
<FormFields />

// Sai về đơn vị: số 16 sẽ bị MUI nhân 8, thành 128 px.
<Box sx={{ p: tokens.space.lg }} />
```

`theme.spacing(...)` chỉ dùng factor. Token px khi đưa vào CSS phải có đơn vị, hoặc đổi thành `token / tokens.space.sm` trước khi dùng với MUI System. Không áp cùng phép nhân cho `width/height`, `fontSize` hoặc styleOverrides raw CSS.

## 4. Preset semantic và ownership

**SPC-005 — Một owner cho mỗi quan hệ.** Cha sở hữu gap giữa con; surface sở hữu inset từ viền đến nội dung; con sở hữu khoảng cách bên trong chính nó. Không để cả cha và con cùng thêm padding/margin cho cùng một quan hệ.

| Semantic role | Mobile <768 | Tablet 768–1279 | Desktop ≥1280 | Owner |
|---|---:|---:|---:|---|
| `page.gutter` | 16 | 24 | 24 | Shell/global page layout |
| `page.contentInsetBlock` | 24 | 24 | 24 | Shell main top/bottom; trang không thêm page padding lần hai |
| `composition.childBoundaries` | margin block 0 | margin block 0 | margin block 0 | Semantic composition reset direct-child margins để cha sở hữu gap |
| `page.sectionGap` | 24 | 24 | 24 | Shared PageSections |
| `page.sectionBefore` / `page.sectionAfter` | 24 | 24 | 24 | Panel boundary; same role, before/after edge |
| `pageHeader.titleDescriptionGap` | 8 | 8 | 8 | PageHeader |
| `pageHeader.columnsGap` | 16 | 16 | 16 | PageHeader title/actions flow |
| `pageHeader.afterGap` | 24 | 24 | 24 | PageHeader |
| `surface.inset` | 16 | 24 | 24 | Panel/Stat/Card |
| `surface.compactInset` | 12 | 12 | 12 | Compact nested checklist/status item; not a replacement for main surface inset |
| `surface.compactContentGap` | 8 | 8 | 8 | Compact nested content groups |
| `surface.contentGap` | 12 | 12 | 12 | Shared SurfaceContent; SectionGrid với content rhythm |
| `surface.headerInset` | px/pt 16 | px/pt 24 | px/pt 24 | Panel title; bottom edge owns 16px header/body gap |
| `surface.bodyInsetAfterHeader` | px/bottom 16 | px/bottom 24 | px/bottom 24 | Panel inset body; no second top gap |
| `surface.sectionBefore` | 16 | 16 | 16 | Panel boundary after adjacent surface |
| `surface.titleDescriptionGap` | 4 | 4 | 4 | Header slot |
| `surface.headerFlowGap` | 16 | 16 | 16 | Panel title/actions, wraps on narrow width |
| `form.fieldGap` | 16 | 16 | 16 | Shared FormFields |
| `form.labelAfterGap` (CSS) | 4 | 4 | 4 | Shared theme: label trong flow → input; token hiện có |
| `form.inlineGap` | 8 | 8 | 8 | Shared FieldGroup |
| `actions.inlineGap` | 8 | 8 | 8 | Shared ActionGroup |
| `actions.relatedLinksGap` | 12 | 12 | 12 | Shared ActionGroup with `density="comfortable"` for related sibling controls |
| `actions.beforeGap` | 24 | 24 | 24 | Form/dialog composition |
| `actions.linkTarget` | min-height 44, px16/py8 | same | same | Download/text link hit area; height from canonical `layout.touchTarget` |
| `grid.gutter` | 24 | 24 | 24 | Shared SectionGrid, section rhythm |
| `stats.gutter` | 16 | 16 | 16 | Shared Stats |
| `stats.afterGap` | 24 | 24 | 24 | Stats to next section |
| `dashboard.groupInset` | 24 | 32 | 32 | Dashboard hero group; responsive shared owner |
| `dashboard.sectionGap` | 24 | 24 | 24 | Dashboard hero/action flow and supporting section grid |
| `dashboard.heroTitleFlow` | mt/mb 8 | mt/mb 8 | mt/mb 8 | Dashboard eyebrow/title and title/helper boundary |
| `dashboard.heroDescriptionGap` | 16 | 16 | 16 | Dashboard title to helper copy |
| `dashboard.actionTarget` | height ≥44, px16/py8 | same | same | Dashboard primary/secondary CTA; height from canonical touch target |
| `dashboard.metricValueGap` | 4 | 4 | 4 | Dashboard finance label to its amount |
| `dashboard.footerFlow` | top/gap 16 | top/gap 16 | top/gap 16 | Dashboard warnings and as-of/shop attribution |
| `toolbar.inset` | 16 | 16 | 16 | Shared Toolbar |
| `toolbar.controlGap` | 12 | 12 | 12 | Shared Toolbar |
| `table.mobileHintInset` | px 16 / pt 8 | px 16 / pt 8 | px 16 / pt 8 | DataTable mobile-only scroll hint |
| `table.cellInset` | 12 dọc / 16 ngang | như mobile | như mobile | Theme/DataTable |
| `code.inlineGap` | 4 | 4 | 4 | CopyableCode value/control |
| `lookup.loadMoreRow` | gap 8 / px 8 / mt 4 | như mobile | như mobile | LookupLoadMore status/action row |
| `pager.inset` | 16 | 16 | 16 | Shared Pager |
| `detail.rowInsetBlock` | 12 | 12 | 12 | DetailLine row |
| `detail.valueGap` | 16 | 16 | 16 | DetailLine label/value |
| `empty.insetBlock` | 32 | 48 | 48 | Shared Empty |
| `empty.insetInline` | 16 | 16 | 16 | Shared Empty |
| `empty.contentGap` | 16 | 16 | 16 | Shared Empty |
| `dialog.inset` | 16 | 24 | 24 | Shared dialog slots |
| `auth.surfaceInset` | 24 | 32 | 32 | AuthCard; intentional profile |
| `auth.brandMarkGap` | 12 | 12 | 12 | Brand mark and wordmark within AuthCard |
| `auth.brandTitleGap` | 32 | 32 | 32 | AuthCard brand row to page title |
| `footer.insetInline` | 16 | 24 | 24 | Shell |
| `footer.insetBlock` | 16 | 16 | 16 | Shell |
| `shell.demoToolsBefore` | 24 | 24 | 24 | Shell notice to floated demo controls; preserves a visible label clearance |

Inbox/Conversation semantic roles are owned by the Inbox feature profile; they still resolve only through the shared bridge above.

| Inbox role | Mobile <768 | Tablet 768–1279 | Desktop ≥1280 | Owner |
|---|---:|---:|---:|---|
| `inbox.paneInset` | 16 | 16 | 16 | Message viewport |
| `inbox.bubbleInset` | 12 | 12 | 12 | Message bubble |
| `inbox.messageContentGap` | 4 | 4 | 4 | Sender label to message text |
| `inbox.messageMetaGap` | 8 | 8 | 8 | Message body/source/meta flow |
| `inbox.messageGroupGap` | 12 | 12 | 12 | Adjacent messages |
| `inbox.composerInset` | 16 | 16 | 16 | Reply/note composer |
| `inbox.composerActionGap` | 8 | 8 | 8 | Composer action row |
| `inbox.composerControlsBeforeGap` | 8 | 8 | 8 | Composer field to action row |
| `inbox.listInset` | 16 | 16 | 16 | Conversation list item |
| `inbox.listContentGap` | 12 | 12 | 12 | Avatar to conversation summary |
| `inbox.unreadCountInset` | 8 horizontal | 8 horizontal | 8 horizontal | Unread count indicator |
| `inbox.listStatusBeforeGap` | 8 | 8 | 8 | Preview to mode/status |
| `inbox.contextInset` | 16 | 24 | 24 | Customer context pane |

Queue filter content after `Toolbar` uses `surface.bodyInsetAfterHeader` so the toolbar owns its top edge and the filter owner supplies only horizontal/bottom inset. Thread notices use one `inbox.paneInset` wrapper. Demo previews reuse `surface.*`, `form.*` and `actions.*`; they do not receive route-local spacing presets.

Reports roles compose only inside the shared Reports/dashboard-report profile; the marker indent is additional to the list's surface inset. Chart viewport and empty-state roles preserve the established chart bounds and fallback reading area.

| Report role | Mobile <768 | Tablet 768–1279 | Desktop ≥1280 | Owner |
|---|---:|---:|---:|---|
| `report.contextGap` | 16 | 16 | 16 | Report notes, snapshot attribution and adjacent explanatory content |
| `report.listSurfaceInset` | 24 all edges | 24 all edges | 24 all edges | Question list surface |
| `report.listMarkerInset` | +16 left | +16 left | +16 left | List marker/text indent; additive after surface inset |
| `report.listItemGap` | 12 | 12 | 12 | Adjacent question rows |
| `report.chartViewportInset` | 16 all edges | 16 all edges | 16 all edges | Chart viewport padding, preserves fixed chart geometry |
| `report.emptyStateInset` | 24 all edges | 24 all edges | 24 all edges | Empty chart explanation |
| `report.subheadingAfterGap` | 8 | 8 | 8 | Report subsection heading |

**SPC-006 — Một bridge semantic tại shared/ui.** Owner runtime là `apps/web/src/shared/ui/layout.ts`: derived factors nội bộ từ token; export `layoutSx`, semantic spacing references và raw CSS values đúng units cho vai trò dùng thật. Dùng lại PageHeader, Panel, Stat/Stats, Toolbar, DataTable, Pager, Empty, EditDialog. Consumer có thể compose preset với geometry/behavior cục bộ, không tái định nghĩa spacing hoặc override role chung. Theme import bridge; bridge chỉ import token và MUI types, không import theme/components/modules/app để tránh cycle. Không tạo theme thứ hai, module-specific scale, layout engine, config renderer hay wrapper cho mọi primitive. Phân biệt factor với px trong tên/type; API hiện hành phải typecheck và tuân SPC-064–075; W02 là bước triển khai lịch sử.

**Đóng kín identity/ownership của mọi layout path:** leaf paths trong `LayoutSxContract` phải khớp chính xác với object runtime `layoutSx`. Mỗi path phải hoặc có semantic rule owner trong standard này, hoặc xuất hiện đúng một lần trong [shared UI owner crosswalk](../apps/web/src/shared/ui/README.md#8-layout-owner-crosswalk) với owner, consumer và phân loại/rationale `SPACING`, `GEOMETRY` hoặc `INTERNAL`. Crosswalk là registry tên/owner của CURRENT API, không phải rule/value source thứ hai; mọi spacing path vẫn chịu SPC-001–075. Thêm, bỏ hoặc đổi path phải cập nhật type, runtime, consumer, crosswalk và contract test trong cùng thay đổi. Gate `ui-shared-api-contract` fail khi path thiếu owner, trùng dòng, không có consumer hoặc type/runtime bị lệch.

Các role riêng cho Shell/fallback/navigation cũng phải theo identity closure trên; thay đổi role dùng chính bridge này, không mở bảng/token cục bộ.

**SPC-007 — Ưu tiên gap cho flow.** Các nhóm liên tiếp dùng Stack/Grid `gap`; không cùng vừa parent gap vừa child `mb/mt`. Dùng margin cho ranh giới rõ hoặc intrinsic centering (`mx:'auto'`). Không dùng spacer rỗng, chuỗi dấu cách, `<br>` lặp hoặc margin `vh` để tạo khoảng trống giả.

## 5. Shell, responsive và hình học

**SPC-008 — Geometry khác spacing.** Width sidebar 240, header 56/64, inbox 300/320/min400, touch target 44, radius 8/12/16, border/focus và chiều cao chart không là spacing token. Giá trị này vẫn phải có owner/nguồn, co giãn được hoặc có ngoại lệ cụ thể. `fontSize="small"` của icon không là cỡ chữ nội dung. Card collection kiểm số item0/1/2/3 ở các breakpoint: một item dùng đủ vùng collection; giữ cột của workflow nhiều pane. Form và surface phải thống nhất chiều rộng có căn cứ; không để cap route-local tạo nửa surface trống. Trường liên quan dùng FieldGroup responsive hiện có, không thêm spacing scale.

**SPC-009 — Tài liệu và runtime phải cùng nghĩa.** `../botsales-kit/design/tokens.json` là nguồn token nguyên tử; `DESIGN.md` là bản tóm tắt nhận diện, không có thẩm quyền tạo token/layout values thứ hai. Frontmatter của DESIGN hiện lặp một phần màu, chữ, radius và spacing; không chỉnh các giá trị đó độc lập. Bảng ở §4 của standard này định nghĩa responsive semantic profiles/owner, còn theme/layout là mapping runtime phải khớp với token và rule. Khi phát hiện lệch, sửa đúng canonical source rồi sinh output; summary không thể sinh tự động phải được đối chiếu parity hoặc bỏ phần lặp trong S14 sau khi xác minh consumers. UI không đóng khi code khác quyết định gutter/header hiện hành; không sửa token để hợp thức hóa literal sai.

**SPC-010 — Giữ breakpoint hiện hành.** Mobile <768; tablet 768–1279; desktop ≥1280. Theme hiện có `sm=md=768` và `lg=xl=1280`; chỉ ba khoảng phân biệt, không coi là năm breakpoint độc lập. Dùng `xs/md/lg` cho preset chung; không tự tạo 900/1024 breakpoint ở từng module hoặc đổi responsive order trong task spacing.

**SPC-011 — Page gutter chỉ áp một lần.** Shell sở hữu gutter 16/24; shop-scoped route root không lặp `p:3` cho cả trang. Global login/workspaces/onboarding/error/404 có layout owner riêng nhưng cùng quy tắc mép viewport. PageHeader, collection toolbar và card phải thẳng mép theo loại surface.

**SPC-012 — Shell co giãn theo nội dung.** Header min-height 56 mobile, 64 tablet/desktop; border có thể cộng thêm 1 px vào rect ngoài. Desktop rail 240; dưới 1280 dùng drawer hiện có, không bắt thêm rail 72 chưa triển khai. Main fill phần còn lại bằng flex/grid; không lấy `minHeight:80vh` làm preset mọi route. Chiều cao phải tăng khi text/error/draft tăng. Safe-area được cộng đúng owner khi cần, không nhân đôi với padding footer/composer.

Form hiện có max-width 850 là geometry giới hạn độ dài dòng, không là spacing scale. Khi chuyển đổi, giới hạn áp vào đúng form surface với `width:'100%'`, `maxWidth:850`, `minWidth:0` và owner rõ; chỉ giữ 850 khi phù hợp độ dài dòng của form. Surface không vượt container; không để card đầy trang nhưng form dạt trái tạo khoảng trắng không giải thích được. Bảng/report có thể dùng full available width. Không ép một max-width cho cả 54 route.

## 6. Quy tắc theo component/workflow

**SPC-013 — Surface có profile inset hoặc flush.** Form/detail/stat dùng inset 16/24. Panel chứa table/toolbar/pager dùng body flush vì các slot này có inset riêng. Đây là hai trường hợp thật đã có; dùng union typed `bodyMode: 'inset' | 'flush'`, mặc định tương thích là `flush`, không thêm nhiều boolean mâu thuẫn. Shared Panel nhận khoảng trước/sau theo semantic preset và chỉ nhận geometry qua prop có type đóng; không mở generic `sx` để caller tự ghi spacing.

**SPC-014 — Header–body gap đo tại mép nội dung.** Gap chuẩn 16 px từ đáy phần nội dung header cuối cùng đang hiển thị tới mép trên nội dung body đầu tiên. Khi actions wrap xuống dưới title/description, đo từ actions cuối cùng; không lấy đáy title rồi tính cả action row thành gap. Header của Panel sở hữu đáy 16 px; body inset kế thừa inset ngang/đáy nhưng không thêm top inset lần hai. Không header bottom 24 +body top24 thành48 hoặc header16 +child top16/24 thành32/40. Panel không title không giữ vùng header trống. Nội dung dài làm header nở tự nhiên, giữ semantic heading và hierarchy.

**SPC-015 — Nested surface không tự nhân inset.** Nested panel chỉ có padding khi có biên/nền/ý nghĩa nhóm riêng. Group trung tính dùng divider hoặc semantic gap do group sở hữu; không lồng Paper/Box p3 vào Panel inset rồi bỏ nội dung giữa chúng. Một route/table flush có toolbar/body/pager riêng được phép vì mỗi slot sở hữu vùng riêng.

**SPC-016 — Collections thẳng mép.** Catalog, customers, inventory, orders, fulfillment, procurement, finance, operations, knowledge, notifications dùng cùng collection composition. Header → filters/table panel → pager giữ cùng grid; noData/error/stale không tạo thêm wrapper inset. Giữ pagination/query/permission owner và row action semantics.

**SPC-017 — Forms phân nhóm bằng quan hệ.** Field gap16; cùng dòng gap8; nhóm trường gap24; hint/error intrinsic trong một field dùng nhịp4. Label floating/InputLabel và FormHelperText thuộc theme/control owner: quan hệ intrinsic này không phải gap16 giữa các field, không bọc thêm spacer hoặc đặt margin tại trang. Chỉ kết luận control đang đạt sau kiểm label/helper/error dài và các state thực; không suy MUI default thành phép đo PASS. Dưới768, multi-column stack nếu trường thiếu chỗ; minWidth0 cho flex/grid children cần shrink. Hint/error nở tự nhiên, không height cứng/cắt text; giữ RHF/validation/draft/file state, không remount khi đổi breakpoint.

**SPC-018 — Actions dễ chạm, giữ hình học khi busy.** Action gap 8, trước submit 24; mobile wrap/stack và giữ DOM order. Nút chính, icon button/menu item theo mục tiêu nội bộ ≥44×44 px, grow khi label dài. Link CTA tự dựng phải kiểm min-height riêng: py10→py8 có thể giảm target dưới 44, không được chỉ làm tròn spacing. Không thêm user density setting chỉ để task này hoàn tất.

**SPC-019 — Tables có mật độ riêng.** Cell default 12 dọc ×16 ngang; height theo text/actions. Không assert mọi row đúng 44: nút 44 và padding cell khiến row cao hơn. Dense text-only chỉ dùng shared variant có tên (8×16), kiểm full value và target actions, không giảm font để nhét cột. Header/cell/pager phải đồng nhất toàn module. Overflow chỉ ở region bảng có tên/focus/keyboard, không che tràn cả page để giả PASS.

**SPC-020 — Dialog/drawer theo viewport.** Dialog mép viewport tối thiểu 16 mobile/32 desktop; inset nội dung 16/24; action gap 8; header/body/footer tổng gap đúng profile. Content scroll được khi cần, actions/close/focus không bị che ở text resize hoặc màn hình thấp. Dùng min/max-height theo viewport nội dung, không fixed height cắt form. Drawer giữ cơ chế focus/return, không thay routing hay draft guard để đổi padding.

**SPC-021 — Inbox/workspace panes có owner riêng.** Pane gutter 16; message bubble inset 12; khoảng trong message 4/8, giữa message 12; composer inset 16 và action gap 8. List item inset 16; context inset 16/24 theo diện tích. Khi hẹp, giảm số pane trước khi giảm cỡ chữ/target. Giữ scroll owner, selected conversation, cursor, Back và focus; không ép 3 pane vào 320 px. Bubble/current p14,4 là candidate cần chuyển về preset, không thay message content/state.

**SPC-022 — Reports/charts giữ geometry có ý nghĩa.** Surface/gap theo preset; plot margins/tick offset/legend layout được đặt tên và kiểm clipping thay vì làm tròn mọi tọa độ. Một list trong surface có thể cần tổng inset trái 40 =24 surface +16 marker indent: giữ cấu trúc và biểu diễn hai owner hoặc named composite; không tự ép thành 32 vì 40 ngoài scale. Long axis labels phải đủ vùng, wrap/disclose đúng cách và có text/table alternative.

**SPC-023 — Dashboard nhất quán nhưng có cấp nhóm.** Stats gap 16; section gap 24; nhóm giới thiệu lớn có inset 24/32 theo profile riêng. Không dùng padding/gap không tên 20 px. Không tăng hero hoặc whitespace để bù thiếu dữ liệu; giữ KPI label/asOf/permission semantics.

**SPC-024 — Async states cùng khung.** Loading/empty/error/forbidden/stale/unknown dùng shared owner. `QueryState` mặc định `pendingProfile="inline"` với chiều cao tự nhiên; chỉ dùng `pendingProfile="section"` cho vùng dữ liệu chính có nội dung lớn (ví dụ bảng, KPI, grid hoặc detail panel) khi inventory và browser check xác nhận cần giữ chỗ. Section profile lấy chiều cao tối thiểu 240px từ `layoutSx.query.sectionPending`; không truyền số tùy ý. Lookup phụ, dialog, truy vấn null/conditional nhỏ giữ inline. Loading có thể giữ geometry gần với nội dung dữ liệu, nhưng không áp min-height 240 chung cho query nhỏ hoặc toàn bộ 86 consumer. Inline query không làm cả card nhảy do inset/gap lặp; khi nội dung sau tải lớn, chọn profile theo slot và kiểm pending→ready. Empty inset 32/48, không cộng với nested inset cùng owner. Lỗi nhiều dòng được nở, không thay lỗi thành empty để khớp layout. Demo banner/tools đi cùng page gutter, mobile collapse nhưng giữ accessible control.

## 7. Chữ, zoom, focus và nội dung dài

**SPC-025 — Spacing không được hy sinh chữ.** Body 14–16 theo token, line-height body 1.5; meta thiết yếu mục tiêu nội bộ ≥12 px. Giữ font/palette đã chọn. Floating label phải đo cả font và transform thực: trường hợp font14 × scale0.75 cho kích thước nhìn khoảng10,5 cần review theo mục tiêu nội bộ. Nếu tái hiện thì giải quyết qua shared label/theme với test notch/zoom, không scale cả form xuống hoặc reset tất cả MUI internals. Label/heading nhiều dòng không có height cứng. Mức 12 px là quyết định dự án, không là minimum font-size do WCAG quy định.

**SPC-026 — Focus không bị cắt hoặc che.** Giữ outline 2 px và offset hiện hành; container clipping/rounded overflow phải chừa đúng vùng focus. Sticky header/footer/composer phải cho focused control nhìn thấy; có thể dùng scroll-padding/scroll-margin từ geometry header + token gap. Quy định nội bộ cố gắng giữ toàn target/focus nhìn thấy; AA 2.4.11 tối thiểu yêu cầu component không bị che hoàn toàn. [W3C Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).

**Profile outlined hiện hành (09/10/2026):** Shared theme đặt label trong normal flow, font meta12px và CSS role form.labelAfterGap4px; không floating transform/outline notch. Nhãn nhiều dòng tự tăng chiều cao khi chữ200%. Form/ref/aria/validation vẫn do MUI và owner nghiệp vụ quản lý. Toolbar wrap theo chỗ trống và min-width theo chữ; mock-tools geometry tại shell.demoControl. Native label/value/intrinsic-height/notch probes phải kiểm mobile và desktop, không suy từ overflow-only PASS. Floating-label snapshots trước profile này giữ nguyên là lịch sử.

**SPC-027 — Độ bền khi người dùng thay cách đọc.** Kiểm text resize 200% không mất nội dung/chức năng; reflow ở 320 CSS px cho content cuộn dọc. Bảng/plot cần hai chiều có phạm vi ngoại lệ riêng; label/text/actions xung quanh vẫn phải reflow. Viewport 320 chỉ là một probe, không tự chứng minh browser zoom thật. [W3C Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

Test override đồng thời line-height 1.5×font, paragraph-after 2×font, letter-spacing 0.12×font và word-spacing 0.16×font, không mất nội dung/chức năng. Đây là kiểm khả năng chịu override, không bắt mọi heading/body mặc định phải dùng các giá trị đó. [W3C Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html).

Mục tiêu 44×44 của sản phẩm cao hơn minimum AA 2.5.8 24×24 có ngoại lệ. Link trong câu và native controls cần đánh giá đúng category; không gọi mọi target <44 là WCAG FAIL. [W3C Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum).

## 8. Áp dụng đủ 16 module / 54 route

JSON inventory ghi từng route R01–R54, file/component và target profile; profile là đề xuất từ mục đích route, chưa phải đo browser từng route. Bảng dưới là candidate inventory trước migration, không phải số strict debt hiện tại; xem W-ID evidence trong kế hoạch để biết kết quả mới. Số outside gồm cả nhánh responsive; 0 outside không chứng minh ownership/overflow đúng.

| Owner | Route | Khai báo spacing | Candidate ngoài scale | Trọng tâm UI028 |
|---|---:|---:|---:|---|
| App/Shell | dùng chung | 49 | 7 | Gutter/header/footer/navigation/demo tools/error page |
| Shared UI | dùng chung | 41 | 0 | Panel slots, PageHeader, Stats, Toolbar, table/pager/empty/dialog |
| bot | 4 | 28 | 0 | Settings, playground pane, evaluations, team cards |
| catalog | 6 | 24 | 1 | Editor/import form, mapping, table flush, category lookup |
| customers | 3 | 15 | 0 | List/detail/service case và field errors |
| dashboard | 1 | 36 | 4 | CTA targets, Stats, hero/grid profile |
| finance | 6 | 28 | 0 | Dense data, dialog tiền, debt/report/reconciliation |
| fulfillment | 2 | 17 | 0 | Table/action/dialog responsive |
| inbox | 2 | 47 | 6 | Message/composer/context/list và scroll owner |
| integrations | 2 | 13 | 0 | Empty state, capability/settings surfaces |
| inventory | 2 | 4 | 0 | Table, filters, số lượng/actions |
| knowledge | 3 | 20 | 0 | Review/detail/upload/long text |
| notifications | 2 | 25 | 1 | List, device/schedule form, inline states |
| operations | 3 | 32 | 0 | Cards, approvals, digest và nested groups |
| orders | 4 | 27 | 0 | Create/detail/returns, confirm dialog, validation |
| procurement | 4 | 37 | 0 | Lookup, purchase/receipt forms/tables |
| reports | 2 | 21 | 2 | Charts, tick/legend geometry, list indent |
| workspace | 8 | 37 | 3 | Auth/onboarding, settings/team/privacy/audit/job |

## 9. Ngoại lệ có giới hạn

**SPC-028 — Ngoại lệ phải có nghĩa và evidence.** AI tự phân loại/ghi quyết định trong scope; không tạo bước chờ owner để giải quyết choice trình bày thường lệ. Palette/API/support matrix ngoài scope vẫn giữ quyền đã có.

| Category | Ví dụ hợp lệ | Cách quản lý |
|---|---|---|
| `GEOMETRY` | Header/sidebar/touch/chart dimensions | Token hoặc named geometry; clamp/reflow test |
| `COMPOSITE` | Inset 24 + marker indent 16; scroll margin header + gap | Công thức/owner rõ, không literal vô nghĩa |
| `PLATFORM` | MUI/native internal padding, safe-area, notch/transform | Không bắt sửa node_modules; kiểm control/focus/text thực |
| `A11Y_MECHANISM` | Skip-link offscreen position/focus offset | Không coi top -60 hoặc outline offset 3 là normal spacing |
| `OPTICAL` | Cân chỉnh icon có reproduction cụ thể | Chỉ phạm vi selector nhỏ; có lý do, bounds, before/after và review date |

Mỗi ngoại lệ ghi ID, file/component/selector, property/value/units, reason, category, viewports/states, expected/observed, evidence/hash, owner và điều kiện kiểm lại. Không blanket allowlist cả file/module, wildcard bỏ mọi decimal, hoặc “MUI cho phép nên hợp lệ”. 24 baseline candidate không tự trở thành accepted exception.

## 10. Gate kiểm chứng và kiến trúc

**SPC-029 — Static gate kiểm đơn vị và nguồn khai báo.** `scripts/check-layout.mjs` hiện là checker AST/style; collector inventory không thay checker. Gate phải đọc sx/System props, responsive/conditional leaves, helper references, CSS/theme overrides; phân biệt factor/px/geometry/library, reject spacing literal tại consumer kể cả đúng scale và mọi nguồn override không resolve. Unknown/parse failure làm strict gate thất bại; ngoại lệ chỉ đúng scope. Fixtures kiểm số lẻ, literal đúng token nhưng rải rác, helper px bị nhân đôi, raw CSS, exception sai và nguồn thiếu. Current source PASS chỉ theo coverage hiện có; audit §13.5 ghi các bypass cần gia cố, không suy đầy đủ từ zero findings.

**SPC-030 — Browser gate kiểm computed geometry và workflow.** Bảng dưới là acceptance lâu dài cho mọi thay đổi UI theo impact. Kết quả W/UI028 trước đây là snapshot trong plan/evidence; source rollout hiện tại phải chạy và ghi từng gate theo impact, không suy rộng các lần kiểm tra mục tiêu thành full-suite PASS. Mỗi task ghi kết quả thực và source hash; không dùng NOT_RUN lịch sử hoặc PASS lịch sử làm trạng thái hiện hành.

| Gate | Tiêu chí | Phạm vi thực hiện |
|---|---|---|
| SP-G01 | Generated/token fresh; shared presets không fork scale | `generate:check`, token mapping và checker fixtures |
| SP-G02 | Không unresolved spacing/ownership violation | AST/style audit + exception review; không chỉ đếm token |
| SP-G03 | Gutter, inset, gap theo semantic profile | 54 route smoke ở 390 và 1440 CSS px, Chromium/Firefox trong matrix đã chọn; shared contracts đo mép nội dung, tolerance tối đa 0.5 CSS px cho làm tròn |
| SP-G04 | Breakpoint/reflow không tràn nội dung thường | Representative profiles ở 320/390/767/768/1024/1279/1280/1440/1920; có form, table, inbox, report, auth, dashboard, dialog |
| SP-G05 | Text resize/spacing override không mất nội dung | Default/200% và override §7; long Vietnamese labels, IDs, error summary; browser zoom thật có evidence riêng |
| SP-G06 | Target/focus/scroll vẫn thao tác được | Keyboard Tab/Shift-Tab/Enter/Escape, dialog focus return, sticky, busy/disabled, wrapped actions |
| SP-G07 | Hành vi/architecture giữ nguyên | Boundaries/type/lint/domain/unit/build và journey regression theo diff; full built-demo suite trước đóng task |
| SP-G08 | Handoff đúng nguồn cuối | Source/artifact hashes, rule/exception matrix, routes/states/results và các giới hạn |
| SP-G09 | Typography/palette/radius/elevation/focus/breakpoint trỏ đúng theme/token | Visual-token checker/fixtures đã nối verify; audit ghi rõ các bypass còn thiếu. Gia cố theo §16, không lấy source0 findings hoặc planned validator làm full coverage PASS |

Không bắt tạo Cartesian product mọi role×route×state×9 viewport nếu không có rủi ro; ưu tiên smoke đủ routes, shared state representative và journey có mutation/permission/draft. State matrix tối thiểu gồm loading, empty, error, forbidden, stale, submitting, validation, conflict/unknown khi route có semantics đó. MUI menu/dialog portaled phải nằm trong phép đo khi có thay đổi slot.

**SPC-031 — Hai trục UI/ARCH trong cùng task.** UI có expected/observed gap/target/reflow; ARCH có owner/token/import/state/contract verdict riêng. Module không import module khác. Không layout change gây remount, mất draft, đổi query key, permission logic hoặc mock/live boundary. Không thêm dependency/ThemeProvider để normalize spacing. Preset dùng `SxProps<Theme>`/typed slots phù hợp; test cơ chế shared thay vì snapshot từng literal.

**SPC-032 — Chỉ đóng task từ evidence.** UI028 C03–C05 chỉ đạt khi source được đổi và các gate cần thiết đã chạy trên fingerprint cuối. Technical acceptance không là owner acceptance. FE tracker chỉ cập nhật bằng script canonical với acceptance nguyên task, không lấy checklist spacing để cộng điểm. Screen-reader speech/hosted CI không có vẫn ghi NOT_RUN theo scope; không biến thành dependency chờ giữa chừng.

## 11. HISTORICAL_SNAPSHOT — thứ tự/targets migration UI028 ban đầu

1. **Nền tảng:** giữ base 8; typed semantic presets, raw override units, exception policy và checker. Làm một writer cho theme/shared/Shell.
2. **Common owners:** Shell, PageHeader, Panel inset/flush, Stat/Stats, Toolbar/DataTable/Pager, Empty/QueryState, EditDialog/ConfirmDialog. Đo một đại diện form/table trước khi module migration vì common change ảnh hưởng nhiều route.
3. **Feature flows:** catalog/import/editor và orders trước; sau đó customers/inventory/finance/procurement/fulfillment/knowledge/bot/integrations/notifications/operations/workspace. Inbox/report có profile chuyên biệt và geometry review riêng.
4. **Validation:** route smoke + boundary widths + typography override + permission/draft/unknown/error journeys; sửa lỗi thật, không tăng threshold hoặc gắn exception đại trà.
5. **Handoff:** generate/checks/source+artifact hashes và UI/ARCH verdict; cập nhật UI028/C03–C05 rồi chuẩn bị nghiệm thu cuối.

Đích ban đầu cho các candidate là preset, không nearest-number rounding: sidebar gap9.6→8, brand20→16, nav edge10→12, group5.6→4, nav6.4→8, row2.4→4; CTA inset ngang16/dọc8 và target44; bubble14.4→12; auth40→32; list indent40 compose24+16. Đây là targets lịch sử, kết quả implementation theo hash ở W evidence/REPORT. Không diễn giải targets này thành source debt hiện hành hoặc chỉ dẫn triển khai lần hai. Thứ tự công việc mới nằm duy nhất trong plan §16; workflow hiện hành ở §0.

## 12. Đường vào thực hiện cho AI sửa UI

Thực hiện [workflow duy nhất §0](#unified-workflow), dùng catalog CURRENT/TARGET và plan §16. Phần này không có checklist rút gọn cạnh tranh. Quy tắc chi tiết giữ SPC IDs bên dưới; fields bằng chứng tại §13.2. Task nhỏ ghi ngắn trong artifact hiện có; shared change mở đủ consumer/route/slot/state impact. Không sửa generated plan/full-product ledger để đóng việc.

## 13. Quy trình phòng ngừa tái phạm cho UI mới

Áp dụng cho **thêm màn hình, component, dialog, state, bộ lọc, action, biểu đồ, pane hoặc sửa giao diện đang có**, kể cả thay đổi nhỏ. Workflow duy nhất ở §0. Strict gates hiện đã chạy trong verify, nhưng audit chứng minh coverage cần gia cố; nợ migration Wxx là lịch sử. Tài liệu/fixtures/source0 findings không chứng minh consumer đã tuân thủ mọi path hoặc không còn regression.

**SPC-033 — Lập bản đồ trước khi thiết kế.** Trước viết JSX/style, xác định task/route/module, profile phù hợp (collection/form/detail/dashboard/report/auth/panes), shared components đang có, role/inset/gap owner và các states của workflow. Đọc file này, `DESIGN.md`, `UX-CONTRACT.md`, token/theme/shared source thực tế. Không copy spacing từ screenshot, prototype HTML, màn hình cũ chưa migrate hoặc snippet ngoài repo. Ghi role map ngắn trong evidence của chính task; không cần một tài liệu/ledger mới cho từng nút.

**SPC-034 — Dùng lại trước, không tạo hệ riêng.** Chọn shared owner/profile/semantic reference trước khi thêm style. Cấm spacing map, ThemeProvider, token palette, breakpoint hoặc bản sao Panel/Form/Table/Dialog dành riêng cho một màn hình. Giữ typography/radius/focus/target theo theme/token hiện có; không font nhỏ hay height cứng để nhét nội dung. Local composition được phép cho geometry/behavior nghiệp vụ, nhưng các spacing phải dùng bridge. Nếu bridge/shared contract cần thiết chưa có, triển khai prerequisite nhỏ trong cùng task được giao trước khi viết consumer; không né bằng literal hoặc tạo bước chờ owner cho quyết định trình bày thông thường.

**SPC-035 — Thêm role bằng quy trình mở rộng có bằng chứng.** Chỉ thêm role nếu quan hệ UI khác về ý nghĩa/owner hoặc responsive/state và các role hiện có không đáp ứng; cùng pixel nhưng khác nghĩa có thể là role khác, không thêm alias chỉ theo tên route. Quyết định thêm role được AI tự ghi/review trong scope, không cần một approval trung gian. Role mới phải định nghĩa tại bridge shared, dùng scale/token đã có, typed API và cập nhật bảng semantic/profile ở file này. Không mở rộng atomic scale để hợp thức hóa một literal. Nếu đổi role hiện có thì giữ tên/semantics hoặc nêu migration rõ; tìm toàn bộ consumer qua import/reference và chạy regression phạm vi bị ảnh hưởng.

Hồ sơ tối thiểu cho một role mới/role bị đổi, đặt trong evidence của task:

| Trường | Nội dung bắt buộc |
|---|---|
| Role / owner | Tên theo quan hệ UI, component/slot sở hữu |
| Nhu cầu | Trigger thực; vì sao role hiện có không phù hợp; tái dùng hay thêm mới |
| Giá trị và units | Canonical token; MUI factor hoặc CSS px; không lẫn đơn vị |
| Responsive / state | Mobile/tablet/desktop và thay đổi khi error/busy/text dài nếu có |
| Consumers / impact | File/component/route sử dụng; các consumer cũ bị ảnh hưởng |
| Verification | Expected/observed, checker và render/journey checks theo diff, source/artifact hash |

**SPC-036 — Không có đường tắt qua style.** Quy tắc nguồn spacing áp dụng đồng thời cho `sx`, JSX System props, `styled`, CSS classes, inline style, responsive objects, callback/helper, `slotProps`, object spread và portal slots. Cấm đổi tên literal thành `const formGap=2` ở module; cấm spread preset rồi override p/m/gap, cast `any`, suppression hoặc `!important` để thắng shared inset. Không dùng spacer rỗng, `<br>` lặp, `vh` margin, shrink font/target hoặc `overflow:hidden` để giấu lỗi bố cục. Reset/intrinsic/geometry/platform exceptions vẫn theo mục 9, có category/scope đúng; không cấm clipping hình ảnh hợp lệ bằng quy tắc cho nội dung thường.

**SPC-037 — Ngoại lệ phải được quản lý đến khi bỏ.** Geometry/COMPOSITE/PLATFORM/A11Y_MECHANISM/OPTICAL chỉ được ghi theo property/component/value/units và điều kiện cụ thể, có reason/bounds/evidence/owner. Không allowlist cả file/module hoặc tất cả số lẻ. Checker phải báo entry không khớp/không còn dùng; đổi component/role/breakpoint/library hoặc reproduction mất hiệu lực thì tái kiểm và cập nhật/bỏ entry. Không sao chép ngoại lệ của route khác để làm shortcut. Ngoại lệ presentation thường lệ do AI phân tích trong scope; không tự phê duyệt policy nghiệp vụ/contract nằm ngoài task.

**SPC-038 — Test theo tác động, bảo vệ hành vi thật.** UI mới kiểm các states áp dụng: loading/empty/error/forbidden/stale/submitting/validation/conflict/unknown, long Vietnamese label/ID, focus và hành động. Mọi route chịu ảnh hưởng của shared change phải có route smoke/render verdict ở small/large viewport theo SPC-057/071; kiểm state/variant/zoom/journey sâu theo impact có lý do và coverage khai báo. Một representative route không thay các affected routes còn thiếu. Form/dialog/panes giữ text/scroll/draft cases. Tests bắt double inset, override, reflow hoặc mất behavior, không chỉ đếm preset/snapshot. Docs/copy-only không đổi layout chọn checks theo diff và ghi lý do; unrun không là PASS.

**SPC-039 — Gate phải chạy thật trước khi đóng UI.** Mọi task tạo/sửa layout chạy strict layout/visual-token/composition gates trong npm run verify, generator freshness và render/behavior regression theo impact. Violation/UNKNOWN/parse failure hoặc gate skip không là PASS. Trạng thái migration debt Wxx thuộc lịch sử; task hiện tại không được dùng journal cũ để đóng khi global strict gate FAIL. Không hạ threshold/suppress/đổi checker để diff xanh. Hosted CI chưa chạy không là PASS và không là bước chờ giữa chừng; clean-local equivalent theo Frontend scope vẫn áp dụng.

**SPC-040 — Đóng việc và bàn giao có traceability.** Mỗi task UI ghi role/profile/owner đã dùng/thêm/đổi, nguồn literal/override đã loại, exception scope, tests/commands/exit code/viewport/state/hash và verdict `UI`/`ARCH` riêng. Code, bảng semantic, tests và hướng dẫn tiếp tục phải khớp trước bàn giao. Thêm route mới sau UI028 cập nhật nguồn route được giao, implementation mapping và coverage theo manifest thực; không coi 54 là allowlist vĩnh viễn hoặc để route mới ngoài checker. Dùng task/ledger tương ứng, không nhét mọi feature tương lai vào UI028 hoặc tạo một tracker spacing chép tay. Không đóng task khi implementation/gate cần thiết còn TODO; không tự owner acceptance, hosted PASS hoặc production certification.

**SPC-041 — Chốt hợp đồng bố cục trước khi viết UI.** Trước JSX/CSS, đính kèm vào evidence của task một UI design contract ngắn: route/profile, vùng `header/content/footer` hoặc pane, semantic role và owner cho từng inset/gap, breakpoint cần hỗ trợ, typography/token liên quan, state/text dài cần giữ và shared component sẽ tái dùng. Với mỗi container, chỉ định rõ parent hay child sở hữu inset để không cộng padding hai lần. Contract được so lại với rendered UI ở viewport đại diện sau khi code; nếu thiếu role, bổ sung vào bridge trong cùng task có consumer Frontend cụ thể, cập nhật source/test trước khi consumer tham chiếu theo SPC-053; không thêm role dự phòng hoặc số cục bộ để bù. Task nhỏ ghi ngắn trong evidence task hiện có; không tạo tài liệu hoặc tracker riêng.

**SPC-042 — API shared component phải khóa spacing tại type boundary.** Component dùng lại không nhận generic `sx`/style object nào có thể ghi padding, margin hoặc gap. Chỉ mở union slot có ý nghĩa (`bodyMode`, before/after semantic gap) và prop geometry type đóng như `display`, `flexDirection`, `height`, `gridColumn`; không đưa spacing key vào geometry. Shared component ghép preset từ `layout.ts`, không forward style spread không thể truy nguyên. Nếu tạm giữ style forwarding để tương thích trong migration, checker phải phân tích mọi consumer, unresolved source bị FAIL và kế hoạch phải chỉ rõ bước gỡ API cũ; không dùng exception để che style. Mọi API mới phải có typecheck và checker fixture chứng minh geometry hợp lệ được nhận, spacing/unknown bị từ chối.

**SPC-043 — Typography và màu cũng dùng một nguồn giao diện.** UI kế thừa typography, palette, radius, elevation, focus và density từ canonical tokens/generated/theme. Không route-local font/color/shadow/radius để cân màn; không thu nhỏ chữ/line-height/target để nhét nội dung. Vai trò mới cần rationale/profile/consumer impact và test tại owner chuẩn; không đổi canonical để hợp thức hóa màn riêng. Spacing checker và visual-token checker là hai gates hiện có, chạy trong verify; visual gate chưa bao phủ đầy đủ các đường source theo audit §13.5. Source review + render hierarchy/contrast/accessibility vẫn cần theo impact, không chỉ cùng số px.

**SPC-044 — Baseline và bằng chứng render phải có provenance.** Chụp baseline trước lần sửa source đầu tiên của task; cùng artifact ghi thời điểm, route, seed/mock mode, browser, viewport, state, revision và SHA-256 của các source liên quan. Ảnh/đo sau khi code đã đổi không được đặt tên hoặc dùng như “before”; nếu baseline bị bỏ lỡ hay chạy nhầm, giữ artifact nguyên trạng, ghi `BASELINE_NOT_CAPTURED`/`DIAGNOSTIC_ONLY` và tiếp tục bằng source inspection cùng kiểm tra sau sửa. Không ghi đè file baseline; lưu kết quả mới bằng tên mới. Before/after phải dùng cùng route, dữ liệu, browser, viewport và state để so sánh có nghĩa; kết luận dựa trên computed geometry, behavior/accessibility checks áp dụng và visual inspection, không dựa riêng vào screenshot hoặc snapshot.

**SPC-045 — UI mới không được làm tăng layout debt.** Trước khi sửa UI, lưu kết quả `node scripts/check-layout.mjs --report --json` làm baseline trong evidence của task; sau sửa chạy lại cùng checker/version/options và so sánh finding theo file, property, normalized value, code và số lần xuất hiện (không dùng line number làm định danh). Không finding nào mới được phép xuất hiện trong file/task đang chạm, kể cả khi giá trị đúng scale. File mới phải có 0 finding; finding cũ trong file đang sửa phải giảm hoặc giữ nguyên và được gắn đúng owner/W-ID, không được chuyển property/file hoặc đổi category để làm giảm số. HISTORICAL_SNAPSHOT: trong migration Wxx trước W26, task từng ghi **0 finding phát sinh trong diff** cùng global debt FAIL. Allowance này đã hết ở workflow hiện hành; không dùng lịch sử để đóng source task mới khi strict toàn scope FAIL. Nếu không có baseline hợp lệ, ghi `BASELINE_NOT_CAPTURED`, dùng source diff + strict scan hiện tại làm bằng chứng hạn chế và không tự kết luận “không regression”. Sau W26, điều kiện đóng bình thường là strict toàn scope PASS/0 finding.

**SPC-046 — Mọi quyết định thị giác phải truy về theme/token và được audit riêng.** Typography, font family/size/weight/line-height, màu chữ/nền/viền và màu biểu đồ, radius, shadow/elevation, focus ring, density và breakpoint dùng semantic variant/role/theme hoặc canonical token; không khai báo giá trị thị giác rải rác trong route/component để cân riêng một màn hình. Geometry nghiệp vụ (width/height/grid position/chart coordinates), CSS reset, system colors/forced-colors và giá trị intrinsic không bị nhầm thành token thị giác; ngoại lệ phải có scope/category/evidence theo SPC-037. Nếu thiếu vai trò, mở rộng theme/token tại đúng owner và ghi consumer impact trước khi dùng. Checker AST/style-aware hiện có phải gia cố coverage theo plan §16 cho TS/TSX/JSX/CSS và các cách khai báo `sx`, System props, `styled`, `slotProps`, callback, alias/spread; kiểm token resolve được, nhận diện literal ngoài nguồn, và coi parse/unresolved dynamic source là `FAIL`/`UNKNOWN`, không bỏ qua. Tạo positive/negative fixtures theo từng họ property và đường khai báo; giữ command chuyên biệt trong `npm run verify`, kiểm generated output bằng `generate:check`, không sửa tay token được sinh. Mọi task UI vẫn review source diff đối chiếu theme/token, ghi `VISUAL_SOURCE_REVIEW` cùng file/property/verdict cho phần chưa được gate chứng minh. Review không thay strict FAIL/UNKNOWN; không thêm raw visual literal mới hoặc gọi phần chưa kiểm là checker PASS. Source checker chỉ xác minh nguồn/role, không thay render review, hierarchy, contrast hay accessibility checks theo impact.

**SPC-047 — Hành vi và cấu trúc UI phải truy ngược được về contract chuẩn.** Trước khi thiết kế route/action/form/state, đối chiếu route ID, capability/permission, operation, field, trạng thái và lỗi với `route-manifest.json`, `contracts/openapi.json`, `UX-CONTRACT.md` cùng mock/frontend flow hiện có; token/theme và quy tắc trình bày lấy từ `design/tokens.json` và shared UI. Không suy diễn thêm route, quyền, thao tác, dữ liệu hoặc kết quả tích hợp từ ảnh chụp, prototype HTML hay UI cũ. Nếu yêu cầu Frontend cần hành vi chưa có trong contract, ghi rõ `FRONTEND_ONLY_GAP` và phần UI/mock có thể biểu diễn trung thực; không dựng Backend, endpoint hay success giả để làm màn hình có vẻ hoàn chỉnh. Bằng chứng task phải nêu nguồn/ID đã đối chiếu và expected/observed action/state tương ứng.

**SPC-048 — Màn hình cùng profile phải đối chiếu cùng một chuẩn đã duyệt.** Với mỗi UI mới hoặc thay đổi cấu trúc, chọn một route đã migrate/đạt layout gate có cùng composition profile và ghi ID, path/title cùng artifact/code chứng minh profile đó trong design contract. Xác minh route tham chiếu thực sự có cùng cấu trúc hiển thị; cùng module, domain hoặc dùng chung một component riêng lẻ chưa đủ để kết luận cùng profile. Trước JSX/style, đối chiếu shell/container/content width, header/hierarchy, semantic spacing roles/inset owner, typography/theme roles, primary action, breakpoints và states. Không lấy UI cũ chưa migrate làm chuẩn. Nếu chưa có route đại diện phù hợp, dùng bảng semantic/profile ở §13.3; chỉ khai báo shared variant trong cùng task có consumer cụ thể theo SPC-053. Mọi sai khác với profile phải có nguồn gốc workflow/data density/responsive được ghi trong contract và dùng shared role/variant có tên; route-local aesthetic override hoặc khác biệt theo sở thích không được chấp nhận. Sau render, so sánh đúng route/state/viewport tương đương, ghi expected/observed và giải thích từng khác biệt còn lại. Profile khác nhau không phải ép cùng mật độ/hình học.

**SPC-049 — Cổng bắt đầu/đóng task UI phải fail closed.** Trước source edit đầu tiên, ghi UX intent/design contract, route/profile/reference hoặc semantic baseline, owner map/states/viewports/invariants và baseline có hash theo SPC-041/044/048. Trước đóng, có strict checker reports/lệnh/exit thật, zero unauthorized findings, rendered/behavior coverage theo impact, current hashes, UI/ARCH verdict và giới hạn. Missing/UNKNOWN/NOT_RUN không được nhận PASS. Nếu baseline thực bị mất/sai, áp dụng SPC-070: tiếp tục implementation/current render với evidence hạn chế nhưng paired regression NOT_VERIFIED; không đóng paired acceptance hoặc dựng lại before. Review thủ công không là automated PASS. Không tạo approval/ledger trung gian; docs-only không đổi UI ghi checks theo impact và không fake render/build verdict.

**SPC-050 — Quy định không hết hạn cùng đợt UI028.** W01–W36 là đợt chuẩn hóa/migration ban đầu, không phải thời hạn của quy định. Sau W36, mọi feature, route, dialog, state hoặc refactor UI vẫn phải tuân SPC-001–075, đồng thời dùng source hiện hành trong `design/tokens.json`, theme và shared bridge; không lấy việc UI028 đã DONE làm lý do bỏ UX contract, layout contract, baseline, checker hay regression. Khi thêm/đổi token, role, profile, slot API hoặc ngoại lệ, cùng task phải cập nhật nguồn chuẩn, bảng semantic, checker/fixtures/`verify` và hồ sơ impact trước khi consumer dùng. Gate phải bao phủ file React/TS mới và route mới được giao; allowlist cố định, nguồn không resolve hoặc checker bị bỏ qua không được tính là sạch. AI không được bỏ test, nới ngưỡng, che FAIL/UNKNOWN, giả trạng thái DONE hoặc xóa gate bắt buộc để làm xanh kết quả; chỉ thay guard khi guard tương đương đã có positive/negative/UNKNOWN fixtures, run evidence và traceability, rồi được nối lại vào `npm run verify` và workflow đang hoạt động. Không tạo approval trung gian hay ledger riêng.

**SPC-051 — Reflow, tăng cỡ chữ và browser zoom là các phép thử riêng.** Với UI có nội dung chữ hoặc thao tác, dùng bố cục co theo nội dung; không đặt chiều cao cố định làm cắt nhãn, thông báo lỗi, mô tả, tên dài, mã định danh hoặc action. Chỉ ellipsis khi người dùng vẫn truy cập được toàn bộ giá trị bằng cách phù hợp (ví dụ mở chi tiết hoặc copy). Theo rủi ro của route, xác minh riêng ở viewport hẹp/thấp được hỗ trợ, tăng cỡ chữ 200% và browser zoom thật 200%; không dùng CSS `font-size`, `zoom` giả lập hoặc đổi viewport để tuyên bố browser-zoom PASS. Expected: không có cắt/chồng lấn, page ngang tràn ngoài vùng cuộn được chỉ định, thao tác và focus bàn phím vẫn tới được, dialog/drawer còn cuộn và đóng được. Evidence phải ghi từng phép thử là `VIEWPORT_REFLOW`, `TEXT_RESIZE_200` hay `BROWSER_ZOOM_200` cùng method, route/state, viewport, expected/observed và artifact. Nếu môi trường không đo được phép thử liên quan, ghi `NOT_RUN`; không ghi PASS và chưa đóng phần UI bị ảnh hưởng.

**SPC-052 — Chốt ý định UX và tiêu chí chấp nhận trước khi dựng UI.** Bổ sung vào design contract/evidence của task theo SPC-041, không tạo tài liệu hoặc tracker trùng lặp: vai trò người dùng dựa trên `DESIGN.md`/`UX-CONTRACT.md`; công việc chính và kết quả người dùng cần đạt; route/điểm vào, hành động ưu tiên và kết quả/điều hướng sau hành động; thông tin, quyền và trạng thái truy về route manifest/OpenAPI/UX contract; các trạng thái áp dụng (loading, empty, error, forbidden, validation, busy, success, stale, conflict, unknown) cùng cách khôi phục, giữ draft và focus; cấp bậc nội dung, microcopy tiếng Việt, bàn phím/accessible name/status và viewport cần hỗ trợ; tiêu chí chấp nhận dạng thao tác → kết quả quan sát được. Ghi `N/A` kèm lý do cho trạng thái không áp dụng. Không tự bịa persona/thị trường/chính sách, quyền, dữ liệu hoặc kết quả Backend; giả định phải được đánh dấu, thiếu contract ghi `FRONTEND_ONLY_GAP` và chỉ thiết kế hành vi Frontend/mock trung thực. Trước khi đóng, đối chiếu expected/observed trên UI đã render và regression theo SPC-038–053; ảnh tham khảo hay source scan riêng không chứng minh luồng dùng được.

**SPC-053 — Không export semantic role khi chưa có consumer thật.** Role spacing/layout dùng chung chỉ được thêm vào bridge/runtime API khi có ít nhất một consumer Frontend cụ thể trong phạm vi task. Evidence hiện có phải ghi semantic owner, token nguồn, đơn vị, breakpoint/responsive behavior, toàn bộ consumer/route và regression liên quan; cập nhật cùng lúc type, implementation, semantic table hoặc profile owner liên quan, checker và positive/negative fixtures. Không giữ role “dự phòng”, speculative role hoặc alias trùng nghĩa trong public map. Nếu role không còn consumer, gỡ khỏi type, implementation và semantic table/profile tương ứng trong cùng thay đổi; khi phát sinh nhu cầu mới, tạo role trong task có consumer đầu tiên. Audit ownership phải xác nhận type/implementation và semantic/profile owner được ghi khớp; M02 chỉ PASS khi mỗi role có đúng một owner và có consumer thật. Không tạo map cục bộ trong module.

**SPC-054 — Giải quyết xung đột nguồn thiết kế trước khi viết UI.** Khi nguồn tham khảo mâu thuẫn, áp dụng thứ tự thẩm quyền: hành vi/route/quyền/dữ liệu lấy từ route manifest, OpenAPI và UX contract; giá trị giao diện nguyên tử lấy từ design/tokens.json cùng output sinh; mapping runtime lấy từ theme/shared layout bridge; quy tắc composition/ownership lấy từ standard này và semantic profile. Route đã migrate là bằng chứng so sánh, không thay nguồn chuẩn; ảnh, prototype HTML, UI cũ và mockup chỉ là tham khảo. Ghi conflict cụ thể và các nguồn liên quan trong evidence hiện có của task. Trước JSX/style, sửa đúng canonical owner; nếu có generated output thì chỉ sinh bằng generator, đồng bộ semantic/profile map, checker và positive/negative fixtures, rồi rà soát consumer bị ảnh hưởng. Chạy npm run generate:check, npm run verify và regression render/hành vi theo impact trước khi đóng. Không giải quyết conflict bằng token trùng, route-local override hoặc copy spacing/font/color từ ảnh/UI cũ. Nếu hành vi chưa có trong contract, xử lý theo SPC-047 bằng FRONTEND_ONLY_GAP; nếu nguồn chưa được giải quyết hoặc gate liên quan chưa chạy, ghi NOT_RUN/UNKNOWN và chưa bắt đầu consumer UI/chưa đóng task. Không tạo approval trung gian hay tracker riêng.

**SPC-055 — Khóa lỗi UI đã phát hiện bằng regression để ngăn tái phạm.** Khi task UI tìm thấy lỗi có thể tái hiện hoặc vi phạm quy định, evidence của chính task phải ghi trigger, nguyên nhân gốc, invariant bị phá và các owner/profile/route consumer bị ảnh hưởng; không chỉ sửa riêng màn hình vừa phát hiện. Thêm test/fixture hẹp nhất có thể tái hiện cùng lỗi: source-policy violation dùng negative fixture của checker; lỗi hành vi/layout dùng regression trên state, viewport và consumer chịu ảnh hưởng. Chạy regression đó trên source cuối và xác nhận nó bắt đúng lỗi trước khi sửa (nếu có baseline tái hiện) nhưng PASS sau sửa; không nới ngưỡng, suppress finding hoặc đổi assertion để làm test xanh. Nếu không thể tự động hóa hợp lý, evidence phải ghi `MANUAL_ONLY`, lý do, các bước thao tác chính xác và expected/observed; không gọi là automated PASS. Nếu nguyên nhân cho thấy canonical rule/owner còn thiếu hoặc mơ hồ, cập nhật đúng standard/token/theme/shared owner, checker/fixture và tài liệu hướng dẫn trong cùng scope. Task chỉ đóng sau khi rà soát các consumer cùng owner/profile; không tạo approval hay tracker riêng.

**SPC-056 — Kiểm tra che khuất do lớp nổi và vùng cố định.** Với UI có `position: sticky/fixed`, banner/action nổi, menu/popover, drawer hoặc dialog, kiểm tra trên browser render thật rằng nội dung và các hành động cần dùng vẫn nhìn thấy, có thể focus bằng bàn phím và nhận click/tap; chỉ kiểm `overflow`, kích thước hộp hoặc ảnh tĩnh là chưa đủ. Regression phải đo giao nhau/che khuất và dùng hit-testing hoặc thao tác browser cho các target trọng yếu tại viewport nhỏ/thấp phù hợp, gồm state có text dài và text resize khi áp dụng SPC-051. Ghi selector/target, route, state, viewport, expected/observed và ảnh/log trong evidence hiện có. Modal được phép che nội dung nền có chủ đích khi dialog semantics, focus containment/return, đóng và cuộn nội dung hoạt động; mọi overlap ngoài vùng modal được chủ ý phải được sửa hoặc có ngoại lệ hẹp theo SPC-037, không tăng z-index hay bật `overflow:hidden` để che triệu chứng. Lỗi tái hiện được phải thêm regression theo SPC-055 và chạy trên source cuối.

**SPC-057 — Kiểm kê impact và hồi quy trên mọi consumer của shared UI. Trước khi sửa shared component, theme/token, semantic role, profile, layout bridge hoặc checker, lấy danh sách consumer thật từ import graph và route-manifest.json; ghi owner, contract/role, consumer file, route ID, profile và state bị ảnh hưởng trong evidence task hiện có. Sau sửa, ma trận regression phải liệt kê từng route consumer chịu ảnh hưởng và kết quả cho state/viewport liên quan; một route đại diện chỉ đủ khi một automated run thật sự bao phủ và ghi kết quả cho toàn bộ danh sách. Nếu thay đổi chỉ thuộc một route, ghi rõ owner là route-local và không suy diễn rằng consumer khác đã được kiểm. Consumer không chạy được phải để NOT_RUN kèm lý do và task chưa đóng cho tới khi rủi ro được kiểm chứng; không lược route khỏi ma trận, sửa một màn rồi suy rộng kết quả, hoặc dùng exception/suppression để che finding. Khác biệt nghiệp vụ được phép phải thành shared variant có consumer thật theo SPC-053; regression lỗi đã tìm được vẫn phải tuân SPC-055.**

### 13.1. Quy trình cho mỗi lần thêm hoặc sửa UI

Áp dụng nguyên [workflow §0](#unified-workflow): intake → inventory → intent/contract → baseline → reproduction → owner/consumer edit → source checks → rendered behavior → reconciliation/handoff. Không có workflow thứ hai trong catalog/AGENTS/plan. Các task hiện hành của plan §16 dùng đúng đường này, với depth theo impact.

### 13.2. Fields bằng chứng của chính task

Đây là fields của artifact, không một workflow hoặc tracker mới. Có thể dùng Markdown/JSON hiện có; task nhỏ không phải dựng schema engine. Validator S17 là `scripts/validate-ui-evidence.mjs`; fixture của nó chạy trong `npm run verify` qua `test:evidence`. Validator bắt thiếu lệnh/kết quả/log, exit khác 0 được khai PASS, expected/observed lệch nhau, coverage khai thiếu/không nhất quán, N/A không có lý do, đường dẫn ngoài repo và SHA-256 stale của source/log. Baseline phải ghi `CAPTURED` với artifact/hash trước `implementationStartedAt`, hoặc `BASELINE_NOT_CAPTURED`/`DIAGNOSTIC_ONLY` có lý do và không thể đóng acceptance. Với S19, validator bắt buộc đủ miền `source-files`, `shared-api-exports`, `route-mappings`, `rendered-routes`, `slots`, `states`, `baseline-records`. Validator kiểm schema/provenance khai báo, không tự chứng minh log, ảnh hoặc phép đo có thật.

| Nhóm fields | Nội dung cần ghi | Nguồn acceptance |
|---|---|---|
| Identity/scope | Task/step, mode, cwd/revision, dirty work, file treatments/import closure, exclusions/reasons, user request | §0/SPC-064/066/074 |
| Intent/contract | Role/job/outcome, route/operation/local owner, actions/state/keyboard/feedback, assumptions/gaps, N/A reasons | SPC-047/052/054/058/059 |
| Design/owner | Route +slot +state +profile/reference, hierarchy, edge/gap/distribution/wrap, token/unit/geometry, existing/target finite API | SPC-014/035/041/048/060/067–069 |
| Baseline | Before time/hash/seed/browser/viewport/state/artifact; checker version/options; baseline missing label retained | SPC-044/045/049/070 |
| Impact | Every affected file/consumer/route, state/variant cases, portal/fallback/native/style entries, exact expectations | SPC-038/057/066/071 |
| Change/reproduction | Trigger/root cause/invariant, chosen minimal approach, negative +positive +UNKNOWN fixtures, backward behavior | SPC-055/065/072/073 |
| Results | Actual commands/cwd/exit/hash/artifacts; expected/observed; source scan counts vsinventory; reflow/text/zoom/focus/hit methods | SPC-029–031/039/051/056/063/071 |
| Closure | UI/ARCH verdict separate, findings/limits/open proof, final file/route/branch reconciliation, catalog/docs matching | §0.4/SPC-032/040/074/075 |

Acceptance chỉ bốn verdict tại §0.4. Missing mandatory data/checks không PASS hoặc DONE; delivery with limits không thay paired/native/behavior proof. Giữ nguyên failed run và retest riêng; không đổi thresholds/suppress để đóng.

### 13.3. Mẫu đối chiếu profile để ngăn lệch giữa các màn cùng loại

#### Bảng profile semantic dùng khi chưa có route tham chiếu phù hợp

Profile phân loại theo bố cục và cách người dùng thao tác, không theo tên module/API. Dùng role hiện có làm baseline; nếu thiếu role, thêm typed shared role/variant trong task có consumer đầu tiên theo SPC-053 và ghi tác động tới mọi route dùng chung.

| Profile | Bố cục/invariant chuẩn | Semantic owners mặc định | Khi không có route mẫu |
|---|---|---|---|
| Auth và setup | Surface hẹp căn giữa; brand → title/description → fields → primary action; page gutter không nhân đôi với surface inset. | `shell.centeredFallback`, `auth.*`, `form.fieldGap`, `actions.*` | Dùng bảng này; giữ nội dung auth dễ đọc, xác định rõ page inset và card inset độc lập. |
| Form và settings | Header/description → panel/form group → field, hint/error, action; field gap 16, inline gap 8; hint/error gắn với field, group boundary do form container sở hữu; chỉ thêm shared role khi có consumer cụ thể. Giới hạn dòng thuộc form container, không ép từng input. | `pageHeader.*`, `surface.headerInset/bodyInsetAfterHeader`, `surface.inset`, `form.fieldGap`, `form.inlineGap`, `actions.*` | Chọn form/settings có cùng số cột và kiểu action; nếu không có, ghi rõ responsive/cột và form max-width trong contract. |
| Collection/table | PageHeader → toolbar/filter → table → pager; slot owner rõ; table scroll ngang nội bộ được phép trên mobile nhưng page không tràn. | `pageHeader.*`, `toolbar.*`, `table.*`, `pager.*`, shared `Toolbar`/`DataTable`/`Pager` | Chọn một route đã migrate có toolbar/table/pager composition; dữ liệu cùng domain không bắt buộc. |
| Detail/job | PageHeader → status/progress → facts/detail lines → related results/errors/actions; unknown/empty/error text giữ nguyên. | `pageHeader.*`, `surface.inset`, `detail.*`, `query.stateGap`, `actions.*` | So route có cấu trúc detail tương đương; nếu không có, dùng thứ tự semantic này và nêu state khác nhau. |
| Dashboard/report | Filters/as-of → stat grid → grouped sections/chart/table; metric hierarchy và dữ liệu rỗng không tạo whitespace giả. | `stats.*`, `grid.gutter`, `dashboard.*`, `report.*`, `page.sectionGap` | So cùng loại summary/chart; không dùng trang collection làm mẫu chỉ vì có cùng header. |
| Queue/workflow/panes | Preview/review context → actionable queue; pane và vùng cuộn có owner riêng; row actions/focus không bị che. | `navigation.*`/`inbox.*` theo pane, `toolbar.*`, `table.*`, `dialog.*`, `actions.*` | So cùng workflow queue/pane nếu tồn tại; ghi density/action differences theo nghiệp vụ. |
| Dialog/drawer | Title/description → form/content → actions; viewport margin, content inset, scroll/focus/return-focus được bảo toàn. | `dialog.*`, `form.*`, `actions.*` | Chọn dialog tương đương hoặc dùng chuẩn dialog này; so ở viewport thấp/hẹp và text dài. |

Không dùng một route thuộc profile khác làm bằng chứng hình thức. Ví dụ, trang tổng quan tài chính không phải route collection/table chỉ vì cùng thuộc finance; trang danh sách đơn hàng không phải form chỉ vì có modal tạo đơn. Nếu profile trong contract không khớp route screenshot/source, sửa mapping và chạy lại phần review trước khi đóng task.

Đưa các trường sau vào design contract/evidence hiện có của task; không tạo ledger hoặc file quy định riêng cho từng route:

| Trường | Ghi gì |
|---|---|
| Route/profile | Route và profile theo SPC-033; route/action/state IDs theo SPC-047 |
| Màn đại diện | ID/path/title + artifact/code của route đã migrate cùng profile; nếu không có, ghi rõ và dùng bảng §13.3 |
| Invariants | Container/header, hierarchy/primary action, semantic roles/inset owner, type/theme roles, breakpoint và state phù hợp |
| Sai khác dự kiến | Mỗi khác biệt do workflow, dữ liệu hoặc responsive behavior; lý do và shared variant/role nếu cần |
| So sánh sau render | Cùng viewport/state đại diện; expected/observed, sai khác còn lại, source/artifact hash |

Thiếu màn tham chiếu không chặn task: tự xác định từ profile table và tạo/đổi shared variant trong scope nếu có căn cứ. Thiếu rationale cho một khác biệt hoặc chỉ có route-local visual override thì chưa đạt review UI. `VISUAL_SOURCE_REVIEW` và checker theo SPC-046 vẫn phải được ghi đúng trạng thái; SPC-048 là kiểm tra nhất quán theo profile, không được tự gọi là automated gate.

**HISTORICAL_SNAPSHOT — enforcement tại W32:** spacing và visual-token checkers đã được nối vào `npm run verify`; strict scans trên 68 source files có 0 finding cho cả hai checker. W28 đo đủ 54 route ở 390/1440 px trên Chromium/Firefox (216 observations, 0 issue) sau khi cập nhật assertion mobile; W29 đo 9 chiều rộng 320–1920 px, 7 profile trên hai browser (18 cases, 0 issue/page error). W30 DOM text/spacing stress đạt 10/10; browser zoom thật 200% trên Chromium và native text-only resize 200% trên Firefox đều đạt 5/5 trạng thái, với viewport/DPR giữ cố định trong phép thử text-only và năm capture được review. W31 regression đạt 148/148. W32 built-demo artifact hash `6f4120d693536fd4f9ca8d417604c9d4cc16cfc2bcc46ccddbbec25405d978f2` đạt smoke 2/2 và route matrix 216/216; default full suite đạt 480/484 ở lượt đầu, bốn stale-selector cases đạt 4/4 ở targeted retest source mới. W33 M01–M07 PASS, M08 còn mở do FE evidence freshness; kết quả này không thay profile review, rendered-flow review hoặc FE checkpoint acceptance. SPC-048 vẫn cần đối chiếu profile bằng route/source/render evidence, không được gọi riêng là automated gate. Không suppress finding hoặc nới checker. SPC-045 cấm regression mới; SPC-050 giữ các điều kiện này cho UI mới sau UI028.

**SPC-058 — Ràng buộc search/filter/list với đúng API operation.** Mỗi list/query hook, `Toolbar`, search, filter, sort và pager phải nhận hoặc truy vết được `operationId` cụ thể. Nguồn duy nhất cho query parameter là danh sách parameter của operation đó trong `contracts/openapi.json`/metadata sinh từ contract; không sao chép một danh sách filter dùng chung qua các route, không đẩy toàn bộ URL query vào request, và không hiển thị filter/search server-side nếu operation không hỗ trợ. URL parameter lạ phải được bỏ qua khi dựng request. Nếu nghiệp vụ cần tiêu chí chưa được contract hỗ trợ, ghi `FRONTEND_ONLY_GAP`; không sửa giả backend/API. Chỉ dùng local filter khi toàn bộ tập dữ liệu liên quan đã tải đủ và evidence nêu rõ phạm vi lọc; dữ liệu phân trang chưa tải đủ không được gắn nhãn như đã lọc toàn bộ. Link sang workflow khác chỉ mang context URL khi trang đích thật sự dùng context đó cho UI/form; không gửi context thành query API không được khai báo. Thêm regression cho operation query allowlist, URL parameter không hỗ trợ, visibility của control, cursor reset/state preservation và luồng deep-link liên quan; checker/test phải thất bại nếu route tạo request bằng parameter không khai báo. Ghi contract/operation, route, trigger, root cause, invariant và consumer bị ảnh hưởng theo SPC-055/057; chưa kiểm consumer bị ảnh hưởng thì chưa đóng task. Quy tắc này ngăn lặp lỗi `QUERY_PARAMETER_UNKNOWN` và bộ lọc giả, nhưng không chứng nhận toàn bộ app đã tuân thủ.

**SPC-059 — Mọi control hiển thị phải có hành vi và kết quả trung thực.** Trước JSX/style, liệt kê trong evidence hiện có của task các button, menu item, link, tab, row action, search/filter và control tương tác: mục đích, trigger, trạng thái enabled/disabled/busy, hành vi bàn phím, nguồn route/operation hoặc state cục bộ, cùng kết quả người dùng nhìn thấy. Sau render, regression phải kích hoạt các action trọng yếu bằng pointer và keyboard phù hợp, rồi xác nhận route/request/state/feedback đúng với contract và không làm mất draft/focus. Không để control enabled thành no-op, placeholder giả, request không có operation, hoặc thông báo “đã lưu/thành công” khi chỉ đổi state cục bộ. Nếu chức năng chưa được contract hỗ trợ, ghi `FRONTEND_ONLY_GAP`; ẩn control khi không thuộc flow hoặc hiển thị disabled kèm giải thích có thể truy cập được, không giả lập Backend. Synthetic mock mutation được phép trong demo/test khi nhãn đúng phạm vi, có trạng thái kết quả nhất quán và không tuyên bố đã lưu bền vững. Control có `N/A` phải ghi lý do; thiếu kiểm chứng action liên quan là `NOT_RUN` và chưa đóng UI. Áp dụng SPC-047/052/055/058 đồng thời; không tạo checklist hoặc tracker riêng.

**SPC-060 — UI mới phải giữ nhịp khoảng cách theo profile đã chọn.** Trước JSX/CSS, chọn layout profile phù hợp theo composition và mật độ dữ liệu; ghi trong design contract hiện có semantic role cùng owner cho page gutter, section gap, surface inset, nhóm field/list và khoảng cách control inline, kèm route tham chiếu cùng profile và viewport/state đối chiếu. Mỗi quan hệ khoảng cách lấy từ token và preset/role chuẩn; không tự đặt số px, MUI factor, local map hoặc override ở route để “cân” riêng một màn. Các route cùng profile dùng cùng semantic rhythm; khác biệt chỉ hợp lệ khi workflow, dữ liệu hoặc responsive behavior yêu cầu và được biểu diễn bằng shared named variant có consumer thật theo SPC-053. Sau render, so computed layout và regression trên các route consumer bị ảnh hưởng theo SPC-057, cùng viewport/state với reference; chạy spacing/visual-token gates và layout/reflow tests liên quan. Nếu profile không phù hợp, finding mới xuất hiện, hoặc nhịp khoảng cách khác reference mà không có rationale/shared variant, sửa tại owner chung và kiểm lại toàn bộ consumer; ghi `NOT_RUN`/`UNKNOWN` và chưa đóng UI nếu thiếu bằng chứng. Ảnh/prototype chỉ giúp thảo luận, không thay profile/token source hoặc rendered regression. Quy tắc này không tạo spacing scale hay tracker mới.

### 13.4. Shared composition bắt buộc và owner duy nhất — 06/10/2026

**SPC-061 — Dùng component cho các quan hệ bố cục lặp lại.** Trong app/module/shared consumer, các role chuẩn phải đi qua component tương ứng trong `apps/web/src/shared/ui/composition.tsx`: form.fieldGap → FormFields; form.inlineGap → FieldGroup; surface.contentGap → SurfaceContent; actions.inlineGap → ActionGroup density `compact` (mặc định); actions.relatedLinksGap → ActionGroup density `comfortable`; page.sectionGap → PageSections; grid.gutter → SectionGrid. Hai density dùng role token hiện có 8/12 px và cùng quy tắc wrap; không nhận giá trị tùy ý. Không viết lại Stack/Box, local wrapper hoặc preset tương đương để né owner. API đóng: không sx/style/className/spacing/gap/margin/padding override, không opaque spread; geometry chỉ là finite shape theo catalog. Giữ component MUI thuần qua theme khi chỉ cần primitive; không tạo wrapper đổi tên hoặc universal form/table engine. Nghiệp vụ/columns/schema/quyền vẫn do module sở hữu. Đọc [shared UI catalog](../apps/web/src/shared/ui/README.md) trước khi code; variant mới phải có rationale và consumer thật theo SPC-053.

**SPC-062 — Chỉ một owner cho mỗi boundary/inset.** Shell main sở hữu page gutter và inset dọc 24 px. Semantic composition sở hữu gap giữa direct children và reset margin-top/bottom của chúng về 0; nội dung bên trong mỗi con giữ owner riêng. Không thêm beforeGap/afterGap cho con đang nằm trong semantic gap parent. Panel bodyMode=inset chứa composition flush; Panel không title và flush có thể chọn composition inset khi workflow cần; Panel có title phải giữ header→first-body gap16 theo SPC-014/068, không cộng top inset lần hai. Không double inset, không local negative margin để bù, không `!important` tại consumer. Boundary đứng độc lập chọn named before/after variant đã có. Một detail row gồm nội dung và divider là một logical child; parent gap chỉ giữa rows. Notice áp dụng toàn workflow là sibling của grid pane trong PageSections, không auto-place vào một ô grid. Shared parent và flow/grid cùng tuân quy tắc; profile đặc thù dùng semantic owner theo workflow, không ép mọi mật độ giống nhau.

**SPC-063 — Quy định phải có gate và consumer evidence.** `npm run test:ui-composition` chạy AST ownership check và negative fixtures trong `npm run verify`, cùng spacing/visual-token gates hiện có. Gate phải chặn raw role wrapper, alias/default/namespace imports, style override, opaque spread/geometry, direct child boundary hoặc inset bị nhân đôi có thể phân tích tĩnh. Source scan không chứng minh browser CSS cascade hoặc dynamic nesting; khi đổi shared owner phải có import graph/route impact matrix và regression render/hành vi theo SPC-057, gồm native form/ref/draft, dialog/navigation khi liên quan. Ghi findings trước/sau, final hashes, command/exit và state/viewports thực tế. Không tự ghi Backend/staging/owner acceptance, tiến độ FE hoặc readiness từ số component/line giảm.

Mapping theo hình dạng: Box grid dùng surface.contentGap chuyển thành SectionGrid rhythm=content (12px); Stack flow dùng grid.gutter chuyển thành PageSections (24px), giữ direction/responsive. SurfaceContent compactControlOutlined bảo toàn compact inset/radius control cho checklist row hiện có. Các variant này có consumer thật; không khai báo gap/radius tùy ý.

Triển khai đo được và kiểm chứng của lượt này được ghi tại [báo cáo shared composition](../evidence/frontend-ui-improvements/shared-composition-20261006/REPORT.md) và §15 trong kế hoạch UI. Các snapshot Wxx ở trên giữ nguyên giá trị lịch sử; không thay bằng chứng của source mới.

<a id="steel-policy"></a>

### 13.5. Quy định bắt buộc và hợp đồng thực thi — 06/10/2026

“100% bắt buộc” nghĩa là mọi thay đổi UI trong phạm vi đều chịu cùng quy định; AI hay người viết không được tự miễn áp dụng. Nó không có nghĩa checker hiện tại phát hiện 100% mọi chương trình/CSS, hoặc mọi trang phải có cùng hình học. Audit đã chứng minh các lỗ hổng cụ thể; việc khóa chúng được giao tại [§16 kế hoạch](FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan). Markdown hướng dẫn tác giả; typed API, source gates, browser assertions và điều kiện bàn giao kiểm tra kết quả. Không biến một tuyên bố mạnh thành bằng chứng thực thi.

**SPC-064 — Phạm vi bắt buộc, không có miễn trừ theo tác giả.** Áp dụng cho app/module/shared UI, route mới, dialog/drawer, loading/error/empty state, chart, responsive branch và refactor; bao gồm file mới và mọi nguồn style được app sở hữu/import. Không được bỏ qua vì AI khác, task nhỏ, demo, deadline, checker đang xanh hoặc UI028 đã đóng. Nhiệm vụ docs-only không đổi UI ghi checks theo impact, không tạo runtime PASS. Quyền/phạm vi do người dùng và hướng dẫn cấp cao điều khiển; tác giả không được tự sửa quy định/gate để hợp thức hóa sai phạm.

**SPC-065 — Tin nguồn theo symbol và đường dẫn thật.** Import, alias, namespace, barrel, re-export, tsconfig path, member/element access phải resolve về canonical owner thực. Tên `tokens`, `colors`, `theme`, `layoutSx`, `visualSx`, hoặc hậu tố `/visual` không tạo quyền tin cậy. Local declaration/shadow/copy và cast không đổi nguồn gốc. Cấm consumer sửa canonical owner qua assignment, alias mutation, Object.assign hoặc API ghi khác; public owner data phải readonly và writes bị gate từ chối. Parser/resolver không chứng minh được nguồn thì `UNKNOWN`, strict gate thất bại; không cho sạch bằng việc không nhận diện component. Cách viết chưa được hỗ trợ phải sửa thành API chuẩn resolve được hoặc mở rộng checker cùng fixture trong scope.

**SPC-066 — Bao phủ toàn bộ đường đưa style vào UI.** Gate phải xét JSX native/MUI/shared, System props, `sx`/`style`, spread/helper/callback, `slotProps`/theme overrides/`styled`, CSS imported/selector/pseudo/media, shorthand và logical properties. Alias wrapper, `createElement`, factory và indirect dynamic styling không được làm mất kiểm tra. Tập nguồn phải được phát hiện từ workspace/import graph, đối chiếu số file; root thiếu, parse lỗi, style import ngoài scope chưa phân loại hoặc không có file để scan phải thất bại. Generated files chỉ được loại theo owner cụ thể và phải qua `generate:check`. Không phát triển interpreter JavaScript tổng quát: phần chưa resolve được giữ `UNKNOWN` và chuyển cách viết về dạng hữu hạn.

**SPC-067 — Khóa cả giá trị và forwarding của shared API.** Với mọi public Shared API và export mới được khám phá từ source và đối chiếu [catalog hiện hành](../apps/web/src/shared/ui/README.md), typography/spacing/appearance chỉ do owner chuẩn quyết định. Cấm generic `sx`/`style`/`className` escape hatch, unknown props và opaque forwarding vào UI owner; Composition public API không nhận opaque spread. RHF/native field spreads có name/value/ref/event/validation được giữ khi type/source chứng minh nội dung; style hoặc nguồn chưa resolve không được coi hợp lệ. ReactNode children/actions/extra/render và nested MUI slots được kiểm tại source tạo nội dung, không miễn vì wrapper đã đóng props. Geometry chỉ gồm key/đơn vị/responsive branch hợp lệ, không CSS injection, token không resolve hoặc đổi mật độ qua geometry. Variant runtime phải nằm trong union hữu hạn và mọi branch được phân tích/kiểm; dynamic unknown thất bại. Metadata/ARIA/ref/native form props mở đúng nhu cầu thật, forward rõ, giữ accessibility/behavior; không mở arbitrary props để giảm dòng. React `key` không phải prop style. Không sửa domain/API cache/permission để phục vụ layout.

**SPC-068 — Kiểm một owner trên quan hệ render thực.** Parent giữ inter-child gap; surface giữ inset; child chỉ giữ nhịp nội bộ. Fragment, conditional child, local wrapper, component con và portal không được che double boundary/inset. Với Panel có title, header giữ gap đến nội dung đầu 16px theo SPC-014; không cộng thêm top inset của body/child để thành 32/40px. Panel không title có thể chọn body inset theo profile. Hai surface khác nhau có inset riêng hợp lệ; không nhầm nesting thực với hai owner cùng một mép. Direct-child reset không đủ cho mọi wrapper: source closure và computed geometry phải đối chiếu. Icon–label trong một control là quan hệ nội bộ, không tự dùng role nhóm hành động; nếu cần role, bổ sung ở canonical owner có consumer và test. Không bù sai bằng negative margin, `!important`, selector override hoặc thêm wrapper rỗng.

**SPC-069 — Đồng bộ thị giác bằng vai trò, không bằng chép số.** Dùng canonical spacing scale và semantic matrix §4, MUI/theme typography/palette/radius/focus/density. CSS shorthand, custom property, `calc`, logical property và responsive value vẫn phải truy được token/owner/unit. Font size/line-height/height không được dùng để ép vừa thay vì reflow. Một profile có hierarchy/nhịp/primary action chung; khác biệt workflow/density phải có named variant và consumer thật. Geometry như chart/table width hoặc content-driven height được phép có rationale; không bắt mọi số hình học thành spacing token. `QueryState` không mặc định áp một min-height chung cho mọi inline query theo SPC-024; state geometry cần consumer và đo thực. Theme/internal library reset hợp lệ chỉ theo phạm vi đã phân loại, không blanket exemption.

**SPC-070 — Không có PASS từ render chưa sẵn sàng hoặc baseline giả.** Collector phải xác nhận đúng route ID, heading trong `main`, seed/state và required content; xác nhận loading đã kết thúc, đồng thời đặt expected minimum observations cho component/state cần kiểm. Zero groups ở route phải có group là lỗi, không vacuous PASS. Report ghi source/checker/test/config/token hash, build artifact nếu dùng, viewport/browser/method, expected/observed và command exit. Baseline phải có trước source edit và không ghi đè. Nếu baseline mất/sai, tiếp tục sửa và đo current UI nhưng paired verdict là `NOT_VERIFIED`; implementation có thể bàn giao `DELIVERED_WITH_EVIDENCE_LIMITS`, không đóng paired acceptance hoặc nhận không regression. Fresh task sau đó vẫn cần baseline hợp lệ, không thừa kế miễn trừ này. Trạng thái UI/ARCH và giới hạn phải riêng.

**SPC-071 — Shared change phải kiểm hết affected routes, đủ branch áp dụng.** Tạo impact matrix theo symbol/import closure + manifest; không chỉ đếm component hay chọn một trang cùng module. Mọi affected route có route smoke/render verdict ở viewport nhỏ/lớn; state/variant/conditional branch sâu chọn theo rủi ro và ghi rõ tập áp dụng, `N/A` có lý do. Profile form/table/detail/dashboard/queue/auth/dialog có invariants riêng theo slot/state; một route có thể chứa nhiều profile và portal. Contract phân biệt CSS gap tối thiểu với distributed whitespace từ space-between/wrap/align và content-driven height; không ép mọi edge distance bằng CSS gap. Với text/action, kiểm viewport reflow hẹp kể cả 320 CSS px, native text resize 200% và browser zoom thật 200% bằng method riêng; không gọi viewport/CSS zoom giả là native PASS. Kiểm overflow nội bộ được cho phép, wrapping, focus/hit-testing, accessible names và action/draft/navigation liên quan. Không lấy “không có element” làm bằng chứng đúng.

**SPC-072 — Không được làm gate xanh bằng cách làm gate yếu.** Strict commands phải chạy thật và có exit0; `--report`, discovery, skipped/filtered-out tests, `continue-on-error`, missing artifacts hoặc stale hash không thay PASS. Thay checker/exception/scope/assertion phải giữ hoặc tăng coverage, có positive/negative/UNKNOWN/parse-error fixtures và chứng minh repro sai bị từ chối. Không tự nâng threshold, bỏ failing assertion, snapshot-update để che lỗi hoặc thêm blanket allowlist. Exception có property/selector/category/units/owner/reason/expiry-or-review-trigger và match count cụ thể; không cho UI feature tự miễn gate. Required checks ở repository, nếu đã cấu hình, phải yêu cầu cả source và browser checks; chưa có hosted run/protection thì báo chưa xác minh, dùng clean-local equivalent trong scope đã duyệt.

**SPC-073 — Đơn giản và bảo trì theo Karpathy.** Trước sửa ghi vấn đề/giả định/invariant đo được; dùng owner hiện có, sửa nhỏ đúng nguyên nhân. Chỉ tách shared component khi invariant tái dùng thật hoặc có một owner công khai cần khóa; không tạo wrapper chỉ đổi tên, universal CRUD/form engine, registry renderer, config/preset dự phòng hoặc dependency mới khi checker TypeScript/PostCSS hiện có đủ. Giữ explicit finite props, semantic slot và JSX dễ đọc; chỉ trích helper lặp nếu nó không mở escape hatch. Không dùng số dòng/component count làm KPI chất lượng; test phải bắt lỗi/giữ hành vi, không mirror implementation. Không refactor nghiệp vụ hoặc cleanup thay đổi của người dùng ngoài mục tiêu.

**SPC-074 — Một nguồn quy định và current summary.** File này là normative UI policy duy nhất; shared README giải thích API, AGENTS/README/DESIGN/UX/coding standards chỉ route tới nguồn này. Plan giữ công việc/dependency/status; REPORT giữ kết quả theo hash. Không chép số px/union/tiến độ vào rule sets độc lập. Rules có ID duy nhất và link/anchor hợp lệ; thay role/type/variant phải cập nhật mapping/catalog/fixtures/consumer trong cùng task. Snapshot cũ ghi rõ `HISTORICAL_SNAPSHOT`; loader không giao tiếp một task “next” từ snapshot cũ. Original `AI_RULES.md`, generated artifacts và full-product trackers giữ đúng quyền riêng, không sửa để đồng bộ bằng tay.

**SPC-075 — Điều kiện đóng là bằng chứng, không là lời cam kết.** Trước code: UX intent + layout contract/profile/owner + affected route/state + source/render baseline. Trước đóng: reconciliation từng file gồm EDIT/KEEP/GENERATE/ASSET/TOOLING/REFERENCE/THIRD_PARTY/RETIRED với lý do và proof áp dụng; zero unauthorized findings, strict checks đã chạy, current hashes, consumer/branch coverage, expected/observed, UI/ARCH verdict và giới hạn. Missing/unknown/not-run giữ phần kiểm chứng mở, AI tự xử lý prerequisite Frontend và tiếp tục phần độc lập; không thêm bước chờ owner/Backend/hosted CI. Evidence validator kiểm schema/provenance/coverage khai báo, không tự chứng minh log/screenshot là đúng. Không ghi tăng FE checkpoints/owner acceptance hoặc claim Enterprise-Grade chỉ vì policy, gate fixtures hay catalog hoàn tất; FE-G01..09 vẫn là điều kiện riêng.

#### Ma trận thực thi — không nhầm quy định với khả năng checker hiện tại

| Lớp kiểm soát | Hiện tại đã có | Thiếu cần triển khai theo §16 | Điều kiện nhận đạt |
|---|---|---|---|
| Instruction routing | Root/kit `AGENTS.md` trỏ standard/catalog/plan; hiện trạng được đồng bộ tại plan §16.17 | S14 kiểm pointer, SPC ID/anchor và current summary; văn bản không tự chặn lệnh bị bỏ qua | Một normative policy; không có current/next trái nhau |
| Token/units | Generator + S08 layout/value/unit checks; visual-token gate riêng | S19 đối chiếu đủ source/import closure và generated inputs/outputs | Canonical value resolve được; unsupported/UNKNOWN thất bại |
| Shared API | S05 binding resolution + S07 style-entry checks; 21 component + 6 composition contracts trong catalog | S09 ancestry/owner; S10 props/slots/finite values/supporting types | Alias, descendants, forbidden override và unknown branch bị bắt; native behavior hợp lệ còn nguyên |
| Ownership | Sáu compositions, Panel semantics và direct-child checks | S09 wrapper/conditional/QueryState/portal/native-render ownership; S11 edge regression | Một owner trên mép render thật; computed inset/gap đúng profile |
| Source coverage | S04 discovery; S07/S08 gates hiện quét layout 76, visual 75, composition 74 files | S19 refresh từ disk/Git/import/manifest/diff; số file không pin | Expected scope reconciled với scanned scope; không silent skip |
| Browser | Có historical/local route evidence, không thay current rerun | S15/S16 readiness, states/variants, native resize/zoom/focus/hit/portal | Mọi affected route có đủ observations theo impact |
| Evidence closure | Per-step closeout/provenance; S08 final logs | S17 validator cho hash, commands, coverage, missing/stale | Evidence khớp source cuối; validator không tự phán visual correctness |
| CI | Parent workflow gọi `npm run verify` và built-demo E2E; package `verify` gọi layout, visual-token và composition suites | S18 nối S08 binding regression vào `verify`, kiểm workflow trigger/failure/artifacts; hosted run/branch protection cần evidence riêng | Local exit hoặc hosted run đúng revision; cấu hình không là run PASS |

Bảng này mô tả capability và tiêu chí cần chứng minh, không lưu trạng thái rollout. Trạng thái từng capability nằm tại plan §16.6; thiếu hoặc stale evidence không được suy thành ENFORCED_COMPLETE.
