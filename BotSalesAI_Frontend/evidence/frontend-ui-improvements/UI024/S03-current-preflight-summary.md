# UI024.S03 — Historical preflight summary (S01/187 of 187), superseded by S04

**Date:** 2026-10-03 · **Scope:** current local worktree, production/demo artifacts, Chromium E2E with synthetic MSW.

## Provenance

- Repository HEAD: `e68cb65e61c5c1aab2ae169dd8033df305df8872`. The worktree is dirty; the current source/test/config fingerprint and both artifact fingerprints are in [S02](S02-current-worktree-and-artifact-fingerprint.json).
- Node.js 24.19.0, npm 11.17.0, Vite 7.3.6; the Playwright browser was Chromium 153.0.8010.12.
- The current React code was not edited for this preflight. Existing source changes, including uncommitted and untracked files, were tested as they stood in the worktree.

## Commands and results

1. `npm.cmd run test:e2e` ran setup, `generate:check` (11 generated outputs / 283 schemas / 210 operations / 54 routes), TypeScript, and production + demo builds successfully. The overall command exited 1 when Playwright's configured webServer could not find `npm` in its child-process PATH. The full output, including both build results and the runner failure, is preserved in [S00](S00-current-rebuilt-demo-e2e-20261003.log); this attempt is not reported as a passing E2E run.
2. The Vite demo server was started directly with Node 24, and `node node_modules/@playwright/test/cli.js test` ran from the Frontend root with the existing server reused. Final exit code was 0: **187/187 passed in 11.0 minutes**. Log: [S01](S01-current-full-rebuilt-demo-e2e-20261003.log).

## Observed coverage and artifact data

- The suite passed the all-canonical-route axe test, 357 route/role cases, 11/11 empty compositions, 51/51 route-error compositions, the production-artifact isolation test, and four FE022 vertical journeys.
- The production-artifact test confirmed that the production artifact contains neither the mock worker asset nor MSW fixtures/runtime. The demo preview used `apps/web/dist-demo`, Chromium 153 at 1280×720, and the `synthetic-msw` source; `/api/v2/session` returned 200 from MSW.
- The unthrottled demo preview reported 446,252 bytes transferred for initial scripts, 449,790 gzip bytes for the initial route, and a largest chunk of 741,567 raw / 187,952 gzip bytes. This single local preview is not a device, CDN, or production latency/SLO measurement. Vite's existing >500 kB raw chunk advisory remains.
- Fingerprint script: [S02 generator](S02-fingerprint-current-worktree.py). The JSON lists all 157 scoped source/test/config inputs and every production/demo artifact file with per-file SHA-256 values, plus deterministic aggregate hashes.

## Scope limits and status

- This is frontend-only local evidence using synthetic MSW and Chromium. It does not prove GitHub CI, backend/provider behavior, server authorization, staging, production runtime, physical-device behavior, actual browser zoom, screen-reader speech, manual interaction-state review, or owner acceptance.
- UI023 remains `TODO`, 0/5: the four automated journeys are preflight only; the actual product owner must execute/review UAT and record a decision after prerequisites are ready.
- UI024 remains `TODO`, 0/5: preflight evidence is saved, but final gates/handoff cannot begin until UI023 and required manual/remote prerequisites are satisfied. No readiness or progress ledger was advanced.
