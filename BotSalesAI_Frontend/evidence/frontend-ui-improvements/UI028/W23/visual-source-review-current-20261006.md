# UI028.W23 Dashboard — visual/source review

Date: 2026-10-06  
Scope: R04 `/s/:shopId/overview`, spacing and inset ownership only.  
Profile source: Dashboard/report row in SPC-048 §13.3; no same-profile migrated route existed before W23.

## Verdict

**UI: PASS for W23 spacing/layout scope. ARCH: PASS_WITH_KNOWN_GLOBAL_MIGRATION_DEBT.** The local synthetic demo preserves the dashboard route, data/state meaning, permissions, links, and actions. This verdict does not certify the complete UI028 plan, live integrations, production, hosted CI, screen-reader behavior, or owner acceptance.

## Source review

| Source | Properties/roles reviewed | Result |
|---|---|---|
| `apps/web/src/modules/dashboard/index.tsx` | Hero inset and bottom gap; title/helper flow; hero/action and panel-grid gaps; CTA inline inset/target; finance metric grouping; permission-state Panel body inset; DataTable code/control gap; team-grid/card inset; bot controls; warning/as-of footer flow | `PASS`: 36 source findings removed, 0 dashboard spacing findings remain, and no route-local spacing map/literal was added. |
| `apps/web/src/shared/ui/layout.ts` | `dashboard.groupInset`, `sectionGap`, `heroTitleFlow`, `heroDescriptionGap`, `actionTarget`, `metricValueGap`, `footerFlow`; MUI values derive from canonical spacing tokens; CTA minimum uses `tokens.layout.touchTarget` | `PASS`: roles are typed at the shared bridge and applied by the Dashboard consumer. |
| `apps/web/src/shared/ui/components.tsx` | `Panel.bodyMode`, `Stats`/`Stat`, `DataTable`, `CopyableCode`, `Status` | `PASS`: shared component contracts were reused without modification; each titled body has one inset owner. |
| Design/token and behavior sources | `design/tokens.json`, generated tokens, route manifest R04, OpenAPI `getDashboard`/`pauseBot`, `UX-CONTRACT.md` | Canonical inputs stayed unchanged. W23 added no token, API, route, permission, field, state, or external action. |

Pre-existing typography/color/radius details in Dashboard were not changed by this spacing task; W23 does not close the separate visual-token audit assigned to W26/W27.

## Paired render review

Final before/after artifacts are `render-before-spacing-current-20261006.json` and `render-after-spacing-current-20261006.json`, with PNG pairs for `owner` and `viewer-no-finance` at 390×844 and 1280×900. Same route, fixture family, browser, role, and viewport were used. All eight observations have `scrollWidth === clientWidth`, 0 page errors, and 0 product-route writes. Dashboard KPI labels, shop/as-of text, table, role/status cards, bot controls, and navigation affordances remain present in the appropriate permission state.

- The responsive hero retains its 24px mobile / 32px tablet-and-desktop group inset. Its action group follows the shared spacing role and both available owner actions meet the 44px minimum target.
- The title-to-helper and section cadence now use typed semantic roles. The four Stats cards retain their shared `Stats`/`Stat` ownership.
- Finance, AI team, and bot panels use `Panel.bodyMode="inset"`; this removes duplicate top/content padding while preserving the 16px mobile / 24px desktop panel edge. Orders stays flush when it renders the table; its unavailable-permission notice uses the inset body contract.
- AI role cards keep their status Chips at intrinsic width. The first after-render candidate stretched each Chip across its card; visual review caught this. W23 corrected the card Stack cross-axis alignment and reran the paired capture. The first candidate is preserved as `diagnostic-pre-review-*` and is excluded from final verdicts.
- At desktop, the existing finance panel occupies the first column while its right grid track remains empty. This was present before W23 and is preserved under the design contract’s “keep existing desktop geometry” invariant; it is a separate composition/geometry follow-up, not a spacing regression.
- Viewer keeps the finance notice and never shows the revenue/cash values or profit link; `asOf`, orders read affordances, and role-gated panels remain truthful.

## Executed checks

- Layout source comparison: 102→66 global findings; Dashboard 36→0; 36 removed, 0 added, 0 identity/count changes outside Dashboard. Remaining findings are W24 Inbox (46) and W25 Reports (20). The full strict gate is still **FAIL** as expected.
- `tests/ui-dashboard-layout.spec.ts`, FE021 dashboard permission case, and UI012 dashboard CTA keyboard case: 6/6 across Chromium and Firefox; widths 320/390/768/1280/1440, KPI presence, page overflow, CTA target, and non-stretched team status Chip.
- Vitest: 10 files / 88 tests passed. Domain/network: 88/88. Generator freshness: 11 outputs / 283 schemas / 210 operations / 54 routes. Source checker: 66 files / 220 operation references / 54 routes; its fixtures 3/3. Boundaries: 454 imports / 10/10 negative fixtures. ESLint and TypeScript passed. Production and demo Vite builds passed (2056 modules). Layout fixtures passed 9/9.
- `npm.cmd run verify` ran with a bounded PATH and completed generator, source/fixtures, boundaries, lint, typecheck, domain/network, Vitest, production build, and all 9 layout fixtures; it exited 1 only at the final strict scan with 66 findings assigned to W24/W25. The standalone `npm.cmd run test:layout` has the same expected final-gate result. An initial unbounded-path attempt could not resolve `node`; the successful bounded-PATH logs are preserved. A broader FE021/UI012 suite was interrupted during an unrelated Firefox report/export case after the Dashboard tests passed; the final focused Dashboard suite above was rerun to completion. The interrupted run is diagnostic only.

## Evidence index

- Pre-spacing contract and hashes: `design-contract-pre-spacing-current-20261006.md`
- Baseline/final source reports: `layout-before-spacing-current-20261006.json`, `layout-after-spacing-current-20261006.json`
- Paired state/viewport captures: `render-before-spacing-current-20261006.json`, `render-after-spacing-current-20261006.json`
- Multiplicity-aware delta: `layout-delta-current-20261006.json`
- Focused browser results: `dashboard-focused-e2e-current-20261006.log`
- Ordered/local check logs: `full-verify-bounded-path-current-20261006.log`, `generate-check-final-current-20261006.log`, `source-check-final-current-20261006.log`, `boundaries-final-current-20261006.log`, `lint-current-20261006.log`, `typecheck-current-20261006.log`, `domain-network-current-20261006.log`, `unit-current-20261006.log`, `builds-current-20261006.log`, `test-layout-bounded-path-current-20261006.log`; final 6/6 targeted suite: `dashboard-focused-final-e2e-current-20261006.log`
