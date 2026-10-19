# UIC05 — Truy vết token tới theme, component và portal

**Trạng thái:** đã hoàn tất kiểm chứng cục bộ trên source của UIC05; commit cục bộ sẽ được đẩy sau khi SHA UIC04 qua Actions theo dependency. Đây là bằng chứng frontend với API mock tổng hợp, không phải kết quả backend, production hay nghiệm thu người dùng.

## Kết quả thực tế

UIC05 khép đường đi của token thiết kế từ nguồn canonical qua generator, CSS variables, MUI theme, shell, component và portal. Phát hiện đã đo ở source: theme trước đây để MUI tự dùng z-index mặc định, generator chưa sinh CSS variables z-index, header ghi cứng `1100`, skip-link ghi cứng `9999`, và checker không bắt `zIndex`/`z-index` nguyên. Lần đo cũ và log không đạt được giữ nguyên.

Nguồn canonical `../botsales-kit/design/tokens.json` là phiên bản `2.1`, SHA-256 `95b1202c741162890227ddc70adc7c1e479d17348bedaea56d3dea019f45bbb0`. Sau sửa, Vite SSR đo đủ tám slot MUI và khớp role kỳ vọng: mobileStepper/fab/speedDial=1000, appBar=1100, drawer=1200, modal=1300, snackbar=1400, tooltip=1500. CSS sinh có đủ bảy biến `--z-index-*`; shell header dùng token sticky, skip-link dùng token tooltip. Checker mới bắt cả TSX `zIndex` và CSS `z-index`; hai probe giả lập giá trị thô bị từ chối với 2 findings. Các nguồn ứng dụng quét trong full verify có 0 finding.

Kiểm tra runtime qua browser audit trên demo thật ở 320, 390, 768 và 1440px ghi computed style từ trang. Khi browser giả lập OS light preference, app vẫn giữ theme dark đúng cấu hình; các biến canvas/text/border/success/font-size/line-height/radius/focus/z-index khớp giá trị canonical. Forced colors dùng system Highlight cho focus và skip-link; reduced motion đưa transition về `0s` và scroll behavior về `auto`. aXe ghi 16 pass, 0 violation ở trang và main; `color-contrast` còn `incomplete`, nên báo cáo không khẳng định đã chứng minh đầy đủ tương phản mọi tổ hợp màu. JSON và bốn ảnh chụp viewport nằm trong [browser audit](design-browser-audit/).

E2E tương tác dùng Chromium 155.0.8059.40 và Firefox 155.0 trên demo cục bộ: **4/4 PASS**. Nó đo màu trạng thái nút mặc định/hover/pressed, nút disabled, success alert, backdrop/paper của Dialog, confirm dialog, Drawer và Select/Popover; kiểm focus quay lại, mở/đóng Drawer bằng bàn phím, tooltip và các lớp portal. Log cuối có exit 0 tại [E2E hai trình duyệt](overlay-token-layers-rerun-exact-parent.log). Lượt đầu phát hiện locator test tìm nhãn `Tên danh mục` nhưng `TextField` thật có nhãn `Tên`; test đã sửa theo source và chạy lại. [Playwright error context](locator-mismatch-error-context.md) và log lượt bị dừng được giữ riêng; lượt đó không tính là pass.

## Kiểm chứng trên source cuối

Môi trường sạch của worktree dùng Node `v24.19.0` và npm `11.17.0`. `npm ci` cài 411 packages và báo 0 vulnerabilities; npm cũng cảnh báo hai package `esbuild`/`msw` có install scripts chưa được duyệt. Không phê duyệt hay bỏ qua cảnh báo đó; `npm run setup` vẫn exit 0 và tạo worker demo như script của dự án quy định.

`npm run verify` chạy sau chỉnh sửa và exit **0**: generate 15 outputs/346 schemas/245 operations/61 routes; source/session 15/15; boundary 725 imports và 10/10 negative fixtures; domain 117/117; Vitest 249/249; typecheck/lint; production build; layout 86 tests, 94 files/0 findings/1 exception được dùng; visual-token 6 tests, 93 files/0 findings; UI composition 41 tests, 92 files/0 findings; S17 validator unit 11/11. Log và exit code ở [full verify](full-verify-current-source-rerun.log).

Sau khi finalizer ghi receipt S17 cho source cuối, chạy lại `npm run test:evidence`: 11/11 validator tests pass; S17 validator báo **27 command/log records, 22 coverage rows, 283 fingerprints, status COMPLETE**, exit 0. Log nằm tại [S17 post-finalize validation](s17-validator-postfinalize.log). Hash các nguồn UIC05 được ghi vào S17; không chỉnh hash thủ công hoặc thay log cũ.

## Bằng chứng chính

| Phép đo | Kết quả | Bằng chứng |
|---|---|---|
| Theme MUI và CSS z-index | 8/8 slot, 7/7 biến khớp token | [theme-layers-final.json](theme-layers-final.json), [log](theme-layers-final.log) |
| Probe checker nguyên giá trị | TSX và CSS đều bị từ chối; 2 findings | [full verify](full-verify-current-source-rerun.log), `test:visual-tokens` |
| Browser audit | 4 viewport; computed tokens; forced-colors/reduced-motion; 0 axe violations, contrast incomplete | [S04-browser-audit.json](design-browser-audit/S04-browser-audit.json) và ảnh trong cùng thư mục |
| Overlay/portal E2E | 4/4, Chromium + Firefox | [overlay-token-layers-rerun-exact-parent.log](overlay-token-layers-rerun-exact-parent.log), exit `.log.exit` = 0 |
| Full FE verification | exit 0; log chứa kết quả từng gate | [full-verify-current-source-rerun.log](full-verify-current-source-rerun.log), exit `.log.exit` = 0 |
| S17 sau finalizer | 11/11; 27 records/22 coverage/283 fingerprints | [s17-validator-postfinalize.log](s17-validator-postfinalize.log), exit `.log.exit` = 0 |

## Giới hạn và bước giao nhận

Mã nguồn backend là placeholder rỗng; mọi thao tác với dữ liệu dùng demo/MSW. Các cấu hình media preference trong browser audit được giả lập bởi Playwright, không phải kiểm tra OS native. Narrator/screen reader, production, provider thật, contrast trên mọi cặp màu và owner/UAT chưa được nghiệm thu ở UIC05. GitHub Actions của UIC05 chưa thể tồn tại trước khi commit/push; theo thứ tự kế hoạch, chờ Actions exact-SHA của UIC03/UIC04 rồi mới đẩy commit UIC05 riêng.
