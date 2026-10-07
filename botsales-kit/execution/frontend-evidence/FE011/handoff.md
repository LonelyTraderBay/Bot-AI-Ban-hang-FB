# FE011 — Inventory and movement history

Scope: React/TypeScript frontend with synthetic MSW API only. R15/R16, permissions, operations, DTOs and command semantics remain grounded in the canonical OpenAPI, route manifest and generated contracts. No backend endpoint or generated file was added.

## Current verification — 01/10/2026

- The FE011 route/operation/source map contains 17 checks. R15 reads `listStockSnapshots`/`getShop`; R16 reads `listStockMovements`; `createInventoryAdjustment` requires `inventory.adjust`, and the write follows the canonical HTTP 202 `CommandResponse`, expected-version, CSRF and idempotency semantics.
- Full Chromium E2E passed 123/123, including eight FE011 scenarios. They verify snapshot-driven totals, catalog links, confirmed adjustment and one movement, URL-backed filters, 412/insufficient-stock/403/unknown-command recovery, foreign-shop isolation, 320/390/768/1440 CSS px reflow, axe checks and keyboard focus restoration.
- Current Vitest passed 66/66; simulator/MSW passed 88/88; schema validation passed 356/356; `generate:check` passed 11 outputs / 283 schemas / 210 operations / 54 routes. Typecheck, lint and architecture boundaries passed; boundaries checked 402 imports and negative fixtures 8/8. Production and demo builds passed locally with the Vite chunk-size warning above 500 kB.

## Limits

These checks use synthetic shops, users, roles, stock and API responses. They do not verify server authorization, persistence, concurrent real adjustments, live SSE, CI, staging, deployment or UAT. UI permission behavior is not backend authorization evidence. The task follows the API's source-of-truth stock and command flow and does not claim real inventory integration or system production readiness.

Current FE011 checkpoint evidence records exact source hashes and supporting logs. The route/operation and observed-gap map remains in `S01-route-operation-map.md`.
