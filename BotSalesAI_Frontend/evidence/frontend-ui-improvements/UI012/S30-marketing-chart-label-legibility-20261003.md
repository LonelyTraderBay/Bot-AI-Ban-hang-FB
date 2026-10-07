# UI012/S30 — độ đọc nhãn biểu đồ R53 trên màn hẹp

**Ngày:** 03/10/2026 · **Route:** R53 `/s/:shopId/reports/marketing` · **Kết quả:** UI PASS trong phạm vi lấy mẫu; ARCH PRESERVED; UI012.C04 vẫn PARTIAL.

## Vì sao cần thêm lượt này

Ảnh S28 xác nhận đủ ba nhãn nhưng ở bề rộng 320 CSS px chúng vẫn rất nhỏ. S29 đo 12 CSS px, tuy nhiên ảnh chụp cho thấy tăng 1 px chưa tạo khác biệt dễ đọc đủ rõ. S30 tăng nhãn lên 14 CSS px và giới hạn mỗi dòng ở tối đa 8 ký tự Unicode để giữ nhãn dài trong khoảng cách giữa các cột. Bảng dữ liệu bên dưới vẫn giữ nguyên tên nhóm đầy đủ.

## Phạm vi thay đổi

- `MarketingReasonTick` trong Reports tăng từ 11 lên 14 CSS px; nội dung được chia dòng hẹp hơn để tránh chồng nhãn ở 320 px.
- Playwright regression kiểm đủ ba nhãn và ba hàng bảng, font tính toán tối thiểu 14 px, không chồng nhãn, không tràn khỏi chart và không tràn ngang document tại 1280×720 và 320×860.
- Capture Chromium 153 ở 1280×720, 1440×1000 và 320×860: [JSON đo đạc](S30-marketing-chart-labels.json), [320×860](S30-marketing-chart-labels-320x860.png), [1280×720](S30-marketing-chart-labels-1280x720.png), [1440×1000](S30-marketing-chart-labels-1440x1000.png). Cả ba nhãn và ba dòng dữ liệu hiện diện; các nhãn không chồng nhau; document rộng đúng viewport; 0 page error và 0 mutation request. Hash source Reports: `88911E0BE20ACB3D1A30A98169236F7392441EC2393F44BDF78663AD99E452F0`.
- Codex đã xem lại ảnh S30 trên desktop và 320 px. Đây là visual spot-check có phạm vi, không phải owner review hoặc screen-reader speech.

## Kiểm chứng source và artifact

- Regression chuyên biệt: **1/1 PASS**.
- `npm.cmd run verify`: **PASS** với process-scoped PATH; generator 11 outputs/283 schemas/210 operations/54 routes; source 64 files/220 operation calls/54 routes; source-checker 3/3; boundaries 427 imports/0 issue/8 negative fixtures; ESLint; TypeScript; domain/MSW 88/88; Vitest 85/85; production build. Log: [S30 verify](S30-verify.log).
- Full rebuilt-demo Chromium E2E: **194/194 PASS trong 11,0 phút**, gồm route-role 357/357, empty 11/11, route-error 51/51, production artifact isolation và bốn FE022 vertical journeys. Log: [S30 full E2E](S30-full-e2e.log).
- Artifact local: production entry 737.92 kB raw/186.81 kB gzip (build advisory >500 kB raw vẫn còn); demo 446,254 initial script-transfer bytes, 449,806 initial-route gzip bytes, largest chunk 187,955 bytes. Đây là local Chromium/MSW measurements, không phải SLO, CI hoặc thiết bị thật.

## Đánh giá cặp UI + kiến trúc và giới hạn

- **UI: PASS trong mẫu R53 đã đo.** Nhãn 14 px không chồng nhau ở 320 CSS px; data table tiếp tục cung cấp tên đầy đủ.
- **ARCH: PRESERVED.** Reports vẫn sở hữu biểu đồ; không đổi API, route, quyền, token, contract, generated output, dependency hoặc module boundary.
- UI012 vẫn **4/5** vì screen-reader speech/transcript và review rộng interaction/error/icon trên các route còn thiếu. FE-G05 chưa PASS. Ảnh và DOM không thay được speech transcript, thiết bị thật, browser matrix hay owner UAT.
- FE-G09/UI023 owner acceptance vẫn chờ; readiness theo gate của dự án vẫn 7/9. Không cập nhật frontend/product progress ledger. Local synthetic-MSW checks không xác nhận backend/provider, staging/production hoặc hosted GitHub CI.
