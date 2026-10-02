# Phạm vi triển khai frontend

Nguồn giao việc ban đầu: yêu cầu Jokertrader ngày 29/09/2026 xây frontend theo kit. Cập nhật theo yêu cầu trực tiếp ngày 30/09/2026: **chỉ phát triển frontend; mock data đủ để nghiệm thu frontend**. Mục tiêu Production-Ready/Enterprise-Grade Frontend Architecture được kiểm chứng theo AI_RULES.md3.1 và FE-G01..09; chưa phải nhãn đã đạt.

## Nguồn và ranh giới

Source React/TypeScript hiện có tại apps/web; frontend tests/config/generator liên quan. Một MUI/theme, Query, Router, RHF/Zod, i18next theo manifest/lockfile thật. Không port prototype HTML, thêm stack/state framework cạnh tranh hoặc dựng lại source đã có.

Canonical: botsales-kit/contracts/openapi.json API2.0.0, route-manifest.json, permission-catalog.json, events schema và design/tokens.json Graphite Gold2.1. scripts/generate.mjs sinh packages/CSS/PWA. Các nguồn contract/token giữ nguyên; gap được ghi, không tự sửa API để làm màn hình đẹp. Kế hoạch frontend chuẩn: botsales-kit/execution/frontend-plan.json; IMPLEMENTATION_PLAN.md/phiếu FE được sinh từ nguồn này và frontend-progress.json/FRONTEND_PLAN_GUIDE.md. Plan/progress/tasks T toàn sản phẩm giữ nguyên ngoài scope.

App ghép public module entries; module X chỉ X/shared/contracts/tokens; shared không import app/modules/mocks. Nghiệp vụ riêng tách api/model/ui theo trách nhiệm khi sửa. Một transport HTTP typed; mock API ở MSW demo/test và service tổng hợp, không trong JSX. Backend vẫn là authority khi tích hợp sau này; simulator không là backend thay thế.

Ngoài scope: API server/DB/worker, OIDC/Meta/AI/Push/Telegram/carrier/supplier thật, migrations/restore/tải backend/staging toàn sản phẩm và deploy. Thiếu credentials thật không chặn nghiệm thu frontend mock. Không tự gửi tin/đặt PO/chuyển tiền/Git push/merge/hosting.

## Nghiệm thu và khả năng mở rộng

Mock dữ liệu đủ routes/feature UI, hai shops/role presets, dữ liệu nhiều dòng/phân trang và positive/negative states; validate schema/seed/reset/clock. Nghiệm thu bằng React artifact demo thật và contract/component/browser tests, không ảnh prototype hoặc simulator-only. Các gap contract được giải thích và ngoại lệ UAT được chấp nhận khi có thật; mandatory UI gap chưa giải quyết vẫn chặn phần đó.

Production build và demo build phải thành công trên Node24/dependencies/lock thực; production tách MSW/seed/fallback, demo có nhãn synthetic. Chưa có backend thật không chặn artifact frontend, nhưng việc nối API thật chưa được xác minh.

Áp dụng Change Budget/Complexity Gate/Verification Ladder/Production Claim Gate của Universal3.1; module/public entry/contracts/transport ổn định để thêm chức năng và thay nguồn dữ liệu có kiểm soát, không dựng generic framework cho nhu cầu giả định.

FE-G01..09 yêu cầu: clean install, full type/lint/boundaries/generator, schema/contract/component tests, route×states×roles coverage, browser/a11y/keyboard/dirty forms, frontend security, performance có số đo/budget, artifact isolation và UAT/handoff. Kết quả dùng ĐẠT/CHƯA ĐẠT/CHƯA XÁC MINH/N/A có lý do. Không claim Production-Ready chỉ từ source coverage hoặc checklist.

Quyết định người dùng ngày 01/10/2026: blocker API thật không chặn nghiệm thu UI frontend với dữ liệu mô phỏng. Riêng FE017, UI mock được phép dùng `knowledge.publish` permission và lifecycle làm substitute cho `allowedActions`; không thêm field vào OpenAPI/DTO/generated code. Khi nối backend thật, contract vẫn cần chủ sở hữu API xem xét riêng.

Frontend-progress bắt đầu0%; chỉ checkpoint có evidence đúng diff có điểm. Không tăng execution/progress.json toàn sản phẩm từ frontend/mock. Trạng thái code lịch sử nằm tại route-implementation.json, KNOWN_GAPS.md và evidence/REPORT.md; lượt sửa kế hoạch không hoàn thành gate ứng dụng.
