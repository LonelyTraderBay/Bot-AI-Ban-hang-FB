# Đối chiếu các vị trí cùng nguyên nhân — A01–A07

Nguồn finding trước sửa: [component audit](../frontend-component-risk-audit-20261008/REPORT.md). Thứ tự/trạng thái duy nhất ở [plan §16.6](../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status). Đây là giải thích phạm vi, không phải tracker khác.

| Pattern | Owner đã sửa | Phạm vi được đối chiếu / invariant giữ lại |
|---|---|---|
| Row mặc định stretch kéo action theo helper | Orders DraftForm; Imports mapping | Alignment hữu hạn xs stretch/sm start tại consumer đúng intent. Không đổi mặc định column full width của FormFields/FieldGroup và không thêm height cố định. Tạo/chỉnh sửa, clean/error, thêm/xóa dòng và giữ nháp có regression. |
| Căn wrapper nhiều tầng thay vì mặt trường | ProductEditor R10/R11 | Lookup search tách hàng, category/status cùng hàng trên desktop; metadata giữ dưới category. Paging/search/selected retention/RHF/conflict/quyền giữ nguyên, được kiểm lại trong full suite. |
| Tiền nowrap ngoài bảng | Amount: 48 calls, 21 ngoài table + 27 trong table | `wrap` hữu hạn opt-in cho 21 ngoài bảng. Tiền trong column.render giữ chuỗi liền trong vùng scroll có tên. Source test dùng TypeScript symbols chống call-site mới thiếu intent. Không chuyển Decimal sang Number hoặc rút gọn giá trị. |
| Chip stretch theo paragraph | Status: 68 calls | Height fit-content + minHeight hiện hành; nhãn dài wrap. Không fixed height, không ép parent alignItems hoặc thay palette/trạng thái. Fixture intrinsic cùng width và axe/reflow/native zoom. |
| Chuỗi không ngắt bị cắt trong state | Empty: 7 calls | minWidth 0 + overflowWrap anywhere tại owner; giữ marker/action/live-region. Seed chưa có lỗi này, ghi đúng là hardening cho dữ liệu hợp lệ. |
| Select đã khóa cắt nội dung, không có menu để xem | Order address/payment readonly | FieldGroup có tên + text wrap khi resource/pending. Đường tạo mới vẫn editable; không bật quyền sửa, không thay DTO/version/draft/command. |
| Selected option tràn ngoài menu trên text200 | MuiMenuItem theme owner | whiteSpace normal + overflowWrap anywhere; giữ minimum target token và keyboard/selected/disabled behavior. Enabled control ellipsis chỉ được chấp nhận khi popup thực đã chứng minh nhãn selected đọc đầy đủ; disabled không có ngoại lệ này. |

Inventory hiện hành đọc toàn bộ 16 module, 54 route, 76 runtime file và 28 shared public APIs. Full source/binding/catalog gates và suite browser là evidence riêng; inventory/import count không thay cho render hoặc kiểm mọi business branch. Các phần F01–F09 và Toolbar/Shell được giữ và chạy lại, không sửa ngoài finding có bằng chứng. Không có dependency, API/schema canonical hoặc token mới.

Giới hạn: React/MSW tổng hợp cục bộ; speech, hosted CI và nghiệm thu người dùng không được suy thành PASS. Các run lỗi/interrupted và probe trước sửa giữ lịch sử, không cộng vào full run cuối.
