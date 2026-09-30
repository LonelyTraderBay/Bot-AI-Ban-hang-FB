# Báo cáo kiểm chứng — Frontend 0.1.0

Ngày 29/09/2026. Phạm vi: source frontend từ kit2.1.1 và lớp API mô phỏng. Đây **chưa phải bản frontend đã build/render/nghiệm thu hoàn chỉnh**.

## Bằng chứng đã chạy trên source bàn giao

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| 11 đầu ra generator đồng nhất | PASS; 283 schema,210 operations,54 routes | generate.mjs --check, log frontend-build trước khi dừng |
| Parser/import/API names/route mapping/theme source | PASS;51 tệp,205 vị trí gọi API literal,54 route có component | source-check.json |
| Ranh giới module/alias/relative import/cycle | PASS;374 import được xét | boundaries.json |
| TypeScript strict của pure mock service và các dependency thuần | PASS trên TS5.8.3 môi trường | logs/mock-typecheck.log |
| Node simulator tests | 72/72 PASS,86 lời gọi thành công được ghi lại | domain-tests.json |
| Schema request/response/dữ liệu mock | 335/335 PASS | mock-schema-check.json |
| Universal và bộ kit gốc | PASS;281 tệp gốc không đổi,Universal byte-identical | source-preservation.json |

Parser/AST không phải full semantic typecheck React. Mocktests không qua MSW/browser, không chứng minh backend/DB concurrency hoặc kế toán thật. Schema validation không chứng minh server thực thi đúng. Test Node dùng Node22.16.0, khác target24; ghi rõ phạm vi, không tự nhận tương đương.

## Chưa được kiểm chứng

| Cổng | Trạng thái / căn cứ |
|---|---|
| Install dependencies/lockfile | BLOCKED: registry.npmjs.org không resolveDNS. Không giả lockfile. |
| Full React typecheck/build | BLOCKED: npm run build dừng ở TS2688 thiếu vite/client; Vite chưa chạy. |
| ESLint theo thư viện dự án | NOT_RUN: dependencies chưa cài. |
| Vitest component/helpers | BLOCKED: vitest command not found. Test đã viết không có nghĩa đã chạy. |
| Playwright/UI/browser/responsive/a11y/PWA | NOT_RUN: chưa có bundle/server React hoạt động. |
| Windows/setup script | NOT_RUN trên Windows. |
| Backend,OIDC,Meta,AI,Push/Telegram,carrier,supplier | Ngoài phần đã thực thi; không có kết nối thật hoặc phê duyệt. |
| Dependency security / exact peer compatibility | NOT_VERIFIED trên lockfile, vì chưa có lockfile thật. |

Log thực ở `logs/frontend-build.log`, `logs/frontend-vitest.log`, `logs/registry-network.log`, `logs/doctor.log`. Không sửa tắt typecheck hoặc buildgiả để che kết quả. Các lỗi nguồn/type/runtime khác vẫn có thể xuất hiện sau khi cài thư viện.

Các gap tính năng/UX còn lại được ghi trong `docs/KNOWN_GAPS.md`; cần đóng gap và kiểm đầy đủ trước khi gọi frontend hoàn chỉnh. Không tuyên bố productionready. Tracker toàn sản phẩm trong kit giữ nguyên 0%.
