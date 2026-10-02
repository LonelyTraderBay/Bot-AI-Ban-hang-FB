# FE011 — Route, operation, permission và gap map

Phạm vi nghiệm thu: `FRONTEND_WITH_SYNTHETIC_MOCK_API`. Đây là frontend React thật trong `apps/web`; không dựa vào prototype HTML hoặc backend đang chạy.

| Route | Đọc | Quyền đọc | Hành động | Quyền hành động | UI / kiểm soát |
|---|---|---|---|---|---|
| R15 `/s/:shopId/inventory` | `listStockSnapshots`, `getShop` | `inventory.read` | `createInventoryAdjustment` | `inventory.adjust` | `InventoryPage`; `getShop` được nạp trong `Shell` theo shop + membership version; API trả `onHand`, `reserved`, `available`, `asOf`; cost chỉ hiện khi có `finance.read`. |
| R16 `/s/:shopId/inventory/movements` | `listStockMovements` | `inventory.read` | Read-only | — | `MovementsPage`; lọc cursor/search theo URL; order link chỉ hiện khi có `orders.read`. |

Điều chỉnh dùng DTO `InventoryAdjustment` trong OpenAPI: `variantId`, `warehouseId`, `quantityDelta` số nguyên khác 0, `reason`, `expectedVersion`, `unitCost` là Money hoặc `null`. Request là `POST /shops/{shopId}/inventory/adjustments`, yêu cầu CSRF + idempotency và trả HTTP 202 `CommandResponse`; shared `useCommand` đợi trạng thái cuối, invalidate snapshot/movement sau xác nhận, đồng thời khóa gửi lại nếu kết quả chưa rõ. Không suy diễn tồn mới ở client.

Gap quan sát được trước khi hoàn tất FE011: màn hình tồn chưa trình bày `asOf` và chưa có lọc kho; link từ SKU sang catalog chưa có; lịch sử chưa trình bày actor, kho hoặc link order có kiểm quyền; điều chỉnh chưa validate giới hạn integer/decimal ở form. Các điểm này đã được đưa vào implementation và được browser regression kiểm lại.

Mock kiểm `shopId`, membership, permission, CSRF, idempotency, version, lượng khả dụng và schema response; inventory data chỉ nằm trong phiên demo. Unknown command giữ cảnh báo dùng chung, không được coi là thành công hay retry tự động.
