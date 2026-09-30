# Phạm vi triển khai frontend

Nguồn giao việc: yêu cầu Jokertrader ngày 29/09/2026 16:19:19Z, xây frontend theo tài liệu là đủ. Bộ chuẩn 2.1.1, API2.0.0, token2.1 Graphite Gold. Quyền hiện tại: tạo source/test/config cục bộ và gói bàn giao; không backend, Git push, cloud, chi phí hoặc dữ liệu thật.

## Ranh giới

React/MUI/TypeScript/Vite/Router/Query/RHF/Zod/i18next là baseline. Phần mở rộng dùng MSW/Ajv để chạy network mocks và xác thực hợp đồng, có lý do trực tiếp từ docs06/09/10. Không port prototype HTML, không thêm hệ UI hoặc quản lý state cạnh tranh.

`botsales-kit/contracts/openapi.json`, `route-manifest.json`, `permission-catalog.json`, `design/tokens.json` là nguồn. scripts/generate.mjs sinh packages và CSS/PWA token-derived. Canonical kit giữ nguyên. Input schema thiếu hoặc mâu thuẫn được giữ thành gap, không tự sửa API gốc.

App có quyền ghép module public entry; module X chỉ X/shared/contracts/tokens; shared không import nghiệp vụ/app/mocks. API business authority thuộc backend. Mock service chứa logic mô phỏng và không được coi là backend thay thế. Pure TS domain tests chỉ chứng minh simulator hoạt động trong các ca đã chạy.

## Nghiệm thu

Mức V0/V1/V2 cục bộ: generator, cấu trúc/types thuần, route mapping, import boundaries và schema. V3 frontend: npm install có lockfile, full typecheck, lint, Vite build, Vitest/Playwright, kiểm trình duyệt/thiết bị. V3 chưa đủ bằng chứng trong bản nguồn này. Không gắn nhãn Production-Ready hoặc Enterprise-Grade khi các gate chưa chạy.

Mã nguồn không thay đổi phần trăm tracker toàn sản phẩm. Tiến độ frontend chưa gán tỷ lệ tùy ý: mỗi tuyến có source, nhưng browser status của tất cả tuyến là NOT_RUN. Xem route-implementation.json và evidence/REPORT.md.
