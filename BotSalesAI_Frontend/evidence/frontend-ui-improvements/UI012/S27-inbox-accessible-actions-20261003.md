# UI012/S27 — Inbox message feedback actions and dialog focus

**Date:** 2026-10-03 · **Route:** R06 `/s/shop-demo/inbox/cv1` · **Result:** UI PASS for the bounded Inbox issue; ARCH PRESERVED.

## Finding and correction

The Inbox rendered one feedback action per message, but every action had the same accessible name, “Đánh giá”. A keyboard or screen-reader user navigating the button list could not distinguish which message would be reviewed. Opening the rating dialog also left initial focus on the dialog presentation wrapper instead of its first meaningful control.

Each action now keeps the visible text “Đánh giá” and exposes an accessible name containing the sender, shop-local message time, and a Unicode-safe excerpt capped at 64 code points. The Inbox rating dialog places initial focus in the “Đánh giá” choice field. The implementation remains inside Inbox ownership and uses existing message data and the existing MUI dialog.

The new UI012 regression test uses Tab and Space to open the first action, asserts distinct message-context names and initial combobox focus, then uses Escape and verifies focus returns to the originating message action. It records that no mutation request was sent. Existing FE016, FE017 and FE022 selectors were updated to find the contextual action name.

## Evidence

- [S27 browser capture JSON](S27-inbox-message-action-review.json): two buttons have distinct, message-specific accessible names; the dialog opens with focus in the rating combobox; Escape returns focus to the triggering button; 0 page errors and 0 mutations. The probe waits for all document animations and asserts the dialog is visible at opacity 1 before capture.
- [Inbox message list capture](S27-inbox-message-action-context.png) and [settled rating dialog capture](S27-inbox-rating-dialog.png) were visually reviewed after the first capture was found mid-transition. The repeated capture has no overlapping transition text or clipping; see the [bounded visual review](S27-settled-dialog-visual-review-20261003.md). The accessibility snapshot is DOM-derived; it is not screen-reader speech or a transcript.
- [UI012 regression](../../../tests/ui012-keyboard.spec.ts) passed in the focused Chromium run and within the full suite. FE016, FE017 and FE022 feedback journeys also pass with the new names.
- [`npm.cmd run verify`](S27-verify.log) passed: generator 11 outputs/283 schemas/210 operations/54 routes, source 64 files/220 operation references/54 routes, checker 3/3, boundaries 427 imports/0 issues/8 fixtures, lint, typecheck, domain/MSW 88/88, Vitest 85/85, production build.
- [Full rebuilt-demo E2E](S27-full-e2e.log) passed **193/193** in 10.7 minutes. Route-role 357/357, empty-state 11/11, route-error 51/51, artifact preview/pagination, production mock isolation, and all four FE022 journeys passed.

The local Chromium demo measurement was 446,255 initial script-transfer bytes, 449,806 initial-route gzip bytes and a 187,956-byte largest gzip chunk. Production build retains its existing advisory at 737.92 kB raw / 186.80 kB gzip. The local run is not hosted CI, physical-device evidence, Backend/provider verification, staging or owner UAT.

The full suite regenerated three existing preview evidence artifacts: `botsales-kit/execution/frontend-evidence/FE025/demo-preview-metrics.json`, `FE025/large-dataset-metrics.json` (first-page ready 315 ms in this single run), and `FE026/demo-preview-overview.png`. Their current hashes and the S27 outputs are captured in the fingerprint manifest. These generated measurements are not progress-ledger updates; FE/product progress files were not changed.

## Paired result and remaining gate

`UI: PASS` for the repeated-action naming and rating-dialog focus behavior on this bounded Inbox sample. `ARCH: PRESERVED`: Inbox owns the message action and dialog; no route, API contract, permission, token, generated output, cross-module dependency or progress ledger changed. The test and source stay inside the established module/test boundaries.

UI012 remains **IN_PROGRESS 4/5; C04 PARTIAL**. Screen-reader speech/transcript and broad manual review of the remaining route, dialog, error, hover, pressed and icon states remain outstanding. FE-G05 therefore remains open and readiness remains 7/9. The run used local Windows Node 24.19.0/npm 11.17.0, Chromium 153 and synthetic MSW only.
