# UI015 — full rebuilt-demo E2E result

Ngày: 03/10/2026 · Command: `npm run test:e2e` · Runtime: Windows, Node 24.19.0/npm 11.17.0, Chromium 153, serialized single worker.

The command ran setup, rebuilt the production and demo artifacts, then completed with exit code 0: **187 passed (11.0 minutes)**. Playwright's result summary reported all 187 tests passed and zero failures.

Relevant measured checks in this run:

- UI015 disclosure/focus/viewport test: 1/1; Inbox browser viewports 320, 390, 768 and 1280 CSS px had no horizontal document overflow; disclosure opened by Enter and focus moved by Tab to the role control.
- Inbox route/history regression suite passed, including mobile draft/cursor restoration on Back.
- Route-role matrix: 357/357; successful empty compositions: 11/11; API error compositions: 51/51.
- Canonical route axe test passed; the suite recorded 55 route snapshots, zero axe violations and zero page errors.
- Production artifact isolation test passed: the built production artifact contained neither the mock worker asset nor MSW fixtures/runtime. The built demo artifact used synthetic MSW as intended.
- Built-demo measurement at 1280×720: initial-route JavaScript 448,421 gzip bytes, largest JavaScript chunk 186,586 gzip bytes. The 1,004-customer synthetic collection returned 20 records per API page; first-page ready 340 ms.

This is automated Chromium evidence against the local React demo and synthetic API. It does not test an operating-system soft keyboard, actual mobile hardware, backend/provider behavior, staging, or production SLO. The build still reports a largest production chunk of 734.01 kB raw / 185.46 kB gzip.
