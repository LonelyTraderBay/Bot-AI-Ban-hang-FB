# FE017 — Knowledge and review workflow

Scope: React frontend with synthetic MSW data for R23–R25. No canonical contract, permission, or generated output is changed by this frontend work.

## Current verification — 02/10/2026

- The current full Chromium suite passed 142/142, including the FE017 source map and all FE017 browser cases across the knowledge and validation spec files.
- Draft/review/evaluated publish, immutable revision history, canonical file-upload purpose/status, invalid uploads, inert feedback content, manager permission denial, stale review, and field-level 422 draft retention were exercised against the React demo and synthetic API.
- FE017.AC02 is now covered: price and available stock render from separate canonical `listProducts` and `listStockSnapshots` responses, with their own read capabilities and inventory `asOf`; knowledge text is not treated as their authority.
- Current shared checks passed: Vitest 66/66, domain/MSW 88, schemas 356/356, generation 11 outputs / 283 schemas / 210 operations / 54 routes, source mapping 58/224/54, boundaries 402 imports and 8/8 negative fixtures, typecheck, lint, and production/demo builds. The chunk-size warning remains open.

## Approved frontend substitute for FE017.AC01

Canonical OpenAPI `Knowledge` still has no `allowedActions` property. Per the user's latest instruction to fully unblock frontend work using synthetic data, FE017 is unblocked using the documented UI substitute: publish is enabled only for a user with the existing `knowledge.publish` capability and a resource in `ready_for_review`; the synthetic API independently enforces permission, resource version, evaluation result, and revision. Source-map and browser tests assert the field is absent, the lifecycle gate works, and unauthorized direct mock requests return 403. This verifies the frontend demo only; live server-provided actions and backend authorization remain unverified. Do not add an undeclared DTO property or modify generated outputs.

The current E2E log is `../FE027/e2e-current-final-20261002-frontend-coverage.log`; current shared gates are linked from FE024–FE026 evidence. CI, live backend/provider, staging, production deployment, and owner UAT were not run.
