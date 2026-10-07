# W30 native text-only 200% screenshot review

**Date:** 2026-10-06 · **Scope:** local React demo + synthetic MSW, isolated Firefox 155.0 profile · **Result:** 5/5 captures visually reviewed; no unexpected occlusion or clipped primary action observed.

The five viewport captures in `native-text-only-200-current-20261006.json` were compared with the recorded target geometry and focus measurements. Firefox confirmed text-only zoom at 2× while CSS viewport and device-pixel ratio stayed fixed. The form save action, report content, composer and dialog actions remain visible and keyboard-focusable. Long labels and text wrap into additional lines; the navigation and dialog content use their own scroll regions. The feedback action also wraps at narrow widths but remains visible and separate from the footer text. No page-level horizontal overflow, unexpected page error or write request was recorded.

| Scenario | Viewport | Visual review |
|---|---:|---|
| Product form with validation error | 320×480 | Save action and validation content remain visible; footer copy/button wrap without overlap. |
| Mobile navigation with synthetic long label | 390×560 | Label wraps in the scrollable drawer; adjacent navigation action remains a separate row with visible focus. The full synthetic label is intentionally read through the drawer scroll region, not shown at once. |
| Marketing report with synthetic long identifier | 640×450 | Identifier wraps; demo alert action wraps to two lines and remains visible. |
| Inbox with long unsent composer draft | 390×560 | Draft text wraps in the composer; surrounding content remains scrollable and no adjacent action is covered. |
| Takeover dialog with long reason | 320×480 | Dialog remains within the viewport; cancel/confirm actions are visible and focus is indicated while the long field content scrolls. |

This is a visual review of these five synthetic states only. It is not a screen-reader evaluation, a complete route-by-route accessibility audit, or evidence for other browsers/devices. The new reusable requirement for future sticky/fixed/overlay UI is recorded separately as SPC-056; this review does not claim that a general hit-testing gate has been automated.
