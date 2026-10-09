# Audit mức dùng Shared UI của Frontend hiện tại

**Ngày dữ liệu source:** 2026-10-08T17:03:38.055Z; **gate run:** 2026-10-08T16:58:33.565Z.
**Revision:** `53c0ba8f413b1f1e0fa16a747ed27f728b861dd6` + working tree hiện có; HEAD không đại diện toàn bộ patch chưa commit.
**Phạm vi:** React/TypeScript Frontend, synthetic mock/local; read-only audit sản phẩm. Chỉ thêm hồ sơ trong thư mục evidence này, không thay component, API, tracker, canonical/generated reports hay ghi nghiệm thu.

## 1. Kết luận trực tiếp

1. **54/54 route của 16 module có dùng Shared UI.** Hai cặp route dùng cùng entry function, nên có 52 function entry khác nhau. Đây là 100% độ phủ route có ít nhất một Shared API, không là 100% phần tử dùng Shared hoặc 100% chất lượng UI. R01 chỉ dùng ErrorNotice ở boundary công khai nhưng AuthCard/MUI vẫn dùng token/theme/roles chuẩn.
2. **Không phải toàn bộ UI được khai báo bằng public Shared components.** Còn 21 React components nghiệp vụ có tên, một render helper movementSource, fields/columns/actions inline, app shell/guards/fallback, MUI primitives, native file/SVG/HTML và chart library. Các phần này được phân loại theo invariant/owner, không mặc định là lỗi.
3. **Nền đang đồng bộ:** một ThemeProvider/createTheme, token source chung, layout/visual owners, catalog 28 APIs (22 components + sáu compositions); module không dựng MUI Table/Dialog/Pagination riêng trong JSX source đã kiểm. Tất cả source gates chạy lại PASS với zero findings, còn một exception layout đã khai báo cho skip-link accessibility.
4. **Chưa có bằng chứng để nói mọi UI/state đồng bộ hoàn toàn.** Có một cơ hội P2 về cấu trúc filter Inbox, hai cơ hội P3 về local CTA và cách ghi số API trong tài liệu. Source PASS không thay thế render/interaction proof. Không phát hiện một lỗi bắt buộc P0/P1 mới trong phạm vi adoption audit này.

## 2. Phương pháp và chứng cứ

- Đọc root/Frontend instructions, scope/context, canonical route manifest, route-implementation mapping, router registry, Shared catalog và spacing standard; kết luận lấy từ source hiện hành.
- TypeScript Program/checker resolve aliases ra symbol thực, phát hiện 71 TS/JS source files ở apps/web/src, 54 router slots khớp manifest/documented entries. R19 dùng app OrderPage wrapper đã đọc riêng.
- Theo trace JSX của từng function và local helper; không gán mọi import của một module cho tất cả màn. Fragment/conditional/slot/render callback được đọc tại source tạo. 0 tag custom chưa resolve trong inventory. Các nested/data-driven behavior không được biến thành bằng chứng runtime.
- Public Shared owner files là components.tsx, composition.tsx và draft-conflict.tsx. Comparison là helper private của DraftConflict, không public API thứ 29 hoặc feature component.
- Ghi SHA-256 đầu vào, real argv/exit/log của ba scanner. [JSON adoption](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/evidence/frontend-shared-adoption-audit-20261008/adoption-current.json) và [gate execution](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/evidence/frontend-shared-adoption-audit-20261008/source-checks-current.json) giữ dữ liệu tái lập.

## 3. Shared và phần riêng được phép

[Catalog primitive policy](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/README.md:25) cho phép Button/TextField/Select/Typography/Alert dùng trực tiếp trên cùng theme; không làm wrapper chỉ đổi tên MUI. Module giữ schema, columns, actions, payload, workflow. [Catalog owner table](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/README.md:73) giữ AuthCard, Inbox, Dashboard hero và chart renderer ở owner riêng.

| Lớp | Owner hiện tại | Đánh giá |
|---|---|---|
| Token/theme | tokens từ kit → generated package; [theme](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/theme.ts:4) → [ThemeProvider](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/main.tsx:32) | Một theme, không phát hiện theme/module styling framework thứ hai trong source graph. |
| Generic UI | 28 public APIs trong Shared catalog | Panel/table/dialog/query/status/action/field boundaries dùng owners chung. |
| Feature UI | Schema/fields/columns/actions, 21 components + một helper | Cần giữ nghiệp vụ tại module, reuse local khi cùng invariant. |
| App UI | Shell/nav/router/permissions/session/recovery/feedback/mock controls | Cross-module owners tại app, không nhân bản vào mỗi page. |
| Native/chart | File inputs, SVG ticks, skip-link, startup fallback, download anchor | Có semantics/lifecycle riêng; vẫn giữ token/theme/approved owner. |

### Số JSX theo scope (chỉ phục vụ inventory)

| Scope | Public Shared JSX sites | MUI primitive sites | Native JSX sites |
|---|---:|---:|---:|
| Modules | 1129 | 912 | 11 |
| App | 6 | 117 | 1 |
| Shared owners | 9 | 114 | 2 |
| Startup | 0 | 2 | 0 (native DOM được tạo ngoài JSX) |

Không chia Shared sites cho tổng JSX để tạo % adoption: một Shared component che nhiều MUI/DOM primitives, cùng một callback có thể chạy nhiều lần và branches không cùng hiển thị.

## 4. Catalog 28 APIs và consumer thực

26 APIs có production source consumer; PartialDataNotice/CapabilityUnavailable có zero consumers theo lifecycle KEEP conditional ở catalog, không là missing migration hay căn cứ xóa file. Không dùng notice partial chỉ vì giá trị null/zero, không dùng capability-unavailable chỉ vì thiếu permission. Nguồn [lifecycle hai notices](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/README.md:51).

Các call sites/file counts dưới đây tính trên JSX source toàn app, gồm Shared nội bộ nếu có; route counts đi theo entry trace và là union source.

| API/source | JSX call sites | Consumer files | Route trace | Nhận định |
|---|---:|---:|---:|---|
| [PageHeader](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:20) | 49 | 16 | 51 | Có consumer |
| [Panel](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:39) | 91 | 18 | 51 | Có consumer |
| [Stat](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:68) | 20 | 4 | 5 | Có consumer |
| [Stats](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:77) | 5 | 4 | 5 | Có consumer |
| [Amount](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:80) | 48 | 13 | 24 | Có consumer |
| [CopyableCode](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:84) | 3 | 2 | 1 | Có consumer |
| [Status](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:109) | 68 | 18 | 42 | Có consumer |
| [DataTable](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:121) | 47 | 16 | 39 | Có consumer |
| [Empty](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:138) | 8 | 5 | 6 | Có consumer |
| [QueryState](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:142) | 86 | 17 | 50 | Có consumer |
| [ErrorNotice](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:169) | 89 | 19 | 45 | Có consumer |
| [Toolbar](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:204) | 22 | 13 | 23 | Có consumer |
| [Pager](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:241) | 36 | 15 | 32 | Có consumer |
| [LookupLoadMore](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:251) | 22 | 9 | 16 | Có consumer |
| [RouteLink](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:265) | 64 | 18 | 31 | Có consumer |
| [MutationButton](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:269) | 107 | 17 | 44 | Có consumer |
| [EditDialog](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:296) | 50 | 16 | 29 | Có consumer |
| [PartialDataNotice](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:444) | 0 | 0 | 0 | KEEP conditional; không thêm consumer giả |
| [CapabilityUnavailable](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:448) | 0 | 0 | 0 | KEEP conditional; không thêm consumer giả |
| [ConfirmDialog](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:452) | 23 | 14 | 22 | Có consumer |
| [DetailLine](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:469) | 98 | 13 | 25 | Có consumer |
| [FormFields](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/composition.tsx:29) | 75 | 18 | 45 | Có consumer |
| [FieldGroup](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/composition.tsx:36) | 35 | 7 | 14 | Có consumer |
| [SurfaceContent](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/composition.tsx:41) | 31 | 10 | 14 | Có consumer |
| [ActionGroup](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/composition.tsx:50) | 32 | 17 | 24 | Có consumer |
| [PageSections](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/composition.tsx:61) | 11 | 10 | 11 | Có consumer |
| [SectionGrid](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/composition.tsx:73) | 15 | 11 | 14 | Có consumer |
| [DraftConflict](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/draft-conflict.tsx:13) | 9 | 6 | 11 | Có consumer |

## 5. Từng màn UI

[SCREEN_MATRIX.md — đủ 54 màn, đường dẫn, source/line, toàn bộ Shared APIs, helpers, MUI/native/chart và disposition](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/evidence/frontend-shared-adoption-audit-20261008/SCREEN_MATRIX.md).

| ID | Màn | Số loại Shared | Phần khai báo riêng | Nhận định |
|---|---|---:|---|---|
| R01 | Đăng nhập | 1 | `AuthCard` | Theo owner hiện hành |
| R02 | Chọn cửa hàng | 6 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R03 | Thiết lập cửa hàng | 2 | `AuthCard` | Theo owner hiện hành |
| R04 | Tổng quan | 15 | JSX nghiệp vụ inline | P3 giảm lặp CTA |
| R05 | Hộp thư | 19 | `ConversationMessageList`, `ConversationComposer`, `ConversationContextPanel`, `MockSalesFlowPreview`, `MockMediaPreview`, `MockUpsellPreview`, `ConversationPanel` | P2 cải tiến bố trí filter |
| R06 | Chi tiết hội thoại | 19 | `ConversationMessageList`, `ConversationComposer`, `ConversationContextPanel`, `MockSalesFlowPreview`, `MockMediaPreview`, `MockUpsellPreview`, `ConversationPanel` | P2 cải tiến bố trí filter |
| R07 | Khách hàng | 11 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R08 | Hồ sơ khách | 14 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R09 | Sản phẩm | 13 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R10 | Thêm sản phẩm | 11 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R11 | Chi tiết sản phẩm | 11 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R12 | Danh mục hàng | 13 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R13 | Nhập dữ liệu | 11 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R14 | Kết quả nhập dữ liệu | 11 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R15 | Tồn kho | 14 | `InventoryFilters` | Theo owner hiện hành |
| R16 | Lịch sử kho | 10 | `InventoryFilters`, `movementSource` | Theo owner hiện hành |
| R17 | Đơn hàng | 10 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R18 | Tạo đơn nháp | 10 | `DraftForm` | Theo owner hiện hành |
| R19 | Chi tiết đơn hàng | 19 | `DraftForm` | Theo owner hiện hành |
| R20 | Thu/chi tổng quan | 9 | `ReportRangeFields` | Theo owner hiện hành |
| R21 | Sổ thu/chi | 15 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R22 | Lợi nhuận quản trị | 12 | `ReportRangeFields` | Theo owner hiện hành |
| R23 | Nguồn kiến thức | 17 | `ProductContentMockPreview`, `CurrentCatalogSources` | Theo owner hiện hành |
| R24 | Chi tiết kiến thức | 13 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R25 | Đánh giá và phản hồi | 12 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R26 | Cấu hình bot | 14 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R27 | Thử bot an toàn | 9 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R28 | Kiểm thử chất lượng AI | 13 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R29 | Kết nối Facebook | 12 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R30 | Nhà cung cấp AI | 15 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R31 | Báo cáo và xuất dữ liệu | 13 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R32 | Nhân sự và quyền | 12 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R33 | Thiết lập cửa hàng | 10 | `SetupChecklistItem` | Theo owner hiện hành |
| R34 | Nhật ký kiểm toán | 6 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R35 | Quyền riêng tư và lưu trữ | 14 | `ContactConsentPreview` | Theo owner hiện hành |
| R36 | Theo dõi công việc nền | 8 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R37 | Điều hành và công việc | 17 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R38 | Hàng chờ phê duyệt | 16 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R39 | Trung tâm thông báo | 11 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R40 | Thiết bị, kênh nhận và lịch trực | 16 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R41 | Chuẩn bị và lấy hàng | 13 | `PrepDialog` | Theo owner hiện hành |
| R42 | Vận đơn và giao hàng | 18 | `ShippingQuotePreview` | Theo owner hiện hành |
| R43 | Đổi trả và kiểm hàng hoàn | 16 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R44 | Nhà cung cấp hàng hóa | 14 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R45 | Đề nghị nhập và quy tắc | 12 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R46 | Đơn mua hàng | 16 | `PurchaseDialog` | Theo owner hiện hành |
| R47 | Nhận hàng và đối chiếu | 15 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R48 | Chứng từ và sổ kép | 14 | `JournalAccountField` | Theo owner hiện hành |
| R49 | Đối soát ngân hàng và COD | 13 | `StatementDialog` | Theo owner hiện hành |
| R50 | Công nợ và khóa kỳ | 12 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R51 | Bốn vai trò AI và quyền | 15 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R52 | Bản tin và sức khỏe hệ thống | 11 | JSX nghiệp vụ inline | Theo owner hiện hành |
| R53 | Thông tin hỗ trợ marketing | 8 | `MarketingReasonTick`; Recharts/SVG | Theo owner hiện hành |
| R54 | Yêu cầu sau bán | 13 | JSX nghiệp vụ inline | Theo owner hiện hành |

## 6. Toàn bộ component/helper local có tên

21 components React + movementSource render helper. Đây là các function JSX có tên ở top level, không gồm mỗi field/callback inline như một component độc lập.

| Component/helper và source | Màn dùng | Shared trực tiếp trong function | Vì sao giữ tại module |
|---|---|---|---|
| [ReportRangeFields](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/finance/index.tsx:70) | R20, R22 | `FormFields` | KEEP: date-range [Từ, Đến) của finance; tái dùng hai màn, FormFields giữ layout. |
| [JournalAccountField](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/finance/index.tsx:200) | R48 | Không có | KEEP: chọn tài khoản mẫu hoặc nhập ID thật; không thêm wrapper TextField chỉ đổi tên. |
| [StatementDialog](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/finance/index.tsx:295) | R49 | `EditDialog`, `ErrorNotice`, `FormFields`, `RouteLink` | KEEP: business composition dùng EditDialog chung; CSV import/bank/COD payload thuộc finance. |
| [PrepDialog](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/fulfillment/index.tsx:51) | R41 | `ConfirmDialog`, `EditDialog`, `ErrorNotice`, `FormFields`, `MutationButton`, `QueryState`, `RouteLink`, `Status` | KEEP: chuẩn bị/lấy hàng và lựa chọn dòng; dùng dialog/query/form/command UI chung. |
| [ShippingQuotePreview](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/fulfillment/index.tsx:349) | R42 | `FieldGroup`, `FormFields`, `Panel` | KEEP: bản xem thử vùng/kiện/phí mẫu; ghép Panel/FieldGroup/FormFields. |
| [ConversationComposer](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx:14) | R05, R06 | `ErrorNotice` | KEEP: send eligibility/revision/draft/message type là invariant Inbox; ErrorNotice chung, canonical inbox/layout roles. |
| [ConversationMessageList](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx:97) | R05, R06 | Không có | KEEP: message bubble, refs/Chips, timestamp và scroll thuộc Inbox; không universal chat engine. |
| [ConversationContextPanel](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx:146) | R05, R06 | `DetailLine`, `ErrorNotice`, `MutationButton`, `Panel`, `RouteLink`, `Status` | KEEP: order/customer/context nghiệp vụ; Panel/DetailLine/Status/MutationButton chung. |
| [ConversationPanel](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx:91) | R05, R06 | `ActionGroup`, `ConfirmDialog`, `EditDialog`, `Empty`, `ErrorNotice`, `FormFields`, `MutationButton`, `Pager`, `Panel`, `QueryState`, `SectionGrid` | KEEP: ghép message/composer/context, human handoff và previews; điều phối workflow không chuyển vào shared. |
| [MockMediaPreview](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx:240) | R05, R06 | `SurfaceContent` | KEEP_MOCK_ONLY: mô phỏng media; SurfaceContent giữ content rhythm. |
| [MockSalesFlowPreview](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx:281) | R05, R06 | `ActionGroup`, `Amount`, `DataTable`, `Panel`, `QueryState`, `RouteLink`, `SurfaceContent` | KEEP_MOCK_ONLY: mô phỏng bán hàng/quote/cart; Panel/DataTable/Amount/query chung. |
| [MockUpsellPreview](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx:343) | R05, R06 | `SurfaceContent` | KEEP_MOCK_ONLY: mô phỏng upsell; SurfaceContent chung. |
| [InventoryFilters](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inventory/index.tsx:29) | R15, R16 | `ActionGroup`, `FormFields` | KEEP: filter kho/biến thể, URL/cursor/apply/clear; FormFields/ActionGroup chung. |
| [movementSource](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inventory/index.tsx:168) | R16 | `RouteLink` | KEEP_RENDER_HELPER: renderer nguồn movement dùng RouteLink; không cộng vào số React components. |
| [CurrentCatalogSources](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/knowledge/index.tsx:22) | R23 | `ActionGroup`, `Amount`, `DataTable`, `Panel`, `QueryState`, `RouteLink`, `SurfaceContent` | KEEP: read-model product/category sources trong knowledge; ghép Shared. |
| [ProductContentMockPreview](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/knowledge/index.tsx:88) | R23 | `DetailLine`, `FormFields`, `Panel` | KEEP_MOCK_ONLY: preview nội dung sản phẩm; Panel/DetailLine/FormFields chung. |
| [DraftForm](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/orders/index.tsx:25) | R18, R19 | `DraftConflict`, `ErrorNotice`, `FieldGroup`, `FormFields`, `LookupLoadMore`, `MutationButton`, `PageSections`, `Panel` | KEEP: một form nghiệp vụ dùng R18/R19; rows/address/customer/draft invariant ở orders. |
| [PurchaseDialog](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/procurement/index.tsx:255) | R46 | `Amount`, `ConfirmDialog`, `DataTable`, `DetailLine`, `EditDialog`, `ErrorNotice`, `FieldGroup`, `FormFields`, `MutationButton`, `QueryState`, `RouteLink`, `Status` | KEEP: business dialog ghép Shared, owns purchase/receipt/approval workflow. |
| [MarketingReasonTick](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/reports/index.tsx:23) | R53 | Không có | KEEP: renderer SVG/chart; không dùng HTML Typography thay text/tspan. |
| [AuthCard](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/workspace/index.tsx:26) | R01, R03 | Không có | KEEP: một auth surface local dùng R01/R03, được catalog §4 cho phép; canonical auth layout/visual roles. |
| [SetupChecklistItem](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/workspace/index.tsx:144) | R33 | `RouteLink`, `SurfaceContent` | KEEP: item checklist shop, RouteLink/SurfaceContent chung. |
| [ContactConsentPreview](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/workspace/index.tsx:230) | R35 | `DetailLine`, `FormFields`, `Panel` | KEEP_MOCK_ONLY: preview consent; Panel/DetailLine/FormFields chung. |

Bốn components không chứa public Shared trực tiếp: AuthCard, ConversationMessageList, JournalAccountField, MarketingReasonTick. Đây lần lượt là auth surface, message list, specialized input và SVG tick; bố mẹ vẫn có Shared composition/theme, và canonical roles được đọc/source gate kiểm. Không suy ra 4 lỗi từ zero direct use.

## 7. App/chrome/ngoài route nghiệp vụ

13 app-owned functions JSX + startup helper; provider/guard/wrapper được ghi đúng vai trò, không xem cả 13 như feature widgets.

| Owner và source | Scope | Shared trực tiếp | Vai trò |
|---|---|---|---|
| [CommandRecovery](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/CommandRecovery.tsx:11) | APP_OWNER | `ActionGroup`, `CopyableCode` | Owner đối chiếu command unknown; dùng ActionGroup/CopyableCode, không nhân bản vào từng page. |
| [FeedbackDialog](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/feedback.tsx:9) | APP_OWNER | `EditDialog`, `FormFields` | Dialog app dùng EditDialog/FormFields; export payload là workflow riêng. Footer export thành công là commit hành vi, không tự xem như cancel bỏ guard. |
| [OrderPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:73) | APP_OWNER | Không có | Wrapper R19 nối callback mock với OrderDetailPage lazy; không tính thêm một màn UI nghiệp vụ. |
| [Loading](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:130) | APP_OWNER | Không có | Suspense/lazy-route fallback dùng MUI LinearProgress; scope có thể chưa được dựng. |
| [PermissionGate](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:136) | APP_OWNER | Không có | Guard readPermission theo manifest; MUI Alert/Button, không gọi CapabilityUnavailable khi thiếu quyền. |
| [GlobalGate](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:145) | APP_OWNER | Không có | Session gate cho route không thuộc shop; provider/lifecycle owner, không form/table. |
| [RouteError](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:150) | APP_OWNER | `ActionGroup` | Router error boundary dùng canonical fallback/query roles và ActionGroup; nội dung lỗi không phụ thuộc data của page thất bại. |
| [NotFound](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:165) | APP_OWNER | Không có | Route wildcard, ngoài 54 route nghiệp vụ; main/h1/Button dùng canonical fallback role. |
| [ScopeEvents](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/ScopeEvents.tsx:10) | APP_OWNER | Không có | SSE scope/revoke/reconnect owner và notice toàn app; không là Shared presentation API. |
| [SessionProvider](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/SessionProvider.tsx:7) | APP_OWNER | Không có | Provider phiên; JSX provider không được tính là pattern hình thức cần migrate. |
| [NavIcon](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/Shell.tsx:29) | APP_OWNER | Không có | Chọn icon điều hướng tại app; không phải bộ icon riêng/second theme. |
| [Shell](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/Shell.tsx:39) | APP_OWNER | `ActionGroup` | Nav/header/footer/demo/offline/scope; Drawer và dirty-navigation/logout Dialog thuộc app. Một MUI Dialog tại Shell, hai Dialog nằm trong Shared owners; modules không có Dialog trực tiếp. |
| [MockTools](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/Shell.tsx:128) | APP_OWNER | Không có | Controls role/state/dataset chỉ demo; MUI primitives theo theme hiện hành. |
| [start](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/main.tsx:13) | STARTUP_OWNER | Không có | Bootstrap providers + duy nhất ThemeProvider. Native h1/p khi startup thất bại dùng bootstrap.css/tokens, không phụ thuộc React đã khởi tạo. |

Ngoài JSX: [HTML entry](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/index.html:1) sở hữu skip-link/noscript; [startup catch](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/main.tsx:34) tạo h1/p khi React chưa render; [bootstrap.css](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/bootstrap.css:1) dùng generated CSS token variables; [downloadText](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/model/format.ts:188) tạo anchor click/revoke blob để tải tệp, không phải component màn hình còn thiếu Shared.

## 8. Những điểm chưa hợp nhất và mức ưu tiên

### P2 — Cơ hội hợp nhất filter Inbox (R05/R06)

**Observed:** [Toolbar và bốn filters](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx:52) dùng Toolbar tìm kiếm rồi Stack riêng cho status/mode/channel/assignee với toolbar.controlGap + surface.bodyInsetAfterHeader. [Toolbar](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx:204) đã có filters slot nằm ngoài form search, giữ inset/control gap.

**Impact/inference:** hai chỗ sở hữu search/filter layout làm maintenance khó hơn các list khác; thay đổi inset/responsive sau này có thể lệch. Scanner hiện PASS, chưa có bằng chứng overlap/spacing sai ở source này.

**Recommendation:** khi triển khai cải tiến, đưa nhóm filters vào Toolbar.filters với composition hữu hạn hiện có; giữ URL/cursor, label/permission, independent onChange và pane width. Kiểm geometry small/large + keyboard/zoom trước đóng. Không tự sửa trong lượt audit này.

### P3 — Dashboard lặp local CTA chrome (R04)

**Observed:** [Hai CTA](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/dashboard/index.tsx:59) có sx giống nhau ở hai nhánh mutually exclusive operations/orders. Hero/CTA owner riêng được catalog §4 cho phép; không phải thiếu PageHeader/RouteLink.

**Impact/inference:** sửa hover/focus/border tại một nhánh có thể bỏ quên nhánh còn lại; chưa có bug xác nhận.

**Recommendation:** hợp nhất sx hoặc nhánh local khi có thay đổi tiếp; không thêm Shared CTA dự phòng hoặc đổi semantics của hero/KPI links.

### P3 — Cách ghi số exports trong spacing standard

**Observed:** [SPC-067](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/docs/FRONTEND_SPACING_STANDARD.md:563) còn viết “27 shared exports và API mới”, trong khi symbol discovery/catalog hiện là 28, gồm DraftConflict.

**Impact:** người đọc có thể hiểu con số khác nhau. Cụm “và API mới” vẫn bao quát export mới nên không chứng minh gate bỏ sót API.

**Recommendation:** cập nhật cách ghi count/current catalog khi có lượt đồng bộ tài liệu, giữ normative rule áp dụng mọi export/API mới; không đổi mẫu số tracker.

### Không được xem là lỗi/missing migration

- Date-range UI finance R20/R22 ghi [Từ, Đến), còn R31 reports dùng fromDate/toDate với URL/export logic riêng. Similar fields không đủ chứng minh cùng business invariant để đưa thành một shared range engine.
- Chips ở Inbox/bot/channels gắn nguồn, tool IDs/capability names; Status vẫn dùng cho workflow states.
- MUI Link trong Dashboard là CTA/KPI hero profile; link tải báo cáo R31 có href/download, không là RouteLink missing.
- Shell dirty-navigation/logout Dialog là scope guard, không một EditDialog editor. Việc dùng EditDialog ở guard chung phải cân nhắc đăng ký dirty guard/lifecycle, không migrate cơ học.
- Raw native file input/SVG/HTML first paint không bị xóa vì mục tiêu % Shared.
- Hai notices zero-use có lifecycle riêng; không có bằng chứng file component cũ nào cần xóa trong phạm vi audit này.

## 9. Kiểm chứng mới và evidence trước

### Đã chạy trong lượt audit

| Scanner | Số files | Findings | Exit | Status | Exception được dùng |
|---|---:|---:|---:|---|---|
| composition | 77 | 0 | 0 | PASS | Không |
| layout | 79 | 0 | 0 | PASS | UI028-A11Y-SKIP-LINK-PADDING |
| visual | 78 | 0 | 0 | PASS | Không |

Layout exception UI028-A11Y-SKIP-LINK-PADDING có owner accessibility đã khai báo; không viết waiver mới và không hạ gate. Composition/layout/visual có import/source closure khác nhau nên 77/79/78 files không phải lệch route inventory 71 TS/JS.

### Bằng chứng được tái đối chiếu, không chạy lại

631 fingerprints trong [S19 source cuối](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/evidence/frontend-width-fixes-20261008/S19-current-evidence.json:1) khớp trước/sau scanner, zero drift. Manifest trước ghi full E2E600/600, verify, build/demo, compiled/native review trên source đó. Lượt này **không chạy mới** unit/E2E/browser/build, không cộng scanner PASS thành full run mới. Runtime/source hash identity được kiểm; trạng thái server/tab người dùng hiện tại không được xác minh lại bằng browser trong audit.

Screen-reader speech/broad human conformance/hosted CI NOT_RUN; user acceptance PENDING; Backend/provider/staging/production ngoài scope.

## 10. Tái lập và quản lý hồ sơ

Chạy từ Frontend bằng Node hiện có:

```powershell
& 'C:\Program Files\nodejs\node.exe' evidence/frontend-shared-adoption-audit-20261008/audit-shared.mjs
& 'C:\Program Files\nodejs\node.exe' evidence/frontend-shared-adoption-audit-20261008/run-source-checks.mjs
& 'C:\Program Files\nodejs\node.exe' evidence/frontend-shared-adoption-audit-20261008/render-report.mjs
```

Audit JSON/markdown không là task ledger mới. UI plan §16.6 tiếp tục sở hữu thứ tự/trạng thái; kit full-product và FE checkpoints giữ nguyên. Báo cáo này không cho phép ghi DONE hoặc nghiệm thu chỉ từ adoption/source scan.
