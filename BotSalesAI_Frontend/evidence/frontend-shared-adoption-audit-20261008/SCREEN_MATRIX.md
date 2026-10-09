# Đối chiếu Shared UI từng màn — source hiện hành

**Snapshot:** 2026-10-08T17:03:38.055Z; HEAD `53c0ba8f413b1f1e0fa16a747ed27f728b861dd6` cộng working tree. Đây là inventory/source review, không một tracker hay chuẩn UI mới.

Nguồn chuẩn: [Shared catalog](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/shared/ui/README.md), [Spacing standard](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/docs/FRONTEND_SPACING_STANDARD.md) và [UI plan](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/docs/FRONTEND_UI_IMPROVEMENT_PLAN.md).

54 route/16 module được nối qua manifest → router slots → function entry → custom JSX/render helper. Public Shared APIs là boundary: MUI nội bộ Shared không bị gán ngược thành UI riêng của module. Số Shared trong bảng là số **loại API**, không phải % hoàn thiện hay % phần tử DOM. Cùng function R05/R06 và R10/R11 giữ inventory hợp các nhánh; runtime state phải xem evidence riêng.

## Tổng hợp 54 màn

| ID | Màn theo manifest | Số loại Shared | Khai báo riêng có tên / inline | Nhận định |
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

## R01 — Đăng nhập

- **Đường dẫn:** `/login`; **module:** `workspace`.
- **Entry thực tế:** [LoginPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/workspace/index.tsx:29); slot router [LoginPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:75).
- **Shared APIs (1 loại):** `ErrorNotice`.
- **Components/render helpers riêng:** [AuthCard](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/workspace/index.tsx:26)
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Avatar`, `Box`, `Button`, `Paper`, `Stack`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** `ArrowForwardRounded`, `SmartToyRounded`.
- **Phân tích/đánh giá:** AuthCard là surface xác thực riêng; tiêu đề, brand và CTA đăng nhập dùng MUI với auth/layout/visual roles. Không phải màn list/form CRUD dùng Panel.
- **Phạm vi trace:** apps/web/src/modules/workspace/index.tsx:29, apps/web/src/modules/workspace/index.tsx:26.

## R02 — Chọn cửa hàng

- **Đường dẫn:** `/workspaces`; **module:** `workspace`.
- **Entry thực tế:** [WorkspacesPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/workspace/index.tsx:48); slot router [WorkspacesPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:76).
- **Shared APIs (6 loại):** `Empty`, `ErrorNotice`, `PageHeader`, `QueryState`, `SectionGrid`, `SurfaceContent`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Avatar`, `Box`, `Button`, `Paper`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** `ArrowForwardRounded`.
- **Phân tích/đánh giá:** Card chọn shop dùng Paper/Avatar/Button trực tiếp; SectionGrid và SurfaceContent giữ collection/content flow. Không có component ShopCard thứ hai trong shared.
- **Phạm vi trace:** apps/web/src/modules/workspace/index.tsx:48.

## R03 — Thiết lập cửa hàng

- **Đường dẫn:** `/onboarding`; **module:** `workspace`.
- **Entry thực tế:** [OnboardingPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/workspace/index.tsx:57); slot router [OnboardingPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:77).
- **Shared APIs (2 loại):** `ErrorNotice`, `FormFields`.
- **Components/render helpers riêng:** [AuthCard](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/workspace/index.tsx:26)
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Avatar`, `Box`, `Button`, `MenuItem`, `Paper`, `Stack`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** `SmartToyRounded`.
- **Phân tích/đánh giá:** AuthCard dùng lại từ R01; fields tạo shop nằm trong FormFields. Currency/timezone và điều hướng là dữ liệu/behavior riêng của onboarding.
- **Phạm vi trace:** apps/web/src/modules/workspace/index.tsx:57, apps/web/src/modules/workspace/index.tsx:26.

## R04 — Tổng quan

- **Đường dẫn:** `/s/:shopId/overview`; **module:** `dashboard`.
- **Entry thực tế:** [DashboardPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/dashboard/index.tsx:33); slot router [DashboardPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:78).
- **Shared APIs (15 loại):** `ActionGroup`, `Amount`, `ConfirmDialog`, `CopyableCode`, `DataTable`, `Empty`, `MutationButton`, `Panel`, `QueryState`, `RouteLink`, `SectionGrid`, `Stat`, `Stats`, `Status`, `SurfaceContent`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Avatar`, `Box`, `Button`, `Link`, `Stack`, `Typography`.
- **Native JSX:** `br`; **chart library:** Không có; **MUI icons:** `ArrowForwardRounded`, `ForumRounded`, `Inventory2Rounded`, `ReceiptLongRounded`, `SmartToyRounded`.
- **Phân tích/đánh giá:** Hero, lời chào, gradient, KPI links và bố cục vận hành riêng; không dùng PageHeader. Catalog cho phép dashboard profile. Hai CTA có sx trùng nhau: cơ hội P3 hợp nhất local chrome.
- **Phạm vi trace:** apps/web/src/modules/dashboard/index.tsx:33.

## R05 — Hộp thư

- **Đường dẫn:** `/s/:shopId/inbox`; **module:** `inbox`.
- **Entry thực tế:** [InboxPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx:15); slot router [InboxPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:79).
- **Shared APIs (19 loại):** `ActionGroup`, `Amount`, `ConfirmDialog`, `DataTable`, `DetailLine`, `EditDialog`, `Empty`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `RouteLink`, `SectionGrid`, `Status`, `SurfaceContent`, `Toolbar`.
- **Components/render helpers riêng:** [ConversationMessageList](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx:97), [ConversationComposer](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx:14), [ConversationContextPanel](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx:146), [MockSalesFlowPreview](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx:281), [MockMediaPreview](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx:240), [MockUpsellPreview](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx:343), [ConversationPanel](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx:91)
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Avatar`, `Box`, `Button`, `Checkbox`, `Chip`, `Divider`, `FormControlLabel`, `List`, `ListItem`, `ListItemButton`, `MenuItem`, `Stack`, `Tab`, `Tabs`, `TextField`, `Typography`.
- **Native JSX:** `div`; **chart library:** Không có; **MUI icons:** `ArrowBackRounded`, `SendRounded`.
- **Phân tích/đánh giá:** Danh sách hội thoại, message bubbles, composer, context và ba mock preview do Inbox sở hữu. Hàng bốn bộ lọc dựng bằng Stack ngoài Toolbar.filters: cơ hội P2 hợp nhất owner; chưa xác nhận lỗi geometry.
- **Phạm vi trace:** apps/web/src/modules/inbox/index.tsx:15, apps/web/src/modules/inbox/index.tsx:91, apps/web/src/modules/inbox/conversation-components.tsx:97, apps/web/src/modules/inbox/conversation-components.tsx:14, apps/web/src/modules/inbox/conversation-components.tsx:146, apps/web/src/modules/inbox/index.tsx:281, apps/web/src/modules/inbox/index.tsx:240, apps/web/src/modules/inbox/index.tsx:343.

## R06 — Chi tiết hội thoại

- **Đường dẫn:** `/s/:shopId/inbox/:conversationId`; **module:** `inbox`.
- **Entry thực tế:** [InboxPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx:15); slot router [InboxPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:80).
- **Shared APIs (19 loại):** `ActionGroup`, `Amount`, `ConfirmDialog`, `DataTable`, `DetailLine`, `EditDialog`, `Empty`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `RouteLink`, `SectionGrid`, `Status`, `SurfaceContent`, `Toolbar`.
- **Components/render helpers riêng:** [ConversationMessageList](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx:97), [ConversationComposer](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx:14), [ConversationContextPanel](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx:146), [MockSalesFlowPreview](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx:281), [MockMediaPreview](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx:240), [MockUpsellPreview](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx:343), [ConversationPanel](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx:91)
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Avatar`, `Box`, `Button`, `Checkbox`, `Chip`, `Divider`, `FormControlLabel`, `List`, `ListItem`, `ListItemButton`, `MenuItem`, `Stack`, `Tab`, `Tabs`, `TextField`, `Typography`.
- **Native JSX:** `div`; **chart library:** Không có; **MUI icons:** `ArrowBackRounded`, `SendRounded`.
- **Phân tích/đánh giá:** Cùng InboxPage với R05; conversationId quyết định pane/trạng thái. Inventory là hợp các nhánh source, không chứng minh cả 19 API xuất hiện đồng thời ở mọi state. Cùng điểm P2 về bộ lọc.
- **Phạm vi trace:** apps/web/src/modules/inbox/index.tsx:15, apps/web/src/modules/inbox/index.tsx:91, apps/web/src/modules/inbox/conversation-components.tsx:97, apps/web/src/modules/inbox/conversation-components.tsx:14, apps/web/src/modules/inbox/conversation-components.tsx:146, apps/web/src/modules/inbox/index.tsx:281, apps/web/src/modules/inbox/index.tsx:240, apps/web/src/modules/inbox/index.tsx:343.

## R07 — Khách hàng

- **Đường dẫn:** `/s/:shopId/customers`; **module:** `customers`.
- **Entry thực tế:** [CustomersPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/customers/index.tsx:52); slot router [CustomersPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:81).
- **Shared APIs (11 loại):** `DataTable`, `EditDialog`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `RouteLink`, `Toolbar`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Button`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Schema cột khách hàng, CTA mở hồ sơ và fields dialog tạo khách là JSX nghiệp vụ; không dựng Table/Dialog riêng.
- **Phạm vi trace:** apps/web/src/modules/customers/index.tsx:52.

## R08 — Hồ sơ khách

- **Đường dẫn:** `/s/:shopId/customers/:customerId`; **module:** `customers`.
- **Entry thực tế:** [CustomerPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/customers/index.tsx:77); slot router [CustomerPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:82).
- **Shared APIs (14 loại):** `ActionGroup`, `Amount`, `DetailLine`, `DraftConflict`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `PageSections`, `Panel`, `QueryState`, `RouteLink`, `SectionGrid`, `Status`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Stack`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Fields hồ sơ, ghi chú, consent và cards liên quan khai báo tại module; version/conflict dùng DraftConflict và versioned-draft model chung.
- **Phạm vi trace:** apps/web/src/modules/customers/index.tsx:77.

## R09 — Sản phẩm

- **Đường dẫn:** `/s/:shopId/products`; **module:** `catalog`.
- **Entry thực tế:** [ProductsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/catalog/index.tsx:29); slot router [ProductsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:83).
- **Shared APIs (13 loại):** `Amount`, `DataTable`, `FieldGroup`, `FormFields`, `LookupLoadMore`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `RouteLink`, `Status`, `Toolbar`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Button`, `MenuItem`, `Stack`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Bộ lọc trạng thái/danh mục và lookup category khai báo tại module, đặt trong Toolbar/FieldGroup/FormFields; không có SearchToolbar riêng.
- **Phạm vi trace:** apps/web/src/modules/catalog/index.tsx:29.

## R10 — Thêm sản phẩm

- **Đường dẫn:** `/s/:shopId/products/new`; **module:** `catalog`.
- **Entry thực tế:** [ProductEditorPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/catalog/index.tsx:77); slot router [ProductEditorPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:84).
- **Shared APIs (11 loại):** `ActionGroup`, `ConfirmDialog`, `DraftConflict`, `ErrorNotice`, `FieldGroup`, `FormFields`, `LookupLoadMore`, `MutationButton`, `PageHeader`, `Panel`, `QueryState`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Button`, `Checkbox`, `FormControlLabel`, `IconButton`, `MenuItem`, `TextField`, `Typography`.
- **Native JSX:** `input`, `span`; **chart library:** Không có; **MUI icons:** `AddRounded`, `DeleteOutlineRounded`.
- **Phân tích/đánh giá:** Fields sản phẩm, biến thể và ảnh do editor sở hữu; native file input và upload label/span là control nghiệp vụ. Conflict/dialog/form boundaries dùng Shared.
- **Phạm vi trace:** apps/web/src/modules/catalog/index.tsx:77.

## R11 — Chi tiết sản phẩm

- **Đường dẫn:** `/s/:shopId/products/:productId`; **module:** `catalog`.
- **Entry thực tế:** [ProductEditorPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/catalog/index.tsx:77); slot router [ProductEditorPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:85).
- **Shared APIs (11 loại):** `ActionGroup`, `ConfirmDialog`, `DraftConflict`, `ErrorNotice`, `FieldGroup`, `FormFields`, `LookupLoadMore`, `MutationButton`, `PageHeader`, `Panel`, `QueryState`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Button`, `Checkbox`, `FormControlLabel`, `IconButton`, `MenuItem`, `TextField`, `Typography`.
- **Native JSX:** `input`, `span`; **chart library:** Không có; **MUI icons:** `AddRounded`, `DeleteOutlineRounded`.
- **Phân tích/đánh giá:** Cùng ProductEditorPage với R10; nhánh create/edit dùng cùng composition và conflict owner. Không tính hai route thành hai triển khai editor độc lập.
- **Phạm vi trace:** apps/web/src/modules/catalog/index.tsx:77.

## R12 — Danh mục hàng

- **Đường dẫn:** `/s/:shopId/categories`; **module:** `catalog`.
- **Entry thực tế:** [CategoriesPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/catalog/index.tsx:160); slot router [CategoriesPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:86).
- **Shared APIs (13 loại):** `ConfirmDialog`, `DataTable`, `DraftConflict`, `EditDialog`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `Status`, `Toolbar`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Button`, `MenuItem`, `Stack`, `TextField`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Fields danh mục, parent lookup và active state khai báo tại module; dialog/confirm/conflict/table dùng Shared.
- **Phạm vi trace:** apps/web/src/modules/catalog/index.tsx:160.

## R13 — Nhập dữ liệu

- **Đường dẫn:** `/s/:shopId/imports`; **module:** `catalog`.
- **Entry thực tế:** [ImportsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/catalog/imports.tsx:13); slot router [ImportsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:87).
- **Shared APIs (11 loại):** `DataTable`, `ErrorNotice`, `FieldGroup`, `FormFields`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `RouteLink`, `Status`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Button`, `MenuItem`, `TextField`, `Typography`.
- **Native JSX:** `input`; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** File input CSV, chọn loại nhập và mapping/preview là UI nghiệp vụ; table, field flow, trạng thái và pager dùng Shared.
- **Phạm vi trace:** apps/web/src/modules/catalog/imports.tsx:13.

## R14 — Kết quả nhập dữ liệu

- **Đường dẫn:** `/s/:shopId/imports/:jobId`; **module:** `catalog`.
- **Entry thực tế:** [ImportResultPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/catalog/imports.tsx:107); slot router [ImportResultPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:88).
- **Shared APIs (11 loại):** `ConfirmDialog`, `DataTable`, `DetailLine`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `Panel`, `QueryState`, `RouteLink`, `Status`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Kết quả job nhập, errors/rows và thao tác hủy/retry khai báo tại module; detail/table/confirm/query dùng Shared.
- **Phạm vi trace:** apps/web/src/modules/catalog/imports.tsx:107.

## R15 — Tồn kho

- **Đường dẫn:** `/s/:shopId/inventory`; **module:** `inventory`.
- **Entry thực tế:** [InventoryPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inventory/index.tsx:75); slot router [InventoryPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:89).
- **Shared APIs (14 loại):** `ActionGroup`, `Amount`, `DataTable`, `EditDialog`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `RouteLink`, `Status`, `Toolbar`.
- **Components/render helpers riêng:** [InventoryFilters](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inventory/index.tsx:29)
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Button`, `Stack`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** InventoryFilters dùng FormFields/ActionGroup, tái sử dụng giữa R15/R16. Điều chỉnh kho và cột tồn do module sở hữu.
- **Phạm vi trace:** apps/web/src/modules/inventory/index.tsx:75, apps/web/src/modules/inventory/index.tsx:29.

## R16 — Lịch sử kho

- **Đường dẫn:** `/s/:shopId/inventory/movements`; **module:** `inventory`.
- **Entry thực tế:** [MovementsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inventory/index.tsx:145); slot router [MovementsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:90).
- **Shared APIs (10 loại):** `ActionGroup`, `DataTable`, `FormFields`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `RouteLink`, `Status`, `Toolbar`.
- **Components/render helpers riêng:** [InventoryFilters](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inventory/index.tsx:29), [movementSource](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inventory/index.tsx:168)
- **MUI primitives ngoài public Shared boundary:** `Button`, `TextField`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Dùng lại InventoryFilters; movementSource là render helper liên kết nguồn bằng RouteLink, không phải React component/public API mới.
- **Phạm vi trace:** apps/web/src/modules/inventory/index.tsx:145, apps/web/src/modules/inventory/index.tsx:29, apps/web/src/modules/inventory/index.tsx:168.

## R17 — Đơn hàng

- **Đường dẫn:** `/s/:shopId/orders`; **module:** `orders`.
- **Entry thực tế:** [OrdersPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/orders/index.tsx:19); slot router [OrdersPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:91).
- **Shared APIs (10 loại):** `Amount`, `DataTable`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `RouteLink`, `Status`, `Toolbar`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Stack`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Cột, tổng tiền, trạng thái và row actions là schema đơn hàng; list/search/pager/table dùng Shared.
- **Phạm vi trace:** apps/web/src/modules/orders/index.tsx:19.

## R18 — Tạo đơn nháp

- **Đường dẫn:** `/s/:shopId/orders/new`; **module:** `orders`.
- **Entry thực tế:** [NewOrderPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/orders/index.tsx:149); slot router [NewOrderPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:92).
- **Shared APIs (10 loại):** `DraftConflict`, `ErrorNotice`, `FieldGroup`, `FormFields`, `LookupLoadMore`, `MutationButton`, `PageHeader`, `PageSections`, `Panel`, `RouteLink`.
- **Components/render helpers riêng:** [DraftForm](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/orders/index.tsx:25)
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Button`, `IconButton`, `MenuItem`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** `AddRounded`, `DeleteOutlineRounded`.
- **Phân tích/đánh giá:** DraftForm sở hữu khách, địa chỉ, dòng đơn và lookup; reuse R18/R19. FieldGroup/FormFields/Panel và draft/conflict owner dùng chung.
- **Phạm vi trace:** apps/web/src/modules/orders/index.tsx:149, apps/web/src/modules/orders/index.tsx:25.

## R19 — Chi tiết đơn hàng

- **Đường dẫn:** `/s/:shopId/orders/:orderId`; **module:** `orders`.
- **Entry thực tế:** [OrderDetailPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/orders/index.tsx:150); slot router [OrderPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:93).
- **Shared APIs (19 loại):** `ActionGroup`, `Amount`, `ConfirmDialog`, `DataTable`, `DetailLine`, `DraftConflict`, `EditDialog`, `ErrorNotice`, `FieldGroup`, `FormFields`, `LookupLoadMore`, `MutationButton`, `PageHeader`, `PageSections`, `Panel`, `QueryState`, `RouteLink`, `SectionGrid`, `Status`.
- **Components/render helpers riêng:** [DraftForm](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/orders/index.tsx:25) Router còn có OrderPage tại app/router.tsx:73; wrapper được đọc riêng.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Button`, `IconButton`, `MenuItem`, `Stack`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** `AddRounded`, `DeleteOutlineRounded`.
- **Phân tích/đánh giá:** DraftForm dùng lại khi sửa đơn; chi tiết, actions và lifecycle giữ tại orders. Router OrderPage là wrapper nối mô phỏng xác nhận khách trong mock, không là editor/table thứ hai.
- **Phạm vi trace:** apps/web/src/modules/orders/index.tsx:150, apps/web/src/modules/orders/index.tsx:25.

## R20 — Thu/chi tổng quan

- **Đường dẫn:** `/s/:shopId/finance`; **module:** `finance`.
- **Entry thực tế:** [CashflowPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/finance/index.tsx:100); slot router [CashflowPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:94).
- **Shared APIs (9 loại):** `Amount`, `DetailLine`, `FormFields`, `PageHeader`, `Panel`, `QueryState`, `RouteLink`, `Stat`, `Stats`.
- **Components/render helpers riêng:** [ReportRangeFields](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/finance/index.tsx:70)
- **MUI primitives ngoài public Shared boundary:** `Alert`, `TextField`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** ReportRangeFields dùng lại với R22; ngày [Từ, Đến), timezone và API parameters thuộc finance. Stats/Amount/detail/query dùng Shared.
- **Phạm vi trace:** apps/web/src/modules/finance/index.tsx:100, apps/web/src/modules/finance/index.tsx:70.

## R21 — Sổ thu/chi

- **Đường dẫn:** `/s/:shopId/finance/entries`; **module:** `finance`.
- **Entry thực tế:** [EntriesPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/finance/index.tsx:107); slot router [EntriesPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:95).
- **Shared APIs (15 loại):** `ActionGroup`, `Amount`, `ConfirmDialog`, `DataTable`, `DetailLine`, `EditDialog`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `Status`, `Toolbar`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Button`, `MenuItem`, `Stack`, `TextField`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Fields thu/chi, loại chứng từ, filter và action dialog là nghiệp vụ; shell table/dialog/confirm/form dùng Shared.
- **Phạm vi trace:** apps/web/src/modules/finance/index.tsx:107.

## R22 — Lợi nhuận quản trị

- **Đường dẫn:** `/s/:shopId/finance/profit-loss`; **module:** `finance`.
- **Entry thực tế:** [ProfitLossPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/finance/index.tsx:144); slot router [ProfitLossPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:96).
- **Shared APIs (12 loại):** `ActionGroup`, `Amount`, `DetailLine`, `FormFields`, `PageHeader`, `PageSections`, `Panel`, `QueryState`, `Stat`, `Stats`, `Status`, `SurfaceContent`.
- **Components/render helpers riêng:** [ReportRangeFields](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/finance/index.tsx:70)
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Button`, `MenuItem`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** ReportRangeFields dùng lại R20; policy, số liệu lợi nhuận, notices và các section do finance sở hữu.
- **Phạm vi trace:** apps/web/src/modules/finance/index.tsx:144, apps/web/src/modules/finance/index.tsx:70.

## R23 — Nguồn kiến thức

- **Đường dẫn:** `/s/:shopId/knowledge`; **module:** `knowledge`.
- **Entry thực tế:** [KnowledgePage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/knowledge/index.tsx:108); slot router [KnowledgePage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:97).
- **Shared APIs (17 loại):** `ActionGroup`, `Amount`, `DataTable`, `DetailLine`, `EditDialog`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `PageSections`, `Pager`, `Panel`, `QueryState`, `RouteLink`, `Status`, `SurfaceContent`, `Toolbar`.
- **Components/render helpers riêng:** [ProductContentMockPreview](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/knowledge/index.tsx:88), [CurrentCatalogSources](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/knowledge/index.tsx:22)
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Button`, `Stack`, `TextField`, `Typography`.
- **Native JSX:** `input`; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** CurrentCatalogSources và ProductContentMockPreview là compositions nghiệp vụ ghép Shared. Native input dành upload nguồn; không có Panel/Table bản sao.
- **Phạm vi trace:** apps/web/src/modules/knowledge/index.tsx:108, apps/web/src/modules/knowledge/index.tsx:88, apps/web/src/modules/knowledge/index.tsx:22.

## R24 — Chi tiết kiến thức

- **Đường dẫn:** `/s/:shopId/knowledge/:knowledgeId`; **module:** `knowledge`.
- **Entry thực tế:** [KnowledgeDetailPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/knowledge/index.tsx:137); slot router [KnowledgeDetailPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:98).
- **Shared APIs (13 loại):** `ActionGroup`, `ConfirmDialog`, `DataTable`, `DetailLine`, `EditDialog`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `Panel`, `QueryState`, `RouteLink`, `Status`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Button`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Fields source/chunk, version và workflow xử lý kiến thức thuộc module; shared table/detail/dialog/confirm/form giữ chrome.
- **Phạm vi trace:** apps/web/src/modules/knowledge/index.tsx:137.

## R25 — Đánh giá và phản hồi

- **Đường dẫn:** `/s/:shopId/knowledge/review`; **module:** `knowledge`.
- **Entry thực tế:** [FeedbackPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/knowledge/index.tsx:179); slot router [FeedbackPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:99).
- **Shared APIs (12 loại):** `ActionGroup`, `DataTable`, `EditDialog`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `Status`, `Toolbar`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Button`, `TextField`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Review filters và feedback fields thuộc module; Toolbar/Pager/DataTable/EditDialog/FormFields dùng chung.
- **Phạm vi trace:** apps/web/src/modules/knowledge/index.tsx:179.

## R26 — Cấu hình bot

- **Đường dẫn:** `/s/:shopId/bot`; **module:** `bot`.
- **Entry thực tế:** [BotConfigPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/bot/index.tsx:11); slot router [BotConfigPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:100).
- **Shared APIs (14 loại):** `ActionGroup`, `Amount`, `ConfirmDialog`, `DataTable`, `DetailLine`, `EditDialog`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `Panel`, `QueryState`, `RouteLink`, `Status`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Button`, `MenuItem`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Bot policy, knowledge bindings, draft/publish/pause fields là nghiệp vụ; shared owners giữ table/detail/dialog/confirm/form/action flow.
- **Phạm vi trace:** apps/web/src/modules/bot/index.tsx:11.

## R27 — Thử bot an toàn

- **Đường dẫn:** `/s/:shopId/bot/playground`; **module:** `bot`.
- **Entry thực tế:** [PlaygroundPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/bot/index.tsx:43); slot router [PlaygroundPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:101).
- **Shared APIs (9 loại):** `Amount`, `DetailLine`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `Panel`, `QueryState`, `SectionGrid`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Chip`, `Stack`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Message/reply preview và source Chips khai báo riêng cho sandbox; Chip là nhãn nguồn, không thay thế Status của trạng thái workflow.
- **Phạm vi trace:** apps/web/src/modules/bot/index.tsx:43.

## R28 — Kiểm thử chất lượng AI

- **Đường dẫn:** `/s/:shopId/bot/evaluations`; **module:** `bot`.
- **Entry thực tế:** [EvaluationsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/bot/index.tsx:53); slot router [EvaluationsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:102).
- **Shared APIs (13 loại):** `DataTable`, `DetailLine`, `EditDialog`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `RouteLink`, `Status`, `Toolbar`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Button`, `TextField`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Evaluation fields, scenarios và cột kết quả thuộc bot; search/table/pager/dialog/form dùng Shared.
- **Phạm vi trace:** apps/web/src/modules/bot/index.tsx:53.

## R29 — Kết nối Facebook

- **Đường dẫn:** `/s/:shopId/integrations/channels`; **module:** `integrations`.
- **Entry thực tế:** [ChannelsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/integrations/index.tsx:13); slot router [ChannelsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:103).
- **Shared APIs (12 loại):** `ActionGroup`, `ConfirmDialog`, `DetailLine`, `Empty`, `ErrorNotice`, `MutationButton`, `PageHeader`, `PageSections`, `Panel`, `QueryState`, `RouteLink`, `Status`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Chip`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Card kênh và Chip capabilities là UI nghiệp vụ; Panel/DetailLine/Status/ConfirmDialog giữ nền. Permission không được tự diễn giải thành capability-unavailable.
- **Phạm vi trace:** apps/web/src/modules/integrations/index.tsx:13.

## R30 — Nhà cung cấp AI

- **Đường dẫn:** `/s/:shopId/integrations/ai`; **module:** `integrations`.
- **Entry thực tế:** [AIProvidersPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/integrations/index.tsx:33); slot router [AIProvidersPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:104).
- **Shared APIs (15 loại):** `ActionGroup`, `ConfirmDialog`, `DetailLine`, `EditDialog`, `Empty`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `Panel`, `QueryState`, `RouteLink`, `SectionGrid`, `Status`, `SurfaceContent`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Button`, `MenuItem`, `TextField`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Card provider, capability rows, fields key/model và testing actions thuộc integrations; SectionGrid/SurfaceContent/Panel/DetailLine/EditDialog dùng Shared. Collection width theo owner chuẩn.
- **Phạm vi trace:** apps/web/src/modules/integrations/index.tsx:33.

## R31 — Báo cáo và xuất dữ liệu

- **Đường dẫn:** `/s/:shopId/reports`; **module:** `reports`.
- **Entry thực tế:** [ReportsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/reports/index.tsx:47); slot router [ReportsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:105).
- **Shared APIs (13 loại):** `ActionGroup`, `DataTable`, `DetailLine`, `ErrorNotice`, `FormFields`, `PageHeader`, `PageSections`, `Pager`, `Panel`, `QueryState`, `RouteLink`, `SectionGrid`, `Status`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Button`, `Link`, `MenuItem`, `Stack`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Fields báo cáo/date/export, trạng thái download và MUI Link component=a thuộc reports. Download link cần href/download, không dùng RouteLink dành điều hướng nội bộ. Không ép date semantics của finance vào reports.
- **Phạm vi trace:** apps/web/src/modules/reports/index.tsx:47.

## R32 — Nhân sự và quyền

- **Đường dẫn:** `/s/:shopId/settings/team`; **module:** `workspace`.
- **Entry thực tế:** [TeamPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/workspace/index.tsx:153); slot router [TeamPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:106).
- **Shared APIs (12 loại):** `ConfirmDialog`, `DataTable`, `EditDialog`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `Status`, `Toolbar`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Button`, `Checkbox`, `FormControlLabel`, `Stack`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Role/permission checkboxes, invite fields và cột nhân sự thuộc workspace; shared dialog/table/confirm/search/form giữ nền.
- **Phạm vi trace:** apps/web/src/modules/workspace/index.tsx:153.

## R33 — Thiết lập cửa hàng

- **Đường dẫn:** `/s/:shopId/settings/shop`; **module:** `workspace`.
- **Entry thực tế:** [ShopSettingsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/workspace/index.tsx:77); slot router [ShopSettingsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:107).
- **Shared APIs (10 loại):** `DraftConflict`, `ErrorNotice`, `FieldGroup`, `FormFields`, `MutationButton`, `PageHeader`, `PageSections`, `Panel`, `RouteLink`, `SurfaceContent`.
- **Components/render helpers riêng:** [SetupChecklistItem](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/workspace/index.tsx:144)
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Stack`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** SetupChecklistItem tái dùng local tại trang; fields shop và checklist thuộc workspace. DraftConflict/FieldGroup/FormFields/PageSections/Panel dùng chung.
- **Phạm vi trace:** apps/web/src/modules/workspace/index.tsx:77, apps/web/src/modules/workspace/index.tsx:144.

## R34 — Nhật ký kiểm toán

- **Đường dẫn:** `/s/:shopId/settings/audit`; **module:** `workspace`.
- **Entry thực tế:** [AuditPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/workspace/index.tsx:179); slot router [AuditPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:108).
- **Shared APIs (6 loại):** `DataTable`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `Toolbar`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Cột audit, redaction text và security notices thuộc workspace; table/search/pager/query dùng Shared.
- **Phạm vi trace:** apps/web/src/modules/workspace/index.tsx:179.

## R35 — Quyền riêng tư và lưu trữ

- **Đường dẫn:** `/s/:shopId/settings/privacy`; **module:** `workspace`.
- **Entry thực tế:** [PrivacyPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/workspace/index.tsx:182); slot router [PrivacyPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:109).
- **Shared APIs (14 loại):** `DataTable`, `DetailLine`, `DraftConflict`, `EditDialog`, `ErrorNotice`, `FormFields`, `LookupLoadMore`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `SectionGrid`, `Status`.
- **Components/render helpers riêng:** [ContactConsentPreview](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/workspace/index.tsx:230)
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Button`, `Checkbox`, `FormControlLabel`, `MenuItem`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** ContactConsentPreview local mock composition ghép Shared; privacy/retention/contact fields và checkboxes là schema nghiệp vụ. Conflict/dialog/form/lookup dùng Shared.
- **Phạm vi trace:** apps/web/src/modules/workspace/index.tsx:182, apps/web/src/modules/workspace/index.tsx:230.

## R36 — Theo dõi công việc nền

- **Đường dẫn:** `/s/:shopId/jobs/:jobId`; **module:** `workspace`.
- **Entry thực tế:** [JobPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/workspace/index.tsx:256); slot router [JobPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:110).
- **Shared APIs (8 loại):** `DataTable`, `DetailLine`, `FormFields`, `PageHeader`, `Panel`, `QueryState`, `RouteLink`, `Status`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Button`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Job progress/detail và retry action thuộc workspace; không dựng LinearProgress/Dialog/Table riêng ở module. Query/detail/status/form/table dùng Shared.
- **Phạm vi trace:** apps/web/src/modules/workspace/index.tsx:256.

## R37 — Điều hành và công việc

- **Đường dẫn:** `/s/:shopId/operations`; **module:** `operations`.
- **Entry thực tế:** [OperationsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/operations/index.tsx:23); slot router [OperationsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:111).
- **Shared APIs (17 loại):** `ActionGroup`, `DataTable`, `EditDialog`, `ErrorNotice`, `FormFields`, `LookupLoadMore`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `RouteLink`, `Stat`, `Stats`, `Status`, `SurfaceContent`, `Toolbar`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Button`, `MenuItem`, `Stack`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Task/operation fields, read-model cards, cột và lookup là nghiệp vụ; stats/table/search/dialog/form/action flow dùng Shared.
- **Phạm vi trace:** apps/web/src/modules/operations/index.tsx:23.

## R38 — Hàng chờ phê duyệt

- **Đường dẫn:** `/s/:shopId/approvals`; **module:** `operations`.
- **Entry thực tế:** [ApprovalsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/operations/index.tsx:143); slot router [ApprovalsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:112).
- **Shared APIs (16 loại):** `ActionGroup`, `Amount`, `DataTable`, `DetailLine`, `EditDialog`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `PageSections`, `Pager`, `Panel`, `QueryState`, `Status`, `SurfaceContent`, `Toolbar`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Button`, `MenuItem`, `Stack`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Delegation preview fields, approval detail, tiền và actions thuộc operations; PageSections/SurfaceContent/Panel/DataTable/EditDialog/ConfirmDialog dùng Shared.
- **Phạm vi trace:** apps/web/src/modules/operations/index.tsx:143.

## R39 — Trung tâm thông báo

- **Đường dẫn:** `/s/:shopId/notifications`; **module:** `notifications`.
- **Entry thực tế:** [NotificationsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/notifications/index.tsx:19); slot router [NotificationsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:113).
- **Shared APIs (11 loại):** `ActionGroup`, `ErrorNotice`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `RouteLink`, `Status`, `SurfaceContent`, `Toolbar`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** `NotificationsActiveRounded`.
- **Phân tích/đánh giá:** Notification feed dùng Box/Typography kết hợp SurfaceContent/Panel; không cần DataTable cho feed. Search/pager/status/action/query dùng Shared.
- **Phạm vi trace:** apps/web/src/modules/notifications/index.tsx:19.

## R40 — Thiết bị, kênh nhận và lịch trực

- **Đường dẫn:** `/s/:shopId/notifications/devices`; **module:** `notifications`.
- **Entry thực tế:** [DevicesPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/notifications/index.tsx:46); slot router [DevicesPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:114).
- **Shared APIs (16 loại):** `ActionGroup`, `ConfirmDialog`, `DataTable`, `DraftConflict`, `ErrorNotice`, `FieldGroup`, `FormFields`, `LookupLoadMore`, `MutationButton`, `PageHeader`, `PageSections`, `Panel`, `QueryState`, `SectionGrid`, `Status`, `SurfaceContent`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Button`, `Checkbox`, `FormControlLabel`, `MenuItem`, `Stack`, `TextField`, `Typography`.
- **Native JSX:** `br`; **chart library:** Không có; **MUI icons:** `SmartphoneRounded`.
- **Phân tích/đánh giá:** Device/recipient/quiet-hours/schedule fields và checkboxes thuộc notifications; shared section/grid/lookup/form/confirm/conflict giữ nền.
- **Phạm vi trace:** apps/web/src/modules/notifications/index.tsx:46.

## R41 — Chuẩn bị và lấy hàng

- **Đường dẫn:** `/s/:shopId/fulfillment`; **module:** `fulfillment`.
- **Entry thực tế:** [FulfillmentPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/fulfillment/index.tsx:24); slot router [FulfillmentPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:115).
- **Shared APIs (13 loại):** `ConfirmDialog`, `DataTable`, `EditDialog`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `RouteLink`, `Status`, `Toolbar`.
- **Components/render helpers riêng:** [PrepDialog](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/fulfillment/index.tsx:51)
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Button`, `Stack`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** PrepDialog là business dialog ghép EditDialog/ConfirmDialog/FormFields/QueryState/MutationButton; không dựng MUI Dialog riêng.
- **Phạm vi trace:** apps/web/src/modules/fulfillment/index.tsx:24, apps/web/src/modules/fulfillment/index.tsx:51.

## R42 — Vận đơn và giao hàng

- **Đường dẫn:** `/s/:shopId/shipments`; **module:** `fulfillment`.
- **Entry thực tế:** [ShipmentsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/fulfillment/index.tsx:167); slot router [ShipmentsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:116).
- **Shared APIs (18 loại):** `ActionGroup`, `Amount`, `DataTable`, `DetailLine`, `EditDialog`, `ErrorNotice`, `FieldGroup`, `FormFields`, `LookupLoadMore`, `MutationButton`, `PageHeader`, `PageSections`, `Pager`, `Panel`, `QueryState`, `RouteLink`, `Status`, `Toolbar`.
- **Components/render helpers riêng:** [ShippingQuotePreview](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/fulfillment/index.tsx:349)
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Button`, `Checkbox`, `FormControlLabel`, `MenuItem`, `Stack`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** ShippingQuotePreview local ghép Panel/FieldGroup/FormFields; quote/handoff/delivery fields và actions thuộc fulfillment. Bảng vận đơn và dialog dùng Shared.
- **Phạm vi trace:** apps/web/src/modules/fulfillment/index.tsx:167, apps/web/src/modules/fulfillment/index.tsx:349.

## R43 — Đổi trả và kiểm hàng hoàn

- **Đường dẫn:** `/s/:shopId/returns`; **module:** `orders`.
- **Entry thực tế:** [ReturnsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/orders/index.tsx:252); slot router [ReturnsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:117).
- **Shared APIs (16 loại):** `Amount`, `DataTable`, `DraftConflict`, `EditDialog`, `ErrorNotice`, `FieldGroup`, `FormFields`, `LookupLoadMore`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `RouteLink`, `Status`, `Toolbar`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Button`, `Divider`, `MenuItem`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Return lines, inspection, restock/refund fields và Divider thuộc nghiệp vụ; table/dialog/conflict/field groups/lookup dùng Shared.
- **Phạm vi trace:** apps/web/src/modules/orders/index.tsx:252.

## R44 — Nhà cung cấp hàng hóa

- **Đường dẫn:** `/s/:shopId/suppliers`; **module:** `procurement`.
- **Entry thực tế:** [SuppliersPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/procurement/index.tsx:17); slot router [SuppliersPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:118).
- **Shared APIs (14 loại):** `Amount`, `DataTable`, `DraftConflict`, `EditDialog`, `ErrorNotice`, `FieldGroup`, `FormFields`, `LookupLoadMore`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `Status`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Button`, `MenuItem`, `Stack`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Supplier fields, SKU mapping và lookup thuộc procurement; shared conflict/form/table/dialog giữ nền.
- **Phạm vi trace:** apps/web/src/modules/procurement/index.tsx:17.

## R45 — Đề nghị nhập và quy tắc

- **Đường dẫn:** `/s/:shopId/replenishment`; **module:** `procurement`.
- **Entry thực tế:** [ReplenishmentPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/procurement/index.tsx:97); slot router [ReplenishmentPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:119).
- **Shared APIs (12 loại):** `DataTable`, `EditDialog`, `ErrorNotice`, `FieldGroup`, `FormFields`, `LookupLoadMore`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `Status`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Button`, `Checkbox`, `FormControlLabel`, `MenuItem`, `Tab`, `Tabs`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Tabs đề nghị/quy tắc và các fields thuộc procurement; Tab/Tabs là primitive được theme quản lý, không là Shared API thiếu.
- **Phạm vi trace:** apps/web/src/modules/procurement/index.tsx:97.

## R46 — Đơn mua hàng

- **Đường dẫn:** `/s/:shopId/purchases`; **module:** `procurement`.
- **Entry thực tế:** [PurchasesPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/procurement/index.tsx:180); slot router [PurchasesPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:120).
- **Shared APIs (16 loại):** `Amount`, `ConfirmDialog`, `DataTable`, `DetailLine`, `EditDialog`, `ErrorNotice`, `FieldGroup`, `FormFields`, `LookupLoadMore`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `RouteLink`, `Status`.
- **Components/render helpers riêng:** [PurchaseDialog](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/procurement/index.tsx:255)
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Button`, `MenuItem`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** PurchaseDialog là composition nghiệp vụ ghép Shared; purchase lines, money, approval và receipt links không chuyển vào shared schema engine.
- **Phạm vi trace:** apps/web/src/modules/procurement/index.tsx:180, apps/web/src/modules/procurement/index.tsx:255.

## R47 — Nhận hàng và đối chiếu

- **Đường dẫn:** `/s/:shopId/receipts`; **module:** `procurement`.
- **Entry thực tế:** [ReceiptsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/procurement/index.tsx:288); slot router [ReceiptsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:121).
- **Shared APIs (15 loại):** `ConfirmDialog`, `DataTable`, `DetailLine`, `EditDialog`, `ErrorNotice`, `FieldGroup`, `FormFields`, `LookupLoadMore`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `Status`, `Toolbar`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Button`, `MenuItem`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Fields nhận/kiểm/đối chiếu hàng, lookup và cột thuộc procurement; table/dialog/confirm/form/search dùng Shared.
- **Phạm vi trace:** apps/web/src/modules/procurement/index.tsx:288.

## R48 — Chứng từ và sổ kép

- **Đường dẫn:** `/s/:shopId/finance/journals`; **module:** `finance`.
- **Entry thực tế:** [JournalsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/finance/index.tsx:208); slot router [JournalsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:122).
- **Shared APIs (14 loại):** `Amount`, `ConfirmDialog`, `DataTable`, `DetailLine`, `EditDialog`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `Status`, `Toolbar`.
- **Components/render helpers riêng:** [JournalAccountField](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/finance/index.tsx:200)
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Button`, `MenuItem`, `Stack`, `TextField`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** JournalAccountField chọn tài khoản mẫu/ID thật theo mode; debit/credit pair dùng Stack với layoutSx.form.pairedFields được catalog crosswalk cho phép. Không gọi đây là form spacing tự do.
- **Phạm vi trace:** apps/web/src/modules/finance/index.tsx:208, apps/web/src/modules/finance/index.tsx:200.

## R49 — Đối soát ngân hàng và COD

- **Đường dẫn:** `/s/:shopId/finance/reconciliation`; **module:** `finance`.
- **Entry thực tế:** [ReconciliationPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/finance/index.tsx:244); slot router [ReconciliationPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:123).
- **Shared APIs (13 loại):** `Amount`, `DataTable`, `EditDialog`, `ErrorNotice`, `FormFields`, `LookupLoadMore`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `RouteLink`, `Status`.
- **Components/render helpers riêng:** [StatementDialog](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/finance/index.tsx:295)
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Button`, `MenuItem`, `Tab`, `Tabs`, `TextField`.
- **Native JSX:** `input`; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** StatementDialog local ghép EditDialog/ErrorNotice/FormFields/RouteLink; native CSV input và bank/COD Tabs là nghiệp vụ. Không có MUI Dialog bản riêng tại module.
- **Phạm vi trace:** apps/web/src/modules/finance/index.tsx:244, apps/web/src/modules/finance/index.tsx:295.

## R50 — Công nợ và khóa kỳ

- **Đường dẫn:** `/s/:shopId/finance/debts-periods`; **module:** `finance`.
- **Entry thực tế:** [DebtsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/finance/index.tsx:315); slot router [DebtsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:124).
- **Shared APIs (12 loại):** `Amount`, `ConfirmDialog`, `DataTable`, `EditDialog`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `Status`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Button`, `TextField`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Fields debt allocation và close/reopen-period reason thuộc finance; shared table/dialog/confirm/form/money/status giữ nền.
- **Phạm vi trace:** apps/web/src/modules/finance/index.tsx:315.

## R51 — Bốn vai trò AI và quyền

- **Đường dẫn:** `/s/:shopId/bot/team`; **module:** `bot`.
- **Entry thực tế:** [AgentTeamPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/bot/index.tsx:70); slot router [AgentTeamPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:125).
- **Shared APIs (15 loại):** `ActionGroup`, `Amount`, `ConfirmDialog`, `DataTable`, `DetailLine`, `EditDialog`, `ErrorNotice`, `FormFields`, `MutationButton`, `PageHeader`, `Panel`, `QueryState`, `SectionGrid`, `Status`, `SurfaceContent`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Button`, `Chip`, `Stack`, `TextField`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Role/capability/tool Chips và grant/dialog fields thuộc bot; Chips gắn tool ID, Status giữ workflow status; shared grid/surface/panel/detail/table/form dùng chung.
- **Phạm vi trace:** apps/web/src/modules/bot/index.tsx:70.

## R52 — Bản tin và sức khỏe hệ thống

- **Đường dẫn:** `/s/:shopId/operations/digests`; **module:** `operations`.
- **Entry thực tế:** [DigestsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/operations/index.tsx:238); slot router [DigestsPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:126).
- **Shared APIs (11 loại):** `ConfirmDialog`, `DetailLine`, `ErrorNotice`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `SectionGrid`, `Status`, `SurfaceContent`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Stack`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Digest sections, health details và alert/actions thuộc operations; shared collection/grid/surface/panel/detail/query/status/confirm dùng chung.
- **Phạm vi trace:** apps/web/src/modules/operations/index.tsx:238.

## R53 — Thông tin hỗ trợ marketing

- **Đường dẫn:** `/s/:shopId/reports/marketing`; **module:** `reports`.
- **Entry thực tế:** [MarketingPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/reports/index.tsx:217); slot router [MarketingPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:127).
- **Shared APIs (8 loại):** `Amount`, `DataTable`, `PageHeader`, `Panel`, `QueryState`, `SectionGrid`, `Stat`, `Stats`.
- **Components/render helpers riêng:** [MarketingReasonTick](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/reports/index.tsx:23)
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Box`, `Stack`, `Typography`.
- **Native JSX:** `text`, `tspan`; **chart library:** `Bar`, `BarChart`, `CartesianGrid`, `ResponsiveContainer`, `Tooltip`, `XAxis`, `YAxis`; **MUI icons:** Không có.
- **Phân tích/đánh giá:** MarketingReasonTick là SVG text/tspan renderer riêng cho Recharts; chart geometry/coordinates thuộc chart owner, font/color từ tokens. Không thay SVG bằng Typography/Panel.
- **Phạm vi trace:** apps/web/src/modules/reports/index.tsx:217, apps/web/src/modules/reports/index.tsx:23.

## R54 — Yêu cầu sau bán

- **Đường dẫn:** `/s/:shopId/service-cases`; **module:** `customers`.
- **Entry thực tế:** [ServiceCasesPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/customers/index.tsx:182); slot router [ServiceCasesPage](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/app/router.tsx:128).
- **Shared APIs (13 loại):** `DataTable`, `EditDialog`, `ErrorNotice`, `FormFields`, `LookupLoadMore`, `MutationButton`, `PageHeader`, `Pager`, `Panel`, `QueryState`, `RouteLink`, `Status`, `Toolbar`.
- **Components/render helpers riêng:** Không có component/helper JSX được đặt tên ở top level; vẫn có fields/columns/actions inline.
- **MUI primitives ngoài public Shared boundary:** `Alert`, `Button`, `MenuItem`, `Stack`, `TextField`, `Typography`.
- **Native JSX:** Không có; **chart library:** Không có; **MUI icons:** Không có.
- **Phân tích/đánh giá:** Service-case filters, order/assignee lookup, cột và fields xử lý case thuộc customers; table/search/pager/dialog/lookup/form dùng Shared.
- **Phạm vi trace:** apps/web/src/modules/customers/index.tsx:182.

## Giới hạn

- JSX callbacks/slot bodies được đọc tại source tạo; component functions có tên được trace bằng TypeScript symbol, không chỉ nhìn import đầu file.
- Phần native bootstrap h1/p, HTML skip-link/noscript và downloadText anchor được đọc riêng trong báo cáo, không nằm trong 54 entry function.
- Source gate không chứng minh mọi trạng thái DOM/keyboard/zoom của mỗi màn; lần audit này không chạy mới unit/E2E/browser/build.
- Chi tiết line/column/attrs/tags và fingerprints ở [adoption-current.json](C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/evidence/frontend-shared-adoption-audit-20261008/adoption-current.json).
