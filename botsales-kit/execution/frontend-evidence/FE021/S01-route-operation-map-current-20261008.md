# FE021 dashboard, report and export verification — 2026-10-08

Scope: FRONTEND_WITH_SYNTHETIC_MOCK_API. The current route audit is S01-route-operation-map-current-20261008.log, produced by the FE021-owned route-map script.

| Route | Feature IDs | Reads | Actions |
| --- | --- | --- | --- |
| R04 /s/:shopId/overview | none declared | getDashboard, getShop | pauseBot (bot.publish) |
| R31 /s/:shopId/reports | none declared | getReportSummary, listJobs | createExport (reports.export) |
| R53 /s/:shopId/reports/marketing | G07, G08 | getMarketingSummary | none |

The seven planned FE021 operation IDs match OpenAPI and generated operation metadata and resolve to route/module callsites. Route audit passed 25 assertions. The feature catalog maps G07 and G08 to R53, matching the route manifest.

Marketing chart and table use the same API summary fixture. actualSpend can be null and remains visibly missing; the UI does not convert missing actuals into zero or accounting values. The summary endpoint does not accept a date filter, and the page discloses that limit.

Report export uses the shop timezone to form inclusive day boundaries, creates an API job, follows cursor pagination, and only renders a download after a successful authorized job result. The CSV exposes the declared order columns and omits customerId and shippingAddressId. Permission denial, invalid timezone, ambiguous result, stale conflict and empty payloads are covered by browser scenarios.

The current source and test inventory also includes one FE021 report-explanation scenario in the FE015 finance spec. That cross-feature case explains the filtered P&L snapshot and does not write finance data.

All dashboard, marketing and export data is local synthetic API data. This does not verify a live accounting ledger, ad-platform attribution or spend, production CSV storage, or backend authorization.
