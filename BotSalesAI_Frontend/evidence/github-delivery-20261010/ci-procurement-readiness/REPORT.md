# Kiểm tra readiness VS02 trước bàn giao GitHub

Phạm vi source: duy nhất `tests/vertical-slices/fe022-flows.spec.ts`, ca VS02. Baseline/contract và snapshot gốc được lưu trước thay đổi; source gốc khớp nguyên byte với HEAD52 `198feb4734215131c86d280aca17c54bb2dac84c`. Procurement app, mock, hooks, router và contract chỉ đọc, có hash đối chiếu Git.

Run38044074123 trên SHA46d30b0: Chromium405 PASS/1 Dashboard FAIL; Firefox404 PASS/2 FAIL gồm Return và VS02. Cả hai audit/full verify/upload PASS, built-demo SKIPPED. Các nhóm khác xử lý Return và Dashboard riêng. Raw log/job/artifact metadata giữ nguyên; subset VS02 lấy từ artifact11668014780 đã kiểm SHA256 `c1d444cbf653d0d62c3116e010b1f2d578e7a50e573281cddf26f5a81811abaf`.

VS02 lỗi ngay tại heading `Đơn mua hàng` trước bất kỳ domain command nào. Trace: goto4681722.006–4682498.940ms; heading4682508.392–4687516.728ms; error-context main vẫn loading. Module procurement đã trả200 tại4683328.315ms; list GET đầu bị hủy, GET200 kế tiếp bắt đầu4688497.051ms sau deadline. Root cause có bằng chứng là test chưa đồng bộ route readiness trước heading; nguyên nhân sâu Suspense/query còn UNKNOWN. Không suy diễn module download là toàn bộ thời gian chờ hoặc product vi phạm latency SLO.

Bản sửa đăng ký exact GET purchase-orders trước goto, kiểm200, chờ route progressbar ẩn rồi giữ nguyên heading và toàn bộ luồng: purchase201, approval request/decision200, supplier send202/confirm200, receipt201/post202, mã purchase/receipt/sourceDocumentRef, tồn kho tăng2, payable goods_receipt khớp ID và amount200000. Không đổi helper gotoDemo chung, ca FE022 khác, app/mock/API/dependency, timeout180000ms, retry hay ngưỡng5000ms của heading.

CLI gốc: 4/4 PASS, repeat2 trên cả hai engine. Probe Chromium trì hoãn đúng một request module6500ms mỗi fixture: original FAIL cùng heading5000ms, candidate PASS toàn bộ callback. Raw harness/log/trace/network/results được lưu. Delay và observer15000ms chỉ ở harness; source không thêm sleep. Probe kiểm soát không khẳng định tái hiện chính xác vòng đời query trên hosted.

CLI source cuối: 6/6 PASS, repeat3 mỗi engine. Composition41/41, layout86/86, validator11/11 PASS. Full verify exit0: source, boundaries, lint, typecheck, domain, 238 unit test, build, layout, visual tokens, composition và S17 COMPLETE với275 current fingerprints. Discovery407 test/69 file mỗi engine, tổng814 E2E được GitHub chạy sau push.

Hosted SHA mới: `PENDING_AT_COMMIT`. Kết luận cuối phải lấy từ đúng run/SHA sau push, gồm407 E2E và3 built-demo mỗi engine, audit/full verify, upload và check runs thành công. Đây là bằng chứng Frontend/mock; không chứng nhận Backend, production, owner acceptance, native zoom hay screen reader. Snapshot lịch sử giữ nguyên thời điểm và byte gốc.
