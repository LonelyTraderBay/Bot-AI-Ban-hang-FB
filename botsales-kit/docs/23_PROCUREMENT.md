# 23 — Quản lý mua hàng và tự đặt có giới hạn

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.5.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Default behavior and constraints
notify_only: suggest/call attention. draft_for_approval: prepare PO, require owner approval to send. auto_send: opt-in supplier/SKU/price/qty/budget rules, independent explicit policy authority; absent limit -> disabled, not infinite. Real supplier payment is never implied by purchase-order send approval. Model suggests; deterministic engine computes.

## Reorder math, baseline
For warehouse+SKU: available = sellable_on_hand − reserved. inventory_position = available + confirmed inbound remaining. Pending drafts are NOT confirmed inbound, but an active proposal key prevents creating a second proposal for same shortage. Trigger when position <= reorderPoint. targetNeed = max(0,targetQuantity−position). suggestedQty = 0 if targetNeed=0 else max(MOQ,ceil(targetNeed/packSize)*packSize), with configured cap/budget check after rounding. If MOQ forces overshoot cap, create exception, do not cut below supplier constraints silently. Nonnegative available enforced elsewhere.

Baseline uses min/max thresholds entered/approved by owner; statistical lead-time/demand forecast optional with sample coverage, source age and uncertainty. No data -> no invented forecast confidence. Confirmed inbound subtracts receipts/cancelled lines once; do not sum original PO qty after partial receipt. Existing draft can be refreshed/versioned, requiring new approval if terms change.

## Purchase workflow
Supplier approved + valid offer -> suggestion -> draft PO snapshot supplier/offer/currency/qty/unit cost -> requestApproval(intentHash,payloadVersion,policyVersion) -> decide by authenticated authorized human -> revalidate at send -> sending -> sent/unknown -> supplier confirmed -> partial receipt/received. Cancel before irreversible send subject to state, release reservations; after send use supplier cancellation with observed confirmation, not local delete. Existing scheduled send must be fenced on revoke/pause/new version.

## Budget/consistency
Budget uses purchase commitment amount, not LLM estimate. Reserve commitment and create PO atomically; consume/release once. Parallel reorder workers for same warehouse/SKU acquire unique activeProposal and stable locks; duplicate event returns existing reference. Approval check validates amount/currency/supplier/line hash and current authority. Delayed send with changed supplier price or limit -> pending review, not auto-upgrade cost.

## Receiving
GoodsReceipt carries PO/version/source document and accepted/rejected quantities per purchaseLineId. Received accepted increases sellable (or quarantine if awaiting inspection), rejects segregated; inbound remainder reduced once. Invoice accompanies receipt in demo fixture; production can use GRNI until supplier invoice then AP. Receipt posting composes inventory/finance in transaction. Overdelivery needs policy approval; no duplicate stock on retried receipt. UI exposes remaining/rejected, approval diff, source evidence and AP link.

## Integration
No universal supplier API assumed. Initial reliable mode is approved human-confirmed communication or a specific adapter the actual supplier supports. Sending a PO by email/Telegram is only a message intent; supplier acknowledgment separate. Unknown send must reconcile before retry. Live connector and commercial authority at T071/T079, not synthetic demo approvals.
