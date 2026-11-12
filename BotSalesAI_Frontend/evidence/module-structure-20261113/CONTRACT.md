# Tách trách nhiệm module — hợp đồng và phạm vi

Baseline Git `60900d41a90799e8f6d43e24f31989a50cb5956c` cùng working tree có sẵn của lượt data-sync; các diff, untracked và bằng chứng đó được bảo toàn. Owner: Codex. Không thay contract, behavior, layout, token, route, role, backend, API hay tracker. Đối tượng: frontend React/TS và API MSW tổng hợp.

1. P1 orders: tách biểu mẫu đơn và trang trả hàng khỏi index; giữ snapshot/version, state, route R17/R18/R19/R43, ID và invalidation; kiểm hành trình catalog → stock → order → prep, form, hoàn/trả và lỗi/unknown.
2. P2 operations: tách phê duyệt và ủy quyền mua khỏi trang công việc, giữ R37/R38/R52 và workflow phê duyệt → mua → nhận → tồn/công nợ; kiểm permission, intent/version, lookup, pending/unknown.
3. P3 workspace: tách cài đặt shop và privacy/consent khỏi đăng nhập/workspaces, giữ R01/R02/R03/R32/R33/R34/R35/R36/R61, cache shop của lượt trước, route, quyền, trạng thái draft và token challenge; kiểm save/settings, consent, workspace/session.

API công khai là `index.tsx` module như route-map hiện hành; các trang thực thi ở file nội bộ cùng module. MUI, shared UI và các role inset/gap/geometry giữ nguyên theo workflow §0/SPC-001–075; không đổi thiết kế. Impact: các route ở trên và consumers chéo gồm catalog, customers, inventory, fulfillment, finance, procurement, inbox. Baseline ảnh route ở desktop/mobile cùng hash nguồn/config/tests được thu trước source edit. Từng lần tách giữ contract đã có, chạy source-map, typecheck, browser regression và cross-module; cuối cùng `npm run verify` và S17 evidence validator. Không đổi status S17/acceptance chỉ do refactor; native zoom, screen reader, backend/hosted và mọi state chưa kiểm phải ghi rõ.

Catalog `apps/web/src/shared/ui/README.md` là registry hiện hành cho consumer thực tế. Trước khi cập nhật hai row bị ảnh hưởng do di chuyển file, SHA-256 của catalog là `9371ec81d9a0887a55403bd87b464d0ba037d5855a05a75df25ca48f2523dd59`; không đổi owner, role hay giá trị. Danh sách before/after được đối chiếu bằng resolver ở `crosswalk-changes.json`.
