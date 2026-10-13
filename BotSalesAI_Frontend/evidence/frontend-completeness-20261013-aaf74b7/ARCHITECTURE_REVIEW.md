# Review kiến trúc trên diff Frontend/mock — 13/10/2026

Reviewer: Codex tự review source, contract, test và kết quả thực. Đây không phải peer review hoặc owner acceptance. Fingerprint/source ownership và execution record nằm trong hồ sơ cùng thư mục; báo cáo cuối chỉ chốt sau full runs.

App giữ một Router, QueryClient, MUI theme. Module xuất public entry và sử dụng shared API/UI; không import module khác. Source boundaries/type/lint/generated checks kiểm trên code thật, kèm negative fixtures. Canonical contract/token thuộc `botsales-kit`; không đổi lockfile, dependency, schema, permission hoặc palette trong diff này. MSW chỉ demo/test, build production có phép thử isolation riêng.

Các detail mới có state chọn ID local, Query key theo operation/shop/input qua `useApi`; chỉ enabled khi mở đối tượng. Response từ GET là owner của detail, không lấy row snapshot để che pending/error. Không phát sinh N+1 request mỗi dòng. Mutation của đối tượng invalidate cả list và GET detail tương ứng. Các trường hiển thị theo DTO hiện có, credential chỉ last-four/masked; không thêm secret vào response/log.

Command history có cursor `commandCursor` độc lập với work queue; permission `jobs.read` kiểm phía UI và mock. Mock list/get lọc thêm quyền của operation mutation gốc trước pagination, từ chối operation không xác định/unknown kind và ID ngoài shop. Actor mock vẫn cố định `user-demo`; server thật phải enforce actor/object/field authorization, persistence và ordering. Không coi policy mock là chứng minh authorization backend. Detail chỉ đọc/refresh không reconcile unknown intent hoặc gửi lại mutation.

Pager dùng history keyed theo pathname và tất cả filter trừ cursor: 100 filter theo LRU, mỗi filter tối đa 100 cursor. Cắt history cũ không bịa cursor trước; người dùng có thể về đầu, filter khác giữ nguyên. Regression đi 125 trang và quay 99 lần đo cursor còn lại; negative run trước sửa được giữ riêng.

Readonly dialog từng không cho keyboard focus vào content cuộn: root cause được đo trong cold-detail-r1, sửa ở owner EditDialog bằng named region/tabIndex. End phải cuộn thật khi overflow; focus/dirty/busy API giữ nguyên. Heading thông báo dùng h2 trong list/h3 trong dialog. Channel warning từng cắt text ở Firefox Text Only 200%, 320px: giữ nguyên nội dung, cho Chip wrap hữu hạn ở owner; native before/after ghi số đo và ảnh.

Playwright parent/worker trước đây tự sinh run ID khác nhau; built-demo output dùng chung parent còn gây xung đột trace. Cấu hình hiện dùng ID truyền qua environment và private output/cache directory; traversal ID bị từ chối. Unit kiểm config được nạp thật trong Node child, không mô phỏng tên thư mục. Partial/failed runs giữ nguyên. Lượt hai worker có trace Chromium `ERR_NO_BUFFER_SPACE` khi tải main.tsx; final full run dùng một worker đã khai báo của dự án, không tăng timeout, thêm retry hoặc bỏ assertion để che lỗi.

FE020 exception filter trước đây dùng locator toàn cục cho table; bảng command mới làm row count bao gồm cả hai bảng. Sửa test bằng accessible name **Công việc vận hành**, giữ row count 4/5 và zero writes. FE010 product flow đồng bộ GET detail + heading/list ready; không kết luận một product defect chưa tái hiện từ timeout baseline. Bốn source-map tests cũ được đối chiếu schema/owner hiện hành; giữ kiểm permission/invariant và source lịch sử, không sửa generated contracts để làm test đạt.

Strict premium scanner raw exit 1/14 findings được giữ. `audit_project.py` lowercases component tag Button và chỉ xét click/submit/form/disabled như literal HTML; không resolve MUI `component`. AST review xác định 11 RouterLink/to, 2 label/input-file/onChange, 1 anchor/href/download có action thật. Privacy destination còn có ca browser permission/click riêng. Không thêm noop click, disable link hoặc tự ghi accepted exception thứ 14. Đây là giới hạn scanner được giải thích bằng source/runtime riêng, không scanner PASS hay 100% enforcement.

Không tạo password step-up trái OIDC hoặc đường approve privacy khi policy chưa có: `stepUp`/`approvePrivacyRequest` giữ unavailable theo FE009.S03. Tỷ lệ API reference luôn giữ mẫu số 224 và hai gap này; không loại khỏi mẫu số để thành 100%.

Review giới hạn ở Frontend/MSW và các invariant đã kiểm. Không chứng minh DB transaction/isolation, distributed recovery, provider, physical devices, Narrator speech, staging, production hoặc hosted CI. Không có refactor ngoài scope hoặc cơ chế state/provider mới.


Bundled Chromium 153 r7 (một worker) vẫn có ERR_NO_BUFFER_SPACE tại document navigation W02, trước response/app assertion. Snapshot resource sau lỗi không chứng minh OS hết tài nguyên. Final matrix r8 giữ đủ 878 cases/70 files và mọi assertion, dùng installed Chrome 155 theo support Chrome >=154 cùng Playwright Firefox 155; không gọi các lượt Chromium 153 FAIL là PASS. Kết quả r8 chỉ được công nhận khi terminal record/JSON thực đạt.


Native zoom capture được kiểm bằng so sánh cùng trạng thái Chrome 155: DOM dialog y=32..328 trong CSS viewport640x360, scrollY556; Playwright viewport PNG bị dịch, trong khi CDP captureBeyondViewport=false/fromSurface=true khớp viewport. native-capture-diagnostic.json giữ CSS/non-CSS layout metrics và hai ảnh/hash. Helper final dùng CDP viewport và thêm kiểm vertical bounds; record Chrome r6 chỉ là lịch sử trước sửa capture, final dùng r7 8/8, không chỉnh source ứng dụng.

Sau full r8 PASS, generator báo cáo route dừng vì bốn title lịch sử D06/G05/G07/G08 không còn khớp owner tests. Sửa đúng bốn chuỗi ở generator, giữ guard yêu cầu title có trong source và log browser đạt. Generator thực chạy lại PASS 61 route/64 feature; hai map cases chạy lại PASS. proof-tool-delta.json đối chiếu diff chính xác và checksum mọi input của full run: chỉ một report tool đổi, app/mock/browser tests/config không đổi. Các execution records trước sửa giữ nguyên; source/verify/S17 và cold checks được chạy lại cho tool hiện hành.

Probe fixture đo browser.version() là Chrome 155.0.8059.40 với channel chrome; navigator.userAgent vẫn Chrome/153 do preset Desktop Chrome của Playwright. Hai artifact-preview cases dùng page fixture hiện hành. Báo cáo phân biệt binary đo thực với chuỗi UA, không suy phiên bản engine từ UA preset.
