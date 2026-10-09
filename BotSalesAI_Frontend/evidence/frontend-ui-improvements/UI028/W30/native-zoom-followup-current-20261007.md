# Bổ sung bằng chứng zoom W30 — 07/10/2026

Đây là phần bổ sung sau ảnh chụp S19 ở [báo cáo đồng bộ tài liệu](../../../frontend-ui-document-sync-20261007/REPORT.md). Báo cáo S19 giữ nguyên ý nghĩa theo thời điểm ghi; kết quả dưới đây là lần chạy mới trên source hiện tại.

## Kết quả đo lại

| Phương pháp | Kết quả | Bằng chứng |
|---|---|---|
| Chromium browser zoom thật 200% | **5/5 kịch bản PASS**; browser API xác nhận zoom 2×, viewport từ 1280×720 thành 640×360 CSS px; 0 tràn ngang, lỗi trang hoặc request ghi dữ liệu | [JSON có fingerprint và hash ảnh](actual-browser-zoom-200-current-20261007-153408-38412.json), ảnh [ô soạn tin đang focus](actual-browser-zoom-200-inbox-long-composer-focused-20261007-153408-38412.png) |
| Firefox native text-only 200% | **5/5 kịch bản PASS**; native text-only tăng font 2× trong khi viewport/DPR cố định; 0 tràn ngang, lỗi trang hoặc request ghi dữ liệu | [JSON có fingerprint và hash ảnh](native-text-only-200-current-20261007-153342-35120.json), ảnh [ô soạn tin đang focus](native-text-only-200-inbox-long-composer-focused-20261007-153342-35120.png) |
| W30 browser stress | **10/10 case PASS**, Chromium 5/5 và Firefox 5/5; mỗi case `issues=0`, `pageErrors=0` | [Chromium mobile-label result](stress-chromium-mobile-menu-long-label-current-20261007-153805-23404.json), [Firefox mobile-label result](stress-firefox-mobile-menu-long-label-current-20261007-153814-40540.json), [full current browser log](../../../frontend-ui-document-sync-20261007/e2e.log) |

## Sai lệch fixture đã xử lý

Ảnh overlap trước đó đến từ fixture stress: test thêm text node trực tiếp vào anchor MUI dạng flex, tạo thêm một flex item không thuộc cấu trúc UI. Không có bằng chứng cho thấy đó là lỗi runtime. Fixture hiện thay nội dung đúng tại `.MuiListItemText-primary`; cả hai browser runner đo nhãn nằm trong link, không có direct text node và overlap với hàng kế tiếp bằng **0 px**. Regression giữ các assertion hình học để bắt lỗi thật nếu xuất hiện.

## Phạm vi và giới hạn

Các kết quả này xác minh năm tình huống đại diện (form lỗi, menu nhãn dài, mã báo cáo dài, ô soạn tin dài, dialog lý do dài), không phải mọi route ở mọi kích thước. Đây là local synthetic-MSW UI evidence; không xác nhận screen-reader speech/transcript, human review mọi state, hosted CI, owner acceptance, backend/provider hoặc môi trường production.
