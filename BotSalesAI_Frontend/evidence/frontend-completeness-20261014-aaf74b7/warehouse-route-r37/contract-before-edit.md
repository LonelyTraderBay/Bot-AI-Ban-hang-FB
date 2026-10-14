# C05 warehouse route readiness baseline

- Revision: `c1fb2543752c520fc9909e536eb26eecf5a008ed`.
- Hosted evidence: GitHub Actions run [#37, attempt 2](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/38481066734), Firefox job `115607539633`.
- Observed result: `npm run verify` passed; Chromium passed 440/440 E2E and built-demo; Firefox passed 439/440 E2E. The only failure was `tests/ui-master-resources.spec.ts` C05 at the first route heading assertion.
- Failure detail: after `page.goto('/s/shop-demo/settings/warehouses')`, `getByRole('heading', { name: 'Quản trị kho', exact: true })` was still absent at the 5-second Playwright expectation timeout. The workflow later passed both viewport route-geometry checks (61 routes each at 390px and 1440px, 0 issues and 0 page errors). This points to the test asserting before the lazy route finished rendering; it does not establish an API or warehouse UI failure.
- Local baseline: the exact focused Firefox test passed 1/1 in 17.2 seconds on Node 24.19.0 / npm 11.17.0. Local isolated success does not remove the hosted timing failure.
- Before-edit source: the C05 test navigated and immediately expected the page heading, with no route loading-state wait. Neighboring route tests already wait for the labeled page progress bar to disappear, the `main h1` to render, and main-area progress indicators to finish.
- Scope/impact: update this Playwright readiness assertion only. Product React, mock API, route contract, and warehouse behavior stay unchanged; the consumer is the C05 browser regression test.
- Baseline disposition: hosted failure is a reproducible CI observation; no pre-change UI screenshot was captured for this test, so this is diagnostic-only for visual comparison.
