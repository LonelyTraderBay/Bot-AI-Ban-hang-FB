# W12 Inventory — visual source review

**Result:** `PASS_NO_NEW_VISUAL_LITERAL_WITH_KNOWN_LEGACY_DEBT`  
**Reviewed:** `apps/web/src/modules/inventory/index.tsx`  
**Policy:** SPC-046, interim manual source review; its AST/style-aware checker is not implemented until W26–W27.

The W12 source diff imports the shared `layoutSx` roles and replaces the Inventory filter, notice, and adjustment-form spacing declarations with those roles. It adds no typography, font, color, border/radius, shadow, focus, density, or breakpoint declaration. Route and table widths in the existing JSX are unchanged. The two pre-existing `Typography` weights (650 for SKU and 750 for available quantity) remain unchanged and are recorded as legacy visual-token debt for the planned W26 inventory; this review does not call them token-compliant or claim automated SPC-046 enforcement.

I compared the paired Chromium images and geometry for R15 inventory collection, its pristine adjustment dialog, and R16 stock movements at 390×844 and 1280×900. The shell-owned gutters remain 16px mobile and 24px desktop; document width remains equal to viewport width in all six paired observations; dialog bounds are unchanged. On mobile, filter inputs and filter actions are now grouped with the agreed 16px field gap and 8px action gap. The desktop movement table remains in its existing scroll container. Labels, values, actions, table columns, notices, and dialog content remain visible in the reviewed captures.

The paired render comparison is [layout-report-delta-current-20261005.json](layout-report-delta-current-20261005.json). Captures: [before](render-before-source-edit-current-20261005.json) and [after](render-after-source-edit-current-20261005.json). Responsive and behavior tests are recorded separately in the Chromium and Firefox Playwright logs.

**Test authoring correction:** an initial test draft assumed the demo inventory had a next page, but its single seeded page correctly disables that action. The final regression instead opens an opaque stale-cursor deep link, verifies applying/clearing filters drops that cursor while preserving an unrelated query parameter, and checks the adjustment form's zero-value validation sends no write. This was a test setup correction, not a product defect; only the final Chromium/Firefox runs are counted as passing results.
