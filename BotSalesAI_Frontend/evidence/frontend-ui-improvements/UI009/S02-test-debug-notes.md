# UI009 targeted-test debug history

Date: 02/10/2026. All evidence is local Chromium with the synthetic MSW demo.

1. First browser-test draft waited for one `requestfailed` event and timed out. That run did not establish whether the pending request finished or failed; it is not counted as a PASS. The test was changed to observe both `requestfinished` and `requestfailed` and poll for a terminal state with a bounded timeout.
2. Next run completed the shop transition and rendered the correct shop-second order, but failed an exact request-count assertion: the dev app issued each shop/customer GET twice during the component lifecycle. Both observed parameter pairs were valid. The assertion now allows repeated valid requests while rejecting any shop/customer combination outside the selected identity.
3. Final focused run: `npx playwright test tests/ui009-scope-regression.spec.ts --project=chromium --timeout=60000 --reporter=line` — **1/1 PASS, 4.9s**. It observed both `shop-demo/c1` and `shop-second/b-c1`; the shop-second profile showed `b-DH-1001` and did not show `DH-DEMO-PAID-01`.

These iterations changed test instrumentation/assertions only; no app behavior or fixture content was changed to make the result pass. The final targeted suite, verify and full E2E results were recorded afterward in S03, S04 and S05.
