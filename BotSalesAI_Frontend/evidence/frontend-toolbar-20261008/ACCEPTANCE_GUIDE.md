# Nghiệm thu bản sửa Toolbar — 08/10/2026

Phạm vi React/TypeScript và HTTP MSW tổng hợp. Kết quả, source hash và gate ở [REPORT](REPORT.md). Trạng thái UI chỉ ở [plan §16.6](../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status); quyết định nghiệm thu thuộc người dùng.

## Mở demo

Mở `http://127.0.0.1:4173/s/shop-demo/products`. Preview phục vụ `apps/web/dist-demo`; reload khôi phục dữ liệu tổng hợp. Để dựng lại, chạy từ workspace Frontend với Node/npm đã pin:

```powershell
$env:PATH = 'C:\Program Files\nodejs;C:\Windows\System32;C:\Windows;C:\Program Files\Git\cmd;' + (Join-Path (Get-Location) 'node_modules\.bin')
npm.cmd ci
npm.cmd run setup
npm.cmd run build:demo
Set-Location apps/web
node ../../node_modules/vite/bin/vite.js preview --outDir dist-demo --host 127.0.0.1 --port 4173 --strictPort
```

## Ca cần quan sát

| Ca | Thao tác | Kết quả đúng |
|---|---|---|
| Products desktop | Mở ở 1440px. | Hàng tìm kiếm gồm tên/SKU, nút tìm kiếm và trạng thái; hai ô danh mục ở hàng riêng, bằng chiều rộng. Nút không cao theo nhóm helper/count. |
| Products hẹp | Thu xuống 320px, dùng Tab và Enter. | Controls xuống dòng, đọc và thao tác được; không tràn ngang toàn trang. Bảng có vùng cuộn riêng. |
| Tìm kiếm và trạng thái | Chọn trạng thái; nhập Áo, bấm Enter; dùng Xóa tìm kiếm. | Status/categoryId giữ trong URL; q được submit/clear; cursor cũ bị bỏ. Sau clear, focus ở ô tìm kiếm. |
| Lookup danh mục | Tìm tên danh mục; chọn một danh mục rồi tìm từ không khớp. | Lookup tìm trên cửa hàng có debounce; giá trị đã chọn vẫn hiển thị dù không nằm trong trang lookup mới. |
| Tồn kho | `/s/shop-demo/inventory`: nhập bộ lọc và Enter, sau đó Áp dụng/Đặt lại. | Enter trong bộ lọc phụ không submit q; Áp dụng và Đặt lại dùng hành vi riêng. Lặp lại trên trang biến động kho. |
| Zoom và chữ | Zoom trình duyệt 200%; Firefox tăng riêng chữ 200%. | Nút và nhãn còn đọc/bấm được. Tên tài khoản sidebar xuống dòng, không bị cắt. |

Pagination 61 danh mục, busy/disabled, network error/retry và multiline extra có fixture riêng trong [suite sở hữu](../../tests/ui-toolbar-layout.spec.ts), không phải seed mặc định của demo. Bản build được quan sát trên Chromium và Firefox; [ảnh desktop](products-built-chromium-1440.png) và [ảnh 320px](products-built-chromium-320.png) được lưu thật.

Các ca F01–F09 trước đó tiếp tục theo [hướng dẫn gốc](../frontend-corrections-20261008/ACCEPTANCE_GUIDE.md) và được giữ trong full E2E hiện hành. Native zoom chạy bằng profile tạm, không chỉnh profile người dùng.

Ghi route, kích thước/zoom, thao tác và kết quả thực tế khi phản hồi. Screen-reader speech, hosted CI, Backend/provider thật, production và quyết định nghiệm thu không được tự nhận PASS.
