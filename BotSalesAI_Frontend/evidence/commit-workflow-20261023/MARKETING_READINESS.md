# Marketing retained-data consumer readiness — 24/10/2026

Closing main a7b07c56/run 40008574094, Firefox shard 2/job 120609829243, failed 1/175: R53 stale data for accountant. Context shows an empty-error state, not retained data. Full artifact 12529080527 (31,384,548 bytes; SHA256 e2e426252a6f6ef9c08d05420734ca515f7a06dccb3fdb06861c040d32717fe2) passed digest/ZIP CRC and is retained in task outputs with decoded log/context/manifest.

Trace establishes a test readiness race. First marketing GET starts at monotonic 1068507 ms. The ready walk leaves for finance/accounts at 1068732 ms. The GET with normalized fromDate/toDate/bucket only starts at 1068840 ms, after the walk has already moved. HTTP 200 for a prior/default read and a momentary absence of loading text do not prove the filtered query reached the visible cache. The stale walk reopens the bare route and receives 503 for the filtered query without retained data.

Owner: tests/states/route-role-ready-composition.spec.ts. MarketingPage owns normalization from its server period; useApi owns query keys and 5-second staleTime. Application behavior is retained. Consumer will register the normalized successful read before navigating, wait for its body and visible marketing-as-of, remember that canonical location, then revisit that same location for stale assertions. Retain every role/route and stale assertion; no arbitrary sleep, retry or missing-data exception. Verify full owner/accountant route walks in Chromium/Firefox and full verify, then current PR/main CI separately. Current status: local verification pending; no branch cleanup.

## Verified local results

- Final source-bound `marketing-readiness-target.log`: 4/4 full ready/stale route walks for owner/accountant on Chromium/Firefox, exit 0; each includes R53 success and retained-data warning. A preliminary four-case pass remains separately in task work; the committed log binds the final CRLF source bytes.
- `marketing-readiness-verify.log`: full verify exit 0, including 256 Vitest and all source/build/layout/composition/domain gates.
- Final evidence validation: 82 records / 77 coverage rows / 310 fingerprints, COMPLETE. Prior FE010 six-repeat and 90-contract checkpoints retain their original input hashes; no app/CI source changed in this follow-up.
- `marketing-readiness-failed-attempts.zip` and JSON manifest preserve the failed a7 log/context/artifact manifest; all member hashes and CRC verified. Full 31 MB trace artifact remains in task outputs.

PR and closing-main CI still require fresh success on the final revisions. Backend/provider/production and owner acceptance are outside this frontend/mock scope. No branch cleanup has run.
