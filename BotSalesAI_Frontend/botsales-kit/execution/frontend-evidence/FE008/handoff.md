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
