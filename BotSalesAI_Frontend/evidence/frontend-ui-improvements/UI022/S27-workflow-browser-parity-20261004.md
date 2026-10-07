# UI022/S27 — Frontend workflow/browser parity and current local evidence

**Date:** 2026-10-04 · **Scope:** repository-root GitHub Actions workflow and local Frontend verification. **Result:** UI022 5/5; local evidence only.

## Finding and correction

The workflow invoked `npx playwright install --with-deps chromium` while [playwright.config.ts](../../../playwright.config.ts) runs both `chromium` and `firefox` projects. The Firefox project could therefore start in CI without its browser prerequisites. The root workflow now installs both browsers before `npm run test:e2e`: `npx playwright install --with-deps chromium firefox`.

## Checks

- Python/PyYAML parsed `../.github/workflows/frontend.yml`; the document has the expected `verify` job.
- A local parity check read the project names from `playwright.config.ts` and the browser arguments from the workflow. Configured projects: `chromium`, `firefox`; installed browsers: `chromium`, `firefox`; missing: none; **PASS**.
- `node node_modules/playwright/cli.js install --dry-run chromium firefox` exited 0 and resolved Playwright Chromium `153.0.8010.12` and Firefox `155.0` browser packages. This was a dry run; no package installation was performed by that command.
- [S39 `npm run verify`](../UI012/S39-current-frontend-verify-20261004.log) passed generation, source/boundary checks, lint, typecheck, domain/MSW 88/88, Vitest 85/85 and production build on the current Frontend source.
- [S40 full E2E](../UI012/S40-full-e2e-20261004.log) passed 388/388 across Chromium and Firefox. The additional [UI023 targeted technical UAT](../UI023/S01-technical-uat-chromium-firefox-20261004.log) passed 146/146 on the same two projects.
- S39/S40 are previously executed current-source logs, not reruns triggered by the workflow-only YAML change. The change does not alter app/test source; S27 separately validates YAML structure, configured-project/install parity and the expected browser package versions.
- Current workflow SHA-256 is recorded in the [S45 source fingerprint](../UI024/S45-final-local-worktree-and-artifact-fingerprint-20261004.json).

**Paired outcome:** `UI: PASS` for workflow/browser prerequisites and current-source local checks. `ARCH: PRESERVED` — this is CI configuration only; application, route, contract and generated-source boundaries are unchanged.

**Limitations:** GitHub-hosted Linux Actions did not run, so this is not a hosted-CI result. No push or publication was performed. The workflow's audit/install/build commands remain the workflow's intended CI sequence; local S39/S40 prove the Frontend commands and browser projects on this Windows host, not Ubuntu behavior.
