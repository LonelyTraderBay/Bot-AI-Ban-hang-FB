# UX.C08 — Delegation `purchase.send` có hạn mức

Ngày kiểm chứng: 2026-10-09  
Trạng thái: **VERIFIED_SCOPED**  
Scope: React + canonical OpenAPI + MSW tổng hợp local. Không chứng minh Backend, agent/worker/provider thật, gửi nhà cung cấp hoặc thanh toán thật.

## Hành vi đã hoàn tất

- Owner-only grant cho đúng `purchase.send`; grant mới luôn ở trạng thái tạm dừng và lưu snapshot agent generation, người chịu trách nhiệm, supplier, warehouse, offer version/giá/MOQ/quy cách, ngân sách/version/kỳ, hạn mức từng đơn và thời hạn.
- Kích hoạt kiểm tra lại agent owner/kind/generation/status, supplier/kho, snapshot offer, policy approval/version/kỳ, tiền tệ và thời hạn. Pause/revoke tăng generation; grant đã thu hồi không kích hoạt lại.
- Reorder `auto_send` yêu cầu grant phù hợp. Mock tuần tự hóa mutation, tính ngân sách từ reservation ledger theo shop timezone, chặn vượt hạn mức/candidate trùng, và giữ reservation ở `unknown` để không gửi lại mù.
- Unknown sau khi server nhận lệnh giữ command ID, đơn mua và reservation để đối chiếu; không diễn giải UI cancellation thành rollback server.
- UI R38 tạo grant tạm dừng, hiển thị phạm vi và history, yêu cầu lý do khi kích hoạt/tạm dừng/thu hồi. UI ghi rõ dữ liệu chỉ là MSW local.
- Invalidation theo grant/reservation/suggestion/purchase được thu hẹp theo resource; API event enum và permission enum đồng bộ với catalog.

## Kết quả kiểm chứng trên source đã fingerprint

| Kiểm tra | Kết quả | Bằng chứng |
|---|---:|---|
| Unit: delegation + event invalidation | 25/25, exit 0 | [log](C08-unit-current-20261009.log) |
| Browser: procurement role/authorization/replenishment | 6/6, Chromium 3/3 + Firefox 3/3, exit 0 | [log](C08-browser-current-20261009.log) |
| TypeScript | PASS, exit 0 | [log](C08-typecheck-current-20261009.log) |
| ESLint các owner/source/test chịu ảnh hưởng | PASS, exit 0 | [log](C08-lint-current-20261009.log) |
| Source/operation/route mapping | PASS: 84 files, 259 operation calls, 61 routes, 0 issues | [log](C08-source-check-current-20261009.log) |
| Contract generation check | PASS: 15 outputs, 340 schemas, 245 operations, 61 routes | [log](C08-generate-check-current-20261009.log) |
| Canonical contract validator | PASS: 340 schemas, JSON/YAML tương đương, path parameters hợp lệ | [log](../../../botsales-kit/evidence/C08-contract-validation-current-20261009.log) |
| Kit static validator | PASS: 532/532, 56 permissions, 245 operations, 340 schemas | [log](../../../botsales-kit/evidence/C08-kit-validation-current-20261009.log) |
| `git diff --check` | exit 0; còn cảnh báo chuyển LF→CRLF trên working tree dirty | [log](C08-diff-check-current-20261009.log) |

Browser regression đi qua R51 tiếp tục vai trò mua hàng, điều hướng SPA tới R38, tạo grant cho `offer-p1` và `budget-2`, kiểm tra request/idempotency/snapshot, rồi kích hoạt bằng lý do. Ca thứ hai xác nhận `auto_send` bị chặn khi chưa có grant active phù hợp. Dữ liệu được reset khi tải lại demo như thông báo UI; test giữ SPA state trong cùng phiên.

## Fingerprint và giới hạn

Source fingerprint gồm 26 file code, contract, generated API, test và reference: [manifest](C08-current-source-20261009.json), SHA-256 tổng `35883d2ce002f05ec2b40ff457c2d77f63209d669ddb0407abe7a7bc09846ea0`. Baseline trước C08 và trạng thái dirty ban đầu: [before-source](C08-before-source-20261009.json), [impact](C08-delegation-impact-20261009.md). Không sửa hoặc xóa thay đổi có sẵn.

C08 chỉ đóng phạm vi có regression scoped. Full `verify`, built-demo review, full Chromium/Firefox suite, route/state/role coverage cuối, FE dependency freshness và bàn giao READY thuộc C11. Mẫu số FE vẫn 140; không cập nhật full-product tracker.
