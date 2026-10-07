# UI012 S31 — browser smoke and Playwright runner diagnostic

Date: 2026-10-04. Scope: diagnose the current UI012 keyboard test run without changing React source, generated output, contracts, or progress ledgers.

## Observed

- A standalone Playwright Chromium launch and `data:` page smoke completed successfully (`PLAYWRIGHT_BROWSER_OK pw-smoke`). This confirms that the installed Playwright browser can launch in this environment.
- `startDemoServer({ timeoutMs: 15000 })` returned a local demo URL in 473 ms and closed cleanly in an earlier isolated probe.
- A direct Playwright script then loaded `/s/shop-demo/finance/entries` from a fresh demo server and found the visible `Sổ thu chi` heading. Total command time was 8.1 s. This was a route/render smoke, not the UI012 keyboard sequence.
- Important correction to the console output: the inline smoke printed `pageErrors: []` as a literal; it did not install a `page.on('pageerror')` listener. Therefore, this probe does **not** establish that the route emitted zero page errors.
- A second direct Playwright replay mirrored the first UI012 finance keyboard case outside `@playwright/test`: skip-link focus and activation, main focus, keyboard-opened finance dialog/select, Escape preserving the draft, discard, focus return, and no-POST assertion. It completed in 9.4 s with all assertions passing, **0 POST requests**, and **0 observed `pageerror` events** (this replay did install a page-error listener). This is a focused browser replay, not a test-suite run or screen-reader review.
- A bounded trace-enabled `@playwright/test` run used `DEBUG=pw:test,pw:api`, `--timeout 10000`, and `--global-timeout 30000`. Trace records the finance case finishing, `afterAll` finishing, all listed fixtures tearing down, and `browser.close` succeeding. The output reports `1 passed (30.0s)` followed by a suite-level error outside the case: `Timed out waiting 30s for the teardown for plugin setup to run`; command exit was 1. Thus the **case itself passed**, while this command did not exit cleanly. The phrase was not found in the installed Playwright package sources, so this evidence does not identify which host/plugin layer emitted it. Raw trace: `S31-keyboard-runner-api-debug-20261004.log`.
- The targeted test command was:

  ```text
  node node_modules/@playwright/test/cli.js test tests/ui012-keyboard.spec.ts --grep "keyboard-only finance edit" --timeout 60000 --reporter=line
  ```

  Playwright discovered one case and printed `[1/1]`, but produced no test result or step output. The process was manually interrupted after more than two minutes. The configured 60-second test timeout did not produce a result during this run. The run is **inconclusive**, not PASS and not a demonstrated product defect. Raw terminal capture: `S31-keyboard-finance-targeted-20261004.log`.
- A full run using the Windows-style test path first reported no tests found. Repeating it with `tests/ui012-keyboard.spec.ts` discovered nine cases, then remained at the first `[1/9]` without a result for over three minutes before manual interruption. Captures: `S31-targeted-keyboard-live-20261004.log` and `S31-targeted-keyboard-live-retry-20261004.log`.
- After interruption, the test command and its port-5173 Vite server were no longer listening. Existing user Chrome processes were left untouched.

## Assessment and next probe

The standalone browser, app-route smoke, direct finance keyboard replay, and one Playwright keyboard case all pass. The bounded trace run still exits 1 after the case passes because an outer `plugin setup` teardown wait expires; the source of that teardown message is not established. Earlier unbounded runs were interrupted before a verdict. Port 5173 was verified to belong to this run's repo Vite demo server and stopped after the probe. Keep UI012.C04 PARTIAL and FE-G05 open until the required screen-reader speech/transcript and broad human review also have evidence.

No React source or architecture boundary changed. No UI checkpoint, FE tracker, product tracker, or readiness percentage advanced. The existing current-source S30 full suite remains 194/194; S31's interrupted runner attempt does not supersede or invalidate that recorded snapshot.
