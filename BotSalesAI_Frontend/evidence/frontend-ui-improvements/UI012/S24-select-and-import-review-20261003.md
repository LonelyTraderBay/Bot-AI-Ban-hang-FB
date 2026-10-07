# UI012/S24 — Rà soát trực quan select, import và discard

**Ngày:** 03/10/2026 · **Kết quả:** PASS trong mẫu đã kiểm; không phát hiện lỗi UI cần sửa. Đây là review ảnh do AI thực hiện trên React demo local, không phải owner UAT hay screen-reader review.

## Phạm vi và bằng chứng

- Chromium 153, viewport 1440×1000 CSS px, deviceScaleFactor 1; dữ liệu tổng hợp, MSW local.
- Script [S24 capture](S24-capture-select-and-import-states.mjs) đọc canonical `route-manifest.json` để resolve route ID, và đợi animation kết thúc trước khi chụp.
- R21 Finance entries: mở combobox `Loại phiếu`, xem `Thu tiền` / `Chi tiền`, xác nhận option đang chọn, đóng bằng Escape.
- R49 Finance reconciliation: mở dialog import CSV, chọn file synthetic tại browser, mở xác nhận bỏ thay đổi.
- [Capture report](S24-select-and-import-review.json) ghi route, screenshot, option, focus return, mutation và page-error results. Ảnh: [menu loại phiếu](S24-finance-entry-kind-options.png), [import trước chọn file](S24-reconciliation-import-empty.png), [file đã chọn](S24-reconciliation-import-selected.png), [xác nhận discard](S24-reconciliation-import-discard.png).

## Kết quả review

| Mẫu | Quan sát | Kết quả |
|---|---|---|
| R21 combobox | Dialog và nhãn `Loại phiếu` rõ; hai option nhìn thấy, option đang chọn được tô nền; Escape đóng menu và focus trở về combobox. | PASS trong mẫu |
| R49 import rỗng | Tên dialog, loại bảng, nút `Chọn CSV`, các trường account/batch/format, cảnh báo dữ liệu mô phỏng và hành động cuối cùng hiển thị rõ. | PASS trong mẫu |
| R49 file đã chọn | Tên `ui012-s24-synthetic.csv` xuất hiện trên control; không gửi file lên dịch vụ. | PASS trong mẫu |
| R49 discard | Dialog xác nhận có lời giải thích và hai hành động riêng `Tiếp tục sửa` / `Bỏ thay đổi`; đóng dialog trả focus về nút `Nhập bảng đối soát`. | PASS trong mẫu |
| Runtime/hành vi | 0 page errors, 0 mutation request, focus assertions đạt. | PASS trong mẫu |

## UI + kiến trúc và giới hạn

- **UI: PASS cho các composition được lấy mẫu.** Ảnh sau khi chờ animation không còn frame chuyển tiếp chồng; không thấy clipping hoặc nhãn/hành động mơ hồ trong các state đã kiểm.
- **ARCH: PRESERVED.** Không thay React source, ownership module, route, contract, permission, design token, generated file hay boundary. Route ID được lấy từ manifest để tránh lặp lỗi traceability S22.
- Không quan sát OS-native file chooser; file được set bằng Playwright vào browser control. Không có screen-reader speech/transcript; accessibility tree/DOM không được dùng để kết luận screen-reader PASS.
- Chỉ kiểm một select và một luồng import/discard desktop. Các route, vai trò, dialog, loading/empty/error/disabled/icon composition còn lại chưa được review thủ công đầy đủ. UI012 vẫn 4/5, C04 PARTIAL; FE-G05 chưa PASS.
