# UI024.S04 — Current Frontend preflight after S27/S09

**Date:** 2026-10-03 · **Scope:** current local React worktree, production/demo artifact evidence and Chromium E2E with synthetic MSW. This is a preflight refresh, not a UI024 checkpoint or owner acceptance.

## Current source and architecture evidence

- Latest app verification is UI012/S27 on HEAD `e68cb65e61c5c1aab2ae169dd8033df305df8872`. This turn changed documentation/evidence only; React source, tests, config and generated outputs were not changed after S27. [UI024/S05](S05-current-worktree-and-artifact-fingerprint.json) fingerprints the current source/test/config/canonical inputs and existing production/demo build outputs; rebuild and regenerate it after any later source/config/contract/generated-input change.
- `npm.cmd run verify` passed in S27: generator 11 outputs/283 schemas/210 operations/54 routes; source 64 TS/TSX files, 220 operation references and 54 routes; source checker 3/3; boundaries 427 imports, 0 issues/cycles, negative fixtures 8/8; ESLint, TypeScript, domain/MSW 88/88, Vitest 85/85 and production build.
- Full rebuilt-demo Chromium E2E passed **193/193** in 10.7 minutes with synthetic MSW. Route-role 357/357, empty states 11/11, route errors 51/51, canonical-route axe, production mock isolation, pagination/preview and four FE022 journeys passed. The S27 demo measurements are 446,255 initial script-transfer bytes, 449,806 initial-route gzip bytes and a 187,956-byte largest gzip chunk; the synthetic customer first page measured 315 ms in that run. Production advisory is 737.92 kB raw / 186.80 kB gzip. These are local observations, not SLO/device/CDN evidence.
- Architecture snapshot: 16 modules/24 files within `modules`, 54 canonical routes, one QueryClient/BrowserRouter/theme, and the source boundary/generator results above. FE-G02 is PASS in its defined gate; this does not create an architecture-only percentage. Project readiness remains 7/9 = 77.8% by FE gate count, with FE-G05 and FE-G09 still open.

## Latest open prerequisites

- UI012/FE-G05: screen-reader speech/transcript and broad manual review of interaction/error/icon states remain unverified. Actual Chromium tab zoom and text-flow tests are automated evidence, not manual signoff.
- UI020.C02: the owner has not approved the browser/device, version, PWA and notification support matrix.
- UI021.C04: strict `frontend-design-premium` v1.4.0 S09 reports 13 `affordance.actionless-button` findings, 0 warnings, 0 unresolved, exit 1. The current source crosswalk records real React semantics; it does not change strict audit status to PASS.
- UI022.C04: latest S24 anonymous public GitHub API recheck returned 0 workflows/0 runs; the root workflow is local-only and `gh auth status` is unauthenticated. See [S24](../UI022/S24-public-workflow-recheck-20261003.json).
- UI023 owner UAT and UI024 final handoff have not been performed; owner result/decision fields remain blank in [the UAT runbook](../UI023/S00-owner-uat-runbook-draft.md).

## Evidence and limits

See [S27 verify](../UI012/S27-verify.log), [S27 full E2E](../UI012/S27-full-e2e.log), [S27 acceptance](../UI012/S27-inbox-accessible-actions-20261003.md), [S27 test-run fingerprint](../UI012/S27-fingerprint-20261003.json), [current UI024/S05 worktree/artifact fingerprint](S05-current-worktree-and-artifact-fingerprint.json), [S09 strict audit](../UI021/S09-current-frontend-design-audit.json), [S09 crosswalk](../UI021/S09-current-source-crosswalk.md), and [latest S24 hosted-workflow status](../UI022/S24-public-workflow-recheck-20261003.json).

This is frontend-only local evidence using synthetic MSW and Chromium. It does not prove hosted CI, backend/provider behavior, server authorization, staging, production runtime, physical-device behavior, screen-reader output, manual signoff or owner UAT. UI023 remains TODO 0/5 and UI024 remains TODO 0/5; no frontend or whole-product progress ledger was advanced.
