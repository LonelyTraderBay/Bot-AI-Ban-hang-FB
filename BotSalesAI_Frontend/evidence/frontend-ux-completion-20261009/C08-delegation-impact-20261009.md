# C08 — đánh giá tác động trước khi sửa

Ngày ghi nhận: 2026-10-09. Baseline Git: `53c0ba8f413b1f1e0fa16a747ed27f728b861dd6`.

## Bằng chứng hiện trạng

- Canonical API đang ở `2.3.0`, 61 routes; R38 là approvals, R45 là nhập lại, R46 là đơn mua. Không có schema/operation cho delegation hoặc reservation theo purchase-send.
- `ApprovalsPage` có panel “Xem thử ủy quyền” giữ hoàn toàn trong React state; không gọi API, không tạo quyền. UI ghi rõ contract chưa có.
- `ReorderRule.mode=auto_send` chỉ đòi `budgetPolicyId`; mock kiểm tra policy `kind=procurement`, `enabled` và có hạn mức. Chưa ràng buộc agent, người chịu trách nhiệm, supplier/warehouse allowlist, hạn mức mỗi đơn, grant version hoặc expiry.
- `evaluateReorder` hiện chỉ cập nhật `PurchaseSuggestion`; nó không lập/gửi purchase order. Gửi hiện hữu yêu cầu `Approval` từng đơn và `sendPurchaseOrder`.
- Mock service tuần tự hóa mutations và cache idempotency theo user/shop/operation/key cùng hash request body; fault `unknown` có thể xảy ra sau khi mock đã đổi trạng thái. C08 phải giữ reservation/generation và chặn lệnh khác key, không coi unknown là lần gửi thất bại có thể lặp.
- Các `BudgetPolicy` procurement trong seed hiện disabled. Approval fixture “còn hiệu lực” đang gắn budget policy khác loại, nên không thể dùng làm phê duyệt ngân sách mua hàng. Các `AgentRole` mẫu hiện paused. Đây là dữ liệu tổng hợp, không phải agent/provider đang chạy.
- Các tệp mục tiêu C08 đã có thay đổi trước khi bắt đầu nhóm này: `openapi.json`, permission/feature/route catalog, acceptance scenarios, `procurement.ts`, `collections.json`, `seed.json`, `operations/index.tsx`, `procurement/index.tsx`, `navigation.ts` và `fe014.spec.ts`. Hashes trước C08 được lưu ở [`C08-before-source-20261009.json`](C08-before-source-20261009.json); không xóa hoặc hoàn nguyên diff sẵn có.

## Phạm vi dự kiến theo quyết định đã duyệt

1. Thêm grant chỉ cho `purchase.send`, do quyền owner riêng quản lý. Grant mặc định paused và giữ agent, owner, supplier, warehouse/variant scope, hạn mức mỗi đơn, procurement budget policy + period, agent generation và thời hạn.
2. Ghi từng reservation theo policy + period + purchase intent để tổng reserved/consumed dùng chung giữa grants; mutation mock tuần tự hóa tạo điểm commit nguyên tử. Không tính tổng từ trang đang xem.
3. Chỉ tự gửi purchase order từ reorder intent đã kiểm supplier/offer/MOQ/pack size, currency, giá, lượng, version, budget, grant, agent generation và expiry. Thay đổi intent/policy phải bị chặn để xét duyệt lại.
4. Pause/revoke tăng generation và ngăn tác động chưa được tiếp nhận. Accepted/unknown giữ reservation; cùng key trả kết quả cũ, key khác không thể gửi trùng. Không có chuyển tiền hoặc lời khẳng định đã gửi tới supplier thật.
5. Dùng R38 để quản grant và R45/R46 cho rule/đơn mua; không tạo route mới hoặc dependency. Reorder `auto_send` không được bật nếu thiếu grant active phù hợp.

## Ranh giới kiểm chứng

Tất cả hành vi là React + canonical OpenAPI + synthetic MSW local. Không có Backend/provider thật, durable worker/outbox, ngân hàng hoặc supplier API. C08 chỉ chuyển sang `VERIFIED_SCOPED` khi các regression xác nhận concurrency budget, revoke/expiry, version/intent drift, idempotency/unknown và permission/cross-shop; full application/browser gates vẫn thuộc C11.
