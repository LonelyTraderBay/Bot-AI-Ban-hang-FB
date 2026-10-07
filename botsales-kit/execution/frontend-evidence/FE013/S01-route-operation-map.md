# FE013 — Route, operation và state map

Phạm vi chỉ gồm React/TypeScript trong `apps/web`, hai route chuẩn R41/R42 và mock API tổng hợp. Không đổi OpenAPI, quyền hoặc route manifest.

| Route | Quyền đọc | Reads | Action | Quyền ghi | UI owner |
|---|---|---|---|---|---|
| R41 `/s/:shopId/fulfillment` | `fulfillment.read` | `listPrepJobs`, `getPrepJob`; phiếu công việc lấy `getWorkItem` | nhận việc `claimWorkItem`; lấy hàng `pickPrepLine`; đóng gói `packPrepJob` | `operations.claim`; `fulfillment.write` | `apps/web/src/modules/fulfillment/index.tsx` |
| R42 `/s/:shopId/shipments` | `fulfillment.read` | `listShipments`, `getShipment`; order picker `listOrders` | tạo `createShipment`; bàn giao `handoverShipment`; ghi sự kiện `recordShipmentEvent` | `fulfillment.write`; `fulfillment.handover` | cùng module fulfillment |

`getWorkItem` và `claimWorkItem` là operation dùng chung của work-item, có quyền `operations.read` / `operations.claim`, không phải endpoint mới của R41. Claim chỉ hiển thị theo permission và `WorkItem.allowedActions`. Pick gửi `expectedVersion`, `orderLineId`, SKU quét, số lượng nguyên và lý do issue theo `PickLineRequest`; pack chỉ mở khi đủ từng dòng và không còn issue.

Tạo vận đơn chỉ cho đơn đã đóng gói, gửi đầy đủ `orderId`, `warehouseId`, `carrierId` nullable tường minh và `orderLineIds`. Mọi hành động bàn giao/ghi sự kiện mở detail `getShipment` để dùng version mới. Bàn giao trả command 202 và chỉ đổi shipment/order sang `handed_over`/`dispatched`; sự kiện `delivered` cần `externalEventId`, thời gian ISO và mã evidence riêng. COD vẫn ở trạng thái chưa thu tới khi operation tài chính xác nhận.

Mock test dùng state trong bộ nhớ. Full page/tab mới khởi tạo lại fixture; test giữ luồng trong SPA hoặc chỉ dùng fault controls được gắn nhãn demo. Không có carrier adapter, báo giá cước hay xác nhận COD ngoài phạm vi contract này. Return/refund vẫn ở order/return/finance API: FE013 điều hướng về order và không tự tạo return/refund endpoint.
