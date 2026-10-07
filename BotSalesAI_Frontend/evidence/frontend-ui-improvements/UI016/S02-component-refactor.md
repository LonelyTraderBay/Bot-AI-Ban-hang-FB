# UI016 — component ownership và readability

Ngày: 03/10/2026 · Phạm vi: `apps/web/src/modules/inbox`.

## Thay đổi đã thực hiện

- `ConversationComposer` nhận `Conversation` hiện hành và sở hữu reply/internal-note draft, send/note commands, eligibility, pending/error và submit. Lệnh gửi giữ `clientMessageId`, `expectedConversationVersion`, retry guard của command hook và chỉ xóa draft sau kết quả được xác nhận.
- `ConversationMessageList` nhận messages/timezone/callback và chỉ dựng message rows, escaped text, source references, timestamps và nút feedback; state feedback vẫn do `ConversationPanel` giữ.
- `ConversationContextPanel` sở hữu metadata read và assignment selection/command, đồng thời kiểm riêng quyền `customers.read`, `orders.write` và `conversations.assign`. Component ở cùng Inbox module; không thêm cross-module import hay shared abstraction.
- `ConversationPanel` tiếp tục sở hữu route detail query, message cursor/paging, URL/Back, takeover/release/resolve, feedback dialog và composition. `InboxPage`, route, API contract, query keys, permission mapping, preview flows và CSS behavior giữ nguyên.

## Số đo trước/sau

Cùng phương pháp TypeScript AST như inventory S01: tính source span của function/component; tính riêng số dòng dài hơn 1.500 ký tự.

| Đo lường | Trước | Sau | Kết quả |
|---|---:|---:|---:|
| `ConversationPanel` AST span | 11.348 ký tự | 9.562 ký tự | -1.786 / -15,7% |
| Dòng >1.500 ký tự trong Inbox source | 4 | 0 | -4 |
| `ConversationComposer` | — | 3.199 ký tự | ownership draft/send |
| `ConversationMessageList` | — | 2.074 ký tự | rendering thuần |
| `ConversationContextPanel` | — | 3.204 ký tự | metadata/assignment |
| Dòng >1.500 ký tự trong component file mới | — | 0 | không tạo hotspot dài |

Sáu component lớn nhất ngoài phạm vi vẫn còn trong inventory S01; UI016 không dùng việc giảm span làm KPI chất lượng hoặc refactor toàn repo.

## Hành vi và ranh giới

FE016 browser suite kiểm list/message cursor độc lập, URL/back/refresh, mobile composer, paging, send-once/resync, unknown send giữ draft và recovery, internal note an toàn, feedback, permission/context references, stale takeover, các source previews và cross-module flows. Full suite xác nhận tiếp 187 test Chromium trên built demo. Static source-map test được cập nhật để tìm operations/permissions trong entry và component file mới; các yêu cầu hợp đồng và permission assertions không bị nới.

Không có thiết bị mobile/native keyboard, browser zoom thật, screen-reader output hoặc owner review trong bằng chứng UI016. Những gate FE-G05/FE-G09 và manual checkpoints của UI012/UI015 vẫn giữ trạng thái mở độc lập.
