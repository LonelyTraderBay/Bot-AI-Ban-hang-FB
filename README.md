# BotSales AI

Repository tổng hợp cho đặc tả sản phẩm và các module BotSales AI. Checkout hiện tại có frontend và workspace API backend. Trạng thái triển khai được ghi trong kế hoạch BE.

## Cấu trúc

- [`botsales-kit/`](botsales-kit/README.md) — hợp đồng API, route, quyền, token thiết kế và kế hoạch tham chiếu toàn sản phẩm. `IMPLEMENTATION_PLAN.md` là tài liệu sinh từ nguồn kế hoạch trong `execution/`.
- [`BotSalesAI_Frontend/`](BotSalesAI_Frontend/README.md) — workspace React/TypeScript độc lập. `apps/`, `packages/`, `tests/`, `scripts/`, `docs/` và `evidence/` bên trong thuộc phạm vi Frontend.
- `.github/` — workflow cấp repository; workflow Frontend chạy trong `BotSalesAI_Frontend/` và workflow Backend chạy trong `BotSalesAI_Backend/`.
- `AGENTS.md` và `.gitignore` — hướng dẫn ranh giới chung và quy tắc bỏ qua artifact/cache cấp repository; mỗi workspace vẫn giữ hướng dẫn và ignore rule riêng khi cần.
- [`BotSalesAI_Backend/`](BotSalesAI_Backend/README.md) — workspace NestJS độc lập. Phạm vi và bằng chứng của từng đầu việc lưu trong [kế hoạch BE](BotSalesAI_Backend/BACKEND_PLAN.md).

## Chạy Frontend

Mở terminal trong `BotSalesAI_Frontend/`, sau đó chạy:

```bash
npm ci
npm run setup
npm run dev
```

Frontend dùng API mock trong chế độ demo. Tài liệu và trạng thái Backend, dịch vụ ngoài, staging hoặc production không được xác nhận bởi các bước chạy Frontend này.

## Giữ repository sạch

Từ repository root, chạy trước khi commit:

```bash
node --test .github/scripts/check-repository-hygiene.test.mjs
node .github/scripts/check-repository-hygiene.mjs
```

Sau khi commit, thêm `--require-clean` để kiểm cả trạng thái checkout. Workflow `repository-hygiene` chạy cùng bộ kiểm trên Ubuntu và Windows cho push/PR. Quy tắc giữ bằng chứng, nơi đặt output tạm và cách khôi phục thay đổi cũ nằm trong [REPOSITORY_HYGIENE.md](REPOSITORY_HYGIENE.md).
