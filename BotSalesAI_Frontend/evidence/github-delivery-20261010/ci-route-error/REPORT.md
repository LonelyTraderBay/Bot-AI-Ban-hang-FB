# Tách ca kiểm tra lỗi theo canonical route

Revision trước sửa: 9c946222c4f327fe65c81f414cb1e5ae3e3388bb. Log hosted của revision ca5d9d8a2bdfcf0464d669ed333786e4c90d810f trong run 38014328694 cho thấy Firefox timeout 300000ms tại ca gộp 57 route, sau các mốc 10/57, 20/57, 30/57 và 40/57. Run đó bị concurrency hủy khi push revision tiếp theo; không ghi hosted PASS.

## Nguyên nhân và thay đổi

Ca gộp dùng một deadline cho 57 lần tạo context, khởi động MSW, điều hướng và kiểm lỗi. Trace ghi assertion R50 bắt đầu 1945848.906ms, kết thúc 1946172.902ms: khoảng 323.996ms trước khi timeout chung cắt ngang, trong khi assertion cho phép 10000ms. R50 chạy riêng trên Firefox PASS trong 16.4s. Chưa có bằng chứng lỗi render/API của R50 từ lần bị cắt này.

Chuyển thành 57 ca độc lập theo route-manifest. Một server theo describe; page fixture của Playwright tạo context độc lập cho từng ca. Giữ nguyên kiểm lỗi/API, không có success toast, retry danh mục R10 và ngoại lệ Shell-owned data của R33. Mỗi ca dùng timeout mặc định 180000ms; assertion 5000/10000/15000ms giữ nguyên. Không tăng timeout, bỏ assertion hoặc giảm route coverage. Selector ROUTE_ERROR_TEST_ID vẫn chỉ dành cho chẩn đoán riêng.

Title describe giữ chuỗi mà generator route-state-roles hiện hành đọc. Không thay canonical FE receipts, report sinh hay tracker. Discovery tăng từ 350 lên 406 ca/project do thay một ca gộp bằng 57 ca; vẫn 69 file/project.

## Bằng chứng hosted gốc

Job 114101155108; artifact 11657515070, frontend-firefox-38014328694-1-ca5d9d8a2bdfcf0464d669ed333786e4c90d810f. ZIP 223861048 byte, SHA256 e7903260a618a742fc8d30b5c2c0ba23b445ea946f1dfe298f3fa5ee5b1058fa, khớp digest GitHub.

Trace ZIP đầy đủ của ca gộp là 177129116 byte, SHA256 fefa26bd5c7346e32a564e1a3c4992ee342dd5aa3bc96cf11f3c01319b0cbdf1. Bản gốc đã tải và kiểm hash trong vùng điều phối local; repository giữ nguyên byte test.trace, error-context và trace/network của context R50 được trích từ artifact. Các resource ảnh của trace đầy đủ tiếp tục nằm trong artifact GitHub; không mô tả các phần trích là trace ZIP hoàn chỉnh. Log hosted vẫn chứa FAIL lịch sử của marketing; bản sửa đó và regression được bàn giao ở ci-marketing-filter.

## Gate cuối

Local trên nguồn cuối: 114/114 ca route PASS trong 6.5 phút, đúng 57 route mỗi browser; kiểm marker PASS của mỗi canonical route xuất hiện hai lần. npm run verify PASS exit 0, domain/network 117/117, unit 238/238, composition 41/41, layout 86/86 và validator 11/11. S17 khớp 275 fingerprint hiện hành và ba log. Discovery: 406/project, tổng 812 E2E; 69 file/project. Hash các capture và raw evidence nằm trong local-validation.json. Hosted của SHA sau push: PENDING_AT_COMMIT, phải lấy kết quả run thật.

Commit 30: b9e6e3948f59767ce270ee2dc27961a5999ea7ae, P1 tổ chức lại ca route lỗi. Commit 31: P2 raw evidence, local regression/gate, refresh S17 và báo cáo; SHA chính báo cáo lấy từ Git history. Frontend với mock API tổng hợp; không nhận nghiệm thu Backend, staging, production, owner hoặc screen-reader speech.
