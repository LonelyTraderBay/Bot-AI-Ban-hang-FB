# FE021 — Dashboard, reports, marketing and export

Scope: React frontend with synthetic MSW data; charts and totals use API response snapshots. No live analytics, ad provider, finance service or export backend is implied.

## Current verification — 01/10/2026

- The current full Chromium suite passed 123/123. It includes eight FE021 browser cases in `tests/fe021.spec.ts` plus the FE021 mock report-explanation scenario shared from `tests/fe015.spec.ts`.
- Dashboard panels keep independent loading/error states and hide finance fields without `finance.read`. Marketing chart/table use the same identified fixture, while `actualSpend: null` stays missing. Report export uses inclusive shop-local date boundaries, safe CSV, source-specific permissions, job cursor pagination, and download links only after a successful job. Empty, invalid-timezone, source-permission denial, stale 412 and unknown export results preserve honest state.
- Current Vitest passed 66/66; domain/MSW 88/88; mock schemas 356/356; `generate:check` 11 outputs / 283 schemas / 210 operations / 54 routes; source mapping 58 files / 224 operation references / 54 routes; boundaries 402 imports and 8/8 negative fixtures. Typecheck and lint passed.
- Production and demo builds exited 0. The >500 kB chunk-size warning remains.

## Contract limits

`getReportSummary` only returns available report definitions, `asOf` and warnings; it has no time-series or period aggregate. `getMarketingSummary` has no date filter or daily series. The frontend does not invent report KPIs or filters, and shows synthetic reasons alongside the contract limitation. CI, live providers, backend, staging, deployment and UAT were not run. This task does not certify Production-Ready/Enterprise-Grade or release readiness.

Current S02–S05 refresh evidence is `S02-priority-refresh-20261001.json` through `S05-priority-refresh-20261001.json`. Existing S01 map evidence remains valid.
