const fs=require('node:fs');
function edit(f, pairs){let s=fs.readFileSync(f,'utf8');for(const [a,b] of pairs){if(s.split(a).length!==2)throw Error(`Unexpected: ${f}: ${a}`);s=s.replace(a,b);}fs.writeFileSync(f,s);}
edit('apps/web/src/app/Shell.tsx', [['<Box sx={layoutSx.shell.demoBanner}>', '<Box component="aside" aria-label="Công cụ mô phỏng" sx={layoutSx.shell.demoBanner}>']]);
edit('apps/web/src/modules/workspace/index.tsx', [
 ['Chào mừng trở lại</Typography>', 'Đăng nhập BotSales AI</Typography>'],
 ['Giao diện hiện chỉ hỗ trợ tiếng Việt. Locale lưu trong API: ${locale}.', 'Giao diện hiện chỉ hỗ trợ tiếng Việt. Ngôn ngữ lưu cho cửa hàng: ${locale}.'],
 ["'Catalog nhà cung cấp mô phỏng' : 'Kiểm tra catalog nhà cung cấp'", "'Danh sách nhà cung cấp mô phỏng' : 'Kiểm tra danh sách nhà cung cấp'"]
]);
edit('apps/web/src/modules/orders/index.tsx', [
 ['Tìm qua listCustomers với q; chỉ chọn mã do API trả về.', 'Tìm khách hàng theo tên hoặc mã; chỉ chọn khách trong kết quả tìm kiếm.'],
 ['Tìm từ listProducts với q; biến thể không hoạt động không được chọn.', 'Tìm sản phẩm theo tên hoặc SKU; chỉ chọn biến thể đang hoạt động.']
]);
edit('apps/web/src/modules/catalog/index.tsx', [['File được kiểm soát qua API upload; không nhúng secret hoặc URL tùy ý.', 'Tải ảnh qua hệ thống; không dùng đường dẫn tùy ý hoặc thông tin bí mật.']]);
edit('apps/web/src/modules/reports/index.tsx', [
 ['label="Snapshot API"', 'label="Thời điểm dữ liệu"'],
 ['Báo cáo dòng, biểu đồ và tổng hợp theo khoảng ngày chưa có trong getReportSummary. Frontend không cộng dữ liệu phân trang để tạo KPI thay thế.', 'Báo cáo chi tiết, biểu đồ và tổng hợp theo khoảng ngày hiện chưa có. Số liệu trong từng trang danh sách không được cộng để thay thế chỉ số tổng.'],
 ['Trạng thái export được lấy riêng từ listJobs; URL tải chỉ được mở sau khi API trả về công việc hoàn tất.', 'Trạng thái xuất dữ liệu được theo dõi riêng; chỉ mở tệp tải sau khi công việc hoàn tất.']
]);
