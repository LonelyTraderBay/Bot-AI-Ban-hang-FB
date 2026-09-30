# BotSales AI 2.1.1 — bắt đầu tại đây

**Mục tiêu:** đội vận hành bốn vai trò AI cho shop Facebook; chủ shop tập trung marketing. Gói này gồm đặc tả, demo bấm thử, kế hoạch và bộ theo dõi. Không có backend sản phẩm đã hoàn thiện hoặc thông báo điện thoại thật trong gói.

## Dùng với repo
Giải nén, đổi tên folder ngoài thành `botsales-kit` và đặt cạnh source dự án (ví dụ `my-project/botsales-kit/`). Đừng giải nén chồng vào root đang có AGENTS/AI_RULES. Mở repo bằng AI lập trình có quyền đọc/ghi/chạy test; gửi nội dung PROJECT_BUILD_PROMPT_VI.txt. AI bắt đầu T001 hoặc resume tracker. T001–T006 là khởi động có bằng chứng, không người dùng tự điền mẫu.

## Các file chính
- IMPLEMENTATION_PLAN.md: toàn bộ 84 task/420 bước, thứ tự, phụ thuộc, vùng sửa và tiến độ hiện tại.
- execution/PROGRESS.html: bảng tiến độ mở bằng trình duyệt; sinh lại sau cập nhật tracker. Bản đầu 0% ứng dụng thật.
- execution/plan.json: task canonical, trọng số/dependency không sửa để làm % đẹp.
- execution/progress.json + evidence/: tiến độ và log bằng chứng do AI duy trì.
- docs/: 28 tài liệu nguồn (00–27), contracts/: API/routes/feature/permission/state.
- prototype/index.html: demo review có dữ liệu giả, không API thật. Thay đổi trong tab; góp ý có export.
- AI_RULES.md: Universal 3.1 giữ nguyên; AI_RULES_PROJECT.md là phần riêng.

## Lệnh có sẵn, chạy tại folder kit
```bash
node scripts/progress.mjs validate
node scripts/progress.mjs status
node scripts/progress.mjs next
node scripts/progress.mjs report
node scripts/validate-kit.mjs
```
Lệnh kiểm code sản phẩm sẽ được xác minh/tạo ở T005–T012, không có sẵn chỉ vì plan ghi `pnpm test:e2e`. Công cụ tiến độ chạy với Node có sẵn (đã kiểm Node 22 trong môi trường bàn giao; runtime app mục tiêu chốt Node LTS ở T003).

## Đừng hiểu nhầm
Có tài liệu không đồng nghĩa AI tự chạy khi đóng phiên. AI cần môi trường code và công cụ thực sự; tài khoản Meta/provider/thiết bị và phép triển khai phải được cấp đúng gate. 100% checkpoint cũng không tự là quyền phát hành. Theme dark-only đã chốt, không hỏi lại hoặc thêm light. Bộ cũ chỉ được lưu read-only trong reference/, không là kế hoạch song song.

## Màu chính thức và phiên bản

Gói **2.1.1** tiếp nhận **Graphite Gold dark-only** đã duyệt trong `design/decision.json`. Token vẫn phiên bản **2.1**, HEX giữ nguyên; API **2.0.0**, phạm vi/kế hoạch nghiệp vụ **2.0**, Universal **3.1** không bị nâng giả chỉ để trùng số phiên bản. `release.json` giải thích từng miền phiên bản.

Đọc `DOCUMENT_INDEX.md` để tìm nguồn chuẩn, `UPGRADE.md` trước thay bộ cũ, và `RELEASE_NOTES.md` để biết điểm đã sửa. Hướng dẫn task đã đồng bộ nhưng không đổi 84 việc/420 bước hoặc cộng tiến độ sản phẩm. Chỉ một kit được chỉ định hiện hành trong repo; archive/reference không là nguồn màu hay kế hoạch đang chạy.
