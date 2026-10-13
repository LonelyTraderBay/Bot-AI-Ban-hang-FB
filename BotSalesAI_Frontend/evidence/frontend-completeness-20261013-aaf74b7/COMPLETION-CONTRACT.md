# Hoàn thiện Frontend/mock theo yêu cầu 13/10/2026

Người dùng xác nhận: “Hoàn thiện code Frontend/mock và kiểm chứng đầy đủ”. Baseline source ở `source-measurements.json`; lượt full E2E baseline phải kết thúc trước khi sửa source. Không dùng 95,54% API references làm tỷ lệ hoàn thành nghiệp vụ.

## Phần còn lại có thể thực hiện

- C10: đối chiếu đủ các acceptance trong contract C10 với source và các test Marketing, Pager, date-only, queue, forms, feedback, empty; bổ sung regression nếu thiếu. Giữ các sửa C10 đã có.
- Pager hiện chỉ giới hạn 100 bộ lọc, chưa giới hạn số cursor trong một bộ lọc. Chốt giới hạn 100 cursor gần nhất/bộ lọc, giữ nút về đầu và không bịa trang trước đã bị loại. Negative regression đi 125 trang rồi quay lùi để đo đúng giới hạn này. Đây là giới hạn bộ nhớ local, không đổi API/page size.
- C11: sửa isolation artifact Playwright nếu tái hiện lỗi config runner/worker dùng run ID khác nhau; giữ log thất bại đầu tiên.
- Bổ sung các luồng đọc chi tiết có ý nghĩa theo manifest: phiên bản bot, đánh giá, kết nối kênh/AI, membership, thông báo và yêu cầu sau bán. Chỉ đọc khi người dùng mở đối tượng, qua `useApi` và `QueryState`; không fetch từng dòng, không dùng row snapshot để giả dữ liệu detail từ API.
- Lịch sử lệnh tại trang Công việc hôm nay: chỉ hiện khi có `jobs.read`, cursor riêng, trạng thái từ API, không suy đoán lệnh đã thành công hoặc tự mở khóa intent.
- Chạy full verify, full Chromium/Firefox E2E và built demo cuối, refresh các ma trận bằng generator owner, tái kiểm từng checkpoint FE theo dependency và acceptance của chính task.

## Owner và consumer impact

`shared/ui/README.md`, workflow SPC-001–075 và UX-CONTRACT là nguồn chuẩn. Tái dùng `EditDialog`, `QueryState`, `DetailLine`, `SurfaceContent`, `DataTable`, `Pager`, `Status`. Không đổi token/theme/shared API. Consumer bị tác động: bot R26/R28; integrations R29/R30; workspace R32; notifications R39; customers R54; operations R37. Mỗi luồng kiểm read success/error/forbidden/not-found/loading, close/reopen/focus, viewport nhỏ/lớn; các mutations hiện hữu giữ nguyên hợp đồng.

## Ranh giới bắt buộc

Phép thử tại bản cài sạch đã phát hiện vùng cuộn của dialog chỉ đọc không nhận được focus bàn phím. Sửa tại `EditDialog`: content là region có tên theo title và nhận focus; giữ API public, dirty/busy/restore focus. Heading của tiêu đề thông báo dùng cấp h2 trong list và h3 dưới h2 của dialog. Test mới kiểm keyboard End cuộn thật, axe nguyên quy tắc, focus return và geometry; trước/sau giữ trong `cold-detail-r1`/`r2` (lượt đầu 47/64, lượt sửa 64/64).

Lịch sử command của mock một actor `user-demo` lọc thêm quyền mutation gốc từ operation catalog; GET từ chối loại lệnh không có contract/quyền xác định và ID khác shop. Đây là mô phỏng bảo thủ; server thật vẫn phải kiểm actor/object/field ownership. Không dùng việc xem lịch sử để tự reconcile hoặc mở khóa unknown intent.

FE009.S03 và KNOWN_GAPS yêu cầu không tạo password step-up trái OIDC. `stepUp` và `approvePrivacyRequest` giữ unavailable/chờ phê duyệt; không thêm đường tắt để tăng coverage. Hợp đồng này không giải quyết policy authentication/deletion chưa có ADR.

Narrator speech, owner acceptance, Backend/provider, hosted CI và production không được tự ghi PASS. Full-product ledger chỉ đọc. Mọi evidence cũ được giữ như lịch sử; source mới dùng hash/log thực. Không commit/push/deploy trong lượt này.
