# C05 Firefox failure baseline

- Baseline revision: `ae8ec171f407a2b9bb5a6c34289cd503980c9e70` (`main`, pushed).
- Scope: `BotSalesAI_Frontend/tests/ui-master-resources.spec.ts:31-36`; warehouse conflict reconciliation in the demo/mock API.
- Owner and consumer: `apps/web/src/modules/inventory/warehouses.tsx` owns save/close behavior; this Playwright C05 test verifies the visible success and dialog close after the user reconciles two external versions.
- Contract: after the user explicitly resolves the conflict and a successful update is returned, show the saved result and close the edit dialog while retaining the reconciled server fields.
- GitHub evidence: run `38691060331` / attempt 2, Firefox job `116300737657`, SHA above; 441/442 E2E passed. The only assertion failure was `expect(editor).not.toBeVisible()` at the default 5-second expect timeout. Trace artifact `11959977178` (`sha256:3138f27714044ed23f8d33e20c0674ae1fddd8bba3bf70fa2bad6f00643ce32e`): final PATCH returned HTTP 200 with warehouse version 4 and expected values; the assertion started at monotonic `3547821.211`, failed at `3552826.478`, and the subsequent failure snapshot at `3553388.976` already showed the success alert and no dirty draft. This indicates delayed UI completion beyond the assertion window, not a failed write.
- Local baseline: Node `v24.19.0`, npm `11.17.0`, Firefox 155; `npm.cmd run test:e2e -- --project=firefox --grep='C05 warehouse conflicts keep the draft across two concurrent versions and require explicit reconciliation'` from `BotSalesAI_Frontend/` passed 1/1 (exit 0, 17.2 seconds including setup/build).
- Planned test-only change: explicitly wait up to 15 seconds for the success notice and dialog close, keeping both behavioral assertions intact. No product, backend, tracker, or canonical contract change is proposed.
- Status before edit: tracked working tree clean; unrelated untracked historical evidence is being preserved and excluded from staging.

## Verification after the test change

- `tests/ui-master-resources.spec.ts` now waits for the visible success status and closed dialog for up to 15 seconds; the test still fails if either condition never occurs.
- Firefox repetition: `npm.cmd run test:e2e -- --project=firefox --grep='C05 warehouse conflicts keep the draft across two concurrent versions and require explicit reconciliation' --repeat-each=5` from `BotSalesAI_Frontend/`, Node `v24.19.0`, npm `11.17.0`; 5/5 passed, exit 0. Log: `evidence/frontend-completeness-20261015-aaf74b7/warehouse-c05-r51/c05-firefox-repeat5.log`.
- Full verification and latest hosted GitHub checks remain pending.

## Full local verification

- `npm.cmd run verify` from `BotSalesAI_Frontend/`, Node `v24.19.0`, npm `11.17.0`: exit 0 after S17 refresh.
- Results: generator 15 outputs/346 schemas/245 operations/61 routes; source 85 files/271 API calls/61 routes; boundaries 723 imports/10 negative fixtures; domain simulator 117/117; Vitest 242/242; production build 2,077 modules; layout 86/86 (93 files, 0 findings, 1 exception); visual tokens 5/5 (92 files, 0 findings); composition 41/41 (91 files, 0 findings); S17 evidence validator 11/11 and 280 fingerprints.
- Full log: `evidence/frontend-completeness-20261015-aaf74b7/warehouse-c05-r51/verify-c05-r51-full.log` (exit 0). The report was then updated to link these results; S17 was regenerated and its evidence validator rerun.
- Current GitHub run for the fix is still pending the authorized push; backend/staging/production/UAT are outside this proof.
