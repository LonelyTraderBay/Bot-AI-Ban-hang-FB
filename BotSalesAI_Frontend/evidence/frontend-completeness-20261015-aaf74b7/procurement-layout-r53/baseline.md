# Baseline trước khi sửa test bố cục Procurement

- Checkout/SHA: `main` / `7b5a9b2213859aed9937ff248ddd1bab905f5197`.
- Working tree: không có staged/tracked diff trước khi đo; có sẵn các bằng chứng untracked lịch sử, được giữ nguyên.
- Đối tượng: `tests/ui-procurement-layout.spec.ts`, bài kiểm tra gutter/overflow R44–R47 ở 320, 390, 768, 1280 và 1440 CSS px.
- SHA-256 source trước sửa: `4372f36b9be5eab023f419a03fdcf57c334b00ce6f6768779cff9b9251c19923`.
- GitHub run #53: `https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/38749389865`, Firefox 441/442; test này hết 180 giây khi helper chờ `main h1` trong điều hướng tại dòng 56. `npm run verify` đã qua; kết quả test không chứng minh lỗi React/API cụ thể.
- Consumer impact: chỉ Playwright test và S17 source fingerprint; không đổi React, route/API, fixtures, mock handlers hoặc business behavior.
- Giả thuyết cần kiểm chứng: chuỗi 20 lượt điều hướng cùng page tạo rủi ro tích lũy Firefox/MSW; tách page theo route sẽ giảm xuống 4 lượt tải mà vẫn đo cùng 20 tổ hợp.
- Kế hoạch đo: chạy spec hiện hành riêng trên Firefox trước sửa, rồi so với cùng spec sau sửa trên Firefox và Chromium; sau đó `npm run verify`.

- Local baseline run before editing: `npm run test:e2e -- --project=firefox tests/ui-procurement-layout.spec.ts --reporter=line` completed 2/2 in 53.5 seconds; the hosted 180-second Firefox timeout did not reproduce in this local run.
- After editing, `--project=firefox --project=chromium --repeat-each=3` completed 30/30 in 2.7 minutes. The R44–R47 matrix still checks 20 route/viewport combinations per pass; the separate dialog behavior test remains unchanged.
- The first `npm.cmd` invocation failed because the desktop process PATH measured 14,828 characters and the child could not resolve `node`; rerunning through the pinned Node 24.19.0 npm CLI with a bounded PATH completed successfully. This was environment setup, not a test or application failure.
