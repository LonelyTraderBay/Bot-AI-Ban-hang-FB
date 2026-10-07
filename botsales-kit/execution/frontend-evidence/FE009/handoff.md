# FE009 handoff — Workspace, membership and customers

Scope: React frontend with deterministic synthetic mock transport only. Route/operation/permission mapping is in `S01-operation-map.md`; canonical contracts remain the source of truth.

## Current evidence — 01/10/2026

- The current full Chromium suite passed 123/123. Its nine FE009 cases cover workspace onboarding/owner membership, customer create/update with stale-version input retention, redacted customer fields, setup checklist, marketing-consent preview, audit-field gaps, customer after-sale/shipment links, shop-scoped invite/revoke and pending privacy requests.
- Fresh source mapping passed 58 TypeScript files, 224 operation references and 54 routes with zero issues. Architecture boundaries passed 402 imports with zero issues and negative fixtures 8/8.
- Current Vitest passed 66/66; mock simulator/network passed 88/88; captured-record schema validation passed 356/356. Strict typecheck, lint, canonical generation and production/demo bundle isolation passed on the current source snapshot.
- Privacy remains a canonical pending request; `ReauthApproval`/OIDC step-up stays backend-owned. The UI has no direct delete/approval shortcut and makes no server-authorization claim.

## Limits

These checks validate the frontend against synthetic data and mock transport. They do not validate live authentication, server authorization/revocation, privacy step-up, backend persistence, CI, staging, deployment or owner UAT. Any API/permission gap stays documented in the contract map and `docs/KNOWN_GAPS.md`; this task adds no endpoint or permission to hide it. Production and demo bundles pass local builds; the >500 kB minified chunk warning remains recorded in FE008.

Exact route mapping, source hashes and logs are in the five current FE009 checkpoint evidence files. Supporting gates are linked from FE003/FE006/FE007/FE008 evidence, including `../FE003/S03-e2e-current-20261001.log`.
