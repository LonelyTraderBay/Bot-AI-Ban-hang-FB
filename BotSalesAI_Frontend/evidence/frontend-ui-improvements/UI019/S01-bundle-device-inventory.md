# UI019 — Bundle và thiết bị mục tiêu: C01 inventory

Ngày: 2026-10-03  
Phạm vi: React/TypeScript frontend với synthetic MSW. C01 chỉ kiểm kê artifact, dependency-loading shape và độ tin cậy của phép đo; không sửa source/runtime, không đổi warning/budget.  
Baseline HEAD: `e68cb65e61c5c1aab2ae169dd8033df305df8872`. Worktree có các thay đổi local sẵn từ trước; giữ nguyên, không quy toàn bộ diff cho UI019.

## Quan sát bundle trên production artifact hiện có

Artifact `apps/web/dist` được tạo từ production Vite build đã ghi ở UI018 S04. `index.html` tải entry `index-DZpZ752m.js` và `modulepreload` cho `react-NCqEdj2_.js` và `mui-B9c92xfW.js`; tổng 3 file JavaScript static ban đầu là 1.164.741 byte raw. Tự nén từng file bằng Node `zlib.gzipSync(..., {level: 9})` cho tổng 319.362 byte. Đây là phép nén file cục bộ, không phải browser transfer/network capture và không bao gồm CSS, fonts hoặc request API.

| File | Raw bytes | gzip level 9 bytes | Ghi chú |
|---|---:|---:|---|
| `index-DZpZ752m.js` | 737.924 | 186.407 | Entry lớn nhất; Vite ghi 737,92 kB raw / 186,81 kB gzip trong build log UI018 S04. |
| `mui-B9c92xfW.js` | 322.091 | 97.564 | Shared vendor chunk khai báo trong `manualChunks`. |
| `react-NCqEdj2_.js` | 104.726 | 35.391 | Shared React/router chunk khai báo trong `manualChunks`. |
| `index-CKmQ_ZPS.js` | 325.364 | 99.575 | Chunk còn lại lớn nhất; chưa có module-level attribution trong inventory này. |
| `schemas-BNOgWa61.js` | 79.170 | 24.007 | Schema chunk; mức tải theo route cần xác nhận bằng browser trace. |

Dist hiện có 26 JavaScript assets, tổng 1.846.522 raw bytes. `apps/web/src/app/router.tsx` có 52 call site `lazy(() => import(...))`; route-level lazy loading đã tồn tại. Entry lớn về raw bytes nhưng Vite gzip largest chunk là 186,81 kB, dưới budget local 200 KiB gzip. Static initial JS là 319.362 byte gzip theo phép zlib riêng, dưới budget local 500 KiB. Vite raw warning 500 kB vẫn xuất hiện; không được nâng ngưỡng hoặc gọi cảnh báo đó là tối ưu.

## Device/interaction evidence và giới hạn

Metric demo gần nhất được đo trên artifact demo ngày 02/10, không phải production dist/UI018 build: Chrome 153, Windows, viewport 1280×720, route dashboard; first page của 1.004 synthetic customers hiển thị 20 record + header trong 342 ms. Đó là một lần đo (n=1), không ghi CPU throttling hoặc network profile, không phải thiết bị mobile thật, median/p95, phản hồi tương tác, memory hay backend latency. Các con số 446.928 initial-route gzip / 185.429 largest gzip thuộc demo artifact và không được ghép với production artifact metrics phía trên.

## C01 paired decision

- UI: PASS cho inventory: initial bundle và một thao tác danh sách có baseline định lượng, nhưng chưa đủ để kết luận trải nghiệm mobile hay bottleneck theo percentile.
- ARCH: PASS cho inventory: entry, static vendor dependencies và route-level lazy imports được đối chiếu; module attribution chi tiết và dependency cost trên route chưa được đo đủ.
- Chưa có bằng chứng cho thấy cần source optimization ngay. Không thay đổi code ở C01. Bước kế tiếp đo cùng artifact, route, dataset và browser bằng protocol lặp lại; ghi median và phân bố, đồng thời có CPU/network profile. Chỉ mở code change trong C03 nếu kết quả lặp lại vượt budget đã duyệt hoặc chỉ ra bottleneck UI cụ thể.

Nguồn: [UI018 production checks](../UI018/S04-frontend-checks.log); demo baseline: [bundle preview metrics](../../frontend-architecture-audit-20261002/demo-preview-metrics.json) và [large dataset metrics](../../frontend-architecture-audit-20261002/large-dataset-metrics.json).
