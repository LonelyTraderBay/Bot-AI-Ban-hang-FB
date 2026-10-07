# FE028 — Architecture review after SPC-060

**Ngày rà soát:** 06/10/2026 · **Scope:** `FRONTEND_WITH_SYNTHETIC_MOCK_API` · **Reviewer:** Codex self-review; không tuyên bố peer review độc lập.

## Kết quả hiện trạng có bằng chứng

- Ứng dụng sản phẩm trong checkout là React/TypeScript tại `apps/web`; không có `apps/api`, `apps/worker` hoặc `infra` trong scope này. UI gọi API qua transport chung; route và DTO lấy từ contract canonical, mock MSW chỉ dùng cho demo/test. Production build không khởi tạo MSW.
- Composition hiện dùng một MUI theme/provider, một Router và một QueryClient. 16 business modules giữ ranh giới qua app/shared/public entry; module không import module nghiệp vụ khác.
- Lượt `npm run verify` hiện hành đọc 67 source files, 220 operation calls và 54 routes; boundary check đọc 67 files/475 imports, không có issue/cycle và 10/10 negative fixtures. Lint, strict TypeScript, domain/MSW 88/88, Vitest 93/93 và production build đều có trong [W26 verify log](../../../../evidence/frontend-ui-improvements/UI028/W26/verify-with-visual-gate-current-20261006.log).
- Generator freshness hiện hành là 11 outputs/283 schemas/210 operations/54 routes. OpenAPI, route/permission catalogs và `design/tokens.json` tiếp tục là nguồn chuẩn; không có generated contract output được sửa bằng tay.
- Layout tests đạt 10/10, strict spacing scan đạt 68 files/0 finding/1 exact scoped exception được dùng; visual-token tests đạt 5/5 và scan đạt 68 files/0 finding. Logs được lưu trong [SPC-060 check evidence](../../../../evidence/frontend-spacing-audit-20261005/policy-spc060-current-20261006/).
- Built demo W32 được nhận diện bằng SHA-256 `6f4120d693536fd4f9ca8d417604c9d4cc16cfc2bcc46ccddbbec25405d978f2`; smoke đạt 2/2 và route matrix đạt 216/216 observations qua 54 route, 390/1440 CSS px, Chromium/Firefox. Full built-demo browser run mới nhất trong FE008 đạt 484/484.

## Tác động của quy định spacing mới

SPC-060 thuộc design governance; cập nhật này không thay đổi runtime UI, API contract, component tree hoặc dependency. Nó yêu cầu mọi UI mới ghi layout profile và semantic spacing owner trước JSX/CSS, tái dùng nhịp chung cho route cùng profile, và chứng minh mọi sai khác bằng workflow/responsive rationale, shared named variant có consumer thật, cùng regression trên consumer bị ảnh hưởng.

Hai checker hiện ngăn literal/token drift và lỗi style đã biết. Chúng **không tự xác nhận profile parity hoặc rendered spacing giữa mọi route hiện có**. W28/W29/W30 evidence chứng minh các route/viewport/state được liệt kê trong chính các run đó; không suy rộng thành review trực quan đầy đủ mọi quan hệ spacing của toàn bộ 54 route. Task UI sau này vẫn cần design contract, reference cùng profile, compare rendered state và regression theo impact theo SPC-057/060.

## Kết luận kiến trúc và giới hạn

Không phát hiện boundary/cycle mới hoặc nhu cầu thêm framework/provider/abstraction từ policy-only change này. Không có weighted architecture-only score trong nguồn chuẩn, vì vậy không gán phần trăm kiến trúc. Đây là self-review trên source/evidence local; không chứng minh live API, server authorization, provider, persistence, hosted CI, staging, production operations hay accessibility conformance đầy đủ. FE-G05 và user-owned FE-G09 được giữ nguyên trạng thái riêng trong quality-gate matrix.
