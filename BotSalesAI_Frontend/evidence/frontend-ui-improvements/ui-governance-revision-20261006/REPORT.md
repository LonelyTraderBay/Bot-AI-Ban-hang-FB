# Chốt lại thiết kế trước sửa code tiếp — 06/10/2026

Yêu cầu mới nhất được thực hiện trong phạm vi tài liệu. [Plan §16.15](../../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#design-revision) chốt phương án token → mapping/theme → shared owner → feature consumer, quyết định cho đủ27 API, thứ tự ưu tiên và bằng chứng không bỏ sót. [Standard §0.6](../../../docs/FRONTEND_SPACING_STANDARD.md#06-hợp-đồng-thiết-kế-được-chốt-lại-trước-migration) làm rõ việc tuân thủ rules hiện có; [catalog §7](../../../apps/web/src/shared/ui/README.md#7-chốt-hợp-đồng-trước-code--yêu-cầu-mới-nhất) giữ CURRENT/TARGET. Không thêm stack, dependency hoặc universal engine.

Đã sửa8 tài liệu: AGENTS root/kit, scope/context/continue, standard, plan, catalog. Đã loại điều hướng tiếp tục code trong cùng lượt và sửa current-versus-historical wording ở các điểm liên quan. Giữ proof S03/S04; không thay bảng trạng thái bằng kết quả audit mới, không tăng S05–S20/FE/full-product/owner acceptance.

[Validation](validation.json) kiểm stable20 steps/75 rules, đủ27 export decisions từ source functions, canonical workflow pointers và local link target existence. So hash356 inventory files ngoài8 tài liệu sửa với [before](before.json): không đổi; Git index hash không đổi. Phạm vi hash là inventory364rows của batch trước, không tuyên bố mọi file trên disk hoặc mọi branch runtime đã kiểm. Kiểm link target không thay kiểm tất cả Markdown anchors.

Lượt validation đầu [initial](validation-initial.json) FAIL vì link tới validation.json chưa được tạo ở lần chạy đầu. Artifact đã được tạo; lượt kiểm lại có kết quả riêng, không xóa initial failure. Whitespace ở cuối plan được sửa trước verification cuối.

Runtime source/checkers/tests/token/contracts/config/workflow/ledgers không sửa. Build/typecheck/lint/unit/domain/E2E/browser/native resize/zoom **NOT_RUN_THIS_DOCS_TURN**. Kết quả S04 được đọc từ evidence, không relabel thành chạy lại. Không chứng nhận UI tuân thủ100% hoặc Enterprise readiness từ việc sửa tài liệu.

Khi nhận việc triển khai tiếp, refresh inventory/baseline và tiếp S05 theo dependencies ở plan; không có external owner/Backend/hosted-CI wait giữa chừng. Người dùng nghiệm thu sau bàn giao source và proof thật.
