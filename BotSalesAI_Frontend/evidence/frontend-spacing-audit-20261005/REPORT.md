# Phân tích spacing và khoảng trắng Frontend — 05/10/2026

**Kết luận:** dự án có token spacing dùng chung nhưng cách áp dụng chưa đồng bộ theo vai trò và responsive. Đã định nghĩa [quy định SPC-001–032](../../docs/FRONTEND_SPACING_STANDARD.md); chưa chuyển đổi source hoặc xác minh giao diện sau chuyển đổi. UI028 C01/C02 có hồ sơ, C03–C05 còn phải thực hiện trong [kế hoạch UI](../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#14-ui028--chuẩn-hóa-khoảng-cách-và-bố-cục-frontend). Không đưa ra phần trăm Production-Ready/Enterprise-Grade từ phép đếm spacing.

## 1. Phạm vi và phương pháp

- Đọc source React/TS, CSS, MUI theme, shared components, Shell, token canonical, route manifest, route-to-source map và các tài liệu thiết kế/kế hoạch liên quan.
- [capture-spacing.mjs](capture-spacing.mjs) dùng TypeScript AST và PostCSS, thu thập property/JSX attribute có tên spacing, nhánh responsive/conditional, geometry và typography. Không sửa source. [capture.log](capture.log) ghi lần chạy; [source-inventory.json](source-inventory.json) chứa declarations, vị trí, owner, SHA-256 từng input và mapping 54 route.
- Kiểm tra CSS trực tiếp ở route đang mở R13 `/s/shop-demo/imports`, viewport 793×884 CSS px, không điều hướng/nhập form/upload/chạy mutation. [live-imports.json](live-imports.json) chứa kết quả và giới hạn.
- Đối chiếu hướng dẫn [MUI spacing](https://mui.com/material-ui/customization/spacing/) và các tiêu chí W3C được dẫn cụ thể trong mục 7 của quy định. Không coi thang spacing của dự án là chuẩn WCAG bắt buộc.

Đây là audit source và một mẫu giao diện đang chạy bằng synthetic MSW; không phải chuyến kiểm tra browser đủ 54 route. Collector chưa là enforcement gate: không resolve toàn bộ cascade, helper, MUI internals, transform hoặc inherited styles. Các con số dưới đây là **candidate declarations**, không phải số lỗi UI đã tái hiện.

## 2. Kết quả có thể tái lập

| Chỉ số | Kết quả | Ý nghĩa |
|---|---:|---|
| TS/TSX được đọc | 65 file | Toàn bộ `apps/web/src` tại lần capture |
| CSS được đọc | 2 file | Local styles, không bao gồm thư viện |
| Module / route | 16 / 54 | 54/54 mapping có source và function component tương ứng |
| Parser diagnostics | 0 | Collector đọc được input; không phải typecheck PASS |
| MUI base | 8 px | Numeric System spacing được quy đổi theo base hiện hành |
| Scale canonical | 4, 8, 12, 16, 24, 32, 48 px | 7 mức; 0 là reset |
| Spacing property candidates | 501 | Bao gồm responsive/helper/theme config cần phân loại |
| Numeric trực tiếp | 488 | 18 giá trị dương khác nhau, thêm 0 |
| Numeric trực tiếp ngoài scale | 23 | 11 giá trị khác nhau |
| Ngoài scale, kể cả responsive | 24 | Thêm `AuthCard p.sm = 5` → 40 px |
| Geometry candidates | 109 | Width/height/overflow/grid columns; không được làm tròn như gap |
| CSS spacing declarations | 3 | Cần xét raw CSS units riêng |

11 giá trị ngoài scale: **2,4; 4,8; 5,6; 6; 6,4; 8,8; 9,6; 10; 14,4; 20; 40 px**. 40 px ở list có thể là inset 24 + marker indent 16; cần biểu diễn quan hệ và kiểm chứng, không sửa máy móc thành 32. Không lấy 465/488 “trong scale” làm % đồng bộ: giá trị đúng token vẫn có thể bị cộng dồn, dùng sai profile hoặc gây reflow lỗi.

## 3. Các phát hiện và quyết định chuyển đổi

| ID / ưu tiên | Hiện trạng có bằng chứng | Tác động / giới hạn | Quyết định UI028 |
|---|---|---|---|
| SP-F01 / P1 | `Shell.tsx:121` main padding 16/32; design-system §4 quy định mobile 16, desktop 24. CSS R13 tại 793 px là 32. | Sai khác code–tài liệu được xác nhận; không tự chứng minh mọi route bị lỗi. | Shell/global page owner dùng gutter 16/24/24, không route root padding lần hai. |
| SP-F02 / P1 | Header `Shell.tsx:114` min-height 64 ở mọi viewport; token mobile 56. Footer line 122 px=4, tức 32 cả mobile. | Responsive contract chưa khớp; đọc source, chưa đo lại mobile trong lượt này. | Header 56/64; footer inline 16/24 và block 16; kiểm wrap/focus. |
| SP-F03 / P1 | Shared Panel header p3, body form imports p3; R13 đo từ cuối heading đến alert đầu body 48 px. | Hai inset cộng dồn cho cùng quan hệ. `DESIGN.md` trước UI028 có base panel 16 chưa nêu profile responsive. | Surface inset 16/24; header–body gap 16 do một owner; table/toolbar body flush. |
| SP-F04 / P1 | Main `minHeight:80vh`, form body `maxWidth:850`; Shell fallback có margin `12vh auto`. | Khoảng trắng do height/width/centering khác khoảng cách token. Chưa kết luận 850 là bug. | Flex/grid fill main; giới hạn form đặt đúng surface; centering intrinsic. Không áp một max-width cho cả app. |
| SP-F05 / P1 | Shell có 7 candidate trực tiếp ngoài scale: gap9.6, inset20, nav10, group5.6, py6.4, mb2.4, footer gap8.8. | Nhịp navigation khó kiểm bằng cùng token. Padding nav giảm có thể làm target nhỏ hơn. | Đưa về role 4/8/12/16; giữ target44 và kiểm dòng nhãn dài. |
| SP-F06 / P1 | Dashboard có 3 CTA py10 và grid gap20; catalog grid gap20; workspace 2 grid gap20. | Grid cùng chức năng dùng khoảng khác Stats/shared; CTA còn phụ thuộc font/min-height. | Feature grid24, Stats16; CTA giữ min44, không chỉ nearest-number rounding. |
| SP-F07 / P1 | Inbox có p14.4, p20, mt4.8, gap6, mt6.4; 6 candidate ngoài scale. | Hội thoại cần density riêng; không áp card/form spacing cho từng message. | Pane16, bubble12, message/meta4/8, message groups12, composer16; scroll owner không đổi. |
| SP-F08 / P2 | Notifications placeholder p20; Reports header py6; AuthCard responsive p40. | Candidate theo profile/state, chưa là browser defect toàn app. | Shared states/inset16/24, report compact8/12 tùy role, AuthCard24/32. |
| SP-F09 / P2 | Reports `<ul>` p24 + pl40 ở line234. | List-marker allowance có thể hợp lệ; 40 không tự là lỗi. | Compose inset24 + marker indent16, ghi `COMPOSITE`; kiểm text/markers ở narrow/text override. |
| SP-F10 / P1 | Theme body14/1.5; heading28; nav có font10/13 và dashboard27/36. | Font/line height ảnh hưởng whitespace; offscale spacing count không đo typographic conformance. | Giữ token typography; review nhãn vận hành nhỏ, line wrapping và text override; không shrink text để giấu tràn. |

Source positions nhận diện baseline; đọc lại `inputHashes` và source trước triển khai vì line có thể thay đổi. SP-F10 là đề xuất review typography ảnh hưởng spacing, không mở task đổi palette/font branding.

## 4. Bao phủ owner và route

| Owner | Route | Spacing candidates | Ngoài scale, gồm responsive | Profile cần kiểm |
|---|---:|---:|---:|---|
| app/Shell | Shared | 49 | 7 | Page gutter, header, nav, footer, fallback |
| shared/ui và shared khác | Shared | 41 | 0 | Panel/Stat/Header/Toolbar/Table/Pager/Empty/Dialog |
| bot | 4 | 28 | 0 | Forms, evaluations, policies, costs |
| catalog | 6 | 24 | 1 | Collection, editor, import, mappings |
| customers | 3 | 15 | 0 | Collection, detail, actions |
| dashboard | 1 | 36 | 4 | Hero, grid, Stats, CTA |
| finance | 6 | 28 | 0 | Data, reconciliation, debts, money dialog |
| fulfillment | 2 | 17 | 0 | Table/actions/dialog |
| inbox | 2 | 47 | 6 | List, messages, composer, context, scroll |
| integrations | 2 | 13 | 0 | Settings/capability/empty |
| inventory | 2 | 4 | 0 | Data filters and quantity actions |
| knowledge | 3 | 20 | 0 | Upload, review, detail, long text |
| notifications | 2 | 25 | 1 | List, device/schedule form, states |
| operations | 3 | 32 | 0 | Cards, approvals, digest |
| orders | 4 | 27 | 0 | Create/detail/returns, validation |
| procurement | 4 | 37 | 0 | Lookup, purchase/receipt forms |
| reports | 2 | 21 | 2 | Charts/legends, lists, export |
| workspace | 8 | 37 | 3 | Auth/onboarding/settings/team/audit/jobs |

0 candidate ngoài scale **không** là PASS của module: shared component thay đổi sẽ ảnh hưởng cả các module này. Mapping từng R01–R54, component, source và proposed profile ở `routeCoverage` trong JSON; profile được đề xuất từ chức năng route, chưa được browser xác minh trong lượt này.

## 5. Quy định đích và kiến trúc

Quy định đầy đủ nằm ở [FRONTEND_SPACING_STANDARD.md](../../docs/FRONTEND_SPACING_STANDARD.md), gồm 32 điều và bảng semantic mobile/tablet/desktop. Giá trị trọng tâm: gutter16/24, section24, surface16/24, header–body16, field16, inline8, toolbar12, table12×16, dialog16/24. Mỗi quan hệ có một owner. Geometry như target44, header56/64, sidebar240, form850, biểu đồ và border được quản lý riêng.

Kiến trúc đích dùng token canonical → generated output → một MUI theme → preset semantic nhỏ tại shared/ui → component owner → module composition. Không module import module khác, không theme/scale thứ hai hoặc generic layout engine. Giữ nguyên query keys, permission, drafts, command recovery, focus, mock/live isolation. Static checker mới phải hiểu units, responsive/helpers, exception scope và UNKNOWN; collector hiện tại chưa đáp ứng gate đó.

Đây là lựa chọn thiết kế của dự án. WCAG được dùng để kiểm reflow/text resize/text spacing/target/focus, không xác nhận Enterprise chỉ từ spacing scale. Các tiêu chí và nguồn chính thức được dẫn tại §7/§10 của quy định.

## 6. Tiến độ và việc còn lại

| Checkpoint UI028 | Trạng thái trong lượt này | Bằng chứng / việc tiếp |
|---|---|---|
| C01 baseline | DONE | Source inventory/hash/route coverage + CSS R13 + báo cáo này |
| C02 specification | DONE | SPC-001–032, ownership, exception policy, responsive profiles, SP-G01–08 và kế hoạch migration |
| C03 implementation | TODO | Presets/shared/Shell/features + enforcing checker và meaningful fixtures |
| C04 verification | NOT_RUN | Browser/profile/reflow/text/target/state/journey checks trên source đã migrate |
| C05 handoff | TODO | Regression/build/final fingerprints, UI/ARCH verdict và hồ sơ cuối |

**UI baseline:** C01/C02 đo và định nghĩa đích; không verdict `UI: PASS` cho source theo quy định mới. **ARCH baseline:** nguồn token/theme/module ownership được truy vết; không khẳng định checker enforcement đã có. Các runtime test/build cũ vẫn là evidence có ngày riêng, không đổi thành PASS của UI028. Không có dependency Backend/owner/manual/hosted CI để chờ triển khai trong scope.

Kiểm tra docs/JSON/link/plan arithmetic, generated freshness và read-only FE status của lượt này được ghi tại [verification.json](verification.json). Không chạy lại suite sản phẩm cho diff chỉ gồm tài liệu/collector/evidence; không lấy docs check làm build hoặc E2E PASS. FE/full-product ledgers và React source phải giữ nguyên ở lượt định nghĩa này.

Read-only [FE status](fe-status.log) sau sửa hướng dẫn trả 0/140 VERIFIED hiệu lực, 28 task STALE, `blocked=[]`, next FE001.S01; nguyên nhân đầu là source hash `AGENTS.md` đổi, rồi lan dependency. Không diễn giải thành 0% implementation hoặc runtime regression. Các kết quả runtime cũ giữ thời điểm/input của chúng; cần revalidation canonical khi tiếp tục triển khai, không ghi tăng ledger để làm số đẹp.

Chạy lại inventory từ root bằng Node khả dụng: `node evidence/frontend-spacing-audit-20261005/capture-spacing.mjs`. File ghi `capturedAt` và SHA-256 để phân biệt snapshot; sửa source sau capture phải chạy lại trước dùng kết quả.
