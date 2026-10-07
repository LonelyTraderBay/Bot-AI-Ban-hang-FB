# FE008 — Mock API và bộ dữ liệu nghiệm thu

Phạm vi: React frontend với MSW và simulator/in-memory data tổng hợp. Không gọi backend hoặc provider thật. Fixture có hai shop riêng biệt, bảy role preset theo permission catalog và liên kết dữ liệu catalog, tồn kho, hội thoại, đơn hàng, procurement, fulfillment, finance, command và audit. Record seed dùng ID `seed-*` để tránh xung đột sequence runtime. Cách reset và giới hạn được ghi tại `samples/MOCK_DATA.md`.

## Revalidation — 01/10/2026

- `npm run test:domain`: PASS 88/88 (75 simulator, 13 MSW HTTP/SSE), với 210 handler và 89 operation cases. Bao gồm shop/role isolation, cursor và 133 sản phẩm, request CSRF/version/idempotency, 422/stale/unknown, empty/503, delay/abort, deterministic reset/clock và SSE theo shop.
- `python scripts/validate-mock-schemas.py`: PASS 356/356 bản ghi/request/response đã chụp theo canonical JSON Schema. Python 3.12.10 sử dụng jsonschema 4.26.0 từ target tạm qua `PYTHONPATH`; validator không chạy HTTP, React hay backend thật.
- Full Chromium suite: PASS 123/123 trên React app và dữ liệu mock. Bao gồm 54 route, scope shop/role, recovery/logout, import/catalog, UI state, bốn vertical journey và feature-route matrix.
- Production và demo builds đều thành công trên source hiện hành. Artifact audit PASS 9/9: production không đóng gói mock worker/MSW browser runtime; demo đóng gói mock worker, MSW runtime và nhãn dữ liệu mô phỏng.
- Bundle có cảnh báo chunk trên ngưỡng 500 kB: production lớn nhất 730.13 kB raw / 184.23 KiB gzip; demo lớn nhất 733.16 kB raw / 185.19 KiB gzip.

## Giới hạn

Đây là bằng chứng frontend chạy cục bộ với dữ liệu tổng hợp. Nó không chứng minh backend, database, provider, concurrency thật, CI, staging, production deployment hoặc UAT của chủ sản phẩm. Bank/COD/reconciliation có empty state trước khi nhập CSV mẫu; import không xác minh với ngân hàng, hãng vận chuyển hoặc server. Finance data chỉ hỗ trợ nghiệm thu giao diện và luồng mock, không xác nhận kế toán thật. Không lấy simulator/mock làm backend thay thế.

Chi tiết log và source/artifact hash nằm trong thư mục này; browser suite 123/123 được ghi tại `../FE003/S03-e2e-current-20261001.log`. Các gate FE-G01..09 chỉ được báo theo đúng bằng chứng frontend tương ứng.

## Tái xác minh hiện hành — 04/10/2026

- `npm run test:domain`: PASS **88/88** (75 simulator, 13 MSW HTTP/SSE), 210 handler và 89 operation cases. Generator hiện PASS **11 outputs / 283 schemas / 210 operations / 54 routes**.
- `python scripts/validate-mock-schemas.py`: PASS **356/356** dữ liệu mô phỏng theo JSON Schema canonical với Python 3.12.10 và `jsonschema 4.26.0` trong target tạm độc lập. Lần đầu dùng target cũ không nạp được package; log lỗi môi trường được giữ riêng, kết quả PASS lấy từ `S04-schema-validation-current-20261004.log`.
- `npm run test:e2e`: PASS **388/388** trên Chromium và Firefox; lệnh đã setup, kiểm generated contract, typecheck, build production/demo và chạy Playwright. Browser suite xác nhận demo gọi MSW tổng hợp, artifact production không mang mock worker/runtime; kiểm 54 route, role/shop scope, empty/error/forbidden/conflict/unknown, responsive, keyboard/axe, state isolation và 4 vertical journey.
- Một lượt full suite trước đó đạt 387/388 do test helper UI004 đọc DOM trước khi React render kết quả response trên Firefox. Helper hiện đợi ID rows khớp response; case Firefox chạy riêng PASS 1/1 và lượt full sạch PASS 388/388. Lưu cả log chẩn đoán ban đầu (`S05-e2e-current-20261004.log`) và log cuối (`S05-e2e-rerun-current-20261004.log`).
- Build giữ cảnh báo bundle chunk production lớn nhất **738.39 kB raw / 186.88 kB gzip**; demo đo được chunk lớn nhất **742,030 bytes / 188,083 gzip**, initial-route **449,927 gzip**. Đây là số đo local, chưa gán SLO production.

Evidence mới và source hashes cho FE008.S01–S05 nằm ở `S01-current-revalidated-20261004.json` đến `S05-current-revalidated-20261004.json`; logs chi tiết ở cùng thư mục. Kết quả xác nhận frontend với synthetic mock, không phải backend/provider, CI, staging, production deployment hoặc UAT thực.
