# UI028.W16 visual source review — 05/10/2026

## Scope and provenance

- Customer spacing migration for R07, R08 and R54 only. Canonical operation, permission and UI invariants are recorded in the [pre-spacing contract](design-contract-pre-spacing-current-20261005.md).
- W16 intake already contained staged edits. The paired evidence compares the captured intake checkout (`153dd6b93f75d000096aefc2e7ad52788bef2f82255dfdff8956e364ce434493`) with the current customer module (`8212b948ae95110eeb705c5247d6bb817c38681987d48fb117896f4f8d7a6ac5`); it does not claim a clean-HEAD baseline.
- Route behavior uses the existing local synthetic MSW dataset. No API, permission, backend, provider, or service-case lifecycle was added.

## Source and render review

- All 15 customer spacing findings were migrated to shared semantic roles: customer-owner findings 15→0 and global findings 266→251. The same-checker multiset comparison shows 15 occurrences removed, no new occurrence, and no finding identity/count changes outside Customers. See [layout delta](layout-delta-current-20261005.json).
- The only new layout roles used here are typed relationships in the shared bridge: compact related-item gap/inset and related-content gap. They derive from existing canonical spacing factors; no second scale or consumer-local spacing alias was introduced.
- Side-by-side R08 screenshots at 390×844 and 1280×900 retain the masked profile, recent-order preview, shipment summary and support-case context in the same order. The mobile profile uses the available width without horizontal overflow; desktop keeps the existing two-column profile and related panels. The changed inset rhythm is visible, while text, status, actions, permissions and data remain the same. Paired capture covers 12 route-state/viewport observations before and 12 after.
- Both capture reports record zero page errors and zero write requests. The layout suite passed 4/4 across Chromium and Firefox, checking routes at 320/390/768/1280/1440 px and create/status dialogs at mobile and desktop sizes. The targeted customer regression suite passed 68/68 (34 Chromium, 34 Firefox), including route empty/error composition, privacy permissions, scoped customer/order data, redacted contacts, query failures, drafts and keyboard behavior.
- Review of the captured W16 source delta found no new typography, color, radius, elevation, focus, breakpoint or geometry literals. Pre-existing visual literals remain legacy review debt and are not certified by this spacing-only review.

## Verdict

`VISUAL_SOURCE_REVIEW=PASS_FOR_W16_SPACING_DELTA_ONLY`. The automated layout checker enforces spacing, not every visual-token category. This review is not an automated typography/palette/radius/elevation/focus/breakpoint gate; W26–W27 own that work. Global strict spacing remains non-passing with 251 findings assigned to W17–W25.
