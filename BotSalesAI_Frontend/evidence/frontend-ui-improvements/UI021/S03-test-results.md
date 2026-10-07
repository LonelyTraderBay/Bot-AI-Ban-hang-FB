# UI021.S03 — regression evidence

**Date:** 03/10/2026 · **Scope:** React demo with synthetic MSW, Chromium Desktop Chrome; shared UI unit tests.

- Playwright targeted files FE009, FE010, FE017, frontend recovery/session and UI012 keyboard: 41/41 PASS. Log: S03-targeted-regressions.log.
- Inbox navigation/cursor cases from FE016/UI002: 3/3 PASS. Log: S03-inbox-navigation.log.
- Shared components test file: 17/17 PASS, including search clear, query preservation and focus return. Log: S03-shared-component-unit.log.
- Aggregate: 44/44 targeted browser cases and 17/17 shared UI unit cases PASS. These tests check the current React checkout and do not rerun the design auditor.
- The browser server ran Vite mode demo at localhost with MSW. No real API/backend/provider was called. The configured full rebuilt-demo E2E suite was not run for UI021.
