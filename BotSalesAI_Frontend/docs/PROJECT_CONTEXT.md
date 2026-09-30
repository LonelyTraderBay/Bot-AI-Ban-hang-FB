# Hồ sơ dự án frontend

- Hiện trạng: repo mới được tạo từ kit2.1.1 đính kèm; không khảo sát/chỉnh repo GitHub hoặc VS Code có sẵn của người dùng.
- Artifact: source frontend0.1.0 và mock layer; không application backend.
- Màu: đã duyệt Graphite Gold, chỉ dark, source tokens nguyên trạng.
- Universal: root AI_RULES.md và bản trong botsales-kit giống byte; không nhét cấu hình dự án vào file Universal.
- Cấu trúc: apps/web/src/app,16modules,shared,mocks; packages/contracts/design-tokens; docs/tests/scripts.
- Target: Node24, React19.1.1, MUI7.3.1, TypeScript5.9.2; versions là khai báo chưa resolve/install ở môi trường giao.
- Môi trường đã dùng: Linux,Node22.16.0,TypeScript5.8.3 có sẵn. Không đại diện đầy đủ target. Không cài được dependencies do DNS tới npm registry.
- Lệnh có thật: đọc package.json. generate:check/test:source/boundaries/test:domain đã chạy; validate-mock-schemas.py chạy Pythonjsonschema. npm build dừng vì thiếu vite/client; npm test không có vitest. Full lint/browser chưa chạy.
- Không có git commit, deployment hoặc credentials; toàn bộ dữ liệu mock là tổng hợp, dùng ngày cố định. Không giữ tệp test tài chính thật.
- Khi tiếp tục: chạy bước tiếp nhận môi trường trong CONTINUE_FRONTEND, không dựng lại stack hoặc lặp viết tài liệu kiến trúc. Giữ source đã có, kiểm từng lỗi theo bằng chứng.
