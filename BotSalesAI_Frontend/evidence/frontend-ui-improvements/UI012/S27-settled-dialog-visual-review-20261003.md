# UI012/S27 — Visual review of the settled Inbox rating dialog

**Date:** 2026-10-03 · **Route:** R06 `/s/shop-demo/inbox/cv1` · **Result:** PASS for this visual sample; UI012.C04 remains PARTIAL.

## Why the capture was repeated

Review of the first S27 screenshot showed that the dialog was captured during its opening transition: the modal text and dimmed Inbox appeared over one another. This was a capture-timing defect, not enough evidence to call it a product defect. The probe now waits for document animations to finish and asserts the dialog is visible at opacity `1` before it saves the image.

## Observed state

- Environment: local React demo + synthetic MSW, Chromium 153, 1440×1000 CSS px, device scale factor 1.
- The stable capture shows the rating dialog title, close action, source message, rating combobox, correction field, review warning, Cancel and Save actions without transition-frame overlap or clipping.
- The combobox has a visible gold focus outline. The backdrop dims the Inbox while the dialog remains visually distinct.
- The updated capture JSON records `opacity: 1`, `visibility: visible`, focus on the rating combobox, focus return after Escape, zero page errors and zero mutation requests.
- The Save action remains enabled with an empty correction field. This matches the canonical `FeedbackWrite` shape: `correction` is required as a string with `maxLength: 10000`, but the schema sets no `minLength`; the frontend supplies the empty string. No contract or source change was warranted.

| Review point | Result | Limit |
|---|---|---|
| Dialog settled and readable | PASS in this sample | One desktop route/state |
| Focus indicator on first control | PASS in this sample | Visual/browser evidence; not spoken output |
| Message context and actions | PASS in this sample | One synthetic conversation |
| Empty correction / Save state | Consistent with canonical request schema | Contract evidence does not establish a real server response |
| Assistive technology | NOT RUN | No Narrator/NVDA speech output or transcript available |

`ARCH: PRESERVED` — the change is to the evidence probe only. Inbox module ownership, API contract, route, permissions, tokens, generated files and progress ledgers are unchanged. The visual result does not close the required broad interaction/error/icon review or the screen-reader checkpoint.

Evidence: [updated capture JSON](S27-inbox-message-action-review.json), [settled dialog screenshot](S27-inbox-rating-dialog.png), [recapture log](S27-visual-recapture.log), [probe script](S27-inbox-message-action-review.mjs), and [paired S27 acceptance](S27-inbox-accessible-actions-20261003.md).
