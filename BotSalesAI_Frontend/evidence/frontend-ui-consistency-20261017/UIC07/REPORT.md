# UIC07 — Kiểm chứng route, quyền, trạng thái và hành động

**Trạng thái thực tế:** `LOCAL_VERIFIED — S17 đã làm mới và full verify cục bộ PASS; commit/push cùng CI exact-SHA mới đang chờ`. Source và bằng chứng UIC07 đã chạy trên cùng checkout; không còn cặp route-role command chưa được xử lý trong phạm vi Frontend/mock.

**Phạm vi:** React Frontend với MSW và dữ liệu tổng hợp. Lệnh `unknown` là phản hồi được MSW mô phỏng cho UI; không chứng minh Backend, provider, staging, production hoặc persistence ngoài đời thật.

## Kết quả đo từ hợp đồng và browser

Ma trận cuối được sinh từ `botsales-kit/contracts/route-manifest.json`, `permission-catalog.json` và `packages/contracts/src/operations.json`; bằng chứng nguồn được ghi cùng hash trong [ma trận](../../../docs/route-state-role-matrix.json) và [bản sao UIC07](route-state-role-matrix-final.json).

| Phép đo | Kết quả hiện hành | Phạm vi |
|---|---:|---|
| Route × role | 61 × 7 = 427 | 61 route canonical, bảy role preset |
| Ô route-role-state | 3.402 tổng; 1.200 áp dụng | 1.200/1.200 áp dụng được kiểm trực tiếp; các ô còn lại được phân loại N/A theo permission, shared shell hoặc fixture |
| Quyền đọc route | 399/399 PASS | 57 route riêng tư × 7 role; route công khai được tách |
| Route × viewport × browser | 244/244 | 61 route × 390×844 và 1440×900 × Chromium/Firefox; 0 geometry issue, 0 page error |
| State trực tiếp theo role | loading 200, success 193, error 200, empty 165, stale 192 | Các ngoại lệ được ghi rõ trong JSON; stale là lỗi refetch mock, chưa phải mất mạng thật |
| Shared state cases | 23 PASS | Bao gồm loading/error/empty, validation, conflict, unknown và capability |
| Command unknown — API/UI | 50/51 cặp trực tiếp PASS; 1/51 N/A; 0 chưa kiểm | Hành động từ UI nhận HTTP 202, `data.status=unknown`, hiển thị kết quả đối soát và không báo thành công |
| Command unknown — recovery shell | 51/51 PASS | Chỉ chứng minh shell hiển thị unresolved intent; không tính thay API result |
| Browser | Chromium 155.0.8059.40; Firefox 155.0 | Hai browser bắt buộc trong suite này |

Cặp N/A duy nhất là owner@R35 `approvePrivacyRequest`: contract hiện chưa có luồng xác nhận bước hai phía Frontend. Ma trận ghi `NOT_APPLICABLE_BY_FRONTEND_STEP_UP_BOUNDARY` và reason `frontend-step-up-not-implemented` trên cả hai browser. Không tính N/A là request API PASS. Các ô state N/A cũng giữ lý do theo catalog route guard, snapshot của shared Shell hoặc fixture không có resource.

## Thay đổi và nguyên nhân

- Bổ sung tests route-role cho trạng thái capability, empty-list, ready/error/loading/stale và recovery shell; generator xác thực marker với route manifest, quyền và schema response, đồng thời từ chối dùng shell fixture làm bằng chứng API.
- Thêm các ca hành động còn thiếu theo route-role. Suite tổng hợp hiện chạy 42 ca trên mỗi browser, bao gồm các cặp R19, R21, R24, R26, R29, R35, R42, R45, R47–R50, R56 và R57; kết quả chi tiết nằm trong [log 84 lượt](command-unknown-master-actions-final-r1.log).
- Firefox R42 từng timeout vì claim/refetch cập nhật React Query chưa kịp bật điều khiển kho. Test hiện đợi response refresh của prep-job và work-item rồi mới thao tác; dữ liệu seed chạy trên demo server/cache mới để tránh lẫn state giữa ca. Lượt tổng hợp cuối đã PASS.
- Cập nhật owner UI ở bot, catalog, finance, operations và orders để giải thích rõ trạng thái empty/lookup chưa đối chiếu; giữ nguyên API response/action contract.
- Ma trận hiện ghi 1.200/1.200 ô state áp dụng trực tiếp và 50/51 cặp command trực tiếp; không cộng bằng chứng shell vào số API.

## Kiểm chứng cuối

- [Full verify trên source UIC07](npm-verify-final-r7.log), [exit code](npm-verify-final-r7.log.exit): `npm.cmd --script-shell=cmd.exe run verify`, Node 24.19.0/npm 11.17.0, exit 0. Đo được: generate 15 outputs/346 schemas/245 operations/61 routes; source/session 15/15; boundary fixture 10/10; domain 117/117; Vitest 252/252; lint/typecheck; production build; layout 86/86 với 94 file/0 finding; visual-token 6/6 với 93 file/0 finding; composition 41/41 với 92 file/0 finding; S17 validator 11/11.
- [Command-unknown 84 lượt](command-unknown-master-actions-final-r1.log): 84/84 pass (42 Chromium + 42 Firefox), 0 failed; mỗi marker giữ browser/role/route/operation và kết quả unknown/N/A.
- [Ma trận viewport](route-viewport-chromium-firefox-r1.log), [role access](route-role-matrix-chromium-firefox-r1.log), [role-state suite Chromium](route-role-state-chromium-r1.log), [role-state suite Firefox](route-role-state-firefox-r1.log), [ready/stale](route-role-ready-stale-chromium-firefox-r10.log), [capability](route-role-capability-chromium-firefox-r3.log), [loading](route-role-state-chromium-r1.log) và [shell recovery](route-role-unknown-shell-chromium-firefox-r2.log) đều có exit receipt 0.
- Ma trận tái sinh: [log generator](generate-route-state-matrix-uic07-final-r3.log), exit 0. Snapshot report lưu ở [route-state-role-matrix-final.json](route-state-role-matrix-final.json).
- S17 fingerprint giới hạn đúng các file UIC07; [preverify](s17-preverify-final-r1.log), [finalize](s17-finalize-final-r1.log), [post-finalize validator](s17-postfinalize-validator-final-r1.log) và [11 regression tests](test-evidence-postfinalize-final-r1.log) đều exit 0. Receipt hiện có 284 fingerprints, 28 command/log records và 23 coverage rows.
- GitHub exact-SHA đầu cho `ebd24e6b39804b2b9dd94552b09046e859cbc3d6`: push run [#39031665193](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39031665193) và PR run [#39031668578](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39031668578) PASS verify/build nhưng Firefox shard 1/3 FAIL tại `FE018.S03`, do assertion toàn trang `getByRole('alert').toHaveCount(0)` đếm banner demo và cảnh báo trạng thái cấu hình tạm dừng. Snapshot CI và tái hiện Firefox cục bộ xác nhận đây là hai alert hợp lệ; assertion đã thu hẹp về không có marker câu trả lời AI và không có dòng gửi ra ngoài. [Targeted Chromium + Firefox](uic07-fe018-denial-chromium-firefox-r1.log), [exit](uic07-fe018-denial-chromium-firefox-r1.log.exit): 2/2 PASS.
- Với test correction SHA `10a9bb336b5bad4f059bd3efc23d76fdafbbdd3e`, cả push [#39033773762](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39033773762) và PR [#39033776807](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39033776807) FAIL tại S17 trước E2E vì fingerprint `tests/fe018.spec.ts` cũ; E2E bị skip theo dependency. Finalizer [UIC07](finalize-s17-uic07.mjs) đã refresh fingerprint theo source mới trong working tree. [Full verify mới](npm-verify-after-correction-r2.log), [exit](npm-verify-after-correction-r2.log.exit): exit 0; [validator sau finalize](test-evidence-postfinalize-after-correction-r1.log), [exit](test-evidence-postfinalize-after-correction-r1.log.exit): 11/11 unit test và S17 COMPLETE, 28 record/23 coverage/284 fingerprint. Lượt gọi verify đầu [r1](npm-verify-after-correction-r1.log) dừng trước test do child `cmd.exe` không tìm thấy `npm`; chạy lại bằng PATH cục bộ gồm Node, Git và thư mục Windows hệ thống, không thay đổi source, đã PASS. Còn commit/push receipt mới và CI đầy đủ đúng SHA.

## Đối soát lỗi CI UIC07 mới nhất

Push run [#39034662903](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39034662903) trên SHA `ff149d8c7951d518e91edfa64f892f070d548a55` đã PASS verify và ba Firefox shard; Chromium all vẫn đang chạy tại lúc ghi nhận. PR run [#39034665549](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39034665549) kết thúc với verify, Chromium/built-demo và hai Firefox shard PASS, một Firefox shard FAIL ở hai assertion:

- R39 warehouse error/empty: test mở R39 `/notifications` trước khi bật fault; cache React Query còn fresh (`staleTime: 5000`) nên lần vào lại có thể nhận success cũ. Test nay bắt đầu từ R04 `/overview`, trang không tải notifications trước fault. [Firefox targeted](ci-reconciliation-firefox-targeted-r1.log) PASS 3/3; lặp suite route-state 3 lượt PASS 3/3 mỗi lượt trong [repeat log](ci-reconciliation-firefox-route-state-repeat-r1.log).
- R47 owner `postGoodsReceipt`: MSW mô phỏng HTTP 202 `unknown` sau khi cập nhật receipt thành `posted`; event đối soát có thể trả trạng thái cuối và đóng hộp xác nhận. Test cũ đòi hộp thoại vẫn hiện nên đua với trạng thái chuẩn. Assertion nay chờ thông báo đã ghi nhận và xác nhận hộp thoại đóng. [Firefox targeted](ci-reconciliation-firefox-targeted-r1.log) PASS; 10 lần lặp owner/warehouse PASS trong [repeat log](ci-reconciliation-firefox-r47-repeat-r1.log).

Sau khi sửa, `npm.cmd --script-shell=cmd.exe run verify` chạy lại trên source hiện hành exit 0: generate 15/346/245/61; boundary 10/10; domain 117/117; unit 252/252; typecheck/lint; production build; layout 86/86 với 94 file/0 finding; visual 6/6 với 93 file/0 finding; composition 41/41 với 92 file/0 finding; UI evidence 11/11. [Log](ci-reconciliation-npm-verify-r2.log) và [exit](ci-reconciliation-npm-verify-r2.log.exit). Finalizer [preverify](ci-reconciliation-s17-preverify-r2.log) → full verify → [finalize](ci-reconciliation-s17-finalize-r2.log) → [validator cuối](ci-reconciliation-test-evidence-r2.log) đều exit 0; S17 ghi 285 fingerprint, 28 check và 23 coverage row. Đây là local proof trên mock; CI mới exact-SHA cho corrective commit còn chờ push.

## Ranh giới chưa kiểm

UIC07 chỉ chứng minh Frontend chạy trên synthetic MSW. Native browser zoom/text-only, reflow/accessibility chi tiết thuộc UIC08; full E2E và built-demo cuối thuộc UIC10. Backend thật, provider, network offline, Narrator/screen-reader speech, human acceptance và owner/UAT vẫn chưa được kiểm ở task này. GitHub exact-SHA checks chỉ có sau khi commit/push.

**Quyết định:** đủ local proof để mở UIC08 sau khi UIC07 commit/push và CI exact-SHA được đối chiếu. Không tuyên bố UIC07 là Backend/API thật hoặc nghiệm thu cuối.

## Bổ sung xác minh cô lập cache trạng thái — 17/10/2026

Kiểm tra lại assertion route-state trên Firefox tìm thấy harness chuyển từ trạng thái API lỗi sang danh sách rỗng trên cùng trang; React Query giữ dữ liệu lỗi và khiến R05 không nhận được empty response. Harness hiện mở trang sạch cho lượt empty, chọn vai trò và trạng thái trước khi đi qua các route. Phần lỗi API tiếp tục dùng R37/R52 làm trang bootstrap được cả bảy vai trò đọc; R37 được xác minh trên trang khác để cache bootstrap không làm sai kết quả.

- Lượt tái hiện trước sửa [r4](route-state-error-bootstrap-chromium-firefox-r4.log): 2 test pass, 2 fail; Firefox owner và manager đều dừng tại empty R05. Đây là lỗi test isolation, không phải lỗi giao diện được quan sát. Padding khoảng trắng cuối dòng do formatter Playwright đã được bỏ khỏi bản lưu; tên ca và kết quả được giữ nguyên.
- Lượt sau sửa [r5](route-state-clean-empty-chromium-firefox-r5.log): exit 0, Chromium 155 + Firefox 155, owner + manager, 4/4 test pass trong 3,3 phút; 394 dòng `ROLE_STATE=error/empty ... RESULT=PASS` xác nhận route/state áp dụng.
- Cấu hình chạy lại: [route-state-targeted.playwright.config.mjs](route-state-targeted.playwright.config.mjs). Lượt này chỉ chứng minh hai vai trò và hai browser mục tiêu; không thay full E2E, không mở rộng thành bảy vai trò.

SHA `5c4eca680605ea6e9270ef0329f16b5839445200` là snapshot trước sửa. Hai workflow GitHub của SHA đó còn chạy tại lúc ghi nhận; kết quả ấy không được gán cho corrective commit. Exact-SHA push/PR CI của commit sửa sẽ được đối chiếu sau khi đẩy tuần tự.

Việc tái lập dùng cài sạch [npm ci](route-state-correction-npm-ci-r1.log) và [npm run setup](route-state-correction-npm-setup-r1.log), cả hai exit 0; cấu hình test tạo cache Vite/test output riêng cho run.

## Đối chiếu exact-SHA đầu tiên và sửa fingerprint S17 — 18/10/2026

Commit UIC07 `81756f8cc15dd7fe23f870fd5309571e2bc8f125` đã được fast-forward push lên PR #1. Hai workflow exact-SHA [push #39053775858](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39053775858) và [PR #39053779540](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39053779540) đều kết thúc `failure` tại gate `npm run verify`; các job E2E bị skip. Log cho thấy các gate trước đó đều qua, rồi evidence validator báo fingerprint `tests/states/route-role-state-composition.spec.ts` cũ: manifest còn `528970c2...`, source đúng ở commit là `04c21899...`. Đây là stale evidence manifest, chưa phải lỗi runtime UI. Transcript đã chuẩn hóa duy nhất khoảng trắng cuối dòng; SHA-256 log gốc và log đã chuẩn hóa ở [biên nhận hash](github-verify-failure-transcript-hashes-20261018.json), còn log chuẩn đầy đủ nằm trong GitHub run. [push](github-verify-failure-push-39053775858-normalized.log), [PR](github-verify-failure-pr-39053779540-normalized.log).

Dùng owner finalizer [finalize-s17-uic07.mjs](finalize-s17-uic07.mjs) để refresh fingerprint UIC07 theo đúng source và kiểm tra các fingerprint ngoài allowlist không đổi. Lượt local `npm.cmd run verify` với Node 24.19.0/npm 11.17.0 đạt exit 0: generate 15/346/245/61; domain 117/117; Vitest 252/252; layout 86/86; visual-token 6/6; composition 41/41; S17 evidence validator 11/11. [Log verify](github-exactsha-verify-final-20261018.log), [exit](github-exactsha-verify-final-20261018.log.exit), [preverify](s17-preverify-github-exactsha-final-20261018.log) và [finalize](s17-finalize-github-exactsha-final-20261018.log). Chạy riêng `npm.cmd run test:evidence` sau finalize cũng đạt 11/11 và `status=COMPLETE`: [log](test-evidence-postfinalize-github-exactsha-20261018.log), [exit](test-evidence-postfinalize-github-exactsha-20261018.log.exit).

Cần một commit UIC07 evidence-refresh riêng để remote CI dùng manifest đã khớp. Exact-SHA push/PR checks của commit follow-up sẽ được ghi sau khi terminal; chưa tính lần 81756 là PASS. Không chuyển sang UIC08 trước khi corrective SHA được đối chiếu.