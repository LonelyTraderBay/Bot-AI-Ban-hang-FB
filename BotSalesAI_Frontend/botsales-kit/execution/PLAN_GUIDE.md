# KẾ HOẠCH TRIỂN KHAI THỰC TẾ — BOTSALES AI 2.1.1

**Đọc file này để bắt đầu nhiệm vụ triển khai.** Gói 2.1.1, kế hoạch nghiệp vụ 2.0 và hướng dẫn đã đồng bộ Graphite Gold; nguồn chuẩn `execution/plan.json`, tiến độ chuẩn `execution/progress.json`. `execution/PLAN_GUIDE.md` là phần mở đầu nguồn; `IMPLEMENTATION_PLAN.md` và phiếu từng việc được sinh bởi `scripts/progress.mjs report`; không sửa % bằng tay.

## 1. Phạm vi đã duyệt và điểm bắt đầu

Đọc hướng dẫn gốc của repo, `AI_RULES.md` nguyên bản, `START_HERE.md`, `AI_RULES_PROJECT.md`, tài liệu kiến trúc 02, code 18, dark-only 19, `design/decision.json` và `design/IMPLEMENTATION_NOTES.md`. Giữ quy tắc Universal riêng; không ghi đè loader hoặc code đang có. Phạm vi triển khai và màu Graphite Gold đã được duyệt; chưa phải UAT sản phẩm: bắt đầu T001, không hỏi lại stack greenfield hoặc có xây dark-only hay không. Quyền code phát sinh khi người dùng giao prompt triển khai này trong repo, không phải khi mở một file.

**File code đầu tiên sau khảo sát:** T007 thiết lập workspace/toolchain, T008 cổng phụ thuộc/chuẩn code, T009 sinh và kiểm hợp đồng, T010 Graphite Gold/theme/component nền, T011 shell/routing/state và T012 khung kiểm thử/network mocks. T013–T018 xây API/auth/tenant/outbox/worker; T019–T030 hoàn thiện lát cắt sản phẩm → tồn → đơn → giữ hàng → ledger. Không làm 54 trang rỗng rồi coi là xong nền tảng.

Greenfield: theo cây repo tại docs/02. Brownfield: T001–T006 tạo bản đồ file thực → vùng logic trong kế hoạch; không port/viết lại framework. File chưa có là đầu ra tương lai, không phải lệnh hay test đã chạy.

## 2. Quy trình tự thực hiện trong mỗi phiên

1. Xác minh repo/revision/worktree và diff chưa commit. Đọc bàn giao, tracker và sources đúng phạm vi. Dùng Node 22+ để chạy tracker đi kèm; app chọn line Node tại docs/02 và khóa phiên bản thực ở T007.
2. Trong thư mục bộ tài liệu, chạy `node scripts/progress.mjs validate`, `status`, `next`. Lần đầu dùng `bind` với đường dẫn repo thực. Các lệnh này có sẵn; lệnh pnpm cho app chưa được triển khai phải được tạo/đăng ký ở T005–T012 trước sử dụng.
3. Chọn task ưu tiên nhỏ nhất có tất cả dependencies DONE, nhận bằng `start T001 ten-agent-thuc`. Đọc phiếu `execution/tasks/T001.md`, acceptance và contracts liên quan. Mặc định một writer; không tự nhận danh tính reviewer độc lập.
4. S01→S05 theo thứ tự. Sau mỗi bước, kiểm chứng trên source thật, ghi evidence JSON theo template có log/hash và snapshot, rồi gọi `checkpoint T001 S01 execution/evidence/T001/S01.json`. Không dùng log demo, ví dụ tài liệu hoặc ảnh screenshot thay kiểm thử nghiệp vụ sản phẩm.
5. Thiếu tài khoản, tiền, quyền hoặc chính sách: `block Txxx "lý do cụ thể"`, cập nhật owner-inputs và bàn giao, rồi `next` để làm việc độc lập. Không gọi lệnh giả, không tự bỏ test, không đổi mẫu dữ liệu thành chính sách live.
6. Kết thúc việc: ghi handoff, diff, test thực, rủi ro. Tracker tự sinh lại kế hoạch và báo cáo sau cập nhật. Tiếp tục việc đủ điều kiện tiếp theo trong ngân sách/phiên công cụ hiện có; đổi phiên dùng cùng tracker không tự bắt đầu lại.
7. Chưa được giao commit/push/merge/deploy/chi tiền thật thì không làm. Các task phát hành giữ BLOCKED tới khi có phê duyệt đúng môi trường/phiên bản; 100% không tự là quyền deploy.

## 3. Cách tính phần trăm không phỏng đoán

Mỗi task có 5 bước với điểm 1+3+2+2+2 = 10. % task = điểm bước VERIFIED có bằng chứng còn hiệu lực /10. % phase = tổng điểm đạt / tổng điểm phase. % toàn dự án = tổng(% phase × trọng số phase)/100. Trọng số 14 phase cộng đúng 100; đây là tỷ trọng kế hoạch được giao, không phải ước lượng thời gian hoặc % dòng code.

Chỉ checkpoint VERIFIED mới có điểm; làm dở S02 không tự ghi 50% S02. BLOCKED có thể giữ điểm của bước trước còn hợp lệ, nhưng không được coi task DONE. Source/log/evidence thay đổi → STALE, bước sau cùng task và task phụ thuộc mất hiệu lực cho đến kiểm lại. Không sửa mẫu số hoặc đổi task bắt buộc thành N/A để tăng %. Thay scope phải có change record + rebaseline được duyệt.

Bản giao này bắt đầu 0%: tài liệu/demo được tạo là đầu vào, không phải 84 việc sản phẩm đã làm. Bằng chứng của kit đặt tại `evidence/`, không nộp vào `execution/evidence/` để lấy điểm ứng dụng.

## 4. Hợp đồng lệnh và bằng chứng

`execution/command-map.json` chứa cả lệnh dự kiến. AI xác minh tên script/cwd/toolchain; chỉ ghi VERIFIED_AVAILABLE khi script tồn tại và đã chạy đúng. Tracker kiểm log và hashes, không tự biết một người đã bịa nội dung log; người review/CI vẫn phải đối chiếu.

Một evidence tối thiểu cần taskId, stepId, kind phù hợp, command/cách kiểm, cwd/environment, thời gian, kết quả expected/observed, số checks thực >0, failed=0, logFile/logSha256, sourceRevision và sourceFiles hashes. Snapshot bao gồm source, test, contract/config/dependency thực sự ảnh hưởng; không chỉ hash một README để bỏ qua thay đổi code. Bước thiết bị/staging cần environment.simulated=false và authorityRef thật.

`sourceRootRelative` được tính bằng `bind`; đường dẫn evidence tính từ kit, sourceFiles tính từ repo. Không lưu API key hoặc dữ liệu khách trong bằng chứng. `execution/.progress.lock` chỉ chống ghi cùng filesystem, không đồng bộ nhiều clone/AI; phối hợp dùng đầu mối chung và worktree riêng theo Universal.

## 5. Điều kiện xong sản phẩm

Chạy đúng test cho price/stock/order races, double entry/COD, supplier unknown results, kill switch, quyền/tenant, Meta policy, notifications trên máy thật, migrations, load và restore. Hoàn thành evidence, UAT và phê duyệt release theo task cuối. Không còn tiêu chí bắt buộc CHƯA ĐẠT/CHƯA XÁC MINH mới được đề nghị nghiệm thu tương ứng. Mức tải, quốc gia, nhà cung cấp và người trực thiếu được ghi tại owner-inputs; không tự đoán để mở live.

## 6. Màu chính thức áp dụng cho mọi bước UI

ADR-VIS-021 đã duyệt ngày 29/09/2026 lúc 15:30:32Z. Một bảng Graphite Gold dark-only ở `design/tokens.json`; không hỏi lại chọn màu, không xây nhiều theme. T010 tạo bridge; T011 dùng trong shell; các module và T061/T065/T078/T080 kiểm lại trong phạm vi. Đọc hướng dẫn màu trên từng phiếu đã sinh. Không tự đổi trọng số/phụ thuộc để coi việc đổi màu đã hoàn thành sản phẩm.

Gói này bắt đầu 0%; thay đổi planSha256 chỉ khóa lại nguồn hướng dẫn ở bản phân phối chưa có thực thi. Khi repo đã chạy, không ghi đè progress/evidence: làm theo `UPGRADE.md`, bảo toàn kết quả cũ và revalidate phần UI ảnh hưởng. `execution/design-adoption.json` ghi hash trước/sau và phạm vi thay đổi.
