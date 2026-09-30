# 12 — Hạ tầng, CI/CD và vận hành thực tế

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Environments
Local: isolated Postgres/Redis/object storage development alternatives + fake providers; explicit synthetic seed and IdP. Staging: actual granted service accounts, approved test users/devices, no customer dataset copying by default. Production: separate secrets, DB/buckets/queues/region, validated policy and enabled capability set. Vercel may host static web/PWA; long-lived workers need suitable process hosting and persistent backing stores, not relying on open browser or short HTTP function. Exact provider/cost/region permission at T067; do not provision merely because plugin connected.

## Operational objects
Health checks distinguish liveness (process) vs readiness (can serve relevant feature). Provider last check can be unknown/stale; healthy must expire. Metrics: queue oldest age/retry/unknown counts, confirmation failures, inventory negative-check attempts, unsettled COD, failed notifications, auth rejections, AI tokens/cost estimate/actual. Logs correlate command/shop/trace, redact content. Alert assignee and approved hours configured; no assumed around-the-clock staff.

## Deployment order
Schema additive → compatible API/worker → backfill from evidence → verify source/derived sums → new UI → drain old workers → retire contract fields after approved usage window. Build once, promote same digest; images and tool versions pinned. Production source maps restricted. Migration rollback must not drop new valid data. Kill switch configuration rollback tested separately from artifact rollback.

## Release gates
T066: complete local feature coverage. T072: actual external staging chain. T078: release candidate with security/load/restore evidence on intended digest. T079: business/country/currency/recognition/retention settings reviewed. T080: actual owner UAT and devices. T081: explicit release permission. T082–084: controlled deployment, actual post-deploy checks and handover. 100% documentation/mock coverage does not satisfy any live gate.

## Runbooks required
Meta/provider key compromise: disable/rotate/revoke, bound impact audit, no keys copied to ticket. Bot wrong/out-of-control cost: pause generation, inspect already accepted/unknown sends, stop future effects, roll back reviewed config. Notification unseen: delivery observation vs ack, check device revoked/quiet hours, fallback only policy. Purchase unknown: query supplier/ref, human verify, never blind resend. Stock drift: freeze affected SKU allocation, reconcile movement, controlled correction. Finance mismatch: block close/post of disputed resource, reconcile source, reversal not delete. Queue loss: rebuild from outbox/commands, idempotent consumers. Restore: isolated DB/object check, reapply deletion tombstones, reconcile external effects before activation.

SLO/RPO/RTO/traffic/retention targets remain owner inputs with reason; use synthetic performance benchmark labels until approved. Never call backup restore “tested” when only schedule was created. Maintenance schedules are proposals unless scheduled by authorized actual service/tool.
