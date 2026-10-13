# Baseline before R35 Orders layout test correction

- Revision: `972cb799c3f71a2d4d64bd4d5aa059acd2da3e74`; GitHub Actions run [#35](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/38439113706).
- Scope: Playwright readiness for the Frontend/mock route matrix in `tests/ui-orders-layout.spec.ts`; no backend, API, mock-data or React behavior change.
- Hosted result: Chromium E2E and built-demo passed. Firefox E2E recorded 438/439 passing; `Orders R17/R18/R19/R43 preserve responsive page geometry at 320-1440px` failed on its initial R17 `/s/shop-demo/orders` heading assertion.
- Failure evidence: the GitHub Firefox artifact's `error-context.md` showed the Shell breadcrumb `Không gian làm việc / Đơn hàng`, while `main` still contained the route fallback `status > progressbar "Đang tải màn hình"` and no page heading. The old test waited for the session/shop Shell progressbar to disappear, then asserted the route heading with the default 5-second timeout. When the Shell loader was already absent, that wait could complete while the lazy route was still loading.
- Diagnosis confidence: the captured DOM supports a route-readiness race in the test. The unchanged test passed a local focused run, so the hosted failure was intermittent; the artifact does not show a product exception or broken Orders API response.
- Baseline SHA-256 of `tests/ui-orders-layout.spec.ts`: `695c118179883ced2b3a837a920f1eed7157bcc35d6b67ae1b32c5e4d6f33e13`.
- Intended correction: wait for the route-level `Đang tải màn hình` progressbar to disappear, then for the main heading and route content to be ready before measuring geometry. Preserve all existing heading, gutter, overflow, page-error and behavior assertions.
- User work boundary: no existing staged changes; pre-existing untracked evidence remains preserved and outside this correction.
