# Kết quả kiểm chứng

Baseline `60900d41a90799e8f6d43e24f31989a50cb5956c`, working tree sạch; kiểm trên bản sửa trong working tree. Không thay contract, backend hoặc tracker sản phẩm. Môi trường Windows, Node 24.22.0 và npm 11.19.1 (khác npm 11.17.0 khai báo trong packageManager).

- Regression trước sửa: `scope-events.test.tsx` có 5 lỗi tái hiện (dashboard với journal/opening event, shop snapshot với reconnect/gap/opening event). Sau sửa: kiểm thử thật với QueryClient và scoped keys đạt; `npm run verify` chạy toàn bộ 269 Vitest.
- `npm run verify`: exit 0. Generate 15 outputs/346 schemas/245 operations/61 routes; source, boundaries 88 file/756 import/10 negative fixtures, lint, typecheck, mock domain 117, 269 Vitest, production build, layout, visual tokens, composition và S17 evidence validator đều đạt. Log: `verify.log`. Một lượt trước thất bại vì component R48 bị tách khỏi public entry (`verify-first.log`); một lượt sau thất bại do PATH npm sai (`verify-toolchain-fail.log`). Các lỗi này không được gộp thành PASS.
- Luồng liên trang `data-sync-cross-page.spec.ts` và FE022.VS01–04: 10/10 trên Chromium và Firefox, exit 0 (`cross-page.log`). Kiểm chứng ghi bút toán → dashboard khi SSE ngắt và bốn luồng catalog/kho/đơn, mua hàng/nhận hàng, đối soát, inbox/knowledge/AI. Các tác động và dữ liệu là MSW tổng hợp.
- Hồi quy bút toán và dialog: 6/6 trên Chromium và Firefox, exit 0 (`journal-regression.log`); gồm cân bằng số tiền, kết quả command chưa rõ không gửi lại, và hiển thị dialog.
- Captures trước/sau R04, R33, R48 ở 1440 và 390 CSS px: 6 cặp ảnh kích thước giống nhau, tỷ lệ pixel có sai khác chuyển sang thang xám >10 được đo bằng Pillow là 0,00%. File và SHA-256 trong `before.json` và `after.json`; đây là kiểm tra render trạng thái sẵn sàng, không chứng minh toàn bộ trạng thái hoặc mọi consumer của ScopeEvents.
- Các báo cáo tổng hợp `source-check.json`, `boundaries.json`, `domain-tests.json`, `mock-typecheck.log` đã trả về đúng byte trước run; log của lượt này được giữ ở thư mục task. S17 fingerprints đã cập nhật cho các file đổi/thêm; S17 vẫn IN_PROGRESS.

Chưa chạy toàn bộ E2E/route-state, hosted CI, backend thực, multi-user server, staging, native zoom/text-only, screen reader, mobile vật lý hoặc owner acceptance. Không đề nghị chứng nhận Enterprise-Grade từ kết quả này. Máy chủ Playwright tạm đã dừng.

SHA-256: `verify.log` 6c081b6bc7047ca15253b4de84a54dbf051b47d1c9d3267a12df5a645d386933; `cross-page.log` 305ae9a790a612ce6109dae951aab9ee1ee089e9f9bfeceaa605ea9f3406a8c5; `journal-regression.log` 55e16458f0c02fca0d1638e0597dfc3acfe0b15a5b92806040dcd21cd604e622; `before.json` 9e9ec5fce06cd46ddc9f55e2e0cd082f18c11703faf83984d8f128ef8ae6cb9c; `after.json` 03f9b11e6d83c552bd633fcf1b27e38dd3081ef2429e4f95b03fa8d3e359bd0d.
