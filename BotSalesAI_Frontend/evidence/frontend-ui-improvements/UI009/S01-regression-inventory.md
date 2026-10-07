# UI009.C01 — Inventory bộ regression dữ liệu và composition

- Ngày: 02/10/2026 (Asia/Vientiane).
- Phạm vi: React Frontend, Playwright + synthetic MSW; không kiểm chứng Backend/staging.
- Baseline Git: HEAD `e68cb65e61c5c1aab2ae169dd8033df305df8872` cùng working tree hiện hành; source và test trước UI009 đang có thay đổi cục bộ, được giữ nguyên.
- Phương pháp: đọc test titles/fixture helpers, so khớp UI001–UI008 acceptance với source test; kiểm tra riêng assertion collection, identity, cursor/request params, role/shop scope, delay/error/retry.

## Coverage hiện có

| Trigger | Existing test evidence | Dataset/assertions hiện có | Kết quả inventory |
|---|---|---|---|
| UI001 — cursor reconciliation độc lập | [`fe015.spec.ts`](../../../tests/fe015.spec.ts), test `UI001 reconciliation cursors...` | 25 bank + 1 COD; bank page 2, COD/case contexts, dialog lookup, request cursor và transaction identity | Có regression route-specific, một case tổng hợp |
| UI002 — Inbox list/message cursor độc lập | [`fe016.spec.ts`](../../../tests/fe016.spec.ts), 6 test `UI002` | 45 conversations + 105 messages; paging, search reset, conversation switch, deep-link/refresh/Back, shop-second và cursor isolation | Có dữ liệu nhiều trang và shop identity; shop change chạy với response bình thường |
| UI003 — shop/report timezone | [`fe015.spec.ts`](../../../tests/fe015.spec.ts), 1 test `UI003` | Browser timezone ghim riêng; UTC và Asia/Vientiane theo shop; query boundaries/assertion labels | Có regression; case dùng hai timezone đã được acceptance xác nhận |
| UI004 — evaluation pagination | [`fe018.spec.ts`](../../../tests/fe018.spec.ts), 2 test `UI004` | 25 và 105 evaluations; mọi ID qua cursor; URL/detail/search/Back; cursor lỗi được giữ và retry | Có volume test và identity/cursor assertions |
| UI005 — category lookup | [`fe010.spec.ts`](../../../tests/fe010.spec.ts), 1 test `product category lookup...` | 105 categories; category cuối tạo được; selected ID ngoài page đầu được giữ khi edit/search | Có full lookup regression |
| UI006 — supplier/offer/order lookup + preview | [`ui006-lookups.spec.ts`](../../../tests/ui006-lookups.spec.ts), 3 test | 150 synthetic suppliers/offers/orders; page traversal; selected order sống qua search failure/retry; bounded preview link | Có volume, identity và retry assertions |
| UI007 — secondary query state | [`ui007-query-states.spec.ts`](../../../tests/ui007-query-states.spec.ts), 5 test | Delay, 503 retry operation, 403, success-empty, supplier/offer isolation, lazy budget permission | Có state coverage; delayed request được kiểm trong cùng customer/shop context |
| UI008 — integration empty states | [`ui008-integration-empty.spec.ts`](../../../tests/ui008-integration-empty.spec.ts), 7 test; [`route-empty-composition.spec.ts`](../../../tests/states/route-empty-composition.spec.ts) | R29/R30, permission CTA, delayed loading, 403, 503/retry; 11 actual routes trong shared empty composition | Có route-level empty regression và permission assertions |

Các trigger UI001–UI008 hiện có tổng cộng **26 test được gắn ID UI trực tiếp** trong bảy spec files. Hỗ trợ composition gồm 4 vertical-slice flows + 1 route/feature matrix trong [`fe022-flows.spec.ts`](../../../tests/vertical-slices/fe022-flows.spec.ts), 5 dirty-form/loading/shop-switch cases trong [`fe023.spec.ts`](../../../tests/states/fe023.spec.ts), route-error matrix 51 routes, role matrix 357 route-role combinations, và [`frontend.spec.ts`](../../../tests/frontend.spec.ts) có test hủy một request chung khi chuyển shop. Số test là inventory của suite hiện tại, không phải coverage percentage.

## Khoảng trống đo được và bước tiếp

`UI002` đã đổi shop nhưng chờ các request hoàn tất bình thường. `UI007` điều khiển delay của `listOrders` để kiểm pending nhưng giữ nguyên shop/customer đến khi response xong. `frontend.spec.ts` kiểm hủy một request khi chuyển shop nhưng không gắn request phụ vào hai customer identity cùng tên. Trong các test này chưa có case mở customer `c1` của `shop-demo`, để `listOrders?customerId=c1` đang delay rồi đổi sang customer cùng tên `b-c1` thuộc `shop-second`, sau đó chứng minh response cũ không xuất hiện trong hồ sơ mới. Source hiện có scope epoch, abort query khi đổi shop và query key chứa shop/user/permission; C02 cần khóa hành vi đó bằng browser regression qua API mock.

Không cần nhân bản các fixture 25/105/150 đã có hoặc gom mọi route vào một Cartesian matrix. Giữ test volume tại owner spec tương ứng; UI009 bổ sung một composition regression cho transition đang thiếu, rồi chạy suites ảnh hưởng và full built-demo checks. Không thấy evidence hiện tại cho phép coi browser race đã được kiểm chứng trước test này.
