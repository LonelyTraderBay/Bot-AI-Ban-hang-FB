# UIC04 — Bố cục hàng tài chính Dashboard

**Quyết định:** Sửa hàng Dashboard thành một cột. Ở màn hình desktop, grid cũ khai báo hai track nhưng chỉ render Panel “Dòng tiền và doanh thu” ở track đầu; các Panel kế tiếp đều span toàn hàng. Hợp đồng route/quyền và tài liệu thiết kế không nêu mục đích cho track phụ. Một cột giữ nguyên nội dung, quyền và CTA, đồng thời căn Panel cùng chiều rộng với các hàng Dashboard khác.

**Tình trạng:** Source fix, bộ test `ui-dashboard-layout` Chromium/Firefox (8/8), lint, full `npm run verify` (`FULL_VERIFY_EXIT=0`), validator before/after, S17 finalizer, 11/11 kiểm thử validator và S17 validator đều PASS local. S17 ghi 24 hồ sơ lệnh, 19 dòng bao phủ và 283 fingerprint hiện hành. Bằng chứng Chrome đo trên 6 độ rộng, 5 trạng thái dữ liệu và 3 profile quyền. Exact-SHA GitHub Actions của UIC04 chỉ chạy sau khi UIC02 và UIC03 được giao đúng thứ tự.

## Nguồn và phạm vi đo

- Owner source: [DashboardPage](../../../apps/web/src/modules/dashboard/index.tsx), hàng grid trước các Panel tài chính và đơn hàng.
- UI mock chạy qua `tests/session/demo-server.mjs`, Vite demo và MSW; không có Backend trong repository. State lỗi/tải/rỗng/tiền dài là response tổng hợp theo schema; không xem là dữ liệu production.
- Browser đo sau sửa: Chrome **155.0.8059.40**. Baseline source lấy đúng commit `7bd319c7761cc61120edc4ecca1c3fa42939db29`; SHA trước/sau cho Dashboard và test được ghi trong [provenance](baseline-provenance.json).
- Các viewport thực đo: **390, 768, 1279, 1280, 1440, 1920px**. Không đặt ngưỡng thiết kế mới; kiểm track, độ rộng Panel, phần dư và scrollWidth trực tiếp từ DOM.
- States: `ready`, `pending`, `empty`, `error`, `long-money`; quyền: `owner`, `sales`, `viewer`. Owner có `finance.read`; sales/viewer không có theo permission catalog. Mỗi state/profile có số đo trước, DOM candidate và source sau trong [JSON Chrome](dashboard-states-after-chromium.json); baseline ở [JSON trước sửa](dashboard-states-chromium.json), ảnh so sánh ở [baseline 1440](../../frontend-ui-consistency-20261016/chromium-dashboard-1440.png) và [một cột 1440](candidate-single-column-1440.png).

## Kết quả đo

| Viewport | Trước: grid | Trước: Panel tài chính | Trước: phần còn trống | Sau: Panel / grid | Sau: phần còn trống |
|---:|---:|---:|---:|---:|---:|
| 390px | 358px | 358px | 0px | 358 / 358px | 0px |
| 768px | 720px | 720px | 0px | 720 / 720px | 0px |
| 1279px | 1231px | 1231px | 0px | 1231 / 1231px | 0px |
| 1280px | 992px | 600,61px | 391,39px | 992 / 992px | 0px |
| 1440px | 1152px | 699,06px | 452,94px | 1152 / 1152px | 0px |
| 1920px | 1632px | 994,45px | 637,55px | 1632 / 1632px | 0px |

At each viewport, the financial Panel is the only item in its visual row. The DOM-candidate one-column layout filled the grid and preserved all text; applying that exact parent layout in source produced the same measured widths. Before/after state and permission comparisons: **5/5 states** and **3/3 roles** at **6/6 widths**; zero horizontal overflow and zero page errors. The 60-digit VND amount remains wrapped and readable at the measured viewports. The viewer/sales explanation and the order/operations panels remain permission-driven; the profit/loss link remains `/s/shop-demo/finance/profit-loss` for the owner.

The reproducible evidence checker reports **PASS**, with 8 comparison checks. See [validator output](validate-dashboard-audit-final.log) and [measurement runner](audit-dashboard-states.mjs). The existing geometry cross-check is [here](dashboard-geometry-chromium.json).

## Code and local validation

- Changed the parent grid from responsive `1.6fr 1fr` at XL to one `1fr` track; no token, permission, API contract or business operation changed.
- Added a regression in [ui-dashboard-layout.spec.ts](../../../tests/ui-dashboard-layout.spec.ts) that checks one track, panel fill, unused row width and horizontal overflow at all six widths, plus the existing profit/loss destination.
- `npm.cmd --script-shell=<pwsh.exe> run test:e2e -- --project=chromium --project=firefox tests/ui-dashboard-layout.spec.ts`: **8/8 PASS** (4 tests per browser). This command also ran setup, production build, and demo build successfully; see [full command log](dashboard-layout-full-chromium-firefox.log) and [exit](dashboard-layout-full-chromium-firefox.log.exit).
- Rerun from the isolated UIC04 worktree at its exact parent SHA, with a dedicated server on port 5188: **8/8 PASS** (4 Chromium, 4 Firefox), see [exact-parent rerun](dashboard-layout-exact-parent-port5188.log) and [exit](dashboard-layout-exact-parent-port5188.log.exit). The first attempt on port 5187 collided with the concurrently running UIC07 demo server, so I isolated this rerun on port 5188; only the successful 8/8 result is counted.
- Targeted geometry test: **2/2 PASS**, Chromium + Firefox; see [focused log](dashboard-one-track-chromium-firefox.log) and [exit](dashboard-one-track-chromium-firefox.log.exit).
- Full current-source `npm run verify` **PASS** (`FULL_VERIFY_EXIT=0`): generate 15/346/245/61; source/session 15/15; boundary 725 imports, 10/10 negative fixtures; domain 117/117; Vitest 249/249; production build; layout 86/86; visual tokens 5/5; composition 41/41; S17 tests 11/11 and validator PASS. See [full log](full-verify-current-source.log) and [exit code](full-verify-current-source.log.exit).
- Exact-parent clean-worktree validation: `npm ci` installed 411 packages with 0 reported vulnerabilities; `npm run setup` and full `npm run verify` both exited 0 on this task checkout. The S17 owner finalizer then recorded 24 command/log records, 19 coverage rows and 283 current source fingerprints; the post-finalizer validator and its 11 unit cases PASS. Raw records: [clean install](setup-exact-uic04.log), [full verify](full-verify-current-source.log), [S17 finalizer](s17-finalize-exact-parent.log), [validator tests](evidence-validator-tests-exact-parent.log), and [validator](s17-validator.log).

- UIC04 exact-SHA GitHub Actions run only after UIC03 has terminal success; no hosted check is claimed in this report before that event.
