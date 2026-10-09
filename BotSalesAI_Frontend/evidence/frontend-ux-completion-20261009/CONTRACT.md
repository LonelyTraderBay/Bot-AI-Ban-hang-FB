# Hợp đồng triển khai UX và nghiệp vụ — 09/10/2026

Phạm vi người dùng đã duyệt: UX01–UX15, CRUD kho/địa chỉ/tài khoản, kế toán quản trị đủ luồng, media ảnh/thoại/tệp, ủy quyền purchase.send có hạn mức, consent xác nhận lại bởi khách và Marketing theo khoảng thời gian. Frontend + canonical contract + MSW tổng hợp; không có Backend/provider thật.

Thứ tự/trạng thái duy nhất: UI plan §16.6. Quy trình/DoD: spacing standard v1.29 §0; owner Shared UI theo catalog CURRENT/TARGET. Giữ theme/tokens/dependency và các thay đổi sẵn có.

Baseline `baseline.json` ghi HEAD, dirty paths, source fingerprints và 54 route × 320/1280 CSS px trước source edit; ảnh viewport, không fullPage. Các lỗi UX đã đo tại audit gốc được đối chiếu với baseline mới. Trường hợp thiếu before/conditional state phải ghi đúng giới hạn, không suy ra paired PASS.

Owners: domain labels/format/return context ở shared model; confirmation/table/detail/pager ở Shared UI; navigation guard và titles ở app; nghiệp vụ ở module sở hữu; schema/permission/routes/events ở kit canonical; domain mô phỏng và HTTP handlers trong mocks, không đưa fixtures vào production.

Invariant: giữ nháp/version/concurrency/idempotency/unknown recovery, giới hạn tenant và field redaction; tổng kế toán từ read-model Decimal chính xác; consent phải có customer challenge; purchase.send kiểm grant và budget tại execution. API text cũ tương thích. Mọi changed owner có regression và consumer closure.

Verification theo từng bước trước chuyển dependency; source/unit/contract/browser riêng. Cuối: kit validators, generate:check, verify, full Chromium/Firefox, production/demo builds, built-demo, keyboard/axe/reflow/native methods và evidence fresh. Speech/hosted CI/user acceptance chỉ ghi theo quan sát. FE denominator giữ 140; full-product ledger read-only.
