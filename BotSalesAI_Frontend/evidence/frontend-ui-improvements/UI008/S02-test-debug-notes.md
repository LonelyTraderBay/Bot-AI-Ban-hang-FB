# UI008 test/debug notes

**Date:** 2026-10-02 · All entries describe test setup/assertions; none were product defects except the C01 blank-success states recorded in S01.

| Attempt | Result | Classification and resolution |
|---|---|---|
| Initial C01 browser probe expected the overview H1 to be “Tổng quan”. | Failed at readiness assertion before navigating to R29/R30. | Test assumption only; this demo's overview heading differs. Wait for the stable “Trạng thái thử” shell control used by the existing route composition tests. |
| First UI008 targeted pass checked for the transient “Vai trò mô phỏng đã được áp dụng.” status after role switching. | 5/7 passed; both read-only checks timed out waiting for that status. | Harness assertion only; `MockTools` refreshes the shell scope and the status is not a durable role proof. Assert `bot_admin` in the primary navigation profile, as existing FE016 role tests do. Final targeted pass is in S03. |
| First Vite dependency scan after the UI edit. | JSX parser reported a missing closing brace in the two conditional `QueryState` children. | Source syntax defect fixed immediately; `npm run typecheck` then passed. No build result from the failed parser attempt is counted. |
| Targeted UI008 after corrections. | 7/7 UI008 browser cases pass; route-empty composition now passes 11/11. | Final targeted evidence in S03; includes response status/data, accessible empty states, role CTA visibility, loading, 403, and 503/retry behavior. |

The original intended behavior is preserved in `S01-baseline-browser.log` and the two `S01-*-before.png` screenshots. Final visual states are captured in the corresponding `S04-*-after.png` screenshots.
