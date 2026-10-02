# FE012 — Báo giá, xác nhận và đơn hàng

Scope: React frontend with synthetic MSW data, using canonical routes, generated operations, schemas and permissions. Order, quote, confirmation, cancellation, payment evidence and return flows do not imply live commerce or payment processing.

## Current verification — 02/10/2026

- The current full Chromium suite passed 142/142, including the FE012 route/operation/permission/DTO source map (35 assertions) and all ten FE012 browser cases. Cases exercise searchable customer/product pickers, quote invalidation and re-quote after edits, mock 412 and offline retention, unknown confirmation recovery without duplicate writes, expiry, invalid and cumulative return quantities, partial return inspection/refund, handed-over cancellation restrictions, and responsive/axe checks.
- Current Vitest passed 71/71; simulator and mock HTTP checks passed 88/88; mock JSON Schema validation passed 356/356; `generate:check` passed 11 outputs / 283 schemas / 210 operations / 54 routes. Source mapping passed 60 files / 226 operation references / 54 routes; boundaries passed 406 imports and 8/8 negative fixtures. Typecheck and lint passed.
- Production and demo builds exited 0, including from a clean temporary npm install. Largest production chunk remains 730.53 kB raw / 184.34 KiB gzip, with the >500 kB raw advisory.

## Limits and handoff

Shipping-address CRUD and verification are absent from the canonical contract, so `shippingAddressId` remains an external ID and the UI invents no address endpoint. Payment, reservation, customer confirmation and refund outcomes are demo/mock state only. The user-approved FE017 UI substitute uses `knowledge.publish` permission and lifecycle checks; it does not change the Knowledge schema. CI, live backend/provider, staging, production deployment, full screen-reader audit, actual browser zoom and owner UAT are not claimed. FE012 does not certify system production readiness.

Current FE012 checkpoint evidence is `S01-priority-refresh-20261001.json` through `S05-priority-refresh-20261001.json`. The task route, operation, capability, and address gap map remains in `S01-route-operation-map.md`.
