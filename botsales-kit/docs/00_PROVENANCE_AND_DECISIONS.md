# 00 — Nguồn, phê duyệt và hiệu lực

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.5.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Đầu vào có thật
Bản Kit 1.1, demo HTML 1.1.1 và AI_RULES.md Universal 3.1 được đọc từ file đính kèm. Yêu cầu 09:04:22Z mở rộng từ bot Facebook thành bốn vai trò vận hành và thông báo điện thoại. Yêu cầu 09:24:12Z duyệt nhóm A–H, cho chọn phương án bền vững, cập nhật tài liệu, tạo demo và kế hoạch từng bước có theo dõi tiến độ. Múi giờ giao diện ví dụ Asia/Vientiane; không suy quốc gia hoạt động hay tiền tệ thật của shop từ vị trí người dùng.

## Quyết định 2.0
| ID | Quyết định có hiệu lực | Căn cứ/giới hạn |
|---|---|---|
| ADR2-01 | Dark-only, giữ MUI/React/TS frontend baseline; không light/system/theme switch | Người dùng đã chốt từ v1.1 |
| ADR2-02 | Modular monolith API + worker, PostgreSQL/Prisma, pgvector khi làm RAG, Redis/BullMQ; không microservices/K8s mặc định | Quyền chọn kỹ thuật trong yêu cầu mới; worker cần cho 24/7, retry/nhắc và outbox |
| ADR2-03 | Bốn vai trò AI, chung nền điều phối, tách quyền/công cụ/dữ liệu | Không ép dùng bốn LLM hoặc bốn dịch vụ riêng |
| ADR2-04 | Web Push/PWA chính + Telegram dự phòng; SMS/voice hoãn | Kênh thiết kế được chọn; thiết bị/cấp quyền/secret chưa cung cấp |
| ADR2-05 | Khách xác nhận + policy + kiểm giá/tồn mới tự chốt đơn | LLM không tự tạo bằng chứng đồng ý |
| ADR2-06 | Mua hàng mặc định draft_for_approval; auto_send opt-in giới hạn | Chưa có ngân sách/nhà cung cấp/thẩm quyền thật, nên live auto_send bị chặn |
| ADR2-07 | Ledger kép và kế toán quản trị; sổ pháp định/thuế cần xác định quốc gia/chuyên môn | Không tuyên bố tuân thủ chỉ vì đã có UI |
| ADR2-08 | V2 phân biệt xuất kho/giao thành công/tiền về; trả từng phần | Breaking semantics được đưa vào /api/v2, không diễn giải lại v1 âm thầm |
| ADR2-09 | Tracker 84 task/420 checkpoint, progress bằng evidence còn hiệu lực | Không tính phần tài liệu/demo vào % sản phẩm thực |
| ADR2-10 | Single writer nguồn chung; source JSON → generated files | Không phải distributed lock giữa các bản copy/branch |

## Nguồn chuẩn và ưu tiên
Tuân thứ tự quyền thực của môi trường và người dùng. Trong phạm vi nội dung dự án: decisions đã duyệt → đặc tả nghiệp vụ + contracts hiện hành → code/test hiện trạng (có thể lỗi) → prototype minh họa. Nếu code khác spec, ghi reconciliation tại task; không tự cho prototype quyền thay schema. Plan JSON là nguồn task/dependency/trọng số. Progress JSON là nguồn trạng thái; generated HTML/Markdown không sửa tay. Universal là bất biến, không sửa để chứa stack/dữ liệu shop.

Bản v1.1 chỉ ở reference/BASELINE_v1.1_READ_ONLY.zip. Không giải nén chồng rồi cho AI đọc cả hai kế hoạch như cùng hiệu lực. Không có bằng chứng đã kiểm repo ứng dụng hay live Meta/AI/Vercel/điện thoại trong bản kế hoạch mới. Kiểm tài liệu/demo được lưu riêng ở evidence/.

## Phạm vi quyền
Hiện tại được làm tài liệu, demo, công cụ theo dõi. Prompt đi kèm cho phép AI trong repo thực hiện code/test local đúng kế hoạch khi chủ repo giao nhiệm vụ implement. Không tự cấp credentials, tạo tài nguyên tính phí, gửi đơn mua/tin khách thật, chuyển tiền hoặc deploy production. Những gate đó phải có grant/approval cụ thể. Không hỏi lại 64 tính năng đã được duyệt; chỉ xử lý input thật còn thiếu ở execution/owner-inputs.json khi tới bước phụ thuộc.

## Lịch sử 2.1 — yêu cầu thay đổi thị giác

Yêu cầu trực tiếp 2026-09-29T14:59:51Z: phối lại màu tinh tế, sáng rõ, tham khảo Binance/Bybit và các nền tảng tài chính. Release này thực hiện Graphite Gold trên demo, token và tài liệu thiết kế; giữ API/nghiệp vụ/Universal và kế hoạch tiến độ 2.0. Không triển khai hosting, không thay quyền tự động hóa hoặc trạng thái task.

ADR-VIS-021: một palette dark-only Graphite Gold. Tham khảo nguồn công khai chính thức (docs/16); các mã HEX cụ thể do BotSales chọn, không chứng thực đây là palette chính thức của sàn. Tại lần giao 2.1, đây là bản xem lại. Trạng thái hiện hành sau yêu cầu 15:30:32Z nằm trong quyết định tiếp nhận bên dưới; không dùng trạng thái lịch sử để mở lại việc chọn màu.

## Quyết định màu hiện hành — đã duyệt trong gói 2.1.1

Ngày 29/09/2026 lúc 15:30:32Z, Jokertrader yêu cầu cập nhật bộ tài liệu chuẩn theo quyết định màu mới và đồng bộ toàn bộ. Tiếp nhận **ADR-VIS-021 — APPROVED**, Graphite Gold dark-only trong `design/decision.json`. Giữ nguyên toàn bộ token của gói 2.1, không thiết kế thêm palette.

Nguồn HEX duy nhất là `design/tokens.json`; trạng thái và phạm vi duyệt là `design/decision.json`; phiên bản đóng gói tại `release.json`. Phiên bản gói 2.1.1 không làm đổi API 2.0.0, phạm vi A–H, 84 task/420 bước, điểm/phụ thuộc hoặc Universal 3.1. Hướng dẫn task được cập nhật để bắt buộc dùng quyết định màu đã duyệt. Đây không phải phê duyệt UAT cuối hoặc quyền đưa sản phẩm live.

Bản này sửa đoạn tóm tắt T008–T011 bị lệch tên việc so với `execution/plan.json`: T008 là cổng chuẩn code; T009 là hợp đồng; T010 là theme/component; T011 là shell/routing. Không đổi task gốc để chạy theo mô tả sai.

Khi áp dụng vào repo đã chạy, giữ tracker/evidence/nguồn code riêng của repo đó; xem `UPGRADE.md`. Gói phát hành không chứng minh mọi bản copy hoặc phiên AI bên ngoài đã được đồng bộ.
