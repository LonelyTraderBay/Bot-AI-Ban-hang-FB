# UI010 reproduction and implementation notes

Date: 2026-10-03. Browser: local Chromium through Playwright, synthetic MSW demo.

1. Added `tests/ui010-dialog-draft.spec.ts` for Inbox conversation `cv1`. It records POST `/takeover` requests, enters a reason, cancels, confirms discard, checks focus return, reopens the same confirmation, and checks the reason is empty.
2. Baseline run failed: the reopened textbox contained `Lý do không được gửi vì tôi đã bỏ bản nháp.`. Playwright failure context was written to `test-results/ui010-dialog-draft-UI010-a-bb69c-fore-the-dialog-opens-again-chromium/error-context.md` by the runner. No mutation request was part of the discard flow.
3. After adding only the closed-dialog reason reset, the same test advanced to the focus assertion and failed because **Tiếp quản** was not focused. This independently exposed the nested-dialog close-order issue.
4. `EditDialog` now waits for the nested discard warning's exit before invoking the parent close callback. `ConfirmDialog` clears its local reason when `open` becomes false. The final focused browser regression passes and confirms no POST `/takeover` was issued.
5. Existing FE016.S03 conflict coverage still passes with the reason retained after 412. FE023 dirty-form/discard, FE023 successful-save feedback, and FE011 simple-dialog focus return also pass in the targeted neighboring suite.

Early failed test runs are diagnostic evidence only; final acceptance depends on S03, S04, and S05.
