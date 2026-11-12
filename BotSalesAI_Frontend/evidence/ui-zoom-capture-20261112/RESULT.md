# Chụp lại ảnh zoom 200% — 12/11/2026

Phạm vi: source frontend hiện tại trong working tree, Chrome headed với profile tạm, dữ liệu demo/MSW tổng hợp. Đây là lượt kiểm tra mới, không tái tạo source của bốn lượt lịch sử.

## Quan sát và đối soát

- 16 ảnh W30 cũ của `form-error-short` và `inbox-long-composer`, tại focus và sau Tab trong bốn lượt 11/11, cùng SHA-256 `2d45f2588cd0ee131f78976fa651794a3ba79322062ff8d78574ba7a55b03be5`. Một mẫu đã được xem trực tiếp và chỉ hiện nền tối. Các file và JSON lịch sử được giữ nguyên; không dùng ảnh mới thay cho ảnh ở trạng thái source cũ.
- Đối chiếu 10 source input ghi trong từng JSON cũ: hai lượt baseline/final khác source hiện tại ở `inbox/index.tsx`; hai lượt post-inbox/screen-heading khớp 10 input được ghi. Mười input không bao phủ toàn bộ source ứng dụng, nên hai kết quả khớp đó chưa chứng minh toàn bộ snapshot source trùng nhau.
- Chạy lại collector W30 với ID `image-recapture-20261112`: năm kịch bản đều PASS theo các phép đo DOM, viewport, focus, lỗi trang và request của collector. Nhưng bốn ảnh 200% cho hai kịch bản nêu trên vẫn mang hash ảnh nền tối, nên PASS này **không chứng minh ảnh viewport hợp lệ**. [Bản ghi gốc](../frontend-ui-improvements/UI028/W30/actual-browser-zoom-200-current-image-recapture-20261112.json).
- Một phép thử clip Playwright với tọa độ cuộn dừng với lỗi `Clipped area is either empty or outside the resulting image`; `recapture/diagnostic.json` giữ trạng thái chưa hoàn thành. Lượt CDP clip trước khi nhân DPR cho ra vùng sai; ảnh `recapture-v3/` chỉ là chẩn đoán, không dùng làm bằng chứng viewport đúng.
- Lượt `recapture-v5` đặt và đọc lại Chrome native page zoom 200%, CSS viewport 640×360 và DPR 2. Clip Chrome DevTools dùng tọa độ cuộn và viewport nhân DPR, cho bốn ảnh PNG 1280×720. Trước và sau capture, viewport, DPR, scroll và loại phần tử focus được ghi trong [diagnostic.json](recapture-v5/diagnostic.json); ảnh đã được xem trực tiếp.

| Tình huống | Trạng thái | Ảnh mới trên source hiện tại |
|---|---|---|
| Form lỗi giá | Focus nút Lưu sản phẩm | [Ảnh](recapture-v5/form-error-short-focused-cdp-clip.png) |
| Form lỗi giá | Sau Tab, focus Góp ý màn hình | [Ảnh](recapture-v5/form-error-short-after-tab-cdp-clip.png) |
| Inbox nội dung dài | Focus ô trả lời | [Ảnh](recapture-v5/inbox-long-composer-focused-cdp-clip.png) |
| Inbox nội dung dài | Sau Tab, focus vùng Bối cảnh khách hàng | [Ảnh](recapture-v5/inbox-long-composer-after-tab-cdp-clip.png) |

Lệnh `node evidence/ui-zoom-capture-20261112/diagnose-capture.mjs` kết thúc 0; [log](recapture-v5-run.log). Ảnh mới cho thấy nội dung và trạng thái ở thời điểm hiện tại, nhưng phương pháp clip này chỉ được kiểm ở Chrome/DPR 2 và hai tình huống; không khẳng định tương đương cho trình duyệt, tỉ lệ, trạng thái hay thiết bị khác. Ảnh sau Tab của inbox cho thấy vùng đang focus bị cắt theo viewport; không từ đó suy toàn bộ khả năng truy cập đạt.

Sau cập nhật evidence: `node --test tests/ui-evidence-validator.test.mjs` 11/11, validator S17 PASS với trạng thái IN_PROGRESS và `node scripts/generate.mjs --check` PASS (15 outputs). `npm.cmd` không có trên PATH của phiên; các lệnh Node được chạy trực tiếp thay cho hai npm script tương ứng. Không chạy full `npm run verify`.

Dọn sau kiểm tra: một ảnh viewport trống do lần thử clip chưa hoàn tất tạo ra, không được `recapture/diagnostic.json` tham chiếu và trùng byte với ảnh chẩn đoán còn giữ, đã được chuyển vào Thùng rác. Năm profile Chrome tạm do các lượt diagnostic tạo cũng được chuyển vào Thùng rác sau khi kiểm không còn tiến trình dùng chúng; câu “profile retained” trong log mô tả thời điểm chạy, trước khi dọn.

## Giới hạn

16 ảnh lịch sử vẫn không cung cấp bằng chứng trực quan về nội dung của bốn snapshot trước. Bốn ảnh mới không bù đắp được baseline hoặc trạng thái source cũ. Kết quả không đóng S17, không xác nhận backend, hosted CI, screen-reader speech, thiết bị vật lý hoặc nghiệm thu. Các bằng chứng trước và các thay đổi chưa commit khác được giữ nguyên.


## Đối chiếu bốn source lịch sử — 12/11/2026

Dựng source trong thư mục tạm từ Git HEAD 10c2505f, áp dụng các phiên bản tệp có hash đối chiếu được, rồi chạy lại hai tình huống trên Chrome headed 157.0.8103.39 với native zoom 200%, demo/MSW và CDP clip như trên. Mỗi lượt khớp 106 fingerprint đầu vào được liệt kê trong [đối chiếu source](historical-source-recheck/source-reconciliation.json); package đã cài và worker hiện tại được dùng lại.

- **Baseline:** 106 đầu vào khớp baseline accessibility lưu trước lượt.
- **Final:** baseline cộng source customers có hash sau sửa; script accessibility ghi chỉ customers thay đổi so với baseline.
- **Post-inbox:** đối chiếu baseline trước sửa heading, ghi sau lượt post-inbox; source customers và inbox khớp fingerprint baseline đó.
- **Screen-heading:** từ baseline trước sửa heading, thêm thay đổi heading; byte source tái dựng khớp hash component được ghi ở baseline table-reflow sau đó.

Bốn lượt chạy mới đều tạo bốn ảnh nội dung; cả 16 ảnh mới trùng byte theo từng tình huống/trạng thái với bốn ảnh đã lưu ở mục trên, nên đã loại bỏ 16 bản sao mới sau kiểm tra byte, cập nhật đường dẫn trong bốn diagnostic và lưu [bảng đối chiếu bản sao](historical-source-recheck/deduplication.json). Mỗi lượt giữ riêng log, thông số viewport, focus, scroll và fingerprint.

Các fingerprint không chứng minh toàn bộ môi trường hoặc mọi tệp vào đúng thời điểm từng lượt gốc; với post-inbox và screen-heading, một phần đối chiếu dựa trên snapshot được ghi sau lượt. Chrome mới là 157.0.8103.39, trong khi baseline lịch sử ghi 157.0.8103.38. Vì vậy đây là kiểm tra tái dựng có giới hạn tại thời điểm mới, không phải ảnh lịch sử gốc; 16 ảnh trống và JSON lịch sử vẫn được giữ nguyên và coverage lịch sử vẫn OPEN. Không kết luận toàn bộ accessibility đạt từ ảnh chụp.
