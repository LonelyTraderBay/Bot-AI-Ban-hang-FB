# UI028.W15 — finance pre-spacing design contract, 05/10/2026

## Provenance and scope

- W item: UI028.W15, C03, dependency W09; routes R20/R21/R22/R48/R49/R50 only.
- Owner source: `apps/web/src/modules/finance/index.tsx`; existing mock adapter: `apps/web/src/mocks/finance.ts`.
- Checked-out source SHA-256 before W15 spacing edits: `db3120bf89a38a219e31b9377ba64e30d5444466370821e21c94ca1ded159c8f`.
- The finance source already had staged and unstaged changes at W15 intake. The W15 baseline records this exact checkout for a spacing-only delta; it does not claim a baseline before those pre-existing edits.
- Canonical input hashes: route manifest `360871c008fac723cfc77dec79417838d24d4fae844452909eb347ec8893f2b2`; OpenAPI `d88a70957a9de36402ff5ac0cb757a2f1c496519c7e1fd2e28df17e867f78c7c`; UX contract `da010abf3cf9ba37fd3ad9f7ee3ee201adf985d8a84c3fef2ff7469b5d2e72f2`; mock adapter `c23c40cd46254f122efcb88dcd4d58cc55de7b8bb17b9688defe090f4d06e01d`.
- Required dependencies remain existing `layoutSx`, `PageHeader`, `Panel`, `Stats`, `Toolbar`, `DataTable`, `Pager`, `Status`, `DetailLine`, `QueryState`, `EditDialog`, `ConfirmDialog`, `MutationButton`, `LookupLoadMore`, token/theme and route mock flow. W15 adds no route, operation, permission, API or backend behavior. Before using a consumer, add two typed token-derived semantic roles to the existing bridge because no current role expresses these relationships: `form.pairedFields` (8px inline gap plus 12px block separation for paired monetary controls) and `report.subheadingAfterGap` (8px between a report subheading and its sourced detail content). Both are general content relationships; they do not create a new scale or local consumer values.

## Canonical route/operation contract

| ID / route | Reads and actions | UI invariants to preserve |
|---|---|---|
| R20 `/s/:shopId/finance` | `getCashflow` (`finance.read`) | Half-open `[from,to)` range in active shop timezone; receipts/disbursements/net cash/asOf/warnings; cash is not revenue or profit; zero differs from null; negative cashflow is not automatically a loss. |
| R21 `/s/:shopId/finance/entries` | `listFinanceEntries`, `getFinanceEntry`, `getCommand`; create/update/post/reverse finance entry (`finance.post`) | Draft is editable with version; posted entry is immutable; post/reverse require explicit intent, version and reason; non-positive/invalid precision is rejected; capital, loan principal and inventory purchase are not silently reclassified as operating expense. |
| R22 `/s/:shopId/finance/profit-loss` | `getProfitLoss` (`finance.read`) | Server aggregate and approved policy/asOf are shown; null/unknown remains unknown; provisional completeness/warnings remain visible; do not recompute from the current list or imply statutory tax/accounting certification. |
| R48 `/s/:shopId/finance/journals` | `listJournals`, `getJournal`; create/post/reverse journal (`finance.post`) | Exact decimal debit/credit balance; source identity is unique; closed period blocks creation/post; posted is immutable; reversal needs a reason and links to original; do not infer dispatch means delivery or double-book COD fees. |
| R49 `/s/:shopId/finance/reconciliation` | `listReconciliationCases`, `listBankTransactions`, `listCODSettlements`; import and match operations (`finance.reconcile`) | Import mapping is deterministic and deduplicated; partial row errors stay visible; match suggestions require review; bank/COD/case cursors stay separate; COD gross equals bank remittance plus evidenced fees; partial allocation retains remainder and debt identity; images are not payment confirmation. |
| R50 `/s/:shopId/finance/debts-periods` | `listDebtItems`, `listAccountingPeriods`; close/reopen accounting period (`finance.close`) | AP/AR direction, currency, outstanding value, due date and disputes stay distinct; unresolved conditions block close; locked periods block backdated posting; reopen requires matching approval and reason; never synthesize an approval or clear a blocker in the UI. |

All six routes retain loading, empty, error, forbidden, stale/offline, success, command-unknown and capability-unavailable states where their canonical route contract declares them. UI state and report dates remain scoped to the active shop and its timezone. Local mock-only explanation remains visibly synthetic and read-only.

## Layout contract and baseline plan

- Page gutter belongs to the shell. Shared surface, report-range fields, nested journal lines, reconciliation forms, table actions and dialogs each keep a single semantic spacing owner.
- Reuse current semantic roles by content relationship: `pageHeader.afterGap`, `form.fieldGap`, `form.inlineGap`, `surface.inset`, `surface.sectionBefore`, `notice.afterGap`, `actions.inlineGap`, `dialog.actionsGap`, plus the two typed bridge roles above. Keep the canonical token scale and avoid consumer-local factors.
- Preserve dense money/date tables, long IDs and descriptions, text zoom, wrapping, action target size, cursor/pagination, keyboard focus, dialog dirty-state guard, permission gating and independent AP/AR/bank/COD states.
- Capture before any W15 source edit: all six route summaries, bank/COD/case tabs, and representative draft/journal/import/period dialogs at 390×844 and 1280×900. Record exact source SHA, browser, mock seed/mode, page/dialog geometry, errors and write requests. Test responsive boundaries at 320/390/768/1280/1440.
- Route source IDs and feature behavior are cross-checked with `tests/fe015-source-map.test.mjs`, `tests/fe015.spec.ts`, the route manifest, OpenAPI and UX contract. A missing live capability remains a truthful Frontend-only gap; do not invent it.
