# R43 — baseline trước mọi sửa đổi UI

## Phạm vi và hợp đồng đang kiểm

- Revision đo: `4b514d35023048d488637adebc967aa2238247f8` (`main`).
- Route có dấu hiệu tại GitHub: `/s/shop-demo/approvals`.
- Bài kiểm: `tests/ui-operations-layout.spec.ts`, R37/R38/R52; route approvals phải không làm `document.documentElement.scrollWidth` vượt viewport `width + 1` trên 320, 390, 768, 1280 và 1440 CSS px. Dữ liệu là MSW demo tổng hợp.
- Chuỗi render: `ApprovalsPage` → `PageSections` → `Panel`/`PurchaseDelegationsPanel` → shared `DataTable`. `PageSections` đã có prop `shrinkChildren`; consumer approvals hiện không bật prop này. Đây là đường cần đối chiếu, chưa phải kết luận root cause.

## Bằng chứng trước sửa

- GitHub [run #42, attempt 1](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/38552749651), SHA trên: Chromium verify/E2E/built-demo thành công; Firefox `npm run verify` thành công nhưng E2E thất bại tại `ui-operations-layout.spec.ts:49`, viewport 768, route approvals.
- Firefox trace kết thúc với `Timeout 5000ms exceeded while waiting on the predicate`. `Frame.evaluateExpression` cho `document.documentElement.scrollWidth` (call `call@33051`) bắt đầu nhưng không có sự kiện trả kết quả trước khi predicate timeout. Artifact không ghi một giá trị scrollWidth vượt ngưỡng; vì vậy chưa thể kết luận đã đo thấy overflow hoặc quy nguyên nhân cho `PageSections`.
- Artifact Firefox của attempt 1: [11891949258](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/38552749651/artifacts/11891949258), SHA-256 `1f7c3db5301f5f8832b4d2e8058b7b86d988def66bf6f4d1dd235b2713bae1d2`. Screenshot cho thấy nội dung route đã hiển thị; screenshot không thay thế phép đo kích thước DOM.
- Cùng test trên Windows/Firefox đạt 2/2; Windows probe tại 768 ghi Chromium 153.0.8010.12 và Firefox 155.0 đều có `innerWidth=768`, `documentElement.scrollWidth=768`, không có phần tử hiển thị vượt viewport. Xem `repro-firefox.log`, `probe-before.json` và `probe-before.exit`.
- GitHub attempt 2 đang chạy lại riêng job Firefox bị lỗi; chưa có kết quả hosted mới tại thời điểm ghi baseline.
- Hai lệnh đầu gọi npm với PATH kế thừa của phiên Codex (`14.828` ký tự) lỗi `'node' is not recognized`; `cmd.exe` cũng không tìm thấy `where.exe`. Chạy `npm.cmd` trong tiến trình có PATH gọn gồm Node, Git và Windows system path thì layout gate và full verify đạt. Đây là giới hạn môi trường local, không phải lỗi sản phẩm; lần thử đầu được giữ trong `layout-r43.log` và `layout-r43-npm-cmd.log`.

## Hash source và giới hạn kết luận

| File | SHA-256 trước sửa |
|---|---|
| `tests/ui-operations-layout.spec.ts` | `94c540c0f6b4fe680fdf20bb0bf321ebe5cbff500004e4aea5fd4d476f367d31` |
| `apps/web/src/modules/operations/index.tsx` | `eece85ec20768d64ea2607ef170aaa50b956fe6fcd015a9d44e0375146945304` |
| `apps/web/src/shared/ui/components.tsx` | `e322102faa55371356e855fd16967d2a8bd07a6606a2d99dae7323247782f314` |
| `apps/web/src/shared/ui/composition.tsx` | `d37882fa1fec836317e8db306a182ded40a5a920f02567aec6eeff696681ee3e` |

## Hash các phép đo local

| Artifact | SHA-256 |
|---|---|
| `repro-firefox.log` (focused 2/2) | `0e6e8d283bd8b0c2969aec84f3d847361ef6d4477fa01ec3dd84a4b38fdc5dad` |
| `firefox-repeat3-r43.log` (6/6) | `45a0375bd7e05c448fc88df857dF766774a7c214dd2eab73d16ad995f127b91b` |
| `probe-before.json` | `25c6c84bcfdac54f0395106b50af7af885bddfe580ae863e890be037c5cf4c83` |
| `verify-r43-final.log` (exit 0) | `5513a41359d487d747232a8e29cf03d5292f3338805c0048fda74a76188b7740` |
| `probe-approval-layout.mjs` | `0950895840619865f37a352a137fe0af96fda1cc8a13528a24c2f606c553d420` |

Chưa sửa React, shared UI, test assertion, threshold, route hoặc mock. Quyết định source change chỉ đưa ra nếu lần chạy GitHub lại xác nhận lỗi có thể tái hiện và có phép đo/trace đủ phân biệt overflow giao diện với evaluation/runner timeout.
