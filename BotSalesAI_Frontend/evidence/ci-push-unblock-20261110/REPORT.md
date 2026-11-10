# Xử lý CI khi đưa UI vào main

Lượt GitHub Actions đầu của PR #19 báo lỗi audit `GHSA-g3hv-75wg-m249`: minimatch 10.2.6 trong chuỗi typescript-eslint. Phiên bản mới nhất của typescript-eslint vẫn khai báo ^10.2.2, nên override được giới hạn riêng tại `@typescript-eslint/typescript-estree` sang minimatch 11.0.1; đây là thay đổi vượt major của dependency gián tiếp và cần kiểm thử công cụ. Node 24 đáp ứng engines; estree gọi export `minimatch` còn tồn tại. [npm audit](audit.log) hiện báo 0 vulnerabilities; lint và typecheck đã qua.

Các test đổi cửa hàng được giới hạn locator vào navigation chính sau khi breadcrumb cũng có liên kết tên shop. Test locale cập nhật copy mới; test dashboard kiểm status không kéo giãn toàn bộ card thay vì yêu cầu chip phải nhỏ hơn nửa card ngay cả khi nhãn không thể ngắt từ.

[Test hồi quy](focused-e2e.log) đạt 12/12 trên hai engine. [Verify](verify.log) đạt đủ 12 bước trên máy local; các kết quả UI trong `unslop-fixes-20261110` thuộc snapshot trước thay đổi CI/dependency này. Không sửa điều kiện bảo vệ nhánh hoặc giảm ngưỡng audit; kết quả GitHub Actions là kết quả độc lập.
