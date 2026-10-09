# UX.C10 — Marketing và hoàn thiện UX dùng chung

Ngày bắt đầu: 2026-10-09  
Baseline trước source: [C10-before-source-20261009.json](C10-before-source-20261009.json), aggregate `d1ee399c22b593ce5692dd7b1f6cf90590f27e8791e1403efd2060282603ff95`, API `2.5.0`, HEAD `53c0ba8f413b1f1e0fa16a747ed27f728b861dd6`.  
Phạm vi: Marketing R53; shared Pager; date-only; route owners đã ghi trong [FINDINGS.md](../frontend-ux-review-20261009/FINDINGS.md) cho UX08/09/12/13/14. Giữ nguyên 28 owner files vốn đã dirty ở baseline.

## Hiện trạng đã xác minh

- `MarketingPage` gọi `getMarketingSummary` không query và thông báo không lọc được ngày. MSW trả số liệu fixture cố định; contract không nhận ngày/bucket.
- `Pager` chỉ có “Đầu danh sách” và “Trang tiếp”, không nhớ cursor đã đi qua.
- Báo cáo UX ghi vị trí bảng phê duyệt R38 ở y637 và danh sách vận đơn R42 ở y775 tại viewport 1280×720; panel mẫu/giải thích đứng trước tác vụ.
- Audit đã chỉ rõ các consumer ID/date, validation, phản hồi lưu và empty state. Mã chỉ được giải tên từ dữ liệu có quyền và đã tải; nếu không có tên thì ghi nhãn “Mã …”.

## Quyết định triển khai

1. Nâng canonical OpenAPI/API minor; `getMarketingSummary` nhận `fromDate`, `toDate`, `bucket=day|week|month`. Từ chối khoảng thiếu một đầu, sai ngày, đảo ngày hoặc dài hơn 366 ngày. Không tin tổng từ client.
2. Response bổ sung khoảng kỳ, múi giờ shop và chuỗi bucket do mock aggregate từ fixture sự kiện có ngày. Tổng known/unknown, estimated/actual spend, attribution và breakdown vẫn được tính ở read-model; null actual vẫn là chưa có số thực, không đổi thành 0. Không lọc payload tổng hợp cũ tại browser.
3. Lần đọc không có query dùng 30 ngày lịch tính theo `shop.timezone`, tính cả hôm nay. UI phản ánh khoảng mặc định vào URL sau khi nhận response; thay bộ lọc chỉ commit khi hợp lệ. Deep link sai không gửi query sai và có lỗi tiếng Việt cạnh trường.
4. Pager giữ lịch sử cursor theo pathname + toàn bộ filter khác cursor, giới hạn bộ nhớ; nút “Trang trước” quay về cursor đã ghé. Deep link không có history chỉ có thể về đầu; không bịa số trang/tổng.
5. Date-only hiển thị bằng formatter lịch Việt Nam từ chuỗi ngày, không parse như instant/đổi timezone. Thời điểm vẫn dùng formatter timezone hiện tại.
6. UX08 sắp queue/list vận hành trước sample/preview; trợ giúp dùng tiếng Việt cho người vận hành và giữ caveat ảnh hưởng quyết định.
7. UX09 dùng tên chỉ từ lookup/read-model đã được cấp quyền; ID chưa resolve vẫn hiển thị có nhãn. Không phát sinh request từng dòng.
8. UX12 chỉ hiện validation sau touch/submit; lỗi sai chặn request, gắn đúng trường, thông báo dễ sửa. Locale là format locale; giao diện hiện hỗ trợ tiếng Việt. Timezone phải hợp lệ và có lỗi tiếng Việt.
9. UX13 xác nhận lưu inline `role=status` sau acknowledged success, nói rõ đối tượng; error/unknown không hiện success và giữ draft/recovery hiện có.
10. UX14 phân biệt no-match với first-use/missing-job/no-permission, dùng CTA nội bộ đúng quyền. Shared `DataTable` giữ backward compatibility cho string empty hiện có.

## Kiểm chứng cần có

- Unit: kỳ mặc định theo timezone, date range/bucket, ranh giới 366/367 ngày, bucket ngày/tuần/tháng, không lọc client; Pager forward/back/filter reset/deep link/end; date-only giữ nguyên ngày.
- Browser trên Chromium/Firefox: Marketing URL filter và số liệu phản hồi từ API, form lỗi không gọi request sai; queue R38/R42 lên trước preview; hành vi form/feedback/empty trên các consumer sửa.
- TypeScript, lint, source/boundary/generator/canonical/kit gates trên source cuối C10. Full verify/build/full E2E/final evidence thuộc C11.

Không ghi nhận backend thật, dữ liệu quảng cáo thật, provider, hosted CI, speech/reader PASS hoặc nghiệm thu của người dùng trong C10.
