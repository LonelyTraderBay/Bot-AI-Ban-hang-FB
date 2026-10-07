# UI028.W10 — Catalog design contract before source changes

**Captured:** 05/10/2026 · **Owner:** catalog module · **Routes:** R09–R14 · **Source owner:** `apps/web/src/modules/catalog/index.tsx`, `apps/web/src/modules/catalog/imports.tsx` · **Policy:** SPC-033, SPC-035–045.

## UI objective and layout ownership

Keep catalog pages readable and dense without changing the approved product/category/import flows. The Shell owns viewport gutter; `PageHeader` owns the title/action grouping and following section gap; `Panel` owns surface boundary and its responsive inset; shared `Toolbar`, `DataTable`, `Pager`, `DetailLine`, `QueryState` and dialogs own their established slots. Catalog composes those roles and must not add a second full-page inset or create a local spacing map.

Use canonical semantic roles already exported by `apps/web/src/shared/ui/layout.ts`: `page.gutter`, `pageHeader.*`, `surface.*`, `form.*`, `field.hintGap`, `actions.*`, `grid.gutter`, `lookup.loadMoreRow`, `table.*`, `pager.*`, `detail.*`, `notice.*`, and `dialog.*`. Add a shared role only if inspection proves an existing role cannot express the required relationship; record consumer impact and use token-derived factors in the shared bridge. Keep canonical typography, theme variants, radii, and colors.

## Route/profile contract

| Route | Profile and owner | Intended reading/interaction |
|---|---|---|
| R09 `/s/:shopId/products` | Catalog collection; Shell gutter, PageHeader, flush table Panel, Toolbar/Pager slots | Search/filter/category lookup and server cursor; row opens R11, primary action opens R10; preserve URL filters and permissions. |
| R10 `/s/:shopId/products/new` | Product form; PageHeader then grouped inset form Panels | Product identity/category/status, variants/prices, images and validation; field gap16, form groups24, inline fields8 where the existing form contract applies; keep dirty draft and server field errors. |
| R11 `/s/:shopId/products/:productId` | Product edit form, same profile as R10 | Preserve version/ETag, existing variant history, image upload and archive confirmation; category fallback/error and dirty state remain visible. |
| R12 `/s/:shopId/categories` | Catalog collection and bounded category editor dialog | Search, parent selection, create/edit/archive impact and cursor; dialog content/actions use shared dialog roles and retain focus/draft. |
| R13 `/s/:shopId/imports` | Import form + recent-job collection | File → column mapping → dry-run; preserve selected file/mapping/strategy and do not commit implicitly. Keep the warning and sample link legible. |
| R14 `/s/:shopId/imports/:jobId` | Import result/review | Show completed/total/errors and paginated row issues; require explicit confirmation bound to the dry-run validation token; keep partial-success semantics. |

## Breakpoints, states, and geometry

- Representative viewports: 390×844 and 1280×900; use the existing 768/1280 breakpoints, with no feature-local breakpoint.
- Shell owns 16px mobile / 24px tablet-desktop page gutter. Collections remain flush at the table surface; shared table, toolbar and pager inset their own slots. Forms/dialogs use 16px mobile / 24px tablet-desktop surface inset, with no duplicated child top inset after a titled Panel.
- Responsive form columns stack below the existing breakpoint; `minWidth: 0`, long Vietnamese names/SKUs/errors and column mappings may grow/wrap. Table horizontal overflow is limited to the named table region, never the page.
- Preserve loading/empty/error/forbidden/stale, validation, field errors, dirty draft, busy/disabled, upload failure, row-level import errors, commit confirmation, 412/stale-token and partial-success states. Preserve focus/keyboard order and ≥44px interactive targets as required by current shared components/contracts.
- Geometry such as table widths, image preview, icon dimensions and target sizes must be classified separately; do not replace spacing roles with rounding or fixed heights.

## Pre-edit acceptance and evidence contract

1. Capture immutable screenshots/measurements for R09–R14, both viewports, on the current source; R14 is produced by a valid in-memory synthetic CSV dry-run with no commit. Record browser/seed/source hashes/page errors/overflow.
2. Save the current `check-layout --report --json` result. After source edits compare the same finding multiset `(file, property, normalized value, code)`; no new findings in either catalog file, and reduce the findings owned by this W-ID.
3. Run focused catalog component/route/import tests, responsive browser checks for all six routes, typecheck/lint/boundaries/source/generator/build and strict layout scan. Retain a global FAIL if other module migration debt remains.
4. UI verdict covers route layout/readability/state behavior; ARCH verdict covers token provenance, shared ownership, module boundaries, state/contract preservation and the measured layout delta. This local synthetic evidence cannot certify Backend, staging, hosted CI or production.
