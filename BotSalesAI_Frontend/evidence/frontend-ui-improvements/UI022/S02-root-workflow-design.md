# UI022 — Root workflow and ownership decision

Date: 2026-10-03
Owner: Codex
Base revision: `e68cb65e61c5c1aab2ae169dd8033df305df8872`

## Decision and change

Moved the tracked frontend workflow from `BotSalesAI_Frontend/.github/workflows/frontend.yml` to the repository-root [`.github/workflows/frontend.yml`](../../../../.github/workflows/frontend.yml), where GitHub Actions can discover it. The root workflow filters both `push` and `pull_request` events to `BotSalesAI_Frontend/**` and its own workflow file. Its run steps use `BotSalesAI_Frontend` as their working directory; npm caching uses `BotSalesAI_Frontend/package-lock.json`.

The workflow pins checkout, setup-node and upload-artifact to full commit SHAs; uses Node 24 and npm 11.17.0; requires the committed lockfile; installs with `npm ci`; runs the low-severity dependency audit, setup, full frontend verification, Chromium installation and the rebuilt-demo E2E suite. It uploads the production build, demo build and Playwright result/trace directory under an artifact name containing workflow run ID, attempt and source SHA, with a 14-day retention period.

## Paired result

- **UI:** PASS for the configured frontend-change trigger and run location; remote execution remains unverified until GitHub receives this local change.
- **ARCH:** PASS. The workflow is owned by the repository root, bounded to the frontend subtree, and invokes the existing canonical npm commands. It adds no API, backend, staging, runtime, product or FE-ledger behavior.
- **Source impact:** workflow path/config only; no React/TypeScript, generated source, contract, route manifest, design token, package manifest or lockfile changes.
- **Review:** self-review by Codex; no human review or remote run is claimed.

Validation performed is recorded in [S03](S03-static-validation.md). The remote-run prerequisite and its evidence are in [S04](S04-remote-run-status.md).
