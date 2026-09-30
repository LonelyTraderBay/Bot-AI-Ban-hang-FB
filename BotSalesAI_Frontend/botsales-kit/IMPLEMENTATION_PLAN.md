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


## Tiến độ tại lần sinh này

**0% — 0/420 bước — 0/84 việc.** Đây là tiến độ sản phẩm thật, không phải % tài liệu/demo.

| Giai đoạn | Trọng số | Đã xác minh | Đầu việc |
|---|---:|---:|---|
| P00 Tiếp nhận và khóa nguồn chuẩn | 3% | 0.00% | T001–T002–T003–T004–T005–T006 |
| P01 Toolchain, hợp đồng và nền UI | 6% | 0.00% | T007–T008–T009–T010–T011–T012 |
| P02 Backend, phiên và cô lập dữ liệu | 8% | 0.00% | T013–T014–T015–T016–T017–T018 |
| P03 Sản phẩm, khách hàng và tồn kho | 8% | 0.00% | T019–T020–T021–T022–T023–T024 |
| P04 Đơn hàng và nền tính tiền | 10% | 0.00% | T025–T026–T027–T028–T029–T030 |
| P05 Chuẩn bị hàng và thông báo | 10% | 0.00% | T031–T032–T033–T034–T035–T036 |
| P06 Facebook, tri thức và Admin AI | 10% | 0.00% | T037–T038–T039–T040–T041–T042 |
| P07 Nhà cung cấp và tự động mua hàng | 10% | 0.00% | T043–T044–T045–T046–T047–T048 |
| P08 Kế toán, COD và đối soát | 10% | 0.00% | T049–T050–T051–T052–T053–T054 |
| P09 Trưởng nhóm, phê duyệt và báo cáo | 5% | 0.00% | T055–T056–T057–T058–T059–T060 |
| P10 Hoàn thiện UI xuyên nghiệp vụ | 4% | 0.00% | T061–T062–T063–T064–T065–T066 |
| P11 Tích hợp staging và thiết bị thật | 4% | 0.00% | T067–T068–T069–T070–T071–T072 |
| P12 Bảo mật, tải và khôi phục | 8% | 0.00% | T073–T074–T075–T076–T077–T078 |
| P13 Nghiệm thu, phát hành và bàn giao | 4% | 0.00% | T079–T080–T081–T082–T083–T084 |

## Mục lục đầu việc

- [T001 — Khảo sát đúng repo và chụp hiện trạng](execution/tasks/T001.md) · NOT_STARTED · 0%
- [T002 — Tiếp nhận phạm vi v2 và bản đồ nguồn](execution/tasks/T002.md) · NOT_STARTED · 0%
- [T003 — Khóa stack và phiên bản tương thích](execution/tasks/T003.md) · NOT_STARTED · 0%
- [T004 — Nối loader AI và policy dự án](execution/tasks/T004.md) · NOT_STARTED · 0%
- [T005 — Đăng ký lệnh kiểm tra thực tế](execution/tasks/T005.md) · NOT_STARTED · 0%
- [T006 — Khởi tạo tracker và nhận việc tuần tự](execution/tasks/T006.md) · NOT_STARTED · 0%
- [T007 — Tạo workspace tối thiểu](execution/tasks/T007.md) · NOT_STARTED · 0%
- [T008 — Cổng phụ thuộc và chuẩn code](execution/tasks/T008.md) · NOT_STARTED · 0%
- [T009 — Sinh và kiểm hợp đồng](execution/tasks/T009.md) · NOT_STARTED · 0%
- [T010 — Theme tối và component nền](execution/tasks/T010.md) · NOT_STARTED · 0%
- [T011 — Shell, routing và state scope](execution/tasks/T011.md) · NOT_STARTED · 0%
- [T012 — Khung kiểm thử và mocks qua network](execution/tasks/T012.md) · NOT_STARTED · 0%
- [T013 — Schema, migration và transaction context](execution/tasks/T013.md) · NOT_STARTED · 0%
- [T014 — Phiên đăng nhập và OIDC adapter](execution/tasks/T014.md) · NOT_STARTED · 0%
- [T015 — Tenant, quyền đối tượng và trường](execution/tasks/T015.md) · NOT_STARTED · 0%
- [T016 — Command, audit và transactional outbox](execution/tasks/T016.md) · NOT_STARTED · 0%
- [T017 — Worker bền vững và scheduler cơ sở](execution/tasks/T017.md) · NOT_STARTED · 0%
- [T018 — UI membership và đổi shop hoàn chỉnh](execution/tasks/T018.md) · NOT_STARTED · 0%
- [T019 — Catalog API và UI vertical slice](execution/tasks/T019.md) · NOT_STARTED · 0%
- [T020 — Biến thể, ảnh và import kiểm soát](execution/tasks/T020.md) · NOT_STARTED · 0%
- [T021 — Khách hàng và định danh hội thoại](execution/tasks/T021.md) · NOT_STARTED · 0%
- [T022 — Ledger tồn kho và projection](execution/tasks/T022.md) · NOT_STARTED · 0%
- [T023 — Giữ hàng đồng thời và hết hạn](execution/tasks/T023.md) · NOT_STARTED · 0%
- [T024 — Lát cắt sản phẩm tới báo giá](execution/tasks/T024.md) · NOT_STARTED · 0%
- [T025 — Máy trạng thái đơn hàng v2](execution/tasks/T025.md) · NOT_STARTED · 0%
- [T026 — Xác nhận khách, quote và chốt đơn](execution/tasks/T026.md) · NOT_STARTED · 0%
- [T027 — Thanh toán và COD readiness](execution/tasks/T027.md) · NOT_STARTED · 0%
- [T028 — Nền sổ kép và số tiền chính xác](execution/tasks/T028.md) · NOT_STARTED · 0%
- [T029 — UI đơn hàng và hành động có điều kiện](execution/tasks/T029.md) · NOT_STARTED · 0%
- [T030 — Kiểm xuyên suốt chốt đơn và tiền nền](execution/tasks/T030.md) · NOT_STARTED · 0%
- [T031 — Task nhận việc và bảng chuẩn bị](execution/tasks/T031.md) · NOT_STARTED · 0%
- [T032 — Lấy, đóng gói và bàn giao hàng](execution/tasks/T032.md) · NOT_STARTED · 0%
- [T033 — Intent thông báo và subscription an toàn](execution/tasks/T033.md) · NOT_STARTED · 0%
- [T034 — UI điện thoại, Web Push và Telegram adapter](execution/tasks/T034.md) · NOT_STARTED · 0%
- [T035 — Giao hàng, trả hàng và nghĩa vụ hoàn](execution/tasks/T035.md) · NOT_STARTED · 0%
- [T036 — Lát cắt bán hàng tới điện thoại giả lập](execution/tasks/T036.md) · NOT_STARTED · 0%
- [T037 — Messenger webhook và inbox ingestion](execution/tasks/T037.md) · NOT_STARTED · 0%
- [T038 — Hộp thư hợp nhất và takeover fencing](execution/tasks/T038.md) · NOT_STARTED · 0%
- [T039 — Kiến thức và vòng duyệt](execution/tasks/T039.md) · NOT_STARTED · 0%
- [T040 — Provider adapter và ngân sách AI](execution/tasks/T040.md) · NOT_STARTED · 0%
- [T041 — Tool bán hàng và tự chốt có quyền](execution/tasks/T041.md) · NOT_STARTED · 0%
- [T042 — Evals, hậu mãi và media capability](execution/tasks/T042.md) · NOT_STARTED · 0%
- [T043 — Hồ sơ nhà cung cấp và danh mục mua](execution/tasks/T043.md) · NOT_STARTED · 0%
- [T044 — Quy tắc tái đặt và dự báo tối thiểu](execution/tasks/T044.md) · NOT_STARTED · 0%
- [T045 — Phê duyệt đơn mua gắn phiên bản](execution/tasks/T045.md) · NOT_STARTED · 0%
- [T046 — Gửi đơn mua và reconcile unknown](execution/tasks/T046.md) · NOT_STARTED · 0%
- [T047 — Nhận hàng một phần và công nợ](execution/tasks/T047.md) · NOT_STARTED · 0%
- [T048 — UI mua hàng đủ vòng và regression](execution/tasks/T048.md) · NOT_STARTED · 0%
- [T049 — Chi phí, policy ghi nhận và giá vốn](execution/tasks/T049.md) · NOT_STARTED · 0%
- [T050 — Nhập sao kê và đề xuất ghép tiền](execution/tasks/T050.md) · NOT_STARTED · 0%
- [T051 — COD clearing và phí thực nhận](execution/tasks/T051.md) · NOT_STARTED · 0%
- [T052 — Công nợ, khóa kỳ và sửa sai](execution/tasks/T052.md) · NOT_STARTED · 0%
- [T053 — Báo cáo chuẩn và giải thích của AI](execution/tasks/T053.md) · NOT_STARTED · 0%
- [T054 — Nghiệm thu bất biến tài chính](execution/tasks/T054.md) · NOT_STARTED · 0%
- [T055 — Chính sách quyền và hàng duyệt thống nhất](execution/tasks/T055.md) · NOT_STARTED · 0%
- [T056 — Trưởng nhóm, task và bản tin](execution/tasks/T056.md) · NOT_STARTED · 0%
- [T057 — Hạn mức AI và nút dừng](execution/tasks/T057.md) · NOT_STARTED · 0%
- [T058 — Dữ liệu marketing có căn cứ](execution/tasks/T058.md) · NOT_STARTED · 0%
- [T059 — Tổng quan điều hành và readiness](execution/tasks/T059.md) · NOT_STARTED · 0%
- [T060 — Kiểm điều phối bốn vai trò](execution/tasks/T060.md) · NOT_STARTED · 0%
- [T061 — Mobile, keyboard và accessibility](execution/tasks/T061.md) · NOT_STARTED · 0%
- [T062 — Migration từ v1 và giữ hợp đồng cũ](execution/tasks/T062.md) · NOT_STARTED · 0%
- [T063 — Onboarding, privacy và góp ý](execution/tasks/T063.md) · NOT_STARTED · 0%
- [T064 — Xuất báo cáo và tệp an toàn](execution/tasks/T064.md) · NOT_STARTED · 0%
- [T065 — Hoàn thiện states và chống hoàn tất giả](execution/tasks/T065.md) · NOT_STARTED · 0%
- [T066 — Review trọn 64 chức năng và demo parity](execution/tasks/T066.md) · NOT_STARTED · 0%
- [T067 — Môi trường staging và hạ tầng kế hoạch](execution/tasks/T067.md) · NOT_STARTED · 0%
- [T068 — OIDC và phiên staging thật](execution/tasks/T068.md) · NOT_STARTED · 0%
- [T069 — Meta và AI provider staging thật](execution/tasks/T069.md) · NOT_STARTED · 0%
- [T070 — Web Push/Telegram trên điện thoại thật](execution/tasks/T070.md) · NOT_STARTED · 0%
- [T071 — Carrier/supplier/statement staging connectors](execution/tasks/T071.md) · NOT_STARTED · 0%
- [T072 — Smoke tích hợp thật xuyên hệ thống](execution/tasks/T072.md) · NOT_STARTED · 0%
- [T073 — Bảo mật và dependency supply chain](execution/tasks/T073.md) · NOT_STARTED · 0%
- [T074 — Tải và hiệu năng theo workload duyệt](execution/tasks/T074.md) · NOT_STARTED · 0%
- [T075 — Backup, restore và data lifecycle](execution/tasks/T075.md) · NOT_STARTED · 0%
- [T076 — Fault injection và replay toàn chuỗi](execution/tasks/T076.md) · NOT_STARTED · 0%
- [T077 — CI/CD, migration và rollback rehearsal](execution/tasks/T077.md) · NOT_STARTED · 0%
- [T078 — Regression trên artifact phát hành](execution/tasks/T078.md) · NOT_STARTED · 0%
- [T079 — Chốt nghiệp vụ và chính sách quốc gia](execution/tasks/T079.md) · NOT_STARTED · 0%
- [T080 — UAT của chủ shop và thiết bị](execution/tasks/T080.md) · NOT_STARTED · 0%
- [T081 — Cổng cho phép phát hành](execution/tasks/T081.md) · NOT_STARTED · 0%
- [T082 — Triển khai giới hạn có giám sát](execution/tasks/T082.md) · NOT_STARTED · 0%
- [T083 — Kiểm sau phát hành và phục hồi](execution/tasks/T083.md) · NOT_STARTED · 0%
- [T084 — Bàn giao vận hành và lộ trình bảo trì](execution/tasks/T084.md) · NOT_STARTED · 0%

---

## T001 — Khảo sát đúng repo và chụp hiện trạng
**Giai đoạn:** P00 · **Ưu tiên:** 1 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** Không. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H07, H08.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `docs/PROJECT_CONTEXT.md`
- `execution/baseline.json`

### Thực hiện tuần tự

#### T001.S01 · 1/10 điểm · NOT_STARTED

Đọc root instructions và AI_RULES nguyên bản; xác minh cwd, quyền nhiệm vụ, git status hoặc snapshot file

**Bằng chứng:** artifact_review. Chứng minh kết quả của T001.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T001.S02 · 3/10 điểm · NOT_STARTED

Lập danh sách app/test/docs/config có thật; phân loại mới/đang phát triển/hỗn hợp theo từng thành phần

**Bằng chứng:** artifact_review. Chứng minh kết quả của T001.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T001.S03 · 2/10 điểm · NOT_STARTED

Ghi cây thư mục chọn lọc và nguồn quyết định; không đổi framework hoặc format code hiện có

**Bằng chứng:** artifact_review. Chứng minh kết quả của T001.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T001.S04 · 2/10 điểm · NOT_STARTED

Đối chiếu file chưa commit, test nền và dữ liệu nhạy cảm; ghi phần không được đụng vào

**Bằng chứng:** artifact_review. Chứng minh kết quả của T001.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T001.S05 · 2/10 điểm · NOT_STARTED

Bàn giao baseline có revision/hash và trạng thái từng phép kiểm; không init Git hoặc chạy deploy

**Bằng chứng:** artifact_review. Chứng minh kết quả của T001.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Demo pass not live proof; no real customer/keys/money in synthetic tests.
- Backup exists not restore proof; missing mandatory criterion cannot greenlight launch.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T001/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T002 — Tiếp nhận phạm vi v2 và bản đồ nguồn
**Giai đoạn:** P00 · **Ưu tiên:** 2 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T001. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** G01, H06.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `docs/PROJECT_CONTEXT.md`
- `execution/decisions.json`

### Thực hiện tuần tự

#### T002.S01 · 1/10 điểm · NOT_STARTED

Đối chiếu 64 mã A–H với phê duyệt 2026-09-29; đánh dấu chỉ quyền thiết kế/code/demo

**Bằng chứng:** artifact_review. Chứng minh kết quả của T002.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T002.S02 · 3/10 điểm · NOT_STARTED

Chọn đường dẫn tích hợp kit không ghi đè tài liệu riêng; giữ AI_RULES Universal byte-identical

**Bằng chứng:** artifact_review. Chứng minh kết quả của T002.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T002.S03 · 2/10 điểm · NOT_STARTED

Ghi mapping nguồn chuẩn contracts/docs/plan; archive v1 chỉ đọc khi cần so sánh

**Bằng chứng:** artifact_review. Chứng minh kết quả của T002.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T002.S04 · 2/10 điểm · NOT_STARTED

Lập danh sách country/currency/budget/approver/provider chưa biết; không điền giá trị tiền mẫu làm thật

**Bằng chứng:** artifact_review. Chứng minh kết quả của T002.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T002.S05 · 2/10 điểm · NOT_STARTED

Kiểm kế hoạch/nguồn không mâu thuẫn; xác nhận bước làm code thuộc nhiệm vụ implement, không dừng ở bootstrap docs-only

**Bằng chứng:** artifact_review. Chứng minh kết quả của T002.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Không tự suy quốc gia kinh doanh từ location; config missing blocks only dependent live actions.
- Changed data must not rewrite audit reason; no secrets in logs/exports/error URLs.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T002/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T003 — Khóa stack và phiên bản tương thích
**Giai đoạn:** P00 · **Ưu tiên:** 3 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T002. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H07, H08.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `docs/STACK_LOCK.md`
- `package.json`
- `pnpm-lock.yaml`
- `.node-version`

### Thực hiện tuần tự

#### T003.S01 · 1/10 điểm · NOT_STARTED

Repo mới chọn stack trong docs/02; repo cũ ghi mapping giữ tương thích và không tự port

**Bằng chứng:** artifact_review. Chứng minh kết quả của T003.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T003.S02 · 3/10 điểm · NOT_STARTED

Tra official registry cho Node LTS, React/MUI/Vite/Nest/Prisma/BullMQ tương thích; lưu ngày và phiên bản exact

**Bằng chứng:** artifact_review. Chứng minh kết quả của T003.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T003.S03 · 2/10 điểm · NOT_STARTED

Ghi dependencies, license, peer checks, runtime/version commands; không dùng latest trong file khóa

**Bằng chứng:** artifact_review. Chứng minh kết quả của T003.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T003.S04 · 2/10 điểm · NOT_STARTED

Chạy proof install/build tối thiểu trong vùng đã phép; ghi lỗi toolchain tách lỗi code

**Bằng chứng:** artifact_review. Chứng minh kết quả của T003.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T003.S05 · 2/10 điểm · NOT_STARTED

Chốt stack lock có bằng chứng và cùng một lockfile; tác vụ khác không tự nâng package

**Bằng chứng:** artifact_review. Chứng minh kết quả của T003.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Demo pass not live proof; no real customer/keys/money in synthetic tests.
- Backup exists not restore proof; missing mandatory criterion cannot greenlight launch.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T003/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T004 — Nối loader AI và policy dự án
**Giai đoạn:** P00 · **Ưu tiên:** 4 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T002. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H05, H06.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `AGENTS.md`
- `docs/PROJECT_CONTEXT.md`
- `execution/loader-check.md`

### Thực hiện tuần tự

#### T004.S01 · 1/10 điểm · NOT_STARTED

Xác minh cơ chế nạp hướng dẫn của AI đang sử dụng; không giả định file trong folder tự được đọc

**Bằng chứng:** artifact_review. Chứng minh kết quả của T004.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T004.S02 · 3/10 điểm · NOT_STARTED

Ghép snippet dẫn tới kit vào loader hiện có bằng diff tối thiểu; không chép đè root AGENTS

**Bằng chứng:** artifact_review. Chứng minh kết quả của T004.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T004.S03 · 2/10 điểm · NOT_STARTED

Đặt scope rules riêng frontend/backend/worker, ưu tiên thực của môi trường và phân biệt dữ liệu untrusted

**Bằng chứng:** artifact_review. Chứng minh kết quả của T004.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T004.S04 · 2/10 điểm · NOT_STARTED

Thử phiên/đọc lại để xác minh đúng đường dẫn và Universal hash; thiếu loader thì dùng prompt explicit

**Bằng chứng:** artifact_review. Chứng minh kết quả của T004.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T004.S05 · 2/10 điểm · NOT_STARTED

Lưu kết quả kiểm nạp và đường resume; không tự cài plugin hoặc sửa cấu hình người dùng

**Bằng chứng:** artifact_review. Chứng minh kết quả của T004.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- UI-hidden control cannot bypass backend; Telegram id mapping rechecked.
- Changed data must not rewrite audit reason; no secrets in logs/exports/error URLs.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T004/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T005 — Đăng ký lệnh kiểm tra thực tế
**Giai đoạn:** P00 · **Ưu tiên:** 5 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T003, T004. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H07, H08.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `execution/command-map.json`
- `docs/PROJECT_CONTEXT.md`

### Thực hiện tuần tự

#### T005.S01 · 1/10 điểm · NOT_STARTED

Tìm scripts/lệnh thật của repo; xác minh cwd, flags và side effects trước chạy

**Bằng chứng:** artifact_review. Chứng minh kết quả của T005.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T005.S02 · 3/10 điểm · NOT_STARTED

Đăng ký format, lint, types, unit, integration, contract, e2e, build và secrets bằng trạng thái PLANNED khi chưa có

**Bằng chứng:** artifact_review. Chứng minh kết quả của T005.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T005.S03 · 2/10 điểm · NOT_STARTED

Tạo phần lệnh còn thiếu trong đúng thành phần khi được phép, không tạo job echo xanh

**Bằng chứng:** artifact_review. Chứng minh kết quả của T005.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T005.S04 · 2/10 điểm · NOT_STARTED

Chạy từng lệnh tồn tại trên baseline và ghi exit code/test count; lệnh chưa chạy vẫn NOT_VERIFIED

**Bằng chứng:** artifact_review. Chứng minh kết quả của T005.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T005.S05 · 2/10 điểm · NOT_STARTED

Gắn command IDs vào evidence schema; validator từ chối gán kết quả của lệnh khác nhiệm vụ

**Bằng chứng:** artifact_review. Chứng minh kết quả của T005.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Demo pass not live proof; no real customer/keys/money in synthetic tests.
- Backup exists not restore proof; missing mandatory criterion cannot greenlight launch.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T005/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T006 — Khởi tạo tracker và nhận việc tuần tự
**Giai đoạn:** P00 · **Ưu tiên:** 6 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T005. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H06, H07.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `execution/progress.json`
- `execution/SESSION_HANDOFF.md`

### Thực hiện tuần tự

#### T006.S01 · 1/10 điểm · NOT_STARTED

Chạy tracker validate/status/next chỉ đọc; tất cả production checkpoints khởi đầu chưa xác minh

**Bằng chứng:** artifact_review. Chứng minh kết quả của T006.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T006.S02 · 3/10 điểm · NOT_STARTED

Ghi người/agent phụ trách và scope T007; giữ độc quyền nguồn chung, không giả có nhiều reviewer

**Bằng chứng:** artifact_review. Chứng minh kết quả của T006.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T006.S03 · 2/10 điểm · NOT_STARTED

Thử checkpoint từ chối evidence thiếu, sai hash, sai thứ tự và task chưa đủ dependency trên bản sao

**Bằng chứng:** artifact_review. Chứng minh kết quả của T006.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T006.S04 · 2/10 điểm · NOT_STARTED

Chạy kiểm tracker; tách artifact/demo verification khỏi progress sản phẩm

**Bằng chứng:** artifact_review. Chứng minh kết quả của T006.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T006.S05 · 2/10 điểm · NOT_STARTED

Ghi handoff đầu tiên và lệnh resume; không tự đánh dấu 100% vì đã có bộ tài liệu

**Bằng chứng:** artifact_review. Chứng minh kết quả của T006.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Changed data must not rewrite audit reason; no secrets in logs/exports/error URLs.
- Demo pass not live proof; no real customer/keys/money in synthetic tests.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T006/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T007 — Tạo workspace tối thiểu
**Giai đoạn:** P01 · **Ưu tiên:** 7 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T006. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H01, H07.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/package.json`
- `apps/api/package.json`
- `apps/worker/package.json`
- `packages/contracts/package.json`
- `packages/design-tokens/package.json`

### Thực hiện tuần tự

#### T007.S01 · 1/10 điểm · NOT_STARTED

Khởi tạo chỉ web/api/worker và packages dùng chung được xác nhận; map nếu brownfield

**Bằng chứng:** test_run. Chứng minh kết quả của T007.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T007.S02 · 3/10 điểm · NOT_STARTED

Thiết lập TypeScript strict/noUncheckedIndexedAccess và package exports; không import runtime web vào API

**Bằng chứng:** test_run. Chứng minh kết quả của T007.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T007.S03 · 2/10 điểm · NOT_STARTED

Tạo health bootstrap API và worker ping local; worker logic dùng chung backend public modules

**Bằng chứng:** test_run. Chứng minh kết quả của T007.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T007.S04 · 2/10 điểm · NOT_STARTED

Nối pnpm scripts đã đăng ký; xác minh cold install và build thành phần độc lập

**Bằng chứng:** test_run. Chứng minh kết quả của T007.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T007.S05 · 2/10 điểm · NOT_STARTED

Kiểm không secrets/default live credentials; ghi artifact build và toolchain hashes

**Bằng chứng:** test_run. Chứng minh kết quả của T007.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Close browser and restart worker preserves due work; queue loss rebuild from DB.
- Demo pass not live proof; no real customer/keys/money in synthetic tests.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T007/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T008 — Cổng phụ thuộc và chuẩn code
**Giai đoạn:** P01 · **Ưu tiên:** 8 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T007. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H05, H07.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `eslint.config.mjs`
- `scripts/check-boundaries.mjs`
- `tests/architecture/`

### Thực hiện tuần tự

#### T008.S01 · 1/10 điểm · NOT_STARTED

Thiết lập formatter, lint, no-explicit-any khi áp dụng và restricted resolved imports theo docs/02,18

**Bằng chứng:** test_run. Chứng minh kết quả của T008.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T008.S02 · 3/10 điểm · NOT_STARTED

Chặn module frontend X import module Y, shared import business, runtime SDK lọt vào web

**Bằng chứng:** test_run. Chứng minh kết quả của T008.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T008.S03 · 2/10 điểm · NOT_STARTED

Cho backend use-case composition qua public ports + transaction context; cấm repository cross-module direct

**Bằng chứng:** test_run. Chứng minh kết quả của T008.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T008.S04 · 2/10 điểm · NOT_STARTED

Tạo fixtures pass/fail cho alias, relative, cycle, forbidden SDK và light theme; chạy checker

**Bằng chứng:** test_run. Chứng minh kết quả của T008.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T008.S05 · 2/10 điểm · NOT_STARTED

Nối CI thực sự fail exit nonzero; không chỉ đưa rule vào README

**Bằng chứng:** test_run. Chứng minh kết quả của T008.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- UI-hidden control cannot bypass backend; Telegram id mapping rechecked.
- Demo pass not live proof; no real customer/keys/money in synthetic tests.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T008/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T009 — Sinh và kiểm hợp đồng
**Giai đoạn:** P01 · **Ưu tiên:** 9 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T008. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H04, H05.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `packages/contracts/`
- `contracts/openapi.json`
- `tests/contracts/`

### Thực hiện tuần tự

#### T009.S01 · 1/10 điểm · NOT_STARTED

Đối chiếu OpenAPI v2, routes, permissions, feature catalog và machine states của kit

**Bằng chứng:** test_run. Chứng minh kết quả của T009.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T009.S02 · 3/10 điểm · NOT_STARTED

Sinh DTO từ JSON canonical; YAML/index là output; không edit generated code

**Bằng chứng:** test_run. Chứng minh kết quả của T009.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T009.S03 · 2/10 điểm · NOT_STARTED

Thêm runtime request/response validation cho Money decimal string, versions, cursor, Problem

**Bằng chứng:** test_run. Chứng minh kết quả của T009.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T009.S04 · 2/10 điểm · NOT_STARTED

Test unknown field policy, invalid status, missing tenant, duplicate operationId và negative fixtures

**Bằng chứng:** test_run. Chứng minh kết quả của T009.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T009.S05 · 2/10 điểm · NOT_STARTED

Chạy contract generation diff-clean và schema validate; cập nhật command map bằng lệnh thật

**Bằng chứng:** test_run. Chứng minh kết quả của T009.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Crash after external accept before local save not blindly retried; poison jobs isolated.
- UI-hidden control cannot bypass backend; Telegram id mapping rechecked.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T009/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T010 — Theme tối và component nền
**Giai đoạn:** P01 · **Ưu tiên:** 10 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T009. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** G01, H07.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `packages/design-tokens/`
- `apps/web/src/shared/ui/`
- `apps/web/index.html`

### Thực hiện tuần tự

#### T010.S01 · 1/10 điểm · NOT_STARTED

Xác minh design/decision.json APPROVED và hash design/tokens.json; đưa Graphite Gold vào packages/design-tokens/ qua một nguồn canonical; tạo MUI mapping từ cùng JSON, không copy HEX chỉnh tay

**Bằng chứng:** test_run. Chứng minh kết quả của T010.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T010.S02 · 3/10 điểm · NOT_STARTED

Bootstrap HTML/CSS Graphite Gold trước JS; root provider dark cố định, không mode selector/system listener/light palette; fallback lỗi/login không chớp nền trắng

**Bằng chứng:** test_run. Chứng minh kết quả của T010.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T010.S03 · 2/10 điểm · NOT_STARTED

Làm Button/Input/Dialog/Table/StatusBadge/Empty/Error/Skeleton với focus và labels; CTA accent/onAccent, hover/pressed đúng token; info/success/warning/danger không dùng chung màu vàng

**Bằng chứng:** test_run. Chứng minh kết quả của T010.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T010.S04 · 2/10 điểm · NOT_STARTED

Kiểm contrast thực, keyboard dialog focus return, zoom/reduced motion/forced-colors và HTML before-JS; kiểm các viewport trong docs/03; ghi bằng chứng riêng cho mock so với thiết bị thật

**Bằng chứng:** test_run. Chứng minh kết quả của T010.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T010.S05 · 2/10 điểm · NOT_STARTED

Chạy kiểm drift token → CSS → MUI bridge → component gallery, negative test palette cũ/HEX tự phát; đồng bộ nguồn và ghi bằng chứng T010.S01–S05, không nhận output demo là sản phẩm

**Bằng chứng:** test_run. Chứng minh kết quả của T010.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Không tự suy quốc gia kinh doanh từ location; config missing blocks only dependent live actions.
- Demo pass not live proof; no real customer/keys/money in synthetic tests.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T010/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T011 — Shell, routing và state scope
**Giai đoạn:** P01 · **Ưu tiên:** 11 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T010. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H05, G01.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/app/`
- `apps/web/src/shared/lib/scope/`

### Thực hiện tuần tự

#### T011.S01 · 1/10 điểm · NOT_STARTED

Tạo shell navigation từ route manifest v2 và lazy module entries; không sinh toàn trang trống như hoàn tất

**Bằng chứng:** test_run. Chứng minh kết quả của T011.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T011.S02 · 3/10 điểm · NOT_STARTED

Nối i18n tiếng Việt, URL filters, router error boundaries và scopes user/shop/permissionVersion

**Bằng chứng:** test_run. Chứng minh kết quả của T011.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T011.S03 · 2/10 điểm · NOT_STARTED

Thiết lập TanStack Query scope, abort cleanup, session loading và 401/403 khác empty

**Bằng chứng:** test_run. Chứng minh kết quả của T011.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T011.S04 · 2/10 điểm · NOT_STARTED

Test switch-shop race, revoked membership, chunk error, refresh deep link và mobile menu

**Bằng chứng:** test_run. Chứng minh kết quả của T011.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T011.S05 · 2/10 điểm · NOT_STARTED

Chạy shell E2E và bundle check; log tương ứng revision không nhận API thật đã tích hợp

**Bằng chứng:** test_run. Chứng minh kết quả của T011.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- UI-hidden control cannot bypass backend; Telegram id mapping rechecked.
- Không tự suy quốc gia kinh doanh từ location; config missing blocks only dependent live actions.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T011/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T012 — Khung kiểm thử và mocks qua network
**Giai đoạn:** P01 · **Ưu tiên:** 12 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T011. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H07.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/mocks/`
- `tests/fixtures/`
- `tests/e2e/`
- `vitest.config.ts`
- `playwright.config.ts`

### Thực hiện tuần tự

#### T012.S01 · 1/10 điểm · NOT_STARTED

Cài MSW/Testing Library/Vitest/Playwright theo stack lock; tạo synthetic hai shop

**Bằng chứng:** test_run. Chứng minh kết quả của T012.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T012.S02 · 3/10 điểm · NOT_STARTED

Dựng handlers từ OpenAPI; mocks chỉ dev/test, không if-demo rải trong JSX

**Bằng chứng:** test_run. Chứng minh kết quả của T012.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T012.S03 · 2/10 điểm · NOT_STARTED

Thêm kịch bản loading/empty/error/forbidden/stale/offline/unknown command

**Bằng chứng:** test_run. Chứng minh kết quả của T012.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T012.S04 · 2/10 điểm · NOT_STARTED

Test production bundle không chứa mock seed hoặc secret; zero-test suite phải fail

**Bằng chứng:** test_run. Chứng minh kết quả của T012.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T012.S05 · 2/10 điểm · NOT_STARTED

Chạy một route thật trong dev và browser; ghi screenshot/environment, không nhận stub thành full feature

**Bằng chứng:** test_run. Chứng minh kết quả của T012.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Demo pass not live proof; no real customer/keys/money in synthetic tests.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T012/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T013 — Schema, migration và transaction context
**Giai đoạn:** P02 · **Ưu tiên:** 13 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T009. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** D01, E01, H05.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/23_PROCUREMENT.md`
- `docs/24_FINANCE.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/prisma/`
- `apps/api/src/platform/database/`
- `tests/integration/database/`

### Thực hiện tuần tự

#### T013.S01 · 1/10 điểm · NOT_STARTED

Tạo shop/user/membership/audit/command/outbox core schema; money NUMERIC không float

**Bằng chứng:** test_run. Chứng minh kết quả của T013.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T013.S02 · 3/10 điểm · NOT_STARTED

Khóa unique composite shop+resource và FK scope; transaction-aware tenant context không lấy shopId client làm authority

**Bằng chứng:** test_run. Chứng minh kết quả của T013.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T013.S03 · 2/10 điểm · NOT_STARTED

Migration expand-first, migration role tách runtime; RLS nếu dùng phải FORCE/test pool context

**Bằng chứng:** test_run. Chứng minh kết quả của T013.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T013.S04 · 2/10 điểm · NOT_STARTED

Test rollback, cross-tenant FK, unique conflict và connection pool reuse không rò context

**Bằng chứng:** test_run. Chứng minh kết quả của T013.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T013.S05 · 2/10 điểm · NOT_STARTED

Chạy migration fresh DB và upgrade DB mẫu; lưu schema snapshot và restore note

**Bằng chứng:** test_run. Chứng minh kết quả của T013.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Hàng đang về/hỏng không có trong available; tổng projection khớp movement ledger.
- Không post journal mất cân bằng; source trùng không ghi lặp; reversed phải reason.
- UI-hidden control cannot bypass backend; Telegram id mapping rechecked.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T013/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T014 — Phiên đăng nhập và OIDC adapter
**Giai đoạn:** P02 · **Ưu tiên:** 14 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T013, T012. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** G01, H05.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/workspace/auth/`
- `apps/web/src/modules/workspace/`

### Thực hiện tuần tự

#### T014.S01 · 1/10 điểm · NOT_STARTED

Thiết kế OIDC authorization code + PKCE/state/nonce qua thư viện được khóa; local IdP mock chỉ test

**Bằng chứng:** test_run. Chứng minh kết quả của T014.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T014.S02 · 3/10 điểm · NOT_STARTED

Backend giữ tokens/session; cookie Secure/HttpOnly/SameSite và CSRF mutation bảo vệ

**Bằng chứng:** test_run. Chứng minh kết quả của T014.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T014.S03 · 2/10 điểm · NOT_STARTED

Nối login/logout/session/step-up vào UI; không lưu access token hoặc password trong localStorage

**Bằng chứng:** test_run. Chứng minh kết quả của T014.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T014.S04 · 2/10 điểm · NOT_STARTED

Test invalid state, session fixation, CSRF, logout revocation và returnTo open redirect

**Bằng chứng:** test_run. Chứng minh kết quả của T014.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T014.S05 · 2/10 điểm · NOT_STARTED

Chạy flow mock IdP integration; provider thật để T068, không tạo bypass production

**Bằng chứng:** test_run. Chứng minh kết quả của T014.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Không tự suy quốc gia kinh doanh từ location; config missing blocks only dependent live actions.
- UI-hidden control cannot bypass backend; Telegram id mapping rechecked.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T014/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T015 — Tenant, quyền đối tượng và trường
**Giai đoạn:** P02 · **Ưu tiên:** 15 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T014. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H05, F05.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/25_OPERATIONS_AI.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/workspace/policy/`
- `apps/web/src/shared/lib/access/`
- `tests/security/tenant/`

### Thực hiện tuần tự

#### T015.S01 · 1/10 điểm · NOT_STARTED

Nối permission catalog, membership, resource allowedActions; không hardcode role=admin

**Bằng chứng:** test_run. Chứng minh kết quả của T015.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T015.S02 · 3/10 điểm · NOT_STARTED

API/worker/export/SSE/media kiểm tenant+object+field với deny-by-default

**Bằng chứng:** test_run. Chứng minh kết quả của T015.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T015.S03 · 2/10 điểm · NOT_STARTED

UI ẩn trường cost/PII theo response redaction, không gửi full rồi chỉ CSS hide

**Bằng chứng:** test_run. Chứng minh kết quả của T015.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T015.S04 · 2/10 điểm · NOT_STARTED

Test tất cả entrypoints bằng ID shop khác; thu hồi quyền trong lúc job đang chạy

**Bằng chứng:** test_run. Chứng minh kết quả của T015.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T015.S05 · 2/10 điểm · NOT_STARTED

Nối negative authorization suite và ghi matrix route/action/permission còn thiếu

**Bằng chứng:** test_run. Chứng minh kết quả của T015.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- UI-hidden control cannot bypass backend; Telegram id mapping rechecked.
- Supervisor không tự nâng scope, không approval của mình thành người thật.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T015/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T016 — Command, audit và transactional outbox
**Giai đoạn:** P02 · **Ưu tiên:** 16 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T015. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H04, H06.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/platform/commands/`
- `apps/api/src/platform/outbox/`
- `apps/api/src/platform/audit/`

### Thực hiện tuần tự

#### T016.S01 · 1/10 điểm · NOT_STARTED

Command unique shop+idempotencyKey+operation, hash canonical body; mismatched replay 409

**Bằng chứng:** test_run. Chứng minh kết quả của T016.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T016.S02 · 3/10 điểm · NOT_STARTED

Trong transaction ghi business state + outbox + audit intent; không gọi external API khi giữ DB lock

**Bằng chứng:** test_run. Chứng minh kết quả của T016.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T016.S03 · 2/10 điểm · NOT_STARTED

Response accepted trả command ref; succeeded/failed/unknown phân biệt; reconciliation lookup

**Bằng chứng:** test_run. Chứng minh kết quả của T016.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T016.S04 · 2/10 điểm · NOT_STARTED

Test crash before commit/after commit, double submit, stale version/If-Match và same key different body

**Bằng chứng:** test_run. Chứng minh kết quả của T016.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T016.S05 · 2/10 điểm · NOT_STARTED

Chứng minh duplicate tạo một tác động nội bộ; external exactly-once không được hứa

**Bằng chứng:** test_run. Chứng minh kết quả của T016.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Crash after external accept before local save not blindly retried; poison jobs isolated.
- Changed data must not rewrite audit reason; no secrets in logs/exports/error URLs.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T016/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T017 — Worker bền vững và scheduler cơ sở
**Giai đoạn:** P02 · **Ưu tiên:** 17 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T016. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H01, H03, H04.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/worker/src/`
- `apps/api/src/platform/jobs/`
- `tests/integration/workers/`

### Thực hiện tuần tự

#### T017.S01 · 1/10 điểm · NOT_STARTED

Thiết lập BullMQ/Redis queue với outbox relay, stable job IDs và DB command ledger authority

**Bằng chứng:** test_run. Chứng minh kết quả của T017.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T017.S02 · 3/10 điểm · NOT_STARTED

Ack/outbox delivery sau enqueue, replay-safe; bounded retries, poison queue, lease/fencing

**Bằng chứng:** test_run. Chứng minh kết quả của T017.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T017.S03 · 2/10 điểm · NOT_STARTED

Đặt dueAt UTC từ shop timezone + policy, reconcile pending jobs sau restart/queue loss

**Bằng chứng:** test_run. Chứng minh kết quả của T017.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T017.S04 · 2/10 điểm · NOT_STARTED

Test kill worker trước/sau external stub accept; không retry mù trạng thái unknown

**Bằng chứng:** test_run. Chứng minh kết quả của T017.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T017.S05 · 2/10 điểm · NOT_STARTED

Chạy process restart test, queue lag metric và safe shutdown; không cần browser mở

**Bằng chứng:** test_run. Chứng minh kết quả của T017.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Close browser and restart worker preserves due work; queue loss rebuild from DB.
- No silent PII transfer to unapproved model; exhausted budget moves to safe handoff.
- Crash after external accept before local save not blindly retried; poison jobs isolated.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T017/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T018 — UI membership và đổi shop hoàn chỉnh
**Giai đoạn:** P02 · **Ưu tiên:** 18 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T015, T012. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** G01, H05.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/modules/workspace/`
- `apps/web/tests/workspace/`

### Thực hiện tuần tự

#### T018.S01 · 1/10 điểm · NOT_STARTED

Làm chọn shop, team roles, onboarding gate từ API thật local, không tiếp tục với shop invalid

**Bằng chứng:** test_run. Chứng minh kết quả của T018.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T018.S02 · 3/10 điểm · NOT_STARTED

Cancel queries/streams và clear transient PII/forms khi switch/logout/revoke

**Bằng chứng:** test_run. Chứng minh kết quả của T018.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T018.S03 · 2/10 điểm · NOT_STARTED

Validate invite/role change và step-up cho quyền nguy hiểm; permissionVersion invalidates cache

**Bằng chứng:** test_run. Chứng minh kết quả của T018.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T018.S04 · 2/10 điểm · NOT_STARTED

Test late response shop cũ, direct URL unauthorized và hai tab thay quyền

**Bằng chứng:** test_run. Chứng minh kết quả của T018.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T018.S05 · 2/10 điểm · NOT_STARTED

Kết thúc bằng login→shop→profile E2E; evidence backend local khác demo cũ

**Bằng chứng:** test_run. Chứng minh kết quả của T018.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Không tự suy quốc gia kinh doanh từ location; config missing blocks only dependent live actions.
- UI-hidden control cannot bypass backend; Telegram id mapping rechecked.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T018/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T019 — Catalog API và UI vertical slice
**Giai đoạn:** P03 · **Ưu tiên:** 19 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T018, T016. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** G02, B02.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/07_AI_AND_CHANNELS.md`
- `docs/18_CODING_STANDARDS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/catalog/`
- `apps/web/src/modules/catalog/`
- `tests/catalog/`

### Thực hiện tuần tự

#### T019.S01 · 1/10 điểm · NOT_STARTED

Tạo Product/Variant/category source với SKU unique per shop; archive không hard delete lịch sử

**Bằng chứng:** test_run. Chứng minh kết quả của T019.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T019.S02 · 3/10 điểm · NOT_STARTED

Implement create/list/detail/update API ETag, generated client, query keys và server validation

**Bằng chứng:** test_run. Chứng minh kết quả của T019.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T019.S03 · 2/10 điểm · NOT_STARTED

Làm danh sách→tạo→sửa→ngừng bán với form error preservation; không nhập tồn ở product form

**Bằng chứng:** test_run. Chứng minh kết quả của T019.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T019.S04 · 2/10 điểm · NOT_STARTED

Test SKU collision, price decimal, stale edit, two-shop data và archive referenced order

**Bằng chứng:** test_run. Chứng minh kết quả của T019.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T019.S05 · 2/10 điểm · NOT_STARTED

Chạy UI→API→DB E2E đầy đủ; đây là lát cắt đầu tiên trước mở rộng hàng loạt

**Bằng chứng:** test_run. Chứng minh kết quả của T019.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Publish yêu cầu dữ liệu tối thiểu; price/stock vẫn live tools.
- Tồn/giá thay sau retrieval được kiểm lại tại confirm; không dùng vector cache làm giá giao dịch.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T019/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T020 — Biến thể, ảnh và import kiểm soát
**Giai đoạn:** P03 · **Ưu tiên:** 20 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T019. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** G02, D01.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/23_PROCUREMENT.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/catalog/import/`
- `apps/web/src/modules/catalog/import/`
- `tests/catalog/import/`

### Thực hiện tuần tự

#### T020.S01 · 1/10 điểm · NOT_STARTED

Thêm SKU variants, attributes và file object S3 port; scan/type/size policies

**Bằng chứng:** test_run. Chứng minh kết quả của T020.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T020.S02 · 3/10 điểm · NOT_STARTED

Import CSV/XLSX parse server có limits, preview mapping/row errors rồi commit idempotent job

**Bằng chứng:** test_run. Chứng minh kết quả của T020.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T020.S03 · 2/10 điểm · NOT_STARTED

UI giữ kết quả từng dòng và partial failures; chống spreadsheet formula injection khi export

**Bằng chứng:** test_run. Chứng minh kết quả của T020.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T020.S04 · 2/10 điểm · NOT_STARTED

Test duplicate SKUs/import retry/malformed archives/image URL SSRF/quota exceeded

**Bằng chứng:** test_run. Chứng minh kết quả của T020.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T020.S05 · 2/10 điểm · NOT_STARTED

Verify import progress polling/SSE với scope quyền; không seed data giả vào production

**Bằng chứng:** test_run. Chứng minh kết quả của T020.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Publish yêu cầu dữ liệu tối thiểu; price/stock vẫn live tools.
- Hàng đang về/hỏng không có trong available; tổng projection khớp movement ledger.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T020/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T021 — Khách hàng và định danh hội thoại
**Giai đoạn:** P03 · **Ưu tiên:** 21 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T019. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** G04, G05, B03.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/07_AI_AND_CHANNELS.md`
- `docs/18_CODING_STANDARDS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/customers/`
- `apps/web/src/modules/customers/`

### Thực hiện tuần tự

#### T021.S01 · 1/10 điểm · NOT_STARTED

Tạo customer identity page-scoped externalId; user staff không cùng bảng khách

**Bằng chứng:** test_run. Chứng minh kết quả của T021.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T021.S02 · 3/10 điểm · NOT_STARTED

Address/contact normalized; link conversation/order refs trong tenant

**Bằng chứng:** test_run. Chứng minh kết quả của T021.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T021.S03 · 2/10 điểm · NOT_STARTED

UI hồ sơ/history/notes, verified contact và service-vs-marketing consent

**Bằng chứng:** test_run. Chứng minh kết quả của T021.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T021.S04 · 2/10 điểm · NOT_STARTED

Test hai người trùng tên, cùng platform id ở page khác, merge request cần review

**Bằng chứng:** test_run. Chứng minh kết quả của T021.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T021.S05 · 2/10 điểm · NOT_STARTED

Chạy API/UI customer flow và negative PII export; fixture chỉ dữ liệu tổng hợp

**Bằng chứng:** test_run. Chứng minh kết quả của T021.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Không tự merge cùng tên/số bị che; scope mismatch denied.
- Opt-out suppresses marketing jobs queued before change; backups restore reapplies tombstones.
- Thiếu số liên hệ/địa chỉ theo policy hoặc quote hết hạn không chốt; sửa hàng/giá cần xác nhận mới.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T021/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T022 — Ledger tồn kho và projection
**Giai đoạn:** P03 · **Ưu tiên:** 22 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T020. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** D01, D03.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/23_PROCUREMENT.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/inventory/`
- `apps/web/src/modules/inventory/`
- `tests/inventory/`

### Thực hiện tuần tự

#### T022.S01 · 1/10 điểm · NOT_STARTED

StockMovement append-only; positions sellable/reserved/quarantine/transit theo warehouse+SKU

**Bằng chứng:** test_run. Chứng minh kết quả của T022.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T022.S02 · 3/10 điểm · NOT_STARTED

Available=sellableOnHand-reserved; inbound không trộn với stock có thể bán

**Bằng chứng:** test_run. Chứng minh kết quả của T022.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T022.S03 · 2/10 điểm · NOT_STARTED

UI tồn, cảnh báo ngưỡng, adjustment reason và movement drill-down

**Bằng chứng:** test_run. Chứng minh kết quả của T022.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T022.S04 · 2/10 điểm · NOT_STARTED

Test negative available, wrong tenant warehouse, stock adjustment under reserved và movement replay

**Bằng chứng:** test_run. Chứng minh kết quả của T022.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T022.S05 · 2/10 điểm · NOT_STARTED

Rebuild projection từ ledger mẫu; compare balances; không update quantity qua product controller

**Bằng chứng:** test_run. Chứng minh kết quả của T022.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Hàng đang về/hỏng không có trong available; tổng projection khớp movement ledger.
- Thiếu budget cho auto_send phải block; qty không âm và đúng packSize/MOQ.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T022/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T023 — Giữ hàng đồng thời và hết hạn
**Giai đoạn:** P03 · **Ưu tiên:** 23 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T022, T017. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** B04, C08, H04.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/07_AI_AND_CHANNELS.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/22_FULFILLMENT.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/inventory/reservations/`
- `tests/inventory/concurrency/`

### Thực hiện tuần tự

#### T023.S01 · 1/10 điểm · NOT_STARTED

Reservation gắn order/line/version/expiry; unique active intent; atomic conditional decrement available

**Bằng chứng:** test_run. Chứng minh kết quả của T023.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T023.S02 · 3/10 điểm · NOT_STARTED

Lock SKU theo thứ tự ổn định; transaction nhiều dòng all-or-nothing; avoid long IO in lock

**Bằng chứng:** test_run. Chứng minh kết quả của T023.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T023.S03 · 2/10 điểm · NOT_STARTED

Expiry/cancel release một lần; fence confirm-vs-expiry race bằng state/version

**Bằng chứng:** test_run. Chứng minh kết quả của T023.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T023.S04 · 2/10 điểm · NOT_STARTED

Test 100 contenders mua chiếc cuối, multiple SKU deadlock retry bounded và partial rollback

**Bằng chứng:** test_run. Chứng minh kết quả của T023.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T023.S05 · 2/10 điểm · NOT_STARTED

Mutation test bỏ available guard phải fail; lưu seed/timing và DB used

**Bằng chứng:** test_run. Chứng minh kết quả của T023.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Prompt nói đã đồng ý không thay bằng chứng xác nhận; không tự tăng hạn mức.
- Không hủy đơn đã handed_over bằng cancel thường; reservation release đúng một lần.
- Crash after external accept before local save not blindly retried; poison jobs isolated.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T023/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T024 — Lát cắt sản phẩm tới báo giá
**Giai đoạn:** P03 · **Ưu tiên:** 24 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T023, T021, T017. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** B02, B03, G02.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/07_AI_AND_CHANNELS.md`
- `docs/18_CODING_STANDARDS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/use-cases/order-quote/`
- `apps/web/src/app/compositions/`
- `tests/e2e/catalog-order/`

### Thực hiện tuần tự

#### T024.S01 · 1/10 điểm · NOT_STARTED

Compose catalog/customer/inventory qua public ports; không frontend module deep import

**Bằng chứng:** test_run. Chứng minh kết quả của T024.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T024.S02 · 3/10 điểm · NOT_STARTED

Quote trả authoritative lines/availability/expiry/currency với redacted fields

**Bằng chứng:** test_run. Chứng minh kết quả của T024.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T024.S03 · 2/10 điểm · NOT_STARTED

UI từ product/customer mở draft quote giữ context; offline chỉ xem không confirm

**Bằng chứng:** test_run. Chứng minh kết quả của T024.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T024.S04 · 2/10 điểm · NOT_STARTED

Test price change giữa quote và confirm stub, archive variant và wrong customer scope

**Bằng chứng:** test_run. Chứng minh kết quả của T024.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T024.S05 · 2/10 điểm · NOT_STARTED

Chạy local full-stack E2E, ghi phần order confirm chưa hoàn tất; không chấm T025 sớm

**Bằng chứng:** test_run. Chứng minh kết quả của T024.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Tồn/giá thay sau retrieval được kiểm lại tại confirm; không dùng vector cache làm giá giao dịch.
- Thiếu số liên hệ/địa chỉ theo policy hoặc quote hết hạn không chốt; sửa hàng/giá cần xác nhận mới.
- Publish yêu cầu dữ liệu tối thiểu; price/stock vẫn live tools.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T024/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T025 — Máy trạng thái đơn hàng v2
**Giai đoạn:** P04 · **Ưu tiên:** 25 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T024. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** C06, C08, B03.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/07_AI_AND_CHANNELS.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/22_FULFILLMENT.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/orders/`
- `tests/orders/state/`

### Thực hiện tuần tự

#### T025.S01 · 1/10 điểm · NOT_STARTED

Tách order/commercial, prep, shipment, payment, return states theo docs/05

**Bằng chứng:** test_run. Chứng minh kết quả của T025.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T025.S02 · 3/10 điểm · NOT_STARTED

Transitions explicit; order completed không tự suy paid nếu COD clearing chưa về

**Bằng chứng:** test_run. Chứng minh kết quả của T025.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T025.S03 · 2/10 điểm · NOT_STARTED

Draft lines snapshot product/price refs; edit invalidates quote/confirmation/approval

**Bằng chứng:** test_run. Chứng minh kết quả của T025.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T025.S04 · 2/10 điểm · NOT_STARTED

Test toàn bộ transitions allowed/denied, cancel after handover blocked

**Bằng chứng:** test_run. Chứng minh kết quả của T025.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T025.S05 · 2/10 điểm · NOT_STARTED

Generate state coverage và API DTO khớp contract; không giữ fulfill legacy gộp giao/thu

**Bằng chứng:** test_run. Chứng minh kết quả của T025.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Event lùi/trùng không hoàn tất sai; delivered không đồng nghĩa tiền về ngân hàng.
- Không hủy đơn đã handed_over bằng cancel thường; reservation release đúng một lần.
- Thiếu số liên hệ/địa chỉ theo policy hoặc quote hết hạn không chốt; sửa hàng/giá cần xác nhận mới.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T025/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T026 — Xác nhận khách, quote và chốt đơn
**Giai đoạn:** P04 · **Ưu tiên:** 26 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T025. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** B03, B04, C08.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/07_AI_AND_CHANNELS.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/22_FULFILLMENT.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/use-cases/confirm-order/`
- `tests/orders/confirm/`

### Thực hiện tuần tự

#### T026.S01 · 1/10 điểm · NOT_STARTED

Confirmation evidence gắn quote hash/version, nội dung khách chấp thuận và TTL

**Bằng chứng:** test_run. Chứng minh kết quả của T026.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T026.S02 · 3/10 điểm · NOT_STARTED

Re-evaluate price/stock/shipping/customer authority và policy trước transaction

**Bằng chứng:** test_run. Chứng minh kết quả của T026.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T026.S03 · 2/10 điểm · NOT_STARTED

Atomic order confirm + inventory reservation + task intent outbox; policy rejects create approval

**Bằng chứng:** test_run. Chứng minh kết quả của T026.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T026.S04 · 2/10 điểm · NOT_STARTED

Test confirmation replay, stale quote, changed address/qty và concurrent last stock

**Bằng chứng:** test_run. Chứng minh kết quả của T026.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T026.S05 · 2/10 điểm · NOT_STARTED

Chạy mutation cases và no-fake-consent guard; audit cho phép lần chốt cụ thể

**Bằng chứng:** test_run. Chứng minh kết quả của T026.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Thiếu số liên hệ/địa chỉ theo policy hoặc quote hết hạn không chốt; sửa hàng/giá cần xác nhận mới.
- Prompt nói đã đồng ý không thay bằng chứng xác nhận; không tự tăng hạn mức.
- Không hủy đơn đã handed_over bằng cancel thường; reservation release đúng một lần.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T026/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T027 — Thanh toán và COD readiness
**Giai đoạn:** P04 · **Ưu tiên:** 27 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T026. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** C04, E04, E05.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/22_FULFILLMENT.md`
- `docs/24_FINANCE.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/orders/payment-eligibility/`
- `apps/web/src/modules/orders/`

### Thực hiện tuần tự

#### T027.S01 · 1/10 điểm · NOT_STARTED

Define payment method prepay/COD and readiness; country/currency/shop policy chưa live thì blocked

**Bằng chứng:** test_run. Chứng minh kết quả của T027.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T027.S02 · 3/10 điểm · NOT_STARTED

Deposit/partial/verified payment events có amount exact and source refs

**Bằng chứng:** test_run. Chứng minh kết quả của T027.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T027.S03 · 2/10 điểm · NOT_STARTED

Order UI phân biệt chưa xác minh, đủ chuẩn bị và chờ ngoại lệ; không chốt bằng ảnh chuyển tiền

**Bằng chứng:** test_run. Chứng minh kết quả của T027.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T027.S04 · 2/10 điểm · NOT_STARTED

Test unpaid prepay blocked, valid COD reserved allowed, edited quote recheck

**Bằng chứng:** test_run. Chứng minh kết quả của T027.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T027.S05 · 2/10 điểm · NOT_STARTED

Verify cannot bypass readiness qua notification endpoint hoặc UI hidden action

**Bằng chứng:** test_run. Chứng minh kết quả của T027.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Ngoài vùng, quote phí hết hạn hoặc thiếu address không hứa giao.
- Ảnh chuyển khoản chỉ evidence chờ kiểm; unmatched/partial/duplicate visible; offline không post.
- Khách trả carrier khác shop received cash; net remittance + fees cân bằng gross clearing.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T027/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T028 — Nền sổ kép và số tiền chính xác
**Giai đoạn:** P04 · **Ưu tiên:** 28 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T027, T013. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** E01, E02, H04.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/24_FINANCE.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/finance/ledger/`
- `tests/finance/ledger/`

### Thực hiện tuần tự

#### T028.S01 · 1/10 điểm · NOT_STARTED

Journal headers/lines balance per currency; immutable posted, source unique, reversal links

**Bằng chứng:** test_run. Chứng minh kết quả của T028.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T028.S02 · 3/10 điểm · NOT_STARTED

Decimal arithmetic + rounding policy dùng thư viện khóa; currency minor unit explicit

**Bằng chứng:** test_run. Chứng minh kết quả của T028.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T028.S03 · 2/10 điểm · NOT_STARTED

Persist cost snapshots and journal source period/policy; không LLM vào ledger write path

**Bằng chứng:** test_run. Chứng minh kết quả của T028.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T028.S04 · 2/10 điểm · NOT_STARTED

Test debit≠credit, decimal rounding, duplicate source, reversal duplicate và wrong shop account

**Bằng chứng:** test_run. Chứng minh kết quả của T028.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T028.S05 · 2/10 điểm · NOT_STARTED

Property tests balanced randomized journals; zero/negative money validation theo loại nghiệp vụ

**Bằng chứng:** test_run. Chứng minh kết quả của T028.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Không post journal mất cân bằng; source trùng không ghi lặp; reversed phải reason.
- Không lấy toàn purchase cost vào P&L; không giả định dispatch = delivered; policy chưa duyệt chặn live post.
- Crash after external accept before local save not blindly retried; poison jobs isolated.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T028/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T029 — UI đơn hàng và hành động có điều kiện
**Giai đoạn:** P04 · **Ưu tiên:** 29 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T027, T012. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** B03, C01, C08.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/07_AI_AND_CHANNELS.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/22_FULFILLMENT.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/modules/orders/`
- `apps/web/src/app/compositions/`

### Thực hiện tuần tự

#### T029.S01 · 1/10 điểm · NOT_STARTED

List/detail/form show independent states and allowedActions; server quote totals

**Bằng chứng:** test_run. Chứng minh kết quả của T029.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T029.S02 · 3/10 điểm · NOT_STARTED

Compose inbox seed/cust refs qua app; dirty draft preserve on 422; no optimistic stock mutation

**Bằng chứng:** test_run. Chứng minh kết quả của T029.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T029.S03 · 2/10 điểm · NOT_STARTED

Unknown command shows reconcile button and disables unsafe duplicate action

**Bằng chứng:** test_run. Chứng minh kết quả của T029.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T029.S04 · 2/10 điểm · NOT_STARTED

Test edit/confirm/cancel, stale ETag, double click, unauthorized cost and offline

**Bằng chứng:** test_run. Chứng minh kết quả của T029.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T029.S05 · 2/10 điểm · NOT_STARTED

Browser path shows actual order ID, reservation and audit from local API

**Bằng chứng:** test_run. Chứng minh kết quả của T029.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Thiếu số liên hệ/địa chỉ theo policy hoặc quote hết hạn không chốt; sửa hàng/giá cần xác nhận mới.
- Không gộp packed với delivered; bộ lọc không làm mất việc chưa nhận.
- Không hủy đơn đã handed_over bằng cancel thường; reservation release đúng một lần.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T029/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T030 — Kiểm xuyên suốt chốt đơn và tiền nền
**Giai đoạn:** P04 · **Ưu tiên:** 30 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T028, T029. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** B04, C08, E01, H04.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/07_AI_AND_CHANNELS.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/22_FULFILLMENT.md`
- `docs/24_FINANCE.md`

### Vùng được sửa / đầu ra bắt buộc
- `tests/e2e/orders/`
- `tests/integration/orders-finance/`

### Thực hiện tuần tự

#### T030.S01 · 1/10 điểm · NOT_STARTED

Run create customer/product→quote→confirmation→reserved order in two-shop fixtures

**Bằng chứng:** test_run. Chứng minh kết quả của T030.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T030.S02 · 3/10 điểm · NOT_STARTED

Inject commit failure and outbox replay; assert no order without matching stock reservation

**Bằng chứng:** test_run. Chứng minh kết quả của T030.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T030.S03 · 2/10 điểm · NOT_STARTED

Verify journal foundation independent from draft creation; no revenue on mere draft

**Bằng chứng:** test_run. Chứng minh kết quả của T030.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T030.S04 · 2/10 điểm · NOT_STARTED

Test cancel releases once and no prepare alert before readiness

**Bằng chứng:** test_run. Chứng minh kết quả của T030.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T030.S05 · 2/10 điểm · NOT_STARTED

Record combined source hashes and blockers; unlock phase chuẩn bị/thông báo after invariant pass

**Bằng chứng:** test_run. Chứng minh kết quả của T030.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Prompt nói đã đồng ý không thay bằng chứng xác nhận; không tự tăng hạn mức.
- Không hủy đơn đã handed_over bằng cancel thường; reservation release đúng một lần.
- Không post journal mất cân bằng; source trùng không ghi lặp; reversed phải reason.
- Crash after external accept before local save not blindly retried; poison jobs isolated.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T030/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T031 — Task nhận việc và bảng chuẩn bị
**Giai đoạn:** P05 · **Ưu tiên:** 31 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T030, T017. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** A02, A04, C01, F02.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/21_NOTIFICATIONS.md`
- `docs/22_FULFILLMENT.md`
- `docs/25_OPERATIONS_AI.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/operations/tasks/`
- `apps/web/src/modules/fulfillment/`

### Thực hiện tuần tự

#### T031.S01 · 1/10 điểm · NOT_STARTED

Consume order-ready event into one WorkItem; assignee/version/dueAt indexed by shop

**Bằng chứng:** test_run. Chứng minh kết quả của T031.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T031.S02 · 3/10 điểm · NOT_STARTED

Claim compare-and-set active membership; reassign explicit audit and current source state

**Bằng chứng:** test_run. Chứng minh kết quả của T031.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T031.S03 · 2/10 điểm · NOT_STARTED

Board queued/claimed/picking/packed with filters/late badges and no task duplication

**Bằng chứng:** test_run. Chứng minh kết quả của T031.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T031.S04 · 2/10 điểm · NOT_STARTED

Race two users claim; canceled order stops task; notification read alone not claim

**Bằng chứng:** test_run. Chứng minh kết quả của T031.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T031.S05 · 2/10 điểm · NOT_STARTED

End-to-end claim board plus DB compare-and-set test; update UI mobile action

**Bằng chứng:** test_run. Chứng minh kết quả của T031.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Đơn nháp, reservation fail hoặc transaction rollback không phát lệnh chuẩn bị; event trùng chỉ một việc.
- Hai nhân viên đồng thời nhận: một thắng, một thấy người đã nhận; delivery receipt không đồng nghĩa nhận việc.
- Không gộp packed với delivered; bộ lọc không làm mất việc chưa nhận.
- Notification ack liên kết task, không thành tracker cạnh tranh; cancelled source cancels task.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T031/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T032 — Lấy, đóng gói và bàn giao hàng
**Giai đoạn:** P05 · **Ưu tiên:** 32 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T031. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** C02, C03, C05.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/22_FULFILLMENT.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/fulfillment/`
- `apps/web/src/modules/fulfillment/`
- `tests/fulfillment/`

### Thực hiện tuần tự

#### T032.S01 · 1/10 điểm · NOT_STARTED

Line checklist SKU/qty scan fallback; missing/damaged case blocks pack

**Bằng chứng:** test_run. Chứng minh kết quả của T032.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T032.S02 · 3/10 điểm · NOT_STARTED

Packed→handover requires actor/evidence; reserve consumed and stock transferred to transit atomically

**Bằng chứng:** test_run. Chứng minh kết quả của T032.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T032.S03 · 2/10 điểm · NOT_STARTED

Labels manual baseline, carrier port with idempotency; never call carrier inside stock lock

**Bằng chứng:** test_run. Chứng minh kết quả của T032.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T032.S04 · 2/10 điểm · NOT_STARTED

Test wrong SKU, second handover, shortage after claim và crash at commit

**Bằng chứng:** test_run. Chứng minh kết quả của T032.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T032.S05 · 2/10 điểm · NOT_STARTED

Browser picking checklist→pack→handover shows shipping distinct delivered

**Bằng chứng:** test_run. Chứng minh kết quả của T032.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Quét sai SKU/nhập vượt lượng chặn pack; snapshot không dùng ảnh hiện tại sai phiên bản.
- Có issue chưa giải quyết thì không ready; ảnh chứng cứ không công khai PII.
- Timeout create label phải reconcile; bàn giao lần hai không trừ tồn lần hai.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T032/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T033 — Intent thông báo và subscription an toàn
**Giai đoạn:** P05 · **Ưu tiên:** 33 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T031, T017. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** A01, A02, A07, A08.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/21_NOTIFICATIONS.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/notifications/`
- `tests/notifications/`

### Thực hiện tuần tự

#### T033.S01 · 1/10 điểm · NOT_STARTED

Subscription user/device/shop key refs encrypted backend, permission/test/revoke endpoints

**Bằng chứng:** test_run. Chứng minh kết quả của T033.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T033.S02 · 3/10 điểm · NOT_STARTED

Notification intents from durable outbox with dedupe and minimal payload; provider observations distinct

**Bằng chứng:** test_run. Chứng minh kết quả của T033.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T033.S03 · 2/10 điểm · NOT_STARTED

Implement local push/Telegram ports mocks and notification center read model

**Bằng chứng:** test_run. Chứng minh kết quả của T033.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T033.S04 · 2/10 điểm · NOT_STARTED

Test revoked device, duplicate event, denied permission, invalid endpoint SSRF and stale task

**Bằng chứng:** test_run. Chứng minh kết quả của T033.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T033.S05 · 2/10 điểm · NOT_STARTED

Verify no customer address/phone in lockscreen, URL/logs or subscription public responses

**Bằng chứng:** test_run. Chứng minh kết quả của T033.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Từ chối quyền không ghi connected; thiết bị đã thu hồi không nhận lại; không yêu cầu key trong trình duyệt.
- Đơn nháp, reservation fail hoặc transaction rollback không phát lệnh chuẩn bị; event trùng chỉ một việc.
- Timeout không gắn failed; không có callback mở thì giữ unknown, không tạo tỷ lệ đọc giả.
- Callback replay, membership revoked, sai shop hoặc TTL hết đều bị chặn; tắt SMS/voice mặc định.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T033/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T034 — UI điện thoại, Web Push và Telegram adapter
**Giai đoạn:** P05 · **Ưu tiên:** 34 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T033, T012. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** A01, A03, A05, A06, A07, A08.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/21_NOTIFICATIONS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/modules/notifications/`
- `apps/web/public/sw.js`
- `apps/worker/src/notifications/`

### Thực hiện tuần tự

#### T034.S01 · 1/10 điểm · NOT_STARTED

Build PWA manifest/SW for public shell only; user-gesture permission and capability detection

**Bằng chứng:** test_run. Chứng minh kết quả của T034.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T034.S02 · 3/10 điểm · NOT_STARTED

Implement standards Web Push/VAPID server and Telegram pairing/callback verification; keys backend only

**Bằng chứng:** test_run. Chứng minh kết quả của T034.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T034.S03 · 2/10 điểm · NOT_STARTED

Policy schedule timezone/quiet hours/escalation cap; ack calls server claim reauthorization

**Bằng chứng:** test_run. Chứng minh kết quả của T034.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T034.S04 · 2/10 điểm · NOT_STARTED

Test click expired/foreign deep-link, callback replay, revoke while queued and SW upgrade

**Bằng chứng:** test_run. Chứng minh kết quả của T034.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T034.S05 · 2/10 điểm · NOT_STARTED

Run mocked E2E phone preview + adapters tests; real-device push reserved T070 not marked done by toast

**Bằng chứng:** test_run. Chứng minh kết quả của T034.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Từ chối quyền không ghi connected; thiết bị đã thu hồi không nhận lại; không yêu cầu key trong trình duyệt.
- Người không thuộc shop nhận 403/404; URL cũ không vượt quyền hiện hành.
- Nhận việc/hủy đơn dừng nhắc; worker restart không phát trùng; không có người trực thì vào hàng ngoại lệ.
- Không tự bỏ qua giờ yên lặng; bộ nhớ cấu hình mẫu không thành chính sách live.
- Timeout không gắn failed; không có callback mở thì giữ unknown, không tạo tỷ lệ đọc giả.
- Callback replay, membership revoked, sai shop hoặc TTL hết đều bị chặn; tắt SMS/voice mặc định.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T034/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T035 — Giao hàng, trả hàng và nghĩa vụ hoàn
**Giai đoạn:** P05 · **Ưu tiên:** 35 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T032, T028. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** C04, C05, C06, C07, E02.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/22_FULFILLMENT.md`
- `docs/24_FINANCE.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/fulfillment/shipments/`
- `apps/api/src/modules/orders/returns/`
- `apps/web/src/modules/fulfillment/`

### Thực hiện tuần tự

#### T035.S01 · 1/10 điểm · NOT_STARTED

Shipment transition tracking with external event ID/order; delivery evidence separated from bank cash

**Bằng chứng:** test_run. Chứng minh kết quả của T035.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T035.S02 · 3/10 điểm · NOT_STARTED

Partial returns with line quantities, received/inspected disposition, credit/refund obligation

**Bằng chứng:** test_run. Chứng minh kết quả của T035.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T035.S03 · 2/10 điểm · NOT_STARTED

Moving-average dispatch cost snapshot and in-transit asset tracking; revenue rule configurable but live needs approval

**Bằng chứng:** test_run. Chứng minh kết quả của T035.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T035.S04 · 2/10 điểm · NOT_STARTED

Test out-of-order carrier events, partial return over qty, damaged return and refund exceed paid

**Bằng chứng:** test_run. Chứng minh kết quả của T035.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T035.S05 · 2/10 điểm · NOT_STARTED

Browser ship→delivered→return inspection; no stock sellable until accepted inspection

**Bằng chứng:** test_run. Chứng minh kết quả của T035.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Ngoài vùng, quote phí hết hạn hoặc thiếu address không hứa giao.
- Timeout create label phải reconcile; bàn giao lần hai không trừ tồn lần hai.
- Event lùi/trùng không hoàn tất sai; delivered không đồng nghĩa tiền về ngân hàng.
- Returned item chưa kiểm không available; không hoàn quá paid/qty; partial return không làm hoàn toàn đơn.
- Không lấy toàn purchase cost vào P&L; không giả định dispatch = delivered; policy chưa duyệt chặn live post.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T035/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T036 — Lát cắt bán hàng tới điện thoại giả lập
**Giai đoạn:** P05 · **Ưu tiên:** 36 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T034, T035. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** A02, A04, C01, C06, E02, H04.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/21_NOTIFICATIONS.md`
- `docs/22_FULFILLMENT.md`
- `docs/24_FINANCE.md`

### Vùng được sửa / đầu ra bắt buộc
- `tests/e2e/sale-prepare-notify/`
- `execution/milestones/M1.md`

### Thực hiện tuần tự

#### T036.S01 · 1/10 điểm · NOT_STARTED

Create valid order and persist event; show notification and mobile task card same ID

**Bằng chứng:** test_run. Chứng minh kết quả của T036.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T036.S02 · 3/10 điểm · NOT_STARTED

Claim→pick→pack→handover→deliver on test backend, not old HTML state engine

**Bằng chứng:** test_run. Chứng minh kết quả của T036.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T036.S03 · 2/10 điểm · NOT_STARTED

Verify old notification becomes outdated and no duplicate claim after order cancellation

**Bằng chứng:** test_run. Chứng minh kết quả của T036.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T036.S04 · 2/10 điểm · NOT_STARTED

Restart API/worker mid-flow; compare order/stock/task/notification/journal state

**Bằng chứng:** test_run. Chứng minh kết quả của T036.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T036.S05 · 2/10 điểm · NOT_STARTED

Save M1 report with local/mock versus live matrix; owner can review before broad AI integrations

**Bằng chứng:** test_run. Chứng minh kết quả của T036.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Đơn nháp, reservation fail hoặc transaction rollback không phát lệnh chuẩn bị; event trùng chỉ một việc.
- Hai nhân viên đồng thời nhận: một thắng, một thấy người đã nhận; delivery receipt không đồng nghĩa nhận việc.
- Không gộp packed với delivered; bộ lọc không làm mất việc chưa nhận.
- Event lùi/trùng không hoàn tất sai; delivered không đồng nghĩa tiền về ngân hàng.
- Không lấy toàn purchase cost vào P&L; không giả định dispatch = delivered; policy chưa duyệt chặn live post.
- Crash after external accept before local save not blindly retried; poison jobs isolated.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T036/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T037 — Messenger webhook và inbox ingestion
**Giai đoạn:** P06 · **Ưu tiên:** 37 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T036. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** B07, B08, H01, H04.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/07_AI_AND_CHANNELS.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/integrations/meta/`
- `apps/worker/src/messenger/`

### Thực hiện tuần tự

#### T037.S01 · 1/10 điểm · NOT_STARTED

Implement verify handshake and raw-body signature verification from current official Meta docs

**Bằng chứng:** test_run. Chứng minh kết quả của T037.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T037.S02 · 3/10 điểm · NOT_STARTED

Persist inbound event before ack; dedupe scope/page/event and conversation ordering

**Bằng chứng:** test_run. Chứng minh kết quả của T037.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T037.S03 · 2/10 điểm · NOT_STARTED

Send eligibility computed server from latest channel policy; no policy hardcode in component

**Bằng chứng:** test_run. Chứng minh kết quả của T037.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T037.S04 · 2/10 điểm · NOT_STARTED

Test signature fail, replay, unknown page, echo event, late event and duplicate webhook

**Bằng chứng:** test_run. Chứng minh kết quả của T037.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T037.S05 · 2/10 điểm · NOT_STARTED

Sandbox adapter tests only; live permissions/token grant explicitly not assumed

**Bằng chứng:** test_run. Chứng minh kết quả của T037.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Takeover xảy ra khi LLM đang chạy: draft cũ không được send; release bot có audit.
- Ảnh chuyển tiền không xác nhận payment; comment không tự cấp phép private message; không hỗ trợ thì UI nêu rõ.
- Close browser and restart worker preserves due work; queue loss rebuild from DB.
- Crash after external accept before local save not blindly retried; poison jobs isolated.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T037/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T038 — Hộp thư hợp nhất và takeover fencing
**Giai đoạn:** P06 · **Ưu tiên:** 38 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T037. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** B01, B06, B07, G04.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/07_AI_AND_CHANNELS.md`
- `docs/18_CODING_STANDARDS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/inbox/`
- `apps/web/src/modules/inbox/`

### Thực hiện tuần tự

#### T038.S01 · 1/10 điểm · NOT_STARTED

Link customer/page conversations, messages/status/internal notes/assignment and allowed actions

**Bằng chứng:** test_run. Chứng minh kết quả của T038.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T038.S02 · 3/10 điểm · NOT_STARTED

Implement bot lease generation; human takeover invalidates pending LLM/send jobs

**Bằng chứng:** test_run. Chứng minh kết quả của T038.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T038.S03 · 2/10 điểm · NOT_STARTED

Build inbox 3 panes responsive, draft preservation, safe markdown and source references

**Bằng chứng:** test_run. Chứng minh kết quả của T038.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T038.S04 · 2/10 điểm · NOT_STARTED

Test concurrent reply, takeover before send, unknown send status and privacy redaction

**Bằng chứng:** test_run. Chứng minh kết quả của T038.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T038.S05 · 2/10 điểm · NOT_STARTED

E2E customer→inbox→takeover→draft order, no double answers

**Bằng chứng:** test_run. Chứng minh kết quả của T038.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Thiếu chính sách giao/đổi trả thì bot hỏi hoặc handoff, không bịa.
- Không gửi đơn khách khác; không hứa hoàn tiền hoặc xác nhận hoàn tiền thật.
- Takeover xảy ra khi LLM đang chạy: draft cũ không được send; release bot có audit.
- Không tự merge cùng tên/số bị che; scope mismatch denied.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T038/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T039 — Kiến thức và vòng duyệt
**Giai đoạn:** P06 · **Ưu tiên:** 39 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T038, T020. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** G02, G03, G06, B01.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/07_AI_AND_CHANNELS.md`
- `docs/18_CODING_STANDARDS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/knowledge/`
- `apps/web/src/modules/knowledge/`

### Thực hiện tuần tự

#### T039.S01 · 1/10 điểm · NOT_STARTED

Create source/revision/validFrom/validUntil/approval provenance and sensitive data redaction

**Bằng chứng:** test_run. Chứng minh kết quả của T039.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T039.S02 · 3/10 điểm · NOT_STARTED

Ingestion scan/chunk/embed ports; pgvector scoped metadata and deletes/tombstones

**Bằng chứng:** test_run. Chứng minh kết quả của T039.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T039.S03 · 2/10 điểm · NOT_STARTED

UI draft/review/evaluate/publish distinct; customer memory private not shared knowledge

**Bằng chứng:** test_run. Chứng minh kết quả của T039.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T039.S04 · 2/10 điểm · NOT_STARTED

Test injection in doc, expired revision, wrong-shop retrieval and revoke while retrieval cached

**Bằng chứng:** test_run. Chứng minh kết quả của T039.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T039.S05 · 2/10 điểm · NOT_STARTED

Run fixture retrieval tests; human-published facts only, not model self-rating

**Bằng chứng:** test_run. Chứng minh kết quả của T039.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Publish yêu cầu dữ liệu tối thiểu; price/stock vẫn live tools.
- Outdated knowledge excluded from retrieval; new version does not silently rewrite past promises.
- Prompt injection in document not instructions; no all-chat training by default.
- Thiếu chính sách giao/đổi trả thì bot hỏi hoặc handoff, không bịa.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T039/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T040 — Provider adapter và ngân sách AI
**Giai đoạn:** P06 · **Ưu tiên:** 40 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T039. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** B02, F01, H03.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/07_AI_AND_CHANNELS.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/25_OPERATIONS_AI.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/bot/providers/`
- `apps/web/src/modules/integrations/`

### Thực hiện tuần tự

#### T040.S01 · 1/10 điểm · NOT_STARTED

Define capability-normalized adapters; OpenAI-compatible/Anthropic/custom allowed schemes separate

**Bằng chứng:** test_run. Chứng minh kết quả của T040.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T040.S02 · 3/10 điểm · NOT_STARTED

Select first provider via business-approved grant; use deterministic local fake until credentials exist

**Bằng chứng:** test_run. Chứng minh kết quả của T040.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T040.S03 · 2/10 điểm · NOT_STARTED

Track token estimates/usage/cost source, timeout/retry/circuit states and approved fallback only

**Bằng chứng:** test_run. Chứng minh kết quả của T040.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T040.S04 · 2/10 điểm · NOT_STARTED

Test unsupported tool/image, price unknown, budget exhausted, SSRF URL/DNS and secret redaction

**Bằng chứng:** test_run. Chứng minh kết quả của T040.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T040.S05 · 2/10 điểm · NOT_STARTED

Provider contract tests, no claim all API keys interchangeable; UI labels estimate versus billed

**Bằng chứng:** test_run. Chứng minh kết quả của T040.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Tồn/giá thay sau retrieval được kiểm lại tại confirm; không dùng vector cache làm giá giao dịch.
- Không xem bốn cards là bốn process; bot role không có members.manage hoặc payment transfer.
- No silent PII transfer to unapproved model; exhausted budget moves to safe handoff.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T040/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T041 — Tool bán hàng và tự chốt có quyền
**Giai đoạn:** P06 · **Ưu tiên:** 41 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T040, T026. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** B02, B03, B04, B05, F05.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/07_AI_AND_CHANNELS.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/25_OPERATIONS_AI.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/bot/tools/`
- `apps/api/src/use-cases/agent-order/`
- `tests/ai/tools/`

### Thực hiện tuần tự

#### T041.S01 · 1/10 điểm · NOT_STARTED

Expose read catalog/quote/createDraft/confirmWithEvidence; no generic SQL/shell or ledger write

**Bằng chứng:** test_run. Chứng minh kết quả của T041.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T041.S02 · 3/10 điểm · NOT_STARTED

Prompt references capability policy, actual price/stock and confirmation requirements

**Bằng chứng:** test_run. Chứng minh kết quả của T041.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T041.S03 · 2/10 điểm · NOT_STARTED

Execution layer validates JSON schema/tenant/resource/version/limits/idempotency each call

**Bằng chứng:** test_run. Chứng minh kết quả của T041.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T041.S04 · 2/10 điểm · NOT_STARTED

Adversarial tests malicious customer, fabricated confirmation, coupon escalation and fallback PII

**Bằng chứng:** test_run. Chứng minh kết quả của T041.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T041.S05 · 2/10 điểm · NOT_STARTED

End-to-end scripted tool invocation→backend policy→draft/confirm/approval; no unrestricted agent tool

**Bằng chứng:** test_run. Chứng minh kết quả của T041.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Tồn/giá thay sau retrieval được kiểm lại tại confirm; không dùng vector cache làm giá giao dịch.
- Thiếu số liên hệ/địa chỉ theo policy hoặc quote hết hạn không chốt; sửa hàng/giá cần xác nhận mới.
- Prompt nói đã đồng ý không thay bằng chứng xác nhận; không tự tăng hạn mức.
- Hết hạn, sai SKU, vượt giảm giá hoặc hết tồn không áp dụng ưu đãi.
- Supervisor không tự nâng scope, không approval của mình thành người thật.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T041/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T042 — Evals, hậu mãi và media capability
**Giai đoạn:** P06 · **Ưu tiên:** 42 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T041. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** B06, B08, F08, G06.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/07_AI_AND_CHANNELS.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/25_OPERATIONS_AI.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/bot/evaluations/`
- `apps/web/src/modules/bot/`
- `tests/ai/evals/`

### Thực hiện tuần tự

#### T042.S01 · 1/10 điểm · NOT_STARTED

Curate reviewed test set FAQ/stock/price/complaints/handoff/promotions/PII and ground truth

**Bằng chứng:** test_run. Chứng minh kết quả của T042.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T042.S02 · 3/10 điểm · NOT_STARTED

Add aftersales case tools and guarded media transcript review; mark unsupported comment reply disabled

**Bằng chứng:** test_run. Chứng minh kết quả của T042.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T042.S03 · 2/10 điểm · NOT_STARTED

Version prompt/model/knowledge/policy/dataset per evaluation and promote after required metrics

**Bằng chứng:** test_run. Chứng minh kết quả của T042.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T042.S04 · 2/10 điểm · NOT_STARTED

Test STT wrong address, screenshot payment ambiguity, hallucinated delivery promise and forbidden outreach

**Bằng chứng:** test_run. Chứng minh kết quả của T042.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T042.S05 · 2/10 điểm · NOT_STARTED

Store samples/counts/errors; numeric thresholds proposed per approved risk not artificial 100% accuracy

**Bằng chứng:** test_run. Chứng minh kết quả của T042.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Không gửi đơn khách khác; không hứa hoàn tiền hoặc xác nhận hoàn tiền thật.
- Ảnh chuyển tiền không xác nhận payment; comment không tự cấp phép private message; không hỗ trợ thì UI nêu rõ.
- Không tự nhận confidence từ model là accuracy; version linkage and sample counts visible.
- Prompt injection in document not instructions; no all-chat training by default.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T042/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T043 — Hồ sơ nhà cung cấp và danh mục mua
**Giai đoạn:** P07 · **Ưu tiên:** 43 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T022. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** D02, D03.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/23_PROCUREMENT.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/procurement/suppliers/`
- `apps/web/src/modules/procurement/`

### Thực hiện tuần tự

#### T043.S01 · 1/10 điểm · NOT_STARTED

Supplier/SKU price/leadTime/MOQ/packSize/paymentTerms/currency scoped and versioned

**Bằng chứng:** test_run. Chứng minh kết quả của T043.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T043.S02 · 3/10 điểm · NOT_STARTED

Approved status and allowed send method; separate from AI provider catalog

**Bằng chứng:** test_run. Chứng minh kết quả của T043.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T043.S03 · 2/10 điểm · NOT_STARTED

UI CRUD/supplier detail/price history/contacts/linked SKUs, archive preserves PO history

**Bằng chứng:** test_run. Chứng minh kết quả của T043.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T043.S04 · 2/10 điểm · NOT_STARTED

Test wrong tenant, negative cost, unsupported currency and supplier not approved

**Bằng chứng:** test_run. Chứng minh kết quả của T043.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T043.S05 · 2/10 điểm · NOT_STARTED

Contract/UI E2E data fixture; do not send mail/order to actual supplier

**Bằng chứng:** test_run. Chứng minh kết quả của T043.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Supplier khác shop hoặc chưa duyệt không auto-purchase; lịch sử đổi giá được giữ.
- Thiếu budget cho auto_send phải block; qty không âm và đúng packSize/MOQ.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T043/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T044 — Quy tắc tái đặt và dự báo tối thiểu
**Giai đoạn:** P07 · **Ưu tiên:** 44 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T043, T017. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** D03, D04, D07.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/23_PROCUREMENT.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/procurement/reorder/`
- `apps/web/src/modules/procurement/reorder/`

### Thực hiện tuần tự

#### T044.S01 · 1/10 điểm · NOT_STARTED

Implement inventoryPosition=sellable-reserved+confirmedInbound; draft proposals tracked separately to avoid duplicates

**Bằng chứng:** test_run. Chứng minh kết quả của T044.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T044.S02 · 3/10 điểm · NOT_STARTED

Trigger static reorderPoint then target minus position, rounded to MOQ/pack; forecast optional evidence-only

**Bằng chứng:** test_run. Chứng minh kết quả của T044.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T044.S03 · 2/10 điểm · NOT_STARTED

UI shows why/inputs/last checked/data age and existing commitments

**Bằng chứng:** test_run. Chứng minh kết quả của T044.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T044.S04 · 2/10 điểm · NOT_STARTED

Test inbound partial, open draft, canceled PO, below MOQ, no history and available negative forbidden

**Bằng chứng:** test_run. Chứng minh kết quả của T044.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T044.S05 · 2/10 điểm · NOT_STARTED

Property tests suggestions never negative/duplicate; no unverified ML forecast

**Bằng chứng:** test_run. Chứng minh kết quả của T044.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Thiếu budget cho auto_send phải block; qty không âm và đúng packSize/MOQ.
- Chưa đủ lịch sử hiển thị static rule; không dự báo confidence giả.
- Hai workers reorder cùng SKU tạo tối đa một active proposal; reserved budget không vượt cap.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T044/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T045 — Phê duyệt đơn mua gắn phiên bản
**Giai đoạn:** P07 · **Ưu tiên:** 45 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T044, T016. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** D05, D06, D07, F04.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/23_PROCUREMENT.md`
- `docs/25_OPERATIONS_AI.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/procurement/orders/`
- `apps/api/src/modules/operations/approvals/`

### Thực hiện tuần tự

#### T045.S01 · 1/10 điểm · NOT_STARTED

Create PO and pending approval with intentHash/shop/policyVersion/amount/supplier/version/expiry

**Bằng chứng:** test_run. Chứng minh kết quả của T045.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T045.S02 · 3/10 điểm · NOT_STARTED

Reserve budget atomically when applicable; default draft_for_approval, actual cap absent blocks auto

**Bằng chứng:** test_run. Chứng minh kết quả của T045.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T045.S03 · 2/10 điểm · NOT_STARTED

UI approve/reject/detail reason and changed intent requires reapproval

**Bằng chứng:** test_run. Chứng minh kết quả của T045.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T045.S04 · 2/10 điểm · NOT_STARTED

Test same actor policy as configured, supervisor cannot impersonate human, expired approval/replayed token

**Bằng chứng:** test_run. Chứng minh kết quả của T045.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T045.S05 · 2/10 điểm · NOT_STARTED

Run concurrency budget reservation and duplicate reorder race; no live authority inferred

**Bằng chứng:** test_run. Chứng minh kết quả của T045.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Timeout send giữ unknown; không gửi đơn mới trước reconcile.
- Approval thay giá/qty/supplier cần cấp lại; không tự thanh toán từ quyền mua.
- Hai workers reorder cùng SKU tạo tối đa một active proposal; reserved budget không vượt cap.
- Expired/changed/replayed approvals fail; batch approval excludes stale rows with reasons.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T045/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T046 — Gửi đơn mua và reconcile unknown
**Giai đoạn:** P07 · **Ưu tiên:** 46 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T045. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** D05, D06, D07, H04.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/23_PROCUREMENT.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/worker/src/procurement/`
- `apps/api/src/modules/procurement/adapters/`

### Thực hiện tuần tự

#### T046.S01 · 1/10 điểm · NOT_STARTED

Implement manual send confirmation + explicit supported supplier adapter; no fabricated universal supplier API

**Bằng chứng:** test_run. Chứng minh kết quả của T046.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T046.S02 · 3/10 điểm · NOT_STARTED

Revalidate current authority/resource/policy/budget immediately before send with generation fence

**Bằng chứng:** test_run. Chứng minh kết quả của T046.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T046.S03 · 2/10 điểm · NOT_STARTED

Persist sending/unknown/sent and externalRef; uncertain result goes reconcile/manual verify

**Bằng chứng:** test_run. Chứng minh kết quả của T046.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T046.S04 · 2/10 điểm · NOT_STARTED

Test external accepted then timeout, revoked supplier, changed price and worker restart

**Bằng chứng:** test_run. Chứng minh kết quả của T046.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T046.S05 · 2/10 điểm · NOT_STARTED

No retry until evidence proves safe; test approved PO resend rejected by idempotency

**Bằng chứng:** test_run. Chứng minh kết quả của T046.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Timeout send giữ unknown; không gửi đơn mới trước reconcile.
- Approval thay giá/qty/supplier cần cấp lại; không tự thanh toán từ quyền mua.
- Hai workers reorder cùng SKU tạo tối đa một active proposal; reserved budget không vượt cap.
- Crash after external accept before local save not blindly retried; poison jobs isolated.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T046/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T047 — Nhận hàng một phần và công nợ
**Giai đoạn:** P07 · **Ưu tiên:** 47 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T046, T028. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** D01, D08, E01, E06.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/23_PROCUREMENT.md`
- `docs/24_FINANCE.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/use-cases/receive-purchase/`
- `apps/web/src/modules/procurement/receipts/`

### Thực hiện tuần tự

#### T047.S01 · 1/10 điểm · NOT_STARTED

Goods receipt accepts/rejects per PO line; remaining qty/version checked under transaction

**Bằng chứng:** test_run. Chứng minh kết quả của T047.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T047.S02 · 3/10 điểm · NOT_STARTED

Post stock movement accepted only, supplier liability or goods-received-not-invoiced by approved policy

**Bằng chứng:** test_run. Chứng minh kết quả của T047.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T047.S03 · 2/10 điểm · NOT_STARTED

UI receive quantity/reason/inspection/photo references; oversupply requires exception

**Bằng chứng:** test_run. Chứng minh kết quả của T047.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T047.S04 · 2/10 điểm · NOT_STARTED

Test partial receipts replay, invoice later vs immediate, damaged goods and wrong warehouse

**Bằng chứng:** test_run. Chứng minh kết quả của T047.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T047.S05 · 2/10 điểm · NOT_STARTED

Balance journal/AP/stock reconciliation E2E; no auto supplier payment

**Bằng chứng:** test_run. Chứng minh kết quả của T047.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Hàng đang về/hỏng không có trong available; tổng projection khớp movement ledger.
- Nhận một phần đúng tồn và công nợ; replay receipt không double stock; rejects không sellable.
- Không post journal mất cân bằng; source trùng không ghi lặp; reversed phải reason.
- Không cộng khác currency chưa FX policy; deposit không bị coi revenue sai kỳ.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T047/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T048 — UI mua hàng đủ vòng và regression
**Giai đoạn:** P07 · **Ưu tiên:** 48 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T047. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** D02, D03, D04, D05, D06, D07, D08.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/23_PROCUREMENT.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/modules/procurement/`
- `tests/e2e/procurement/`

### Thực hiện tuần tự

#### T048.S01 · 1/10 điểm · NOT_STARTED

Show supplier→suggestion→PO→approval→sent→confirmed→partial receipt timeline

**Bằng chứng:** test_run. Chứng minh kết quả của T048.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T048.S02 · 3/10 điểm · NOT_STARTED

Display cost/cap permissions, auto mode explanation and missing required configuration

**Bằng chứng:** test_run. Chứng minh kết quả của T048.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T048.S03 · 2/10 điểm · NOT_STARTED

Build mobile approval drill-down with quote diff; decline persists reason

**Bằng chứng:** test_run. Chứng minh kết quả của T048.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T048.S04 · 2/10 điểm · NOT_STARTED

Test full purchase flow with network unknown and receiving missing quantities

**Bằng chứng:** test_run. Chứng minh kết quả của T048.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T048.S05 · 2/10 điểm · NOT_STARTED

Owner demo path matches feature IDs; mark manual vs live connectors honestly

**Bằng chứng:** test_run. Chứng minh kết quả của T048.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Supplier khác shop hoặc chưa duyệt không auto-purchase; lịch sử đổi giá được giữ.
- Thiếu budget cho auto_send phải block; qty không âm và đúng packSize/MOQ.
- Chưa đủ lịch sử hiển thị static rule; không dự báo confidence giả.
- Timeout send giữ unknown; không gửi đơn mới trước reconcile.
- Approval thay giá/qty/supplier cần cấp lại; không tự thanh toán từ quyền mua.
- Hai workers reorder cùng SKU tạo tối đa một active proposal; reserved budget không vượt cap.
- Nhận một phần đúng tồn và công nợ; replay receipt không double stock; rejects không sellable.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T048/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T049 — Chi phí, policy ghi nhận và giá vốn
**Giai đoạn:** P08 · **Ưu tiên:** 49 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T035, T047. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** E02, E03, E06.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/24_FINANCE.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/finance/policies/`
- `apps/web/src/modules/finance/`

### Thực hiện tuần tự

#### T049.S01 · 1/10 điểm · NOT_STARTED

Define base currency/rounding/COGS/recognition policy versions; country unresolved blocks legal claims/live ledger activation

**Bằng chứng:** test_run. Chứng minh kết quả của T049.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T049.S02 · 3/10 điểm · NOT_STARTED

Moving weighted average receipts; dispatch snapshots cost; transit asset moves until control-transfer event

**Bằng chứng:** test_run. Chứng minh kết quả của T049.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T049.S03 · 2/10 điểm · NOT_STARTED

Expense categories actual/estimated/source linked; split ads/AI/carrier fees, never double deduct inventory purchase

**Bằng chứng:** test_run. Chứng minh kết quả của T049.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T049.S04 · 2/10 điểm · NOT_STARTED

Test partial shipments/returns, rounding residual, discounts, shipping income and estimated fee reversal

**Bằng chứng:** test_run. Chứng minh kết quả của T049.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T049.S05 · 2/10 điểm · NOT_STARTED

Accountant review packet contains worked examples + journals; not claim jurisdiction compliance

**Bằng chứng:** test_run. Chứng minh kết quả của T049.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Không lấy toàn purchase cost vào P&L; không giả định dispatch = delivered; policy chưa duyệt chặn live post.
- Phí COD đã khấu trừ không hạch toán thêm lần thứ hai; nhãn estimate không đổi thành actual.
- Không cộng khác currency chưa FX policy; deposit không bị coi revenue sai kỳ.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T049/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T050 — Nhập sao kê và đề xuất ghép tiền
**Giai đoạn:** P08 · **Ưu tiên:** 50 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T049. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** E04, E06, H04.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/24_FINANCE.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/finance/reconciliation/`
- `apps/web/src/modules/finance/reconciliation/`

### Thực hiện tuần tự

#### T050.S01 · 1/10 điểm · NOT_STARTED

BankAccount/externalTxn unique per shop/account/provider; safe import preview and row errors

**Bằng chứng:** test_run. Chứng minh kết quả của T050.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T050.S02 · 3/10 điểm · NOT_STARTED

Matching suggestions by amount/ref/time, partial/split matching with manual approval baseline

**Bằng chứng:** test_run. Chứng minh kết quả của T050.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T050.S03 · 2/10 điểm · NOT_STARTED

UI unmatched/duplicate/ambiguous queues and source document access

**Bằng chứng:** test_run. Chứng minh kết quả của T050.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T050.S04 · 2/10 điểm · NOT_STARTED

Test repeated CSV, same external id different account, duplicate image and reversed bank transaction

**Bằng chứng:** test_run. Chứng minh kết quả của T050.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T050.S05 · 2/10 điểm · NOT_STARTED

Accepted settlement creates one journal with source ref; no bank transfer endpoint

**Bằng chứng:** test_run. Chứng minh kết quả của T050.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Ảnh chuyển khoản chỉ evidence chờ kiểm; unmatched/partial/duplicate visible; offline không post.
- Không cộng khác currency chưa FX policy; deposit không bị coi revenue sai kỳ.
- Crash after external accept before local save not blindly retried; poison jobs isolated.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T050/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T051 — COD clearing và phí thực nhận
**Giai đoạn:** P08 · **Ưu tiên:** 51 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T050. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** E03, E05, E06.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/24_FINANCE.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/finance/cod/`
- `apps/web/src/modules/finance/cod/`

### Thực hiện tuần tự

#### T051.S01 · 1/10 điểm · NOT_STARTED

At approved sale recognition create carrier/receivable; distinguish customer paid carrier vs bank remittance

**Bằng chứng:** test_run. Chứng minh kết quả của T051.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T051.S02 · 3/10 điểm · NOT_STARTED

Settle gross due = net bank + actual fee + authorized adjustments; link carrier batch

**Bằng chứng:** test_run. Chứng minh kết quả của T051.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T051.S03 · 2/10 điểm · NOT_STARTED

UI shows due/unremitted/matched/disputed with drill-down to orders and bank transaction

**Bằng chứng:** test_run. Chứng minh kết quả của T051.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T051.S04 · 2/10 điểm · NOT_STARTED

Test remittance partial, fee mismatch, delivered-before-cash and duplicate carrier statement

**Bằng chứng:** test_run. Chứng minh kết quả của T051.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T051.S05 · 2/10 điểm · NOT_STARTED

Run exact journal fixture COD example; cash/profit diverge correctly

**Bằng chứng:** test_run. Chứng minh kết quả của T051.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Phí COD đã khấu trừ không hạch toán thêm lần thứ hai; nhãn estimate không đổi thành actual.
- Khách trả carrier khác shop received cash; net remittance + fees cân bằng gross clearing.
- Không cộng khác currency chưa FX policy; deposit không bị coi revenue sai kỳ.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T051/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T052 — Công nợ, khóa kỳ và sửa sai
**Giai đoạn:** P08 · **Ưu tiên:** 52 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T051. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** E06, E07.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/24_FINANCE.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/finance/periods/`
- `apps/web/src/modules/finance/periods/`

### Thực hiện tuần tự

#### T052.S01 · 1/10 điểm · NOT_STARTED

AR/AP due aging and disputed holds; deposits separately classified

**Bằng chứng:** test_run. Chứng minh kết quả của T052.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T052.S02 · 3/10 điểm · NOT_STARTED

Period close lists unresolved postings/reconciliation/policy and role approver

**Bằng chứng:** test_run. Chứng minh kết quả của T052.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T052.S03 · 2/10 điểm · NOT_STARTED

Posted immutable; corrections reversal+replacement; locked period rejects backdated mutation

**Bằng chứng:** test_run. Chứng minh kết quả của T052.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T052.S04 · 2/10 điểm · NOT_STARTED

Test close racing journal write, reopen approval, partial credit and multi-currency blocked without policy

**Bằng chứng:** test_run. Chứng minh kết quả của T052.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T052.S05 · 2/10 điểm · NOT_STARTED

Evidence required close checklist; no delete ledger to make report balance

**Bằng chứng:** test_run. Chứng minh kết quả của T052.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Không cộng khác currency chưa FX policy; deposit không bị coi revenue sai kỳ.
- Backdated post vào locked period bị chặn; export không thay dữ liệu nguồn.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T052/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T053 — Báo cáo chuẩn và giải thích của AI
**Giai đoạn:** P08 · **Ưu tiên:** 53 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T052. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** E08, G07, G08.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/24_FINANCE.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/reports/`
- `apps/web/src/modules/reports/`
- `apps/api/src/modules/bot/finance-explain/`

### Thực hiện tuần tự

#### T053.S01 · 1/10 điểm · NOT_STARTED

P&L/cashflow/AR/AP/inventory read models from journal/ledger not paginated UI

**Bằng chứng:** test_run. Chứng minh kết quả của T053.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T053.S02 · 3/10 điểm · NOT_STARTED

Drill-down report rows to journal source with period/filter/policy freshness

**Bằng chứng:** test_run. Chứng minh kết quả của T053.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T053.S03 · 2/10 điểm · NOT_STARTED

LLM gets permission-filtered report snapshot for explanation only and citations to internal records

**Bằng chứng:** test_run. Chứng minh kết quả của T053.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T053.S04 · 2/10 điểm · NOT_STARTED

Test totals across pages, tenant filtered sums, stale asOf and forbidden cost info

**Bằng chứng:** test_run. Chứng minh kết quả của T053.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T053.S05 · 2/10 điểm · NOT_STARTED

UI exports exact decimal, chart accessible data table; explanation never writes money

**Bằng chứng:** test_run. Chứng minh kết quả của T053.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- LLM không được viết ledger; tổng từ pagination UI không làm P&L; missing data shown.
- Report missing attribution separately; no auto publish ads/content.
- Không tự tăng ad spend; không ghi estimate thành actual finance expense.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T053/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T054 — Nghiệm thu bất biến tài chính
**Giai đoạn:** P08 · **Ưu tiên:** 54 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T053. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** E01, E02, E03, E04, E05, E06, E07, E08.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/24_FINANCE.md`

### Vùng được sửa / đầu ra bắt buộc
- `tests/finance/property/`
- `tests/e2e/finance/`
- `execution/milestones/M2-finance.md`

### Thực hiện tuần tự

#### T054.S01 · 1/10 điểm · NOT_STARTED

Run golden purchase→receipt→sale→dispatch→delivery→COD→bank→partial return journal fixture

**Bằng chứng:** test_run. Chứng minh kết quả của T054.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T054.S02 · 3/10 điểm · NOT_STARTED

Assert journal balances, stock valuation, AP/AR/cash independent and source uniqueness

**Bằng chứng:** test_run. Chứng minh kết quả của T054.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T054.S03 · 2/10 điểm · NOT_STARTED

Inject wrong sign/double fee/early revenue mutation; tests must fail

**Bằng chứng:** test_run. Chứng minh kết quả của T054.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T054.S04 · 2/10 điểm · NOT_STARTED

Rebuild reports from source and compare hashes/totals; locked period race test

**Bằng chứng:** test_run. Chứng minh kết quả của T054.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T054.S05 · 2/10 điểm · NOT_STARTED

Package accountant review evidence and unresolved policy inputs; not label legal books ready

**Bằng chứng:** test_run. Chứng minh kết quả của T054.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Không post journal mất cân bằng; source trùng không ghi lặp; reversed phải reason.
- Không lấy toàn purchase cost vào P&L; không giả định dispatch = delivered; policy chưa duyệt chặn live post.
- Phí COD đã khấu trừ không hạch toán thêm lần thứ hai; nhãn estimate không đổi thành actual.
- Ảnh chuyển khoản chỉ evidence chờ kiểm; unmatched/partial/duplicate visible; offline không post.
- Khách trả carrier khác shop received cash; net remittance + fees cân bằng gross clearing.
- Không cộng khác currency chưa FX policy; deposit không bị coi revenue sai kỳ.
- Backdated post vào locked period bị chặn; export không thay dữ liệu nguồn.
- LLM không được viết ledger; tổng từ pagination UI không làm P&L; missing data shown.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T054/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T055 — Chính sách quyền và hàng duyệt thống nhất
**Giai đoạn:** P09 · **Ưu tiên:** 55 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T045, T042, T015. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** F01, F04, F05, H05.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/25_OPERATIONS_AI.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/operations/policies/`
- `apps/web/src/modules/operations/approvals/`

### Thực hiện tuần tự

#### T055.S01 · 1/10 điểm · NOT_STARTED

Unify approval type purchase/discount/refund/policy changes but keep business validators in owner modules

**Bằng chứng:** test_run. Chứng minh kết quả của T055.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T055.S02 · 3/10 điểm · NOT_STARTED

Intent bound to resourceVersion and canonical body; expiry/revoke/replay check at execution

**Bằng chứng:** test_run. Chứng minh kết quả của T055.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T055.S03 · 2/10 điểm · NOT_STARTED

Four AI roles have capability allowlists and accountable person, not role labels only

**Bằng chứng:** test_run. Chứng minh kết quả của T055.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T055.S04 · 2/10 điểm · NOT_STARTED

Test two approvals on stale version, changed amount and supervisor self-escalation

**Bằng chứng:** test_run. Chứng minh kết quả của T055.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T055.S05 · 2/10 điểm · NOT_STARTED

Show approval preview impact and what cannot be undone; human authority review

**Bằng chứng:** test_run. Chứng minh kết quả của T055.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Không xem bốn cards là bốn process; bot role không có members.manage hoặc payment transfer.
- Expired/changed/replayed approvals fail; batch approval excludes stale rows with reasons.
- Supervisor không tự nâng scope, không approval của mình thành người thật.
- UI-hidden control cannot bypass backend; Telegram id mapping rechecked.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T055/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T056 — Trưởng nhóm, task và bản tin
**Giai đoạn:** P09 · **Ưu tiên:** 56 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T055, T034. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** F02, F03, F06, A05.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/21_NOTIFICATIONS.md`
- `docs/25_OPERATIONS_AI.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/operations/`
- `apps/worker/src/operations/`
- `apps/web/src/modules/operations/`

### Thực hiện tuần tự

#### T056.S01 · 1/10 điểm · NOT_STARTED

Rule-driven detectors for unclaimed/late/low-stock/finance mismatch produce unique tasks

**Bằng chứng:** test_run. Chứng minh kết quả của T056.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T056.S02 · 3/10 điểm · NOT_STARTED

Leader suggests assignments and summaries; deterministic policies decide execution

**Bằng chứng:** test_run. Chứng minh kết quả của T056.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T056.S03 · 2/10 điểm · NOT_STARTED

Digest scheduling stores timezone/calendar/recipient consent; unconfigured schedule stays disabled

**Bằng chứng:** test_run. Chứng minh kết quả của T056.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T056.S04 · 2/10 điểm · NOT_STARTED

Test lost worker lease, overdue repeats, already resolved task and quiet-hours fallback

**Bằng chứng:** test_run. Chứng minh kết quả của T056.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T056.S05 · 2/10 điểm · NOT_STARTED

UI today/blocked/requires-you panels drill down real records; no autonomous endless agent loop

**Bằng chứng:** test_run. Chứng minh kết quả của T056.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Notification ack liên kết task, không thành tracker cạnh tranh; cancelled source cancels task.
- Rule version, cooldown, dedupe; no endless self-created tasks.
- Thiếu giờ/recipient thì chưa bật; gửi lại bản tin cùng kỳ không trùng.
- Nhận việc/hủy đơn dừng nhắc; worker restart không phát trùng; không có người trực thì vào hàng ngoại lệ.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T056/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T057 — Hạn mức AI và nút dừng
**Giai đoạn:** P09 · **Ưu tiên:** 57 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T056. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** F01, F05, H02, H03.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/25_OPERATIONS_AI.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/operations/control/`
- `apps/web/src/modules/bot/team/`

### Thực hiện tuần tự

#### T057.S01 · 1/10 điểm · NOT_STARTED

Set shop/role/conversation pause generation and approved budgets; separate AI/push/purchase accounting

**Bằng chứng:** test_run. Chứng minh kết quả của T057.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T057.S02 · 3/10 điểm · NOT_STARTED

Before side effect recheck current generation and authority; internal proposal still allowed when safe

**Bằng chứng:** test_run. Chứng minh kết quả của T057.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T057.S03 · 2/10 điểm · NOT_STARTED

UI global/role pause with pending/accepted/unknown counters and consequence text

**Bằng chứng:** test_run. Chứng minh kết quả của T057.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T057.S04 · 2/10 điểm · NOT_STARTED

Test pause during model call, after Meta accept, provider fallback disallowed and cost cap race

**Bằng chứng:** test_run. Chứng minh kết quả của T057.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T057.S05 · 2/10 điểm · NOT_STARTED

Never imply stop retracts sent message/payment; run race/fencing suite

**Bằng chứng:** test_run. Chứng minh kết quả của T057.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Không xem bốn cards là bốn process; bot role không có members.manage hoặc payment transfer.
- Supervisor không tự nâng scope, không approval của mình thành người thật.
- Stop cannot unsend accepted message; UI shows accepted/unknown boundary honestly.
- No silent PII transfer to unapproved model; exhausted budget moves to safe handoff.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T057/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T058 — Dữ liệu marketing có căn cứ
**Giai đoạn:** P09 · **Ưu tiên:** 58 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T053, T042. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** G07, G08.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/reports/marketing/`
- `apps/web/src/modules/reports/marketing/`

### Thực hiện tuần tự

#### T058.S01 · 1/10 điểm · NOT_STARTED

Track defined source attribution and reasons for lost sale with evidence/unknown counts

**Bằng chứng:** test_run. Chứng minh kết quả của T058.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T058.S02 · 3/10 điểm · NOT_STARTED

Advertising spend import source dedupe and permissions; estimated attribution separate

**Bằng chứng:** test_run. Chứng minh kết quả của T058.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T058.S03 · 2/10 điểm · NOT_STARTED

UI top questions/stock issues/promo results and content suggestions read-only

**Bằng chứng:** test_run. Chứng minh kết quả của T058.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T058.S04 · 2/10 điểm · NOT_STARTED

Test no source data → unknown not zero, cost scope denied and repeated import

**Bằng chứng:** test_run. Chứng minh kết quả của T058.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T058.S05 · 2/10 điểm · NOT_STARTED

No campaign publish/budget mutation tools; report proposals for owner only

**Bằng chứng:** test_run. Chứng minh kết quả của T058.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Report missing attribution separately; no auto publish ads/content.
- Không tự tăng ad spend; không ghi estimate thành actual finance expense.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T058/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T059 — Tổng quan điều hành và readiness
**Giai đoạn:** P09 · **Ưu tiên:** 59 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T057, T058. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** F07, F08, H08, G01.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/25_OPERATIONS_AI.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/operations/readiness/`
- `apps/web/src/modules/dashboard/`

### Thực hiện tuần tự

#### T059.S01 · 1/10 điểm · NOT_STARTED

Read readiness from tested integrations/heartbeat/policy/input/evidence ages not configured=true

**Bằng chứng:** test_run. Chứng minh kết quả của T059.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T059.S02 · 3/10 điểm · NOT_STARTED

Show four role health, queues, exceptions, owner decisions and cost sources

**Bằng chứng:** test_run. Chứng minh kết quả của T059.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T059.S03 · 2/10 điểm · NOT_STARTED

Setup checklist points to missing country/currency/IdP/Meta/devices/supplier approvals

**Bằng chứng:** test_run. Chứng minh kết quả của T059.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T059.S04 · 2/10 điểm · NOT_STARTED

Test stale health data, token revoked, missing callback and inaccessible warehouse

**Bằng chứng:** test_run. Chứng minh kết quả của T059.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T059.S05 · 2/10 điểm · NOT_STARTED

Do not show 24/7 guaranteed or 100% production from mocked health; drill-down to last check

**Bằng chứng:** test_run. Chứng minh kết quả của T059.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- No green healthy when last check too old; unknown distinct down.
- Không tự nhận confidence từ model là accuracy; version linkage and sample counts visible.
- Backup exists not restore proof; missing mandatory criterion cannot greenlight launch.
- Không tự suy quốc gia kinh doanh từ location; config missing blocks only dependent live actions.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T059/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T060 — Kiểm điều phối bốn vai trò
**Giai đoạn:** P09 · **Ưu tiên:** 60 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T059. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** F01, F02, F03, F04, F05, F06, F07, F08.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/25_OPERATIONS_AI.md`

### Vùng được sửa / đầu ra bắt buộc
- `tests/e2e/operations/`
- `tests/ai/supervisor/`

### Thực hiện tuần tự

#### T060.S01 · 1/10 điểm · NOT_STARTED

Simulate customer order→stock issue→purchase approval→receipt→finance discrepancy→owner decision

**Bằng chứng:** test_run. Chứng minh kết quả của T060.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T060.S02 · 3/10 điểm · NOT_STARTED

Verify each role only authorized tools; shared engine not shared credentials/scopes

**Bằng chứng:** test_run. Chứng minh kết quả của T060.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T060.S03 · 2/10 điểm · NOT_STARTED

Inject leader prompt asking transfer/role escalate or fake human approval; deny outside policy

**Bằng chứng:** test_run. Chứng minh kết quả của T060.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T060.S04 · 2/10 điểm · NOT_STARTED

Check no cross-module direct repository writes and no duplicate tasks after replay

**Bằng chứng:** test_run. Chứng minh kết quả của T060.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T060.S05 · 2/10 điểm · NOT_STARTED

Record workflow timeline, failed scenarios and role/version configs for review

**Bằng chứng:** test_run. Chứng minh kết quả của T060.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Không xem bốn cards là bốn process; bot role không có members.manage hoặc payment transfer.
- Notification ack liên kết task, không thành tracker cạnh tranh; cancelled source cancels task.
- Rule version, cooldown, dedupe; no endless self-created tasks.
- Expired/changed/replayed approvals fail; batch approval excludes stale rows with reasons.
- Supervisor không tự nâng scope, không approval của mình thành người thật.
- Thiếu giờ/recipient thì chưa bật; gửi lại bản tin cùng kỳ không trùng.
- No green healthy when last check too old; unknown distinct down.
- Không tự nhận confidence từ model là accuracy; version linkage and sample counts visible.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T060/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T061 — Mobile, keyboard và accessibility
**Giai đoạn:** P10 · **Ưu tiên:** 61 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T060. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** A03, C01, H05.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/21_NOTIFICATIONS.md`
- `docs/22_FULFILLMENT.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/shared/ui/`
- `apps/web/src/app/`
- `tests/a11y/`

### Thực hiện tuần tự

#### T061.S01 · 1/10 điểm · NOT_STARTED

Prioritize mobile My Work/Orders/Approvals/Notifications; tables scroll locally not entire page

**Bằng chứng:** test_run. Chứng minh kết quả của T061.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T061.S02 · 3/10 điểm · NOT_STARTED

Keyboard flows, dialogs focus, labels/errors, touch targets and chart alternatives

**Bằng chứng:** test_run. Chứng minh kết quả của T061.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T061.S03 · 2/10 điểm · NOT_STARTED

Dark-only no white flash, 200% zoom, reduced motion and forced-colors respected

**Bằng chứng:** test_run. Chứng minh kết quả của T061.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T061.S04 · 2/10 điểm · NOT_STARTED

Run axe automated plus keyboard/manual mobile flows; document screen reader coverage limit

**Bằng chứng:** test_run. Chứng minh kết quả của T061.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T061.S05 · 2/10 điểm · NOT_STARTED

Do not claim full WCAG compliance from automation only; retain screenshots/browser versions

**Bằng chứng:** test_run. Chứng minh kết quả của T061.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Người không thuộc shop nhận 403/404; URL cũ không vượt quyền hiện hành.
- Không gộp packed với delivered; bộ lọc không làm mất việc chưa nhận.
- UI-hidden control cannot bypass backend; Telegram id mapping rechecked.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T061/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T062 — Migration từ v1 và giữ hợp đồng cũ
**Giai đoạn:** P10 · **Ưu tiên:** 62 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T061. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** C06, C07, E02, H04.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/22_FULFILLMENT.md`
- `docs/24_FINANCE.md`

### Vùng được sửa / đầu ra bắt buộc
- `docs/MIGRATION_EXECUTION.md`
- `apps/api/prisma/migrations/`
- `tests/migrations/`

### Thực hiện tuần tự

#### T062.S01 · 1/10 điểm · NOT_STARTED

Inventory existing consumers; v2 /api/v2 behavior diverges from legacy fulfilled/pay semantics

**Bằng chứng:** test_run. Chứng minh kết quả của T062.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T062.S02 · 3/10 điểm · NOT_STARTED

Map old completed rows only from real delivery/payment evidence; unknown not guessed delivered

**Bằng chứng:** test_run. Chứng minh kết quả của T062.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T062.S03 · 2/10 điểm · NOT_STARTED

Expand columns/events; backfill auditable source, dual-read compatibility then cutover

**Bằng chứng:** test_run. Chứng minh kết quả của T062.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T062.S04 · 2/10 điểm · NOT_STARTED

Test old/new clients and rollback preserving data; docs archive not runnable second source

**Bằng chứng:** test_run. Chứng minh kết quả của T062.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T062.S05 · 2/10 điểm · NOT_STARTED

Brownfield incompatible policy needs approved migration plan; greenfield records no legacy consumers evidence

**Bằng chứng:** test_run. Chứng minh kết quả của T062.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Event lùi/trùng không hoàn tất sai; delivered không đồng nghĩa tiền về ngân hàng.
- Returned item chưa kiểm không available; không hoàn quá paid/qty; partial return không làm hoàn toàn đơn.
- Không lấy toàn purchase cost vào P&L; không giả định dispatch = delivered; policy chưa duyệt chặn live post.
- Crash after external accept before local save not blindly retried; poison jobs isolated.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T062/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T063 — Onboarding, privacy và góp ý
**Giai đoạn:** P10 · **Ưu tiên:** 63 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T062. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** G01, G03, G05, G06.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/workspace/privacy/`
- `apps/web/src/modules/workspace/`
- `apps/web/src/modules/knowledge/`

### Thực hiện tuần tự

#### T063.S01 · 1/10 điểm · NOT_STARTED

Finalize setup fields and legal/accounting unknown gates; defaults synthetic only

**Bằng chứng:** test_run. Chứng minh kết quả của T063.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T063.S02 · 3/10 điểm · NOT_STARTED

Retention/deletion request includes chat/vector/files/search/exports and legal-hold review

**Bằng chứng:** test_run. Chứng minh kết quả của T063.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T063.S03 · 2/10 điểm · NOT_STARTED

Feedback source/provenance and review export separate from production business data

**Bằng chứng:** test_run. Chứng minh kết quả của T063.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T063.S04 · 2/10 điểm · NOT_STARTED

Test opt-out while message queued, deletion during index job and restored tombstone reapplication

**Bằng chứng:** test_run. Chứng minh kết quả của T063.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T063.S05 · 2/10 điểm · NOT_STARTED

Owner export masks secrets/PII; do not copy demo localStorage architecture into production

**Bằng chứng:** test_run. Chứng minh kết quả của T063.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Không tự suy quốc gia kinh doanh từ location; config missing blocks only dependent live actions.
- Outdated knowledge excluded from retrieval; new version does not silently rewrite past promises.
- Opt-out suppresses marketing jobs queued before change; backups restore reapplies tombstones.
- Prompt injection in document not instructions; no all-chat training by default.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T063/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T064 — Xuất báo cáo và tệp an toàn
**Giai đoạn:** P10 · **Ưu tiên:** 64 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T063. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** E08, G07, H05.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/24_FINANCE.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/api/src/modules/reports/exports/`
- `apps/web/src/modules/reports/`

### Thực hiện tuần tự

#### T064.S01 · 1/10 điểm · NOT_STARTED

Async export job with resource scope/permission snapshot and recheck before download

**Bằng chứng:** test_run. Chứng minh kết quả của T064.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T064.S02 · 3/10 điểm · NOT_STARTED

Signed URLs short expiry, content-type/filename safe; formula injection handling for CSV

**Bằng chứng:** test_run. Chứng minh kết quả của T064.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T064.S03 · 2/10 điểm · NOT_STARTED

UI pending/ready/expired/failed; download audit and redacted field labels

**Bằng chứng:** test_run. Chứng minh kết quả của T064.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T064.S04 · 2/10 điểm · NOT_STARTED

Test revoked access after job created, wrong-shop object URL and archive bombs import

**Bằng chứng:** test_run. Chứng minh kết quả của T064.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T064.S05 · 2/10 điểm · NOT_STARTED

Report source timestamps and policy refs included; file download not full data dump by default

**Bằng chứng:** test_run. Chứng minh kết quả của T064.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- LLM không được viết ledger; tổng từ pagination UI không làm P&L; missing data shown.
- Report missing attribution separately; no auto publish ads/content.
- UI-hidden control cannot bypass backend; Telegram id mapping rechecked.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T064/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T065 — Hoàn thiện states và chống hoàn tất giả
**Giai đoạn:** P10 · **Ưu tiên:** 65 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T064. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H04, H05, H07.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `apps/web/src/modules/`
- `tests/e2e/states/`

### Thực hiện tuần tự

#### T065.S01 · 1/10 điểm · NOT_STARTED

Run each route with loading/empty/error/forbidden/stale/offline/command unknown fixtures

**Bằng chứng:** test_run. Chứng minh kết quả của T065.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T065.S02 · 3/10 điểm · NOT_STARTED

All actionable controls call typed API or show clearly unavailable capability; no success-only toast

**Bằng chứng:** test_run. Chứng minh kết quả của T065.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T065.S03 · 2/10 điểm · NOT_STARTED

Review validation preserves form values, list keys stable, scope cleanup and failure recovery

**Bằng chứng:** test_run. Chứng minh kết quả của T065.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T065.S04 · 2/10 điểm · NOT_STARTED

Test error boundary module crash not whole shell, retry only safe queries and incomplete command reconcile

**Bằng chứng:** test_run. Chứng minh kết quả của T065.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T065.S05 · 2/10 điểm · NOT_STARTED

Generate route×states×permissions coverage from test results, not hand-ticked checklist

**Bằng chứng:** test_run. Chứng minh kết quả của T065.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Crash after external accept before local save not blindly retried; poison jobs isolated.
- UI-hidden control cannot bypass backend; Telegram id mapping rechecked.
- Demo pass not live proof; no real customer/keys/money in synthetic tests.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T065/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T066 — Review trọn 64 chức năng và demo parity
**Giai đoạn:** P10 · **Ưu tiên:** 66 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T065, T048, T054. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** A01, B01, C01, D01, E01, F01, G01, H01.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/07_AI_AND_CHANNELS.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/21_NOTIFICATIONS.md`
- `docs/22_FULFILLMENT.md`
- `docs/23_PROCUREMENT.md`
- `docs/24_FINANCE.md`
- `docs/25_OPERATIONS_AI.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `execution/coverage.json`
- `tests/e2e/full-workflows/`
- `docs/17_TRACEABILITY.md`

### Thực hiện tuần tự

#### T066.S01 · 1/10 điểm · NOT_STARTED

Map all A01–H08 to source files/routes/operations and executed tests or explicit blockers

**Bằng chứng:** test_run. Chứng minh kết quả của T066.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T066.S02 · 3/10 điểm · NOT_STARTED

Compare approved prototype interaction with product; do not port simulated finance/domain JS

**Bằng chứng:** test_run. Chứng minh kết quả của T066.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T066.S03 · 2/10 điểm · NOT_STARTED

Review authority defaults, dark-only and all old core modules preserved

**Bằng chứng:** test_run. Chứng minh kết quả của T066.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T066.S04 · 2/10 điểm · NOT_STARTED

Run full local integrated suite and verify zero placeholder controls for enabled capabilities

**Bằng chứng:** test_run. Chứng minh kết quả của T066.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T066.S05 · 2/10 điểm · NOT_STARTED

Owner review package M3 ready-for-staging, not production-ready; incomplete feature cannot counted absent

**Bằng chứng:** test_run. Chứng minh kết quả của T066.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Từ chối quyền không ghi connected; thiết bị đã thu hồi không nhận lại; không yêu cầu key trong trình duyệt.
- Thiếu chính sách giao/đổi trả thì bot hỏi hoặc handoff, không bịa.
- Không gộp packed với delivered; bộ lọc không làm mất việc chưa nhận.
- Hàng đang về/hỏng không có trong available; tổng projection khớp movement ledger.
- Không post journal mất cân bằng; source trùng không ghi lặp; reversed phải reason.
- Không xem bốn cards là bốn process; bot role không có members.manage hoặc payment transfer.
- Không tự suy quốc gia kinh doanh từ location; config missing blocks only dependent live actions.
- Close browser and restart worker preserves due work; queue loss rebuild from DB.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T066/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T067 — Môi trường staging và hạ tầng kế hoạch
**Giai đoạn:** P11 · **Ưu tiên:** 67 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T066. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H01, H08.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `infra/`
- `docs/DEPLOYMENT_ENVIRONMENTS.md`
- `execution/owner-inputs.json`

### Thực hiện tuần tự

#### T067.S01 · 1/10 điểm · NOT_STARTED

Document chosen hosting region/budget/owner, secret store, managed Postgres backups and Redis persistence

**Bằng chứng:** environment_verification. Chứng minh kết quả của T067.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T067.S02 · 3/10 điểm · NOT_STARTED

Compose dev stack isolated; production topology web static/API/worker/object storage, no K8s by default

**Bằng chứng:** environment_verification. Chứng minh kết quả của T067.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T067.S03 · 2/10 điểm · NOT_STARTED

Prepare CI image/IaC plan, network/TLS/domain and secret variable names with no values

**Bằng chứng:** environment_verification. Chứng minh kết quả của T067.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T067.S04 · 2/10 điểm · NOT_STARTED

Validate configuration locally; real create resources requires access+cost authorization

**Bằng chứng:** environment_verification. Chứng minh kết quả của T067.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T067.S05 · 2/10 điểm · NOT_STARTED

Record actual granted environment and provision results or BLOCKED; do not infer Vercel team from prior chat

**Bằng chứng:** environment_verification. Chứng minh kết quả của T067.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

### Kiểm tra nghiệm thu của đầu việc
- Close browser and restart worker preserves due work; queue loss rebuild from DB.
- Backup exists not restore proof; missing mandatory criterion cannot greenlight launch.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T067/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T068 — OIDC và phiên staging thật
**Giai đoạn:** P11 · **Ưu tiên:** 68 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T067, T014. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H05, G01.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `infra/staging/`
- `tests/staging/auth/`
- `execution/evidence/`

### Thực hiện tuần tự

#### T068.S01 · 1/10 điểm · NOT_STARTED

Resolve actual IdP tenant/client/redirect URLs from approved account not sample config

**Bằng chứng:** environment_verification. Chứng minh kết quả của T068.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T068.S02 · 3/10 điểm · NOT_STARTED

Configure authorization grant/session cookies/logout/step-up secret references on staging

**Bằng chứng:** environment_verification. Chứng minh kết quả của T068.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T068.S03 · 2/10 điểm · NOT_STARTED

Test real browser login/logout/revoke and owner/staff scopes

**Bằng chứng:** environment_verification. Chứng minh kết quả của T068.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T068.S04 · 2/10 điểm · NOT_STARTED

Check TLS/proxy headers/CSRF/CSP redirect and no tokens in URL/logs

**Bằng chứng:** environment_verification. Chứng minh kết quả của T068.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T068.S05 · 2/10 điểm · NOT_STARTED

Record provider/env/revision and real user permission evidence; missing credentials marks BLOCKED not mock PASS

**Bằng chứng:** environment_verification. Chứng minh kết quả của T068.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

### Kiểm tra nghiệm thu của đầu việc
- UI-hidden control cannot bypass backend; Telegram id mapping rechecked.
- Không tự suy quốc gia kinh doanh từ location; config missing blocks only dependent live actions.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T068/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T069 — Meta và AI provider staging thật
**Giai đoạn:** P11 · **Ưu tiên:** 69 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T068, T042. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** B02, B04, B07, B08, H03.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/07_AI_AND_CHANNELS.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `tests/staging/meta-ai/`
- `execution/evidence/`
- `execution/owner-inputs.json`

### Thực hiện tuần tự

#### T069.S01 · 1/10 điểm · NOT_STARTED

Verify current Meta app/page scopes/review/API version and provider capability/pricing/data permissions

**Bằng chứng:** environment_verification. Chứng minh kết quả của T069.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T069.S02 · 3/10 điểm · NOT_STARTED

Receive/send with authorized test users only; register webhooks via permitted account action

**Bằng chứng:** environment_verification. Chứng minh kết quả của T069.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T069.S03 · 2/10 điểm · NOT_STARTED

Run approved dataset against actual provider with cost cap and redacted payloads

**Bằng chứng:** environment_verification. Chứng minh kết quả của T069.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T069.S04 · 2/10 điểm · NOT_STARTED

Test token revoked/outside window/rate-limit/handoff at send boundary on safe staging conditions

**Bằng chứng:** environment_verification. Chứng minh kết quả của T069.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T069.S05 · 2/10 điểm · NOT_STARTED

Publish live capability matrix with unavailable scopes disabled; no real customer outreach

**Bằng chứng:** environment_verification. Chứng minh kết quả của T069.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

### Kiểm tra nghiệm thu của đầu việc
- Tồn/giá thay sau retrieval được kiểm lại tại confirm; không dùng vector cache làm giá giao dịch.
- Prompt nói đã đồng ý không thay bằng chứng xác nhận; không tự tăng hạn mức.
- Takeover xảy ra khi LLM đang chạy: draft cũ không được send; release bot có audit.
- Ảnh chuyển tiền không xác nhận payment; comment không tự cấp phép private message; không hỗ trợ thì UI nêu rõ.
- No silent PII transfer to unapproved model; exhausted budget moves to safe handoff.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T069/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T070 — Web Push/Telegram trên điện thoại thật
**Giai đoạn:** P11 · **Ưu tiên:** 70 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T068, T034. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** A01, A03, A04, A05, A06, A07, A08.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/21_NOTIFICATIONS.md`

### Vùng được sửa / đầu ra bắt buộc
- `tests/staging/notifications/`
- `execution/evidence/device-tests/`

### Thực hiện tuần tự

#### T070.S01 · 1/10 điểm · NOT_STARTED

Connect approved owner phone and Telegram pairing using current APIs, HTTPS and consent

**Bằng chứng:** device_or_user_verification. Chứng minh kết quả của T070.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T070.S02 · 3/10 điểm · NOT_STARTED

Send test order notification with app/tab closed; iOS installed-home-screen and Android/browser recorded separately

**Bằng chứng:** device_or_user_verification. Chứng minh kết quả của T070.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T070.S03 · 2/10 điểm · NOT_STARTED

Open deep-link, authenticate, claim task; confirm device receive only when actually observable

**Bằng chứng:** device_or_user_verification. Chứng minh kết quả của T070.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T070.S04 · 2/10 điểm · NOT_STARTED

Test deny/revoke/quiet-hours/offline and fallback once; no callback opens counted as ack

**Bằng chứng:** device_or_user_verification. Chứng minh kết quả của T070.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T070.S05 · 2/10 điểm · NOT_STARTED

Evidence per actual device/browser/OS; screenshots demo do not pass this task; no delivery guarantee

**Bằng chứng:** device_or_user_verification. Chứng minh kết quả của T070.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

### Kiểm tra nghiệm thu của đầu việc
- Từ chối quyền không ghi connected; thiết bị đã thu hồi không nhận lại; không yêu cầu key trong trình duyệt.
- Người không thuộc shop nhận 403/404; URL cũ không vượt quyền hiện hành.
- Hai nhân viên đồng thời nhận: một thắng, một thấy người đã nhận; delivery receipt không đồng nghĩa nhận việc.
- Nhận việc/hủy đơn dừng nhắc; worker restart không phát trùng; không có người trực thì vào hàng ngoại lệ.
- Không tự bỏ qua giờ yên lặng; bộ nhớ cấu hình mẫu không thành chính sách live.
- Timeout không gắn failed; không có callback mở thì giữ unknown, không tạo tỷ lệ đọc giả.
- Callback replay, membership revoked, sai shop hoặc TTL hết đều bị chặn; tắt SMS/voice mặc định.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T070/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T071 — Carrier/supplier/statement staging connectors
**Giai đoạn:** P11 · **Ưu tiên:** 71 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T068, T047. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** C05, C06, D05, D08, E04, E05.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/22_FULFILLMENT.md`
- `docs/23_PROCUREMENT.md`
- `docs/24_FINANCE.md`

### Vùng được sửa / đầu ra bắt buộc
- `tests/staging/commerce/`
- `execution/owner-inputs.json`
- `execution/evidence/`

### Thực hiện tuần tự

#### T071.S01 · 1/10 điểm · NOT_STARTED

Select actual region supported carrier/supplier send path/bank import format and permissions

**Bằng chứng:** environment_verification. Chứng minh kết quả của T071.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T071.S02 · 3/10 điểm · NOT_STARTED

Run sandbox label/PO or expressly authorized test counterpart, no purchase/payment without permission

**Bằng chứng:** environment_verification. Chứng minh kết quả của T071.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T071.S03 · 2/10 điểm · NOT_STARTED

Verify status callbacks/signatures/external id dedupe and reconciliation unknown response

**Bằng chứng:** environment_verification. Chứng minh kết quả của T071.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T071.S04 · 2/10 điểm · NOT_STARTED

Test COD remittance fixture through actual import parser, manual adapter clearly marked

**Bằng chứng:** environment_verification. Chứng minh kết quả của T071.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T071.S05 · 2/10 điểm · NOT_STARTED

Record manual-supported vs live-adapter-supported capabilities; no fabricated supplier API

**Bằng chứng:** environment_verification. Chứng minh kết quả của T071.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

### Kiểm tra nghiệm thu của đầu việc
- Timeout create label phải reconcile; bàn giao lần hai không trừ tồn lần hai.
- Event lùi/trùng không hoàn tất sai; delivered không đồng nghĩa tiền về ngân hàng.
- Timeout send giữ unknown; không gửi đơn mới trước reconcile.
- Nhận một phần đúng tồn và công nợ; replay receipt không double stock; rejects không sellable.
- Ảnh chuyển khoản chỉ evidence chờ kiểm; unmatched/partial/duplicate visible; offline không post.
- Khách trả carrier khác shop received cash; net remittance + fees cân bằng gross clearing.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T071/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T072 — Smoke tích hợp thật xuyên hệ thống
**Giai đoạn:** P11 · **Ưu tiên:** 72 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T069, T070, T071. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** A02, B04, C06, D08, E05, F02, H04.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/07_AI_AND_CHANNELS.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/21_NOTIFICATIONS.md`
- `docs/22_FULFILLMENT.md`
- `docs/23_PROCUREMENT.md`
- `docs/24_FINANCE.md`
- `docs/25_OPERATIONS_AI.md`

### Vùng được sửa / đầu ra bắt buộc
- `tests/staging/full-workflows/`
- `execution/milestones/M4.md`

### Thực hiện tuần tự

#### T072.S01 · 1/10 điểm · NOT_STARTED

Use one approved synthetic customer flow Messenger→AI→order→phone ack→fulfillment sandbox

**Bằng chứng:** environment_verification. Chứng minh kết quả của T072.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T072.S02 · 3/10 điểm · NOT_STARTED

Run procurement approved test path and receipt/accounting reconciliation without real money transfer

**Bằng chứng:** environment_verification. Chứng minh kết quả của T072.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T072.S03 · 2/10 điểm · NOT_STARTED

Cross-check database/outbox/audit/provider observations under same correlation IDs

**Bằng chứng:** environment_verification. Chứng minh kết quả của T072.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T072.S04 · 2/10 điểm · NOT_STARTED

Test safe restart and duplicate callback scenarios on staging; no unknown effects silently retry

**Bằng chứng:** environment_verification. Chứng minh kết quả của T072.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T072.S05 · 2/10 điểm · NOT_STARTED

Produce integrated evidence revision/env and stop blockers before release readiness

**Bằng chứng:** environment_verification. Chứng minh kết quả của T072.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

### Kiểm tra nghiệm thu của đầu việc
- Đơn nháp, reservation fail hoặc transaction rollback không phát lệnh chuẩn bị; event trùng chỉ một việc.
- Prompt nói đã đồng ý không thay bằng chứng xác nhận; không tự tăng hạn mức.
- Event lùi/trùng không hoàn tất sai; delivered không đồng nghĩa tiền về ngân hàng.
- Nhận một phần đúng tồn và công nợ; replay receipt không double stock; rejects không sellable.
- Khách trả carrier khác shop received cash; net remittance + fees cân bằng gross clearing.
- Notification ack liên kết task, không thành tracker cạnh tranh; cancelled source cancels task.
- Crash after external accept before local save not blindly retried; poison jobs isolated.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T072/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T073 — Bảo mật và dependency supply chain
**Giai đoạn:** P12 · **Ưu tiên:** 73 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T066. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H05, H06, H07.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `tests/security/`
- `infra/ci/`
- `execution/evidence/security/`

### Thực hiện tuần tự

#### T073.S01 · 1/10 điểm · NOT_STARTED

Run ASVS-applicable control map auth/tenant/XSS/CSRF/SSRF/file upload/secrets/prompts; no blanket certificate

**Bằng chứng:** test_run. Chứng minh kết quả của T073.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T073.S02 · 3/10 điểm · NOT_STARTED

Scan lockfile/images/SBOM and validate licensing/known issues at actual release version

**Bằng chứng:** test_run. Chứng minh kết quả của T073.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T073.S03 · 2/10 điểm · NOT_STARTED

Test role revocation/Telegram callback/object storage/SSE/export and trust boundary adversarial inputs

**Bằng chứng:** test_run. Chứng minh kết quả của T073.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T073.S04 · 2/10 điểm · NOT_STARTED

Triage real findings with severity, mitigations, tests and explicit exception authority

**Bằng chứng:** test_run. Chứng minh kết quả của T073.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T073.S05 · 2/10 điểm · NOT_STARTED

Fail release for unresolved mandatory control; independent review only if actually performed

**Bằng chứng:** test_run. Chứng minh kết quả của T073.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- UI-hidden control cannot bypass backend; Telegram id mapping rechecked.
- Changed data must not rewrite audit reason; no secrets in logs/exports/error URLs.
- Demo pass not live proof; no real customer/keys/money in synthetic tests.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T073/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T074 — Tải và hiệu năng theo workload duyệt
**Giai đoạn:** P12 · **Ưu tiên:** 74 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T073. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H01, H03, H08.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `tests/load/`
- `apps/web/performance/`
- `execution/owner-inputs.json`

### Thực hiện tuần tự

#### T074.S01 · 1/10 điểm · NOT_STARTED

Get target shops/concurrent inbox/users/SKU/events and latency budget; pending values are unapproved tests

**Bằng chứng:** test_run. Chứng minh kết quả của T074.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T074.S02 · 3/10 điểm · NOT_STARTED

Build synthetic workload with realistic mix/sizes, no production PII or cost runaway LLM calls

**Bằng chứng:** test_run. Chứng minh kết quả của T074.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T074.S03 · 2/10 điểm · NOT_STARTED

Measure API p95/queue lag/browser UX/DB locks/provider quotas and saturation

**Bằng chứng:** test_run. Chứng minh kết quả của T074.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T074.S04 · 2/10 điểm · NOT_STARTED

Test burst/retry backpressure/poison message/noisy tenant with per-tenant caps

**Bằng chứng:** test_run. Chứng minh kết quả của T074.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T074.S05 · 2/10 điểm · NOT_STARTED

Report observed hardware and load, no universal TPS claim; unmet target creates prioritized task

**Bằng chứng:** test_run. Chứng minh kết quả của T074.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Close browser and restart worker preserves due work; queue loss rebuild from DB.
- No silent PII transfer to unapproved model; exhausted budget moves to safe handoff.
- Backup exists not restore proof; missing mandatory criterion cannot greenlight launch.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T074/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T075 — Backup, restore và data lifecycle
**Giai đoạn:** P12 · **Ưu tiên:** 75 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T067. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H08, G05.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `infra/backup/`
- `tests/recovery/`
- `execution/evidence/restore/`

### Thực hiện tuần tự

#### T075.S01 · 1/10 điểm · NOT_STARTED

Define owner-approved RPO/RTO and storage retention/legal hold before activating real policies

**Bằng chứng:** environment_verification. Chứng minh kết quả của T075.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T075.S02 · 3/10 điểm · NOT_STARTED

Configure database PITR/backups/object consistency/key access on granted environment

**Bằng chứng:** environment_verification. Chứng minh kết quả của T075.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T075.S03 · 2/10 điểm · NOT_STARTED

Restore to isolated database and verify journals/stock/commands/tenant access plus deletion tombstones

**Bằng chứng:** environment_verification. Chứng minh kết quả của T075.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T075.S04 · 2/10 điểm · NOT_STARTED

Simulate missing encryption key/corrupt restore and permission failure with safe copies

**Bằng chứng:** environment_verification. Chứng minh kết quả của T075.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T075.S05 · 2/10 điểm · NOT_STARTED

Measure actual recovery point/time; backup success alone does not complete checkpoint

**Bằng chứng:** environment_verification. Chứng minh kết quả của T075.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

### Kiểm tra nghiệm thu của đầu việc
- Backup exists not restore proof; missing mandatory criterion cannot greenlight launch.
- Opt-out suppresses marketing jobs queued before change; backups restore reapplies tombstones.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T075/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T076 — Fault injection và replay toàn chuỗi
**Giai đoạn:** P12 · **Ưu tiên:** 76 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T074, T067. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H01, H02, H03, H04.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `tests/recovery/`
- `apps/worker/src/`
- `execution/evidence/faults/`

### Thực hiện tuần tự

#### T076.S01 · 1/10 điểm · NOT_STARTED

Inject provider accept then timeout, worker kill, DB outage, queue loss, stale lease and network partition in staging-safe copies

**Bằng chứng:** test_run. Chứng minh kết quả của T076.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T076.S02 · 3/10 điểm · NOT_STARTED

Verify reconciliation and fencing prevent duplicate orders/PO/payment entries/notifications

**Bằng chứng:** test_run. Chứng minh kết quả của T076.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T076.S03 · 2/10 điểm · NOT_STARTED

Rebuild lost queue work from DB outbox/commands without guessing success

**Bằng chứng:** test_run. Chứng minh kết quả của T076.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T076.S04 · 2/10 điểm · NOT_STARTED

Check graceful shutdown/readiness/alerts and no leaked secrets in error traces

**Bằng chứng:** test_run. Chứng minh kết quả của T076.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T076.S05 · 2/10 điểm · NOT_STARTED

Record commands/state diffs and residual risks; fault tests never target live shop

**Bằng chứng:** test_run. Chứng minh kết quả của T076.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Close browser and restart worker preserves due work; queue loss rebuild from DB.
- Stop cannot unsend accepted message; UI shows accepted/unknown boundary honestly.
- No silent PII transfer to unapproved model; exhausted budget moves to safe handoff.
- Crash after external accept before local save not blindly retried; poison jobs isolated.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T076/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T077 — CI/CD, migration và rollback rehearsal
**Giai đoạn:** P12 · **Ưu tiên:** 77 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T073, T075, T076. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H07, H08.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `.github/workflows/`
- `infra/deploy/`
- `tests/release/`

### Thực hiện tuần tự

#### T077.S01 · 1/10 điểm · NOT_STARTED

Pipeline pins tools/images, runs mandatory suites and forbids empty/ignored failure jobs

**Bằng chứng:** test_run. Chứng minh kết quả của T077.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T077.S02 · 3/10 điểm · NOT_STARTED

Build artifact once, promote same digest; config/contract/client compatible N/N-1 per migration plan

**Bằng chứng:** test_run. Chứng minh kết quả của T077.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T077.S03 · 2/10 điểm · NOT_STARTED

Rehearse expand/backfill/cutover and rollback app/config without dropping new data

**Bằng chứng:** test_run. Chứng minh kết quả của T077.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T077.S04 · 2/10 điểm · NOT_STARTED

Verify branch required checks if permissions allow; missing policy control explicitly unresolved

**Bằng chứng:** test_run. Chứng minh kết quả của T077.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T077.S05 · 2/10 điểm · NOT_STARTED

Store rehearsal evidence and environment approvals; do not deploy production merely pipeline green

**Bằng chứng:** test_run. Chứng minh kết quả của T077.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Demo pass not live proof; no real customer/keys/money in synthetic tests.
- Backup exists not restore proof; missing mandatory criterion cannot greenlight launch.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T077/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T078 — Regression trên artifact phát hành
**Giai đoạn:** P12 · **Ưu tiên:** 78 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T077, T072. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H05, H07, H08.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `tests/release/`
- `execution/milestones/M5.md`

### Thực hiện tuần tự

#### T078.S01 · 1/10 điểm · NOT_STARTED

Use actual built digest/config/schema version on representative staging, no rebuild drift

**Bằng chứng:** test_run. Chứng minh kết quả của T078.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T078.S02 · 3/10 điểm · NOT_STARTED

Run full sales/notification/purchase/finance/privacy/agent permissions end-to-end

**Bằng chứng:** test_run. Chứng minh kết quả của T078.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T078.S03 · 2/10 điểm · NOT_STARTED

Recheck critical scenarios after merge/integration and all source evidence hashes

**Bằng chứng:** test_run. Chứng minh kết quả của T078.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T078.S04 · 2/10 điểm · NOT_STARTED

Verify route/operation/state/feature coverage and outstanding issue severity

**Bằng chứng:** test_run. Chứng minh kết quả của T078.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T078.S05 · 2/10 điểm · NOT_STARTED

Produce release-candidate evidence bundle; mark no blanket enterprise claim without criteria

**Bằng chứng:** test_run. Chứng minh kết quả của T078.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- UI-hidden control cannot bypass backend; Telegram id mapping rechecked.
- Demo pass not live proof; no real customer/keys/money in synthetic tests.
- Backup exists not restore proof; missing mandatory criterion cannot greenlight launch.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T078/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T079 — Chốt nghiệp vụ và chính sách quốc gia
**Giai đoạn:** P13 · **Ưu tiên:** 79 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T078. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** E02, E07, G01, G05, H08.

### Đọc trước khi sửa
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/24_FINANCE.md`

### Vùng được sửa / đầu ra bắt buộc
- `execution/owner-inputs.json`
- `docs/OPERATING_POLICIES.md`

### Thực hiện tuần tự

#### T079.S01 · 1/10 điểm · NOT_STARTED

Owner supplies actual country/base currency/hours/people/supplier budgets and service terms

**Bằng chứng:** artifact_review. Chứng minh kết quả của T079.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T079.S02 · 3/10 điểm · NOT_STARTED

Qualified accounting/legal review where applicable confirms recognition/tax/retention scope; do not invent signoff

**Bằng chứng:** artifact_review. Chứng minh kết quả của T079.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T079.S03 · 2/10 điểm · NOT_STARTED

Validate live settings satisfy constraints; missing optional carrier remains manual explicitly

**Bằng chứng:** artifact_review. Chứng minh kết quả của T079.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T079.S04 · 2/10 điểm · NOT_STARTED

Freeze policy versions and record approver authority/time/resource hashes

**Bằng chứng:** artifact_review. Chứng minh kết quả của T079.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T079.S05 · 2/10 điểm · NOT_STARTED

Release blockers remain BLOCKED until real approval; % cannot bypass this gate

**Bằng chứng:** artifact_review. Chứng minh kết quả của T079.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Không lấy toàn purchase cost vào P&L; không giả định dispatch = delivered; policy chưa duyệt chặn live post.
- Backdated post vào locked period bị chặn; export không thay dữ liệu nguồn.
- Không tự suy quốc gia kinh doanh từ location; config missing blocks only dependent live actions.
- Opt-out suppresses marketing jobs queued before change; backups restore reapplies tombstones.
- Backup exists not restore proof; missing mandatory criterion cannot greenlight launch.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T079/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T080 — UAT của chủ shop và thiết bị
**Giai đoạn:** P13 · **Ưu tiên:** 80 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T079. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** A04, C01, D05, E08, F06.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/21_NOTIFICATIONS.md`
- `docs/22_FULFILLMENT.md`
- `docs/23_PROCUREMENT.md`
- `docs/24_FINANCE.md`
- `docs/25_OPERATIONS_AI.md`
- `design/decision.json`
- `docs/03_DESIGN_SYSTEM.md`
- `docs/19_DARK_ONLY_POLICY.md`
- `design/IMPLEMENTATION_NOTES.md`

### Vùng được sửa / đầu ra bắt buộc
- `execution/evidence/uat/`
- `execution/acceptance-register.json`

### Thực hiện tuần tự

#### T080.S01 · 1/10 điểm · NOT_STARTED

Owner executes order notification→claim→prepare and verifies useful instructions on actual phone

**Bằng chứng:** device_or_user_verification. Chứng minh kết quả của T080.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T080.S02 · 3/10 điểm · NOT_STARTED

Review purchase draft→approve and supplier receive; no real expense without explicit permission

**Bằng chứng:** device_or_user_verification. Chứng minh kết quả của T080.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T080.S03 · 2/10 điểm · NOT_STARTED

Review P&L/COD example vs actual adopted policy with source drilldown

**Bằng chứng:** device_or_user_verification. Chứng minh kết quả của T080.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T080.S04 · 2/10 điểm · NOT_STARTED

Capture issues/priorities, fix and rerun affected evidence instead of signing unseen screens

**Bằng chứng:** device_or_user_verification. Chứng minh kết quả của T080.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T080.S05 · 2/10 điểm · NOT_STARTED

Record authentic user acceptance; AI cannot self-sign owner UAT

**Bằng chứng:** device_or_user_verification. Chứng minh kết quả của T080.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

### Kiểm tra nghiệm thu của đầu việc
- Hai nhân viên đồng thời nhận: một thắng, một thấy người đã nhận; delivery receipt không đồng nghĩa nhận việc.
- Không gộp packed với delivered; bộ lọc không làm mất việc chưa nhận.
- Timeout send giữ unknown; không gửi đơn mới trước reconcile.
- LLM không được viết ledger; tổng từ pagination UI không làm P&L; missing data shown.
- Thiếu giờ/recipient thì chưa bật; gửi lại bản tin cùng kỳ không trùng.
- Áp dụng Graphite Gold theo ADR-VIS-021 từ design/tokens.json; không palette khác, HEX tự phát, light/system hoặc theme selector. Kiểm những trạng thái/UI trong phạm vi task bằng source thật; giữ ngoại lệ accessibility và ảnh hàng.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T080/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T081 — Cổng cho phép phát hành
**Giai đoạn:** P13 · **Ưu tiên:** 81 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T080. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H08.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `execution/RELEASE_APPROVAL.md`
- `execution/acceptance-register.json`

### Thực hiện tuần tự

#### T081.S01 · 1/10 điểm · NOT_STARTED

Review mandatory tasks/checkpoints/evidence/current revision and unresolved issues

**Bằng chứng:** artifact_review. Chứng minh kết quả của T081.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T081.S02 · 3/10 điểm · NOT_STARTED

Verify support owner/escalation contacts/runbooks/backup/monitoring/budgets are actual

**Bằng chứng:** artifact_review. Chứng minh kết quả của T081.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T081.S03 · 2/10 điểm · NOT_STARTED

Show residual risk and scope, deployment target and rollback plan to authorized approver

**Bằng chứng:** artifact_review. Chứng minh kết quả của T081.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T081.S04 · 2/10 điểm · NOT_STARTED

Get explicit production deployment permission; default remains not authorized

**Bằng chứng:** artifact_review. Chứng minh kết quả của T081.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T081.S05 · 2/10 điểm · NOT_STARTED

Record approval binding artifact digest/environment/policy; no approval inferred from this design request

**Bằng chứng:** artifact_review. Chứng minh kết quả của T081.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Backup exists not restore proof; missing mandatory criterion cannot greenlight launch.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T081/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T082 — Triển khai giới hạn có giám sát
**Giai đoạn:** P13 · **Ưu tiên:** 82 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T081. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H01, H08.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `infra/deploy/`
- `execution/evidence/production/`

### Thực hiện tuần tự

#### T082.S01 · 1/10 điểm · NOT_STARTED

Execute permitted release command for approved digest/config only, capture change ID

**Bằng chứng:** environment_verification. Chứng minh kết quả của T082.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T082.S02 · 3/10 điểm · NOT_STARTED

Begin limited approved shop scope with auto-purchase/real money transfer still disabled unless separately authorized

**Bằng chứng:** environment_verification. Chứng minh kết quả của T082.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T082.S03 · 2/10 điểm · NOT_STARTED

Run health/auth/queue/notification smoke with safe test data and agreed on-call owner

**Bằng chứng:** environment_verification. Chứng minh kết quả của T082.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T082.S04 · 2/10 điểm · NOT_STARTED

Monitor actual errors/latency/ledger invariants and rollback triggers during release checks

**Bằng chứng:** environment_verification. Chứng minh kết quả của T082.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T082.S05 · 2/10 điểm · NOT_STARTED

If blocked or failed pause/rollback within authority and record true status, not claim launched

**Bằng chứng:** environment_verification. Chứng minh kết quả của T082.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

### Kiểm tra nghiệm thu của đầu việc
- Close browser and restart worker preserves due work; queue loss rebuild from DB.
- Backup exists not restore proof; missing mandatory criterion cannot greenlight launch.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T082/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T083 — Kiểm sau phát hành và phục hồi
**Giai đoạn:** P13 · **Ưu tiên:** 83 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T082. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** H02, H04, H08.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`

### Vùng được sửa / đầu ra bắt buộc
- `execution/evidence/production/`
- `docs/RUNBOOKS.md`

### Thực hiện tuần tự

#### T083.S01 · 1/10 điểm · NOT_STARTED

Verify production event processing/device config and effective permissions against released digest

**Bằng chứng:** environment_verification. Chứng minh kết quả của T083.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T083.S02 · 3/10 điểm · NOT_STARTED

Review exception/unknown command queues, policy scopes and cost limits for live shop

**Bằng chứng:** environment_verification. Chứng minh kết quả của T083.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T083.S03 · 2/10 điểm · NOT_STARTED

Check backups/reconciliation monitoring and run safe recovery check within granted scope

**Bằng chứng:** environment_verification. Chứng minh kết quả của T083.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T083.S04 · 2/10 điểm · NOT_STARTED

Record actual observation window and gaps; do not promise unattended monitoring beyond tools/session

**Bằng chứng:** environment_verification. Chứng minh kết quả của T083.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

#### T083.S05 · 2/10 điểm · NOT_STARTED

Create follow-up tickets only for observed issues and assign actual responsible owner

**Bằng chứng:** environment_verification. Chứng minh kết quả của T083.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Cần người/thiết bị/môi trường thật, không thay bằng mô phỏng.

### Kiểm tra nghiệm thu của đầu việc
- Stop cannot unsend accepted message; UI shows accepted/unknown boundary honestly.
- Crash after external accept before local save not blindly retried; poison jobs isolated.
- Backup exists not restore proof; missing mandatory criterion cannot greenlight launch.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T083/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

## T084 — Bàn giao vận hành và lộ trình bảo trì
**Giai đoạn:** P13 · **Ưu tiên:** 84 · **Trạng thái:** NOT_STARTED · **Đã xác minh:** 0%

**Phụ thuộc phải DONE:** T083. **Chủ nhiệm:** Chưa nhận việc.

**Yêu cầu:** F06, H06, H08.

### Đọc trước khi sửa
- `docs/02_ARCHITECTURE.md`
- `docs/08_SECURITY_TENANCY_RBAC.md`
- `docs/18_CODING_STANDARDS.md`
- `docs/25_OPERATIONS_AI.md`

### Vùng được sửa / đầu ra bắt buộc
- `docs/OPERATIONS_HANDOVER.md`
- `execution/SESSION_HANDOFF.md`
- `execution/acceptance-register.json`

### Thực hiện tuần tự

#### T084.S01 · 1/10 điểm · NOT_STARTED

Deliver run/start/stop/restore/rotate provider keys/reconcile unknown/close period SOPs

**Bằng chứng:** artifact_review. Chứng minh kết quả của T084.S01 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T084.S02 · 3/10 điểm · NOT_STARTED

Owner-facing quick guide phone notifications, approvals, stock receiving and cash/profit distinction

**Bằng chứng:** artifact_review. Chứng minh kết quả của T084.S02 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T084.S03 · 2/10 điểm · NOT_STARTED

Freeze exact source/digest/docs/contracts and verified evidence; update progress report from state

**Bằng chứng:** artifact_review. Chứng minh kết quả của T084.S03 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T084.S04 · 2/10 điểm · NOT_STARTED

Check all enabled capabilities complete and unsupported functions visibly disabled; 100% only all mandatory evidence

**Bằng chứng:** artifact_review. Chứng minh kết quả của T084.S04 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

#### T084.S05 · 2/10 điểm · NOT_STARTED

Handoff current state, authority limits, maintenance/security review schedule proposals and next task; no claim no future bugs

**Bằng chứng:** artifact_review. Chứng minh kết quả của T084.S05 bằng artifact/command phù hợp, chỉ rõ expected/observed; log được hash và gắn source snapshot. Không dùng log của demo HTML để hoàn thành code ứng dụng.

### Kiểm tra nghiệm thu của đầu việc
- Thiếu giờ/recipient thì chưa bật; gửi lại bản tin cùng kỳ không trùng.
- Changed data must not rewrite audit reason; no secrets in logs/exports/error URLs.
- Backup exists not restore proof; missing mandatory criterion cannot greenlight launch.

### Điều kiện dừng đúng phạm vi
- Thiếu quyền hoặc thay đổi nguồn chuẩn ngoài phạm vi; ghi BLOCKED đúng phần.
- Thiếu credentials/budget/chính sách thực thì làm adapter/mock cho phần độc lập, không giả integration PASS.

**Bàn giao:** `execution/evidence/T084/handoff.md`. Chọn command có thật và phù hợp trong execution/command-map.json; lệnh app đề xuất phải được tạo/xác minh ở T005–T012 trước khi dùng.

Không chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.

