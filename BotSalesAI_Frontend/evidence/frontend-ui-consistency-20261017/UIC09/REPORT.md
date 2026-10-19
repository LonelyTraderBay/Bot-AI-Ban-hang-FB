# UIC09 — Khóa hồi quy và định danh browser thực

**Quyết định:** `KEEP_EXISTING_GATES + FIX_BROWSER_IDENTITY`. Các regression UIC02–UIC08 đã có test theo owner và `npm run verify` nối checker vào chuỗi bắt buộc. Audit UIC10 phát hiện profile `Desktop Chrome` cố định UA 153 dù binary là Chrome 155; cấu hình nay bỏ UA tĩnh và test E2E so major của UA với browser binary ở cả Chromium/Firefox. Không thêm framework/checker thứ hai, không đổi ngưỡng và không bỏ qua test.

## Ma trận phát hiện → regression → gate

| Nguồn thay đổi | Regression hiện hành | Gate và bằng chứng |
|---|---|---|
| UIC02 overlay/backdrop | CSS computed token, modal/drawer/popover/tooltip, dirty form, focus return ở hai viewport | `tests/ui-overlay-theme.spec.ts`, [UIC02](../UIC02/REPORT.md), `npm run test:e2e` full suite ở UIC10 |
| UIC03 lifecycle mock worker | Exact worker/scope rejection được nhận diện; không nuốt worker khác, scope khác, lỗi không liên quan hoặc thông báo cụt | `apps/web/tests/service-worker-update-recovery.test.ts`, `tests/session/demo-server-cache-lifecycle.test.mjs`, [UIC03](../UIC03/REPORT.md) |
| UIC04 Dashboard | Native link/modified-click, quyền của CTA, target, responsive hierarchy và one-track layout | `tests/ui-dashboard-layout.spec.ts`, [UIC04](../UIC04/REPORT.md) |
| UIC05 tokens/layers | Positive canonical token, negative raw token/alias/z-index, UNKNOWN khi spread/source không giải được; runtime overlay checks | `tests/visual-token-checker.test.mjs`, `scripts/check-visual-tokens.mjs`, `tests/ui-overlay-theme.spec.ts`, [UIC05](../UIC05/REPORT.md) |
| UIC06 shared/layout/composition | Positive semantic ownership; negative duplicated inset/gap/style escape; parse-error/opaque UNKNOWN; public API → consumer/render contract | layout checker 86/86, visual checker 6/6, composition 41/41; `tests/ui-layout-binding-gates.test.mjs`, `tests/ui-composition-checker.test.mjs`, `tests/ui-composition-ancestry.test.mjs`, `tests/ui-shared-api-contract.test.mjs`, [UIC06](../UIC06/REPORT.md) |
| UIC07 route/action/fault | Route-state test bắt đầu không warm cache; unknown response không được khẳng định success trước reconcile | [Firefox target 3/3](../UIC07/ci-reconciliation-firefox-targeted-r1.log), [R47 repeats 10/10](../UIC07/ci-reconciliation-firefox-r47-repeat-r1.log), [warehouse route-state repeats](../UIC07/ci-reconciliation-firefox-route-state-repeat-r1.log) |
| UIC08 keyboard/scroll/zoom/accessibility | R06 list-only scrolling và R49 tab focus visible; keyboard-only 11 cases/browser được chạy lại trên source đã ghép | [Chromium 11/11](../UIC08/uic08-after-uic07-ui012-chromium-r1.log), [Firefox 11/11](../UIC08/uic08-after-uic07-ui012-firefox-r1.log), [UIC08](../UIC08/REPORT.md) |
| Browser runtime identity | Context phải khai báo cùng major browser thật; bỏ UA tĩnh từ device descriptor Chrome | [`browser-runtime-identity.spec.ts`](../../../tests/browser-runtime-identity.spec.ts), [Chromium 155 1/1](browser-runtime-identity-chromium-r1.log), [Firefox 155 1/1](browser-runtime-identity-firefox-r1.log) |

Evidence validator có positive case, stale fingerprint/log negative cases, path traversal/missing/duplicate/nonzero PASS rejects và `COMPLETE`/coverage invariants; 11/11 pass trong full verify source cuối. `npm run verify` hiện chạy nối tiếp tất cả gates; exit lỗi mặc định dừng chuỗi. Không có `continue-on-error` trong workflow hiện hành.

## Workflow và đường dẫn

`.github/workflows/frontend.yml` đặt đúng cwd `BotSalesAI_Frontend`, cache và kiểm `BotSalesAI_Frontend/package-lock.json`, chạy `npm ci`, audit dependency, setup, cài Chromium cho verify, rồi `npm run verify`. Bốn E2E jobs phụ thuộc job verify: Chromium all, Firefox shard 1/3, 2/3, 3/3; built-demo áp dụng cho Chromium và Firefox 1/3. Artifacts upload với `always()` để giữ kết quả khi test fail. Mỗi job có timeout 180 phút; `fail-fast: false` giữ các shard khác chạy để có đủ chẩn đoán. Workflow bật `cancel-in-progress: true`, vì vậy cần đợi run cùng nhánh terminal trước lần push kế tiếp. `playwright.config.ts` trước đây dùng `devices['Desktop Chrome']`, cấu hình này ghim UA `Chrome/153.0.8010.12` trong khi `chromium.launch({ channel: 'chrome' })` đo binary `155.0.8059.40`. Đã bỏ field UA khỏi device profile; regression mới đo `browser.version()` và `navigator.userAgent` cùng context, khớp major 155/155 ở cả Chrome và Firefox. Lượt full suite đầu tiên phát hiện sai lệch này và được ngắt ở 23/540 test starts; [partial log](../UIC10/full-e2e-chromium-r1.log) và [biên nhận ngắt](../UIC10/full-e2e-chromium-r1.incomplete.txt) được giữ nhưng không tính PASS. Full suite sẽ chạy lại trong UIC10 trên cấu hình đã sửa.

## Kiểm chứng và giới hạn

[Inventory JSON](gate-inventory-current.json) lưu SHA-256 hiện tại của 36 workflow/package/lockfile/checker/test/config/log artifacts; source baseline trước UIC09 là `e2d5d69c7aa05a6e82d745fef334b8466f3577b0`. Full verify ghép UIC07/UIC08 exit 0; identity test sau sửa PASS 1/1 mỗi browser. Inventory/report links được kiểm lại trước commit. UIC07/UIC08 exact-SHA CI vẫn chờ push theo dependency.

UIC09 kết luận về sự đầy đủ của gate trong Frontend/mock. Exact-SHA CI của corrective UIC07/UIC08 còn phải kết thúc theo thứ tự push; UIC10 sẽ chạy full supported-browser suite trên source cuối. Backend thật, provider, production, Narrator/human/handset review và owner acceptance vẫn nằm ngoài bằng chứng đã đo.

## Tái kiểm chứng trên chuỗi UIC07–UIC09 đã ghép — 18/10/2026

Sau khi ghép selector FE022 đã sửa với thay đổi UIC08/UIC09, chạy lại `npm run test:e2e` chỉ cho regression định danh browser: **2/2 PASS**, Chromium binary `155.0.8059.40`/UA major 155 và Firefox `155.0`/UA major 155. Cùng lệnh đã chạy setup và build cả production lẫn demo; log: [browser identity final](browser-runtime-identity-final-local.log), exit 0.

Trên cùng checkout tuần tự, `npm run verify` exit 0: generated 15/346/245/61; source/session 15/15; boundaries 725 imports và 10/10 negative fixtures; domain 117/117; Vitest 252/252; lint/typecheck/production build; layout 86/86, 94 nguồn/0 finding; visual-token 6/6, 93 nguồn/0 finding; composition 41/41, 92 nguồn/0 finding; evidence validator 11/11. [Log đầy đủ](npm-verify-uic09-final.log), [exit](npm-verify-uic09-final.log.exit). Owner updater làm mới hai fingerprint UIC09 và ghi các receipt: [script](refresh-s17-uic09-final.mjs); sau finalize, [S17 post-validator](test-evidence-uic09-postfinalize.log) đạt 11/11, **34 check/log, 29 coverage rows, 286 fingerprint, COMPLETE**.

Đây là local frontend/mock proof trên cây đã ghép. Các workflow GitHub exact-SHA của remote chưa được gán cho chuỗi mới trước khi push từng commit theo thứ tự.

UIC09 inventory reconciliation: kiểm tra lại toàn bộ **36/36** file trong `gate-inventory-current.json`. Chỉ hash của `tests/states/route-role-state-composition.spec.ts` còn thuộc snapshot cũ; đã cập nhật từ file hiện hành (SHA-256 `04c218990fc65036bac98574080f7a8ba441222896263d4f4a9b6372311f3b33`) sau sửa UIC07. Header inventory nay trỏ tới source revision `5599c05a3c5f9a60af06e91ebda7876bfdba0fe3` và corrective UIC07 commit `a3ca4a852a74dca59b6209d1b2424342f0a176a1`. Updater và kiểm tra lại mọi digest: [refresh-gate-inventory-uic09.mjs](refresh-gate-inventory-uic09.mjs).

## Kiểm lại trên chuỗi corrective UIC07 → UIC08 → UIC09 — 18/10/2026

UIC09 được ghép trên UIC08 commit `5ae1c411a6db494cb76358fc9355c25a16ae94ff`, có corrective UIC07 commit `8f4ada345e03af18e607ee87b8044dce418df8db` trong ancestry. Owner updater kiểm lại **36/36** path/hash, không cần làm mới file nào; inventory ghi hai revision thực này thay vì SHA cũ. [Inventory hiện hành](gate-inventory-current.json), [log kiểm](gate-inventory-refresh-corrected-sequence-r1.log), [exit](gate-inventory-refresh-corrected-sequence-r1.log.exit).

Sau khi bỏ UA Chrome tĩnh, browser identity test chạy qua entrypoint `npm.cmd --script-shell=cmd.exe run test:e2e` và đạt **2/2**: Chrome `155.0.8059.40` với UA major `155`, Firefox `155.0` với UA major `155`. Lượt này thực hiện setup, production build và demo build trước khi chạy Playwright. [Log](browser-runtime-identity-corrected-uic08-r1.log), [exit](browser-runtime-identity-corrected-uic08-r1.log.exit).

Full `npm.cmd --script-shell=cmd.exe run verify` trên cùng cây UIC07–UIC09 exit `0`: generate **15/346/245/61**, source **86 file / 271 operation call / 61 route**, boundary **725 import / 10/10 fixture**, domain **117/117**, Vitest **252/252**, lint/typecheck/production build, layout **86/86** trên 94 file/0 finding, visual token **6/6** trên 93 file/0 finding, composition **41/41** trên 92 file/0 finding. [Log](npm-verify-uic09-corrected-uic07-uic08-20261018-r1.log), [exit](npm-verify-uic09-corrected-uic07-uic08-20261018-r1.log.exit). Owner finalizer refresh hai source fingerprint UIC09 và ghi hai kết quả browser identity; post-finalize validator **11/11**, S17 `COMPLETE` với **40 command/log record, 35 coverage row, 286 fingerprint**. [Post-finalize log](postfinalize-validator-corrected-sequence-r1.log), [exit](postfinalize-validator-corrected-sequence-r1.log.exit).

Đây là bằng chứng Frontend/mock ở checkout cục bộ. GitHub exact-SHA UIC07 vẫn đang chạy các E2E shard; commit UIC09 được giữ sau UIC08 và chỉ push sau khi các SHA trước đã có kết quả terminal. Không dùng phép đo local này thay Actions, backend thật hay human/device acceptance.
