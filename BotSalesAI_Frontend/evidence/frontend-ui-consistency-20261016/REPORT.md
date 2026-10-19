# Rà soát sự đồng bộ UI BotSales AI — 16/10/2026

Mode: **AUDIT**, skill ui-consistency. Source: `1fd4530609f4e69193a27b0d5a4959181e3f8fc9`.
Phạm vi: React Frontend với API MSW tổng hợp. Kết luận dựa trên source, computed styles, phép đo browser và ảnh render của lượt này.

**Kết luận:** source gates đạt; UI còn một lệch token overlay đã xác nhận. Lượt Chrome 155 đầu có một lỗi Service Worker; phép tái kiểm không lặp lại lỗi. Một khoảng trống desktop trên Dashboard cần review ý đồ bố cục. Không chứng nhận toàn UI đồng bộ 100%.

## 1. Phát hiện và mức tin cậy

### UI-CONS-01 — P2, CONFIRMED: backdrop modal chưa dùng token được quy định

- Contract: [DESIGN.md:48](../../DESIGN.md:48) quy định “Modal overlay uses the approved overlay token”; [tokens.json:35](../../../botsales-kit/design/tokens.json:35) đặt `colors.overlay=#090C12CC`, tương đương `rgba(9, 12, 18, 0.8)`.
- Điều kiện: mở “Thêm danh mục” tại 390px và 1440px; kiểm Chrome 155, Firefox 155 và Chromium 153 bổ sung.
- Actual: cả 6 quan sát đều là `rgba(0, 0, 0, 0.5)`; bốn ô browser/viewport thuộc phạm vi hỗ trợ đều lệch. CSS custom property `--color-overlay` đã tải đúng giá trị; Paper của dialog vẫn đúng surface/radius.
- Root cause: [theme.ts:45](../../apps/web/src/shared/ui/theme.ts:45) map Paper của MuiDialog nhưng theme không map visible MuiBackdrop. MUI 7.3.1 dùng default ở `node_modules/@mui/material/Backdrop/Backdrop.js:48`; source default khớp computed style.
- Tác động: modal dimming khác thiết kế canonical. Không quan sát lỗi thao tác/focus do khác biệt màu này; mức P2 theo tác động thị giác.
- Sửa đề xuất: bổ sung mapping tại shared theme cho **visible backdrop**, giữ variant invisible của Menu/Select trong suốt; không đổi palette.
- Xác minh sau sửa: parity với token cho EditDialog, ConfirmDialog, dirty-draft dialog và Drawer; kiểm Menu/Select, focus/escape/return, forced-colors.
- Bằng chứng: [backdrop-parity.json](backdrop-parity.json), [Chrome mobile dialog](chrome-dialog-390.png), [Firefox mobile dialog](firefox-dialog-390.png). `check-backdrop-parity.mjs` exit **1**, 6/6 mismatch.
- Confidence: cao cho sai khác token và owner mapping.

### UI-CONS-02 — P2, CONFIRMED occurrence / root cause UNVERIFIED: lỗi update worker trên Chrome 155

- Điều kiện: test không sửa `ui-composition-layout.spec.ts`, 61 full-document navigations, viewport 1440px, Chrome cài sẵn **155.0.8059.40**, hai workers.
- Actual: suite Chrome đầu **30 passed / 1 failed**. Ma trận 1440px tới assertion `expect(errors).toEqual([])` ghi:
  `Failed to update a ServiceWorker ... /mockServiceWorker.js: Not found`.
- Trace ghi lỗi TypeError gần navigation `/s/shop-demo/bot/team`. Hai request worker được trace ghi đều HTTP **200**; không có căn cứ kết luận asset bị thiếu.
- Source liên quan: [mocks/browser.ts:24](../../apps/web/src/mocks/browser.ts:24) unregister registration khi document chưa có controller; MSW 2.11.1 `lib/browser/index.mjs:152` gọi `existingRegistration.update()` không await/catch. Race của registration/update là giả thuyết có căn cứ, chưa được chứng minh là root cause.
- Tác động đã quan sát: required page-error assertion FAIL trên target browser; geometry assertions đã chạy tới cuối loop. Không quan sát màn hình mất khả năng sử dụng trong ca này.
- Tái kiểm có giới hạn: cùng source/assertion, `--project=chrome --repeat-each=2 --workers=2`, cả hai viewport 390/1440: **4/4 passed**. Không cộng kết quả này để gọi suite đầu 31/31 PASS; lỗi gián đoạn vẫn mở.
- Sửa đề xuất: tái hiện có instrumentation registration/controller/update; sửa tại lifecycle owner khi xác định nguyên nhân; giữ assertion bắt pageerror, không lọc bỏ lỗi.
- Bằng chứng: [Chrome first run](chrome-playwright.log), [trace analysis](sw-failure-analysis.json), [recheck](chrome-recheck.log), trace ZIP đầy đủ giữ ngoài Git, xem `retainedOutsideGit` trong [manifest](BUNDLE_MANIFEST.json).
- Confidence: cao cho lần xảy ra; nguyên nhân chính xác chưa xác minh.

### UI-CONS-03 — P2, CANDIDATE: hàng tài chính Dashboard để trống một cột

- Route `/s/shop-demo/overview`, desktop từ 1280px; 390/768/1279px không có phần hàng trống này.
- Đo Chrome 155:

| Viewport | Hàng grid | Panel tài chính | Phần hàng còn trống |
|---|---:|---:|---:|
| 1280px | 992px | 600,61px | 391,39px |
| 1440px | 1152px | 699,06px | 452,94px |
| 1920px | 1632px | 994,45px | 637,55px |

- [dashboard/index.tsx:79](../../apps/web/src/modules/dashboard/index.tsx:79) khai báo `1.6fr 1fr`. Panel tài chính chiếm một track; các panel sau đặt `gridColumn: 1 / -1`, nên không có sibling bên phải cùng hàng. Firefox 155 và Chromium 153 cũng đo Panel khoảng 699px tại 1440px.
- [SPC-008](../../docs/FRONTEND_SPACING_STANDARD.md:310) yêu cầu kiểm collection 0/1/2/3 item và giải thích geometry/profile. Chưa thấy rationale cho cột trống này; quy tắc một item của collection không tự chứng minh mọi hàng của grid hỗn hợp phải full width. Vì vậy giữ là candidate, không kết luận bug chỉ theo khoảng trắng.
- Đề xuất: nếu không có chủ đích profile giới hạn chiều rộng, đổi parent thành một cột hoặc đặt financial Panel full-span; thêm geometry regression 1280/1440/1920. Nếu giữ, ghi rationale tại nguồn contract hiện có.
- Bằng chứng: [dashboard-occupancy.json](dashboard-occupancy.json), [Chrome Dashboard](chrome-dashboard-1440.png).

## 2. Bản đồ nguồn chuẩn và trace runtime

| Trách nhiệm | Owner đã kiểm |
|---|---|
| Palette/mode | `botsales-kit/design/decision.json` (Graphite Gold dark-only), `design/tokens.json` |
| Frontend generation | `BotSalesAI_Frontend/scripts/generate.mjs` → token package/index/CSS và các output được kiểm |
| Kit generation | `botsales-kit/scripts/generate-theme.py --check` |
| Runtime | `apps/web/src/main.tsx`: CSS tokens/bootstrap, một ThemeProvider ngoài Router/Session; `shared/ui/theme.ts` |
| Visual/layout | `shared/ui/layout.ts`, `visual.ts` |
| Reuse/interaction | `shared/ui/components.tsx`, `composition.tsx`, `draft-conflict.tsx`; public catalog CURRENT/TARGET |
| Policy | `docs/FRONTEND_SPACING_STANDARD.md` v1.29 SPC-001–075 |
| Route inventory | Canonical route-manifest: **61 route**; [route-coverage.json](route-coverage.json) có từng ID/path và các matrix đã chạy |

Trace kiểm thực tế:
- `colors.accent` → generated JSON/CSS → palette.primary → contained CTA → giá trị default/hover/pressed, foreground và focus tại route.
- `space.lg / space.sm` → `layoutSx.form.fieldGap` → FormFields trong order editor → computed gap 16px; compact form 12px.
- Panel operational 12px header/body, inset 12/16; reading Panel 16/24; table cell 8/12; title/label/card/dialog radius theo shared owner.
- Dialog Paper kế thừa theme qua portal; **backdrop** là ranh giới chưa map đúng (UI-CONS-01).

## 3. Các gate thực sự chạy

Cwd lệnh Frontend: `C:/Users/Joker-PC/AppData/Local/Temp/botsales-ui-consistency-20261016-223601/snapshot/BotSalesAI_Frontend`. Snapshot có source/config theo hash của checkout và dùng dependencies đang cài qua junction. Không cài hoặc nâng dependency.

| Gate/action | Kết quả | Phạm vi/ý nghĩa |
|---|---|---|
| Skill lexical inventory | PASS inventory, REQUIRES_REVIEW signals | 97 eligible files; source 89/config 5/docs 3; 0 skip/error; lexical count không là verdict UI |
| Frontend generator --check | PASS, exit 0 | 15 outputs, 346 schemas, 245 operations, 61 routes; freshness |
| Kit generate-theme.py --check | PASS, exit 0 | Output canonical dark theme consistent; freshness |
| check-layout.mjs --json | PASS, exit 0 | 93 file, 0 finding; **1 accepted exception** skip-link padding |
| check-visual-tokens.mjs --json | PASS, exit 0 | 92 file, 0 finding |
| check-ui-composition.mjs --json | PASS, exit 0 | 91 file, 0 issue |
| Layout/visual/composition/API guard tests | PASS, exit 0 | **132/132**, có positive/negative/UNKNOWN fixtures |
| Lint + typecheck | PASS, exit 0 | App source; noEmit |
| Focused shared UI unit/render tests | PASS, exit 0 | **82/82**, 3 files: components/shared-ui-render-contract/composition |
| Production build + demo build | PASS, mỗi exit 0 | Output chỉ trong snapshot |
| Backdrop contract parity | **FAIL**, exit 1 | 6/6 recorded backdrop cells khác token; UI-CONS-01 |
| Full npm run verify / hosted CI trong lượt audit này | NOT RUN | Không dùng source gates để gọi full-suite hoặc CI mới đạt |

Accepted exception `UI028-A11Y-SKIP-LINK-PADDING` được dùng đúng một lần, không có unused exception hoặc migration debt từ strict spacing scan. Registry có owner, lý do và điều kiện bỏ; pass không có nghĩa exception đã được loại.

## 4. Runtime coverage

| Runtime thật | Kết quả lượt chính | Kết quả phụ |
|---|---|---|
| Chromium **153.0.8010.12** bundled | **30/30 PASS** | Bổ sung; thấp hơn Chrome tối thiểu của dự án, không dùng thay target Chrome |
| Firefox **155.0** bundled | **30/30 PASS** | Phạm vi desktop đã chọn |
| Chrome installed **155.0.8059.40**, isolated headless context | **30/31, FAIL** | 4/4 targeted matrix rechecks PASS; giữ lỗi đầu |

Lượt bundled gồm 60 tests/7 files, 7,9 phút. Lượt Chrome gồm 31 tests/8 files, 3,9 phút; một test là diagnostic đo occupancy, không assert rằng khoảng trắng là bug. Recheck 4 tests/2,3 phút.

Coverage được quan sát:
- 61/61 route × 390/1440px trên Firefox/Chromium; Chrome 155 có 61/61 ở hai viewport trong recheck. Mỗi matrix kiểm shared gap, child margin reset, Shell inset, page overflow và pageerror.
- 9 mốc 320/390/767/768/1024/1279/1280/1440/1920, 6 profile và dirty-draft dialog trên mỗi browser. Giá trị từ browser emulation viewport, không là native resize/zoom.
- AXE whole-page WCAG A/AA đã chọn và keyboard skip-link cho mọi canonical route trong mỗi lượt chính. Automated AXE không chứng nhận toàn bộ accessibility.
- Density table/divided facts/operational vs reading Panel, simple vs complex form; dialog draft preserve/escape/cancel; inputs/labels, row actions, long money/status/empty content; pending→ready hai QueryState profiles.
- Probe riêng: 9 route profiles × 390/1440, dialog portal, CTA default/hover/pressed/focus, dark-only dưới system light preference, reduced-motion và forced-colors emulation. 21 observation records/runtime; các probe này 0 pageerror.
- Đã xem trực tiếp 9 ảnh: product mobile/desktop, Dashboard desktop, Inbox mobile, order form mobile và dialog trên Chromium/Firefox/Chrome. Các screenshot khác giữ làm evidence nhưng không gọi tất cả đã review ảnh thủ công.

NOT RUN trong lượt này: native browser zoom 200%, Firefox native text-only zoom, Narrator speech/human accessibility review, physical mobile keyboard, Edge/Safari, toàn bộ route×role×fault/empty/error matrix, tất cả 445 journey regressions/browser. Production backend/provider/staging/owner acceptance nằm ngoài bằng chứng UI mock này. App light theme NOT APPLICABLE theo quyết định dark-only.

## 5. Trình tự xử lý đề xuất

1. Sửa UI-CONS-01 tại shared theme; kiểm visible/invisible backdrops và các consumer overlay trước thay đổi route.
2. Giữ UI-CONS-02 mở; tái hiện registration/update lifecycle có kiểm soát trước chọn root fix. Không suppress pageerror hoặc gọi lượt đầu PASS nhờ recheck.
3. Review intent UI-CONS-03; nếu cột trống không có mục đích, sửa geometry tại parent Dashboard và kiểm breakpoint/permissions/long money. Không cần shared abstraction hoặc token mới.
4. Chạy lại đúng source/renders chịu ảnh hưởng và giữ baseline/after evidence theo workflow UI hiện có. Đây là đề xuất trong audit, chưa sửa source.

## 6. Provenance và bảo toàn checkout

[baseline.json](baseline.json), [source-preservation.json](source-preservation.json), [audit-summary.json](audit-summary.json) ghi source hashes, commands/exits và tests.

- Snapshot copy **553 tracked source/config/reference files**, khoảng 13,17 MB; 21.969 tracked paths ngoài scope snapshot (chủ yếu historical evidence/reference) không được scan như runtime source. Không copy 22.084 mục untracked.
- Worker generated/ignored cần cho demo được copy nguyên byte từ checkout: source/copy SHA-256 trùng nhau. Lượt strict đầu trước khi copy báo thiếu worker trong snapshot; giữ log ban đầu riêng, không coi là finding của app.
- Sau kiểm: 553/553 hash giữ nguyên, 0 changed/missing; HEAD giữ `1fd4530…`; Git status và hash danh sách 22.084 untracked paths giữ nguyên. Không hash toàn bộ nội dung historical/untracked artifacts hoặc dependencies.
- Một lượt Chrome phụ lúc đầu bị dừng vì config merge giữ cả projects cũ; log `chrome-merged-projects-interrupted.log` giữ riêng và không tính PASS. Lượt có kết luận dùng rõ `--project=chrome`.
- Audit không sửa source/token/CSS/config/docs/ledger của checkout và không commit/push/deploy. Các adapter audit, build, logs, traces và screenshots nằm ở thư mục tạm độc lập này.

Lệnh chính:
```text
node scripts/generate.mjs --check
python ../botsales-kit/scripts/generate-theme.py --check
node scripts/check-layout.mjs --json
node scripts/check-visual-tokens.mjs --json
node scripts/check-ui-composition.mjs --json
node --test --test-concurrency=1 tests/layout-checker.test.mjs tests/ui-layout-binding-gates.test.mjs tests/visual-token-checker.test.mjs tests/ui-composition-checker.test.mjs tests/ui-composition-ancestry.test.mjs tests/ui-shared-api-contract.test.mjs
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run build:demo
node node_modules/vitest/vitest.mjs run --config vitest.ui-audit.config.ts --configLoader runner apps/web/tests/components.test.tsx apps/web/tests/shared-ui-render-contract.test.tsx apps/web/tests/composition.test.tsx
node node_modules/@playwright/test/cli.js test --config playwright.ui-audit.config.ts
node node_modules/@playwright/test/cli.js test --config playwright.chrome-audit.config.ts --project=chrome
node node_modules/@playwright/test/cli.js test --config playwright.chrome-recheck.config.ts --project=chrome tests/ui-composition-layout.spec.ts --repeat-each=2 --workers=2
```

Toolchain đo: Node 24.19.0, npm 11.17.0, React 19.1.1, MUI 7.3.1, Vite 7.3.6, TypeScript 5.9.2, Vitest 5.0.3, Playwright 1.63.0.


## Bản lưu để triển khai kế hoạch

Bản này nhập từ audit read-only trên SHA nêu đầu báo cáo; chỉ chuẩn hóa liên kết cho repo. Không chạy lại browser hoặc sửa UI trong lượt lập kế hoạch. [Manifest](BUNDLE_MANIFEST.json) ghi hash của mọi tệp nhập và artifact lớn còn giữ ngoài Git. [Kế hoạch và trạng thái duy nhất](../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status); [phiếu chi tiết](../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-consistency-20261016).

Các file `audit-harness/` là reference của lượt audit, không được app import hoặc tự chạy như suite sản phẩm. Chúng giữ đường dẫn/ports của snapshot cũ; muốn tái chạy phải phục hồi vào snapshot riêng và kiểm lại config/isolation. Trace ZIP đầy đủ khoảng 29 MB và các screenshot chưa review không được đưa vào Git; nguồn gốc, kích thước và SHA-256 của từng artifact này ở `retainedOutsideGit` trong manifest. Trích xuất lỗi/network của trace được lưu ở `sw-failure-analysis.json`, raw test report/log ở bundle; không gọi bundle này là bản sao đầy đủ mọi byte của audit.

Tám bản text/reference được bỏ khoảng trắng cuối dòng/cuối file để đạt staged whitespace check. Nội dung raw nguyên byte của chúng giữ trong [raw-audit-text.zip](raw-audit-text.zip); manifest ghi source/view/archive hashes. Không bỏ assertion, lỗi hoặc dòng kết quả nào.
