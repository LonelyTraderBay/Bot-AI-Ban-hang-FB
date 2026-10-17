# UIC07 — Kiểm chứng route, quyền, trạng thái và hành động

**Trạng thái thực tế:** `LOCAL_VERIFIED — đang sửa lỗi kiểm thử CI trước khi chốt exact-SHA`. Source và bằng chứng UIC07 đã chạy trên cùng checkout; không còn cặp route-role command chưa được xử lý trong phạm vi Frontend/mock.

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
- GitHub exact-SHA lần đầu cho `ebd24e6b39804b2b9dd94552b09046e859cbc3d6`: push run [#39031665193](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39031665193) và PR run [#39031668578](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39031668578) đều PASS verify/build nhưng Firefox shard 1/3 FAIL tại `FE018.S03` vì assertion toàn trang `getByRole('alert').toHaveCount(0)` đếm cả banner phạm vi demo và cảnh báo cấu hình tạm dừng. Đã tái hiện đúng lỗi bằng Firefox cục bộ; snapshot ghi hai alert này và prompt vẫn được giữ. Bản sửa thu hẹp kiểm tra về không có nội dung kết quả AI/không có dòng gửi ra ngoài; [chạy hồi quy Chromium + Firefox](uic07-fe018-denial-chromium-firefox-r1.log), [exit](uic07-fe018-denial-chromium-firefox-r1.log.exit) PASS 2/2. Commit/push sửa lỗi và GitHub exact-SHA đầy đủ vẫn đang chờ.

## Ranh giới chưa kiểm

UIC07 chỉ chứng minh Frontend chạy trên synthetic MSW. Native browser zoom/text-only, reflow/accessibility chi tiết thuộc UIC08; full E2E và built-demo cuối thuộc UIC10. Backend thật, provider, network offline, Narrator/screen-reader speech, human acceptance và owner/UAT vẫn chưa được kiểm ở task này. GitHub exact-SHA checks chỉ có sau khi commit/push.

**Quyết định:** đủ local proof để mở UIC08 sau khi UIC07 commit/push và CI exact-SHA được đối chiếu. Không tuyên bố UIC07 là Backend/API thật hoặc nghiệm thu cuối.
