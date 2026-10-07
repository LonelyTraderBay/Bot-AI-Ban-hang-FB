# UI013 — URL and cursor state inventory

Date: 2026-10-03. Scope: React frontend with local synthetic MSW; canonical route paths were checked against `botsales-kit/contracts/route-manifest.json`.

## Before change

- The shared `Pager` already read an opaque `page.nextCursor` into `cursor` (or a collection-specific cursor key), preserved unrelated query filters, and used React Router history. Its first-page control clears the selected cursor; browser Back/Forward can restore prior cursor URLs. Existing coverage: `apps/web/tests/components.test.tsx` and the UI004/UI002 browser scenarios in `tests/fe018.spec.ts` and `tests/fe016.spec.ts`.
- Search in the shared `Toolbar` already clears the active list cursor while preserving other query parameters. Existing UI004 coverage checks search reset; UI001/Inbox coverage checks collection cursor ownership and deep-link/refresh behavior.
- Gaps found in the canonical finance routes: Reconciliation selected its bank/COD/case tab only in component state; Cashflow and Profit/Loss date ranges were component-local; Reports report type and export date range were component-local. A refresh or copied URL therefore restored the route but lost these selections.
- No contract, operation, route manifest, API response field, or generated output was needed for these UI-only filters. `useListQuery` is allow-listed, so the new page-state parameters are not forwarded as collection filters.

## Change and invariants

- Reconciliation now serializes the selected tab as `tab=cod` or `tab=cases`; the default bank tab omits `tab`. Unknown tab values safely select the bank tab. Independent collection cursors remain separate query parameters.
- Cashflow and Profit/Loss serialize the shop-local date range as `fromDate` / `toDate`. Editing a range removes the generic stale `cursor`; timezone conversion and the existing `[from, to)` API semantics remain unchanged.
- Reports serializes `reportType`, `fromDate`, and `toDate`. Initial defaults are derived from the API snapshot/shop timezone and written with history replacement; user edits use browser history. Invalid report types and malformed dates fall back to safe defaults. Empty date input remains editable. The jobs-list cursor is retained because it belongs to a separate collection, not the export filters.
- `isValidDateOnly` rejects impossible calendar days before URL state is used. No numeric page index or synthetic total is inferred from an opaque cursor.

## Acceptance cases

The new `tests/ui013-url-state.spec.ts` covers Reconciliation deep link/refresh/Back/invalid tab; Finance deep link/edit/refresh/Back, stale cursor reset and malformed dates; Reports deep link/refresh/Back and malformed filter fallback. Existing UI004 browser evidence covers opaque cursor next/Back/Forward, first-page restoration, unrelated filter preservation, and search cursor reset.

## Implementation and acceptance status — 2026-10-03

- Reconciliation `tab` is now URL-owned; selected tab changes replace the current history entry so browser Back still returns across collection cursor pages. Finance/report filters are URL-owned, validated as real date-only values, and retain shop-local conversion and each operation's inclusive/exclusive boundary.
- Rapid consecutive date edits were added to FE015 regression coverage. React Router search-param navigation now commits synchronously for these fields so a previous transition cannot overwrite the latest input; FE021 ambiguous/stale export tests continue to verify that conflict recovery retains dates.
- Acceptance: targeted 7/7, `npm run verify` PASS (domain/MSW 88/88, Vitest 77/77, production build), full built-demo E2E 186/186. Final logs: UI013/S09, S10 and S11. The initial full run failures and subsequent targeted diagnostics remain as history; final S11 supersedes them.
- Scope stayed in React/TS, tests and evidence. OpenAPI, route manifest, design tokens, generated outputs and frontend/product ledgers were not modified. Backend/provider/staging behavior is not covered.
