# C05 — Kết quả scoped trên source 09/10/2026

Kho, địa chỉ khách và tài khoản đã có canonical CRUD có version/archive/quyền, MSW kiểm reference/scope/invariant và UI shared. Lookup đơn/kho/reorder/purchase/journal lấy cùng nguồn; không còn hai file lựa chọn demo cũ. Label địa chỉ cũng bị che khi toàn bộ địa chỉ bị redaction; GET/query/snapshot không lộ hoặc replay dữ liệu bị che. Kho/biến thể mới khởi tạo tồn bằng 0.

## Kết quả đã chạy

- Browser `C05-browser-final-r2.log`: **172/172**, Chromium + Firefox, exit 0; đủ CRUD, conflict lần hai, quyền, field validation không HTTP, unknown recovery, reflow 320/390/768/1280/1440, keyboard/axe và consumer liên quan.
- Unit **196/196**, domain/MSW **102/102**, kit **522/522**; OpenAPI JSON/YAML/path schema, generator, TypeScript, lint, boundaries, layout và composition đạt. Hash/command/log và bản domain đóng nhóm tại `C05-final.json` / `C05-domain-final.json`.
- Customer mobile overflow trước sửa: viewport320/document642; sau SectionGrid owner `shrinkChildren`: viewport320/document320. Before/after JSON/PNG được giữ riêng.

## Lỗi kiểm chứng đã xử lý và giới hạn

Các lượt R2–R7 và final đầu thất bại/bị dừng được giữ. Sửa đúng nguyên nhân: overflow min-content ở SectionGrid; nhãn domain/lookup đã thay nhưng assertion cũ; MSW mất dữ liệu sau reload/full navigation; axe được chờ hoàn tất Fade tại DOM; version/event resourceId và nháp sau chuẩn hóa. Không bỏ assertion, hạ ngưỡng hoặc ghép targeted retest thành full PASS. Lượt **final-r2** là một lượt đầy đủ trên app source đã giữ nguyên.

Harness Windows giữ cây webServer sau khi mọi test worker đã kết thúc. Đã kiểm parent/command ownership, đóng riêng server của lượt final-r2; CLI báo **172 passed, exit0**. C11 phải xử lý teardown để full run tự kết thúc. Không ảnh hưởng server demo của người dùng.

Đây là đóng nhóm **VERIFIED_SCOPED**. Full gates trên source cuối cả đợt, native zoom/text resize, cập nhật evidence và FE dependency còn ở C11. Không có Backend/provider/production, speech, hosted CI hoặc user acceptance mới được xác nhận.
