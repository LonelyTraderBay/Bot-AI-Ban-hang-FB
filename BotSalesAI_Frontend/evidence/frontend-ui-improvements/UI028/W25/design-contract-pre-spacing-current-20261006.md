# UI028.W25 — Reports design contract, pre-source edit

**Phase:** `PRE_SOURCE_EDIT` · **Date:** 2026-10-06 · **Revision:** `e68cb65e61c5c1aab2ae169dd8033df305df8872` · **Scope:** Frontend React/TypeScript + synthetic MSW only.

## Route and behavior contract

| Route | Canonical read/action scope | Invariants to preserve |
|---|---|---|
| R31 `/s/:shopId/reports` — Báo cáo & xuất dữ liệu | `reports.read`: `getReportSummary`; `jobs.read`: `listJobs`; export: `createExport` requires `reports.export` plus the selected source permission (`inventory.read`, `orders.read`, or `finance.read`). Sources: `route-manifest.json`, OpenAPI, `UX-CONTRACT.md`. | Keep report type/date filters bookmarkable in query params; shop-local date boundaries; selected dates on validation/conflict/unknown; current snapshot/as-of; permission-gated source types; export status from job API; download only for succeeded, same-origin authorized URL; jobs cursor/list rows; no invented summaries or aggregation from the current page. |
| R53 `/s/:shopId/reports/marketing` — Thông tin hỗ trợ marketing | `reports.read`: `getMarketingSummary`; no UI action/mutation on this route. Sources: `route-manifest.json`, OpenAPI, `UX-CONTRACT.md`. | Preserve `asOf`, shop/timezone labels, question and lost-sale reasons from API, chart/table data parity, actual vs estimated spend separation, empty/missing-series explanation, and no date filter because the API has none. Do not publish content, change budget, or claim attributed data the API does not provide. |

Capture states are R31 default export form + recent jobs and R53 marketing summary + questions/lost-reason chart/table, each at 390×844 and 1280×900. Capture is read-only and must issue no non-GET product API request. Existing FE021/UI011/UI013 cases remain the behavior authority for export permissions, date semantics, failures, empty responses and URL state.

## Profile and references

- R31 is a composed **form/settings + collection/table + detail/job** profile from `FRONTEND_SPACING_STANDARD.md` §13.3: export controls, then recent job rows/pager, with job-status and download affordances. No single migrated route was established as the same combined composition. Use those named semantic profiles for each slot; do not use R53 marketing just because it belongs to the same module.
- R53 uses the **Dashboard/report** profile in §13.3. R04 `/s/:shopId/overview` is the migrated reference for PageHeader, Stats and grouped report panels, proved by [W23 visual/source review](../W23/visual-source-review-current-20261006.md), [R04 after captures](../W23/render-after-spacing-current-20261006.json) and the R04 source. R04 has no Recharts chart; preserve R53's actual API-driven chart composition and inspect its axes/ticks/plot bounds directly instead of copying non-existent legend geometry.
- The existing marketing UI has no explicit `Legend` component. The term “legend” in W25 covers explanation/labels for the graph and its adjacent API-backed table; do not add a new chart control/data series unless current source and API evidence justify it.

## Spacing and geometry ownership

Use only the current shared roles: `pageHeader.*`, `grid.gutter`, `surface.*`, `form.*`, `stats.*`, `actions.*`, `table.*`, `pager.*`, and `report.*`. In particular, preserve the question list's 40px text/marker inset as **24px surface inset + 16px marker indent** through two explicit semantic owners; do not round to 32px or encode a local `pl: 5` literal. Keep chart viewport height, Recharts axis/tick coordinates, data domain, bar dimensions, table row values, query state, and two-column breakpoint behavior under their existing geometry/behavior owners. This task normalizes spacing; it does not redesign typography, colors, chart metrics or information hierarchy.

| Region | Intended role / invariant |
|---|---|
| Page header, feature grid and R31 form/jobs stack | `pageHeader.afterGap`, `grid.gutter`, `surface.contentGap`; one owner per boundary and canonical 24px grid gutter. |
| R31 export form and two date filters | `surface.bodyInsetAfterHeader`, `form.fieldGap`, `form.inlineGap`, `detail.*`, `actions.*`; 16/24 responsive panel edge, fields16, paired controls8; preserve date/timezone/snapshot and all warnings. |
| R31 recent job list/table/pager | Reuse `DataTable`, `table.*`, `pager.*`, `surface.*`; preserve current row limit10, cursor, status/progress values and link semantics. |
| R53 metric cards, grouped panels, marketing note | `stats.*`, `grid.gutter`, `report.sectionGap`, `surface.*`, `report.subheadingAfterGap`; preserve `asOf` and null-vs-estimated values. |
| R53 question list and chart/table | `report.listSurfaceInset` + `report.listMarkerInset` compose 24+16; `report.*` for local report spacing; chart geometry and text alternative/table remain unchanged. |

Any missing semantic role must be added in the shared typed bridge and documented in `FRONTEND_SPACING_STANDARD.md` before consumer use, with units, owner, consumer impact and computed-style regression. Do not create module-local spacing scales or exceptions.

## Pre-edit baseline and close criteria

`baseline-manifest-current-20261006.json`, `layout-before-spacing-current-2026-10-06.json`, and `render-before-current-2026-10-06.json` record the current staged Reports source as captured in the working tree before edits. The global strict report is expected to be FAIL with 20 W25 findings after W24; this is the W25 owner baseline, not a passing gate. Keep existing staged content intact and make any W25 source change unstaged.

- W25's final owner finding count is zero, with no new findings in Reports or outside the W25 owner boundary; do not reduce strict thresholds or suppress findings.
- Paired R31/R53 captures use the same state, route, viewport and browser before/after; page does not overflow; export form/jobs/chart/table remain present; no unexpected writes, API errors or page errors.
- Verify actual computed spacing, preserve the named 40px list inset as 24+16, and compare chart axes/ticks/plot bounds without rounding their coordinates.
- Run source/boundary/type/lint/generator, layout fixtures, FE021/UI011/UI013 and relevant Chromium/Firefox report regressions, production/demo builds and production mock isolation. Report the strict global result honestly.
- Record UI and ARCH verdicts separately. Do not modify FE/full-product ledgers or owner acceptance.
