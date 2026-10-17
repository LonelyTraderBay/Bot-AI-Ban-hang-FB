# UIC08 — Reflow, keyboard, browser zoom và accessibility

**Phạm vi:** React Frontend chạy với Vite demo và dữ liệu MSW tổng hợp. Snapshot đo ban đầu dùng parent `ff149d8c7951d518e91edfa64f892f070d548a55`; sau khi sửa test UIC07, source được ghép lại trên corrective SHA `5c4eca680605ea6e9270ef0329f16b5839445200` và kiểm chứng lại bên dưới. Backend đang là placeholder trống. Kết quả ở đây là bằng chứng local, chưa phải staging, production hay nghiệm thu của chủ sản phẩm.

**Trạng thái:** `LOCAL_VERIFIED`; commit/push và GitHub exact-SHA checks đang chờ. Tự động hóa đạt kết quả ghi dưới đây. Human review bằng screen reader, speech và thiết bị thật được giữ `NOT_RUN`.

## Thay đổi có nguyên nhân và regression

- **R06 Inbox:** marker cuối danh sách gọi `scrollIntoView()` đã cuộn cả document khi danh sách tin nhắn không cần cuộn bên trong. Thay bằng ref tới danh sách và chỉ `scrollTo()` danh sách khi `scrollHeight > clientHeight`. Regression ở `tests/ui012-keyboard.spec.ts` đo `window.scrollY = 0`, hành động “Tiếp quản” nằm dưới header Shell và thử hit-test thật. Ma trận sau sửa trên viewport 320×480 xác nhận document không tự cuộn.
- **R49 Đối soát:** tablist ngang thiếu tên truy cập được và phím End có thể đưa focus tới tab cuối nằm ngoài vùng nhìn. Bổ sung tên tablist, cuộn tab vào vùng nhìn khi focus, và regression chạy End/Enter/Home/Space; test xác nhận tab cuối visible trong scroller trước khi kích hoạt.
- W30 harness nay ghi ảnh baseline 100%, kiểm route/focus trong vùng clip thực, và kiểm native zoom bằng Page zoom của Chrome Settings trong hồ sơ tạm. Không cài extension, đổi CSS zoom hoặc chỉnh thiết lập profile thật của người dùng.

## Kết quả đo cuối

| Kiểm tra | Kết quả quan sát được | Bằng chứng |
|---|---|---|
| Responsive routes | 61 route × 9 profile (320, 390, 767, 768, 1024, 1279, 1280, 1440, 1920 CSS px) × Chrome 155.0.8059.40 và Firefox 155.0 = **1.098/1.098 hàng**; 0 horizontal overflow toàn trang, 0 control bị che tại hit target, 0 page error, 0 failure. Có 60 ảnh cuối. | [JSON và hash đầu vào](responsive-profiles-current-20261017-205610-71320.json), [log](responsive-profiles-supported-browsers-final.log), [exit](responsive-profiles-supported-browsers-final.log.exit) |
| R06/R49 keyboard + media | Chrome 155 và Firefox 155: mỗi engine 2 probe tablist và 1 probe reduced-motion/forced-colors; 0 lỗi/failure. Focus End/Enter giữ tab trong scroller; reduced motion cho transition/animation 0s và scroll `auto`. Đây là browser emulation của forced-colors, không phải Windows High Contrast thật. | [JSON](keyboard-media-modes-current-20261017-210238-13680.json), [log](keyboard-media-supported-chrome155-final.log), [exit](keyboard-media-supported-chrome155-final.log.exit) |
| UI012 keyboard regression | **22/22 PASS** tổng suite, 11 Chrome + 11 Firefox; gồm 2 hồi quy UIC08. | [log](ui012-full-final.log), [exit](ui012-full-final.log.exit) |
| aXe theo route | Mỗi browser có 62 audit: 61 route `loaded` và Dashboard R04 thêm trạng thái `loading`; 0 violation, 0 page error. aXe tự động không thay human/speech review hoặc chứng minh mọi tổ hợp tương phản. | [Chrome JSON](axe-chromium-after-r2.json), [Chrome log](axe-chromium-after-r2.log), [Firefox JSON](axe-firefox-after-r2.json), [Firefox log](axe-firefox-after-r2.log) |
| Native Chrome browser zoom 200% | Page zoom trong `chrome://settings/appearance` đọc lại `200%` trên Chrome 155. Baseline 1280×720/DPR 1; sau zoom 640×360/DPR 2. **5/5** form error, menu nhãn dài, report ID dài, inbox composer, dialog lý do; 0 tràn ngang, 0 text/focus issue, 0 page error, 0 HTTP write. Hồ sơ tạm được xóa sau lượt chạy. | [JSON và screenshot hashes](../../frontend-ui-improvements/UI028/W30/actual-browser-zoom-200-current-20261017-210145-58660.json), [log](browser-zoom-native-settings-chrome155-r2.log), [exit](browser-zoom-native-settings-chrome155-r2.log.exit) |
| Firefox native text-only zoom 200% | Firefox 155, `zoomFullPage=false`, 5/5 kịch bản; CSS viewport/DPR giữ cố định, 0 issue và profile tạm được xóa. | [JSON và screenshot hashes](../../frontend-ui-improvements/UI028/W30/native-text-only-200-current-20261017-205102-11476.json), [log](native-text-focus-final.log), [exit](native-text-focus-final.log.exit) |
| Source gates + S17 | `npm run verify` exit 0 trên source/test UIC08: generate 15 outputs/346 schemas/245 operations/61 routes; source/session 15/15; boundary fixtures 10/10; domain 117/117; unit 252/252; layout 86/86; visual-token 6/6; composition 41/41; evidence validator 11/11. Validator chạy lại sau cập nhật harness vẫn 11/11; S17: 29 command/log records, 24 coverage rows, 285 current fingerprints, `COMPLETE`. | [Full verify ban đầu](npm-verify-uic08-final.log), [exit](npm-verify-uic08-final.log.exit), [S17 sau finalizer](s17-after-finalize.log), [exit](s17-after-finalize.log.exit), [validator cuối](s17-validator-after-native-browser-zoom.log), [exit](s17-validator-after-native-browser-zoom.log.exit) |

## Đối soát sau khi ghép corrective UIC07

Trên source hợp nhất sau SHA `5c4eca680605ea6e9270ef0329f16b5839445200`, full `npm.cmd --script-shell=cmd.exe run verify` chạy lại exit 0 với cùng bộ số đo: generate 15/346/245/61, source/session 15/15, boundary 10/10, domain 117/117, unit 252/252, lint/typecheck/build PASS, layout 86/86, visual-token 6/6, composition 41/41, validator 11/11 và S17 `29 checks / 24 coverage / 285 fingerprints`. [Log](uic08-after-uic07-reconciliation-verify-r1.log), [exit](uic08-after-uic07-reconciliation-verify-r1.log.exit).

Keyboard regression chạy lại sau khi ghép: Chromium 155 **11/11 PASS** ([log](uic08-after-uic07-ui012-chromium-r1.log), [exit](uic08-after-uic07-ui012-chromium-r1.log.exit)); Firefox 155 **11/11 PASS** ([log](uic08-after-uic07-ui012-firefox-r1.log), [exit](uic08-after-uic07-ui012-firefox-r1.log.exit)). Trong đó có hai regression UIC08 cho R06 và R49. Đây là lượt nhắm đúng regression trên source hợp nhất; các ma trận 1.098 viewport, native zoom, axe và ảnh before/after ở trên là lượt đo UI trước đó với cùng UI source UIC08.

Ảnh baseline trước/sau cho R06: [R06 trước](before-chromium-R06-320x480-20261017-201405-78916.png), [R06 sau](final-chromium-R06-320x480-20261017-205610-71320.png). Baseline R49 trước sửa nằm trong [đo scroll owner](scroll-owner-inspection-current.json): tablist 320 px không có accessible name và tab cuối ở ngoài khung trước thao tác bàn phím; trạng thái sau sửa được ghi trong [keyboard/media JSON](keyboard-media-modes-current-20261017-210238-13680.json) và [ảnh R49 sau](final-chromium-R49-320x480-20261017-205610-71320.png). Ma trận final ghi đủ route, viewport, scroll owner, hit-test và SHA-256 của ảnh.

## Giới hạn còn mở

- Narrator/VoiceOver/TalkBack, người dùng bàn phím độc lập, speech output, kiểm tra tương phản bởi người, handset vật lý và Safari/Edge: `NOT_RUN` trong môi trường này. Browser emulation và aXe không được tính thay các kiểm tra đó.
- Native zoom đã đo trên Chrome 155 bằng UI cài đặt thật và Firefox 155 bằng thiết lập native text-only. Kết quả W30 cũ trên Chromium Playwright 153 không dùng thay cho Chrome 155.
- Probe ban đầu định nạp extension vào Google Chrome bị chặn trước kịch bản vì Chrome đã bỏ cờ dòng lệnh side-load mà Playwright extension runner cần ([giới hạn được tài liệu Playwright nêu](https://playwright.dev/docs/chrome-extensions), [log](browser-zoom-chrome155-final.log), [exit](browser-zoom-chrome155-final.log.exit), [JSON lỗi](../../frontend-ui-improvements/UI028/W30/actual-browser-zoom-200-current-20261017-205843-61776.json)). Tôi chuyển sang chỉnh Page zoom trong Settings UI, rồi chạy lại năm kịch bản trên Chrome 155. Lượt Settings đầu tiên có nhãn option chứa whitespace; phép đọc được chuẩn hóa và lượt cuối PASS 5/5 ([lượt hiệu chỉnh](browser-zoom-native-settings-chrome155-final.log), [exit](browser-zoom-native-settings-chrome155-final.log.exit), [JSON lượt hiệu chỉnh](../../frontend-ui-improvements/UI028/W30/actual-browser-zoom-200-current-20261017-210114-48556.json), [lượt cuối](browser-zoom-native-settings-chrome155-r2.log)). Các lượt hiệu chỉnh được giữ làm lịch sử, không cộng vào kết quả PASS.
- API phía server, staging, production, Facebook/provider thật và chấp thuận của chủ sản phẩm không thuộc bằng chứng Frontend/mock này.
- Theo đó, kết quả này đóng phần code Frontend/mock và automation trong phạm vi đã chạy; nhãn nghiệm thu accessibility toàn diện vẫn để mở cho đến khi có human/device review.

## Xác minh lại trên chuỗi commit tuần tự UIC07 → UIC08 — 18/10/2026

Sau khi ghép thay đổi UIC08 lên cây có commit UIC07 `85e6838ac4e34830b5f37722e56e1ec5f061e511`, chạy lại toàn bộ `npm.cmd --script-shell=cmd.exe run verify` với Node `v24.19.0`, npm `11.17.0` và PATH rút gọn cho tiến trình Windows CMD. Lệnh exit `0`: generate `15/15` output (`346` schema, `245` operation, `61` route); boundary fixture `10/10`; domain `117/117`; Vitest `26` file, `252/252` test; lint, typecheck, production build; layout `86/86` test, `94` source file, `0` finding; visual token `6/6` test, `93` source file, `0` finding; composition `41/41` test, `92` source file, `0` finding; S17 validator `11/11`.

- [Log npm run verify trên cây ghép](npm-verify-uic08-sequence-final-20261018.log), [exit code](npm-verify-uic08-sequence-final-20261018.log.exit).
- Owner helper [preverify](uic08-sequence-s17-preverify.log) và [finalize](uic08-sequence-s17-finalize.log), đều exit `0`; [validator chạy lại sau finalize](uic08-sequence-postfinalize-test-evidence.log) đạt `11/11`, S17 `29` command/log record, `24` coverage row, `285` fingerprint và `status=COMPLETE`.

Kết quả trên là receipt lịch sử cho source bắt đầu từ SHA UIC07 `85e6838ac4e34830b5f37722e56e1ec5f061e511`; nó không đại diện cho corrective SHA UIC07 hiện tại. GitHub CI của SHA hiện hành được theo dõi riêng trước khi đẩy UIC08.

## Kiểm lại trên corrective UIC07 SHA `8f4ada3` — 18/10/2026

Ghép thay đổi UIC08 lên cây cô lập có UIC07 đã sửa theo response của MSW. Trên cùng source tree trước commit UIC08, chạy lại `tests/ui012-keyboard.spec.ts` bằng binary Chromium 155.0.8059.40 và Firefox 155.0, một worker: **22/22 PASS** (11 mỗi browser), gồm hai regression R06/R49. [Log](uic08-sequence-ui012-chromium-firefox-r2.log), [exit](uic08-sequence-ui012-chromium-firefox-r2.log.exit).

Chạy lại `npm.cmd --script-shell=cmd.exe run verify` trên chính cây đã ghép, Node `v24.19.0`, npm `11.17.0`: exit `0`; generate **15 output / 346 schema / 245 operation / 61 route**; source checker **86 file / 271 operation call / 61 route, 0 issue**; boundary **725 import / 10/10 fixture**; domain **117/117**; Vitest **26 file / 252/252**; lint, typecheck, production build; layout **86/86, 94 file, 0 finding**; visual token **6/6, 93 file, 0 finding**; UI composition **41/41, 92 file, 0 finding**. [Log](npm-verify-uic08-corrected-uic07-20261018-r1.log), [exit](npm-verify-uic08-corrected-uic07-20261018-r1.log.exit).

Owner helper `refresh-s17-uic08-sequence.mjs` xác nhận không có fingerprint lỗi thời ngoài ba source UIC08 được khai báo, refresh chúng và gắn log verify mới. Helper cũng kiểm từng kết quả, số tình huống và SHA-256 source đầu vào của hai bài native zoom trước khi ghi vào S17. Kiểm chạy lại sau finalize đạt **11/11**; S17 là `COMPLETE` với **37 command/log record, 32 coverage row, 285 fingerprint**. [Post-finalize log](postfinalize-validator-corrected-uic07-20261018-r2.log), [exit](postfinalize-validator-corrected-uic07-20261018-r2.log.exit). Chrome Page zoom và Firefox native text-only zoom 200% có receipt riêng 5/5 tình huống mỗi phương pháp; SHA-256 mọi source đầu vào trong JSON zoom khớp checkout hiện tại (10/10 Chrome, 13/13 Firefox). Đây là thao tác qua UI/setting native, không thay bằng đổi CSS hay viewport.

Trạng thái vẫn giới hạn ở Frontend với MSW tổng hợp. Exact-SHA GitHub checks cho UIC07 còn đang chạy; UIC08 chỉ được push sau khi chúng kết thúc terminal. Narrator/speech, đánh giá con người, điện thoại thật, Safari/Edge, backend/provider thật, production và owner acceptance vẫn `NOT_RUN` hoặc ngoài phạm vi.

## Đối soát UIC08 sau khi sửa chuỗi phụ thuộc FE022 — 18/10/2026

Sau khi đưa UIC08 lên corrective source UIC07, S17 báo đúng một fingerprint stale tại `tests/vertical-slices/fe022-flows.spec.ts`: file test đã đổi ở UIC07, còn snapshot của commit UIC08 ban đầu được tạo trước sửa đổi đó. Owner helper `finalize-s17-uic07.mjs --preverify` chỉ làm mới danh sách source được UIC07 khai báo, rồi toàn bộ `npm run verify` chạy lại trên đúng cây UIC08 và exit `0`.

Kết quả đo lần cuối: generate 15 output / 346 schema / 245 operation / 61 route; source/session 15/15; boundary 725 import và fixture 10/10; domain 117/117; Vitest 26 file, 252/252; lint, typecheck, production build PASS; layout 86/86 test, 94 file, 0 finding; visual token 6/6, 93 file, 0 finding; composition 41/41, 92 file, 0 finding. Sau owner finalizer, `test:evidence` đạt 11/11; S17 `COMPLETE`, 38 command/log record, 33 coverage row, 285 fingerprint.

- [Full verify trên cây UIC08 đã cập nhật dependency](npm-verify-after-uic07-merge.log), [exit](npm-verify-after-uic07-merge.log.exit).
- [S17 preverify trên cây UIC08](../UIC07/s17-preverify-on-uic08-amended-tree.log), [owner finalize](s17-finalize-after-uic08-rebase.log), [post-finalize validator](test-evidence-after-uic08-finalize.log), tất cả exit `0`.
- Bằng chứng ghi riêng các lượt PATH con Windows bị cấu hình thiếu trước lần chạy thành công ở UIC11; các lượt lỗi môi trường không được tính vào kết quả PASS.
