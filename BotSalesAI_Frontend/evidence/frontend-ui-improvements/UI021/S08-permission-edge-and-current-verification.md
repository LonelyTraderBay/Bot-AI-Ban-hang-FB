# UI021/S08 — R35 → R07 permission edge fix and current verification

**Date:** 2026-10-03 · **Scope:** React Frontend + synthetic MSW · **Plan state:** UI021 remains IN_PROGRESS 4/5.

## Finding and paired decision

R35 Privacy is gated by canonical `privacy.manage`; R07 Customers is gated by `customers.read`. The previous `ContactConsentPreview` rendered a RouterLink to R07 even when its own `canReadCustomers` value was false, while the route guard correctly denied R07. This is a confirmed UI navigation mismatch; it does not establish how a real backend assigns these independent permissions.

The link now renders only when `canReadCustomers` is true. The preview warning remains when the permission is absent. The guard uses the existing `useCan('customers.read')` value already owned by the Workspace module. No permission catalog, API contract, generated source, role preset or route ownership changed.

- **UI: PASS for this edge.** With the normal owner session, the link is visible and navigates to R07. With a synthetic active session retaining `privacy.manage` but omitting `customers.read`, R35 stays available, the CTA is absent, and direct navigation to R07 shows the existing denied state.
- **ARCH: PRESERVED.** Workspace continues to own R35 and its preview; Customers and the canonical route guard continue to own R07. No cross-module import or duplicated permission policy was added.
- **Focused browser regression:** [`tests/ui021-permission-edge.spec.ts`](../../../tests/ui021-permission-edge.spec.ts), **2/2 PASS** in Chromium. The missing permission is synthesized in the test's browser session response; no invalid preset was added to the canonical role catalog.

## Current-source verification

| Check | Result |
|---|---|
| `npm.cmd run verify` | Exit 0; generator 11 outputs / 283 schemas / 210 operations / 54 routes; source 64 files / 220 API references / 54 routes; source checker 3/3; boundaries 427 imports / 0 issues / 8/8 negative fixtures; lint, typecheck, domain/MSW 88/88, Vitest 85/85 and production build passed. |
| `npm.cmd run test:e2e -- --reporter=line` | Exit 0; **190/190 PASS** in 10.7 minutes on local Windows / Chromium 153 / synthetic MSW. |
| Suite matrices | Route-role 357/357, empty state 11/11, route-error 51/51; all-route axe, production mock isolation, four FE022 journeys, and the UI021 permission regression passed. |
| Built demo preview | Initial script transfer 446,261 bytes; initial-route gzip 449,801 bytes; largest chunk gzip 187,961 bytes. The 1,004-customer first page rendered in 349 ms at 1280×720 on Chromium. Local measurement only; not a device or SLO. |
| Current source/artifact fingerprint | [S08 fingerprint](S08-current-worktree-and-artifact-fingerprint.json): 159 scoped inputs, source manifest SHA-256 `E2F90B9C54670B1A72D51588E84354A9B5E2B456E4BA2E6B942CF2CA3E1DC05F`; production artifact 32 files, manifest SHA-256 `B1F4BE527CA42A83D8CF3561FA6D47B169242C1ED870B2F81AD6BEE3E1E9A8CB`; demo artifact 37 files, manifest SHA-256 `5D3879D7A744A97BD4549641079197723135B65E7B1BEC177716B7FFCA1BB4E7`. The fingerprint is for a dirty working tree at HEAD `e68cb65e61c5c1aab2ae169dd8033df305df8872`. |
| Evidence-file preservation | Snapshotted 41 existing files across UI004/UI005/UI008/FE025/FE026 before E2E; restored the 6 files rewritten by the suite and verified 41/41 SHA-256 values match. Current-run preview metrics and overview image are preserved separately as S08 files. |

## Strict-audit result and limits

The strict `frontend-design-premium` v1.4.0 rerun after this change is recorded in [S08 JSON](S08-current-frontend-design-audit.json) and [S08 log](S08-current-audit-run-20261003.log). It still exits **1** with 13 `affordance.actionless-button` findings, 0 warnings and 0 unresolved. S08 crosswalks those findings to real links, handlers, file inputs, downloads or submit controls; that crosswalk does not change the scanner result to PASS. Root `premium-audit.json` remained byte-identical during the scan.

These are local frontend results. They do not establish hosted GitHub CI, backend/provider behavior, server authorization, staging, production runtime, screen-reader speech/transcript, broad human accessibility review or product-owner UAT. Readiness remains 7/9; UI021 remains 4/5 because C04 is partial. No FE/product ledger or checkpoint was advanced.
