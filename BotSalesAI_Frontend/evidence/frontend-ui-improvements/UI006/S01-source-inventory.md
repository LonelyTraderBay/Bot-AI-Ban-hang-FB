# UI006 — Source inventory baseline

**Date:** 2026-10-02 · **Scope:** React Frontend source + canonical OpenAPI · **Data:** read-only inventory; no API calls or backend claims.

## Method and contract facts

- Source scan: `rg -n "limit: 100" apps/web/src/modules` found 21 call sites after UI005. The list below records every match; each occurrence is classified by what consumes its data, not by its page size alone.
- Current checkout HEAD: `e68cb65e61c5c1aab2ae169dd8033df305df8872`. The worktree already contains earlier, uncommitted UI/audit work; SHA256 values below fingerprint these current source inputs rather than asserting HEAD contains them.
- Canonical `botsales-kit/contracts/openapi.json`: all list operations in this inventory accept `limit` and opaque `cursor`. Search `q` is supported for `listCategories`, `listCustomers`, `listMembers`, `listOrders`, `listProducts`, `listStockSnapshots`, and `listMessages`. `listSupplierOffers`, `listSuppliers`, `listPurchaseOrders`, `listReorderRules`, `listDevices`, and `listShipments` have cursor paging but no `q` parameter. `getCategory`, `getCustomer`, `getMember`, `getOrder`, `getPurchaseOrder`, `getSupplier`, and `getSupplierOffer` can hydrate a selected resource by ID. Do not invent a filter for operations without it.
- The shared `usePagedApi` already owns scope-aware infinite-query keys and accumulates cursor pages; it does not deduplicate overlapping pages and changes its collection when filters such as `q` change. Selected values outside the current filtered collection therefore need an explicit detail query or retained label. Table views should use the existing `useListQuery` + `Pager`, with a distinct cursor parameter when two lists share a route.

## Call-site inventory and decision

| # | Current source call | Actual role | Decision / architectural change |
|---:|---|---|---|
| 1 | `catalog/index.tsx:27` — `ProductsPage` → `listCategories(limit:100)` | Filter choice for the product list | Required lookup: cursor paging + contract `q`; preserve the URL-selected category and hydrate its label with `getCategory`. |
| 2 | `workspace/index.tsx:196` — privacy customer selector + consent preview → `listCustomers(limit:100)` | Customer ID is required to create a privacy request; preview shares the data | Required lookup: paged customer selection + `getCustomer` hydration. Clearly label the separate consent panel as a synthetic preview of loaded sample customers. |
| 3 | `operations/index.tsx:30` — work-item reassignment → `listMembers(limit:100)` | Full active-member selector | Required lookup: cursor pages; only active members may be selected; retain selected ID if it is outside current options. |
| 4 | `fulfillment/index.tsx:172` — shipment creation → `listOrders(limit:100)` | Required order selection; route may include `orderId` | Required lookup: `listOrders` cursor + `q`, retain/deep-link selected order with `getOrder`. |
| 5 | `orders/index.tsx:217` — return creation → `listOrders(limit:100)` | Required source-order selection; route may include `orderId` | Required lookup: `listOrders` cursor + `q`, retain/deep-link selected order with `getOrder`. |
| 6 | `procurement/index.tsx:15` — suppliers page → `listSupplierOffers(limit:100)` | Offers `DataTable`, not a selector | Cursor-paged collection table; separate URL cursor from the suppliers table. |
| 7 | `procurement/index.tsx:16` — supplier offer editor → `listProducts(limit:100)` | Product-variant selector | Required lookup: cursor pages; selected variant/product label must survive paging. |
| 8 | `procurement/index.tsx:92` — replenishment → `listReorderRules(limit:100)` | Rules `DataTable` | Cursor-paged table; keep its cursor separate from suggestions. |
| 9 | `procurement/index.tsx:93` — replenishment → `listSupplierOffers(limit:100)` | Resolves suggestion and rule offer IDs and checks eligibility | Required related-resource lookup. Accumulate cursor pages; do not allow a missing first-page offer to appear as invalid or eligible without confirmation. |
| 10 | `procurement/index.tsx:94` — replenishment → `listSuppliers(limit:100)` | Resolves offer supplier names and approval state | Required related-resource lookup; cursor pages, no unsupported server search. |
| 11 | `procurement/index.tsx:153` — purchases → `listSuppliers(limit:100)` | Purchase-order supplier selector | Required lookup: cursor pages, preserve selected supplier. |
| 12 | `procurement/index.tsx:154` — purchases → `listSupplierOffers(limit:100)` | Offer selector filtered client-side by selected supplier | Required lookup: cursor pages; filter only the loaded collection and expose whether more offers remain. Never call this “all offers” until the collection is loaded. |
| 13 | `procurement/index.tsx:254` — receipts → `listPurchaseOrders(limit:100)` | Receipt source purchase-order selector | Required lookup: cursor pages; retain order ID and hydrate with `getPurchaseOrder`. |
| 14 | `inbox/index.tsx:59` — conversation → `listMessages(cursor, limit:100)` | One history page; UI002 already owns an independent opaque message cursor | Intentional page size. Keep cursor/message identity separate from the conversation list; do not load the entire history at once. |
| 15 | `inbox/index.tsx:156` — sales helper → `listProducts(limit:100)` | Context preview for suggested product information | Bounded preview; label maximum/sample scope and link to the full catalog. |
| 16 | `inbox/index.tsx:157` — sales helper → `listStockSnapshots(limit:100)` | Context preview for availability | Bounded preview; label maximum/sample scope and link to inventory. |
| 17 | `customers/index.tsx:43` — customer profile → `listShipments(limit:100)` | Shipment preview client-filtered against the latest 10 customer orders | Keep bounded; state the 10-order/100-shipment scope and provide a route to the full shipment list. Do not claim it is the customer's complete shipment history. |
| 18 | `notifications/index.tsx:42` — devices → `listDevices(limit:100)` | Devices `DataTable` plus active-Telegram capability check | Cursor-aware loaded collection; display more-page control and avoid treating unvisited pages as proof no Telegram device exists. |
| 19 | `notifications/index.tsx:44` — notification recipients → `listMembers(limit:100)` | Primary/fallback multi-select | Required lookup: cursor pages; preserve existing selected user IDs even before their member page is loaded. |
| 20 | `knowledge/index.tsx:22` — knowledge source panel → `listProducts(limit:100)` | Product source preview | Bounded preview; disclose maximum and link to full catalog. |
| 21 | `knowledge/index.tsx:23` — knowledge source panel → `listStockSnapshots(limit:100)` | Inventory source preview | Bounded preview; disclose maximum and link to inventory. |

**Initial classification:** 12 choices/related-resource lookups require cursor-complete access; 3 collection tables need an explicit cursor control (offers, rules, devices); messages already use a cursor page; 5 deliberately bounded previews must disclose their scope and link to a full route. This is a role count, not 21 unique operations: several operations are called from more than one surface.

## Current-worktree source fingerprints

| File | SHA256 |
|---|---|
| `apps/web/src/modules/catalog/index.tsx` | `5D787EB256C13C741FC28539282C763EBC086E0599AF30A8C64AC791267A5733` |
| `apps/web/src/modules/customers/index.tsx` | `909A3195C2068F7B59F4AB26AA6B4E866BF67BE3A39330A5990A8DD291C7FF01` |
| `apps/web/src/modules/fulfillment/index.tsx` | `AB3B1A3DF7E98B7C53787A7E96E7E2B08813425BECCF2F810C02657EFAC2F512` |
| `apps/web/src/modules/inbox/index.tsx` | `EC8F63F9C9C6926CDF7DF750820697D5C47552217963B79092E8CE399D7B7508` |
| `apps/web/src/modules/knowledge/index.tsx` | `D1A6739E8C8BB70F02912E06D4C353A5E517CF0655C1221A8C816E1D013AE657` |
| `apps/web/src/modules/notifications/index.tsx` | `35ABA2AAF1FCEED62E519252C512066905CAB9BFD0D6B255FEEF656134721F1F` |
| `apps/web/src/modules/operations/index.tsx` | `556AE2D777C9F54342BE71C69CFBBE6E2CF8339CB9B941C8DBDD54A032BFCDA5` |
| `apps/web/src/modules/orders/index.tsx` | `2E846FD1B2211D361F37C51B81E095946CEB8C0AC9A690D3332EC2E2AA06B7F4` |
| `apps/web/src/modules/procurement/index.tsx` | `57D24B82D9BA6085E5B83BE3C81179B5F54C15F3AE5CCA15EFFEC8DB0DFF802A` |
| `apps/web/src/modules/workspace/index.tsx` | `160C97CD762AC81F07A2D2FEF446A83E23FF438F0210F36B95509FDF3E718111` |
| `botsales-kit/contracts/openapi.json` | `D88A70957A9DE36402FF5AC0CB757A2F1C496519C7E1FD2E28DF17E867F78C7C` |

This file is the pre-implementation source inventory for UI006. Refresh the fingerprints and decision rows only after the corresponding UI and architectural changes are verified.
