# Chính sách CI: chỉ kết luận success được qua gate

## Hợp đồng

GitHub branch protection coi `success`, `skipped` và `neutral` là kết quả hợp lệ của required check. Repository bổ sung hai job tổng để từng producer bắt buộc phải thực sự có `status=completed` và `conclusion=success`.

| Workflow | Producer phải thành công | Check tổng phải bắt buộc khi kích hoạt |
|---|---|---|
| `frontend` | `verify (source and build)`, `build (browser artifacts)`, Chromium 1/2/3-of-3, Firefox 1/2/3-of-3, `e2e (chromium all)` | `gate frontend (success only)` |
| `repository-hygiene` | Ubuntu và Windows | `gate repository hygiene (success only)` |

Các job tổng dùng `if: ${{ always() }}` và phụ thuộc đầy đủ các producer. `e2e (chromium all)` giữ tên required context cũ, kiểm source verify, build artifact và đủ sáu browser shard. `gate frontend (success only)` chờ thêm aggregate này rồi kiểm lại mọi producer. `require-success.mjs` kiểm cả `needs` và inventory từ Actions API của đúng run ID/attempt, bao gồm từng matrix child. Aggregate chỉ cho phép tên gate frontend xuất hiện như downstream chưa kết thúc; không miễn bất kỳ producer nào. Nó không lấy kết quả của workflow khác hoặc của lần thử cũ để thay cho job hiện tại.

`skipped`, `neutral`, failure, cancelled, timeout, metadata thiếu/trùng, sai run/attempt, job lạ và lỗi API đều làm gate thất bại. API không trả đủ inventory hoặc workflow rerun một phần thiếu producer: dùng **Re-run all jobs**. Mỗi request API có timeout 30 giây; job tổng có giới hạn 5 phút. Quyền của gate chỉ gồm `contents: read`, `actions: read`; token không được ghi vào log.

Nếu bỏ qua toàn workflow bằng thông điệp commit hoặc đổi tên check, check bắt buộc sẽ thiếu và merge phải bị chặn. Built demo chạy một lần trên shard 1 của mỗi engine; các bước demo được skip hợp lệ trên shard 2/3. Gate kiểm kết luận job, không đòi mọi step tùy chọn chạy.

## Vòng commit, push và merge

Commit local không có hook chạy full verify/E2E. Kiểm diff, chạy lint/typecheck và test liên quan với thay đổi source; thay đổi CI chạy regression repository và hợp đồng workflow. Chạy `npm run verify` khi chốt một nhóm thay đổi frontend trước push; không chạy lại toàn bộ browser suite chỉ để ghi từng commit trung gian. Evidence source thay đổi vẫn phải được cập nhật bằng owning refresh tương ứng.

Gom commit cùng một công việc, push một lượt lên nhánh PR ngắn hạn. Cả hai workflow chạy khi PR mở/cập nhật và khi push vào `main`; feature push riêng không chạy thêm một bộ CI trùng. Mọi đường dẫn trong PR đều được kiểm, không có path filter. Push mới tự hủy run cũ của cùng PR. Sau merge vẫn kiểm toàn bộ trên SHA main thực tế.

Browser suite giữ ba partition mỗi engine và sáu job producer có cùng required context. `scripts/ci-partitions.mjs` dùng longest-first với tie break cố định và native JSON durations trong `ci-timings.json` (baseline `a48ea08a`, run `40105683526`, hybrid preview, hai worker tại thời điểm đo). Lane 1 dự trù thêm thời gian built-demo chạy tuần tự sau native E2E: wall time đã đo nhân số worker được yêu cầu để cùng đơn vị budget với tổng duration của test. Hiện là 111 giây Chromium và 140 giây Firefox; số này chỉ dùng phân tải. Discovery Playwright hiện tại quyết định coverage: file/test mới tự được đưa vào kể cả chưa có timing; timing chỉ quyết định lịch chạy. Các file giữ nguyên hook/thứ tự. Riêng 14 test role-state và 7 test role-ready có page/context, clock và state riêng được phép chia từng test, với parallel mode khai báo ngay tại hai file đó. Mỗi ready test vẫn giữ nguyên cả hai vòng kiểm nội dung và dữ liệu cũ. Không bật fullyParallel toàn suite.

Để cập nhật timing, lấy đủ sáu native JSON report từ artifact ZIP đã xác minh digest/CRC và lập `provenance.json` theo [bằng chứng timing](../BotSalesAI_Frontend/evidence/ci-speed-v3-20261024/TIMINGS.md). Chạy `node scripts/update-ci-timings.mjs <verified-report-directory>` tại frontend. Generator kiểm digest từng report, đủ ba shard/engine, số worker nguyên từ 1 đến 4 phải khớp provenance, mỗi test passed đúng một lần và toàn bộ ID/key khớp discovery hiện tại trước khi ghi. Metadata ghi đúng số worker đã đo; không đổi nhãn dữ liệu hai worker thành bốn worker. Thiếu/trùng/failed/stale report phải lỗi, giữ nguyên data hiện có. Thời gian dự báo dùng cân tải, không thay số đo wall time của CI hoàn chỉnh.

CI yêu cầu bốn worker mỗi browser runner; mỗi job ghi số CPU khả dụng/RAM thực tế và lỗi ngay nếu yêu cầu vượt CPU khả dụng. Local mặc định một worker; cấu hình chỉ chấp nhận số nguyên từ 1 đến 4. Không tăng số browser job. Cả hai cấu hình Playwright từ chối `test.only` khi chạy CI. Trace đầy đủ `retain-on-failure` được giữ; phép thử bỏ timeline screenshots không cho lợi ích đo được nên không áp dụng. CI đặt `BOTSALES_E2E_RUNTIME=preview` cho test UI dùng đúng demo build; local mặc định `dev`. Global setup sở hữu preview và một dev server/cache riêng cho các test cần source URL. `startDemoServer({ runtime: 'dev' })` chọn source server; regression bắt buộc annotation này cho mọi spec dùng URL `/src/`, `/@fs/`, `/@vite/` và bài kiểm optimizer cache. Giá trị runtime lạ làm lỗi ngay. Borrower close không dừng owner; MSW DB/role nằm trong từng browser page. `cacheIsolationKey` vẫn tạo server riêng theo runtime đã chọn; live-server tests luôn dùng dev/process/cache riêng. Regression kiểm cả hai runtime, borrower close, mock isolation và các server riêng chạy đồng thời. Preview phục vụ kiểm thử artifact, không phải server production.

Ma trận loading tạo page/document mới cho mỗi route và đóng page trong `finally`, giữ đủ role/route/assertion theo contract. Cách này cô lập lifecycle của tab thay vì reload liên tiếp một tab Firefox; mọi pageerror vẫn được thu thập và phải rỗng. Client-fetch barrier đợi Shell/bootstrap sẵn sàng, giữ GET của operation khai báo trong contract, xác nhận query thực sự được gọi và UI loading hiển thị, rồi thả ngay để kiểm nội dung/404. `finally` luôn thả barrier; request ngoài phạm vi vẫn chạy. R33 tiếp tục không có trạng thái loading chặn nội dung: giữ snapshot của Shell hiển thị trong lúc refresh nền được giữ, rồi xác nhận refresh trả 200. Kiểm thêm title chuẩn để không nhận nhầm nội dung của route bootstrap. Không thêm API kiểm thử vào ứng dụng, không tăng timeout hoặc retry.

`run-ci-e2e.mjs` thu toàn inventory, lập ba partition không trùng, viết danh sách bằng [Playwright --test-list](https://playwright.dev/docs/test-cli#test-list) và đối chiếu lại selection trước khi chạy. Khi thành công, JSON report phải chứa đúng mọi ID đã chọn, mỗi test đúng một kết quả passed và số worker thực thi phải khớp plan; skipped/retry/thiếu test đều làm job lỗi. Log và artifact giữ inventory count, selected count, IDs, worker count, trọng số lịch sử và kết quả thực. Bộ kiểm hiện tại là 561 test mỗi engine (giữ đủ 559 cũ, thêm hai bài preview/isolation/barrier), cộng 6 built-demo.

`build-artifacts` chuẩn bị live/demo/worker độc lập với full `verify`; E2E chờ build artifact nên có thể chạy song song với source/evidence verification. Hai aggregate vẫn bắt buộc cả verify, build và mọi browser partition thành công trong cùng attempt. Artifact build/worker gắn run ID, attempt và SHA; browser jobs chỉ tải artifact cùng run đó bằng action ghim SHA, không rebuild sáu lần và không lấy build cũ. Verify tiếp tục chạy nguyên full source/build/audit/evidence; live build trong bước verify là chi phí lặp nhỏ để giữ nguyên lệnh kiểm chuẩn. Local `npm run test:e2e` vẫn setup/build bình thường. Build archive được giữ riêng một bản, browser artifacts giữ report/trace của từng partition. [GitHub artifact sharing](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-what-your-workflow-does/storing-and-sharing-data-from-a-workflow) mô tả việc truyền artifact giữa job.

Thời gian tiết kiệm phải đo từ run thực; các ước tính timing chỉ phục vụ scheduling. Queue/cài browser, CPU contention và partition chậm nhất vẫn có thể chi phối. Không giảm bộ test, tăng retry/timeout hoặc bỏ Firefox để rút ngắn thời gian.

Mỗi shard dùng `--max-failures=1`: khi một bài FAIL, job trả lỗi sớm cùng trace để sửa ngay; các shard khác vẫn tiếp tục vì matrix giữ `fail-fast: false`. Lượt PASS vẫn phải chạy hết partition, và gate vẫn từ chối producer failure/skipped/cancelled. Điều này giảm thời gian chờ sau lỗi đầu tiên, không giảm coverage của một lượt thành công.

## Branch protection của main

Cấu hình khi kích hoạt gồm **9 check** từ GitHub Actions, App ID `15368`: giữ nguyên bảy check producer đang bắt buộc và thêm hai check tổng nêu trên. Áp dụng cả admin, nhánh phải cập nhật với main, bắt buộc PR, 0 ngoại lệ bypass, chặn force-push/xóa nhánh và bắt buộc giải quyết hết thảo luận review. Số approval bắt buộc là **0**, theo lựa chọn của người dùng cho repo hiện có một maintainer.

Chỉ thêm hai check mới vào cấu hình GitHub sau khi chúng đã thực thi thành công trên SHA được push. Giữ nguyên bảy check cũ và các bảo vệ khác trong quá trình kích hoạt. Cấu hình GitHub là trạng thái máy chủ, không được tự nhận đã bật chỉ từ nội dung YAML hoặc tài liệu này; phải đọc lại API và đối chiếu tên check/App ID.

Mọi thay đổi vào main đi qua PR. Branch protection yêu cầu các gate mới cũng chặn PR từ nhánh chưa có wiring của gate; cập nhật nhánh với bản thay đổi CI trước khi merge.

## Kiểm chứng và giới hạn

- Regression local/Ubuntu/Windows: `node --test .github/scripts/check-repository-hygiene.test.mjs .github/scripts/require-success.test.mjs`.
- Regression kiểm `skipped/neutral` tại từng producer, kể cả trường hợp `needs` gộp báo success; kiểm inventory và lỗi API; kiểm hai workflow giữ `always()` và quyền đọc.
- S17 theo dõi workflow frontend. Cập nhật evidence bằng owning refresh với log, exit code và source hash thực; không sửa hash bằng tay để né validator.
- Hosted CI phải được kiểm theo SHA/run/event/attempt, gồm kết luận hai gate và bằng chứng browser. CI hoặc kiểm chứng âm cố ý thất bại phải được ghi riêng, không gộp thành kết quả CI sản phẩm.
- Gate và regression giả định code workflow/checker được tin cậy. Chúng không ngăn chủ repo có quyền Administration sửa chính sách hoặc một thay đổi cố ý sửa cả gate lẫn regression. Review độc lập hiện không bắt buộc; đây là ranh giới quản trị đã chọn, không phải chứng nhận chống sửa đổi bởi chủ repo.

Nguồn GitHub: [required status checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks), [job dependencies và always()](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idneeds), [jobs của một workflow attempt](https://docs.github.com/en/rest/actions/workflow-jobs#list-jobs-for-a-workflow-run-attempt).
