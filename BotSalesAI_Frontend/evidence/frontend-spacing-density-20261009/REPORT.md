# Hoàn thiện mật độ spacing — 09/10/2026

**READY_FOR_ACCEPTANCE_LOCAL_SCOPE.** Thứ tự và trạng thái duy nhất: UI plan §16.6/16.20. Phạm vi React/TypeScript + API mock tổng hợp local; hoàn tất kỹ thuật khác với quyết định nghiệm thu của người dùng.

## Thay đổi theo ưu tiên

| Nhóm | Owner và kết quả |
|---|---|
| P0 | Loaded baseline216 observations trước sửa; bảo toàn dirty source. Standard v1.29, catalog, type/finite checker và consumer cùng nguồn. Scale/base8, dependency, schema, gutter16/24, font và target44 giữ nguyên. |
| P1 bảng/thông tin | Table8 dọc/12 ngang; không fixed height. DetailLine row8/valuegap12. AI capabilities dùng SurfaceContent dividedRows0, không thêm gap ngoài divider. Regression list7 dòng394→266px; hàng Products có action44 giảm69→61px ở trạng thái đo. |
| P1 toolbar/demo | Toolbar inset12/gap8, Pager12. Demo controls mặc định thu ở mọi viewport; warning luôn hiện, summary cùng nhãn lựa chọn, giữ state/status khi thu/mở. |
| P1 page/form/dialog | Main block16, section16; operational Panel12/16 và header→body12. Reading comfortable16/24 và boundary16. Form complex16 mặc định; category ngắn compact12. Independent PageSections major24. Ordinary EditDialog inset16; ConfirmDialog/DraftConflict/dirty-discard comfortable16/24. |
| P2 owner closure | Inbox pane/composer/list12 và context12/16; giữ bubbles/history/scroll/draft. Stats value8/note4, report context12/list16, empty24/32, navigation/footer/fallback gọn tại owner. Giữ chart geometry/marker16, hero/auth24/32. |
| P0 chốt | Full gates, actual compiled/native review, clean build và canonical FE receipts dùng source cuối và log thực. Không chắp targeted retest thành full PASS. |

## Kiểm chứng source cuối

| Bằng chứng | Quan sát |
|---|---|
| Full verify | Generate11outputs/283schemas/210operations/54routes; source/boundaries/lint/typecheck,88 domain/network,181 unit, production build, strict layout/visual/composition/evidence đạt. |
| Full E2E |624/624,312 Chromium +312 Firefox. Toàn bộ250 UI assertions thực thi trong cùng full run; không cộng các suite riêng vào count. |
| Contract/provenance |41/41 UI contracts,86/86 layout fixtures,79 source files0finding/1declared exception;11 evidence fixtures,16 source maps. |
| Built |6/6 compiled artifact cases;216 default route observations54×2widths×2engines;70 focused geometry/axe/keyboard cases trên7 route×5widths×2engines, có dialog category. |
| Native |7 Chromium browser zoom200% +9 Firefox text-only200% deep scenarios;108 native label probes54routes×390/1280. Native APIs xác nhận setting/viewport/DPR; không CSS surrogate. Speech và broad human conformance NOT_RUN. |
| Cài sạch |10 actual stages gồm npm ci/setup/verify/build lặp trong workspace tạm; source-copy hashes khớp source cuối; production/demo isolation và repeat byte hashes đạt. |
| Canonical FE |140/140,0stale/blocked theo CLI; receipts sinh từ criterion/source/case/log thực; giữ mẫu số140. |

Source identity: HEAD 53c0ba8f413b1f1e0fa16a747ed27f728b861dd6 + SHA256 1f51252401b94f51c61091fbfbbee8bd50b51ba4e054fa6f28abde0917d16a41, 241 runtime/test/tool inputs. HEAD riêng không định danh dirty tree. Hash docs/evidence được chốt riêng sau handoff. [Full UI binding](ui-final-full-coverage.json), [native](native-current.json), [ảnh native tự rà](NATIVE_VISUAL_REVIEW.md), [compiled](built-shared-review.json), [inventory](inventory-current.json), [adoption](adoption-current.json), [route/state proof](route-matrices-refresh-current.json).

## Attempts và giới hạn

Red table/divider4FAIL trước owner fix, P1green4PASS; red P3 còn py24/gap16 trước profile change giữ riêng. Lượt đầu dialog axe đo giữa Fade Chromium gây contrast tạm thời; test đợi Animation.finished, không đổi màu hoặc bỏ rule. Unit3FAIL và contract2FAIL trước đồng bộ expected/finite resolver được giữ. Migration demo ban đầu tạo9 lời gọi top-level sai, discovery đã phát hiện và sửa; không giảm assertion nghiệp vụ. UI preflight phát hiện Catalog inset cũ và W03/W04 còn kỳ vọng section24/dividedRows12; đã đồng bộ với section16/dividedRows0, giữ độ rộng,7 dòng,divider và sai số. Full trung gian phát hiện route-empty/error và ui008 còn đợi mock controls trước khi mở disclosure; precondition đã sửa qua helper công khai, assertion nghiệp vụ giữ nguyên. Các lượt FAIL hoặc bị dừng có raw log/trace và preservation wrapper riêng; full cuối chạy độc lập trên source cuối.

Các kết quả cũ thuộc source snapshot trước density. Baseline source trước sửa gồm248inputs và216 ảnh/observations; sau sửa thu lại216 observations. Dữ liệu/ràng buộc có thể tăng chiều cao tự nhiên; kết quả px trên chỉ đại diện trạng thái đã đo, không hứa mọi màn giảm cùng tỷ lệ. Route mount/matrix không chứng minh mọi conditional branch. Hai notice không consumer giữ lifecycle có lý do; không tạo use giả.

Backend/provider/staging/production ngoài phạm vi; hosted CI, screen-reader speech/broad human conformance NOT_RUN; user acceptance PENDING. Không commit/push trong batch này. [Case nghiệm thu](ACCEPTANCE_GUIDE.md), [contract](CONTRACT.md), [patterns](ANALOGOUS_PATTERNS.md). Regression ngăn tái diễn các invariant được kiểm; không hứa UI không bao giờ có lỗi khác.
