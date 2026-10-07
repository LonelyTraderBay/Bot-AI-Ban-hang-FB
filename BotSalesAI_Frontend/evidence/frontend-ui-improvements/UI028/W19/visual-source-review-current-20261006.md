# W19 Integrations — visual source review

Date: 2026-10-06  
Scope: React Frontend with synthetic in-memory API; routes R29/R30.  
Verdict: `PASS_FOR_W19_SPACING_DELTA`; this is not a broad accessibility, backend, provider, hosted-CI, staging, production, screen-reader, or owner-acceptance verdict.

## Source review

The changed owner is `apps/web/src/modules/integrations/index.tsx` (pre-edit SHA-256 `de8a8c8407b80792e2b8c3b25d5a31dc8239a99654f3df254f2685e9a4d2f44b`; reviewed SHA-256 `824d9e3c0a656b0ce7ebef6942b4f3c3c699bb73cca47601a5950db31b1374a1`). Channel cards, provider cards, empty-state notices, action groups, responsive provider grid, and credential form now select shared `layoutSx` roles. Panel owns body inset after the matching consumer padding was removed. No new shared role, token, local spacing map, exception, or generated contract was added.

The UI/architecture change is limited to spacing ownership and presentation. R29 OAuth remains synthetic in demo mode; connect/disconnect/channel status and reason rules are unchanged. R30 still uses the canonical provider catalog and write-only credential contract; only synthetic `demo-` credentials are accepted in demo mode, and the form clears its value. Existing FE019 route/schema/mock-boundary and credential handling tests passed in both browsers.

## Paired render review

The before/after artifacts each contain 12 Chromium observations: R29 seeded channel card, disconnect confirmation, and synthetic empty state; R30 provider list, edit-secret dialog, and create-secret dialog at 390×844 and 1280×900. Route, state, order, and viewport match. The inspected mobile and desktop screenshots preserve the card hierarchy, capability rows, wrapped demo notice, form helper text, and action grouping.

There were no page errors, writes, or horizontal overflow in either capture set. All six after-state dialogs stayed in bounds: 326 px wide at 390 px and 768 px at 1280 px. Captures use only local synthetic MSW; they do not start OAuth, send customer messages, or contact an AI provider.

Artifacts: [paired delta](layout-delta-current-20261006.json), [before render data](render-before-spacing-current-20261006.json), [after render data](render-after-spacing-current-20261006.json), and paired `before-*`/`after-*` PNGs. This review covers the captured states only; it does not claim contrast, screen-reader, or full route-matrix certification.

## Automated evidence

- Integrations spacing findings: 13 before, 0 after; 13 occurrences removed, 0 added; whole-source total 207→194; no identity/count changes outside Integrations.
- Targeted Playwright: 38/38, Chromium 19/19 and Firefox 19/19. Covers FE019 route/operation/schema/mock constraints and write-only synthetic credential behavior, UI008 route empty/loading/error/forbidden behavior, plus R29/R30 responsive routes at 320/390/768/1280/1440 px and disconnect/create/edit dialogs at 320/390/1280 px.
- Layout checker fixtures: 9/9. Generate 11/283/210/54; source checker 66 files/220 operation references/54 routes and fixtures 3/3; boundaries 450 imports/10 negative fixtures; lint, typecheck, domain/network 88/88, Vitest 88/88, and production build 2056 modules passed.
- Full `verify` exited 1 only at the final strict source scan: 194 known findings remain for W20–W25. The checker threshold is unchanged and the workspace-wide spacing gate is not PASS yet.
