# 13 — Nâng cấp từ 1.1 và mở rộng về sau

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Changes requiring real migration analysis
V1 demo's fulfill combined dispatch and delivered; v2 splits commercial/preparation/shipment/payment. Historical real rows cannot be auto-tagged delivered from that field alone. Use carrier/customer evidence or hold unknown/manual review. V1 full-only returns become line partial returns with refund obligations. V1 expense read model becomes source-based journal financial reports. V2 APIs reside /api/v2; mutation snapshots and approval intent hashes must include updated schema/policy versions.

64 feature IDs remain A01–H08; R01–R36 keep navigation meaning, R37–R54 extend. Operation names for obsolete password login/fulfill routes mapped in contracts/migration-map.json. Legacy schemas unused by new operations may remain for DTO archaeology only if explicitly deprecated; do not expose unsafe old behavior in new app. Source archive is not a second execution plan.

Brownfield intake must inspect actual code/data/consumers; preserve instructions, uncommitted work and existing customizations. Work in slices and tests; no blind overwrite by extracting full kit into active source paths. Greenfield copy kit into `../botsales-kit/`; AI creates app outside prototype folder. If user has universal AI files at root, compare hash and reference original instead of altering it.

New feature process: approved requirement → ownership → typed contract/permission → invariants/events → UI/API/worker implementation → tests/evidence → rollout/migration. New plan tasks require approved scope/version/weight migration; do not silently reduce denominator or delete failed tasks to improve percentage. Existing evidence affected by source change marked stale. Growth by adding bounded modules, not sprinkling cross-module state or generic custom rule language.


SC-008/022/026/027/044 được chuyển kỳ vọng v2 tại fixtures/core-acceptance-scenarios.json. Bỏ đường tắt returnOrder; tạo case/kiểm hàng riêng. payOrder/refundOrder chỉ ghi nhận khoản đã được xác minh, có evidenceRef, không thực thi chuyển tiền.

## Tiếp nhận gói màu 2.1.1

Xem `UPGRADE.md` cho repo mới và repo đang chạy. Palette giữ nguyên 2.1, nghiệp vụ/API không đổi; chỉ hướng dẫn màu/nguồn sinh/đầu vào kế hoạch được đồng bộ. Giữ task states, owner-inputs thật và evidence; xét stale theo phần bị ảnh hưởng, không xóa tracker để bắt đầu lại.
