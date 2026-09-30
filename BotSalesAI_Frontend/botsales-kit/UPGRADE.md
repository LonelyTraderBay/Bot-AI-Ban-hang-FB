# Tiếp nhận bộ chuẩn 2.1.1 mà không mất tiến độ

## Dự án mới hoặc chưa có code/tiến độ
Giải nén cả folder, đặt tên `botsales-kit` cạnh source dự án. Chỉ định folder này là nguồn hiện hành qua hướng dẫn gốc phù hợp. Không chép đè root AGENTS.md/AI_RULES.md. Gửi PROJECT_BUILD_PROMPT_VI.txt cho AI có quyền làm việc; bắt đầu T001. Dùng prototype/index.html để xem lại, không lấy làm source sản phẩm.

## Repo đã dùng 2.0/2.1 và có thay đổi riêng
1. Xác minh revision/diff và người đang ghi; sao lưu nguồn kit hiện hành, progress, evidence, handoff, owner-inputs, command-map và các thay đổi riêng. Không reset/clean/stash hoặc chép ZIP chồng tùy tiện.
2. Giải nén bộ mới sang vị trí staging riêng. Đối chiếu token: bản 2.1.1 giữ nguyên byte `design/tokens.json` của 2.1. So sánh `reference/baseline-v2.1-hashes.json`, `execution/design-adoption.json` và source thật; repo 2.0 cần migrate palette theo docs/03,19.
3. Cập nhật tài liệu/governance/generator và nguồn màu trong phạm vi cho phép. Giữ Universal nguyên bản. Không tạo hai nguồn token chỉnh tay; ánh xạ package sản phẩm như design/IMPLEMENTATION_NOTES.md.
4. Plan mới chỉ bổ sung read-first/điều kiện màu, làm rõ progressRule và T010. Giữ task ID, step ID, priority, dependencies, phase/step weights. Nếu plan repo đã đổi phạm vi, cần reconcile thực; không tự lấy plan của ZIP thay mọi tùy chỉnh.
5. Giữ nguyên task states/owner/history/sourceRootRelative và file evidence thật. Mở các task UI trong execution/design-adoption.json; bản đã làm cần đối chiếu tiêu chí mới. Có thay đổi source thì invalidate đúng task/bằng chứng liên quan bằng cơ chế tracker, không giả PASS. Việc bổ sung tiêu chí chưa được kiểm không tự được xem là đạt chỉ vì hash source không đổi.
6. Sau review diff và quyền tiếp nhận thật, ghi adoption record của repo: hash plan cũ/mới, các tiêu chí ảnh hưởng, cách giữ/kiểm lại bằng chứng, owner và lý do. Cập nhật planSha256 trong tracker một lần như thao tác rebaseline được kiểm soát; không chạy helper đổi hash mù quáng để vượt cổng. Không có lệnh migrate tự động trong gói vì chưa biết tiến độ/tùy chỉnh repo của bạn.
7. Chạy generate/check/validator của gói và test ứng dụng đúng phạm vi; sinh lại báo cáo, xác minh tiến độ không tăng nhờ demo. Cập nhật root loader tới một nguồn hiện hành; cất bộ cũ ở archive rõ ràng, không để AI tự chọn giữa hai bộ cùng hiệu lực.

## Các phiên bản cố ý không cùng số
Gói 2.1.1; token/palette 2.1 không đổi; API 2.0.0; baseline nghiệp vụ/kế hoạch 2.0; Universal 3.1. Đây không phải lệch tài liệu: `release.json` là bảng ánh xạ phiên bản. Lịch sử/reference và báo cáo chạy ở bản cũ được giữ nguyên, không sửa ngày/version để giả như vừa chạy.

## Kiểm tra tại thư mục kit
```bash
python scripts/generate-theme.py --check
python scripts/sync-release.py --check
node scripts/progress.mjs validate
node scripts/validate-kit.mjs
python scripts/validate-release.py
```
Các kiểm tra này không kết nối Meta/AI, gửi thông báo hay triển khai hosting. Chúng không thay test sản phẩm hoặc cấp quyền phát hành.
