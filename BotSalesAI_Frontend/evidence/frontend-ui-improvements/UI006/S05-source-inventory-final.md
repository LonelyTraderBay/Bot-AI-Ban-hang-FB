# UI006 — Final source inventory

**Date:** 2026-10-02 · **Scope:** React Frontend source + canonical OpenAPI · **Evidence type:** source scan after implementation; no backend/staging claim.

## Result

The original inventory had 21 `limit: 100` call sites. After applying the decisions in S01, `rg -n "limit:\\s*100" apps/web/src/modules` now returns 6 intentional bounded calls. The 15 required lookup/table call sites no longer rely on a first page of 100 records: lookup choices use cursor paging with contract-supported search where available; collection tables use independent cursors. Existing selected IDs are hydrated or retained across search/page boundaries where the operation supports it. Messages keep their existing independent history cursor and page size.

| Remaining call | Classification and user-facing scope |
|---|---|
| `inbox/index.tsx:59` — `listMessages(cursor, limit:100)` | One message-history page; cursor is independent from conversation-list cursor (UI002). |
| `inbox/index.tsx:156` — `listProducts(limit:100)` | Bounded sales-helper preview; states 100-product/snapshot maximum and links to catalog. |
| `inbox/index.tsx:157` — `listStockSnapshots(limit:100)` | Bounded availability preview; links to inventory. |
| `customers/index.tsx:43` — `listShipments(limit:100)` | Bounded comparison of at most 10 latest customer orders with 100 loaded shipments; links to complete shipments view. |
| `knowledge/index.tsx:22` — `listProducts(limit:100)` | Bounded source preview; states sample scope and links to catalog. |
| `knowledge/index.tsx:23` — `listStockSnapshots(limit:100)` | Bounded source preview; states sample scope and links to inventory. |

## Implementation coverage

- Cursor-based choices: categories on product filter; privacy customers; active members for reassignment and notifications; shipment/return source orders; procurement suppliers, offers and products; receipt source purchase orders.
- Cursor-based collections: supplier offers, reorder rules, devices, and the related procurement/suggestion tables; URL cursor keys are independent for concurrent tables/collections.
- Contract discipline: server `q` is used only for operations that define it in `botsales-kit/contracts/openapi.json`. Supplier, offer, purchase-order, reorder-rule, device, and shipment lists are cursor-paged without invented server search.
- Completeness cues: procurement eligibility/offer selection does not claim completeness while more pages remain; preview panels explain sample bounds and expose a full-list route.
- Identity semantics: selected or deep-linked resource IDs remain visible when absent from the current page/search, using detail hydration or retained labels according to the operation.

## Reproducible source check

```powershell
rg -n "limit:\\s*100" apps/web/src/modules
```

Expected matches: exactly the six calls listed above. This source inventory does not establish browser acceptance, backend behavior, staging, production, FE-G05 manual accessibility, or FE-G09 product-owner acceptance; those are recorded separately in the UI006 checkpoint and gate table.
