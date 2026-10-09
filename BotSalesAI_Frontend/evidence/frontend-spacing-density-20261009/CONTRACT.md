# Contract của đợt thu gọn spacing — 09/10/2026

Yêu cầu đã duyệt: triển khai đề xuất thu gọn theo vai trò, theo thứ tự ưu tiên đến hoàn tất kỹ thuật local. Nguồn quy định duy nhất vẫn là `docs/FRONTEND_SPACING_STANDARD.md`; thứ tự/trạng thái ghi tại UI plan §16.6/§16.20. Hồ sơ này ghi quyết định và bằng chứng của lần sửa, không là spacing map hay tracker riêng.

## Invariant

- Giữ canonical scale/base8, tokens/API/dependency/permissions/business data; bảo vệ dirty baseline và full-product ledger.
- Đệm vận hành gọn hơn tại Shared owner; các vùng đọc/xác nhận giữ named variants có consumer thật. Parent gap/surface inset/child internal vẫn một owner.
- Bảng không fixed row height; action hit area/text/wrap/focus còn đủ. DetailLine có divider giữ semantic atomic row; dividedRows không cộng gap ngoài row inset.
- Form phức tạp giữ gap16 mặc định; compact12 chỉ dùng ở form đơn giản đã rà. Dialog xác nhận và đối chiếu giữ comfortable; ordinary editors dùng compact inset16.
- Demo warning luôn hiện, controls thu/mở trên mọi viewport, trạng thái được tóm tắt và giữ khi thu. Disclosure không hủy requests/draft/selection; keyboard/aria/restore focus được kiểm.
- Không ép mọi width/height thành spacing token; Inbox history/composer scroll ownership, query state và chart geometry giữ invariants hiện hành.

## Baseline/impact/verification

`capture-density.mjs before` lưu source và loaded route evidence trước source edit: 54 routes × small/large × Chromium/Firefox. Full impact gồm Shared owners và closure của tất cả routes/modules; tests/checkers/catalog/normative docs là source bị ảnh hưởng. Các consumer không sửa phải có KEEP rationale qua inventory và current renders, không suy ra từ file count.

Sau source: finite API negative/positive fixtures, targeted tests từng wave, all route paired geometry, axe/keyboard/reflow, native zoom/text theo owner impact; generate/full verify/full Chromium+Firefox E2E/production+demo/built-demo. Các lần FAIL giữ nguyên, không cộng targeted PASS thay full run. Logs/current hashes/receipt được sinh bằng công cụ sở hữu. UI sẵn sàng nghiệm thu local chỉ khi mandatory proofs còn hiệu lực; human speech/hosted CI/user acceptance ghi theo quan sát.
