# CI v4 — chia nhỏ công việc, giữ tải ổn định trên từng runner

Thay đổi thuộc CI/test harness; application source, contracts, dependencies và lockfile không đổi. Bàn giao qua PR ngắn, normal merge và full CI trên SHA main thực tế; giữ nguyên chín check bảo vệ. Hosted PR/main và archive closure: CHƯA XÁC MINH tại thời điểm ghi bằng chứng local này.

## Baseline và thay đổi

Main a48ea08af850b02fef983deb82fc16af82350008, frontend40105683526:1345s (22:25),108.4167 frontend job-minutes. Native Firefox chậm nhất1114.93s, bước E2E1120s; bước cài đặt không chi phối. Sáu ZIP native đã kiểm digest/CRC cho561 test/engine được dùng cập nhật timing, metadata vẫn ghi đúng hai worker tại thời điểm đo.

CI dùng sáu partition mỗi engine, tổng 12 browser job, mỗi runner hai worker. Mỗi job ghi CPU/RAM thực và từ chối worker vượt CPU. Local mặc định một, chỉ nhận số nguyên1..4. Hai config từ chối focused test trongCI và giữ full retain-on-failure trace. Hai aggregate kiểm đủ12 producer, đúng run/attempt; chín required check giữ App binding/strict/admin, chỉ đổi ba tên Firefox 1/2/3-of-3 sang 1/2/3-of-6 sau khi PR đầy đủ thành công. Hosted protection chưa được đổi tại thời điểm ghi local này.

Hai nhóm role-state14 và role-ready7 dùng page/context/clock/response map riêng nên được chia từng test; các file khác giữ hook/thứ tự và fullyParallel=false. Ready test vẫn giữ cả vòng nội dung và stale. Budget built-demo tuần tự dùng wall time111s/140s nhân số worker yêu cầu. Discovery vẫn sở hữu coverage; native report phải khớp mọi planned ID và worker count, mỗi test passed một lần, không skip/retry. Generator ghi đúng worker provenance1..4 và không ghi dở khi input sai.

Loading tạo tab/document mới cho mỗi route và đóng trong finally, giữ pending GET barrier, loading/resolved/404/R33 snapshot và mọi assertion. Trace thử nghiệm full4 trên tab reload liên tiếp đã ghi Firefox router recursion trước bootstrap; fixture được cô lập lifecycle, không sửa ứng dụng hoặc nới DOM timeout. Ready chờ GET bootstrap canonicalR39 trả200+finished trước thao tác role/control và các DOM assertion cũ; đây là điều kiện readiness mạng có giới hạn15s đang dùng cho bootstrap loading.

## Kiểm chứng local hiện tại

- Source/planner27: sáu partition hai worker giữ561/561 ID mỗi engine, không trùng/thiếu. Repository/gates104 và UI source/workflow contract PASS; gate kiểm đủ12 browser producer.
- Sau lượt PR đầu: 28/28 frontend/security PASS trên cả Chromium/Firefox với4workers. Walk61 route dùng built demo và tab mới; live dev chunk-failure vẫn kiểm riêng. Upload kiểm session sales sau tín hiệu role đã áp dụng rồi giữ nguyên expected403, fingerprint và idempotency.
- Role matrix42/42 trên Chrome+Firefox,4workers/full trace. Native JSON giữ21 ID mỗi engine và đúng 968/968 sự kiện route/role/state mỗi engine so với cùng case baseline; không skip/retry.
- Runtime isolation16/16 trong mỗi mode preview/dev,4workers: server ownership, private cache, worker startup và mock isolation PASS.
- Sáu report baseline khớp current discovery561/engine; metadata vẫn ghi đúng3 partition và2worker đã đo. Generator cũng nhận nguồn6 partition/engine có đủ12report. Failed/duplicate/unsupported-worker/native-worker-mismatch/unsupported-partitions/incomplete-six-partitions đều REJECTED, output không đổi.
- Audit hiện tại0 vulnerabilities tại ngưỡng low.
- Finance10/10 PASS trên Chromium/Firefox,2workers: đủ4route ở5độ rộng, axe, keyboard, screenshots, đối chiếu/concurrency/source mock controls. Chỉ ma trận render dùng built preview; các test cần import source vẫn dùng dev riêng.
- Full verify cuối: PASS — npm run verify, 256 Vitest và117 domain checks cùng các generate/type/lint/build/layout/token/composition/evidence gate; log six-full-verify.log. Hai lượt local trước (verify.log và hosted-fixes-verify.log) giữ nguyên làm lịch sử; không đại diện cấu hình sáu partition hiện tại.
- Header log giữ command, source fingerprints, runtime/worker request và environment. Owning refresh kiểm hash/current-input và actual exit0 trước khi cập nhật S17; không sửa hash bằng tay.

## Phép đo và giới hạn

Cùng sáu test Firefox nặng trên máy local24CPU: baseline2workers/fulltrace243.584s; bỏ timeline screenshots với2workers256.730s, không có lợi ích nên không áp dụng. Mẫu4workers/compact178.323s chỉ là thử nghiệm. Candidate4workers/fulltrace với loading tab riêng192.819s, cùng6 ID và171 route/state events; mẫu này trước guard ready-bootstrap cuối cùng. Không dùng các số local làm elapsed hosted CI.

Thử nghiệm lỗi ESM trước khi chạy test, old-tab Firefox recursion và cold ready bootstrap được giữ nguyên log/JSON/trace bên ngoài repo; không tính thành product PASS. Phạm vi proof là frontend/MSW/CI, không chứng nhận backend/staging/production/UAT hoặc owner acceptance.

Lượt PR đầu d866 thất bại: thiếu đồng bộ role upload, canonical-route walk và finance reflow trên dev chạm timeout. Native trace không có pageerror; UI role hiện trước async control hoàn tất. Runner đo được4CPU/~16GB; riêng nhóm Firefox command-master tăng từ228.435 lên432.763s với4worker. Vì vậy cấu hình4worker bị loại, chuyển sang6 partition x2worker để giảm tải mỗi runner; không nới timeout/bỏ assertion/trace. Metadata/log/ZIP thất bại giữ riêng, không tính thành elapsed CI thành công.

Tăng số runner có thêm chi phí setup; elapsed và tổng job-minutes phải đo lại trên run đầy đủ. [GitHub Actions limits](https://docs.github.com/en/actions/reference/limits#job-concurrency-limits-for-github-hosted-runners) công bố Free20 job đồng thời. Repo public dùng runner chuẩn; đây là giới hạn tham khảo, không thay bằng chứng queue/capacity thực của từng run.

Work/log/native inputs nằm trong workspace Codex có sẵn: work/ci-speed-v4; raw metadata/proof/report/ZIP bàn giao nằm outputs/ci-speed-v4. Các kết quả hosted cuối phải đối chiếu đúng SHA/run/event/attempt và archive digest/native ID/result trước khi đóng tác vụ.
