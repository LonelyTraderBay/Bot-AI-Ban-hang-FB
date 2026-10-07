# FE010 — Catalog, variants, and CSV import

Scope: React frontend with synthetic MSW data. OpenAPI, route manifest, permission catalog, generated operations/schemas, and sample CSV remain the sources of truth. No generated contract output or backend API was edited for this evidence refresh.

## Current verification — 01/10/2026

- FE010 contract map passed 8/8 checks: routes R09–R14, all 16 operation IDs/permissions, `If-Match`, product/variant schemas and import dry-run/commit tokens. Fresh source mapping passed 58 TypeScript files, 224 operation references, 54 canonical routes and zero issues.
- Full Chromium E2E passed 123/123, including all eight FE010 browser cases. They cover product/variant creation, image attachment, category/product search, versioned update conflict, CSV sample/download, row validation, valid-only commit, stale-token 412, warehouse read-only access and demo upload limits.
- Current Vitest passed 66/66; simulator/MSW passed 88/88; mock-schema validation passed 356/356; generated contract check passed 11 outputs / 283 schemas / 210 operations / 54 routes. Typecheck, lint and architecture boundaries passed; boundaries checked 402 imports and negative fixtures 8/8.
- Production and demo builds passed. Artifact isolation confirms production excludes MSW runtime and demo includes it with a synthetic-data label. Both builds retain the >500 kB chunk warning.

## Limits

The 1,000-row and 5 MB limits are frontend demo constraints, not backend policy. The sample handles CSV only; XLSX parsing, real file storage, durable import jobs, and live server validation are not implemented or claimed. All browser/API data is synthetic. CI, live backend/provider, staging, deployment, and user UAT have not been verified. This evidence supports the FE010 frontend task only and does not make an enterprise-grade or production-system claim.

Current FE010 checkpoint JSON files record exact source hashes and supporting logs. The task route/operation map is `S01-operation-map.md`; current browser evidence is `../FE003/S03-e2e-current-20261001.log`.
