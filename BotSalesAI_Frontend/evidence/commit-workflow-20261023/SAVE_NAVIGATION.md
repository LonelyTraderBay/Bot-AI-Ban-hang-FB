# Saved product route and early failure feedback — 24/10/2026

Closing main a7b07c56/run 40008574094 failed Chromium shard 1: FE010 saves a product, receives GET product 200, then clicks Danh sách while the saved route is still committing. Other 196/197 cases passed. The main is already merged; branch cleanup remains blocked until a repaired main has fully successful closing CI.

Evidence: outputs/a7-main-chromium-one-failed.log; artifact 12527476845, 11,373,800 bytes, SHA256 e0271827f79f877ef253541b18867b108aaedd97c96d3011287377d6b80d27e8, full ZIP SHA/CRC verified. Context has no unsaved-draft dialog. Trace call 3164 clicks the list link at x=1207/y=261, while frames show the saved route changing its breadcrumb from Thêm sản phẩm to Chi tiết sản phẩm and scrolling main as Shell's pathname effect focuses it. Product fields can already match submitted text before the route metadata/focus commit finishes; a successful HTTP read does not establish that navigation is settled.

Scope: consumer test waits for the canonical saved title and main focus before the list click. Retain all payload, image-only draft guard, price, search/filter and permission assertions. No application/API changes or navigation retries. Run repeated FE010 regression on Chromium/Firefox and full verify.

CI optimization: add --max-failures=1 per browser shard, preserving matrix fail-fast:false. A broken shard returns failure immediately and retains its trace; other shards continue for diagnostics. Every green shard still executes its full partition, and aggregate gates reject any failed/skipped/cancelled producer. Observed examples: main FE010 failed at 19:31 but the job reported failure at 19:45; c92 Firefox 2 continued roughly 33 minutes after its first failure. Required contexts, complete passing-run coverage and main protection are retained. Source: https://playwright.dev/docs/test-cli.

## Verified local results

- `save-navigation-target.log`: 6/6 FE010 cases (three repeats per Chromium/Firefox), exit 0; saved payload, prices, image-only draft protection and navigation assertions retained.
- `save-workflow-contracts.log`: 90/90 repository, success-gate and frontend contract checks, exit 0.
- `save-feedback-verify.log`: full `npm run verify`, exit 0; 256 Vitest cases and all source/build/layout/composition/domain gates passed.
- Final evidence validation: 80 command/log records, 75 coverage rows, 309 source fingerprints; COMPLETE. This measures frontend evidence within its stated scope, not backend/production acceptance.
- `save-navigation-failed-attempts.zip` with matching JSON manifest retains the failed a7 decoded log, error context, source artifact manifest and two original trace frames. All five member hashes and ZIP CRC were checked. Full trace ZIP remains in the task outputs.

PR CI and closing CI on the repaired main must be checked separately. The failed a7 run is retained as a failed attempt; no branch cleanup has run yet.
