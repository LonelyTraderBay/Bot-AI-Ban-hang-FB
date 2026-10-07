# UI012/S25–S26 — 54-route visual tour and premature validation fix

**Date:** 2026-10-03 · **Scope:** React/TypeScript Frontend with local synthetic MSW only.

## Finding and fix

S25 captured the first viewport of all **54 canonical routes** at 1440×1000 CSS px and reviewed the five contact sheets. R18 `/s/:shopId/orders/new` visibly marked the untouched “Khách hàng” select as an error. A focused Playwright probe confirmed `aria-invalid="true"` and the MUI error class on first render, before the user had interacted with the field; there was no helper text explaining the requirement.

The Orders-owned field now uses MUI's required semantics and shows “Chọn khách hàng để lưu đơn nháp.” while no customer is selected. It no longer sets the error state just because the initial value is empty. The save action remains disabled until the form is valid. The change is confined to `apps/web/src/modules/orders/index.tsx`; no shared component, feature boundary, API, route, permission, design token, or generated output changed.

The baseline regression failed as expected with `aria-invalid="true"`. After the fix, the new UI012 assertion passed. The [S26 capture report](S26-order-draft-initial-state.json) confirms `aria-required="true"`, the visible required marker, associated helper text, no `aria-invalid="true"`, disabled save, zero page errors, and zero mutation requests. The [post-fix screenshot](S26-order-draft-initial-customer-required.png) shows the corrected state.

## Route-tour evidence

[S25 JSON](S25-canonical-route-visual-review.json) maps screenshots to the canonical manifest: **54/54** routes loaded with a visible main heading; zero page errors, mutation requests, or document-overflow routes. The five review sheets cover R01–R54: [01](S25-contact-sheet-01.png), [02](S25-contact-sheet-02.png), [03](S25-contact-sheet-03.png), [04](S25-contact-sheet-04.png), [05](S25-contact-sheet-05.png). This tour covers initial route surfaces at desktop size, not every interaction or responsive state. S25's R18 image is the before-fix evidence.

## Verification

- Focused UI012 + FE012 Playwright regressions: **18/18 PASS**.
- `npm.cmd run generate:check`: **PASS**, 11 generated outputs, 283 schemas, 210 operations, 54 routes.
- `npm.cmd run verify` with process-scoped PATH: **PASS**, exit 0. Generator 11 outputs/283 schemas/210 operations/54 routes; source 64 files/220 API references/54 routes; source-checker 3/3; boundaries 427 imports/0 issues/8 negative fixtures; ESLint, TypeScript, domain/MSW 88/88, Vitest 85/85, production build. The configured >500 kB raw chunk advisory remains (737.92 kB raw / 186.81 kB gzip).
- `npm.cmd run test:e2e` after production/demo rebuild: **192/192 PASS**, exit 0, 10.7 minutes. Route-role 357/357, empty composition 11/11, route-error composition 51/51, production mock isolation, and four FE022 journeys passed. Current demo preview: 446,257 initial script-transfer bytes; 449,808 initial-route gzip bytes; 187,958-byte largest gzip chunk; synthetic customer first page 318 ms.
- The [S26 SHA-256 manifest](S26-fingerprint-20261003.json) records the touched Orders source, focused tests, canonical OpenAPI/routes/tokens inputs, capture scripts, route/state reports and selected screenshots/contact sheets. It does not hash build outputs; production isolation and build results are verified by the commands above.

All browser checks used Chromium 153 and the React demo with synthetic MSW. They do not establish Backend/provider, hosted CI, staging, production runtime, or owner UAT behavior.

## Paired result and remaining gate

- **UI: PASS** for the reproduced initial-form accessibility defect and the selected desktop route surfaces.
- **ARCH: PRESERVED** because required-field state stays owned by the Orders feature; boundaries and source responsibilities remain unchanged.
- UI012 remains **4/5, C04 PARTIAL**. The S25 tour broadens initial-state visual review, and S22/S24 cover selected interactions. Actual screen-reader speech/transcript and manual review of the remaining interaction/error/icon states are still missing. S25/S26 do not provide screen-reader evidence or owner UAT; FE-G05 and FE-G09 stay open.
- The FE/product progress ledgers and whole-product plan were not changed. Frontend readiness remains **7/9**.
