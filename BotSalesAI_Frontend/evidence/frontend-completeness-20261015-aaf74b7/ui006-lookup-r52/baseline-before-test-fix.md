# UI006 / Finance CI baseline — run #52

- Source revision: `3d741ff7f03a6fc3279a611cc61c5c9b30d55b5f`.
- GitHub workflow: `38711963723` (run #52), attempt 3, Firefox job `116414657968`.
- Result: Firefox completed 442 tests; 440 passed and 2 failed. Chromium completed its E2E and built-demo checks successfully. An earlier Firefox attempt was stopped by hosted-runner shutdown.
- `tests/ui-finance-management.spec.ts:39`: dialog was present while its entrance transition reported opacity `0.992653`; the test expected exact opacity `1`.
- `tests/ui006-lookups.spec.ts:180`: the lookup load-more button remained disabled until the helper's 10-second enabled-state poll timed out.
- The Firefox trace's terminal mock response for `supplier-offers?limit=20&cursor=ui006-offer-011` was HTTP 200 with 18 records and `page.hasMore=false`. The subsequent captured DOM still showed the load-more button in its disabled “Đang tải…” state. This identifies delayed/incomplete UI query settling under the hosted run; the trace does not establish a backend defect.
- The focused UI006 Firefox test passed once locally on the same source revision (22.5 seconds). That single local run does not override the hosted failure.

## Test changes and verification

- C06 now waits up to 15 seconds for the dialog entrance transition to finish before its existing Axe check. A trial that checked Axe immediately after `toBeVisible()` measured transition-blended colors, so the final test keeps a stable-visual-state assertion.
- C06 screenshots now use Playwright's per-test output directory. The test previously wrote fixed filenames into historical evidence and would overwrite them on repeats; the ten tracked screenshots were restored to the initially clean Git state after the diagnostic run.
- UI006 waits up to 30 seconds for the load-more control to become ready, checks the cursor response is successful, and waits for its body to finish before continuing.
- After these changes: UI006 Firefox repeat 5/5; C06 Firefox repeat 3/3 before output-path isolation and 1/1 after it; C06 + UI006 Chromium 2/2. Full local `npm run verify` and hosted verification remain pending at this baseline update.

Artifacts: GitHub run `https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/38711963723`, Firefox artifact `11977597158`.
