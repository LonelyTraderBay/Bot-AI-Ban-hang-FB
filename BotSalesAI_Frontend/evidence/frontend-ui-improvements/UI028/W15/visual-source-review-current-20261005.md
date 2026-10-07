# UI028.W15 visual source review — 05/10/2026

## Scope and provenance

- Finance UI spacing migration for routes R20, R21, R22, R48, R49 and R50.
- The paired comparison starts from the W15 intake source SHA-256 `db3120bf89a38a219e31b9377ba64e30d5444466370821e21c94ca1ded159c8f` and ends at `32ec755040c08f87b68afa87917f8b678742afc0fb1febf51df5319577dbd207`. The checkout already contained staged and unstaged work at intake; this review is limited to the captured W15 delta.
- Route and action scope was traced to the canonical route manifest, OpenAPI and UX contract in [the pre-spacing design contract](design-contract-pre-spacing-current-20261005.md). The six routes use the existing synthetic MSW fixtures; this is not a live accounting integration.

## Source and render review

- Finance spacing consumers now use shared `layoutSx` semantic roles. Two exact relationships missing from the typed bridge were named at the shared owner: `form.pairedFields` and `report.subheadingAfterGap`. No new token scale or consumer-local spacing rule was added.
- Review of the W15 Finance delta found no new typography, color, radius, elevation, focus, breakpoint or geometry literals. Existing visual values outside the captured W15 delta remain legacy/source debt; this review does not certify them as token-compliant.
- Side-by-side Chromium screenshots for R20 at 390×844 and 1280×900 retain the same content, report range, metrics and information order. The after capture shows the semantic spacing changes without horizontal overflow or a visible hierarchy regression. Paired captures cover 26 observations before and 26 after across the six routes at both sizes.
- Both capture reports record zero page errors and zero write requests. Route layout tests cover 320, 390, 768, 1280 and 1440 px; dialog bounds are checked at mobile and desktop sizes. The 66-case targeted suite also exercises finance behavior and the FE022 reconciliation journey in Chromium and Firefox.
- W15 changes layout presentation only. Route IDs, API operations, permissions, cursor behavior, monetary values, date/time semantics, posted/reversal rules, reconciliation matching and period-close safeguards remain as defined by their existing contracts and behavior tests.

## Verdict

`VISUAL_SOURCE_REVIEW=PASS_FOR_W15_SPACING_DELTA_ONLY`. The automated checker currently enforces spacing only. This manual source/render review is not an automated typography, palette, radius, elevation, focus or breakpoint gate; W26–W27 own that work.
