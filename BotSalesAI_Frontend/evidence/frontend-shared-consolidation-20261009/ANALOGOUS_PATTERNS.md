# Đối chiếu cùng pattern — Shared consolidation 09/10/2026

Phạm vi lấy từ source/import và route manifest, không suy từ screenshot: 54 route IDs / 16 module; Toolbar impact graph có 23 route consumers. Inventory và export snapshot hiện hành được sinh bởi các helper sở hữu trong thư mục này; các con số có log/hash riêng.

| Pattern | Quyết định và căn cứ |
|---|---|
| Bộ lọc ngoài Toolbar boundary của Inbox | EDIT R05/R06: dùng Toolbar.filters + FieldGroup flush, giữ handlers/URL/cursor/query/draft. Regression structural trước sửa thất bại vì thiếu owner marker; không diễn giải thành lỗi geometry chưa đo. |
| Primary CTA Dashboard trùng chrome | EDIT R04: descriptor local theo operations.read → orders.read → null; một Link, CTA tạo đơn độc lập. Tám permission tuples chạy bằng SessionResponse hợp lệ, không sửa catalog quyền. |
| Các Toolbar consumer còn lại | KEEP: graph consumers chạy regression; Products lookup và Inventory apply/reset có semantics riêng, giữ owner hiện có. |
| KPI inline links / download anchor | KEEP: nội dung inline và download khác primary hero action; gộp thành CTA chung không có lợi ích được chứng minh. |
| AuthCard, composer, messages, DraftForm, SVG chart và app guards | KEEP: owner workflow/behavior theo catalog; số Shared imports không buộc mọi node thành Shared. |
| PartialDataNotice / CapabilityUnavailable | KEEP conditional, zero production consumer có lifecycle rationale và render contract. Không tạo consumer giả. |
| Tiêu đề trong hội thoại | EDIT component h2/h3 với cùng typography variant. Axe mới xác nhận default h6 bỏ cấp trên R06; sửa các tiêu đề cùng pattern tại module Inbox. |
| Inbox list ellipsis ở text-only 200% | KEEP theo SPC-051 sau kiểm native Enter tới từng detail: exact full name/preview được render không clipping. Collector chỉ phân loại nowrap+ellipsis tại list link hợp lệ, có recovery proof cho từng giá trị; mọi clip chưa chứng minh vẫn FAIL. Các raw FAIL/ERROR được giữ. |
| Count trong SPC-067 / current plan | EDIT wording theo mọi public API/export discovery; bỏ count cứng trong contract assertion. Snapshot 27 lịch sử được đánh dấu rõ, số export thật hiện 28. |
| Demo conditional asset qua MSW | EDIT Vite demo serve GET script/style: actual Firefox304 không body làm mất export. Giữ live/non-asset/HEAD/build caching; regression trước/sau và full run riêng. |
| Outlined label dài/text-only200% | EDIT Shared theme: normal flow, meta12px, labelAfterGap4px, không notch/transform; pointer-events:auto giữ focus qua click nhãn rỗng/có giá trị. Rà native geometry ở54 routes×2 widths và giữ raw failures; trạng thái không có trường ghi số nhãn0. |
| Hàng search và demo tools | EDIT Shared Toolbar wrap/minimum theo chữ; layoutSx.shell.demoControl sở hữu geometry, bỏ consumer widths cứng. Không cho nonzero flex-basis chiều dọc trên mobile. |
| Product variant row R10/R11 | EDIT owner có width0 đo được: FieldGroup wrap, ba TextField có bounded text-relative minimum/basis. Giữ catalog business values/register/validation và kiểm bản nháp qua thêm/xóa biến thể. Không đổi default wrap của toàn bộ FieldGroup. |

Đây là quyết định cho batch, không tạo spacing scale, public Shared API, dependency hoặc tracker cạnh tranh. Kiểm keyboard/axe/reflow/native chỉ chứng minh assertions và states đã chạy; full runtime coverage và FE freshness có records riêng.

- EDIT_VERIFY: Inbox thread/composer flex minimum — xác nhận cả hai engine. Header giữ nội dung, message pane co trong desktop650px; composer dài có scroll riêng để tab tới action. Mobile không áp dụng khung650px. regression giữ draft và keyboard khi chữ gấp đôi; bổ sung native text200 desktop1600, không che FAIL ở full attempt03.

- EDIT_VERIFY bổ sung native readability: vùng lịch sử không được co chỉ còn padding khi nháp dài/chữ200%. Owner dùng minimum6em theo chữ; giữ composer scroll riêng/Tab/draft. Regression đọc được tối thiểu1 dòng và native geometry đánh dấu FAIL nếu viewport nội dung nhỏ hơn line-height thực tế. Trước sửa2FAIL được giữ.

- EDIT_VERIFY: Imports regression still measured floating-label offsets. Actual label/field boundary remains24px; assert field24px, label24px, label→input4px, static/no-transform and no overflow. Keep the minimum clearance across every Shell route, remove obsolete floated wording. Raw before2FAIL and full attempt05 remain historical failures.

- EDIT_VERIFY composer action ownership: form-wide scrolling relied on native focus scrolling and failed on Firefox. Separate input/error/mode scroll body from non-shrinking action row. Keep history6em minimum and existing padding/gap roles. No sticky overlap; prove bounds before Tab, hit-testing, Shift+Tab and draft retention, native text200 and full owner cases.
