# W25 Reports — visual and source review

**Date:** 2026-10-06  
**Routes:** R31 report export/jobs; R53 marketing summary/chart/table  
**Scope:** local React frontend with synthetic MSW; no live integration claim

## Review result

W25 is UI PASS / ARCH PASS for its scoped change. Twenty Reports spacing literals moved to the shared semantic layout source; strict spacing now reports 0 findings across 67 files. The change leaves typography, colors, radii, shadows, chart configuration, report query state, permissions, export job state, CSV behavior, timezone rules and route/API contracts untouched.

## Measured render comparison

- Four paired Chromium captures cover R31 and R53 at 390×844 and 1280×900. Both routes have zero document horizontal overflow, route writes, API errors and page errors.
- R53 chart frame and SVG rectangles are byte-for-byte equal in their recorded numeric geometry at both viewports. Every recorded chart category label and tick coordinate also matches. The 260px frame and 16px inset remain unchanged.
- The marketing question list keeps the same 40px effective text inset. Ownership is now explicit and composable: 24px surface inset plus 16px list indent. The first item's x-coordinate remains 57px on mobile and 305px on desktop.
- R31 report form uses the semantic 16px field/context gap; the owning Panel body keeps its existing responsive horizontal/bottom inset and zero top inset, avoiding double padding. The export download link retains a 44px minimum target.
- Visual inspection of all four after screenshots found no clipped page content or spacing regression. At 390px the marketing chart labels remain dense, but the chart geometry and labels are unchanged from baseline; that density is not caused by W25.

## Source and evidence integrity

- Current source hashes are recorded in `render-after-current-2026-10-06.json`; the original pre-source source hash remains in the immutable baseline manifest.
- The original baseline capture helper selected invalid elements for `mainGrid` and `reportPanel`. Those two baseline fields are null/zero and were excluded from paired claims. The after-capture helper was corrected; no baseline capture or manifest was rewritten.
- The contract, manifest, before captures, after captures, strict reports, 50/50 Chromium+Firefox regression log, build logs and production/demo artifact isolation log remain separate artifacts.
- Production artifact review found no MSW worker/interceptor runtime. It contains only `main.tsx`'s defensive removal of a stale demo worker from a prior demo session. The demo artifact contains the mock worker and browser/control/service chunks.

## Reproducible evidence

- [Pre-source contract](design-contract-pre-spacing-current-20261006.md)
- [Immutable baseline manifest](baseline-manifest-current-20261006.json)
- [Paired-render delta](layout-delta-current-2026-10-06.json)
- [Before captures](render-before-current-2026-10-06.json) · [after captures](render-after-current-2026-10-06.json)
- [Targeted browser suite](targeted-e2e-current-20261006.log)
- [Production build](production-build-current-20261006.log) · [demo build](demo-build-current-20261006.log) · [artifact isolation](artifact-isolation-current-20261006.log)

