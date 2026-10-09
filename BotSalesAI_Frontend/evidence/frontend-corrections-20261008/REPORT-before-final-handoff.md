# Hoàn thiện F01–F09 — 08/10/2026

Trạng thái: IN_PROGRESS. Scope: React/TypeScript Frontend với API MSW tổng hợp.

## Contract trước source edit

Baseline 106 source/package/script/config inputs khớp audit (0 drift), ghi tại baseline.json; bản sao trước sửa ở baseline/. Phép tái hiện và loaded render trước sửa ở reproduce-before.mjs, results.json và R1–R7/R9 screenshots. Bản ghi này không là kết quả sau sửa.

Owners: shared/api chịu request/command lifetime; shared/model chịu versioned draft và navigation guard; shared/ui chịu dialog/đối chiếu; module chịu field adapters và API contract; app chịu SSE scope. Consumers gồm customers/workspace/catalog/orders/procurement/notifications/inbox/fulfillment. Không đổi canonical API/tokens hoặc generated output bằng tay.

Expected: giữ baseline/version; 3-way comparison theo trường; danh sách nguyên khối; dirty/refetch/late-success giữ nháp; cancellation không callback thành công và vẫn nhớ outcome chưa rõ; mọi đường close qua dirty/busy; notes 4000; Inbox event không invalidate resource không liên quan. Tests phải chứng minh hành vi đúng, không dùng diagnostic assertion REPRODUCED làm acceptance.

## Bằng chứng và giới hạn

Các kiểm tra sau sửa sẽ ghi command/cwd/exit/hash, expected/observed và consumer impact. Source gate không thay browser proof. Hosted CI, screen-reader speech, Backend/provider/production và người dùng nghiệm thu không tự được ghi PASS.
