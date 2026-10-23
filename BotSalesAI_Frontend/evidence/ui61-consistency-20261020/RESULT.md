# UI61 — kết quả khắc phục card, radius và spacing

Ngày: 20/10/2026. Phạm vi React/TypeScript Frontend với MSW tổng hợp. HEAD `7851c03102ee2e0a29d550bf42fdb1979cfed651`, nhánh `codex/overview-ui-consistency-20261019`; không commit/push trong lượt này. [Contract](CONTRACT.md) ghi baseline, owner và consumer impact trước source edit. Trạng thái rollout chỉ ở plan §16.6.

## Kết quả theo ưu tiên

| Audit | Khắc phục tại owner | Phạm vi đã kiểm |
|---|---|---|
| UI-A01 / P1 | Empty/CTA ra khỏi canvas bảng 600px; giữ table/header/scroll có tên và bàn phím | 9 route rỗng ở 320/390/1440; giữ cuộn ArrowRight khi bảng có dữ liệu |
| UI-A02 / P1 | ActionGroup giữ Status theo nhãn, không kéo dài theo header/field | R22/24/26/30/35/51; thêm job import R14 và job xuất R36 hợp lệ |
| UI-A03 / P1 | Phần notice/action của ủy quyền dùng bodyInsetAfterHeader + SurfaceContent; bảng giữ flush | R38: inset 12px mobile/16px desktop; title/body đúng một khoảng 12px |
| UI-A04 / P1 | Thêm mapping visual radius.card từ token canonical; card nghiệp vụ và FormFields outlined dùng 12px | R02/39/52; dialog R46/47 và conditional R23/41. Dialog 16px; auth/hero 32px và control 8px giữ theo vai trò |
| UI-A05 / P2 | Pager mobile đưa count lên trên, ba nút chia đều một hàng; bỏ inset lặp ở R39 | Shared owner tác động 36 route consumer trong audit; đo 320/390/768/1440 và ma trận route |
| UI-A06 / P2 | ReportWarnings module-local thống nhất gap 12px giữa các cảnh báo; không bỏ chữ hoặc đổi severity/provenance | R20/22/58/59/60; kiểm 0/1/8 cảnh báo dài và cảnh báo trùng |

FormFields vẫn giữ nhịp field comfortable 16px/compact 12px, content 12px và action 8px theo nguồn chuẩn; không ép mọi vai trò về cùng một giá trị. Không thay schema, permission, số liệu tài chính hoặc API nghiệp vụ.

## Coverage từng nhóm

| Nhóm | Số route | Thay đổi/kiểm chứng chính |
|---|---:|---|
| Truy cập và công khai | 4 | Card cửa hàng; consent hợp lệ và không có challenge |
| Điều hành | 3 | Giữ Tổng quan; inset ủy quyền; bảng và phân trang |
| Bán hàng và khách hàng | 11 | Shared bảng/Pager; card dòng chuẩn bị hàng trong dialog |
| Hàng hóa, kho, mua và nhận hàng | 12 | Empty/CTA; import-job; card dòng mua/nhận |
| Tài chính | 11 | Trạng thái; Empty/CTA đối soát; nhịp cảnh báo; sổ và báo cáo |
| AI và kiến thức | 8 | Trạng thái intrinsic; preview/card bản tin; bảng rỗng |
| Thông báo và báo cáo | 4 | Card thông báo; pager cùng mép; trạng thái export |
| Cài đặt | 7 | Status kết nối/privacy; bảng, form và pager |
| Job | 1 | Job xuất hợp lệ; status và kết quả tải; không tải tệp |
| **Tổng** | **61** | **61 route × desktop/mobile** |

CUA trên preview mới đã mở 122/122 route-viewport và lưu ảnh viewport/số đo sau khi nội dung tải xong. 58 route có content từ seed; R14/R36/R61 mặc định là thiếu job/challenge. Ba route này được kiểm bổ sung bằng flow hợp lệ trên Chromium/Firefox ở 320/390/1440, không ghi thành content-PASS từ trang lỗi. Dialog R41/R46/R47 và preview R23 có kiểm riêng.

## Kiểm chứng

| Gate | Kết quả hiện có |
|---|---|
| Typecheck, lint, 42 Node shared API/composition cases | PASS — [source log](source-final.log) |
| Strict layout/visual/composition | PASS — 95/94/93 source files, 0 finding; 1 spacing exception skip-link có sẵn được giữ |
| Ca mới Chromium/Firefox | PASS 26/26 — [target log](target-final.log); gồm 244 lần mở route trong ma trận tự động |
| Vitest và build lần riêng | PASS 256/256 và build — [log](unit-build-attempt2.log); build này trước follow-up inset R39, full verify cuối kiểm lại source mới |
| Hồi quy hiện có | PASS 40/40 Chromium/Firefox — [log](shared-final2.log) |
| Full verify | PASS — [verify-final2.log](verify-final2.log), 256 Vitest, build/source/policy và S17 preverify 62 checks/57 coverage/299 fingerprints. Validator sau finalize được ghi riêng ở [evidence-final.log](evidence-final.log). |
| Git/diff/preservation | Không xóa file baseline; 42 file Overview được bảo vệ giữ nguyên byte; test Dashboard chỉ thêm chờ Stats thực sự tải (mọi assertion cũ giữ nguyên); LF/CRLF được giữ; HEAD không đổi; không stage/commit |

Toàn bộ ảnh viewport, số đo, trace và snapshot trước/sau nằm trong thư mục local `C:\Users\Joker-PC\Documents\Codex-Recovery\Bot-AI-Ban-hang-FB\ui61-implementation-20261020`. Lượt `final/` chứa 122 quan sát CUA; không dùng ảnh fullPage bị lỗi từ audit cũ. Chỉ các ảnh bàn giao cần thiết được giữ cùng evidence trong repo.

## Giới hạn và lịch sử kiểm tra

- Không tuyên bố Backend/provider, production, hosted CI hoặc owner acceptance. Native browser zoom/text-only resize, screen reader và mobile vật lý NOT_RUN; viewport 320px không thay kiểm native zoom.
- Console có cảnh báo `flushSync` lặp lại đã tồn tại trong audit; không có pageerror ở ma trận Playwright mới. Chưa gộp việc điều tra lifecycle này vào sửa card/spacing; không tuyên bố console sạch.
- `source-attempt1` lỗi thiếu import ActionGroup, đã sửa. `target-attempt1` có hai bộ chọn card chọn cả nút/link và sai số DOMRect Firefox 0.000061px; sửa bộ chọn đúng vai trò và so sánh tới 0.001px. `unit-build` lỗi matcher whitespace của chuỗi dài, đã sửa để so sánh nguyên textContent. Giữ log lỗi, không biến thành PASS.
- `target-attempt2` bị dừng có chủ đích trước sửa inset R39, không dùng làm evidence đạt. `target-final` chạy lại đầy đủ trên source đã chốt. Không giảm ngưỡng layout hay bỏ assertion nghiệp vụ để lấy PASS.
- `shared-final` ghi nhận phép đo Marketing đọc giữa hai nhịp khởi tạo bộ lọc: form hiện nhưng Stats chưa tải. Trace có ảnh xác nhận; không phải card bị mất sau khi tải xong. Test đổi sang poll sự hiện diện của đúng grid 4 card trước khi đọc geometry, giữ toàn bộ assertion cũ; suite được chạy lại ở `shared-final2`. CUA cũng đo lại R53 với kỳ báo cáo rõ ràng và chờ khối Stats; hai ảnh/JSON provisional được loại khỏi manifest bằng chứng chấp nhận.

Bổ sung kiểm tra toàn trang: 122 receipt section, 160 ảnh section và 114 ảnh cuối trang. [Manifest/hash/runtime coverage](runtime-summary.json). Guard nháp R27 có hiện trong tab demo do agent tạo; ảnh và điều hướng rời nháp tổng hợp được giữ ngoài repo, không ghi nhận là lỗi đã sửa hoặc nghiệm thu người dùng.

IAB có co ảnh PNG theo vùng client khi có scrollbar (390 CSS px → 380×822 pixels; 1440 CSS px → 1430×1073 pixels). Giữ nguyên ảnh provider trả về và đo viewport bằng DOM; không sửa ảnh để giả kích thước.

Lượt verify-final đầu đạt nhưng bộ thu hash chưa bao phủ apps/web/tests; bước finalize từ chối thiếu hash. Đã bổ sung thu thập và chạy lại toàn bộ verify-final2; không điền hash ngược vào log cũ.

Ảnh bàn giao: [desktop Tổng quan](after-desktop-overview.png), [mobile đối soát](after-mobile-reconciliation.png).

**S17 cuối:** PASS sau finalize — 63 command/log records, 58 coverage rows, 299 current fingerprints; [validator log](evidence-final.log). Giữ nguyên 59 checks và 54 coverage lịch sử; không sửa log lịch sử để giả kết quả hiện hành.
