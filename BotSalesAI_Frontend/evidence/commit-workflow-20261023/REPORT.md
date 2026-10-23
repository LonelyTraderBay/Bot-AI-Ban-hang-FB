# Tối ưu vòng commit và CI — 23/10/2026

Phạm vi: quy trình Git, hai workflow cấp repository, gate success-only và regression hợp đồng workflow. Không đổi runtime ứng dụng, dữ liệu, số bài browser hay branch protection.

Baseline đo trên nhánh hợp nhất: commit `b0236252` mất khoảng 0,6 giây, push khoảng 5,7 giây; không có hook commit hoạt động hoặc `core.hooksPath`. Hai event push/PR cùng chạy frontend và hygiene trên cùng HEAD. Các workflow main trước đó mất khoảng 107–109 phút; Chromium chưa shard là đường chờ chính. PR run 39976987903 có verify 5 phút 19 giây, Firefox ba shard lần lượt 24 phút 30 giây, 44 phút 55 giây và 53 phút 49 giây (bao gồm cài đặt/build). Đây là số đo từng run, không phải cam kết thời gian cố định.

Thiết kế: chạy đầy đủ khi PR cập nhật và khi push vào main; chia cả Chromium và Firefox thành ba shard theo file, giữ workers=1 và fullyParallel=false do các test có server/fixture dùng chung. Built demo vẫn chạy trên shard đầu của mỗi browser. Tên required check `e2e (chromium all)` trở thành gate tổng kiểm đủ sáu shard và source verify; gate frontend phụ thuộc gate này và kiểm lại inventory đúng run/attempt. Giữ nguyên chín required contexts trên máy chủ.

Consumer impact: kiểm thử hợp đồng workflow trong frontend, require-success unit tests, tài liệu CI và S17 fingerprint phải theo wiring mới. Regression phải từ chối từng shard missing/skipped/neutral/failure, metadata sai run/attempt và dependency không thành công. Discovery phải chứng minh hợp ba shard bằng toàn bộ 558 case/browser, không mất hoặc lặp test. Hosted PR và main của SHA cuối phải được kiểm riêng; chưa có số đo sau tối ưu ở thời điểm baseline này.

Quy trình làm việc: commit cục bộ sau kiểm tra phù hợp với thay đổi; gom các commit cùng một công việc rồi push một lượt để kích hoạt PR CI. CI đầy đủ là điều kiện merge và kiểm chứng main. Không thêm hook chạy full browser mỗi commit, không bỏ gate, không dùng skip-ci hoặc force-push.

Nguồn kỹ thuật: [GitHub branch filters](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow), [Playwright sharding](https://playwright.dev/docs/test-sharding). Kết quả local/hosted sẽ được bổ sung bằng log và SHA thực tế.

Kiểm local sau thay đổi: [repository/gate 76/76](repository-contracts.log), [hợp đồng frontend 14/14](frontend-contracts.log), [full verify exit 0](verify.log) gồm 256 Vitest, 117 domain/network, type/lint/build và các gate source/UI/evidence. [Discovery Chromium](chromium-discovery.json) xác nhận 197/175/186, hợp đúng 558 case, thiếu 0 và trùng 0; đây là discovery, chưa phải thực thi full browser mới. S17 sau finalize có 75 record/70 coverage/306 fingerprint; owning refresh chỉ nhận các log có source hash đúng phạm vi và không cho phép drift ngoài phạm vi.

Lượt lệnh kết hợp đầu tiên chạy nhầm consumer frontend từ repository root nên fail trước khi đọc được tsconfig; chạy lại từ đúng component đạt 14/14. Log fail được giữ nguyên tại work/commit-ci-contracts.log của workspace tác vụ. Hosted CI của SHA tiếp theo vẫn phải chạy đầy đủ trước merge; thời gian sau tối ưu chưa được tuyên bố PASS từ kết quả local này.
