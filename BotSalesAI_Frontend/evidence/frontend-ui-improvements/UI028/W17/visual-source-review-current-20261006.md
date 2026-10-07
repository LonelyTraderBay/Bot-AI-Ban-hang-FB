# W17 Knowledge — visual source review

Date: 2026-10-06  
Scope: Frontend React with the synthetic in-memory API; routes R23/R24/R25.  
Verdict: `PASS_FOR_W17_SPACING_DELTA`; this is not a broad accessibility, backend, hosted-CI, staging, production, or owner-acceptance verdict.

## Source review

The changed owner is `apps/web/src/modules/knowledge/index.tsx` (after SHA-256 `27a2135f2759c232a00b107efae8a947896ef8dee765c8186f117395bdbcd84d`). Its spacing now comes from the shared `layoutSx` semantic bridge: page section gap/before, surface content gap/inset, form field gap, notice content/after gap, and action inline/related-link gap. Panels own the content inset through `bodyMode="inset"`; the consumer no longer adds a competing padding value. The shared bridge additions `surface.contentGap` and `actions.relatedLinksGap` resolve to the canonical `factor.md` scale.

Review found no local spacing map, raw spacing value, visual-token expansion, behavior/API/permission change, or module-boundary change in this migration. Knowledge upload, immutable published revisions, draft-only restore, exact evaluated-revision publish requirements, redacted feedback correction, and the no-auto-training/publish behavior remain as before. The source map and synthetic behavior are separately covered by `node --test tests/fe017-source-map.test.mjs` (4/4) and the FE017/FE027 targeted browser regression (see verification record).

## Paired render review

The before/after artifacts each contain 12 Chromium observations: R23 collection/create dialog, R24 draft detail/edit dialog, and R25 feedback list/review dialog at 390×844 and 1280×900. The viewport, route, seed/state, and state intent match. The after artifact identifies the reviewed source hash. No page errors or writes occurred during either captured set; two synthetic feedback setup writes are recorded separately for each run and are not part of the captured review interactions.

At both captured widths, all three dialogs remained inside the viewport. The 390 px dialogs measured 326 px wide; the 1280 px dialogs measured 768 px wide. `scrollWidth` equaled `clientWidth` in all 12 after observations, so no horizontal overflow was observed. Long content remains vertically scrollable on R23/R24; the R25 review list/dialog fit the measured document height. Visual hierarchy and form/action grouping were retained in the inspected screenshots; no spacing migration required shrinking text or hiding overflow.

Artifacts: [paired delta](layout-delta-current-20261006.json), [before render data](render-before-spacing-current-20261006.json), [after render data](render-after-spacing-current-20261006.json), and paired `before-*`/`after-*` PNGs in this directory. This review covers the captured states only; it does not claim contrast, screen-reader, or full route-matrix certification.

## Automated evidence

- Knowledge spacing findings: 19 before, 0 after; 19 occurrences removed, 0 added.
- Whole-source spacing findings: 251 before, 232 after; no finding identity/count change outside Knowledge.
- Route boundary and dialog geometry checks: 24/24 Playwright tests across Chromium and Firefox; responsive route boundaries at 320/390/768/1280/1440 px and dialogs at 320/390/1280 px.
- Layout checker fixtures: 9/9; FE017 contract source-map tests: 4/4; FE017 and FE027 targeted behavior suite: 24/24.
- `npm.cmd run verify` wrapper needs the host PATH trimmed for nested command lookup. The first untrimmed attempt is preserved separately; a retry is running through the locked npm CLI with only the host's excessively long PATH pruned. Its final strict spacing scan is expected to remain red for W18–W25 and will be recorded without weakening the gate.
