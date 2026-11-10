# PR 20 CI correction — local evidence

PR #20 run 42865521342 at head f55fc076 failed because stock history displayed the actor name while FE011 required the ID, a selected product category clipped under simulated text/spacing stress, two import regressions used an obsolete button name, and an order-list regression selected the customer link instead of the order link. The workflow stopped affected shards at the first failure; the other interrupted tests were not judged from that run.

The inventory actor now shows a resolved name plus its ID, with ID-only fallback. Shared MUI select text wraps; navigation and import test locators follow the actual accessible names and destinations, retaining the original behavior and geometry assertions.

Local evidence:
- `inventory-final.log`: 16/16 inventory cases on Chromium and Firefox, including adjustment, filtering, permission, unknown result, accessibility and focus. The configuration uses a separate loopback port to coexist with the route matrix.
- `browser-retest.log`: 12/12 targeted cases on Chromium and Firefox: W30 text/spacing stress, import mapping, responsive form widths and return-to-list behavior. Initial `stress-before.log` and copied reports reproduce clipping on both engines; current W30 reports use `pr20-retest-20261111`.
- `routes-final.log`: all 61 entry routes at 390 and 1440 CSS px on Chromium and Firefox, four cases. This is smoke coverage, not all states.
- `verify-before-s17.log`: all code/build/UI lanes passed and S17 rejected five stale source fingerprints, as expected before refresh. S17 preserves that result and prior history.

Text stress uses DOM font and spacing overrides, not native browser zoom or Firefox text-only resize. Screen-reader, physical-device and owner acceptance remain open; S17 remains IN_PROGRESS. GitHub CI must be observed separately on the pushed revision.

Final local `npm run verify` passed after S17 refresh, including 263 Vitest cases; `evidence-confirmation.log` validates S17 again after recording the final log. Hosted CI on the new commit is tracked separately in the PR and is not claimed here.
