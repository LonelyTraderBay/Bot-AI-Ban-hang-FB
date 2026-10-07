# UI012 accessibility inventory — FE-G05

Date: 2026-10-03. Scope: React Frontend with synthetic MSW. C01 records the current automatic evidence and the remaining manual gaps; this inventory does not claim FE-G05 is closed.

## Measured evidence already available

| Area | Current evidence | What it proves | What it does not prove |
|---|---|---|---|
| Whole-page accessibility | The current full built-demo run passed `tests/accessibility/routes.spec.ts`. The test visits all 54 canonical routes, checks the loaded state of every route and the loading state on R04, runs axe tags WCAG 2.1 A/AA, and asserts zero violations and zero page errors. | Automated rule coverage on the current React demo route inventory. | Correct announcements in a screen reader, every interaction state, 200%/400% browser zoom, or every contrast-incomplete result. |
| Keyboard | The route audit tabs to the skip link, activates it, and asserts focus on `main#main-content`. Separate browser cases exercise keyboard/focus return after specific dialogs. | Skip-link operation and those individually asserted dialog interactions. | Full keyboard traversal for each workflow, select/menu/file controls, errors/live regions, data tables, and charts. |
| Responsive proxy | `tests/design/browser-audit.mjs` and the FE027 reflow evidence cover viewport widths including 320, 390, 768 and 1440 CSS px; the documented route matrix says 320 CSS px has no page overflow on 54 routes. | Reflow at those CSS viewport widths and selected dashboard layout behavior. | Actual browser zoom at 200% or 400%; viewport resizing is not browser zoom. |
| Contrast helper | Existing `FE006/S04-contrast-manual.json` reports 76 visible text samples on `/s/shop-demo/overview` at 1440×1000, 0 text failures and a minimum ratio of 6.31:1. | The helper's computed text samples on that route and viewport at the time of that evidence. | Whole-app contrast, icon/focus/status/chart non-text contrast, or a human review. Treat as a dated single-route sample, not a manual gate result. |
| Motion and forced colors | Existing design-browser audit emulates `prefers-reduced-motion` and `forced-colors` on the dashboard and inspects focus outline and scroll behavior. | Selected dashboard behavior under those media preferences. | Broad route/workflow coverage or an actual Windows High Contrast user session. |

## Gaps for C02–C05

| Gap | Criterion / risk | Priority | Evidence needed to close it |
|---|---|---|---|
| Actual browser zoom | WCAG 1.4.4 Resize Text and 1.4.10 Reflow. A 320 CSS px viewport result is not an observation at browser zoom. | P1 / FE-G05 | Record browser/version, real 200% and 400% zoom, actual viewport, target routes, clipping/overlap/horizontal scroll and usable controls. |
| Screen-reader workflow | WCAG 1.3.1, 3.3.1, 4.1.2 and 4.1.3. Automated axe cannot confirm spoken labels, validation context, live status, dialog announcements or reading order. | P1 / FE-G05 | `Narrator.exe` is present on the Windows host and `nvda.exe` is not on PATH, but no actual Narrator session, spoken output or transcript was captured. Identify the assistive technology and version actually used; record keyboard + spoken output for representative routes/forms/dialogs/errors/live updates. |
| Contrast beyond the dashboard text sample | WCAG 1.4.3 and 1.4.11. Axe marks some contrast checks incomplete; the stored helper result covers only visible text on one route. | P1 / FE-G05 | Refresh contrast review on current code; include text, focus indicators, icons, status chips, chart marks and disabled/hover/focus/error states. Record tool/manual method and exact elements/ratios. |
| Keyboard workflow breadth | WCAG 2.1.1 and 2.4.7. Existing route smoke and focused dialog cases cover only part of the interaction inventory. | P1 / FE-G05 | Audit representative shared patterns once with traceability, then feature-specific compositions: menus/selects, file input, summary errors, table scroll/pager, chart alternative, nested dialogs and recovery states. |
| Touch target size | WCAG 2.5.8 (AA) and usability. Existing route axe does not establish every small icon/control meets target size. | P2 | Measure selected high-frequency mobile actions and record target bounds/spacing; remediate only demonstrated gaps. |

## C01–C03 decision

The current 179/179 E2E and 54-route axe result are valid automatic evidence, but they do not close FE-G05. C02 adds a traceable interaction matrix and refreshed automatic axe/reflow/contrast evidence. C03 adds a representative keyboard workflow with visible focus, selection, discard recovery and focus return; see `S03-keyboard-workflow.log`. Continue with real browser zoom and a real screen reader only when the host has that interface available; record unavailable tools as an explicit gap rather than substituting a viewport or DOM snapshot. Keep product-owner acceptance (FE-G09) separate.

Source references: `tests/accessibility/routes.spec.ts`, `tests/design/browser-audit.mjs`, `tests/design/manual-contrast.mjs`, `botsales-kit/execution/frontend-evidence/FE027/route-reflow-320-current-20261002.json`, `botsales-kit/execution/frontend-evidence/FE006/S04-contrast-manual.json`, and `evidence/REPORT.md`.
