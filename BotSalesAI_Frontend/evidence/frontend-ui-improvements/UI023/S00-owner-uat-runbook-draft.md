# UI023 — Owner UAT runbook (draft)

**Status:** preparation only. This is not a UAT result, product-owner acceptance, or a UI023 checkpoint.
**Scope:** React Frontend using the local synthetic MSW demo; no backend/provider/staging validation.
**Latest app-source verification snapshot:** HEAD `e68cb65e61c5c1aab2ae169dd8033df305df8872`, dirty; [UI012/S39 verify](../UI012/S39-current-frontend-verify-20261004.log) and [S40 multi-engine E2E](../UI012/S40-full-e2e-20261004.log) are current; [UI020/S08 installed Chrome E2E](../UI020/S08-google-chrome-full-e2e-20261004.log) also passes on Chrome `154.0.8037.92`. The refreshed [UI024/S08 source/artifact fingerprint](../UI024/S08-current-worktree-and-artifact-fingerprint.json) covers 161 source/test/config/canonical inputs, 32 production files and 37 demo files, including the accepted UI020 browser config. Recalculate if any included input or built artifact changes or the UAT session starts from a different worktree state.

Route IDs below refer to the [canonical route manifest](../../../botsales-kit/contracts/route-manifest.json); the scripted journey examples are in [FE022 vertical-slice tests](../../../tests/vertical-slices/fe022-flows.spec.ts).

## Readiness before scheduling the owner session

UI023 remains `TODO` until an actual owner UAT is recorded against this final artifact. Current state on 2026-10-04: UI015 is DONE 5/5 from the Android Chrome emulator probe; UI012.C04/FE-G05 still needs an actual screen-reader speech/transcript and broad human interaction/error/icon review; [S36](../UI012/S36-narrator-speech-recap-runbook-20261004.md) is a procedure only, not a test result. UI020.C01–C05 are DONE under requester-approved [S06 desktop scope](../UI020/S06-requester-approved-browser-scope-20261004.md), with Chrome 154, Playwright Chromium 153 and Firefox 155 regression evidence plus [S09 acceptance](../UI020/S09-acceptance-20261004.json). UI021.C04 is closed by the requester-accepted review exception in [S38](../UI021/S38-requester-review-acceptance-20261004.md); the strict scan still exits 1 with 13 `affordance.actionless-button` findings. The R35→R07 destination-permission edge is fixed and covered by 2/2 local browser regressions. UI022.C04 still awaits a hosted run: [S26 anonymous GitHub API recheck](../UI022/S26-public-workflow-recheck-20261004.json) returned 0 public workflows/0 runs; this public response does not establish private repository state. [UI024/S08](../UI024/S08-current-worktree-and-artifact-fingerprint.json) is the current local source/build fingerprint. Recheck it if the worktree changes; no owner UAT result is recorded.

When the gates are ready, run the demo from `BotSalesAI_Frontend` with `npm run dev`, open `http://127.0.0.1:5173`, confirm the visible synthetic-data badge, and record the browser/version, source revision, demo artifact fingerprint, date/time, shop, selected role and any test-only clock setting. Use a fresh tab/demo session for each journey because the mock state resets on reload and journeys can otherwise affect one another.

## UAT journeys

For each journey, the owner performs the steps and records `PASS`, `FAIL` or `BLOCKED`, the visible result and any issue ID. The automated FE022 scenarios below are preparation evidence only; they do not count as owner UAT.

### 1. Product/catalog → inventory → order → preparation

Canonical routes: R09 product catalog, R15 inventory, R17–R19 orders, R41 preparation. Automated reference: `tests/vertical-slices/fe022-flows.spec.ts`, `FE022.VS01`.

1. Find product SKU `AO-002` (`Áo thun Essential`) from the inventory row and follow its product link.
2. Open seeded order `DH-1001`, request the current quote, simulate customer approval, then confirm the order and reserve stock.
3. Confirm the order is visibly accepted; open preparation and check that the same order, SKU and order-line identity appear.
4. Claim the preparation job, enter scanned SKU `AO-002` and picked quantity `1`, then confirm the line.

Expected: available stock decreases by one while on-hand remains unchanged; order status and preparation progress are visible; the preparation line refers to the same order/SKU. Record whether the UI explains an accepted response and any retry/recovery action without submitting a duplicate command.

### 2. Procurement → approval → partial receipt → stock/payable

Canonical routes: R46 purchases, R38 approvals, R47 receipts, R15 inventory, R50 debts/periods. Automated reference: `FE022.VS02` in the same vertical-slice file.

1. Create a purchase draft with the approved supplier `Xưởng hàng mẫu`, variant `v-p1`, and quantity `10`.
2. Request approval; use the approving role to inspect the exact purchase content and approve it.
3. Send the approved purchase, record supplier confirmation, create a receipt and record the checked goods into stock.

Expected: the purchase identity remains linked across approval, supplier confirmation and receipt; stock increases by the received amount; the resulting payable references that receipt. The scripted fixture checks a payable of 200,000 VND; the owner records what the visible UI shows and whether partial receipt/progress is clear.

### 3. Finance → reconciliation → partial debt allocation

Canonical routes: R49 bank/COD reconciliation and R50 debts/periods. Automated reference: `FE022.VS03`.

1. Import a small CSV containing a VND 100,000 credit transaction. Use a unique external transaction ID and import-batch ID for this session.
2. Find the resulting reconciliation case and match it to the seeded debt `seed-debtitem-10028`.
3. Allocate VND 50,000, enter a reason, save the match, and inspect both the transaction and remaining debt.

Expected: the UI shows the matched/accepted state, preserves the bank transaction identity and displays the reduced outstanding balance. Check that the remaining amount is exactly the prior amount minus VND 50,000 and that cancel/error paths do not imply a successful allocation.

### 4. Inbox → feedback/knowledge draft → bot evaluation

Canonical routes: R05/R06 inbox, R25 feedback review, R23/R24 knowledge, R28 bot evaluations. Automated reference: `FE022.VS04`.

1. Open demo conversation `cv1` and submit feedback on a response.
2. Open pending feedback, review the sanitized content and reason, and save the decision.
3. Follow the resulting knowledge draft and inspect its source and text.
4. Start an evaluation against the draft revision using test suite `FE022-synthetic-dataset-v1`.

Expected: feedback identity links to the review and knowledge draft; the draft remains explicitly a draft; the evaluation result shows `mockOnly`/synthetic context and the exact knowledge revision used. Verify that errors or unknown outcomes remain distinguishable from success.

## Cross-cutting checks

Record these once across the session, with route and role for each result:

- Open page two or change a filter, then use Back/refresh. The intended tab/filter restores while collection cursors remain scoped to the collection and shop.
- Select an evaluation and a category beyond the first 100 options; verify the selected identity survives paging and the submitted action uses that same identity.
- Switch shop/role while a secondary query is pending. No response, cached row or action from the previous scope should appear in the new scope.
- Open a dirty dialog and discard it. Verify the visible result, focus return and that no mutation was submitted.
- Inspect one permission-allowed and one permission-denied action using the role fixture from the current route-role evidence. Record the exact role and visible explanation; do not infer server authorization from the mock.
- Note the shop timezone and browser timezone. Check a date-only field and an instant field remain labeled and displayed with their intended meanings.

## Automated preflight status — 2026-10-04

The current Chromium + Firefox rebuilt-demo suite is [UI012/S40](../UI012/S40-full-e2e-20261004.log): **388/388 PASS**, exit 0 (194 per browser engine), including route-role 357/357, empty composition 11/11, route-error composition 51/51, all-canonical-route axe, production artifact isolation and four FE022 vertical journeys. Actual installed Chrome `154.0.8037.92` passes **194/194** in [UI020/S08](../UI020/S08-google-chrome-full-e2e-20261004.log). Current `npm.cmd run verify` plus generator 11/283/210/54 are in [UI012/S39](../UI012/S39-current-frontend-verify-20261004.log). The current source/build fingerprint is [UI024/S08](../UI024/S08-current-worktree-and-artifact-fingerprint.json). UI021's latest actual strict scan is [S36](../UI021/S36-current-frontend-design-audit-20261004.json), 13 findings/exit 1; the requester accepted the current-source review exception in [S38](../UI021/S38-requester-review-acceptance-20261004.md), without claiming scanner PASS. Latest [UI022/S26 public GitHub status](../UI022/S26-public-workflow-recheck-20261004.json) remains HTTP 200, 0 public workflows/0 runs; no hosted run is available to verify.

This is local automated evidence against the React demo and synthetic MSW only. It is not GitHub CI, manual owner UAT, or evidence of backend/provider/staging behavior, and it does not fill any cell below. UI012/FE-G05 manual evidence, UI022 hosted CI and UI023 owner acceptance remain open; owner, observation and decision fields below stay blank until the product owner performs the review.

## Owner result sheet

| Scenario | Route(s) / role | Expected | Observed | Result | Issue / accepted exception |
|---|---|---|---|---|---|
| Product → stock → order → prep |  |  |  |  |  |
| Procurement → approval → receipt |  |  |  |  |  |
| Finance → reconciliation → debt |  |  |  |  |  |
| Inbox → feedback → knowledge → evaluation |  |  |  |  |  |
| Pagination / Back / selected IDs |  |  |  |  |  |
| Shop and role switch / stale response |  |  |  |  |  |
| Draft discard / focus / no unintended submit |  |  |  |  |  |
| Shop timezone / browser timezone |  |  |  |  |  |

Owner acceptance must be entered by the actual product owner after reviewing the final artifact, scope, issues and exceptions. Record owner name, role, date/time and an explicit acceptance statement or decision link. Keep this field blank until that person responds:

> Owner: ____________________  Date/time: ____________________
> Final artifact/revision: ____________________
> Decision: ACCEPT / REJECT / ACCEPT WITH RECORDED EXCEPTIONS
> Statement or decision link: ____________________
