# 04 — Màn hình và luồng hiện hành
<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.6.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

Nguồn chuẩn: contracts/route-manifest.json. File này sinh bởi scripts/generate-reference.py. 61 route là hợp đồng màn hình sản phẩm; prototype có phạm vi riêng tại prototype/PROTOTYPE_SCOPE.json.

Mọi màn hình kế thừa Graphite Gold theo design/decision.json đã duyệt và design/tokens.json, dark-only, session/tenant/permission, lỗi/empty/stale/unknown và navigation keyboard ở docs/03,08,09. Actions phải có backend allowedActions, không chỉ đủ permission string.

## R01 — Đăng nhập

**Route:** `/login` · **Module:** `workspace` · **Đọc:** `session/bootstrap`

**Mục đích:** Xác thực vào ứng dụng quản trị; không nhầm với đăng nhập Facebook Page.

**Nội dung:** OIDC login redirect, session error và returnTo đã allowlist; không tự giữ password/token.

**Hành vi:** Dùng beginLogin / completeLogin; nonce/state/PKCE/session rotation ở backend. Local IdP fake chỉ test.

**Trường hợp cần xử lý:** Sai thông tin; rate limit; expired pre-session CSRF; network error; không tiết lộ email tồn tại.

**API đọc:** getCsrfToken

| Hành động | operationId | Quyền |
|---|---|---|
| Đăng nhập qua hệ thống nhận dạng | `beginLogin` | `authenticated/context` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-054, SC-055. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R02 — Chọn cửa hàng

**Route:** `/workspaces` · **Module:** `workspace` · **Đọc:** `session/bootstrap`

**Mục đích:** Chọn shop người dùng có membership hợp lệ.

**Nội dung:** Shop name, role summary, trạng thái; không hiện dữ liệu doanh thu của shop khác.

**Hành vi:** Đổi shop mount scope mới; có guard bản nháp chưa lưu; cache và stream cũ bị dọn.

**Trường hợp cần xử lý:** Không shop; membership revoked; late response của shop trước; không tự fallback sang shop không có quyền.

**API đọc:** listShops, getSession

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-054, SC-055. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R03 — Thiết lập cửa hàng

**Route:** `/onboarding` · **Module:** `workspace` · **Đọc:** `session/bootstrap`

**Mục đích:** Tạo thông tin shop ban đầu trong môi trường được cấp quyền.

**Nội dung:** Tên, currency, timezone, locale; xác nhận base currency trước tạo.

**Hành vi:** Wizard có thể quay lại giữ input memory; chỉ complete sau backend tạo default warehouse/membership.

**Trường hợp cần xử lý:** Tên trống, mã currency sai, timezone không hợp lệ, submit lặp; create permission/policy server mới quyết định.

**API đọc:** getSession

| Hành động | operationId | Quyền |
|---|---|---|
| Tạo cửa hàng | `createShop` | `authenticated/context` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-054, SC-055. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R04 — Tổng quan

**Route:** `/s/:shopId/overview` · **Module:** `dashboard` · **Đọc:** `dashboard.read`

**Mục đích:** Thấy ngay việc cần xử lý và dữ liệu nào đang chưa đầy đủ.

**Nội dung:** Hội thoại chờ, đơn chờ, hàng sắp hết, bot health; revenue/cash chỉ theo finance permission; asOf.

**Hành vi:** KPI mở trang tương ứng với bộ lọc; pause có xác nhận/reason và command status.

**Trường hợp cần xử lý:** Null tiền hiển thị bị hạn chế/chưa có, không 0; partial dashboard và stale; widget lỗi không làm trắng toàn trang.

**API đọc:** getDashboard, getShop

| Hành động | operationId | Quyền |
|---|---|---|
| Tạm dừng bot | `pauseBot` | `bot.publish` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-053. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R05 — Hộp thư

**Route:** `/s/:shopId/inbox` · **Module:** `inbox` · **Đọc:** `conversations.read`

**Mục đích:** Tìm hội thoại cần phản hồi hoặc được phân công.

**Nội dung:** Search, status, mode bot/human, channel/assignee filter được backend hỗ trợ; preview và unread.

**Hành vi:** Chọn row tới R06; URL giữ filter/cursor; bàn phím tới từng hội thoại, không đọc raw PII qua toast.

**Trường hợp cần xử lý:** Không kết quả khác inbox trống; event mới không giật vị trí; slow response không đổi shop đang xem.

**API đọc:** listConversations, getInboxMetadata

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-033, SC-034, SC-035, SC-036, SC-037. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R06 — Chi tiết hội thoại

**Route:** `/s/:shopId/inbox/:conversationId` · **Module:** `inbox` · **Đọc:** `conversations.read`

**Mục đích:** Hỗ trợ khách và kiểm soát bot/human rõ ràng.

**Nội dung:** Message timeline with safe attachment metadata and scoped media readback, delivery status, capability-driven composer, sendEligibility, mode/assignee, source evidence, customer/order panel by permission.

**Hành vi:** Lịch sử phân trang giữ scroll; draft reply không persist; text-only vẫn tương thích; media upload theo policy MIME/size/count và conversation scope; file chỉ gửi theo ID sau synthetic scan ready; Enter/Shift+Enter giữ behavior hiện có; internal note không gửi media.

**Trường hợp cần xử lý:** Policy unknown/blocked disable gửi; takeover race; send timeout unknown; duplicate/out-of-order event; 403 gỡ messages; không tự gửi lại.; policy media thiếu/không hợp lệ thì tắt đính kèm; MIME/size/count/scope/purpose sai hoặc scan chưa ready thì không gửi; send unknown giữ bản nháp và chặn gửi trùng; object URL bị thu hồi khi bỏ tệp/đóng composer.

**API đọc:** getConversation, listMessages, getCommand, getInboxMetadata, getFile

| Hành động | operationId | Quyền |
|---|---|---|
| Gửi tin | `sendMessage` | `conversations.reply` |
| Ghi chú nội bộ | `addInternalNote` | `conversations.reply` |
| Tiếp quản | `takeoverConversation` | `conversations.assign` |
| Trả lại bot | `releaseConversation` | `conversations.assign` |
| Phân công | `assignConversation` | `conversations.assign` |
| Đánh dấu xong | `resolveConversation` | `conversations.assign` |
| Đánh giá câu trả lời | `createFeedback` | `conversations.read` |
| Đính kèm media | `uploadFile` | `conversations.reply` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-033, SC-034, SC-035, SC-036, SC-037. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R07 — Khách hàng

**Route:** `/s/:shopId/customers` · **Module:** `customers` · **Đọc:** `customers.read`

**Mục đích:** Danh sách khách theo shop, không phải tài khoản nhân viên.

**Nội dung:** Tên, thông tin liên hệ masked, external identity khi được phép; search/cursor.

**Hành vi:** Tạo khách qua form validate; chọn vào R08; không gộp khách tự động theo tên.

**Trường hợp cần xử lý:** Khách trùng số điện thoại chỉ cảnh báo/policy server; masked contact; special characters không XSS.

**API đọc:** listCustomers

| Hành động | operationId | Quyền |
|---|---|---|
| Thêm khách | `createCustomer` | `customers.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-038. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R08 — Hồ sơ khách

**Route:** `/s/:shopId/customers/:customerId` · **Module:** `customers` · **Đọc:** `customers.read`

**Mục đích:** Xem và sửa dữ liệu chăm sóc khách được cấp quyền.

**Nội dung:** Tên, phone/email, notes, trường bị che; links tới orders/inbox scoped filter thay vì tải chéo tự do.

**Hành vi:** Edit chờ server + ETag; notes plain/sanitized text; đổi customer reset form.

**Trường hợp cần xử lý:** 412 giữ draft và cho tải phiên bản mới; contact null không bị ghi đè thành chuỗi rỗng; permission change.

**API đọc:** getCustomer, listCustomerAddresses, getCustomerAddress

| Hành động | operationId | Quyền |
|---|---|---|
| Lưu hồ sơ | `updateCustomer` | `customers.write` |
| Thêm địa chỉ | `createCustomerAddress` | `customers.write` |
| Lưu địa chỉ | `updateCustomerAddress` | `customers.write` |
| Ngừng dùng địa chỉ | `archiveCustomerAddress` | `customers.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-038, SC2-C05-ADDRESS. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R09 — Sản phẩm

**Route:** `/s/:shopId/products` · **Module:** `catalog` · **Đọc:** `catalog.read`

**Mục đích:** Quản lý danh mục sản phẩm với search/filter thật toàn dataset.

**Nội dung:** Tên, SKU/biến thể summary, category, status, price range theo quyền; search/category/status/sort.

**Hành vi:** Nút thêm điều hướng R10; row tới R11; mọi phân trang ở server; không tính tổng tồn từ product DTO.

**Trường hợp cần xử lý:** 0/1/100k records; long Vietnamese names; product archived; invalid cursor/filter; không fetch tất cả rồi lọc browser.

**API đọc:** listProducts, listCategories

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-012, SC-013, SC-014, SC-015, SC-016, SC-017, SC-018. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R10 — Thêm sản phẩm

**Route:** `/s/:shopId/products/new` · **Module:** `catalog` · **Đọc:** `catalog.write`

**Mục đích:** Tạo Product và tối thiểu một Variant.

**Nội dung:** Tên 1–160 ký tự, mô tả, category, status draft/active; mỗi variant có SKU, options, name, currency/price, active; ảnh.

**Hành vi:** Client validation và server errors theo field; submit idempotent; thành công tới detail. Giá decimal string, không nhập stock ở form này.

**Trường hợp cần xử lý:** SKU trùng scoped; variant options trùng; upload quarantined; currency khác shop; mạng đứt không reset form.

**API đọc:** listCategories

| Hành động | operationId | Quyền |
|---|---|---|
| Tạo sản phẩm | `createProduct` | `catalog.write` |
| Tải ảnh | `uploadFile` | `authenticated/context` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-012, SC-013, SC-014, SC-015, SC-016, SC-017, SC-018. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R11 — Chi tiết sản phẩm

**Route:** `/s/:shopId/products/:productId` · **Module:** `catalog` · **Đọc:** `catalog.read`

**Mục đích:** Sửa danh mục mà không phá lịch sử đơn/kho.

**Nội dung:** Overview, variants/prices/images, version và updatedAt; links kho theo variant chỉ khi có quyền.

**Hành vi:** Edit dùng ETag; archive confirm nêu tác động; variants đã có order không xóa lịch sử; image chỉ dùng ready file.

**Trường hợp cần xử lý:** 412; SKU conflict; product archived; unauthorized field; thay giá không đổi giá snapshot order cũ.

**API đọc:** getProduct, listCategories, getFile

| Hành động | operationId | Quyền |
|---|---|---|
| Lưu sản phẩm | `updateProduct` | `catalog.write` |
| Lưu trữ sản phẩm | `archiveProduct` | `catalog.write` |
| Tải ảnh | `uploadFile` | `authenticated/context` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-012, SC-013, SC-014, SC-015, SC-016, SC-017, SC-018. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R12 — Danh mục hàng

**Route:** `/s/:shopId/categories` · **Module:** `catalog` · **Đọc:** `catalog.read`

**Mục đích:** Sắp xếp sản phẩm theo nhóm mà không tạo cây vô hạn.

**Nội dung:** Tên, parent, active, phiên bản; table hoặc tree bounded.

**Hành vi:** Create/edit parent selection chống cycle server; archive hiển thị tác động với sản phẩm đang tham chiếu.

**Trường hợp cần xử lý:** Parent khác shop; cycle; danh mục đang dùng; 412; không xóa hàng hóa theo cascade ở UI.

**API đọc:** listCategories, getCategory

| Hành động | operationId | Quyền |
|---|---|---|
| Thêm danh mục | `createCategory` | `catalog.write` |
| Sửa danh mục | `updateCategory` | `catalog.write` |
| Lưu trữ danh mục | `archiveCategory` | `catalog.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-012, SC-013, SC-014, SC-015, SC-016, SC-017, SC-018. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R13 — Nhập dữ liệu

**Route:** `/s/:shopId/imports` · **Module:** `catalog` · **Đọc:** `catalog.import`

**Mục đích:** Import catalog có kiểm tra trước khi ghi, không import âm thầm vào kho.

**Nội dung:** File CSV/XLSX không macro, purpose, mapping sku/name/description/category/price/currency/variantName, duplicate strategy.

**Hành vi:** Upload→validate→preview; nút commit ở R14. File quá hạn/quarantine không được parse. Giới hạn do backend trả và tối đa baseline.

**Trường hợp cần xử lý:** Sai encoding/cột/currency; formula/external link; file size/rows over-limit; không đẩy toàn file parsed vào DOM.

**API đọc:** listJobs, getFile

| Hành động | operationId | Quyền |
|---|---|---|
| Tải file | `uploadFile` | `authenticated/context` |
| Kiểm tra file | `createProductImport` | `catalog.import` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-012, SC-013, SC-014, SC-015, SC-016, SC-017, SC-018. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R14 — Kết quả nhập dữ liệu

**Route:** `/s/:shopId/imports/:jobId` · **Module:** `catalog` · **Đọc:** `catalog.import`

**Mục đích:** Cho người dùng quyết định rõ trước commit kết quả dry-run.

**Nội dung:** Số dòng hợp lệ/lỗi, paginated errors/export lỗi, validationToken, strategy, progress và thành công một phần.

**Hành vi:** Confirm đúng validation snapshot; key cùng payload; job chạy backend, đóng tab không hủy lệnh đã tiếp nhận.

**Trường hợp cần xử lý:** File/dữ liệu đổi sau preview; partial commit; retry chỉ failed rows với intent mới có preview; không ghi lại dòng đã thành công.

**API đọc:** getJob

| Hành động | operationId | Quyền |
|---|---|---|
| Ghi các dòng hợp lệ | `commitProductImport` | `catalog.import` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-012, SC-013, SC-014, SC-015, SC-016, SC-017, SC-018. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R15 — Tồn kho

**Route:** `/s/:shopId/inventory` · **Module:** `inventory` · **Đọc:** `inventory.read`

**Mục đích:** Thấy onHand, reserved và available theo SKU/warehouse.

**Nội dung:** SKU, warehouse, onHand, reserved, available, low-stock, asOf; unitCost chỉ khi server cho phép.

**Hành vi:** Điều chỉnh drawer delta + reason + expectedVersion + cost cần thiết; chờ command rồi refetch; v1 default warehouse.

**Trường hợp cần xử lý:** Oversell/negative available, version conflict, thiếu cost, unknown command; không optimistic và không PUT absolute stock.

**API đọc:** listStockSnapshots, getShop

| Hành động | operationId | Quyền |
|---|---|---|
| Điều chỉnh tồn | `createInventoryAdjustment` | `inventory.adjust` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-019, SC-020, SC-021. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R16 — Lịch sử kho

**Route:** `/s/:shopId/inventory/movements` · **Module:** `inventory` · **Đọc:** `inventory.read`

**Mục đích:** Truy nguyên mỗi thay đổi kho đến nguồn nghiệp vụ.

**Nội dung:** Thời gian, SKU, warehouse, onHand delta, reserved delta, kind, actor, reason, source link.

**Hành vi:** Read-only, cursor/search/filter; links order chỉ mở khi có quyền; chỉnh sai bằng adjustment bù, không edit movement.

**Trường hợp cần xử lý:** Event lặp không tạo row lặp; source archived vẫn có history; timezone và sort stable.

**API đọc:** listStockMovements

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-019, SC-020, SC-021. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R17 — Đơn hàng

**Route:** `/s/:shopId/orders` · **Module:** `orders` · **Đọc:** `orders.read`

**Mục đích:** Theo dõi đơn mà không trộn trạng thái giao hàng/thanh toán.

**Nội dung:** Order/customer refs, createdAt, order/fulfillment/payment states riêng, tổng tiền nếu được phép.

**Hành vi:** Filter qua URL, tạo đơn tới R18, row tới R19; bulk mutation chưa hỗ trợ phải ẩn. V2: tách claim/pick/pack/handover/shipment/delivery/payment. Không dùng v1 fulfill tổng hợp; C07 returns theo từng dòng.

**Trường hợp cần xử lý:** Enum mới fallback read-only; stale paid badge; redacted total; phân trang không tự cộng thành doanh thu shop.

**API đọc:** listOrders

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-022, SC-023, SC-024, SC-025, SC-026, SC-027. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R18 — Tạo đơn nháp

**Route:** `/s/:shopId/orders/new` · **Module:** `orders` · **Đọc:** `orders.write`

**Mục đích:** Tạo draft theo nhu cầu khách, chưa giữ hàng/chưa ghi nhận doanh thu.

**Nội dung:** Customer, optional conversation ref, variant selection, quantities integer, warehouse mặc định, notes.

**Hành vi:** Product picker remote search; preview giá có nhãn chưa chốt; request gửi IDs/qty, server trả authoritative snapshots. V2: tách claim/pick/pack/handover/shipment/delivery/payment. Không dùng v1 fulfill tổng hợp; C07 returns theo từng dòng.

**Trường hợp cần xử lý:** Variant archived/out of stock; customer/variant khác shop; trùng submit; thiếu quyền xem khách; intent seeded từ inbox vẫn revalidate.

**API đọc:** listCustomers, listProducts, getShop

| Hành động | operationId | Quyền |
|---|---|---|
| Tạo đơn nháp | `createOrder` | `orders.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-022, SC-023, SC-024, SC-025, SC-026, SC-027. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R19 — Chi tiết đơn hàng

**Route:** `/s/:shopId/orders/:orderId` · **Module:** `orders` · **Đọc:** `orders.read`

**Mục đích:** Vận hành workflow dựa trên allowedActions và quyền, không sửa status tùy ý.

**Nội dung:** Snapshot dòng hàng, totals, ba state, source customer/conversation, version, các action server cho phép.

**Hành vi:** Quote/consent → reserve → preparation → handover → delivery/control-transfer → payment reconciliation. Return request/inspection is separate from recording an observed refund. No direct v1 fulfill/return bypass.

**Trường hợp cần xử lý:** Double submit, last SKU race, expired quote, unknown delivery outcome, partial returns, COD outstanding and closed period. No real money movement initiated by this UI.

**API đọc:** getOrder, getCommand

| Hành động | operationId | Quyền |
|---|---|---|
| Lưu đơn nháp | `updateOrderDraft` | `orders.write` |
| Lấy báo giá | `quoteOrder` | `orders.write` |
| Xác nhận giữ hàng | `confirmOrder` | `orders.confirm` |
| Bàn giao shipment sau đóng gói | `handoverShipment` | `fulfillment.handover` |
| Hủy đơn | `cancelOrder` | `orders.write` |
| Tạo yêu cầu đổi trả có kiểm hàng | `createReturnCase` | `orders.return` |
| Ghi nhận đã thu tiền | `payOrder` | `finance.post` |
| Ghi nhận hoàn tiền | `refundOrder` | `finance.refund` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-022, SC-023, SC-024, SC-025, SC-026, SC-027. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R20 — Thu/chi tổng quan

**Route:** `/s/:shopId/finance` · **Module:** `finance` · **Đọc:** `finance.read`

**Mục đích:** Phân biệt tiền vào/ra trong kỳ với lợi nhuận.

**Nội dung:** From/to/timezone, receipts, disbursements, netCashMovement, asOf/warnings.

**Hành vi:** Bộ lọc kỳ dùng [from,to); drilldown sang entries với context; currency shop duy nhất. V2: posted journal là nguồn tính; revenue theo policy được duyệt. Cash/COD/AP/AR tách biệt; không cộng tiền chưa nhận.

**Trường hợp cần xử lý:** Negative cashflow không tự gọi lỗ; incomplete period; timezone boundary; zero có thật khác null.

**API đọc:** getCashflow

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-028, SC-029, SC-030, SC-031, SC-032. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R21 — Sổ thu/chi

**Route:** `/s/:shopId/finance/entries` · **Module:** `finance` · **Đọc:** `finance.read`

**Mục đích:** Theo dõi phiếu có phân loại và nguồn, không sửa sổ đã ghi.

**Nội dung:** Kind receipt/disbursement, classification, amount/currency, occurredAt, description, sourceRef, status, reversal link.

**Hành vi:** Draft edit ETag; post/reverse explicit confirmation; capital/loan/inventory_purchase không tự tính vào operating expense. V2: posted journal là nguồn tính; revenue theo policy được duyệt. Cash/COD/AP/AR tách biệt; không cộng tiền chưa nhận.

**Trường hợp cần xử lý:** SourceRef trùng đơn; tiền âm/0 không hợp lệ cho phiếu; posted không edit; double post; reversal có lý do và audit.

**API đọc:** listFinanceEntries, getFinanceEntry, getCommand

| Hành động | operationId | Quyền |
|---|---|---|
| Thêm phiếu nháp | `createFinanceEntry` | `finance.post` |
| Sửa phiếu nháp | `updateFinanceEntry` | `finance.post` |
| Ghi sổ | `postFinanceEntry` | `finance.post` |
| Đảo phiếu đã ghi | `reverseFinanceEntry` | `finance.post` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-028, SC-029, SC-030, SC-031, SC-032. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R22 — Lợi nhuận quản trị

**Route:** `/s/:shopId/finance/profit-loss` · **Module:** `finance` · **Đọc:** `finance.read`

**Mục đích:** Trình bày lãi/lỗ quản trị có nguồn và mức đầy đủ dữ liệu.

**Nội dung:** Gross/net sales, discounts/returns, COGS, gross profit, shipping/fees/AI/opex, operating profit, policyVersion/asOf.

**Hành vi:** Kỳ/timezone server; null/unknown hiện chưa xác định; provisional badge và drilldown; không recompute từ list entries trên client. V2: posted journal là nguồn tính; revenue theo policy được duyệt. Cash/COD/AP/AR tách biệt; không cộng tiền chưa nhận.

**Trường hợp cần xử lý:** Thiếu unit cost; hoàn hàng khác hoàn tiền; invoice AI chưa đối soát; không gọi báo cáo là tuân thủ thuế quốc gia.

**API đọc:** getProfitLoss

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-028, SC-029, SC-030, SC-031, SC-032. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R23 — Nguồn kiến thức

**Route:** `/s/:shopId/knowledge` · **Module:** `knowledge` · **Đọc:** `knowledge.read`

**Mục đích:** Tách tri thức đã duyệt với file đang xử lý.

**Nội dung:** Tên, sourceKind, status, revision, publishedAt, warnings; search/status filter.

**Hành vi:** Manual source hoặc file ready; tạo draft; trạng thái processing không có nghĩa đã đưa vào bot.

**Trường hợp cần xử lý:** Duplicate/content hash; parse failed/quarantine; dữ liệu PII; published vs indexed hiển thị khác nhau.

**API đọc:** listKnowledge, getFile

| Hành động | operationId | Quyền |
|---|---|---|
| Thêm nguồn | `createKnowledge` | `knowledge.write` |
| Tải tài liệu | `uploadFile` | `authenticated/context` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-039, SC-040, SC-041, SC-042. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R24 — Chi tiết kiến thức

**Route:** `/s/:shopId/knowledge/:knowledgeId` · **Module:** `knowledge` · **Đọc:** `knowledge.read`

**Mục đích:** Quản lý nội dung và vòng đời revision có review/evaluation.

**Nội dung:** Content/source, draft/live IDs, history, approver, warnings và evaluation reference.

**Hành vi:** Published immutable; sửa tạo revision; restore tạo draft mới; publish cần eval đúng revision, không auto-live từ restore.

**Trường hợp cần xử lý:** Eval stale so với revision/model; người sửa không có publish permission; retired source còn được trích cần warning/cache cleanup.

**API đọc:** getKnowledge, listKnowledgeRevisions, getKnowledgeRevision

| Hành động | operationId | Quyền |
|---|---|---|
| Lưu bản nháp | `updateKnowledge` | `knowledge.write` |
| Tạo revision mới | `createKnowledgeRevision` | `knowledge.write` |
| Gửi kiểm tra và duyệt | `submitKnowledgeReview` | `knowledge.write` |
| Publish revision | `publishKnowledge` | `knowledge.publish` |
| Ngừng sử dụng | `retireKnowledge` | `knowledge.publish` |
| Khôi phục thành nháp | `restoreKnowledgeRevision` | `knowledge.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-039, SC-040, SC-041, SC-042. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R25 — Đánh giá và phản hồi

**Route:** `/s/:shopId/knowledge/review` · **Module:** `knowledge` · **Đọc:** `knowledge.read`

**Mục đích:** Biến phản hồi có ích thành đề xuất đã kiểm soát, không tự học mọi chat.

**Nội dung:** Conversation/message reference, rating, correction, trạng thái; redaction và review reason.

**Hành vi:** Review yêu cầu correction đã loại PII; approve chỉ tạo candidate/reference cho KB draft, không publish tự động.

**Trường hợp cần xử lý:** Prompt injection trong correction; wrong shop evidence; concurrent reviewer; rejected có lý do; không lộ raw khách cho người thiếu quyền.

**API đọc:** listFeedback

| Hành động | operationId | Quyền |
|---|---|---|
| Duyệt hoặc từ chối | `reviewFeedback` | `knowledge.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-039, SC-040, SC-041, SC-042. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R26 — Cấu hình bot

**Route:** `/s/:shopId/bot` · **Module:** `bot` · **Đọc:** `bot.read`

**Mục đích:** Tách cấu hình đang dùng với cấu hình đang soạn.

**Nội dung:** Connection/model capability, instructions, knowledge revisions, limits/budget, human-confirm flag, live/draft/version.

**Hành vi:** Save draft dùng ETag; publish cần eval chính xác; pause explicit; restore không tự active, phải qua eval/publish.

**Trường hợp cần xử lý:** Provider unsupported/degraded, budget hết, stale eval, config conflict; UI không tự bypass human-confirmation.

**API đọc:** getBotConfig, listAIConnections, listKnowledge, listBotRevisions, getBotRevision

| Hành động | operationId | Quyền |
|---|---|---|
| Lưu cấu hình nháp | `updateBotDraft` | `bot.configure` |
| Publish cấu hình | `publishBotConfig` | `bot.publish` |
| Tạm dừng | `pauseBot` | `bot.publish` |
| Khôi phục revision thành nháp | `restoreBotRevision` | `bot.configure` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-043, SC-044, SC-045, SC-046. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R27 — Thử bot an toàn

**Route:** `/s/:shopId/bot/playground` · **Module:** `bot` · **Đọc:** `bot.configure`

**Mục đích:** Kiểm tra phản hồi mà không gửi khách thật.

**Nội dung:** Input giả, model/config revision, answer, sources, warnings, tools summary, latency/usage/cost estimate.

**Hành vi:** Banner sandbox; không external send; nguồn live price/stock tool backend scope; reset history khỏi scope cũ.

**Trường hợp cần xử lý:** Missing sources; hallucination rubric; provider timeout; unsupported capability; usage unknown không 0; không nhập PII thật trong demo.

**API đọc:** getBotConfig

| Hành động | operationId | Quyền |
|---|---|---|
| Chạy thử | `runPlayground` | `bot.configure` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-043, SC-044, SC-045, SC-046. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R28 — Kiểm thử chất lượng AI

**Route:** `/s/:shopId/bot/evaluations` · **Module:** `bot` · **Đọc:** `bot.read`

**Mục đích:** Theo dõi kết quả theo dataset/config revision để chặn hồi quy.

**Nội dung:** Run ID, config/dataset versions, status, total/pass/critical failures, report link.

**Hành vi:** Chạy async, poll/stream progress; retry failed run tạo run mới giữ history; không dùng rate tự tin do LLM tạo.

**Trường hợp cần xử lý:** Evaluation pending/error; critical failure blocks publish; dataset thay đổi làm kết quả cũ không đủ; partial output không coi passed.

**API đọc:** listEvaluations, getEvaluation, getJob

| Hành động | operationId | Quyền |
|---|---|---|
| Chạy evaluation | `createEvaluation` | `bot.configure` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-043, SC-044, SC-045, SC-046. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R29 — Kết nối Facebook

**Route:** `/s/:shopId/integrations/channels` · **Module:** `integrations` · **Đọc:** `integrations.read`

**Mục đích:** Theo dõi kênh chính thức và điều kiện gửi tin thực.

**Nội dung:** Page name/id, trạng thái, lastWebhookAt, policyVersion/verification, capability/warnings.

**Hành vi:** OAuth do backend khởi tạo; chỉ dùng authorizationUrl validated, callback kiểm state server; không nhập Page token công khai vào UI settings.

**Trường hợp cần xử lý:** Chưa app review/quyền; token revoked; webhook stale; policy unknown; disconnect không xóa lịch sử khách/đơn.

**API đọc:** listChannels, getChannel, getJob

| Hành động | operationId | Quyền |
|---|---|---|
| Kết nối Page | `beginChannelConnect` | `integrations.manage` |
| Kết nối lại | `reconnectChannel` | `integrations.manage` |
| Ngắt kết nối | `disconnectChannel` | `integrations.manage` |
| Kiểm tra sức khỏe | `checkChannelHealth` | `integrations.manage` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-047, SC-048, SC-049, SC-050. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R30 — Nhà cung cấp AI

**Route:** `/s/:shopId/integrations/ai` · **Module:** `integrations` · **Đọc:** `integrations.read`

**Mục đích:** Quản lý adapter/model/capability, không giả định mọi key dùng được.

**Nội dung:** Provider/model catalog, capabilities, status, keyLast4, hasCredential, endpoint theo policy, lastCheckedAt.

**Hành vi:** Secret nhập một lần local; clear submit/unmount; test tính phí có xác nhận khi real; xoá connection đang được bot dùng bị server chặn hoặc cần đổi trước.

**Trường hợp cần xử lý:** Protocol mismatch; custom endpoint SSRF; expired key; quota; unknown model capability; response/log không chứa credential.

**API đọc:** listAIConnections, getAIConnection, getProviderCatalog, getJob

| Hành động | operationId | Quyền |
|---|---|---|
| Thêm kết nối | `createAIConnection` | `integrations.manage` |
| Cập nhật/đổi key | `updateAIConnection` | `integrations.manage` |
| Kiểm tra kết nối | `testAIConnection` | `integrations.manage` |
| Gỡ kết nối | `deleteAIConnection` | `integrations.manage` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-047, SC-048, SC-049, SC-050. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R31 — Báo cáo và xuất dữ liệu

**Route:** `/s/:shopId/reports` · **Module:** `reports` · **Đọc:** `reports.read`

**Mục đích:** Chọn báo cáo theo quyền và xuất snapshot nhất quán.

**Nội dung:** Report type inventory/orders/cashflow/profit_loss, kỳ/timezone/asOf, format CSV, trạng thái job.

**Hành vi:** Report view điều hướng route nghiệp vụ tương ứng; export cần cả reports.export và permission nguồn; tải qua URL authorized ngắn hạn.

**Trường hợp cần xử lý:** Mixed currency không cộng; signed URL hết hạn; export khác tenant; formula injection; partial/error job không phát file giả.

**API đọc:** getReportSummary, listJobs

| Hành động | operationId | Quyền |
|---|---|---|
| Xuất báo cáo | `createExport` | `reports.export` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-051, SC-052. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R32 — Nhân sự và quyền

**Route:** `/s/:shopId/settings/team` · **Module:** `workspace` · **Đọc:** `members.manage`

**Mục đích:** Quản lý membership scoped theo shop.

**Nội dung:** Email/user, roles, permission preview, status, permissionVersion; không trộn Customer.

**Hành vi:** Đổi role/revoke dùng ETag; server bảo vệ owner cuối; session/stream bị revoke ở tab người bị đổi.

**Trường hợp cần xử lý:** Mời trùng; role escalation; tự xóa owner cuối; stale form; không hiện token/email invitation secret trong log.

**API đọc:** listMembers, getMember

| Hành động | operationId | Quyền |
|---|---|---|
| Mời nhân viên | `inviteMember` | `members.manage` |
| Đổi vai trò | `updateMemberRoles` | `members.manage` |
| Thu hồi quyền | `revokeMembership` | `members.manage` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-054, SC-055. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R33 — Thiết lập cửa hàng

**Route:** `/s/:shopId/settings/shop` · **Module:** `workspace` · **Đọc:** `shop.manage`

**Mục đích:** Sửa thông tin hoạt động không phá lịch sử tiền tệ.

**Nội dung:** Tên, locale, timezone; currency/default warehouse/policyVersion read-only sau onboarding.

**Hành vi:** ETag và preview ảnh hưởng timezone tới báo cáo; base currency đổi là migration riêng, không inline select tùy tiện.

**Trường hợp cần xử lý:** Invalid timezone/locale; 412; đổi shop giữa lúc save; không fallback currency bằng browser locale.

**API đọc:** getShop

| Hành động | operationId | Quyền |
|---|---|---|
| Lưu thiết lập | `updateShop` | `shop.manage` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-054, SC-055. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R34 — Nhật ký kiểm toán

**Route:** `/s/:shopId/settings/audit` · **Module:** `workspace` · **Đọc:** `audit.read`

**Mục đích:** Truy nguyên hành động mà không lộ raw secret/PII.

**Nội dung:** Actor, action, time, resource ref, requestId, sanitized summary; search/filter/cursor.

**Hành vi:** Read-only; links được permission guard; không cho sửa/xóa audit từ UI; giữ context filter.

**Trường hợp cần xử lý:** Long messages; deleted resource; unauthorized cross-shop; raw key/phone có trong summary phải bị scrub ở server.

**API đọc:** listAuditEvents

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-054, SC-055. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R35 — Quyền riêng tư và lưu trữ

**Route:** `/s/:shopId/settings/privacy` · **Module:** `workspace` · **Đọc:** `privacy.manage`

**Mục đích:** Quản lý policy và request xóa/xuất theo phạm vi đã duyệt.

**Nội dung:** Retention draft/active, jurisdiction note, customer request type/reason/status, legal_hold và job result.

**Hành vi:** Xác nhận scope, step-up khi approve; server xét legal hold/authority; deletion bao gồm index/cache/downstream theo policy.

**Trường hợp cần xử lý:** Retention chưa được legal approve; hold; job failed một phần; không hứa xóa toàn bộ backup ngay; token step-up không persist.

**API đọc:** getPrivacyPolicy, listPrivacyRequests, getCommand

| Hành động | operationId | Quyền |
|---|---|---|
| Lưu policy | `updatePrivacyPolicy` | `privacy.manage` |
| Tạo yêu cầu dữ liệu | `createPrivacyRequest` | `privacy.manage` |
| Xác thực lại | `stepUp` | `authenticated/context` |
| Phê duyệt yêu cầu | `approvePrivacyRequest` | `privacy.manage` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-054, SC-055. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R36 — Theo dõi công việc nền

**Route:** `/s/:shopId/jobs/:jobId` · **Module:** `workspace` · **Đọc:** `jobs.read`

**Mục đích:** Theo dõi import/export/index/eval/privacy được phép từ mọi module.

**Nội dung:** Kind/status, progress, counts/errors, result ref, downloadUrl khi ready.

**Hành vi:** Refetch stream/poll bounded; source-specific permission ngoài jobs.read; trở về trang nguồn; download không chứa permanent public URL.

**Trường hợp cần xử lý:** Không thấy job người khác/tenant khác; unknown total progress; partial/failed; link expired và unauthorized data không còn cache.

**API đọc:** getJob

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-054, SC-055. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R37 — Điều hành và công việc

**Route:** `/s/:shopId/operations` · **Module:** `operations` · **Đọc:** `operations.read`

**Mục đích:** Bảng công việc chung / Giám sát ngoại lệ / Trạng thái hệ thống

**Nội dung:** One WorkItem per business intent; assignee/dependencies/due/status/evidence.
Rules detect unanswered cases/unclaimed orders/late shipments/low stock/unmatched money.
Provider/channel/worker heartbeat/lag/budget/failed/unknown; degraded runbook link.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Notification ack liên kết task, không thành tracker cạnh tranh; cancelled source cancels task.
Rule version, cooldown, dedupe; no endless self-created tasks.
No green healthy when last check too old; unknown distinct down.

**API đọc:** getOperationsSummary, listWorkItems

| Hành động | operationId | Quyền |
|---|---|---|
| claimWorkItem | `claimWorkItem` | `operations.claim` |
| updateWorkItem | `updateWorkItem` | `operations.manage` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-F02, SC2-F03, SC2-F07. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R38 — Hàng chờ phê duyệt

**Route:** `/s/:shopId/approvals` · **Module:** `operations` · **Đọc:** `approvals.read`

**Mục đích:** Hàng chờ duyệt / Ủy quyền

**Nội dung:** Approval binds shop/action/resourceVersion/policyVersion/intentHash/expiry; reason required reject.
Versioned rule amounts/actions/scopes; current effective authority checked before execution.
Delegation chỉ cấp purchase.send; owner quản lý scope, hạn mức, version, expiry, pause và revoke. Grant mới luôn paused.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Expired/changed/replayed approvals fail; batch approval excludes stale rows with reasons.
Supervisor không tự nâng scope, không approval của mình thành người thật.

**API đọc:** listApprovals, getApproval, listPurchaseDelegations, listPurchaseDelegationReservations

| Hành động | operationId | Quyền |
|---|---|---|
| decideApproval | `decideApproval` | `approvals.decide` |
| createPurchaseDelegation | `createPurchaseDelegation` | `procurement.delegation.manage` |
| updatePurchaseDelegation | `updatePurchaseDelegation` | `procurement.delegation.manage` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-F04, SC2-F05, SC2-D06. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R39 — Trung tâm thông báo

**Route:** `/s/:shopId/notifications` · **Module:** `notifications` · **Đọc:** `notifications.read`

**Mục đích:** Báo đơn đủ điều kiện chuẩn bị / Mở đơn an toàn từ thông báo / Xác nhận nhận chuẩn bị / Theo dõi gửi/mở/nhận việc

**Nội dung:** order.confirmed + reservation bền vững + payment/COD policy cho phép mới tạo task và notification intent.
Deep-link đến shop/order sau session bootstrap; nội dung lockscreen tối thiểu; không có PII trong URL.
Nút Tôi nhận đơn thực hiện compare-and-set task.version/assignee trong transaction; người nhận và thời gian rõ.
Tách accepted_by_provider, failed, unknown, opened_if_observed, acknowledged; không suy diễn giao thành công.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Đơn nháp, reservation fail hoặc transaction rollback không phát lệnh chuẩn bị; event trùng chỉ một việc.
Người không thuộc shop nhận 403/404; URL cũ không vượt quyền hiện hành.
Hai nhân viên đồng thời nhận: một thắng, một thấy người đã nhận; delivery receipt không đồng nghĩa nhận việc.
Timeout không gắn failed; không có callback mở thì giữ unknown, không tạo tỷ lệ đọc giả.

**API đọc:** listNotifications, getNotification

| Hành động | operationId | Quyền |
|---|---|---|
| acknowledgeNotification | `acknowledgeNotification` | `operations.claim` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-A02, SC2-A03, SC2-A04, SC2-A07. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R40 — Thiết bị, kênh nhận và lịch trực

**Route:** `/s/:shopId/notifications/devices` · **Module:** `notifications` · **Đọc:** `notifications.manage`

**Mục đích:** Đăng ký thiết bị nhận thông báo / Nhắc hạn và dự phòng / Loại thông báo và lịch trực / Chống trùng và bảo vệ thông báo

**Nội dung:** Hiển thị khả năng thiết bị, hướng dẫn cài PWA, xin quyền sau thao tác người dùng; gửi kiểm tra; thu hồi subscription.
Lịch nhắc dựa lịch trực/múi giờ, policy có version; định danh intent và số lần tối đa; fallback Telegram đã liên kết.
Ưu tiên đơn mới, trễ, hết hàng, lệch tiền, lỗi; giờ yên lặng; chủ shop duyệt ngoại lệ khẩn.
Dedupe theo shop/event/recipient/channel, payload tối thiểu, callback token ngắn hạn, rate/budget cap.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Từ chối quyền không ghi connected; thiết bị đã thu hồi không nhận lại; không yêu cầu key trong trình duyệt.
Nhận việc/hủy đơn dừng nhắc; worker restart không phát trùng; không có người trực thì vào hàng ngoại lệ.
Không tự bỏ qua giờ yên lặng; bộ nhớ cấu hình mẫu không thành chính sách live.
Callback replay, membership revoked, sai shop hoặc TTL hết đều bị chặn; tắt SMS/voice mặc định.

**API đọc:** listDevices, getNotificationPolicy

| Hành động | operationId | Quyền |
|---|---|---|
| createDevice | `createDevice` | `notifications.manage` |
| revokeDevice | `revokeDevice` | `notifications.manage` |
| testDevice | `testDevice` | `notifications.manage` |
| beginTelegramPairing | `beginTelegramPairing` | `notifications.manage` |
| updateNotificationPolicy | `updateNotificationPolicy` | `notifications.manage` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-A01, SC2-A05, SC2-A06, SC2-A08. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R41 — Chuẩn bị và lấy hàng

**Route:** `/s/:shopId/fulfillment` · **Module:** `fulfillment` · **Đọc:** `fulfillment.read`

**Mục đích:** Bảng chuẩn bị hàng / Phiếu lấy hàng theo SKU / Kiểm đóng gói

**Nội dung:** Task board queued/claimed/picking/packed/handed_over với assignee, dueAt, thời gian trễ.
Checklist line, phiên bản, quantity; barcode tùy chọn và sửa lượng có reason.
Thiếu/hỏng/sai biến thể tạo issue; chỉ đóng gói đủ dòng và điều kiện bắt buộc.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Không gộp packed với delivered; bộ lọc không làm mất việc chưa nhận.
Quét sai SKU/nhập vượt lượng chặn pack; snapshot không dùng ảnh hiện tại sai phiên bản.
Có issue chưa giải quyết thì không ready; ảnh chứng cứ không công khai PII.

**API đọc:** listPrepJobs, getPrepJob

| Hành động | operationId | Quyền |
|---|---|---|
| pickPrepLine | `pickPrepLine` | `fulfillment.write` |
| packPrepJob | `packPrepJob` | `fulfillment.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-C01, SC2-C02, SC2-C03. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R42 — Vận đơn và giao hàng

**Route:** `/s/:shopId/shipments` · **Module:** `fulfillment` · **Đọc:** `fulfillment.read`

**Mục đích:** Phí và vùng giao hàng / Vận đơn và bàn giao / Trạng thái giao độc lập

**Nội dung:** Shipping address, serviceability, quote/actual fee, shipper, package size nếu yêu cầu.
Adapter carrier hoặc nhập mã thủ công; idempotent label; người thật xác nhận bàn giao.
Shipment separate from order/payment; transit/delivered/failed/returning/returned với evidence event.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Ngoài vùng, quote phí hết hạn hoặc thiếu address không hứa giao.
Timeout create label phải reconcile; bàn giao lần hai không trừ tồn lần hai.
Event lùi/trùng không hoàn tất sai; delivered không đồng nghĩa tiền về ngân hàng.

**API đọc:** listShipments, getShipment

| Hành động | operationId | Quyền |
|---|---|---|
| createShipment | `createShipment` | `fulfillment.write` |
| handoverShipment | `handoverShipment` | `fulfillment.handover` |
| recordShipmentEvent | `recordShipmentEvent` | `fulfillment.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-C04, SC2-C05, SC2-C06. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R43 — Đổi trả và kiểm hàng hoàn

**Route:** `/s/:shopId/returns` · **Module:** `orders` · **Đọc:** `orders.read`

**Mục đích:** Đổi/trả từng phần / Sửa/hủy theo giai đoạn

**Nội dung:** Return line/quantity, kiểm tình trạng, refund obligation, người duyệt, reversal.
Draft edit; confirmed release/requote; sau handover là return process; notify task changes.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Returned item chưa kiểm không available; không hoàn quá paid/qty; partial return không làm hoàn toàn đơn.
Không hủy đơn đã handed_over bằng cancel thường; reservation release đúng một lần.

**API đọc:** listReturnCases, getReturnCase

| Hành động | operationId | Quyền |
|---|---|---|
| createReturnCase | `createReturnCase` | `orders.return` |
| inspectReturn | `inspectReturn` | `inventory.adjust` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-C07, SC2-C08. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R44 — Nhà cung cấp hàng hóa

**Route:** `/s/:shopId/suppliers` · **Module:** `procurement` · **Đọc:** `procurement.read`

**Mục đích:** Nhà cung cấp hàng hóa

**Nội dung:** Supplier/SKU price/MOQ/packSize/leadTime/currency/paymentTerms; approved status.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Supplier khác shop hoặc chưa duyệt không auto-purchase; lịch sử đổi giá được giữ.

**API đọc:** listSuppliers, getSupplier, listSupplierOffers

| Hành động | operationId | Quyền |
|---|---|---|
| createSupplier | `createSupplier` | `procurement.write` |
| updateSupplier | `updateSupplier` | `procurement.write` |
| setSupplierStatus | `setSupplierStatus` | `procurement.manage` |
| createSupplierOffer | `createSupplierOffer` | `procurement.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-D02. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R45 — Đề nghị nhập và quy tắc

**Route:** `/s/:shopId/replenishment` · **Module:** `procurement` · **Đọc:** `procurement.read`

**Mục đích:** Quy tắc nhập lại / Nguy cơ hết hàng / Ngăn đặt trùng và vượt vốn

**Nội dung:** Reorder point/target/safety stock/rounding/approved suppliers/max commitments; versioned.
Baseline min-max; optional forecast từ lịch sử có coverage/seasonality warnings.
Kế hoạch tính confirmed inbound + open proposals separately; reserve budget cùng transaction tạo PO.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Thiếu budget cho auto_send phải block; qty không âm và đúng packSize/MOQ.
Chưa đủ lịch sử hiển thị static rule; không dự báo confidence giả.
Hai workers reorder cùng SKU tạo tối đa một active proposal; reserved budget không vượt cap.

**API đọc:** listPurchaseSuggestions, listReorderRules

| Hành động | operationId | Quyền |
|---|---|---|
| evaluateReorder | `evaluateReorder` | `procurement.write` |
| createReorderRule | `createReorderRule` | `procurement.manage` |
| updateReorderRule | `updateReorderRule` | `procurement.manage` |
| createPurchaseOrder | `createPurchaseOrder` | `procurement.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-D03, SC2-D04, SC2-D07, SC2-D06. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R46 — Đơn mua hàng

**Route:** `/s/:shopId/purchases` · **Module:** `procurement` · **Đọc:** `procurement.read`

**Mục đích:** Vòng đời đơn mua / Tự gửi đơn mua có giới hạn

**Nội dung:** draft/pending_approval/approved/sending/unknown/sent/confirmed/part_received/received/cancelled.
Mặc định draft_for_approval; automatic chỉ khi allowlist giá/số lượng/budget + approval authority còn hợp lệ.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Timeout send giữ unknown; không gửi đơn mới trước reconcile.
Approval thay giá/qty/supplier cần cấp lại; không tự thanh toán từ quyền mua.

**API đọc:** listPurchaseOrders, getPurchaseOrder

| Hành động | operationId | Quyền |
|---|---|---|
| createPurchaseOrder | `createPurchaseOrder` | `procurement.write` |
| requestPurchaseApproval | `requestPurchaseApproval` | `procurement.write` |
| sendPurchaseOrder | `sendPurchaseOrder` | `procurement.send` |
| confirmPurchaseOrder | `confirmPurchaseOrder` | `procurement.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-D05, SC2-D06. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R47 — Nhận hàng và đối chiếu

**Route:** `/s/:shopId/receipts` · **Module:** `procurement` · **Đọc:** `procurement.read`

**Mục đích:** Tồn theo trạng thái và SKU / Nhận và đối chiếu hàng

**Nội dung:** Sellable, reserved, in_transit_to_customer, quarantined, inbound_confirmed; warehouse scoped.
GoodsReceipt line qty accepted/rejected; over-delivery policy; link PO/invoice; AP.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Hàng đang về/hỏng không có trong available; tổng projection khớp movement ledger.
Nhận một phần đúng tồn và công nợ; replay receipt không double stock; rejects không sellable.

**API đọc:** listGoodsReceipts, getGoodsReceipt

| Hành động | operationId | Quyền |
|---|---|---|
| createGoodsReceipt | `createGoodsReceipt` | `procurement.write` |
| postGoodsReceipt | `postGoodsReceipt` | `procurement.receive` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-D01, SC2-D08. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R48 — Chứng từ và sổ kép

**Route:** `/s/:shopId/finance/journals` · **Module:** `finance` · **Đọc:** `finance.read`

**Mục đích:** Chứng từ và sổ kép / Giá vốn và lợi nhuận / Chi phí và phân bổ

**Nội dung:** Journal header/lines, debit/credit exact Decimal, source uniqueness, posted immutable.
Moving weighted average baseline có policyVersion; cost snapshot tại dispatch; recognize revenue theo approved transfer rule.
Quảng cáo/AI/carrier/packaging/fees; actual/estimated separate; không double expense.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Không post journal mất cân bằng; source trùng không ghi lặp; reversed phải reason.
Không lấy toàn purchase cost vào P&L; không giả định dispatch = delivered; policy chưa duyệt chặn live post.
Phí COD đã khấu trừ không hạch toán thêm lần thứ hai; nhãn estimate không đổi thành actual.

**API đọc:** listJournals, getJournal

| Hành động | operationId | Quyền |
|---|---|---|
| createJournal | `createJournal` | `finance.post` |
| postJournal | `postJournal` | `finance.post` |
| reverseJournal | `reverseJournal` | `finance.post` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-E01, SC2-E02, SC2-E03. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R49 — Đối soát ngân hàng và COD

**Route:** `/s/:shopId/finance/reconciliation` · **Module:** `finance` · **Đọc:** `finance.read`

**Mục đích:** Đối soát ngân hàng / Đối soát COD

**Nội dung:** Import deterministic mapping, dedupe externalTxnId/account; match suggestions need review.
Delivered COD receivable; carrier collection/fees/remittance; pending mismatch queue.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Ảnh chuyển khoản chỉ evidence chờ kiểm; unmatched/partial/duplicate visible; offline không post.
Khách trả carrier khác shop received cash; net remittance + fees cân bằng gross clearing.

**API đọc:** listReconciliationCases, listBankTransactions, listCODSettlements, listStatementFormats

| Hành động | operationId | Quyền |
|---|---|---|
| importBankStatement | `importBankStatement` | `finance.reconcile` |
| importCODStatement | `importCODStatement` | `finance.reconcile` |
| matchSettlement | `matchSettlement` | `finance.reconcile` |
| matchCODSettlement | `matchCODSettlement` | `finance.reconcile` |
| Xem trước sao kê | `previewStatementImport` | `finance.reconcile` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-E04, SC2-E05. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R50 — Công nợ và khóa kỳ

**Route:** `/s/:shopId/finance/debts-periods` · **Module:** `finance` · **Đọc:** `finance.read`

**Mục đích:** Công nợ / Khóa kỳ và điều chỉnh

**Nội dung:** AP/AR, deposits, dueAt, aging buckets, dispute holds; base currency locked per shop.
Period close prerequisite unresolved count, role + approval, reopen/reversal audit.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Không cộng khác currency chưa FX policy; deposit không bị coi revenue sai kỳ.
Backdated post vào locked period bị chặn; export không thay dữ liệu nguồn.

**API đọc:** listDebtItems, listAccountingPeriods

| Hành động | operationId | Quyền |
|---|---|---|
| closeAccountingPeriod | `closeAccountingPeriod` | `finance.close` |
| reopenAccountingPeriod | `reopenAccountingPeriod` | `finance.close` |
| Tạo kỳ kế toán | `createAccountingPeriod` | `finance.close` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-E06, SC2-E07. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R51 — Bốn vai trò AI và quyền

**Route:** `/s/:shopId/bot/team` · **Module:** `bot` · **Đọc:** `bot.read`

**Mục đích:** Bốn vai trò AI / Kill switch / Chi phí và failover

**Nội dung:** Role capabilities, tools, scopes, budget, version, human accountable owner; one orchestration substrate.
Shop/role/conversation generations; check immediately before side effect; cancel pending.
Token/channel budgets and procurement budgets separate; approved fallback providers only.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Không xem bốn cards là bốn process; bot role không có members.manage hoặc payment transfer.
Stop cannot unsend accepted message; UI shows accepted/unknown boundary honestly.
No silent PII transfer to unapproved model; exhausted budget moves to safe handoff.

**API đọc:** listAgentRoles, listBudgetPolicies

| Hành động | operationId | Quyền |
|---|---|---|
| updateAgentRole | `updateAgentRole` | `bot.configure` |
| controlAutomation | `controlAutomation` | `bot.pause` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-F01, SC2-H02, SC2-H03. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R52 — Bản tin và sức khỏe hệ thống

**Route:** `/s/:shopId/operations/digests` · **Module:** `operations` · **Đọc:** `operations.read`

**Mục đích:** Bản tin chủ shop / Trạng thái hệ thống / Đánh giá chất lượng / Worker phía máy chủ / Chống trùng và phục hồi / Khôi phục và readiness

**Nội dung:** Scheduled durable job per shop timezone; summarize pending/blocked/completed with links.
Provider/channel/worker heartbeat/lag/budget/failed/unknown; degraded runbook link.
Ground-truth eval datasets, failed cases, response time, cost, human corrections.
Durable outbox + command log + queue consumers; health/progress in UI.
Command idempotency/body hash, transaction/outbox, retries bounded, unknown reconciliation.
Restore rehearsal, stale check expiry, deploy gates, last verified environment/revision.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Thiếu giờ/recipient thì chưa bật; gửi lại bản tin cùng kỳ không trùng.
No green healthy when last check too old; unknown distinct down.
Không tự nhận confidence từ model là accuracy; version linkage and sample counts visible.
Close browser and restart worker preserves due work; queue loss rebuild from DB.
Crash after external accept before local save not blindly retried; poison jobs isolated.
Backup exists not restore proof; missing mandatory criterion cannot greenlight launch.

**API đọc:** listDigests, getOperationsSummary

| Hành động | operationId | Quyền |
|---|---|---|
| controlAutomation | `controlAutomation` | `bot.pause` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-F06, SC2-F07, SC2-F08, SC2-H01, SC2-H04, SC2-H08. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R53 — Thông tin hỗ trợ marketing

**Route:** `/s/:shopId/reports/marketing` · **Module:** `reports` · **Đọc:** `reports.read`

**Mục đích:** Thông tin marketing cho chủ shop / Hiệu quả chiến dịch

**Nội dung:** Frequently asked, lost-sale reasons, demand vs stock and content ideas, evidence links.
Spend import with source IDs, promo results, known/estimated attribution split.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Report missing attribution separately; no auto publish ads/content.
Không tự tăng ad spend; không ghi estimate thành actual finance expense.

**API đọc:** getMarketingSummary

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-G07, SC2-G08. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R54 — Yêu cầu sau bán

**Route:** `/s/:shopId/service-cases` · **Module:** `customers` · **Đọc:** `customers.read`

**Mục đích:** Chăm sóc sau mua / Hồ sơ khách liên kết

**Nội dung:** Tra shipment/order theo khách xác thực; tiếp nhận yêu cầu đổi/trả và tạo case.
Page-scoped customer identity, contact verification, case/order/conversation linkage.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Không gửi đơn khách khác; không hứa hoàn tiền hoặc xác nhận hoàn tiền thật.
Không tự merge cùng tên/số bị che; scope mismatch denied.

**API đọc:** listServiceCases, getServiceCase

| Hành động | operationId | Quyền |
|---|---|---|
| createServiceCase | `createServiceCase` | `customers.write` |
| setServiceCaseStatus | `setServiceCaseStatus` | `customers.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-B06, SC2-G04. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R55 — Quản trị kho

**Route:** `/s/:shopId/settings/warehouses` · **Module:** `inventory` · **Đọc:** `inventory.read`

**Mục đích:** Quản trị kho có lịch sử và phiên bản.

**Nội dung:** Danh sách có phân trang, tìm kiếm, trạng thái; editor dùng baseline và đối chiếu xung đột.

**Hành vi:** Archive có version/reason; không hard-delete, giữ command recovery và quyền hiện hành.

**Trường hợp cần xử lý:** Cross-shop, redaction, stale version lần hai, tham chiếu đã dùng và outcome unknown.

**API đọc:** listWarehouses, getWarehouse

| Hành động | operationId | Quyền |
|---|---|---|
| Tạo mới | `createWarehouse` | `warehouses.manage` |
| Lưu thay đổi | `updateWarehouse` | `warehouses.manage` |
| Ngừng dùng | `archiveWarehouse` | `warehouses.manage` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-D01, SC2-C05-WAREHOUSE. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R56 — Tài khoản kế toán

**Route:** `/s/:shopId/finance/accounts` · **Module:** `finance` · **Đọc:** `finance.read`

**Mục đích:** Tài khoản kế toán có lịch sử và phiên bản.

**Nội dung:** Danh sách có phân trang, tìm kiếm, trạng thái; editor dùng baseline và đối chiếu xung đột.

**Hành vi:** Archive có version/reason; không hard-delete, giữ command recovery và quyền hiện hành.

**Trường hợp cần xử lý:** Cross-shop, redaction, stale version lần hai, tham chiếu đã dùng và outcome unknown.

**API đọc:** listAccounts, getAccount

| Hành động | operationId | Quyền |
|---|---|---|
| Tạo mới | `createAccount` | `finance.accounts.manage` |
| Lưu thay đổi | `updateAccount` | `finance.accounts.manage` |
| Ngừng dùng | `archiveAccount` | `finance.accounts.manage` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-E01, SC2-C05-ACCOUNT. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R57 — Mở sổ kế toán

**Route:** `/s/:shopId/finance/opening-balances` · **Module:** `finance` · **Đọc:** `finance.read`

**Mục đích:** Mở sổ kế toán theo chứng từ quản trị tổng hợp.

**Nội dung:** Snapshot, policy, trạng thái đủ dữ liệu, tổng và nguồn chứng từ.

**Hành vi:** Aggregate từ read-model, không tổng hợp trang UI; mutation version/permission/idempotency/recovery.

**Trường hợp cần xử lý:** Thiếu nguồn/mở sổ, lệch tồn, khóa kỳ, stale lần hai, duplicate/reversal, pagination và cross-shop.

**API đọc:** listOpeningBalances, getOpeningBalance, listAccounts, listWarehouses, listProducts

| Hành động | operationId | Quyền |
|---|---|---|
| Tạo bản nháp | `createOpeningBalance` | `finance.post` |
| Lưu bản nháp | `updateOpeningBalance` | `finance.post` |
| Ghi mở sổ | `postOpeningBalance` | `finance.post` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-E01, SC2-C06-FINANCE. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R58 — Sổ cái

**Route:** `/s/:shopId/finance/ledger` · **Module:** `finance` · **Đọc:** `finance.read`

**Mục đích:** Sổ cái theo chứng từ quản trị tổng hợp.

**Nội dung:** Snapshot, policy, trạng thái đủ dữ liệu, tổng và nguồn chứng từ.

**Hành vi:** Aggregate từ read-model, không tổng hợp trang UI; mutation version/permission/idempotency/recovery.

**Trường hợp cần xử lý:** Thiếu nguồn/mở sổ, lệch tồn, khóa kỳ, stale lần hai, duplicate/reversal, pagination và cross-shop.

**API đọc:** getLedger, getJournal, listAccounts

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-E01, SC2-C06-FINANCE. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R59 — Cân đối phát sinh

**Route:** `/s/:shopId/finance/trial-balance` · **Module:** `finance` · **Đọc:** `finance.read`

**Mục đích:** Cân đối phát sinh theo chứng từ quản trị tổng hợp.

**Nội dung:** Snapshot, policy, trạng thái đủ dữ liệu, tổng và nguồn chứng từ.

**Hành vi:** Aggregate từ read-model, không tổng hợp trang UI; mutation version/permission/idempotency/recovery.

**Trường hợp cần xử lý:** Thiếu nguồn/mở sổ, lệch tồn, khóa kỳ, stale lần hai, duplicate/reversal, pagination và cross-shop.

**API đọc:** getTrialBalance, getLedger

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-E01, SC2-C06-FINANCE. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R60 — Cân đối quản trị

**Route:** `/s/:shopId/finance/balance-sheet` · **Module:** `finance` · **Đọc:** `finance.read`

**Mục đích:** Cân đối quản trị theo chứng từ quản trị tổng hợp.

**Nội dung:** Snapshot, policy, trạng thái đủ dữ liệu, tổng và nguồn chứng từ.

**Hành vi:** Aggregate từ read-model, không tổng hợp trang UI; mutation version/permission/idempotency/recovery.

**Trường hợp cần xử lý:** Thiếu nguồn/mở sổ, lệch tồn, khóa kỳ, stale lần hai, duplicate/reversal, pagination và cross-shop.

**API đọc:** getBalanceSheet, getLedger

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-E01, SC2-C06-FINANCE. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R61 — Xác nhận quyền marketing

**Route:** `/consent/confirm` · **Module:** `workspace` · **Đọc:** `session/bootstrap`

**Mục đích:** Khách xác nhận hoặc rút lại đồng ý marketing bằng challenge một lần gắn đúng danh tính, kênh và nội dung.

**Nội dung:** Trang công khai không yêu cầu shop session; challenge ngắn hạn không chứa PII, không xuất hiện trong request URL và chỉ được đọc trong POST body.

**Hành vi:** Pending không cấp consent. Chỉ POST sau khi khách xem đúng phiên bản nội dung mới ghi consent/history; GET không làm thay đổi trạng thái.

**Trường hợp cần xử lý:** Sai/hết hạn/replay, identity đổi, nội dung đổi sau khi gửi, opt-out sau khi queue, request unknown và service message không bị chặn bởi marketing opt-out.

**API đọc:**

| Hành động | operationId | Quyền |
|---|---|---|
| Đổi link thành phiên xác nhận | `exchangeConsentChallenge` | `authenticated/context` |
| Xác nhận lựa chọn | `confirmConsentChallenge` | `authenticated/context` |

**States:** loading, empty, error, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-G05, SC2-C07-CONSENT. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.
