# Firefox R32 Orders route readiness — pre-edit contract

## Baseline

- Repository revision: `e9c879627e5520603c061afcf530981de490282b`; tracked working tree clean before this change.
- Canonical route: `botsales-kit/contracts/route-manifest.json`, R19 `/s/:shopId/orders/:orderId`; `apps/web/src/app/router.tsx` maps R19 to the order detail page.
- Read contract: `botsales-kit/contracts/openapi.json`, `getOrder` is `GET /shops/{shopId}/orders/{orderId}`. This correction does not change the API, mock data, or order behavior.
- Source owner: `apps/web/src/app/SessionProvider.tsx` loads `getSession`; `apps/web/src/app/Shell.tsx` displays a `LinearProgress` named `Đang tải phiên làm việc` while session state is pending and `Đang tải cửa hàng` while the selected shop is pending. The route content is not mounted until those startup states resolve.
- Affected consumer: `tests/ui-orders-layout.spec.ts`, the direct-navigation R17/R18/R19/R43 matrix at 320/390/768/1280/1440 px.
- Pre-edit SHA-256: `ui-orders-layout.spec.ts` `4257132081ed12914a1af7d2c269245464691a804649ac301c457eb5d8262439`; `SessionProvider.tsx` `13a7556aca5e858b0e0004fe454234b07889751459562ac985497e9eb520641e`; `Shell.tsx` `e126fcc3e2d82a87e74fc7c2acd30abce46db7d02470ee058fa410c8fb20cb92`.

## Observed failure and positive control

- GitHub Actions run `38391744865`, SHA `e9c879627e5520603c061afcf530981de490282b`, Firefox job `115276958961`: 438/439 E2E passed. The only failure was the route-matrix heading assertion at line 30 after Playwright's 5-second default expect timeout.
- The captured DOM at failure contained only the skip link and progressbar `Đang tải phiên làm việc`; it did not contain the Orders route or its heading. The following Orders behavior test passed. This is a navigation/session-readiness race in the test, not evidence of missing order data or a route-contract mismatch.
- Re-running the exact test on local Firefox from the same revision passed 1/1 after a clean setup, production build, and demo build. That is a positive control, not a replacement for the hosted failure evidence.

## Intent and acceptance

- Keep route, heading, geometry, overflow, and page-error assertions unchanged.
- Before asserting each route heading after `page.goto`, wait for the Shell's existing session/shop loading progressbars to become hidden. This synchronizes the test with the actual startup lifecycle and keeps the heading assertion meaningful; it does not suppress or relabel errors.
- No React source, API contract, generated file, mock data, or runtime behavior is in scope.
- Accept only after the focused Firefox and Chromium route matrix passes locally, `npm run verify` passes, and a new GitHub workflow on the pushed revision completes both browser jobs including E2E, built-demo verification, and artifact upload.

## Limits

The failure snapshot proves the app was still in session-loading state at the failed assertion. It does not measure how long that state would have continued after the 5-second timeout. The fix is limited to correct test synchronization; browser startup latency is not being changed by this patch.
