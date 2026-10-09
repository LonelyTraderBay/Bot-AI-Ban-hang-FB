# Sửa tận gốc WIDTH.W01–W04 — 08/10/2026

**READY_FOR_ACCEPTANCE_LOCAL_SCOPE.** Bốn finding và mọi lỗi cùng pattern đã xác nhận trong scope được sửa tại owner, đã kiểm lại trên source cuối. Thứ tự/trạng thái duy nhất ở [UI plan §16.6](../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status).

## Nguyên nhân và sửa theo ưu tiên

| Ưu tiên | Finding | Sửa tại owner |
|---|---|---|
| P1 | W01: collection một thẻ bị cố định hai track | AI/Workspaces chọn số cột theo dữ liệu0/1/2+; Empty có một CTA; giữ các grid phân vai và pane có chức năng riêng. |
| P2 | W02: full Panel chứa form bị cap760/850 | Gỡ cap Imports/Shop/Shipping; FieldGroup responsive giữ trường liên quan theo cặp, cùng DOM order và hành vi form. |
| P2 | W03: notice chung auto-place trong một ô grid | PageSections giữ grid và notice thành siblings; section gap24 thuộc parent. |
| P2 | W04: DetailLine Fragment trả hai children, parent gap cộng quanh divider | Một Box bao row+divider, không thêm inset; caption/value wrap; gap chỉ giữa logical rows. |

Đã rà15 SectionGrid placements và98 DetailLine calls trong13 module, toàn bộ16 modules/54 routes. [Contract trước sửa](CONTRACT.md), [baseline](baseline.json), [quyết định cho vị trí tương tự](ANALOGOUS_PATTERNS.md). Không đổi API/schema canonical, dependency hoặc token scale.

## Kiểm chứng thực tế

| Kiểm tra | Kết quả quan sát |
|---|---|
| Before/after | Browser10 failures kỳ vọng và unit atomic1 failure trên snapshot trước; source pairing84 inputs. WIDTH sau sửa20/20 cả Chromium/Firefox. |
| Full E2E | Một lần chạy đầy đủ600/600,300 mỗi engine; không ghép targeted retest. |
| Unit/verify | 175/175 unit;75 simulator+13 network; lint/typecheck/source/boundary/generator/production build và toàn bộ verify đạt. |
| UI gates | Contract39/39; layout82/82, scan79 files0 findings1 declared exception; evidence fixtures11/11; source maps16/16. |
| Built demo | 6/6 artifact cases;216 route observations ở320/1920 và50 geometry/axe/keyboard cases ở320/768/1279/1280/1920. |
| Native | 47/47 actual native scenarios:14 WIDTH+33 inherited; browser zoom200% và Firefox text-only200% riêng, không dùng viewport emulation làm bằng chứng native. |
| Cài sạch/build | 10/10 stages trong workspace cách ly; actual npm ci, cùng lock, production không chứa MSW, demo có worker; build lặp lại byte-identical. |
| FE tracker | Canonical CLI140/140,0 stale/blocked sau dependency revalidation; mẫu số giữ140. Đây là checkpoint freshness, không phải tỷ lệ code đã viết. |

Tại1920: thẻ AI phủ1632px thay cho804px; Devices notice1632px, gap24px. Forms phủ vùng inset Panel; capability group có7 logical children thay cho14. [Dữ liệu compiled](built-width-review.json), [UAT matrix](uat-matrix-width-20261008.json), [gate matrix](quality-gate-matrix-width-20261008.json). Source/log/artifact hashes trong các execution records và S19 manifest.

## Lịch sử lỗi được giữ

Lần full đầu bị dừng sau khi test Finance dùng selector DOM trước W04 thất bại; raw log/exit/context giữ trong [record](runs/width-1791470510326-91776/e2e-record.json) và [giải thích](full-attempt-01-interruption.json). Test mới đo wrapper atomic không inset và inner row12px, vẫn giữ header gap16px, body inset16/24px và đúng một divider. Finance2/2 đạt, sau đó chạy lại toàn bộ600 ca độc lập. Các attempt native/built-review lỗi transport, hidden input hoặc beforeUnload prompt cũng giữ nguyên; sửa harness không bỏ invariant sản phẩm.

Hai wrapper browser có snapshot windows trùng nhau khi chốt lượt đầu; [timing audit](historical-overlap-publication/timing-audit.json) giữ timestamp và sửa lời mô tả publication quá sớm. Gate built-demo được chạy lại riêng sau khi full wrapper đã đóng; [kiểm bảo toàn theo từng path](browser-preservation-current.json) và publication mới được ghi sau lượt riêng này. Không thay source/assertion hoặc cộng kết quả giữa hai lượt.

Lượt cập nhật ledger đầu dừng tại FE010.S03 do Windows EPERM khi atomic rename; [record lỗi](canonical-revalidation-r1-failed.json) và raw log giữ nguyên. File không read-only và không quan sát được process Node thứ hai ghi ledger; chưa xác định process giữ khóa. Driver chỉ thử lại tối đa3 lần cho đúng lỗi rename này khi hash ledger trước/sau không đổi, vẫn gọi canonical CLI và giữ mọi exit code. Checkpoint/source/log phải qua validator trước mỗi lần ghi; không sửa ledger bằng tay.

## Bàn giao và giới hạn

[Ca nghiệm thu](ACCEPTANCE_GUIDE.md), demo http://127.0.0.1:4173. Git HEAD baseline53c0ba8f413b1f1e0fa16a747ed27f728b861dd6; giữ staged/dirty work, không reset/clean hoặc xóa evidence lịch sử. Full-product ledger/Universal/workflow được kiểm bảo toàn; các view và FE receipts sinh bằng owner canonical.

Source cuối: SHA-256 66d07cb881b802d89c77cf846ccad28625630e4bd9806d09980389936ca83957 của 237 runtime/test/tool inputs trong full E2E; Git HEAD riêng không đại diện các thay đổi đang nằm trong working tree. [Ảnh demo hiện tại](R30-handoff-current-1920.png) và [record preview](handoff-demo-current.json) đối chiếu đúng HTML build được phục vụ ở4173.

Phạm vi React/TypeScript+HTTP MSW tổng hợp trên Windows local. Backend/provider/staging/production hosting ngoài scope; screen-reader speech, broad human conformance, hosted CI và quyết định nghiệm thu người dùng chưa ghi PASS. Cold workspaces được giữ với đường dẫn trong manifest. Regression bảo vệ invariant đã đo, không bảo đảm mọi lỗi UI tương lai đều bị loại bỏ.
