# 24 — Kế toán quản trị, công nợ, COD và lời/lỗ

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Scope
Management accounting with balanced immutable journals, source reconciliation and audit. Not certification of national books/tax/payroll. Actual business country/base currency/recognition/tax/period policies require owner+appropriate professional review before live use. IAS 2 distinguishes inventory expense relative to related revenue [N13]; source used as design principle, not assumption shop legally applies IFRS. AI classifies/explains based on records; cannot choose arbitrary amounts or override ledger invariants.

## Core accounts in test fixture
Cash/Bank, InventoryWarehouse, InventoryTransit, CustomerReceivable, CarrierCODReceivable, SupplierPayable/GRNI, RefundPayable, OwnerCapital, Sales, SalesReturns, COGS, CarrierFees, OperatingExpenses. These are logical labels, not a country-specific chart of accounts. Debit/credit lines exact Decimal with single currency per balanced journal. Multi-currency unsupported live until explicit FX/subledger policy. Amount display follows currency scale, not hardcoded two decimals for all.

## Recognition and stock valuation
Moving weighted average is a proposed operating baseline selected for implementation tests, needs live finance approval. On receipt accepted qty update quantity/value; dispatch stores exact cost snapshot and moves asset to transit. For fixture delivery/control-transfer policy, delivery posts Sales/Receivable and COGS/Transit. Other verified control-transfer policies can change event through explicit versioned rules; don't infer transfer just from local button or order.created. Returned sellable inventory uses relevant cost history and approved cost method, not latest catalog cost. Reports show policy/asOf and pending/unmatched flags.

## Fully worked golden example (synthetic VND, no tax)
Opening owner capital: Dr Bank 2000000 / Cr OwnerCapital 2000000.
Receive 10 units with accepted invoice at 100000 each: Dr InventoryWarehouse 1000000 / Cr SupplierPayable 1000000. If invoice absent, credit GRNI instead then invoice reconciliation moves GRNI→AP.
Record verified supplier payment: Dr SupplierPayable 1000000 / Cr Bank 1000000. No purchase payment API is automatically executed.
Customer confirms 2 × 150000: no revenue/cash journal; reserve qty 2.
Handover: Dr InventoryTransit 200000 / Cr InventoryWarehouse 200000; no sale recognition in this fixture yet.
Delivered COD: Dr CarrierCODReceivable 300000 / Cr Sales 300000; Dr COGS 200000 / Cr InventoryTransit 200000.
Carrier remits 280000 net and documented 20000 fee: Dr Bank 280000 + Dr CarrierFees 20000 / Cr CarrierCODReceivable 300000.
Final: Bank 1280000, Inventory 800000, AR/AP zero, revenue 300000, COGS 200000, gross margin 100000, fee 20000, management profit 80000. Assets 2080000 equal capital 2000000 plus profit 80000. Bank movement is not profit.
One accepted return with 150000 refund obligation: Dr SalesReturns 150000 / Cr RefundPayable 150000; Dr InventoryWarehouse 100000 / Cr COGS 100000. Only after actual approved refund observed: Dr RefundPayable 150000 / Cr Bank 150000. Then inventory 900000, Bank 1130000, net revenue 150000, COGS 100000, unchanged documented fee 20000, profit 30000. No automatic carrier fee refund assumed.

## Source/period rules
Unique journal intent key `(shopId,sourceType,sourceId,eventType,sourceRevision)` supports different events of one order without double posting. source IDs cannot collide across bank accounts/providers. Posted lines immutable; corrections via reverse/replacement, no delete to make reports agree. Closed period check and posting race serialized; fiscal dates interpreted with adopted policy. Imported estimates and actual invoices separated and reconciled, not counted twice.

## Reconciliation
Bank/COD imports preview safe parsing/mapping and source IDs; same document reimport is idempotent. Auto-match may propose, ambiguous/partial/split/disputed requires review until safe deterministic policy approved. Customer screenshot is unverified evidence. COD states show delivered/order value, customer cash collected by carrier, fee, batch net bank payment and remaining receivable separately. Deferred revenue/deposits not sales by default. AP due date/credit terms and aging account for partial payments and disputes.

## Reporting and AI
P&L computed server from posted journal and date/policy, cashflow from actual verified cash movements, balance exposures from AP/AR/inventory. Drill-down every total to source; UI never sums just paginated subset. AI receives permission-filtered report snapshot and returns explanation with references; no direct ledger tools. Owner sees Unknown/Estimated/Not reconciled instead of fabricated zero.
