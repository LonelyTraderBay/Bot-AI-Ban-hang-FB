# UI027/S02 — Thiết kế phân nhóm bundle

**Ngày:** 05/10/2026 · **Owner:** Codex · **Thay đổi package:** không

## Kết luận từ baseline

Các route đã được lazy-load, Reports/Recharts đã ở chunk riêng. Entry lớn do runtime React DOM, toàn bộ schema/operation/route data và validator cùng bị Rollup gom vào một chunk; chia route UI thêm lần nữa không xử lý đúng nguyên nhân. Giải pháp nhỏ nhất là dùng `manualChunks` theo package ownership ở `apps/web/vite.config.ts`, giữ generated contract source và schema validation intact.

## Quyết định

- Gộp React, React DOM, React Router, Remix Router và scheduler trong một `react-runtime`. Thử nghiệm tách riêng `react-dom` tạo vòng `react-dom-runtime → react → react-dom-runtime`; quyết định giữ runtime liên quan cùng chunk loại vòng đó.
- Tách nhóm độc lập `contract-data`, `schema-validation`, `query`, `i18n`, `mui` và `charts`. Việc này chỉ đổi ranh giới file do bundler tạo; không tạo DTO/API song song, không chuyển schema validation sang demo-only, không thay đổi runtime behavior.
- Giữ nguyên route-level dynamic imports hiện có, một React runtime, một MUI/theme, một Router/QueryClient, production/mock isolation và ngưỡng Vite 500 kB.
- Không thêm plugin/dependency. Tradeoff: tăng số file JS cacheable và có thể tăng request count; chấp nhận khi full browser regression và FE025 initial-route/largest-gzip budgets đạt, đồng thời largest raw chunk xuống dưới ngưỡng cảnh báo.

## Thử nghiệm cấu hình trước khi ghi source

Vite programmatic build vào thư mục tạm, cùng config và cùng source hash C01, với chính các nhóm đề xuất cho thấy: React runtime 279.78 kB raw / 90.28 kB gzip; MUI 328.33 / 100.02; Charts 313.03 / 94.99; contract data 262.00 / 35.24; schema validation 149.80 / 45.12; i18n 46.14 / 15.12; query 33.15 / 9.92; generated schema chunk 79.18 / 24.03. Largest là 328.33 kB, không có chunk-cycle warning. Đây là feasibility experiment; C03/C04 vẫn phải build/test trên source sửa thật.
