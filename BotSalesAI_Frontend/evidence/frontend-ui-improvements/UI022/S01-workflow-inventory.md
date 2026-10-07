# UI022 — Frontend CI workflow inventory

Date: 2026-10-03
Owner: Codex
Repository base revision: `e68cb65e61c5c1aab2ae169dd8033df305df8872` (`main`, same SHA as `origin/main` before this work)
Scope: Frontend CI wiring and local evidence only; no backend, staging, deployment, FE-ledger or product-ledger work.

## UI and architecture inventory

`BotSalesAI_Frontend/.github/workflows/frontend.yml` was tracked in the repository, but GitHub Actions looks for workflows under the repository-root `.github/workflows/`. The frontend workflow was therefore nested one directory below the repository root and was not discovered as an Actions workflow.

Read-only GitHub API checks on 2026-10-03 returned `total_count: 0` for repository workflows and workflow runs. The root contents endpoint for `.github/workflows` returned 404. The repository is public and its default `main` revision matched the local base SHA. `gh auth status` also confirmed that this environment has no authenticated GitHub CLI session. These facts mean there was no remote CI run to report; they do not imply that local tests failed.

The original workflow used Node 24, `npm ci`, `npm audit --audit-level=low`, `npm run setup`, `npm run verify`, Chromium installation and `npm run test:e2e`. The tracked `package-lock.json` is present and the root package declares npm 11.17.0. The browser suite uses one Chromium project and Playwright retains traces on failure.

## Paired result

- **UI:** PASS for the configured trigger path: changes under `BotSalesAI_Frontend/**` are selected for push and pull-request runs, and the run is scoped to the frontend directory. A remote trigger has not yet been observed.
- **ARCH:** PASS for ownership and isolation: the workflow now lives at repository root, explicitly runs package commands in `BotSalesAI_Frontend`, caches against that app's lockfile, and runs only frontend checks. No Backend or staging workflow was added.

Current source/config ownership and the actual remote-run gap are separated in [S02](S02-root-workflow-design.md) and [S04](S04-remote-run-status.md).
