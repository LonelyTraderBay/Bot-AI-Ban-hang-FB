# Kiểm toán kế hoạch và tài liệu Frontend — 05/10/2026

**HISTORICAL_AUDIT:** giữ nguyên kết luận/số đo bên dưới theo ngày audit. Nguồn current ở [plan §16.6](FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status) và [evidence report](../evidence/REPORT.md); không lấy status/đường dẫn cũ để tiếp tục triển khai.


**Mục đích:** chốt phạm vi Frontend-only, trạng thái BLOCKED hiện hành và mức tự động hóa theo yêu cầu của người dùng. Đây là báo cáo kiểm toán tài liệu/kế hoạch trên checkout hiện tại, không phải chứng nhận Backend, production, release hoặc nghiệm thu thay người dùng.

## Kết luận chốt theo hai yêu cầu

| Điều người dùng muốn chốt | Kết luận đo từ nguồn chuẩn | Trạng thái |
|---|---|---|
| `BotSalesAI_Frontend` chỉ triển khai Frontend | Kế hoạch FE khai báo `FRONTEND_WITH_SYNTHETIC_MOCK_API`; runtime sản phẩm là `apps/web`; 28 task có 50 dependency nội bộ và không có dependency ra task Backend/toàn sản phẩm; write scope không giao xây API server, worker, database hoặc infrastructure. `apps/api`, `apps/worker`, `infra` không tồn tại trong checkout. | **ĐẠT** |
| Không còn việc Frontend hiện hành ở trạng thái `BLOCKED` | `progress.mjs validate` hợp lệ; `status` trả 140/140 checkpoint, 100%, `blocked=[]`, `stale=[]`, `next=[]`; cả 28 task đều DONE. Bảng UI có 27/27 item DONE, 135/135 checkpoint và 0 hàng UI BLOCKED. | **ĐẠT — theo trạng thái hiện hành** |
| AI tự làm toàn bộ việc có thể kiểm chứng; người dùng chỉ xem gói cuối | Chính sách hiện hành bỏ chờ owner, Backend, provider hoặc hosted CI giữa chặng. Các gate địa phương được chạy bằng mock tổng hợp; hồ sơ đã sẵn sàng nghiệm thu. | **ĐẠT trong phạm vi tự động hóa khả dụng** |

Điều kiện thứ hai có nghĩa **không còn task nào đang BLOCKED**, không có nghĩa toàn bộ kho tài liệu phải xóa sạch chữ `BLOCKED` hoặc lịch sử từng tạm dừng. Giữ nguyên trạng thái và sự kiện cũ để kiểm toán; chỉ status lấy từ CLI chuẩn xác định việc nào đang bị chặn hôm nay. Không thể cam kết lỗi kỹ thuật tương lai sẽ không bao giờ phát sinh. Nếu có lỗi thật, AI phải xử lý và kiểm chứng, không được đổi nhãn hoặc tắt gate.

## Cơ sở và cách kiểm tra

Kiểm toán đọc toàn bộ nhóm tài liệu, kế hoạch, cấu hình, contract, báo cáo sinh tự động và evidence thuộc checkout; tính SHA-256, kiểm UTF-8/JSON, phân loại file, tìm liên kết Markdown tương đối, đối chiếu task/dependency/scope và chạy lệnh validator chuẩn. Kho kiểm kê hiện hành: [final-post-fe028-20261005-inventory.json](../evidence/frontend-scope-automation-audit-20261004/final-post-fe028-20261005-inventory.json). Kết quả lệnh tracker: [validate](../evidence/frontend-scope-automation-audit-20261004/final-post-fe028-20261005-tracker-validate.json) và [status](../evidence/frontend-scope-automation-audit-20261004/final-post-fe028-20261005-tracker-status.json); kết quả link scan: [links.json](../evidence/frontend-scope-automation-audit-20261004/final-post-fe028-20261005-links.json). Script kiểm liên kết: [validate_links_20261005.py](../evidence/frontend-scope-automation-audit-20261004/validate_links_20261005.py). Phương pháp inventory: [audit_docs.py](../evidence/frontend-scope-automation-audit-20261004/audit_docs.py).

Kết quả inventory cuối gồm **1.757 file / 29.259.604 byte (29,26 MB)**, không có lỗi giải mã UTF-8 hoặc JSON. Tỷ trọng chính: 1.496 evidence/snapshot lịch sử; 89 file kế hoạch toàn sản phẩm chỉ đọc; 53 tài liệu/tiện ích kit; 31 báo cáo Frontend được sinh; 15 tài liệu Frontend hiện hành; 10 file kế hoạch/hướng dẫn hiện hành; 18 contract/design/generated data. Các nhóm còn lại: 2 quy tắc Universal, 14 config/delivery, 7 prototype reference và 22 historical reference. Inventory loại trừ dependency cài đặt, build output và chính thư mục audit-generated để tránh đếm lại artifact kiểm toán.

Validator tìm thấy **1.174 liên kết Markdown tương đối**; không có liên kết thiếu trong nhóm tài liệu hiện hành. Có **7 đích liên kết hỏng** ở duy nhất evidence cũ `evidence/frontend-ui-improvements/UI020/S01-browser-pwa-inventory.md`; chúng trỏ tới config/source từ đường dẫn evidence. Không sửa file evidence lịch sử. Validator chỉ kiểm tra tồn tại file đích, chưa kiểm tra anchor hoặc link HTML.

## Thứ bậc nguồn chuẩn và phạm vi hiệu lực

| Vai trò | Nguồn chuẩn | Cách hiểu khi tài liệu lệch nhau |
|---|---|---|
| Quy tắc phát triển chung | `AI_RULES.md` nguyên bản Universal 3.1 và root `AGENTS.md` | Không bịa kết quả, phê duyệt, contract hoặc năng lực; giữ ranh giới an toàn và bằng chứng. AGENTS quy định đây là Frontend-only và không cập nhật tracker toàn sản phẩm. |
| Ranh giới dự án | [FRONTEND_SCOPE.md](FRONTEND_SCOPE.md) | React/TypeScript, UI, synthetic MSW, frontend tooling/test/build/evidence; backend thật, provider, staging, deploy nằm ngoài scope. |
| Danh sách và tiến độ FE | [frontend-plan.json](../botsales-kit/execution/frontend-plan.json), [frontend-progress.json](../botsales-kit/execution/frontend-progress.json), `node botsales-kit/scripts/progress.mjs validate|status|next` | JSON là nguồn chuẩn; ledger giữ evidence và lịch sử. Không sửa %/status bằng tay. `IMPLEMENTATION_PLAN.md`, phiếu FE và `FRONTEND_PROGRESS*` là generated output. |
| Cải tiến giao diện | [FRONTEND_UI_IMPROVEMENT_PLAN.md](FRONTEND_UI_IMPROVEMENT_PLAN.md) | Backlog riêng UI001–UI027; không cộng mẫu số UI vào tracker FE. Bảng task hiện hành có 27 dòng, tất cả DONE. |
| Quy trình và readiness | [FRONTEND_PLAN_GUIDE.md](../botsales-kit/execution/FRONTEND_PLAN_GUIDE.md), [SESSION_HANDOFF.md](../botsales-kit/execution/SESSION_HANDOFF.md), [DELIVERY.json](../DELIVERY.json), [REPORT.md](../evidence/REPORT.md) | Handoff sẵn sàng nghiệm thu chỉ trong phạm vi Frontend/local/mock; các giới hạn của gate phải được giữ nguyên. |
| Hợp đồng và thiết kế | `botsales-kit/contracts/openapi.json`, `route-manifest.json`, `design/tokens.json` | Đây là nguồn chuẩn cho operation, route và token. Không tự sửa generated code dưới `packages/*/src/generated*`. |
| Full product | `botsales-kit/execution/plan.json`, `progress.json`, `tasks/T*.md` và phần Backend trong kit | Tài liệu tham chiếu toàn hệ thống, chỉ đọc trong task này. `sourceTaskIds` chứa T-ID để truy nguyên yêu cầu, không tạo dependency hoặc quyền triển khai Backend. |
| Snapshot | `evidence/**`, `frontend-evidence/**`, audit ngày 04/10 trở về trước | Dùng theo ngày/revision ghi trong artifact; snapshot cũ không được trình bày như status hoặc test hiện hành. |

Các tài liệu kiến trúc/API/coding standards trong kit mô tả cả Backend vì chúng là chuẩn hợp đồng của toàn sản phẩm. Việc chúng nhắc NestJS, database, worker, auth hay transaction **không giao các phần đó cho checkout Frontend**. Frontend chỉ thể hiện contract/client/mock tương ứng và nói rõ phần chưa được xác minh với server thật.

## Số liệu kế hoạch và tiến độ hiện hành

- Kế hoạch FE có 5 phase: F00 10%, F01 25%, F02 40%, F03 20%, F04 5%; 28 task và 140 checkpoint. Dependency graph có 50 cạnh nội bộ, không có dependency ngoài FE, không có dependency chu kỳ hoặc ID thiếu.
- Kết quả `node botsales-kit/scripts/progress.mjs validate`: `valid=true`, 28 task, 140 checkpoint. Kết quả `status`: 140/140 VERIFIED, 100%, 28/28 DONE, mọi phase 100%, `blocked=[]`, `stale=[]`. `next=[]` là trạng thái không còn task chờ làm; câu trả lời tĩnh của lệnh `next` nói “Check blockers…” không phải phát hiện blocker khi status cho thấy danh sách blocker rỗng.
- UI plan có 27/27 item và 135/135 checkpoint DONE. FE plan có 28/28 task và 140/140 checkpoint DONE. Hai mẫu số khác nhau và phải được báo riêng.
- [FE028/S05](../botsales-kit/execution/frontend-evidence/FE028/S05-final-review-v2-20261005.json) là evidence cho checkpoint bàn giao cuối; [handoff FE028](../botsales-kit/execution/frontend-evidence/FE028/handoff.md) nêu lệnh kiểm tra chuẩn. Ma trận [quality-gate-matrix-current-20261005.json](../botsales-kit/execution/frontend-evidence/FE028/quality-gate-matrix-current-20261005.json) tự ghi rõ đây là snapshot 135/140 trước khi hoàn thành FE028, nên không dùng nó làm nguồn trạng thái cuối.
- Không ghi `botsales-kit/execution/progress.json` toàn sản phẩm. Phần runtime được quan sát có `apps/web`; không có `apps/api`, `apps/worker`, `infra`.

## BLOCKED: kết quả hiện hành, lịch sử và chuỗi dễ gây hiểu nhầm

Status hiện hành **không có blocker**. Tuy vậy, full-text inventory (bao gồm báo cáo này) vẫn thấy chữ `BLOCKED` trong 190 file/590 dòng. Phần lớn thuộc 87 tài liệu kế hoạch toàn sản phẩm chỉ đọc và 66 evidence/snapshot lịch sử; phần khác là test/error semantics, ví dụ contract hoặc hướng dẫn cách xử lý blocker. Đây là tìm kiếm từ khóa, không phải cách xác định task status.

Có 84 điều kiện dừng trong FE plan; 28 task lặp một guard chung rằng phần thiếu contract/quyết định bắt buộc phải được giữ lại thay vì bịa API/quyền. Đây là điều kiện fail-closed nếu phát sinh gap mới, **không phải task đang BLOCKED**. Lịch sử ledger ghi nhận 29 lệnh `block` đã chạy trên 18 task ở các thời điểm trước, sau đó task được resume/đổi phạm vi, evidence được làm mới và tất cả hiện DONE. Xóa lịch sử sẽ làm sai audit trail.

Ledger hiện có 18/28 hàng DONE vẫn mang chuỗi `blockedReason` cũ về requeue, refresh hoặc dependency evidence. Effective status engine ưu tiên kết quả evidence/dependency và hiện tính các task ấy là DONE; chuỗi cũ không nằm trong `blocked=[]`. Nên cải thiện CLI ở lần bảo trì kit sau để tự xóa/đóng lý do khi task DONE mà vẫn giữ event history. **Không sửa tay ledger** trong audit này.

`DELIVERY.json.initialDeliverySnapshot.build = BLOCKED_MISSING_DEPENDENCIES` là baseline ngày 29/09/2026, trước khi cài dependencies và chạy build; trường đó được lồng dưới `initialDeliverySnapshot`, không phải status bàn giao hiện tại. Giữ nguyên để bảo tồn lịch sử. Trạng thái delivery hiện hành là `UI_SCOPE_READY_FOR_ACCEPTANCE`, `frontendCompleteVerified=true`, `productionReady=false`, tracker 140/140 và blocker 0.

## Tự động hóa, nghiệm thu và giới hạn kết luận

Chính sách trong FRONTEND_SCOPE/FRONTEND_PLAN_GUIDE không yêu cầu người dùng thao tác giữa chặng: AI tự sửa code, chạy các test/tool khả dụng, lưu evidence, tái xác minh dependency và chuẩn bị handoff. Người dùng chỉ quyết định nghiệm thu cuối. “Tự động hoàn toàn” vẫn không cho phép giả lập bằng chứng vốn cần người nghe screen reader, reviewer độc lập hoặc quyền trên dịch vụ hosted.

| Gate | Trạng thái thật | Giới hạn cần giữ trong hồ sơ |
|---|---|---|
| FE-G01 | Đạt trong scope local | Verify/build và bằng chứng clean install; cảnh báo lifecycle `allowScripts` được giữ lại. |
| FE-G02 | Đạt | Generator/source/boundary/lint/typecheck; đây là self-review + automated checks, không tự xưng peer review độc lập. |
| FE-G03 | Đạt trong contract/mock | Test contract, domain, MSW và unit; không chứng minh live server/API. |
| FE-G04 | Đạt trong UI/mock | 388/388 browser regression; synthetic role/tenant data không chứng minh authorization phía server. |
| FE-G05 | Chưa đạt đầy đủ; không phải task BLOCKED | Keyboard/axe/contrast/zoom/text-flow có evidence; Narrator speech/transcript và broad human conformance `NOT_RUN`. Không tuyên bố WCAG đầy đủ. |
| FE-G06 | Đạt trong Frontend/mock | Không thay cho server authorization, tenant isolation hoặc live PII review. |
| FE-G07 | Đạt trong phép đo local | UI027 giảm production chunk lớn nhất từ 738.39 xuống 328.33 kB raw; profile Chromium/demo synthetic, không là CDN/device/backend SLO. |
| FE-G08 | Đạt theo local equivalent được kế hoạch cho phép | Hosted GitHub Actions `NOT_RUN`. Workflow đang ở repo root cha như file local untracked; không có run đã publish. |
| FE-G09 | Chờ người dùng nghiệm thu cuối | Đây là quyền của người dùng, không tự ghi thay. |

Rubric là **7/9 gate đạt**, không phải điểm phần trăm kiến trúc React và không phải Production-Ready/Enterprise-Grade certification. Việc cần người dùng làm tiếp chỉ là xem gói bàn giao và đưa ra quyết định cuối; các hạn chế FE-G05/FE-G08 phải hiện rõ khi họ quyết định.

**Ngoại lệ design audit cần đọc cùng kết quả:** UI021 được đóng bằng quyết định review được requester chấp thuận ở [S38](../evidence/frontend-ui-improvements/UI021/S38-requester-review-acceptance-20261004.md) sau khi đối chiếu 13 finding `affordance.actionless-button` theo [S37 source crosswalk](../evidence/frontend-ui-improvements/UI021/S37-current-source-crosswalk-20261004.md). Strict scanner mới nhất vẫn exit 1/13; không có suppression và không được mô tả là scanner PASS. `premium-audit.json` gốc giữ nguyên; nó trộn React với prototype/test nên không thay thế kết quả React-only hiện hành.

## Các điểm cần cập nhật/tối ưu tiếp theo

Không còn hạng mục triển khai UI/FE trong hai backlog hiện hành. Những đề xuất sau là vệ sinh tài liệu/tooling hoặc bước xác minh nằm ngoài điều kiện đóng FE task; chúng không được biến thành blocker của công việc đã hoàn tất:

| Ưu tiên | Điểm quan sát | Đề xuất và tác động |
|---|---|---|
| P1 — metadata | `frontend-plan.json.status` vẫn là `APPROVED_FRONTEND_SCOPE_PLAN_NOT_EXECUTED`, còn `authority` nói lượt ban đầu chỉ thay đổi planning. Đây là dấu thời điểm tạo kế hoạch, không phải status task; nhưng cách đặt tên khiến tài liệu chuẩn trông như chưa làm. | Ở lần bảo trì schema/rebaseline có kiểm soát, tách trạng thái phê duyệt scope khỏi trạng thái thực thi hoặc đánh dấu rõ giá trị là creation snapshot. Không sửa JSON trực tiếp: `frontend-plan.json` được đưa vào source fingerprint của các checkpoint; đổi nó sẽ làm bằng chứng hiện có thành STALE nếu không chạy migration/revalidation hợp lệ. |
| P1 — ledger/tooling | 18 task DONE còn `blockedReason` lịch sử. | Thêm thao tác CLI có guard chỉ dọn reason khi toàn checkpoint và dependency đã VERIFIED; giữ nguyên history. Đến lúc đó dùng công cụ, không viết trực tiếp `frontend-progress.json`. |
| P2 — archive links | 7 link hỏng trong một evidence UI020 lịch sử; nhóm tài liệu hiện hành có 0 link hỏng. | Giữ snapshot byte-identical. Có thể thêm link errata riêng nếu người đọc cần mở các file đích; mở rộng validator để kiểm anchor/HTML links cho các tài liệu mới. |
| P2 — design scanner | UI021 DONE nhờ requester chấp thuận ngoại lệ review cho 13 finding; strict scanner vẫn exit 1. | Không ép scanner xanh bằng suppression hoặc sửa artifact gốc. Nếu tiêu chí nghiệm thu sau này yêu cầu scanner exit 0, tách thành scope mới và xử lý finding bằng thay đổi được kiểm chứng. |
| P2 — thuật ngữ task | `next` khi đã hết task vẫn trả thông điệp template nhắc “Check blockers…”. | Lần bảo trì CLI sau nên phân biệt hết việc với blocker thật để tránh người xem nhầm `next=[]` thành có chặn. Không đổi CLI lúc này vì file đó có trong fingerprint evidence của các checkpoint sớm. |
| Theo dõi sau nghiệm thu | FE-G05 speech/human review, FE-G08 hosted CI và FE-G09 final acceptance. | FE-G05 chỉ làm nếu có người thực hiện/quan sát thật; FE-G08 hosted run cần publish/remote runner và là tùy chọn theo local-equivalent policy hiện tại; FE-G09 do người dùng quyết định. Không tuyên bố đã xong những phần chưa quan sát. |

## Chốt giao việc

Theo đúng phạm vi Frontend đã được duyệt: **không còn task FE/UI để AI tiếp tục chạy; không có blocker hiện hành; không có prerequisite Backend/hosted CI/owner ở giữa quy trình; gói kỹ thuật ở trạng thái chờ người dùng nghiệm thu cuối**. Các nhãn `NOT_RUN`, dấu vết blocker cũ và giới hạn ở trên được giữ như bằng chứng trung thực, không phải việc bị bỏ quên hoặc lý do để dừng các task Frontend còn lại.

Kết luận này dựa trên checkout cục bộ và synthetic mock. Nó không chứng minh Backend/provider, môi trường staging, deploy, hosted Actions hoặc production runtime.
