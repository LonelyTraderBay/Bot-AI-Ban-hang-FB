# Đồng bộ fixture theo completion thật

Revision trước sửa c9d2a5816206aac80d906af68073d6a088a8f489. Run 38018575283 ghi Firefox FE021 counter GET marketing Expected 0 / Received 1 sau reload; Chromium F08 aria-invalid mong true nhưng false sau PATCH đầu. BASELINE.md giữ vị trí, giá trị quan sát và giới hạn trước sửa.

Marketing fixture trước chỉ chờ input lấy từ URL nên có thể bắt đầu đếm trước GET reload. Probe giữ request thật rồi thả sau khi listener đã bắt đầu: cả hai browser ghi 0→1 là GET kỳ hợp lệ ngày 18–24/09/2026, bucket week; không có GET cho khoảng sai, URL applied và alert vẫn đúng. Fixture nay chờ response GET đúng kỳ/200 và chart trước khi đếm submit sai. Counter vẫn so sánh bằng nhau; thêm URL request vào thông báo lỗi và kiểm URL applied giữ nguyên.

F08 local trước sửa ghi một FAIL / ba PASS; textarea của ca lỗi vẫn là n×2000. PATCH HTTP 200 chưa là completion của useCommand, vì còn refetch và editor.committed. Fixture nay chờ status đã lưu, giá trị đã lưu và button disabled trước nhóm validation độc lập, kể cả các vòng Unicode sau. Probe giữ refetch sau save, nhập bốn emoji rồi thả: hai browser giữ chỉnh sửa mới, aria-invalid=true và thông báo chưa lưu phần mới. Phép thử đó xác minh phase có điều khiển; không tự coi là audit mọi race của editor.

Không đổi app source, hook, API/schema, validation, ngưỡng, request counter, timeout, retry hoặc style. Các response được chờ theo predicate thực, không sleep. Raw hosted trace/query của lần marketing FAIL chưa có khi chuẩn bị commit; provenance gốc ở run/job nêu trong baseline. Probe local chứng minh đúng lỗi attribution của fixture, không gán param cho raw request hosted chưa đọc.

## Gate nguồn cuối

| Kiểm tra | Kết quả |
|---|---|
| Probe reload trước sửa fixture | Hai browser tái hiện misattribution; exit 1; invalidRequests=[] |
| Probe chỉnh dở khi save đang refetch | Hai browser PASS, giữ bốn emoji và validation |
| F08 trước sửa | 1 FAIL / 3 PASS; giữ trace |
| F08 sau sửa | 6/6 PASS, ba lượt mỗi browser |
| Marketing/pending/invalid URL/empty | 10/10 PASS, hai browser |
| Verify/S17 nguồn cuối | PASS exit 0; 275 fingerprint và ba log khớp |
| Domain/network / unit | 117/117, 238/238 PASS |
| Composition / layout / validator | 41/41, 86/86, 11/11 PASS |
| Discovery | 406/project, 69 file/project; 812 E2E tổng |

Các capture trước chỉnh F08 được giữ riêng, không dùng làm gate nguồn cuối. Hash log/JSON/screenshot/trace và source scope được ghi trong local-validation.json trước commit. Các báo cáo và raw FAIL cũ giữ nguyên là lịch sử.

Commit 32: 9d8ad95e6524ab7cf4cd8124ed77c1bd3c7c54c7, P1 hai fixture theo completion. Commit 33: P2 baseline/probe, raw before/after, gate/manifest và báo cáo này. SHA báo cáo lấy từ Git history. Hosted của SHA sau push PENDING_AT_COMMIT; chỉ xác nhận bằng run thật. Phạm vi Frontend/mock; không tái chứng nhận canonical FE receipts, owner, screen-reader speech hoặc Backend/production.
