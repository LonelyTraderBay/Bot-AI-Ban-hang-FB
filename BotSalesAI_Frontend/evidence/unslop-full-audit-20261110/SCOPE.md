# Audit toàn UI — 10/11/2026

Yêu cầu: dùng unslop kiểm kỹ từng trang, tìm lỗi tương tự căn chỉnh/focus header. Đây là audit; source ứng dụng, test, palette Graphite Gold, tracker và bằng chứng có sẵn được giữ nguyên.

Nguồn phạm vi: 61 route canonical, app router, shared owners/theme/layout và module JSX. Baseline source giữ tại source-before.json; preview dist-demo khớp source 307 inputs của đợt header. Source/runtime inventory, trạng thái thực tế, ảnh và vấn đề nằm trong artifact của lượt này; không lập workflow thay cho FRONTEND_SPACING_STANDARD v1.29.

Ma trận chính: 61 route × 4 widths (320/390/768/1440) × Chromium/Firefox = 488 lần mở. Đo loaded route/heading, overflow, header center, target controls, clipping candidates, CTA/header grouping, copy và lỗi runtime. Chụp full-page Chrome tại desktop/mobile để review từng trang; Firefox đo cùng ma trận. Axe bổ sung tại hai width chính trên Chrome. DOM heuristic chỉ tạo candidate, phải triage theo source/ảnh trước khi gọi lỗi.

R14/R36 dùng missing-job nếu chưa có job mẫu; R61 không có token ở URL canonical là state thiếu token. Không coi đó là happy-path coverage; kiểm fixture/happy-path và overlay bổ sung riêng. Không đồng nhất screenshot/DOM với screen-reader speech, native zoom, physical device, owner acceptance hoặc backend/provider proof.

Định hướng giữ từ đợt đã duyệt: vận hành bán hàng cho cửa hàng; điềm tĩnh, rõ ràng, chính xác; Graphite Gold; nhấn vào số liệu/trạng thái nghiệp vụ; ngữ cảnh gắn với shop đang vận hành.

Áp dụng unslop của Damir Sokolovsky (@heydamir), CC BY 4.0.

Readiness correction: states-unsettled and status-wrap-unsettled are diagnostic first attempts and excluded from positive coverage. Their zero-progress checks could run before the page content/consent exchange was ready; two Firefox load waits also timed out. Current probes require an actual main heading and, for consent, an enabled final decision control. Primary 488 matrix already required visible main heading before measuring.
