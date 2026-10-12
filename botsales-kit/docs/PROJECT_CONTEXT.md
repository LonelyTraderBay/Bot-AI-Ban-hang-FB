# BotSales AI — Bối cảnh dự án

Cập nhật: 2026-10-11 17:39 UTC. Tài liệu này mô tả snapshot local, không phải xác nhận release.

## Phạm vi và thẩm quyền

Kế hoạch full-product v2.0 (BOTSALES-V2-20260929) ghi APPROVED_IMPLEMENTATION_PLAN_NOT_EXECUTED. Phê duyệt kế hoạch không cấp quyền mua hàng, thanh toán, triển khai hay tác động dữ liệu live. Người dùng xác nhận quốc gia, tiền tệ cơ sở và timezone của shop đầu tiên chưa chốt; giữ live actions tắt. Không đọc hay ghi credential.

Mục tiêu frontend được xác minh hiện tại là ứng dụng React với MSW/mock API tổng hợp. Một kết quả demo/mock không chứng minh backend, provider, staging hoặc production hoạt động.

## Cấu trúc thực tế và nguồn chuẩn

- Repo Git: C:\Users\Joker-PC\Documents\Projects\Bot-AI-Ban-hang-FB, nhánh main, revision f2af10dd70ff03e85e2bcbb5367bb8272937ea24 tại thời điểm chụp.
- botsales-kit: tài liệu kiến trúc/nghiệp vụ/bảo mật, contracts, route manifest, design tokens, release metadata và các kế hoạch. Nguồn chuẩn là contracts/openapi.json, contracts/route-manifest.json và design/tokens.json; file plan/progress/task full-product là tài liệu tham chiếu chỉ đọc.
- BotSalesAI_Frontend: workspace npm riêng, React/TypeScript/Vite trong apps/web; MSW cho demo; có source gates, Vitest và Playwright. Node 24.19.0, npm 11.17.0.
- BotSalesAI_Backend: placeholder local rỗng, chưa có mã backend.
- .github: workflow ở repo root. Không kết luận hosted CI đã chạy nếu chưa có run trên remote.

## Working tree và dữ liệu

Working tree không sạch. Có 12 file tracked đang modified và 1 file untracked. Chúng gồm 5 file cache lifecycle WIP cùng test mới, 2 Playwright spec, và 5 ảnh C05 Firefox được refresh trước snapshot này. Danh sách/hash đầy đủ ở execution/baseline.json. Giữ nguyên tất cả thay đổi này; không reset, clean hoặc xóa cache cũ.

.env.local hiện diện ở frontend nhưng nội dung không được đọc. Không có secret/credential nào được sao chép vào hồ sơ này.

## Kiểm chứng quan sát được

Trước lượt heavy hiện tại, đã có focused Firefox C05 (1/1, 42.5 giây) và UI006.C05 (1/1, 23.1 giây), cùng scoped ESLint và git diff --check đạt trên source đó. Kết quả này được ghi trong lịch sử tác vụ; không có log bền trong repo cho các focused run.

Full Firefox và npm run verify chưa được chạy ở snapshot này. Auto-review đã từ chối lệnh full Firefox, viện dẫn chỉ thị read-only của tác vụ disk-audit trước đó dù chỉ thị mới nhất yêu cầu cấp heavy slot. Không dùng đường vòng. Npm run verify cũng đang chờ quyết định phạm vi qua yêu cầu xác nhận trực tiếp. Không bulk-mark tracker.

Trạng thái đọc được lúc chụp: frontend ledger 0/140 verified, FE001–FE028 stale; full-product plan có 84/84 tasks NOT_STARTED (420 checkpoints), và các tracker không bị sửa. Ổ C còn 549,580,771,328 byte (~511.98 GiB) trống trước heavy slot.

## Chưa xác định / ngoài bằng chứng

Quốc gia, tiền tệ cơ sở, timezone, budget, approver và cấu hình provider thật chưa xác định. Không có bằng chứng local frontend nào ở đây chứng minh backend/provider, hosted CI, staging, production, owner acceptance, accessibility UAT hay quyền phát hành.