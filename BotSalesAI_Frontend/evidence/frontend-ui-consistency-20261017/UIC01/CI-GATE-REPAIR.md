# UIC01 — Sửa cổng CI theo kết quả GitHub thực tế

- Ngày kiểm chứng: 17/10/2026
- Phạm vi: React Frontend với API MSW tổng hợp; không đại diện Backend, staging, production hoặc nghiệm thu người dùng.
- Run phát hiện lỗi: [GitHub Actions #38942530101](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/38942530101), SHA `679f94380745fb42aae440c247cdcf275510127d`.
- Kết quả run gốc lấy trực tiếp bằng `gh run view 38942530101`: source/build PASS; 3/3 Firefox shards PASS; Chromium suite FAIL với 443/445 ca PASS và hai ca lỗi FE010, FE016.

## Phân tích nguyên nhân từ trace và source

CI trước đây cài Playwright-managed Chromium `153.0.8010.12`, trong khi baseline Frontend yêu cầu Chrome được hỗ trợ từ major 154. Phiên bản Chromium 153 do Playwright quản lý vì vậy không phải browser acceptance mục tiêu; test vẫn chạy trên engine đó và bộc lộ hai lỗi.

FE016 mất từ khóa tìm kiếm chưa submit khi người dùng thay đổi bộ lọc trạng thái. `Toolbar` đồng bộ draft mỗi lần object `URLSearchParams` đổi, kể cả khi `q` không đổi; việc cập nhật `status` do đó có thể xóa draft. Sửa effect chỉ đồng bộ theo giá trị `q`, còn test nay nhập `Linh` trước khi đổi status và xác minh draft cùng URL query được giữ.

FE010 là lỗi điều hướng/thời điểm chờ khi chạy trên Chromium 153; luồng đã đạt trên Chrome Stable hỗ trợ. Workflow nay cài branded Google Chrome, hai Playwright config dùng `channel: 'chrome'`, và CI dừng nếu major Chrome thấp hơn 154. Cách chọn branded Chrome được Playwright hỗ trợ chính thức trong [tài liệu trình duyệt](https://playwright.dev/docs/browsers#google-chrome--microsoft-edge).

## Kết quả kiểm chứng sau sửa

- Playwright local thực tế mở Chrome Stable `155.0.8059.40` bằng `channel: 'chrome'`.
- FE010 và FE016 lặp ba lần mỗi test: **6/6 PASS**, exit 0. Log đầy đủ: [`targeted-chrome-regression.log`](targeted-chrome-regression.log).
- `npm run verify`: exit 0; generated contracts 15 output/346 schema/245 operation/61 route; source 85 file/271 operation/61 route; boundary 723 import và 10/10 negative fixtures; domain 117/117; unit 242/242; layout 86/86 không finding; visual token 5/5 không finding; UI composition 41/41 không finding; evidence validator 11/11. Log: [`verify-local-after-gate-fix.log`](verify-local-after-gate-fix.log).
- S17 validator sau khi cập nhật log: 13 command/log record, 12 coverage rows, 280 fingerprint; COMPLETE.
- Built demo ở Chrome Stable có artifact SHA-256 `94e2f185bd736a3c1f6d7f87bef9537642f056e8dd0ed8eab6b6c3188acb7d15`; 61/61 routes render tại 390px và 1440px, zero page errors/overflow. Dữ liệu: [`built-demo-routes-chrome-390.json`](built-demo-routes-chrome-390.json), [`built-demo-routes-chrome-1440.json`](built-demo-routes-chrome-1440.json). Runner đã ghi `.last-run.json` là 3/3 assertions PASS, nhưng tiến trình teardown treo trên Windows nên parent bị dừng thủ công; không tính là clean process-exit proof.

## Trạng thái bàn giao

Lần sửa đầu đã commit/push riêng thành `e2d1d848ce43692074f25db840dd7a1e73aaa6b9`; remote khớp SHA. Run #38942530101 là run của SHA cha và kết luận failure. Run #38954041345 đang chạy trên SHA đầu; Firefox `3-of-3` thất bại do assertion draft cũ và Chromium còn chạy. Follow-up assertion có local proof nhưng chưa commit/push. UIC02 vẫn giữ commit/push sau khi UIC01 mới đạt Actions terminal trên đúng SHA.

## Follow-up theo Firefox shard của run #38954041345

Run #38954041345 trên SHA `e2d1d848ce43692074f25db840dd7a1e73aaa6b9` cho thấy Firefox `1-of-3` và `2-of-3` PASS; `3-of-3` phát hiện assertion cũ không khớp hành vi draft đã sửa. Test `Toolbar preserves Products URL filters, search submit, clear and independent category lookup` vẫn mong ô tìm kiếm thành rỗng sau khi đổi `status`, nhưng trình duyệt thực tế giữ `unsubmitted draft` trong khi URL chỉ thêm `status=active` và không submit `q`. Đây là expectation lỗi thời sau sửa FE016, không phải source regression: hợp đồng đã đo ở FE016 là giữ bản nháp khi tham số URL không liên quan thay đổi.

Đã cập nhật assertion để yêu cầu draft giữ nguyên. Cùng test chạy riêng **3/3 trên Chrome Stable 155.0.8059.40** và **3/3 trên Playwright Firefox 155.0**. Log kết hợp có version/exit: [`targeted-toolbar-regression.log`](targeted-toolbar-regression.log); log từng trình duyệt: [`targeted-toolbar-chrome.log`](targeted-toolbar-chrome.log), [`targeted-toolbar-firefox.log`](targeted-toolbar-firefox.log). S17 validator sau cập nhật: **11/11 test**, `COMPLETE`, 15 command/log record, 14 coverage row và 280 fingerprint; log: [`s17-validator-final.log`](s17-validator-final.log). Lần xác thực trước đó bắt đúng mismatch giữa expected/observed và được giữ tại [`s17-validator-first-attempt.log`](s17-validator-first-attempt.log).

Artifact Firefox CI đầy đủ đã tải và giữ trong workspace tại `ci-run-38954041345-firefox-3-of-3`; run/artifact gốc vẫn thuộc [Actions #38954041345](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/38954041345). Run #38954041345 dùng SHA trước follow-up: Firefox `3-of-3` thất bại vì assertion draft cũ, còn Chromium E2E vẫn đang chạy sau hơn 40 phút; GitHub chưa cung cấp log Chromium khi job còn chạy. Vì vậy run này không xác nhận follow-up. Chỉ mở khóa UIC02 sau khi Actions của SHA follow-up kết thúc và đạt PASS trên mọi job.

## Follow-up mới — giữ bộ lọc khi gửi tìm kiếm

Run [GitHub Actions #38960320147](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/38960320147), SHA `565a073eafdc4594b4fd0fbe2e41e1e308f2544b`, phát hiện thêm lỗi thật trong cùng luồng Products. Sau khi URL có `status=active`, gửi tìm kiếm `Áo` làm URL mất `status`. Firefox trace cho thấy URL trước Enter là `?status=active`, sau Enter là chỉ `?q=%C3%81o`; assertion nhận `Expected: "active"`, `Received: null`. Artifact `frontend-firefox-3-of-3-38960320147-1-00876f6421b6ba2f4b0529e80493e7052af5d6d2` được giữ tại `ci-run-38960320147-firefox-3-of-3/`.

Source React Router DOM `7.18.4` cho thấy setter `useSearchParams` đóng trên snapshot `searchParams`. History URL có thể đổi trước render kế tiếp của Router; callback con dùng snapshot cũ rồi ghi query mới làm rơi filter. Sửa tại `shared/model/filters.ts`: `currentSearchParams` đọc query trình duyệt hiện tại khi browser path khớp route, đồng thời fallback về Router params khi chạy với router không gắn vào browser location. `Toolbar` và `ProductsPage.setFilter` dùng helper này trước khi cập nhật `q`, `status` và `categoryId`; reset cursor giữ nguyên. Regression xác nhận `status=active` ngay sau khi search được gửi và sau khi xóa search; declaration lines của shared UI catalog được tính lại từ source.

Kiểm chứng source hiện tại:

- Test `Toolbar preserves Products URL filters, search submit, clear and independent category lookup`: **10/10 Chromium + 10/10 Firefox, tổng 20/20 PASS**, exit 0. Browser version được đo khi launch: Chrome Stable `155.0.8059.40`; Playwright Firefox `155.0`. Log: [`targeted-toolbar-current-query.log`](targeted-toolbar-current-query.log).
- Full `npm.cmd --script-shell=pwsh.exe run verify`: **exit 0**; generated 15/346/245/61, source/session 15/15, boundary fixtures 10/10, domain 117/117, Vitest 242/242, production build, layout 86/86, visual token 5/5, composition 41/41, evidence validator 11/11. Log: [`verify-uic01-current-source.log`](verify-uic01-current-source.log). The shared checkout also contained staged UIC02 work, so this is a local mixed-worktree result; GitHub Actions on the UIC01 commit SHA is the exact-source gate.
- S17 sau refresh: **COMPLETE**, 17 command/log records, 16 coverage rows, 280 current fingerprints; validator exit 0. Updater: [`refresh-current-s17.mjs`](refresh-current-s17.mjs).

**Delivery hiện tại:** source và proof follow-up PASS local nhưng đang chờ commit/push riêng và Actions terminal trên SHA mới. Trên SHA `565a073eafdc4594b4fd0fbe2e41e1e308f2544b`, Firefox shard 3 đã thất bại; Chromium của run đó còn chạy khi kiểm tra. UIC02 tiếp tục khóa theo dependency đến khi mọi check trên SHA sửa mới thành công.
