# Chính sách CI: chỉ kết luận success được qua gate

## Hợp đồng

GitHub branch protection coi `success`, `skipped` và `neutral` là kết quả hợp lệ của required check. Repository bổ sung hai job tổng để từng producer bắt buộc phải thực sự có `status=completed` và `conclusion=success`.

| Workflow | Producer phải thành công | Check tổng phải bắt buộc khi kích hoạt |
|---|---|---|
| `frontend` | `verify (source and build)`, `build (browser artifacts)`, Chromium 1..6-of-6, Firefox 1..6-of-6, `e2e (chromium all)` | `gate frontend (success only)` |
| `repository-hygiene` | Ubuntu và Windows | `gate repository hygiene (success only)` |

Các job tổng dùng `if: ${{ always() }}` và phụ thuộc đầy đủ các producer. `e2e (chromium all)` giữ tên required context cũ, kiểm source verify, build artifact và đủ mười hai browser shard. `gate frontend (success only)` chờ thêm aggregate này rồi kiểm lại mọi producer. `require-success.mjs` kiểm cả `needs` và inventory từ Actions API của đúng run ID/attempt, bao gồm từng matrix child. Aggregate chỉ cho phép tên gate frontend xuất hiện như downstream chưa kết thúc; không miễn bất kỳ producer nào. Nó không lấy kết quả của workflow khác hoặc của lần thử cũ để thay cho job hiện tại.

`skipped`, `neutral`, failure, cancelled, timeout, metadata thiếu/trùng, sai run/attempt, job lạ và lỗi API đều làm gate thất bại. API không trả đủ inventory hoặc workflow rerun một phần thiếu producer: dùng **Re-run all jobs**. Mỗi request API có timeout 30 giây; job tổng có giới hạn 5 phút. Quyền của gate chỉ gồm `contents: read`, `actions: read`; token không được ghi vào log.

Nếu bỏ qua toàn workflow bằng thông điệp commit hoặc đổi tên check, check bắt buộc sẽ thiếu và merge phải bị chặn. Built demo chạy một lần trên shard 1 của mỗi engine; các bước demo được skip hợp lệ trên shard 2..6. Gate kiểm kết luận job, không đòi mọi step tùy chọn chạy. Khi chuyển ma trận từ 3 sang 6, cập nhật ba required context Firefox từ 1/2/3-of-3 thành 1/2/3-of-6 sau khi toàn bộ CI của PR đã thành công; giữ đủ chín check/App binding, strict và mọi quy tắc bảo vệ khác. Hai aggregate bắt buộc cả sáu Firefox và sáu Chromium, bao gồm các partition không mang required context riêng.

## Vòng commit, push và merge

Commit local không có hook chạy full verify/E2E. Kiểm diff, chạy lint/typecheck và test liên quan với thay đổi source; thay đổi CI chạy regression repository và hợp đồng workflow. Chạy `npm run verify` khi chốt một nhóm thay đổi frontend trước push; không chạy lại toàn bộ browser suite chỉ để ghi từng commit trung gian. Evidence source thay đổi vẫn phải được cập nhật bằng owning refresh tương ứng.

Gom commit cùng một công việc, push một lượt lên nhánh PR ngắn hạn. Cả hai workflow chạy khi PR mở/cập nhật và khi push vào `main`; feature push riêng không chạy thêm một bộ CI trùng. Mọi đường dẫn trong PR đều được kiểm, không có path filter. Push mới tự hủy run cũ của cùng PR. Sau merge vẫn kiểm toàn bộ trên SHA main thực tế.

Browser suite dùng sáu partition mỗi engine và mười hai job producer, hai worker mỗi runner. `scripts/ci-partitions.mjs` dùng longest-first với tie break cố định và native JSON durations trong `ci-timings.json` (baseline `a48ea08a`, run `40105683526`, hybrid preview, hai worker và ba partition mỗi engine tại thời điểm đo). Lane 1 dự trù thêm built-demo tuần tự: wall time đã đo nhân số worker yêu cầu; hiện111s Chromium/140s Firefox, chỉ dùng phân tải. Discovery hiện tại quyết định coverage, kể cả test mới chưa có timing. Các file giữ hook/thứ tự; riêng14 role-state và7 role-ready có page/context, clock và state riêng được chia từng test với parallel mode ngay trong file. Mỗi ready test giữ cả nội dung và stale; không bật fullyParallel toàn suite.

Để cập nhật timing, lấy đủ native JSON từ ZIP đã xác minh digest/CRC, lập `provenance.json` theo [bằng chứng timing](../BotSalesAI_Frontend/evidence/ci-speed-v3-20261024/TIMINGS.md), thêm `partitions: 6` cho ma trận mới (nguồn cũ mặc định3). Chạy `node scripts/update-ci-timings.mjs <verified-report-directory>` tại frontend. Generator chỉ nhận3 hoặc6 partition mỗi engine, đủ mọi shard, digest từng report, worker nguyên1..4 khớp provenance, mỗi ID/key current discovery passed đúng một lần trước khi ghi. Metadata giữ đúng worker/partition đã đo; thiếu/trùng/failed/stale phải lỗi và giữ nguyên output. Timing là gợi ý cân tải, không thay elapsed CI thực.

CI yêu cầu hai worker mỗi browser runner; từng job ghi CPU/RAM thực và từ chối worker vượt CPU. Thử nghiệm PR bốn worker trên4CPU gây tăng duration và timeout nên được thay bằng chia nhỏ công việc ra nhiều runner. Local mặc định một; cấu hình cho phép số nguyên1..4. Cả hai config từ chối `test.only` trongCI; full `retain-on-failure` trace được giữ. Phép thử bỏ timeline screenshots không có lợi ích đo được nên không áp dụng. CI dùng `BOTSALES_E2E_RUNTIME=preview`; local mặc định `dev`. Global setup sở hữu preview và dev/cache riêng. Spec cần `/src/`, `/@fs/`, `/@vite/` hoặc optimizer cache vẫn khai báo `startDemoServer({ runtime: 'dev' })`, được regression kiểm. Borrower không dừng owner; MSW DB/role thuộc từngpage, cacheIsolationKey tạo server riêng, live luôn dev/process/cache riêng. Hai runtime và isolation đều có regression. Walk61 route và finance reflow/axe dùng built preview riêng; test cần source mock controls và live chunk failure vẫn dùng dev. Preview chỉ phục vụ kiểm artifact.

Ma trận loading tạo page/document mới cho mỗi route và đóng page trong `finally`, giữ đủ role/route/assertion theo contract. Cách này cô lập lifecycle của tab thay vì reload liên tiếp một tab Firefox; mọi pageerror vẫn được thu thập và phải rỗng. Client-fetch barrier đợi Shell/bootstrap sẵn sàng, giữ GET của operation khai báo trong contract, xác nhận query thực sự được gọi và UI loading hiển thị, rồi thả ngay để kiểm nội dung/404. `finally` luôn thả barrier; request ngoài phạm vi vẫn chạy. R33 tiếp tục không có trạng thái loading chặn nội dung: giữ snapshot của Shell hiển thị trong lúc refresh nền được giữ, rồi xác nhận refresh trả 200. Kiểm thêm title chuẩn để không nhận nhầm nội dung của route bootstrap. Không thêm API kiểm thử vào ứng dụng, không tăng timeout hoặc retry.

`run-ci-e2e.mjs` thu toàn inventory, lập sáu partition không trùng, viết danh sách bằng [Playwright --test-list](https://playwright.dev/docs/test-cli#test-list) và đối chiếu selection trước khi chạy. Native JSON phải có đúng mọi ID đã chọn, mỗi test đúng một passed và worker khớp plan; skip/retry/thiếu đều lỗi. Log/artifact giữ inventory, selection, IDs, workers, trọng số và kết quả thực. Hiện561 test mỗi engine, cộng6 built-demo.

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
