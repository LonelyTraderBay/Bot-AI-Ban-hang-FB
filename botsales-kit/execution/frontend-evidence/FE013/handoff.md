# FE013 — Fulfillment, shipment, delivery, and returns

Scope: React frontend with synthetic MSW data for canonical routes R41/R42. The contract and route map remain unchanged; no carrier endpoint or backend workflow was invented.

## Current verification — 01/10/2026

- The current full Chromium suite passed 123/123 and includes the FE013 source map (54 contract/source assertions) and all four FE013 browser scenarios.
- Browser evidence covers missing/unserviceable/expired shipping preview, stale claim and current-version refresh, line-level pick and pack prerequisites, shipment creation and handover, a separate delivered event, return eligibility, unpaid COD, duplicate/unknown handover recovery, warehouse permission restrictions, and responsive/axe checks at 320/390/768/1440 CSS px.
- Current Vitest passed 66/66; synthetic simulator/network passed 88/88; schema validation passed 356/356; generated-contract check passed 11 outputs / 283 schemas / 210 operations / 54 routes. Source mapping passed 58 files / 224 operation references / 54 routes; architecture boundaries passed 402 imports and 8/8 negative fixtures. Typecheck and lint passed.
- Production and demo builds exited 0; largest JS chunks are 730.13 kB raw / 184.23 KiB gzip and 733.16 kB raw / 185.19 KiB gzip. The >500 kB warning remains a follow-up.

## Limits

Browser and API evidence uses synthetic shop/order/stock records. It does not verify real carrier integration, backend authorization, durable command processing, concurrent inventory changes, COD collection, CI, staging, production deployment, or UAT. A demo delivery event is not proof of carrier delivery. COD and returns remain separate from fulfillment UI; payment/refund state is mock-only. This task does not claim whole-system production readiness.

Current FE013 checkpoint evidence is `S01-priority-refresh-20261001.json` through `S05-priority-refresh-20261001.json`. `S01-route-operation-map.md` documents route/operation ownership and capability boundaries.
