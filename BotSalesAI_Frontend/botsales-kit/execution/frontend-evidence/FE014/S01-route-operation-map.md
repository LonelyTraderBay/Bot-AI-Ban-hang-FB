# FE014 — Route, operation và state map

Phạm vi là các route R44–R47 trong React/TypeScript và API giả lập tổng hợp. Không đổi OpenAPI, route manifest hoặc policy mua hàng; không gọi nhà cung cấp thật, gửi email/Telegram hay thanh toán.

| Route | Đọc theo manifest | Ghi theo manifest | Chủ sở hữu UI |
|---|---|---|---|
| R44 `/s/:shopId/suppliers` | `listSuppliers`, `getSupplier`, `listSupplierOffers` · `procurement.read` | `createSupplier`, `updateSupplier`, `createSupplierOffer` · `procurement.write`; `setSupplierStatus` · `procurement.manage` | `apps/web/src/modules/procurement/index.tsx` |
| R45 `/s/:shopId/replenishment` | `listPurchaseSuggestions`, `listReorderRules` · `procurement.read` | `evaluateReorder` · `procurement.write`; `createReorderRule`, `updateReorderRule` · `procurement.manage`; `createPurchaseOrder` · `procurement.write` | cùng module |
| R46 `/s/:shopId/purchases` | `listPurchaseOrders`, `getPurchaseOrder` · `procurement.read` | `createPurchaseOrder`, `requestPurchaseApproval`, `confirmPurchaseOrder` · `procurement.write`; `sendPurchaseOrder` · `procurement.send` | cùng module |
| R47 `/s/:shopId/receipts` | `listGoodsReceipts`, `getGoodsReceipt` · `procurement.read` | `createGoodsReceipt` · `procurement.write`; `postGoodsReceipt` · `procurement.receive` | cùng module |

## Phát hiện và quyết định triển khai

- Supplier/Purchase/Receipt/Rule/Suggestion operations, DTO và state lấy từ `contracts/openapi.json` và `route-manifest.json`. PO cần gửi nhiều `PurchaseCreate.lines`; mỗi dòng phải chọn báo giá của cùng supplier và số nguyên thỏa MOQ/bội số packSize. Tổng tiền hiển thị sau khi API trả PurchaseOrder, không tính thay server.
- UI ban đầu chỉ lập PO một dòng và ghi phiếu nhận theo version lấy từ list; route không gọi `getGoodsReceipt`. Sửa form PO thành nhiều dòng và nạp PO/Receipt detail mới trước khi ghi.
- Reorder mock ban đầu cộng inbound/proposals theo SKU mà không giới hạn warehouse. Sửa projection theo đúng warehouse + SKU; pending draft chỉ hiển thị riêng, không cộng thành hàng đã xác nhận về.
- Approval gắn `expectedVersion` và `intentHash`; gửi đơn dùng quyền `procurement.send`. Quyền mua/gửi không tạo quyền thanh toán. Nguồn hiện không có operation sửa báo giá hoặc sửa PO; do đó không giả lập UI đổi giá/qty sau approval. Kiểm conflict/approval hash qua contract mock và giữ gap công khai.
- Nếu kết quả gửi trả unknown, cảnh báo lệnh chưa xác minh vẫn được giữ trong session memory; hộp xác nhận đóng ngay, lỗi được giữ trong chi tiết PO và hành động gửi bị ẩn đến khi CommandRecovery xác nhận lệnh đã kết thúc. Đây chỉ là quy tắc retry ở client/demo, backend thật vẫn phải bảo đảm idempotency và reconciliation.
- Mẫu forecast dùng ngưỡng min-max; không có coverage/forecast confidence tổng hợp. Dữ liệu budget fixture hiện chưa bật policy procurement, nên auto-send bị chặn và phải được kiểm bằng test.
- Mock chỉ nhận `auto_send` khi `budgetPolicyId` trỏ tới policy thuộc shop hiện tại, có `kind=procurement`, đang bật và có hạn mức; ID thiếu, sai shop, sai loại hoặc policy tắt đều bị từ chối. UI test xác nhận policy procurement duy nhất trong fixture đang tắt và không cho lưu rule auto-send.
- Nhận hàng dùng chứng từ duy nhất, line-level accepted/rejected và version mới; chỉ lượng đạt tăng tồn/tạo AP trong simulator. Đây là mô phỏng frontend, không chứng minh transaction hoặc chống race của production database.

## Bằng chứng dự kiến

`tests/fe014-source-map.test.mjs` kiểm route/operation/permission/DTO/source-owner; `tests/domain-scenarios.cjs` kiểm chéo-shop, supplier chưa duyệt, ngân sách, approval stale và receipt replay trong simulator; `tests/fe014.spec.ts` kiểm nhiều dòng, approval/send, conflict/unknown, partial receipt, budget/role và responsive/axe trên React demo + synthetic MSW.
