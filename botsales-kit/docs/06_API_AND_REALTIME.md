# 06 — Contract-first API và realtime

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

`contracts/openapi.json` is canonical; YAML and operation-index generated, not independently edited. Operation IDs linked from route manifest and tests. HTTP base /api/v2; old v1 archive not active. Before writing server/controllers or UI clients, T009 validates all refs and generates DTO. Only extension via source JSON + scenario + migration map, single owner.

Queries use server cursor+limit (bounded), stable ordering and metadata `asOf`/trace info. No totals computed from current page. Mutations require CSRF for cookie sessions, idempotency key scoped operation and current version in body/If-Match where specified. 202 means command accepted, not side effect completed. GET command current status before retry after timeout. 409 conflicting idempotency body/business state; 412 stale version; 422 field errors; 428 missing version when required; 429 retry-after; UI must preserve user edits.

Every resource read checks tenant/object/field visibility. list/read/export/async job must agree on permissions. Effective allowedActions includes capabilities, current state and policy; client does not reproduce permission engine. Write requests do not trust totals/amount caps/policy approval boolean supplied by caller. Any response carrying redacted fields must identify unavailable vs unknown values.

SSE event schema only invalidation/source refs, not confidential full records. Event sequence supports duplicate/out-of-order/resume/resync-required. Reconnect fetch current snapshot on gaps; no client applies stale stock delta as authority. Shop switch/logout/revoke closes old stream, aborts queries, clears state and rejects late responses by scope token. Worker/notification/task observation is still authoritative server state.

New APIs in notifications, operations, fulfillment, procurement and finance are specified but no actual server is shipped with this kit. API schema validation is not contract execution proof. OIDC callback is protocol endpoint; external Meta/carrier/Telegram webhooks must validate signature/identity by their official adapters, not use cookie auth as substitute. Ingress wire contracts are verified at T037/T068–T071 against selected providers, then frozen in adapter fixtures.
