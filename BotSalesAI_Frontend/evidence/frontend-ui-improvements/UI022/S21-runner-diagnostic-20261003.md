# UI022 Windows nested-npm runner diagnostic — 03/10/2026

**Status: incomplete diagnostic; no test acceptance was produced.** Scope was the local Frontend test runner on Windows with the React demo and synthetic MSW only.

## Command reproduction

From the Frontend root, `npm.cmd run test:e2e` exited 1 immediately after printing the package script. The first nested `npm run setup` failed with:

```text
'npm' is not recognized as an internal or external command,
operable program or batch file.
```

The command did not reach setup, either build, or Playwright. This is consistent with the child-shell failure recorded in [UI012/S19](../UI012/S19-current-frontend-gates-20261003.log).

## Direct Playwright probe

A temporary local-only change invoked the Vite web server using Node's absolute `process.execPath`. Process inspection confirmed Vite listened on `127.0.0.1:5173`; an HTTP request returned 200. Playwright listed `tests/ui009-scope-regression.spec.ts`, but the full-suite attempt did not return an exit code or completion report. A separate UI009-only invocation likewise listed the test but did not return a result. Both processes were stopped after no test progress; neither probe is counted as PASS or as a product regression.

The temporary `playwright.config.ts` edit was reverted, preserving its pre-existing working-tree contents. Before stopping the full probe, 13 pre-existing evidence artifacts were snapshotted. They were restored from the snapshot and SHA-256 checked byte-for-byte; the recovery copy remains under the system temporary directory. No progress ledger was modified.

## Effect on acceptance

UI022 remains `IN_PROGRESS` 4/5 and C04 remains `PARTIAL`: the npm wrapper issue is unresolved, the direct probe did not complete, and no GitHub Actions run exists. The latest authoritative full local E2E remains [UI012/S20](../UI012/S20-current-full-e2e-20261003.log), 188/188 on the then-current source/config snapshot. This diagnostic does not supersede that result or establish a newer full-suite PASS.
