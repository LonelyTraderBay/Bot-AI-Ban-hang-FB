# UI017 — triển khai customer copy và ownership i18n

Ngày: 03/10/2026 · Phạm vi: R07/R08 customer list/create/detail/edit · C01: [S01 inventory](S01-copy-namespace-inventory.md).

## Cặp kết quả trong cùng ID

| Trục UI — trước | Trục UI — sau / acceptance |
|---|---|
| Bảng tìm tên/số liên hệ nhưng không nói email; thiếu nhãn trợ giúp cho danh sách rỗng | Search nêu tên, liên hệ hoặc email; bảng có accessible label và empty state riêng |
| Field name `Tên hiển thị`; các field create/detail trùng mảng label theo index; phone/email/notes không nói optional | Tên trường là `Tên khách hàng`; field labels dùng chung definition, ghi rõ trường không bắt buộc |
| Validation chỉ có `Nhập tên khách` và `Email không hợp lệ`; không chỉ rõ lỗi max length | Name/email cùng phone/notes có message tiếng Việt chỉ field và thao tác cần sửa |
| Notice redaction nói bị hạn chế và yêu cầu tránh ghi đè chung chung | Notice giải thích giá trị đã che không được gửi lại khi lưu |
| Empty orders gộp “không có đơn” và “chưa đủ quyền”; nhiều preview/capability strings inline | Empty chỉ hiện khi query thành công rỗng; quyền tách bằng guard; loading/error/preview/cap/đường dẫn đầy đủ có câu riêng |
| Route detail copy và list/form copy rải trực tiếp trong component | Copy của R07/R08 lấy từ namespace `customers.*`; câu chữ không đưa i18n key hay chi tiết implementation vào UI |

## Thay đổi kiến trúc đi kèm UI

- Tạo resource tiếng Việt `apps/web/src/app/locales/vi/customers.ts` với nhóm `list`, `form`, `validation`, `detail`; đăng ký một lần trong `apps/web/src/app/i18n.ts`. Danh sách `requiredVietnameseKeys` tăng từ 32 common keys lên 76 key paths, có cả 44 customer paths và kiểm tra key thiếu/raw key.
- Gom field identity/label/multiline vào `customerFormFields`, dùng chung tại create và detail/edit; bỏ mapping positional `(name, index)` có thể lệch tên trường với label.
- Tạo schema từ validation copy qua `createCustomerSchema`; form và schema vẫn dùng zod + react-hook-form hiện hữu. Giữ limits/payload, `If-Match` version, permission, redacted-field filtering, query ownership và route unchanged.
- Module chỉ gọi `useTranslation()` và `t('customers…')`; module không import module khác. Không thêm locale tiếng Anh/library, không di chuyển shared UI copy, không sửa OpenAPI/route manifest/tokens/generated source hoặc MSW ngoài demo.

## Kiểm chứng

- `tests/fe009.spec.ts` kiểm create, validation, payload, stale edit, redaction và viewport hẹp 320 CSS px; FE009 targeted scenarios 2/2 PASS trong `S03-targeted-regressions.log`.
- Các suite hiện có được đồng bộ với copy mới: `tests/states/fe023.spec.ts`, `tests/ui006-lookups.spec.ts`, `tests/ui007-query-states.spec.ts`. Targeted Playwright regression sau đồng bộ chạy 22/22 PASS trên Chromium trong `S03-regressions-after-copy-update.log`.
- `npm run verify` PASS trên source implementation: generator 11 outputs / 283 schemas / 210 operations / 54 routes; source 64 files / 220 API refs / 54 routes; module boundaries 426 imports, 8/8 negative fixtures; lint/typecheck; domain/MSW 88/88; Vitest 80/80; production build. Chunk warning 736.68 kB raw / 186.36 kB gzip.
- Full rebuilt-demo E2E sau đồng bộ Playwright assertions được ghi tại [S05](S05-full-e2e-current.log). Lần chạy trước đồng bộ assertions là 183/187; bốn lỗi đều là selector/copy cũ sau thay đổi có chủ đích, được giữ trong [log trước sửa](S05-full-e2e-before-copy-assertion-update.log), không tính là PASS cho full gate.

## Kết luận giới hạn

`UI: PASS` cho customer copy/form/detail theo R07/R08 trên local synthetic API; `ARCH: PASS` cho namespace ownership và reuse form definition trong module boundary hiện tại. Chỉ hỗ trợ tiếng Việt như cấu hình hiện tại; đây không phải tuyên bố localization toàn app. Không có bằng chứng Backend, provider thật, staging hoặc owner acceptance.
