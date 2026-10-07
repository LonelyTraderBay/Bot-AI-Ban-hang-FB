# 05 — Nguồn dữ liệu, máy trạng thái và bất biến

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Ownership
| Dữ kiện | Nguồn có quyền đổi | Bên khác |
|---|---|---|
| Giá/biến thể/promotion | catalog | Quote đọc snapshot; AI không viết giá |
| Sellable/reserved/transit/quarantine | inventory ledger | Orders gửi intent reserve/consume/release |
| Commercial order and confirmation | orders | Inbox truyền source refs, không tự chốt bằng local state |
| Pick/pack/shipment | fulfillment | Người thật xác nhận tác vụ vật lý |
| PO/receipt/supplier | procurement | Inventory nhận accepted receipt theo giao tiếp |
| Journal/cash/AR/AP/period | finance | AI/report đọc; không sửa số tiền bằng ngôn ngữ |
| Tasks/approval/policy | operations | Notification chỉ chuyển/tường minh trạng thái, không tạo owner thứ hai |
| Provider observation | integration attempt/command | Timeout => unknown; không biến unknown thành failed để gửi lại |

## States
Order: draft→confirmed→completed; cancel before handover with no irreversible obligation, otherwise return/settlement process. Prep: queued→claimed→picking→packed→handed_over; blocked is reason/state of work item; cancel cancels outstanding work. Shipment: planned→label_pending→label_ready→handed_over→in_transit→delivered; failed/returning/returned; unknown when external result unavailable. Partial shipment/return at line-level; aggregate states derived without hiding quantities. Payment: unpaid/part_paid/verified/cod_collected/settled/part_refunded/refunded; multiple transactions do not overwrite history.

PO: draft→pending_approval→approved→sending→sent→confirmed→part_received→received. sending→unknown on ambiguous external response. No sent on mere HTTP timeout, no new PO until reconcile. Approval: pending→approved/rejected/expired/revoked; approved→consumed exactly once for bound intent. Journal: draft→posted; correction creates reversing entry and replacement, not edit posted lines. Period open→closing→closed; reopening requires real authorization.

## Invariants (INV2)
| ID | Bắt buộc |
|---|---|
| INV2-01 | Shop/tenant boundary on DB FK, API, workers, SSE, retrieval, exports and callbacks |
| INV2-02 | available = sellable_on_hand − active_reserved ≥ 0; rejected/inbound/in-transit-to-customer not available |
| INV2-03 | One reservation consume/release per line intent; atomic multi-SKU reserve or no reserve |
| INV2-04 | Confirmation binds exact quote, expiry, customer identity, order lines and policy; modified inputs invalidate consent |
| INV2-05 | Claim compare-and-set: one active assignee, current membership and source validity |
| INV2-06 | Dispatch not delivered; delivered not bank cash. Each state has independent evidence |
| INV2-07 | PO open proposal dedupe and budget reservation atomic; never double-count inbound and pending proposal |
| INV2-08 | Accepted receipt total ≤ ordered remainder unless explicit approved overdelivery; rejects not sellable |
| INV2-09 | Sum debits = sum credits per currency; exact decimal; journal sources unique by shop/type/id/event/revision |
| INV2-10 | Posted ledger immutable; refund ≤ eligible paid/owed and returned quantity within sold line quantity |
| INV2-11 | A closed period cannot be written concurrently; reopen is audited authority action |
| INV2-12 | Provider accepted/failed/unknown distinct from opened/acknowledged; no false success |
| INV2-13 | Approval hash/version/expiry/current permission rechecked before action; replay cannot reuse approval |
| INV2-14 | Pause fence blocks not-yet-dispatched work; accepted external effects are not claimed undone |
| INV2-15 | No silent PII model failover; retention/deletion propagates all stores and restored backups via tombstones |
| INV2-16 | No client/LLM-derived money, stock, rights or performance numbers are trusted as authority |

## Time / Money / Identifiers
API Money `{amount: decimal string,currency: ISO code}`; quantities integer for discrete retail in initial scope. No JS Number for financial arithmetic; exact math backend and BigInt synthetic integer VND in demo only. UTC timestamps ISO; shop timezone to render/schedule. Do not aggregate currencies without approved FX policy. Composite unique tenant refs everywhere; external Meta identities page-scoped, bank IDs account-scoped, provider attempts external-ref scoped.

## Side-effect protocol
intent accepted with idempotency body hash → authoritative transaction → outbox → worker preflight current policy/generation → provider send → observation. When result is unknown, operation remains nonfinal and disables unsafe duplicate submit. Reconcile queries/observations may establish accepted/failed; manual resolution carries actor/evidence. Never claim exactly-once across arbitrary external APIs.
