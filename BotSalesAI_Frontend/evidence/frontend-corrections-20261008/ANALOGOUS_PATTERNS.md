# Rà nguyên nhân liên quan trên 16 module

Đối chiếu AST và đọc các editor/command, effects, đường lưu/đóng trong 24 file; hash và dòng thực tại [patterns-current.json](patterns-current.json). Phạm vi là baseline/refetch/completion/guard/SSE/validation F01–F09, không phải cam kết không còn mọi loại lỗi.

| Module | Quan sát và xử lý |
|---|---|
| workspace | Shop/Privacy dùng baseline bất biến và PATCH trường đổi; Privacy kiểm số nguyên 1–36.500 và note 5–2.000. Job polling dọn interval; lifecycle query/command thuộc shared owner. |
| customers | Bỏ reset theo refetch; giữ snapshot/redaction, partial PATCH, late edits; create/update notes 4.000. |
| catalog | Product gồm ảnh/variants/options nguyên danh sách; Category giữ version, create identity và late edits; effect còn lại là debounce và unload guard. |
| orders | Đơn mới guard toàn dữ liệu, kể cả dòng thêm/xóa; editor dùng version gốc. Inline close được tái hiện rồi đưa qua EditDialog. Kiểm nhận hàng trả có cùng lỗi live-version nên đã chuyển sang baseline/đối chiếu nguyên danh sách. Quote/time effects chỉ vô hiệu báo giá cũ, không reset input. |
| procurement | Supplier bỏ hydration/refetch reset; partial PATCH và baseline/version; các command khác dùng snapshot được chọn. Shared dialog khóa nhập lúc chờ nếu consumer không bảo toàn late edits. |
| notifications | Policy PUT đủ payload theo version gốc; recipients nguyên danh sách; refetch giữ nháp. |
| inbox | Composer revision gồm text và loại tin; pending không cho gửi thêm; error/unknown giữ draft. ScopeEvents chỉ invalidate Inbox/read-model tổng hợp cho event đã biết. Scroll effect không chỉnh input. |
| fulfillment | Footer tùy biến gọi requestClose; cùng dirty/busy với icon/Escape/backdrop. Command snapshot/capability giữ nguyên. |
| finance | Editor phiếu nháp dùng editing.version được chụp lúc mở, không live query; không có effect reset draft. Dialog chờ khóa nhập để success-close không bỏ chỉnh sửa vừa nhập. Filter effect chỉ đồng bộ URL. |
| knowledge | Knowledge edit/revision dùng edit.version snapshot, không copy refetch vào draft. Pending content được khóa qua shared dialog; published revision vẫn do API/mock quyết định. |
| bot | Bot/role editor dùng editing.version snapshot; không có effect refetch reset. Shared pending content bảo vệ input trước success-close. |
| integrations | Form/command state do mở dialog đặt; không có effect reset theo query. Chờ command khóa content và dùng lifecycle shared. |
| inventory | Effect đồng bộ warehouse/variant từ URL là filter. Editor reorder giữ selected snapshot; không có refetch-copy draft. Command/dialog chịu guard chung. |
| operations | Effect debounce search người nhận; không reset draft theo server. Shared pending/dialog/lifecycle áp dụng; không tạo API lịch bản tin còn thiếu contract. |
| reports | Effect chuẩn hóa ngày/query và timezone cho filter, không write editor. Các aggregate có invalidation cho Inbox event liên quan; unknown/gap/reconnect full resync. |
| marketing | Read/aggregate và action theo contract; không có effect refetch ghi đè editor. Shared command lifetime và dialog guard áp dụng. |

## Các sửa bổ sung có bằng chứng

- Unicode F08: [probe trước sửa](F08-unicode-before.json) xác nhận 4.000 emoji hợp lệ theo canonical nhưng Customer Zod từ chối vì đếm UTF-16. Đã chuyển validation, bộ đếm và giới hạn nhập cùng pattern ở 13 module (workspace, customers, catalog, inventory, orders, finance, knowledge, bot, integrations, operations, notifications, fulfillment, procurement) sang code point; giữ nguyên các giới hạn số hiện có, không đổi contract. Danh sách/array và kiểm rỗng giữ cách đếm hiện hành. Unit đối chiếu schema thật, browser create/update/privacy kiểm emoji tại biên và không gửi request khi dữ liệu sai. Source trước sửa được lưu nguyên byte trong unicode-baseline; audit AST sau sửa ghi tại string-length-audit-after.json.
- Đóng inline editor đơn: [probe trước sửa](order-close-before.json), regression footer/late edits sau sửa trong suite sở hữu.
- Reload bị hủy: regression native beforeunload phát hiện MSW đóng client quá sớm. Demo chặn cleanup của lần rời trang bị guard; điều hướng bình thường dùng cleanup MSW. Trace Firefox ghi registration còn tồn tại nhưng controller của document mới không có; MSW 2 gọi reload trong trạng thái đó, tạo vòng lặp. Khởi tạo chỉ unregister đúng mock registration không có controller, rồi để MSW đăng ký/activate/claim document mới; bỏ stop/restart bổ sung tại pagehide. Suite startup đạt 4/4, gồm 54-route axe và F06 normal navigation/canceled reload trên cả hai engine, source drift 0. Probe 8 lượt GET session đều 200 còn ghi sáu console lỗi của request khi rời trang; probe strict vẫn exit 1, không được đổi thành PASS. Trace và các thử nghiệm thất bại được giữ. Không sửa vendor worker, dependency hoặc thêm fallback mock vào production.
- Success-close trong dialog không hỗ trợ late edits: content inert khi busy mặc định; chỉ editor dùng versioned draft bật allowEditsWhileBusy. Hai nhánh có rendered contract; category/order có browser late-edit regression.
- Focus Select và title/close ở zoom: lưu ảnh đo trước/sau, theme dùng focus tokens; title dùng flex flow có kiểm overlap thật.

Inbox có giới hạn nhập động 10.000/20.000, ConfirmDialog dùng ngưỡng lý do chung, và hai bộ đếm hàng trả cũng đã chuyển sang code point. Regression gửi 6.000 emoji ghi chú nội bộ kiểm payload thật và nội dung gõ tiếp; rendered contract của ConfirmDialog kiểm ngưỡng 4/5 emoji. Audit cuối bao gồm module và shared owner.

Các probe REPRODUCED, lần chạy thất bại và lần dừng để sửa source giữ lịch sử. Chỉ full run trên source cuối được dùng để đóng gate.

## Đồng bộ thao tác trong regression fulfillment

Full run corrections-1791438920536-6264: Chromium 277/277; Firefox FE013.AC01–AC04 timeout tại bước click sau fill SKU. Lượt này bị dừng và giữ trạng thái thất bại; không cộng kết quả targeted vào full run. Trace gốc được lưu trong [fe013-full-failure/trace.zip](fe013-full-failure/trace.zip).

Snapshot call@4626 action (1721023.343) xác nhận content còn inert và input disabled; snapshot after (1721037.283) xác nhận input đã enabled nhưng giá trị vẫn rỗng. HTTP 200 nhận phiếu xuất hiện trước khi useCommand hoàn tất refetch. Regression đã chờ footer Đóng enabled và textbox editable trước nhập, rồi assert giá trị đúng; cùng bước chờ sau partial pick và trong unknown-handover setup. Giữ nguyên mọi assertion phiên bản, idempotency, 412/422, lượng hàng và số request. UI khóa nhập khi command chờ vẫn giữ nguyên.
