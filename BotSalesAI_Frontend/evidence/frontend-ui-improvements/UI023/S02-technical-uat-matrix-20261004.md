# UI023/S02 — technical UAT result matrix

**Date:** 2026-10-04 · **Source:** current React demo build and synthetic MSW data · **Browsers:** Playwright Chromium `153.0.8010.12`, Firefox `155.0` · **Result:** 146/146 PASS (73 per browser), exit 0.

The [S01 run log](S01-technical-uat-chromium-firefox-20261004.log) ran 13 focused spec files. It exercised the four cross-module journeys and current edge cases on both browser engines. Each Playwright test uses an isolated browser context with mock state; observed HTTP response codes and resulting data are local simulator results only.

| Journey | Routes and trigger | Expected → observed | Architecture/invariant checked |
|---|---|---|---|
| VS01 Catalog → stock → order → prep | Inventory/product, orders/detail, prep jobs; quote, customer confirmation, reserve, claim, scan and pick | `quote 200`, customer confirmation `200`, order confirmation `202`, prep claim/pick `200`; reserved quantity +1, available −1, picked SKU/order-line IDs remain linked | Catalog product ID, inventory variant, order line and prep-job source identity remain canonical; no optimistic stock decrement. |
| VS02 Procurement → approval → partial receipt | Purchase list/detail, approval, receipt; create draft, approve, send, record supplier acknowledgement and post a two-unit receipt | Purchase draft `201`, approval `200`, send `202`, supplier acknowledgement `200`, receipt draft `201`, receipt posting `202`; stock increases by 2 and payable source points to the receipt | Purchase/order/receipt identity and amount stay linked; receipt posting updates only synthetic inventory/debt state. |
| VS03 Finance → reconciliation → debt allocation | Finance/reconciliation; import one CSV transaction and allocate 50,000 VND | Import `200`, match `202`; imported bank transaction remains identifiable, match state is `suggested`, outstanding debt decreases by exactly 50,000 VND | Bank transaction, reconciliation case and debt are separate resources; partial allocation does not over-clear the debt. |
| VS04 Inbox → feedback → knowledge draft → bot evaluation | Conversation, feedback review, knowledge detail, bot evaluation; submit response feedback, approve a sanitized draft, evaluate the exact revision | Feedback `201` / pending, review creates approved feedback plus a knowledge draft, evaluation returns `passed` with `mockOnly=true` and the same knowledge revision ID | Feedback, knowledge draft/revision and evaluation IDs remain traceable; evaluation does not claim provider or production behavior. |

| Cross-cut case | Evidence in S01 | Expected → observed |
|---|---|---|
| Category collection beyond the first 100 | FE010/UI005 full category lookup | 105 synthetic categories loaded; last category selectable for product creation; selected category retained during edit/search/retry. |
| Evaluation paging and recovery | FE018/UI004 | 25 records traverse pages of 20 and 5; 105 records traverse six pages, all 105 unique and oldest reachable; failed cursor is retained and retry succeeds without fabricated rows. |
| Secondary query and access states | UI007 | Customer profile remains available while order query independently loads; 503 retry affects only the failing query; 403, empty and success states remain distinct. |
| Unknown, conflict and offline commands | FE011, FE012 | Draft remains available on conflict/offline; unknown adjustment/confirmation blocks duplicate submission pending reconciliation; no false success is shown. |
| Shop and permission boundaries | UI009, UI021, FE011 | Delayed old-shop results do not leak into the new profile; another shop's stock remains hidden; destination links depend on the canonical destination permission. |
| Draft, URL and local time | UI010, UI011, UI013 | Discarded reason is cleared before reopening; date defaults/instants use the shop calendar/timezone; URL refresh/Back restores selected filters and invalid cursor state is dropped. |

**Paired outcome:** `UI: PASS` for these technical journeys and edge cases on the declared mock scope. `ARCH: PASS` for identity, query ownership, permission/scope, cursor, date and revision invariants asserted by the existing route/spec tests. No backend, provider, external account or persistent production write was contacted.

**Acceptance boundary:** this is AI-run technical UAT, not the user's final acceptance. The completed review package is marked `READY_FOR_ACCEPTANCE` in UI024; the user decision remains pending until that package is reviewed.
