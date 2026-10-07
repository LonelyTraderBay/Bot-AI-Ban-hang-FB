# BotSales AI

Repository tổng hợp cho đặc tả sản phẩm và các module BotSales AI. Mã Backend chưa có trong checkout hiện tại; thư mục Backend rỗng ở máy không được Git lưu.

## Cấu trúc

- [`botsales-kit/`](botsales-kit/README.md) — hợp đồng API, route, quyền, token thiết kế và kế hoạch tham chiếu toàn sản phẩm. `IMPLEMENTATION_PLAN.md` là tài liệu sinh từ nguồn kế hoạch trong `execution/`.
- [`BotSalesAI_Frontend/`](BotSalesAI_Frontend/README.md) — workspace React/TypeScript độc lập. `apps/`, `packages/`, `tests/`, `scripts/`, `docs/` và `evidence/` bên trong thuộc phạm vi Frontend.
- `.github/` — workflow cấp repository; workflow Frontend chạy trong `BotSalesAI_Frontend/` và theo dõi thay đổi ở cả Frontend lẫn `botsales-kit/`.
- `AGENTS.md` và `.gitignore` — hướng dẫn ranh giới chung và quy tắc bỏ qua artifact/cache cấp repository; mỗi workspace vẫn giữ hướng dẫn và ignore rule riêng khi cần.
- `BotSalesAI_Backend/` — vị trí dự kiến cho mã Backend; Git chỉ lưu thư mục này sau khi có file thật.

## Chạy Frontend

Mở terminal trong `BotSalesAI_Frontend/`, sau đó chạy:

```bash
npm ci
npm run setup
npm run dev
```

Frontend dùng API mock trong chế độ demo. Tài liệu và trạng thái Backend, dịch vụ ngoài, staging hoặc production không được xác nhận bởi các bước chạy Frontend này.
