# UI027/S01 — Baseline production chunk và route preview

**Ngày:** 05/10/2026 · **Scope:** `FRONTEND_WITH_SYNTHETIC_MOCK_API` · **Owner:** Codex

## Baseline source và kết quả quan sát

- `apps/web/vite.config.ts` trước sửa: SHA-256 `73384f107fe348c120f479138038177f0d71db511fce2a90b6f111fb6f01dca9`. FE025/S05 current-source record có cùng hash, xác nhận số đo browser cùng trỏ tới config trước sửa này.
- Production verify trên source baseline ghi chunk lớn nhất `738.39 kB raw / 186.88 kB gzip`; Vite dùng cảnh báo mặc định 500 kB. Nguồn: [FE024 verify](../../../botsales-kit/execution/frontend-evidence/FE024/npm-verify-after-security-update-current-20261004.log).
- Module instrumentation trên cùng Vite 7.3.6/production config xác định `react-dom-client.production.js` chiếm 531,161 byte rendered trong chunk entry; ba generated contract JSON `schemas.json`, `operations.json`, `routes.json` lần lượt 145,380 / 76,789 / 70,574 byte; `i18next` 79,299 byte và Ajv/fast-uri khoảng 100 kB trong các contributor lớn. Đây là nguyên nhân xác định được của chunk entry lớn, không phải phỏng đoán từ tên file.
- Nhóm lớn khác đã ở route/vendor chunk riêng: Reports + Recharts `325.94 kB raw / 100.05 kB gzip`; MUI `322.13 kB raw / 97.72 kB gzip`.

## Cùng-môi-trường demo baseline

Nguồn: [FE008 full E2E](../../../botsales-kit/execution/frontend-evidence/FE008/S05-e2e-rerun-current-20261004.log) và [FE025/S05 performance capture](../../../botsales-kit/execution/frontend-evidence/FE025/S05-current-responsive-performance-20261004.log). Cả hai dùng built `apps/web/dist-demo`, 1280×720, Chromium 153 / Firefox 155.

| Đo | Chromium 153 | Firefox 155 | Ngưỡng/ý nghĩa |
|---|---:|---:|---|
| Initial-route gzip | 449,927 B | 449,927 B | Budget local 500 KiB |
| Largest demo chunk | 742,030 B / 188,083 B gzip | 742,030 B / 188,083 B gzip | Largest gzip budget 200 KiB; raw entry cần chia |
| `DOMContentLoaded` / `load` | 66 / 66 ms | 100 / 100 ms | Một lần đo/browser; local preview, không phải SLO |
| FE025 dataset page-ready | 340 ms | 411 ms | Dataset tổng hợp 1,004 khách, 20 row/page |

Baseline đạt gzip budgets hiện hữu nhưng entry raw vượt 500 kB; mục tiêu UI027 là giảm kích thước chunk lớn nhất mà không tăng các budgets, không đổi `chunkSizeWarningLimit`, không biến log local thành device/CDN/SLO claim.
