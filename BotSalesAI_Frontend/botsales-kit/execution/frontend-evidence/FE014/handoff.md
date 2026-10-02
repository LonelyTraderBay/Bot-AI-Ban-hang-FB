# FE014 — Suppliers, purchasing, approval, and goods receipt

Scope: React frontend with synthetic MSW records. Routes R44–R47 and operation, permission, DTO and version rules remain tied to canonical OpenAPI and route manifest.

## Current verification — 01/10/2026

- The current full Chromium suite passed 123/123 and contains the FE014 source-map check (95 contract/source assertions) and all six FE014 browser cases.
- Browser assertions cover supplier and reorder views, multi-line purchase creation with MOQ/pack-size validation, approval bound to the exact purchase intent, unknown-send protection from blind retry, disabled auto-send when no procurement budget is enabled, receipt permission checks, partial receipt updating only accepted stock/payable rows, and min-max replenishment with forecast limits and duplicate-proposal protection in the synthetic simulator.
- Current Vitest passed 66/66; simulator/network passed 88/88; mock schemas passed 356/356; generated contracts passed 11 outputs / 283 schemas / 210 operations / 54 routes. Source mapping passed 58 files / 224 operation references / 54 routes; boundaries passed 402 imports and 8/8 negative fixtures. Typecheck and lint passed.
- Production and demo builds exited 0, with largest JS chunks at 730.13 kB raw / 184.23 KiB gzip and 733.16 kB raw / 185.19 KiB gzip. The >500 kB warning remains a follow-up.

## Limits

Supplier, budget, purchase, approval, receipt, stock and payable state are synthetic. No supplier/provider is contacted and no payment is initiated. The tests do not prove database transactionality, race safety, backend authorization, CI, staging, production deployment or UAT. FE014 does not claim live procurement or whole-system production readiness.

Current FE014 checkpoint evidence is `S01-priority-refresh-20261001.json` through `S05-priority-refresh-20261001.json`. `S01-route-operation-map.md` records capability boundaries and contract gaps.
