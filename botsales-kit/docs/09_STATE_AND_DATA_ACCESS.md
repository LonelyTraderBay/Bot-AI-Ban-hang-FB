# 09 — State, cache, forms và mô hình dữ liệu UI

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.5.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## 1. Quyết định state ownership

| Loại state | Nơi giữ | Ví dụ | Không giữ ở |
|---|---|---|---|
| Server state | TanStack Query, scoped query client | product, order, permissions snapshot, jobs | store toàn cục thứ hai |
| URL state | Router search params | q, status, sort, cursor, date range | local state không share/bookmark được |
| Form state | React Hook Form + schema module | draft product, điều chỉnh kho, secret transient | query cache hoặc localStorage |
| UI transient | component/context phạm vi nhỏ | dialog open, selected tab, current row | backend database |
| Session scope | bootstrap/session context | principal, shop, permissionVersion | tin từ query string |
| Durable business workflow | backend Command/Job | import, send message, refund | useEffect hoặc browser timer |

Không chọn Redux/Zustand mặc định. Chỉ thêm nếu đã có state local dùng chéo thật mà context/query không giải quyết hợp lý; cần ADR mô tả nguồn chân lý và phạm vi. Server state vẫn chỉ có một owner [S04].

## 2. Query key và scoping

```ts
// Ví dụ minh họa quy tắc; nối với generated types trong repo thực.
const productListKey = (
  scope: { userId: string; shopId: string; permissionVersion: number },
  filters: { q: string; status: string; cursor: string | null; limit: number },
) => ['scope', scope.userId, scope.shopId, scope.permissionVersion,
       'catalog', 'products', filters] as const;
```

Include mọi biến thay đổi dữ liệu, kể cả currency/timezone/warehouse/asOf khi có. Không dùng key `['products']` chung cho mọi shop. Prefix invalidation cụ thể module/scope; không `invalidateQueries()` toàn app mỗi click. Chỉ persist UI preference không nhạy (sidebar density) có version; v1 không persist query cache PII/finance/chat.

## 3. DTO → view model

Generated DTO biểu diễn hợp đồng server; view model cục bộ chỉ thêm label/format/derived presentation. Ví dụ MoneyView `formatted` từ amount/currency, không đổi amount gốc. Unknown enum có fallback read-only. Null redacted/unknown khác 0/empty. Không cast `as Product` để che schema mismatch.

Form schema riêng cho input (trim, decimal string, required); mapper explicit tới request DTO. PATCH gửi trường thực sự đổi, không serialize toàn DTO read với read-only fields. Không sửa generated types để thỏa form. ID không parseInt; quantity limits kiểm server. Một Product view có thể kèm StockSummary response read model, nhưng không tái tạo nguồn stock trong local store.

## 4. Fetch/retry/cancellation

API wrapper chịu base URL, credentials, CSRF, requestId propagation, response parsing/problem mapping, AbortSignal, timeout và telemetry scrub. Module API chịu endpoint/query key/request/response mapping. Component không fetch/axios trực tiếp, không tự nối URL khác quy tắc.

GET có bounded retry chỉ cho network/5xx với backoff; 401/403/404/422 không retry tự động. Mutation mặc định không retry trừ cùng idempotency key và server contract có hỗ trợ. Không retry login hoặc provider-test vô hạn. Request cancellation không bảo đảm server command đã hủy; cancel transport khác cancel business operation.

## 5. Staleness và dữ liệu live

StaleTime là tuning theo module, không đảm bảo tính mới nghiệp vụ. Gợi ý baseline cho test: catalog 30 giây, kho/order 5 giây, taxonomy 5 phút; backend command vẫn revalidate bất kể cache “fresh”. UI hiển thị asOf/stale rõ cho kho/báo cáo và khi mất mạng. Không cho quote cache thay giá cuối lúc confirm.

Messages paginated, giữ scroll khi prepend lịch sử; có giới hạn số pages trong memory và virtualization chỉ khi đo cần. Stock/order refetch khi focus/stream invalidate, không poll mọi tab song song. Reports theo snapshot/asOf để export nhất quán; khi filter đổi hủy request cũ.

## 6. Mutation UX

Sửa text sản phẩm: chờ server success, invalidate đúng list/detail; version conflict giữ draft local và hiển thị diff. Rủi ro tiền/kho/publish/send: pending rõ, chưa cho status cuối cho đến server xác nhận hoặc Command complete. Không optimistic ledger/inventory/order.

Có thể optimistic preference không nhạy như mở/đóng sidebar; assignment label chỉ optimistic nếu backend/team chốt và có rollback không ảnh hưởng bot authority. Baseline assignment/handoff vẫn chờ server. Double click cùng action dùng cùng logical intent và in-flight guard.

## 7. Offline và recovery

Mất mạng: banner offline, đọc tạm dữ liệu đang ở memory với asOf; disable writes, secrets/provision/publish. Giữ form local memory trong session khi hợp lý, nhưng không gửi ngầm khi mạng trở lại. Reload có thể mất draft và phải được báo, không hứa offline support đầy đủ.

Trở lại online: refresh session/scope trước query, reconnect stream rồi refetch snapshots khi cần. Command pending được server tra lại; không tái tạo mutation từ component mount. Cleanup timers/listeners/subscriptions khi đổi scope; stress test 50 lần chuyển shop để tìm leak.


## Phạm vi nghiệp vụ kế thừa từ 2.0 (vẫn hiệu lực)
Phạm vi hiện hành gồm 64 bổ sung A01–H08 ở contracts/feature-catalog.json. Giữ CODE-001..024 và DARK-001..012; bổ sung governance backend/worker theo docs/02,21–27. Không lấy ví dụ cũ về fulfill/payment làm nghiệp vụ v2; docs/05,22,24 và OpenAPI v2 là nguồn hiện hành. Kế hoạch cũ G0–G5 đã được thay bằng execution/plan.json T001–T084.
