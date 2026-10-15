# Kiểm chứng local cho sửa readiness UI006/C06 — 15/10/2026

Phạm vi là bộ Frontend React/TypeScript chạy với dữ liệu tổng hợp qua mock API. Mã ứng dụng, API, hợp đồng và mock handler không đổi; chỉ sửa đồng bộ của hai bài Playwright với trạng thái browser.

GitHub run #52 trên SHA `3d741ff7f03a6fc3279a611cc61c5c9b30d55b5f` đã chạy Chromium E2E và built-demo thành công. Firefox attempt 3 hoàn thành 442 bài, đạt 440 và lỗi hai bài: C06 kiểm tra opacity chính xác trước khi animation kết thúc; UI006.C05 chờ nút lookup hết trạng thái tải trong 10 giây. Attempt 2 Firefox bị runner shutdown. Trace UI006 cho thấy response cuối từ `supplier-offers` là HTTP 200, 18 bản ghi, `hasMore=false`, trong khi nút vẫn hiển thị “Đang tải…” khi assertion hết hạn. Artifact: [Firefox run #52](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/38711963723), artifact `11977597158`.

C06 vẫn yêu cầu dialog hiển thị và đợi hiệu ứng mở hoàn tất tối đa 15 giây trước khi chạy Axe. Ảnh chụp chuyển sang thư mục output riêng của Playwright để chạy lặp không ghi đè bằng chứng lịch sử. UI006 kiểm tra HTTP thành công, response body hoàn tất không lỗi và đợi nút lookup sẵn sàng tối đa 30 giây; các assertion tìm bản ghi và tạo đơn vẫn giữ nguyên.

Kiểm thử mục tiêu trên Windows/Node 24.19.0:

- UI006.C05 Firefox lặp: 5/5.
- C06 Firefox lặp: 3/3; phiên bản cuối sau khi cô lập output ảnh đạt 1/1.
- C06 và UI006.C05 cùng chạy Firefox: 2/2.
- C06 và UI006.C05 cùng chạy Chromium: 2/2.
- `npm run verify`: exit 0. Generator: 15 outputs, 346 schemas, 245 operations, 61 routes; source: 85 files, 271 API calls, 61 routes; boundaries: 723 imports, 10/10 negative fixtures; domain: 117/117; Vitest: 242/242; production build: 2.077 modules; layout: 86/86, 93 source files, 0 findings, 1 exception; visual token: 5/5, 92 files, 0 findings; composition: 41/41, 91 source files, 0 findings; S17: 11/11 với 280 fingerprint hiện hành.

Log lặp và full verify nằm trong thư mục này. Những lượt local xác nhận hành vi frontend/mock; workflow GitHub đầy đủ trên SHA sửa đang chờ sau push. Backend trong repository vẫn là placeholder rỗng; kết quả này không chứng minh runtime backend, staging, production hoặc owner UAT.
