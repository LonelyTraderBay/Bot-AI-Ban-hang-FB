# UI007 C01 — Inventory query phụ

**Ngày:** 02/10/2026  
**Phạm vi:** React/TypeScript tại `apps/web`, route R08 hồ sơ khách và route nhập lại hàng; API tổng hợp MSW.  
**Baseline repository revision:** `e68cb65e61c5c1aab2ae169dd8033df305df8872` (các source đã có thay đổi local UI001–UI006; SHA256 dưới đây khóa chính xác nội dung baseline đang được kiểm).  
**Trạng thái C01:** PASS — phạm vi, contract, source, UI trigger và invariant kiến trúc được ghi lại. Chưa tuyên bố sửa hoặc test đạt.

## Bằng chứng source và contract

| Màn / query | Vị trí source baseline | Operation / quyền / dependency | State quan sát được trong source |
|---|---|---|---|
| Hồ sơ khách — primary | `apps/web/src/modules/customers/index.tsx:34` (`getCustomer`) | `getCustomer(customerId)`; sở hữu hồ sơ và form draft | Bọc `QueryState`; nội dung chính có thể thành công độc lập |
| Đơn hàng gần đây — secondary | `apps/web/src/modules/customers/index.tsx:37,59` | `listOrders(customerId, limit:10)`, enabled theo `orders.read` | Render rows khi có data; khi rỗng dùng chung câu “Chưa có đơn hoặc chưa đủ quyền”; chưa phân biệt loading, 403, 5xx và 200/data=[]; chưa có retry/link collection |
| Vận đơn — secondary phụ thuộc | `apps/web/src/modules/customers/index.tsx:38,59` | `listShipments(limit:100)`, enabled khi có `fulfillment.read` **và** `orders.read`; đối chiếu IDs từ query đơn | Đã có `QueryState`, permission explanation, giới hạn 10 orders/100 shipments và route danh sách shipment. Khi orders lỗi, shipment không được dùng để suy luận empty |
| Yêu cầu hỗ trợ — secondary | `apps/web/src/modules/customers/index.tsx:39,60` | `listServiceCases(limit:10)`, lọc cục bộ vì contract chưa hỗ trợ `customerId` | Đã có `QueryState`, thông báo giới hạn và route đầy đủ; không thêm query filter giả |
| Gợi ý nhập — primary | `apps/web/src/modules/procurement/index.tsx:93,112–139` | `listPurchaseSuggestions(limit:20,cursor)`; sở hữu hàng và action lập đơn | `QueryState` độc lập; giữ bảng gợi ý khi lookup phụ lỗi |
| Supplier offers — secondary lookup | `apps/web/src/modules/procurement/index.tsx:95,103–105,112–129` | `listSupplierOffers` qua `usePagedApi`; eligibility của từng gợi ý phụ thuộc danh sách và selected offer | Khi lỗi, gộp chung lỗi suppliers; một nút retry ưu tiên offers; lookup pending/empty có thể hiển thị “Không tìm thấy báo giá” quá sớm; action lập đơn disabled nếu không xác minh được offer |
| Suppliers — secondary lookup | `apps/web/src/modules/procurement/index.tsx:96,103–108,112–129` | `listSuppliers` qua `usePagedApi`; supplier phải được phê duyệt để xác minh/ra action | Lỗi bị gộp với offers; không có retry riêng cho supplier nếu cả hai lỗi; pending có thể hiển thị ID/“không tìm thấy”; mutation vẫn disabled khi chưa xác minh |
| Selected offer/supplier hydration — conditional secondary | `apps/web/src/modules/procurement/index.tsx:105–109,140–154` | `getSupplierOffer(resourceId)` và `getSupplier(resourceId)` chỉ cần khi ID đã chọn chưa có trong các page đã tải | Query detail hiện chạy cả khi record đã hiện diện trong list; lỗi bị nhập vào một `ErrorNotice` chung với create/update; chưa có retry riêng; selected identity cần tiếp tục sống khi record ngoài page hoặc list lỗi |
| Approved procurement budget — conditional secondary | `apps/web/src/modules/procurement/index.tsx:97,110–113,140–154` | `listBudgetPolicies`, chỉ cần cho `mode=auto_send`, permission `operations.read` | Query chạy dù dialog/mode chưa cần; missing/403/error/empty chỉ làm dropdown trống; `budget` cũ có thể còn trong state và chưa xác minh lại từ query hiện tại |

Nguồn chuẩn `botsales-kit/contracts/openapi.json`: `listOrders` có permission `orders.read` và parameters `Limit`, `Cursor`, `Query`, `StatusFilter`, `Sort`, `CustomerFilter` (quanh dòng 4587); `listSuppliers` và `listSupplierOffers` là operations độc lập (quanh dòng 19608 và 20206). Route R08 trong `botsales-kit/contracts/route-manifest.json` lấy `getCustomer` làm primary read và yêu cầu link orders scoped; không cấp quyền tạo API/filter khác. Không sửa OpenAPI, route manifest hoặc generated files.

## Tái hiện nguồn

1. Mở một hồ sơ khách có thể đọc được: `getCustomer` và `listOrders` chạy độc lập. `getCustomer=200`, `listOrders=503` hoặc `403` làm panel hiển thị cùng lúc lỗi thật ở network và trạng thái empty-like “Chưa có đơn hoặc chưa đủ quyền”; primary form vẫn có thể hiện.
2. Với customer ID hợp lệ nhưng không có order, `listOrders=200` trả danh sách rỗng và hiện đúng cùng một câu; người dùng không thể phân biệt empty success với thiếu quyền/lỗi.
3. Trên route nhập lại hàng, `listPurchaseSuggestions` là primary; `listSupplierOffers`/`listSuppliers` là lookup phụ. Cả hai lỗi cùng lúc chỉ hiện `offers.error || suppliers.error`, nút retry chỉ chọn offers trước. Gợi ý vẫn hiển thị, nhưng supplier/offer resolution không cho biết lookup còn loading hay lỗi ở từng operation.
4. Dialog quy tắc có hai detail hydration query cho selected offer/supplier; hiện chúng chạy dù list đã tải ID đó và lỗi nhập chung với command errors. `listBudgetPolicies` chạy trước khi chọn auto-send; 403, 5xx, empty, disabled permission và stale budget ID không có state riêng.
5. Quyền FE: `useApi` key gắn user/shop/permissionVersion/op/params; `usePagedApi` giữ cursor per lookup; các mutation cần offer/supplier/budget hợp lệ mới cho submit. Sửa phải giữ các ranh giới này và lỗi query phụ không được xóa gợi ý/form.

## Fingerprints baseline

SHA256 trước UI007 source edits:

```text
CF320DFFE8B6D39016DE1D8C40B1F5CBA8E598595901C91EAE4BD0B56714B72D  apps/web/src/modules/customers/index.tsx
EDFE2BC52141730D87CC5176C984090EE7F4CAB1C9C69E7A5E9277EA04A52A99  apps/web/src/modules/procurement/index.tsx
110D98CDDA975C3D98D2BE0A89A66EE8AB76AC260A06DDDC82AD38933D191B2C  apps/web/src/shared/ui/components.tsx
1F9D50AFE6C083193EB934D672DA49B7BDAD1095929CB58C122DDA7674FDF450  apps/web/src/mocks/service.ts
D88A70957A9DE36402FF5AC0CB757A2F1C496519C7E1FD2E28DF17E867F78C7C  botsales-kit/contracts/openapi.json
360871C008FAC723CFC77DEC79417838D24D4FAE844452909EB347EC8893F2B2  botsales-kit/contracts/route-manifest.json
5E5A60D0645FDE99C0BE179043A500FA7058DA196E1851AA889BA290EA174CE9  tests/fe009.spec.ts
```

## Kết quả dự kiến

- Hồ sơ khách tách được quyền thiếu, loading, 403, fetch error/retry và thành công rỗng; lỗi đơn không che hồ sơ chính; preview ghi tối đa 10 đơn và có link tới collection thật.
- Supplier và offer có status/retry riêng, không báo “không tìm thấy” trong lúc chờ hoặc khi query lỗi; primary suggestion và draft giữ nguyên; action lập đơn không chạy khi supplier/offer chưa xác minh.
- Selected offer/supplier detail chỉ fetch khi ID không có trong collection đã tải; lỗi detail có retry đúng query. Ngân sách chỉ fetch khi dialog mở ở chế độ auto-send; trạng thái quyền/loading/error/empty tách riêng và submit yêu cầu budget còn được query xác minh.
- Chỉ fault injection theo `listOrders`, `listSupplierOffers`, `listSuppliers`; test ghi request/response cho từng operation. Mọi kết luận chỉ áp dụng cho React Frontend + synthetic MSW.
