# FE015 — Finance, COD, and reconciliation

Scope: frontend flows backed by deterministic synthetic MSW records. The UI follows canonical finance operations and decimal-string money fields; it does not initiate real payments or bank transfers.

## Current verification — 01/10/2026

- The current full Chromium suite passed 123/123 and includes FE015's route/operation source map (131 assertions) and all seven FE015 browser cases. The same spec file also contains a separate FE021 report-explanation case, which is excluded from FE015's task-specific count.
- Browser evidence covers timezone-bounded report filters, API-owned totals, exact decimal journal payloads, unbalanced-entry rejection, closed-period restrictions, partial statement-import errors, duplicate external transaction handling, COD fee/net matching, partial bank allocation, and unknown journal-post recovery without resend.
- Current Vitest passed 66/66; simulator/network passed 88/88; schema checks passed 356/356; generated contracts passed 11 outputs / 283 schemas / 210 operations / 54 routes. Source mapping passed 58 files / 224 operation references / 54 routes; architecture boundaries passed 402 imports and 8/8 negative fixtures. Typecheck and lint passed.
- Production and demo builds exited 0; the largest JS chunks are 730.13 kB raw / 184.23 KiB gzip and 733.16 kB raw / 185.19 KiB gzip. Both retain the >500 kB chunk-size warning.

## Limits

These are management-accounting demo flows over synthetic transactions. They do not establish country-specific accounting or tax compliance, a production chart of accounts, bank/carrier integration, real COD remittance, or money movement. Backend posting, idempotency, period-close concurrency, CI, staging, production deployment, and user UAT were not verified. The absent canonical account catalog remains an explicit limitation; the UI does not invent one. FE015 does not certify production readiness.

Current FE015 checkpoint evidence is `S01-priority-refresh-20261001.json` through `S05-priority-refresh-20261001.json`. `S01-route-operation-map.md` records canonical operation ownership and finance gaps.
