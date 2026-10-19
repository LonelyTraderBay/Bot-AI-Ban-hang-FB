# Chính sách CI: chỉ kết luận success được qua gate

## Hợp đồng

GitHub branch protection coi `success`, `skipped` và `neutral` là kết quả hợp lệ của required check. Repository bổ sung hai job tổng để từng producer bắt buộc phải thực sự có `status=completed` và `conclusion=success`.

| Workflow | Producer phải thành công | Check tổng phải bắt buộc khi kích hoạt |
|---|---|---|
| `frontend` | `verify (source and build)`, Chromium all, Firefox 1/2/3-of-3 | `gate frontend (success only)` |
| `repository-hygiene` | Ubuntu và Windows | `gate repository hygiene (success only)` |

Hai job tổng dùng `if: ${{ always() }}` và phụ thuộc đầy đủ các producer. `require-success.mjs` kiểm cả `needs` và inventory từ Actions API của đúng run ID/attempt, bao gồm từng matrix child. Nó không lấy kết quả của workflow khác hoặc của lần thử cũ để thay cho job hiện tại.

`skipped`, `neutral`, failure, cancelled, timeout, metadata thiếu/trùng, sai run/attempt, job lạ và lỗi API đều làm gate thất bại. API không trả đủ inventory hoặc workflow rerun một phần thiếu producer: dùng **Re-run all jobs**. Mỗi request API có timeout 30 giây; job tổng có giới hạn 5 phút. Quyền của gate chỉ gồm `contents: read`, `actions: read`; token không được ghi vào log.

Nếu bỏ qua toàn workflow bằng thông điệp commit hoặc đổi tên check, check bắt buộc sẽ thiếu và merge phải bị chặn. Các bước demo được skip hợp lệ trên Firefox shard 2/3 vẫn giữ nguyên; gate kiểm kết luận job, không đòi mọi step tùy chọn chạy.

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
