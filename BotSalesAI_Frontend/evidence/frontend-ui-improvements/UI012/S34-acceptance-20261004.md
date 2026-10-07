# UI012/S34 — rebuilt-demo full suite on the current frontend snapshot

Date: 04/10/2026. Scope: local Windows Chromium, React Frontend and synthetic MSW only.

The FE017 synthetic 422 regression now expects the Knowledge-owned Vietnamese field label `Trường Nội dung` and asserts that the API key `content:` is not displayed. This aligns the test with the existing user-facing error mapping; it does not change app behavior, API contracts, generated output, or module boundaries. The [test source](../../../tests/fe017-validation.spec.ts) is SHA-256 `44F86FC257A9DD645B0255562BFF0C1177801A330A92C4DD4F7872B7D4E87E98`.

The rebuilt-demo Playwright suite passed **194/194**, exit 0, in **11.1 minutes**. It includes canonical-route rendering and axe checks, production artifact mock isolation, FE009–FE021 interactions, UI006–UI013 regressions, the 357-case route/role matrix, empty-state composition 11/11, route-error composition 51/51, and four FE022 vertical journeys. Raw Playwright output: [S34 full E2E log](S34-full-e2e-20261004.log).

The preview measured 446,359 initial script-transfer bytes, 449,912 initial-route gzip bytes, and an 188,059-byte largest gzip chunk. The 1,004-customer synthetic dataset returned 20 records plus a next cursor; the table rendered 21 DOM rows including its header, with first-page readiness **335 ms** at 1280×720. These are local synthetic-data measurements, not a production SLO.

`npm.cmd run generate:check` passed with **11 outputs / 283 schemas / 210 operations / 54 routes** using a process-scoped reduced PATH so the nested Windows command shell could resolve Node. The system/user PATH was not changed. See the [captured generator log](S34-generate-check-20261004.log). S33's current-source lint, typecheck, source/boundary checks, domain/MSW, Vitest and production/demo builds remain applicable; S34 changes only a Playwright assertion.

The run staged S33 production/demo builds temporarily for the built-artifact checks. Cleanup verified the original `apps/web/dist` and `apps/web/dist-demo` trees against their pre-run hashes, and all five existing evidence files were restored hash-identically: FE025 demo-preview metrics, FE025 large-dataset metrics, FE026 screenshot, and UI005 S03 request trace and acceptance. No FE/product tracker was changed.

**Gate impact:** FE-G04 is PASS on this current frontend snapshot; FE-G08 local artifact journey is reverified. Current measured Frontend readiness is **7/9 = 77.8%** under the project's equal-weight FE-G01..09 gate rubric. FE-G05 still lacks screen-reader speech/transcript and broad manual interaction/error/icon review; FE-G09 still lacks product-owner UAT. Therefore this does not support a Production-Ready/Enterprise-Grade claim. No Backend, hosted GitHub CI, provider, staging, production-service or owner-acceptance behavior is established.
