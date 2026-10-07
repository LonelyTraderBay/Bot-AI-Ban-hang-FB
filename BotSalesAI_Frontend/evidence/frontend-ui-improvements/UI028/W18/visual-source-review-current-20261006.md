# W18 Bot — visual source review

Date: 2026-10-06  
Scope: React Frontend with synthetic in-memory API; routes R26/R27/R28/R51.  
Verdict: `PASS_FOR_W18_SPACING_DELTA`; this is not a broad accessibility, backend, hosted-CI, staging, production, screen-reader, or owner-acceptance verdict.

## Source review

The changed owner is `apps/web/src/modules/bot/index.tsx` (baseline SHA-256 `c7336421c40188823de27438a11d282a5e88980a815fe8729cef5a3fe34aa57c`; reviewed SHA-256 `e5148341c5e95c1b3e8b5c61555d02738a24e307d27910b70820740feff72297`). Existing page, surface, form, grid, notice, code-chip, and action spacing now resolve through shared `layoutSx` roles; Panel owns its body inset where the equivalent consumer padding was removed. No new role, token, local spacing map, or exception was introduced.

The reviewed source change is confined to spacing ownership/presentation. R26 draft/version and human order-confirmation rules, R27 synthetic-only playground behavior, R28 revision-bound synthetic evaluations, and R51 role/budget/provider-failover semantics remain contract-bound. FE018 source-map tests pass 2/2; the browser suite separately exercises these route behaviors. The canonical contract gap for R51 `updateBudgetPolicy` remains explicitly mapped to `operations.manage`; no API or permission was invented.

## Paired render review

The before/after artifacts each contain 18 Chromium observations: R26 configuration/editor dialog; R27 empty/result; R28 evaluation list/dialog; and R51 team, role-assignment, and budget-approval states at 390×844 and 1280×900. Route, state, order, and viewport match. Reviewed mobile and desktop captures retain readable grouping, action placement, wrapped policy text, and dialog content without introducing horizontal page overflow.

All 18 dialogs/states with measured documents had `scrollWidth === clientWidth`; all captured dialogs remained within their viewport. R26 editor dialog measured 326×678 at 390 px and 768×694 at 1280 px; the other R28/R51 dialogs were also in-bounds. There were no page errors. Each run made two POSTs only to local synthetic `/api/v2/shops/shop-demo/bot/playground` to render the R27 result; no provider call, customer message, or external effect occurred.

Artifacts: [paired delta](layout-delta-current-20261006.json), [before render data](render-before-spacing-current-20261006.json), [after render data](render-after-spacing-current-20261006.json), and paired `before-*`/`after-*` PNGs. This review covers the captured states only; it does not claim contrast, screen-reader, or full route-matrix certification.

## Automated evidence

- Bot spacing findings: 25 before, 0 after; 25 occurrences removed, 0 added; whole-source total 232→207; no finding identity/count changes outside Bot.
- Route viewport and dialog bounds: 30/30 Playwright tests across Chromium 15/15 and Firefox 15/15; routes at 320/390/768/1280/1440 px and dialogs at 320/390/1280 px.
- Layout checker fixtures: 9/9; FE018 canonical source-map tests: 2/2.
- Generate 11/283/210/54; source checker 66 files/220 operation references/54 routes and fixtures 3/3; boundaries 449 imports/10 negative fixtures; lint, typecheck, domain/network 88/88, Vitest 88/88, and production build 2056 modules passed.
- Full `verify` exited 1 only at its final strict source scan: 207 known findings remain for W19–W25. No rule was weakened; the workspace-wide gate is not PASS yet.
