# UX.C06 — Kết quả scoped kế toán quản trị

Ngày kiểm chứng: 2026-10-09  
Trạng thái: **VERIFIED_SCOPED**  
Scope: React + canonical contract + MSW tổng hợp tại local. Không xác nhận Backend, ngân hàng/provider thật, kế toán pháp định hoặc production.

## Thay đổi đã kiểm chứng

- R57–R60 mở sổ, sổ cái, cân đối phát sinh và cân đối quản trị dùng API journal/read-model; tổng báo cáo không cộng theo trang UI. Bốn route được thêm vào điều hướng kế toán.
- Mở sổ kiểm version, kỳ, tài khoản, kho/biến thể và cân bằng trước khi ghi; drill-down tới journal nguồn giữ nguyên chứng từ đã ghi.
- Import sao kê chạy upload → preview → import, dùng canonical file status và yêu cầu CSRF/idempotency theo API contract.
- Dialog sau lưu không giữ control cũ làm phát sinh cảnh báo nháp sai. Regression giữ draft/conflict và không gửi lại command unknown.
- Shared composition gate bắt được rồi đóng ba lệch source thực: menu thiếu mục R57–R60, `QueryState` địa chỉ chính thiếu `section` profile, và catalog khai báo role `form.pairedFields` không có consumer. Role thừa đã gỡ khỏi type/runtime; catalog line/use/crosswalk lấy từ resolved TypeScript source.

## Kết quả chạy trên source hiện tại

- `tests/ui-finance-management.spec.ts tests/fe015.spec.ts --project=chromium --timeout=30000 --reporter=line`: **16/16**, exit 0; log `C06-browser-final-20261009.log`. Bao gồm mở sổ theo version, conflict hai lần đổi server, journal/report drill-down, timezone, golden finance flow, import/đối soát và 4 route × 5 viewport (320/390/768/1280/1440) kèm axe/keyboard.
- `tests/ui-master-resources.spec.ts --project=chromium`: **7/7**, exit 0; log `C06-address-consumer-final-20261009.log` — regression cho consumer địa chỉ sau khi sửa profile loading.
- Vitest: **197/197**; TypeScript typecheck: PASS; ESLint: PASS; `generate.mjs --check`: PASS (15 outputs, 319 schemas, 236 operations, 60 routes).
- Domain + HTTP simulator: **113/113** (82 simulator, 31 network; 96 operations, 236 handlers); golden fixture đối chiếu lợi nhuận 80.000 VND sau giao và 30.000 VND sau hàng trả/ghi nhận hoàn thực tế.
- Kit validator: **530/530**; contract syntax/reference/path validator: PASS (319 schemas, JSON/YAML tương đương, OpenAPI SHA-256 `49fb3574a17a4ec7d62b836a918efd4c9517348297d4a5aafa21c6b899ac71b6`).
- Boundaries: PASS (83 files, 706 imports); layout: **86/86**, 91 source files, 0 finding, 1 scoped exception; shared composition: **41/41**, checker 89 source files, 0 finding; visual token checker: **5/5**, 90 source files, 0 finding.
- Typecheck, lint, unit, generator, domain, kit, contracts, layout, composition và browser log được lưu trong thư mục evidence hiện hành. Fingerprint source/C06 cùng HEAD được lưu tại `C06-current-source-20261009.json` (36 source files; SHA-256 `0cbcdc9c118d874fdc8668392f9701848449c1dab93f5aa324d16584ce82eaaa`).

## Giới hạn còn mở

- Đây là scoped closeout; C11 vẫn phải chạy full `verify`, Chromium/Firefox suite, production/demo builds, built-demo review và tái xác minh FE dependency/evidence trên source cuối.
- Browser proof ở lượt này dùng Chromium cho các case C06/FE015/C05 affected; chưa phải full browser matrix toàn ứng dụng.
- Golden numbers là dữ liệu synthetic của fixture, không phải đối soát sổ thật hoặc tư vấn kế toán pháp định. Không xác nhận hosted CI, screen-reader speech, backend/provider hoặc user acceptance.
