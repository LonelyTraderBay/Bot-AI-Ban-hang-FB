# 22 — Lấy hàng, đóng gói, giao và trả từng phần

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.5.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Preparation
WorkItem linked one order release/fulfillment batch; assignee is authenticated staff member. Claim doesn't ship, packing doesn't deliver. Pick checklist keyed orderLineId/variant snapshot and quantity; mark picked quantities rather than boolean if partial. Wrong SKU/extra qty blocks. Damaged/missing items create issue and hold, with reason+actor; owner chooses correction/substitute requiring customer approval if contract changes. No AI asserts physical work completed without responsible human/device event.

## Dispatch
Packed order/batch + current reservation -> handover transaction. Consume reserve and move quantity from sellable warehouse to in_transit_to_customer. Persist cost snapshot and shipment handing evidence. Stock cost held as transit asset under delivery-recognition fixture; not automatically COGS/revenue on dispatch. Carrier label creation outside transaction, intent idempotency; create timeout goes unknown/reconcile.

Carrier events have unique externalEventId, normalized type, occurredAt and observedAt. Out-of-order event must not regress delivered to transit. Distinguish failed delivery/returning/returned. Manual carrier mode explicit; recording a manually verified event must include human/evidence, not inferred from timer. Tracking link external safe allowlist.

## Returns
Return request at line/quantity; authorize per policy with original sales/paid refs. Receive returned goods first into quarantine; inspect sellable/damaged decision, then movement. Accepted return may create credit/refund obligation; actual bank refund is separate authorized external action and not exposed as autonomous tool. Partial returns retain remaining delivered lines and preserve cost snapshots. Multiple return requests cumulative qty cannot exceed eligible sold quantity; duplicate receipt cannot restock twice. Exchange = return + new order under explicit policy, not mutate original historical price.

## UI
Preparation board chronological/due priority, mobile large claim/pick/pack buttons. Detail has independent timelines for order/customer confirmation, prep, shipment, payment and return. Show who can act/why disabled and source staleness. Old `Xuất kho & ghi doanh thu` combined demo action removed in v2; user now walks handover→delivery→COD settlement. Full financial semantics in docs/24.
