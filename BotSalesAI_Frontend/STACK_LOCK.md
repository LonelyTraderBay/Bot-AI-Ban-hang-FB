# Khai báo phiên bản và trạng thái khóa

Baseline target Node24, TypeScript5.9.2. Exact top-level package versions nằm tại hai package.json, không dùng ^ hoặc ~. Đây **chưa phải resolved dependency lock** vì môi trường không cài npm được. Không có package-lock.json giả; lệnh npm install trên máy được phép sẽ sinh lockfile, sau đó cần review/đóng băng và dùng npm ci.

Các gói chính: React/ReactDOM19.1.1, Router7.8.2, MUI7.3.1, Vite7.1.3, Query5.85.5, RHF7.62.0, Zod4.1.3, MSW2.11.1. Chưa xác minh tổ hợp này bằng build hoặc rà toàn bộ advisory. Không tuyên bố chúng là “mới nhất/không lỗ hổng”. Đừng auto upgrade stack hoặc giải quyết lỗi bằng force-install.

Công cụ thực sự chạy khi tạo gói: Node22.16.0, TypeScript5.8.3 môi trường, Pythonjsonschema. Bằng chứng đó chỉ áp dụng parser/mocks/schema, không targetapp.

Tham chiếu công cụ chính thức để kiểm khi tiếp nhận: https://vite.dev/guide/ ; https://v7.vite.dev/guide/ ; https://mswjs.io/docs/integrations/browser/ ; https://mui.com/material-ui/getting-started/installation/ . Lựa chọn kiến trúc gốc ở botsales-kit/docs/02_ARCHITECTURE.md vẫn có hiệu lực.
